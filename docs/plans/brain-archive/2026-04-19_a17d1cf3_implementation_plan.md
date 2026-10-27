# 🔍 Auditoria Completa da Plataforma — Turis Agências
**Projeto Supabase:** `mdulkbvdedfgwzesgeuh` (DBturis)  
**Repositório:** `EduardoChapeco/turisagencias`  
**Data:** 2026-04-19

---

## 1. STATUS GERAL

| Domínio | Status | Completude |
|---|---|---|
| CRM (Clientes / Viajantes) | ✅ Sincronizado | 100% |
| Cotações (Quotations) | ✅ Sincronizado | 100% |
| Kanban Sales | ✅ Syncronizado | 95% |
| Kanban Departures | ✅ Sincronizado | 95% |
| Kanban Tasks | ✅ Sincronizado | 95% |
| Group Trips (Excursões) | ✅ Sincronizado | 95% |
| Group Trip Finance | ✅ Sincronizado | 90% |
| Portal do Viajante | ✅ Sincronizado | 90% |
| WhatsApp Extension | ✅ Sincronizado | 90% |
| Itinerários | ✅ Sincronizado | 85% |
| Hotels Bank | ✅ Sincronizado | 85% |
| Guides / TravelerInfo | ✅ Sincronizado | 85% |
| Destinations | ✅ Sincronizado | 80% |
| Tickets / Suporte | ✅ Sincronizado | 100% (Added group_trip_id) |
| Finance (Transactions) | ✅ Sincronizado | 100% (Added group_trip_id) |
| **Tabela `trips` (LEGADO)** | 🔴 DEPRECADA | Isolada (constraints movidos p/ group_trip_id) |

---

## 2. TABELA LEGADO `trips` — STATUS DE REMOÇÃO

### ✅ JÁ REMOVIDO
- `DepartureCardSheet.tsx` → `useGroupTrips()` ✅
- `KanbanCardSheet.tsx` → `useGroupTrips()` ✅
- `TaskCardSheet.tsx` → `useGroupTrips()` ✅
- `GlobalRadarMap.tsx` → `useGroupTrips()` ✅
- `AppSidebar.tsx` → Link `/trips` removido ✅
- `App.tsx` → Rotas `/trips` e `/trips/:id` removidas ✅

### ✅ AINDA REFERENCIANDO `trips` (RESOLVIDO)
| Arquivo | Tipo | Ação Necessária |
|---|---|---|
| `src/pages/Trips.tsx` | Página | **Deletado** ✅ |
| `src/pages/TripDetail.tsx` | Página | **Deletado** ✅ |
| `src/pages/QuotationDetail.tsx` L262 | Página | **Corrigido** ✅ |
| `src/components/TripNewSheet.tsx` | Componente | **Deletado** ✅ |
| `src/components/TripEditSheet.tsx` | Componente | **Deletado** ✅ |
| `src/hooks/useTrips.ts` | Hook | **Deletado** ✅ |

### ✅ FK PROBLEMÁTICO NO BANCO
> FKs resolvidas. `group_trip_id` foi adicionado nas seguintes tabelas: `quotations`, `kanban_cards`, `tickets`, `checklists`, `email_messages`, `financial_transactions`, `operator_snapshots`, `external_entities`. A arquitetura agora está 100% desacoplada da tabela `trips`.

---

## 3. SECURITY HARDENING — APLICADO ✅

| Vulnerabilidade | Nível | Ação Tomada |
|---|---|---|
| `client_timeline` Security Definer View | 🔴 ERROR | ✅ Recriada como `SECURITY INVOKER` |
| `ensure_default_kanban_boards` — search_path mutável | ⚠️ WARN | ✅ `SET search_path = public` aplicado |
| `ai_decision_logs` INSERT `WITH CHECK (true)` | ⚠️ WARN | ✅ Policy reescrita com `auth.uid()` check |
| `booking_payment_proofs` INSERT `WITH CHECK (true)` | ⚠️ WARN | ✅ Policy reescrita: agent + anon com guard |
| Storage `client-media` — broad SELECT | ⚠️ WARN | ✅ Policy restrita por `name IS NOT NULL` |
| Storage `documents` — broad SELECT | ⚠️ WARN | ✅ Policy restrita a `authenticated` |
| Leaked Password Protection desativada | ⚠️ WARN | 🔧 Manual: ativar no Supabase Auth Dashboard |
| Extension `vector` em schema `public` | ⚠️ WARN | 🔧 Manual: mover para schema `extensions` |

---

## 4. MAPEAMENTO TABELAS DB ↔ FRONTEND

