# 🔧 PRD TÉCNICO v3.0 — Extensão Chrome × Turis Agências
## Plataforma: Turis Agências | Agência: Excelência Tour
**Data:** 2026-04-15 | **Auditoria:** Total — código, banco, RLS, FKs, Edge Functions  
**Supabase Project:** `xhdoupxnpjbzkzuhucpp`  
**URL:** `https://xhdoupxnpjbzkzuhucpp.supabase.co`  
**GitHub:** `https://github.com/EduardoChapeco/plan-fect-harmony`

---

## 📌 CONTEXTO ESSENCIAL

| Item | Valor |
|---|---|
| **Nome da Plataforma** | **Turis Agências** (o software) |
| **Nome da Agência** | **Excelência Tour** (o cliente) |
| **Auth User** | `eusoueduoficial@gmail.com` (<-- login da extensão) |
| **Auth User ID** | `02494fbc-6a4b-499c-8b08-6032a5e9eadb` |
| **Profile ID** | `02494fbc-6a4b-499c-8b08-6032a5e9eadb` (= auth.uid neste caso) |
| **Org ID** | `b9d9ef56-27ad-4221-86dd-7bfc6210f059` |
| **Org Name** | `Excelência Tour` |
| **Org Slug** | `excelencia-tour` |
| **Portal URL** | `https://[app-url]/portal/excelencia-tour` |

---

## 🐛 BUGS CORRIGIDOS NESTA SESSÃO (2026-04-15)

| # | Problema | Causa Raiz | Fix Aplicado |
|---|---|---|---|
| 1 | Login retorna profile vazio | `profiles.user_id = NULL` | `UPDATE profiles SET user_id = id` |
| 2 | Todas queries retornam 0 rows | `profiles.org_id = NULL` | Org criada + `UPDATE profiles SET org_id` |
| 3 | Boards de Tasks sem colunas | `ensure_default_kanban_boards` não populou colunas | Seeds de colunas aplicados |
| 4 | `quick_task` quebrava | `kanban_cards.board_id/column_id NOT NULL` sem valor | Fix na `extension-sync` v3 (auto-descobre board/coluna) |
| 5 | `kanban_cards` sem campo `status` | Coluna não existia | `ALTER TABLE ADD COLUMN status` |
| 6 | `client_timeline` não existia | View nunca foi criada | `CREATE VIEW client_timeline` |
| 7 | `trips.check_in/check_out` não existiam | Banco usa `departure_date/return_date` | Colunas geradas via `GENERATED ALWAYS AS` |
| 8 | `assign_org_admin_role` RPC não existia | Onboarding chama RPC inexistente | Função criada |
| 9 | Organizations sem RLS | Tabela sem políticas | Policies INSERT/SELECT/UPDATE criadas |
| 10 | `financial_suppliers/transactions` sem RLS | Tabelas sem policies | Policies ALL criadas |
| 11 | `contract_templates/communication_rules` sem RLS | Tabelas sem policies | Policies ALL criadas |
| 12 | `check_is_admin()` e `get_my_org_id()` usavam design antigo | `WHERE id = auth.uid()` em vez de `user_id` | Funções atualizadas para suportar `OR id = auth.uid()` |
| 13 | `profile.first_name = ''` | Trigger `handle_new_user` recebeu metadata vazio | `UPDATE profiles SET first_name='Eduardo', last_name='Ramo'` |
| 14 | Sidebar mostra "Turis Agencias" hardcoded | Fallback errado no código | Corrigido para `'Excelência Tour'` |

---

## 🔑 AUTENTICAÇÃO COMPLETA

### Flow de Login (Extensão Chrome)

```
1. POST /auth/v1/token?grant_type=password
   → Obtém: access_token, refresh_token, user.id (= auth.uid)

2. GET /rest/v1/profiles?user_id=eq.{user.id}&limit=1
   → Obtém: profile.id, profile.org_id, profile.role, profile.is_admin

3. GET /rest/v1/organizations?id=eq.{profile.org_id}&limit=1
   → Obtém: org.name ('Excelência Tour'), org.slug ('excelencia-tour')

4. Salvar no chrome.storage.local:
   { access_token, refresh_token, expires_at, user_id, profile_id, org_id }
```

### Endpoint de Login Real

