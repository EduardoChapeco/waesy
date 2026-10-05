# Onda 22 — Pesquisa de Padrões e Referências Públicas

## 1. Mapeamento de Referências de Mercado

| Referência | Padrão Analisado | Licença | Aplicação no Waesy |
| :--- | :--- | :---: | :--- |
| **Crawlee (Apify)** | Roteamento polimórfico HTTP vs. Browser com autoscaling de fila | Apache 2.0 | Inspirou o desacoplamento de `crawler-batch-engine.ts` e o isolamento de circuit breakers por domínio. |
| **OCRmyPDF** | Camada textual pesquisável com deskew e validação de qualidade | MPL-2.0 | Modelo de referência para a pipeline de ingestão de editais em PDF (extrair nativo antes de OCR). |
| **Temporal.io** | Execução durável de workflows com estado recuperável e compensação | MIT | Padrão replicado na tabela `crawl_queue` e no orquestrador do copilot com máquina de estados. |
| **OpenSearch Hybrid Search** | Combinação de BM25 lexical com embeddings vetoriais via Reciprocal Rank Fusion | Apache 2.0 | Padrão adotado na busca global (`search.functions.ts`), combinando `tsvector` do Postgres com `pgvector`. |
| **Manus Agent Loop** | Loop autônomo de intenção -> plano -> ferramentas -> observação -> entrega | Padrão Conceitual | Replicado em `autonomous-copilot-orchestrator.ts` com telemetria de passos e artefatos vivos. |
