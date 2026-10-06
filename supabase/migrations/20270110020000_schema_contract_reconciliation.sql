begin;

-- Compatibilidade para bancos que receberam policies antigas antes da unificação do pivot.
alter table public.workspace_members
  add column if not exists user_id uuid,
  add column if not exists is_active boolean not null default true;

do $$
begin
  if exists (
    select 1
      from pg_attribute
     where attrelid = 'public.workspace_members'::regclass
       and attname = 'user_id'
       and attgenerated = ''
  ) then
    update public.workspace_members
       set user_id = profile_id
     where user_id is null;
  end if;
end $$;

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);

-- A chamada do gateway deixa de falhar silenciosamente quando o cache é usado.
create or replace function public.increment_cache_hit(p_fingerprint text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.ai_response_cache
     set hit_count = hit_count + 1,
         updated_at = now()
   where fingerprint_hash = p_fingerprint;
$$;
revoke all on function public.increment_cache_hit(text) from public, anon, authenticated;
grant execute on function public.increment_cache_hit(text) to service_role;

commit;
