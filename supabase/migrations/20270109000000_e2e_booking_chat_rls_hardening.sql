-- Waesy E2E hardening: booking e suporte bilateral.
-- Operações guest devem passar pelo BFF autorizado; anon não recebe INSERT direto.

begin;

alter table public.booking_appointments enable row level security;
drop policy if exists "Customers can create appointments" on public.booking_appointments;
drop policy if exists "Customers can read own appointments" on public.booking_appointments;
drop policy if exists "Store staff can manage appointments" on public.booking_appointments;

create policy "Customers read own appointments"
  on public.booking_appointments for select to authenticated
  using (customer_id = auth.uid());

create policy "Customers create own appointments"
  on public.booking_appointments for insert to authenticated
  with check (customer_id = auth.uid());

create policy "Booking staff manage store appointments"
  on public.booking_appointments for all to authenticated
  using (exists (select 1 from public.workspace_members wm
    where wm.store_id = booking_appointments.store_id
      and wm.profile_id = auth.uid()
      and wm.role in ('owner','store_owner','admin','manager','proprietario','gerente','professional')))
  with check (exists (select 1 from public.workspace_members wm
    where wm.store_id = booking_appointments.store_id
      and wm.profile_id = auth.uid()
      and wm.role in ('owner','store_owner','admin','manager','proprietario','gerente','professional')));

-- O pivot canônico usa profile_id, não user_id.
drop policy if exists "Customers can view their own support tickets" on public.support_tickets;
drop policy if exists "Customers can create support tickets" on public.support_tickets;
drop policy if exists "Workspace members can view support tickets" on public.support_tickets;
drop policy if exists "Workspace members can update support tickets" on public.support_tickets;

create policy "Customers can view own support tickets"
  on public.support_tickets for select to authenticated
  using (customer_id = auth.uid());

create policy "Customers can create own support tickets"
  on public.support_tickets for insert to authenticated
  with check (customer_id = auth.uid());

create policy "Workspace members can view scoped support tickets"
  on public.support_tickets for select to authenticated
  using (exists (select 1 from public.workspace_members wm
    where wm.store_id = support_tickets.store_id
      and wm.profile_id = auth.uid()));

create policy "Workspace managers can update scoped support tickets"
  on public.support_tickets for update to authenticated
  using (exists (select 1 from public.workspace_members wm
    where wm.store_id = support_tickets.store_id
      and wm.profile_id = auth.uid()
      and wm.role in ('owner','store_owner','admin','manager','proprietario','gerente','support','finance')))
  with check (exists (select 1 from public.workspace_members wm
    where wm.store_id = support_tickets.store_id
      and wm.profile_id = auth.uid()
      and wm.role in ('owner','store_owner','admin','manager','proprietario','gerente','support','finance')));

commit;
