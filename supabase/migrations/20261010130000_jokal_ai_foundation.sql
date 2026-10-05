/*
# Deep Signal — Jokal AI foundation

## Scope (deliberately small)
This is the *foundation* only: conversation, proposal, and the approval gate.
It does **not** contain a project builder, a marketplace, payments or a
revenue-share engine. Those are separate stages and need their own review.

## Tables
- `jokal_conversations` — one idea thread per user, with an explicit status.
- `jokal_messages`      — the transcript. AI text is stored as data, never executed.
- `jokal_proposals`     — the structured proposal, versioned and user-editable.
- `jokal_projects`      — created only from a proposal the caller owns.

## Approval gate
A project is always created in `awaiting_approval`. The only path to `approved`
is `approve_jokal_project()`, which records who approved, when, and which terms
version was accepted. There is no client-side update that can set `approved`,
`building`, or `completed`, so the AI cannot approve or start anything itself.

## Ownership and legal note
`ownership_terms_version` stores *which* terms text a user accepted. The terms
themselves, and any revenue share, are configuration and legal review. This
migration neither states nor implies that an idea becomes Deep Signal property,
and it is not legal advice.
*/

-- =========================================================
-- 1. CONVERSATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.jokal_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text CHECK (char_length(title) <= 200),
  stage text NOT NULL DEFAULT 'conversation'
    CHECK (stage IN (
      'conversation', 'analysis', 'clarifying_questions', 'proposal',
      'approval', 'project', 'builder', 'usage', 'providers', 'security'
    )),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'analyzing', 'proposal_ready', 'awaiting_approval',
      'approved', 'building', 'paused', 'completed', 'failed', 'cancelled'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jokal_conversations_user_updated
  ON public.jokal_conversations (user_id, updated_at DESC);

ALTER TABLE public.jokal_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jokal_conversations_read_own ON public.jokal_conversations;
CREATE POLICY jokal_conversations_read_own
  ON public.jokal_conversations FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS jokal_conversations_insert_own ON public.jokal_conversations;
CREATE POLICY jokal_conversations_insert_own
  ON public.jokal_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- `status` cannot be used from the client to skip the approval gate.
DROP POLICY IF EXISTS jokal_conversations_update_own ON public.jokal_conversations;
CREATE POLICY jokal_conversations_update_own
  ON public.jokal_conversations FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status IN ('draft', 'analyzing', 'proposal_ready', 'awaiting_approval', 'cancelled')
  );

REVOKE ALL ON public.jokal_conversations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE (title, stage) ON public.jokal_conversations TO authenticated;
-- =========================================================
-- 2. MESSAGES (transcript)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.jokal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.jokal_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jokal_messages_conversation_created
  ON public.jokal_messages (conversation_id, created_at);

ALTER TABLE public.jokal_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jokal_messages_read_own ON public.jokal_messages;
CREATE POLICY jokal_messages_read_own
  ON public.jokal_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jokal_conversations
      WHERE public.jokal_conversations.id = jokal_messages.conversation_id
        AND public.jokal_conversations.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS jokal_messages_insert_own ON public.jokal_messages;
CREATE POLICY jokal_messages_insert_own
  ON public.jokal_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jokal_conversations
      WHERE public.jokal_conversations.id = jokal_messages.conversation_id
        AND public.jokal_conversations.user_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON public.jokal_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.jokal_messages TO authenticated;

-- Keep `updated_at` honest without trusting the client clock.
CREATE OR REPLACE FUNCTION public.touch_jokal_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.jokal_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_jokal_conversation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS jokal_messages_touch ON public.jokal_messages;
CREATE TRIGGER jokal_messages_touch
  AFTER INSERT ON public.jokal_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_jokal_conversation();
