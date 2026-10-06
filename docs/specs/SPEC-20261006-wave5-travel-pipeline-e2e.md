# SPEC-20261006 — Onda 5: E2E do pipeline turístico

## Objetivo

Consolidar uma suíte automatizada e determinística para provar o contrato end-to-end do pipeline turístico, desde a cotação extraída até a reserva, voucher, comissão e ledger, incluindo divergências, bloqueios, reprocessamento e idempotência.

## Estratégia

A suíte será um **contract harness** executável em Vitest. Ela usa os schemas e normalizadores reais do Waesy e um repositório determinístico em memória apenas para observar estados/eventos. Não substitui testes SQL contra Supabase real; valida o comportamento bilateral entre payloads, regras e transições antes da integração externa.

## Requisitos EARS

- **Quando** uma cotação válida for extraída, **o teste deve** provar que o payload é validado, normalizado e vinculado ao lead/proposta.
- **Quando** confirmação, recibo e voucher divergirem, **o teste deve** provar que a reconciliação identifica o conflito, sugere a fonte correta e bloqueia a aplicação enquanto crítico.
- **Quando** o conflito for resolvido, **o teste deve** provar que a aplicação avança sem alterar o documento original.
- **Quando** aceite/conversão/voucher/comissão forem repetidos com a mesma chave, **o teste deve** provar que não há duplicidade de agregado, evento, comissão ou ledger.
- **Quando** uma etapa falhar antes do commit lógico, **o teste deve** provar que o lock de idempotência é liberado para retentativa.
- **Quando** a comissão for calculada, **o teste deve** provar base, percentual, valor, lançamento e vínculo com a venda.
- **Quando** a cadeia do ledger for alterada, **o teste deve** detectar a adulteração.

## Matriz de cobertura

| Etapa            | Evidência                            |
| ---------------- | ------------------------------------ |
| OCR/cotação      | Schema real + envelope canônico      |
| CRM/proposta     | Lead, budget e proposal no harness   |
| Aceite/conversão | Idempotência de aceite e trip        |
| Documentos       | Confirmação, recibo e voucher        |
| Reconciliação    | Precedência, bloqueio e resolução    |
| Reserva/voucher  | Aplicação somente após desbloqueio   |
| Comissão         | Cálculo e repetição                  |
| Ledger           | Hash chain e detecção de adulteração |
| Falhas           | Retentativa após erro                |

## Critérios de aceite

- Suíte dedicada executável por comando único.
- Pelo menos 10 cenários E2E, incluindo sucesso, conflito, bloqueio, replay e falha.
- Zero mocks de IA, browser ou Supabase que escondam regra de negócio; fixtures são payloads explícitos e auditáveis.
- Todos os estados e eventos essenciais têm asserts.
- Testes existentes de turismo, CRM, idempotência e ledger continuam passando.

## Resultado da execução

A suíte dedicada `npm run test:e2e:travel` passou em 12/12 cenários. A matriz de regressão da Onda 5 passou em 9 arquivos e 55 testes, incluindo operador/OCR, reconciliação, idempotência, lifecycle, CRM, módulos turísticos, onboarding e ledger.

O build de produção passou com 484 chunks verificados e nenhum runtime server no client. O typecheck global ainda retorna código 2 por baseline legado fora da Onda 5; não foram encontrados erros nos arquivos da suíte E2E nem nos módulos de turismo consultados.

O harness usa payloads explícitos e schemas reais do Waesy. Ele não simula uma conexão Supabase real nem uma chamada de IA; a aplicação da migration e testes contra Postgres conectado permanecem um gate separado de integração de ambiente.
