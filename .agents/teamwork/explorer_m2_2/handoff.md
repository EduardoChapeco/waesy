# Handoff Report — Explorer M2.2: Mobile Header Canonical Height (B.26), Double Header Eradication in AppShell & Desktop Pairing

**Author**: Explorer M2.2 (Mobile Header & Shell Pairing Specialist)  
**Date**: 2026-10-13  
**Working Directory**: `.agents/teamwork/explorer_m2_2`  
**Target Scope**: Features 5 & 6 (Milestone 2) — `src/components/navigation/native-mobile-header.tsx`, `src/components/shell/app-shell.tsx`, and Desktop Inpage Header Pairing across routes.  
**Contract Baseline**: `AGENTS.md` (B.1 to B.30, Invariant B.26, DL-01 to DL-30)

---

## 1. Observation

Direct observations from source code inspection, AST/lint analysis, and filesystem grep:

### 1.1 `src/components/navigation/native-mobile-header.tsx` Forensic Audit

Executing `node scripts/design-lint.mjs` AST source linter against `src/components/navigation/native-mobile-header.tsx` reveals **17 distinct design lint violations** and 3 architectural contract violations:

1. **Non-Canonical Container Height (Invariant B.26 Violation)**:
   - Line 80:
     ```tsx
     <div className="relative flex items-center justify-between gap-2 px-4 h-12 sm:h-14 w-full min-w-0">
     ```
     - *Observation*: Container height is set to `h-12` (48px) on mobile and `sm:h-14` (56px) on small screens.
     - *Violation*: Invariant B.26 mandates that all global header controls MUST share canonical height of 44px (`h-11 min-h-11`).

2. **Undersized Search Input & Touch Targets (DL-14 & Invariant B.26 Violations)**:
   - Line 120:
     ```tsx
     className="w-full h-9 pl-8 pr-8 rounded-lg bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
     ```
     - *Observation*: Height `h-9` is 36px (< 44px), violating Invariant B.26 and DL-14.
   - Line 129:
     ```tsx
     <button
       type="button"
       onClick={() => { onSearchChange(""); setIsSearchOpen(false); }}
       aria-label="Fechar busca"
       className="absolute right-2 size-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
     >
       <X size={13} weight="bold" />
     </button>
     ```
     - *Observation*: Close button touch target is `size-6` (24px height/width). Violates DL-14 (interactive touch target must be $\ge 44\text{px}$).

3. **Missing Keyboard Focus Rings (DL-15 Violations — Severity P0)**:
   - Line 87 (Back button): `<button onClick={handleBack} className="size-11 min-h-11 min-w-[44px] -ml-2 rounded-full ...">` lacks `:focus-visible:ring-2 focus-visible:ring-primary`.
   - Line 120 (Search input): `focus:outline-none focus:ring-1 focus:ring-primary` lacks standard `:focus-visible:ring-2`.
   - Line 129 (Clear search button): lacks `:focus-visible:ring-2 focus-visible:ring-primary`.
   - Line 177 (Search trigger button): `<button onClick={() => setIsSearchOpen(true)} className="size-11 min-h-11 min-w-[44px] ...">` lacks `:focus-visible:ring-2`.
   - Line 191 (Filter trigger button): `<button onClick={() => onFilterClick()} className="relative size-11 min-h-11 min-w-[44px] ...">` lacks `:focus-visible:ring-2`.

4. **Arbitrary Classes, Non-Canonical Spacings & Microfonts (DL-02, DL-03, DL-27)**:
   - Lines 82, 87, 168, 177, 191: `min-w-[44px]` uses arbitrary bracket class (DL-02 P1). In Tailwind, `min-w-11` (11 $\times$ 4px = 44px) is the canonical utility.
   - Line 90: `stroke-[2.5]` uses arbitrary bracket class (DL-02 P1).
   - Line 160: `mt-0.5` uses non-4px grid spacing (DL-03 P1: 2px half-step).
   - Line 199: `text-[9px]` on filter badge uses arbitrary microfont class (DL-02 P1, < 12px floor).
   - Lines 87, 177, 191: `transition-all` violates DL-27 (P3: generic transition prohibited, must specify `transition-colors active:scale-95`).

5. **Prop Deserialization Bug (`rightAction` vs `rightActions`)**:
   - `NativeMobileHeaderProps` defines both `rightActions?: React.ReactNode` (line 15) and `rightAction?: React.ReactNode` (line 16).
   - Function parameter destructuring (line 38) only destructures `rightActions`. `rightAction` is completely omitted from destructuring and JSX rendering (line 206 only renders `{rightActions}`).
   - Consequently, callers like `src/routes/_store.afiliados.tsx:359` (`rightAction={...}`) and `src/routes/_store.conta.curriculo.tsx:334` (`rightAction={...}`) had their right-side buttons silently omitted when passing `rightAction`.

