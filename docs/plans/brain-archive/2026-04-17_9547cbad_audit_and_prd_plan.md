# Turis Agências — Auditoria Completa + Plano PRD Incremental

---

## PARTE 1 — INVENTÁRIO COMPLETO DO SISTEMA EXISTENTE

### 1.1 Rotas Registradas (App.tsx)

| Rota | Componente | Proteção |
|---|---|---|
| `/login` | Login | Pública |
| `/signup` | Signup | Pública |
| `/onboarding` | Onboarding | Auth |
| `/f/:token` | PublicTravelerForm | Pública |
| `/q/:token` | PublicQuotation | Pública |
| `/c/:token` | PublicChecklist | Pública |
| `/p/guide/:slug` | PublicGuide | Pública |
| `/p/info/:slug` | PublicTravelerInfo | Pública |
| `/g/:slug` | PublicGroupTrip | Pública |
| `/voucher/:token` | PublicBookingVoucher | Pública |
| `/roteiro/:token` | PublicItinerary | Pública |
| `/portal/:org_slug` | PortalLogin | Pública |
| `/portal/:org_slug/home` | PortalHome | Auth |
| `/portal/:org_slug/trip/:id` | PortalTripDetail | Auth |
| `/portal/:org_slug/trip/:trip_id/ai-photos` | PortalAiPhotos | Auth |
| `/` | Index (Dashboard) | Auth+Org |
| `/clients` | Clients | Auth+Org |
| `/clients/new` | ClientNew | Auth+Org |
| `/clients/:id` | ClientDetail | Auth+Org |
| `/clients/:id/edit` | ClientEdit | Auth+Org |
| `/quotations` | Quotations | Auth+Org |
| `/quotations/new` | QuotationNew | Auth+Org |
| `/quotations/:id` | QuotationDetail | Auth+Org |
| `/trips` | Trips | Auth+Org |
| `/trips/new` | TripNew | Auth+Org+Role |
| `/trips/:id` | TripDetail | Auth+Org+Role |
| `/itineraries` | Itineraries | Auth+Org |
| `/itineraries/:id/builder` | ItineraryBuilder | Auth+Org |
| `/kanban/sales` | KanbanBoard | Auth+Org+Role |
| `/kanban/departures` | DeparturesKanban | Auth+Org+Role |
| `/kanban/tasks` | TasksKanban | Auth+Org+Role |
| `/ai-chat` | AIChat | Auth+Org+Role |
| `/settings` | Settings | Auth+Org+Role |
| `/finance/suppliers` | Suppliers | Auth |
| `/finance/transactions` | Transactions | Auth |
| `/legal/contracts` | ContractTemplates | Auth |
| `/automations` | Automations | Auth |
| `/team` | Team | Auth |
| `/guides` | Guides | Auth+Org+Role |
| `/guides/:id` | GuideDetail | Auth+Org+Role |
| `/info` | TravelerInfo | Auth+Org+Role |
| `/hotels` | Hotels | Auth+Org+Role |
| `/hotels/:id` | HotelDetail | Auth+Org+Role |
| `/tickets` | Tickets | Auth+Org+Role |
| `/tickets/:id` | TicketDetail | Auth+Org+Role |
| `/experiences` | Experiences | Auth+Org+Role |
| `/group-trips` | GroupTrips | Auth+Org+Role |

**Total: 46 rotas (10 públicas + 36 protegidas)**

---

### 1.2 Páginas (46 arquivos)

