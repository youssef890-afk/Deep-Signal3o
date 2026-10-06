import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Check, CircleHelp, Loader2, Plus, Sparkles } from 'lucide-react';
import { sendJokalMessage } from '@/lib/jokal/client';
import { JOKAL_LIMITS, type JokalProposal, type JokalStage } from '@/lib/jokal/types';

type ProjectScope = 'standard' | 'pro';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const stageLabels: Record<JokalStage, string> = {
  conversation: 'الفكرة',
  analysis: 'تحليل الفكرة',
  clarifying_questions: 'توضيح المتطلبات',
  proposal: 'إعداد المواصفات',
  approval: 'المراجعة',
  project: 'المشروع',
  builder: 'التنفيذ',
  usage: 'الاستخدام',
  providers: 'المزوّد',
  security: 'الحماية',
};

function ProposalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/10 py-4 first:border-0 first:pt-0">
      <h3 className="mb-2 text-xs font-semibold text-white/60">{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-white/35">غير محدد</p>;
  return (
    <ul className="space-y-1.5 text-sm leading-6 text-white/75">
      {items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span className="text-rose-300">•</span><span>{item}</span></li>)}
    </ul>
  );
}

function ProposalView({ proposal }: { proposal: JokalProposal }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-rose-200">{proposal.projectType}</p>
        <h2 className="mt-1 text-xl font-bold text-white">{proposal.projectName}</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">{proposal.shortDescription}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-md border border-white/10 px-2 py-1 text-white/65">التعقيد: {proposal.estimatedComplexity}</span>
        <span className="rounded-md border border-white/10 px-2 py-1 text-white/65">الجهد: {proposal.estimatedDevelopmentEffort}</span>
      </div>
      <ProposalSection title="المشكلة والحل">
        <p className="text-sm leading-6 text-white/75">{proposal.mainProblem}</p>
        <p className="mt-2 text-sm leading-6 text-white/75">{proposal.solution}</p>
      </ProposalSection>
      <ProposalSection title="الفئة المستهدفة">
        <p className="text-sm leading-6 text-white/75">{proposal.targetAudience}</p>
      </ProposalSection>
      <ProposalSection title="الميزات الأساسية"><BulletList items={proposal.coreFeatures} /></ProposalSection>
      <ProposalSection title="ميزات إضافية"><BulletList items={proposal.optionalFeatures} /></ProposalSection>
      <ProposalSection title="الشاشات">
        <div className="space-y-3">
          {proposal.screens.map((screen, index) => (
            <div key={`${screen.name}-${index}`}>
              <p className="text-sm font-medium text-white/80">{screen.name}</p>
              <p className="text-xs leading-5 text-white/50">{screen.purpose}</p>
              <BulletList items={screen.keyElements} />
            </div>
          ))}
        </div>
      </ProposalSection>
      <ProposalSection title="مراحل التنفيذ">
        <div className="space-y-3">
          {proposal.implementationPhases.map((phase, index) => (
            <div key={`${phase.name}-${index}`}>
              <p className="text-sm font-medium text-white/80">{index + 1}. {phase.name}</p>
              <BulletList items={phase.deliverables} />
            </div>
          ))}
        </div>
      </ProposalSection>
      <ProposalSection title="المخاطر والتخفيف">
        {proposal.risks.length === 0 ? <p className="text-sm text-white/35">ما تحدد حتى خطر</p> : (
          <ul className="space-y-3">
            {proposal.risks.map((risk, index) => <li key={`${risk.title}-${index}`}><p className="text-sm text-white/80">{risk.title}</p><p className="text-xs leading-5 text-white/50">{risk.mitigation}</p></li>)}
          </ul>
        )}
      </ProposalSection>
      <ProposalSection title="متطلبات الحماية"><BulletList items={proposal.securityRequirements} /></ProposalSection>
      <p className="border-t border-white/10 pt-3 text-[11px] leading-5 text-white/40">هاد الاقتراح للمراجعة فقط؛ ما كاين لا بناء تلقائي لا نشر.</p>
    </div>
  );
}