```javascript
const res = await fetch(
  'https://xhdoupxnpjbzkzuhucpp.supabase.co/auth/v1/token?grant_type=password',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJ[REDACTED_JWT]'
    },
    body: JSON.stringify({
      email: 'eusoueduoficial@gmail.com',
      password: 'SUA_SENHA'
    })
  }
);
const { access_token, refresh_token, user } = await res.json();
// user.id = '02494fbc-6a4b-499c-8b08-6032a5e9eadb'
```

### ⚠️ Se der "Invalid login credentials"
O usuário existe e tem email confirmado. Causa: **senha errada**. Ação:
1. Supabase Dashboard → Authentication → Users
2. Clicar no user `eusoueduoficial@gmail.com`
3. Clicar "Send recovery email"
4. Abrir email → clicar link → definir nova senha
5. Usar essa senha na extensão

### Renovar Token (Refresh)
```javascript
const res = await fetch(
  'https://xhdoupxnpjbzkzuhucpp.supabase.co/auth/v1/token?grant_type=refresh_token',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ refresh_token: storedRefreshToken })
  }
);
```

---

## 📊 FLUXO ONBOARDING (como novos agentes são criados)

```
Signup.tsx:
  supabase.auth.signUp({ email, password, options: { data: { first_name, last_name } } })
  → Trigger handle_new_user() cria profile com user_id = auth.uid()
  → Email de confirmação enviado

Onboarding.tsx (após login, se org_id = null):
  1. INSERT organizations (name, slug, whatsapp, email, phone)
  2. UPDATE profiles SET org_id WHERE user_id = auth.uid()
  3. RPC assign_org_admin_role(_user_id) → is_admin = true
  4. RPC ensure_default_kanban_boards(_org_id) → cria boards sales/tasks/departures
```

---

## 🗄️ SCHEMA COMPLETO REAL (70 tabelas totais no banco)

### Tabelas Críticas para a Extensão

#### `profiles` (17 colunas)
```
id           uuid PK          ← IGUAL ao auth.uid() para o user Eduardo
user_id      uuid             ← IGUAL ao auth.uid() (✅ corrigido)
org_id       uuid FK orgs     ← (✅ corrigido — 'b9d9ef56...')
email        text NOT NULL    ← 'eusoueduoficial@gmail.com'
first_name   text DEFAULT ''  ← (✅ corrigido — 'Eduardo')
last_name    text DEFAULT ''  ← (✅ corrigido — 'Ramo')
full_name    text             ← (✅ corrigido — 'Eduardo Ramo')
role         text DEFAULT 'agent'
is_admin     bool DEFAULT false  ← true para Eduardo
is_active    bool DEFAULT true
whatsapp     text
avatar_url   text
bio          text
last_seen_at timestamptz
notification_prefs jsonb DEFAULT {}
```

#### `organizations` (14 colunas)
```
id            uuid PK   ← 'b9d9ef56-27ad-4221-86dd-7bfc6210f059'
name          text      ← 'Excelência Tour'
slug          text      ← 'excelencia-tour'
logo_url      text
website       text
whatsapp      text
primary_color text      ← '#1a7a4a'
email         text
phone         text
address       jsonb DEFAULT {}
ai_keys_config jsonb DEFAULT {}
is_active     bool DEFAULT true
created_at    timestamptz
updated_at    timestamptz
```

#### `clients` (30 colunas — tabela principal do CRM)
```
id              uuid PK
org_id          uuid FK organizations NOT NULL
name            text NOT NULL
email           text
phone           text
whatsapp        text
cpf             text
birth_date      date
nationality     text
passport_number text
passport_expiry date
address         jsonb DEFAULT {}
photo_url       text
cover_url       text
tags            text[] DEFAULT {}
notes           text
origin          text
ltv             numeric DEFAULT 0
trips_count     integer DEFAULT 0
open_tickets    integer DEFAULT 0
next_trip       date
joined_at       timestamptz DEFAULT now()
preferences     jsonb DEFAULT {}
assigned_agent_id uuid FK profiles
portal_access_enabled bool DEFAULT false
portal_user_id  uuid
is_active       bool DEFAULT true
created_at      timestamptz
updated_at      timestamptz
```

