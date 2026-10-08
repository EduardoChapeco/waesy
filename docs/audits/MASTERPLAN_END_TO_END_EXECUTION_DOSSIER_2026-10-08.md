# Dossiê End-to-End de Execução do Masterplan Waesy

**Data da consolidação:** 2026-10-08  
**Repositório:** `EduardoChapeco/waesy`  
**Branch de execução:** `execute/spec-master-travel-20261008`  
**PR:** [#21 — feat(travel): iniciar execução do masterplan de turismo](https://github.com/EduardoChapeco/waesy/pull/21)  
**Escopo:** OCR de turismo, catálogo global de hotéis, InfoTravel, lifecycle de viagens, Builder CMS e gates de release.

> Este documento registra decisões, evidências e análises operacionais. Ele não registra raciocínio privado; registra apenas os achados verificáveis, as hipóteses técnicas adotadas, as mudanças efetivamente feitas e os critérios ainda não comprovados.

---

## 1. Resumo executivo

A execução transformou uma integração InfoTravel parcialmente conectada em uma cadeia de código auditável:

```text
credencial por tenant
  → Edge Function autenticada
  → contrato infotravel-v1
  → mapper determinístico
  → RPC transacional idempotente
  → tourism_trips
  → passageiros + itens de confirmação
  → vouchers + embarques + financeiro
```

### Status atual

| Dimensão | Status | Evidência |
|---|---|---|
| Diagnóstico do masterplan | Concluído | Inventário e dossiê versionados |
| Onda 1 — OCR/flyer | Implementação auditada e corrigida | PR #21, testes de integridade |
| Onda 2 — catálogo global de hotéis | Implementação e wiring do painel | Migration, BFF e autocomplete |
| Onda 3 — InfoTravel seguro | Implementado localmente | Edge Function, vault, tenant guard |
| Onda 4 — reserva pendente/lifecycle | Implementado localmente | Estado `reserved_pending_issuance` e idempotência |
| Onda 5 — Builder CMS | Implementado e endurecido | renderer coverage, registry contract |
| Onda 6 — gates e documentação | Executado localmente | suíte/build registrados |
| Onda 7 — persistência transacional | Implementada no código | RPC `apply_infotravel_booking` |
| Onda 8 — contrato/mappers | Implementada com `infotravel-v1` | mappers por ação e schema mismatch |
| Onda 9 — módulos dependentes | Conectada ao DTO v1 | BFF, Proposal Studio e lifecycle |
| Supabase remoto | Não comprovado nesta sessão | exige projeto/credencial autorizado |
| Provider InfoTravel real | Não homologado | exige sandbox/fixture real |
| Browser E2E | Pendente | exige ambiente autenticado |
| Produção/merge em `main` | Não declarado | PR permanece aberta |

**Conclusão honesta:** a implementação de código e a documentação estão completas até a Onda 9. A integração ainda não deve ser marcada como operacionalmente homologada enquanto migration, RLS, provider real, browser E2E, jobs, observabilidade e rollback não forem comprovados.

---

## 2. O problema encontrado no início

### 2.1 Integração remota sem implementação auditável

O BFF já chamava:

```ts
supabase.functions.invoke("infotravel-connector")
```

Mas o checkout não continha a Edge Function correspondente. Isso produzia uma dependência remota não auditável e impedia confirmar:

- autenticação;
- isolamento por agência;
- carregamento de credenciais;
- formato de erro;
- timeout;
- normalização;
- rastreabilidade;
- ausência de fallback fictício.

### 2.2 Perda de erros estruturados

O SDK do Supabase podia entregar `FunctionsHttpError` sem que o BFF preservasse `error_code`. Isso confundia:

- credencial ausente;
- provider indisponível;
- URL inválida;
- timeout;
- falha de contrato;
- erro de autorização.

### 2.3 Persistência parcial

A importação/sincronização atualizava alguns arrays da viagem, mas não garantia atomicamente:

- passageiros;
- localizadores;
- itens de confirmação;
- replay sem duplicação;
- rollback após falha intermediária.

### 2.4 Duas famílias de schema

A auditoria identificou coexistência de estruturas legadas/unificadas em torno de viagens. A execução fixou `tourism_trips` como raiz operacional do fluxo trabalhado e registrou que a migração futura para outra família precisa ser uma decisão explícita, com backfill e compatibilidade.

### 2.5 Defaults comerciais perigosos

O fluxo de flyer e templates podia reintroduzir preços, parcelas ou inclusões fictícios quando o OCR não encontrava esses dados. Isso foi removido e protegido por testes para evitar que ausência de informação se transformasse em informação comercial falsa.

### 2.6 Builder com blocos sem caminho de renderização

O registry declarava blocos que não tinham caminho real no renderer. O gap foi convertido em gate: manifest sem renderer não pode passar silenciosamente.

---

## 3. Linha do tempo verificável

| Ordem | Commit | Entrega |
|---:|---|---|
| 1 | `6e45f018` | início da especificação mestre, OCR e catálogo global |
| 2 | `1144fbc7` | ligação do hotel workspace ao registry global |
| 3 | `c396db60` | endurecimento do InfoTravel e lifecycle de reserva |
| 4 | `f03e32bd` | cobertura registry → renderer do Builder |
| 5 | `a71dd346` | validação de manifests e bloqueio de blocos Omni desconhecidos |
| 6 | `171fd94e` | consolidação do status do masterplan e gates |
| 7 | `16f939d6` | preflight de release e bloqueios externos documentados |
| 8 | `d93c5b7e` | reimplementação da Edge Function `infotravel-connector` |
| 9 | `151bcbbe` | wiring do GDS no Hub de Integrações e detalhe de viagens |
| 10 | `8ac454dd` | plano pós-Onda 6 e critérios de completude recursiva |
| 11 | `5f0948b8` | RPC transacional e idempotente de aplicação do booking |
| 12 | `b658f8b4` | contrato versionado `infotravel-v1` e mappers |
| 13 | `446665cd` | wiring dos módulos dependentes ao DTO v1 |
| 14 | este dossiê | consolidação end-to-end, auditoria e plano futuro |

A PR #21 contém a sequência acima e permanece aberta para revisão:

https://github.com/EduardoChapeco/waesy/pull/21

---

## 4. O que foi efetivamente implementado

## 4.1 Onda 1 — OCR/flyer e integridade comercial

### Entregas

- remoção de defaults falsos de preço;
- preservação de preço ausente como nulo;
- prevenção de parcelas e inclusões inventadas;
- proteção no modal de flyer;
- proteção no template editorial;
- testes de regressão para bloquear reintrodução de mocks comerciais.

### Caso de uso

Se um flyer contém apenas destino e data, o sistema não pode publicar:

```text
R$ 2.490,00 em 10x
```

sem que essa informação exista no documento. O resultado correto é ausência explícita de preço, permitindo revisão humana.

---

## 4.2 Onda 2 — catálogo global de hotéis

### Entregas

- migration de `global_hotels` e aliases;
- deduplicação por nome normalizado;
- escopo de avaliações;
- RLS por tenant;
- endpoint canônico no BFF;
- `HotelAutocompleteInput` com debounce;
- integração no painel principal de hotéis;
- persistência de `global_hotel_id` no legado.

### Caso de uso

Ao cadastrar “Hotel Azul Recife” uma segunda vez, o sistema deve sugerir o registro canônico, em vez de criar duplicata silenciosa.

---

## 4.3 Onda 3 — Edge Function InfoTravel

### Entregas

A Edge Function:

- autentica Bearer JWT;
- valida usuário;
- valida tenant/agência;
- verifica membership em `workspace_members`;
- permite `master`/`platform_admin` conforme regra existente;
- carrega credencial ativa por `store_id + provider`;
- descriptografa `secret_payload_encrypted` via AES-256-GCM;
- mantém compatibilidade controlada com payload legado;
- constrói request HTTP sem segredo na URL;
- suporta bearer, API key, basic e body auth;
- usa `action_paths` configuráveis;
- aplica timeout de 30 segundos;
- retorna códigos estruturados;
- registra evento mínimo sem segredo.

### Erros explícitos

- `UNAUTHENTICATED`;
- `FORBIDDEN_TENANT`;
- `CREDENTIALS_NOT_CONFIGURED`;
- `PROVIDER_CONTRACT_NOT_CONFIGURED`;
- `INVALID_PROVIDER_URL`;
- `PROVIDER_CREDENTIALS_INCOMPLETE`;
- `PROVIDER_TIMEOUT`;
- `PROVIDER_UNAVAILABLE`;
- `PROVIDER_ERROR`;
- `PROVIDER_SCHEMA_MISMATCH`.

---

## 4.4 Onda 4 — lifecycle e reserva pendente

### Entregas

- estado `reserved_pending_issuance`;
- conversão idempotente da proposta;
- prevenção de duplicação no fallback legado;
- propagação de `reservation_state` nos DTOs;
- vínculo entre proposta, viagem, contrato, voucher e Kanban.

### Caso de uso

Uma proposta aprovada não deve ser confundida com uma reserva emitida. A viagem pode existir em estado pendente enquanto o operador confirma a emissão no GDS.

---

## 4.5 Onda 5 — Builder CMS modular

### Entregas

- renderer faltante para bloco de contrato;
- teste de cobertura registry → renderer;
- validador de schema, `defaultProps` e Inspector;
- schemas adicionados para superfícies sem contrato;
- correções de design schema em carrossel, cronômetro, vitrine, anúncio e oferta;
- permissão de estado inicial sem imagem quando válido;
- bloqueio de publicação de bloco Omni desconhecido.

### Regra criada

Manifesto declarado no registry sem componente de renderização não é mais tratado como fallback silencioso.

---

## 4.6 Onda 6 — gates e preflight

### Evidências registradas

- suíte completa executada em rodada anterior;
- build de produção executado em rodada anterior;
- client-leak check documentado;
- design lint executado;
- artefatos gerados pelo lint não foram incluídos indevidamente;
- preflight de release registrou bloqueios reais;
- deploy e merge em `main` não foram executados, conforme escopo solicitado.

---

## 4.7 Onda 7 — persistência transacional

### Migration

```text
supabase/migrations/20261008101500_infotravel_atomic_booking_apply.sql
```

### RPC

```text
apply_infotravel_booking
```

### Garantias implementadas

1. valida `(trip_id, store_id)`;
2. bloqueia a viagem com `FOR UPDATE`;
3. atualiza a raiz `tourism_trips`;
4. remove apenas projeções InfoTravel da mesma reserva;
5. preserva dados manuais;
6. aplica passageiros;
7. aplica voos;
8. aplica hotéis;
9. aplica transfers;
10. aplica tours;
11. cria itens de confirmação;
12. retorna contadores sanitizados;
13. evita retornar payload bruto ao browser.

### Caso de uso

Se uma sincronização falhar depois da atualização da viagem, a operação deve falhar como unidade, em vez de deixar viagem atualizada e passageiros antigos.

---

## 4.8 Onda 8 — contrato `infotravel-v1`

### Entregas

- versão declarada: `infotravel-v1`;
- mapper por ação;
- mapper determinístico de hotel;
- mapper determinístico de voo;
- mapper de booking;
- envelope para buscas;
- rejeição de booking sem identificador;
- erro `PROVIDER_SCHEMA_MISMATCH`;
- IDs externos estáveis para replay/deduplicação.

### Exemplo de envelope

```json
{
  "contract_version": "infotravel-v1",
  "action": "search_hotels",
  "offers": []
}
```

### Regra de segurança de dados

Payload não reconhecido não deve ser gravado apenas porque possui campos parecidos. Primeiro valida-se o contrato; depois executa-se a RPC.

---

## 4.9 Onda 9 — wiring end-to-end interno

### Consumidores conectados

- `SectionHotels`;
- `SectionFlights`;
- Proposal Studio;
- BFF de busca;
- importação de booking;
- sincronização de booking;
- conversão de booking v1 para `NormalizedBooking`;
- `tourism_trips`;
- `trip_passengers`;
- `trip_confirmation_items`;
- `tourism_vouchers`;
- Kanban de embarques;
- `financial_details` e `total_cents`.

### Correções importantes

- buscas não fazem mais cast direto de payload bruto;
- importação exige envelope v1;
- sync exige envelope v1;
- teste de conexão entende o status versionado;
- IDs externos são carregados nos tipos canônicos;
- o fluxo legado não pode persistir booking sem contrato v1.

---

## 5. Evidências de validação local

| Fase | Testes focados | Typecheck | Diff check |
|---|---:|---|---|
| Edge Function inicial | 8/8 | aprovado | aprovado |
| Onda 7 | 12/12 | aprovado | aprovado |
| Onda 8 | 14/14 | aprovado | aprovado |
| Onda 9 | 17/17 | aprovado | aprovado |

Também existem gates anteriores registrados para Builder, catálogo global, lifecycle e masterplan.

### O que esses gates provam

- contratos estáticos coerentes;
- mappers determinísticos;
- ausência de regressão nos arquivos cobertos;
- compilação TypeScript;
- ausência de whitespace inválido no diff.

### O que esses gates não provam

- provider externo real;
- Supabase remoto;
- RLS executada em duas lojas reais;
- browser E2E autenticado;
- comportamento de rede real;
- latência e timeout externo;
- rollback em ambiente de homologação;
- secrets configurados.

---

## 6. Matriz end-to-end de completude

| Etapa | Código | Teste local | Ambiente real | Status |
|---|---|---|---|---|
| Configurar credencial | Implementado | contrato | não executado | parcial |
| Testar conexão | Implementado | contrato | provider real pendente | parcial |
| Buscar hotel | Implementado | mapper | endpoint real pendente | parcial |
| Buscar voo | Implementado | mapper | endpoint real pendente | parcial |
| Selecionar oferta | Implementado no Proposal Studio | componente | browser pendente | parcial |
| Criar proposta | Implementado | lifecycle existente | browser pendente | parcial |
| Aprovar proposta | Implementado | lifecycle existente | browser pendente | parcial |
| Criar viagem | Implementado | testes de lifecycle | migration remota pendente | parcial |
| Importar booking | Implementado | 17 gates acumulados | provider/DB real pendente | parcial |
| Aplicar passageiros | RPC implementada | contrato estático | SQL/RLS pendente | parcial |
| Aplicar localizadores | RPC implementada | contrato estático | SQL real pendente | parcial |
| Sincronizar booking | Implementado | wiring | provider/DB real pendente | parcial |
| Emitir voucher | Implementado no lifecycle | testes existentes | browser/DB pendente | parcial |
| Exibir embarque | Implementado no Kanban | testes de domínio | browser/DB pendente | parcial |
| Atualizar financeiro | Implementado | lifecycle | reconciliação real pendente | parcial |
| Retry automático | Planejado | não iniciado | não iniciado | pendente |
| Trace end-to-end | parcial em eventos | parcial | não comprovado | pendente |
| Rollback | migration/RPC projetadas | não executado em DB | não executado | pendente |

---

## 7. O que ainda precisa ser feito

## 7.1 Onda 10 — jobs, retries e idempotência operacional

### Objetivo

Tornar sincronização resiliente e observável sem depender de clique manual.

### Implementação necessária

- tabela `infotravel_sync_jobs`;
- chave de idempotência por tenant, viagem, booking e versão;
- worker único;
- backoff exponencial com teto;
- dead-letter state;
- lock de execução;
- retry manual pelo operador;
- estado de última sincronização na página da viagem;
- alerta de credencial expirada;
- alerta de provider indisponível.

### Casos de uso

1. provider demora e responde timeout;
2. worker tenta novamente sem duplicar passageiros;
3. provider retorna 401 e o job fica em erro acionável;
4. duas execuções simultâneas disputam o mesmo booking;
5. processo reinicia durante a tentativa;
6. operador força retry depois de corrigir credencial.

### Critério de aceite

Replay 1x, 2x e 10x deve produzir um único conjunto de projeções InfoTravel.

---

## 7.2 Onda 11 — observabilidade, auditoria e segurança

### Implementação necessária

- `trace_id` desde UI/BFF/Edge/RPC;
- redaction de token, senha, API key, Bearer e CPF;
- external booking mascarado nos logs;
- duração e código de erro por etapa;
- painel de sucesso/erro/timeout/schema mismatch;
- rotação de credencial;
- revogação de credencial;
- auditoria de alteração de configuração.

### Critério de aceite

Um teste automatizado deve falhar se logs capturados contiverem:

```text
Authorization
Bearer
password
api_key
secret_payload
CPF completo
```

---

## 7.3 Onda 12 — homologação e release

### Pré-condições

- migration aplicada em homologação;
- secrets configurados por canal autorizado;
- credencial sandbox real;
- fixtures sanitizadas;
- CI verde no mesmo SHA;
- browser smoke test aprovado;
- plano de rollback revisado.

### Release gate obrigatório

- [ ] CI verde;
- [ ] migration aplicada;
- [ ] RLS testada com loja A;
- [ ] RLS testada com loja B;
- [ ] `master/platform_admin` validado;
- [ ] conexão real aprovada;
- [ ] busca real de hotel aprovada;
- [ ] busca real de voo aprovada;
- [ ] importação real aprovada;
- [ ] sync real aprovado;
- [ ] replay sem duplicação;
- [ ] cancelamento de serviço;
- [ ] passageiros conferidos;
- [ ] localizadores conferidos;
- [ ] voucher conferido;
- [ ] embarque conferido;
- [ ] financeiro reconciliado;
- [ ] logs sem segredo;
- [ ] rollback ensaiado;
- [ ] PR revisada;
- [ ] merge somente após aprovação.

---

## 8. Plano de validação operacional

### Fase A — banco

1. aplicar migrations em ambiente de homologação;
2. verificar funções e índices;
3. testar RLS com usuário da loja A;
4. testar leitura cruzada da loja B;
5. testar acesso de platform admin;
6. executar RPC com booking fixture sanitizado;
7. repetir dez vezes;
8. interromper no meio e conferir rollback.

### Fase B — provider

1. cadastrar `base_url` oficial;
2. cadastrar `action_paths` oficiais;
3. configurar autenticação por secret vault;
4. executar health check;
5. capturar fixture sanitizada;
6. comparar campos reais com `infotravel-v1`;
7. ajustar somente mapper documentado;
8. repetir busca/import/sync.

### Fase C — browser

```text
abrir configurações
→ salvar credencial
→ testar conexão
→ abrir Proposal Studio
→ buscar hotel
→ selecionar oferta
→ buscar voo
→ salvar proposta
→ aprovar proposta
→ abrir viagem
→ importar booking
→ conferir passageiros
→ conferir localizadores
→ sincronizar
→ gerar voucher
→ abrir embarque
→ conferir financeiro
```

Cada passo precisa capturar:

- sucesso;
- estado vazio;
- loading;
- erro;
- retry;
- evidência de que não houve duplicação.

---

## 9. Decisões arquiteturais registradas

### Decisão 1 — segredos somente server-side

Credenciais não são enviadas pelo browser diretamente ao provider e não são colocadas na URL.

### Decisão 2 — tenant derivado da sessão

`agencyId` informado pelo cliente é conferido contra a identidade da sessão e o papel do usuário.

### Decisão 3 — `tourism_trips` como raiz operacional desta execução

A decisão é limitada ao fluxo trabalhado nesta branch. Uma migração para outra família de tabelas não deve ser feita por writes paralelos improvisados.

### Decisão 4 — contrato versionado antes de persistência

A persistência recebe somente DTO reconhecido. Payload desconhecido gera erro explícito.

### Decisão 5 — projeção InfoTravel separada de dados manuais

Reimportação remove/substitui somente registros identificados como projeção InfoTravel da mesma reserva.

### Decisão 6 — ausência de dado não vira preço fictício

OCR, provider ou mapper não podem inventar preço, parcela, inclusão ou localizador.

---

## 10. Riscos remanescentes

| Risco | Impacto | Mitigação planejada |
|---|---|---|
| endpoint real diferente do configurado | alto | fixture/sandbox e capability discovery |
| resposta real fora do v1 | alto | schema mismatch e mapper versionado |
| migration não aplicada | alto | runbook de homologação e checksum |
| RLS incorreta | crítico | testes cross-tenant |
| sync concorrente | alto | job lock + idempotency key |
| segredo em log | crítico | redaction automatizada |
| família de schema duplicada | alto | decisão de compatibilidade/backfill |
| voucher antes de confirmação | médio | estados de reserva e emissão |
| divergência preço provider/venda | alto | reconciliação financeira explícita |
| ausência de browser E2E | médio | smoke test autenticado |

---

## 11. Definição final de pronto

A integração só pode ser considerada completa quando uma reserva real completar:

```text
credencial segura
→ health check
→ busca real
→ proposta
→ aprovação
→ reserva pendente
→ importação
→ passageiros
→ localizadores
→ sync
→ voucher
→ embarque
→ financeiro
→ auditoria
→ retry idempotente
→ rollback testado
```

E uma falha em qualquer etapa deve produzir:

- erro explícito;
- estado consistente ou rollback;
- retry seguro;
- trace ID;
- nenhum segredo exposto;
- nenhuma duplicação.

---

## 12. Arquivos de referência do dossiê

- `docs/specs/SPEC-MASTER-TRAVEL-OCR-INFOTRAVEL-CMS-BUILDER.md` — especificação mestre;
- `docs/audits/SPEC_MASTER_TRAVEL_EXECUTION_INVENTORY_2026-10-08.md` — ledger de execução;
- `docs/audits/MASTERPLAN_CONSOLIDATED_STATUS_2026-10-08.md` — status consolidado;
- `docs/audits/POST_WAVE6_EXECUTION_PLAN_2026-10-08.md` — plano pós-Onda 6;
- `docs/audits/20261008-release-preflight-evidence-ledger.md` — preflight e bloqueios de release;
- `docs/audits/CLOUDFLARE_PAGES_RELEASE.md` — documentação de release existente;
- `supabase/functions/_shared/infotravel.ts` — contrato e mappers da Edge Function;
- `src/services/infotravel.ts` — BFF e aplicação transacional;
- `supabase/migrations/20261008101500_infotravel_atomic_booking_apply.sql` — RPC da Onda 7;
- `src/services/infotravel-connector-contract.test.ts` — contrato do conector;
- `src/services/infotravel-wave7-atomic.test.ts` — atomicidade;
- `src/services/infotravel-wave9-wiring.test.ts` — wiring dos módulos.

---

## 13. Estado do artefato

Este dossiê é parte do commit da branch `execute/spec-master-travel-20261008` e da PR #21. Ele deve ser atualizado a cada onda posterior com:

1. commit SHA;
2. arquivos alterados;
3. gates executados;
4. evidências reais;
5. lacunas ainda abertas;
6. decisão de não declarar produção sem homologação.
