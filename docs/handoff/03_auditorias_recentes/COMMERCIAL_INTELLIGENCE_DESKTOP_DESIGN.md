# ESPECIFICAÇÃO DE DESIGN DESKTOP NATIVE DO RADAR COMERCIAL
## WORKSPACE WIDESCREEN • KANBAN • SIDE INSPECTOR • WAESY
### Data: 2026-10-21 • Versão: 1.0-PROD • Baseline: Production

---

## 1. Visão Geral da Arquitetura Desktop Native (>= 840px)

Para operadores e agentes de viagens em ambientes desktop (monitores 1080p e 1440p), o Radar Comercial prioriza **alta densidade de informação, navegação sem atrito e zero cliques desnecessários**.

A interface adota a composição em **3 Zonas Concorrentes**:
1. **Barra Superior Canônica (`TopBar` / `WorkspaceCanonicalToolbar`):** Altura canônica exata de 44px (`h-11`), campo de busca com debounce, pílulas de agrupamento e botões de ação tátil.
2. **Área Principal do Board (Kanban / Grade):** Colunas fluidas com rolagem horizontal suave, cards squircles grandes com anti-truncamento e badges semânticos.
3. **Painel Inspetor Lateral (Side Inspector Sheet):** Abre instantaneamente ao clicar em qualquer card, permitindo revisar a timeline do cliente, simular mensagens e promover ao CRM sem sair da visualização do board.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Radar Comercial]   🔍 Buscar por passageiro, destino...  [Etapas|Mês|Destino]  [+ Novo] │
├────────────────────────────────┬───────────────────────────────┬───────────────────────┤
│ NOVO (12)                      │ OFERTA ENCONTRADA (8)         │ PAINEL INSPETOR (LADO)│
├────────────────────────────────┼───────────────────────────────┤                       │
│ ┌────────────────────────────┐ │ ┌───────────────────────────┐ │ CARLOS SILVA          │
│ │ ANA SOUZA                  │ │ │ CARLOS SILVA          92% │ │ (49) 99812-3456       │
│ │ Cancún • Julho             │ │ │ Punta Cana • 12-19 Nov    │ │                       │
│ │ 2 adultos • Até R$ 12.000  │ │ │ Riu Republica AI          │ │ INTERESSE ATIVO:      │
│ │ 15x de R$ 800              │ │ │ 15x de R$ 856 s/ juros    │ │ Punta Cana All Incl.  │
│ └────────────────────────────┘ │ └───────────────────────────┘ │                       │
│                                │                               │ [Copiar Abordagem]    │
│ ┌────────────────────────────┐ │ ┌───────────────────────────┐ │ [Promover ao CRM]     │
│ │ MARCOS LIMA                │ │ │ JULIANA MENDES        88% │ └───────────────────────┘
│ │ Disney • Família (2A + 2C) │ │ │ Maceió • 7 noites         │
│ └────────────────────────────┘ │ └───────────────────────────┘
```

---

## 2. As 4 Variações de Agrupamento do Board (Multi-Board Views)

1. **Visão por Etapas do Pipeline (Padrão):**
   - `Novo` ➔ `Monitorando` ➔ `Oferta Encontrada` ➔ `Contato Enviado` ➔ `Respondeu` ➔ `Interessado`.
2. **Visão por Mês de Viagem (Month View):**
   - Agrupa os interesses por `Jan`, `Fev`, `Mar`... `Dez`. Interesses flexíveis (ex: "Qualquer semana em Julho") são alocados no mês correspondente sem duplicar o registro no banco.
3. **Visão por Destino / Região (Destination View):**
   - Agrupa por polos turísticos: `Punta Cana`, `Cancún`, `Nordeste`, `Disney`, `Europa`.
4. **Visão por Temperatura Comercial:**
   - Agrupa em `Alto Interesse (Score >= 80)`, `Potencial (Score 50-79)` e `Monitoramento Frio (< 50)`.

---

## 3. Especificação do Card Squircle Anti-Truncamento

Em conformidade com a Invariante B.38 do `AGENTS.md`:
- **Proibição de `truncate`:** Nomes de hotéis, cidades e valores de parcelas **NUNCA recebem reticências silenciosas**. O container utiliza `break-words leading-tight` e expande sua altura vertical conforme necessário.
- **Badge de Compatibilidade:** Exibe percentual matemático (ex: `92%`) com cor semântica:
  - $\ge 85\%$: Verde esmeralda (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`).
  - $65\% \text{ a } 84\%$: Azul corporativo (`bg-blue-500/10 text-blue-700 dark:text-blue-300`).
- **Pílula de Decomposição:** Ao passar o mouse sobre o badge, exibe tooltip com as razões explicáveis do match: `✓ Destino exato`, `✓ Janela de datas compatível`, `✓ Dentro do orçamento`.

---

## 4. Teclas de Atalho e Acessibilidade (WCAG 2.2 AA)
- `Esc`: Fecha o painel inspetor lateral e retorna o foco ao card ativo.
- `Enter` / `Espaço`: Abre o inspetor do card focado via teclado.
- `Tab` / `Shift+Tab`: Navegação sequencial com anel de foco destacado (`focus-visible:ring-2 focus-visible:ring-primary`).
- Alvos interativos com altura mínima de 44px (`h-11 min-h-11`).
