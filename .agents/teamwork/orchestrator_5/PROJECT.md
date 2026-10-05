# Project: Waesy Ecosystem Platform Engineering (Run 4 — Ondas 00 a 40)

## Architecture
- **Client & Routing**: TanStack Router (`src/routes/`) com 393 rotas físicas executáveis divididas em Vitrines Públicas (`_store.*`), Workspace Operacional (`workspace.*`), Admin Master (`admin-master.*`) e Portais Cívicos. 12 arquivos de teste infiltrados em `src/routes/` catalogados para realocação.
- **BFF (Server Functions)**: TanStack Start `createServerFn()` em 227 arquivos em `src/services/` (1.728 funções), com validação perimetral Zod, proteção de sessão SSR (`getServerIdentity`) e controle estrito de mutações.
- **Design System & Ergonomia**: Tokens semânticos em `docs/design/tokens.json` e `src/styles.css`, grade de 4px, alvos de toque >= 44px (`h-11`) no mobile, Bento Grid de 12 colunas no desktop, eliminação de "cabeçalhos-fantasma" no desktop via pareamento inpage, zero emojis literais (DL-23), conformidade estrita com `scripts/design-lint.mjs`.
- **Governança Zero-Trust Civil & KYC**: `ActionAuthGuardModal` em 100% das mutações anônimas preservando `returnUrl`, fluxo de verificação documental/facial em `/conta/verificacao` auditado em `admin-master.kyc.tsx`, com trava financeira/contratual para civis sem KYC aprovado.
- **Bilateralidade Transacional**: Sincronização simétrica de agendamentos (`createAppointment` com `customer_id` e `store_id`), pedidos e propostas entre Visão do Cliente (`_store.conta.agendamentos.tsx`) e Visão do Estabelecimento (`workspace.reservas.tsx`).
- **Economia kTokens**: Cota diária de 100.000 tokens para usuários civis autenticados com renovação a cada 24 horas, isenção absoluta (0 tokens) para leitura de notícias e buscas locais, e débito calibrado por ação avançada (25k CNPJ, 75k documentos, 250k composição de sites).
- **Super Omni-Builder**: Catálogo expandido de 24+ blocos modulares canônicos no `OmniPageRenderer` e `OmniEditor`, suporte a animações de scroll por `IntersectionObserver` respeitando `prefers-reduced-motion`, esquemas de cores por nicho e trava de vitrine para planos Pro/Max.
- **Motores Industriais de Mineração**: 8 verticais no `crawler-batch-engine.ts` (DataJud, CNPJ, PNCP, Places, Notícias, Imóveis, Leilões, Vagas), circuit breaker por domínio de 3 estados (`CrawlerCircuitBreaker`), deduplicação dual (SHA-256 + Jaccard 48h), fila assíncrona `crawl_queue`, e 100% de testes unitários passando.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Route Tree Cleansing & Test Relocation | Realocar 12 arquivos `*.test.ts` de `src/routes/` para suas respectivas suítes de teste para despoluir a árvore do TanStack Router | M1 | Survey 1 (Explorer 1) |
| 2 | Broken Navigation & Link Remediation | Corrigir rotas quebradas em `waesy-copilot-drawer.tsx` (`/mobility` -> `/mobilidade`, `/checkout/${cartId}` -> `/checkout`) e `fast-company-onboarding.tsx` (`/@slug` e `/empresa/id`) | M1 | Survey 1 (Explorer 1) |
| 3 | Fake Toasts & Dead Buttons Eradication | Conectar mutations reais aos 4 toasts simulados em `waesy-copilot-drawer.tsx` e sanear botões órfãos em `workspace.imoveis.manutencoes.tsx` e `_store.conta.creditos.tsx` | M1 | Survey 1 (Explorer 1) |
| 4 | 4-State Matrix Completeness (DL-11..13) | Implementar Skeleton loading em 159 rotas e Empty States em 51 rotas mapeadas na auditoria | M1 | Survey 1 (Explorer 1) |
| 5 | Desktop Inpage Header Pairing | Eliminar os 22 "cabeçalhos-fantasma" no desktop criando cabeçalhos inpage com `<h1>` e botão voltar quando `NativeMobileHeader` for ocultado por `md:hidden` | M2 | Survey 1 (Explorer 1) |
| 6 | Mobile Touch Target Remediation (DL-14) | Corrigir 2.558 controles táteis abaixo de 44x44px aplicando `h-11 min-h-11` ou `md:h-9` nos 117 arquivos identificados | M2 | Survey 1 (Explorer 1) |
| 7 | Bracket Classes & Hex Purge (DL-01, DL-02) | Substituir classes arbitrárias `-[...]` por utilitários de token e substituir cores hexadecimais literais por tokens semânticos | M2 | Survey 1 (Explorer 1) |
| 8 | Focus Ring & Emoji Sanitization (DL-15, DL-23) | Adicionar `focus-visible:ring-2 focus-visible:ring-primary` em controles interativos e expurgar 336 emojis literais da UI | M2 | Survey 1 (Explorer 1) |
| 9 | ActionAuthGuardModal Zero-Trust Expansion | Integrar modal de barreira contextual com `returnUrl` exato em todas as rotas públicas transacionais (`imoveis`, `produtos`, `servicos`, `agendar`, `doacoes`, `afiliados`) | M3 | Survey 1 & 2 (Explorer 1 & 2) |
| 10 | KYC Verification Flow & Admin Review | Auditar e consolidar fluxo `/conta/verificacao` e aprovação em `admin-master.kyc.tsx` | M3 | Survey 2 (Explorer 2) |
| 11 | Civil KYC Financial & Contract Guard | Bloquear transações financeiras e assinaturas de contratos digitais para usuários civis sem KYC aprovado, permitindo negociação livre em classificados | M3 | Survey 2 (Explorer 2) |
| 12 | Bilateral Appointment Synchronization | Persistir `customer_id` e `store_id` em `createAppointment` e sincronizar visualização entre `_store.conta.agendamentos.tsx` e `workspace.reservas.tsx` | M4 | Survey 2 (Explorer 2) |
| 13 | Order & Proposal Bilateral State Sync | Garantir simetria de estados entre comprador e vendedor para pedidos de produtos, encomendas e propostas de classificados | M4 | Survey 2 (Explorer 2) |
| 14 | 100k kTokens Daily Civil Quota & Reset | Implementar cota diária renovável de 100.000 tokens a cada 24 horas para usuários civis autenticados | M5 | Survey 2 (Explorer 2) |
| 15 | Local Search & News Token Exemption | Isentar com custo 0 tokens todas as consultas de estabelecimentos locais, catálogos e leitura de notícias | M5 | Survey 2 (Explorer 2) |
| 16 | Calibrated Advanced Actions Billing | Calibrar débitos de tokens: 25k por mineração de CNPJ, 75k por emissão de documentos e 250k por composição de sites | M5 | Survey 2 (Explorer 2) |
| 17 | 24+ Modular Blocks Expansion in Omni-Builder | Portar e integrar 16 novos blocos modulares canônicos para `OmniPageRenderer` e `OmniEditor`, elevando o catálogo de 8 para 24+ blocos | M6 | Survey 3 (Explorer 3) |
| 18 | Viewport Scroll Animations (IntersectionObserver) | Converter animações de scroll do `OmniPageRenderer` de CSS on-mount para ativação por entrada no viewport com `IntersectionObserver` e `prefers-reduced-motion` | M6 | Survey 3 (Explorer 3) |
| 19 | OmniEditor Pro/Max Plan Showcase Lock | Adicionar verificação de plano da loja no editor impedindo publicação de recursos exclusivos sem assinatura Pro/Max | M6 | Survey 3 (Explorer 3) |
| 20 | Industrial Harvesters Resilience & Test Safety | Preservar 100% dos testes Vitest passando nas 8 verticais de mineração, circuit breakers, deduplicação dual e filas assíncronas | M7 | Survey 3 (Explorer 3) |
| 21 | Final Verification & Victory Audit Quality Gate | Executar verificação completa de linter visual (`scripts/design-lint.mjs --changed`), suítes de teste Vitest e validação forense | M7 | Survey 3 (Explorer 3) |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: R1 Inventário Forense, Limpeza de Rotas & Fake Toasts | Realocar testes de `src/routes/`, corrigir rotas quebradas em `waesy-copilot-drawer.tsx` e onboarding, conectar mutations reais aos fake toasts, preencher matriz de 4 estados em rotas críticas | none | PLANNED |
| 2 | M2: R2 Erradicação de Design Lint & Separação Visual HIG/Bento | Pareamento de cabeçalhos desktop inpage (eliminar 22 cabeçalhos-fantasma), piso tátil 44px (DL-14) nos 117 arquivos, saneamento de colchetes `-[...]`, hex literais e emojis (DL-23) | M1 | PLANNED |
| 3 | M3: R3 Barreira Zero-Trust & Governança Civil com KYC | Expansão do `ActionAuthGuardModal` com `returnUrl` para 100% das mutações públicas, fluxo `/conta/verificacao`, Master Admin KYC e bloqueio financeiro para civis sem KYC | M1 | PLANNED |
| 4 | M4: R4 Bilateralidade Transacional & Sincronização em Tempo Real | `createAppointment` com persistência bilateral (`customer_id` + `store_id`), sincronização de agenda cliente/loja e simetria de pedidos/propostas | M3 | PLANNED |
| 5 | M5: R5 Economia de Tokens & Calibração Comercial kTokens | Cota de 100k diários com renovação 24h, isenção (0 tokens) para buscas locais e notícias, e débito calibrado (25k CNPJ, 75k docs, 250k sites) | M4 | PLANNED |
| 6 | M6: R6 Super Omni-Builder de Páginas Estilo Wix | Expansão de 8 para 24+ blocos modulares canônicos, animações de scroll via `IntersectionObserver` com `motion-safe:`, e trava de vitrine Pro/Max no `OmniEditor` | M2 | PLANNED |
| 7 | M7: R7 Harvesters Industriais, Testes de Regressão & Fechamento | Manutenção das 8 verticais industriais sem mocks, execução de 100% dos testes Vitest, validação de design lint com 0 violações introduzidas e Victory Audit | M1, M2, M3, M4, M5, M6 | PLANNED |

