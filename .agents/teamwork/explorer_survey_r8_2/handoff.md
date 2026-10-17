# Handoff Report — Explorer Survey 2: Mobile Nativization & App Ergonomics

**Author**: Explorer 2  
**Date**: 2026-10-13  
**Working Directory**: `.agents/teamwork/explorer_survey_r8_2`  
**Target Architecture**: Apple HIG Mobile-First Native (<640px) vs Bento Grid Desktop (>=1024px)  
**Contract Baseline**: `AGENTS.md` (B.1 to B.30, DL-01 to DL-30)

---

## 1. Observation

Direct code observations across the repository (file paths, line numbers, and verbatim snippets):

### 1.1 Mobile Dock & Docking Bar Ergonomics
- **File Location**: The mobile navigation bar exists at `src/components/shell/mobile-nav.tsx` (aliased by `src/components/commerce/bottom-nav.tsx`). There is no file at `src/components/navigation/mobile-nav.tsx`.
- **Microfonts in Tab Labels**:
  - `src/components/shell/mobile-nav.tsx:216`: `<span className="text-[10px] tracking-tight leading-none">Início</span>`
  - `src/components/shell/mobile-nav.tsx:231`: `<span className="text-[10px] tracking-tight leading-none">Explorar</span>`
  - `src/components/shell/mobile-nav.tsx:255`: `<span className="text-[10px] tracking-tight leading-none">Mensagens</span>`
  - `src/components/shell/mobile-nav.tsx:279`: `<span className="text-[10px] tracking-tight leading-none">Menu</span>`
  - *Violation*: Microfont `< 12px` and arbitrary bracket class `text-[10px]` (DL-02).
- **Missing Focus Rings**:
  - `src/components/shell/mobile-nav.tsx:209, 224, 248, 264`: Interactive `Link` and `<button>` elements lack `:focus-visible:ring-2 focus-visible:ring-primary` (DL-15).
- **Inline Styles for Safe Area**:
  - `src/components/shell/mobile-nav.tsx:177`: `style={{ bottom: "max(calc(env(safe-area-inset-bottom) + 72px), 76px)" }}`
  - `src/components/shell/mobile-nav.tsx:198`: `style={{ bottom: "max(calc(env(safe-area-inset-bottom) + 6px), 10px)" }}`
  - *Violation*: Inline layout styling (DL-05).
- **Center Quick-Action Modal (`QuickCreateModal`)**:
  - `src/components/commerce/quick-create-modal.tsx:148`: `side="right" size="wide" className="... max-sm:!inset-0 max-sm:!h-[100dvh] max-sm:!w-full ..."`
  - *Violation*: Forced right-sheet with `!important` classes (DL-04) on mobile instead of native bottom sheet (`side="bottom"`).
  - `src/components/commerce/quick-create-modal.tsx:154`: `<button className="size-9 rounded-lg flex items-center justify-center ..."` (touch target 36px, violating DL-14 < 44px).
  - `src/components/commerce/quick-create-modal.tsx:188`: `className="text-[9px] font-bold uppercase ..."` (microfont < 12px).
- **Global Menu Hub Sheet (`GlobalMenuHub`)**:
  - `src/components/shell/global-menu-hub.tsx:161-162`: Uses arbitrary bracket classes `h-[88dvh] max-h-[88dvh] sm:max-h-[85vh] rounded-t-[24px]` (DL-02).
  - `src/components/shell/global-menu-hub.tsx:217, 227`: `Button size="sm"` with `className="h-9 rounded-lg ..."` (36px height < 44px, DL-14).
  - `src/components/shell/global-menu-hub.tsx:241`: `<Button className="h-9 px-4 rounded-lg ...">` (36px height < 44px, DL-14).
  - `src/components/shell/global-menu-hub.tsx:199, 250, 271, 285, 313`: `text-[10px]` and line 396: `text-[11px]` (microfonts < 12px).

---

### 1.2 Native Mobile Header & Shell Pairing
- **File Location**: Native header is at `src/components/navigation/native-mobile-header.tsx` (re-exported by `src/components/navigation/index.ts`). There is no file at `src/components/shell/native-mobile-header.tsx`.
- **Non-Canonical Container Height**:
  - `src/components/navigation/native-mobile-header.tsx:80`: `<div className="relative flex items-center justify-between gap-2 px-4 h-12 sm:h-14 w-full min-w-0">`
  - *Violation*: Invariant B.26 dictates canonical height `h-11 min-h-11` (44px). Here it is 48px/56px (`h-12 sm:h-14`).
