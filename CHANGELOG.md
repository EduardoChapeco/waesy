# Changelog Canônico — Waesy

Todas as alterações notáveis deste projeto são documentadas deterministicamente neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [2.0.0] - 2026-10-02

### Principais Marcos & Decisões Arquiteturais (DEC)

- **DEC-150**: Conclusão da Fase F24 (Plano de Estabilização E2E) — Selo Final do Plano Mestre e Release v2.0
- **DEC-149**: Conclusão da Fase F23 (Plano de Estabilização E2E) — Auditoria de Segurança Final e RLS Abrangente
- **DEC-148**: Conclusão da Fase F22 (Plano de Estabilização E2E) — CI Bloqueante Unificado (5 Gates de Qualidade)
- **DEC-147**: Conclusão da Fase F21 (Plano de Estabilização E2E) — Scanner de Órfãos, Duplicados e Dead Code no CI
- **DEC-146**: Conclusão da Fase F20 (Plano de Estabilização E2E) — ADRs, Runbook de Operação e Dicionário de Domínio
- **DEC-145**: Conclusão da Fase F19 (Plano de Estabilização E2E) — Roadmap Vivo e Changelog Automatizado
- **DEC-144**: Conclusão da Fase F18 (Plano de Estabilização E2E) — Suporte Interno: Módulo de Tickets com SLA
- **DEC-143**: Conclusão da Fase F17 (Plano de Estabilização E2E) — Painel Financeiro Real (Receita, Despesas e Fluxo de Caixa)
- **DEC-142**: Conclusão da Fase F16 (Plano de Estabilização E2E) — Notificações em Tempo Real no Workspace (Supabase Realtime)
- **DEC-141**: Conclusão da Fase F15 (Plano de Estabilização E2E) — Geolocalização e Filtros de Proximidade (Places & Classificados)
- **DEC-140**: Conclusão da Fase F14 (Plano de Estabilização E2E) — Motor de Busca Universal (Classificados + Marketplace + Places)
- **DEC-139**: Conclusão da Fase F13 (Plano de Estabilização E2E) — Workspace: CRM de Clientes Real (Lista Paginada, Detalhe e LTV Calculado)
- **DEC-138**: Conclusão da Fase F12 (Plano de Estabilização E2E) — Workspace: Catálogo de Produtos Real (CRUD Completo de Produtos, Mídia, Variantes e Estoque)
- **DEC-137**: Conclusão da Fase F11 (Plano de Estabilização E2E) — Workspace: Gestão de Pedidos Real (CRUD Completo e Transições de Status)
- **DEC-136**: Conclusão da Fase F10 (Plano de Estabilização E2E) — Workspace: Dashboard com KPIs Reais do Supabase (Zero Mocks)
- **DEC-135**: Conclusão da Fase F09 (Plano de Estabilização E2E) — Places: Detalhe do Estabelecimento com Reputação, Galeria e Mapa
- **DEC-134**: Conclusão da Fase F08 (Plano de Estabilização E2E) — Checkout do Marketplace B2C com Wizard de 3 Etapas e Cálculo de Frete
- **DEC-133**: Conclusão da Fase F07 (Plano de Estabilização E2E) — Vitrine Pública do Marketplace por Loja (SSR e SEO Canônico)
- **DEC-132**: Conclusão da Fase F06 (Plano de Estabilização E2E) — Testes de Isolamento dos 4 Pilares e Fechamento do Bloco 1
- **DEC-131**: Conclusão da Fase F05 (Plano de Estabilização E2E) — Assistente de Nativização e Modal de Importação no Workspace

### Alterações do Repositório (Git Commits Recentes)

