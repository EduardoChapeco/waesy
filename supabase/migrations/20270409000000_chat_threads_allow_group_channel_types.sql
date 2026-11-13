-- Allow WhatsApp group and newsletter channel thread types in chat_threads
ALTER TABLE public.chat_threads
  DROP CONSTRAINT IF EXISTS chat_threads_thread_type_check;

ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_thread_type_check
  CHECK (
    thread_type = ANY (
      ARRAY[
        'store'::text,
        'direct_p2p'::text,
        'support'::text,
        'project'::text,
        'ai_assistant'::text,
        'group'::text,
        'channel'::text,
        'direct'::text
      ]
    )
  );
