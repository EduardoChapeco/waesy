# ACCESSIBILITY.md — Piso Inviolável de Acessibilidade Universal (WCAG 2.2 AA)

## 1. O Piso Normativo
A conformidade com as Diretrizes de Acessibilidade para Conteúdo Web (WCAG 2.2 Nível AA) é um pré-requisito de engenharia e não uma tarefa de polimento posterior. Qualquer regressão abaixo dos critérios normativos constitui defeito impeditivo P0.

---

## 2. Critérios de Sucesso e Parâmetros Numéricos

| Critério WCAG 2.2 | Nome | Parâmetro Numérico Inviolável | Severidade |
| --- | --- | --- | --- |
| **1.4.3** | Contraste Mínimo de Texto | `>= 4.5:1` para texto normal; `>= 3.0:1` para texto grande (>= 18pt ou 14pt bold) | **P0** (DL-16) |
| **1.4.11** | Contraste de Não-Texto | `>= 3.0:1` para bordas de controle ativos, ícones essenciais e estados de foco | **P0** (DL-17) |
| **2.4.7** | Foco Visível | Anel de foco com espessura mínima de 2px e contraste de 3:1 contra o fundo | **P0** (DL-15) |
| **2.4.11** | Foco Não Obstruído | Margem de rolagem (`scroll-margin`) >= 80px superior e 60px inferior para evitar corte por headers/footers | **P0** (DL-15) |
| **2.5.8** | Tamanho do Alvo de Toque | Mínimo absoluto de `44x44px` no mobile (<600px); mínimo de `24x24px` no desktop com espaçamento de 8px | **P1** (DL-14) |
| **2.3.3** | Animação por Interação | Cancelamento total via `prefers-reduced-motion: reduce` | **P1** (DL-28) |
| **3.3.2** | Rótulos ou Instruções | Todo input deve ter `<Label>` associado via `htmlFor`. Placeholder não substitui label | **P1** |

---

## 3. Navegação por Teclado e Skip Links
- O aplicativo fornece um Skip Link no topo do documento (`<a href="#main-content">Pular para o conteúdo principal</a>`) visível ao receber foco via Tab.
- A ordem de tabulação é estritamente linear e corresponde à ordem lógica de leitura DOM.
- Modais e Sheets implementam Focus Trap com devolução do foco ao elemento disparador após o fechamento.
