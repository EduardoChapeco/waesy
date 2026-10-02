# SPEC-F21 — Scanner de Orfaos, Duplicados e Dead Code no CI

## 1. Identificacao e Metadados
- **ID:** SPEC-F21-DEAD-CODE-DETECTOR
- **Fase:** F21 (Plano de Estabilizacao E2E — Governanca e Infraestrutura CI)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board
- **SSOT Relacionados:** `AGENTS.md`, `DESIGN-LINT.md`, `PROXIMOS_PLANOS_EXECUCAO.md`.

---

## 2. Contexto e Escopo Delimitado
O crescimento continuo do codebase requer mecanismos automatizados para impedir a proliferacao de codigo morto, componentes orfaos e duplicacoes silenciosas.
Esta especificacao define os requisitos para `scripts/dead-code-detector.mjs`:
1. **Analise de Grafo de Importacao:** Rastreamento deterministico de dependencias a partir dos entry points (rotas, router, shells e testes).
2. **Deteccao de Componentes Duplicados:** Mapeamento de nomes de componentes idênticos em caminhos concorrentes (`DuplicateComponentViolation`).
3. **Persistencia de Relatorio:** Gravacao estruturada em `dead-code.report.json`.
4. **Integracao CI:** Suporte a parametros `--ci`, `--json` e codigos de saida confiaveis.

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O detector SHALL inspecionar 100% dos arquivos `.ts` e `.tsx` sob o diretorio `src/`.
- **EARS-U02:** O detector SHALL gerar o arquivo `dead-code.report.json` contendo metricas consolidadas (`totalFiles`, `totalImported`, `unreferencedCount`, `duplicates`).
- **EARS-U03:** O detector SHALL ignorar barrels (`index.ts`), rotas TanStack (`routes/`), tipos (`types/`) e arquivos de teste como orfaos falsos-positivos.

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO executado com a flag `--ci`, O detector SHALL emitir sumario tabular e retornar Exit Code 0 caso nao existam duplicacoes graves de componentes nem orfaos bloqueantes.
- **EARS-E02:** QUANDO executado com `--json`, O detector SHALL persistir `dead-code.report.json` no formato UTF-8 identado.

---

## 4. Criterios de Aceite
- [x] Script `scripts/dead-code-detector.mjs` funcional e deterministico.
- [x] Geracao automatica de `dead-code.report.json`.
- [x] Identificacao de componentes duplicados.
- [x] Integracao ao CI na Fase F22.
- [x] `DEC-147` registrado em `docs/design/DECISIONS.md`.
