# SPEC-FULLPAGE-CHAT-COPILOT — Imersão Full Page Canônica (`100dvh`) para Chat & Copilot

## 1. Contexto e Objetivo
Alinhar a abertura e execução de todas as superfícies de **Chat** (`/workspace/atendimento`, `/conta/conversas`, `/conta/conversas/$id`) e **Copilot** (`/workspace/copilot`, `/copilot`) ao contrato de tela cheia imersiva (`100dvh`) utilizado pelos Editores e Builders (`/workspace/builder/*`, `/workspace/estudio`, `/workspace/turismo/propostas/$id`), eliminando barras laterais redundantes, paddings residuais e flashes de hidratação SSR.

## 2. Requisitos em Sintaxe EARS
- **REQ-01 (Ubiquitous):** The `WorkspaceLayout` (`src/routes/workspace.tsx`) SHALL render `/workspace/atendimento` and `/workspace/copilot` in full-page immersive mode (`isImmersiveEditor = true`) by default, bypassing `WorkspaceShell` unless `?view=embedded` is explicitly requested in `routerState.location.searchStr`.
- **REQ-02 (Ubiquitous):** When `isImmersiveEditor` is active in `src/routes/workspace.tsx`, the system SHALL wrap `<Outlet />` inside `<div className="h-dvh w-full overflow-hidden flex flex-col bg-background">` and allow all workspace members to access `/workspace/atendimento` and `/workspace/copilot`.
- **REQ-03 (Event-Driven):** WHEN the user is in `/workspace/copilot` or `/workspace/atendimento`, the top header SHALL display a canonical `"Voltar ao Workspace"` navigation button (`h-11 min-h-11`, `focus-visible:ring-2`) on the left and a toggle button on the right to switch between Full Page (`default`) and Sidebar Embedded (`?view=embedded`) in the same tab without `window.open`.
- **REQ-04 (State-Driven):** WHILE `/workspace/copilot` is rendered in embedded mode inside `WorkspaceShell` (`src/components/workspace/workspace-shell.tsx`), the main container SHALL apply `max-w-none p-0 h-full overflow-hidden` without outer padding or `pb-28`.
- **REQ-05 (Ubiquitous):** The `AppShell` (`src/components/shell/app-shell.tsx`) SHALL include `/copilot` and `/conta/conversas` in `isFullBleedPage` (`h-dvh w-full overflow-hidden`), hiding the redundant desktop `TopBar`, `ContextSidebar`, and floating `WaesyCopilotDrawer`, while `_store.copilot.tsx` and `_store.conta.conversas.index.tsx` render a full-bleed `100dvh` interface with a `"Voltar"` control (`h-11 min-h-11`) and split-pane desktop workspace in `/conta/conversas`.

## 3. Escopo Atômico de Arquivos
- `src/routes/workspace.tsx`
- `src/components/workspace/workspace-shell.tsx`
- `src/routes/workspace.copilot.tsx`
- `src/routes/workspace.atendimento.index.tsx`
- `src/components/shell/app-shell.tsx`
- `src/routes/_store.copilot.tsx`
- `src/routes/_store.conta.conversas.index.tsx`
- `docs/design/DECISIONS.md`
