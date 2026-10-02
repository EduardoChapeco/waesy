# SPEC-S15-S16: Code-Split por Vertical, Preload por Intenção e Orçamento Bloqueante por Rota (Plano 5 — Bloco C)

## 1. Contexto e Auditoria da Fase Anterior (S14)
- **Status Anterior:** Fase S14 concluída com grafo 100% acíclico, zero dependências circulares entre verticais de negócio, 0 tipos duplicados (S13), 153/153 arquivos de teste Vitest aprovados (1.015 testes verdes), typecheck com 0 erros e build para Cloudflare Pages homologado.
- **Objetivo do Bloco C:** Iniciar a otimização de rotas e performance da plataforma Waesy com foco em Core Web Vitals, code-split determinístico por vertical e catraca de orçamento de rota em CI.

---

## 2. Especificação EARS — Fase S15 (Code-Split por Vertical e Preload por Intenção)

### EARS-S15-01: Preload por Intenção no Roteador Canônico
- **QUANDO** o usuário posicionar o cursor (hover) ou focar (focus) em qualquer `<Link>` do TanStack Router,
- **O SISTEMA DEVE** disparar o preload assíncrono do código do componente e dos dados do loader da rota correspondente com debounce de 50ms e cache de stale de 30s (`defaultPreload: "intent"`, `defaultPreloadDelay: 50`, `defaultPreloadStaleTime: 30000`),
- **PARA QUE** a transição de rota subsequente ocorra instantaneamente (< 50ms) sem layout shift ou spinners visíveis.

### EARS-S15-02: Isolamento de Chunks Pesados de Terceiros (Manual Chunks)
- **ENQUANTO** o bundler Vite compilar os assets para o cliente e worker,
- **O SISTEMA DEVE** isolar bibliotecas de grande porte (`maplibre-gl`, `jspdf`, `html2canvas`, `recharts`, `@radix-ui`) em chunks vendor dedicados,
- **DE MODO QUE** rotas leves de consumo e PDV não importem nem baixem código de mapas, PDFs ou canvas desnecessariamente.

---

## 3. Especificação EARS — Fase S16 (Orçamento por Rota Bloqueante no CI)

### EARS-S16-01: Verificação Determinística de Tamanho de Rota no CI
- **ONDE** a esteira de CI ou comando `npm run check:route-budget` for executada,
- **O SISTEMA DEVE** inspecionar todos os chunks de rotas em `dist/assets` e o Cloudflare Worker `dist/_worker.js`,
- **E O SISTEMA DEVE** verificar os limites de orçamento:
  - Rota de Entrada Crítica (`router-*.js`): <= 2.0 MB descompactado, <= 450 kB gzip.
  - Folha de Estilos Canônica (`styles-*.css`): <= 750 kB descompactado, <= 120 kB gzip.
  - Chunks Específicos de Rota (`_store.*.js`, `workspace.*.js`): <= 350 kB descompactado, <= 90 kB gzip por rota.
  - Bibliotecas de Terceiros Isoladas (`vendor-*.js`): <= 1.2 MB descompactado.
  - Cloudflare Worker (`dist/_worker.js`): <= 25.0 MB descompactado.

### EARS-S16-02: Bloqueio Estrito no CI para Regressões
- **SE** qualquer chunk de rota exceder seu orçamento definido sem autorização formal em `DECISIONS.md`,
- **O SISTEMA DEVE** interromper o pipeline com código de saída 1 (Fail Fast) e imprimir tabela detalhada com o excesso e a ação corretiva recomendada.

---

## 4. Invariantes
- **INV-01:** Nenhuma rota ativa de produção quebrada ou inacessível.
- **INV-02:** Zero introdução de novas bibliotecas sem justificativa arquitetural.
- **INV-03:** Preservação estrita das 153 suítes de teste Vitest e zero erros no `tsc --noEmit`.
- **INV-04:** Todas as saídas de scripts numéricos em tabela Markdown concisa.

---

## 5. Critérios de Aceite
1. `src/router.tsx` configurado com `defaultPreload: "intent"`, `defaultPreloadDelay: 50`, `defaultPreloadStaleTime: 30000`.
2. `vite.config.ts` configurado com `manualChunks` isolando bibliotecas pesadas de terceiros.
3. `scripts/route-budget-guard.mjs` criado e executável via `npm run check:route-budget`.
4. `npm run check:route-budget` integrado à suíte canônica `npm run check:canonical`.
5. 100% de aprovação no teste de orçamentos e build de produção.
