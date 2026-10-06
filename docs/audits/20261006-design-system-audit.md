# Auditoria do Design System Waesy — 2026-10-06

## Veredito atual

O sistema possui uma constituição visual forte, mas a dívida técnica visual ainda é ampla. A execução completa do lint encontrou **14.289 violações existentes em 880 de 1.881 arquivos**: 1.557 P0, 10.032 P1, 1.332 P2 e 1.368 P3. Esses números representam o estoque global e não devem ser tratados como regressão causada pela frente atual.

A catraca inicial também detectou uma regressão anterior de seis ocorrências: quatro `DL-02`, uma `DL-12` e cinco ocorrências no módulo `workspace`. A primeira frente saneou o shell operacional e deixou o lint do escopo com **0 P0, 0 P1, 10 P2 e 0 P3**.

## Achados estruturais

| Área | Achado | Impacto | Tratamento |
|---|---|---|---|
| Breakpoints | O shell usava `lg` (1.024px), embora a constituição defina `expanded` em 840px | Navegação móvel aparecia em desktops de 840–1.023px | Corrigido no `workspace-shell` com utilitários canônicos |
| Tokens | `docs/design/tokens.json` e `src/styles.css` mantêm paridade, mas o CSS ainda contém declarações paralelas | Risco de drift entre fonte declarativa e runtime | Próxima frente: gerar CSS a partir de tokens e validar checksum |
| Shell | Controles com `transition-all`, cores inline, classes arbitrárias, foco ausente e alvos abaixo de 44px | Contraste de padrões, acessibilidade e maior jank | Corrigido no shell; somente P2 de fundação permanecem |
| Responsividade | Existem pelo menos 230 ocorrências de padrões `lg`/`md` em componentes e rotas | Pode haver outras misturas entre layout médio e expandido | Migrar por módulos, nunca por substituição global cega |
| Estados | O lint identifica listagens sem estado vazio em superfícies de aplicação | Telas podem ficar silenciosas quando não há dados | Priorizar rotas de workspace e turismo |
| Visual | Há uso amplo de gradientes, sombras, `transition-all`, valores arbitrários e raios concorrentes | O produto se aproxima de padrões genéricos de UI gerada | Remover por severidade, preservando significado semântico |

## Primeira correção aplicada

O shell agora usa os utilitários `waesy-expanded-flex` e `waesy-compact-medium-only`, derivados de 840px em `src/styles.css`. A sidebar aparece em modo expandido a partir de 840px; Sheet, identificação compacta e barra inferior ficam restritos a compact/medium. Também foram corrigidos foco visível, alvos de 44px, `h-dvh`, estado vazio da lista de módulos, transição genérica e cor inline do indicador Master.

## Regras de design operacional adotadas

O produto deve manter uma hierarquia visual silenciosa: uma ação primária por superfície, superfícies neutras com bordas sutis, sombra somente em camadas flutuantes, títulos comerciais curtos, rótulos com verbo e objeto, ausência de neon/gradiente decorativo, zero emoji e nenhuma interface que explique a própria interface.

No compacto, a experiência deve ser um produto próprio: listas edge-to-edge, navegação no polegar, sheets de altura dinâmica, alvos mínimos de 44px, foco não obstruído e sem tabelas reduzidas horizontalmente. No expandido, a experiência deve usar sidebar, master-detail, tabelas densas e painéis de apoio dockados. O breakpoint de produto é 840px; `lg` não é substituto válido.

## Roteiro de saneamento

| Fase | Conteúdo | Evidência |
|---|---|---|
| F1 | Shell, breakpoint canônico e topbar | Lint do escopo sem P0/P1; testes de janela verdes |
| F2 | Sidebar, menus, topbars e barras inferiores | Matriz compact/medium/expanded por componente |
| F3 | Controles, focus-visible, contraste e touch targets | Auditoria WCAG 2.2 AA e DL-14/DL-17 |
| F4 | Tokens, classes arbitrárias, sombras, gradientes e movimento | `check:tokens`, lint P0/P1 zero no módulo |
| F5 | Loading, vazio, erro e retry em rotas de dados | Matriz de estados por rota |
| F6 | Formulários, CRM, turismo, builders e documentos | Auditoria por fluxo, não somente por página |
| F7 | Nativização mobile | Tokens e contratos compartilhados com React Native/Expo |

## Direção para app nativo

A nativização deve começar por contratos compartilhados, não por copiar componentes web. Tipos, schemas Zod, regras de autorização, serviços BFF e tokens semânticos devem permanecer compartilhados. A camada web continuará usando React/TanStack; a camada mobile poderá usar React Native/Expo com componentes nativos equivalentes, safe areas, navegação empilhada, bottom tabs, sheets nativos e listas virtualizadas. Nenhuma regra de negócio deverá ser duplicada na aplicação móvel.

A arquitetura recomendada é um monorepo incremental com pacotes de `tokens`, `contracts`, `services` e `ui-platform`. O primeiro produto nativo deve ser o workspace operacional móvel, porque possui fluxos claros de CRM, leads, propostas, viagens, embarque e notificações. O PWA atual permanece como fallback instalável até que autenticação, push, uploads/OCR, deep links e sincronização offline estejam comprovados em iOS e Android.

## Gates da primeira frente

- `npx vitest run src/hooks/use-mobile.test.ts src/hooks/anti-jank.test.ts`: **32/32 aprovados**.
- `node scripts/design-lint.mjs --changed`: **0 P0, 0 P1** no escopo corrigido.
- TypeScript filtrado para `workspace-shell`: **sem erro**.
- `npm run check:tokens`: **paridade 100%** entre tokens declarados e CSS.


## Lote F2 concluído — primitivas compartilhadas

A sidebar/flyout, a toolbar canônica e a BottomBar foram migradas para os utilitários de janela de 840px. O lote removeu `transition-all`, sombras de superfície, classes arbitrárias de dimensão/tipografia, estilo inline de largura e visibilidades `sm/md` que conflitavam com a janela expandida. Controles de aba, filtros, ações secundárias, menus e links receberam alvos mínimos e foco visível; a faixa de abas mantém rolagem horizontal por utilitário semântico, preservando tabelas e superfícies estreitas sem truncamento.

A validação do lote apresentou **0 P0, 0 P1, 0 P2 e 0 P3 nos componentes**, com nove P2 restantes somente em `src/styles.css`. Esses P2 são aliases de compatibilidade (`shadow-sm/md/lg` e classes de duração) que precisam ser revisados como fundação de tokens, não removidos isoladamente sem verificar dependências do projeto.


## Lotes F2/F3 concluídos — shell global e operação turística

O `Shell` global e o `workspace-shell` agora usam a fronteira expandida de 840px para sidebar, ações operacionais e identificação do operador. O layout de erro do workspace foi saneado para `min-h-dvh`, ações com 44px e superfície sem sombra decorativa.

As telas de **Excursões** e **Contratos Turísticos** passaram a usar `waesy-card-grid`: uma coluna em compact, duas em medium e três em expanded. Os cartões não usam mais `transition-all` ou `shadow-2xs`; ações permanecem com altura de 44px. Também foram incluídos Skeletons estruturais para carregamento, mantendo as dimensões da grade e evitando CLS. A barra de ocupação usa `waesy-progress-fill`, que anima somente largura em 200ms.

Após o lote, o lint do escopo apresentou **0 P0, 0 P1, 0 P2 e 0 P3** nos componentes e rotas alterados. Os nove P2 restantes pertencem exclusivamente aos aliases históricos do `styles.css` e continuam catalogados para a frente de fundação.
