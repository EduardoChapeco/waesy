# 🎨 PROMPT ULTRA-COMPLETO — TravelOS v2 · Design System Global + Loja + Builders + Marketing

> **Missão:** Executar uma refatoração cirúrgica de nível BigTech no TravelOS, elevando a excelência visual, a coesão sistêmica e a inteligência operacional de todas as interfaces. Nada será mockado, duplicado, hardcoded ou desconectado.

---

## CONTEXTO DO SISTEMA

O TravelOS é um SaaS multi-tenant de gestão de agências de turismo. Suas entidades principais:
- **Agências** (`agencies`) com subdomínio próprio (`slug`)
- **Grupos de Viagem** (`group_tours`) — produto principal
- **Cotações/Propostas** (`proposals`) — B2C e B2B
- **CRM** (`contacts`, `leads`, `crm_interactions`) — funil de vendas
- **Portal Público** (`portal_pages`) — WebView de publicação (builder de páginas)
- **Client Portal** (`/client/*`) — Área autenticada do cliente/passageiro
- **Supabase** como backend único (DB, Auth, Storage, Edge Functions, Realtime)

Stack: React 18 + TanStack Router + TanStack Query + Vite + TypeScript + shadcn/ui + Tailwind + Supabase-js

---

## ⚠️ REGRAS ABSOLUTAS (não negociáveis)

1. **Zero mock / zero hardcoded / zero estático sem propósito** — cada UI deve ser alimentada por dados reais do banco
2. **Zero duplicação** — inventariar antes de criar; reaproveitar hooks, componentes, tipos existentes
3. **RLS em toda nova tabela** — policies por `agency_id` + `auth.uid()` em SELECT/INSERT/UPDATE/DELETE
4. **Contratos TypeScript sincronizados** — qualquer nova coluna → atualizar `types/supabase.ts` ou usar cast `as any` documentado
5. **Match Global obrigatório** — ao final de cada módulo: schema ↔ frontend ↔ hooks ↔ Edge Functions sincronizados
6. **Anti-rerenderização** — `useEffect` com deps corretas, Realtime com cleanup, `useMemo`/`useCallback` onde necessário
7. **Design System unificado** — ZERO estilo isolado por página; todos os tokens vêm de `src/styles/` ou CSS vars globais

---

## 🎨 MÓDULO 1 — DESIGN SYSTEM GLOBAL (PRIORIDADE MÁXIMA)

### Problema Atual
Cada dashboard tem "estilo próprio": escalas de fonte inconsistentes, cards com border-radius diferentes, badges com paletas ad-hoc, Kanbans com layout fragmentado. Isso faz o sistema parecer uma colcha de retalhos.

### Objetivo
Criar um **Design System vivo e auditável** (`/agency/:slug/design-system`) que serve como single source of truth para:
- Paleta de cores (brand + sistema)
- Tipografia (escala modular)
- Espaçamentos
- Componentes (cards, badges, botões, kanbans, tabelas, KPIs)

### Especificações Técnicas

#### 1.1 Tokens de Design (CSS Custom Properties)
Criar/validar em `src/styles/tokens.css` (importado no `index.css`):

```css
/* Escalas */
--text-xs: 0.75rem;    --text-sm: 0.875rem;   --text-base: 1rem;
--text-lg: 1.125rem;   --text-xl: 1.25rem;    --text-2xl: 1.5rem;
--text-3xl: 1.875rem;  --text-4xl: 2.25rem;   --text-5xl: 3rem;

/* Espaçamentos */
--space-1: 0.25rem;    --space-2: 0.5rem;     --space-3: 0.75rem;
--space-4: 1rem;       --space-6: 1.5rem;     --space-8: 2rem;
--space-10: 2.5rem;    --space-12: 3rem;      --space-16: 4rem;

/* Radii */
--radius-sm: 0.375rem; --radius-md: 0.5rem;   --radius-lg: 0.75rem;
--radius-xl: 1rem;     --radius-2xl: 1.5rem;  --radius-full: 9999px;

/* Elevações (shadows) */
--shadow-xs: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px rgb(0 0 0 / 0.06);
--shadow-md: 0 4px 6px rgb(0 0 0 / 0.07), 0 2px 4px rgb(0 0 0 / 0.06);
--shadow-lg: 0 10px 15px rgb(0 0 0 / 0.1), 0 4px 6px rgb(0 0 0 / 0.05);
```