---

### 1.2 `src/components/shell/app-shell.tsx` Systemic Double Mobile Header Bug

`AppShell` conditionally mounts a global native mobile header at lines 294-300:
```tsx
{/* ── Cabeçalho Nativo iOS Automático para Submódulos e Páginas Limpas Mobile ── */}
{shouldRenderGlobalNativeMobileHeader && (
  <NativeMobileHeader
    title={resolveCleanMobileTitle(location.pathname, (contextConfig as any)?.title)}
    fallbackHref={location.pathname.startsWith("/conta/") ? "/conta" : "/"}
    mobileOnly
  />
)}
```
Where `shouldRenderGlobalNativeMobileHeader` is evaluated at lines 275-281:
```tsx
const shouldRenderGlobalNativeMobileHeader =
  isCleanMobileAppPage &&
  !isProfilePage &&
  !isFormPage &&
  !isDetailPage &&
  !hasCustomPageMobileHeader &&
  !isCopilotPage;
```

#### The Root Architectural Flaw
`isCleanMobileAppPage` includes broad substring checks such as:
- `location.pathname.includes("/conta")`
- `location.pathname.includes("/salvos")`
- `location.pathname.includes("/entregador")`
- `location.pathname.includes("/buscar")`

Meanwhile, `hasCustomPageMobileHeader` (lines 241-272) is a hardcoded list of route checks:
```tsx
const hasCustomPageMobileHeader =
  location.pathname === "/conta" ||
  location.pathname === "/conta/" ||
  location.pathname === "/agenda" ||
  location.pathname === "/afiliados" ||
  location.pathname === "/classificados" ||
  location.pathname === "/diretorio" ||
  location.pathname === "/diretorio/" ||
  location.pathname === "/imoveis" ||
  location.pathname === "/servicos" ||
  location.pathname === "/eventos" ||
  location.pathname === "/empregos" ||
  location.pathname === "/empregos/" ||
  location.pathname === "/agendar" ||
  location.pathname === "/agendar/" ||
  location.pathname === "/turismo" ||
  location.pathname === "/turismo/" ||
  location.pathname.startsWith("/doacoes") ||
  location.pathname.startsWith("/ofertas") ||
  location.pathname.startsWith("/conta/conversas") ||
  location.pathname.startsWith("/conta/agendamentos") ||
  location.pathname.startsWith("/conta/classificados") ||
  location.pathname.startsWith("/conta/negociacoes") ||
  location.pathname.startsWith("/conta/comissoes") ||
  location.pathname.startsWith("/conta/curriculo") ||
  location.pathname.startsWith("/conta/empresa") ||
  location.pathname.startsWith("/conta/ingressos") ||
  location.pathname.startsWith("/conta/notificacoes") ||
  location.pathname.startsWith("/conta/pedidos") ||
  location.pathname.startsWith("/destaques/") ||
  location.pathname.startsWith("/admin-master");
```

#### Routes Defining Their Own Header But Missing from `hasCustomPageMobileHeader`
When developers created sub-pages in `/conta/` requiring custom action buttons (e.g., "Lançar" on finanças, "Novo" on endereços, "Minha Atividade" title), they mounted `<NativeMobileHeader>` directly in their route component, but did not update `app-shell.tsx`.

The following 7 `/conta/*` routes render their own `<NativeMobileHeader>` and are **COMPLETELY ABSENT** from `hasCustomPageMobileHeader`:
1. `/conta/atividade` (`src/routes/_store.conta.atividade.tsx:160`): Renders `<NativeMobileHeader title="Minha Atividade" />`.
2. `/conta/trocas` (`src/routes/_store.conta.trocas.tsx:217`): Renders `<NativeMobileHeader title="Trocas" fallbackHref="/conta" mobileOnly />`.
3. `/conta/salvos` (`src/routes/_store.conta.salvos.tsx:126`): Renders `<NativeMobileHeader title="Salvos" fallbackHref="/conta" mobileOnly />`.
4. `/conta/financas` (`src/routes/_store.conta.financas.tsx:303`): Renders `<NativeMobileHeader title="Finanças" fallbackHref="/conta" mobileOnly rightActions={...} />`.
5. `/conta/enderecos` (`src/routes/_store.conta.enderecos.tsx:162`): Renders `<NativeMobileHeader title="Meus Endereços" fallbackHref="/conta" rightActions={...} />`.
6. `/conta/avaliacoes` (`src/routes/_store.conta.avaliacoes.tsx:199`): Renders `<NativeMobileHeader title="Avaliações" fallbackHref="/conta" rightActions={...} />`.
7. `/conta/entregador` (`src/routes/_store.conta.entregador.tsx:404`): Renders `<NativeMobileHeader title="Painel do Condutor" fallbackHref="/conta" />`.

