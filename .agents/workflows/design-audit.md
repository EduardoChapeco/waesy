# WORKFLOW: design-audit

## Metadados
- **Objetivo:** Auditoria sistemática de código por leitura automatizada, classificação por severidade e geração de fila priorizada.
- **Entradas:** Arquivos sob inspeção ou base completa do repositório.
- **Saídas:** Relatório determinístico em `design-lint.report.json` e atualização da fila de correções.
- **Teto de Passos:** 5 passos.

## Passos Numerados
1. **Leitura de Configuração:** Carregar `.designlintrc.json` e auditar validade da allowlist de exceções.
2. **Execução Estática:** Rodar o script `node scripts/design-lint.mjs`.
3. **Classificação Taxonômica:** Agrupar violações encontradas em P0, P1, P2 e P3.
4. **Priorização da Fila:** Inserir achados P0 e P1 no topo de `auditoria/07-fila.md`.
5. **Emissão de Veredito:** Apresentar relatório em tabela de 6 linhas com os 5 defeitos de maior gravidade.

## Critério de Parada
Parar e bloquear qualquer deploy caso existam violações ativas com severidade P0.
