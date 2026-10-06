# SPEC-20261006 — Shell visual nativo e breakpoint canônico

## Objetivo

Eliminar a divergência entre o breakpoint visual normativo do Waesy (`expanded >= 840px`) e as classes Tailwind `lg` (`>= 1024px`) no shell operacional, impedindo que navegação móvel, gatilhos de Sheet e identificação compacta sejam renderizados em desktops pequenos.

## Escopo autorizado

- `src/styles.css`
- `src/components/workspace/workspace-shell.tsx`
- `docs/design/DECISIONS.md`
- `docs/design/LINT_DASHBOARD.md` (gerado pelo gate)

Não alterar rotas de negócio, loaders, services ou contratos de dados nesta frente.

## Requisitos EARS

- **R1 — Breakpoint:** Quando a viewport tiver largura `>= 840px`, o shell deverá renderizar somente sidebar e navegação expandida, ocultando controles compactos e a barra inferior móvel.
- **R2 — Compacto/médio:** Quando a viewport tiver largura `< 840px`, o shell deverá manter o menu de Sheet e a navegação inferior, sem exibir sidebar expandida.
- **R3 — Fonte única:** Os breakpoints deverão ser declarados uma única vez em `src/styles.css` como utilitários canônicos derivados dos tokens `--breakpoint-*`; componentes não poderão criar valores arbitrários de breakpoint.
- **R4 — Acessibilidade:** Todo controle mantido nesta alteração deverá preservar alvo mínimo de 44px no compacto/médio e foco visível.
- **R5 — Antijank:** A troca de classe responsiva não poderá depender de `window.innerWidth` no componente nem introduzir animação de layout.
- **R6 — Design silencioso:** A alteração não poderá adicionar gradiente, sombra decorativa, cor literal ou classe Tailwind arbitrária.

## Invariantes

- `compact = 0..599px`
- `medium = 600..839px`
- `expanded = >= 840px`
- Nenhuma regra de negócio é movida para o CSS.
- Nenhum acesso a banco ou service é alterado.

## Evidências de aceite

1. Teste unitário existente de `use-mobile` permanece verde.
2. `npm run lint:design -- --changed` não introduz novas violações no escopo.
3. `npm run check:tokens` permanece verde.
4. `npm run build` conclui ou reporta exclusivamente bloqueios previamente catalogados.
5. Snapshot/inspeção estática confirma ausência de `lg:hidden`/`hidden lg` no shell alterado quando o comportamento significa `< 840px`.
6. Decisão arquitetural registrada em `docs/design/DECISIONS.md`.

## Fases posteriores

- F2: substituir progressivamente `lg` divergente em componentes de workspace e módulos de dados.
- F3: reduzir DL-14/DL-15 e normalizar focus/touch targets.
- F4: remover classes arbitrárias, gradientes, sombras e transições genéricas.
- F5: completar a matriz loading/empty/error.
- F6: preparar camada de nativização React Native/Expo, compartilhando tokens e contratos sem duplicar regra de negócio.
