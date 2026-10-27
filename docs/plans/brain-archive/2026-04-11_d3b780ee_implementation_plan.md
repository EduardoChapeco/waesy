# VoyageOS — Plano de Implementação PRD v1.0

## Contexto e Problema Crítico Detectado

O VoyageOS está construído com React 18 + Vite + TypeScript + Supabase. A análise do codebase revelou um **problema crítico de schema** que deve ser resolvido ANTES de qualquer trabalho de redesign.

---

## ⚠️ User Review Required

> [!CAUTION]
> **SCHEMA MISMATCH CRÍTICO — Bloqueante para toda a execução**
>
> O frontend referencia tabelas que **NÃO EXISTEM** no banco Supabase conectado (`xhdoupxnpjbzkzuhucpp`):
> - `clients` → não existe (o DB tem `crm_contacts`, `travel_customers`)
> - `quotations` → não existe (o DB tem `travel_reservations`, `travel_packages`)
> - `trips` → não existe (o DB tem `sw_travel_trips`, `travel_packages`)
> - `kanban_boards`, `kanban_columns`, `kanban_cards` → não existem
> - `hotels_bank` → não existe
> - `destination_guides` → não existe
> - `organizations` → não existe (o DB tem `workspaces`)
> - `profiles` → **existe** (única tabela VoyageOS que já existe)
>
> Isso significa que o app **não funciona** com o banco atual. Precisamos de uma decisão:
>
> **Opção A (Recomendada):** Criar o schema VoyageOS do zero no banco atual — migrations completas para criar todas as tabelas necessárias (`clients`, `organizations`, `quotations`, `trips`, `kanban_boards`, etc.)
>
> **Opção B:** O banco conectado é errado — existe outro projeto Supabase com o schema VoyageOS correto que deve ser usado.
>
> **Por favor confirme qual opção seguir antes de prosseguir.**

> [!IMPORTANT]
> O banco atual (`SWdb`) parece ser de outro produto (Simwork — sistema de criação de conteúdo com IA). O VoyageOS necessita de um schema completamente diferente.

---

## Diagnóstico Completo do Estado Atual

### O que JÁ EXISTE (frontend em bom estado):
- ✅ React.lazy em todas as rotas (Fase 1 do PRD já feita)
- ✅ dnd-kit instalado e integrado no Kanban
- ✅ Fonts (Sora + Inter) já importadas em `index.css`
- ✅ Design tokens básicos em `index.css` (mas precisam migrar para `design-system.css`)
- ✅ Componentes shadcn/ui completos
- ✅ React Query v5, Zustand, react-hook-form + zod
- ✅ Estrutura de páginas para todos os módulos (Clients, Trips, Hotels, Guides, Kanban, etc.)

### O que NÃO FUNCIONA (schema inexistente):
- ❌ Toda a lógica de dados (`useClients`, `useTrips`, `useQuotations`, etc.) aponta para tabelas que não existem no banco
- ❌ Kanban sem tabelas (`kanban_boards`, `kanban_columns`, `kanban_cards`)
- ❌ Hotéis sem tabela (`hotels_bank`)
- ❌ Guias sem tabela (`destination_guides`)
- ❌ `organizations` não existe (app usa auth/org pattern mas tabela ausente)

---

## Proposed Changes

### Fase 0 — Fundação Schema + Design System

> [!IMPORTANT]
> Esta fase é **bloqueante**. Nada funciona sem o schema correto.

#### Phase 0.1: Schema VoyageOS — Migrations SQL

Criar em ordem (respeitando foreign keys):

1. **`organizations`** — Tabela raiz de multi-tenancy do VoyageOS
2. **`profiles`** — Já existe, mas pode precisar de colunas `org_id`, `role`
3. **`clients`** — Perfis de clientes/viajantes
4. **`travelers`** — Dados de viajante por embarque
5. **`quotations`** — Orçamentos de viagem
6. **`trips`** — Viagens confirmadas
7. **`hotels_bank`** — Banco de hotéis
8. **`destination_guides`** — Guias de destino
9. **`kanban_boards`** — Boards do Kanban
10. **`kanban_columns`** — Colunas do Kanban
11. **`kanban_cards`** — Cards do Kanban
12. **`kanban_notes`** — Notas de cards (NOVO - PRD Seção 9.7)
13. **`kanban_checklists`** — Checklists de cards (NOVO - PRD Seção 9.7)
14. **`kanban_card_media`** — Mídia de cards (NOVO - PRD Seção 9.7)
15. **`traveler_info_pages`** — Páginas de info ao viajante (NOVO - PRD Seção 12.4)

