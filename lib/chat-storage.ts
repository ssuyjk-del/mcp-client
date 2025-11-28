import { supabase, DbChatSession, DbMessage } from './supabase';

// Application-level interfaces (matching existing localStorage structure)
export interface Message {
  role: 'user' | 'model';
  text: string;
  suggestedQuestions?: string[];
  images?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const STORAGE_KEY = 'chat-sessions';
const MIGRATION_FLAG = 'chat-sessions-migrated';

// Convert DB session + messages to application ChatSession
function toAppSession(dbSession: DbChatSession, dbMessages: DbMessage[]): ChatSession {
  return {
    id: dbSession.id,
    title: dbSession.title,
    createdAt: new Date(dbSession.created_at).getTime(),
    messages: dbMessages
      .sort((a, b) => a.order_index - b.order_index)
      .map((msg) => ({
        role: msg.role,
        text: msg.text,
        suggestedQuestions: msg.suggested_questions ?? undefined,
        images: msg.images ?? undefined,
      })),
  };
}

// Get all sessions with their messages
export async function getSessions(): Promise<ChatSession[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('chat_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (sessionsError) {
    console.error('Failed to fetch sessions:', sessionsError);
    throw sessionsError;
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .in(
      'session_id',
      sessions.map((s) => s.id)
    );

  if (messagesError) {
    console.error('Failed to fetch messages:', messagesError);
    throw messagesError;
  }

  const messagesBySession = new Map<string, DbMessage[]>();
  (messages || []).forEach((msg) => {
    const existing = messagesBySession.get(msg.session_id) || [];
    existing.push(msg);
    messagesBySession.set(msg.session_id, existing);
  });

  return sessions.map((session) =>
    toAppSession(session, messagesBySession.get(session.id) || [])
  );
}

// Create a new session
export async function createSession(session: ChatSession): Promise<ChatSession> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      id: session.id,
      title: session.title,
      created_at: new Date(session.createdAt).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create session:', error);
    throw error;
  }

  return toAppSession(data, []);
}

// Update session title
export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId);

  if (error) {
    console.error('Failed to update session title:', error);
    throw error;
  }
}

// Add a message to a session
export async function addMessage(
  sessionId: string,
  message: Message,
  orderIndex: number
): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    session_id: sessionId,
    role: message.role,
    text: message.text,
    suggested_questions: message.suggestedQuestions ?? null,
    images: message.images ?? null,
    order_index: orderIndex,
  });

  if (error) {
    console.error('Failed to add message:', error);
    throw error;
  }
}

// Update the last message (for streaming updates)
export async function updateLastMessage(
  sessionId: string,
  orderIndex: number,
  message: Message
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({
      text: message.text,
      suggested_questions: message.suggestedQuestions ?? null,
      images: message.images ?? null,
    })
    .eq('session_id', sessionId)
    .eq('order_index', orderIndex);

  if (error) {
    console.error('Failed to update message:', error);
    throw error;
  }
}

// Delete a session (messages will be cascade deleted)
export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
}

// Check if migration from localStorage is needed
export function needsMigration(): boolean {
  if (typeof window === 'undefined') return false;
  
  const migrated = localStorage.getItem(MIGRATION_FLAG);
  if (migrated === 'true') return false;
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;
  
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

// Get sessions from localStorage
export function getLocalStorageSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to parse localStorage sessions:', error);
  }
  
  return [];
}

// Migrate all sessions from localStorage to Supabase
export async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const sessions = getLocalStorageSessions();
  if (sessions.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    return;
  }

  console.log(`Migrating ${sessions.length} sessions from localStorage...`);

  for (const session of sessions) {
    try {
      // Insert session
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          id: session.id,
          title: session.title,
          created_at: new Date(session.createdAt).toISOString(),
        });

      if (sessionError) {
        // Session might already exist, skip
        if (sessionError.code === '23505') {
          console.log(`Session ${session.id} already exists, skipping...`);
          continue;
        }
        throw sessionError;
      }

      // Insert messages
      if (session.messages.length > 0) {
        const messagesToInsert = session.messages.map((msg, idx) => ({
          session_id: session.id,
          role: msg.role,
          text: msg.text,
          suggested_questions: msg.suggestedQuestions ?? null,
          order_index: idx,
        }));

        const { error: messagesError } = await supabase
          .from('messages')
          .insert(messagesToInsert);

        if (messagesError) {
          console.error('Failed to migrate messages for session:', session.id, messagesError);
        }
      }
    } catch (error) {
      console.error('Failed to migrate session:', session.id, error);
    }
  }

  // Mark migration as complete
  localStorage.setItem(MIGRATION_FLAG, 'true');
  // Clear old localStorage data
  localStorage.removeItem(STORAGE_KEY);
  
  console.log('Migration completed successfully!');
}