#### `trips` (44 colunas — maior tabela)
```
id                  uuid PK
org_id              uuid FK organizations NOT NULL
primary_client_id   uuid FK clients        ← campo principal para FK de cliente
assigned_agent_id   uuid FK profiles
title               text NOT NULL
destination         text                   ← campo único de destino (use este)
destination_city    text
destination_country text
origin_city         text
departure_date      date                   ← data de ida (campo real)
return_date         date                   ← data de volta (campo real)
check_in            date GENERATED         ← alias de departure_date
check_out           date GENERATED         ← alias de return_date
num_nights          integer
status              text DEFAULT 'quoting'
   → 'quoting'|'quoted'|'confirmed'|'in_progress'|'completed'|'cancelled'|'importada'
operator_id         text
operator_name       text
hotel_name          text
hotel_regime        text
meal_plan           text
room_type           text
airline             text
flight_number       text
passengers_count    integer DEFAULT 1
pax_count           integer DEFAULT 1
total_value         numeric                ← campo principal de valor
value               numeric GENERATED       ← alias de total_value
total_price         numeric                ← campo legado
currency            text DEFAULT 'BRL'
payment_status      text DEFAULT 'pending'
locator_code        text
insurance_company   text
insurance_policy    text
includes_transfer   bool DEFAULT false
contract_url        text
voucher_url         text
notes_internal      text
notes_client        text
supplier            text
quotation_id        uuid FK quotations
itinerary_id        uuid FK itineraries
meta                jsonb DEFAULT {}
created_at          timestamptz
updated_at          timestamptz
```

#### `kanban_boards` (7 colunas)
```
id         uuid PK
org_id     uuid FK organizations NOT NULL
slug       text   → 'sales' | 'tasks' | 'departures'
name       text
board_type text   → 'sales' | 'tasks' | 'departures'
created_at timestamptz
updated_at timestamptz
```
**Boards da Excelência Tour (seeded):**
| Board | slug | board_type | Col_count |
|---|---|---|---|
| CRM — Pipeline de Vendas | sales | sales | 6 colunas |
| Tarefas do Dia | tasks | tasks | 4 colunas (✅ seed ok) |
| Embarques | departures | departures | 5 colunas |

#### `kanban_columns` (9 colunas)
```
id         uuid PK
board_id   uuid FK kanban_boards NOT NULL
org_id     uuid FK organizations NOT NULL
name       text
color      text
position   integer DEFAULT 0
wip_limit  integer
created_at timestamptz
updated_at timestamptz
```

**Colunas do board "Tarefas do Dia"** (relevante para `quick_task`):
```
posição 0 → "A Fazer"      (← quick_task usa esta)
posição 1 → "Em Progresso"
posição 2 → "Revisão"
posição 3 → "Concluído"
```

#### `kanban_cards` (25 colunas)
```
id              uuid PK
org_id          uuid NOT NULL
board_id        uuid NOT NULL     ← OBRIGATÓRIO (usar via extension-sync)
column_id       uuid NOT NULL     ← OBRIGATÓRIO (usar via extension-sync)
title           text NOT NULL
description     text
client_id       uuid FK clients
trip_id         uuid FK trips
ticket_id       uuid FK tickets
assigned_to     uuid FK profiles  ← campo correto (NÃO 'agent_id')
task_type       text → 'geral'|'cotar'|'ligar'|'reembolso'|'cancelamento'
priority        text DEFAULT 'medium' → 'low'|'medium'|'high'
status          text DEFAULT 'pendente' → 'pendente'|'em_andamento'|'concluida'|'done'
due_date        date
position        integer DEFAULT 0
tags            text[]
estimated_value numeric
whatsapp        text
email           text
meta            jsonb DEFAULT {}
metadata        jsonb DEFAULT {}
linked_card_ids uuid[]
quotation_id    uuid
created_at      timestamptz
updated_at      timestamptz
```

#### `tickets` (14 colunas)
```
id           uuid PK
org_id       uuid NOT NULL
client_id    uuid FK clients
trip_id      uuid FK trips
assigned_to  uuid FK profiles
title        text NOT NULL
description  text
type         text DEFAULT 'geral'
status       text DEFAULT 'open' → 'open'|'in_progress'|'resolved'|'closed'
priority     text DEFAULT 'medium' → 'low'|'medium'|'high'|'urgent'
ticket_code  text DEFAULT 'TCKR-XXXXXXXX' (auto gerado por trigger)
resolved_at  timestamptz
created_at   timestamptz
updated_at   timestamptz
```

