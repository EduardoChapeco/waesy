# Waesy — Backlog completo de prontidão para produção

**Data:** 2026-10-12
**Candidato:** `d0530a51` / PR #29
**Estado:** `MERGEABLE / CLEAN` nos checks de CI e Cloudflare Pages; `BLOCKED / STOP-SHIP` para banco, integrações, staging e produção até os gates externos serem comprovados
**Regra:** este documento é um plano de execução e evidência; itens não comprovados permanecem abertos.

## 1. Situação do candidato

O candidato foi consolidado no commit `d0530a51` e enviado ao PR #29. A árvore local está limpa e os gates locais foram aprovados:

- 282 arquivos de teste / 1.768 testes;
- `check:schema`: 500 migrations e versões únicas;
- `check:bff`: 0 contratos de tabela faltantes;
- `typecheck` e `git diff --check`: aprovados.

O PR tem **CI e Cloudflare Pages verdes no mesmo candidato** e está mergeable. Nenhuma migration remota, alteração de RLS/secrets ou promoção para produção foi executada pelo agente.

## 2. Fases obrigatórias antes de produção

| Fase | Prioridade | Status | O que executar | Evidência de conclusão |
|---|---|---|---|---|
| P0 — freeze e rebaseline | P0 | Aberta | Fixar SHA, base, ownership, lista de paths e hashes; eliminar divergência entre worktrees | Manifesto do candidato, `git status` limpo, SHA único e aprovação do owner |
| P1 — CI e Pages | P0 | Bloqueada | Diagnosticar falha do Cloudflare Pages, reproduzir build no mesmo SHA, validar bindings, lockfile e variáveis | Run CI verde + deployment ID Pages success no mesmo SHA |
| P2 — replay de banco | P0 | Não executada | Aplicar as 500 migrations from-zero e executar segunda aplicação sem drift | Logs completos, catálogo, checksum, functions/policies/grants e segunda aplicação verde |
| P3 — RLS/JWT multi-tenant | P0 | Não executada | Testar tenants A/B, anon, customer, staff, owner, admin e service role em leitura/escrita/erro | Matriz actor × operação × tenant, row-count esperado e zero vazamento |
| P4 — RPCs e concorrência | P0 | Não executada | Testar quota, Copilot, checkout, voucher, booking e contratos com requests concorrentes, retry e fault injection | Logs transacionais, rollback, idempotency ledger e read-after-write |
| P5 — identidade e autorização | P0 | Parcial local | Confirmar membership server-side, ausência de auto-heal implícito, isolamento de host/tenant e deny-by-default | Testes JWT reais, catálogo de grants e matriz BFF completa |
| P6 — Copilot boundary | P0 | Parcial local | Definir boundary único síncrono/SSE; implementar e testar parser SSE, cancelamento, reconnect, retry e reload | Trace browser completo, `AbortSignal` até provider, estados honestos e custo sem duplicidade |
| P7 — lifecycle e sagas | P0 | Parcial local | Verificar FSM, CAS, terminalidade, outbox, compensação, dedupe e recuperação de jobs interrompidos | Replay de crash, concorrência e matriz de transições aprovada |
| P8 — ecommerce/pagamentos | P0 | Parcial | Testar preço soberano, estoque, checkout, webhook assinado, idempotência, chargeback, cancelamento e reembolso | Provider sandbox, ledger financeiro, replay de webhook e reconciliação |
| P9 — turismo/booking | P0 | Aberta | Validar voucher, assento, booking, comissão, OCR, documentos, provider externo e callbacks | Evidence bundle W11/W12 com concorrência, rollback, PII e replay |
| P10 — Storage/mídia | P1 | Aberta | Validar bucket, path tenant, MIME, tamanho, hash, SVG, download, expiração e remoção | Snapshot de policies, asset ledger, testes de conteúdo e E2E upload→download |
| P11 — Studio/CMS/publish | P1 | Parcial | Testar draft, preview, publish, rollback, snapshot, agendamento, provenance e retry | Publish idempotente, read-after-write e recuperação de versão |
| P12 — browser/E2E | P1 | Aberta | Rodar Chromium desktop/mobile com anon, customer, staff, owner e tenants A/B | Traces, vídeos, screenshots, axe/keyboard, redirects e ausência de 404/ciclos |
| P13 — observabilidade | P1 | Aberta | Correlacionar request, tenant, actor, operation, idempotency key, provider e custo sem PII/segredo | Dashboards, alertas, logs redigidos e trace de ponta a ponta |
| P14 — performance/capacidade | P1 | Aberta | Medir p95/p99, pool DB, concorrência, filas, cache, cold start e limites do provider | Baseline, carga controlada, SLOs e plano de capacity/scale |
| P15 — segurança ofensiva | P0 | Aberta | SAST, dependency audit, secret scan, SSRF, XSS/SVG, IDOR, CSRF, replay, prompt injection e abuse rate | Relatório sem findings críticos/altos abertos ou exceções aprovadas |
| P16 — LGPD/privacidade | P1 | Aberta | Inventariar PII, retenção, exportação, exclusão, consentimento, auditoria e redaction de logs | Data map, políticas, testes de direito do titular e aprovação responsável |
| P17 — DR/backup/rollback | P0 | Aberta | Testar backup, restore, PITR, rollback de aplicação, migration forward-fix e replay de outbox | RTO/RPO medidos, runbook executado e evidência de restauração |
| P18 — supply chain | P1 | Aberta | Fixar lockfile, revisar dependências, provenance de build, permissões de CI e secrets | SBOM, audit sem crítico, build reproduzível e secrets mínimos |
| P19 — release/staging | P0 | Bloqueada | Deploy em staging do mesmo SHA, smoke, migração controlada, aprovação e janela de rollback | Release record SHA→CI→staging→smoke→aprovação |
| P20 — produção | P0 | Bloqueada | Somente após P0–P19: deploy, migration autorizada, smoke público, observabilidade e rollback standby | Deployment success, smoke público, incident owner e registro pós-release |
| P21 — pós-release | P1 | Aberta | Monitorar 24h/7d, reconciliar filas/financeiro, revisar erros e fechar exceções | Relatório pós-release, incident review e decisão de fechamento |

