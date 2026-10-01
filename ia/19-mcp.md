# RELATÓRIO NORMATIVO DE EXECUÇÃO: PROMPT 19 — MCP E WEBMCP

**ID da Decisão**: DEC-035  
**Data**: 2026-10-01  
**Responsável**: Conselho Executivo de Engenharia Waesy  
**Status**: 100% Concluído e Auditado  

---

## 1. RELATÓRIO EXECUTIVO (8 LINHAS)

1. **Módulo Alvo**: Protocolo WebMCP & MCP Server (Superfície Autônoma para Outras IAs).
2. **Tools Antes e Depois**: 13 ferramentas manuais (3% cobertura) ➔ 28 ferramentas derivadas declarativamente do SSOT Registry.
3. **Cobertura por Módulo**: 14 módulos críticos cobertos (Catálogo, Diretório, Logística/WMS, Pedidos, Agendamento, Turismo, Propostas, Contratos, Financeiro/Caixa, RH, Marketing/SimLab, Fiscal, Integrações, Suporte/RMA).
4. **Isolamento e Segurança Multi-Tenant**: Deny-by-default estrito (`assertStoreAccess`), impedindo cross-tenant com 403 Forbidden imediato e registro append-only em `system_audit_logs`.
5. **Conformidade de Protocolo**: Suporte completo a Tools (28), Resources (4) e Prompts (3) com manifestos WebMCP (`/api/webmcp.json`), OpenAPI 3.1 (`/api/openapi.json`) e MCP Discovery (`/.well-known/mcp.json`).
6. **Descoberta e Indexação por Agentes**: Implementado padrão `public/llms.txt` e diretrizes de autorização específicas para crawlers de IA (GPTBot, ClaudeBot, PerplexityBot) em `robots.txt`.
7. **Verificação Automatizada**: 13/13 testes unitários Vitest verdes (39/39 globais), zero regressões na catraca de design lint (`38.447` violações mantidas), typecheck 100% limpo.
8. **Próximo Módulo da Fila**: Prioridade 17 — Plano #28 (PROMPT 21: Shell de Conversa AI-First).

---

## 2. FASE A — INVENTÁRIO E ANÁLISE DE COBERTURA

### 2.1 As 13 Ferramentas Manuais Originais
| # | Nome Original | Tier | Permissão Exigida | RLS Respeitada | Idempotente | Limite / Bucket |
|---|---|---|---|---|---|---|
| 1 | `search_catalog_products` | public | `public:read` | Sim (published) | Sim | `webmcp_tool_call_public` |
| 2 | `get_store_directory_info` | public | `public:read` | Sim (stores) | Sim | `webmcp_tool_call_public` |
| 3 | `check_delivery_coverage` | public | `public:read` | Sim (público) | Sim | `webmcp_tool_call_public` |
| 4 | `query_master_catalog` | public | `public:read` | Sim (master) | Sim | `webmcp_tool_call_public` |
| 5 | `simlab_run_survey` | store_staff | `store:analytics:read` | Sim (storeId) | Não | `webmcp_batch_dispatch` |
| 6 | `generate_marketing_post` | store_staff | `store:marketing:write` | Sim (storeId) | Não | `webmcp_batch_dispatch` |
| 7 | `generate_ad_campaign_proposal` | store_staff | `store:marketing:write` | Sim (storeId) | Não | `webmcp_tool_call_staff` |
| 8 | `analyze_competitor_dna` | store_staff | `store:analytics:read` | Sim (storeId) | Sim | `webmcp_tool_call_staff` |
| 9 | `update_product_stock` | store_staff | `store:catalog:write` | Sim (store_id) | Sim | `webmcp_tool_call_staff` |
| 10 | `wms_list_pending_orders` | store_staff | `store:orders:read` | Sim (store_id) | Sim | `webmcp_tool_call_staff` |
| 11 | `fiscal_get_invoice_status` | store_staff | `store:fiscal:read` | Sim (store_id) | Sim | `webmcp_tool_call_staff` |
| 12 | `marketplaces_get_sync_health` | store_staff | `store:integrations:read` | Sim (store_id) | Sim | `webmcp_tool_call_staff` |
| 13 | `pos_get_cash_status` | store_staff | `store:pos:read` | Sim (store_id) | Sim | `webmcp_tool_call_staff` |

**Cobertura Inicial**: 13 ferramentas isoladas cobriam apenas ~3% das 381 rotas da plataforma. Módulos centrais como turismo, propostas comerciais, contratos digitais, agendamento de serviços, rastreamento logístico em tempo real, suporte/RMA e RH permaneciam sem superfície para agentes autônomos.

---

## 3. FASE B — TOOLS DERIVADAS DO REGISTRY

Criado `src/registries/mcp-tool-registry.ts` como Fonte Única da Verdade (SSOT). Toda ferramenta passa a ser declarada com:
- `module`: Vínculo semântico de domínio
- `permission`: Par semântico `{ action, resource }` compatibilizado com `src/registries/permission-registry.ts`
- `idempotent`: Sinalização determinística para agentes de IA
- `rateLimitBucket`: Categoria de sentinela contra negação de serviço
- `inputZodSchema` & `inputSchema`: Validação tipada em dois níveis
- `handler`: Executor escopado pelo contexto da sessão e tenant

