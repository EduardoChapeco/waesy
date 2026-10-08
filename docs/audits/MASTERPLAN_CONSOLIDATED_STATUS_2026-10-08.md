

## Preflight de produção — 2026-10-08 09:51 BRT

O preflight de release não autorizou afirmar deploy completo. O Wrangler está instalado, porém não autenticado; a CLI do Supabase não está instalada; não existem Edge Functions locais em `supabase/functions`; e o check `5 Quality Gates` da PR #21 ainda estava em andamento no snapshot. Portanto, migrations, secrets, RLS, Edge Functions e publicação Cloudflare permanecem **não verificados/bloqueados**, apesar dos gates locais anteriores e do check Cloudflare observado.

O ledger detalhado está em `docs/audits/20261008-release-preflight-evidence-ledger.md`. Nenhum segredo foi lido, alterado ou exposto; nenhum deploy remoto, migration remota ou merge em `main` foi executado nesta microfase.

## Onda 6 / Microfase seguinte — Edge Function InfoTravel

### Status consolidado

A lacuna crítica identificada no preflight foi implementada no código: o repositório agora contém a Edge Function `infotravel-connector`, seu módulo compartilhado e a migration de contrato/telemetria. O fluxo foi fechado do cliente ao boundary server-side: UI/serviço → `supabase.functions.invoke` → JWT/tenant guard → cofre de credenciais → provider HTTP → resposta normalizada.

### Caso de uso coberto: busca de hotel

1. Consultor abre a busca no Studio e envia `agencyId` e parâmetros.
2. O BFF valida que o usuário pertence à loja/agência.
3. A Edge Function lê somente a credencial ativa daquele `store_id`.
4. O payload criptografado é aberto apenas em memória.
5. O adapter chama o endpoint configurado para `search_hotels` com autenticação fora da URL.
6. Resposta de provider, timeout ou credencial ausente retorna código distinguível para a UI.
7. O evento registra ação, resultado e duração, sem token.

### Caso de uso coberto: importação de reserva

O conector recebe a reserva real do provider e expõe `normalized` com `booking_id`, locator, cliente, passageiros, voos e hotéis no formato esperado pelo pipeline de turismo. A persistência atômica continua sendo uma decisão explícita do fluxo de importação e não é simulada quando o provider não retorna dados suficientes.

### Critérios de completude atingidos nesta rodada

- Nenhuma chamada de provider é feita no browser.
- Nenhum segredo é colocado na URL ou no log de auditoria.
- Nenhum tenant é aceito apenas por parâmetro do cliente.
- Nenhuma credencial ausente recebe fallback fictício.
- A ausência da Edge Function deixou de ser silenciosa no checkout.
- Testes de contrato e typecheck passam.

### O que ainda precisa ser feito antes de chamar de produção

1. aplicar `20261008095500_infotravel_connector_contract.sql` no Supabase de homologação/produção;
2. configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `VAULT_MASTER_KEY` nos secrets da Edge Function;
3. registrar uma credencial real cifrada com `base_url`, modo de autenticação e caminhos por ação;
4. executar teste autenticado de conexão e uma busca de hotel/voo com provider real;
5. comparar o payload real com os mappers em `src/types/infotravel.ts`;
6. rodar suíte completa/build e atualizar o ledger com evidências HTTP, banco e RLS;
7. somente depois disso considerar merge em `main` e release.

O ponto importante é que o código está completo como adapter seguro e configurável, mas o contrato de negócio do provider não pode ser inventado. A validação externa do endpoint e do payload continua sendo uma dependência factual, não uma falha mascarada por mock.

## Atualização — integração conectada às páginas e ao ciclo de viagem

O produto agora oferece configuração operacional do InfoTravel no Hub de Integrações e ações de importação/sincronização na página de detalhe da viagem. A persistência usa a tabela canônica `tourism_trips`, respeita a loja autenticada e atualiza o estado de reserva pendente de emissão. O próximo teste de completude deve ser executado com uma credencial real e um booking real, pois somente o provider pode confirmar paths, autenticação e nomes finais dos campos de payload.