#### `email_messages` (23 colunas)
```
id                    uuid PK
org_id                uuid NOT NULL
client_id             uuid FK clients
trip_id               uuid FK trips
ticket_id             uuid FK tickets
gmail_id              text  (id único do Gmail)
thread_id             text
subject               text
from_email            text
from_name             text
to_emails             text[]
body_text             text
body_html             text
direction             text DEFAULT 'inbound' → 'inbound'|'outbound'
received_at           timestamptz NOT NULL DEFAULT now()
ai_type               text
ai_priority           text → 'urgente'|'alta'|'normal'
ai_summary            text
ticket_code           text (link manual com ticket)
extracted_ticket_code text (extraído automaticamente)
extracted_locator     text
attachments           jsonb DEFAULT []
created_at            timestamptz
```

#### `financial_suppliers` (9 colunas — NÃO é 'suppliers')
```
id                      uuid PK
org_id                  uuid FK organizations NOT NULL
name                    text
type                    text → 'operator'|'hotel'|'airline'|'insurance'|'other'
contact_info            text (texto livre, ex: "email: cvc@cvc.com / tel: 49 3333-3333")
bank_details            text (texto livre)
default_commission_rate numeric
created_at              timestamptz
updated_at              timestamptz
```

#### `financial_transactions` (14 colunas)
```
id             uuid PK
org_id         uuid FK organizations NOT NULL
trip_id        uuid FK trips
client_id      uuid FK clients
supplier_id    uuid FK financial_suppliers  ← FK aponta para financial_suppliers ✅
type           text → 'receivable'|'payable'
status         text → 'pending'|'paid'|'overdue'|'canceled'
amount         numeric
due_date       date
paid_date      date
payment_method text
notes          text
created_at     timestamptz
updated_at     timestamptz
```

---

## 🌐 ENDPOINTS REST COMPLETOS

**Base:** `https://xhdoupxnpjbzkzuhucpp.supabase.co/rest/v1`  
**ANON_KEY:** `eyJ[REDACTED_JWT]`

**Headers obrigatórios:**
```javascript
const H = (token) => ({
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${token}`,
  'Prefer': 'return=representation'
});
```

### ENDPOINT: Profile

```
GET /profiles?user_id=eq.{AUTH_UID}&limit=1
  &select=id,user_id,org_id,email,first_name,last_name,full_name,role,is_admin,is_active,whatsapp,avatar_url

→ Retorna sempre: profiles[0].user_id === profiles[0].id === auth.uid (design atual)
```

### ENDPOINT: Organização

```
GET /organizations?id=eq.{ORG_ID}&limit=1
  &select=id,name,slug,logo_url,website,whatsapp,primary_color,email,phone

→ Retorna: { id: 'b9d9ef56...', name: 'Excelência Tour', slug: 'excelencia-tour' }
```

### ENDPOINT: Clientes

```
# Buscar por telefone/WhatsApp
GET /clients?or=(whatsapp.eq.{PHONE},phone.eq.{PHONE})&limit=1
  &select=id,name,email,whatsapp,phone,cpf,tags,ltv,trips_count,open_tickets,next_trip,notes,origin

# Buscar por email
GET /clients?email=eq.{EMAIL}&limit=1&select=*

# Listar todos (paginado)
GET /clients?select=id,name,email,whatsapp,ltv,tags,trips_count&order=name&limit=20&offset=0

# Criar cliente
POST /clients
Body: { "org_id": "b9d9ef56...", "name": "...", "email": "...", "whatsapp": "..." }
```

### ENDPOINT: Viagens

```
# Viagens do cliente
GET /trips?primary_client_id=eq.{CLIENT_ID}
  &select=id,title,destination,hotel_name,departure_date,return_date,check_in,check_out,status,total_value,value,passengers_count,supplier
  &order=departure_date.desc
  &limit=10

# Criar viagem (preferencialmente via extension-sync)
POST /trips
Body: { "org_id":"b9d9ef56...", "title":"...", "destination":"...", 
        "primary_client_id":"...", "status":"quoting", "assigned_agent_id":"..." }