Plus standalone/public routes defining `<NativeMobileHeader>`:
8. `/faq` (`src/routes/_store.faq.tsx:30`): Renders `<NativeMobileHeader title="Dúvidas" fallbackHref="/" />`.
9. `/redefinir-senha` (`src/routes/_store.redefinir-senha.tsx:67`): Renders `<NativeMobileHeader title="Redefinir Senha" fallbackHref="/entrar" />`.

#### Empirical Visual Impact
On `/conta/atividade`:
- **Header 1**: `AppShell` renders `<NativeMobileHeader title="Atividade" fallbackHref="/conta" mobileOnly />`
- **Header 2**: `_store.conta.atividade.tsx` renders `<NativeMobileHeader title="Minha Atividade" />`
- **Header 3**: `_store.conta.atividade.tsx` renders inpage `<h1>Minha Atividade</h1>` (line 165, which lacks `hidden md:flex`)
- **Result**: On a mobile phone screen (<640px), 3 stacked headers consume ~180px of vertical space before any content is visible!

On `/conta/trocas`, `/conta/salvos`, `/conta/financas`, `/conta/enderecos`, `/conta/avaliacoes`:
- Two identical headers are rendered sequentially at the top of the mobile screen.

---

### 1.3 Desktop Pairing Audit (Vanishing Titles on Desktop)

By default, `NativeMobileHeader` defines `mobileOnly = true`, which applies `md:hidden` (lines 44, 75).
When a route mounts `NativeMobileHeader` without a paired inpage desktop header (`hidden md:flex` or equivalent `<h1>`), the page title **completely vanishes on desktop viewports ($\ge 768\text{px}$)**.

Our audit identified 6 routes suffering from vanishing titles on desktop:

1. **`src/routes/_store.faq.tsx`**:
   - Line 30: `<NativeMobileHeader title="Dúvidas" fallbackHref="/" />` is hidden on desktop.
   - Lines 34-60: Renders `<div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10 space-y-6">` followed immediately by `<Accordion>`.
   - *Result*: No page title or heading exists anywhere on desktop ($\ge 768\text{px}$).

2. **`src/routes/_store.conta.entregador.tsx`**:
   - Line 404: `<NativeMobileHeader title="Painel do Condutor" fallbackHref="/conta" />` is hidden on desktop.
   - Line 407: The desktop card shows the driver's full name ("Fulano • WAESY GO"), but no page title ("Painel do Condutor").

3. **`src/routes/_store.conta.pedidos.$id.tsx`**:
   - Line 230: `<NativeMobileHeader title={`Pedido ${order.order_number...}`} subtitle={`Realizado em ${formatDate(...) }`} fallbackHref="/conta/pedidos" rightActions={...} />` is hidden on desktop.
   - Line 256: Desktop view jumps directly to `<div className="grid gap-6 md:grid-cols-3">` with item lists. The order number, date, status, and Digital Companion button disappear from the top on desktop.

4. **`src/routes/_store.diretorio.index.tsx`**:
   - Line 115: `<NativeMobileHeader title="Diretório" centerTitle backTo="/" ... />` is hidden on desktop.
   - Line 123: Desktop view transitions directly into banner hero and filter chips with no "Guia e Diretório Local" header.

5. **`src/routes/_store.eventos.tsx`**:
   - Line 566: `<NativeMobileHeader title="Eventos" centerTitle backTo="/" ... />` is hidden on desktop.
   - Line 574: Desktop view shows banners and hotpages with no inpage header.

6. **`src/routes/_store.empregos.index.tsx`**:
   - Line 117: `<NativeMobileHeader title="Vagas" centerTitle fallbackHref="/" ... />` is hidden on desktop.
   - Line 126: Desktop view starts with banners and candidate buttons without an inpage title.

#### Routes with Inverted Bug (Inpage Header NOT Hidden on Mobile)
- **`src/routes/_store.conta.atividade.tsx`**:
  - Line 163: `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">`
  - *Observation*: Missing `hidden md:flex`. The desktop header is rendered on mobile in addition to `NativeMobileHeader`.

---

## 2. Logic Chain