| Página | Função | Hook Principal | Status |
|---|---|---|---|
| Index.tsx | Dashboard KPIs | useTrips, useClients | ✅ OK |
| Clients.tsx | Lista de Clientes | useClients | ✅ OK |
| ClientNew.tsx | Cadastro de Cliente | useClients | ✅ OK |
| ClientDetail.tsx | Detalhe do Cliente | useClients | ✅ OK |
| ClientEdit.tsx | Edição de Cliente | useClients | ✅ OK |
| Quotations.tsx | Lista de Cotações | useQuotations | ✅ OK |
| QuotationNew.tsx | Nova Cotação | — | ✅ OK |
| QuotationDetail.tsx | Detalhe da Cotação | useQuotations | ✅ OK |
| Trips.tsx | Lista de Viagens | useTrips | ✅ OK |
| TripNew.tsx | Nova Viagem | — | ✅ OK |
| TripDetail.tsx | Detalhe da Viagem | useTrips | ✅ OK |
| Itineraries.tsx | Roteiros | useItineraries | ✅ OK |
| ItineraryBuilder.tsx | Editor de Roteiro | useItineraries | ✅ OK |
| KanbanBoard.tsx | CRM Kanban | useKanbanBoards | ✅ OK |
| DeparturesKanban.tsx | Kanban Embarques | useKanbanBoards | ✅ OK |
| TasksKanban.tsx | Kanban Tarefas | useKanbanBoards | ✅ OK |
| Settings.tsx | Configurações | useSettings, useAiKeys, useKnowledgeBase | ✅ OK |
| AIChat.tsx | Chat com IA | supabase.functions.invoke | ✅ OK |
| Hotels.tsx | Banco de Hotéis | useHotels | ✅ OK |
| HotelDetail.tsx | Detalhe do Hotel | useHotels | ✅ OK |
| Guides.tsx | Guias de Destino | useGuides | ✅ OK |
| GuideDetail.tsx | Detalhe do Guia | useGuides | ✅ OK |
| TravelerInfo.tsx | Info do Viajante | useTravelerInfo | ✅ OK |
| Tickets.tsx | Chamados | useTickets | ✅ OK |
| TicketDetail.tsx | Detalhe do Chamado | useTickets | ✅ OK |
| Experiences.tsx | Passeios | usePoliciesAndExperiences | ✅ OK |
| GroupTrips.tsx | Grupos Terrestres | useGroupTrips | ✅ OK |
| Login.tsx | Login | — | ✅ OK |
| Signup.tsx | Cadastro | — | ✅ OK |
| Onboarding.tsx | Onboarding | — | ✅ OK |
| NotFound.tsx | 404 | — | ✅ OK |
| PublicGroupTrip.tsx | Página Pública do Grupo | usePublicGroupTrip | ✅ OK |
| PublicBookingVoucher.tsx | Voucher de Reserva | usePublicBooking | ✅ OK |
| PublicQuotation.tsx | Cotação Pública | — | ✅ OK |
| PublicItinerary.tsx | Roteiro Público | — | ✅ OK |
| PublicGuide.tsx | Guia Público | — | ✅ OK |
| PublicTravelerForm.tsx | Formulário do Viajante | — | ✅ OK |
| PublicTravelerInfo.tsx | Info Pública | — | ✅ OK |
| PublicChecklist.tsx | Checklist Público | — | ✅ OK |
| PortalLogin.tsx | Login do Portal | — | ✅ OK |
| PortalHome.tsx | Home do Portal | usePortal | ✅ OK |
| PortalTripDetail.tsx | Detalhe Viagem Portal | — | ✅ OK |
| PortalAiPhotos.tsx | Fotos IA no Portal | — | ✅ OK |

**Subdirs de páginas:**
- `admin/Team.tsx` — Gestão de Equipe
- `finance/Suppliers.tsx` — Fornecedores financeiros
- `finance/Transactions.tsx` — Transações financeiras
- `legal/ContractTemplates.tsx` — Templates de Contrato
- `automations/Automations.tsx` — Regras de automação

---

### 1.3 Hooks (25 arquivos)

