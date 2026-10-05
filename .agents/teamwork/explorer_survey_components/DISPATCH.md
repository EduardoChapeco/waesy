## Dispatch: Explorer Survey Components & Primitives (Explorer 2)

### Working Directory
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_components`

### Authoritative Request
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md` (Specifically read header `## 2026-10-05T06:27:42Z`)

### Objective
Investigate component primitives, button contracts, Radix UI triggers, and missing action handlers across `src/components/` and `src/routes/`.
Centenas de botões, dropdowns, drawers e alternadores de contexto pararam de responder ao mesmo tempo.

### Specific Scope of Investigation
1. **Button & Interactive Primitives**:
   - Inspect `src/components/ui/button.tsx`, `src/components/commerce/offer-card.tsx`, `src/components/store/store-card.tsx`, and common UI primitives.
   - Did previous automated lint / regex scripts accidentally alter or strip `onClick`, `asChild`, `to`, `href`, or event bubbling?
2. **Radix UI & Dialog / Drawer / Dropdown Contracts**:
   - In Radix UI (`@radix-ui/react-dropdown-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-popover`), when `asChild` is used on a Trigger, it clones the child and attaches event listeners. If `asChild` was stripped or if the child does not forward props/ref, clicks stop working.
   - Check if `asChild` or `ref` forwarding was broken in recent edits.
   - Check if `<button disabled>` or CSS `pointer-events-none` was accidentally applied universally or by default variant.
3. **Link vs Button Semantics**:
   - Check TanStack Router `<Link>` components and custom buttons. Are route navigations failing because of invalid `to` targets or missing router context?

### Deliverables
Write a comprehensive report to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_components\handoff.md` with:
- Identified component regressions, file paths, and offending lines.
- Systematic pattern analysis of broken buttons/primitives.
- Recommended remediation strategy.