```
Observation 1: native-mobile-header.tsx line 80 has 'h-12 sm:h-14'.
  └─ Invariant B.26 dictates canonical height of 44px ('h-11 min-h-11') across all top bar controls.
  └─ Premise 1: Changing container to 'h-11 min-h-11' aligns with B.26.

Observation 2: native-mobile-header.tsx line 120 has 'h-9' (36px) and line 129 has 'size-6' (24px).
  └─ DL-14 prohibits interactive elements < 44px; Invariant B.26 requires 44px controls.
  └─ Premise 2: Standardizing input to 'h-11 min-h-11' and close button to 'size-11 min-h-11 min-w-11' satisfies DL-14.

Observation 3: Back button (line 87), close button (line 129), search trigger (line 177), and filter trigger (line 191) lack ':focus-visible:'.
  └─ DL-15 classifies missing keyboard focus rings on interactive elements as P0 (delivery blocking).
  └─ Premise 3: Adding ':focus-visible:ring-2 focus-visible:ring-primary' resolves all DL-15 violations.

Observation 4: lines 82, 87, 168, 177, 191 have 'min-w-[44px]' and line 199 has 'text-[9px]'.
  └─ DL-02 flags arbitrary brackets; typographic floor requires text-xs (12px) minimum.
  └─ Premise 4: Replacing 'min-w-[44px]' with 'min-w-11' and 'text-[9px]' with 'text-xs font-bold leading-none' cures DL-02 and microfonts.

Observation 5: app-shell.tsx checks 'hasCustomPageMobileHeader' before rendering global NativeMobileHeader.
  └─ 7 routes in /conta/* mount their own NativeMobileHeader but are omitted from 'hasCustomPageMobileHeader'.
  └─ Premise 5: app-shell and the route both render NativeMobileHeader on mobile, producing double headers.

Observation 6: Centralizing route exclusion logic into a normalized helper 'checkHasCustomPageMobileHeader(pathname)'
  └─ Supports both exact routes and prefix routes, strips trailing slashes, and eliminates hardcoded copy-paste errors.
  └─ Premise 6: Double headers will be eradicated permanently.

Observation 7: Routes like _store.faq.tsx mount NativeMobileHeader with 'mobileOnly={true}' (md:hidden) and no 'hidden md:flex' inpage header.
  └─ On desktop (>= 768px), md:hidden hides the mobile header, leaving the desktop page with no title.
  └─ Premise 7: Adding a container-aligned '<div className="hidden md:flex ...">' restores the title on desktop while keeping mobile clean.
```

---

## 3. Caveats

1. **Read-Only Scope**: This report contains exact code diffs and recommendations. No source files were directly edited in `src/`.
2. **Typecheck & Build Prohibitions**: In accordance with user rules, `npm run typecheck` and `npm run build` were not executed during investigation.
3. **PWA Safe Area Inset**: `pt-[env(safe-area-inset-top,0px)]` in `native-mobile-header.tsx` is flagged by `design-lint` as DL-02. This is a necessary PWA safe area utility. An inline exemption `// design-lint-ignore DL-02 reason:"PWA safe-area-inset-top"` or dedicated utility in `styles.css` is recommended.
4. **Desktop Bento Grid Alignment**: All proposed inpage headers are styled with `hidden md:flex` and follow the canonical Bento Grid proportions of the platform (`max-w-5xl` or `max-w-7xl` aligned to the page container).

---

## 4. Conclusion & Actionable Worker Specifications

### 4.1 Recipe & Diff for `src/components/navigation/native-mobile-header.tsx`

#### Changes Summary
1. Standardize container height from `h-12 sm:h-14` to `h-11 min-h-11` (B.26).
2. Standardize search input height from `h-9` to `h-11 min-h-11`, with padding `pl-9 pr-11` (B.26, DL-14).
3. Standardize clear button to `size-11 min-h-11 min-w-11` positioned at `right-0 top-0` with `:focus-visible:ring-2` (DL-14, DL-15).
4. Add `:focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` to back button, search trigger, and filter trigger (DL-15).
5. Replace arbitrary bracket `min-w-[44px]` with canonical token `min-w-11` (DL-02).
6. Replace `stroke-[2.5]` with `weight="bold"` or standard SVG stroke (DL-02).
7. Replace filter badge `text-[9px]` with `text-xs font-bold leading-none` and `min-w-4 h-4 px-1` (DL-02, Typographic Floor).
8. Replace `transition-all` with `transition-colors active:scale-95` (DL-27).
9. Destructure `rightAction` in addition to `rightActions` and render `{rightActions || rightAction}`.

#### Exact Diff

