# AI_COPILOT_MOBILE_UI — Especificação Mobile Native (`< 600px`)

## 1. Geometria e Ergonomia Tátil

- **Superfície Full-Screen**: Em viewports compactas (`isCompact === true` via `useWindowSizeClass()`), `SheetContent` opera com `side="bottom"`, `windowVariant="compact"` e classes `flex h-dvh max-h-dvh w-full flex-col rounded-none border-0 p-0`.
- **Respeito a Safe-Area**:
  - `SheetContent` aplica `pt-[max(1.25rem,env(safe-area-inset-top))]` automaticamente pelo primitivo canônico `src/components/ui/sheet.tsx` (B.34).
  - O rodapé sticky aplica `pb-safe` para desobstruir a barra gestual inferior do iOS/Android.
- **Alvos de Toque (`>= 44x44px`)**:
  - Todos os chips de Ações Rápidas, seletores de variantes, botões de aplicação por campo (`Aplicar título`, `Aplicar descrição`, `Aplicar síntese`, `Aplicar tags`), controles `Undo`/`Redo` e botões do rodapé possuem `h-11 min-h-11` (44px) conforme `AGENTS.md` B.4 (DL-14).
- **Réguas Horizontais sem Quebra (`B.39`)**:
  - Ações Rápidas e Alternativas Geradas utilizam `flex flex-nowrap gap-2 overflow-x-auto pb-1 no-scrollbar`, permitindo deslize horizontal fluido com o polegar sem empilhamento vertical.
- **Progressive Disclosure**:
  - Os controles avançados (`Escopo`, `Tom de Voz`, `Extensão`, `Objetivo`) iniciam recolhidos sob o botão `Controles de Escrita`, dedicando a área nobre da tela ao editor de trabalho.
