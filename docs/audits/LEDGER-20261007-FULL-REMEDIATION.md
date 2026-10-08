

## W2.8 — ownership e mutações de contrato — 2026-10-08

`updateContractDraft` e `sealAndIssueContract` agora exigem staff, comprovam `creator_id`, vinculam `versionId` ao contrato correto e rejeitam versões seladas/estados incompatíveis. Updates críticos usam `select("id")` e não retornam sucesso sem linha afetada; erros de selagem/status/envelopes são tratados. Regressão focada: 6 arquivos / 13 testes verdes; typecheck e diff check verdes. A sequência ainda não é RPC transacional: rollback entre selagem, status e envelopes exige W2/W3 com Postgres real.
