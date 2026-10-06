begin;

alter table public.chat_messages
  add column if not exists provider_message_id text,
  add column if not exists provider_name text;

create unique index if not exists chat_messages_provider_message_uq
  on public.chat_messages(provider_name, provider_message_id)
  where provider_message_id is not null;

commit;
