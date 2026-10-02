# SPEC-S30: Migração de Módulos para Primitivas e Catraca Zerando (Plano 5 — Bloco D)

## 1. Identificação e Metadados
- **ID da Especificação:** SPEC-S30
- **Fase:** S30 (Plano 5 — Estrutura, Escala e Operação BigTech)
- **Módulo Alvo:** `src/components/design-system/`, `design-lint.baseline.json`, `docs/design/LINT_DASHBOARD.md`, `scripts/design-lint.mjs`
- **Autor / Agente:** Antigravity / BigTech Executive Board
- **Data:** 2026-10-02
- **Status:** Aprovada e Concluída

---

## 2. Contexto e Objetivos
A Fase S30 executa a consolidação das migrações do Design System para primitivas canônicas, impondo a **Catraca Estrita de CI (`--ratchet`)**:
- Erradicação de débitos visuais residuais nos novos componentes (`actions-family.tsx`, `design-system-header.tsx`, `state-card.tsx`).
- Redução permanente da baseline de violações do monorepo de 38.314 para 37.710 (-604 violações purgadas).
- Imposição de regra de catraca inviolável: nenhuma regressão visual pode ser adicionada ao projeto (`Zero regressões em relação à baseline congelada`).

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)

### 3.1 Requisitos Ubíquos (Sempre Ativos)
- [REQ-S30-U1]: O sistema SEMPRE deve exigir aprovação da catraca (`node scripts/design-lint.mjs --ratchet`) em todo ciclo de auditoria de CI, bloqueando merges com variação positiva de violações.
- [REQ-S30-U2]: Todos os arquivos sob `src/components/design-system/` SEMPRE devem possuir zero violações P0 e P1 no linter.

### 3.2 Requisitos Orientados a Evento (Quando... O sistema deve...)
- [REQ-S30-E1]: QUANDO o débito visual total for reduzido após refatoração e migração para primitivas canônicas, O sistema DEVE permitir atualização da baseline congelada para consolidar a redução.

---

## 4. Invariantes do Módulo
1. **Catraca Não Regressiva**: Proibido aumentar a baseline congelada (`design-lint.baseline.json`).
2. **Zero Violações Novas**: Todo novo componente deve entrar com 0 violações P0 e 0 violações P1.

---

## 5. Critérios de Aceite e Evidências
1. Zero violações em todos os componentes de `src/components/design-system/`.
2. Execução de `node scripts/design-lint.mjs --ratchet` retornando Exit Code 0 (CATRACA APROVADA).
3. Baseline atualizada de 38.314 para 37.710 violações (-604 violações).
4. Suíte de testes `design-system-showcase.test.ts` com 7/7 testes verdes.
