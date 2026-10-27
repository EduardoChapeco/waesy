# 🔥 FORGE AUDITORIA TOTAL — RELATÓRIO DEFINITIVO
**Data:** 2026-04-09  
**Análise:** Nível 1 (Estática completa) — leitura de todos os arquivos, sem execução em produção  
**Conclusão geral:** A plataforma Simwork tem uma arquitetura de duas camadas conflitantes. **O frontend é parcialmente funcional, o backend de edge functions existe mas não foi deployado, e existem bugs críticos de contrato tabela↔código.**

---

## 🔍 O QUE ENCONTREI — INVENTÁRIO REAL

### Páginas que EXISTEM como arquivo:
- 39 páginas + admin/ (total ~40)
- BioLink: 6 sub-páginas (Builder, Temas, CRM, Analytics, Config, Versões)
- Video Studio: 4 páginas (Lista, Editor, Gerar, Motion)
- Blog Manager, News Manager, Site Builder, Site Editor, CRM, Travel, Squads, SimLab, etc.

### Edge Functions que EXISTEM como diretório:
- 71 funções! Isso é muito. **NÃO CONFIRMEI DEPLOY DE NENHUMA DELAS.**
- biolink-capture, biolink-publish, biolink-track, blog-generate, simlab-dispatch, simlab-engine, video-upload-handler, etc.

### Migrations: 55 arquivos SQL
- ~12 schemas distintos criados, com muitas sobreposições e renomeações.

---

## ❌ BUGS CRÍTICOS ENCONTRADOS

### ❌ BUG CRÍTICO #1 — ESQUIZOFRENIA DE SCHEMA (O mais grave)
**Arquivo:** `src/contexts/WorkspaceContext.tsx` linha 61 vs `supabase/migrations/20260403100000_sw_foundation.sql` linha 28

**Problema:** O sistema tem **DOIS schemas de workspace rodando em paralelo e em conflito**:
- **Schema antigo:** `workspaces`, `workspace_members`, `brand_kits`, `briefings` (tabelas sem prefixo `sw_`)
- **Schema novo:** `sw_workspaces`, `sw_workspace_members`, `sw_brand_kits`, `sw_briefings` (prefixo `sw_`)

**Evidência:**
```typescript
// WorkspaceContext.tsx linha 61 — usa schema ANTIGO
supabase.from("workspaces").select(...)
supabase.from("workspace_members").select(...)
supabase.from("brand_kits").select(...)
supabase.from("briefings").select(...)

// OnboardingPage.tsx linha 139 — também usa schema ANTIGO
supabase.from('workspaces').insert(...)
supabase.from('workspace_members').insert(...)
supabase.from('briefings').insert(...)

// sw_foundation.sql linha 28 — cria schema NOVO
CREATE TABLE IF NOT EXISTS sw_workspaces ...
CREATE TABLE IF NOT EXISTS sw_briefings ...
CREATE TABLE IF NOT EXISTS sw_brand_kits ...
```

**Impacto:** O `WorkspaceContext` carrega os dados do schema antigo. As mutations do `sw-brand-generate` e `sw-briefing-generate` (refatoradas para usar `runJsonTask`) podem estar salvando no schema errado. **Qualquer dado salvo no schema `sw_*` NÃO aparece na UI que lê do schema `workspaces`.**

**Correção necessária:** Auditoria completa de qual schema está em produção no Supabase e alinhamento de 100% do código para um único schema. NÃO POSSO determinar qual é o canônico em produção sem acesso ao painel Supabase.

---

### ❌ BUG CRÍTICO #2 — sw_leads REFERENCIA TABELA INEXISTENTE
**Arquivo:** `supabase/migrations/20260403100002_sw_operations.sql` linha 7

**Problema:** `sw_leads` tem foreign key para `sw_workspaces(id)`, mas o frontend (`CRMPage`, `AnalyticsPage`, `BioLinkAnalyticsPage`) acessa `sw_leads` diretamente. Se a migration `sw_operations.sql` rodou mas `sw_workspaces` não existe (ou está vazia por RLS), a FK quebra silenciosamente e todas as queries retornam vazio.

**Evidência:**
```sql
-- sw_operations.sql linha 7
CREATE TABLE IF NOT EXISTS sw_leads (
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  ...
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','contatado','qualificado','convertido','arquivado')),
```

