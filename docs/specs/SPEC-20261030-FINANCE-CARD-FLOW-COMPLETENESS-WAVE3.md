# SPEC-20261030-FINANCE-CARD-FLOW-COMPLETENESS-WAVE3

## Objetivo
Fechar os gaps observados no fluxo de cartão de crédito sem criar estado falso na interface.

## Requisitos EARS
- Quando o limite de gastos for alterado e persistido pelo BFF, o widget da conta DEVE refletir o limite de gastos persistido após a mutação e após a reidratação da visão.
- Quando um controle de cartão não possuir uma operação backend ou uma continuação de rota, a interface NÃO DEVE apresentar toast como se uma ação tivesse sido executada.
- Quando uma mutação de bloqueio ou limite falhar, o estado visual DEVE permanecer no valor persistido anterior e DEVE exibir erro explícito.
- Quando o drawer receber novos dados do cartão, seus estados locais DEBEM ser sincronizados com os valores recebidos.

## Invariantes
- O BFF continua sendo a única camada de persistência.
- Nenhum token, número completo ou CVV é enviado ao cliente além do contrato visual existente.
- O widget usa `userSpendingLimitCents` para o limite operacional e `creditLimitCents` apenas como teto.

## Evidência
- Teste unitário dos componentes financeiros.
- Auditoria de ações interativas.
- Revisão de diff e execução de lint focalizado nos arquivos alterados.
