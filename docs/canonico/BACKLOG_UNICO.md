# BACKLOG_UNICO.md — Fonte Única da Verdade Transacional e Engenharia (R01)

Este documento reconcilia e consolida todos os planos mestres concorrentes da plataforma Waesy (`docs/prompts/`, `docs/audit/` e monorepo).
Nenhum item foi descartado. Todos os planos têm ID canônico, origem declarada, arquivos-alvo, dono semântico e status real com evidências.

---

## 1. Mapa Consolidado dos Planos Mestres

| Plano ID | Documento de Origem | Escopo / Missão | Total Fases | Status Geral | Provas / Evidências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PLANO-1** | `02_PROMPT_MESTRE_E_PROMPTS_P01_A_P78.md` | Protocolo Base, Contratos BFF e Catálogo Mestre | 78 Fases (P01–P78) | Concluído | Vitest 100% / Decisões DEC-001 a DEC-080 |
| **PLANO-2** | `03_PLANO_MOTOR_DE_ANUNCIOS_E_VITRINE_F01_A_F48.md` | Motor de Anúncios Unificado, Preview Real e Vitrine | 48 Fases (F01–F48) | Concluído e Homologado | DEC-086 / Migração 20261221 / View ativa |
| **PLANO-3** | `04_PLANO_3_MOTOR_DE_OFERTAS_E_NICHOS.md` | Nichos, 11 Blocos, Estoque Ledger e Motor de Preço | 72 Fases (G01–G72) | Concluído e Homologado | DEC-087 / DEC-088 / 38 testes verdes |
| **PLANO-4** | `05_SUPER_PROMPT_OPERACAO_VERDADE_UNICA.md` | Operação Verdade Única, Erradicação de Remendos | 64 Fases (R01–R64) | **Concluído e Homologado** | 64/64 Fases / DEC-089 a DEC-104 / 1.007 testes verdes / 0 erros TS / Build OK |
| **PLANO-5** | `06_PROMPT_ESTRUTURA_ESCALA_OPERACAO_BIGTECH.md` | Governança BigTech, Camadas, Telemetria e Escala | 48 Fases (S01–S48) | **Em Andamento (27/48 concluídas)** | DEC-105 a DEC-116 / 27 fases concluídas / 1.044 testes verdes |

---

## 2. Detalhamento do Plano Ativo: OPERAÇÃO VERDADE ÚNICA (R01 a R64)

### Bloco 1 — Reconciliação e Verdade Única (R01–R06)
- [x] **R01**: Leitura dos planos legados e unificação estrita em `docs/canonico/BACKLOG_UNICO.md`. *(Concluído)*
- [x] **R02**: Reabertura e saneamento da fila e selos de meta-trabalho sem prova real. *(Concluído)*
- [x] **R03**: Mapeamento da proporção meta-trabalho vs produto no histórico de auditoria. *(Concluído)*
- [x] **R04**: Triagem de entregas com impacto visível e funcional para o usuário final. *(Concluído)*
- [x] **R05**: Matriz de rotas das verticais do ecossistema e donos semânticos. *(Concluído)*
- [x] **R06**: Consolidação da SSOT em `BACKLOG_UNICO.md` e `ESTADO.json`. *(Concluído)*

### Bloco 2 — O Lint Engolido e o Design System (R07–R14) — CONCLUÍDO
- [x] **R07**: Diagnóstico do mecanismo de `--ratchet` e baseline do script `design-lint.mjs`. *(Concluído)*
- [x] **R08**: Triagem das 38k violações por severidade e módulo (`components/app`, `routes`, `ui`). *(Concluído)*
- [x] **R09**: Eliminação das violações P0 e P1 no módulo crítico `src/components/commerce/`. *(Concluído)*
- [x] **R10**: Expansão de primitivas de layout (`CanonicalPage`, `CanonicalShell`, `CanonicalSection`, etc.). *(Concluído)*
- [x] **R11**: Expansão de primitivas de formulário e CMS (`CanonicalField`, `CanonicalFormRow`, etc.). *(Concluído)*
- [x] **R12**: Piloto completo de migração em `src/components/commerce/` (0 violações em 4 arquivos). *(Concluído)*
- [x] **R13**: Densidade móvel (390px), alvos de toque >= 44px (`h-11`) e `motion-reduce:animate-none`. *(Concluído)*
- [x] **R14**: Portão estrito de lint: tolerância zero a baseline permissivo em arquivos alterados (`--changed`). *(Concluído)*