-- =========================================================
-- 3. PROPOSALS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.jokal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.jokal_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'proposal_ready', 'awaiting_approval', 'approved', 'rejected', 'superseded')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  clarifying_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ownership_terms_version text NOT NULL DEFAULT '2026-01-terms-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jokal_proposals_conversation
  ON public.jokal_proposals (conversation_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_jokal_proposals_user
  ON public.jokal_proposals (user_id, created_at DESC);

ALTER TABLE public.jokal_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jokal_proposals_read_own ON public.jokal_proposals;
CREATE POLICY jokal_proposals_read_own
  ON public.jokal_proposals FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- The proposal body is user-editable before approval; the approval state is not.
DROP POLICY IF EXISTS jokal_proposals_update_own ON public.jokal_proposals;
CREATE POLICY jokal_proposals_update_own
  ON public.jokal_proposals FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status IN ('draft', 'proposal_ready', 'awaiting_approval')
  );

REVOKE ALL ON public.jokal_proposals FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE (content, clarifying_questions, version)
  ON public.jokal_proposals TO authenticated;

-- =========================================================
-- 4. PROJECTS + APPROVAL GATE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.jokal_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.jokal_conversations(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.jokal_proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'awaiting_approval'
    CHECK (status IN (
      'draft', 'analyzing', 'proposal_ready', 'awaiting_approval',
      'approved', 'building', 'paused', 'completed', 'failed', 'cancelled'
    )),
  approved_at timestamptz,
  approved_terms_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jokal_projects_user
  ON public.jokal_projects (user_id, created_at DESC);

ALTER TABLE public.jokal_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jokal_projects_read_own ON public.jokal_projects;
CREATE POLICY jokal_projects_read_own
  ON public.jokal_projects FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- A project can only be created from a proposal the caller owns, and it always
-- starts in `awaiting_approval`. There is no client path that creates one as
-- `approved`.
DROP POLICY IF EXISTS jokal_projects_insert_awaiting_approval ON public.jokal_projects;
CREATE POLICY jokal_projects_insert_awaiting_approval
  ON public.jokal_projects FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'awaiting_approval'
    AND EXISTS (
      SELECT 1 FROM public.jokal_proposals AS proposal
      WHERE proposal.id = jokal_projects.proposal_id
        AND proposal.user_id = (SELECT auth.uid())
        AND proposal.conversation_id = jokal_projects.conversation_id
    )
  );

-- Only the display name is writable by the client; `status` is not.
DROP POLICY IF EXISTS jokal_projects_update_own ON public.jokal_projects;
CREATE POLICY jokal_projects_update_own
  ON public.jokal_projects FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.jokal_projects FROM anon, authenticated;
GRANT SELECT, INSERT (conversation_id, proposal_id, user_id, name)
  ON public.jokal_projects TO authenticated;
GRANT UPDATE (name) ON public.jokal_projects TO authenticated;

-- The only way `status` can become `approved`. It records the acting user and
-- the exact terms version that was accepted, so consent is auditable.
CREATE OR REPLACE FUNCTION public.approve_jokal_project(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id uuid := (SELECT auth.uid());
  terms text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT proposal.ownership_terms_version INTO terms
  FROM public.jokal_projects AS project
  JOIN public.jokal_proposals AS proposal ON proposal.id = project.proposal_id
  WHERE project.id = p_project_id
    AND project.user_id = caller_id
    AND project.status = 'awaiting_approval';

  IF terms IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.jokal_projects
  SET status = 'approved',
      approved_at = now(),
      approved_terms_version = terms,
      updated_at = now()
  WHERE id = p_project_id
    AND user_id = caller_id
    AND status = 'awaiting_approval';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_jokal_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_jokal_project(uuid) TO authenticated;

-- Link an AI usage row to a project once the project exists. Server-side only.
CREATE OR REPLACE FUNCTION public.attach_ai_usage_to_project(
  p_usage_id uuid,
  p_project_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.ai_usage AS usage
  SET project_id = p_project_id
  FROM public.jokal_projects AS project
  WHERE usage.id = p_usage_id
    AND usage.user_id = (SELECT auth.uid())
    AND project.id = p_project_id
    AND project.user_id = (SELECT auth.uid());
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_ai_usage_to_project(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_ai_usage_to_project(uuid, uuid) TO authenticated;