# SPEC-003 — Execução da Onda 2: Reconexão de Elos Órfãos, Unificação de Primitivos e Silêncio Visual

## 0. Metadados e Controle
- **ID da Spec:** SPEC-003
- **Módulo:** Reconexão Estrutural (PDV, Pedidos, Componentes Órfãos de Governança e Horários)
- **Status:** APROVADA
- **Data:** 2026-09-28
- **Dependência:** SPEC-000 (Diretrizes de Design), SPEC-001 (Motor de Melhoria e Ledger), SPEC-002 (Onda 1)

---

## 1. Escopo Delimitado e Arquivos Autorizados
Esta especificação autoriza intervenções atômicas nos seguintes arquivos delimitados da Onda 2:
1. `src/routes/workspace.pdv.index.tsx` (Reconexão do `ManagerOverrideDialog` para autorização por PIN)
2. `src/components/admin/pos/manager-override-dialog.tsx` (Adequação aos tokens DTCG e silêncio visual)
3. `src/components/admin/working-hours-editor.tsx` (Unificação delegando ao primitivo canônico `BusinessHoursEditor`)
4. `src/components/commerce/return-modal.tsx` (Unificação delegando ao primitivo canônico `RmaWizard`)
5. `src/routes/_store.conta.pedidos.$id.tsx` (Integração do `MotoLinkTrackingWidget` para corridas ativas)

---

## 2. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### EARS-01: Autorização Gerencial por PIN no PDV
- **Quando** o operador do PDV concede um desconto avulso superior a 20% ou solicita o cancelamento de uma comanda em `workspace.pdv.index.tsx`,
- **O sistema deve** abrir o `ManagerOverrideDialog`, validar o PIN criptográfico via `validateManagerOverride` da camada BFF sem dados simulados, e liberar a operação somente com assinatura do gerente.

### EARS-02: Eliminação de Componentes Duplicados de Horários de Funcionamento
- **Onde quer que** o sistema necessite editar horários em `working-hours-editor.tsx`,
- **O sistema deve** reutilizar o primitivo canônico `BusinessHoursEditor` de `@/components/commerce/business-hours-editor`, eliminando código redundante e garantindo conformidade com a Regra B.8 do AGENTS.md.

### EARS-03: Unificação Canônica de Trocas e Devoluções
- **Onde quer que** o fluxo de RMA invoque `return-modal.tsx`,
- **O sistema deve** renderizar o primitivo canônico `RmaWizard`, unificando a esteira de fotos, perícia e estorno em uma única interface padronizada.

### EARS-04: Rastreamento em Tempo Real do MotoLink no Pedido
- **Enquanto** o cliente acompanha um pedido com entrega ativa via motoboy em `_store.conta.pedidos.$id.tsx`,
- **O sistema deve** renderizar o `MotoLinkTrackingWidget` conectado ao socket Supabase Realtime, atualizando etapas da corrida sem necessidade de recarga de página.

---

## 3. Diretrizes de Silêncio Visual e Erradicação do AI-Smell
1. **Títulos Diretos:** Teto de 6 palavras (DL-19). Sem saudações ou explicações ("Autorização Gerencial" em vez de "Painel Avançado de Liberação com Senha do Supervisor").
2. **Rótulos Canônicos:** Botões com no máximo 3 palavras (`[Verbo] + [Substantivo]`).
3. **Zero Mocks:** Toda validação consome as server functions reais de `services/`.
4. **Alvos de Toque:** Mínimo de 44x44px em todos os controles interativos móveis.

---

## 4. Critérios de Aceite e Evidência Esperada
- [ ] TypeScript compila com 0 erros nos arquivos alterados (`tsc -p tsconfig.json --noEmit`).
- [ ] Componentes órfãos integrados ou unificados com os canônicos.
- [ ] Gaps correspondentes atualizados no `melhoria/05-ledger.json`.
- [ ] `_estado.md` atualizado com o progresso da Onda 2.
- [ ] Registro formal em `docs/design/DECISIONS.md`.