#### 1.2 Componentes Padronizados (criar/refatorar)
- **`<KpiCard>`** — Padrão ÚNICO para todos os KPIs do sistema. Props: `label`, `value`, `delta?`, `deltaLabel?`, `icon`, `color`, `loading`, `trend`. Suporta sparkline opcional via recharts. SEM implementações ad-hoc por dashboard.
- **`<KanbanColumn>`** — Layout unificado com header de coluna (título + badge de count + soma financeira opcional), cards arrastáveis via `@dnd-kit`, skeleton durante loading.
- **`<KanbanCard>`** — Card padrão para qualquer Kanban do sistema. Props: `id`, `title`, `tags?`, `assignee?`, `dueDate?`, `value?`, `priority?`, `onClick`.
- **`<DataTable>`** — Já existe; auditar e padronizar uso (garantir que NENHUM dashboard usa tabela HTML custom).
- **`<PageHeader>`** — Já existe; garantir uso em 100% das páginas.
- **`<FilterBar>`** — Barra de filtros padronizada com: busca, filtro de tags (multi-select com badge de count dinâmico), filtro de status, filtro de período. **O badge ao lado de cada tag deve mostrar quantos itens possuem essa tag**.
- **`<StatusBadge>`** — Já existe; auditar variantes e eliminar duplicatas.
- **`<EmptyState>`** — Componente único para todos os estados vazios. Props: `icon`, `title`, `description`, `action?`.
- **`<SectionHeader>`** — Para separar seções dentro de uma página. Props: `title`, `description?`, `actions?`.

#### 1.3 KPIs Operacionais Corretos por Setor

**Dashboard Principal** (`/agency/:slug`):
- Receita Bruta do Mês (vs mês anterior, variação %)
- Tickets Ativos (grupos com status = `confirmed` ou `boarding`)
- Taxa de Conversão de Propostas (aprovadas / total enviadas no período)
- Clientes Ativos (contatos com ao menos 1 viagem confirmada nos últimos 12 meses)
- NPS/Avaliação Média (se módulo de reviews ativo)

**CRM Dashboard** (`/agency/:slug/crm`):
- Leads Novos (período selecionado)
- Propostas Enviadas (período)
- Propostas Aprovadas / Taxa de Conversão
- Valor em Pipeline (soma de `total` de proposals com status `sent` ou `viewed`)
- Tempo Médio de Decisão (dias entre `created_at` e `decided_at`)

**Grupos de Viagem** (`/agency/:slug/group-tours`):
- Grupos Ativos (status `confirmed` + `boarding`)
- Vagas Disponíveis vs Ocupadas (soma `capacity` vs `pax_count` de grupos ativos)
- Receita de Grupos (período)
- Grupos por Destino (top 5 destinos)

**Financeiro** (`/agency/:slug/financial`):
- Receita Bruta, Despesas, Resultado Líquido (período, com gráfico de tendência)
- Contas a Receber (vencidas vs a vencer)
- Contas a Pagar (vencidas vs a vencer)

#### 1.4 FilterBar com Count de Tags Dinâmico
O filtro de tags em qualquer listagem deve:
1. Carregar as tags disponíveis para o agency_id (de `agency_tags`)
2. Para cada tag, fazer `count` de itens que a possuem **com os filtros de busca/status atuais aplicados**
3. Mostrar o count como badge ao lado da tag: `[Praia] 12`
4. Ao selecionar uma tag, o badge deve atualizar em tempo real sem recarregar a página
5. Implementar com `useMemo` para evitar recálculo desnecessário

```typescript
// Padrão de hook para FilterBar com tags
function useTagFilter(items: any[], tagField: string = "tags") {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const tags = item[tagField] || [];
      tags.forEach((tag: string) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [items, tagField]);
  
  const filteredItems = useMemo(() => {
    if (selectedTags.length === 0) return items;
    return items.filter(item => 
      selectedTags.every(tag => (item[tagField] || []).includes(tag))
    );
  }, [items, selectedTags, tagField]);
  
  return { selectedTags, setSelectedTags, tagCounts, filteredItems };
}
```

#### 1.5 Padronização dos Kanbans
Todos os Kanbans do sistema (CRM, Daily Tasks, Suporte, etc.) devem:
- Usar o mesmo `<KanbanBoard>` wrapper com DnD configurado
- Ter colunas configuráveis via array de config (não hardcoded)
- Mostrar: nome da coluna, badge com count de cards, soma financeira (se aplicável)
- Cards arrastáveis com animação fluida (DnD Kit)
- Persistir mudança de coluna imediatamente no banco (optimistic update)
- Skeleton loading durante fetch inicial

---

