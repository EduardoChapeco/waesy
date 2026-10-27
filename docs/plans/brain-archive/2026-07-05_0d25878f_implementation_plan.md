# Auditoria Geral TravelOS — Fase 8: Estabilização & Refinamento Profundo

> **Lido e Aplicado:** AGENTS.md + todas as regras em `.agents/rules/` (01 a 07).

---

## 🔭 Diagnóstico Geral (Blast-Radius Map)

Após varredura completa de 148 rotas, 12 componentes de portal, 3 builders e 240+ migrations, identificamos os **7 nós críticos de ruptura** abaixo:

---

### 🔴 CRÍTICO 1 — Brand Kit Desconectado
**O que é:** A tabela `brand_kit` existe e é editada em **dois módulos** (`/brand` e `/company`), mas as cores e fontes salvas **não chegam a nenhum lugar automaticamente**:
- **Portal Público (`p.$agency_slug.index.tsx`):** Usa `agency.brand_color` (coluna legada na tabela `agencies`), não o `brand_kit`. Se a agência atualizou as cores no Brand Kit, o portal público fica desatualizado.
- **Cotações/Propostas:** `ExportPdfButton.tsx` e templates como `TemplateDarkPremium` usam cores hardcoded ou tokens CSS globais, nunca lendo `brand_kit`.
- **Portal do Cliente (`client.index.tsx`):** Lê `theme_colors` de `client_portal_settings`, que também não sincroniza com `brand_kit`.
- **Blast-radius:** `brand_kit` → precisa propagar para `agencies.brand_color`, `portal_settings.theme_colors`, e CSS vars no runtime do portal público.

**Tabelas envolvidas:** `brand_kit`, `agencies`, `client_portal_settings`, `portal_settings`
**RLS:** `brand_kit` usa `agency_id`. ✅ OK.

---

### 🔴 CRÍTICO 2 — Preview de "Minha Empresa" Não Reflete o Builder
**O que é:** Em `agency.$slug.company.tsx`, a seção "Prévia do Portal" (linha 797) renderiza um mockup interno com logo e seções ativas — mas **nada disso vem do que foi construído no builder de páginas** (`/portal/pages/`). É uma previsualização morta, não conectada aos blocos CMS reais.
- **O que deveria ser:** Um `<iframe>` que renderiza o portal público real da agência (`/p/{slug}`), ou ao menos usa `BlockRenderer` com os blocos salvos da `home_page`.
- **Blast-radius:** Componente `company.tsx` (936 linhas) → não afeta outros módulos ao corrigir, risco = baixo.

---

### 🔴 CRÍTICO 3 — Portal do Cliente: Estrutura Duplicada
**O que é:** O Portal do Cliente existe em **dois lugares distintos**:
1. **`/client/*`** — App protegido com auth Supabase + magic link token.
2. **`client_portal_settings`** — Configurações de blocos, temas e layout definidas pelo builder (`/client-app-builder`).

O `client.index.tsx` até lê `client_portal_settings` (✅), mas o `ClientShell.tsx` é totalmente hardcoded (itens do menu fixos, logo "V" fixo, nome "Meu Painel" fixo). O que a agência configura no Builder não muda o shell.
- **O que precisa:** `ClientShell` deve carregar `client_portal_settings` + `brand_kit` para:
  - Exibir logo da agência no topo
  - Aplicar cor primária da agência no sidebar
  - Personalizar o título "Meu Painel" para o nome da agência
- **Magic link ainda funciona:** Sim — lógica de token está em `ClientShell.useEffect` e não precisa ser tocada.

---

### 🟡 IMPORTANTE 4 — Builder de Cotações: Qualidade do PDF Abaixo do Potencial
**O que é:** `ExportPdfButton.tsx` usa `html2canvas` com `scale: 2.5` + `jsPDF`. Funcional, mas:
- **Fonte não embedada:** Texto no PDF é rasterizado (imagem), não selecionável.
- **Scale 2.5 vs. 8K:** Para uma proposta comercial de alto padrão, o scale deveria ser `3.0` ou maior para qualidade premium.
- **Servidor não-utilizado:** Existe função `generateProposalPdfViaServer` importada mas o fallback server não está integrado ao botão principal de forma transparente.
- **Solução aplicável:** Elevar `scale` para `3.5`, adicionar `imageTimeout: 0`, usar `windowWidth: el.offsetWidth` para garantir corte exato, e oferecer "Export PNG (8K)" separado com `scale: 4.0` + `image/png`.

---

### 🟡 IMPORTANTE 5 — Portal Público: Fallback Legado Nunca Vai Embora
**O que é:** Em `p.$agency_slug.index.tsx`, existe um check:
```tsx
if (homePage?.blocks && Array.isArray(homePage.blocks) && homePage.blocks.length > 0) {
  // CMS mode
} else {
  // LEGACY FALLBACK: Layout editorial pré-montado
}
```
O fallback legado (linhas 144-692) renderiza um layout completamente diferente do CMS. Qualquer agência que não configurou a home page via builder cai nesse layout legado, que não lê `brand_kit` nem `portal_settings`.
- **Ação:** O fallback legado deve ser removido progressivamente — substituído por um template CMS padrão (`home_default`) que é gerado automaticamente na criação da agência.