```diff
--- a/src/components/navigation/native-mobile-header.tsx
+++ b/src/components/navigation/native-mobile-header.tsx
@@ -35,7 +35,8 @@ export function NativeMobileHeader({
   onBack,
   fallbackHref = "/",
   leftSlot,
   rightActions,
+  rightAction,
   badge,
   bottomSlot,
   transparent = false,
@@ -73,21 +74,22 @@ export function NativeMobileHeader({
         transparent ? "bg-transparent" : "bg-background/95 backdrop-blur-md",
         bordered && !transparent ? "border-b border-border/40" : "",
         mobileOnly ? "md:hidden" : "",
+        // design-lint-ignore DL-02 reason:"PWA safe area inset top"
         "pt-[env(safe-area-inset-top,0px)]",
         className
       )}
     >
-      <div className="relative flex items-center justify-between gap-2 px-4 h-12 sm:h-14 w-full min-w-0">
+      <div className="relative flex items-center justify-between gap-2 px-4 h-11 min-h-11 w-full min-w-0">
         {/* ── Lado Esquerdo: Apenas Ícone < (44x44px, sem texto) ── */}
-        <div className="flex items-center gap-1 shrink-0 min-w-[44px] z-10">
+        <div className="flex items-center gap-1 shrink-0 min-w-11 z-10">
           {showBack && (
             <button
               type="button"
               onClick={handleBack}
-              className="size-11 min-h-11 min-w-[44px] -ml-2 rounded-full flex items-center justify-center text-foreground/85 hover:text-foreground hover:bg-muted/50 active:bg-muted/80 active:scale-95 transition-all cursor-pointer"
+              className="size-11 min-h-11 min-w-11 -ml-2 rounded-full flex items-center justify-center text-foreground/85 hover:text-foreground hover:bg-muted/50 active:bg-muted/80 active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
               aria-label="Voltar"
             >
-              <CaretLeft className="size-5 stroke-[2.5]" weight="bold" />
+              <CaretLeft className="size-5" weight="bold" />
             </button>
           )}
           {leftSlot}
@@ -100,7 +102,7 @@ export function NativeMobileHeader({
               <MagnifyingGlass
                 size={16}
                 weight="bold"
-                className="absolute left-3 text-muted-foreground pointer-events-none"
+                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
               />
               <input
                 type="search"
@@ -117,17 +119,17 @@ export function NativeMobileHeader({
                   }
                 }}
                 placeholder={searchPlaceholder}
-                className="w-full h-9 pl-8 pr-8 rounded-lg bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
+                className="w-full h-11 min-h-11 pl-9 pr-11 rounded-lg bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
               />
               <button
                 type="button"
                 onClick={() => {
                   onSearchChange("");
                   setIsSearchOpen(false);
                 }}
                 aria-label="Fechar busca"
-                className="absolute right-2 size-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
+                className="absolute right-0 top-0 size-11 min-h-11 min-w-11 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
               >
-                <X size={13} weight="bold" />
+                <X size={16} weight="bold" />
               </button>
             </div>
           </div>
@@ -157,7 +159,7 @@ export function NativeMobileHeader({
               {badge && <div className="shrink-0">{badge}</div>}
             </div>
             {subtitle && (
-              <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
+              <div className="text-xs text-muted-foreground truncate leading-tight mt-1">
                 {subtitle}
               </div>
             )}
           </div>
@@ -165,13 +167,13 @@ export function NativeMobileHeader({
         )}
 
         {/* ── Lado Direito: Lupa Contextual + Funil ML-Filter + Ações Extras (44x44px) ── */}
-        <div className="flex items-center gap-1 shrink-0 min-w-[44px] justify-end z-10">
+        <div className="flex items-center gap-1 shrink-0 min-w-11 justify-end z-10">
           {onSearchChange && !isSearchOpen && (
             <button
               type="button"
               onClick={() => {
                 trackClick("native_header_open_search", { title: typeof title === "string" ? title : undefined });
                 setIsSearchOpen(true);
               }}
               aria-label="Buscar"
-              className="size-11 min-h-11 min-w-[44px] rounded-full inline-flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:scale-95 transition-all cursor-pointer"
+              className="size-11 min-h-11 min-w-11 rounded-full inline-flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
             >
               <MagnifyingGlass size={20} weight="bold" />
             </button>
@@ -188,14 +190,14 @@ export function NativeMobileHeader({
                 onFilterClick();
               }}
               aria-label="Filtrar"
-              className="relative size-11 min-h-11 min-w-[44px] rounded-full inline-flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:scale-95 transition-all cursor-pointer"
+              className="relative size-11 min-h-11 min-w-11 rounded-full inline-flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
             >
               <Funnel
                 size={20}
                 weight={activeFiltersCount > 0 ? "fill" : "bold"}
                 className={activeFiltersCount > 0 ? "text-primary" : ""}
               />
               {activeFiltersCount > 0 && (
-                <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
+                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold leading-none flex items-center justify-center">
                   {activeFiltersCount}
                 </span>
               )}
             </button>
           )}
 
-          {rightActions}
+          {rightActions || rightAction}
         </div>
       </div>
```

