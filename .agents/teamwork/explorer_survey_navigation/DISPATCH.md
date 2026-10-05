## Dispatch: Explorer Survey Navigation & Account Flows (Explorer 3)

### Working Directory
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_navigation`

### Authoritative Request
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md` (Specifically read header `## 2026-10-05T06:27:42Z`)

### Objective
Investigate account, profile, context switcher, drawer, and logout navigation flows across the application.
Specifically examine the reported symptoms:
1. O alternador de perfil/contexto não expande e não lista os contextos reais (civil, lojas do usuário, entregador/Waesy Go, criador).
2. Escolher uma loja não leva ao workspace correspondente (`/workspace/$storeId`).
3. O avatar do topo não abre o drawer de conta (no desktop e no mobile 390px).
4. O botão "Sair" (Logout) fica sobreposto a outro botão e ambos ficam com problemas de clique.

### Specific Scope of Investigation
1. **Context Switcher & Multi-Tenant Workspaces**:
   - Locate the context/profile switcher component (e.g. in `src/components/shell/`, `src/components/workspace/`, `src/components/auth/`).
   - Why does it not expand? Missing state? Broken dropdown?
   - How are user contexts queried and resolved? How is navigation to store workspaces triggered?
2. **Top Bar Avatar & Account Drawer**:
   - Locate the top bar avatar trigger (e.g. in `src/components/shell/top-bar.tsx`, `src/components/shell/utility-cluster.tsx`).
   - Check the account drawer component (e.g., `account-drawer.tsx` or similar). Why is the trigger not opening the drawer?
   - Verify both desktop and mobile (390px) behavior.
3. **Logout Button Collision & Styling**:
   - Locate the "Sair" button in the shell/drawer/menu.
   - What element is it overlapping with? Inspect the flex/grid/absolute positioning, margin, z-index, and bounding boxes.
   - Why are clicks failing or being intercepted?

### Deliverables
Write a comprehensive report to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_navigation\handoff.md` with:
- Exact components, files, and lines governing context switcher, avatar drawer, and logout button.
- Detailed root cause for each of the 4 navigation defects.
- Concrete fix recommendations complying with AGENTS.md (touch targets >= 44px, :focus-visible:ring-2, no arbitrary brackets, no hardcoded colors).
