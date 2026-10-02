import { useState } from 'react';
import { Ban, Flag, LoaderCircle, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type ReportReason = 'spam' | 'harassment' | 'hate' | 'inappropriate' | 'other';

interface Props {
  targetUserId: string;
  targetPostId?: string;
  onBlocked?: () => void;
}

const reportReasons: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'رسائل أو محتوى مزعج' },
  { value: 'harassment', label: 'تحرش أو تنمر' },
  { value: 'hate', label: 'خطاب كراهية' },
  { value: 'inappropriate', label: 'محتوى غير مناسب' },
  { value: 'other', label: 'سبب آخر' },
];

export default function SafetyActions({ targetUserId, targetPostId, onBlocked }: Props) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<'report' | 'block' | null>(null);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function handleReport() {
    if (!user) return;
    setLoading(true);
    setError('');
    const { error: reportError } = await supabase.from('content_reports').insert({
      reporter_id: user.id,
      reported_user_id: targetUserId,
      post_id: targetPostId ?? null,
      reason,
      details: details.trim() || null,
    });
    setLoading(false);
    if (reportError) {
      setError('تعذر إرسال التبليغ. حاول مرة أخرى.');
      return;
    }
    setDialog(null);
    setDetails('');
    setNotice('توصلنا بالتبليغ ديالك.');
  }

  async function handleBlock() {
    if (!user) return;
    setLoading(true);
    setError('');
    const { error: blockError } = await supabase.from('user_blocks').insert({
      blocker_id: user.id,
      blocked_id: targetUserId,
    });
    setLoading(false);
    if (blockError) {
      setError('تعذر حظر هذا المستخدم.');
      return;
    }
    setDialog(null);
    setMenuOpen(false);
    setNotice('تم حظر المستخدم.');
    onBlocked?.();
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="خيارات الأمان"
        aria-expanded={menuOpen}
        onClick={() => { setMenuOpen((open) => !open); setNotice(''); setError(''); }}
        className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-1 shadow-xl" dir="rtl">
          <button
            type="button"
            onClick={() => { setDialog('report'); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-xs text-white/85 transition hover:bg-white/[0.08]"
          >
            <Flag className="h-4 w-4 text-amber-300" />
            التبليغ عن {targetPostId ? 'المنشور' : 'المستخدم'}
          </button>
          <button
            type="button"
            onClick={() => { setDialog('block'); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-xs text-rose-300 transition hover:bg-white/[0.08]"
          >
            <Ban className="h-4 w-4" />
            حظر المستخدم
          </button>
        </div>
      )}

      {notice && <p role="status" className="absolute left-0 top-11 z-20 w-52 rounded-lg bg-emerald-950 px-3 py-2 text-xs text-emerald-200">{notice}</p>}

      {dialog && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4" dir="rtl">
          <section role="dialog" aria-modal="true" aria-labelledby="safety-dialog-title" className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="safety-dialog-title" className="text-base font-bold text-white">
                {dialog === 'report' ? 'التبليغ عن المحتوى' : 'حظر المستخدم'}
              </h2>
              <button type="button" aria-label="إغلاق" onClick={() => { setDialog(null); setError(''); }} className="grid h-8 w-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {dialog === 'report' ? (
              <div className="space-y-3">
                <label className="block text-xs text-white/65">
                  سبب التبليغ
                  <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white">
                    {reportReasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="block text-xs text-white/65">
                  تفاصيل إضافية
                  <textarea value={details} onChange={(event) => setDetails(event.target.value.slice(0, 1000))} rows={3} maxLength={1000} className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-white/30" placeholder="اختياري" />
                </label>
              </div>
            ) : (
              <p className="text-sm leading-6 text-white/70">من بعد الحظر، ما غاديش تبقاو تشوفو حسابات ومنشورات بعضياتكم، وما غاديش تقدروا تبعثو رسائل أو متابعة.</p>
            )}

            {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => { setDialog(null); setError(''); }} disabled={loading} className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.06]">إلغاء</button>
              <button type="button" onClick={() => void (dialog === 'report' ? handleReport() : handleBlock())} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : dialog === 'report' ? <Flag className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                {dialog === 'report' ? 'إرسال التبليغ' : 'حظر'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}