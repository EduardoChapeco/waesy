# Prompt Mestre — Revisão Arquitetural, Absorção de Legado, Deduplicação AST, Enxugamento de Stack e Completude End-to-End (Waesy)

Cole o bloco abaixo integralmente no agente/conselho executor para conduzir a revisão integral, reescrita estrutural, nativização de capacidades dormentes/avançadas, eliminação segura de lixo duplicado e otimização de stack sem perda de tecnologia ou funcionalidade.

```text
Você é o Conselho Executivo de Engenharia, Arquitetura, Segurança, Design Ops e Red Team do Waesy (`EduardoChapeco/waesy`), operando sob contrato estrito de `AGENTS.md`, `skills/waesy-integrity-auditor/SKILL.md`, `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`, `docs/canonico/CONTRATOS.md` e `.agents/rules/*`.

Use em operação coordenada as skills de produto/engenharia (`security-guard`, `state-sanitizer`, `storage-audit`, `supabase`, `supabase-postgres-best-practices`, `design-ops`, `apple-design`, `anti-ai-design`, `design-lint`, `accessibility-floor`, `color-and-contrast`, `typography-scale`, `spacing-and-grid`, `motion-and-feedback`, `layout-adaptivity`, `component-api`, `content-density`, `asset-pipeline`, `niche-matrix`, `web-performance`, `api-pool-manager`, `dynamic-surge-pricing`, `token-economy`), os 8 especialistas de `.agents/agents/*` (`design-system-architect`, `visual-auditor`, `flow-architect`, `platform-splitter`, `component-craftsman`, `content-editor`, `a11y-guardian`, `spec-writer`), o `bigtech-board` (para decomposição EARS + DAG MECE) e a disciplina anti-falso-positivo de `waesy-integrity-auditor`. O Conselho audita código, banco, bundle e runtime — nunca entrega teatro conversacional no lugar de código e prova.

================================================================================
1. MISSÃO CENTRAL (SEM PERDER NADA, ENXUGANDO TUDO QUE É INÚTIL OU REDUNDANTE)
================================================================================

Elevar o ecossistema Waesy ao estado enxuto, unificado, modular, rápido e verificável de ponta a ponta em 9 níveis, cumprindo simultaneamente quatro mandatos inseparáveis:

1. COMPLETAR E CONECTAR DE PONTA A PONTA: Garantir a Completude Séptupla (Banco + RLS -> BFF/Zod -> UI 4 estados -> Workspace/Admin -> Higiene anti-AI-smell -> <=3 toques -> Fluidez 44px/0-CLS), a Cadeia de Contratos (Coluna Postgres -> Tipo TS -> Schema Zod -> Server Function -> UI -> Tool MCP -> Evento/Auditoria) e a bidirecionalidade integral entre Vitrine Pública, Portal do Cliente/Viajante, Workspace Lojista e Admin Master, em shells nativos separados para Mobile (<600px) e Desktop (>=840px).
2. IDENTIFICAR, REESCREVER E NATIVIZAR O QUE É AVANÇADO (PROIBIDO SIMPLIFICAR): Mapear toda capacidade avançada que hoje vive presa em código antigo/monolítico ou quarentena (`legacy_quarantine/`, módulos legados pré-unificação, fluxos parciais) e absorver, compatibilizar e reescrever 100% dessa inteligência para dentro do módulo canônico ativo correspondente. Se um módulo novo for mais simples que um legado avançado, o novo deve absorver as capacidades do avançado — jamais rebaixar a plataforma para uma versão rasa.
3. PROTEGER MÓDULOS DORMENTES E DESTRUIR SOMENTE O QUE ESTÁ PROVADAMENTE DUPLICADO OU OBSOLETO:
   - INVARIANTE ANTI-EXCLUSÃO CEGA: Muitos módulos ainda não conectados às rotas principais representam funcionalidades futuras legítimas (`DORMANT_CAPABILITY_KEEP_AND_WIRE`). É terminantemente PROIBIDO excluir arquivo ou função apenas porque tem 0 callers em rotas.
   - TODA exclusão exige prova prévia AST + grep de símbolos + diff de capacidades contra o dono canônico + atualização de callers/testes/menus/registries/migrations antes da remoção. Só morre o que foi 100% absorvido, substituído com paridade superior ou comprovadamente é shim/lixo sem função única.
4. ENXUGAR CÓDIGO, STACK E BUNDLE SEM PERDER TECNOLOGIA OU FUNÇÃO: Refatorar monólitos de milhares de linhas em arquitetura coesa e enxuta; erradicar funções/componentes clonados; enxugar dependências redundantes ou mal alocadas em `package.json`; isolar peso morto de bundle client e SSR Nitro (mantendo Worker folgado abaixo de 25 MB); rearmar verificadores estáticos cegos/desligados e eliminar scripts falsos-verdes.

================================================================================
2. BASELINE EMPÍRICA INICIAL RECONHECIDA (ANCORAR E RECONFIRMAR NO HEAD ATUAL)
================================================================================

Reexecute `npm run audit:forensic` (`scripts/audit/forensic-repo-audit.mjs`), `node scripts/bigtech-scale-budget-s05.mjs` e `node scripts/audit-silent-subactions-and-dead-code.mjs` antes de qualquer mutação. Baseline medida neste snapshot:
- Escopo AST `src/`: 2.900 arquivos (2.341 não-teste, 1.051.881 LOC); 2.090 alcançáveis por rotas/worker/app; 253 inalcançáveis — sendo 211 `DORMANT_CAPABILITY_KEEP_AND_WIRE` (protegidos contra exclusão cega), 36 `@deprecated`/shims e 6 duplicados/substituídos imediatos; 25 arquivos com tags `@deprecated` (com 0 a 30 callers ativos).
- Monólitos críticos (302 arquivos >= 800 LOC; top 20 concentram 9,2% de todo o código):
  - `src/routes/_store.conta.classificados.novo.tsx` (11.791 LOC, 10.668 LOC numa função, 1.011 branches, 360 hooks) coexistindo com `src/components/ad-engine/` dormente.
  - `src/services/chat.functions.ts` (6.969 LOC, 315 `any`), `AtendimentoChatWorkspace.tsx` (5.695 LOC), `unified-proposal-workspace.tsx` (5.620 LOC), `OmniEditor.tsx` (5.247 LOC), `TourismPipeCardDossier.tsx` (5.209 LOC), `omni-templates.ts` (4.805 LOC), `mining.functions.ts` (4.670 LOC com gerações paralelas de endpoints), `crm.functions.ts` (4.656 LOC), `builder.functions.ts` (4.360 LOC), `studio-sidebar-editor.tsx` (3.985 LOC).
- Duplicações confirmadas: 40 clusters de clones estruturais AST; `isVideoUrl` (7x), `slugify` (5x), `escapeHtml` (4x), `maskCpf` (2x), `formatCurrency` (2x); múltiplos builders de proposta/contrato (`UniversalDocumentStudio` vs `unified-proposal-workspace` vs `studio-sidebar-editor` vs `workspace.orcamentos.novo`; `contracts` vs `travel_contracts`); múltiplos registries/renderers do builder (`lib/builder/builder-registry.ts` vs `components/builder/registry.ts`; `OmniPageRenderer` vs `experience-renderer`); múltiplas camadas de UI (`design-system/primitives`, `components/ui/canonical`, `components/ui`); dualidade de IA (`api-orchestrator` vs `ai-core-gateway`, dois orquestradores ReAct, duas telas `/workspace/configuracoes/ai` vs `inteligencia-artificial`).
- Armadilhas de rota (6 rotas pesadas com redirect incondicional): `workspace.pedidos.gestor.tsx` (1.975 LOC importada por `workspace.pedidos.index.tsx`), `workspace.reservas.tsx` (911 LOC importada por `workspace.pdv.comandas.tsx`), `workspace.design-system.tsx`, `workspace.moderacao.*`, `workspace.master.influencers.tsx`.
- Quarentena e SQL: 106 arquivos em `legacy_quarantine/` com referências a tabelas/RPCs avançadas (`POSSalesTerminal`, `CardDetailPanel`, `RoomingList`, `ServiceWizard`, `ComboWizard`, `AIHunterPanel`, `reaccommodation.ts`, `rooming.ts`, `visas.ts`, `CommissionSection`); 636 migrations + 271 SQL de referência em `supabase/reference-migrations/`.
- Higiene e Stack: 36 violações de fronteira de camada (queries `.from()` diretas em componentes/hooks/rotas); `tsconfig.json` com `noUnusedLocals: false` e `noUnusedParameters: false`; `eslint.config.js` com `no-unused-vars: off` e regras críticas em `warn`; `run-checks.mjs` com checks `C26`/`C41`/`C42` hardcoded; Worker `dist/_worker.js` em 24,47 MB / 25,00 MB (margem crítica de 0,53 MB); chunk de entrada client `index-*.js` em ~3,38 MB e `vendor-icons-*.js` em ~867 KB (`lucide-react` em 1.133 arquivos + `@phosphor-icons/react` em 166); `framer-motion` (0 imports em `src/`), `postgres` (0 imports em `src/`) e plugins Vite/Tailwind listados em `dependencies` em vez de `devDependencies`.

================================================================================
3. REQUISITOS NORMATIVOS EARS (OBRIGATÓRIOS PARA TODA ONDA)
================================================================================

- [EARS-01] (Ubíquo): Antes de modificar qualquer arquivo, o agente deve executar preflight com `git status`, `git branch`, leitura real dos arquivos de UI, BFF, DTO, SQL e teste envolvidos, e registro no ledger de evidências.
- [EARS-02] (Proibição de Exclusão Cega): If um módulo não tiver callers em rotas ativas, the system shall prevent exclusão até provar via AST (`npm run audit:forensic`) e inspeção linha a linha que (a) todas as suas tabelas, RPCs, regras de negócio e edge cases já existem no dono canônico, ou (b) foram reescritos e integrados nele primeiro.
- [EARS-03] (Absorção de Legado Avançado): When uma implementação antiga (`legacy_quarantine/*` ou módulo pré-unificação) possuir inteligência de negócio ausente na versão canônica mais nova, the system shall extrair a lógica pura para `src/lib/` ou `src/services/`, adaptá-la aos contratos Zod/RLS atuais e integrá-la nativamente antes de aposentar o legado.
- [EARS-04] (Dono Único por Capacidade & Helper): The system shall manter exatamente 1 dono canônico por capacidade de negócio e 1 definição canônica por helper transversal (`isUuid`, `formatCurrency`, `slugify`, `escapeHtml`, `maskCpf`, `isVideoUrl`), eliminando re-exports `@deprecated` após migrar 100% dos callers e testes.
- [EARS-05] (Decomposição de Monólitos): When um arquivo exceder os limites estruturais (`>300 LOC` em rota, `>250 LOC` em componente UI, ou monólito `>=800 LOC`), the system shall decompor em módulos coesos (motor puro + hooks/adapters + subcomponentes canônicos + shells mobile/desktop) reduzindo LOC total sem suprimir nenhum campo, estado ou regra funcional.
- [EARS-06] (Stack & Orçamento de Bundle): The system shall mover build/dev tools para `devDependencies`, remover dependências com 0 uso real comprovado, consolidar bibliotecas sobrepostas (ícones, drivers DB, visualizadores PDF/mapa lazy-loaded via dynamic import) e manter o chunk inicial de cliente sob orçamento estrito e o Nitro Worker <= 22 MB com folga de segurança.
- [EARS-07] (Fronteiras de Camada & Segurança Zero-Trust): The system shall eliminar queries `.from()` diretas em componentes/hooks/rotas, garantindo que toda leitura/mutação atravesse Server Functions (`src/services/*.functions.ts`) com Zod 100% desestruturado (B.25), `getServerIdentity()`/`requireStaff()`, RLS Deny-by-Default e sem vazamento de PII ou `service_role`.
- [EARS-08] (Design System, Mobile/Desktop Nativos & Anti-Fake): The system shall cumprir `DESIGN.md` e `DESIGN-LINT.md` (0 violações P0/P1 nos arquivos alvo e progresso real de zeragem de baseline; alvos `>=44px`, `100dvh`, `safe-area`, WCAG >= 4.5:1, zero `card-dentro-de-card`, zero `unsplash`/mocks sintéticos, empty states honestos e omissão de abas vazias).
- [EARS-09] (Verificação Anti-Falso-Positivo): The system shall recusar promoção de evidência entre os 9 níveis de validação; toda entrega exige prova reproduzível por nível aplicável (código, unidade, handler/API, `tsc` + lint + build, DB/RLS, browser mobile <600px + desktop >=840px pós-reload, CI e deploy smoke).
- [EARS-10] (Mutação Cirúrgica): The system shall aplicar `edit_file` delimitado em arquivos existentes (`write_file` apenas para arquivos novos), preservando trabalho preexistente no worktree e evitando `git add -A` ou reescritas cegas.

================================================================================
4. OS 9 NÍVEIS INDEPENDENTES DE VALIDAÇÃO (7 CAMADAS + LEAN ARCHITECTURE)
================================================================================

Nenhuma entrega pode pular ou promover evidência de um nível para outro:
- Nível 1 — Integridade de Grafo, AST & Higiene de Diff (`audit:forensic --strict-broken`, `git diff --check`, 0 imports quebrados, 0 vazamentos de camada).
- Nível 2 — Lógica Pura & Invariantes de Negócio (testes unitários de motores em `src/lib/` + cenários B.25 opcionais/nulos).
- Nível 3 — Contratos BFF, Zod & Handlers (testes positivos e negativos de autorização, idempotência, replay e erro explícito sem catch mudo).
- Nível 4 — Tipagem Estrita, Lint Real & Design (`typecheck`, ESLint sem regras críticas silenciadas, `design-lint` + `contrast-audit` + `audit:buttons` + `token-sync`).
- Nível 5 — Stack, Bundle & Worker Lean Budget (`build` único, `check-client-server-leak`, `route-budget-guard`, medição de chunk inicial e Nitro `_worker.js`, zero deps mortas ou mal alocadas).
- Nível 6 — Persistência Real, Migrations & RLS Multi-Role em Postgres (migrations idempotentes, índices, `SECURITY DEFINER` seguro, prova positiva e negativa por JWT de `anon`/`customer`/`staff`/`other_tenant`).
- Nível 7 — UI & Fluxos End-to-End nos 2 Shells Nativos no Browser (Mobile <600px em 390x844 e Desktop >=840px em 1280x800, ações reais pós-reload, console limpo, 0 overflow, Bidirecionalidade Master/Workspace <-> Vitrine/Cliente).
- Nível 8 — Auditoria Adversarial & CI do SHA Final (Red Team tentando refutar segurança, regressão funcional e simplificação indevida; 100% dos checks reais sem constantes falsas).
- Nível 9 — Absorção Completa & Enxugamento Sem Perda (cross-check comprovando que todo código excluído estava 100% absorvido/substituído e o balanço líquido reduziu complexidade e LOC mantendo 100% dos casos de uso).

================================================================================
5. CONSELHO EXECUTIVO DE REVISÃO (CRITÉRIO DE VETO POR ONDA)
================================================================================

Cada onda só recebe selo após parecer unânime destes 8 auditores (basta 1 REPROVADO para bloquear):
1. Arquiteto de Domínio & Fluxos (`flow-architect` / `decompose-prd`): fluxo ponta a ponta intacto; dono único por capacidade; zero rota morta ou redirect acoplado.
2. Auditor Anti-Simplificação & Absorção (`waesy-integrity-auditor` / `gap-hunter`): zero funcionalidade avançada perdida ao decompor monólitos ou aposentar legados; capacidades dormentes preservadas/integradas.
3. Auditor de Segurança & Dados (`security-guard` / `supabase-postgres-best-practices` / `storage-audit` / `state-sanitizer`): Zero-Trust no BFF, RLS, Storage, multitenancy e contexto civil/loja/criador.
4. Principal Design Ops & Shell Nativo (`design-ops` / `apple-design` / `platform-splitter` / `anti-ai-design` / `accessibility-floor`): WCAG 2.2 AA, alvos 44px, shell nativo compacto vs expandido, tokens semânticos, zero DL-01..DL-32, zero dado sintético.
5. Engenheiro de Stack & Performance (`web-performance` / `asset-pipeline`): redução real de LOC, remoção de clones, tree-shaking, lazy chunks pesados, Worker < 22 MB, LCP/CLS/INP saudáveis.
6. Guardião de Contratos (`spec-writer` / `CONTRATOS.md`): paridade Postgres <-> TypeScript <-> Zod <-> BFF <-> UI <-> MCP Tool <-> Eventos/Auditoria.
7. Auditor de Ferramental & CI: nenhum check hardcoded (`run-checks.mjs`), zero regressão silenciosa por `noUnusedLocals: false` ou `ratchet` fraudulento.
8. Red Team Adversarial (`qa-gatekeeper`): reprodução antes/depois, casos de erro/vazio/timeout/outro tenant/mobile/reload.

================================================================================
6. PLANO DE EXECUÇÃO EM 8 ONDAS (DAG MECE)
================================================================================

### ONDA 0 — Baseline, Preflight & Desarmamento de Falsos Verdes
- Escopo: `scripts/audit/forensic-repo-audit.mjs`, `scripts/audit/run-checks.mjs`, `scripts/check-duplication.mjs`, `scripts/design-lint.mjs`, `tsconfig.json`, `eslint.config.js`, `.github/workflows/ci.yml`.
- Ações:
  1. Executar `npm run audit:forensic`, `npm run check:canonical` e capturar erros reais de `npm run typecheck`.
  2. Corrigir scripts com falsos verdes (`run-checks.mjs` onde `C26`/`C41`/`C42` são constantes; `check-duplication.mjs` para distinguir declaração duplicada de import legítimo; `audit:buttons` e `design-lint.mjs` alinhados exatamente a `DESIGN-LINT.md`).
  3. Definir plano incremental de ativação de `noUnusedLocals`, `noUnusedParameters`, `@typescript-eslint/no-unused-vars` e `react-hooks/rules-of-hooks: error` por pasta saneada.
- Gate W0: Inventário AST atualizado + 0 scripts mentirosos; mapa completo de erros reais de `tsc` classificados por módulo.

### ONDA 1 — Reconciliação de `legacy_quarantine/` & Proteção de Capacidades Dormentes (210 arquivos)
- Escopo: `legacy_quarantine/**` (106 arquivos) e os 210 módulos `DORMANT_CAPABILITY_KEEP_AND_WIRE`.
- Ações:
  1. Auditar cada item de `legacy_quarantine/` listando tabela/RPC/regra única (`POSSalesTerminal`, `CardDetailPanel`, `RoomingList`, `ServiceWizard`, `ComboWizard`, `PromotionWizard`, `AIHunterPanel`, `CommissionSection`, `reaccommodation.ts`, `rooming.ts`, `visas.ts`, `quotes.ts`).
  2. Extrair e nativizar qualquer lógica avançada que não esteja nos módulos canônicos equivalentes em `src/`; registrar prova arquivo:linha do que já foi absorvido 100%.
  3. Só após prova escrita e aprovada pelo Auditor Anti-Simplificação, excluir da árvore ativa os itens de `legacy_quarantine/` comprovadamente 100% absorvidos/substituídos (e arquivar apenas o registro histórico em `DECISIONS.md`).
  4. Para os 210 módulos dormentes em `src/`: marcar explicitamente no registro quais pertencem ao roadmap ativo (integrar na navegação/fluxo correspondente ou manter protegidos) vs quais são duplicatas reais.
- Gate W1: Zero código útil perdido; `legacy_quarantine/` zerada com prova item a item; lista fechada de módulos dormentes ativos vs duplicatas confirmadas.

### ONDA 2 — Deduplicação Transversal, Unificação de Helpers & Erradicação de `@deprecated`
- Escopo: helpers duplicados, 40 clusters AST, 25 arquivos `@deprecated`, 36 arquivos shim inalcançáveis, e os 6 duplicados imediatos.
- Ações:
  1. Centralizar em `src/lib/` canônico (`validators.ts`, `formatters.ts`, `slug-utils.ts`, `sanitize.ts`, `media-utils.ts`) todas as implementações dispersas (`isUuid`, `isVideoUrl` 7x, `slugify` 5x, `escapeHtml` 4x, `maskCpf` 2x, `formatCurrency` 2x e os clusters AST detectados).
  2. Repontear os callers de módulos `@deprecated` (`src/lib/niche-semantics.ts`, `niche-helpers.ts`, `identity-core.ts`, `proposals.ts`, `types/omni-builder.ts`, `ai/openrouter.ts`, `ears-validator.ts`, `prd-decomposer.ts`, `product-manager.ts`, `ux-research.ts`, `strategic-frameworks.ts`, etc.) para os donos canônicos, atualizar testes e excluir os shims antigos com zero callers.
  3. Desacoplar rotas com redirect incondicional e acoplamento invertido (`workspace.pedidos.gestor.tsx`, `workspace.reservas.tsx`, `workspace.design-system.tsx`, `workspace.moderacao.*`, `workspace.master.influencers.tsx`), movendo componentes reutilizados (`KDSPage`, `TableReservationsPage`) para `src/components/` e deixando apenas rotas finas ou consolidando a navegação.
  4. Auditar e corrigir as 36 violações de fronteira de camada (remover queries `.from()` diretas de componentes/hooks/rotas para `src/services/*.functions.ts` com Zod/auth).
- Gate W2: `audit:forensic` com `0` broken imports, `0` `@deprecated` sem plano de remoção imediata, `0` violações de camada e queda comprovada nos clusters AST.

### ONDA 3 — Unificação de Verticais & Absorção de Concorrentes (Sem Perder Recursos)
- Escopo por vertical (executar um domínio por microfase, validando ponta a ponta):
  1. **Anúncios / Classificados / Catálogo:** Integrar todas as capacidades avançadas de nicho hoje em `src/routes/_store.conta.classificados.novo.tsx` (11.791 LOC — FIPE, lotes/validade, eventos/palestrantes/ingressos, pacotes de viagem, arquivos digitais, enriquecimento IA, CNPJ) e `src/components/classifieds/*` dentro da arquitetura modular `src/components/ad-engine/` + `src/lib/ad-engine/`, reduzindo a rota para orquestrador enxuto (`<=300 LOC`) e mantendo 100% dos nichos e previews idênticos à página pública (`UniversalClassifiedShowcase` / `CanonicalListingView`). Remover formulários órfãos pré-split apenas após paridade comprovada.
  2. **Turismo / Propostas / Contratos / Viagens / Excursões:** Convergir `unified-proposal-workspace.tsx` (5.620 LOC), `studio-sidebar-editor.tsx` (3.985 LOC), `workspace.orcamentos.novo.tsx` (2.991 LOC) e `UniversalDocumentStudio.tsx` (2.388 LOC) mantendo 100% do cotador live (PassHub/Wooba/InfoTravel), OCR multimodal, multi-hotel/split-stay, multi-transfer nomeado, multi-opção comparativa e builder web (`ProposalWebPageBuilder`), enquanto aposenta templates/widgets mortos duplicados (`StudioFormatPicker`, `StudioMapWidget`, `StudioTemplatePicker`, `StudioToolbar`, `StudioUnsplashPicker`, `VoucherStudio` templates duplicados). Unificar pipeline dual de contratos (`contracts` + `travel_contracts` e sheets paralelos `new-travel-contract-sheet` vs `contract-editor-sheet`).
  3. **Builder, Vitrine, CMS & Branded App:** Consolidar `OmniEditor.tsx` (5.247 LOC), `builder.functions.ts` (4.360 LOC) e `omni-builder.functions.ts` (1.254 LOC) sob um contrato único de engine/estado, unificar os dois registries gigantes (`src/lib/builder/builder-registry.ts` 2.886 LOC + `src/components/builder/registry.ts` 2.415 LOC), unificar renderers (`OmniPageRenderer` vs `experience-renderer`), remover o bloco legado morto `src/components/admin/builder/*` (somente após confirmar 0 dependências vivas) e consolidar os 3 estúdios visuais + PWA/Branded App.
  4. **CRM / Atendimento / Chat / IA / Mining / Radar:** Fatiar `chat.functions.ts` (6.969 LOC, 315 `any`), `AtendimentoChatWorkspace.tsx` (5.695 LOC) e `TourismPipeCardDossier.tsx` (5.209 LOC); consolidar `mining.functions.ts` (4.670 LOC com duas gerações de endpoints em arquivo único); convergir `api-orchestrator` vs `ai-core-gateway`, os dois loops ReAct (`copilot-react-orchestrator` vs `autonomous-copilot-orchestrator`) e as duas páginas de config de IA; unificar rotas duplicadas de radar (`workspace.turismo.radar` vs `workspace.inteligencia.radar`).
- Gate W3: Cada domínio fatiado, tipado, sem regressão de feature, com testes E2E de fluxo real e browser desktop+mobile validado.

### ONDA 4 — Revisão de Stack, Dependências, Tree-Shaking & Worker Optimization
- Escopo: `package.json`, `vite.config.ts`, `src/styles.css`, chunks Vite/Nitro, `src/integrations/supabase/client.ts`.
- Ações:
  1. Reclassificar ferramentas de build/compilação para `devDependencies` (`@tailwindcss/vite`, `@tanstack/router-plugin`, `tailwindcss`, `tw-animate-css`, `vite-tsconfig-paths`, `@types/*`).
  2. Remover pacotes sem uso em runtime comprovado via AST (`framer-motion` se 0 usos reais confirmados inclusive CSS/plugins) e consolidar drivers DB (`postgres` vs `pg` em scripts/worker).
  3. Unificar biblioteca de ícones (migrar os ~166 usos de `@phosphor-icons/react` para `lucide-react` ou adaptador único tree-shaken, atacando o chunk `vendor-icons` de ~867 KB).
  4. Aplicar lazy-loading / dynamic `import()` rigoroso para `jspdf`, `html2canvas`, `maplibre-gl`, `recharts`, editores `OmniEditor`/Studio e blocos pesados fora do caminho crítico de Vitrine Pública, derrubando o chunk `index` (hoje ~3,38 MB) e mantendo `_worker.js` confortavelmente < 22 MB.
  5. Avaliar consolidação segura da camada UI fragmentada (`src/design-system/primitives/` com apenas 2 callers + `src/components/ui/canonical/` + `src/components/ui/`) para 1 única família canônica de primitivas baseadas em tokens (`styles.css` + `tokens.json`).
- Gate W4: Build limpo, `check-client-server-leak` PASS, `route-budget-guard` PASS com margem saudável no Worker e redução mensurável de KB por rota crítica.

### ONDA 5 — Banco de Dados, RLS, Storage, MCP & Tipagem Estrita
- Escopo: `supabase/migrations/`, `supabase/reference-migrations/`, `src/integrations/supabase/types.ts`, `src/registries/mcp-tool-registry.ts`.
- Ações:
  1. Auditar tabelas/migrations órfãs e arquivar/remover com decisão explícita os 271 arquivos de referência de outro repositório em `supabase/reference-migrations/travelagencias` se não forem mais necessários em runtime/ferramentas (preservando histórico de migrations reais em `supabase/migrations/` — nunca apagar migrations já aplicadas em produção!).
  2. Auditar RLS Deny-by-Default, `FORCE ROW LEVEL SECURITY`, `SECURITY DEFINER`, `search_path`, `GRANT EXECUTE`, buckets Storage, idempotência e paridade com `mcp-tool-registry.ts` e Zod.
  3. Eliminar `as any` / `: any` críticos nos fluxos centrais (especialmente `chat.functions.ts` com 315 `any` e `crm.functions.ts` com 145 `any`) e regenerar types Supabase se houver drift.
- Gate W5: Prova SQL/RLS real com múltiplos papéis (`anon`, civil, lojista tenant A vs B, admin master) e 0 erros em `npm run typecheck`.

### ONDA 6 — Design Ops, Shell Dual Nativo, A11y WCAG 2.2 AA & Revisão de Todas as Rotas/Casos de Uso
- Escopo: Todas as superfícies `_store.*`, `viajante.*`, `_store.conta.*`, `workspace.*`, `admin-master.*`.
- Ações:
  1. Auditar visualmente e interativamente (desktop `1280x800` + mobile `390x844`) cada fluxo crítico: descoberta/vitrine -> filtro/busca -> detalhe por nicho -> checkout/reserva/orçamento -> aceite/pagamento/contrato -> workspace gestão/CRM/financeiro/PDV/turismo pós-venda -> portal cliente/viajante -> Admin Master CMS bidirecional.
  2. Eliminar 100% de containeritis (DL-31), grids comprimidas (DL-32), toasts falsos, `100vh`, textos prolixos, `line-clamp` em bio/preço, touch targets `<44px` e contrastes `<4.5:1`.
  3. Corrigir todo estado de loading (skeleton isomórfico), empty (CTA real sem fake data), error (botão de retry explícito) e persistência pós-reload.

### ONDA 7 — Endurecimento Final, CI Real, Regressão Completa & Entrega
- Ações:
  1. Ativar flags estritas (`noUnusedLocals`, `noUnusedParameters`, checks reais no CI sem constantes falsas).
  2. Rodar bateria completa pós-última edição: `audit:forensic:test`, `audit:forensic --strict-broken`, `typecheck`, `vitest run`, `lint`, `lint:design`, `audit:buttons`, `check:schema`, `check:bff`, `check:tokens`, `check:cycles`, `check:types-ssot`, `check:naming`, `build` único + `route-budget-guard`, testes E2E browser nos 2 shells e smoke pós-deploy se autorizado pelo usuário.
  3. Registrar decisão final e inventário antes/depois (LOC removidas/modularizadas, arquivos absorvidos vs purgados, KB de bundle reduzido, latência, bugs fechados) em `docs/design/DECISIONS.md` e no evidence ledger.

================================================================================
7. PROTOCOLO OBRIGATÓRIO DE TRABALHO & FORMATO DE RESPOSTA DO AGENTE
================================================================================

1. Comece SEMPRE com a ONDA 0 sem deletar nenhum arquivo: produza o Snapshot AST (`npm run audit:forensic`), mapa de erros de `tsc`, mapa de donos únicos por domínio e backlog DAG ordenado de execução com risco e arquivos autorizados. Pare após W0/W1 para validação caso haja mudança destrutiva ou escolha de produto ambígua (`AGENTS.md` B.10).
2. Toda afirmação exige `arquivo:linha`, saída real de comando e nível exato de prova (Nível 1..9). É proibido declarar "concluído" com base em mock, toast ou intenção.
3. Toda tabela de saída segue contrato enxuto (`AGENTS.md` B.6):
   - Tabela `Antes vs Depois` (LOC, arquivos, dependências, chunks, erros `tsc`, violações `design-lint` e `audit:forensic`).
   - Tabela de itens `Absorvidos/Nativizados`, `Modularizados/Enxugados`, `Excluídos com Prova AST` e `Dormentes Protegidos`.
   - Matriz de Evidência pelos 9 Níveis + Pendências Honestas (o que não foi executado ou falhou).
```