```

### ENDPOINT: Kanban / Tarefas

```
# Listar tasks do agente
GET /kanban_cards?assigned_to=eq.{PROFILE_ID}&status=neq.concluida
  &select=id,title,description,task_type,priority,status,due_date,created_at,clients(name)
  &order=created_at.desc

# Tasks do cliente
GET /kanban_cards?client_id=eq.{CLIENT_ID}
  &select=id,title,task_type,priority,status,due_date,created_at

# Marcar como concluída
PATCH /kanban_cards?id=eq.{TASK_ID}
Body: { "status": "concluida" }

⚠️ Para CRIAR task: use extension-sync (quick_task), não REST direto,
   pois board_id e column_id são NOT NULL e a função os descobre automaticamente.
```

### ENDPOINT: Tickets

```
# Buscar por cliente
GET /tickets?client_id=eq.{CLIENT_ID}
  &select=id,ticket_code,title,type,priority,status,description,created_at
  &order=created_at.desc

# Criar ticket
POST /tickets
Body: {
  "org_id": "b9d9ef56...",
  "client_id": "...",
  "title": "Assunto",
  "type": "geral",          ← NÃO type em PT
  "priority": "medium",     ← NÃO 'normal' ou 'alta'
  "status": "open"          ← NÃO 'aberto'
}
# ticket_code é gerado auto pelo trigger → 'TCKR-XXXXXXXX'
```

### ENDPOINT: Emails

```
# Alertas recentes
GET /email_messages?direction=eq.inbound
  &select=id,subject,from_email,ai_priority,ai_summary,ticket_code,received_at,client_id
  &order=received_at.desc&limit=20
```

### ENDPOINT: Timeline do Cliente

```
GET /client_timeline?client_id=eq.{CLIENT_ID}
  &select=id,source_type,title,summary,direction,event_at,created_at
  &order=event_at.desc&limit=30
```

---

## ⚡ EDGE FUNCTIONS COMPLETAS

### `extension-sync` (v3 — ATUAL)

```
POST /functions/v1/extension-sync
Headers: Authorization: Bearer {token}, apikey: {ANON_KEY}