```typescript
// CRMPage.tsx linha 160 — usa sw_leads
supabase.from('sw_leads').select(...)
```

**ALERTA ADICIONAL:** O status enum de `sw_leads` é `('novo','contatado','qualificado','convertido','arquivado')` mas o TypeScript em `app.types.ts` define `LeadStatus` com valores diferentes — **o código de mutation falhará com violação de constraint em produção.**

---

### ❌ BUG CRÍTICO #3 — BlogManagerPage: NENHUM BLOG PUBLIC PORTAL
**Arquivo:** `src/pages/BlogManagerPage.tsx` (582 linhas) + `src/pages/BlogPublicPage.tsx`

**Problema:** O `BlogManagerPage` é apenas um **editor de texto markdown + IA**. Não existe:
- Portal público de blog com listagem de posts
- Paginação de artigos
- Categorias / tags navegáveis
- Sistema de comentários
- Imagens de capa editáveis visualmente (apenas campo de texto para URL)
- Preview do layout real do artigo publicado

A rota `/post/:slug` existe (em `App.tsx`) e serve `BlogPublicPage`, mas NÃO HÁ rota de listagem `/blog` público. O `BlogPublicPage` renderiza um único artigo por slug. Não há portal de blog como portal completo de publicação.

---

### ❌ BUG CRÍTICO #4 — NewsManagerPage: SEM PORTAL VISUAL PÚBLICO
**Arquivo:** `src/pages/NewsManagerPage.tsx`

**Problema:** Confirmado. O NewsManager é um **painel interno de gerenciamento de fontes RSS e fila de notícias**. Não existe:
- Portal público de notícias em `/noticias/:slug` ou similar
- Renderização pública de notícias
- Edição visual de conteúdo de notícias
- Galeria/grid visual de notícias

O código conecta a `rss_sources` e `news_items` (tabelas existem nas migrations). A busca RSS funciona parcialmente, mas o resultado é apenas texto extraído — não há geração de página publicável de notícia. **O usuário está correto: é uma fila de texto, não um portal.**

---

### ❌ BUG CRÍTICO #5 — SiteEditorPage: BLOCOS LIMITADOS, SEM BENTO GRID
**Arquivo:** `src/pages/SiteEditorPage.tsx` linha 88-103

**Problema:** O editor de sites tem **apenas 14 tipos de bloco**:
```typescript
const AVAILABLE_BLOCKS = [
  hero, features, benefits, testimonials, pricing,
  cta, contact_form, faq, gallery, video_embed,
  stats, team, newsletter, footer
]
```

**O que FALTA e foi pedido:**
- ❌ Bento Grid (grade estilo Apple/Vercel)
- ❌ Players de vídeo embutidos reais (não apenas embed de URL)
- ❌ Galeria de imagens real (com upload, não apenas URL)
- ❌ Seções animadas / motion avançadas
- ❌ Botões com estilos customizáveis
- ❌ Countdown / Timer
- ❌ Maps embed
- ❌ Carrossel de imagens
- ❌ Seções de portfolio
- ❌ Blog integration block

O editor existe e funciona para os 14 tipos disponíveis, mas **está longe do "editor avançado" prometido.**

---

### ❌ BUG CRÍTICO #6 — BioLink: STATUS_ENUM CONFLITO
**Arquivo:** `src/lib/crm/service.ts` linha 58 vs `supabase/migrations/20260403100002_sw_operations.sql` linha 13

**Evidência:**
```typescript
// service.ts — usa 'new'
status: lead.status || 'new',
```
```sql
-- sw_operations.sql — aceita apenas estes valores
status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','contatado','qualificado','convertido','arquivado'))
```

**Impacto:** Criar um lead via UI com status `'new'` vai violar a constraint do banco e o insert vai falhar com `ERROR: new row violates check constraint`. Lead nunca é criado. O CRM está completamente quebrado para criação.

---

### ❌ BUG CRÍTICO #7 — SimLab: Personas LÊEM tabelas não confirmadas
**Arquivo:** `src/pages/SimLabResearchPage.tsx` + `src/lib/simlab.ts`

