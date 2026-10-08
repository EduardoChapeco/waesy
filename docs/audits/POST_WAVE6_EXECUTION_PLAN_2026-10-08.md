# Plano de execução pós-Onda 6 — integração InfoTravel e completude transversal

**Data:** 2026-10-08  
**Branch:** `execute/spec-master-travel-20261008`  
**Status:** plano executável; não é declaração de produção

## 1. Veredito atual

A Onda 6 entregou o boundary seguro do conector InfoTravel, a configuração no Hub de Integrações, o teste de conexão e os botões de importação/sincronização no detalhe da viagem. Os testes locais e o typecheck passam.

Ainda não é correto declarar a integração completa. A auditoria pós-Onda 6 encontrou três bloqueios funcionais:

1. **Sincronização incompleta:** `syncInfotravelTrip` chama `run_periodic_sync`, mas atualmente apenas retorna o resultado do provider; não aplica o payload normalizado à viagem.
2. **Importação parcial:** `importInfotravelBookingToTrip` atualiza arrays e dados básicos de `tourism_trips`, mas não grava de forma transacional os passageiros em `trip_passengers` nem os localizadores em `trip_confirmation_items`.
3. **Duplicidade estrutural:** o repositório contém uma família legada `tourism_trips`/`trip_passengers`/`trip_confirmation_items` e uma família unificada `trips`/`trip_passengers` criada posteriormente. Como a migration unificada usa `CREATE TABLE IF NOT EXISTS`, ela não resolve automaticamente a colisão de `trip_passengers`. Antes de novos writes, é obrigatório fixar a tabela canônica e documentar o plano de compatibilidade.

Também existem bloqueios externos factuais: migration ainda não comprovada em ambiente Supabase, secrets não comprovados, endpoint/credencial InfoTravel reais ausentes e checks remotos da PR ainda pendentes.

## 2. Regra de completude

Uma melhoria só será marcada como **CONCLUÍDA** quando cumprir todos os níveis abaixo:

| Nível | Evidência obrigatória |
|---|---|
| Contrato | Zod/schema versionado, payload de entrada e saída documentados |
| Segurança | tenant derivado da sessão, segredo fora do browser/URL/log, RLS testada |
| Persistência | write transacional ou RPC idempotente, erros verificados e rollback demonstrado |
| Produto | página, módulo, estado loading/empty/error/success e reprocessamento conectados |
| Observabilidade | `trace_id`, ação, duração, resultado e erro sem dados sensíveis |
| Testes | unitário, contrato, integração com DB/RLS e jornada browser |
| Operação | migration, secrets, smoke test e rollback documentados |
| Auditoria | finding, commit, SHA, evidência e status no ledger |

Não usar mocks como prova de provider real. Fixtures são permitidas apenas para testes determinísticos de normalização e falha.

## 3. Onda 7 — canonização e persistência transacional InfoTravel

### Objetivo

Fechar a cadeia `provider → normalizador → persistência → aggregate`, sem perda de passageiros/localizadores e sem duplicação em replay.

### Execução

1. Escolher formalmente `tourism_trips` como raiz do fluxo legado operacional ou migrar o fluxo para `trips`/`agencies`.
2. Criar um documento de decisão de schema com:
   - tabela raiz canônica;
   - tabela de passageiros canônica;
   - tabela de itens de confirmação canônica;
   - chaves naturais;
   - estratégia de compatibilidade e backfill;
   - data de remoção da família duplicada.
3. Criar RPC transacional `apply_infotravel_booking` ou equivalente.
4. A RPC deve:
   - validar `(trip_id, store_id)` dentro do banco;
   - atualizar a viagem somente após localizar o tenant correto;
   - fazer upsert dos passageiros por `trip_id + external_passenger_id` ou fingerprint determinístico;
   - fazer upsert dos itens por `trip_id + item_type + locator_code + external_item_id`;
   - substituir/atualizar apenas projeções pertencentes àquela reserva;
   - registrar `source=infotravel`, `external_booking_id` e `source_payload_version`;
   - retornar o aggregate aplicado;
   - falhar atomicamente se qualquer write falhar.
5. Alterar importação e sincronização para usar a mesma RPC. Não manter dois caminhos de persistência.
6. Remover `providerResult` bruto da resposta do browser; retornar somente DTO sanitizado e `traceId`.

### Casos de uso

- Importar booking pela primeira vez.
- Reimportar o mesmo booking.
- Sincronizar booking com um novo hotel.
- Sincronizar booking removendo um serviço cancelado.
- Provider retornar dois passageiros com mesmo nome.
- Provider falhar depois de atualizar a viagem, garantindo rollback.
- Usuário tentar importar uma viagem de outra loja.
- Duas sincronizações simultâneas do mesmo booking.

### Gate

- Teste SQL/RPC de atomicidade.
- Replay 1x, 2x e 10x sem duplicação.
- Teste RLS cross-tenant.
- Teste de cancelamento/remoção de serviço.
- Teste de resposta sem token, senha ou payload bruto.

## 4. Onda 8 — contrato real do provider e mappers versionados

### Objetivo

Trocar o adapter genericamente configurável por mappers comprovados pelo payload real do provider.

### Execução

1. Obter um payload real ou sandbox autorizado para cada ação:
   - health/test;
   - hotéis;
   - voos;
   - transfers;
   - atividades;
   - importação de booking;
   - sync.
2. Salvar apenas fixtures sanitizadas sem tokens, CPF completo ou dados pessoais desnecessários.
3. Versionar mappers por contrato, por exemplo `infotravel-v1`.
4. Validar com Zod antes de persistir.
5. Rejeitar payload desconhecido com `PROVIDER_SCHEMA_MISMATCH`, sem gravar parcialmente.
6. Criar tabela de capability discovery para não exibir operações que o provider não oferece.