### Bloco 3 — Monólitos de Rota (R15–R20) — EM ANDAMENTO
- [x] **R15**: ALVO: `workspace.catalogo.produtos.novo.tsx` (1.644 para 251 linhas, redução de 85%). *(Concluído)*
- [x] **R16**: ALVO: `workspace.catalogo.produtos.$id.tsx` (1.705 para 296 linhas, redução de 82%). *(Concluído)*
- [x] **R17**: ALVO: `_store.classificados.$id.tsx` (1.829 para 255 linhas, redução de 86%, 0 violações de lint). *(Concluído)*
- [x] **R18**: ALVO: `_store.classificados.index.tsx` (reduzido para 227 linhas; 8 componentes catalog criados; 0 violações lint changed). *(Concluído — commit e8f8fd0e)*
- [x] **R19**: Varredura de todos os arquivos de rota acima de 500 linhas. *(Concluído — 73 rotas identificadas, top monolito: 9.285L)*
- [x] **R20**: Regra de composição de página e verificador automático no CI. *(Concluído — `scripts/check-route-size.mjs`, gate 300L/250L integrado em `check:canonical`)*

### Bloco 4 — Duplicação e Dono Único (R21–R28) — CONCLUÍDO
- [x] **R21**: Dono único de parcelamento e pagamento. *(Concluído — `src/lib/payment/installment-calculator.ts`)*
- [x] **R22**: Dono único de NCM/CEST/CFOP/IBS. *(Concluído — `src/lib/fiscal/ncm-registry.ts`)*
- [x] **R23**: Dono único de preço, comparativo, custo, margem e sinal. *(Concluído — `src/lib/pricing/price-calculator.ts`)*
- [x] **R24**: Dono único de estoque, agenda e capacidade. *(Concluído — `src/services/canonical-stock-ledger.functions.ts`)*
- [x] **R25**: Dono único de galeria, capa e mídia. *(Concluído — `src/lib/media/gallery-manager.ts`)*
- [x] **R26**: Dono único de inclusos, exclusos, políticas e FAQ. *(Concluído — `src/lib/policies/cancellation-policy-registry.ts`)*
- [x] **R27**: Kill list com mapa de migração de dados e reversão. *(Concluído — `KILL_LIST_R27` em cancellation-policy-registry.ts)*
- [x] **R28**: Verificador de duplicidade no CI. *(Concluído — `scripts/check-duplication.mjs`, 9/9 campos canônicos aprovados)*

### Bloco 5 — Metamorfose e Nichos (R29–R36) — CONCLUÍDO
- [x] **R29**: Inventário completo dos mecanismos concorrentes de template. *(Concluído — DEC-095)*
- [x] **R30**: Eleger dono único da metamorfose e sanitizar concorrentes. *(Concluído — `src/lib/ad-engine/template-metamorphosis.ts`, `presentation-presets.ts` sem hex)*
- [x] **R31**: `product-field-registry.ts` como coração de padronização de campos por nicho. *(Concluído — `src/registries/product-field-registry.ts`)*
- [x] **R32**: Alinhar `permission-registry.ts` e `route-registry.ts` com a capacidade real. *(Concluído — papéis e recursos sincronizados)*
- [x] **R33**: Matriz nicho × arquétipo de oferta canônica. *(Concluído — `src/lib/ad-engine/niche-archetype-matrix.ts`, A01–A15)*
- [x] **R34**: Templates coerentes — filtro estrito por nicho na UI. *(Concluído — `listing-template-selector.tsx` conectado e saneado)*
- [x] **R35**: Biblioteca semântica por nicho, eliminando hardcode de texto. *(Concluído — `src/lib/ad-engine/niche-semantic-library.ts`)*
- [x] **R36**: Biblioteca de nichos como dado puro, não como código. *(Concluído — `src/lib/ad-engine/niche-data-registry.ts`)*

### Bloco 6 — Editor, Preview e Compra (R37–R44) — CONCLUÍDO
- [x] **R37**: Provar fluxo salvar, salvar rascunho e publicar, ponta a ponta, com registro no banco. *(Concluído — `onSaveDraft` / `onSubmit` em `useProductEditor` e `ProductEditorHeader`)*
- [x] **R38**: Preview real alimentado pelo formulário em tempo real. *(Concluído — `ProductPreviewPane` fidedigno)*
- [x] **R39**: Responsividade do preview nos 3 modos (Compact 390px, Medium 768px, Expanded 1280px). *(Concluído — seletor com parcelamento R21)*
- [x] **R40**: Fluxo de compra por nicho (pedido, reserva, agendamento, orçamento, assinatura). *(Concluído — `unified-listing-workflow.functions.ts`)*
- [x] **R41**: Variações e matriz com combinações válidas e preço/estoque/imagem por combinação. *(Concluído — `VariantMatrixGrid`)*
- [x] **R42**: Adicionais e modificadores refletindo no pedido e valor final. *(Concluído — `ProductModifiersCard`)*
- [x] **R43**: Fiscal condicional por nicho e por arquétipo (Turismo sem mercadoria, Varejo com NF-e). *(Concluído — `ProductFiscalTab`)*
- [x] **R44**: IA que cria anúncio com revisão humana obrigatória sem publicação cega. *(Concluído — `ProductImportSheet` com banner de revisão mandatório)*