---

## Interface Contracts
### Auth & Zero-Trust Modal Contract
- `ActionAuthGuardModal`:
  - Props: `isOpen: boolean`, `onClose: () => void`, `actionTitle: string`, `returnUrl: string`.
  - Ao autenticar: redireciona exatamente para `returnUrl` preservando estado ou aciona callback de continuidade.
- `requireKYC(identity)`:
  - Lança erro 403 `KYC_REQUIRED` se `identity.kyc_status !== 'approved'` ao tentar emitir ordens de pagamento, transferências ou assinar contratos.

### Bilateral Appointment Contract
- `createAppointment({ store_id, customer_id, service_id, scheduled_at, ... })`:
  - Validações: `store_id` e `customer_id` obrigatórios.
  - Persistência: grava simultaneamente vínculo com cliente e estabelecimento.
  - Evento realtime: dispara notificação para ambos os participantes.

### kToken Economy Contract
- `consumeKTokens({ user_id, action_type, cost })`:
  - `action_type in ['local_search', 'news_read']` => `cost = 0` (isenção).
  - `action_type == 'cnpj_enrichment'` => `cost = 25_000`.
  - `action_type == 'document_generation'` => `cost = 75_000`.
  - `action_type == 'omni_site_builder'` => `cost = 250_000`.
  - Verifica saldo da cota diária de 100k e renovação de 24h.

### Omni-Builder Blocks Contract
- `SiteBuilderBlockDefinition`:
  - `id: string` (ex: `hero_minimal_split`, `pricing_tables_clean`, etc.).
  - `label: string`, `category: 'basic' | 'layout' | 'sections' | 'interactive' | 'commerce'`.
  - `defaultData: Record<string, any>`, `render: (props: BlockProps) => ReactNode`.
  - Respeita `prefers-reduced-motion` e grade modular de 4px.

---

## Code Layout
- `src/routes/`: 393 rotas TanStack Router (`_store.*`, `workspace.*`, `admin-master.*`).
- `src/components/ui/`: Primitivas reutilizáveis de interface (`button.tsx`, `empty-state.tsx`, `skeleton.tsx`).
- `src/components/auth/`: `action-auth-guard-modal.tsx`.
- `src/components/builder/`: `OmniPageRenderer.tsx`, `OmniEditor.tsx`, `registry.ts`.
- `src/services/`: Server Functions BFF (`appointments`, `orders`, `kyc`, `tokens`, `omni-builder`).
- `src/services/mining/`: Motores de mineração e crawlers industriais.
- `docs/design/DECISIONS.md`: Registro de decisões arquiteturais.