## 🛍️ MÓDULO 2 — LOJA (VITRINE PÚBLICA)

### Objetivo
Criar uma vitrine pública de pacotes e roteiros disponíveis para compra/cotação, alimentada pelos dados reais do sistema.

### Regra de Negócio
- Qualquer `group_tour` com `is_public = true` (já existente no schema) aparece na loja
- Qualquer `proposal` (template de roteiro) marcado com `visible_in_store = true` aparece na loja
- A loja é acessível em `/p/:agency_slug/loja` (URL pública, sem autenticação)
- Cada card da loja é um produto com: foto, título, destino, preço desde, duração, vagas disponíveis
- Ao clicar, abre página de detalhe do produto
- Na página de detalhe, botão "Solicitar Cotação" que: (a) cria um `lead` no CRM da agência, (b) envia email de notificação para a agência, (c) redireciona para WhatsApp da agência com mensagem pré-preenchida

### Especificações Técnicas

#### 2.1 Migração de Banco de Dados
```sql
-- Verificar se visible_in_store já existe; se não, adicionar
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS visible_in_store boolean DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS store_price numeric(12,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS store_cover_url text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS store_duration_days integer;

-- group_tours já tem is_public (verificar)
-- Adicionar coluna store_price se não existir
ALTER TABLE group_tours ADD COLUMN IF NOT EXISTS store_price numeric(12,2);

-- RLS: anon pode ler itens públicos
CREATE POLICY "public_store_items" ON proposals
  FOR SELECT USING (visible_in_store = true AND status != 'draft');

-- View desnormalizada para a loja (une proposals + group_tours)
CREATE OR REPLACE VIEW public_store_items AS
  SELECT 
    'proposal' as source_type,
    p.id,
    p.agency_id,
    p.title,
    p.destination,
    p.store_cover_url as cover_url,
    p.store_price as price_from,
    p.currency,
    p.store_duration_days as duration_days,
    null::integer as available_spots,
    p.created_at,
    p.updated_at
  FROM proposals p
  WHERE p.visible_in_store = true AND p.status != 'draft'
  UNION ALL
  SELECT
    'group_tour' as source_type,
    gt.id,
    gt.agency_id,
    gt.name as title,
    gt.destination,
    gt.cover_image_url as cover_url,
    COALESCE(gt.store_price, gt.price_per_person) as price_from,
    gt.currency,
    (gt.end_date - gt.start_date) as duration_days,
    (gt.capacity - gt.confirmed_pax) as available_spots,
    gt.created_at,
    gt.updated_at
  FROM group_tours gt
  WHERE gt.is_public = true AND gt.status IN ('open', 'confirmed');

-- RLS na view
ALTER VIEW public_store_items OWNER TO postgres;
```

#### 2.2 Componentes e Rotas
- **`/p/:agency_slug/loja`** — Grid de produtos com filtros (destino, tipo, faixa de preço, duração)
- **`/p/:agency_slug/loja/:productId`** — Detalhe do produto (carrossel de fotos, itinerário, inclui/não inclui, datas disponíveis para grupos, CTA)
- **`<StoreCard>`** — Card de produto padronizado com glassmorphism + hover animation premium
- **`<StoreCTA>`** — Botão de ação (Solicitar Cotação) que dispara criação de lead + notificação
- **`usePublicStore(agencySlug)`** — Hook que consome `public_store_items` com filtros e paginação

#### 2.3 Painel de Gestão da Loja (no Admin)
Rota: `/agency/:slug/store-manager`

- Lista todos os produtos visíveis na loja
- Toggle rápido de ativar/desativar visibilidade na loja
- Edição de preço de loja (pode ser diferente do preço interno)
- Preview de como ficará na vitrine pública
- Métricas: visualizações, cliques em CTA, leads gerados pela loja

---

## 🔗 MÓDULO 3 — BUILDERS UNIFICADOS

### Problema Atual
Existem múltiplos "builders" fragmentados no sistema:
1. **Bio Builder** — Link-in-bio para redes sociais
2. **Public Portal Builder** — Editor de páginas do portal público (`portal_pages`)
3. **Client App Builder** — Configurador do PWA do cliente
4. **Landing Page Builder** — Páginas de captação

### Objetivo
Unificar todos os builders sob uma arquitetura única: **o mesmo engine de blocos renderiza em todos os contextos**. Eliminar fragmentação e duplicação de código.

### Especificações Técnicas

