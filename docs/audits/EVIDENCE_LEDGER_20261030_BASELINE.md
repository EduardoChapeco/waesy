# Evidence Ledger — Baseline Forense 2026-10-30

## Identidade

| Campo | Valor |
|---|---|
| Branch | `production-candidate` |
| SHA | `9b001449e3b5fd67ca1f2ec5e6de1c3be3ab54b1` |
| Base | `0128a274ab0aa36b7356513b643a470d49a80291` |
| Worktree | 56 caminhos modificados/não rastreados no preflight |
| PRs abertos | 0 observados via GitHub MCP em 2026-10-30 |
| Escopo | Auditoria global read-only; sem mutação de produto ou banco |

## Regras de prova

| Regra | Aplicação |
|---|---|
| Código não é teste | Um handler presente não prova ação funcional. |
| Teste não é typecheck | Cada gate é reportado separadamente. |
| Build não é browser | Bundle válido não prova jornada, console ou rede. |
| Migration não é banco | Schema local não prova migration aplicada nem grant efetivo. |
| Merge não é deploy | Nenhum desses estados foi declarado sem evidência direta. |
| Fallback não é dado | Dados sintéticos devem ser isolados de produção. |

## Registro de verificações

| ID | Comando/artefato | Resultado | Estado |
|---|---|---|---|
| EV-001 | `npm run audit:buttons:test` | 19/19 testes | Confirmado local |
| EV-002 | `scripts/audit/button-ast-audit.json` | 8.267 controles, 0 issues | Confirmado estático |
| EV-003 | `node scripts/deep-action-audit.mjs` | 671 funções sem chamada detectada | Heurístico |
| EV-004 | `node scripts/deep-forensic-route-audit.mjs` | 57 imports legados | Confirmado textual |
| EV-005 | `npm run check:bff` | 636 refs, 0 tabelas ausentes | Confirmado local |
| EV-006 | `npm run check:cycles` | 0 ciclos | Confirmado local |
| EV-007 | `npm run check:deadcode` | 0 órfãos exatos; 23 colisões | Confirmado local |
| EV-008 | `npm run check:route-budget` | 1 falha no chunk do Builder | Confirmado local |
| EV-009 | fallback/mock sweeps | 495/16 candidatos | Requer triagem |
| EV-010 | conselho CISO/Postgres | P0/P1 de RLS, grants, crypto e drift | Confirmado por leitura; replay faltante |
| EV-011 | conselho UI/QA | P0 financeiro, P1 uploads/fallbacks, P1 bifurcação DOM, P2 rotas invisíveis | Confirmado por leitura; replay faltante |
| EV-012 | conselho arquitetura/contratos | P0 estoque; P1 turismo, integrações, supermercado e rotas | Confirmado por leitura; replay faltante |
| EV-013 | browser/E2E crítico | Não executado | Não verificado |
| EV-014 | JWT/RLS remoto | Não executado nesta sessão | Não verificado |
| EV-015 | CI/build/deploy | Não executado nesta sessão | Não verificado |

## Estado de findings

| Finding | Baseline | Correção | Regressão | Reload | Produção |
|---|---|---|---|---|---|
| ACT-P1-001 | Reproduzível por leitura do handler | Pendente | Pendente | Não aplicável até gerar arquivo | Não provado |
| ACT-P1-002 | Reproduzível com `initialArticles=[]` | Pendente | Pendente | Pendente | Não provado |
| ACT-P1-003 | Reproduzível com `dbProducts=[]` | Pendente | Pendente | Pendente | Não provado |
| ACT-P1-004 | Reproduzível com props ausentes | Pendente | Pendente | Pendente | Não provado |
| ACT-P1-005 | Reproduzível no guard de budget | Pendente | Pendente | Não aplicável | Não provado |
| SEC-P0-001 | Confirmado no SQL/policy reportada pelo conselho | Pendente | Pendente | Pendente | Não provado |
| UI-P0-001 | Confirmado por leitura de fluxo financeiro | Pendente | Pendente | Pendente | Não provado |
| UI-P0-002 | Confirmado por leitura de fluxo financeiro | Pendente | Pendente | Pendente | Não provado |
| UI-P0-003 | Confirmado por leitura de defaults financeiros | Pendente | Pendente | Pendente | Não provado |
| ARCH-P0-001 | Confirmado por leitura de services/migrations | Pendente | Pendente | Pendente | Não provado |

## Próximo checkpoint

Antes da primeira mutação, registrar a spec da microfase escolhida, os arquivos autorizados, os testes negativos, o estado do banco remoto e o rollback. Nenhum finding deve ser fechado com base apenas em toast, mock, snapshot, typecheck, build ou merge.
