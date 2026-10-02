import { useState } from 'react';
import { Check, Hash, Loader2, RotateCcw, SpellCheck, WandSparkles } from 'lucide-react';
import { requestPostAi, type PostAiAction, type PostTone } from '@/lib/aiAssistant';

interface SmartPostAssistantProps {
  text: string;
  onApply: (text: string) => void;
}

const tones: { id: PostTone; label: string }[] = [
  { id: 'playful', label: 'مرح' },
  { id: 'professional', label: 'احترافي' },
  { id: 'energetic', label: 'حماسي' },
];

export default function SmartPostAssistant({ text, onApply }: SmartPostAssistantProps) {
  const [tone, setTone] = useState<PostTone>('playful');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState<PostAiAction | null>(null);

  const run = async (action: PostAiAction) => {
    if (!text.trim() || loadingAction) return;
    setError('');
    setResult('');
    setLoadingAction(action);
    try {
      setResult(await requestPostAi(action, text, tone));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر استخدام المساعد');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3" dir="rtl" aria-label="مساعد الكتابة الذكي">
      <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
        <WandSparkles className="h-4 w-4 text-amber-300" /> مساعد الكتابة
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void run('proofread')} disabled={!text.trim() || Boolean(loadingAction)} title="تصحيح الكتابة" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 text-[11px] text-white/75 hover:bg-white/10 disabled:opacity-40">
          {loadingAction === 'proofread' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SpellCheck className="h-3.5 w-3.5" />} تصحيح
        </button>
        <button type="button" onClick={() => void run('hashtags')} disabled={!text.trim() || Boolean(loadingAction)} title="اقتراح هاشتاغات" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 text-[11px] text-white/75 hover:bg-white/10 disabled:opacity-40">
          {loadingAction === 'hashtags' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hash className="h-3.5 w-3.5" />} هاشتاغات
        </button>
        <div className="flex rounded-lg border border-white/10 bg-black/20 p-0.5" role="group" aria-label="نبرة النص">
          {tones.map((item) => (
            <button key={item.id} type="button" onClick={() => setTone(item.id)} aria-pressed={tone === item.id} className={`rounded-md px-2 py-1 text-[10px] ${tone === item.id ? 'bg-rose-500/20 text-rose-200' : 'text-white/45 hover:text-white/80'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void run('tone')} disabled={!text.trim() || Boolean(loadingAction)} title="إعادة الصياغة بالنبرة المختارة" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 text-[11px] text-white/75 hover:bg-white/10 disabled:opacity-40">
          {loadingAction === 'tone' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />} غيّر النبرة
        </button>
      </div>
      {error && <p role="alert" className="text-[11px] text-rose-300">{error}. خاص نشر Edge Function وضبط OPENAI_API_KEY.</p>}
      {result && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="whitespace-pre-wrap text-xs leading-6 text-white/80">{result}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setResult('')} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-white/45 hover:text-white"><RotateCcw className="h-3 w-3" /> إلغاء</button>
            {loadingAction !== 'hashtags' && (
              <button type="button" onClick={() => { onApply(result); setResult(''); }} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/25"><Check className="h-3 w-3" /> استعمال النص</button>
            )}
            {loadingAction === 'hashtags' && (
              <button type="button" onClick={() => { onApply(`${text.trim()}\n\n${result}`); setResult(''); }} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/25"><Check className="h-3 w-3" /> إضافة الهاشتاغات</button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}