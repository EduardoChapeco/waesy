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
| **F22** | CI Bloqueante Unificado (5 Gates) | Planejado | Próximo | `.github/workflows/ci.yml` |
| **F23** | Auditoria de Segurança Final e RLS Abrangente | Planejado | Próximo | `security-guard` audit |
| **F24** | Selo Final de Conclusão do Plano Mestre | Planejado | Próximo | Certificação e Release 2.0 |

---

## 3. Portões de Qualidade e Governança

1. **Vitest Unit & Integration:** 100% dos testes verdes.
2. **Design Lint Ratchet:** Teto congelado em 37.702 violações, zero regressões visuais permitidas.
3. **TypeScript Typecheck:** 0 erros em modo estrito (`tsc --noEmit`).
4. **Cloudflare Pages Production Build:** Single-file `dist/_worker.js` otimizado e ativo.
5. **Zero Mocks (M01):** Proibição total de dados sintéticos ou simulados no código.
