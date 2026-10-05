# Master Plan: Waesy Systemic Interactivity Restoration & Button Remediation

## Executive Overview
Restore full interactivity across the entire Waesy platform (Cloudflare Pages production).
All interactive components (buttons, dropdowns, drawers, context switchers, profile avatar, logout button, workspace navigation) must function reliably with 0 broken buttons, verified by Playwright E2E tests, crawler on 30+ routes, design-lint ratchet PASS, typecheck exit 0, vitest green, and production deploy.

---

## Architecture & Milestones

### Milestone 1: Survey & Root-Cause Investigation (Current)
- **Objective**: Conduct parallel exploration to definitively uncover why interactivity stopped across the app.
- **Exploration Focus**:
  - Explorer 1 (Systemic & Shell): Recent batch scripts, git log/diff, root layout (`__root.tsx`, `shell/`, `top-bar.tsx`, `utility-cluster.tsx`), hydration errors, overlay pointer-events/z-index traps.
  - Explorer 2 (Component Contracts & Props): Mass regex or lint remediation effects on Radix UI primitives (`asChild`, `onClick`, `DropdownMenu`, `Dialog`, `Drawer`, `Sheet`), button components (`src/components/ui/button.tsx`, `offer-card.tsx`).
  - Explorer 3 (Context & Auth Navigation): Profile/context switcher state management, multi-tenant workspace routing, account drawer triggers, logout button styling overlap and DOM collision.
- **Deliverables**: Detailed synthesis report in `M1_ROOT_CAUSE_REPORT.md` with reproducible evidence.

### Milestone 2: Systematic Root-Cause Fix & Global Interactivity Restoration
- **Objective**: Fix the root cause at the source (shell, hydration, pointer-events, or Radix/button primitives).
- **Execution**: Worker applies targeted core fix, verified by Reviewer, Challenger, and Forensic Auditor.
- **Pass Criteria**: Core interactivity restored across root layout, console clean, zero hydration/pointer-events blocks.

### Milestone 3: Account, Profile & Context Navigation Flows Remediation
- **Objective**:
  - Context/profile switcher expands and lists real contexts (civil, user stores, delivery/Waesy Go, creator).
  - Selecting a store navigates to `/workspace/$storeId` properly.
  - Top bar avatar opens account drawer on desktop and mobile (390px).
  - "Sair" (Logout) button and adjacent actions aligned without bounding box overlap, fully clickable.
- **Execution**: Worker implements flow fixes, Reviewer, Challenger, Auditor verify.

### Milestone 4: Machine-Readable Button Inventory & Exhaustive Remediation
- **Objective**:
  - Generate machine-readable inventory of all interactive elements across `src/routes/` and `src/components/` in `auditoria/BUTTON_INVENTORY.json` and `.md`.
  - Classify status: functioning / inert / placebo / broken route / auth-blocked without modal.
  - Systematically fix all broken/inert buttons until final count of broken items is 0.
- **Execution**: Automated crawler/script generation by Worker, remediation cycle.

### Milestone 5: E2E Playwright Suite, Production Build & Deploy Verification
- **Objective**:
  - Automated Playwright E2E browser test verifying context switcher, store workspace selection, avatar drawer, logout button alignment.
  - Click crawler across >= 30 routes recording 0 clicks without observable effect.
  - `npm run typecheck` Exit 0.
  - `vitest` all passing.
  - `node scripts/design-lint.mjs --ratchet` Exit 0.
  - `npm run build` Exit 0 & Cloudflare Pages deploy (`wrangler pages deploy dist --project-name usewaesy --commit-dirty=true --no-bundle`).
  - Handoff entry in `docs/design/DECISIONS.md`.
