import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for type safety
export interface DbChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  session_id: string;
  role: 'user' | 'model';
  text: string;
  suggested_questions: string[] | null;
  images: string[] | null;
  order_index: number;
  created_at: string;
}

// Storage bucket name
const CHAT_IMAGES_BUCKET = 'chat-images';

// Upload image to Supabase Storage
export async function uploadChatImage(
  base64Data: string,
  mimeType: string = 'image/webp'
): Promise<string | null> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = mimeType.split('/')[1] || 'webp';
    const fileName = `${timestamp}-${random}.${extension}`;
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Upload to Storage
    const { data, error } = await supabase.storage
      .from(CHAT_IMAGES_BUCKET)
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: false
      });
    
    if (error) {
      console.error('Failed to upload image:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CHAT_IMAGES_BUCKET)
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

// Upload multiple images
export async function uploadChatImages(
  images: Array<{ data: string; mimeType?: string }>
): Promise<string[]> {
  const urls: string[] = [];
  
  for (const img of images) {
    const url = await uploadChatImage(img.data, img.mimeType || 'image/webp');
    if (url) {
      urls.push(url);
    }
  }
  
  return urls;
}