RLS policies padrão (SELECT/INSERT/UPDATE por org_id, DELETE apenas admin).

---

#### Phase 0.2: Design System CSS

**[NEW]** `src/styles/design-system.css`
- Todas as variáveis CSS da Seção 3.1 do PRD
- Classes utilitárias (`.surface-card`, `.surface-muted`, `.no-shadow`)
- Proibir `box-shadow`, gradientes, neon

**[MODIFY]** `src/main.tsx`
- Importar `design-system.css` antes de `index.css`

**[MODIFY]** `tailwind.config.ts`
- Adicionar tokens de cor, border-radius, gap, fontFamily mapeados para variáveis CSS
- Manter configuração existente (shadcn, animations)

**[MODIFY]** `src/index.css`
- Remover duplicações (há `:root` duplicado nas linhas 190-285)
- Remover `.glass` e `.glass-strong` (proibidos pelo PRD)
- Remover `.text-gradient-primary` (usa gradiente, proibido)

---

#### Phase 0.3: Componentes Base Novos

Todos em `src/components/ui/`:

**[NEW]** `BentoGrid.tsx` — `BentoGrid` + `BentoCell` (PRD Seção 4.2)

**[NEW]** `SheetPage.tsx` — Sheet 70vw com sidebar vertical (PRD Seção 8)
- Props: `open`, `onClose`, `title`, `icon`, `children`, `sidebar`, `footer`, `onSave`, `saveLabel`, `isLoading`
- Wraps shadcn `Sheet` existente com estrutura padronizada

**[NEW]** `PageHeader.tsx` — Header padronizado de páginas (PRD Seção 5.4)

**[NEW]** `StatusBadge.tsx` — Badge semântico 5 variantes (PRD Seção 5.3)

**[NEW]** `EmptyState.tsx` — Estado vazio padronizado (PRD Seção 5.6)

**[NEW]** `LazyImage.tsx` — Imagem com lazy loading + skeleton (PRD Seção 7.4)

**[NEW]** `MediaUploader.tsx` — Upload de mídia local para Supabase Storage (PRD Seção 5.10)

**[NEW]** `DataTable.tsx` — Tabela padronizada wrapper de shadcn Table (PRD Seção 5.5)

**[MODIFY]** `skeleton.tsx` — Adicionar variante sem shimmer (pulse de opacity)

---

### Fase 1 — Kanban CRM Expandido

> Depende da Fase 0 (schema `kanban_*` deve existir)

#### [MODIFY] `src/hooks/useKanbanBoards.ts`
- Expandir `useUpdateKanbanCard` para aceitar todos os campos novos
- Criar `useKanbanNotes` (CRUD de notas)
- Criar `useKanbanChecklists` (CRUD de checklists + progresso)
- Criar `useKanbanCardMedia` (upload + delete de mídia)
- Criar `useKanbanTags` (gerenciamento de tags por org)

#### [MODIFY] `src/pages/KanbanBoard.tsx`
- Redesign completo das colunas (280px fixo, scroll horizontal)
- `KanbanCard` com tags, checklist progress, avatar, valor estimado
- Inline quick-add form por coluna (não modal global)
- `DragOverlay` visual atualizado (sem sombra pesada)
- Remover Dialog de novo card global → substituir por inline por coluna

#### [NEW] `src/components/kanban/KanbanCardSheet.tsx`
- SheetPage com sidebar: Dados | Checklist | Notas | Atividade | Vínculos
- Seção Dados: nome, whatsapp, email, status, valor estimado, tags
- Seção Checklist: items com checkbox, progress bar, drag to reorder
- Seção Notas: textarea + lista de notas **editáveis** (corrige bug atual)
- Seção Atividade: log automático de mudanças
- Seção Vínculos: orçamentos, viagens, upload de documentos

#### [NEW] `src/components/kanban/TagInput.tsx`
- Multi-select de tags com criação inline (Enter para criar)
- 8 cores pré-definidas sólidas, rotacionando
- Chip: background 15% opacidade, texto 100% cor

