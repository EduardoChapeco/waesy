# DISPATCH — Worker M1 (Remediation Iteration 2)

## Task Assignment
**Role**: Implementation Worker (`teamwork_preview_worker`)
**Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry`
**Original Request Path**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md` (header `## 2026-10-04T03:35:00Z`)
**Challenger 2 Report**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\challenger_m1_2\handoff.md`
**Previous Worker Handoff**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Boundaries
You have exclusive write ownership of:
1. `src/routes/_store.diretorio.index.tsx`
2. `src/routes/_store.empregos.index.tsx`
3. `src/routes/_store.eventos.tsx`
4. `scripts/design-lint.mjs`
5. `design-lint.baseline.json`

## Tasks (Remediate Challenger 2 Findings)
1. **`src/routes/_store.diretorio.index.tsx`**:
   - Linha 244: Adicionar `h-11 px-4` no `<Button size="sm">` do Empty State.
   - Linha 530: Alterar `className="h-10 ..."` para `className="h-11 ..."` no `<ProtectedContactButton>`.
   - Linha 539: Alterar `h-10` para `h-11` no `<Button asChild size="sm">` ("Ver Perfil").
   - Linha 626: Alterar `className="h-8 ..."` para `className="h-11 ..."` no `<ProtectedContactButton>` do list item.
   - Linha 633: Alterar `className="h-8 ..."` para `className="h-11 ..."` no `<Button asChild size="sm">` do list item.
2. **`src/routes/_store.empregos.index.tsx`**:
   - Linha 251: Adicionar `h-11 px-4` no `<Button size="sm">` do Empty State.
3. **`src/routes/_store.eventos.tsx`**:
   - Linha 596: Adicionar `min-h-11 inline-flex items-center py-2 px-3` no `<button>` nativo de limpar filtro.
   - Linha 763: Adicionar `h-11 px-4` no `<Button size="sm">` do Empty State.
4. **`scripts/design-lint.mjs`**:
   - Refinar a regra DL-14 para consumir `parseJsxTags`, inspecionando tags multilinhas de botões e links para garantir que classes sub-44px (`h-8`, `h-9`, `h-10`, etc.) sejam flagradas mesmo quando em linhas subsequentes à abertura da tag.
5. **Validação**:
   - Executar `node scripts/design-lint.test.mjs` (todos os testes verdes).
   - Executar `node scripts/design-lint.mjs --changed` (deve retornar Exit Code 0 com 0 violações).
   - Executar `node scripts/design-lint.mjs --update-baseline`.
   - Executar `node scripts/design-lint.mjs --ratchet` (deve retornar Exit Code 0).

Write your handoff report to:
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry\handoff.md`
and notify parent orchestrator (`d28f856c-9966-4ad5-80d8-b7dba7b1979c`).


## 2026-10-04T04:40:16Z
You are Worker M1 (Remediation Iteration 2).
Your working directory is:
c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry

Read instructions in:
c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry\DISPATCH.md
and Challenger 2's specific findings in:
c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\challenger_m1_2\handoff.md
and ORIGINAL_REQUEST.md (header ## 2026-10-04T03:35:00Z).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Fix all 8 touch targets < 44px in _store.diretorio.index.tsx (lines 244, 530, 539, 626, 633), _store.empregos.index.tsx (line 251), and _store.eventos.tsx (lines 596, 763). Ensure all interactive elements have h-11 / min-h-11 (>= 44px).
2. Update DL-14 rule in scripts/design-lint.mjs to use parseJsxTags for multi-line tag inspection.
3. Run node scripts/design-lint.test.mjs.
4. Run node scripts/design-lint.mjs --changed.
5. Update baseline: node scripts/design-lint.mjs --update-baseline.
6. Verify node scripts/design-lint.mjs --ratchet.

Write your report to c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry\handoff.md.
Notify parent orchestrator (convId: d28f856c-9966-4ad5-80d8-b7dba7b1979c).
