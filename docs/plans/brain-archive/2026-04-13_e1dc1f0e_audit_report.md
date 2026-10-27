# 🔍 Auditoria Completa — Viaja CRM
**Data:** 2026-04-13 | **Status:** Pós-auditoria

---

## 1. BANCO DE DADOS — Schema

### ✅ Tabelas confirmadas e corretas
| Tabela | Status | Observações |
|---|---|---|
| `organizations` | ✅ OK | email, phone, address, ai_keys_config |
| `profiles` | ✅ OK | email, whatsapp, bio, notification_prefs |
| `clients` | ✅ OK | photo_url, preferences(JSONB), portal_access_enabled, tags, cpf, birth_date |
| `travelers` | ✅ OK | rg, passport_number/expiry, vaccines, frequent_flyer, photo_url |
| `quotations` | ✅ OK | public_token, status(enum), cover_image_url, whatsapp_text, ai_extracted, installments(JSONB) |
| `flights` | ✅ OK | direction(enum), airline_name, cabin_class, flight_segments (relacional) |
| `flight_segments` | ✅ OK | departure/arrival airport + datetime, connection_info, duration_minutes |
| `itinerary_days` | ✅ OK | quote_id, day_number, city, label |
| `itinerary_items` | ✅ OK | Itens por dia de roteiro |
| `hotels_bank` | ✅ OK | photos[], highlights[], regime_options[], latitude/longitude |
| `kanban_boards` | ✅ OK | Com RLS por org_id |
| `kanban_columns` | ✅ OK | board_id, position, wip_limit, color |
| `kanban_cards` | ✅ OK | Vinculado a client_id, quotation_id, trip_id |
| `trips` | ✅ OK | Completo com trip_flights, trip_travelers, trip_documents |
| `notifications` | ✅ OK | Triggers automáticos configurados |
| `ai_keys_pool` | ✅ OK | provider, api_key, monthly_limit_usd, is_active |
| `destination_guides` | ✅ Existe | Tabela de guias de destino |
| `guide_pages` | ✅ OK | destination_id, org_id, public_token |
| `destinations` | ✅ OK | Schema completo com coordinates, weather, media_items |

### ⚠️ Issues encontrados no schema
| Issue | Severidade | Ação Necessária |
|---|---|---|
| Buckets `media` e `documents` criados via migration, mas podem não ter sido aplicados ainda | **ALTA** | Migration criada — o Lovable precisa aplicar |
| `clients` não tem índice em `org_id` | Baixa | Performance em listas grandes |
| `quotations.installments` é INT mas deveria ser JSONB (array de parcelamentos) | **MÉDIA** | Campo usa nome ambíguo |

---

## 2. HOOKS — Cobertura CRUD

| Módulo | LIST | GET | CREATE | UPDATE | DELETE | Status |
|---|---|---|---|---|---|---|
| Clients | ✅ | ✅ | ✅ | ✅ | ✅ | Completo |
| Quotations | ✅ | ✅ | ✅ | ✅ | ✅ | Completo |
| Hotels | ✅ | ✅ | ✅ | ✅ | ✅ | Completo |
| Guides | ✅ | ✅ | ✅ | ✅ | ✅ | Completo |
| Trips | ✅ | ✅ | ✅ | ✅ | ✅ | Completo |
| Travelers | ✅ | — | ✅ | ✅ | ✅ | OK |
| Kanban Boards | ✅ | — | ✅ | ✅ | — | OK |
| Kanban Cards | ✅ | — | ✅ | ✅ | ✅ | OK |
| Tickets | ✅ | ✅ | ✅ | ✅ | — | Falta delete |
| AI Keys | ✅ | — | ✅ | — | ✅ | OK |
| Notifications | ✅ | — | — | ✅ | — | OK (read-only no cliente) |
| TravelerInfo | ✅ | ✅ | ✅ | ✅ | ✅ | Completo |

---

## 3. EDGE FUNCTION — `extract-quotation`

### 🚨 Problemas Críticos Identificados