---

### Fase 2 — Hotéis Expandidos

> Depende da Fase 0 (schema `hotels_bank` expandido)

#### Migration: `add_columns_hotels_bank`
- `category`, `website`, `whatsapp`, `email`, `destination_id`
- `latitude`, `longitude`, `address_full`
- `room_types JSONB`, `gallery_urls TEXT[]`, `amenities JSONB`
- `checkin_time`, `checkout_time`, `cancellation_policy`
- `includes_breakfast`, `includes_wifi`, `internal_rating`, `internal_notes`

#### [MODIFY] `src/hooks/useHotels.ts`
- Expandir `useCreateHotel` / `useUpdateHotel` para campos novos
- Criar `useHotelGeocode` — chama Nominatim API
- Criar `useHotelStorageUpload` — upload para Supabase Storage

#### [NEW] `src/pages/HotelEdit.tsx` (substituir `HotelNew.tsx`)
- SheetPage com sidebar: Dados Gerais | Localização | Tipos de Quarto | Galeria | Info Adicional
- **Localização:** busca Nominatim + Mapbox GL JS para visualização
- **Tipos de Quarto:** lista expansível, JSONB, drag to reorder
- **Galeria:** MediaUploader modo galeria, primeira foto = capa
- **Info Adicional:** comodidades, políticas, avaliação interna

#### [MODIFY] `src/pages/HotelDetail.tsx`
- BentoGrid cols=3
- Foto capa (2x1) + Mapa Mapbox (1x1)
- Dados + Quartos resumo + Links
- Galeria completa (full)
- Tab de viagens usando este hotel

---

### Fase 3 — Guias de Destino Expandidos

> Depende da Fase 0 (schema `destination_guides` expandido)

#### Migration: `add_columns_destination_guides`
- `country`, `language`, `currency`, `timezone`, `best_season`
- `gallery_urls TEXT[]`
- `sections JSONB` — seções dinâmicas com tipo, nome, descrição, fotos, vídeos, links
- `traveler_info JSONB` — documentos, vistos, vacinas, saúde, leis, moeda, segurança
- `slug TEXT UNIQUE`, `status TEXT`, `published_at TIMESTAMPTZ`

#### [MODIFY] `src/pages/Guides.tsx`
- Redesign com DataTable + PageHeader + EmptyState
- Filtro por status (rascunho/publicado)

#### [NEW] `src/pages/GuideEdit.tsx`
- SheetPage com sidebar: Info Básica | Galeria | Seções | Info ao Viajante | Publicação
- **Seções Dinâmicas:** lista expansível com tipo (Praia, Restaurante, etc.), drag, MediaUploader por seção
- **Info ao Viajante:** campos com botão "Preencher com IA" → Edge Function
- **Slug:** auto-gerado, editável

#### [MODIFY] `src/pages/GuideDetail.tsx`
- BentoGrid publicação interna + link para webview

#### [NEW] `src/pages/public/PublicGuide.tsx`
- Webview pública `/p/guide/:slug`
- Template PRD Seção 6.5 com BentoGrid
- Seções dinâmicas renderizadas por tipo
- Lightbox simples para fotos (fullscreen, sem sombra)
- Mapbox para localização de seções

---

### Fase 4 — Módulo Informações ao Viajante (NOVO)

> Depende da Fase 0 (tabela `traveler_info_pages` deve existir)

#### [NEW] `src/pages/TravelerInfo.tsx`
- Lista de páginas de informação com DataTable
- Filtro por categoria e status
- Botão "+ Nova Página" → SheetPage

#### [NEW] `src/pages/TravelerInfoEdit.tsx`
- SheetPage com sidebar: Configuração | Conteúdo | Publicação
- **Conteúdo:** blocos dinâmicos (texto, lista, tabela, aviso, contatos, links)
- **Botão "Gerar com IA"** por bloco e "Gerar página completa com IA"
- Edge Function que chama LLM com título + categoria como contexto

#### [NEW] `src/pages/public/PublicTravelerInfo.tsx`
- Webview pública `/p/info/:slug`
- Renderiza blocos por tipo (PRD Seção 13.6)