### Gate

- Fixture real sanitizada por ação.
- 100% dos campos persistidos cobertos por teste.
- Teste de payload incompleto, campo inesperado, datas inválidas, valores negativos e moeda ausente.
- Compatibilidade backward para bookings já importados.

## 5. Onda 9 — jornada de usuário e módulos dependentes

### Objetivo

Garantir que todas as superfícies do produto usem o mesmo contrato InfoTravel.

### Superfícies

- Hub de Integrações: configuração, edição parcial, rotação, desativação e teste.
- Cotação: busca de hotéis/voos e seleção de oferta.
- Proposta: inclusão dos serviços escolhidos sem defaults fictícios.
- Conversão proposta → viagem: reserva pendente e vínculo externo.
- Detalhe da viagem: importação, sync, conflitos e histórico.
- Vouchers: geração somente após dados confirmados.
- Passageiros: documentos e rooming list.
- Embarques/Kanban: estado derivado da reserva e emissão.
- Financeiro: total em centavos, moeda e divergência provider versus venda.
- Builder/CMS: componentes de viagem consumindo DTO canônico, sem campos inventados.

### Gate

Uma jornada browser completa deve demonstrar:

```text
configurar provider
→ testar conexão
→ buscar serviço
→ selecionar oferta
→ criar proposta
→ converter em viagem
→ importar/sincronizar booking
→ conferir passageiros/localizadores
→ gerar voucher
→ visualizar embarque
```

Cada etapa deve ter evidência de sucesso, vazio, loading, erro e retry.

## 6. Onda 10 — jobs, retries e idempotência operacional

### Objetivo

Tirar a sincronização do caminho apenas manual e torná-la resiliente.

### Execução

1. Criar `infotravel_sync_jobs` com:
   - `store_id`;
   - `trip_id`;
   - `external_booking_id`;
   - `status`;
   - `attempt_count`;
   - `next_attempt_at`;
   - `last_error_code`;
   - `trace_id`;
   - timestamps.
2. Criar worker único usando `executeAsyncJobSafely`.
3. Usar backoff com limite e dead-letter state.
4. Usar idempotency key por `(store_id, trip_id, external_booking_id, provider_version)`.
5. Expor no detalhe da viagem:
   - última sincronização;
   - próxima tentativa;
   - erro canônico;
   - botão retry;
   - histórico resumido.
6. Criar alerta de credencial expirada e provider indisponível.

### Gate

- Timeout real do provider.
- Retry limitado.
- Dois workers concorrentes sem duplicação.
- Falha permanente visível para operador.
- Job recuperado após reinício.

## 7. Onda 11 — observabilidade, auditoria e segurança

### Objetivo

Provar o comportamento sem expor dados sensíveis.

### Execução

- Correlacionar browser, BFF, Edge Function, provider e RPC por `trace_id`.
- Registrar somente:
  - tenant hash/ID autorizado;
  - ação;
  - status;
  - duração;
  - código de erro;
  - external booking id mascarado.
- Nunca registrar:
  - token;
  - senha;
  - API key;
  - Authorization header;
  - payload bruto com PII.
- Criar dashboards de:
  - taxa de sucesso;
  - latência p50/p95;
  - timeout;
  - schema mismatch;
  - retries;
  - reservas pendentes.
- Testar rotação e revogação de credencial.

### Gate

Teste automatizado de redaction procurando padrões de token, senha, `Bearer`, CPF e Authorization nos logs capturados.

## 8. Onda 12 — homologação, release e regressão

### Pré-condições

- migration aplicada em homologação;
- secrets configurados via canal autorizado;
- credencial sandbox real;
- fixtures sanitizadas;
- checks CI verdes no mesmo SHA;
- browser smoke test aprovado;
- plano de rollback revisado.

### Release gate

Só marcar como pronto quando todos forem verdadeiros:

- [ ] CI unificado verde;
- [ ] Cloudflare Pages verde, se aplicável;
- [ ] migrations aplicadas e confirmadas;
- [ ] RLS testada em usuário da loja A, loja B e platform admin;
- [ ] teste de conexão real aprovado;
- [ ] busca real aprovada;
- [ ] importação real aprovada;
- [ ] sync real aprovado;
- [ ] replay sem duplicação aprovado;
- [ ] voucher e embarque conferidos;
- [ ] logs sem segredo;
- [ ] rollback ensaiado;
- [ ] PR revisada e merge somente após checks finais.

## 9. Ordem recomendada de execução

1. **Agora:** Onda 7 — decisão de schema e RPC transacional.
2. **Depois:** Onda 8 — payload real e mappers versionados.
3. **Em paralelo controlado:** Onda 11 — redaction e trace ID.
4. **Depois do contrato:** Onda 9 — wiring das superfícies de cotação/proposta/voucher/embarque.
5. **Após persistência estável:** Onda 10 — jobs e retries.
6. **Final:** Onda 12 — homologação e release.

Não iniciar automação recorrente antes da Onda 7: um job confiável sobre persistência não canônica apenas automatiza duplicações e estados incorretos.

## 10. Definição de pronto da integração

A integração será considerada completa somente quando uma reserva real puder ser processada do início ao fim:

```text
credencial segura
→ health check
→ busca real
→ proposta
→ reserva pendente
→ importação
→ passageiros
→ localizadores
→ sync
→ voucher
→ embarque
→ auditoria
→ retry idempotente
```

E quando uma falha em qualquer etapa produzir:

- erro explícito;
- rollback ou estado pendente consistente;
- retry seguro;
- rastreabilidade por trace ID;
- nenhuma informação sensível exposta;
- nenhuma duplicação de viagem, passageiro ou serviço.
