# Spec — Execução completa do Masterplan Waesy

**Data:** 2026-10-07  
**Branch:** `audit/full-remediation-20261007`  
**Base:** commit R6 `fc8f9fc3`; `origin/main` em `919c8688`  
**Escopo:** remediação progressiva do masterplan holístico, sem incorporar branches paralelas automaticamente.

## Objetivo

Reduzir o backlog completo do masterplan por microfases verificáveis, preservando contratos de produto, isolamento multi-tenant, integridade transacional, acessibilidade e consistência visual. Nenhum finding será declarado resolvido somente por teste estático, typecheck, build ou commit.

## Requisitos EARS

- **FR1:** Para cada finding selecionado, a equipe DEVE registrar baseline, paths permitidos, reprodução, causa-raiz, teste negativo e critério mensurável antes de editar.
- **FR2:** Cada correção DEVE permanecer em microfase atomicamente delimitada; arquivos de branches paralelas não podem ser incorporados sem revisão e decisão explícita.
- **FR3:** Toda escrita de negócio que produza estado terminal DEVE validar tenant/ator no servidor, verificar erros e ser idempotente/atômica ou possuir compensação documentada.
- **FR4:** Toda UI alterada DEVE manter estados de carregamento, vazio, erro, sucesso honesto, foco, alvo tátil e reload verificável.
- **FR5:** Cada onda DEVE terminar com testes aplicáveis, typecheck, build, lint/design e ledger; integração Postgres, browser, provider, CI e produção devem ser rotuladas separadamente quando indisponíveis.
- **FR6:** A conclusão global só pode ser declarada quando todos os findings do masterplan estiverem classificados como corrigidos e verificados no nível aplicável, ou explicitamente bloqueados com responsável/dependência/evidência.

## Ordem de execução

1. Inventário independente por frente e reconciliação com o masterplan.
2. Governança e segurança: W1/W2.
3. Schema, migrations e contratos: W3.
4. Persistência, FSM e idempotência: W4.
5. IA/Copilot/chat/WhatsApp: W5–W8 e findings relacionados.
6. Turismo e documentos: concluir R6/R7 e gaps adjacentes.
7. Catálogo, builders, imagens, rotas e UX/design.
8. Integração real: Postgres efêmero, browser, providers, CI e staging.
9. Auditoria adversarial final, relatório de completude e decisão de release.

## Regras de isolamento

- Não fazer merge/cherry-pick de `origin/audit/recursive-p0-remediation`, `origin/chore/recover-waesy-task-2026-10-06`, `origin/feat/waesy-canonical-travel-evolution` ou outras branches sem comparar paths, commits e ownership.
- Não usar `git add -A` em worktree contaminada.
- Não aplicar migration em produção nem fazer deploy sem autorização explícita.
- Não atualizar baseline de design lint para ocultar violações.
- Quando um requisito depender de decisão de produto, parar a microfase e registrar o bloqueio.

## Critério global de saída

O sistema somente será chamado de completo após matriz de findings 100% classificada, gates locais verdes, migrations aplicadas em ambiente representativo, testes RLS/tenant e browser executados, CI do SHA final verde e smoke test/deploy confirmados quando autorizados. Até lá, o status é remediação em andamento.
