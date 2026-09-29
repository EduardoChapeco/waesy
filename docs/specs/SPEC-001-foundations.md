# SPEC-001-FOUNDATIONS — Endurecimento das Diretrizes de Design do Projeto

## 0. Metadados e Controle
- **ID da Spec:** SPEC-001
- **Título:** Endurecimento das Diretrizes de Design do Projeto Waesy
- **Autor / Agente Responsável:** design-system-architect + spec-writer
- **Data de Aprovação:** 2026-09-29
- **Status:** CONCLUÍDO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Produzir o contrato visual e operacional imutável que garanta consistência determinística em todo o projeto, apoiado por uma máquina de detecção estática (design lint) para eliminar defeitos P0 e P1.
- **Escopo Incluído:** `AGENTS.md`, `DESIGN.md`, `tokens.json`, `TOKENS.md`, `DESIGN-LINT.md`, `scripts/design-lint.mjs`, `.designlintrc.json`, skills, agents e workflows de design.
- **Não-Objetivos:** Não redesenhar layouts de telas de produto nesta fase; não alterar temas de clientes; não migrar frameworks.

---

## 2. Requisitos EARS
- **Ubíquo:** O sistema DEVE consumir tokens unicamente através da camada semântica e de componentes definida em `tokens.json`.
- **Acionado por Evento:** QUANDO um agente ou desenvolvedor submeter código para build ou PR, o script `scripts/design-lint.mjs` DEVE ser executado automaticamente.
- **Orientado a Estado:** ENQUANTO houver qualquer violação de severidade P0 ou P1 ativa, o pipeline de CI/CD DEVE bloquear o merge e a entrega.
- **Exceção:** SE uma exceção for estritamente necessária, ENTÃO ela DEVE ser registrada na allowlist de `.designlintrc.json` com data ISO e justificativa mínima de 10 caracteres.

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [x] Contraste mínimo de 4.5:1 para texto normal e 3:1 para controle.
- [x] Alvos interativos mínimos de 44x44px (`h-11`) no mobile.
- [x] Anel de foco `:focus-visible` de 2px obrigatório.
- [x] Suporte obrigatório a `prefers-reduced-motion`.
- [x] Proibição de classes arbitrárias entre colchetes e `!important`.

---

## 4. Evidências Comprovadas
1. `docs/design/00-AUDIT.md` emitido com contagem determinística da base.
2. `AGENTS.md` reescrito em 12 seções normativas de até 25 linhas.
3. `DESIGN.md` estruturado com 10 Princípios Canônicos e violações típicas.
4. `tokens.json` validado no padrão W3C DTCG em três camadas.
5. `scripts/design-lint.mjs` operacional e funcional com `.designlintrc.json`.
