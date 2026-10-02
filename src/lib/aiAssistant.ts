import { supabase } from '@/lib/supabase';

export type PostAiAction = 'proofread' | 'hashtags' | 'tone' | 'summarize';
export type PostTone = 'playful' | 'professional' | 'energetic';

export async function requestPostAi(action: PostAiAction, text: string, tone?: PostTone) {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { action, text, tone },
  });

  if (error) throw new Error(error.message || 'تعذر الاتصال بمساعد الذكاء الاصطناعي');
  if (typeof data?.result !== 'string' || !data.result.trim()) {
    throw new Error('ما توصلناش بنتيجة صالحة من المساعد');
  }
  return data.result.trim();
}

export async function generateAiImage(prompt: string) {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { action: 'generate-image', text: prompt },
  });

  if (error) throw new Error(error.message || 'تعذر توليد الصورة');
  if (typeof data?.imageBase64 !== 'string') throw new Error('ما توصلناش بالصورة المولدة');
  return data.imageBase64 as string;
}