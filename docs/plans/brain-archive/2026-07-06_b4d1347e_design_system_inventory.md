# Inventário de Design e Componentes (As-Is)

Este documento descreve o estado atual do Design System da plataforma **Turis**, identificando todos os componentes, tokens e padrões visuais vigentes, visando a base para a transição para a **Ambient Glass Aesthetics (Turis OS)** sem perda de funcionalidades ou quebra de contratos.

## 1. Tokens Vigentes (As-Is)

Atualmente, o projeto utiliza Tailwind CSS com uma camada de abstração em `styles.css`. Os principais tokens em uso são:

- **Cores Primitivas e Semânticas:**
  - `background`: Tipicamente `#ffffff` em light mode e `#09090b` (zinc-950) em dark mode.
  - `surface` / `surface-alt`: Usados para cartões e modais.
  - `primary`: A cor da marca (dinâmica ou `#3D6FF2`).
  - `muted`, `accent`, `border`, `input`, `ring`: Padrões do shadcn/ui.
- **Tipografia:**
  - Famílias vigentes via `__root.tsx`: Inter, Plus Jakarta Sans, Bebas Neue, Playfair Display.
  - Títulos tipicamente usam pesos `600/700`, com tracking apertado.
- **Bordas e Sombras:**
  - `radius`: Padrão do shadcn/ui (0.5rem ou similar).
  - Sombras leves (sm, md) sem uso expressivo de blurs em profundidade (glassmorphism ausente ou incipiente).

## 2. Componentes UI Base (shadcn/ui modificados)

A pasta `src/components/ui/` contém 58 componentes primitivos que compõem 100% da interface do usuário. Nenhum componente estrutural precisa ser recriado do zero; eles precisam receber as diretrizes de composição Bento/Glass.

**Principais Componentes Funcionais:**
- **Layout & Composição:** `card`, `glass-panel`, `highlight-border`, `resizable`, `tabs`, `accordion`, `collapsible`, `drawer`, `sheet`.
- **Inputs & Formulários:** `form`, `input`, `textarea`, `select`, `searchable-select`, `checkbox`, `switch`, `radio-group`, `slider`, `combobox`, `input-otp`.
- **Ações e Feedback:** `button`, `alert`, `alert-dialog`, `dialog`, `toast` (sonner), `progress`, `skeleton`.
- **Exibição de Dados:** `data-table`, `table`, `kanban-board`, `kpi-card`, `chart`, `carousel`, `avatar`, `badge`.
- **Específicos de Produto:** `RichTextEditor`, `DevicePreview`, `universal-device-preview`, `AIGeneratorSheet`, `AIItinerarySheet`.

## 3. Padrões de Roteamento e Modulares

As rotas sob `src/routes/` demonstram a amplitude de fluxos:
- **Painel Administrativo (`agency.$slug.*`):** Contém módulos como CRM, Financeiro, Dashboard (Index), Inbox, Omnichannel, Construtor de Site, Visas, Cotações, Propostas e Viagens.
- **Portal do Cliente (`client.*`):** Módulo voltado ao cliente B2C contendo Perfil, Notificações, Viagens Ativas, Cotações, Pagamentos, Documentos.
- **Telas Mobile-first (`m.*`):** Rotas especializadas para checkin, visualização de contrato, convite e propostas de alta conversão.

> [!IMPORTANT]
> **Compatibilidade (Match Global):** 
> As refatorações estéticas aplicarão atualizações estritamente nas classes do Tailwind e no encapsulamento dos layouts, preservando os *props*, callbacks e lógica de manipulação de estado (`useQuery`, `useMutation`, hooks locais).
> Componentes como o `kanban-board.tsx`, `data-table.tsx` e `kpi-card.tsx` sofrerão atualizações nas sub-divs (aplicação de `.bg-glass`, `.bento-grid`), mantendo o contrato React inalterado.

## 4. Gaps Identificados para Turis OS

Para atingir o padrão premium desejado:
1. **Falta de Profundidade e Ambientação:** O tema atual é muito focado em "linhas e caixas planas" (flat borders). O novo padrão exige `backdrop-blur`, gradientes suaves e transparências controladas.
2. **Sistema de Grid Bento:** Atualmente os dashboards e telas de detalhes (ex: `trips.$id.tsx`) usam grids flex comuns. O padrão exige `bento-grid` com espaçamentos harmoniosos, tiles dinâmicos e entrada animada.
3. **Micro-Interações Ausentes:** Falta feedback visual fluido em hover de cards (tilt effects, border shines) e transições de entrada de página (`framer-motion` ou animações CSS `in-fade`).

---
**Status da Fase 1:** Concluída.
Próxima Fase: Estruturação base de estilos (`theme.css` e reescrita semântica).
