-- Migration: 20261109000000_launch_leads_and_founder_landing.sql
-- Description: Tabelas para Landing Page de Lançamento, Membros Fundadores e Circuito 2027

create table if not exists public.launch_leads (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    whatsapp text not null,
    cnpj text,
    instagram_handle text,
    company_name text,
    city text,
    ticket_number text unique not null,
    status text not null default 'pending' check (status in ('pending', 'contacted', 'approved', 'converted')),
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_launch_leads_whatsapp on public.launch_leads(whatsapp);
create index if not exists idx_launch_leads_cnpj on public.launch_leads(cnpj);
create index if not exists idx_launch_leads_status on public.launch_leads(status);
create index if not exists idx_launch_leads_created_at on public.launch_leads(created_at desc);

create table if not exists public.launch_landing_settings (
    id uuid primary key default gen_random_uuid(),
    key text unique not null default 'default',
    hero_badge text default 'Circuito 2027 • Chapecó & São Miguel do Oeste',
    hero_title text default 'O novo ponto de encontro do comércio, turismo e conexões',
    hero_subtitle text default 'Uma experiência completa que conecta clientes aos melhores negócios da nossa região com tecnologia, eventos e benefícios exclusivos.',
    slides jsonb default '[]'::jsonb,
    event_info jsonb default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

-- RLS
alter table public.launch_leads enable row level security;
alter table public.launch_landing_settings enable row level security;

-- Políticas para launch_leads
create policy "Allow anonymous insertion for launch leads"
    on public.launch_leads
    for insert
    to anon, authenticated
    with check (true);

create policy "Allow admin read access for launch leads"
    on public.launch_leads
    for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role in ('admin', 'superadmin')
        )
    );

create policy "Allow admin update access for launch leads"
    on public.launch_leads
    for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role in ('admin', 'superadmin')
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role in ('admin', 'superadmin')
        )
    );

-- Políticas para launch_landing_settings
create policy "Public read access for launch landing settings"
    on public.launch_landing_settings
    for select
    to anon, authenticated
    using (true);

create policy "Admin full access for launch landing settings"
    on public.launch_landing_settings
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role in ('admin', 'superadmin')
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role in ('admin', 'superadmin')
        )
    );

-- Inserir registro padrão se não existir
insert into public.launch_landing_settings (key, hero_badge, hero_title, hero_subtitle, slides, event_info)
values (
    'default',
    'Circuito 2027 • Chapecó & São Miguel do Oeste',
    'O novo ponto de encontro do comércio, turismo e conexões',
    'Uma experiência completa que conecta clientes aos melhores negócios da nossa região com tecnologia, eventos e benefícios exclusivos.',
    '[
        {"id": "slide-1", "title": "Shows Nacionais & Internacional", "tag": "Música & Cultura", "image_url": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80"},
        {"id": "slide-2", "title": "Feira de Negócios & Inovação", "tag": "Conexões Regionais", "image_url": "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"},
        {"id": "slide-3", "title": "Workshops & Mentorias Executivas", "tag": "Capacitação", "image_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80"},
        {"id": "slide-4", "title": "Sorteio de Viagens o Ano Inteiro 2027", "tag": "Exclusivo Fundadores", "image_url": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80"}
    ]'::jsonb,
    '{
        "circuito_title": "Circuito Internacional Waesy 2027",
        "dates": "Temporada 2027",
        "locations": "Chapecó & São Miguel do Oeste - SC",
        "perks": [
            "Shows nacionais consagrados e atração internacional confirmada",
            "Feira de Negócios e Tecnologia com estandes para empresas parceiras",
            "Workshops práticos para lojistas, prestadores de serviços e empreendedores",
            "Sorteios de viagens nacionais e internacionais durante todo o ano de 2027",
            "Membros Fundadores com chances aumentadas nos sorteios oficiais"
        ]
    }'::jsonb
)
on conflict (key) do nothing;
