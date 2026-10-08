# ROADMAP VIVO — Plataforma Waesy (v2.0)

## 1. Visão Geral e Arquitetura Canônica dos 4 Pilares

O Waesy é um ecossistema operacional integrado de comércio, serviços e gestão local para cidades e comunidades.
A arquitetura do produto é dividida em 4 pilares semânticos soberanos:

| Pilar | Rota Canônica | Público-Alvo | Papel Semântico | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Places** | `/places` e `/diretorio` | Cidadão / Turista | Guia oficial geodésico de estabelecimentos físicos, horários e reputação | **Produção** (200 OK) |
| **Classificados** | `/classificados` | Pessoa Física | Anúncios avulsos C2C de desapego com ciclo de 30 dias (proibido loja formal) | **Produção** (200 OK) |
| **Marketplace** | `/marketplace` | Consumidor B2C | Vitrine rica transacional com carrinho, frete e checkout garantido | **Produção** (200 OK) |
| **Workspace Pro** | `/workspace` | Operador / Lojista | SaaS e ERP operacional: pedidos, catálogo, finanças, CRM e suporte técnico | **Produção** (200 OK) |

---

## 2. Matriz de Fases do Plano Mestre de Estabilização (F01–F24)

| Fase | Título | Commit | Status | Artefatos Principais |
| :--- | :--- | :--- | :--- | :--- |
| **F01** | Vitrine do Marketplace com 6 Nichos | `2394c2e0` | Homologado | `_store.marketplace.index.tsx` |
| **F02** | Blindagem dos Classificados | `3a72c43c` | Homologado | `classifieds.functions.ts` |
| **F03** | Rota Places e Desambiguação | `67773fe7` | Homologado | `_store.places.index.tsx`, `_store.diretorio.tsx` |
| **F04** | Ponte Canônica de Upgrade Classificados->Workspace | `fc1b5fa4` | Homologado | `listing-promotion.functions.ts` |
| **F05** | Modal de Importação de Classificados | `f50240ac` | Homologado | `classified-import-modal.tsx` |
| **F06** | Suíte E2E de Isolamento dos 4 Pilares | `fa1c4504` | Homologado | `_store.pillar-isolation.test.ts` |
| **F07** | Vitrine Pública do Marketplace por Loja | `8d50feab` | Homologado | `_store.marketplace.$storeSlug.tsx` |
| **F08** | Checkout Transacional B2C do Marketplace | `33373c9a` | Homologado | `_store.marketplace.checkout.tsx` |
| **F09** | Places: Detalhe com Reputação e Geolocalização | `8174c661` | Homologado | `places-establishment-detail-view.tsx` |
| **F10** | Workspace: Dashboard KPI Real (Zero Mocks) | `966119f2` | Homologado | `workspace-dashboard.functions.ts` |
| **F11** | Workspace: Gestão de Pedidos Real | `942e8964` | Homologado | `workspace-orders.functions.ts` |
| **F12** | Workspace: Catálogo de Produtos Real | `7f799931` | Homologado | `workspace-catalog.functions.ts` |
| **F13** | Workspace: CRM de Clientes Real | `76253115` | Homologado | `crm.functions.ts` |
| **F14** | Motor de Busca Universal | `9188a2f3` | Homologado | `search.functions.ts`, `_store.busca.tsx` |
| **F15** | Geolocalização e Filtros de Cidade/Bairro | `6739ea8e` | Homologado | `geo-search.functions.ts` |
| **F16** | Notificações em Tempo Real (Supabase Realtime) | `e979401b` | Homologado | `notifications.functions.ts`, `notification-bell.tsx` |
| **F17** | Painel Financeiro Real (Receita, Despesas, Caixa) | `b89542c4` | Homologado | `financial.functions.ts`, `workspace.financeiro.index.tsx` |
| **F18** | Suporte Interno: Módulo de Tickets com SLA | `6c7486a1` | Homologado | `support-tickets.functions.ts`, `workspace.suporte.tsx` |
| **F19** | Roadmap Vivo e Changelog Automatizado | `f2b55f8a` | Homologado | `generate-changelog.mjs`, `ROADMAP_VIVO.md` |
| **F20** | Runbook de Operação e Dicionário de Domínio | `docs(F20)` | Homologado | `RUNBOOK.md`, `DICIONARIO_DOMINIO.md`, `CONTRIBUTING.md` |
| **F21** | Scanner de Órfãos e Dead Code no CI | `feat(F21)` | Homologado | `dead-code-detector.mjs`, `dead-code.report.json` |
| **F22** | CI Bloqueante Unificado (5 Gates) | `feat(F22)` | Homologado | `.github/workflows/ci.yml` |
| **F23** | Auditoria de Segurança Final e RLS Abrangente | `security(F23)` | Homologado | `AUDITORIA_SEGURANCA_F23.md`, 536 tabelas RLS |
| **F24** | Selo Final de Conclusão do Plano Mestre | `docs(F24)` | Homologado | `SELO_FINAL_F24.md`, Waesy v2.0 |
| **S25** | Waesy Studio: catálogo, provenance e motion seguro | PR #4 | Integrado à main | `docs/builder/SPEC-WAESY-STUDIO-LIBRARY.md`, `src/lib/builder/studio-catalog.ts` |
| **S26** | Omni AST no Experience Renderer + auditoria de publicação | PR #4 | Integrado à main | `src/lib/builder/omni-experience-adapter.ts`, `src/lib/builder/studio-template-audit.ts`, `npm run audit:studio-templates` |
| **S27** | Manifesto Zod, 3 pilotos por nicho e factory de templates com IA | PR de continuação | Implementado; validar CI/review | `src/lib/builder/studio-manifest.ts`, `src/lib/builder/studio-pilot-templates.ts`, `StudioTemplateFactory.tsx` |
| **S28** | Biblioteca privada de drafts por loja | PR de continuação | Implementado; depende de migration aplicada | `studio-template-library.functions.ts`, `20270114000000_studio_template_library.sql` |
| **S29** | Unsplash API oficial, picker, attribution e ledger de tracking | PR de continuação | Implementado; depende de secret, migrations e aprovação/API review | `unsplash.functions.ts`, `UnsplashAssetPicker.tsx`, `20270114010000_unsplash_studio_selection_ledger.sql` |

---

## 3. Portões de Qualidade e Governança

1. **Vitest Unit & Integration:** 100% dos testes verdes.
2. **Design Lint Ratchet:** Teto congelado em 37.702 violações, zero regressões visuais permitidas.
3. **TypeScript Typecheck:** 0 erros em modo estrito (`tsc --noEmit`).
4. **Cloudflare Pages Production Build:** Single-file `dist/_worker.js` otimizado e ativo.
5. **Zero Mocks (M01):** Proibição total de dados sintéticos ou simulados no código.
