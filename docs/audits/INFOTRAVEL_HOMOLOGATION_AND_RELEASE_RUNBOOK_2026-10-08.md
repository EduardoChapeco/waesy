# Runbook de Homologação e Release InfoTravel

**Branch de implementação:** `execute/spec-master-travel-20261008`  
**PR:** [#21](https://github.com/EduardoChapeco/waesy/pull/21)  
**Uso:** homologação autorizada, sem inserir secrets neste arquivo.

> Nunca registrar token, senha, API key, Authorization header, CPF completo ou payload bruto com PII no GitHub.

## 1. Pré-flight

- [ ] Confirmar projeto Supabase de homologação.
- [ ] Confirmar operador autorizado.
- [ ] Confirmar backup/rollback da migration.
- [ ] Confirmar credencial sandbox InfoTravel.
- [ ] Confirmar endpoint e paths oficiais.
- [ ] Confirmar que secrets serão cadastrados no vault, não no repositório.
- [ ] Confirmar SHA da branch que será testada.
- [ ] Confirmar CI verde.

## 2. Banco e migration

Aplicar em homologação pelo fluxo oficial da organização:

```text
20261008090000_global_hotels_deduplication.sql
20261008093000_travel_reservation_state.sql
20261008095500_infotravel_connector_contract.sql
20261008101500_infotravel_atomic_booking_apply.sql
```

Registrar no ledger:

- timestamp;
- ambiente;
- SHA;
- resultado de cada migration;
- executor;
- checksum ou referência da aplicação;
- rollback disponível.

## 3. Segurança tenant/RLS

Criar três identidades de teste:

- usuário da agência A;
- usuário da agência B;
- `master/platform_admin` autorizado.

Validar:

| Ação | Agência A | Agência B | Admin |
|---|---:|---:|---:|
| Ler configuração A | sim | não | sim |
| Alterar configuração A | sim conforme papel | não | sim |
| Importar viagem A | sim | não | sim |
| Sincronizar booking A | sim | não | sim |
| Ler eventos A | conforme staff | não | sim |

Falha cross-tenant deve retornar `FORBIDDEN_TENANT` ou equivalente, sem revelar dados.

## 4. Configuração do provider

No Hub de Integrações:

1. abrir GDS Turismo / InfoTravel;
2. informar base URL oficial;
3. escolher autenticação;
4. informar credenciais pelo formulário seguro;
5. cadastrar somente os paths suportados;
6. salvar;
7. executar teste de conexão.

Nunca colar credenciais em issue, PR, comentário ou log.

## 5. Fixtures sanitizadas

Para cada operação, salvar apenas fixture sem segredo e sem PII desnecessária:

- `test_connection`;
- `search_hotels`;
- `search_flights`;
- `search_transfers`;
- `search_activities`;
- `import_booking`;
- `run_periodic_sync`.

Cada fixture deve documentar:

```text
contract_version
campos obrigatórios
campos opcionais
campos descartados
regras de moeda
regras de data
identificador externo
```

Se a fixture real divergir, alterar o mapper por uma nova versão ou registrar incompatibilidade. Não fazer fallback silencioso.

## 6. Jornada browser

Executar com usuário de homologação:

1. configurar InfoTravel;
2. testar conexão;
3. abrir proposta;
4. buscar hotel;
5. selecionar hotel;
6. buscar voo;
7. selecionar voo;
8. salvar proposta;
9. aprovar proposta;
10. abrir viagem criada;
11. conferir `reserved_pending_issuance`;
12. importar booking;
13. conferir passageiros;
14. conferir localizadores;
15. sincronizar;
16. gerar voucher;
17. abrir Kanban de embarques;
18. conferir total financeiro;
19. executar retry da mesma operação;
20. confirmar ausência de duplicatas.

Registrar screenshot ou evidência externa somente em local aprovado. Não versionar PII.

## 7. Casos de falha obrigatórios

### Provider indisponível

Esperado:

- erro `PROVIDER_UNAVAILABLE`;
- nenhuma atualização parcial;
- retry disponível;
- evento de auditoria sem segredo.

### Timeout

Esperado:

- `PROVIDER_TIMEOUT`;
- duração registrada;
- job/manual retry sem duplicação.

### Schema mismatch

Enviar booking sem `booking_id`.

Esperado:

- `PROVIDER_SCHEMA_MISMATCH`;
- nenhuma chamada à RPC;
- nenhuma mudança na viagem.

### Tenant incorreto

Usuário B tenta importar viagem da agência A.

Esperado:

- bloqueio antes do provider;
- `FORBIDDEN_TENANT`;
- nenhum vazamento de existência ou payload.

### Replay

Executar importação/sync 1, 2 e 10 vezes.

Esperado:

- uma raiz de viagem;
- um conjunto de passageiros por identificador externo;
- um conjunto de itens por localizador/ID externo;
- nenhum voucher duplicado.

### Cancelamento

Provider retorna serviço anteriormente existente como cancelado/removido.

Esperado:

- projeção InfoTravel atualizada;
- dado manual preservado;
- estado do item refletindo cancelamento;
- auditoria do delta.

## 8. Rollback

Antes da homologação, definir:

- migration reversível ou script de compensação;
- restauração da versão anterior do Edge Function;
- como impedir novos jobs durante rollback;
- como preservar eventos de auditoria;
- como reprocessar bookings depois da correção.

O rollback deve ser testado, não apenas descrito.

## 9. Evidência mínima para marcar como homologado

- [ ] fixture real sanitizada por operação;
- [ ] migration aplicada;
- [ ] RLS cross-tenant aprovada;
- [ ] health check real aprovado;
- [ ] busca real aprovada;
- [ ] importação real aprovada;
- [ ] sync real aprovado;
- [ ] replay aprovado;
- [ ] cancelamento aprovado;
- [ ] voucher conferido;
- [ ] embarque conferido;
- [ ] financeiro conferido;
- [ ] logs redacted;
- [ ] rollback ensaiado;
- [ ] evidência anexada ao ledger;
- [ ] revisão da PR concluída.

## 10. Próxima execução após homologação

Depois da Onda 9 e da prova real do provider:

1. implementar Onda 10 — jobs e retries;
2. implementar Onda 11 — trace ID, redaction e dashboards;
3. executar Onda 12 — release e regressão;
4. atualizar o dossiê end-to-end;
5. abrir PR específica ou continuar a PR #21 conforme decisão de revisão;
6. só então considerar merge em `main`.