## 3. Melhorias futuras não bloqueantes, mas recomendadas

1. Gerar `types.ts` automaticamente do schema aplicado e validar fingerprint no CI.
2. Adicionar contract tests OpenAPI/DTO para cada BFF e cada RPC.
3. Criar ambiente efêmero por PR com banco descartável e fixtures multi-tenant.
4. Versionar feature flags e exigir owner, expiração e plano de remoção.
5. Adicionar canary release e percentual progressivo por tenant/host.
6. Criar DLQ operacional para outbox, WhatsApp, webhooks, AI jobs e bookings.
7. Adicionar reconciliação diária de pedidos, pagamentos, comissões e quotas.
8. Adicionar chaos tests para timeout, resposta vazia, provider 429/5xx, queda de banco e restart de worker.
9. Definir SLOs por domínio: disponibilidade, latência, erro, fila e frescor de dados.
10. Criar runbooks de incidentes para auth, RLS, pagamentos, provider, storage, AI e deploy.
11. Melhorar acessibilidade, navegação por teclado, contraste, leitores de tela e responsividade.
12. Fechar SEO técnico: metadata, canonical, sitemap, robots, social cards e páginas públicas.
13. Adicionar política de depreciação para RPCs, migrations, tabelas e endpoints legados.
14. Automatizar inventário de rotas, menus, actions e permissões com drift detection.
15. Adicionar testes de browser para refresh durante envio, mudança de thread, aba duplicada e conexão intermitente.
16. Instrumentar custo por operação AI, provider, tenant e usuário com limites e alertas.
17. Implantar revisão trimestral de grants, policies, tokens, secrets, buckets e usuários privilegiados.
18. Documentar onboarding explícito, recuperação de conta, convite e remoção de acesso sem inferência por email.

## 4. Critérios de fechamento de uma fase

Uma fase só pode ser marcada como `closed` quando houver, no mesmo SHA candidato:

- owner e timestamp;
- comando/reprodução documentados;
- ambiente identificado;
- logs ou artefatos preservados;
- evidência positiva e negativa;
- teste de retry/erro quando aplicável;
- impacto de segurança e tenant avaliado;
- rollback ou compensação demonstrado;
- dependências anteriores fechadas;
- aprovação do responsável pelo domínio.

Teste unitário, mock, typecheck, build ou check textual isolado **não fecha** banco, RLS, provider, browser, staging ou produção.

## 5. Ordem recomendada depois do PR

1. Corrigir e reexecutar o Cloudflare Pages no mesmo SHA.
2. Fazer merge somente quando os dois checks obrigatórios estiverem verdes.
3. Criar candidato de release limpo a partir do merge, sem reaproveitar worktree sujo.
4. Executar replay de banco e RLS/JWT em ambiente autorizado.
5. Executar staging e E2E no mesmo SHA.
6. Revisar e aprovar o release record.
7. Só então executar migration/deploy em produção com janela e rollback.
8. Monitorar e produzir o relatório pós-release.

**Conclusão:** o commit consolidado é um candidato técnico documentado, não uma certificação de produção. A promoção permanece bloqueada até as evidências externas acima existirem.