### Matriz Completa das 28 Ferramentas Canônicas
1. `search_catalog_products` (catalog, public)
2. `query_master_catalog` (catalog, public)
3. `catalog_get_product_details` (catalog, public)
4. `catalog_list_categories` (catalog, public)
5. `update_product_stock` (catalog, store_staff, idempotent)
6. `get_store_directory_info` (directory, public)
7. `directory_list_featured_stores` (directory, public)
8. `check_delivery_coverage` (logistics, public)
9. `wms_list_pending_orders` (logistics, store_staff)
10. `logistics_track_shipment` (logistics, public)
11. `orders_get_order_details` (orders, store_staff)
12. `orders_update_order_status` (orders, store_staff, idempotent)
13. `scheduling_list_available_slots` (scheduling, public)
14. `tourism_get_trip_manifest` (tourism, store_staff)
15. `tourism_list_proposals` (tourism, store_staff)
16. `proposals_list_store_proposals` (proposals, store_staff)
17. `contracts_get_contract_status` (contracts, store_staff)
18. `pos_get_cash_status` (financial, store_staff)
19. `financial_get_cash_flow_summary` (financial, store_staff)
20. `hr_list_team_members` (hr, store_staff)
21. `simlab_run_survey` (simulation, store_staff)
22. `generate_marketing_post` (marketing, store_staff)
23. `generate_ad_campaign_proposal` (marketing, store_staff)
24. `analyze_competitor_dna` (marketing, store_staff)
25. `fiscal_get_invoice_status` (fiscal, store_staff)
26. `marketplaces_get_sync_health` (integrations, store_staff)
27. `support_list_active_threads` (support, store_staff)
28. `support_get_rma_case_status` (support, store_staff)

---

## 4. FASE C — AUTORIZAÇÃO, ISOLAMENTO E AUDITORIA APPEND-ONLY

1. **Contexto Autenticado e RLS Inviolável**:
   - Ferramentas `store_staff` requerem `storeId` explícito e validação via `assertStoreAccess(identity, STAFF_ROLES, storeId)`.
   - Violações de acesso entre empresas (cross-tenant) disparam status `403 Forbidden` sem vazar a existência do recurso.
   - Em chamadas públicas, dados sensíveis (margens, telefones privados, documentos de clientes) são estritamente mascarados ou omitidos.
2. **Rate Limiting Anti-Abuso**:
   - Sentinela de taxa de requisição por IP em ferramentas públicas (`webmcp_tool_call_public`).
   - Sentinela por loja em ferramentas de staff (`webmcp_tool_call_staff`).
   - Cota especial para disparos em lote pesados (`webmcp_batch_dispatch`).
3. **Auditoria Append-Only em `system_audit_logs`**:
   - Toda execução é telemetrada com latência, status, tier, validação de tenant e identificador do chamador no subsistema `'webmcp'`.

---

## 5. FASE D — PROTOCOLO MCP: RESOURCES E PROMPTS

O servidor passa a cumprir formalmente a especificação do Model Context Protocol:
- **Resources Manifest (`MCP_RESOURCES_MANIFEST`)**:
  - `store://{storeId}/catalog` (JSON com produtos publicados e estoques)
  - `store://{storeId}/financial-summary` (Resumo consolidado de faturamento e caixa)
  - `store://{storeId}/tourism-manifest` (Manifesto geral de viagens e passageiros)
  - `public://directory/cities` (Lista de cidades integradas ao Diretório)
- **Prompts Manifest (`MCP_PROMPTS_MANIFEST`)**:
  - `customer_inquiry_assistant`: Prompt padrão de triagem de atendimento com catálogo e pedidos.
  - `product_recommendation_prompt`: Prompt para recomendações contextuais de compras.
  - `tourism_trip_briefing`: Prompt pré-embarque para passageiros e guias.
- **Endpoints Sincronizados**:
  - `/api/webmcp.json`: Manifesto dinâmico com capabilities `{ tools: true, resources: true, prompts: true }`.
  - `/api/openapi.json`: Especificação OpenAPI 3.1 canônica com schemas para todas as ferramentas.

---

## 6. FASE E — DESCOBERTA E INDEXAÇÃO AUTÔNOMA

- `public/llms.txt`: Criado arquivo padronizado de instruções e arquitetura para LLMs e agentes autônomos.
- `public/.well-known/mcp.json`: Criado manifesto de descoberta automática para clientes compatíveis (Cursor, Claude, Windsurf).
- `public/robots.txt`: Configurado com permissões expressas para `GPTBot`, `ClaudeBot`, `PerplexityBot` e `Google-Extended` nos manifestos públicos.

---

## 7. EVIDÊNCIA DE VERIFICAÇÃO AUTOMATIZADA

- **Testes Vitest**: `cmd /c npx vitest run src/services/mcp-server.test.ts`
  - 13/13 testes aprovados com 100% de sucesso.
- **Suite Geral de Serviços**: 39/39 testes aprovados (RMA Forense, Vertical AI Modules, AI Quality Evaluator, MCP Server).
- **Catraca de Design Lint**:
  - Total de Violações: 38.447 (Zero regressões).
  - Exit Code: 0 (`CATRACA APROVADA`).