- **Undersized Search & Controls**:
  - `src/components/navigation/native-mobile-header.tsx:120`: `<input ... className="w-full h-9 pl-8 pr-8 rounded-lg ..."` (36px height < 44px).
  - `src/components/navigation/native-mobile-header.tsx:129`: `<button ... className="absolute right-2 size-6 rounded-full ..."` (24px size < 44px, DL-14).
- **Microfonts in Header**:
  - `src/components/navigation/native-mobile-header.tsx:160`: `<div className="text-[11px] text-muted-foreground ...">`
  - `src/components/navigation/native-mobile-header.tsx:199`: `<span className="... text-[9px] font-bold ...">`
- **Missing Focus Rings**:
  - `src/components/navigation/native-mobile-header.tsx:87`: Back button `<button className="size-11 min-h-11 min-w-[44px] -ml-2 rounded-full ..."` lacks `:focus-visible:ring-2` (DL-15).
  - `src/components/navigation/native-mobile-header.tsx:177`: Search trigger button lacks `:focus-visible:ring-2` (DL-15).
  - `src/components/navigation/native-mobile-header.tsx:191`: Filter trigger button lacks `:focus-visible:ring-2` (DL-15).
- **Double Mobile Header Bug via `AppShell`**:
  - `src/components/shell/app-shell.tsx:240-278`: Automatically mounts `NativeMobileHeader` for pages in `isCleanMobileAppPage` unless they are listed in `hasCustomPageMobileHeader`.
  - `hasCustomPageMobileHeader` omits several pages that define their own `NativeMobileHeader`, including `/conta/atividade`, `/conta/trocas`, `/conta/salvos`, `/conta/financas`, `/conta/enderecos`, `/conta/avaliacoes`.
  - Result: On mobile, `/conta/atividade` renders two consecutive `<NativeMobileHeader>` components plus an in-page `<h1>`, stacking 3 headers at the top of the mobile screen.
- **Missing Desktop Pairing**:
  - `src/components/navigation/native-mobile-header.tsx:75`: Defaults to `mobileOnly={true}` (`md:hidden`).
  - Routes like `src/routes/_store.faq.tsx:30` and `src/routes/_store.conta.entregador.tsx:404` mount `NativeMobileHeader` without a paired desktop inpage header (`hidden md:flex`). On desktop (`md:`), the title disappears completely.

---

### 1.3 Bottom Sheets vs Desktop-Centered Dialogs (<640px)
- **Classified Filter Dialog**:
  - `src/components/classifieds/catalog/classified-filter-sheet.tsx:3, 123-124`: Named `ClassifiedFilterSheet` but imports and renders desktop `<Dialog open={open}>` with `<DialogContent className="w-full sm:max-w-lg max-h-screen rounded-none sm:rounded-lg ...">`.
  - On mobile, it displays as a desktop-centered modal box rather than an Apple HIG bottom sheet.
- **Dead Filter Trigger in `/buscar`**:
  - `src/routes/_store.buscar.tsx:488`: `const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);`
  - `src/routes/_store.buscar.tsx:657`: `onFilterClick={() => setIsFilterSheetOpen(true)}`
  - `isFilterSheetOpen` is never passed to any modal or sheet component in the JSX. Clicking the filter icon in `/buscar` does absolutely nothing.
- **Location Master Pill**:
  - `src/components/location/location-master-pill.tsx:7, 534`: Imports and renders desktop `<Dialog>` with `<DialogContent className="max-w-xl ...">` on mobile when tapping the location pill.
- **Action Auth Guard**:
  - `src/components/common/action-auth-guard-modal.tsx:4, 34-35`: Uses `<Dialog>` with `<DialogContent className="sm:max-w-md ...">` for unauthenticated mutation interception.
- **Share Modal**:
  - `src/components/common/share-modal.tsx:2, 92`: Uses `<Dialog>` for sharing content instead of native Web Share API (`navigator.share`) or a bottom drawer.
- **Canonical Bottom Sheet Reference**:
  - `src/components/workspace/filter-bottom-sheet.tsx:58-66`: Uses `<Sheet side="bottom">` with `<div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />` pull handle. This should be the repository-wide standard.

---