---

### 🟡 IMPORTANTE 6 — Brand Kit → Proposta/Voucher/Contrato Desconectado
**O que é:** Os templates de proposta (`TemplateDarkPremium`, `TemplateVerticalPremium`, etc.) usam cores e fontes localmente definidas. O `brand_kit` com as cores oficiais da agência não é injetado dinamicamente.
- **O que falta:** Uma função `useBrandKit(agencyId)` hook centralizado que todos os templates de proposta, voucher e contrato importem para aplicar as cores da agência.

---

### 🟡 IMPORTANTE 7 — ClientShell: Items de Menu Fixos (Não Personalizáveis)
**O que é:** O `ClientShell.tsx` define um array `items` hardcoded na linha 23 com todas as rotas. O builder do App do Cliente permite ocultar blocos (`hidden: true`), mas isso nunca é aplicado ao menu lateral.
- **Ação:** `ClientShell` deve ler `client_portal_settings.home_blocks` e filtrar os itens do menu conforme os blocos habilitados.

---

## 📋 Plano de Implementação (Fase 8)

Dividido em ordem de impacto/dependência:

### Sub-Fase 8A — Brand Kit Propagation (Hub Central)
**Arquivos a modificar:**
- **[MODIFY] `agency.$slug.brand.tsx`** — Ao salvar brand kit, fazer `upsert` também nos campos `brand_color`, `brand_color_fg` da tabela `agencies` (sincronismo reverso).
- **[NEW] `src/hooks/use-brand-kit.ts`** — Hook centralizado `useBrandKit(agencyId)` que retorna cores/fontes resolvidas.
- **[MODIFY] `p.$agency_slug.tsx`** — Layout wrapper do portal público que injeta CSS vars via `<style>` tag com as cores do `brand_kit`.

### Sub-Fase 8B — Preview Real em "Minha Empresa"
**Arquivos a modificar:**
- **[MODIFY] `agency.$slug.company.tsx`** — Substituir o mockup estático pelo componente `<iframe>` apontando para `/p/{slug}` (lazy load) + toggle para embed live.

### Sub-Fase 8C — ClientShell Dinâmico
**Arquivos a modificar:**
- **[MODIFY] `src/components/shell/ClientShell.tsx`** — Carregar `client_portal_settings` + `brand_kit` no boot; aplicar logo/cores/nome da agência; filtrar menu por blocos habilitados.
- **[MODIFY] `src/routes/client.index.tsx`** — Unificar a query de `client_portal_settings` para não duplicar a busca (já está em ClientShell depois da modificação).

### Sub-Fase 8D — Export PDF Premium
**Arquivos a modificar:**
- **[MODIFY] `src/components/proposals/ExportPdfButton.tsx`** — Elevar scale para `3.5`, adicionar export PNG 8K (scale `4.0`), integrar server-side PDF como opção clara no dropdown.

### Sub-Fase 8E — Fallback Portal Legado → Template Default
**Arquivos a modificar:**
- **[MODIFY] `src/services/public.ts`** — Na função `fetchPublicAgencyHome`, se não há `homePage.blocks`, retornar um template padrão com blocos básicos gerados dinamicamente a partir de `company_profile` + `brand_kit`.
- **[MODIFY] `p.$agency_slug.index.tsx`** — Remover o bloco de fallback legado (linhas 144-692) e sempre renderizar via `BlockRenderer`.

---

## ⚠️ Perguntas Abertas (User Review)

> [!IMPORTANT]
> **1. Portal Público Fallback:** Posso substituir completamente o layout editorial legado por um template CMS padrão gerado dinamicamente, ou há agências usando o fallback que precisam de migração prévia?

> [!IMPORTANT]
> **2. Magic Link:** O fluxo de magic link do portal do cliente já funciona corretamente. Ao modificar o `ClientShell` para ser dinâmico, preciso garantir que o token seja processado ANTES de carregar as configurações da agência. Confirma que isso é aceitável?

> [!IMPORTANT]
> **3. Brand Kit → Agências Sync:** Ao salvar o Brand Kit, devo atualizar `agencies.brand_color` automaticamente para manter retrocompatibilidade com o fallback legado e qualquer lugar que lê essa coluna diretamente?

---

## 🚀 Sugestões Além do Pedido

1. **Template Builder Aprimorado (inspirado em Wix):** Adicionar um sistema de "Preset de Tema" no builder de páginas — o agente seleciona um tema (cores, fontes, espaçamento) derivado do Brand Kit, e todos os blocos são atualizados automaticamente. Isso é o equivalente ao "Wix Theme Manager" e resolve o problema de coerência visual sem forçar edição bloco a bloco.

2. **Proposta → PDF Vetorial via `@react-pdf/renderer`:** Para propostas simples (sem imagens full-bleed), uma versão alternativa usando `react-pdf` geraria PDFs com texto selecionável, links clicáveis e peso 10x menor. Ideal para cotações formais B2B.

3. **Vouchers como Wallet Pass (.pkpass):** Gerar Apple Wallet / Google Wallet passes para os vouchers de viagem. A tabela `client_wallet_passes` já existe — só falta a Edge Function de geração do `.pkpass`.

Aprove para executar em sequência!