| Hook | Tabela(s) | Operações |
|---|---|---|
| useClients | clients | CRUD completo |
| useQuotations | quotations | CRUD completo |
| useTrips | trips | CRUD completo |
| useItineraries | itineraries, itinerary_days, itinerary_items | CRUD |
| useKanbanBoards | kanban_boards, kanban_columns, kanban_cards | CRUD completo |
| useKanbanCards | (wrapper do KanbanBoards) | — |
| useHotels | hotels_bank | CRUD |
| useGuides | destination_guides | CRUD |
| useTravelers | travelers, trip_travelers | CRUD |
| useTravelerInfo | traveler_info_pages | CRUD |
| useTickets | tickets, ticket_messages | CRUD |
| useChecklists | traveler_checklists | CRUD |
| useFinance | financial_transactions, financial_suppliers | CRUD |
| useContracts | contract_templates | CRUD |
| useAutomations | communication_rules | CRUD |
| useTeam | team_members, user_roles | CRUD |
| useAiKeys | ai_keys_pool | CRUD |
| useKnowledgeBase | ai_knowledge_base | CRUD + embed |
| useSettings | organizations | Read/Update |
| usePortal | trips, travelers | Read |
| usePoliciesAndExperiences | experiences, policy_cache | CRUD |
| useGroupTrips | group_trips, group_trip_days, group_bookings, booking_installments | CRUD completo |
| useNotifications | notifications | Read + Mark |
| use-mobile | — | Utility |
| use-toast | — | Utility |

---

### 1.4 Componentes Principais

```
src/components/
├── AppLayout.tsx            — Shell da aplicação (sidebar + content)
├── AppSidebar.tsx           — Navegação lateral com grupos
├── AuthProvider.tsx         — Gerencia sessão Supabase
├── ClientEditSheet.tsx      — Sheet completo de edição de cliente
├── ClientQuickView.tsx      — Visualização rápida de cliente
├── ErrorBoundary.tsx        — Captura erros React
├── NotificationPanel.tsx    — Painel de notificações
├── ProtectedRoute.tsx       — Guard de autenticação
├── RoleGuard.tsx            — Guard por role
├── QuotationAiImportSheet.tsx — Upload + extração de cotação por IA
├── QuotationBuilderSheet.tsx  — Builder visual de cotação
├── TripEditSheet.tsx          — Edição de viagem
├── group-trips/
│   └── GroupTripDaysEditor.tsx — Editor Dia a Dia do Grupo
├── itinerary/               — Componentes do roteiro
├── kanban/                  — Cards, colunas, board
├── layout/                  — Componentes de layout
└── ui/                      — Design system (shadcn-based)
```

---

### 1.5 Tabelas no Banco (Produção — 79 tabelas)

