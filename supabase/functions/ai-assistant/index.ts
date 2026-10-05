import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_TEXT_ACTIONS = ['proofread', 'hashtags', 'tone', 'summarize'] as const;
type TextAction = (typeof ALLOWED_TEXT_ACTIONS)[number];
const IMAGE_ACTION = 'generate-image';

const MAX_TEXT_CHARS = 8000;
const MAX_IMAGE_PROMPT_CHARS = 600;
const TONES = ['playful', 'professional', 'energetic'] as const;

/*
 * Quotas are deliberately environment-driven. The client can never widen them,
 * and no price is hard-coded: cost estimation uses configurable per-1k-token
 * rates so pricing changes never require a code change.
 */
const LIMITS = {
  text: { limit: numEnv('AI_RATE_LIMIT_TEXT', 30), windowSeconds: numEnv('AI_RATE_WINDOW_TEXT', 3600) },
  image: { limit: numEnv('AI_RATE_LIMIT_IMAGE', 5), windowSeconds: numEnv('AI_RATE_WINDOW_IMAGE', 86400) },
};

const MODELS = {
  text: Deno.env.get('AI_TEXT_MODEL') ?? 'gpt-4o-mini',
  image: Deno.env.get('AI_IMAGE_MODEL') ?? 'gpt-image-1',
};

const PROVIDER = Deno.env.get('AI_PROVIDER') ?? 'openai';