### 1.4 Touch Targets Survey (DL-14)
- **Repo Baseline**: `design-lint.report.json:17` reports **2,217 DL-14 violations** across the repository.
- **Small Target Regex**: `scripts/design-lint.mjs:356` catches `\b(?:h|size)-(?:1|2|3|4|5|6|7|8|9|10|3\.5|2\.5|1\.5|0\.5)\b` on interactive elements.
- **Concrete Critical Findings**:
  - `src/components/legal/legal-document-viewer.tsx:59-74`: 6 navigation buttons with `h-7` (28px height).
  - `src/components/shell/top-bar.tsx:60-67`: BETA trigger button with `px-2 py-1` (~22px height).
  - `src/components/shell/utility-cluster.tsx:284-291`: "Voltar ao Civil" button with `px-2 py-1`.
  - `src/components/shell/global-menu-hub.tsx:217, 227`: Profile and Settings buttons with `h-9` (36px).
  - `src/components/commerce/quick-create-modal.tsx:154`: Sheet close button with `size-9` (36px).
  - `src/routes/workspace.clientes.$id.tsx:559, 617, 624, 683, 690`: Action buttons with `h-8` (32px).
  - `src/routes/workspace.configuracoes.integracoes.tsx:223, 425, 1020, 1120`: Form submit and link buttons with `h-8` (32px) and `h-7` (28px).

---

### 1.5 Typographic Scale Survey (Microfonts < 12px)
- **Repository Count**: A regex search for `text-\[(?:[0-9]|1[01])px\]` matches **3,027+ lines** across `src/`.
- **Breakdown by micro-size**:
  - `text-[8px]`: Badges in `workspace-account-switcher.tsx:294` and `workspace-all-tools-dialog.tsx:729`.
  - `text-[9px]`: Badges in `quick-create-modal.tsx:188`, `native-mobile-header.tsx:199`, `top-bar.tsx:64`, `PolymorphicDashboardRenderer.tsx:106`.
  - `text-[10px]`: Navigation tabs in `mobile-nav.tsx:216-279`, `global-menu-hub.tsx:199-313`, `top-bar.tsx:87`, `DiscoveryControlBar.tsx`, `niche-kanban-board.tsx:113-136`.
  - `text-[11px]`: Subtitles in `native-mobile-header.tsx:160`, `global-menu-hub.tsx:396`, `filter-bottom-sheet.tsx:109`, `share-modal.tsx:116`.
- **Standard Floor**: Both Apple HIG and AGENTS.md establish `text-xs` (12px) as the absolute typographic minimum for readable text.

---

### 1.6 1px Borders, Double Margins, Lateral Dead Space & AI-Smell
- **Double Padding Lateral Dead Space**:
  - `src/components/shell/app-shell.tsx:310`: `<main>` injects `px-4 sm:px-6 md:px-8` for all pages in `isCleanMobileAppPage`.
  - Page routes like `src/routes/_store.conta.entregador.tsx:403` apply `className="... px-4 sm:px-6"`.
  - Result: 16px (main) + 16px (page container) = 32px of margin on each side, wasting 64px (17.1%) of width on a 375px viewport.
- **Conversational Copy & AI-Smell**:
  - `src/routes/_store.conta.classificados.index.tsx:879`: `"Clique no botão abaixo para publicar seu primeiro anúncio gratuito."`
  - `src/routes/_store.afiliados.tsx:921`: `"Clique no botão acima para conectar as lojas parceiras..."`
  - `src/components/common/action-auth-guard-modal.tsx:25`: `"Para concluir esta ação com total segurança, acesse sua conta ou faça um cadastro rápido gratuito na Comunidade Waesy."`
  - `src/routes/_store.recuperar-senha.tsx:52`: `"Digite seu e-mail para receber um link de redefinição de senha."`
  - `src/routes/workspace.eventos.$id.subpaineis.tsx:78`: `"Nenhum subpainel criado para este evento. Clique no botão acima para adicionar..."`

---

## 2. Logic Chain

1. **Premise 1 (Navigation Dock Ergonomics)**: `src/components/shell/mobile-nav.tsx` represents the central navigation anchor for mobile devices. Using `text-[10px]` creates readability friction on high-DPI retina screens and triggers DL-02. Missing `:focus-visible:ring-2` violates DL-15.
2. **Premise 2 (Header Consistency & Invariant B.26)**: Invariant B.26 requires all global header controls to adhere to `h-11 min-h-11` (44px). `NativeMobileHeader` defines `h-12 sm:h-14` (48px/56px), search input `h-9` (36px), and close button `size-6` (24px). Aligning these dimensions to `h-11` eliminates jitter and ensures compliance.
3. **Premise 3 (Systemic Double Header Bug)**: `AppShell` attempts to infer which routes need a native header through `hasCustomPageMobileHeader`. Because new routes were added without updating this list, pages like `/conta/atividade` and `/conta/trocas` render two stacked native headers. The architecture should delegate mobile header rendering to individual routes or establish a typed route metadata contract.
4. **Premise 4 (Mobile Native Dialog Paradigm)**: On screens < 640px, desktop-centered `<Dialog>` components break thumb-zone ergonomics and require unnatural reaching to the top/center of the screen. Converting `ClassifiedFilterSheet`, `LocationMasterPill`, and `ActionAuthGuardModal` to bottom sheets (`<Sheet side="bottom">` or `<Drawer>`) satisfies Apple HIG Rule 6 and eliminate horizontal modal clipping.
5. **Premise 5 (Dead Filter Button)**: In `src/routes/_store.buscar.tsx`, `isFilterSheetOpen` is toggled but never rendered. Mounting `FilterBottomSheet` restores full faceted search functionality.
6. **Premise 6 (Dead Space Optimization)**: Eliminating nested `px-4` inside pages rendered under `AppShell` (using `px-0 sm:px-4 md:px-0`) reclaims 32px of horizontal screen real estate on mobile devices.
7. **Premise 7 (Anti-AI Design Copy)**: Replacing conversational instructions ("Clique no botão abaixo...") with silent, human labels ("Novo Anúncio", "Conectar Lojas") satisfies `anti-ai-design` rules.

