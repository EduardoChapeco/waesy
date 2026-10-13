# Correção de fallbacks de tenant — Travel lifecycle, Master e Mining

**Data:** 2026-10-12 BRT
**Branch:** `fix/waesy-release-lockfile-security`
**Commit de código:** `1a0a6baa3c3c12d9c331fb7adf751888437b2643`
**PR:** #29

## Escopo

Remoção dos fallbacks silenciosos que escolhiam a primeira loja, a loja raiz ou uma loja arbitrária quando o contexto de tenant não estava resolvido.

## Correções

### Travel lifecycle

- `listStoreTrips` agora exige `requireStaff()` e usa somente `identity.store_id`.
- `saveConfirmationItem` agora exige staff, grava no tenant autenticado e restringe updates por `id` **e** `store_id`.
- `createManualTrip` agora exige staff; `data.storeId`, quando informado, deve coincidir com o tenant autenticado.
- Removido todo fallback `firstStore` do arquivo.

### Master

- `resolvePlatformRootStore` agora retorna somente uma raiz explicitamente configurada por `is_platform_root` ou slug canônico.
- Ausência de raiz retorna `null`.
- Removida a promoção automática da primeira loja registrada para raiz da plataforma.
- A inicialização da raiz permanece somente no fluxo administrativo explícito de atualização de marca.

### Mining

- Curadoria individual não consulta mais `rootStore` nem `anyStore` para aprovar artigos.
- Curadoria em lote segue o mesmo contrato.
- Aprovação sem `store_id` explícito ou `identity.store_id` falha com erro claro e não chama a RPC.
- Rejeição continua compatível com o contrato existente, sem inventar tenant.

## Validações locais

| Gate | Resultado |
|---|---:|
| Teste de segurança de fallbacks | PASS |
| Testes de travel voucher/conversão | PASS |
| Total da suíte focal | **14/14 PASS** |
| `npm run typecheck` | **PASS** |
| `git diff --check` | **PASS** |
| Scan dos fallbacks nos três escopos | **PASS** |

O scan ainda encontra consultas legítimas fora deste escopo: seleção de contrato mais recente em travel, um fluxo independente de `rootStore` em mining e `defaultOrg` organizacional. Nenhuma pertence aos handlers de tenant corrigidos nesta fase.

## Critério de segurança

Nenhum handler corrigido pode inferir silenciosamente um tenant a partir da ordem de criação ou da existência de outra loja. Quando o contexto é necessário e não existe, a operação falha explicitamente ou usa o default público/documental apropriado.

## Pendências externas

Os checks do GitHub Actions e do Cloudflare Pages foram confirmados como **SUCCESS** no head publicado do PR #29. Para certificação de produção, ainda faltam replay autorizado de RLS/Postgres, browser E2E e smoke de staging.
