

## Continuação executada — Ondas 3 e 4

### Onda 3 — InfoTravel

O BFF `invokeInfotravelConnector` agora exige identidade autenticada, valida acesso ao tenant e rejeita `agencyId` diferente do `store_id` para papéis não elevados. Falhas de transporte/conector deixaram de ser classificadas falsamente como credenciais ausentes: `CREDENTIALS_NOT_CONFIGURED` fica reservado para o retorno explícito do conector, enquanto indisponibilidade usa `CONNECTOR_UNAVAILABLE`. Os IDs gerados na normalização de hotéis, voos e reservas também passaram a ser determinísticos, evitando mudanças de identidade em retries do mesmo payload.

### Onda 4 — Reserva/Kanban/contratos

Foi criada a migration `20261008093000_travel_reservation_state.sql`, com o estado `reserved_pending_issuance` em `tourism_trips`, além dos estados de emissão e índice por tenant/data. O fallback de `convertProposalToTrip` agora consulta uma viagem já criada para a mesma proposta e loja antes de inserir outra, reduzindo duplicação quando a RPC canônica ainda não está disponível. Novas conversões fallback persistem explicitamente `reservation_state: reserved_pending_issuance`, deixando a emissão de locators/vouchers como etapa posterior observável.

**Validação incremental:** 3 arquivos de teste, 9 casos aprovados; typecheck e `git diff --check` passaram.
