# Handoff Report — Explorer M2.3: Bottom Sheets Conversion, Dead Filter in /buscar, Typographic Floor & Dead Space Purge

**Author**: Explorer M2.3 (Bottom Sheets & Ergonomics Specialist)  
**Date**: 2026-10-13  
**Working Directory**: `.agents/teamwork/explorer_m2_3`  
**Milestone**: Milestone 2 (Mobile Nativization & App Ergonomics HIG)  
**Assigned Features**: Feature 7 (Bottom Sheets Conversion & Dead Filter Fix) & Feature 8 (Typographic Floor & Dead Space Purge)  
**Baseline Standard**: `AGENTS.md` (B.1 to B.30, DL-01 to DL-30) & Apple Human Interface Guidelines (<640px)

---

## 1. Observation

Direct code observations across the repository (file paths, line numbers, and verbatim snippets):

### 1.1 Dead Filter in `src/routes/_store.buscar.tsx`
- **State Declaration**:
  - `src/routes/_store.buscar.tsx:488`:
    ```ts
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    ```
- **Trigger Binding**:
  - `src/routes/_store.buscar.tsx:657`:
    ```tsx
    <DiscoveryControlBar
      ...
      onFilterClick={() => setIsFilterSheetOpen(true)}
      activeFiltersCount={activeFiltersCount}
    />
    ```
- **Existing Filter Handler & State**:
  - `src/routes/_store.buscar.tsx:489-495`:
    ```ts
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
    const [selectedMinPrice, setSelectedMinPrice] = useState<number | undefined>();
    const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | undefined>();
    const [selectedSort, setSelectedSort] = useState<string>("relevance_telemetry");
    const [facetedFacets, setFacetedFacets] = useState<FacetedSearchFacets | null>(null);
    ```
  - `src/routes/_store.buscar.tsx:506-553`: `handleApplyFilters(filters)` is fully implemented, querying `searchFacetedCatalog` and updating results.
- **The Critical Disconnect**:
  - `src/routes/_store.buscar.tsx:9`:
    ```ts
    import { FacetedSearchSheet } from "@/components/search/faceted-search-sheet";
    ```
  - `FacetedSearchSheet` is ALREADY imported at line 9.
  - However, in `src/routes/_store.buscar.tsx:1000-1057`, the JSX ends at line 1057 without mounting `<FacetedSearchSheet>` anywhere in the component tree. Clicking the filter button sets `isFilterSheetOpen` to `true`, but nothing renders on screen.

### 1.2 Desktop Dialogs on Mobile Screens (< 640px)
- **`src/components/classifieds/catalog/classified-filter-sheet.tsx`**:
  - Line 3: `import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";`
  - Lines 123-124:
    ```tsx
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-screen rounded-none sm:rounded-lg p-5 space-y-4 overflow-y-auto">
    ```
  - Despite being named `ClassifiedFilterSheet`, it mounts desktop `<Dialog>`. On mobile (<640px), it behaves as a centered desktop dialog box rather than an Apple HIG bottom sheet.
- **`src/components/location/location-master-pill.tsx`**:
  - Line 7: `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";`
  - Lines 534-541:
    ```tsx
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`p-0 overflow-hidden bg-background transition-opacity duration-200 ... ${
        activeTab === "map" ? "max-w-4xl w-full h-overlay-max rounded-lg flex flex-col" : "max-w-xl rounded-lg"
      }`}>
    ```
  - Tapping the location pill on mobile renders a centered modal box, making one-handed thumb interaction difficult.
- **`src/components/common/action-auth-guard-modal.tsx`**:
  - Line 4: `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";`
  - Line 34: `<Dialog open={isOpen} onOpenChange={onOpenChange}>`
  - Line 35: `<DialogContent className="sm:max-w-md rounded-lg p-6 space-y-4">`
  - Lines 24-25: Contains verbose, AI-smell text:
    ```ts
    title = "Acesso Restrito a Membros",
    description = "Para concluir esta ação com total segurança, acesse sua conta ou faça um cadastro rápido gratuito na Comunidade Waesy.",
    ```
- **`src/components/common/share-modal.tsx`**:
  - Line 2: `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";`
  - Lines 92-93: `<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md sm:rounded-lg sm:p-6 p-5">`
  - Line 116: Microfont `text-[11px] text-muted-foreground truncate font-mono mt-1`
  - Line 132: Microfont `text-[11px] font-semibold text-foreground`