---

### 4.2 Recipe & Diff for `src/components/shell/app-shell.tsx`

#### Architectural Fix Design
1. Replace verbose, error-prone OR statements with a normalized helper function: `checkHasCustomPageMobileHeader(pathname: string): boolean`.
2. Normalize pathname by stripping trailing slashes: `const clean = pathname.replace(/\/+$/, "") || "/"`.
3. Support exact route matches (`Set<string>`) and prefix matches (`startsWith`).
4. Include all 7 previously omitted `/conta/*` routes plus `/redefinir-senha` and `/faq`.

#### Exact Diff

```diff
--- a/src/components/shell/app-shell.tsx
+++ b/src/components/shell/app-shell.tsx
@@ -84,6 +84,49 @@ function resolveCleanMobileTitle(pathname: string, fallbackTitle?: string): stri
   return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
 }
 
+/**
+ * Determina se a rota ativa renderiza seu próprio NativeMobileHeader ou cabeçalho dedicado,
+ * impedindo a renderização duplicada de cabeçalho global pelo AppShell.
+ */
+export function checkHasCustomPageMobileHeader(pathname: string): boolean {
+  const clean = pathname.replace(/\/+$/, "") || "/";
+
+  const exactCustomRoutes = new Set([
+    "/conta",
+    "/agenda",
+    "/afiliados",
+    "/classificados",
+    "/diretorio",
+    "/imoveis",
+    "/servicos",
+    "/eventos",
+    "/empregos",
+    "/agendar",
+    "/turismo",
+    "/faq",
+  ]);
+
+  if (exactCustomRoutes.has(clean)) return true;
+
+  const prefixCustomRoutes = [
+    "/doacoes",
+    "/ofertas",
+    "/redefinir-senha",
+    "/destaques",
+    "/admin-master",
+    "/conta/atividade",
+    "/conta/avaliacoes",
+    "/conta/enderecos",
+    "/conta/entregador",
+    "/conta/financas",
+    "/conta/salvos",
+    "/conta/trocas",
+    "/conta/conversas",
+    "/conta/agendamentos",
+    "/conta/classificados",
+    "/conta/negociacoes",
+    "/conta/comissoes",
+    "/conta/curriculo",
+    "/conta/empresa",
+    "/conta/ingressos",
+    "/conta/notificacoes",
+    "/conta/pedidos",
+  ];
+
+  return prefixCustomRoutes.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
+}
+
 export interface AppShellProps {
  children: ReactNode;
  session?: any;
@@ -238,38 +281,7 @@ export function AppShell({ children, session, brandSettings }: AppShellProps) {
   const isFeedPage = location.pathname.startsWith("/feed");
   // isMarketingLanding removido (V99/FASE 1) — LP agora em /cadastroantecipado.
 
-  const hasCustomPageMobileHeader =
-    location.pathname === "/conta" ||
-    location.pathname === "/conta/" ||
-    location.pathname === "/agenda" ||
-    location.pathname === "/afiliados" ||
-    location.pathname === "/classificados" ||
-    location.pathname === "/diretorio" ||
-    location.pathname === "/diretorio/" ||
-    location.pathname === "/imoveis" ||
-    location.pathname === "/servicos" ||
-    location.pathname === "/eventos" ||
-    location.pathname === "/empregos" ||
-    location.pathname === "/empregos/" ||
-    location.pathname === "/agendar" ||
-    location.pathname === "/agendar/" ||
-    location.pathname === "/turismo" ||
-    location.pathname === "/turismo/" ||
-    location.pathname.startsWith("/doacoes") ||
-    location.pathname.startsWith("/ofertas") ||
-    location.pathname.startsWith("/conta/conversas") ||
-    location.pathname.startsWith("/conta/agendamentos") ||
-    location.pathname.startsWith("/conta/classificados") ||
-    location.pathname.startsWith("/conta/negociacoes") ||
-    location.pathname.startsWith("/conta/comissoes") ||
-    location.pathname.startsWith("/conta/curriculo") ||
-    location.pathname.startsWith("/conta/empresa") ||
-    location.pathname.startsWith("/conta/ingressos") ||
-    location.pathname.startsWith("/conta/notificacoes") ||
-    location.pathname.startsWith("/conta/pedidos") ||
-    location.pathname.startsWith("/destaques/") ||
-    location.pathname.startsWith("/admin-master");
+  const hasCustomPageMobileHeader = checkHasCustomPageMobileHeader(location.pathname);
 
   const isCopilotPage = location.pathname.startsWith("/copilot");
```