Ações disponíveis:
```

#### `create_scraped_trip`
```json
{
  "action": "create_scraped_trip",
  "data": {
    "title": "Cancún 7n — CVC",
    "client_name": "João Silva",
    "client_email": "joao@email.com",
    "supplier": "CVC",
    "value": 12500,
    "destination": "Cancún",
    "hotel": "Hard Rock Hotel Cancún"
  }
}
// Response: { "id": "trip-uuid", "client_id": "client-uuid" }
// A função: busca cliente por email → cria se não existir → cria viagem com status 'importada'
```

#### `quick_task`
```json
{
  "action": "quick_task",
  "data": {
    "title": "Ligar para João sobre passaporte",
    "description": "Verificar validade mínima de 6 meses",
    "task_type": "ligar",
    "priority": "medium",
    "client_id": "client-uuid"
  }
}
// Response: { "id": "kanban-card-uuid" }
// A função: busca board 'tasks' da org → pega primeira coluna (posição 0, "A Fazer") → insere card
```

#### `link_email_ticket`
```json
{
  "action": "link_email_ticket",
  "data": {
    "email_id": "email-msg-uuid",
    "ticket_code": "TCKR-A3F9B2C1"
  }
}
// Response: { "ok": true }
```

### `email-webhook-ingest`
```
POST /functions/v1/email-webhook-ingest
Body: {
  "org_id": "b9d9ef56-27ad-4221-86dd-7bfc6210f059",
  "subject": "Confirmação de reserva",
  "from_email": "noreply@cvc.com",
  "body_text": "Olá, sua reserva foi confirmada...",
  "thread_id": "opcional"
}
// Response: { "success": true, "id": "email-uuid" }
```

### `ext-process-quotation`
```
POST /functions/v1/ext-process-quotation
Body: { "file": "<base64>", "mime_type": "application/pdf" }
// ⚠️ MOCK — retorna dados simulados, NÃO processa arquivo real
```

---

## 🔐 RLS — MAPA COMPLETO DE POLÍTICAS

| Tabela | SELECT | INSERT | UPDATE | DELETE | Chave de Filtro |
|---|---|---|---|---|---|
| `profiles` | ✅ user_id=auth.uid OR id=auth.uid | ✅ user_id=auth.uid | ✅ user_id=auth.uid OR id=auth.uid | ❌ | user-level |
| `organizations` | ✅ own org_id | ✅ any authenticated | ✅ own org_id | ❌ | `profile.org_id` |
| `clients` | ✅ | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `trips` | ✅ + portal | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `tickets` | ✅ | ✅ | ✅ (via ALL) | ✅ (via ALL) | `get_my_org_id()` |
| `email_messages` | ✅ | ✅ | ✅ | ❌ | `profile.org_id` |
| `kanban_cards` | ✅ (org + assigned_to) | ✅ | ✅ (org + assigned_to) | ✅ | `get_my_org_id()` |
| `kanban_boards` | ✅ | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `kanban_columns` | ✅ | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `quotations` | ✅ + anon token | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `travelers` | ✅ | ✅ | ✅ | ❌ | `get_my_org_id()` |
| `financial_suppliers` | ✅ | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `financial_transactions` | ✅ | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `contract_templates` | ✅ | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `communication_rules` | ✅ | ✅ | ✅ | ✅ | `get_my_org_id()` |
| `notifications` | ✅ own | ❌ | ✅ own | ❌ | `user_id=auth.uid()` |

**Função `get_my_org_id()`:**
```sql
SELECT org_id FROM profiles WHERE user_id = auth.uid() OR id = auth.uid() LIMIT 1;
-- Retorna: 'b9d9ef56-27ad-4221-86dd-7bfc6210f059' (Excelência Tour)
```

---

## 🏗️ ARQUITETURA DO APP WEB (Rotas e Guards)

```
/login                  → Login.tsx (supabase.auth.signInWithPassword)
/signup                 → Signup.tsx (supabase.auth.signUp)
/onboarding             → Onboarding.tsx [ProtectedRoute] (cria org, provisiona kanban)
/                       → Dashboard [ProtectedWithOrg = ProtectedRoute + OnboardingGuard]
/clients                → Clients.tsx [ProtectedWithOrg]
/clients/new            → ClientNew.tsx [ProtectedWithOrg]
/clients/:id            → ClientDetail.tsx [ProtectedWithOrg]
/quotations             → Quotations.tsx [ProtectedWithOrg]
/trips                  → Trips.tsx [ProtectedWithOrg]
/trips/:id              → TripDetail.tsx [ProtectedWithOrg + TripsRole]
/kanban/sales           → KanbanBoard.tsx [ProtectedWithOrg + TripsRole]
/kanban/tasks           → TasksKanban.tsx [ProtectedWithOrg + TripsRole]
/kanban/departures      → DeparturesKanban.tsx [ProtectedWithOrg + TripsRole]
/tickets                → Tickets.tsx [ProtectedWithOrg]
/finance/suppliers      → Suppliers.tsx [ProtectedRoute]
/finance/transactions   → Transactions.tsx [ProtectedRoute]
/legal/contracts        → ContractTemplates.tsx [ProtectedRoute]
/automations            → Automations.tsx [ProtectedRoute]
/team                   → Team.tsx [ProtectedRoute]
/settings               → Settings.tsx [ProtectedWithOrg]
/ai-chat                → AIChat.tsx [ProtectedWithOrg]

// Portal do Viajante (acesso público/cliente):
/portal/excelencia-tour           → PortalLogin.tsx
/portal/excelencia-tour/home      → PortalHome.tsx [ProtectedRoute]
/portal/excelencia-tour/trip/:id  → PortalTripDetail.tsx [ProtectedRoute]

// Links públicos (sem auth):
/f/:token  → PublicTravelerForm.tsx
/q/:token  → PublicQuotation.tsx
/c/:token  → PublicChecklist.tsx
/p/guide/:slug → PublicGuide.tsx
/roteiro/:token → PublicItinerary.tsx
```

---

## 🔧 CONSTANTES FINAIS PARA A EXTENSÃO

```javascript
// config.js
const SUPABASE_URL  = 'https://xhdoupxnpjbzkzuhucpp.supabase.co';
const ANON_KEY      = 'eyJ[REDACTED_JWT]';