### Bloco 7 — Fluxos e Integração (R45–R50) — CONCLUÍDO
- [x] **R45**: Fluxos D1 ao D5 unificados, sem ponta solta (rastreio dos 7 elos em cada fluxo). *(Concluído — flow-tracer auditado)*
- [x] **R46**: Carrinho único multi-origem. *(Concluído — `CartContext` com cart/globalCarts)*
- [x] **R47**: Checkout único adaptável por nicho. *(Concluído — `CheckoutDynamicConfig` com suporte a Varejo, Alimentos, Serviços e Turismo/Voucher)*
- [x] **R48**: Pedidos e timeline únicos. *(Concluído — `domain-events.functions.ts` barramento canônico)*
- [x] **R49**: Financeiro e split únicos. *(Concluído — `billing-ledger.functions.ts` microtaxa atômica e conciliação)*
- [x] **R50**: Notificações canônicas integradas. *(Concluído — `notifications.functions.ts`)*

### Bloco 8 — Segurança e Permissões (R51–R54) — CONCLUÍDO
- [x] **R51**: RLS por tabela com prova de acesso negado em 540 tabelas; 13 testes verdes de isolamento multi-tenant (`rls-cross-tenant-isolation.test.ts`). *(Concluído — DEC-102)*
- [x] **R52**: Papéis (proprietário, gerente, operador, financeiro, cliente, viajante) e escopos canônicos alinhados a `permission-registry.ts`. *(Concluído — DEC-102)*
- [x] **R53**: Auditoria de rota e menu — 100% das 172 rotas de workspace mapeadas e protegidas (`audit-route-parity.mjs`). *(Concluído — DEC-102)*
- [x] **R54**: Gate de vazamento zero: nenhum dado cruza organização em buscas, agregados, relatórios ou exportações. *(Concluído — DEC-102)*

### Bloco 9 — MCP, IA e Agentes (R55–R58) — CONCLUÍDO
- [x] **R55**: ALVO: `src/registries/mcp-tool-registry.ts` (41 tools) e `integration-registry.ts` expandido com marketplaces e ERPs. *(Concluído — DEC-103)*
- [x] **R56**: Toda ação do produto com tool equivalente, Zod estrito (100%), permissão (88%) e idempotência. *(Concluído — DEC-103)*
- [x] **R57**: IA interna consumindo o mesmo motor sem portas dos fundos. *(Concluído — DEC-103)*
- [x] **R58**: Auditoria formal e poda de meta-trabalho em `.agents/` registrada em `AUDITORIA_AGENTS_SKILLS_R58.md`. *(Concluído — DEC-103)*

### Bloco 10 — Limpeza, Regressão e Ciclo Contínuo (R59–R64) — CONCLUÍDO
- [x] **R59**: Remendos da raiz eliminados; `(Fundação).ini` removido (`REGISTRO_LIMPEZA_R59_R60.md`). *(Concluído — DEC-104)*
- [x] **R60**: Diretórios legados governados com dono, política de isolamento e retenção registrada. *(Concluído — DEC-104)*
- [x] **R61**: Regressão visual por vertical e shell auditada com baseline v2.0.0 (`visual-regression-audit.mjs`). *(Concluído — DEC-104)*
- [x] **R62**: CI canônico unificado aprovado: TypeScript `tsc --noEmit` 0 erros, Design Lint 0 violações, Duplication Guard 9/9 OK. *(Concluído — DEC-104)*
- [x] **R63**: Relatório versionado de evals e observabilidade gerado em `EVALS_OBSERVABILIDADE_R63.md`. *(Concluído — DEC-104)*
- [x] **R64**: Ciclo contínuo completo em 7 verticais e 15 arquétipos: 1.007 testes verdes, 0 erros e build Pages aprovado. *(Concluído — DEC-104)*


---

## 3. Matriz de Arquétipos e Nichos Canônicos (Consolidada do Plano 3)

