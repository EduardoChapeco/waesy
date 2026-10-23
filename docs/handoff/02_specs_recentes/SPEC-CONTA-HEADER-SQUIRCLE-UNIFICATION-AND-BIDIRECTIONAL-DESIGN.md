# SPEC-CONTA-HEADER-SQUIRCLE-UNIFICATION-AND-BIDIRECTIONAL-DESIGN.md
# EARS Specification: Unificação Canônica do Header de Conta e Cards Squircle Bidirecionais

## 1. Contexto e Motivação
A tela `/conta` (`src/routes/_store.conta.index.tsx`) apresentava uma fragmentação visual e excesso de camadas verticais no bloco de cabeçalho do usuário:
- O card de identidade possuía quebra de linha interna com borda divisória (`border-t border-border/30`), forçando os botões de governança (`ContextSwitcher`, `Master`, `Editar Perfil`, `Sair`) para uma segunda linha empilhada desnecessariamente no desktop.
- Os atalhos rápidos (`Pedidos`, `Notificações`, `Negociações`, `Salvos`) quebravam em uma grade 2x2 no mobile gerando jank e desconexão visual.
- A alternância de contexto para lojas específicas (ex: "Excelência Tour") podia falhar e redirecionar para a loja padrão de teste devido à prioridade incorreta de `session?.store_id` sobre o cookie ativo `waesy_active_tenant` no layout do Workspace.

## 2. Requisitos EARS

### 2.1 Requisitos Ubíquos (Ubiquitous)
- **REQ-UB-01:** O sistema SEMPRE renderizará os controles interativos da tela de conta compartilhando a altura canônica exata de 44px (`h-11 min-h-11`), geometria squircle padronizada (`rounded-xl` / `rounded-2xl`) e anéis de foco `:focus-visible:ring-2`.
- **REQ-UB-02:** O sistema SEMPRE preservará a conformidade estrita com o design system do Waesy, sem classes arbitrárias com valores mágicos entre colchetes (`w-[...]`) e consumindo tokens de `styles.css`.

### 2.2 Requisitos Orientados a Evento (Event-Driven)
- **REQ-EV-01:** QUANDO a viewport for desktop widescreen (>= 840px) ou tablet (>= 640px), O sistema DEVE renderizar a identidade do usuário (avatar squircle, nome, role badge, handle) e a barra de governança (ContextSwitcher, Master, Editar Perfil, Sair) em uma ÚNICA LINHA horizontal contínua (`flex flex-nowrap items-center justify-between gap-4`) sem quebras ou bordas internas.
- **REQ-EV-02:** QUANDO a viewport for mobile (< 640px), O sistema DEVE renderizar a barra de governança como uma régua horizontal deslizante contínua anti-jank (`flex flex-nowrap overflow-x-auto no-scrollbar gap-2`), mantendo todos os botões íntegros como squircles de 44px (`h-11 min-h-11 shrink-0`).
- **REQ-EV-03:** QUANDO o usuário visualizar os atalhos rápidos (`Pedidos`, `Notificações`, `Negociações`, `Salvos`), O sistema DEVE renderizá-los em cards squircle padronizados em grade de 4 colunas no desktop e em trilho horizontal deslizante no mobile (`flex flex-nowrap overflow-x-auto no-scrollbar gap-2.5 pb-1`).
- **REQ-EV-04:** QUANDO o usuário selecionar uma empresa específica na lista de negócios (ex: "Excelência Tour"), O layout do Workspace (`src/routes/workspace.tsx`) DEVE priorizar estritamente o `waesy_active_tenant` validado em `memberships`, garantindo que o painel abra no tenant escolhido sem fallback indevido para `session?.store_id`.

### 2.3 Requisitos Opcionais / Orientados a Estado (State-Driven)
- **REQ-ST-01:** SE o usuário for administrador master (`isMasterAdmin`), ENTÃO o botão squircle `Master` DEVE ser renderizado com destaque e ícone `Shield`.
- **REQ-ST-02:** SE houver notificações não lidas, ENTÃO o card squircle de `Notificações` DEVE exibir badge com contagem em destaque sem quebrar a proporção tátil do trilho.

## 3. Matriz de Critérios de Aceite
- [ ] Header de `/conta` unificado em linha única horizontal no desktop com cards squircle padronizados.
- [ ] Régua de ações de governança adaptativa anti-jank em linha única deslizante no mobile.
- [ ] Atalhos rápidos (`Pedidos`, `Notificações`, `Negociações`, `Salvos`) em squircles padronizados com trilho horizontal mobile e grid 4 colunas desktop.
- [ ] Seleção de empresa na lista "Meus Negócios" direciona perfeitamente para o tenant escolhido no Workspace (`workspace.tsx`).
- [ ] Testes unitários aprovados (`vitest run`).
- [ ] Zero erros de compilação TypeScript e build limpo (`npm run build`).
- [ ] Catraca de Design Lint sem regressões (`scripts/design-lint.mjs --ratchet`).
