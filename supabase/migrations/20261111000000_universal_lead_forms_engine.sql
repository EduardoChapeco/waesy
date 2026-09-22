-- Migration: 20261111000000_universal_lead_forms_engine.sql
-- Description: Motor Universal de Formulários de Captura de Leads, Landing Pages Mágicas e CRM

create table if not exists public.lead_forms (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.stores(id) on delete cascade,
    title text not null,
    slug text not null unique,
    description text,
    niche_id text not null default 'geral',
    
    -- Design & Customização Visual
    theme_color text default 'primary',
    cover_image_url text,
    headline text,
    subheadline text,
    submit_button_text text not null default 'Enviar Solicitação',
    
    -- Comportamento Pós-Envio
    after_submit_action text not null default 'whatsapp_redirect', -- 'whatsapp_redirect', 'show_success_message', 'external_redirect'
    whatsapp_target_phone text,
    whatsapp_message_template text,
    success_message text default 'Recebemos seus dados! Nossa equipe entrará em contato em breve.',
    redirect_url text,
    
    -- Gatilhos em Anúncios Vinculados
    trigger_mode text not null default 'button_click', -- 'button_click', 'scroll_50', 'exit_intent', 'bottom_bar'
    scroll_trigger_pct int default 50,
    time_delay_seconds int default 0,
    
    -- Governança e Automação
    quick_signup_enabled boolean not null default true,
    status text not null default 'active', -- 'active', 'paused', 'archived'
    views_count int not null default 0,
    submissions_count int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_lead_forms_store on public.lead_forms(store_id);
create index if not exists idx_lead_forms_slug on public.lead_forms(slug);
create index if not exists idx_lead_forms_status on public.lead_forms(status);

create table if not exists public.lead_form_fields (
    id uuid primary key default gen_random_uuid(),
    form_id uuid not null references public.lead_forms(id) on delete cascade,
    field_key text not null,
    field_type text not null default 'text', -- 'text', 'phone', 'email', 'select', 'radio', 'checkbox', 'currency', 'date', 'number', 'textarea'
    label text not null,
    placeholder text,
    helper_text text,
    is_required boolean not null default false,
    sort_order int not null default 0,
    options jsonb default '[]'::jsonb,
    validation_rules jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_lead_form_fields_form on public.lead_form_fields(form_id, sort_order);

create table if not exists public.lead_form_submissions (
    id uuid primary key default gen_random_uuid(),
    form_id uuid not null references public.lead_forms(id) on delete cascade,
    store_id uuid not null references public.stores(id) on delete cascade,
    classified_id uuid references public.classifieds(id) on delete set null,
    
    -- Identidade do Lead
    profile_id uuid references public.profiles(id) on delete set null,
    contact_name text not null,
    contact_email text,
    contact_phone text not null,
    is_new_registered_user boolean not null default false,
    
    -- Origem & Rastreabilidade de Campanha
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    device_type text default 'mobile',
    
    -- Status do CRM Interno
    crm_status text not null default 'new', -- 'new', 'contacted', 'qualified', 'won', 'lost'
    operator_notes text,
    assigned_to_profile_id uuid references public.profiles(id) on delete set null,
    
    raw_answers jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_lead_submissions_form on public.lead_form_submissions(form_id);
create index if not exists idx_lead_submissions_store on public.lead_form_submissions(store_id);
create index if not exists idx_lead_submissions_crm_status on public.lead_form_submissions(crm_status);
create index if not exists idx_lead_submissions_created_at on public.lead_form_submissions(created_at desc);

-- Vínculo no classifieds
alter table public.classifieds add column if not exists form_id uuid references public.lead_forms(id) on delete set null;
create index if not exists idx_classifieds_form_id on public.classifieds(form_id);

-- RLS
alter table public.lead_forms enable row level security;
alter table public.lead_form_fields enable row level security;
alter table public.lead_form_submissions enable row level security;

-- Políticas lead_forms
drop policy if exists "Allow read active lead_forms for public or store members" on public.lead_forms;
drop policy if exists "Allow store owners and members to insert lead_forms" on public.lead_forms;
drop policy if exists "Allow store owners and members to update lead_forms" on public.lead_forms;
drop policy if exists "Allow store owners and members to delete lead_forms" on public.lead_forms;

create policy "Allow read active lead_forms for public or store members"
    on public.lead_forms
    for select
    to anon, authenticated
    using (
        status = 'active'
        or exists (
            select 1 from public.store_members sm
            where sm.store_id = lead_forms.store_id
            and (sm.profile_id = auth.uid() or sm.user_id = auth.uid())
        )
        or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin', 'superadmin', 'platform_admin')
        )
    );

create policy "Allow store owners and members to insert lead_forms"
    on public.lead_forms
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.store_members sm
            where sm.store_id = lead_forms.store_id
            and (sm.profile_id = auth.uid() or sm.user_id = auth.uid())
        )
        or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin', 'superadmin', 'platform_admin')
        )
    );

create policy "Allow store owners and members to update lead_forms"
    on public.lead_forms
    for update
    to authenticated
    using (
        exists (
            select 1 from public.store_members sm
            where sm.store_id = lead_forms.store_id
            and (sm.profile_id = auth.uid() or sm.user_id = auth.uid())
        )
        or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin', 'superadmin', 'platform_admin')
        )
    );

create policy "Allow store owners and members to delete lead_forms"
    on public.lead_forms
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.store_members sm
            where sm.store_id = lead_forms.store_id
            and (sm.profile_id = auth.uid() or sm.user_id = auth.uid())
        )
        or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin', 'superadmin', 'platform_admin')
        )
    );

-- Políticas lead_form_fields
drop policy if exists "Allow read lead_form_fields for all" on public.lead_form_fields;
drop policy if exists "Allow store members to modify lead_form_fields" on public.lead_form_fields;

create policy "Allow read lead_form_fields for all"
    on public.lead_form_fields
    for select
    to anon, authenticated
    using (true);

create policy "Allow store members to modify lead_form_fields"
    on public.lead_form_fields
    for all
    to authenticated
    using (
        exists (
            select 1 from public.lead_forms lf
            join public.store_members sm on sm.store_id = lf.store_id
            where lf.id = lead_form_fields.form_id
            and (sm.profile_id = auth.uid() or sm.user_id = auth.uid())
        )
        or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin', 'superadmin', 'platform_admin')
        )
    );

-- Políticas lead_form_submissions
drop policy if exists "Allow public insert lead_form_submissions" on public.lead_form_submissions;
drop policy if exists "Allow store members to read and manage lead_form_submissions" on public.lead_form_submissions;

create policy "Allow public insert lead_form_submissions"
    on public.lead_form_submissions
    for insert
    to anon, authenticated
    with check (true);

create policy "Allow store members to read and manage lead_form_submissions"
    on public.lead_form_submissions
    for all
    to authenticated
    using (
        exists (
            select 1 from public.store_members sm
            where sm.store_id = lead_form_submissions.store_id
            and (sm.profile_id = auth.uid() or sm.user_id = auth.uid())
        )
        or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin', 'superadmin', 'platform_admin')
        )
        or profile_id = auth.uid()
    );
