# LAYOUT-ADAPTIVE.md — Matriz de Layouts Adaptativos e Classes de Janela

## 1. As Três Classes de Janela (Window Size Classes)
O sistema Waesy bifurca expressamente layouts conforme a taxonomia adaptativa do *Material 3*:

| Classe de Janela | Breakpoint Largura | Colunas | Gutter | Margem Externa | Paradigma Visual |
| --- | --- | --- | --- | --- | --- |
| **Compact** | `< 600px` | 4 fluidas | 12px | 16px (ou 0px full-bleed) | Navegação móvel no polegar, listas verticais, Sheets 100dvh |
| **Medium** | `600px .. 839px` | 8 fluidas | 16px | 24px | Trilhos recolhíveis, Split-views balanceadas |
| **Expanded** | `>= 840px` | 12 fluidas | 24px | 32px (max 1440px) | Bento Grids, Master-Detail lateral, Painéis de apoio persistentes |

---

## 2. Layouts Canônicos

### 2.1 Lista-Detalhe (Master-Detail)
- **Compact:** A lista ocupa 100% da viewport. O clique em um registro realiza transição de rota para a visualização detalhada em tela cheia com botão de retorno no topo esquerdo.
- **Expanded:** Layout dividido em 2 colunas:
  - Painel Mestre (Esquerda): Largura fixa entre 320px e 380px com scroll vertical isolado.
  - Painel Detalhe (Direita): Ocupa o espaço restante (`flex-1`), exibindo dados completos e formulários de edição.

### 2.2 Painel de Apoio (Supporting Panel)
- **Compact:** Conteúdo auxiliar ou filtros abrem sob demanda como Bottom Sheet ocupando até 100dvh, com detente inicial em 50% e dispensa por gesto descendente.
- **Expanded:** Dockado permanentemente à direita da tela (320px), permitindo edição simultânea sem oclusão da área de trabalho.

### 2.3 Feed e Bento Grid Operacional
- **Compact:** Feed linear em pilha única vertical, com carrosséis horizontais dedicados para categorias rápidas (snap scroll).
- **Expanded:** Grid modular assimétrico de 3 ou 4 colunas com cartões agrupados por proximidade e região comum.

---

## 3. Zona do Polegar e Ergonomia Móvel
Em conformidade com os estudos ergonômicos de Steven Hoober e a Lei de Fitts:
- Toda ação primária (`variant="default"`) e barras de navegação globais ficam ancoradas no terço inferior da tela móvel (`bottom-0`).
- Áreas de toque respeitam o piso inegociável de 44x44px (`h-11`).
- Informações contextuais e filtros ficam na zona média e superior.