export default function JokalPage() {
  const [scope, setScope] = useState<ProjectScope>('standard');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<JokalProposal | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [stage, setStage] = useState<JokalStage>('conversation');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [error, setError] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);
  const scopeLocked = messages.length > 0 || Boolean(conversationId);

  useEffect(() => {
    if (!coolingDown) return;
    const timeout = window.setTimeout(() => setCoolingDown(false), JOKAL_LIMITS.requestCooldownMs);
    return () => window.clearTimeout(timeout);
  }, [coolingDown]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  function startNewProject() {
    setScope('standard');
    setMessages([]);
    setConversationId(null);
    setProposal(null);
    setClarifyingQuestions([]);
    setStage('conversation');
    setDraft('');
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending || coolingDown) return;

    const scopeDescription = scope === 'pro'
      ? 'Pro: اقترح تجربة أغنى وميزات متقدمة وتكاملات مفيدة عند الحاجة، مع توضيح ما هو أساسي وما هو اختياري.'
      : 'العادية: ركّز على حل أساسي واضح، أقل عدد من الميزات، وتنفيذ أبسط؛ اجعل التوسعات اختيارية.';
    const requestMessage = conversationId
      ? message
      : `نطاق المشروع المختار: النسخة ${scope === 'pro' ? 'Pro' : 'العادية'}. ${scopeDescription}\nفكرة المشروع أو التفاصيل: ${message}`;

    setMessages((current) => [...current, { role: 'user', content: message }]);
    setDraft('');
    setSending(true);
    setCoolingDown(true);
    setError('');

    const result = await sendJokalMessage({ message: requestMessage, conversationId });
    setSending(false);

    if (result.error) {
      setMessages((current) => current.slice(0, -1));
      setDraft(message);
      setError(result.retryAfterSeconds
        ? `تجاوزتي الحد المؤقت. عاود من بعد ${result.retryAfterSeconds} ثانية.`
        : result.error);
      return;
    }

    if (result.conversationId) setConversationId(result.conversationId);
    setStage(result.stage);
    setClarifyingQuestions(result.clarifyingQuestions);
    if (result.proposal) setProposal(result.proposal);
    if (result.reply) setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1180px] px-4 py-6 pb-10 sm:px-6" dir="rtl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-400/10 text-rose-200"><Sparkles className="h-5 w-5" /></span>
          <div>
            <p className="text-xs text-rose-200">Jokal · تخطيط الأفكار</p>
            <h1 className="mt-1 text-xl font-bold text-white">من الفكرة للمواصفات</h1>
          </div>
        </div>
        <button type="button" onClick={startNewProject} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white">
          <Plus className="h-4 w-4" /> مشروع جديد
        </button>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs" aria-label="مرحلة تخطيط المشروع">
        {(['conversation', 'clarifying_questions', 'proposal'] as JokalStage[]).map((item, index) => {
          const isCurrent = item === stage || (item === 'clarifying_questions' && stage === 'analysis') || (item === 'proposal' && proposal !== null);
          const isComplete = index === 0 ? messages.length > 0 : index === 1 ? Boolean(proposal) : false;
          return (
            <span key={item} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${isCurrent || isComplete ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-white/10 text-white/40'}`}>
              {isComplete ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{index + 1}</span>}
              {stageLabels[item]}
            </span>
          );
        })}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 space-y-5">
          <fieldset className="border-b border-white/10 pb-5" disabled={scopeLocked || sending}>
            <legend className="mb-3 text-sm font-semibold text-white">نطاق النسخة</legend>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'standard', title: 'العادية', description: 'الأساسيات أولاً' },
                { id: 'pro', title: 'Pro', description: 'نطاق أوسع وميزات متقدمة' },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={scope === option.id}
                  onClick={() => setScope(option.id)}
                  className={`min-w-0 rounded-lg border p-3 text-right transition ${scope === option.id ? 'border-rose-300/50 bg-rose-300/[0.08]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'} disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
                    {option.title}
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${scope === option.id ? 'border-rose-200 bg-rose-300 text-[#171014]' : 'border-white/25'}`}>{scope === option.id && <Check className="h-3 w-3" />}</span>
                  </span>
                  <span className="mt-1 block text-xs text-white/45">{option.description}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/35">اختيار نطاق للمواصفات، ماشي اشتراك أو ثمن.</p>
          </fieldset>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <CircleHelp className="h-4 w-4 text-rose-200" />
              <h2 className="text-sm font-semibold text-white">الفكرة والمحادثة</h2>
            </div>
            {messages.length > 0 && (
              <div ref={transcriptRef} className="mb-3 max-h-[min(38vh,360px)] space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/10 p-3" aria-live="polite">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`max-w-[92%] rounded-lg px-3 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'mr-auto bg-rose-300/10 text-rose-50' : 'ml-auto bg-white/[0.06] text-white/80'}`}>
                    <p className="mb-1 text-[10px] text-white/40">{message.role === 'user' ? 'أنت' : 'Jokal'}</p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
                {sending && <div role="status" className="flex items-center gap-2 text-xs text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Jokal كيراجع التفاصيل</div>}
              </div>
            )}

            {clarifyingQuestions.length > 0 && !proposal && (
              <section className="mb-3 rounded-lg border border-amber-200/15 bg-amber-200/[0.04] p-3" aria-label="أسئلة توضيحية">
                <h3 className="mb-2 text-xs font-semibold text-amber-100">أسئلة توضيحية</h3>
                <ol className="list-inside list-decimal space-y-1 text-xs leading-5 text-white/65">
                  {clarifyingQuestions.map((question, index) => <li key={`${question}-${index}`}>{question}</li>)}
                </ol>
              </section>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
              <label htmlFor="jokal-draft" className="sr-only">تفاصيل الفكرة أو جواب على الأسئلة</label>
              <textarea
                id="jokal-draft"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={JOKAL_LIMITS.maxIdeaChars}
                rows={4}
                placeholder={messages.length ? 'جاوب على الأسئلة أو زيد وضّح الفكرة...' : 'شنو الفكرة؟ شكون غادي يستعملها؟ وشنو المشكل اللي كتحل؟'}
                className="block min-h-28 w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-rose-200/35"
              />
              {error && <p role="alert" className="text-xs leading-5 text-rose-200">{error}</p>}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-white/35">{draft.length}/{JOKAL_LIMITS.maxIdeaChars}</span>
                <button type="submit" disabled={!draft.trim() || sending || coolingDown} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-400 px-4 text-sm font-semibold text-[#180d12] transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-45">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                  {messages.length ? 'إرسال التفاصيل' : 'ابدأ التخطيط'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="min-w-0 border-t border-white/10 pt-5 lg:border-r lg:border-t-0 lg:pr-6 lg:pt-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-rose-200">{scope === 'pro' ? 'نطاق Pro' : 'النطاق العادي'}</p>
              <h2 className="mt-1 text-base font-bold text-white">مواصفات المشروع</h2>
            </div>
            {proposal && <span className="rounded-md bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-100">جاهز للمراجعة</span>}
          </div>
          {proposal ? (
            <ProposalView proposal={proposal} />
          ) : (
            <div className="flex min-h-56 items-center justify-center border-y border-dashed border-white/10 px-5 text-center">
              <div className="max-w-xs">
                <Sparkles className="mx-auto h-5 w-5 text-rose-200/70" />
                <p className="mt-3 text-sm text-white/60">{stage === 'conversation' ? 'المواصفات غادي تبان هنا من بعد ما تتوضح الفكرة.' : 'كنجمعو التفاصيل اللازمة للاقتراح.'}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}