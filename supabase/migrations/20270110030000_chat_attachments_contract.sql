begin;

alter table public.chat_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages(thread_id, created_at asc);

commit;
