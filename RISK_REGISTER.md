# RISK_REGISTER.md — Registro Canônico de Riscos

| ID | Categoria | Descrição | Impacto | Mitigação Adotada | Status |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **R-01** | Segurança | Prompt injection em páginas capturadas por scrapers | Alto | Extrator mecânico limpa scripts e tags ativas; dados tratados como não-executáveis | Mitigado |
| **R-02** | Multi-Tenant | Tentativa de vazamento de dados entre lojistas vizinhos | Crítico | RLS Deny-by-Default + asserção server-side `assertStoreAccess` | Mitigado |
| **R-03** | Resiliência | Queda ou rate limit em provedores de IA | Médio | Model Gateway com failover automático (Groq / OpenRouter) | Mitigado |
| **R-04** | Integridade | Publicação de dados sintéticos ou mocks no feed civil | Crítico | Invariante M01 estrita: fontes 100% autênticas (PNCP, BCB, OSM) | Mitigado |
| **R-05** | Performance | Travamento de workers por excesso de páginas em fila | Médio | Throttling por domínio via circuit breaker e limite por lote | Mitigado |
