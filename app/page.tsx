'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Check, Copy, Plus, MessageSquare, Trash2, Menu, Loader2, Server } from 'lucide-react';
import Link from 'next/link';
import { useMCP } from './context/MCPContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import SnowEffect from './components/SnowEffect';
import ChristmasTree from './components/ChristmasTree';
import PlayingAnimation from './components/PlayingAnimation';
import {
  ChatSession,
  Message,
  getSessions,
  createSession,
  updateSessionTitle,
  addMessage,
  updateLastMessage,
  deleteSession as deleteSessionFromDb,
  needsMigration,
  migrateFromLocalStorage,
} from '@/lib/chat-storage';

const FOLLOWUP_SEPARATOR = '\n---FOLLOWUP---\n';

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 현재 세션의 메시지 가져오기
  const currentMessages = useMemo(() => {
    return sessions.find(s => s.id === currentSessionId)?.messages || [];
  }, [sessions, currentSessionId]);

  // 새 세션 생성
  const createNewSession = useCallback(async () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: '새로운 채팅',
      messages: [],
      createdAt: Date.now(),
    };

    try {
      await createSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error('세션 생성 실패:', error);
    }
  }, []);

  // 초기 로드 및 마이그레이션
  useEffect(() => {
    const initializeData = async () => {
      try {
        // localStorage에서 마이그레이션 필요 여부 확인
        if (needsMigration()) {
          console.log('localStorage 데이터 마이그레이션 시작...');
          await migrateFromLocalStorage();
        }

        // Supabase에서 세션 로드
        const loadedSessions = await getSessions();
        
        if (loadedSessions.length > 0) {
          setSessions(loadedSessions);
          setCurrentSessionId(loadedSessions[0].id);
        } else {
          // 세션이 없으면 새 세션 생성
          const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: '새로운 채팅',
            messages: [],
            createdAt: Date.now(),
          };
          await createSession(newSession);
          setSessions([newSession]);
          setCurrentSessionId(newSession.id);
        }
      } catch (error) {
        console.error('데이터 초기화 실패:', error);
        // 오류 시에도 빈 세션 생성 시도
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: '새로운 채팅',
          messages: [],
          createdAt: Date.now(),
        };
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeData();
  }, []);

  // 메시지 목록이 변경될 때 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('이 채팅 내역을 삭제하시겠습니까?')) {
      try {
        await deleteSessionFromDb(sessionId);
        const newSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(newSessions);
        
        if (newSessions.length === 0) {
          await createNewSession();
        } else if (currentSessionId === sessionId) {
          setCurrentSessionId(newSessions[0].id);
        }
      } catch (error) {
        console.error('세션 삭제 실패:', error);
      }
    }
  };

  const updateCurrentSessionLocal = (updater: (session: ChatSession) => ChatSession) => {
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return updater(session);
      }
      return session;
    }));
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading || !currentSessionId) return;

    const userMessage: Message = { role: 'user', text: textToSend.trim() };
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession) return;

    const userMessageIndex = currentSession.messages.length;
    const isFirstMessage = currentSession.messages.length === 0;
    const newTitle = isFirstMessage ? userMessage.text.slice(0, 30) : currentSession.title;
    
    // Optimistic update
    updateCurrentSessionLocal(session => {
      const updatedMessages = [...session.messages, userMessage];
      return { ...session, messages: updatedMessages, title: newTitle };
    });
    
    setInput('');
    setIsLoading(true);

    // DB에 사용자 메시지 저장
    try {
      await addMessage(currentSessionId, userMessage, userMessageIndex);
      if (isFirstMessage) {
        await updateSessionTitle(currentSessionId, newTitle);
      }
    } catch (error) {
      console.error('사용자 메시지 저장 실패:', error);
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let modelMessageCreated = false;
    const modelMessageIndex = userMessageIndex + 1;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          model: 'gemini-2.0-flash-001',
          history: currentMessages.map(msg => ({ role: msg.role, text: msg.text }))
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
        throw new Error(error.error || '응답 오류');
      }

      if (!response.body) {
        throw new Error('응답 본문이 없습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let finalMessage: Message | null = null;

      // 스트리밍 응답 처리
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        updateCurrentSessionLocal(session => {
          const updatedMessages = [...session.messages];
          const lastIndex = updatedMessages.length - 1;
          
          // 구분자 기준으로 텍스트와 추천 질문 분리
          const [mainText, followupJson] = fullText.split(FOLLOWUP_SEPARATOR);
          
          let suggestedQuestions: string[] = [];
          if (followupJson) {
            try {
              suggestedQuestions = JSON.parse(followupJson);
            } catch {
              // JSON 파싱 중일 때는 무시
            }
          }

          const newMessage: Message = {
            role: 'model',
            text: mainText || '',
            suggestedQuestions: suggestedQuestions.length > 0 ? suggestedQuestions : undefined
          };
          
          finalMessage = newMessage;
          
          // 사용자 메시지 다음, 혹은 스트리밍 중인 마지막 모델 메시지 찾기
          if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'model') {
            updatedMessages[lastIndex] = newMessage;
          } else {
            updatedMessages.push(newMessage);
          }
          return { ...session, messages: updatedMessages };
        });
      }

      // 스트리밍 완료 후 DB에 모델 메시지 저장
      if (finalMessage) {
        try {
          if (!modelMessageCreated) {
            await addMessage(currentSessionId, finalMessage, modelMessageIndex);
            modelMessageCreated = true;
          } else {
            await updateLastMessage(currentSessionId, modelMessageIndex, finalMessage);
          }
        } catch (error) {
          console.error('모델 메시지 저장 실패:', error);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('메시지 전송 오류:', error);
      const errorMessage: Message = {
        role: 'model',
        text: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      };
      
      updateCurrentSessionLocal(session => ({
        ...session,
        messages: [...session.messages, errorMessage]
      }));

      // 오류 메시지도 DB에 저장
      try {
        await addMessage(currentSessionId, errorMessage, modelMessageIndex);
      } catch (dbError) {
        console.error('오류 메시지 저장 실패:', dbError);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const CodeBlock = ({ language, value }: { language: string, value: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    return (
      <div className="relative group my-4 rounded-lg overflow-hidden border border-border/50">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-border/50 text-xs text-zinc-400">
          <span>{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>복사</span>
              </>
            )}
          </button>
        </div>
        <div className="text-sm [&>pre]:!m-0 [&>pre]:!rounded-none [&>pre]:!bg-zinc-950">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            PreTag="div"
          >
            {value}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  // 초기화 중 로딩 화면
  if (isInitializing) {
    return (
      <div className="flex h-screen bg-zinc-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden relative">
      <SnowEffect />
      <ChristmasTree />
      <PlayingAnimation />
      
      {/* 사이드바 */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-muted/30 border-r border-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col backdrop-blur-sm",
          !isSidebarOpen && "-translate-x-full md:hidden"
        )}
      >
        <div className="p-4 border-b border-border">
          <button
            onClick={createNewSession}
            className="w-full flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            새로운 채팅
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                setCurrentSessionId(session.id);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className={cn(
                "group flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
                currentSessionId === session.id 
                  ? "bg-accent text-accent-foreground font-medium" 
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate">{session.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(e, session.id)}
                className={cn(
                  "opacity-0 group-hover:opacity-100 p-1 hover:bg-background/50 rounded transition-all",
                  currentSessionId === session.id && "opacity-100"
                )}
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 bg-transparent">
        {/* 헤더 */}
        <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3 bg-black/20 backdrop-blur-md sticky top-0 z-10 text-zinc-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 -ml-2 hover:bg-muted rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold truncate">
              {sessions.find(s => s.id === currentSessionId)?.title || 'AI 채팅'}
            </h1>
          </div>
          <Link
            href="/mcp"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Server className="w-4 h-4" />
            <span className="hidden sm:inline">MCP 서버</span>
          </Link>
        </header>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6">
            {currentMessages.length === 0 ? (
              <div className="text-center text-zinc-400 mt-12 animate-in fade-in slide-in-from-bottom-4 bg-black/40 p-6 rounded-2xl backdrop-blur-md border border-white/5">
                <p className="text-lg mb-2 font-medium text-zinc-200">안녕하세요! 무엇을 도와드릴까요?</p>
                <p className="text-sm">새로운 대화를 시작하거나 질문을 입력하세요.</p>
              </div>
            ) : (
              currentMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-black/40 text-zinc-100 border border-white/10 backdrop-blur-md'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code(props) {
                              const { children, className, node, ...rest } = props;
                              const match = /language-(\w+)/.exec(className || '');
                              return match ? (
                                <CodeBlock
                                  language={match[1]}
                                  value={String(children).replace(/\n$/, '')}
                                />
                              ) : (
                                <code {...rest} className={`${className} bg-muted px-1.5 py-0.5 rounded text-sm font-mono`}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {/* 후속 질문 표시 */}
                  {msg.role === 'model' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1 animate-in fade-in slide-in-from-top-2">
                      {msg.suggestedQuestions.map((question, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => sendMessage(question)}
                          className="text-xs bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors backdrop-blur-sm"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && currentMessages[currentMessages.length - 1]?.role === 'user' && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-muted/90 rounded-2xl px-5 py-3 backdrop-blur-sm">
                  <div className="flex gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-75">●</span>
                    <span className="animate-pulse delay-150">●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="border-t border-white/10 px-4 py-4 bg-black/20 backdrop-blur-md">
          <div className="max-w-3xl mx-auto flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
              className="flex-1 min-h-[52px] max-h-[200px] px-4 py-3 border border-white/10 rounded-xl bg-black/40 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none shadow-sm transition-all backdrop-blur-md"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="px-5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm hover:shadow active:scale-95"
              aria-label="메시지 전송"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모바일 사이드바 오버레이 */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
