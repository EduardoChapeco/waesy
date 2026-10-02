# SPEC-S19-S20: Otimização do Worker e Índices de Banco de Dados (Plano 5 — Bloco C)

## 1. Contexto e Auditoria das Fases Anteriores (S17–S18)
- **Status Anterior:** Fases S17 e S18 homologadas com paginação keyset (`keyset-pagination.ts`), teto seguro de listagem, projeção explícita de colunas e cache de borda com perfis HTTP e expurgo seletivo (`edge-cache.ts`). DEC-109 registrado.
- **Diagnóstico do Estado Atual:**
  - O Cloudflare Worker (`dist/_worker.js`) possui 17.64 MB de código cru empacotando todo o SSR e `node_modules` sem minificação explícita no Nitro.
  - Arquivos de serviços importam módulos Node.js puros (`node:fs`) incompatíveis com o runtime edge da Cloudflare (`ai-quality-benchmark.functions.ts`, `ai-quality-evaluator.engine.ts`).
  - Vazamento de componentes de UI (`lucide-react`, `sonner`) em utilitários consumidos por serviços de backend puxa árvores de ícones para o bundle do worker.
  - Listagens volumosas de `orders`, `products`, `classifieds`, `customers_crm` e `events` realizam ordenação em memória por falta de índices compostos `(store_id, created_at DESC)` e `(status, created_at DESC)`.
  - Operações críticas em `checkout.functions.ts`, `cart.functions.ts`, `store.functions.ts` e `tourism.functions.ts` executam loops de queries unitárias (padrão N+1).

---

## 2. Especificação EARS — Fase S19 (Otimização do Cloudflare Worker)

### EARS-S19-01: Minificação e Otimização do Bundle Nitro
- **QUANDO** o build de produção (`npm run build`) for executado,
- **O SISTEMA DEVE** compilar o Cloudflare Worker através do Nitro com `minify: true` e `sourceMap: false`,
- **PARA QUE** o tamanho final do arquivo `dist/_worker.js` seja reduzido e o cold start na borda permaneça abaixo de 50ms.

### EARS-S19-02: Isolamento de APIs Nativas de Node no Edge
- **ENQUANTO** serviços executarem em ambiente serverless edge (Cloudflare Worker),
- **O SISTEMA DEVE** substituir leituras síncronas de arquivos `fs.readFileSync` por imports estáticos de JSON ou datasets em memória,
- **PREVENINDO** quebras de runtime `Cannot find module 'node:fs'` na borda da Cloudflare.

### EARS-S19-03: Desacoplamento de UI do Grafo de Backend
- **QUANDO** utilitários de semântica e rotas forem importados pela camada `src/services`,
- **O SISTEMA DEVE** expor contratos puramente textuais e agnósticos de ícones ou manipuladores visuais,
- **EVITANDO** que árvores completas de ícones SVGs e bibliotecas de toasts sejam inlinadas no worker.

---

## 3. Especificação EARS — Fase S20 (Índices de Banco e Eliminação de N+1)

### EARS-S20-01: Índices Compostos para Listagens Paginadas
- **ONDE** listagens frequentes com paginação keyset e filtros forem executadas,
- **O SISTEMA DEVE** dispor de índices compostos B-tree dedicados:
  - `idx_orders_store_created_at` em `orders(store_id, created_at DESC)`
  - `idx_products_store_status_created_at` em `products(store_id, status, created_at DESC)`
  - `idx_classifieds_status_created_at` em `classifieds(status, created_at DESC)`
  - `idx_customers_crm_store_created_at` em `customers_crm(store_id, created_at DESC)`
  - `idx_events_status_event_date` em `events(status, event_date ASC)`
- **GARANTINDO QUE** o plano de execução utilize Index Scan com custo $O(\log N)$ em vez de Seq Scan + Sort $O(N \log N)$.

### EARS-S20-02: Eliminação de Loops N+1 em Serviços Críticos
- **QUANDO** variantes de produtos, contagens de pedidos ou reservas forem manipuladas para múltiplos itens,
- **O SISTEMA DEVE** realizar consultas e inserções em lote utilizando `.in("id", ids)` ou batch array inserts,
- **PARA QUE** o número de round-trips ao banco de dados seja estritamente $O(1)$ por requisição.

---

## 4. Invariantes
- **INV-01:** Nenhuma rota ativa de produção quebrada (workspace, checkout, store).
- **INV-02:** Zero quebras de tipagem TypeScript (`npm run typecheck` com Exit Code 0).
- **INV-03:** Todas as 155 suítes de testes Vitest aprovadas (1.030+ testes verdes).
- **INV-04:** Zero violações nos 9 portões canônicos (`npm run check:canonical`).

---

## 5. Critérios de Aceite
1. `vite.config.ts` com minificação ativada no Nitro.
2. `node:fs` erradicado de `ai-quality-benchmark.functions.ts` e `ai-quality-evaluator.engine.ts`.
3. Migração `supabase/migrations/20261002000001_s20_scale_indexes.sql` criada com os 5 índices compostos.
4. Queries N+1 em `checkout.functions.ts`, `cart.functions.ts`, `store.functions.ts` e `tourism.functions.ts` refatoradas para lote.
5. Suíte de testes e CI canônico 100% verdes.