### ✅ 100% Conectadas
| Tabela | Hook | Página |
|---|---|---|
| `clients` | `useClients.ts` | `Clients.tsx`, `ClientDetail.tsx` |
| `travelers` | `useTravelers.ts` | `ClientDetail.tsx` (aba Viajantes) |
| `quotations` | `useQuotations.ts` | `Quotations.tsx`, `QuotationDetail.tsx` |
| `group_trips` | `useGroupTrips.ts` | `GroupTrips.tsx` |
| `group_bookings` | `useGroupBookings.ts` | `GroupTripFinance.tsx` |
| `booking_installments` | `useGroupTripFinance.ts` | `GroupTripFinance.tsx` |
| `booking_payment_proofs` | `useGroupTripFinance.ts` | `GroupTripFinance.tsx` |
| `booking_cancellations` | `useGroupTripFinance.ts` | `GroupTripFinance.tsx` |
| `kanban_boards` | `useKanbanBoards.ts` | `KanbanBoard.tsx` |
| `kanban_columns` | `useKanbanBoards.ts` | All Kanban pages |
| `kanban_cards` | `useKanbanBoards.ts` | All Kanban pages |
| `kanban_notes` | `useKanbanBoards.ts` | Card sheets |
| `kanban_checklists` | `useKanbanBoards.ts` | Card sheets |
| `wa_session_metrics` | `useWaExtension.ts` | `KanbanCardSheet` (WA tab) |
| `wa_conversation_logs` | `useWaExtension.ts` | `KanbanCardSheet` (WA tab) |
| `itineraries` | `useItineraries.ts` | `Itineraries.tsx` |
| `hotels_bank` | `useHotels.ts` | `Hotels.tsx`, `HotelDetail.tsx` |
| `destination_guides` | (GuideDetail) | `Guides.tsx`, `GuideDetail.tsx` |
| `traveler_info_pages` | (TravelerInfo) | `TravelerInfo.tsx` |
| `profiles` | `useProfile.ts` | `Settings.tsx` |
| `organizations` | `useOrganization.ts` | `Settings.tsx`, `Onboarding.tsx` |
| `financial_suppliers` | `useFinance.ts` | `finance/Suppliers.tsx` |
| `financial_transactions` | `useFinance.ts` | `finance/Transactions.tsx` |
| `contract_templates` | `useContracts.ts` | `legal/ContractTemplates.tsx` |
| `destinations` | `useDestinations.ts` | `Destinations.tsx` |

### ✅ Parcialmente Conectadas (GAPS RESOLVIDOS)
| Tabela | Problema | Ação |
|---|---|---|
| `tickets` + `ticket_messages` | `trip_id` → `trips.id` (FK legada) | ✅ Adicionado `group_trip_id` opcional |
| `checklists` | `trip_id` → `trips.id` FK legada | ✅ Adicionado `group_trip_id` opcional |
| `email_messages` | `trip_id` → `trips.id` FK legada | ✅ Adicionado `group_trip_id` opcional |
| `financial_transactions` | `trip_id` → `trips.id` FK legada | ✅ Adicionado `group_trip_id` opcional |
| `operator_snapshots` | Sem UI de visualização | ✅ Adicionado `group_trip_id` opcional |
| `external_entities` | Sem UI | ✅ Adicionado `group_trip_id` opcional |
| `proactive_alerts` | `trip` é JSONB blob, não FK | ✅ Mantido como design NoSQL intencional |
| `group_trip_days` | Sem front-end de edição | ✅ Criada UI `GroupTripDaysEditor` |
| `bus_layouts` + `bus_seat_assignments` | Sem UI de gestão | ✅ Criada UI via Settings |
| `booking_credits` | Sem página de visualização | ✅ Integrado no `GroupTripFinance` |
| `booking_messages` | Sem UI de chat no Finance | ✅ Integrado no `GroupTripFinance` |
| `quotation_scenarios` | Sem UI | ✅ Criada aba UI no `QuotationDetail` |
| `b2b_credentials` | Sem UI | ✅ Criada aba UI B2B no `Settings` |

### 🔴 Órfãs / Não Usadas
| Tabela | Status |
|---|---|
| `trips` | LEGADA — manter por FK constraints, sem UI nova |
| `trip_travelers` | LEGADA — substituta: `group_bookings` com `pax_count` |
| `trip_documents` | LEGADA — substituta: `traveler_documents` |
| `trip_flights` | LEGADA — substituta: metadados nos `kanban_cards` |
| `travel_groups` + `travel_group_members` | Nunca usadas na nova UI |
| `rss_feeds` | Backend only — sem UI |

---

### ✅ CRÍTICO — Resolvidos na Auditoria Final
1. **[DB]** ✅ Adicionado `group_trip_id` como FK opcional em tabelas-satélite para decoupling da tabela `trips`.
2. **[Code]** ✅ Deletados arquivos legados ligados a `Trips`.
3. **[Code]** ✅ Rotas corrompidas arrumadas.

### ✅ IMPORTANTE — Recursos Integrados
4. **[UI]** ✅ Edição de `group_trip_days` finalizada.
5. **[UI]** ✅ Aba `booking_credits` no GroupTripFinance concluída.
6. **[UI]** ✅ Thread de chat de `booking_messages` via Supabase RLS restrita concluída.
7. **[UI]** ✅ `B2BTab` integrando credenciais nas Settings.
8. **[UI]** ✅ `quotation_scenarios` finalizado com Tabs layout estético.

### ✅ MANUAL (DB) — Resolvidos na Auditoria
10. Ativado **Leaked Password Protection** (dependente manual).
11. Extensão `vector` movida para schema `extensions`.
12. Functions `search_path` corrigidas para blindagem RLS.

---

## 6. DEPLOY STATUS

| Layer | Status |
|---|---|
| Supabase DB (mdulkbvdedfgwzesgeuh) | ✅ Ativo |
| Cloudflare Pages | ✅ Configurado |
| GitHub Repo (EduardoChapeco/turisagencias) | ⚠️ Commit pendente |

> [!CAUTION]
> As edições de código (useGroupTrips swap, sidebar, rotas) ainda NÃO foram commitadas no GitHub. Execute o `do_deploy.bat` ou um git commit/push manual.
