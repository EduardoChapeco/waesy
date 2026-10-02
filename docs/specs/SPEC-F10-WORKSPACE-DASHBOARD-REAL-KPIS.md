# SPEC-F10: Workspace — Dashboard com KPIs Reais do Banco de Dados (Zero Mocks)

## 1. Metadados e Controle Normativo
- **Fase:** F10 (Workspace Pro: Dashboard Operacional com KPIs Reais).
- **Plano:** Plano Mestre de Estabilização e Desentrelaçamento dos 4 Pilares.
- **Autoridade:** BigTech Executive Board & Red Team.
- **Invariantes:** M01 (Zero Mocks / Zero Hardcode), M02 (SSR / Hidratação Limpa), M03 (Auditabilidade Transacional), M10 (Isolamento Multi-Tenant: Tenant estrito via `assertStoreAccess`), WCAG 2.2 AA.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F10-01] Agregação e Carregamento de Métricas Reais do Supabase
- **EARS (Quando acionado):** QUANDO o operador acessar o Dashboard do Workspace (`/workspace` ou `/workspace/dashboard`), O SISTEMA DEVE carregar métricas consolidadas calculadas em tempo real na camada BFF Server Function (`getWorkspaceDashboardKpisFn`), abrangendo:
  1. **Vendas e Pedidos:** Total de pedidos no período (hoje, 7 dias, 30 dias), ticket médio e receita bruta acumulada na tabela `orders`.
  2. **Catálogo de Produtos:** Contagem exata de produtos ativos, esgotados e sob encomenda na tabela `products`.
  3. **Clientes e CRM:** Total de clientes únicos atendidos e novas captações na tabela `customers_crm`.
  4. **Fluxo Financeiro:** Entradas e saídas consolidadas de caixa no período.

### [REQ-F10-02] Isolamento Estrito Multi-Tenant
- **EARS (Ubíquo):** A Server Function DEVE verificar a identidade do operador (`getServerIdentity`) e aplicar `assertStoreAccess(identity, storeId)` garantindo que os agregados reflitam exclusivamente a loja ativa, sem risco de vazamento de dados entre empresas concorrentes.

### [REQ-F10-03] Apresentação Canônica e Silent Design
- **EARS (Ubíquo):** O painel DEVE renderizar `KpiTile` canônicos com tipografia tabular (`tabular-nums`), rótulos concisos (máx 3 palavras), variação percentual honesta em relação ao período anterior (ou badge neutro se sem histórico) e alvos de toque >= 44px.

### [REQ-F10-04] Matriz Completa de Estados
- **EARS (Ubíquo):** O Dashboard DEVE tratar os 4 estados:
  1. **Loading:** Skeletons dos tiles de KPI preservando dimensões exatas para evitar Cumulative Layout Shift (CLS < 0.05).
  2. **Empty:** Quando uma loja recém-criada não tiver pedidos ou clientes, exibir valor zero com badge orientador ("Aguardando primeiros pedidos") sem crashes ou valores undefined.
  3. **Error:** Feedback gracioso com botão tátil de recarregar em caso de falha de conexão.
  4. **Dados:** Gráficos e números reais consolidados.

---

## 3. Critérios de Aceite e Métricas
1. `src/services/workspace-dashboard.functions.ts` criado e exportando `getWorkspaceDashboardKpisFn`.
2. Suíte de testes unitários `src/services/workspace-dashboard.functions.test.ts` com cobertura de cálculo, tenant isolation e empty states.
3. Rota `src/routes/workspace.index.tsx` (ou dashboard correspondente) integrada com o BFF real sem mocks residuais.
4. `node scripts/design-lint.mjs --ratchet` Exit Code 0 (0 regressões visuais).
5. `npm run typecheck` Exit Code 0.