---

## 3. Caveats

- **Scope Delimitation**: This investigation is strictly read-only. No source files were edited.
- **Typecheck & Build Prohibitions**: In accordance with user rules, `npm run typecheck` and `npm run build` were not executed.
- **Legacy Quarantine / Admin Master**: Some workspace and admin-master routes are specialized desktop dashboards where 32px/36px compact table controls may be intentional for desktop data density. The 44px rule applies strictly to mobile screens (<640px) or responsive button variants.

---

## 4. Conclusion & Actionable Recommendations

### Prioritized Remediation Plan

| Priority | Component / File | Issue | Recommended Action |
| :--- | :--- | :--- | :--- |
| **P0** | `src/routes/_store.buscar.tsx` | Filter button dead (`isFilterSheetOpen` never rendered) | Mount `FilterBottomSheet` connected to `facetedFacets` |
| **P0** | `src/components/shell/app-shell.tsx` | Hardcoded `hasCustomPageMobileHeader` causing double headers | Update route list or pass `suppressMobileHeader` prop from route loader |
| **P1** | `src/components/navigation/native-mobile-header.tsx` | Height `h-12` instead of `h-11`; input `h-9`; close `size-6` | Refactor container to `h-11 min-h-11`, input to `h-11`, close to `size-11` (or hit-area `min-h-11`) |
| **P1** | `src/components/shell/mobile-nav.tsx` | `text-[10px]` labels, missing `focus-visible`, inline safe area | Change to `text-xs font-semibold`, add `:focus-visible:ring-2`, use Tailwind safe area class |
| **P1** | `src/components/classifieds/catalog/classified-filter-sheet.tsx` | Desktop `<Dialog>` on mobile | Convert to `<Sheet side="bottom">` with iOS grab handle |
| **P1** | `src/components/location/location-master-pill.tsx` | Desktop `<Dialog>` on mobile | Split into `<Sheet side="bottom">` for mobile and `<Dialog>` for desktop |
| **P1** | `src/components/common/action-auth-guard-modal.tsx` | Desktop `<Dialog>` + AI-smell text | Convert to `<Sheet side="bottom">` on mobile, simplify copy |
| **P2** | Repository-wide | 3,027+ microfonts `text-[8px]..text-[11px]` | Replace with canonical tokens: `text-xs font-medium` (12px) |
| **P2** | `src/routes/_store.conta.*.tsx` | Nested `px-4` causing 64px lateral dead space | Standardize root containers to `px-0 sm:px-4 md:px-0` |
| **P2** | `src/routes/_store.conta.classificados.index.tsx` | Conversational copy ("Clique no botão abaixo...") | Replace with clean empty state: "Nenhum anúncio publicado." |

---

## 5. Verification Method

To verify these findings and validate future remediation:

1. **Verify Mobile Nav & Native Header File Paths**:
   ```powershell
   Test-Path "src/components/shell/mobile-nav.tsx"
   Test-Path "src/components/navigation/native-mobile-header.tsx"
   ```
2. **Verify Double Header in AppShell**:
   - Inspect `src/components/shell/app-shell.tsx:240-270` against `src/routes/_store.conta.atividade.tsx:160` and `src/routes/_store.conta.trocas.tsx:217`.
3. **Verify Dead Filter in `/buscar`**:
   - Search `isFilterSheetOpen` in `src/routes/_store.buscar.tsx`: verify that it appears only at lines 488 and 657, and nowhere in the returned JSX.
4. **Verify DL-14 Violations Count**:
   - Inspect `design-lint.report.json` line 17: confirms 2,217 DL-14 violations.
5. **Verify Design Lint Ratchet**:
   ```powershell
   node scripts/design-lint.mjs --summary
   ```
