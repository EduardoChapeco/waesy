# Relatório de Assimetria Visual — Auditoria Omni-Design V147

Data da Auditoria: 2026-09-30
Escopo: Camada de visualização das páginas centrais (`/workspace`, `/_store/checkout`, `workspace/configuracoes/pwa`, vitrines e widgets).
Status do Diagnóstico: Assimetria Crítica e Quebra de Paradigma Mobile Identificadas.

---

## 1. Mapeamento de Web Smells por Rota

| Rota / Arquivo | Componente / Bloco | Web Smell Detectado | Impacto Mobile (<600px) | Impacto Desktop (>=840px) | Severidade |
| --- | --- | --- | --- | --- | --- |
| `src/routes/workspace.index.tsx` | Métricas Táticas (L371-443) | `grid grid-cols-2 lg:grid-cols-4` com `gap-2.5 sm:gap-3.5` | Espreme textos como "0 registro(s) hoje" e "Estoque Regular" em 2 colunas truncadas. | Falta Bento Grid proporcional de 12 colunas; cards desalinhados em altura. | P1 |
| `src/routes/workspace.index.tsx` | Faturamento Mensal (L330-369) | Card herói isolado com cores duras fora do sistema modular | Ocupa altura excessiva sem integração com as métricas secundárias. | Espaço negativo desperdiçado sem alinhamento simétrico com cartões de apoio. | P1 |
| `src/routes/workspace.index.tsx` | Header Operacional (L242-327) | Botões com bordas cinzentas duras (`border-border/80`), cores literais e múltiplas ações primárias | Scroll horizontal precário sem snap touch; quebra hierarquia de ação única. | Poluição visual com 6 botões concorrentes sem contraste por opacidade. | P1 |
| `src/routes/workspace.index.tsx` | Departamentos (L541-634) | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` | Cards em miniatura quebrando rótulos em 2 colunas no mobile sem ergonomia tátil. | Falta alinhamento vertical uniforme (`h-full flex flex-col justify-between`). | P1 |
| `src/routes/_store.checkout.tsx` | Abas de Etapas (L830-860) | Classe arbitrária com colchetes `-mb-[9px]` (DL-02) | Overflow horizontal em telas de 360px com quebra de alinhamento visual. | Linha de navegação rígida sem feedback tátil moderno. | P1 |
| `src/routes/_store.checkout.tsx` | Modais de GPS e Políticas | Diálogo centralizado desktop em vez de Bottom Sheet nativa | Oclui a tela inteira forçando toque no topo para fechar fora da thumb zone. | Aceitável, mas sem física de movimento suave. | P1 |
| `src/components/admin/marketing/seasonal-marketing-calendar-widget.tsx` | Badges e Ícones (L72, 74, 138) | Emojis no código (`🔥`, `🚀`, `💡`) violando AGENTS.md B.8 | Ruído visual e AI-smell evidente em interfaces de software profissional. | Quebra o princípio do Design Silencioso Apple/Linear. | P0 |
| `src/components/admin/marketing/seasonal-marketing-calendar-widget.tsx` | Superfície (L81) | Sombra decorativa `shadow-sm` em superfície utilitária | Violação de AGENTS.md B.8 (sombras restritas a modais/overlays). | Inconsistência de elevação plana. | P1 |
| `src/routes/workspace.configuracoes.pwa.tsx` | Simulador e Layout | Classes arbitrárias (`w-80 h-168`, `border-4`) e cores literais | Layout desktop rígido sem adaptação proporcional. | Ausência de Bento Grid na visualização de controles. | P1 |

---

## 2. Diagnóstico Estrutural: A Falta de Bifurcação Nativa

1. **O Paradoxo do Desktop Espremido**:
   Páginas como o dashboard principal (`workspace.index.tsx`) aplicaram regras de CSS Grid projetadas para desktop com meros prefixos (`grid-cols-2 lg:grid-cols-4`). Em um smartphone de 375px (iPhone standard), duas colunas com padding interno de 16px deixam menos de 140px por coluna, forçando textos numéricos e descrições a quebrar em 3 ou 4 linhas desagradáveis.
2. **Ausência do Bento Grid no Desktop**:
   Em monitores grandes (>=840px), o layout está fragmentado em blocos lineares sucessivos (Header -> Card de Faturamento -> Linha de 4 Métricas -> Grid 2+1 de Atividades/Canais -> Grid de 6 Departamentos), em vez de um Bento Grid coeso de 12 colunas (`grid-cols-12`) onde dados de mesma hierarquia espacial se intertravam com alturas milimetricamente idênticas.
3. **Poluição por Contornos e Emojis**:
   Cards e botões usam bordas cinzas pesadas (`border-border/80`, `border-border`) e badges com emojis decorativos, em desacordo frontal com o Mandato do Design Silencioso (Apple HIG / Linear), onde a separação deve ser feita primariamente por elevação suave, espaço negativo e contraste sutil de opacidade (`text-muted-foreground/75`).

---

## 3. Matriz de Transformação Imediata

### Meta 1: `workspace.index.tsx` (Dashboard Operacional)
- **Desktop (Expanded >= 840px)**:
  - Bento Grid principal de 12 colunas:
    - Faturamento do Mês Herói: `col-span-12 lg:col-span-7 xl:col-span-8 h-full flex flex-col justify-between`.
    - Matriz de Métricas Táticas: `col-span-12 lg:col-span-5 xl:col-span-4 grid grid-cols-2 gap-3 h-full`.
    - Atividades Recentes + Canais: `col-span-12 lg:col-span-8` e `col-span-12 lg:col-span-4` com `h-full flex flex-col justify-between`.
- **Mobile (Compact < 600px)**:
  - Destruição das 2 colunas truncadas.
  - Cartão herói Edge-to-Edge com tipografia fluida e métricas secundárias apresentadas em lista agrupada nativa (estilo Apple Inset Grouped List) com divisores finos e touch targets de 44px (`h-11`).
  - Departamentos em lista limpa com ícones tonais e chevron indicador.
- **Hierarquia Silenciosa**:
  - Apenas 1 ação primária (`variant="default"`).
  - Ações secundárias em formato Soft/Tonal (`bg-muted/50` ou `bg-primary/10`).
  - Remoção de bordas pesadas e classes literais de cor.

### Meta 2: `seasonal-marketing-calendar-widget.tsx`
- Erradicação de emojis (`🔥`, `🚀`, `💡`).
- Remoção de `shadow-sm` decorativo.
- Título conciso: "Calendário Sazonal" (2 palavras).
- Integração harmoniosa no Bento Grid.

### Meta 3: `_store.checkout.tsx`
- Remoção da classe arbitrária `-mb-[9px]`.
- Garantia de alvos de toque mínimos de 44px nos controles.
