---
name: mobile-app-ui-design
description: Design, audit, and refactor mobile-first UI/UX for iOS, Android, and web PWAs based on Apple Human Interface Guidelines, Linear/Stripe design craft, and zero-jank ergonomics. Use when designing mobile views, fixing mobile layout bugs, reviewing touch targets, eliminating UI containeritis, or building native-feeling mobile components.
---

# Mobile App UI/UX Design System Skill (Mobile Craft & HIG Standards)

## 1. Overview & Core Philosophy
This skill synthesizes industry-standard mobile UI/UX engineering principles from top design systems (Apple HIG, Linear, Stripe, iFood, and Telegram), combining insights from 10 external AI design frameworks (`mobile-app-ui-design`, `ui-ux-agent-skill-system`, `ui-craft`, `tasteful-ui-skill`, `open-design-skill`, `apple-design-skill`).

### The Three Invariants of Mobile Craft
1. **Ergonomic Tactile Priority:** Every interactive element must satisfy the 44x44px minimum touch target floor (`h-11 min-h-11`).
2. **Zero Containeritis (Flat Depth Hierarchy):** Mobile screens have limited horizontal space (360px–428px). Avoid nesting borders inside borders and padding inside padding. Use background tonal shifts (`bg-card`, `bg-muted/30`) rather than stacked outlines.
3. **Information Density with Breathing Room:** Prevent premature text truncation (`truncate`). Prefer 2-line wraps with `line-clamp-2` or natural wrapping (`break-words text-wrap leading-tight`).

---

## 2. Layout & Shell Architecture

### 2.1 Single Header Rule (Zero Double Chrome)
- Never stack multiple headers or navigation bars on mobile.
- If the global layout shell (`AppShell`) provides a canonical top header (`NativeMobileHeader`), the page view must NOT render an in-page back button or subheader on mobile screens (`hidden sm:flex`).
- If a route requires a custom header (e.g., custom action controls), register the route in the shell's `checkHasCustomPageMobileHeader` registry to suppress the outer header.

### 2.2 Sticky Bottom CTAs vs Floating Actions
- Sticky action bars (`sticky bottom-0`) and bottom navigation bars must have a clear Z-index hierarchy:
  - Sticky Page Action Bars: `z-20` or `z-30`
  - Modal / Drawer Overlays: `z-50`
- Floating triggers (such as AI Assistant/Copilot buttons) MUST be suppressed or offset on pages with sticky transactional CTAs (`isDetailPage`) to prevent obstruction.

---

## 3. Component Design & Tactile Standards

### 3.1 Tetris Action Grid (Collisions & Squeeze Prevention)
- In profile headers and business cards, never place 4+ action buttons in a single flex row.
- Use algorithmic full-fill layouts:
  - 1 item: 100% full width
  - 2 items: 50% / 50%
  - 3 items: 33.3% row (or 2 top, 1 full-width bottom)
  - 4 items: 2x2 grid (50% each)
  - 5 items: Row 1 has 2 items (50/50), Row 2 has 3 items (33/33/33)
- Every action button must guarantee `h-11 min-h-11` with clear text labels.

### 3.2 List Item Thumbnails
- In mobile listing views (e.g., "Meus Anúncios", marketplace results):
  - Do not use undersized thumbnails (<64px). Use `size-20` (80x80px) for clear product and service recognition.
  - Separate badges (status, niche) from the title.
  - Give the item title two full lines of natural wrapping (`text-sm font-bold leading-snug line-clamp-2`).
  - Keep pricing prominent with monospace numbers (`text-sm font-black font-mono`).

### 3.3 Flight and Itinerary Cards
- On mobile devices, never stack departure, duration line, and arrival into 3 awkward vertical lines.
- Use a 12-column grid (`grid grid-cols-12 items-center`):
  - Departure: `col-span-3 text-left`
  - Duration & connection path: `col-span-6 flex flex-col items-center justify-center`
  - Arrival: `col-span-3 text-right`
- Cleanly format raw numbers into readable units (e.g., `"9"` -> `"9h"`).

### 3.4 Address Formatting & Geographic Hygiene
- Never display orphan punctuation, missing street numbers, or duplicate city/state names (e.g., `", S/N - , São Miguel do Oeste - SC • São Miguel do Oeste - SC"`).
- Always process raw addresses through `formatCanonicalAddress`:
  - Strips leading commas, orphan hyphens, and duplicate tokens.
  - Deduplicates explicit city/state parameters against addresses that already contain them.
  - Returns sanitized `{ display, mapsQuery, short }`.

---

## 4. Visual Hygiene & Anti-AI Smell
- **Forbidden Icons:** Never use generic `Sparkles` icons for core features (e.g., "Sobre o Evento", "Dúvidas"). Use semantic icons: `Info`, `Calendar`, `Ticket`, `HelpCircle`.
- **Honest Media Fallbacks:** Never let broken or 404 images show browser broken-image icons or raw alt text. Use defensive `onError` handlers with clean semantic fallback placeholders.
- **Color Discipline:** No raw hex codes outside `tokens.json`. All colors must map to semantic CSS variables (`bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`).
- **Focus Rings:** Ensure every interactive control includes `:focus-visible:ring-2 :focus-visible:ring-primary :focus-visible:outline-none`.

---

## 5. Review Checklist for Mobile PRs
- [ ] No double headers on mobile viewports (<640px).
- [ ] No floating elements overlapping sticky bottom action bars.
- [ ] Action buttons use 100% width grids without wrapping or clipping text.
- [ ] All touch targets are >= 44x44px (`h-11 min-h-11`).
- [ ] Addresses sanitized and deduplicated via `formatCanonicalAddress`.
- [ ] Image components include defensive `onError` handlers.
- [ ] Zero `!important` declarations, zero raw hex, zero fake AI sparkles.