---

### 4.3 Recipes & Diffs for Desktop Inpage Pairing Across Affected Routes

#### Route 1: `src/routes/_store.faq.tsx`
Add desktop inpage header aligned to container:
```diff
--- a/src/routes/_store.faq.tsx
+++ b/src/routes/_store.faq.tsx
@@ -29,6 +29,14 @@ function Page() {
     <div className="w-full">
       <NativeMobileHeader
         title="Dúvidas"
         fallbackHref="/"
       />
+      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
+      <div className="hidden md:flex items-center justify-between border-b border-border/40 pb-4 pt-2 mb-6 max-w-3xl mx-auto px-4 md:px-6">
+        <div>
+          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dúvidas Frequentes</h1>
+          <p className="text-xs text-muted-foreground mt-1">Perguntas comuns sobre pedidos, entregas e funcionamento da plataforma</p>
+        </div>
+      </div>
       <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10 space-y-6">
```

#### Route 2: `src/routes/_store.conta.entregador.tsx`
Add desktop inpage header:
```diff
--- a/src/routes/_store.conta.entregador.tsx
+++ b/src/routes/_store.conta.entregador.tsx
@@ -402,6 +402,17 @@ export function DriverDashboard() {
   return (
     <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
-      <NativeMobileHeader title="Painel do Condutor" fallbackHref="/conta" />
+      <NativeMobileHeader title="Painel do Condutor" fallbackHref="/conta" mobileOnly />
+
+      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
+      <div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40">
+        <div className="flex items-center gap-3">
+          <h1 className="text-xl font-bold tracking-tight text-foreground">Painel do Condutor</h1>
+          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-mono">
+            WAESY GO
+          </Badge>
+        </div>
+      </div>
 
       {/* ── 1. HEADER OPERACIONAL: STATUS, VEÍCULO & TOGGLE ONLINE ── */}
```

#### Route 3: `src/routes/_store.conta.pedidos.$id.tsx`
Add desktop inpage header restoring order title, status, and Digital Companion action:
```diff
--- a/src/routes/_store.conta.pedidos.$id.tsx
+++ b/src/routes/_store.conta.pedidos.$id.tsx
@@ -254,6 +254,34 @@ export function CustomerOrderDetailPage() {
         }
       />
 
+      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
+      <div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40 mb-6">
+        <div className="space-y-1">
+          <div className="flex items-center gap-3">
+            <h1 className="text-xl font-bold tracking-tight text-foreground">
+              Pedido {order.order_number || formatHumanOrderId(order.custom_fields?.short_id || order.public_token)}
+            </h1>
+            <Badge
+              variant={getStatusVariant(order.status)}
+              className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full"
+            >
+              {translateStatus(order.status)}
+            </Badge>
+          </div>
+          <p className="text-xs text-muted-foreground">
+            Realizado em {formatDate(order.created_at)}
+          </p>
+        </div>
+        <Button
+          variant="outline"
+          size="sm"
+          onClick={() => setCompanionOpen(true)}
+          className="rounded-lg text-xs font-semibold gap-2 h-11 min-h-11 px-4 cursor-pointer border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 focus-visible:ring-2 focus-visible:ring-primary"
+        >
+          <Smartphone className="size-4" />
+          <span>Resumo Digital 9:16</span>
+        </Button>
+      </div>
+
       <div className="grid gap-6 md:grid-cols-3">
```

#### Route 4: `src/routes/_store.diretorio.index.tsx`
Add desktop inpage header:
```diff
--- a/src/routes/_store.diretorio.index.tsx
+++ b/src/routes/_store.diretorio.index.tsx
@@ -121,6 +121,14 @@ export function DirectoryPage() {
         searchPlaceholder="Buscar empresas, clínicas, serviços..."
       />
+      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
+      <div className="hidden md:flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">
+        <div>
+          <h1 className="text-xl font-bold tracking-tight text-foreground">Guia & Diretório Local</h1>
+          <p className="text-xs text-muted-foreground mt-1">Empresas, comércios, clínicas e prestadores de serviços verificados na região</p>
+        </div>
+      </div>
       <div className="px-0 sm:px-4 space-y-4 pt-2 sm:pt-4">
```

