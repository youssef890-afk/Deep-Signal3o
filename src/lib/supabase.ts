import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * A missing or misspelled `VITE_SUPABASE_URL` used to throw here, at import
 * time. An import-time throw happens before React renders, so the error
 * boundary could not catch it and the user only saw a blank screen with no
 * clue about the cause. We now fail loudly and legibly instead.
 *
 * Only the publishable/anon key belongs here. The service-role key must never
 * be used in the browser: it bypasses Row Level Security.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function missingKeys(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl || supabaseUrl === 'undefined') missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey || supabaseAnonKey === 'undefined') missing.push('VITE_SUPABASE_ANON_KEY');
  return missing;
}

const missing = missingKeys();

if (missing.length > 0 && import.meta.env.PROD) {
  // In production this renders a setup screen rather than a blank page.
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <main dir="rtl" style="min-height:100vh;display:grid;place-items:center;background:#090D16;color:#fff;font-family:system-ui,sans-serif;padding:24px">
        <section style="max-width:520px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:28px;text-align:center">
          <h1 style="font-size:18px;margin:0 0 12px">الإعدادات ناقصة</h1>
          <p style="font-size:14px;line-height:1.9;color:#c9c9d4;margin:0 0 16px">
            التطبيق ما قدرش يتصل بقاعدة البيانات. المتغيرات التالية ناقصة أو مكتوبة بخطأ:
          </p>
          <ul style="list-style:none;padding:0;margin:0 0 16px;font-family:ui-monospace,monospace;font-size:13px;color:#fca5a5">
            ${missing.map((key) => `<li>${key}</li>`).join('')}
          </ul>
          <p style="font-size:13px;line-height:1.9;color:#a1a1aa;margin:0">
            زيدهم فـ <code>.env</code> أو فـ إعدادات المشروع (Vercel / Supabase) من بعد أعيد البناء.
            استعمل مفتاح <code>anon / publishable</code> فقط، عمرك ما تستعمل <code>service_role</code> فالمتصفح.
          </p>
        </section>
      </main>`;
  }
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
