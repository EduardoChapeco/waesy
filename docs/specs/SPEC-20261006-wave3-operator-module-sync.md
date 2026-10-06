# SPEC-20261006 — Onda 3: sincronização e operadoras

## Objetivo

Criar uma fronteira canônica entre OCR/documentos de operadoras e os módulos de CRM, orçamento, proposta, reserva, viagem, vouchers, financeiro e timeline, mantendo os contratos legados e evitando duplicação de integrações.

## Escopo atômico

A onda cobre o registry multi-tenant de operadoras, os adapters documentais, normalização de payloads, runs idempotentes de sincronização e propagação da ingestão revisada para o agregado canônico. Não implementa chamadas externas a APIs de uma operadora sem credenciais e contrato técnico confirmados.

## Requisitos EARS

- **Quando** uma ingestão OCR possuir `source_kind` turístico, **o sistema deve** normalizar sua extração para um envelope versionado comum, independentemente do nome da operadora.
- **Quando** o nome da operadora variar entre documentos, **o adapter deve** resolver um `operator_code` estável e preservar o nome original como provenance.
- **Quando** a mesma ingestão for sincronizada novamente, **o sistema deve** reutilizar o mesmo `sync_run` por chave idempotente e não duplicar proposta, reserva, evento ou fornecedor.
- **Quando** uma agência configurar uma operadora, **o sistema deve** persistir somente em seu tenant e expor ao BFF apenas status/capabilities, nunca segredos para o cliente.
- **Quando** um documento for normalizado, **o sistema deve** registrar provenance, source ingestion, versão do schema, payload bruto e payload canônico.
- **Quando** o documento ainda estiver `needs_review`, **o sistema deve** impedir propagação automática para reserva/viagem; a sincronização deve ficar em estado `review_required`.

## Invariantes

- Nenhum adapter pode inventar valor financeiro, localizador ou passageiro ausente.
- `travel_document_ingestions` continua sendo a origem documental; o envelope canônico não substitui o OCR bruto.
- Toda propagação usa `store_id`, `source_ingestion_id` e chave idempotente.
- Nenhum token de integração é retornado por Server Function de listagem.
- As APIs externas permanecem desligadas até existir credencial ativa e adapter explícito.

## Critérios de aceite

| Gate          | Critério                                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| Schema        | Registry, runs e colunas de provenance são idempotentes e tenant-scoped      |
| Normalização  | Operadora, quote, confirmação, recibo e voucher têm envelope comum           |
| Sincronização | Reexecução não cria run duplicado e respeita revisão                         |
| BFF           | Configuração exige manager; sincronização exige staff; segredos não retornam |
| Regressão     | Testes do normalizer, RLS/CRM/turismo, typecheck alterado e build            |

## Resultado da execução

O registry adicionou 444 migrations totais sem colisão de versão. O normalizador passou em 3 testes determinísticos; os testes de CRM, módulos de turismo, lifecycle e onboarding passaram com 5 arquivos e 28 testes. Prettier e ESLint passaram sem erros, e o build de produção confirmou 484 chunks sem runtime de servidor no client.

O typecheck com heap ampliado não encontrou erros nos arquivos da Onda 3 após a correção do tipo JSON serializável. O typecheck global ainda reporta erros legados fora do escopo, principalmente em rotas de marketing. A execução de APIs reais de operadoras permanece deliberadamente fora desta onda por ausência de credenciais e contratos específicos.
