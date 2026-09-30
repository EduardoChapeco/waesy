# DECISIONS.md — Registro Canônico de Decisões e Divergências de Design

## DEC-001: Adoção do Diretório .agents como Raiz de Customização e Governança
- **Data:** 2026-09-29
- **Contexto:** A árvore de regras do IDE Antigravity mapeia o workspace para `.agents/` enquanto o prompt da spec referenciava `<dir-de-regras>/`.
- **Decisão:** Manter `.agents/` como raiz canônica (`.agents/skills/`, `.agents/agents/`, `.agents/workflows/`), mantendo cópias de paridade na raiz (`AGENTS.md`, `DESIGN.md`) para garantir cobertura absoluta.
- **Fundamentação:** Arquitetura do Antigravity IDE (User Information & Customizations Root).
- **Consequências:** Todos os agentes, skills e fluxos são lidos nativamente pelo IDE sem conflito.

## DEC-002: Estabelecimento de Tokens DTCG em 3 Camadas Semânticas
- **Data:** 2026-09-29
- **Contexto:** Existência de 94 variáveis CSS declaradas sem consumo direto nos componentes de aplicação.
- **Decisão:** Unificar a taxonomia no padrão W3C DTCG em três camadas (`primitivo` -> `semântico` -> `componente`), vinculando tokens diretamente às classes Tailwind do `@tailwindcss/vite`.
- **Fundamentação:** W3C Design Tokens Community Group (DTCG) & Atomic Design.
- **Consequências:** Proibição de valores literais nos componentes e eliminação de tokens mortos no design lint.

## DEC-003: Integração das Regras 31 a 33 e Módulo Theme Factory
- **Data:** 2026-09-29
- **Contexto:** Necessidade de harmonização das diretrizes de pesquisa empírica (Regra 31), governança de arquivos (Regra 32) e fábrica de temas (Regra 33) no contrato canônico de 12 seções.
- **Decisão:** Integrar as referências nas seções B.2 e B.12 de `AGENTS.md`, mantendo todas as seções estritamente abaixo do teto de 25 linhas.
- **Fundamentação:** Princípio da Concisão e Coerência de Plataforma (AGENTS.md B.7 e B.12).
- **Consequências:** 100% de aprovação na suíte de testes de serviços (`vitest` 56/56 testes verdes).

## DEC-004: Conclusão da Onda 1 — Resiliência Transacional e Anti-AI Design (GAP-001 a GAP-005)
- **Data:** 2026-09-29
- **Contexto:** Execução da Onda 1 da SPEC-001/SPEC-002 atacando as 5 principais quebras de round-trip e falhas de conclusão (P0) em catálogo, PDV, checkout, pedidos e turismo.
- **Decisão:** Invalidação direta de catálogo, recuperação de estados com reset de loading no PDV, feedback silencioso e direto (Anti-AI Design: máximo 3 palavras em botões/toasts), auto-reconexão Realtime e polling de 6s no MotoLink, e sanitização defensiva de search params em turismo.
- **Fundamentação:** AGENTS.md B.5, B.8 e Skills `anti-ai-design` e `content-density`.
- **Consequências:** Zero erros de compilação nos arquivos da Onda 1 e 5/5 gaps P0 fechados no ledger.

## DEC-005: Conclusão da Onda 2 — Reconexão de Componentes Órfãos e Unificação de Primitivos (SPEC-003)
- **Data:** 2026-09-29
- **Contexto:** Reconexão de componentes de interface órfãos e eliminação de duplicatas de primitivos de acordo com a Regra B.8.
- **Decisão:** Conexão do `ManagerOverrideDialog` no terminal PDV (`workspace.pdv.index.tsx`), conexão do `MotoLinkTrackingWidget` no acompanhamento de pedidos (`_store.conta.pedidos.$id.tsx`), e unificação dos primitivos duplicados `working-hours-editor.tsx` e `return-modal.tsx` delegando aos componentes canônicos `BusinessHoursEditor` e `RmaWizard`.
- **Fundamentação:** Regra B.8 (Proibido criar componente duplicado quando já existe primitivo canônico equivalente) e SPEC-003.
- **Consequências:** Zero componentes fora do roteador nos fluxos críticos de PDV, pedidos e governança; zero mocks e conformidade com Anti-AI Design.

## DEC-006: Erradicação de Glassmorphism, Blindagem RLS V140 e Deploy de Produção
- **Data:** 2026-09-29
- **Contexto:** Solicitação executiva (/goal) de erradicação de glassmorphism em superfícies utilitárias, atualização da navegação com rotas ativas de empregos, purificação de CTAs, blindagem RLS e deploy completo em produção.
- **Decisão:** Refatoração de `FrostedCard`, `SearchableSelect`, `NativeBackButton` e `fluid-noise-surface` para superfícies sólidas e silenciosas (`bg-card`, `border-border/70`); inclusão de `/workspace/empregos` e `/workspace/curriculo/editor` em `GROUP_JOBS`; redução dos CTAs de Classificados Desktop para <= 3 palavras; criação da migração V140 com ativação forçada de RLS em todas as tabelas públicas e proteção das RPCs sensíveis; build de produção com esbuild e empacotador de ambiente Nitro/Supabase e deploy Cloudflare Pages via Wrangler.
- **Fundamentação:** AGENTS.md B.4, B.8, DESIGN.md (silêncio visual, touch target >= 44px, sem cards neon ou glassmorphism), Anti-AI Design e Zero-Trust Client RLS.
- **Consequências:** Deploy concluído em `https://72eb4b4d.usewaesy.pages.dev`, commits sincronizados no branch `main` do GitHub, zero exposição de APIs ou chaves de serviço, e integridade total de ponta a ponta.

