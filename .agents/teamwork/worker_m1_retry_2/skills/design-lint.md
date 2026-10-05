---
name: design-lint
description: Execução e auditoria determinística automatizada de regras visuais DL-01 a DL-30 por leitura de código. Gatilho ao auditar deriva visual, pré-build ou revisão de código.
when_not_to_use: Não utilizar para testes unitários de lógica pura ou testes end-to-end de integração.
inputs:
  - Arquivos modificados (`--changed`) ou base completa de código
  - Configuração `.designlintrc.json`
outputs:
  - Relatório legível no terminal e JSON em `design-lint.report.json`
  - Código de saída binário (0 aprovado, 1 bloqueado por P0 ou P1)
---

# Objetivo
Detectar mecanicamente violações à constituição visual `DESIGN.md`, bloqueando merges e entregas que contenham defeitos impeditivos P0 ou P1.

# Procedimento Numerado
1. Ler as regras e limites definidos em `.designlintrc.json`.
2. Validar a integridade da allowlist: rejeitar exceções sem data ou com motivo genérico.
3. Se invocado com `--changed`, filtrar apenas os arquivos em estágio git de alteração.
4. Executar varredura regex determinística para os defeitos DL-01 a DL-30.
5. Calcular o total de violações agregadas por severidade (P0, P1, P2, P3).
6. Gerar o artefato `design-lint.report.json` e emitir Exit Code 1 se `P0 > 0` ou `P1 > 0`.

# Regras Duras com Números
- Tolerância zero (max 0) para violações P0 e P1 em branches de entrega.
- Toda exceção na allowlist exige data válida no formato YYYY-MM-DD e motivo com >= 10 caracteres.
- Execução em menos de 10 segundos para toda a base de código.
- Saída estritamente em schema sem adjetivos ou conjecturas subjetivas.

# Checklist de Verificação
- [ ] O arquivo `.designlintrc.json` é válido e sem sintaxe corrompida?
- [ ] A execução retornou Exit Code 0 antes da entrega?
- [ ] O relatório `design-lint.report.json` foi gerado e persistido?
- [ ] Nenhuma violação P0 (!important, foco ausente, contraste quebrado) permaneceu ativa?

# Anti-Padrões
- Ignorar falhas P0/P1 com promessas de "corrigir depois".
- Adicionar exceções vazias na allowlist sem justificativa técnica.
- Desativar regras do lint no `.designlintrc.json` para aprovar build quebrado.