### 1.3 Typographic Scale Survey (Microfonts < 12px / DL-02)
- **Repository-Wide Count**: A PowerShell search across `src/` for `text-\[(8|9|10|11)px\]` matched **3,004 lines**.
- **Top Files with Microfont Density**:
  - `src/components/commerce/travel/travel-package-form.tsx` (66 occurrences)
  - `src/components/tourism/new-travel-proposal-sheet.tsx` (66 occurrences)
  - `src/routes/admin-master.mining.tsx` (53 occurrences)
  - `src/components/tourism/vouchers/operator-voucher-import-sheet.tsx` (52 occurrences)
  - `src/routes/admin-master.integracoes.tsx` (48 occurrences)
  - `src/components/tourism/studio/studio-sidebar-editor.tsx` (43 occurrences)
  - `src/routes/admin-master.marca.tsx` (41 occurrences)
  - `src/routes/_store.criar-negocio.avancado.tsx` (36 occurrences)
- **Key Customer & Shell Components Microfonts**:
  - `src/components/navigation/native-mobile-header.tsx:199`: `<span className="... text-[9px] font-bold ...">`
  - `src/components/search/faceted-search-sheet.tsx:180, 342`: `text-[11px]`
  - `src/components/search/faceted-search-sheet.tsx:187, 197, 232, 264, 349, 359, 394, 426`: `text-[10px]`
  - `src/components/shell/global-menu-hub.tsx:199, 250, 271, 285, 313`: `text-[10px]` and line 396: `text-[11px]`
  - `src/components/commerce/quick-create-modal.tsx:188`: `text-[9px] font-bold uppercase`
  - `src/routes/_store.buscar.tsx:675`: `text-[11px] font-semibold text-muted-foreground`

### 1.4 Lateral Dead Space & Double Padding
- **AppShell `<main>` Container**:
  - `src/components/shell/app-shell.tsx:319`:
    ```tsx
    : isFeedPage || isCleanMobileAppPage
    ? "overflow-y-auto no-scrollbar overflow-x-hidden px-4 sm:px-6 md:px-8 pt-0 md:pt-3 pb-24 md:pb-8"
    ```
  - On mobile (<640px), `<main>` injects `px-4` (16px left + 16px right).
- **Child Route Double Padding**:
  - Multiple child routes declare root wrappers with `px-4 sm:px-6`:
    - `src/routes/_store.conta.entregador.tsx:403`: `<div className="w-full max-w-5xl mx-auto space-y-6 pb-24 px-4 sm:px-6">`
    - `src/routes/_store.conta.avaliacoes.tsx:197`: `<div className="w-full max-w-2xl mx-auto pb-24 px-4 sm:px-6">`
    - `src/routes/_store.conta.ingressos.tsx:298`: `<div className="w-full max-w-2xl mx-auto pb-24 px-4 sm:px-6">`
    - `src/routes/_store.conta.notificacoes.tsx:150`: `<div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-4 sm:px-6">`
    - `src/routes/_store.agendar.index.tsx:224`: `<div className="w-full max-w-5xl mx-auto px-4 sm:px-5 space-y-6 pb-24">`
    - `src/routes/_store.afiliados.tsx:417`: `<div className="max-w-5xl mx-auto px-4 sm:px-5 md:px-6 py-3 sm:py-6">`
  - **Dead Margin Impact**:
    - 16px (`<main>`) + 16px (child root container) = 32px padding per side (64px total).
    - On a 375px viewport (iPhone SE), usable width drops to 311px — wasting 17.1% of available screen space.
    - Conversely, compliant routes like `src/routes/_store.carrinho.tsx:79`, `src/routes/_store.checkout.tsx:986`, and `src/routes/_store.conta.agendamentos.tsx:119` correctly use `px-0 sm:px-4 md:px-0`.

