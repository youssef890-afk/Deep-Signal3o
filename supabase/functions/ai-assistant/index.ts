import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Action = 'proofread' | 'hashtags' | 'tone' | 'summarize' | 'generate-image';

const systemPrompts: Record<Exclude<Action, 'generate-image'>, string> = {
  proofread: 'صحح الإملاء والنحو فقط مع الحفاظ على لغة النص ومعناه ولهجة الكاتب. أخرج النص المصحح وحده.',
  hashtags: 'اقترح من 5 إلى 8 هاشتاغات مناسبة ومختصرة بلغة النص. أخرج الهاشتاغات فقط، بلا شرح.',
  tone: 'أعد صياغة النص بالنبرة المحددة مع الحفاظ على معناه ولغته. أخرج النص الجديد فقط.',
  summarize: 'لخص النص في ثلاثة أسطر قصيرة كحد أقصى. لا تضف معلومات غير موجودة في النص. أخرج الملخص فقط.',
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return Response.json({ error: 'AI is not configured' }, { status: 503, headers: corsHeaders });

  try {
    const { action, text, tone } = await request.json() as { action: Action; text: string; tone?: string };
    if (!text?.trim() || text.length > 8000) {
      return Response.json({ error: 'Text must contain 1-8000 characters' }, { status: 400, headers: corsHeaders });
    }

    if (action === 'generate-image') {
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-1', prompt: text, size: '1024x1024', quality: 'low', n: 1 }),
      });
      const imageData = await imageResponse.json();
      if (!imageResponse.ok) return Response.json({ error: imageData.error?.message ?? 'Image generation failed' }, { status: 502, headers: corsHeaders });
      return Response.json({ imageBase64: imageData.data?.[0]?.b64_json }, { headers: corsHeaders });
    }

    if (!(action in systemPrompts)) return Response.json({ error: 'Unsupported action' }, { status: 400, headers: corsHeaders });
    const systemPrompt = action === 'tone'
      ? `${systemPrompts.tone} النبرة المطلوبة: ${tone === 'professional' ? 'احترافية' : tone === 'energetic' ? 'حماسية' : 'مرحة'}.`
      : systemPrompts[action as Exclude<Action, 'generate-image'>];

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
        max_tokens: action === 'summarize' ? 180 : 500,
        temperature: 0.4,
      }),
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) return Response.json({ error: data.error?.message ?? 'AI request failed' }, { status: 502, headers: corsHeaders });
    return Response.json({ result: data.choices?.[0]?.message?.content?.trim() ?? '' }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: 'Invalid AI request' }, { status: 400, headers: corsHeaders });
  }
});