#### Núcleo de Negócios (Turis Agências)
| Tabela | Descrição | RLS |
|---|---|---|
| `organizations` | Agências cadastradas | ✅ |
| `profiles` | Perfis dos usuários | ✅ |
| `user_roles` | Roles (admin, agent, etc.) | ✅ |
| `team_members` | Membros da equipe | ✅ |
| `clients` | Clientes da agência | ✅ |
| `client_timeline` | Histórico do cliente | ✅ |
| `leads` | Leads/prospects | ✅ |
| `quotations` | Cotações de viagem | ✅ |
| `quote_hotels` | Hotéis nas cotações | ✅ |
| `quote_destinations` | Destinos nas cotações | ✅ |
| `quote_experiences` | Passeios nas cotações | ✅ |
| `quote_transfers` | Transfers nas cotações | ✅ |
| `quote_price_items` | Itens de preço | ✅ |
| `quote_chips` | Chips de info nos orçamentos | ✅ |
| `quote_includes` | Inclus/exclu | ✅ |
| `trips` | Viagens ativas | ✅ |
| `trip_travelers` | Viajantes por viagem | ✅ |
| `trip_flights` | Voos por viagem | ✅ |
| `trip_documents` | Documentos | ✅ |
| `trip_contracts` | Contratos | ✅ |
| `travelers` | Dados dos viajantes | ✅ |
| `itineraries` | Roteiros | ✅ |
| `itinerary_days` | Dias do roteiro | ✅ |
| `itinerary_items` | Itens por dia | ✅ |
| `itinerary_stops` | Paradas | ✅ |
| `itinerary_leads` | Captura de leads no roteiro | ✅ |
| `itinerary_geo_cache` | Cache de coordenadas | ✅ |
| `flights` | Voos (detalhado) | ✅ |
| `flight_segments` | Trechos de voo | ✅ |
| `flight_amenities` | Serviços de bordo | ✅ |
| `hotels_bank` | Banco de hotéis | ✅ |
| `destination_guides` | Guias de destino | ✅ |
| `destination_tags` | Tags de destinos | ✅ |
| `destinations` | Destinos | ✅ |
| `experiences` | Passeios/atividades | ✅ |
| `traveler_info_pages` | Páginas de info do viajante | ✅ |
| `traveler_checklists` | Checklists | ✅ |
| `kanban_boards` | Boards Kanban | ✅ |
| `kanban_columns` | Colunas do Kanban | ✅ |
| `kanban_cards` | Cards do Kanban | ✅ |
| `kanban_checklists` | Checklists nos cards | ✅ |
| `kanban_checklist_items` | Itens dos checklists | ✅ |
| `kanban_notes` | Notas nos cards | ✅ |
| `kanban_tags` | Tags nos cards | ✅ |
| `support_tickets` | Chamados (antigo) | ✅ |
| `tickets` | Chamados v2 | ✅ |
| `ticket_messages` | Mensagens nos chamados | ✅ |
| `notifications` | Notificações | ✅ |
| `contract_templates` | Templates de contrato | ✅ |
| `financial_transactions` | Transações financeiras | ✅ |
| `financial_suppliers` | Fornecedores financeiros | ✅ |
| `financial_commissions` | Comissões | ✅ |
| `suppliers` | Fornecedores | ✅ |
| `ai_keys_pool` | Pool de chaves de IA | ✅ |
| `ai_knowledge_base` | Base de conhecimento RAG | ✅ |
| `ai_behavioral_profiles` | Perfis comportamentais de clientes | ✅ |
| `communication_logs` | Logs de comunicação | ✅ |
| `communication_rules` | Regras de automação | ✅ |
| `email_messages` | Mensagens de email | ✅ |
| `wa_conversation_logs` | Logs WhatsApp | ✅ |
| `wa_session_metrics` | Métricas WhatsApp | ✅ |
| `portal_ai_photos` | Fotos IA (portal) | ✅ |
| `policy_cache` | Cache de políticas | ✅ |

#### Módulo Grupos Terrestres (NOVO - adicionado por você)
| Tabela | Descrição | RLS |
|---|---|---|
| `group_trips` | Pacotes em grupo | ✅ |
| `group_trip_days` | Roteiro dia a dia | ✅ |
| `group_bookings` | Reservas públicas | ✅ |
| `booking_installments` | Parcelas do carnê | ✅ |
| `bus_layouts` | Layout do ônibus/veículo | ✅ |
| `bus_seat_assignments` | Mapa de assentos | ✅ |
| `contract_signatures` | Assinaturas eletrônicas | ✅ |

#### Tabelas Legado/Simwork (obsoletas, não usadas no frontend)
| Tabela | Status |
|---|---|
| `bio_links`, `bio_link_blocks`, `bio_link_versions` | BioLink antigo — ORPHAN |
| `brand_kits`, `brand_characters`, `brand_templates` | BioLink/Simwork — ORPHAN |
| `ccp_prompt_templates` | Simwork — ORPHAN |
| `feature_flags` | Genérico — parcialmente usado |
| `news_items`, `rss_feeds`, `rss_items`, `rss_sources` | RSS — ORPHAN |
| `system_logs` | Log global |
| `content_templates` | ORPHAN |

---

### 1.6 Funções/RPCs no Banco

