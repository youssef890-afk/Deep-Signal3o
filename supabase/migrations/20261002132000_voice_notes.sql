ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
CHECK (message_type IN ('text', 'audio'));

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS audio_url text;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS audio_duration_ms integer;

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS voice_notes_insert_sender ON storage.objects;
CREATE POLICY voice_notes_insert_sender
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS voice_notes_read_participant ON storage.objects;
CREATE POLICY voice_notes_read_participant
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (storage.foldername(name))[2] = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS voice_notes_delete_sender ON storage.objects;
CREATE POLICY voice_notes_delete_sender
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);