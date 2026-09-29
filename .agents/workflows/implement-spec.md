# WORKFLOW: implement-spec

## Metadados
- **Objetivo:** Implementação atômica orientada estritamente por especificação técnica previamente aprovada.
- **Entradas:** Arquivo de especificação `docs/specs/SPEC-XXX.md` em status APROVADO.
- **Saídas:** Código modificado com conformidade de build, tipagem e design lint.
- **Teto de Passos:** 7 passos.

## Passos Numerados
1. **Recepção da Spec:** Ler entradas, saídas e critérios de aceite da spec aprovada.
2. **Isolamento de Escopo:** Limitar modificações estritamente aos arquivos autorizados no documento.
3. **Codificação Atômica:** Implementar os componentes ou rotas consumindo unicamente tokens semânticos.
4. **Verificação de Tipagem:** Executar `npm run typecheck` e garantir 0 erros de compilação.
5. **Verificação de Build:** Executar `npm run build` e confirmar geração de worker com Exit Code 0.
6. **Verificação de Design Gate:** Executar `node scripts/design-lint.mjs --changed` com 0 violações P0/P1.
7. **Registro de Log:** Atualizar `docs/design/DECISIONS.md` com o handoff de encerramento do módulo.

## Critério de Parada
Parar imediatamente se qualquer critério da Definition of Done falhar ou exigir mudança fora da árvore da spec.
