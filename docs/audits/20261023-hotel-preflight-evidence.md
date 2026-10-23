# Hotel preflight evidence

Date: 2026-10-23 America/Sao_Paulo.
Initial branch/HEAD: main / 5c2e429c. Base: origin/main f28194c048ea4ca47fa5fe44480f7278853d83e4.
Initial worktree: clean; 34 existing commits preserved. PR39 head ce6d1656 is already an ancestor of HEAD. New candidate checks not run.
Read before mutation: AGENTS, DESIGN, DESIGN-LINT, integrity skill/template, HIPER GAP-11, holistic W10, hotel route, BFF/DTO, autocomplete, 20261008090000_global_hotels_deduplication.sql and travel-global-hotels.test.ts.
Scope: SPEC-20261023-HOTEL-PREFLIGHT-INTEGRITY.md. Parallel agents own timezone and catalog.

| Finding | Class | Severity | Baseline evidence | Status |
|---|---|---|---|---|
| HOTEL-01 | BFF/UI contract | P1 | Preflight fabricates canonical-* ID from static catalog; createHotel requires UUID | confirmed in code |
| HOTEL-02 | data selection | P1 | city/state accepted but ignored; database errors ignored; verified flag not filtered | confirmed in code |
| HOTEL-03 | async state | P1 | timer cleanup does not cancel pending promise; picker clears options and loses selected label | confirmed in code |

Tests, adversarial review and final results pending. No remote database or browser evidence yet. No claim of production readiness.