### 1.5 Conversational Text & AI-Smell
Direct verbatim findings:
- `src/routes/_store.conta.classificados.index.tsx:879`: `"Clique no botão abaixo para publicar seu primeiro anúncio gratuito."`
- `src/routes/_store.afiliados.tsx:794`: `"Insira a URL de uma imagem abaixo para visualizar o banner em 16:9"`
- `src/routes/_store.afiliados.tsx:882`: `"Clique no botão acima para conectar as lojas parceiras da sua cidade à sua vitrine."`
- `src/routes/_store.afiliados.tsx:1223`: `"Nenhuma indicação registrada ainda. Compartilhe seu link exclusivo para começar."`
- `src/components/common/action-auth-guard-modal.tsx:25`: `"Para concluir esta ação com total segurança, acesse sua conta ou faça um cadastro rápido gratuito na Comunidade Waesy."`
- `src/routes/_store.recuperar-senha.tsx:52`: `"Digite seu e-mail para receber um link de redefinição de senha."`
- `src/components/workspace/filter-bottom-sheet.tsx:38`: `"Selecione as opções abaixo para refinar os resultados."`
- `src/routes/workspace.eventos.$id.subpaineis.tsx:78`: `"Nenhum subpainel criado para este evento. Clique no botão acima para adicionar bares ou pontos de atendimento."`
- `src/components/admin/builder/builder-left-panel.tsx:245`: `"Clique no botão acima para adicionar a primeira seção da sua página."`
- `src/routes/workspace.configuracoes.inteligencia-artificial.tsx:251`: `"Chave ainda não inserida. Clique abaixo para configurar."`
- `src/components/contracts/contract-audit-manifest.tsx:229`: `"Aponte a câmera do seu celular para o QR Code ao lado ou acesse o endereço abaixo para consultar a integridade do arquivo e o certificado digital original."`
- `src/routes/_store.conta.empresa.tsx:244`: `"Você ainda não possui uma empresa cadastrada com seu perfil de usuário. Crie o perfil da sua empresa em 1 minuto para começar a anunciar e receber clientes."`

### 1.6 AppShell Double Mobile Header Bug
- `src/components/shell/app-shell.tsx:241-271`: `hasCustomPageMobileHeader` omits several routes that define their own `<NativeMobileHeader>`:
  - `/conta/atividade` (`_store.conta.atividade.tsx:69`)
  - `/conta/trocas` (`_store.conta.trocas.tsx`)
  - `/conta/salvos` (`_store.conta.salvos.tsx`)
  - `/conta/financas` (`_store.conta.financas.tsx`)
  - `/conta/enderecos` (`_store.conta.enderecos.tsx`)
  - `/conta/avaliacoes` (`_store.conta.avaliacoes.tsx`)
  - `/conta/entregador` (`_store.conta.entregador.tsx:404`)
- Consequence: On mobile, `AppShell` renders a global `<NativeMobileHeader>` AND the page mounts its own `<NativeMobileHeader>`, stacking two consecutive headers.

---

## 2. Logic Chain

1. **Dead Filter Resolution**: In `src/routes/_store.buscar.tsx`, all state hooks (`isFilterSheetOpen`, `selectedCategories`, `selectedNiches`, `selectedMinPrice`, `selectedMaxPrice`, `selectedSort`, `facetedFacets`) and action handlers (`handleApplyFilters`) are already functional. Furthermore, `FacetedSearchSheet` is already imported at line 9. Mounting `<FacetedSearchSheet>` directly in `SearchPage` restores complete faceted search capability without introducing any new external dependencies.
2. **Bottom Sheet Nativization**: Under Apple HIG, modal sheets on mobile viewports (<640px) must anchor to the bottom edge (`side="bottom"`), provide a tactile iOS drag handle (`w-12 h-1.5 rounded-full bg-muted-foreground/30`), and support one-handed thumb interaction. `ClassifiedFilterSheet`, `LocationMasterPill`, `ActionAuthGuardModal`, and `ShareModal` currently use desktop `<Dialog>`, forcing users to reach for the screen center. Converting them to `<Sheet side="bottom">` on mobile eliminates viewport edge clipping and aligns with Apple HIG ergonomics.
3. **Typographic Floor Enforcement**: Arbitrary bracket font sizes (`text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`) violate both DL-02 (arbitrary bracket classes) and the core accessibility floor (WCAG 2.2 / Apple HIG minimum readable font of 12px). Mapping each microfont to `text-xs` (12px) with appropriate weights (`font-medium`, `font-semibold`, `font-mono`) establishes the required typographic floor across the codebase.
4. **Dead Space Purge**: `AppShell`'s `<main>` container enforces `px-4 sm:px-6 md:px-8`. Any child route that applies `px-4` creates 32px of margin on each side (64px total), wasting 17.1% of mobile width on 375px screens. Standardizing child route containers to `px-0 sm:px-4 md:px-0` eliminates this double padding, giving content full width within the canonical shell gutter.
5. **Anti-AI Design & Human Copy**: Instructive, meta-conversational text ("Clique no botão abaixo para...") dilutes cognitive clarity and triggers AI-smell penalties. Replacing these instructions with concise, outcome-oriented Brazilian Portuguese labels ensures compliance with `anti-ai-design` rules.
6. **Double Mobile Header Elimination**: In `AppShell`, `hasCustomPageMobileHeader` controls whether the global native header is suppressed. Expanding this list to cover all `/conta/*` sub-routes that define their own headers eliminates duplicate header stacking on mobile devices.