#### 3.1 Arquitetura de Blocos Universal
```typescript
// Tipos universais de bloco (já parcialmente existente em BlockRenderer)
type BlockType = 
  | "hero" | "text" | "image" | "gallery" | "video"
  | "cta" | "contact-form" | "faq" | "testimonials"
  | "store-grid" | "blog-feed" | "map" | "social-links"
  | "countdown" | "pricing-table" | "team" | "stats";

// Context de renderização
type RenderContext = "public_portal" | "bio_link" | "client_portal" | "landing_page" | "email";

interface PortalBlock {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
  renderContexts: RenderContext[]; // em quais contextos esse bloco é visível
  styles?: Record<string, string>;
  linkedDataSource?: {
    type: "group_tours" | "proposals" | "blog_posts";
    filter?: Record<string, unknown>;
    limit?: number;
  };
}
```

#### 3.2 Bloco `store-grid` — Integração com a Loja
O bloco `store-grid` é um bloco especial que busca produtos da loja em tempo real:
- Parâmetros configuráveis: `sourceType` (group_tours | proposals | ambos), `limit`, `filter.destination`, `filter.priceMax`, `sort`
- **Atualização bilateral**: quando um `group_tour` muda de `is_public`, a página do portal que tem um bloco `store-grid` atualiza automaticamente via Supabase Realtime
- SEM mock: os dados vêm sempre de `public_store_items` view

#### 3.3 Formulário de Contato → CRM Pipeline
Todo bloco `contact-form` deve:
1. Ao submeter, criar um registro em `leads` com `source = "portal_contact_form"` e o `page_id` e `agency_id` corretos
2. Criar uma `crm_interaction` com `type = "form_submission"` e o conteúdo do formulário como `notes`
3. Disparar Edge Function `notify-agency` para enviar email para a agência
4. Mostrar confirmação com próximos passos (WhatsApp ou aguardar contato)

**PROIBIDO:** Formulários que apenas enviam email sem criar lead no CRM.

#### 3.4 Unificação de Rotas dos Builders
```
/agency/:slug/portal/pages           → Editor de páginas do portal público
/agency/:slug/portal/bio             → Builder do bio link
/agency/:slug/client-app-builder     → Configurador do app do cliente (já existe)
/agency/:slug/portal/landing-pages   → Landing pages de captação
```

Todos compartilham:
- O mesmo `<BlockEditor>` com sidebar de blocos
- O mesmo `<BlockRenderer>` para preview
- O mesmo sistema de versionamento de conteúdo (`portal_page_versions`)

#### 3.5 Versionamento de Conteúdo
Toda página editada deve salvar uma versão anterior em `portal_page_versions` antes de sobrescrever:
```sql
CREATE TABLE IF NOT EXISTS portal_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES portal_pages(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL,
  saved_at timestamptz DEFAULT now(),
  saved_by uuid REFERENCES auth.users(id),
  version_label text -- ex: "Versão salva às 14:32"
);

-- Manter apenas as últimas 20 versões por página
-- Implementar via trigger ou Edge Function
```

---

## 📊 MÓDULO 4 — MARKETING & META PIXEL

### Objetivo
Implementar infraestrutura de rastreamento de conversões para Meta Ads (Facebook/Instagram) sem hardcodar pixel IDs, permitindo que cada agência configure seu próprio pixel.

### Especificações Técnicas

#### 4.1 Configuração por Agência
Adicionar em `agency_integrations` ou `agencies`:
```sql
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS meta_pixel_id text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS meta_access_token text; -- para CAPI (server-side)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS ga4_measurement_id text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS gtm_container_id text;
```

#### 4.2 Hook de Analytics Contextual
```typescript
// src/hooks/useAnalytics.ts
function useAnalytics() {
  const { agency } = useAgencyContext();
  
  const track = useCallback((event: AnalyticsEvent) => {
    // Meta Pixel (client-side)
    if (agency?.meta_pixel_id && window.fbq) {
      window.fbq("track", event.name, event.data);
    }
    // GA4
    if (agency?.ga4_measurement_id && window.gtag) {
      window.gtag("event", event.name, event.data);
    }
    // Edge Function CAPI (server-side — não bloqueável por ad blockers)
    if (agency?.meta_pixel_id && agency?.meta_access_token) {
      fetch("/api/track-event", {
        method: "POST",
        body: JSON.stringify({ agencyId: agency.id, event }),
      });
    }
  }, [agency]);
  
  return { track };
}
```

#### 4.3 Eventos Padrão a Rastrear
- `ViewContent` — ao abrir detalhe de produto na loja
- `InitiateCheckout` — ao clicar "Solicitar Cotação"
- `Lead` — ao criar lead via formulário de contato
- `ViewProposal` — ao cliente abrir uma proposta no portal