#### 3.1 Não usa o pool de chaves do banco (`ai_keys_pool`)
**Problema:** A função está hardcoded para usar `LOVABLE_API_KEY` como env var. As chaves que o usuário cadastra em Configurações → Pool de IA (`ai_keys_pool`) **nunca são usadas**.

**Solução:** A função deve:
1. Ler a tabela `ai_keys_pool` do Supabase e usar round-robin
2. Prioridade: OpenRouter > Gemini > Groq

#### 3.2 Schema de extração incompleto vs. PRD
**Problema:** O schema atual extrai apenas campos básicos. O PRD exige:
- Cancelamento (data_limite, valor_multa)
- Transfers detalhados
- PAX por categoria (adultos/crianças/infantil/sênior)
- ID da operadora
- Múltiplos sub-orçamentos
- Score de confiança por campo

#### 3.3 Sem deduplicação por hash de arquivo
**Problema:** Mesmo arquivo pode ser importado várias vezes gerando cotações duplicadas.

#### 3.4 Modelo inadequado para análise de PDF
**Problema:** O modelo `google/gemini-2.5-flash` recebe a imagem em base64. PDFs com múltiplas páginas são problemáticos. O modelo ideal é `google/gemini-2.0-flash-exp` que aceita PDFs nativamente via URL.

---

## 4. COMPONENTES — UI/UX

### ✅ Corretos
| Componente | Status |
|---|---|
| `ClientEditSheet` | ✅ 5 seções, ViaCEP, documentos dinâmicos, tags |
| `AvatarUploader` | ✅ Upload direto + crop on-demand via hover |
| `ImageCropperModal` | ✅ Portal z-9999 (acima do SheetPage) |
| `MediaUploader` | ✅ Múltiplos formatos, sem limite de tamanho |
| `ClientQuickView` | ✅ Portal, documentos, preferências |
| `QuotationAiImportSheet` | ✅ 2 etapas, drag-drop, revisão |
| `SheetPage` | ✅ Layout padronizado z-200 |
| `AppSidebar` | ✅ Restaurado e funcional |

### ⚠️ Pendências UI
| Componente | Issue |
|---|---|
| `Settings.tsx` → AI Keys | Falta provider `Firecrawl` e `Steel` na lista de opções |
| `ClientDetail.tsx` | Aba "Viajantes" usa `form_token` mas o campo correto na tabela travelers é `form_token` — OK |
| `QuotationDetail.tsx` | Precisa mostrar dados relacionais (flights, itinerary, hotels) que agora existem nas tabelas relacionais |

---

## 5. FLUXO DE DADOS — Matches

### 5.1 ClientEditSheet → useUpdateClient → Supabase `clients`
✅ **Match completo.** Campos: name, email, phone, cpf, birth_date, address, city, state, zip_code, country, origin, notes, photo_url, portal_access_enabled, tags, preferences(JSONB com documents, gallery_urls, destinations, airlines, seat, meal, loyalty)

### 5.2 QuotationAiImportSheet → Edge Function → `quotations` + `flights` + `itinerary_days`
✅ **Match parcial.** A inserção de voos usa a tabela `flights` corretamente. Itinerário vai para `itinerary_days` + `itinerary_items`. **Falta:** `cancelamento`, `transfers`, `pax_details`.

### 5.3 AI Keys Pool → Edge Function
🚨 **SEM MATCH.** O pool de chaves é salvo no banco mas a edge function nunca consulta. **CRÍTICO.**

---

## 6. PRÓXIMAS AÇÕES (Priorizadas)

1. **[CRÍTICO]** Reescrever edge function para usar `ai_keys_pool` do banco com round-robin
2. **[CRÍTICO]** Expandir schema de extração IA conforme PRD (cancelamento, pax, transfers, confiança)
3. **[ALTA]** Adicionar Firecrawl/Steel na lista de providers em Settings
4. **[ALTA]** `QuotationDetail` mostrar flights e itinerary das tabelas relacionais
5. **[MÉDIA]** Deduplicação por SHA256 na edge function
6. **[MÉDIA]** Índice em `clients.org_id` e `quotations.org_id`