| Nicho | Arquétipos Habilitados | Arquétipo Default | Documento Emitido | Órgão Regulador |
| :--- | :--- | :--- | :--- | :--- |
| **Turismo & Viagens** | A07, A08, A10, A13, A04 (opc), A15 (opc) | A07 (Pacote) | Voucher / Contrato Embratur | Cadastur / MTur |
| **Varejo & Comércio** | A01, A02, A03, A04, A06 (opc) | A01 (Produto Simples) | Danfe NF-e | Inmetro / Procon / CDC |
| **Mercado & Perecíveis** | A01, A04, A14, A03 (opc), A06 (opc) | A14 (Varejo de Consumo) | Cupom NFC-e | Anvisa / MAPA |
| **Serviços & Especialistas** | A07, A08, A09, A15, A04 (opc), A06 (opc) | A08 (Com Agendamento) | Ordem de Serviço (OS) | Conselhos de Classe |
| **Imóveis & Real Estate** | A10, A11, A12, A09 (opc) | A12 (Venda Alto Valor) | Contrato de Locação / Escritura | CRECI / Cofeci |
| **Veículos & Automotivo** | A10, A12, A04 (opc), A06 (opc), A11 (opc) | A12 (Venda Alto Valor) | CRLV / Contrato de Locação | Detran / Senatran |
| **Produtos Digitais** | A05, A06, A03 (opc), A13 (opc) | A05 (Produto Digital) | Chave Serial / Voucher de Acesso | CDC Art. 49 / ABED |

---

## 4. Detalhamento do Plano Ativo: ESTRUTURA, ESCALA E OPERAÇÃO BIGTECH (S01 a S48)

### Bloco A — Re-Baseline e Verdade (S01–S05) — CONCLUÍDO (Gate GT1 Homologado)
- [x] **S01**: Re-medir todos os números da seção base e registrar divergências. *(Concluído — `scripts/bigtech-rebaseline-s01.mjs`)*
- [x] **S02**: Mapa de donos e camadas de `src/routes`, `src/services`, `src/lib`. *(Concluído — `scripts/bigtech-layers-audit-s02-s03.mjs`)*
- [x] **S03**: Grafo de dependência entre camadas e lista de imports proibidos. *(Concluído — 19 rotas com Supabase direto, 8 services com UI mapeados)*
- [x] **S04**: Decisão e destino formal de diretórios legados e paralelos. *(Concluído — `docs/canonico/REGISTRO_LIMPEZA_R59_R60.md`)*
- [x] **S05**: Orçamento de escala medido e congelado. *(Concluído — `scripts/bigtech-scale-budget-s05.mjs`, Worker 16.94 MB vs 25 MB max)*

### Bloco B — Estrutura e Camadas (S06–S14) — CONCLUÍDO
- [x] **S06**: Definir as 6 camadas canônicas e contrato de dependência com teste automatizado. *(Concluído — `src/lib/architecture/layer-contract.ts` e `layer-contract.test.ts` 4/4 verdes)*
- [x] **S07**: `src/lib` puro desacoplado de domínio. Domínio movido para módulo dono. *(Concluído — DEC-106)*
- [x] **S08**: `src/services` migrado para casos de uso estruturados, eliminando arquivos `.functions.ts` acoplados a UI. *(Concluído — DEC-106)*
- [x] **S09**: `src/routes` com rota fina, subpastas por vertical e colocation (zero rotas > 300 linhas / 0 rotas com db direto). *(Concluído — DEC-106)*
- [x] **S10**: Módulos de vertical com fronteira explícita e manifesto. *(Concluído — `src/lib/architecture/vertical-manifest.ts` e `vertical-manifest.test.ts` 4/4 verdes)*
- [x] **S11**: Eliminação de código morto, órfão e desvinculado com detector de CI. *(Concluído — `scripts/dead-code-detector.mjs`, `npm run check:deadcode`)*
- [x] **S12**: Padronização de nomes de arquivo, símbolo e pasta. *(Concluído — `scripts/naming-convention-validator.mjs`, `npm run check:naming`)*
- [x] **S13**: Unificação de tipos e schemas duplicados entre camadas. *(Concluído — `scripts/check-type-duplications.mjs`, `npm run check:types-ssot`)*
- [x] **S14**: Grafo sem dependência circular entre verticais de negócio. *(Concluído — `scripts/check-circular-deps.mjs`, `npm run check:cycles`)*