#### Navigation update em `AppSidebar.tsx`
- Adicionar item "Informações ao Viajante" no menu

---

### Fase 5 — Webviews Públicas Redesenhadas

#### [MODIFY] `src/pages/PublicQuotation.tsx`
- Redesign completo com BentoGrid (PRD Seção 13.2)
- PublicLayout component (header agência + footer)
- Seções: Hero, Resumo, Voos, Hospedagem, Serviços, Valores, Contato

#### [NEW] `src/components/layout/PublicLayout.tsx`
- Header: logo agência + nome (56px)
- Content: max-width 1080px, margin auto
- Footer: nome + whatsapp + email (80px)

#### [MODIFY] `src/pages/PortalTripDetail.tsx`
- Redesign com BentoGrid (PRD Seção 6.6)
- BentoCell por viagem na lista

---

### Fase 6 — Design Token Audit

> Pode ser feita em paralelo com outras fases, ou ao final

#### Auditoria global:
- Busca por cores hexadecimais hardcoded (ex: `#1E3A5F`, `#fff`, `#e5e7eb`)
- Busca por `box-shadow` não-permitidos
- Busca por `linear-gradient` e `radial-gradient`
- Busca por `text-shadow`
- Substituição por variáveis CSS do design system

---

## Open Questions

> [!IMPORTANT]
> **Questão 1 — Schema (BLOQUEANTE):**
> O banco Supabase conectado (`SWdb`) não tem o schema VoyageOS. Confirme:
> - **Opção A:** Criar o schema VoyageOS neste banco (migrations do zero)
> - **Opção B:** Existe outro projeto Supabase com o schema correto — qual é o `project_id`?

> [!IMPORTANT]
> **Questão 2 — Mapbox:**
> A PRD menciona Mapbox GL JS. Existe uma chave de API Mapbox no `.env`? Se não, posso usar Leaflet + OpenStreetMap (100% gratuito, sem chave) como alternativa para os mapas.

> [!IMPORTANT]
> **Questão 3 — Supabase Storage:**
> O módulo `MediaUploader` precisa de um bucket no Supabase Storage configurado. Devo criar os buckets `hotel-gallery`, `guide-media`, `kanban-media` via migration?

> [!WARNING]
> **Questão 4 — Edge Functions para IA:**
> O botão "Gerar com IA" nos guias/info pages requer uma Edge Function com acesso a um LLM (OpenAI, Anthropic, etc.). Existe uma chave de IA já configurada no banco? Posso usar as `workspace_api_keys` existentes ou preciso de outra fonte?

---

## Verification Plan

### Por fase:

**Fase 0:**
- Rodar migrations e verificar que todas as tabelas existem
- Abrir a aplicação — deve funcionar igual ao anterior (nada visual mudou)
- Verificar imports do design-system.css no DevTools → Network

**Fase 1 (Kanban):**
- Criar um card inline por coluna
- Drag-and-drop entre colunas
- Abrir SheetPage de um card → todas as seções funcionando
- Notas editáveis após criação

**Fase 2 (Hotéis):**
- Criar hotel, buscar endereço via Nominatim, ver mapa
- Upload de galeria, reordenar fotos
- Adicionar tipos de quarto

**Fase 3 (Guias):**
- Criar guia com seção "Praia", adicionar fotos, publicar
- Acessar `/p/guide/:slug` publicamente
- Verificar que seções dinâmicas renderizam corretamente

**Fase 4 (TravelerInfo):**
- Criar página de info com blocos mistos
- Clicar "Gerar com IA" → verificar que conteúdo é gerado
- Acessar `/p/info/:slug` publicamente

**Fase 5 (Webviews):**
- Gerar link de orçamento público
- Verificar layout BentoGrid no mobile

---

## Ordem de Execução Recomendada

```
Fase 0 [BLOQUEANTE] → Aguardar confirmação de schema
  ↓
Phase 0.1: Migrations SQL → 0.2: Design System → 0.3: Componentes Base
  ↓
Fase 1: Kanban (impacto mais visível, maior valor)
  ↓
Fase 2: Hotéis → Fase 3: Guias (podem rodar em paralelo)
  ↓
Fase 4: TravelerInfo → Fase 5: Webviews
  ↓
Fase 6: Design Token Audit (cleanup final)
```
