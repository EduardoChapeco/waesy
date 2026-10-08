

## Onda 6 — Gates completos desta rodada

Após o commit `a71dd346`, a suíte completa e o build de produção passaram. O client-leak check verificou 493 chunks sem runtime de servidor no cliente. Permanecem fora do escopo local desta validação os testes browser/E2E e a aplicação/verificação das migrations no Supabase remoto.

## Microfase 7 — Recuperação e reimplementação do `infotravel-connector`

**Data:** 2026-10-08 09:59 BRT
**Status:** implementado localmente, validado por testes/typecheck, pronto para revisão na PR; deploy remoto não executado.

### Achado que motivou a fase

O BFF `src/services/infotravel.ts` já invocava `supabase.functions.invoke("infotravel-connector")`, mas o checkout não continha `supabase/functions`. Isso deixava as buscas de hotéis/voos, importação e teste de conexão dependentes de uma função remota não auditável. O contrato também perdia `CREDENTIALS_NOT_CONFIGURED` quando o SDK retornava `FunctionsHttpError`.

### Entregas efetivas

1. `supabase/functions/infotravel-connector/index.ts`
   - autentica o Bearer JWT com Supabase;
   - valida `action` e UUID de `agencyId`;
   - valida membership em `workspace_members` e permite somente equipe da loja ou `master/platform_admin`;
   - carrega a credencial ativa por `store_id + provider=infotravel`;
   - descriptografa `secret_payload_encrypted` com AES-256-GCM e `VAULT_MASTER_KEY`;
   - mantém compatibilidade controlada com `token_payload/credentials` legados;
   - executa chamadas HTTP reais ao provider, com timeout de 30s, headers de autenticação e `action_paths` configuráveis;
   - cobre `search_hotels`, `search_flights`, `search_transfers`, `search_activities`, `import_booking`, `create_booking`, `run_periodic_sync` e `test_connection`;
   - normaliza reservas importadas para o contrato da RPC atômica existente;
   - retorna códigos honestos (`CREDENTIALS_NOT_CONFIGURED`, `PROVIDER_CONTRACT_NOT_CONFIGURED`, `PROVIDER_TIMEOUT`, etc.), sem fallback/mock fictício;
   - grava evento mínimo de sucesso/erro por agência, ação, ator e duração sem armazenar segredo.
2. `supabase/functions/_shared/infotravel.ts`
   - contrato puro reutilizável para parsing, validação, construção de request, resposta, normalização e descriptografia.
3. `supabase/migrations/20261008095500_infotravel_connector_contract.sql`
   - garante colunas de payload criptografado e metadata;
   - cria índice de credencial ativa InfoTravel;
   - cria `integration_connector_events` com RLS de leitura para staff.
4. `src/services/infotravel.ts`
   - preserva códigos estruturados quando o SDK entrega o JSON no corpo da exceção.
5. `src/services/infotravel-connector-contract.test.ts`
   - 5 testes/contratos: ações e tenant, request sem segredo na URL, fail-closed, normalização e AES-GCM.

### Validação desta microfase

- Testes focados InfoTravel + Wave 3/4: **8/8 aprovados**.
- `npm run typecheck`: **aprovado**.
- `git diff --check`: **aprovado**.
- Arquivos da Edge Function/shared/migration: **presentes e não vazios**.

### Limites conhecidos e próximos gates

- A origem não forneceu uma especificação pública verificável dos endpoints InfoTravel. Portanto o adapter não inventa URLs: o contrato real deve ser cadastrado na credencial (`base_url`, autenticação e `action_paths`). Sem isso, retorna `PROVIDER_CONTRACT_NOT_CONFIGURED`.
- Ainda falta executar a migration no Supabase remoto, cadastrar uma credencial de homologação e fazer smoke test autenticado contra um endpoint real do provider.
- Ainda falta confirmar o formato de resposta real para ajustar, se necessário, o mapper de reservas/voos/hotéis sem degradar para dados fictícios.
- Deploy, merge em `main` e aplicação remota de migrations continuam fora desta rodada por solicitação explícita; a PR permanece o artefato de revisão.

## Microfase 8 — Wiring operacional completo no produto

