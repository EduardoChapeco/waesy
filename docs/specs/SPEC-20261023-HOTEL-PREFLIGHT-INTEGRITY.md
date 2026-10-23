# Hotel preflight integrity

Date: 2026-10-23. Authorized by the user's request to execute remaining phases.
References: AGENTS B.25/B.31/B.33; DESIGN; HIPER plan GAP-11/MF3.1; holistic W10.

## EARS
- When checking a hotel name, the service must return only persisted, verified canonical records matching the supplied city/state.
- When no persisted match exists, the service must not invent an ID or promise a link to static catalog data.
- If a database query fails, the service must propagate the error and the UI must distinguish failure from no match.
- When inputs change or the editor closes, obsolete async results must not replace the current suggestion.
- When selecting a hotel, the picker must retain its label after closing and support keyboard dismissal and accessible controls.

## Scope and evidence
Allowed: travel-catalog.functions.ts (preflight only), workspace.turismo.hoteis.tsx (preflight/picker binding only), hotel-autocomplete-input.tsx, focused regression tests and this ledger.
No database migration, new route or permission change. Existing hotels route is already in routeTree, routes registry and workspace-navigation.
Validation: before/after mocked handler regressions, focused existing tests, diff inspection. Typecheck/build omitted by user request; remote DB, browser reload and production are separate unverified levels.