| Função | Tipo | Uso |
|---|---|---|
| `get_my_org_id()` | Helper RLS | Todas as RLS policies |
| `match_documents()` | RAG | ai-chat-agent (busca vetorial) |
| `get_public_group_trip()` | Public | PublicGroupTrip page |
| `generate_booking_installments()` | Business | Gera parcelas do carnê |
| `confirm_public_quotation()` | Business | Confirma cotação publica |
| `get_public_itinerary_by_token()` | Public | PublicItinerary |
| `get_public_organization_by_slug()` | Public | Portal |
| `submit_traveler_form()` | Public | PublicTravelerForm |
| `generate_ticket_code()` | Helper | Tickets |
| `handle_new_user()` | Trigger | Auto-cria profile |
| `assign_org_admin_role()` | Trigger | Assign role |
| `provision_default_kanban_boards()` | Trigger | Cria boards padrão |
| `ensure_default_kanban_boards()` | Helper | — |
| `update_updated_at_column()` | Trigger | Todos os updated_at |
| `log_error()` | Helper | system_logs |

---

### 1.7 Edge Functions

| Função | Descrição | Status |
|---|---|---|
| `extract-quotation` | Extrai cotação de imagem/PDF/texto via IA com schema rigoroso e persiste relacional | ✅ Funcional Real |
| `ai-chat-agent` | Chat com RAG real (match_documents RPC) + pool de chaves | ⚠️ BUG: usa `aiConfig` antes de defini-la (linha 53) |
| `email-webhook-ingest` | Ingesta emails recebidos | ❓ Verificar |
| `ext-process-quotation` | Processa cotação via extensão Chrome | ❓ Verificar |
| `extension-sync` | Sincroniza dados com extensão Chrome | ❓ Verificar |

---

## PARTE 2 — BUGS E FALHAS ENCONTRADOS

### 🔴 CRÍTICO: ai-chat-agent usa `aiConfig` antes de defini-la

**Arquivo:** `supabase/functions/ai-chat-agent/index.ts`, linha 53  
**Problema:** Na seção RAG (linha 53), o código referencia `aiConfig.provider` e `aiConfig.key` para gerar embeddings, mas `aiConfig` só é definida na seção 3 (linha 100+). Isso causa `ReferenceError: aiConfig is not defined` sempre que o agente tenta fazer busca vetorial.  
**Resultado:** O RAG está **efetivamente morto**. O catch silencia o erro, então a IA responde sem contexto nenhum.

```typescript
// LINHA 53 — ERRO: aiConfig não existe aqui ainda!
if (aiConfig.provider === 'gemini' || aiConfig.provider === 'google') {
```

### 🔴 CRÍTICO: `group_bookings` sem RLS para anon

A tabela `group_bookings` tem apenas policy `FOR ALL USING (org_id = get_my_org_id())`. Mas a função `useCreatePublicBooking` é chamada por usuários anônimos (não logados) que acessam a página pública `/g/:slug`. Isso resulta em erro `403` ao tentar reservar.

### 🟡 MÉDIO: `ai-chat-agent` não persiste conversas

O chat envia `conversation_history` mas nenhuma conversa é salva no banco. Ao recarregar a página, o histórico é perdido. A tabela `wa_conversation_logs` existe mas não é usada aqui.

### 🟡 MÉDIO: `AIChat.tsx` ainda exibe branding legado "V-Agent"

Linha 74: `V-Agent: Squad & RAG` — deveria ser branding da Turis Agências.

### 🟡 MÉDIO: `QuotationAiImportSheet` não exibe campos extraídos editáveis

O campo `whatsapp_text` é gerado pela IA mas o usuário não consegue editá-lo antes de salvar. O JSON completo é armazenado em `ai_raw_response` corretamente, mas a UI não reflete todos os campos extraídos (ex: trechos de voo, transfers).

### 🟡 MÉDIO: Tabelas Simwork/BioLink orphans

~15 tabelas `bio_links`, `brand_kits`, `ccp_prompt_templates`, etc. existem no banco mas não têm nenhuma referência no frontend. Consomem schema e podem gerar confusão.

