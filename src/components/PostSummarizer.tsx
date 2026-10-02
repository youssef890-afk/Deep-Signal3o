import { useState } from 'react';
import { AlignLeft, Loader2 } from 'lucide-react';
import { requestPostAi } from '@/lib/aiAssistant';

export default function PostSummarizer({ text }: { text: string }) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const summarize = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      setSummary(await requestPostAi('summarize', text));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر تلخيص المنشور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-2" dir="rtl">
      <button
        type="button"
        onClick={() => void summarize()}
        disabled={!text.trim() || loading}
        title={!text.trim() ? 'لا يوجد وصف نصي لتلخيصه' : 'تلخيص المنشور في ثلاثة أسطر'}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] text-white/55 transition hover:bg-white/[0.05] hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlignLeft className="h-3.5 w-3.5" />}
        {loading ? 'جارٍ التلخيص' : 'ملخص ذكي'}
      </button>
      {error && <p role="alert" className="mt-1 text-[10px] text-rose-300">{error}. يتطلب تفعيل مساعد AI.</p>}
      {summary && <p className="mt-2 whitespace-pre-wrap rounded-lg border border-amber-200/10 bg-amber-200/[0.04] p-3 text-xs leading-6 text-white/75">{summary}</p>}
    </div>
  );
}