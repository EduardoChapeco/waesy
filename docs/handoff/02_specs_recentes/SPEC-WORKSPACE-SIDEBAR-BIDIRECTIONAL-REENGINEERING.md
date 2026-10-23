# SPEC-WORKSPACE-SIDEBAR-BIDIRECTIONAL-REENGINEERING.md — Reengenharia Canônica da Navegação e Shell do Workspace

## 1. Identificação e Metadados
- **ID da Especificação:** SPEC-WORKSPACE-SIDEBAR-BIDIRECTIONAL-REENGINEERING
- **Data:** 2026-10-18
- **Autor:** Antigravity AI & BigTech Executive Board
- **Status:** Aprovado para Implementação
- **Escopo Atômico:** `src/lib/workspace-navigation.ts`, `src/components/workspace/workspace-shell.tsx`, `src/components/workspace/workspace-sidebar-flyout.tsx`, `src/routes/workspace.index.tsx`, `src/lib/niches/niche-semantics.ts`

---

## 2. Contexto do Problema & Diagnóstico da Falha
1. **Truncamento e Corte Visual da Sidebar (Screenshot `media_1792361921186_b810ff1f.png`):**
   - A barra lateral desktop operava com largura fixa restritiva `w-64` (256px) combinada com `overflow-x-hidden` e classes `truncate` nos labels de menus e submenus, cortando termos essenciais como "Operação · Turismo & Viagens", nomes de ferramentas e contadores.
2. **Desordem Estrutural e Poluição Visual (AI Smell & Excesso de Accordions):**
   - 12 a 15 grupos desorganizados eram despejados na raiz da sidebar sem hierarquia funcional, forçando rolagem excessiva e confusão cognitiva.
   - O fluxo de trabalho diário de um lojista/operador exige 4 pilares fundamentais:
     - Pilar 1: **Painel & Tarefas** (Visão Geral, Tarefas, Ativação)
     - Pilar 2: **Atendimento & CRM** (Conversas, Clientes, Avaliações, Notificações)
     - Pilar 3: **Operação do Negócio** (Dedicada ao nicho ativo: Catálogo, Pedidos, Estoque, PDV, etc.)
     - Pilar 4: **Gestão & Crescimento** (Vitrine & Marketing, Financeiro & Caixa, Configurações)
3. **Vazamento Semântico e Inversão de Nicho ("Loja Moda Teste" vs Turismo):**
   - "Loja Moda Teste" exibia módulo e métricas de Turismo ("Excursões", "Cotações", "Viajantes"), violando a Invariante B.37.
   - Causa raiz: bug de bypass hardcoded em `src/lib/workspace-navigation.ts` linha 969 (`group.id.startsWith("tourism") ||`) que forçava a retenção perpétua de módulos de turismo em qualquer segmento, somado à falta de desambiguação semântica no resolver quando o nome da loja contém vocábulos explícitos de varejo/moda ("moda", "vestuario", "roupa", "calcado", "boutique", "fashion").
4. **Header e Ações Duplicadas:**
   - Botões redundantes no topo ("Vitrine" e "Vitrine Pública" concorrentes lado a lado) e botões gigantes decorativos sem affordance canônica.

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)

### 3.1 Requisitos Ubíquos (Sempre Ativos)
- **REQ-UBI-01 (Geometria da Sidebar Desktop):** O sistema DEVE renderizar a barra lateral desktop com largura canônica `w-72` (288px / 18rem), alinhamento de topo exato `h-14` (56px) e espaço interno fluido na grade de 4px, assegurando que nenhum título de seção ou rótulo de submenu seja truncado precocemente.
- **REQ-UBI-02 (Piso Tátil Canônico):** Todos os itens interativos, botões de grupos, links de navegação e controles de cabeçalho DEVEM possuir altura mínima de 44px (`h-11 min-h-11`) e anel de foco `:focus-visible:ring-2 focus-visible:ring-ring`.
- **REQ-UBI-03 (Squircle Anti-AI):** Todos os containers, botões, badges e cards do Workspace DEVEM utilizar raio geométrico squircle canônico (`rounded-lg` / `rounded-xl`), sem sombras decorativas em superfícies utilitárias e sem cores literais hex/rgb fora do sistema de tokens.

