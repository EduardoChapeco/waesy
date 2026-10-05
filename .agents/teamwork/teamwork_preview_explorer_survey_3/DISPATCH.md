# Explorer 3 Dispatch: Routes, 15 Niches, 4 Macro-Archetypes & Design Systems Survey

## Objective
Conduct a comprehensive read-only survey of the Waesy codebase regarding:
1. All TanStack Router routes in `src/routes/` across the 15 niches and 4 macro-archetypes:
   - Macro-Archetype A (Transactional/Retail/Food): Cart, real-time stock, hybrid checkout, POS, delivery/counter fee, BOM.
   - Macro-Archetype B (High Spec/Vehicles/Real Estate/Tourism): Closed Allowlist specs, daily scheduler, dual channel (WhatsApp + In-App Chat), SDR AI context injection.
   - Macro-Archetype C (Services & HR): Slot scheduling, service orders with parts deduction in `stock_movements`, executive resume, job applications.
   - Macro-Archetype D (Social & Community): Showcase (1:1 Squircle + 21:9 Panoramic with continuous scroll), in-page biolinks (buttons + 16:9 mini-banners), identity switcher, community feed.
2. Platform differentiation:
   - Mobile (<640px): HIG anti-jank, touch targets >= 44x44px (`h-11`), fixed bottom bars (`fixed bottom-0 pb-safe`), snap scroll tabs, sheets/drawers (`100dvh`), iOS/WhatsApp lists.
   - Desktop (>=1024px): 12-col Bento Grid (`grid-cols-12`) with golden ratio.
   - Regra B.8: Zero composite titles (>6 words) in tabs/headers/tables. Zero conversational cards. Zero emojis.

## Constraints
- READ-ONLY exploration. Do not modify source code.
- PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- Produce handoff report at `.agents/teamwork/teamwork_preview_explorer_survey_3/handoff.md`.
