# Full Remediation — Handoff do commit de continuidade

**Data:** 2026-10-08  
**Branch:** `audit/full-remediation-20261007`  
**Base da continuidade:** commit R6 `fc8f9fc3`  
**HEAD revisado neste handoff:** `b09de99f`
**Escopo:** somente o repositório `EduardoChapeco/waesy`; branches paralelas não foram incorporadas.

## 1. O que foi consolidado

Esta branch preserva o trabalho P0/R6 anterior e registra a remediação incremental de segurança e integridade feita depois do inventário do masterplan. Os commits mantêm microfases separadas para facilitar revisão, cherry-pick controlado e eventual PR.

| Área | Resultado consolidado |
|---|---|
| WhatsApp | Contrato canônico de provider no webhook Meta, sem misturar namespace de credencial legado com provider operacional. |
| Cloudflare Pages | Causa operacional documentada; bindings/configuração do repositório revisados. O check remoto e o deploy público continuam separados da prova local. |
| Extração de IA | Staff obrigatório, limite de payload e rate limit antes do custo externo. |
| Geração de contratos | Ownership por identidade/tenant ou token público na geração vinculada a pedido. |
| Gov.br | Selagem sem exposição RPC indevida; callback exige troca de token, userinfo e claims efetivamente verificados. |
| Criação/OCR de contratos | Tenant staff fixado; OCR com guard, limite, rate limit e sem fetch arbitrário de URL. |
| Assinatura manual | Limites, expiração, evidência obrigatória e compare-and-set `pending → signed`, com limpeza da tentativa concorrente perdedora. |
| Verificação pública | Projeção allowlist sem metadados internos, observers, creator ou contatos desnecessários; fallback sem `select("*")`. |
| Mutações de contrato | `updateContractDraft` e `sealAndIssueContract` exigem staff, comprovam `creator_id`, vinculam versão ao contrato e verificam linhas/erros críticos. |
| Envelope público e assinatura salva | Envelope por token com allowlist; token limitado; assinatura salva aceita somente data URL de imagem limitada e confirma persistência no perfil. |
| Documentos e evidência | Specs, ledgers e relatórios de cada microfase foram versionados nesta branch. |

## 2. Gates executados neste SHA

| Gate | Resultado | Evidência |
|---|---:|---|
| Regressões de contratos W2.2–W2.9 | **PASS** | 7 arquivos / 15 testes verdes na última suíte focada. |
| Suíte completa Vitest | **PASS** | 250 arquivos / 1.594 testes verdes. Logs preservados em `/tmp/waesy-w2-full-tests.log`. |
| TypeScript | **PASS** | `npm run typecheck` sem erros após W2.9. |
| Build | **PASS** | `npm run build`; `dist/_worker.js` gerado; `dist/_routes.json` gerado; client-leak OK. |
| Design ratchet | **EXECUTADO, NÃO VERDE GLOBAL** | 1.524 P0, 9.585 P1, 1.295 P2 e 1.339 P3; 13.743 achados em 858/1.945 arquivos. O relatório foi atualizado como evidência, sem abaixar baseline. |
| Diff/whitespace | **PASS** | `git diff --check` sem erro antes do commit. |

Warnings do build relacionados a `sideEffects: false` foram preservados como warnings; não foram tratados como sucesso de deploy. Os testes exibem erros simulados de provider/rede em cenários de resiliência, mas a suíte termina verde.

## 3. O que ainda não pode ser declarado concluído

O código local, os testes, o typecheck e o build não provam banco, RLS, grants, provider, browser, CI ou produção. Permanecem bloqueados ou não verificados: aplicação das migrations desde zero e contra legado; dump de `pg_policies`, `pg_class`, `pg_proc` e privilégios; JWT real com dois tenants; falhas entre writes; integração Gov.br/WhatsApp/IA real; reload em browser; CI do SHA final; deploy Cloudflare e smoke test público; proteção efetiva da branch `main`; e decisão de release.

As mutações de contrato continuam com writes sequenciais no BFF. A checagem de erro e ownership foi endurecida, mas atomicidade/rollback completo exige RPC/transação e teste Postgres real nas waves W3/W4.

## 4. Próximas waves, na ordem do masterplan

| Wave | Próximo trabalho obrigatório | Critério de fechamento |
|---|---|---|
| W1 | Governança de merge, checks obrigatórios, investigação/reprodução Cloudflare e bloqueio de promoção com checks falhos. | Ruleset consultável, checks verdes no mesmo SHA, log raiz e smoke público autorizado. |
| W2 | Matriz endpoint×identidade×role×tenant; inventário integral de `service_role`; RLS real; grants/`SECURITY DEFINER`; quota antes do provider. | Testes A/B cross-tenant com JWT/roles reais e dump efetivo de privilégios. |
| W3 | Replay de migrations em banco vazio e legado; idempotência; tipos Supabase reais; DTO/query/schema; paginação e limites. | Schema compilado desde zero, drift reconciliado e tipos sem `Database = any`. |
| W4 | FSM única, writes de negócio transacionais, idempotência, outbox e compensação de integrações externas. | Fault injection prova rollback ou recuperação idempotente. |
| W5–W6 | Copilot/chat ponta a ponta; gateway/pools de IA; auth, quota, segredo, retry e cancelamento. | Provider real instrumentado, zero custo em rejeição e persistência relida. |
| W7 | Tabelas e catálogo completos, incluindo os diffs preservados no worktree paralelo, somente após revisão de ownership. | CRUD tenant-scoped, archive/status, reload e filtros/paginação provados. |
| W8–W9 | Builders/Studio e geração de imagem/mídia: create, save, reload, edit, publish, storage, provenance e quota. | URL pública/reload e ciclo de mídia completos, sem rótulo sintético. |
| W10–W11 | Rotas/boundaries; webhooks WhatsApp e outbox durável para todos os providers. | Navegação browser, assinatura de evento, retry/deduplicação e entrega verificadas. |
| W12–W14 | Turismo/integracões; design system; completude visual; testes adversariais e mutation testing. | Jornada funcional, lint sem regressão e testes que falham quando a proteção é removida. |
| W15–W16 | Observabilidade, auditoria, operação e jornadas E2E integradas. | Logs/correlation IDs, browser com dados reais de teste e reload completo. |
| W17 | Candidato de release, CI, deployment e verificação pública. | CI do SHA final, deploy confirmado, smoke público e decisão formal de release. |

## 5. Regras para a próxima continuidade

Não usar `git add -A` em worktree contaminada. Não fazer merge/cherry-pick automático de branches paralelas. Cada microfase deve começar com leitura de `AGENTS.md`, skill, masterplan, spec e arquivos reais; registrar baseline e reprodução antes de editar; manter paths explícitos; executar gates aplicáveis; e rotular evidência como código corrigido, integração, browser, CI ou produção. Nenhuma migration deve ser aplicada em produção sem autorização explícita.

**Status global:** remediação em andamento; branch pronta para revisão do commit, não pronta para release.
