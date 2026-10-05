import { supabase } from '@/lib/supabase';
import {
  JOKAL_LIMITS,
  isValidJokalProposal,
  type JokalChatResponse,
} from '@/lib/jokal/types';

/**
 * Jokal AI — browser client.
 *
 * This module only *talks* to the `jokal-chat` Edge Function. It holds no
 * provider key, performs no provider call, and trusts nothing the server says:
 * `isValidJokalProposal` re-validates the payload at this trust boundary.
 */

function toFriendlyError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'تعذر الاتصال بمساعد Jokal. حاول من بعد.';
}

/** Read the server-provided retry hint from a FunctionsHttpError context. */
function retryAfterFrom(error: unknown): number | undefined {
  const context = (error as { context?: Response } | null)?.context;
  const header = context?.headers?.get?.('Retry-After');
  const parsed = Number(header);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

export interface SendIdeaInput {
  message: string;
  conversationId?: string | null;
}

export async function sendJokalMessage({
  message,
  conversationId = null,
}: SendIdeaInput): Promise<JokalChatResponse> {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      conversationId,
      messageId: null,
      stage: 'conversation',
      status: 'draft',
      approval: 'not_required',
      reply: '',
      clarifyingQuestions: [],
      proposal: null,
      usage: null,
      error: 'اكتب الفكرة ديالك قبل ما تبعثها.',
    };
  }

  if (trimmed.length > JOKAL_LIMITS.maxIdeaChars) {
    return {
      conversationId,
      messageId: null,
      stage: 'conversation',
      status: 'draft',
      approval: 'not_required',
      reply: '',
      clarifyingQuestions: [],
      proposal: null,
      usage: null,
      error: `الفكرة طويلة بزاف. الحد الأقصى ${JOKAL_LIMITS.maxIdeaChars} حرف.`,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('jokal-chat', {
      body: { message: trimmed, conversationId },
    });

    if (error) {
      return {
        conversationId,
        messageId: null,
        stage: 'conversation',
        status: 'draft',
        approval: 'not_required',
        reply: '',
        clarifyingQuestions: [],
        proposal: null,
        usage: null,
        error: toFriendlyError(error),
        retryAfterSeconds: retryAfterFrom(error),
      };
    }

    const payload = (data ?? {}) as Partial<JokalChatResponse>;

    // Never render a proposal that failed validation on the client.
    const proposal = payload.proposal && isValidJokalProposal(payload.proposal)
      ? payload.proposal
      : null;

    return {
      conversationId: payload.conversationId ?? conversationId,
      messageId: payload.messageId ?? null,
      stage: payload.stage ?? 'conversation',
      status: payload.status ?? 'draft',
      approval: payload.approval ?? 'not_required',
      reply: typeof payload.reply === 'string' ? payload.reply : '',
      clarifyingQuestions: Array.isArray(payload.clarifyingQuestions)
        ? payload.clarifyingQuestions.filter(isNonEmptyString).slice(0, JOKAL_LIMITS.maxClarifyingQuestions)
        : [],
      proposal,
      usage: payload.usage ?? null,
      error: proposal === null && payload.proposal ? 'ما توصلناش بعرض صالح من Jokal.' : undefined,
    };
  } catch (error) {
    return {
      conversationId,
      messageId: null,
      stage: 'conversation',
      status: 'draft',
      approval: 'not_required',
      reply: '',
      clarifyingQuestions: [],
      proposal: null,
      usage: null,
      error: toFriendlyError(error),
    };
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}