### 🟢 BAIXO: `useKnowledgeBase` sem geração de embedding

O hook insere texto na `ai_knowledge_base` mas **não gera embeddings**. Isso significa que o `match_documents()` (que usa similaridade vetorial) não encontrará estes documentos. A busca vai cair no fallback por texto simples.

---

## PARTE 3 — O QUE FALTA DO PRD (Incrementos)

Comparando o PRD "Travel Intelligence Engine" com o que existe:

| Feature do PRD | Status no Sistema | Incremento Necessário |
|---|---|---|
| **Request Interpreter** (Agente 0) | ❌ Não existe | Novo edge function `interpret-request` |
| **Destination Logistics Expert** (Agente 1) | ❌ Não existe | New table `destinations_logic` + edge fn |
| **Infotravel Playwright Automation** | ❌ Não existe | Backend Python separado |
| **Flight Specialist** (Agente 2) | ❌ Não existe | Edge function `score-flights` |
| **Hotel Value Analyst** (Agente 3) | ❌ Não existe | Pode ser adicionado ao scoring |
| **Tree-of-Thought Planner** (Agente 4) | ❌ Não existe | LangGraph (Python backend) |
| **Multi-Agent Debate** (Agente 5) | ❌ Não existe | LangGraph |
| **Market Simulation** (Agente 6) | ❌ Não existe | LangGraph |
| **Learning System** (Agente 7) | ❌ Não existe | `decision_logs` table + análise |
| **flight change monitoring** | ❌ Não existe | Edge fn + email watcher |
| **check-in automático** | ❌ Não existe | Edge fn agendada |
| **Base de destinos com regras** | ⚠️ Parcial — `destinations` existe | Expandir com gateway_rules |
| **Cotação por imagem/PDF** | ✅ Existe | extract-quotation funciona |
| **Pool de chaves IA** | ✅ Existe | ai_keys_pool funciona |
| **RAG básico** | ⚠️ Broken | ai-chat-agent tem bug crítico |
| **Scoring de voos** | ❌ Não existe | Novo edge fn ou lógica no frontend |
| **Grupos Terrestres** | ✅ Completo | Funcional |
| **Carnê de parcelas** | ✅ Completo | generate_booking_installments() |
| **Assinatura eletrônica** | ⚠️ Tabela existe | Falta UI + edge fn de assinar |

---

## PARTE 4 — PLANO DE INCREMENTOS (Priorizado, Sem Duplicação)

### Sprint 1 — Correções Críticas (impacto imediato)

**1A — Fix Bug ai-chat-agent (RAG quebrado)**
- Reorganizar a função para buscar chave ANTES de tentar gerar embedding
- Estimativa: 30min, 1 arquivo

**1B — Fix RLS group_bookings para anon**
- Adicionar policy `FOR INSERT TO anon WITH CHECK (true)` na `group_bookings`
- Estimativa: 5min, 1 migration

**1C — Embedding ao salvar knowledge base**
- `useKnowledgeBase` deve chamar edge function para gerar e salvar o embedding ao inserir
- Estimativa: 2h, 1 hook + 1 edge fn `generate-embedding`

---

### Sprint 2 — Destinos com Regras Logísticas

> **Tabela existente**: `destinations` (campos básicos)  
> Incremento: adicionar coluna `gateway_rules JSONB` e UI para gerenciar

**2A — Migrate: expandir `destinations`**
```sql
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS gateway_city TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS gateway_rules JSONB DEFAULT '{}';
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS transfer_time_hours NUMERIC;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS best_season TEXT[];
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS avoid_season TEXT[];
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS special_notes TEXT;
```

**2B — Edge Function: `interpret-request`**
- Input: texto livre (WhatsApp/email)
- Output: JSON estruturado (destination, dates, pax, preferences)
- Usa pool de chaves existente
- Persiste na tabela `quotations` como rascunho

