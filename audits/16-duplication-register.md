# Onda 16 — Registro Canônico de Duplicações e Consolidação

## 1. Classificação de Itens Avaliados

Toda potencial duplicação é classificada rigorosamente para evitar proliferação de código morto ou lógica fragmentada:

| Componente / Módulo A | Componente / Módulo B | Classificação | Resolução / Justificativa |
| :--- | :--- | :--- | :--- |
| `ai-manus-orchestrator.ts` | `autonomous-copilot-orchestrator.ts` | `legacy` / `superseded` | **Consolidado:** `ai-manus-orchestrator.ts` foi removido; `autonomous-copilot-orchestrator.ts` é a SSOT do orquestrador. |
| `_legacyProcessCrawlQueueBatchInternal` | `executeCrawlQueueBatchDirect` | `dead_code` | **Consolidado:** Código legado em `mining.functions.ts` foi extirpado, mantendo a função desacoplada em `crawler-batch-engine.ts`. |
| `manus-and-harvest.test.ts` | `autonomous-copilot.test.ts` | `superseded` | **Consolidado:** Teste antigo substituído pela nova suíte de copilot autônomo com EARS e integridade. |
| `pncp-harvester.ts` | `pncp-extractor.ts` | `composable` | **Manter Separado:** O `harvester` faz o rastreio e busca por código de município; o `extractor` faz o parsing profundo de lotes e itens. |
| `places-harvester.ts` | `places-cnpj-cross-enricher.ts` | `composable` | **Manter Separado:** O primeiro obtém nós brutos do OSM (Overpass); o segundo cruza e enriquece com a Receita Federal (BrasilAPI). |
| `news.functions.ts` (city filter) | `jobs.functions.ts` (city filter) | `composable` | **Consolidado:** Ambos agora consomem o helper centralizado `resolveActiveCity` de `src/lib/city-helper.ts`. |