function numEnv(name: string, fallback: number): number {
  const parsed = Number(Deno.env.get(name));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function rateEnv(name: string): number {
  const parsed = Number(Deno.env.get(name));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function originHeaders(request: Request): Record<string, string> {
  const requestOrigin = request.headers.get('origin') ?? '';
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  // Empty configuration keeps the historical "*" behaviour (the function is
  // authenticated, so this is not an authentication bypass).
  const allowOrigin =
    configured.length === 0
      ? '*'
      : configured.includes(requestOrigin)
        ? requestOrigin
        : configured[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

const systemPrompts: Record<TextAction, string> = {
  proofread: 'صحح الإملاء والنحو فقط مع الحفاظ على لغة النص ومعناه ولهجة الكاتب. أخرج النص المصحح وحده.',
  hashtags: 'اقترح من 5 إلى 8 هاشتاغات مناسبة ومختصرة بلغة النص. أخرج الهاشتاغات فقط، بلا شرح.',
  tone: 'أعد صياغة النص بالنبرة المحددة مع الحفاظ على معناه ولغته. أخرج النص الجديد فقط.',
  summarize: 'لخص النص في ثلاثة أسطر قصيرة كحد أقصى. لا تضف معلومات غير موجودة في النص. أخرج الملخص فقط.',
};

const toneLabels: Record<(typeof TONES)[number], string> = {
  professional: 'احترافية',
  energetic: 'حماسية',
  playful: 'مرحة',
};

/*
 * Cost is never hard-coded. Rates come from Edge Function secrets so pricing can
 * change without a code change; a missing rate records zero instead of guessing.
 */
function estimateCost(kind: 'text' | 'image', inputTokens: number, outputTokens: number): number {
  const inputRate = rateEnv('AI_COST_PER_1K_INPUT_USD');
  const outputRate = rateEnv('AI_COST_PER_1K_OUTPUT_USD');
  const imageRate = rateEnv('AI_COST_PER_IMAGE_USD');
  const cost = kind === 'image'
    ? imageRate
    : (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate;
  return Math.round(cost * 1e8) / 1e8;
}

Deno.serve(async (request) => {
  const headers = originHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !anonKey) {
    return json({ error: 'Authentication required' }, 401, headers);
  }

  // The caller's JWT is the only caller identity. The same client is reused for
  // the quota RPC so `auth.uid()` inside the database matches this request.
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Authentication required' }, 401, headers);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return json({ error: 'AI is not configured' }, 503, headers);

  let body: { action?: string; text?: string; tone?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid AI request' }, 400, headers);
  }

  const action = body.action;
  const text = typeof body.text === 'string' ? body.text : '';
  if (action !== IMAGE_ACTION && !(ALLOWED_TEXT_ACTIONS as readonly string[]).includes(action ?? '')) {
    return json({ error: 'Unsupported action' }, 400, headers);
  }

  const kind = action === IMAGE_ACTION ? 'image' : 'text';
  const maxChars = kind === 'image' ? MAX_IMAGE_PROMPT_CHARS : MAX_TEXT_CHARS;
  if (!text.trim() || text.length > maxChars) {
    return json({ error: `Text must contain 1-${maxChars} characters` }, 400, headers);
  }

  if (kind === 'text' && body.tone !== undefined && !(TONES as readonly string[]).includes(body.tone)) {
    return json({ error: 'Unsupported tone' }, 400, headers);
  }

  // Server-side rate limit. `consume_ai_quota` is SECURITY DEFINER and reads
  // `auth.uid()`, so a client cannot widen its own allowance.
  const quota = LIMITS[kind];
  const { data: quotaRow, error: quotaError } = await client.rpc('consume_ai_quota', {
    p_bucket: kind === 'image' ? 'ai-assistant-image' : 'ai-assistant-text',
    p_limit: quota.limit,
    p_window_seconds: quota.windowSeconds,
    p_request_type: kind === 'image' ? IMAGE_ACTION : String(action),
    p_provider: PROVIDER,
    p_model: MODELS[kind],
  });

  if (quotaError || !quotaRow?.[0]) {
    console.error('ai quota check failed:', quotaError?.message);
    return json({ error: 'AI usage is unavailable' }, 503, headers);
  }

  const reservation = quotaRow[0] as { allowed: boolean; usage_id: string | null };
  if (!reservation.allowed) {
    return json({ error: 'Usage limit reached. Try again later.' }, 429, {
      ...headers,
      'Retry-After': String(quota.windowSeconds),
    });
  }

  const usageId = reservation.usage_id;
  const startedAt = Date.now();

  const finalize = async (inputTokens: number, outputTokens: number, status: 'succeeded' | 'failed') => {
    if (!usageId) return;
    const { error: finalizeError } = await client.rpc('finalize_ai_usage', {
      p_usage_id: usageId,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_estimated_cost_usd: estimateCost(kind, inputTokens, outputTokens),
      p_latency_ms: Date.now() - startedAt,
      p_status: status,
    });
    if (finalizeError) console.error('ai_usage finalize failed:', finalizeError.message);
  };

  if (kind === 'image') {
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODELS.image, prompt: text, size: '1024x1024', quality: 'low', n: 1 }),
    });
    const imageData = await imageResponse.json().catch(() => null);
    if (!imageResponse.ok || !imageData?.data?.[0]?.b64_json) {
      // Provider error details stay server-side; the client gets a generic message.
      console.error('AI image request failed:', imageResponse.status, imageData?.error?.message);
      await finalize(0, 0, 'failed');
      return json({ error: 'Image generation failed' }, 502, headers);
    }
    await finalize(0, 1, 'succeeded');
    return json({ imageBase64: imageData.data[0].b64_json }, 200, headers);
  }

  const textAction = action as TextAction;
  const systemPrompt = textAction === 'tone'
    ? `${systemPrompts.tone} النبرة المطلوبة: ${toneLabels[(body.tone as (typeof TONES)[number]) ?? 'playful']}.`
    : systemPrompts[textAction];

  try {
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELS.text,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
        max_tokens: textAction === 'summarize' ? 180 : 500,
        temperature: 0.4,
      }),
    });

    const data = await aiResponse.json().catch(() => null);
    if (!aiResponse.ok) {
      console.error('AI text request failed:', aiResponse.status, data?.error?.message);
      await finalize(0, 0, 'failed');
      return json({ error: 'AI request failed' }, 502, headers);
    }

    await finalize(
      Number(data?.usage?.prompt_tokens ?? 0),
      Number(data?.usage?.completion_tokens ?? 0),
      'succeeded',
    );
    return json({ result: data?.choices?.[0]?.message?.content?.trim() ?? '' }, 200, headers);
  } catch (error) {
    console.error('ai-assistant crashed:', error instanceof Error ? error.message : error);
    await finalize(0, 0, 'failed');
    return json({ error: 'AI request failed' }, 502, headers);
  }
});