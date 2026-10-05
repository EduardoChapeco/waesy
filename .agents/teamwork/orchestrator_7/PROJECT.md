# Project: Waesy Platform Interactivity Restoration & Button Remediation

## Architecture
- **Client & Routing**: TanStack Router (`src/routes/`) with client-side hydration on Cloudflare Pages (`usewaesy`).
- **Shell & Navigation**: TopBar (`src/components/shell/top-bar.tsx`), UtilityCluster (`src/components/shell/utility-cluster.tsx`), Context/Profile Switcher, and Account Drawer (`src/components/shell/account-drawer.tsx` or equivalent).
- **Component UI Primitives**: Radix UI wrappers (`src/components/ui/`), Buttons, Drawers/Sheets, Dropdowns, Dialogs.
- **BFF & Auth**: TanStack Start Server Functions (`src/services/`), Supabase Auth & Session State (`src/lib/auth/`, `src/lib/supabase/`).
- **Design System & Ergonomics**: AGENTS.md (B.1–B.30), touch targets >= 44px (`h-11 min-h-11`), `:focus-visible:ring-2`, semantic design tokens, clean modular grid, zero arbitrary brackets.
- **Verification & Testing**: Playwright E2E browser suite, automated 30+ route interaction crawler, Vitest unit tests, `scripts/design-lint.mjs --ratchet`, typecheck, Cloudflare Pages production deploy.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Systemic Root-Cause Identification | Uncover exact technical root cause of global click/event failure (hydration error, fatal JS exception, or overlay pointer-events capture) with reproducible proof | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Systemic Root-Cause Elimination | Remediate root cause at core source (shell, root layout, hydration, or button primitive) restoring baseline DOM event propagation | M2 | ORIGINAL_REQUEST §R1 |
| 3 | Context & Profile Switcher Restoration | Ensure profile/context switcher expands and lists real contexts (civil, user stores, delivery/Waesy Go, creator) | M3 | ORIGINAL_REQUEST §R2 |
| 4 | Store Workspace Navigation | Ensure selecting a store navigates reliably to `/workspace/$storeId` | M3 | ORIGINAL_REQUEST §R2 |
| 5 | Top Bar Avatar Account Drawer Trigger | Ensure top bar avatar opens account drawer on both desktop and mobile (390px viewport) | M3 | ORIGINAL_REQUEST §R2 |
| 6 | Logout ("Sair") Layout & Collision Fix | Ensure "Sair" button and adjacent action buttons are properly aligned with no bounding box overlap and full clickability | M3 | ORIGINAL_REQUEST §R2 |
| 7 | Machine-Readable Interactive Element Inventory | Audit 100% of interactive elements across `src/routes/` and `src/components/` saved in `auditoria/BUTTON_INVENTORY.json` and `.md` | M4 | ORIGINAL_REQUEST §R3 |
| 8 | Exhaustive Broken Button Remediation | Fix all broken, inert, placebo, or dead-route buttons until broken count is 0 | M4 | ORIGINAL_REQUEST §R3 |
| 9 | Zero-Trust Action Auth Guard Integration | Ensure buttons requiring authentication open `ActionAuthGuardModal` for unauthenticated visitors preserving `returnUrl` | M4 | ORIGINAL_REQUEST §R3, AGENTS.md B.21 |
| 10 | Playwright E2E Account & Context Test Suite | E2E browser test verifying context switcher, store workspace navigation, avatar drawer (desktop & mobile 390px), and logout alignment | M5 | ORIGINAL_REQUEST Acceptance Criteria |
| 11 | Automated 30+ Route Interaction Crawler | Automated crawler visiting >= 30 major routes, clicking visible buttons/links, verifying 0 clicks without observable effect | M5 | ORIGINAL_REQUEST Acceptance Criteria |
| 12 | Quality Gates, Production Deploy & DECISIONS.md | Clean typecheck, passing Vitest, design-lint ratchet PASS, Cloudflare Pages deploy, and DECISIONS.md entry | M5 | ORIGINAL_REQUEST §R4 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Survey & Root-Cause Analysis | 3 parallel Explorers to investigate git history, recent batch scripts, shell overlay/pointer-events, Radix contracts, and navigation flows | none | IN_PROGRESS |
| 2 | M2: Systematic Root-Cause Fix | Remediate core systemic defect (shell/hydration/primitive), proving event propagation restored | M1 | PLANNED |
| 3 | M3: Account & Context Flows Remediation | Fix context switcher, store workspace navigation, avatar drawer trigger, and logout button overlap | M2 | PLANNED |
| 4 | M4: Interaction Inventory & Remediation | Machine-readable inventory of all interactive elements in `auditoria/` and systematic repair to 0 broken | M2, M3 | PLANNED |
| 5 | M5: E2E Playwright Suite & Production Verification | Playwright E2E suite, 30+ route crawler, typecheck, vitest, design-lint ratchet, Cloudflare deploy | M3, M4 | PLANNED |

---

## Interface Contracts
### Shell Account & Context Contract
- Context Switcher: Must consume authenticated user's real roles/stores from session/store store, displaying:
  - Civil context (`/conta` / `_store.*`)
  - Owned/managed stores (`/workspace/$storeId`)
  - Waesy Go / Driver profile (if driver)
  - Creator profile (if creator)
- Account Drawer Trigger: Must trigger modal/drawer state change synchronously without hydration race conditions.
- Logout Button: Must reside in dedicated flex/grid cell with explicit margin/padding, no absolute positioning collision with adjacent buttons.

### Interaction Inventory Contract (`auditoria/BUTTON_INVENTORY.json`)
- Schema per element:
  - `file`: string (relative path)
  - `line`: number
  - `label`: string (accessible name or text content)
  - `actionType`: "navigation" | "mutation" | "drawer_or_dialog" | "auth_guard" | "inert"
  - `status`: "working" | "inert" | "placebo" | "broken_route" | "auth_blocked_without_modal"
  - `fixApplied`: string | null

---

## Code Layout
- `src/components/shell/`: Shell navigation, `top-bar.tsx`, `utility-cluster.tsx`, context switchers, account drawers.
- `src/components/ui/`: Radix UI primitives, `button.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `dialog.tsx`.
- `src/components/commerce/`: `offer-card.tsx` and shopping components.
- `src/routes/`: TanStack Router routes (`__root.tsx`, `_store.*`, `workspace.*`, `admin-master.*`).
- `src/lib/auth/`: Auth context, session management, identity helpers.
- `tests/e2e/`: Playwright test suites (`tests/e2e/interactivity.spec.ts`).
- `auditoria/`: Audit inventory files (`auditoria/BUTTON_INVENTORY.json`, `auditoria/BUTTON_INVENTORY.md`).
- `docs/design/DECISIONS.md`: Formal architectural decision records.
