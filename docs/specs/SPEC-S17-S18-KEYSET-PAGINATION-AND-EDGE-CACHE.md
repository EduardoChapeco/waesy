# SPEC-S17-S18: Paginação Keyset, Streaming e Cache de Borda (Plano 5 — Bloco C)

## 1. Contexto e Auditoria da Fase Anterior (S15–S16)
- **Status Anterior:** Fases S15 e S16 concluídas e homologadas com code-split por vertical, `manualChunks` isolados no Vite, `defaultPreload: "intent"` no TanStack Router, guardião de orçamento de rotas `route-budget-guard.mjs` no CI, zero erros no typecheck e build Cloudflare Pages reduzido para 16.82 MB.
- **Auditoria do Estado Atual de Dados:**
  - A auditoria identificou que `_listOrders` e `_listAdminProducts` executavam queries sem cláusula `.limit()` no PostgreSQL, arriscando estourar memória em lojas com milhares de registros.
  - O catálogo público (`listPublishedProducts`) e vitrines públicas não expunham cabeçalhos explícitos de `CDN-Cache-Control` ou `s-maxage` com tags de invalidação precisa na borda.

---

## 2. Especificação EARS — Fase S17 (Paginação Keyset e Streaming)

### EARS-S17-01: Eliminação de Queries Ilimitadas nas Listagens Críticas
- **ONDE** endpoints de listagem de pedidos, produtos administrativos e transações forem invocados,
- **O SISTEMA DEVE** aplicar limites máximos seguros (`limit = 50`, teto de 100) e suporte a cursor keyset opaco (`encodeCursor` / `decodeCursor`),
- **PARA QUE** o tempo de resposta no banco permaneça constante $O(1)$ independente do volume total de linhas.

### EARS-S17-02: Retrocompatibilidade 100% com Componentes Visuais
- **ENQUANTO** componentes existentes consumirem `listOrders` ou `listAdminProducts` sem passar cursor,
- **O SISTEMA DEVE** retornar a lista ordenada dos itens da primeira página de forma transparente,
- **DE MODO QUE** nenhuma rota ativa do workspace ou PDV quebre ou requeira refatoração destrutiva imediata.

---

## 3. Especificação EARS — Fase S18 (Cache de Borda e Invalidação Precisa)

### EARS-S18-01: Perfis Canônicos de Cache HTTP na CDN
- **QUANDO** uma resposta pública de catálogo, cidades, termos ou vitrine for gerada,
- **O SISTEMA DEVE** anexar cabeçalhos padronizados de acordo com `EDGE_CACHE_PROFILES`:
  - `PUBLIC_STATIC`: `s-maxage=86400, stale-while-revalidate=604800`
  - `PUBLIC_DYNAMIC`: `s-maxage=300, stale-while-revalidate=3600`
  - `REALTIME_QUICK`: `s-maxage=15, stale-while-revalidate=60`
  - `PRIVATE_MUTABLE`: `private, no-cache, no-store, must-revalidate`
- **PARA QUE** 90%+ das requisições públicas de leitura sejam servidas na borda da Cloudflare sem atingir o banco de dados.

### EARS-S18-02: Tags de Invalidação Seletiva (Edge Purge Tags)
- **QUANDO** ocorrer uma mutação em produtos ou configurações de uma loja (`updateProduct`, `updateStoreSettings`),
- **O SISTEMA DEVE** invalidar o cache da CDN correspondente via tag de loja (`store:${storeId}`, `catalog:${storeId}`),
- **GARANTINDO QUE** o consumidor veja os dados atualizados imediatamente sem esperar a expiração do TTL.

---

## 4. Invariantes
- **INV-01:** Nenhuma rota ativa de produção quebrada (workspace, checkout, store).
- **INV-02:** Zero consultas ilimitadas sem teto nas Server Functions de listagem.
- **INV-03:** Preservação estrita das 153+ suítes de teste Vitest e zero erros no `tsc --noEmit`.

---

## 5. Critérios de Aceite
1. Motor `src/lib/pagination/keyset-pagination.ts` e testes unitários verdes (9/9).
2. Motor `src/lib/cache/edge-cache.ts` e testes unitários verdes (4/4).
3. `_listOrders` em `src/services/order.functions.ts` suportando paginação keyset com teto seguro.
4. `_listAdminProducts` em `src/services/admin-catalog.functions.ts` protegido com limite padrão.
5. Suíte de testes canônica e build de produção 100% aprovados.
