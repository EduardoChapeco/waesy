# SPEC-20261006 — Onda 4: reconciliação documental avançada

## Objetivo

Evoluir o resolver de divergências para uma reconciliação multi-fonte auditável, com normalização semântica, matching estável de itens de viagem, precedência específica por campo, evidência explicável, execução idempotente e aplicação somente em uma projeção reconciliada — nunca sobrescrevendo o OCR bruto.

## Requisitos EARS

- **Quando** duas fontes representarem o mesmo passageiro, hotel, voo ou pagamento com formatos diferentes, **o resolver deve** agrupá-las por uma chave semântica estável antes de comparar os campos.
- **Quando** houver divergência, **o sistema deve** aplicar a regra de precedência do campo específico antes da precedência genérica do domínio.
- **Quando** uma reconciliação for repetida com a mesma chave, **o sistema deve** reutilizar a execução e preservar decisões já resolvidas.
- **Quando** um conflito for resolvido, **o sistema deve** registrar a evidência escolhida, o valor efetivo, o ator, a versão do resolver e a justificativa.
- **Quando** existir conflito crítico não resolvido, **o sistema deve** bloquear a projeção reconciliada para aplicação automática em reserva, pagamento ou voucher.
- **Quando** a resolução for customizada, **o sistema deve** manter todas as fontes originais e guardar a correção apenas como projeção auditável.
- **Quando** uma função SQL de resolução for chamada diretamente, **o sistema deve** impedir execução pelo cliente autenticado e aceitar somente o BFF server-side autorizado.

## Modelo de precedência

| Campo                              | Fonte preferencial      |
| ---------------------------------- | ----------------------- |
| Pagamento, valor pago, parcelas    | Recibo                  |
| Cláusula, cancelamento, assinatura | Contrato                |
| Localizador e horários emitidos    | Voucher ou confirmação  |
| Hotel efetivamente confirmado      | Voucher                 |
| Proposta comercial e markup        | Cotação                 |
| Passageiro contratual/pagador      | Contrato, depois recibo |

A regra específica vence a regra de domínio; empates usam data de criação mais recente.

## Critérios de aceite

| Gate            | Critério                                                                      |
| --------------- | ----------------------------------------------------------------------------- |
| Normalização    | Datas, documentos, telefones e dinheiro equivalentes não geram falso conflito |
| Matching        | Itens sem a mesma ordem são comparados pelo identificador semântico           |
| Explicabilidade | Toda sugestão informa regra, fonte e motivo                                   |
| Idempotência    | Repetição não cria nova execução nem reabre resolução encerrada               |
| Segurança       | RPC de resolução não executável por `authenticated`                           |
| Projeção        | Dados brutos permanecem imutáveis e conflitos críticos bloqueiam aplicação    |
| Regressão       | Resolver, CRM, turismo, lifecycle, typecheck alterado e build passam          |

## Resultado da execução

O resolver `travel-conflicts-v2` passou em 7 testes próprios. As regressões de idempotência, lifecycle, CRM, módulos de turismo e onboarding passaram em conjunto com 37 testes. O schema consolidado ficou com 445 migrations únicas. O build de produção passou e confirmou 484 chunks sem runtime server no client.

O typecheck global continua com erros legados fora dos arquivos da Onda 4; não foi identificado erro novo em `travel-document-conflicts`, `travel-document-conflicts.functions` ou `travel-canonical-pipeline`. A migration foi revisada para manter RPCs de resolução exclusivamente server-side e impedir mutações diretas por `authenticated`.
