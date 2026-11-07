# SPEC-20261104: Waesy Ultraminimalist UX Reengineering & Desktop/Mobile Bidirectional Architecture

## 1. Contexto e Missão
O Waesy acumulou rica densidade funcional (10 domínios, 38 módulos, 128 submódulos, 443 rotas, 983 componentes, 1.042 ações e 775 tabelas mapeados no Inventário Mestre em `docs/inventory/waesy-platform/`).
Entretanto, a experiência de uso sofre de congestão visual:
- Múltiplas barras de ferramentas sobrepostas (sub-headers empilhados em cards sobre o Kanban/Tabela).
- Containeritis crônica (cards dentro de cards com bordas e backgrounds excessivos — violação DL-31).
- Dashboards e KPIs inseridos no topo de telas operacionais, roubando espaço de trabalho de Kanbans, tabelas e calendários.
- Interfaces mobile funcionando como versões comprimidas do desktop em vez de experiências nativas orientadas a toque e tarefas.

Esta especificação define a reengenharia visual, ergonômica e arquitetural completa para transformar a plataforma em um sistema ultraminimalista, silencioso, espaçoso e operacionalmente intuitivo, sem perder nenhuma capacidade técnica.

---

## 2. Princípios Canônicos de Design

### 2.1 Silêncio Visual e Erradicação do AI-Smell
- **Zero Textos Conversacionais:** Proibidos headers motivacionais ou parágrafos explicando a própria tela (ex: "Bem-vindo ao seu ambiente inteligente...").
- **Zero Caixas Gigantes de Resumo:** Páginas operacionais (Kanban, Calendário, Tabela de Pedidos, Financeiro) não devem embutir cartões de métricas na área útil de trabalho; métricas pertencem a drawers sob demanda (`WorkspaceDashboardSheet`) ou à Visão Geral (`/workspace`).
- **Ação Primária Única:** Exatamente um botão com `variant="default"` por superfície. Ações secundárias em `variant="outline"` ou menus de contexto.

### 2.2 Arquitetura Bidirecional Congelada
- **Desktop-Native:** Aplicação de produtividade estilo Linear / Notion / Figma. Sidebar recolhível com hierarquia limpa por responsabilidade (Comercial, Operações, Financeiro, Pessoas, Empresa, Nicho), viewport ampla (`flex-1 h-full min-h-0 overflow-hidden`), Kanbans full-page com colunas largas (`min-w-[320px]`) e scroll horizontal natural.
- **Mobile-Native:** Experiência de aplicativo nativo de smartphone. Alvos de toque >= 44px (`h-11 min-h-11`), navegação contextual por abas e bottom sheets, listas adaptadas ao toque (em vez de tabelas comprimidas), fluxo por tarefa única com navegação clara de retorno.

### 2.3 Respeito à Identidade Cromática Waesy
- Preservação da paleta institucional em tema escuro (`oklch(0.10 0 0)` background, `oklch(0.15 0 0)` cards/superfícies e `oklch(0.24 0 0)` bordas discretas).
- O dourado/âmbar atua estritamente como acento de seleção, status ou foco (`--primary`), eliminando sobrecarga e garantindo contraste WCAG AA >= 4.5:1.

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)

### REQ-01: Experiência Full-Page em Kanbans Operacionais
- **Quando** o usuário acessar qualquer visão de Kanban da plataforma (ex: `/workspace/turismo`, `/workspace/comercial`),
- **O sistema deverá** dedicar 100% da altura e largura da área útil ao quadro de colunas, utilizando `WorkspaceCanonicalToolbar` em linha única no topo e eliminando contêineres e cards decorativos intermediários.

### REQ-02: Navegação Global Estruturada por Responsabilidade
- **Quando** o operador navegar pela sidebar desktop,
- **O sistema deverá** agrupar ferramentas por domínios de negócio claros (Visão Geral, Comercial, Operações, Financeiro, Pessoas, Empresa e Módulos de Nicho ativos), ocultando módulos irrelevantes para o nicho da empresa e prevenindo submenus com mais de 2 níveis de profundidade.

### REQ-03: Dimensionamento Proporcional de Detalhes (Gaveta 360° e Modais)
- **Quando** o usuário abrir o registro de uma oportunidade, lead ou pedido,
- **O sistema deverá** renderizar drawer ou página dedicada ampla com abas funcionais desobstruídas, formulários em grade de 2 a 3 colunas legíveis e botões táteis no rodapé fixo.

### REQ-04: Adaptação Mobile Orientada a Tarefas
- **Quando** a viewport for mobile (< 640px) em visões densas (Kanban/Tabelas),
- **O sistema deverá** renderizar seletor horizontal de etapas com snap scroll ergonômico, cartões em lista única vertical e ações rápidas via bottom sheet.

### REQ-05: Invariante de Não-Perda Funcional
- **Durante e após** todas as refatorações visuais,
- **O sistema deverá** preservar 100% dos dados, schemas, migrations, RPCs, regras de permissão, RLS multi-tenant e integrações com o backend BFF.

---

## 4. Matriz de Fases de Execução

| Fase | Escopo | Entregáveis | Critério de Aceite |
| :--- | :--- | :--- | :--- |
| **Fase 1** | Fundação Visual & Tokens | Normalização de estilos em `styles.css`, classes utilitárias full-page e alinhamento de superfícies. | Design Lint 0 P0; sem quebras de layout. |
| **Fase 2** | Navegação Global & Sidebar | Reestruturação da matriz em `workspace-navigation.ts` e simplificação do header no `workspace-shell.tsx`. | Acesso direto sem duplicações in-page. |
| **Fase 3** | Kanbans Full-Page (Turismo & Comercial) | Refatoração de `workspace.turismo.index.tsx` e `workspace.comercial.tsx` para layout full-page enterprise. | Kanban ocupa 100% da área útil; zero containeritis. |
| **Fase 4** | Operações & Pedidos | Refatoração de `workspace.pedidos.index.tsx` e `workspace.pedidos.gestor.tsx`. | Visualização clara de fila, separação e despacho. |
| **Fase 5** | Validação, Testes & Rastreabilidade | Execução de testes de regressão, Design Lint Ratchet e atualização do ledger de decisões. | 100% testes passam; ratchet aprovado. |
