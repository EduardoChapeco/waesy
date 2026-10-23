# SPEC-HIPER-WAVE1-P0-A11Y-AND-EVENTS-CRUD.md

## 1. Identificação e Metadados
- **ID da Spec:** `SPEC-HIPER-WAVE-01`
- **Autor:** Conselho de Engenharia / Agente Autônomo Antigravity
- **Data:** 2026-10-23
- **Status:** Aprovada para Execução
- **Governança:** `AGENTS.md` (B.1 a B.45, Invariantes B.4, B.8, B.9, B.14, B.15, B.22, B.26, B.38)
- **Escopo Atômico:**
  1. Microfase 6.1: Erradicação integral das 75 violações impeditivas P0 (DL-15: foco teclado `:focus-visible:ring-2`) nos 39 arquivos catalogados.
  2. Microfase 1.1: Implementação do CRUD real de eventos (soft-delete `deleted_at`, arquivamento `archived_at` e duplicação `duplicateEvent` no BFF e UI).

## 2. Requisitos em Sintaxe EARS

### Requisito EARS 1 (Acessibilidade Teclado P0 — DL-15)
- **Quando** qualquer elemento interativo (`<button>` nativo ou container com `onClick`) for renderizado na interface,
- **O sistema DEVE** conter obrigatoriamente classes de anel de foco teclado (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ou `focus-visible:ring-primary`), assegurando conformidade com WCAG 2.2 AA e DL-15.

### Requisito EARS 2 (Contêineres Não-Interativos com onClick)
- **Onde** um container `<div>` possuir `onClick` exclusivamente para contenção de eventos (`stopPropagation`),
- **O sistema DEVE** aplicar a diretiva de isenção inline formal `/* design-lint-ignore DL-15 reason:"..." expiry:"2027-12-31" */` ou converter o controle em elemento acessível com role e tabIndex adequados.

### Requisito EARS 3 (Exclusão e Gestão Real de Eventos — GAP-01)
- **Quando** o produtor de evento clicar em "Excluir Evento" no Workspace (`workspace.eventos.index.tsx`),
- **O sistema DEVE** disparar a server function real `softDeleteEvent` no BFF (`events.functions.ts`), persistindo `deleted_at = now()`, invalidando o router e removendo o card da visão ativa sem recorrer a mensagens de simulação.

### Requisito EARS 4 (Arquivamento e Duplicação de Eventos)
- **Quando** o produtor de evento selecionar "Arquivar Evento" ou "Duplicar Evento",
- **O sistema DEVE** invocar `archiveEvent` ou `duplicateEvent` no BFF, duplicando o registro com sufixo `(Cópia)` e lotes vinculados no banco de dados.

## 3. Matriz de Invariantes e Proibições
- Proibido uso de `!important` (`DL-04`).
- Proibido cores literais fora de tokens semânticos (`DL-01`).
- Proibido controles com altura inferior a 44px (`h-11 min-h-11`) em áreas acionáveis móveis (`DL-14`).
- Proibido truncamento de texto com `truncate` em cards e títulos informativos (`B.38`).

## 4. Critérios de Aceite e Evidência Esperada
- Execução de `node scripts/design-lint.mjs` comprovando redução de P0 de 75 para exatamente 0 (ZERO).
- Verificação funcional de exclusão, arquivamento e duplicação de eventos via testes unitários.
- TypeScript Typecheck limpo com Exit Code 0.
