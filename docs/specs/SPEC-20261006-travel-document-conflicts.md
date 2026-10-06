# SPEC-20261006 — Resolução de conflitos documentais de turismo

## Escopo

Implementar comparação canônica entre ingestões de confirmação, contrato, recibo, voucher e orçamento, com decisão humana persistida e trilha multi-tenant.

## Requisitos EARS

- **Quando** duas ou mais ingestões da mesma operação forem analisadas, **o sistema deve** normalizar valores por caminho semântico e registrar toda divergência material.
- **Quando** uma divergência tiver precedência determinística por domínio e não houver risco jurídico/financeiro, **o sistema deve** sugerir uma fonte vencedora sem aplicar silenciosamente o valor.
- **Quando** uma divergência envolver identidade, valor, pagamento, data, localizador, bagagem, cancelamento ou cláusula contratual, **o sistema deve** exigir decisão humana antes da aplicação.
- **Quando** um operador escolher uma fonte ou informar um valor corrigido, **o sistema deve** persistir a decisão, usuário, timestamp, justificativa, evidências e versão do conflito.
- **Quando** a mesma comparação for repetida, **o sistema deve** ser idempotente por operação, campo e conjunto de fontes.
- **Quando** a resolução for aplicada à viagem, **o sistema deve** manter o valor anterior, o novo valor e o vínculo com os documentos que fundamentaram a alteração.
- **Quando** uma requisição não pertencer à loja autenticada, **o sistema deve** rejeitar leitura, gravação e resolução.

## Invariantes

1. Nenhuma divergência é descartada silenciosamente.
2. Nenhum campo financeiro ou jurídico é atualizado automaticamente pelo resolver.
3. O arquivo original e a extração original permanecem imutáveis.
4. Toda fonte possui caminho, evidência, confiança e data de ingestão.
5. Valores equivalentes semanticamente não geram conflito falso.
6. A resolução é append-only no histórico de decisões.

## Domínios e precedência sugerida

- **Financeiro:** recibo > contrato > confirmação > voucher > orçamento.
- **Jurídico:** contrato > confirmação > recibo > voucher > orçamento.
- **Operacional confirmado:** voucher > confirmação > contrato > recibo > orçamento.
- **Comercial/orçamento:** orçamento > confirmação > contrato > recibo > voucher.

A precedência cria somente uma sugestão; campos críticos continuam exigindo aprovação.

## Evidências de aceite

- Testes unitários cobrem equivalência, divergência, precedência, conflito crítico e idempotência.
- Migration cria tabelas, índices, RLS e função append-only de resolução.
- Server Functions validam tenant e expõem análise e decisão.
- Fluxo JSON canônico documenta reservas, passageiros, pagamentos e documentos.
- Typecheck, testes focados, build e design lint passam.