---

## 3. Caveats

- **Read-Only Scope**: This investigation was strictly analytical; no source code files were modified.
- **Strict Build Restraints**: Per user instructions, `npm run typecheck` and `npm run build` were not executed.
- **Dense Desktop Dashboards**: In specialized desktop tables and administrative data views (e.g. `admin-master.*`), compact elements (like 32px rows) may exist for dense information display. The 44px touch target rule (DL-14) strictly applies to mobile viewports (<640px) and interactive buttons.
- **Web Share API Availability**: In `ShareModal`, `navigator.share` is only available on HTTPS or localhost in secure contexts. The fallback to the bottom sheet modal must remain active for desktop and unsupported mobile browsers.

---

## 4. Conclusion & Concrete Implementation Recipes

### 4.1 Prioritized Summary Matrix

| ID | File / Target | Defect / Anti-Pattern | Solution | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **REC-01** | `src/routes/_store.buscar.tsx` | Filter button dead (`isFilterSheetOpen` never rendered) | Mount `<FacetedSearchSheet>` at lines 1054-1057 connected to state & facets | **P0** |
| **REC-02** | `src/components/shell/app-shell.tsx` | Missing `/conta/*` paths in `hasCustomPageMobileHeader` | Add `/conta/atividade`, `/conta/trocas`, `/conta/salvos`, `/conta/financas`, `/conta/enderecos`, `/conta/avaliacoes`, `/conta/entregador` | **P0** |
| **REC-03** | `src/components/classifieds/catalog/classified-filter-sheet.tsx` | Desktop `<Dialog>` on mobile | Convert to `<Sheet side="bottom">` with iOS grab handle & thumb zone button | **P1** |
| **REC-04** | `src/components/location/location-master-pill.tsx` | Desktop `<Dialog>` on mobile | Convert to `<Sheet side="bottom">` on mobile with iOS grab handle | **P1** |
| **REC-05** | `src/components/common/action-auth-guard-modal.tsx` | Desktop `<Dialog>` + conversational copy | Convert to `<Sheet side="bottom">` on mobile and humanize copy | **P1** |
| **REC-06** | `src/components/common/share-modal.tsx` | Desktop `<Dialog>` + microfonts | Convert to `<Sheet side="bottom">` on mobile, integrate `navigator.share`, purge `text-[11px]` | **P1** |
| **REC-07** | `src/components/navigation/native-mobile-header.tsx` | Container height `h-12`, search input `h-9`, badge `text-[9px]` | Enforce canonical `h-11 min-h-11` (B.26), search input `h-11`, badge `text-xs font-bold` | **P1** |
| **REC-08** | `src/components/shell/mobile-nav.tsx` | Missing focus rings, inline safe area styles | Add `:focus-visible:ring-2`, use safe area Tailwind utility | **P1** |
| **REC-09** | `src/routes/_store.conta.*.tsx` | Child containers with `px-4 sm:px-6` causing double margin | Change child containers to `px-0 sm:px-4 md:px-0` | **P2** |
| **REC-10** | Repository-wide | 3,004 lines with `text-[8px]..text-[11px]` | Replace with canonical tokens: `text-xs font-medium` / `font-semibold` / `font-mono` | **P2** |
| **REC-11** | Repository-wide | 12 instances of conversational copy ("Clique no botão...") | Replace with concise labels per anti-ai-design guidelines | **P2** |

---

### 4.2 Exact Implementation Recipes for Workers

#### Recipe REC-01: Mount `FacetedSearchSheet` in `src/routes/_store.buscar.tsx`
In `src/routes/_store.buscar.tsx`, locate lines 1054-1057 (before the closing `</div>` and `);`):

