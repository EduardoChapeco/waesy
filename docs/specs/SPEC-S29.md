# SPEC-S29: Família Overlay e Matriz de 4 Estados Canônica (Plano 5 — Bloco D)

## 1. Identificação e Metadados
- **ID da Especificação:** SPEC-S29
- **Fase:** S29 (Plano 5 — Estrutura, Escala e Operação BigTech)
- **Módulo Alvo:** `src/components/ui/canonical/canonical-overlay.tsx`, `src/components/ui/canonical/index.ts`, `src/components/design-system/overlays-family.tsx`, `src/routes/workspace.design-system.tsx`
- **Autor / Agente:** Antigravity / BigTech Executive Board
- **Data:** 2026-10-02
- **Status:** Aprovada para Implementação

---

## 2. Contexto e Objetivos
A Fase S29 implementa a família canônica de **Overlays e Estados de Diálogo**, unificando modais adaptativos, gavetas laterais (`CanonicalDrawer`), diálogos de confirmação irreversível (`CanonicalConfirmDialog`) e a renderização integral das 4 matrizes de estado (Pronto, Skeleton, Vazio e Erro).
Garante conformidade com:
- **DL-03**: Espaçamentos estritamente na grade modular de 4px (`p-4`, `p-6`, `gap-3`).
- **DL-07**: Sombras permitidas exclusivamente em overlays/modais (`shadow-xl` / `shadow-2xl`).
- **DL-09**: Raio `rounded-xl` permitido especificamente para overlays/modais.
- **DL-11/DL-12/DL-13**: Matriz de 4 estados completa.
- **DL-14 / DL-15**: Alvos de toque móveis >= 44px (`h-11`) e `:focus-visible` obrigatório.
- **DL-26**: Proibição de modal de confirmação para ações reversíveis (restrito a ações destrutivas irreversíveis).

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)

### 3.1 Requisitos Ubíquos (Sempre Ativos)
- [REQ-S29-U1]: O sistema SEMPRE deve renderizar overlays com backdrop semântico (`bg-background/80 backdrop-blur-xs`), container com borda semântica (`border border-border`) e anel de foco teclado (`focus-visible:ring-2 focus-visible:ring-ring`).
- [REQ-S29-U2]: O sistema SEMPRE deve fornecer botão de fechamento com altura e largura mínimas de 44px (`h-11 w-11`) e atributo `aria-label="Fechar"`.

### 3.2 Requisitos Orientados a Evento (Quando... O sistema deve...)
- [REQ-S29-E1]: QUANDO o usuário pressionar a tecla `Escape` ou clicar no backdrop, O sistema DEVE invocar a função `onOpenChange(false)` e restaurar o foco para o elemento disparador.
- [REQ-S29-E2]: QUANDO uma ação crítica exigir confirmação em `CanonicalConfirmDialog`, O sistema DEVE exibir o botão de ação destrutiva com `variant="destructive"` e botão de cancelamento secundário com `variant="outline"`.

### 3.3 Requisitos Baseados em Estado (Enquanto... O sistema deve...)
- [REQ-S29-S1]: ENQUANTO o conteúdo do overlay estiver em estado `loading`, O sistema DEVE renderizar `Skeleton` de mesma dimensão para título, campos e botões.
- [REQ-S29-S2]: ENQUANTO a consulta do overlay não retornar registros (`empty`), O sistema DEVE renderizar `EmptyState` com ícone semântico e CTA de retorno.
- [REQ-S29-S3]: ENQUANTO houver erro de processamento dentro do overlay, O sistema DEVE renderizar `Alert` destrutivo com botão de reintento.

---

## 4. Invariantes do Módulo
1. **Piso de Ergonomia**: Nenhum botão ou controle dentro de overlays pode ter altura inferior a 44px (`h-11`).
2. **Grade Espacial Limpa**: Espaçamentos na grade de 4px (`p-4`, `p-6`, `gap-3`).
3. **Restrição de Confirmação**: Modais de confirmação são restritos a exclusões irreversíveis de dados.

---

## 5. Critérios de Aceite e Evidências
1. Primitivas `CanonicalDrawer` e `CanonicalConfirmDialog` implementadas em `src/components/ui/canonical/canonical-overlay.tsx`.
2. Barrel `src/components/ui/canonical/index.ts` atualizado.
3. Componente `src/components/design-system/overlays-family.tsx` refatorado integrando os 4 estados operacionais.
4. Suíte de testes `design-system-showcase.test.ts` estendida com asserções para overlays.
5. Verificação `node scripts/design-lint.mjs --changed` reportando 0 violações P0 e 0 violações P1.
6. Vitest 100% verde.
