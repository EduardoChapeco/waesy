# SPEC-S28: Família Formulário e Wizard Canônica (Plano 5 — Bloco D)

## 1. Identificação e Metadados
- **ID da Especificação:** SPEC-S28
- **Fase:** S28 (Plano 5 — Estrutura, Escala e Operação BigTech)
- **Módulo Alvo:** `src/components/ui/canonical/canonical-wizard.tsx`, `src/components/ui/canonical/index.ts`, `src/components/design-system/forms-family.tsx`, `src/routes/workspace.design-system.tsx`
- **Autor / Agente:** Antigravity / BigTech Executive Board
- **Data:** 2026-10-02
- **Status:** Aprovada para Implementação

---

## 2. Contexto e Objetivos
A Fase S28 formaliza o motor canônico de **Formulários e Wizards** do Waesy Design System, garantindo conformidade estrita com:
- **DL-03**: Espaçamentos na grade modular de 4px (`p-3`, `p-4`, `p-6`, `gap-2`, `gap-4`).
- **DL-05**: Alinhamento numérico monospaçado (`font-mono`) para campos monetários e documentos fiscais.
- **DL-11/DL-12/DL-13**: Matriz de 4 estados completa (Pronto, Skeleton espelhado, Vazio e Erro).
- **DL-14 / DL-15**: Alvos de toque móveis >= 44px (`h-11`) e `:focus-visible` obrigatório.
- **DL-22**: Exatamente UMA ação primária (`variant="default"`) por etapa/tela.

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)

### 3.1 Requisitos Ubíquos (Sempre Ativos)
- [REQ-S28-U1]: O sistema SEMPRE deve renderizar botões de navegação e campos de entrada de dados com altura mínima de 44px (`h-11`).
- [REQ-S28-U2]: O sistema SEMPRE deve limitar a uma única ação primária ativa (`variant="default"`) por etapa do formulário/wizard.

### 3.2 Requisitos Orientados a Evento (Quando... O sistema deve...)
- [REQ-S28-E1]: QUANDO o operador clicar em "Avançar" ou "Voltar" no `CanonicalStepperWizard`, O sistema DEVE transicionar para a etapa correspondente mantendo o estado dos dados preenchidos.
- [REQ-S28-E2]: QUANDO uma etapa do wizard for concluída com sucesso, O sistema DEVE renderizar indicador com ícone de `Check` e estilo visual semântico de sucesso.

### 3.3 Requisitos Baseados em Estado (Enquanto... O sistema deve...)
- [REQ-S28-S1]: ENQUANTO o estado do formulário/wizard for `loading`, O sistema DEVE renderizar `Skeleton` espelhado cobrindo a barra de etapas e os campos de entrada para garantir CLS = 0.
- [REQ-S28-S2]: ENQUANTO houver erro de validação em campos ou etapas, O sistema DEVE renderizar mensagens de erro descritivas com `role="alert"` e cor `text-destructive`.
- [REQ-S28-S3]: ENQUANTO o formulário estiver em estado vazio (`empty`), O sistema DEVE exibir os campos limpos com placeholders honestos e texto auxiliar.

---

## 4. Invariantes do Módulo
1. **Regra de Ação Única**: Proibido renderizar dois botões primários na mesma superfície de formulário ou wizard.
2. **Grade Espacial Limpa**: Espaçamentos estritamente múltiplos de 4px (`p-4`, `p-6`, `gap-3`, `gap-4`).
3. **Piso Acessível**: Todo controle interativo deve ter `:focus-visible:ring-2` e touch target >= 44px (`h-11`).

---

## 5. Critérios de Aceite e Evidências
1. Primitiva `CanonicalStepperWizard` implementada em `src/components/ui/canonical/canonical-wizard.tsx`.
2. Barrel `src/components/ui/canonical/index.ts` atualizado.
3. Componente `src/components/design-system/forms-family.tsx` refatorado integrando wizard e formulário nas 4 matrizes de estado.
4. Suíte de testes `design-system-showcase.test.ts` estendida com asserções para formulários e wizard.
5. Verificação `node scripts/design-lint.mjs --changed` reportando 0 violações P0 e 0 violações P1.
6. Vitest 100% verde.
