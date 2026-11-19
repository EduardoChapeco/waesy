# Ledger de Evidências — Waesy (Auditoria Forense 6 Camadas)

## Snapshot e escopo

- Data/hora (ISO, fuso): `2026-11-16T16:45:00-03:00`
- Repositório: `EduardoChapeco/waesy`
- Branch/HEAD: `release/prod-20261113-fullpage-chat-copilot` @ `c0e1d351e1ac5feaeb77d0f88cc19df83f14267c`
- Base remota comparada: `postgres.jfuebqmltksyznovhlwa` (leitura direta `pg_catalog` / `information_schema`, `628`/`635` migrations aplicadas)
- PR(s) e estado/checks: `gh` CLI não autenticado localmente; `dist/_worker.js` ausente na baseline
- Worktree inicial e paths preexistentes preservados: alterações prévias de `whatsapp`, `crm`, `quick-actions`, `tourism/proposals`, `opportunity-radar`, `branded-app` e relatórios gerados integralmente preservadas
- Ambiente e versões: Windows / PowerShell / Node v24.16.0 / Vitest / Vite + TanStack Start + Cloudflare Pages preset
- Escopo explicitamente incluído/excluído: Ondas 0 a 4 end-to-end conforme `SPEC-20261116-FORENSIC-WAVES-REMEDIATION.md`

## Preflight de leitura por microfase

| Onda.microfase | AGENTS/skill/plano lidos | Paths de implementação lidos (UI/rota, BFF, DTO, SQL, teste) | Hash/commit inicial | Ação autorizada | Leitura concluída antes de mutar? |
|---|---|---|---|---|---|
| Onda 0 | `AGENTS.md`, `DESIGN.md`, `DESIGN-LINT.md`, `waesy-integrity-auditor/SKILL.md`, `DECISIONS.md` | `vite.config.ts`, `tsconfig.json`, `src/lib/context-auth.ts`, `src/lib/server-access.ts`, `src/routes/api.v1.ingest.infotravel-quotes.ts`, `scripts/check-bff-table-contracts.mjs`, testes falhos Vitest | `c0e1d351` | Onda 0 após aprovação do usuário em 2026-11-16 | Sim |

## Matriz de Gate Baseline (Pré-Onda 0)

| Comando/ambiente | SHA exato | Resultado/exit code | Evidência/log | O que NÃO prova |
|---|---|---|---|---|
| `ts.createSourceFile` (2916 arquivos) | `c0e1d351` | Exit `0` (`0` erros sintaxe) | `task-1587` | Não prova checagem semântica TS |
| `tsc --noEmit --skipLibCheck` (bounded 60s) | `c0e1d351` | `ETIMEDOUT` (`60545ms`, standalone `>15m`, `6.35GB`) | `task-1565` / PID `15124` | Typecheck CI bloqueado por explosão combinatória |
| `vitest run` (`564` arquivos / `3902` testes) | `c0e1d351` | Exit `1` (`1817` pass / `20` fail suites; `3888` pass / `14` fail tests) | `task-1372` (`vitest-full.json`) | Mocks de `test/setup.ts` mascaram `assertStoreAccess` |
| Postgres read-only `audit-remote-db.mjs` | `c0e1d351` | `628/635` migrations, `19` Realtime, `0` Vault, `11` Crons | `remote-db-audit.json` | Requer push aprovado para `20270523..20270529` |
