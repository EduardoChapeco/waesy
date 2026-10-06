# Auditoria recursiva modular — Waesy — 2026-10-05

## Resultado executivo

**Status: FAIL.** A auditoria confirmou bloqueadores reais em segurança, mineração, Copilot/IA, builders, UI, Supabase/RLS e gates de qualidade. Os testes unitários existentes passam em escopos relevantes, mas não comprovam migrations, RLS real, concorrência, browser, cron ou providers externos.

A ordem de remediação deve ser:

1. contenção de secrets e webhooks;
2. gates de release e typecheck;
3. contrato de auditoria/cron de mining;
4. webhooks, checkout e isolamento multi-tenant;
5. filas, retries e idempotência de mining;
6. integridade editorial;
7. gateway/Copilot/squads/skills;
8. builders/Studio;
9. UI/browser/accessibility;
10. design system, tipos, dead code e documentação.

## Escopo auditado

- `src/services/mining` e workers/rotas de mining;
- Copilot, gateway de IA, conversas, skills e squads;
- builders, Studio, Omni Editor, Canvas BMC e exporters;
- botões, drawers, modais, navegação e acessibilidade;
- Supabase, RPCs, RLS, storage, webhooks, checkout e migrations;
- typecheck, lint, design-lint, tokens, budgets, tipos duplicados e código morto.

## Bloqueadores P0

### Segurança e integrações

- Credenciais de produção, service role, senha de banco, access tokens e tokens de cron foram encontrados versionados em documentação/configuração/scripts. **Exige revogação/rotação imediata no secret manager/provedores**, além da remoção do repositório.
- `/api/webhooks/pix` aceita payload público sem assinatura/segredo confiável e usa valores do payload para creditar tokens/ledger.
- `/api/webhooks/shipment` aceita alteração de pedido sem assinatura/provider/tenant.
- Webhooks de marketplace aceitam `?secret=` controlado pelo atacante ou ausência de secret.

### Mining e cron

- INSERTs em `scraper_audit_log` usam colunas não existentes no schema auditado (`status`, `items_processed`, `items_inserted`, `metadata`), podendo impedir migration/dispatch.
- Worker pode executar sem segredo quando variáveis não estão configuradas.
- Cron usa segredo estático em código/migration.

### Release e qualidade

- `npm run typecheck` foi observado com 140 erros em 52 arquivos, enquanto `npm run build` passa sem chamar typecheck.
- Design-lint passa com 1.557 P0 e 10.027 P1 porque o ratchet compara apenas aumentos relativos, apesar de `maxP0/maxP1` zero.
- Builder/Studio: exportação procura `#studio-canvas-stage` inexistente; projectId não é hidratado antes de salvar; documento legado pode ser sobrescrito por template.

## Principais P1

- Checkout confia em preço, loja, produto, frete e quantidade do browser; carrinho tem mutações com risco de IDOR; storage permite operações cross-tenant.
- Queue mining não faz claim atômico nem retry persistente; dedup compara URL hash com `title_hash`; PNCP usa UUID aleatório sem ID; RSS pode abortar feed por data inválida; eventos inventam data/local/gratuidade e podem publicar automaticamente.
- Gateway IA aceita chamadas sem autenticação/budget/rate limit, `systemPrompt` e `bypassCache`; contexto não entra no prompt/fingerprint; `stream` não é streaming real.
- Squads executa apenas líder, fabrica fallback/runId/aprovação e existem dois backends/rotas; Skills ignoram versões/tools/schemas/permissões/budget do banco.
- Studio não é controlado pelo documento canônico; vídeo não reproduz/exporta; HTML exportado não renderiza nodes; autosave/undo/redo ausentes.
- Divs clicáveis quebram teclado; drawers convertem erro em empty; chat SDR não tem diálogo/foco/Escape; registry tem ramo inalcançável de classificados.
- 7.641 warnings de lint, 14.284 violações de design, tipos `ResolvedGeoLocation`/`OrderItemDTO` duplicados, 508 violações de tamanho, 85 órfãos/23 colisões e budgets/sideEffects permissivos.
- Migrations têm prefixos duplicados e dependências não auto-contidas.

