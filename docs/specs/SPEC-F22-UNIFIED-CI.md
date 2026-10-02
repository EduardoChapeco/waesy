# SPEC-F22 — CI Bloqueante Unificado (5 Gates de Qualidade)

## 1. Identificacao e Metadados
- **ID:** SPEC-F22-UNIFIED-CI
- **Fase:** F22 (Plano de Estabilizacao E2E — Governanca e Infraestrutura CI)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board
- **SSOT Relacionados:** `AGENTS.md`, `DESIGN-LINT.md`, `PROXIMOS_PLANOS_EXECUCAO.md`, `CONTRIBUTING.md`.

---

## 2. Contexto e Escopo Delimitado
Para garantir integridade permanente contra regressoes tecnicas e visuais, a pipeline do GitHub Actions (`.github/workflows/ci.yml`) deve unificar os 5 portoes de qualidade:
1. **Gate 1:** TypeScript estrito (`npm run typecheck`, Exit Code 0).
2. **Gate 2:** Design Lint com catraca decrescente (`node scripts/design-lint.mjs --ratchet`, 0 P0/P1 adicionais).
3. **Gate 3:** Vitest Unit & Integration (`npm run test`, 0 falhas).
4. **Gate 4:** Compilacao Cloudflare Pages Edge Worker (`npm run build`, artefato `< 25MB`).
5. **Gate 5:** Detector deterministico de codigo morto e duplicacoes (`node scripts/dead-code-detector.mjs --ci`).

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O workflow CI SHALL disparar automaticamente a cada `push` e `pull_request` direcionados para a branch `main`.
- **EARS-U02:** O workflow CI SHALL rodar sob Node.js v20 com cache automatico de dependencias `package-lock.json`.
- **EARS-U03:** O workflow CI SHALL persistir artefatos dos relatorios de auditoria (`design-lint.report.json` e `dead-code.report.json`).

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO qualquer uma das 5 gates retornar Exit Code != 0, O pipeline SHALL falhar o status do commit e bloquear o merge do Pull Request.
- **EARS-E02:** QUANDO o job for concluido, O sistema SHALL expor sumario executivo das metricas no GitHub Step Summary.

---

## 4. Criterios de Aceite
- [x] Arquivo `.github/workflows/ci.yml` configurado com os 5 gates independentes.
- [x] Upload de relatorios como artefatos de build.
- [x] `DEC-148` registrado em `docs/design/DECISIONS.md`.