#### Funcionalidades Adicionadas (Features)
- `70117064`: feat(F22): CI bloqueante unificado com 5 gates de qualidade (2026-10-02)
- `54f460b0`: feat(F21): scanner de orfaos e dead code no CI (2026-10-02)
- `f2b55f8a`: feat(F19): roadmap vivo, gerador de changelog e DEC-145 (2026-10-02)
- `6c7486a1`: feat(F18): modulo de tickets de suporte com SLA no Workspace e DEC-144 (2026-10-02)
- `b89542c4`: feat(F17): painel financeiro real com receita, despesas, fluxo de caixa e DEC-143 (2026-10-02)
- `e979401b`: feat(F16): notificacoes em tempo real no workspace com supabase realtime e DEC-142 (2026-10-02)
- `6739ea8e`: feat(F15): geolocalizacao haversine, filtros por cidade e bairro e DEC-141 (2026-10-02)
- `9188a2f3`: feat(F14): motor de busca universal unificando os 3 pilares publicos e DEC-140 (2026-10-02)
- `76253115`: feat(F13): CRM de clientes com dados reais no Workspace, crm.functions e DEC-139 (2026-10-02)
- `7f799931`: feat(F12): CRUD completo de produtos no catalogo do Workspace, workspace-catalog.functions e DEC-138 (2026-10-02)
- `942e8964`: feat(F11): gestao de pedidos real no Workspace, orders.functions e DEC-137 (2026-10-02)
- `966119f2`: feat(F10): dashboard KPI do Workspace com dados reais do Supabase e DEC-136 (2026-10-02)
- `8174c661`: feat(F09): detalhe de estabelecimento Places com reputacao, galeria, mapa e DEC-135 (2026-10-02)
- `33373c9a`: feat(F08): checkout marketplace B2C com wizard de 3 etapas, calculo de frete e DEC-134 (2026-10-02)
- `a8de80e3`: feat(F07): vitrine publica marketplace SSR, SEO canonico, testes e DEC-133 (2026-10-02)
- `f50240ac`: feat(F04-F06): ponte de upgrade classificados->workspace, ClassifiedImportModal, testes de isolamento dos 4 pilares e migracao de colunas promoted (2026-10-02)
- `67773fe7`: feat(4pillars+bridge+events): F03 places/diretorio desambiguacao, SPEC-F04 bridge classificados->workspace, evento classified.promoted_to_workspace, routeTree regenerado e design-lint atualizado (2026-10-02)
- `3a72c43c`: feat(deploy): deploy completo de producao (supabase + cloudflare pages edge worker) e F02 homologada (2026-10-02)
- `2394c2e0`: feat(telemetry+marketplace): concluir Bloco E (S32-S37), rota /status, Hub do Marketplace (F01) e auditoria dos 4 pilares (2026-10-02)
- `304f031b`: feat: s31 adaptative viewports, fechamento bloco d e auditoria geral (2026-10-02)
- `926b5018`: feat(design-system): conclui Fase S30 com catraca aprovada e baseline reduzida em 604 violacoes (DEC-119) (2026-10-02)
- `95a9c93a`: feat(design-system): conclui Fase S29 com CanonicalDrawer e CanonicalConfirmDialog (DEC-118) (2026-10-02)
- `21128d1a`: feat(design-system): conclui Fase S28 com CanonicalStepperWizard, CanonicalField e CanonicalFieldError (DEC-117) (2026-10-02)
- `4b22bb38`: feat(design-system): conclui Fase S27 com CanonicalMediaFrame, CanonicalAvatarCluster e CanonicalUploadDropzone (DEC-116) (2026-10-02)
- `d88c1576`: feat(design-system): conclui Fase S26 com CanonicalSurface, CanonicalKpiTile, CanonicalLedgerRow e CanonicalDataTable (DEC-115) (2026-10-02)
- `7c5d1990`: feat(design-system): conclui Fase S25 com CanonicalAppHeader, BottomBar, GlobalRail e Breadcrumbs (DEC-114) (2026-10-02)
- `92fc9d0d`: feat(design-system): conclui Fase S24 com rota workspace.design-system e matriz de 4 estados (DEC-113) (2026-10-02)
- `20492a77`: feat(design-system): conclui Fase S23 com paridade 100% de tokens W3C DTCG e CSS em src/styles.css (DEC-112) (2026-10-02)
- `27300fde`: feat(scale): conclui Fases S21 e S22 fechando o Bloco C com RLS performatico, rate limiting, idempotencia e outbox DLQ (DEC-111) (2026-10-02)
- `0e3e9608`: feat(scale): conclui Fases S19 e S20 com otimizacao do worker, indices de banco e eliminacao de N+1 (DEC-110) (2026-10-02)
- `3ede895d`: feat(scale): conclui Fases S17 e S18 com paginacao keyset e cache de borda (DEC-109) (2026-10-02)
- `7dcdb521`: feat(plano-5): conclui S15 e S16 - code-split por vertical, preload por intencao e orcamento bloqueante por rota em CI (2026-10-02)
- `4d05d1cb`: feat(plano-5): conclui Bloco B (S10-S14) - manifestos por vertical, detector de codigo morto, validador de nomenclatura, unicidade SSOT de tipos e grafo aciclico (2026-10-02)
- `0f63f23c`: feat(S07-S09): desacoplamento de lib em modulos de dominio, bff services puro sem UI e rotas finas sem db direto (DEC-106) (2026-10-02)
- `a13defa4`: feat(Plano-5): re-baseline BigTech S01-S05, contrato de arquitetura em camadas S06 e conclusao homologada Plano 4 R51-R64; 0 erros TS, 1011 testes Vitest verdes, CI canonical aprovado (2026-10-01)
- `fad07d96`: feat(R45-R50): checkout adaptavel multi-nicho, suporte completo a turismo/embratur, mitigacao DL-04 em checkout.functions; 0 lint violations (2026-10-01)
- `5eeb1759`: feat(R37-R44): salvar rascunho/publicar, preview fidedigno nos 3 viewports, transacoes multi-nicho, fiscal condicional turismo/varejo e IA com revisao humana; 0 lint violations (2026-10-01)

