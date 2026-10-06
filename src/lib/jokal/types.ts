/**
 * Jokal AI — domain types.
 *
 * This module is the shared contract between the browser and the `jokal-chat`
 * Edge Function. It intentionally contains no provider SDK, no API key and no
 * business logic: it is types plus a small amount of pure validation so the
 * browser and the function can never disagree about the shape of a proposal.
 *
 * Ownership and legal note: Jokal never states that an idea becomes the property
 * of Youssef. Ownership terms are data, not code — see `ownership_terms` in
 * the proposal and `TERMS_VERSION` below. Nothing here is legal advice.
 */

/** Lifecycle of a Jokal project. Transitions are enforced server-side. */
export type JokalProjectStatus =
  | 'draft'
  | 'analyzing'
  | 'proposal_ready'
  | 'awaiting_approval'
  | 'approved'
  | 'building'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Ordered pipeline stage, exposed to the UI as a progress step. */
export type JokalStage =
  | 'conversation'
  | 'analysis'
  | 'clarifying_questions'
  | 'proposal'
  | 'approval'
  | 'project'
  | 'builder'
  | 'usage'
  | 'providers'
  | 'security';

/**
 * The approval gate. A project builder must never run unless this is
 * `approved`, and only an explicit human action may set it.
 */
export type JokalApprovalState = 'not_required' | 'pending' | 'approved' | 'rejected' | 'revoked';

/** Provider-neutral request/response envelope. */
export interface JokalChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface JokalUsageRecord {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Server-estimated cost. Never computed in the browser. */
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface JokalChatResponse {
  conversationId: string | null;
  messageId: string | null;
  stage: JokalStage;
  status: JokalProjectStatus;
  approval: JokalApprovalState;
  reply: string;
  clarifyingQuestions: string[];
  proposal: JokalProposal | null;
  usage: JokalUsageRecord | null;
  /** Present when the server refused or failed the request. */
  error?: string;
  retryAfterSeconds?: number;
}

/**
 * The structured project proposal.
 *
 * Every section is required so a downstream builder never has to guess. Unknown
 * values are expressed as `null`, never as an invented fact.
 */
export interface JokalProposal {
  version: 1;

  projectName: string;
  projectType: string;
  shortDescription: string;
  detailedDescription: string;
  targetAudience: string;
  mainProblem: string;
  solution: string;

  coreFeatures: string[];
  optionalFeatures: string[];

  screens: { name: string; purpose: string; keyElements: string[] }[];
  userFlow: string[];
  uxFlow: string[];
  designDirection: string;

  databaseRequirements: string[];
  backendRequirements: string[];
  apiRequirements: string[];
  aiRequirements: string[];
  multiplayerRequirements: string[];
  securityRequirements: string[];

  estimatedComplexity: 'low' | 'medium' | 'high' | 'very_high';
  /** Human-readable effort band. No fixed price or date is ever invented. */
  estimatedDevelopmentEffort: string;
  estimatedAiUsage: string;
  estimatedServerUsage: string;

  risks: { title: string; mitigation: string }[];
  dependencies: string[];
  implementationPhases: { name: string; deliverables: string[] }[];

  /**
   * Version identifier of the terms the user is shown before approval. The UI
   * must render the actual terms text for this version and record consent.
   */
  ownershipTermsVersion: string;

  clarifyingQuestions: string[];
  createdAt: string;
}

/**
 * Configurable, environment-driven limits. These are *client-visible defaults*
 * used to render messaging; the authoritative limit is always enforced by the
 * server through `consume_ai_quota()`.
 */
export const JOKAL_LIMITS = {
  /** Maximum characters accepted for one idea/message. */
  maxIdeaChars: 4000,
  /** Maximum clarification questions returned in a single turn. */
  maxClarifyingQuestions: 6,
  /** Client-side cooldown between requests, in milliseconds. */
  requestCooldownMs: 1200,
} as const;

/** Version of the ownership/terms text a user must see before approving. */
export const TERMS_VERSION = '2026-01-terms-v1';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate a proposal coming back from the Edge Function.
 *
 * This is a trust-boundary check, not decoration: the function output is treated
 * as untrusted input and a malformed proposal is rejected instead of rendered.
 */
export function isValidJokalProposal(value: unknown): value is JokalProposal {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<JokalProposal>;

  const stringFields: (keyof JokalProposal)[] = [
    'projectName',
    'projectType',
    'shortDescription',
    'detailedDescription',
    'targetAudience',
    'mainProblem',
    'solution',
    'designDirection',
    'estimatedDevelopmentEffort',
    'estimatedAiUsage',
    'estimatedServerUsage',
    'ownershipTermsVersion',
    'createdAt',
  ];
  if (!stringFields.every((field) => isNonEmptyString(candidate[field]))) return false;

  const arrayFields: (keyof JokalProposal)[] = [
    'coreFeatures',
    'optionalFeatures',
    'screens',
    'userFlow',
    'uxFlow',
    'databaseRequirements',
    'backendRequirements',
    'apiRequirements',
    'aiRequirements',
    'multiplayerRequirements',
    'securityRequirements',
    'risks',
    'dependencies',
    'implementationPhases',
    'clarifyingQuestions',
  ];
  if (!arrayFields.every((field) => Array.isArray(candidate[field]))) return false;

  const complexities = ['low', 'medium', 'high', 'very_high'];
  return complexities.includes(candidate.estimatedComplexity as string);
}