A Edge Function deixou de ser apenas um endpoint isolado. O Hub de Integrações agora possui uma aba **GDS Turismo / InfoTravel** que grava `base_url`, modo de autenticação, credenciais e paths de ação através de `saveIntegrationCredential`; credenciais sensíveis de InfoTravel passam a ser cifradas com AES-256-GCM, enquanto apenas metadata operacional é mantida pública.

O detalhe da viagem agora expõe as ações **Importar InfoTravel** e **Sincronizar GDS**. A importação valida o tenant, verifica que a viagem pertence à loja, consulta a reserva no provider e aplica hotéis, voos, transfers, tours, cliente, datas e total à `tourism_trips`, com `reservation_state=reserved_pending_issuance`. Repetir a operação atualiza a mesma viagem e não cria duplicata. A sincronização também passa pelo BFF e recarrega o aggregate da viagem.

Os testes focados continuam aprovados (8/8), assim como o typecheck e o diff check. A validação externa ainda depende de migration aplicada, secrets configurados e endpoint/credencial reais do provider InfoTravel.

## Microfase 9 — Onda 7: aplicação transacional InfoTravel

Foi criada a migration `20261008101500_infotravel_atomic_booking_apply.sql`, mantendo `tourism_trips` como raiz operacional explícita enquanto a decisão futura entre `tourism_trips` e `trips` permanece documentada. A migration adiciona identificadores de origem/reserva, índices de replay e a RPC `apply_infotravel_booking`.

A RPC bloqueia a viagem por tenant, atualiza o snapshot principal, substitui somente projeções InfoTravel da mesma reserva, aplica passageiros e itens de confirmação, preserva dados manuais e retorna contadores sanitizados. A importação e o sync agora usam o mesmo helper server-side; o sync deixou de apenas retornar o provider e passou a persistir o snapshot normalizado. O resultado bruto do provider não atravessa mais o boundary da Server Function.

Validação local: 12 testes focados aprovados, typecheck aprovado e diff check aprovado. Validação pendente: aplicar a migration em Supabase, executar RPC contra banco real, testar RLS, replay concorrente e payload InfoTravel real/sandbox.

## Microfase 10 — Onda 8: contrato InfoTravel v1 e mappers versionados

O módulo compartilhado da Edge Function agora declara `INFOTRAVEL_CONTRACT_VERSION = infotravel-v1` e aplica `normalizeProviderPayload` por ação. Foram implementados mappers determinísticos para hotéis e voos, com `external_id` estável, além de normalização de bookings, passageiros, localizadores, datas, cliente e valores.

As ações `import_booking` e `run_periodic_sync` exigem identificador de reserva e retornam erro `PROVIDER_SCHEMA_MISMATCH` quando o provider não cumpre o contrato mínimo. Buscas de hotéis, voos, transfers e atividades retornam envelope versionado com `contract_version`. O conector passa o mapper por todas as ações, em vez de normalizar somente importações com `tripId`.

Validação local: 14 testes focados aprovados, typecheck aprovado e diff check aprovado. A confirmação do contrato real do provider ainda exige fixtures sanitizadas ou sandbox autorizado da InfoTravel; o código não declara que o endpoint externo foi homologado sem essa evidência.

## Microfase 11 — Onda 9: wiring dos módulos dependentes ao DTO v1

O BFF `src/services/infotravel.ts` agora exige `contract_version = infotravel-v1` nas buscas de hotéis, voos, transfers e atividades, além de importação e sincronização. O DTO de booking v1 é convertido por `mapInfotravelV1BookingToNormalized` para os tipos canônicos que Proposal Studio e o pipeline de viagens já consomem.

A busca de hotéis e voos deixou de fazer cast direto de ofertas brutas: os IDs externos determinísticos passam pelos mappers canônicos. A importação e o sync rejeitam envelopes legados antes da RPC atômica. O teste de conexão passou a reconhecer o retorno versionado `status=ok`, em vez de esperar um campo `success` que o contrato v1 não promete.

Mapa de módulos validado: SectionHotels/SectionFlights → buscas v1 → Proposal Studio; aprovação/conversão → tourism_trips; persistência transacional → passageiros e trip_confirmation_items; vouchers e Kanban de embarques continuam lendo a raiz tourism_trips; financeiro permanece vinculado ao total_cents/financial_details da viagem. Validação local: 17 testes focados aprovados, typecheck aprovado e diff check aprovado.