## Evidências principais

- Mining: `src/services/mining/crawler-batch-engine.ts`, `automated-harvest.ts`, `event-harvester.ts`, `pncp-extractor.ts`, `src/lib/mining/rss-ingester.engine.ts`, `src/routes/api.mining.worker.ts`, `src/routes/api.cron.mining-worker.ts`.
- Copilot: `src/services/ai-core-gateway.functions.ts`, `ai-conversations.functions.ts`, `squads-runtime.functions.ts`, `ai-skills-router.functions.ts`.
- Builders: `src/routes/workspace.estudio.index.tsx`, `src/components/studio/studio-canvas.tsx`, `src/services/builder-exporter.ts`, `src/routes/workspace.builder.$documentId.editor.tsx`.
- UI: `src/components/commerce/quick-create-modal.tsx`, `profession-search-dialog.tsx`, `service-search-dialog.tsx`, `cart-sheet.tsx`, `ai-sdr-chat.tsx`, `src/lib/navigation-registry.ts`.
- Backend: `src/routes/api.webhooks.pix.ts`, `api.webhooks.shipment.ts`, `marketplace-checkout.functions.ts`, `cart.functions.ts`, `cart-helpers.ts`, storage policies e migrations.
- Quality: `package.json`, `scripts/design-lint.mjs`, `.designlintrc.json`, `scripts/token-sync.mjs`, `scripts/check-route-size.mjs`, `scripts/dead-code-detector.mjs`, `src/routes/__root.tsx`.

## Plano de lotes

### Lote 1 — contenção

- Remover credenciais versionadas e adicionar scanner CI; rotação real fica no secret manager/provedores.
- Exigir assinatura HMAC server-side em Pix, shipment e marketplace; rejeitar ausência/erro/replay; nunca aceitar segredo em query string.
- Exigir segredo configurado no worker e retornar erro de configuração, não executar anonimamente.

### Lote 2 — release gates

- Incluir typecheck e testes no canonical/build/deploy.
- Corrigir os primeiros erros de TypeScript sem `any`/`ts-ignore`.
- Fazer design-lint bloquear P0/P1 novos/em arquivos tocados sem atualizar baseline histórica.

### Lote 3 — mining

- Corrigir schema de `scraper_audit_log` e validar migrations em banco limpo.
- Claim atômico com lease/`SKIP LOCKED`, retries/backoff/dead-letter.
- URL canônica + `url_hash`/constraint; PNCP sem ID vai para rejeição; RSS processa itens válidos; eventos incompletos não são publicados.
- Staging → `pending_review`; publicação exige gate editorial auditável.

### Lote 4 — backend/tenant

- Derivar preço/estoque/store/identidade no banco e usar RPC transacional.
- Ownership obrigatório em carrinho e storage; RLS real com dois tenants.
- Migration reset/deploy limpo com versões únicas e views/funções completas.

### Lote 5 — Copilot

- Auth, rate/budget, allowlist, fingerprint contextual, streaming/abort real.
- Mensagens/artefatos/memória idempotentes e autorizados.
- Um runtime de squads; N agentes/handoffs/acceptance/stop/budget/timeout reais.
- Skills devem resolver versão/tools/schema/permissões/budget do banco.

### Lote 6 — builders/UI

- DesignDocument versionado; hidratação antes de save; canvas controlado; export real; vídeo honesto.
- Semântica de controles, estados error/empty/retry, Dialog/foco/Escape, registry único e testes browser/axe.

## Critério de encerramento

Nenhum P0 será marcado como corrigido sem evidência da camada dependente: CI, HTTP, Postgres/Supabase, provider ou browser. Retornos de sucesso não podem mascarar falha, ausência de row, erro de rede, item incompleto, autorização ausente ou artefato inexistente.