```tsx
// BEFORE (Lines 1053-1057):
      </ResultSection>
    </div>
  )}
 </div>
 );
}
```

```tsx
// AFTER:
      </ResultSection>
    </div>
  )}

  {/* ── 3. Motor de Busca Facetada (FacetedSearchSheet Bottom Sheet / Slide-over) ── */}
  <FacetedSearchSheet
    isOpen={isFilterSheetOpen}
    onClose={() => setIsFilterSheetOpen(false)}
    facets={facetedFacets}
    selectedCategories={selectedCategories}
    selectedNiches={selectedNiches}
    selectedMinPrice={selectedMinPrice}
    selectedMaxPrice={selectedMaxPrice}
    selectedSort={selectedSort}
    totalResultsCount={total}
    onApplyFilters={handleApplyFilters}
    onResetFilters={() => {
      setSelectedCategories([]);
      setSelectedNiches([]);
      setSelectedMinPrice(undefined);
      setSelectedMaxPrice(undefined);
      setSelectedSort("relevance_telemetry");
      if (input.trim()) {
        handleSearch(input.trim());
      }
    }}
  />
 </div>
 );
}
```

And in `src/routes/_store.buscar.tsx:675`, replace microfont:
```tsx
// BEFORE:
className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"

// AFTER:
className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
```

---

#### Recipe REC-02: Fix Double Mobile Header in `src/components/shell/app-shell.tsx`
In `src/components/shell/app-shell.tsx:260-272`:

```tsx
// BEFORE:
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

```tsx
// AFTER:
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
    location.pathname.startsWith("/conta/atividade") ||
    location.pathname.startsWith("/conta/trocas") ||
    location.pathname.startsWith("/conta/salvos") ||
    location.pathname.startsWith("/conta/financas") ||
    location.pathname.startsWith("/conta/enderecos") ||
    location.pathname.startsWith("/conta/avaliacoes") ||
    location.pathname.startsWith("/conta/entregador") ||
    location.pathname.startsWith("/conta/colaborador") ||
    location.pathname.startsWith("/conta/criadores") ||
    location.pathname.startsWith("/destaques/") ||
    location.pathname.startsWith("/admin-master");
```

---

#### Recipe REC-03: Convert `ClassifiedFilterSheet` to `<Sheet side="bottom">`
In `src/components/classifieds/catalog/classified-filter-sheet.tsx`:

1. Update imports:
```tsx
// BEFORE (Line 3):
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// AFTER:
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
```

2. Replace opening tag (Line 123):
```tsx
// BEFORE (Lines 123-146):
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-screen rounded-none sm:rounded-lg p-5 space-y-4 overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <DialogTitle className="text-base font-bold">Filtros Avançados</DialogTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs font-mono font-bold">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs text-muted-foreground hover:text-foreground h-11 px-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Limpar Todos
            </Button>
          )}
        </DialogHeader>

