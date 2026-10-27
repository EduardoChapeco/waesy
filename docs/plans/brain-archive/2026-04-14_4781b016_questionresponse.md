# Respostas Técnicas — Banco Supabase — Turis Agências
## Para configurar a Extensão Chrome v2.1
> Extraído diretamente do banco em: 2026-04-14

---

## Resposta 1 — Tabela de perfis dos agentes/usuários

- **Tabela**: `profiles`
- **Coluna user_id**: `user_id` (FK → auth.users.id)
- **Coluna org_id**: `org_id` (FK → organizations.id)
- **Coluna nome**: ⚠️ **NÃO existe `full_name` como coluna única** — o nome está dividido em **duas colunas separadas**:
  - `first_name` (obrigatório, NOT NULL)
  - `last_name` (obrigatório, NOT NULL)
  - Existe também uma coluna `full_name` (nullable) que pode ser preenchida mas não é garantida
  - **Para exibição**: concatenar `first_name || ' ' || last_name`

> [!IMPORTANT]
> O `profiles` tem duas estruturas sobrepostas: a coluna `full_name` legada (nullable) E as colunas `first_name`/`last_name` canônicas (NOT NULL). Use `first_name || ' ' || last_name` para garantir.

**Schema completo de `profiles`:**
```
id            uuid (PK)
email         text NOT NULL
full_name     text NULL          ← legada, pode ser null
first_name    text NOT NULL      ← canônica
last_name     text NOT NULL      ← canônica
user_id       uuid NULL (FK auth.users)
org_id        uuid NULL (FK organizations)
role          text NOT NULL      ← 'org_admin' | 'agent' | 'support' | 'client'
is_active     boolean NOT NULL
avatar_url    text NULL
whatsapp      text NULL
last_seen_at  timestamptz NULL
```

---

## Resposta 2 — Tabela de clientes

- **Tabela**: `clients`
- **Coluna telefone principal**: `phone` (text, nullable)
- **Coluna WhatsApp**: `whatsapp` (text, nullable) ← campo separado e específico!

> [!TIP]
> Para buscar cliente por número de WhatsApp na extensão, usar `whatsapp` e não `phone`. Os agentes geralmente preenchem o WhatsApp separado.

**Colunas relevantes de `clients`:**
```
id              uuid (PK)
org_id          uuid (FK organizations)
name            text NOT NULL
email           text NULL
phone           text NULL      ← telefone geral
whatsapp        text NULL      ← número WhatsApp específico
cpf             text NULL
passport_number text NULL
assigned_agent_id uuid NULL (FK profiles)
tags            text[] NULL
is_active       boolean
```

---

## Resposta 3 — Timeline do cliente

- **Nome**: `client_timeline` ✅ **EXISTE como VIEW**

**Definição da view** (SECURITY INVOKER — respeita RLS):
```sql
SELECT em.id, em.org_id, em.client_id, em.trip_id, em.ticket_id,
       'email'::text AS source_type,
       em.subject AS title, em.ai_summary AS summary,
       em.direction, em.received_at AS event_at, em.created_at
FROM email_messages em
UNION ALL
SELECT t.id, t.org_id, t.client_id, t.trip_id, t.id AS ticket_id,
       'ticket'::text AS source_type,
       t.title, t.description AS summary,
       NULL AS direction, t.created_at AS event_at, t.created_at
FROM tickets t
WHERE t.client_id IS NOT NULL;
```

**Filtro recomendado na extensão:**
```js
supabase.from('client_timeline')
  .select('*')
  .eq('client_id', clientId)
  .order('event_at', { ascending: false })
  .limit(20)
```

---

## Resposta 4 — Alertas de email

- **Tabela**: `email_messages` ✅ (não `email_alerts`)

**Colunas de `email_messages`:**
```
id          uuid (PK)
org_id      uuid (FK organizations)
client_id   uuid NULL (FK clients)
trip_id     uuid NULL (FK trips)
ticket_id   uuid NULL (FK tickets)
subject     text
direction   text    ← 'inbound' | 'outbound'
body_text   text NULL
ai_summary  text NULL
ai_type     text NULL
ai_priority text NULL
received_at timestamptz
created_at  timestamptz
```

**Para buscar emails que precisam de atenção (inbound não respondidos):**
```js
supabase.from('email_messages')
  .select('*')
  .eq('org_id', orgId)
  .eq('direction', 'inbound')
  .order('received_at', { ascending: false })
  .limit(10)
```

---