#### Route 5: `src/routes/_store.eventos.tsx`
Add desktop inpage header:
```diff
--- a/src/routes/_store.eventos.tsx
+++ b/src/routes/_store.eventos.tsx
@@ -572,6 +572,14 @@ export function EventsCatalog() {
         searchPlaceholder="Buscar shows, festivais, eventos..."
       />
+      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
+      <div className="hidden md:flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">
+        <div>
+          <h1 className="text-xl font-bold tracking-tight text-foreground">Eventos & Agenda Cultural</h1>
+          <p className="text-xs text-muted-foreground mt-1">Shows, festivais, palestras e atrações na sua cidade e região</p>
+        </div>
+      </div>
       <div className="px-4 sm:px-5 space-y-6 pt-2 sm:pt-4">
```

#### Route 6: `src/routes/_store.empregos.index.tsx`
Add desktop inpage header:
```diff
--- a/src/routes/_store.empregos.index.tsx
+++ b/src/routes/_store.empregos.index.tsx
@@ -124,6 +124,14 @@ export function EmpregosPage() {
           searchPlaceholder="Buscar cargo, empresa ou vaga..."
         />
       </div>
+      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
+      <div className="hidden md:flex items-center justify-between pt-2 pb-4 border-b border-border/40">
+        <div>
+          <h1 className="text-xl font-bold tracking-tight text-foreground">Vagas & Oportunidades</h1>
+          <p className="text-xs text-muted-foreground mt-1">Encontre vagas de trabalho, estágios e carreiras em empresas locais</p>
+        </div>
+      </div>
       {/* ── 1. Banners Contextuais de Empregos ── */}
```

#### Route 7: `src/routes/_store.conta.atividade.tsx`
Pair inpage header with `hidden md:flex` so it does not duplicate on mobile:
```diff
--- a/src/routes/_store.conta.atividade.tsx
+++ b/src/routes/_store.conta.atividade.tsx
@@ -158,9 +158,9 @@ export function MinhaAtividadePage() {
   return (
     <div className="space-y-6 pb-12">
-      <NativeMobileHeader title="Minha Atividade" />
+      <NativeMobileHeader title="Minha Atividade" fallbackHref="/conta" mobileOnly />
 
-      {/* Header com contextualização LGPD */}
-      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
+      {/* Header com contextualização LGPD (Desktop Apenas) */}
+      <div className="hidden md:flex items-center justify-between gap-4 border-b pb-4">
         <div>
           <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
```

---

## 5. Verification Method

To verify these findings and confirm post-implementation compliance:

1. **Verify `native-mobile-header.tsx` Design Lint Cleanness**:
   Run the deterministic design lint AST parser against the refactored file:
   ```powershell
   node -e "const { lintSource } = await import('./scripts/design-lint.mjs'); const fs = await import('fs'); const content = fs.readFileSync('src/components/navigation/native-mobile-header.tsx', 'utf8'); const res = lintSource(content, 'src/components/navigation/native-mobile-header.tsx'); console.log('Violations count:', res.length); console.log(JSON.stringify(res, null, 2));"
   ```
   *Expected Result*: 0 P0 violations, 0 P1 violations (reduced from 17 down to 0).

2. **Verify Double Header Eradication in `app-shell.tsx`**:
   Run unit assertions verifying `checkHasCustomPageMobileHeader`:
   ```powershell
   node -e "const { checkHasCustomPageMobileHeader } = await import('./src/components/shell/app-shell.tsx'); const testRoutes = ['/conta/atividade', '/conta/trocas', '/conta/salvos', '/conta/financas', '/conta/enderecos', '/conta/avaliacoes', '/conta/entregador', '/faq', '/redefinir-senha']; const allPassed = testRoutes.every(r => checkHasCustomPageMobileHeader(r)); console.log('All custom routes excluded from AppShell header:', allPassed);"
   ```
   *Expected Result*: Returns `true` for all 9 routes with and without trailing slash.

3. **Verify Design Lint Ratchet**:
   Run the repository-wide design lint ratchet to guarantee technical debt reduction:
   ```powershell
   node scripts/design-lint.mjs --ratchet
   ```
   *Expected Result*: Exit Code 0, Technical debt strictly decreasing.

4. **Verify Desktop Header Visibility**:
   In Playwright or manual responsive viewport test:
   - At 390px (Mobile): Verify that `/conta/atividade`, `/conta/trocas`, `/conta/enderecos`, `/faq` render exactly ONE header (`NativeMobileHeader`).
   - At 1024px (Desktop): Verify that `/faq`, `/conta/entregador`, `/conta/pedidos/123`, `/diretorio`, `/eventos`, `/empregos` render their inpage header (`hidden md:flex`) and the mobile header is hidden (`md:hidden`).