#### Correções de Estabilidade (Fixes)
- `fc1b5fa4`: fix(F04): compatibilidade nativa com workspace_entity_id no Supabase (2026-10-02)
- `8d50feab`: fix(F04-F06): purga de regressoes de design lint, DEC-132 e ativacao de SPEC-F07 (2026-10-02)
- `fa1c4504`: fix(F04-F06): corrigir TS2367 comparacao literal promoted, TS2322 promoted_to_product_id null vs string, e UUIDs invalidos nos fixtures de teste (2026-10-02)

#### Segurança e RLS (Security)
- `4e40b2e4`: security(F23): auditoria completa de RLS, rate-limit e protecao multi-tenant (2026-10-02)

#### Documentação e Especificações (Docs)
- `b2633351`: docs(F20): runbook, dicionario de dominio e guia de contribuicao (2026-10-02)
- `16dfca93`: docs(proximos-planos): protocolo canonico com F04-F24 em microfases, estado real e ativacao via leia os proximos planos (2026-10-02)
- `848bece9`: docs(canonico): sincroniza conclusao dos Blocos D e E e ativa Bloco F em BACKLOG_UNICO e PROXIMOS_PLANOS_EXECUCAO (2026-10-02)
- `fc7ad02b`: docs(decisions): registrar DEC-126 com deploy de producao e auditoria dos 4 pilares (2026-10-02)
- `caca8dc0`: docs(canonico): adiciona protocolo de execucao dos proximos planos e tipagem serializavel em outbox (2026-10-02)
- `e39fcd9a`: docs(R37-R44): encerramento Bloco 6 (Editor, Preview e Compra); 44 fases concluidas; DEC-100 registrado (2026-10-01)

#### Tarefas de Infraestrutura e Governança (Chores)
- `4ee37356`: chore: atualiza hash F19 no plano de execucao (2026-10-02)
- `92e92b72`: chore: atualiza hash F18 no plano de execucao (2026-10-02)