**Problema:** O SimLab usa `dispatchSimlabValidation` → `invokeEdgeFunction('simlab-dispatch')`. A function existe como diretório. MAS:
- Não verificamos se foi deployada
- `simlab-engine` (a função que executa as personas) precisa de GROQ_API_KEY configurada
- As personas do banco (`simlab_seed_personas_core.sql`) existem como seed
- MAS: se RLS bloqueia a leitura das personas, o engine retorna vazio silenciosamente

**O SimLab pode parecer processar mas retornar pensamentos vazios.**

---

### ❌ BUG CRÍTICO #8 — Video Studio Editor: Sem timeline visual real
**Arquivo:** `src/pages/VideoStudioEditorPage.tsx`

**Problema:** O editor de vídeo existe em código e conecta às tabelas canônicas (`video_projects`, `video_assets`, `video_jobs`). PORÉM:
- **Não existe uma timeline visual** — apenas painéis de estatísticas (silence_cuts, viral_heatmap)
- O "editor" é basicamente: upload de arquivo + botões para disparar jobs de servidor
- Não é um editor visual de corte/montagem como prometido
- O video player mostra o original, não o editado

---

## ⚠️ BUGS MÉDIOS

### ⚠️ BUG MÉDIO #1 — BioLink Themes: Página quase vazia
**Arquivo:** `src/pages/BioLinkThemesPage.tsx` — apenas 57 linhas  
A página existe mas é extremamente básica. Não há preview real do tema aplicado ao biolink.

### ⚠️ BUG MÉDIO #2 — Duplicidade de tabelas de workspace
Existem SIMULTANEAMENTE:
- `workspaces` (schema antigo, usado pelo WorkspaceContext)
- `sw_workspaces` (schema novo)
- Os dados podem estar em tabelas diferentes dependendo de qual migration foi aplicada por último

### ⚠️ BUG MÉDIO #3 — CRM: Contatos/Mensagens/Bookings/Events = ZERO
Após a correção desta sessão, `listContacts`, `listMessages`, `listBookings`, `listEventRegistrations` retornam `[]` hardcoded. O CRM mostra zero dados nessas abas. **Isso é melhor que quebrar, mas ainda é funcionalidade faltante.**

### ⚠️ BUG MÉDIO #4 — Publications table: Não encontrada nas migrations
A busca por `CREATE TABLE.*publications` nas migrations retornou **zero resultados**. O `BioLink service` usa `supabase.from("publications")`, mas a tabela pode não existir com esse nome exato nas migrations padrão — pode estar em `20260403010000_biolink_v3_foundation.sql` ou `20260408113000_biolink_publication_versions_cutover.sql`. **Confirmar antes de garantir que BioLink funciona.**

---

## 📝 DÉBITOS TÉCNICOS

### 📝 DT #1 — 55 migrations acumuladas sem consolidação
O banco tem 55 arquivos de migration. Várias criam a mesma tabela com `CREATE TABLE IF NOT EXISTS` repetido. Isso é dívida técnica de manutenção.

### 📝 DT #2 — Edge Functions não deployadas confirmadamente
71 edge functions existem como código local. **Não há evidência de deploy confirmado.** Sem output do `supabase functions deploy`, não posso afirmar que nenhuma está ativa em produção.

### 📝 DT #3 — `sw_leads` status enum em conflito com TypeScript
O TypeScript define `LeadStatus` no `app.types.ts` mas os valores não batem com o CHECK constraint no banco.

### 📝 DT #4 — Blog sem WYSIWYG real
O blog usa apenas um `<Textarea>` para markdown. Não há editor rico (TipTap, Quill, etc.).

---

## ✅ O QUE FOI VERIFICADO E ESTÁ CORRETO (Análise Estática)

1. **WorkspaceContext** — lógica de loading/error/navigate está correta (faz-fast em falha)
2. **CRM Service** — legacy tables retornam `[]` sem quebrar (correção desta sessão)
3. **BioLink Service** — lógica de find-or-create com slug único está correta (correção desta sessão)
4. **BlogManager editor** — conecta à tabela `blog_articles` que existe nas migrations; salva/carrega artigos corretamente
5. **NewsManager** — conecta a `rss_sources` e `news_items` que existem nas migrations; erro handler está implementado
6. **SiteEditor** — conecta a `publications` (via `useWebsiteBuilder`); botão publicar existe e chama hook `publish()`
7. **Video Studio** — conecta a tabelas `video_projects`, `video_jobs`, `video_assets` via Supabase direto
8. **SimLab Research** — UI conectada ao hook `useSimlabRun`, que usa a edge function `simlab-dispatch`
9. **Edge function fail-fast** — `blog-generate`, `analyze-viral-patterns`, `orchestrate-post` → removidos fallbacks (sessão anterior)
10. **Multi-provider AI** — `sw-brand-generate`, `sw-briefing-generate` → usam `runJsonTask` com failover

