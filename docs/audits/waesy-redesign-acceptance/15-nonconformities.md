# 15 — Catálogo de Não Conformidades (NC-001 a NC-010)

O catálogo completo com dependências e evidências está registrado em [nonconformities.csv](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/audits/waesy-redesign-acceptance/nonconformities.csv).

| ID | Módulo | Severidade | Descrição do Problema | Ação Corretiva Exigida |
| :--- | :--- | :--- | :--- | :--- |
| **NC-001** | Operações / Pedidos | P1 | Cabeçalho legado `PageHeader` ocupando 120px | Migrar para `WorkspaceCanonicalToolbar` |
| **NC-002** | Atendimentos / Agenda | P1 | Header legado com classes inline | Migrar para `WorkspaceCanonicalToolbar` |
| **NC-003** | Vendas / Catálogo | P2 | Ausência de seletor de visualização (Kanban/Cards) | Adotar `UniversalViewManager` |
| **NC-004** | Financeiro / Caixa | P1 | Containeritis explícito (cards aninhados em cards) | Adotar `KpiMetricCard` soberano |
| **NC-005** | Fiscal / NF-e | P0 | Omissão silenciosa de falha fiscal sem token | Criar registro pendente em `fiscal_events_queue` |
| **NC-006** | Agenda / Caixa | P1 | Concluir agendamento não gera recebível | Disparar hook de recebível no status `completed` |
| **NC-007** | Marketing / Anúncios | P2 | Checkouts abandonados permanecem em promoção | Criar cron de auto-expiração de 24h |
| **NC-008** | SimLab / Catálogo | P2 | Insights de IA desconectados de mutação real | Implementar ação de aplicar sugestão ao catálogo |
| **NC-009** | Vitrines / Destaques | P2 | Barra de categorias móvel sem snap elástico | Adicionar classes canônicas de snap scroll |
| **NC-010** | Navegação / Sidebar | P1 | Menus de outros nichos expostos na sidebar | Filtrar estritamente via `getNicheManifest` |