## Resposta 5 — Templates de resposta rápida

- **Tabela dedicada para WhatsApp quick replies**: ❌ **não existe**
- Existe `ccp_prompt_templates` mas é para prompts de agentes de IA (system prompts), **não** mensagens WhatsApp.

**Recomendação**: usar os defaults hardcoded na extensão. O `ccp_prompt_templates` tem:
```
workspace_id  uuid NULL   ← NULL = template global do sistema
category      text        ← categoria do agente
prompt_text   text        ← conteúdo do prompt
```
Não serve para quick replies de WhatsApp.

---

## Resposta 6 — Campo ticket_code

- **Coluna do código**: `ticket_code` ✅ **EXISTE na tabela `tickets`**
- **Formato**: `TCKR-XXXXXXXX` (ex: `TCKR-A3F9B2C1`)
- **Gerado automaticamente** por trigger no banco ao criar o ticket

**Exemplo de busca:**
```js
supabase.from('tickets')
  .select('id, title, status, ticket_code, client_id')
  .eq('ticket_code', 'TCKR-A3F9B2C1')
  .single()
```

---

## ✅ Bloco de Constantes — sidepanel.js CORRIGIDO

Cole este bloco exato no início do `sidepanel.js`:

```javascript
// ============================================================
// CONSTANTES DE SCHEMA — Turis Agências CRM
// Banco: Supabase | Verificado em: 2026-04-14
// ============================================================

const TABLE_CLIENTS        = 'clients';
const TABLE_TICKETS        = 'tickets';
const TABLE_TRIPS          = 'trips';
const TABLE_TASKS          = 'kanban_cards';       // ← tarefas ficam em kanban_cards (board tasks)
const TABLE_TIMELINE       = 'client_timeline';    // ← VIEW (não tabela)
const TABLE_EMAIL_ALERTS   = 'email_messages';     // ← NÃO é email_alerts!
const TABLE_QUICK_REPLIES  = null;                 // ← não existe, usar defaults hardcoded
const TABLE_PROFILE        = 'profiles';

const COL_PROFILE_USER     = 'user_id';
const COL_PROFILE_ORG      = 'org_id';
const COL_PROFILE_NAME     = 'first_name';         // ← concatenar com last_name!
const COL_PROFILE_LASTNAME = 'last_name';          // ← NOVO: necessário!
const COL_PROFILE_ROLE     = 'role';               // ← 'org_admin' | 'agent' | 'support'

const COL_CLIENTS_PHONE    = 'whatsapp';           // ← usar 'whatsapp' (não 'phone')
const COL_CLIENTS_PHONE2   = 'phone';              // ← fallback se whatsapp for null
const COL_TICKETS_CLIENT   = 'client_id';
const COL_TICKETS_CODE     = 'ticket_code';        // ← formato: TCKR-XXXXXXXX
const COL_TRIPS_CLIENT     = 'primary_client_id';  // ← NÃO é client_id! É primary_client_id!
const COL_TASKS_CLIENT     = 'client_id';
const COL_TIMELINE_CLIENT  = 'client_id';
const COL_EMAIL_DIRECTION  = 'direction';          // ← 'inbound' | 'outbound'

// Helper para nome completo do agente
function getAgentFullName(profile) {
  if (!profile) return 'Agente';
  // Tenta full_name legado primeiro, fallback para first+last
  return profile.full_name || 
         `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
         profile.email || 
         'Agente';
}

// Helper para número de WhatsApp do cliente
function getClientWhatsApp(client) {
  return client?.whatsapp || client?.phone || null;
}
// ============================================================
```

---

## ⚠️ Diffs Críticos vs. Defaults da Extensão

| Constante | Default da Extensão | Valor Correto | Impacto |
|-----------|-------------------|---------------|---------|
| `TABLE_TASKS` | `'tasks'` | `'kanban_cards'` | Tarefas não carregam |
| `TABLE_EMAIL_ALERTS` | `'email_alerts'` | `'email_messages'` | Alertas não carregam |
| `COL_CLIENTS_PHONE` | `'phone'` | `'whatsapp'` | WhatsApp não detectado |
| `COL_TRIPS_CLIENT` | `'client_id'` | `'primary_client_id'` | Viagens não vinculam |
| `COL_PROFILE_NAME` | `'full_name'` | `first_name + last_name` | Nome do agente vazio |
| `TABLE_QUICK_REPLIES` | `'quick_replies'` | `null` | Usar defaults hardcoded |