---

## 🗺️ COMPARAÇÃO: PLANEJADO vs IMPLEMENTADO

| Módulo | Planejado | Implementado | Funcional? |
|--------|-----------|--------------|------------|
| BioLink Builder | Editor visual drag-drop completo | ✅ Existe com DnD | ⚠️ Parcial - blocos existem, persistência pode falhar por schema |
| BioLink Temas | Galeria de temas com preview | ⚠️ Página mínima | ❌ Sem preview real |
| BioLink CRM | Leads capturados do biolink | ✅ Existe | ⚠️ Status enum ≠ banco |
| BioLink Config | SEO, pixels, slug | ✅ Completo | ✅ Funciona (se publications existir) |
| Blog Manager | Editor + publicação + portal | ⚠️ Editor existe | ❌ Sem portal público |
| Blog Público | Portal listagem + artigo | ✅ Artigo singular | ❌ Sem listagem pública |
| News Portal | Portal visual de notícias | ❌ Só fila interna | ❌ Zero portal |
| News RSS | Buscar e processar RSS | ✅ Parcial | ⚠️ Texto bruto, não publicável |
| Site Builder | Editor avançado, Bento Grid | ⚠️ 14 tipos básicos | ❌ Sem Bento, sem avançado |
| Site Publicação | Publicar como URL pública | ✅ Botão existe | ⚠️ Depende de /s/:slug funcionar |
| Video Studio | Editor timeline visual | ❌ Painel de jobs | ❌ Sem timeline de corte |
| Video Geração IA | Gerar vídeo por prompt | ✅ Existe | ⚠️ Depende de API key |
| CRM Leads | Pipeline Kanban completo | ✅ Existe | ⚠️ Status enum quebrado |
| CRM Contatos/Eventos | Full CRM | ❌ Retorna [] | ❌ Não implementado |
| SimLab Personas | Personas pensam de verdade | ⚠️ Infra existe | ⚠️ Depende de deploy + API keys |
| SimLab Research | Simulação com IA | ✅ UI existe | ⚠️ Depende de deploy |
| Squads Agentes | Agentes reais com MCP | ⚠️ UI existe | ⚠️ Depende de deploy + API keys |
| Brand Kit | Kit completo com geração IA | ✅ Extenso | ⚠️ Schema antigo vs novo |
| Briefing | Briefing completo | ✅ Extenso | ⚠️ Schema antigo vs novo |

---

## 🚨 PRIORIDADES DE CORREÇÃO (Ordenadas por impacto)

### URGENTE — Resolver antes de qualquer nova feature:
1. **Confirmar qual schema está em produção** (acessar painel Supabase → Tables)
2. **Corrigir status enum de sw_leads** (`'novo'` vs `'new'`)
3. **Verificar se tabela `publications` existe** com esse nome exato
4. **Deploy confirmado das edge functions críticas** (simlab-dispatch, blog-generate, biolink-publish)

### APÓS URGENTE — Funcionalidades faltantes reais:
5. **Blog: criar portal público com listagem de artigos**
6. **News: criar portal visual público de notícias**
7. **Site Builder: adicionar Bento Grid e tipos de bloco avançados**
8. **Video Studio: adicionar timeline visual básica de corte**
9. **BioLink Temas: adicionar preview real do tema**

---

## 📋 O QUE PRECISO PARA CONFIRMAR O QUE NÃO CONSIGO VER

1. **Acesso ao Painel Supabase** → Table Editor → listar tabelas que EXISTEM em produção
2. **Output de `supabase functions list`** → confirmar quais functions estão deployadas
3. **Variáveis de ambiente configuradas** → GROQ_API_KEY, OPENROUTER_API_KEY no Supabase Dashboard
4. **Teste de criar um lead pela UI** → confirmar se o status enum quebra em produção
