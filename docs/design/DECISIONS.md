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