### 3.2 Requisitos Orientados a Evento (Event-Driven)
- **REQ-EVT-01 (Alternância Mobile):** QUANDO o usuário interage através de viewport compacta (< 840px), O sistema DEVE abrir a navegação em Sheet nativo com preenchimento tátil seguro (`pb-safe pt-safe`), física antijank e fechamento suave ao clicar em qualquer rota.
- **REQ-EVT-02 (Expansão de Accordion):** QUANDO o usuário clica em um grupo de navegação com múltiplos subitens, O sistema DEVE alternar o estado do grupo entre recolhido e expandido sem provocar salto de layout (Cumulative Layout Shift = 0).

### 3.3 Requisitos Orientados a Estado (State-Driven)
- **REQ-STA-01 (Estrutura dos 4 Pilares Operacionais):** ENQUANTO o Workspace estiver ativo em qualquer nicho, O sistema DEVE agrupar as rotas em 4 seções conceituais claras:
  1. `master`: Painel & Tarefas
  2. `crm`: Atendimento & Clientes
  3. `niche`: Operação do Negócio (contextual ao nicho ativo)
  4. `growth`: Gestão & Crescimento
- **REQ-STA-02 (Isolamento Estrito de Nicho - Anti-Vazamento):** ENQUANTO uma loja de Moda/Varejo ("Loja Moda Teste") estiver ativa, O sistema DEVE exibir estritamente recursos de Catálogo de Produtos, Estoque, Pedidos, Vendas e PDV, OMITINDO 100% de termos, grupos e rotas de Turismo, Viagens, Frotas ou Cotações Aéreas.

### 3.4 Requisitos de Comportamento Indesejado (Unwanted-Behaviour)
- **REQ-UNW-01 (Zero Hardcoded Turismo Bypass):** O sistema NUNCA DEVE preservar grupos com prefixo `tourism` em lojas cujo nicho resolvido não seja turismo.
- **REQ-UNW-02 (Zero Botões Duplicados):** O sistema NUNCA DEVE renderizar ações duplicadas para o mesmo destino (ex.: "Vitrine" e "Vitrine Pública" simultâneos). Deve unificar em uma única ação pública proeminente "Ver Vitrine Pública ↗".

---

## 4. Matriz de Rastreabilidade e Arquivos Autorizados
| Arquivo | Mudança Específica |
| :--- | :--- |
| `src/lib/workspace-navigation.ts` | Remoção do bypass `tourism`, estruturação em 4 pilares funcionais, ordenação clara dos grupos. |
| `src/lib/niches/niche-semantics.ts` | Desambiguação semântica para Moda/Varejo caso o nome contenha termos de vestuário, evitando falso turismo. |
| `src/components/workspace/workspace-shell.tsx` | Ajuste de largura da sidebar para `w-72` (288px), eliminação de truncamento forçado, consolidação de ações no header. |
| `src/components/workspace/workspace-sidebar-flyout.tsx` | Ajuste de padding na grade de 4px, quebra de linha natural ou flexível, indicador ativo squircle limpo. |
| `src/routes/workspace.index.tsx` | Consolidação de botões de topo, remoção de duplicata de vitrine, renderização honesta do nicho. |

---

## 5. Critérios de Aceite e Verificação
1. `npm run typecheck` com Exit Code 0.
2. `npm run build` gerando assets e worker com Exit Code 0.
3. `node scripts/design-lint.mjs --ratchet` com 0 novas violações P0/P1.
4. Rótulos da sidebar legíveis e íntegros em viewports desktop e mobile.