// AFTER:
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="w-full sm:max-w-lg max-h-[88dvh] p-0 flex flex-col rounded-t-lg border-t border-border bg-background outline-none sm:mx-auto"
      >
        {/* iOS Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="flex flex-row items-center justify-between px-5 pb-2 border-b border-border/40 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <SheetTitle className="text-base font-bold text-foreground">Filtros Avançados</SheetTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs font-mono font-bold">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs text-muted-foreground hover:text-foreground h-11 px-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Limpar Todos
            </Button>
          )}
        </SheetHeader>
```

3. Wrap scrollable body and fix bottom button:
```tsx
// BEFORE (Line 148 to 604):
        <div className="space-y-4 text-xs">
          ...
        </div>

        <div className="pt-3 border-t border-border/40">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver {filteredCount} {filteredCount === 1 ? "Anúncio" : "Anúncios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

// AFTER:
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs no-scrollbar">
          ...
        </div>

        <div className="p-4 border-t border-border/40 bg-background shrink-0">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 min-h-11 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver {filteredCount} {filteredCount === 1 ? "Anúncio" : "Anúncios"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
```

---

#### Recipe REC-04: Convert `LocationMasterPill` to Responsive Bottom Sheet
In `src/components/location/location-master-pill.tsx`:

1. Update imports to include `Sheet`:
```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useWindowSizeClass } from "@/hooks/use-mobile";
```

2. Inside `LocationMasterPill` component, read `isCompact`:
```tsx
const { isCompact } = useWindowSizeClass();
```

3. Render `<Sheet side="bottom">` when `isCompact`, `<Dialog>` when desktop:
```tsx
  if (isCompact) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="p-0 overflow-hidden bg-background max-h-[90dvh] flex flex-col rounded-t-lg border-t border-border outline-none"
        >
          {/* iOS Grab Handle */}
          <div className="pt-3 pb-1 flex justify-center shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="p-4 pb-3 bg-muted/20 shrink-0 text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base font-black tracking-tight">
                <MapPin className="size-5 text-primary" />
                <span>Selecione sua Localização</span>
              </SheetTitle>
              {/* Tab Toggles */}
              <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab("quick")}
                  className={`h-11 min-h-11 min-w-11 px-3 py-2 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring ${
                    activeTab === "quick" ? "bg-background text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Cidades / CEP
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("map")}
                  className={`flex items-center gap-2 h-11 min-h-11 min-w-11 px-3 py-2 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring ${
                    activeTab === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Compass className="size-3.5" />
                  <span>Pin no Mapa</span>
                </button>
              </div>
            </div>
            <SheetDescription className="text-xs text-muted-foreground mt-1">
              Filtre produtos, comércios, eventos e classificados de acordo com a sua região.
            </SheetDescription>
          </SheetHeader>

          {/* Body Content with scrolling */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {/* Quick Cities & CEP / Map View */}
            ...
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop returns existing Dialog structure unchanged
```

---

#### Recipe REC-05: Convert `ActionAuthGuardModal` & Humanize Copy
In `src/components/common/action-auth-guard-modal.tsx`:

```tsx
import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight, LogIn, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useWindowSizeClass } from "@/hooks/use-mobile";

export interface ActionAuthGuardModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionContext?: string;
  returnUrl?: string;
}

export function ActionAuthGuardModal({
  isOpen,
  onOpenChange,
  title = "Identifique-se para continuar",
  description = "Acesse sua conta ou faça um cadastro rápido para prosseguir.",
  actionContext,
  returnUrl,
}: ActionAuthGuardModalProps) {
  const { isCompact } = useWindowSizeClass();
  const currentPath =
    returnUrl ||
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");

  const modalBody = (
    <>
      <div className="space-y-2 text-left">
        <div className="size-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
          <ShieldCheck className="size-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {actionContext && (
        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
          <span className="font-semibold text-foreground flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            Ação Solicitada:
          </span>
          <p className="text-muted-foreground">{actionContext}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="w-full sm:w-auto rounded-lg text-xs h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-primary"
        >
          Continuar navegando
        </Button>
        <Button
          asChild
          className="w-full sm:w-auto rounded-lg text-xs h-11 min-h-11 px-4 gap-2 font-bold focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <Link to="/entrar" search={{ returnUrl: currentPath }}>
            <LogIn className="size-4" />
            <span>Entrar ou Cadastrar</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </>
  );

  if (isCompact) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="p-5 rounded-t-lg border-t border-border bg-background flex flex-col gap-4 outline-none">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-2 mb-2 shrink-0" />
          {modalBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg p-6 space-y-4">
        {modalBody}
      </DialogContent>
    </Dialog>
  );
}
```

---

#### Recipe REC-06: Convert `ShareModal` & Purge Microfonts
In `src/components/common/share-modal.tsx`:
1. Use `useWindowSizeClass()`: on `isCompact`, render `<Sheet side="bottom">` with iOS pull handle.
2. In the share preview card (lines 116-118):
   - Replace `text-[11px] text-muted-foreground truncate font-mono mt-1` with `text-xs text-muted-foreground truncate font-mono mt-1`.
3. In share buttons (lines 132, 148, 164, 180):
   - Replace `text-[11px] font-semibold text-foreground` with `text-xs font-semibold text-foreground`.
4. Ensure each share button has `min-h-11` and `:focus-visible:ring-2 focus-visible:ring-ring`.

---

#### Recipe REC-07: Refactor `NativeMobileHeader` Canonical Dimensions & Tokens
In `src/components/navigation/native-mobile-header.tsx`:
1. Line 80: Replace `h-12 sm:h-14` with canonical `h-11 min-h-11`:
   ```tsx
   <div className="relative flex items-center justify-between gap-2 px-4 h-11 min-h-11 w-full min-w-0">
   ```
2. Line 87: Back button: Add `:focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`.
3. Line 120: Search input: Replace `h-9` with canonical `h-11`:
   ```tsx
   className="w-full h-11 pl-9 pr-10 rounded-lg bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
   ```
4. Line 129: Clear search button: Wrap in a 44x44px hit-box:
   ```tsx
   className="absolute right-1 size-11 min-h-11 min-w-11 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
   ```
5. Line 177 & Line 191: Search and filter trigger buttons: Add `:focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`.
6. Line 199: Filter count badge: Replace `text-[9px] font-bold` with `text-xs font-bold leading-none`:
   ```tsx
   <span className="absolute top-1 right-1 size-4 rounded-full bg-primary text-primary-foreground text-xs font-bold leading-none flex items-center justify-center">
   ```

---

#### Recipe REC-08: Mobile Nav Focus Rings & Safe Area
In `src/components/shell/mobile-nav.tsx`:
1. Lines 209, 224, 248, 264: Add focus rings to tab links and buttons:
   ```tsx
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
   ```
2. Line 198: Replace inline style with CSS safe-area class or utility:
   ```tsx
   className="md:hidden fixed inset-x-2.5 z-40 max-w-lg mx-auto select-none mobile-nav-hide-on-keyboard bottom-safe pb-2"
   ```

---

#### Recipe REC-09: Purge Double Margin Dead Space Across Child Routes
Update the root container of each child route:
- `src/routes/_store.conta.entregador.tsx:403`:
  - `w-full max-w-5xl mx-auto space-y-6 pb-24 px-4 sm:px-6` → `w-full max-w-5xl mx-auto space-y-6 pb-24 px-0 sm:px-4 md:px-0`
- `src/routes/_store.conta.avaliacoes.tsx:197`:
  - `w-full max-w-2xl mx-auto pb-24 px-4 sm:px-6` → `w-full max-w-2xl mx-auto pb-24 px-0 sm:px-4 md:px-0`
- `src/routes/_store.conta.ingressos.tsx:298`:
  - `w-full max-w-2xl mx-auto pb-24 px-4 sm:px-6` → `w-full max-w-2xl mx-auto pb-24 px-0 sm:px-4 md:px-0`
- `src/routes/_store.conta.notificacoes.tsx:150`:
  - `w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-4 sm:px-6` → `w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0`
- `src/routes/_store.agendar.index.tsx:224`:
  - `w-full max-w-5xl mx-auto px-4 sm:px-5 space-y-6 pb-24` → `w-full max-w-5xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-24`
- `src/routes/_store.afiliados.tsx:417`:
  - `max-w-5xl mx-auto px-4 sm:px-5 md:px-6 py-3 sm:py-6` → `max-w-5xl mx-auto px-0 sm:px-4 md:px-0 py-3 sm:py-6`
- `src/routes/_store.agenda.tsx:374`:
  - `px-4 sm:px-5 space-y-5 py-3 sm:py-4` → `px-0 sm:px-4 md:px-0 space-y-5 py-3 sm:py-4`

---

#### Recipe REC-10: Typographic Floor Token Replacement Table
For all Worker remediation of microfonts:

| Existing Regex Match | Target Token Class | Semantic Scope |
| :--- | :--- | :--- |
| `text-\[8px\]` | `text-xs font-mono font-semibold` | Status pills, UUIDs, compact tags |
| `text-\[9px\]` | `text-xs font-bold leading-none` | Counter badges, notification counts |
| `text-\[10px\]` | `text-xs font-medium leading-none` | Tab labels, chip filters, bottom bars |
| `text-\[10px\]\s+uppercase` | `text-xs uppercase font-semibold tracking-wider` | Form group titles, section tags |
| `text-\[11px\]` | `text-xs font-normal text-muted-foreground` | Timestamps, subtitles, helper text |
| `text-\[11px\]\s+font-semibold` | `text-xs font-semibold` | Action links ("Limpar tudo", "Ver mais") |

---

#### Recipe REC-11: Conversational Text Purge Table

| File & Line | Current Verbose / AI-Smell Text | Concise Human Replacement |
| :--- | :--- | :--- |
| `_store.conta.classificados.index.tsx:879` | `"Clique no botão abaixo para publicar seu primeiro anúncio gratuito."` | `"Nenhum anúncio publicado."` |
| `_store.afiliados.tsx:794` | `"Insira a URL de uma imagem abaixo para visualizar o banner em 16:9"` | `"URL do banner (proporção 16:9)"` |
| `_store.afiliados.tsx:882` | `"Clique no botão acima para conectar as lojas parceiras da sua cidade à sua vitrine."` | `"Conecte lojas parceiras para enriquecer sua vitrine."` |
| `_store.afiliados.tsx:1223` | `"Nenhuma indicação registrada ainda. Compartilhe seu link exclusivo para começar."` | `"Nenhuma indicação registrada."` |
| `action-auth-guard-modal.tsx:24-25` | `"Acesso Restrito a Membros"` / `"Para concluir esta ação com total segurança, acesse sua conta..."` | `"Identifique-se para continuar"` / `"Acesse sua conta ou cadastre-se para prosseguir."` |
| `_store.recuperar-senha.tsx:52` | `"Digite seu e-mail para receber um link de redefinição de senha."` | `"Informe seu e-mail cadastrado."` |
| `filter-bottom-sheet.tsx:38` | `"Selecione as opções abaixo para refinar os resultados."` | `"Refine por categoria, período ou status."` |
| `workspace.eventos.$id.subpaineis.tsx:78` | `"Nenhum subpainel criado para este evento. Clique no botão acima para adicionar..."` | `"Nenhum subpainel criado para este evento."` |
| `builder-left-panel.tsx:245` | `"Clique no botão acima para adicionar a primeira seção da sua página."` | `"Nenhuma seção adicionada."` |
| `configuracoes.inteligencia-artificial.tsx:251` | `"Chave ainda não inserida. Clique abaixo para configurar."` | `"Chave API não configurada."` |
| `contract-audit-manifest.tsx:229` | `"Aponte a câmera do seu celular para o QR Code ao lado ou acesse o endereço abaixo..."` | `"Escaneie o QR Code ou acesse a URL para verificar o certificado digital."` |
| `_store.conta.empresa.tsx:244` | `"Você ainda não possui uma empresa cadastrada... Crie o perfil em 1 minuto para começar..."` | `"Nenhuma empresa vinculada ao perfil."` |

---

## 5. Verification Method

To verify these findings and confirm Worker execution:

1. **Verify `FacetedSearchSheet` Mount in `/buscar`**:
   - Inspect `src/routes/_store.buscar.tsx` around line 1055 to ensure `<FacetedSearchSheet>` is mounted with `isOpen={isFilterSheetOpen}`, `facets={facetedFacets}`, and `onApplyFilters={handleApplyFilters}`.
2. **Verify Double Header Elimination in `AppShell`**:
   - Inspect `src/components/shell/app-shell.tsx:240-272` to ensure `/conta/atividade`, `/conta/trocas`, `/conta/salvos`, `/conta/financas`, `/conta/enderecos`, `/conta/avaliacoes`, and `/conta/entregador` are included in `hasCustomPageMobileHeader`.
3. **Verify Bottom Sheet Conversion**:
   - Search for `side="bottom"` and iOS grab handle in:
     - `src/components/classifieds/catalog/classified-filter-sheet.tsx`
     - `src/components/location/location-master-pill.tsx`
     - `src/components/common/action-auth-guard-modal.tsx`
     - `src/components/common/share-modal.tsx`
4. **Verify Double Margin Elimination**:
   - Search for `px-0 sm:px-4 md:px-0` on root containers of `_store.conta.*`.
5. **Verify Design Lint Ratchet**:
   - Run design lint ratchet to verify zero new DL-02 (bracket microfonts) or DL-14 (small touch targets) violations:
     ```powershell
     node scripts/design-lint.mjs --changed
     ```
6. **Invalidation Conditions**:
   - If `FacetedSearchSheet` is mounted inside an element with `overflow-hidden` without Radix Portal, the sheet overlay could be clipped. (Radix `<Sheet>` uses `<SheetPortal>` by default, preventing clipping).
   - If `hasCustomPageMobileHeader` is altered to wildcard `starts_with("/conta")` without verifying that `/conta` (the root index) has its own header, the root index might lose its header. Individual path matching (as provided in REC-02) prevents this regression.