// Dados da agência (descobertos após login — NÃO hardcode exceto para teste)
const ORG_ID        = 'b9d9ef56-27ad-4221-86dd-7bfc6210f059';
const PROFILE_ID    = '02494fbc-6a4b-499c-8b08-6032a5e9eadb'; // = user_id neste caso
const ORG_SLUG      = 'excelencia-tour';
const PORTAL_URL    = `https://[seu-app].lovable.app/portal/${ORG_SLUG}`;

const BASE = `${SUPABASE_URL}/rest/v1`;
const FN   = `${SUPABASE_URL}/functions/v1`;

const ENDPOINTS = {
  AUTH_LOGIN:    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
  AUTH_REFRESH:  `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
  AUTH_LOGOUT:   `${SUPABASE_URL}/auth/v1/logout`,
  PROFILES:      `${BASE}/profiles`,
  ORGS:          `${BASE}/organizations`,
  CLIENTS:       `${BASE}/clients`,
  TRIPS:         `${BASE}/trips`,
  TICKETS:       `${BASE}/tickets`,
  KANBAN_CARDS:  `${BASE}/kanban_cards`,
  EMAIL_MSGS:    `${BASE}/email_messages`,
  TIMELINE:      `${BASE}/client_timeline`,
  // Edge Functions
  EXT_SYNC:      `${FN}/extension-sync`,
  EMAIL_INGEST:  `${FN}/email-webhook-ingest`,
  QUOTATION_AI:  `${FN}/ext-process-quotation`,
};
```

---

## 🧪 DIAGNÓSTICO COMPLETO — Cole no Console do Chrome

```javascript
(async () => {
  const BASE = 'https://xhdoupxnpjbzkzuhucpp.supabase.co';
  const KEY  = 'eyJ[REDACTED_JWT]';
  const EMAIL = 'eusoueduoficial@gmail.com';
  const PASS  = 'SUA_SENHA_AQUI'; // ← substitua

  const results = {};

  // STEP 1: Login
  const authR = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ email: EMAIL, password: PASS })
  });
  const auth = await authR.json();
  results['1_login'] = authR.ok ? `✅ OK — uid: ${auth.user?.id}` : `❌ ${auth.error_description}`;
  if (!authR.ok) { console.table(results); return; }

  const T = auth.access_token;
  const uid = auth.user.id;
  const H = { apikey: KEY, Authorization: `Bearer ${T}` };

  // STEP 2: Profile por user_id
  const profR = await fetch(`${BASE}/rest/v1/profiles?user_id=eq.${uid}&limit=1`, { headers: H });
  const [prof] = await profR.json();
  results['2_profile_by_user_id'] = prof ? `✅ OK — org_id: ${prof.org_id}, name: ${prof.first_name}` : '❌ VAZIO';

  if (!prof?.org_id) { console.table(results); return; }

  // STEP 3: Org
  const orgR = await fetch(`${BASE}/rest/v1/organizations?id=eq.${prof.org_id}&limit=1`, { headers: H });
  const [org] = await orgR.json();
  results['3_organization'] = org ? `✅ ${org.name} (${org.slug})` : '❌ VAZIO';

  // STEP 4: Clients
  const cliR = await fetch(`${BASE}/rest/v1/clients?limit=3&select=id,name`, { headers: H });
  const clients = await cliR.json();
  results['4_clients'] = Array.isArray(clients) ? `✅ ${clients.length} clientes` : `❌ ${JSON.stringify(clients)}`;

  // STEP 5: Kanban boards com colunas
  const boardR = await fetch(`${BASE}/rest/v1/kanban_boards?select=id,name,slug,board_type`, { headers: H });
  const boards = await boardR.json();
  results['5_kanban_boards'] = Array.isArray(boards) ? `✅ ${boards.length} boards: ${boards.map(b=>b.slug).join(', ')}` : '❌';

  // STEP 6: extension-sync quick_task
  const taskR = await fetch(`${BASE}/functions/v1/extension-sync`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'quick_task', data: { title: '[TESTE] Diagnóstico', task_type: 'geral', priority: 'low' } })
  });
  const task = await taskR.json();
  results['6_quick_task'] = taskR.ok ? `✅ card id: ${task.id}` : `❌ ${task.error}`;

  console.table(results);
  console.log('\n📋 Dados completos:', { uid, profile: prof, org });
})();
```
