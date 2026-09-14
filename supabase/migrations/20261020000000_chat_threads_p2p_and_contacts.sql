-- Migration: 20261020000000_chat_threads_p2p_and_contacts.sql
-- Description: Tornar store_id nullable, adicionar recipient_profile_id e thread_type para conversas P2P

ALTER TABLE public.chat_threads ALTER COLUMN store_id DROP NOT NULL;

ALTER TABLE public.chat_threads 
  ADD COLUMN IF NOT EXISTS recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chat_threads 
  ADD COLUMN IF NOT EXISTS thread_type TEXT DEFAULT 'store' CHECK (thread_type IN ('store', 'direct_p2p', 'support'));

CREATE INDEX IF NOT EXISTS idx_chat_threads_recipient_profile_id ON public.chat_threads(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_thread_type ON public.chat_threads(thread_type);
CREATE INDEX IF NOT EXISTS idx_chat_threads_customer_recipient ON public.chat_threads(customer_id, recipient_profile_id);

-- RLS Policy for direct P2P threads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_threads' AND policyname = 'p2p_participant_access'
  ) THEN
    CREATE POLICY p2p_participant_access ON public.chat_threads
      FOR ALL
      TO authenticated
      USING (
        auth.uid() = customer_id OR auth.uid() = recipient_profile_id
      )
      WITH CHECK (
        auth.uid() = customer_id OR auth.uid() = recipient_profile_id
      );
  END IF;
END $$;