**2C — UI: Página `/destinations` na Sidebar**
- CRUD de destinos com gateway rules
- Aproveitamento da tabela `destinations` existente

---

### Sprint 3 — Automação de Cotação (Request to Quote)

> Não duplica nada — usa `extract-quotation` existente + novo `interpret-request`

**3A — Edge Function: `score-quotation`**
- Recebe array de voos extraídos
- Aplica regras de scoring (layover, conexões, preço)
- Usa regras da tabela `destinations` para decidir gateway  
- Retorna score + recomendação + justificativa

**3B — Nova tabela: `quotation_scenarios`**
```sql
CREATE TABLE quotation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id),
  org_id UUID,
  scenario_type TEXT, -- 'direct', 'gateway', 'date_shift'
  flights_json JSONB,
  hotels_json JSONB,
  score NUMERIC,
  recommendation TEXT,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**3C — UI: Painel de Cotação Inteligente**
- Integrar score na tela `/quotations/:id`
- Mostrar recomendação do agente com justificativa
- Botão "Aceitar" que converte em viagem

---

### Sprint 4 — Decision Logger (Aprendizado)

**4A — Nova tabela: `ai_decision_logs`**
```sql
CREATE TABLE ai_decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  quotation_id UUID REFERENCES quotations(id),
  packages_offered JSONB,
  package_recommended TEXT,
  package_chosen_by_agent TEXT,
  package_chosen_by_client TEXT,
  outcome TEXT CHECK (outcome IN ('sale', 'lost', 'pending')),
  price_difference NUMERIC,
  layover_difference_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**4B — UI: Painel de Aprendizado em Settings**
- Lista de decisões registradas
- Padrões descobertos (query simples: win rate por scenario_type)

---

### Sprint 5 — Alterações de Voo

**5A — Edge Function: `flight-change-analyzer`**
- Input: texto/email da operadora reportando mudança
- Usa `interpret-request` para classificar o tipo de alteração
- Aplica a árvore de decisão do PRD
- Gera 3 soluções com custo

**5B — Nova tabela: `flight_change_events`**
```sql
CREATE TABLE flight_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id),
  org_id UUID,
  original_flight_json JSONB,
  new_flight_json JSONB,
  change_type TEXT, -- 'minor', 'major', 'cancellation'
  solutions_json JSONB,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Sprint 6 — Assinatura Eletrônica (Grupos)

> Tabela `contract_signatures` já existe  
> Falta: Edge Function + UI

**6A — Edge Function: `sign-contract`**
- Recebe: booking_id, contract_html, dados do signatário, foto_url, geolocation
- Gera hash_sha256 do contrato
- Salva na `contract_signatures`
- Atualiza `group_bookings.status = 'signed'`

**6B — UI: Página de assinatura pública**
- Rota: `/sign/:booking_token`
- Exibe contrato formatado
- Captura câmera (Web Camera API) + geolocalização
- Submit chama `sign-contract`

---

## RESUMO EXECUTIVO

### O que funciona bem hoje:
- ✅ CRM completo (Clientes, Cotações, Viagens, Kanban)
- ✅ Grupos Terrestres com reserva pública e carnê de parcelas
- ✅ Pool de chaves IA com múltiplos provedores
- ✅ Extração de cotação por imagem/PDF/texto (edge function real)
- ✅ Base de Conhecimento RAG (salvar funciona; embedding/busca tem bug)
- ✅ Portal do Cliente
- ✅ Roteiros públicos com PDF-like view
- ✅ 79 tabelas com RLS ativo

### Prioridade imediata (esta semana):

1. **🔴 Fix ai-chat-agent** — Reorganizar lógica (aiConfig antes do RAG)
2. **🔴 Fix RLS group_bookings** — Permitir insert anon
3. **🟡 Embedding ao salvar KB** — Edge fn `generate-embedding`
4. **🟡 Expandir tabela destinations** — Adicionar gateway_rules
5. **🟡 Edge fn `interpret-request`** — Primeiro agente real do PRD
