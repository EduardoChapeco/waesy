---
name: layout-adaptivity
description: Decisão estrutural e bifurcação de layout entre plataformas Compact (<600px), Medium (600-839px) e Expanded (>=840px). Gatilho ao definir ou refatorar layouts responsivos.
when_not_to_use: Não utilizar para ajustes em componentes folha (ícones ou botões isolados).
inputs:
  - Tela completa ou fluxo operacional
  - Requisitos de densidade de informação
outputs:
  - Bifurcação estrutural com frontends congelados dedicados (Mobile Native App vs Desktop Native App)
  - Zero duplicação de nós no DOM
  - Layouts canônicos aplicados (Master-Detail, TetrisGrid, Bottom Sheet)
---

# Objetivo
Assegurar que dispositivos móveis recebam a experiência de um aplicativo nativo compilado de alta ergonomia e que desktops tirem proveito da área expandida como software de trabalho, eliminando definitivamente sites fluidos que espremem componentes ou quebram a hierarquia visual.

# Procedimento Numerado
1. Identificar se a rota opera como consumo rápido/descoberta (móvel) ou gestão densa/ERP (desktop).
2. Adotar o layout canônico apropriado (Lista-Detalhe, Painel de Apoio, TetrisGrid ou Feed).
3. **Bifurcação sem Duplicação no DOM:**
   - Proibido renderizar árvores duplicadas ocultadas por `block md:hidden` e `hidden md:block`.
   - Utilizar bifurcação em nível de componente ou via `useWindowSizeClass()`, instanciando uma única casca viva.
4. **No Compact (<600px) — Mobile Native App Shell:**
   - Proibir tabelas horizontais com scroll desajeitado; converter em cartões squircles empilhados com informações na íntegra.
   - Posicionar a ação primária e as abas principais na barra inferior fixa (zona do polegar) em `z-30` com folga `pb-32 pb-safe`.
   - Utilizar Bottom Sheets de 100dvh para formulários e filtros auxiliares com safe-area no entalhe superior.
5. **No Expanded (>=840px) — Desktop Native App System:**
   - Renderizar barra lateral fixa ou trilho global à esquerda (280px).
   - Utilizar Master-Detail de 2 colunas para listagem e edição concorrente.
   - Aproveitar **TetrisGrid** com empacotamento denso (`grid-flow-dense`) para KPIs, campanhas e vitrines assimétricas sem buracos.

# Regras Duras com Números
- Proibido layout fluido que apenas reduza o tamanho da fonte e colunas sem mudar de estrutura (DL-29).
- Proibido efeito sanfona (CLS $\ge 0.01$); containers com aspect-ratio fixo antes do carregamento.
- Proibido truncamento (`truncate`, `...`) de informações essenciais em cards squircles; utilizar quebra orgânica e adaptação tipográfica proporcional.
- Margens externas: 16px no Compact, 24px no Medium, 32px no Expanded.
- Alvos de toque no mobile estritamente com piso de 44x44px (`h-11`).

# Checklist de Verificação
- [ ] A tela possui frontends congelados para cada dispositivo sem depender de fluidez contínua quebradiça?
- [ ] A bifurcação ocorre sem duplicar elementos no DOM via classes utilitárias CSS?
- [ ] O desktop aproveita a largura sem deixar espaços vazios desnecessários via TetrisGrid?
- [ ] A ação principal no mobile está na Thumb Zone e alinhada ao piso de 44px?
- [ ] Modais móveis abrem como sheets inferiores de 100dvh e no desktop como diálogos centralizados?
- [ ] Cards squircles acomodam textos na íntegra sem reticências silenciosas?