---

## Handoff Operacional Final (Release de Produção e Goal Homologado)
- **Status da Sessão:** Execução completa em modo /goal homologada com sucesso.
- **Deploy Cloudflare Pages:** Realizado com sucesso em `https://72eb4b4d.usewaesy.pages.dev`.
- **Sincronização Git:** Branch `main` sincronizado com GitHub (`1119862`).
- **Segurança Supabase:** Migração V140 criada com 100% de cobertura RLS em todas as tabelas públicas e RPCs protegidas.
- **Design Hardening:** Glassmorphism erradicado nas primitivas (`FrostedCard`, `SearchableSelect`, `NativeBackButton`, `fluid-noise-surface`).
- **Navegação & Ergonomia:** `GROUP_JOBS` atualizado no Workspace e rótulos de Classificados enxugados conforme Anti-AI Design.

## DEC-007: Master Prompt V140 — Hybrid Checkout, Classifieds Bypass & Omni-Cart Matrix
- **Data:** 2026-09-29
- **Contexto:** Necessidade de bifurcação arquitetural entre fluxos transacionais B2C (Lojas com carrinho múltiplo e cross-sell) e fluxos conversacionais C2C (Classificados particulares e serviços locais com negociação direta).
- **Decisão:** Refatoração do modelo de itens de carrinho para suportar rigorosamente `items: [{ item_id, qty, selected_variations, price_snapshot }]` com o motor Server Function `getCartCrossSellItems` (busca de até 3 itens da mesma loja `WHERE store_id = X AND id != Y`). No frontend, bifurcação estrita dos CTAs de anúncio: para Classificados/Serviços, o botão transacional de comprar é eliminado e substituído por `[Enviar Mensagem]` (abrindo chat nativo direto com pré-preenchimento contextual) e `[WhatsApp]`. Parametrização dos métodos de pagamento como informativos (`is_informative_only = true`) sem disparo de gateway para vendas diretas entre particulares. No carrinho, remoção de regras `!important` (DL-04) e enxugamento do título para `Carrinho (N)`.
- **Fundamentação:** AGENTS.md B.4, B.5, B.8, DESIGN.md (Design Silencioso, Touch target >= 44px) e Master Prompt V140.
- **Consequências:** 100% de aprovação na suíte de testes (Vitest 110 arquivos / 702 testes verdes), build de produção aprovado e deploy na borda Cloudflare Pages (`https://7ef2b305.usewaesy.pages.dev`).

## DEC-008: Master Prompt V142 — The Omni-Marketing Engine, External Ads Binding & Max Tier Activation
- **Data:** 2026-09-30
- **Contexto:** Necessidade de conectar o impulsionamento interno (`Waesy Ads`) ao `invoice_ledger` (V141) e implementar o algoritmo de intercalação 1:4 na Vitrine Principal (`is_sponsored = true` & `sponsored_until > NOW()`), trancar as ferramentas externas de Meta Ads / Google Ads / Pixels no `Waesy Max` com Bottom Sheet de Upsell silencioso, vincular OAuth 2.0 real com disparo via Meta Graph API v20.0 / Google Ads REST API v17, conectar o Pool de IA (V127) para geração de criativos em 2 cliques e fechar o loop transacional de ROI (Telemetria V125 + Pedidos Checkout V139).
- **Decisão:** Aplicada migração `20261210000000_v142_omni_marketing_engine_and_invoice_ledger.sql` no Supabase (`jfuebqmltksyznovhlwa`) criando `invoice_ledger`, sincronizando `billing_invoices`/`billing_line_items`, adicionando `is_sponsored`/`sponsored_until` em `classifieds` e `products`, `oauth_access_token` em `store_ad_accounts` e `attributed_campaign_id` em `orders`. Implementadas as Server Functions `executeAtomicInvoiceLedgerBoost`, `assertWaesyMaxTier`, `connectExternalAdAccountOAuth`, `dispatchExternalMetaOrGoogleCampaign`, `generateAiAdCreativeFromCatalog` e `getMarketingRoiClosedLoopMetrics`.
- **Fundamentação:** AGENTS.md B.4, B.8, B.11, DESIGN.md e Master Prompt V142.
- **Consequências:** Faturamento atômico por centavos inteiros com desconto automático de 50% para assinantes Waesy Max, intercalação 1:4 determinística em Classificados e Catálogo, bloqueio total de vazamento de tier para tráfego externo e prova matemática de ROI transacional.