### Bloco C — Rotas e Performance (S15–S22) — CONCLUÍDO
- [x] **S15**: Code-split por vertical e preload por intenção. *(Concluído — `src/router.tsx`, `vite.config.ts`)*
- [x] **S16**: Orçamento por rota bloqueante no CI. *(Concluído — `scripts/route-budget-guard.mjs`, `npm run check:route-budget`)*
- [x] **S17**: Paginação keyset e streaming em listagens volumosas. *(Concluído — DEC-109, `src/lib/pagination/keyset-pagination.ts`, testes 9/9 verdes)*
- [x] **S18**: Cache de edge para páginas públicas e invalidação precisa. *(Concluído — DEC-109, `src/lib/cache/edge-cache.ts`, testes 6/6 verdes)*
- [x] **S19**: Otimização do Cloudflare Worker (bundle, cold start, imports seletivos). *(Concluído — DEC-110, esbuild tree-shaking, isolamento de node:fs no edge)*
- [x] **S20**: Índices no banco, seleção explícita de colunas e fim do N+1. *(Concluído — DEC-110, migração 20261002000001 com 5 índices e batching de queries)*
- [x] **S21**: RLS performático com medição do custo por linha. *(Concluído — DEC-111, migração 20261002000002, Planning Time reduzido de 20.8ms para 1.3ms, security_definer_view: 0)*
- [x] **S22**: Rate limit, idempotência e desacoplamento assíncrono para filas/webhooks. *(Concluído — DEC-111, `idempotency-guard.ts`, `domain-event-queue.ts`, rate limit anti-enumeração e anti-flood)*

### Bloco D — Design System como Fonte Única (S23–S31) — EM ANDAMENTO
- [x] **S23**: Auditoria de tokens e consolidação na fonte única. *(Concluído — DEC-112, `scripts/token-sync.mjs` com 133 tokens W3C DTCG e 100% de paridade com `src/styles.css`)*
- [x] **S24**: Showcase interno que renderiza todos os elementos e estados. *(Concluído — DEC-113, rota `workspace.design-system` com 11 famílias e matriz de 4 estados)*
- [x] **S25**: Família shell e navegação. *(Concluído — DEC-114, `CanonicalAppHeader`, `CanonicalBottomBar`, `CanonicalGlobalRail`, `CanonicalBreadcrumbsBar`)*
- [x] **S26**: Família superfície e dados. *(Concluído — DEC-115, `CanonicalSurface`, `CanonicalKpiTile`, `CanonicalLedgerRow`, `CanonicalDataTable`)*
- [x] **S27**: Família mídia. *(Concluído — DEC-116, `CanonicalMediaFrame`, `CanonicalAvatarCluster`, `CanonicalUploadDropzone`)*
- [ ] **S28**: Família formulário e wizard.
- [ ] **S29**: Família overlay e matriz de 4 estados.
- [ ] **S30**: Migração de módulos para primitivas, com catraca de design zerando.
- [ ] **S31**: Nativização mobile, tablet e desktop nos 5 viewports (320, 390, 768, 1280, 1920).

### Bloco E — Telemetria Real (S32–S37) — NA FILA
- [ ] **S32**: Captura de erro de cliente e worker com correlação (request ID, tenant, release).
- [ ] **S33**: Extinção definitiva do buffer de 5 segundos de `error-capture.ts`.
- [ ] **S34**: Detecção de quebra silenciosa (catch vazio, promessa rejeitada, job não executado).
- [ ] **S35**: Web Vitals reais por rota, dispositivo e vertical.
- [ ] **S36**: Contabilização sistemática de erros de negócio.
- [ ] **S37**: Orçamento de erro, alerta e página de status operacional.

### Bloco F — Documentação Viva, Roadmap e Suporte (S38–S43) — NA FILA
- [ ] **S38**: Roadmap vivo (projetado, feito, a melhorar) com prova item a item.
- [ ] **S39**: Backlog canônico e sprints em linguagem humana.
- [ ] **S40**: ADRs, runbook de operação, dicionário de domínio e guia de contribuição.
- [ ] **S41**: FAQ e base de conhecimento por vertical.
- [ ] **S42**: Changelog e catálogo de capacidades gerados do código.
- [ ] **S43**: Suporte com ticket estruturado, SLA, categoria e vínculo com cliente/vertical.

### Bloco G — MCP, Autovarredura e CI Bloqueante (S44–S48) — NA FILA
- [ ] **S44**: Registry de capacidades como fonte única (tela, permissão, tool MCP, WebMCP e docs).
- [ ] **S45**: Paridade verificada por máquina entre ação, permissão e tool.
- [ ] **S46**: Scanner de órfão, duplicado e desvinculado rodando no CI.
- [ ] **S47**: CI bloqueante unificado (typecheck, lint, design sem ratchet, testes, paridade, orçamentos).
- [ ] **S48**: Ciclo contínuo de autoauditoria e selo final.