#### 4.4 Edge Function `track-event` (CAPI)
Criar Edge Function que envia eventos para a Meta Conversions API sem expor tokens no frontend:
```typescript
// supabase/functions/track-event/index.ts
// Recebe: { agencyId, event: { name, data, clientUserAgent, clientIpAddress } }
// Busca meta_access_token e meta_pixel_id da agência (service_role — nunca exposto no client)
// Envia para https://graph.facebook.com/v19.0/{pixel_id}/events
```

---

## 🔒 CHECKLIST DE SEGURANÇA (executar antes do deploy)

```sql
-- 1. Verificar tabelas sem RLS
SELECT schemaname, tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- 2. Verificar policies abertas demais
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND qual = 'true';

-- 3. Verificar que portal_page_versions tem RLS
-- 4. Verificar que public_store_items não expõe dados de outras agências
-- 5. Verificar que track-event não vaza tokens entre agências
```

---

## ✅ CRITÉRIOS DE CONCLUSÃO (Definition of Done)

### Design System
- [ ] `<KpiCard>` substitui TODOS os KPIs do sistema (zero implementações inline)
- [ ] `<KanbanBoard>` + `<KanbanColumn>` + `<KanbanCard>` unificam TODOS os kanbans
- [ ] `<FilterBar>` com tags dinâmicas funciona em: CRM, Group Tours, Propostas, Daily Tasks
- [ ] Paleta de tokens documentada e funcionando em todas as páginas
- [ ] Rota `/agency/:slug/design-system` mostra todos os componentes e tokens

### Loja
- [ ] `/p/:agency_slug/loja` carrega dados reais de `public_store_items`
- [ ] Bloco `store-grid` no portal builder usa a mesma fonte de dados
- [ ] CTA "Solicitar Cotação" cria lead no CRM + notificação
- [ ] Painel de gestão da loja no admin com toggle de visibilidade
- [ ] Atualização bilateral via Realtime quando `is_public` muda

### Builders
- [ ] Bloco `contact-form` cria lead + interaction no CRM (não só envia email)
- [ ] Versionamento de páginas funcionando (últimas 20 versões preservadas)
- [ ] Bloco `store-grid` configurável no editor de blocos

### Marketing
- [ ] Pixel Meta configurável por agência em `agencies.meta_pixel_id`
- [ ] `useAnalytics` hook rastreia `Lead`, `ViewContent`, `InitiateCheckout`
- [ ] Edge Function CAPI sem expor tokens no frontend

### Qualidade
- [ ] `npm run typecheck` — zero erros
- [ ] `npm run build` — sucesso sem warnings críticos
- [ ] Security sweep — zero tabelas sem RLS
- [ ] Match Report — todos os contratos sincronizados

---

## 📁 ARQUIVOS CHAVE A AUDITAR (Blast Radius)

Antes de iniciar qualquer módulo, executar blast radius analysis nos seguintes arquivos:

```
src/components/proposals/templates/index.ts      # Templates de proposta
src/components/portal/BlockRenderer.tsx          # Engine de renderização de blocos  
src/routes/agency.$slug.portal.pages.*.tsx       # Builder de páginas
src/routes/agency.$slug.group-tours.*.tsx        # Group tours (loja)
src/routes/agency.$slug.crm*.tsx                # CRM (geração de leads)
src/routes/p.$agency_slug.*.tsx                  # Portal público
src/routes/client.*.tsx                          # Portal do cliente
src/services/client-area.ts                      # Serviços do portal
src/components/client-portal/ClientStoreWidget   # Widget de loja atual
supabase/functions/                              # Edge Functions
supabase/migrations/                             # Schema do banco
```

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Blast Radius Analysis** completo nos arquivos chave
2. **Design Tokens** — criar/consolidar `tokens.css`
3. **KpiCard + FilterBar** — componentes mais reutilizados
4. **KanbanBoard unificado** — substituir todas as implementações fragmentadas
5. **Migração Loja** — `visible_in_store` + view + RLS
6. **Vitrine Pública** — rotas + componentes
7. **Bloco `store-grid`** no BlockRenderer
8. **Bloco `contact-form` → CRM** (corrigir pipeline)
9. **Versionamento de páginas**
10. **Meta Pixel infrastructure**
11. **typecheck + build + security sweep**
12. **Deploy completo**

---

*Gerado em: 2026-07-05 · Contexto: TravelOS Design System Refactor v2*
