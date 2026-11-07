# 01 — Linha de Base Normativa e Critérios de Aceite

## 1. Documentos Reguladores Fundamentais
A auditoria fundamenta-se estritamente nas seguintes Fontes Únicas da Verdade (SSOT):
1. **[AGENTS.md](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/AGENTS.md):** Contrato Operacional do Repositório (B.1 a B.36).
2. **[DESIGN.md](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/design/DESIGN.md):** Constituição Visual e Geometria do Waesy.
3. **[DESIGN-LINT.md](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/design/DESIGN-LINT.md):** Catálogo Normativo de Defeitos Visuais (DL-01 a DL-32).
4. **[DECISIONS.md](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/design/DECISIONS.md):** Registro Histórico de Decisões Arquiteturais (DEC-001 a DEC-433).
5. **Norma WCAG 2.2 AA:** Critérios Internacionais de Acessibilidade Digital (W3C).

---

## 2. Invariantes Arquiteturais e de Design (Gatilhos de Bloqueio)

### Invariante B.26: Altura Canônica de Controles de Cabeçalho (Piso 44px)
- Todos os controles interativos de cabeçalho e navegação (`WorkspaceCanonicalToolbar`, botões de ação primária, filtros de data e seletores de visualização) DEVEM compartilhar altura mínima de 44px (`h-11 min-h-11`), alvos de toque mínimos de 44x44px (`size-11`) e anéis de foco `:focus-visible:ring-2`.
- Severidade de Descumprimento: **P1 (Bloqueia Merge)**.

### Invariante DL-31: Proibição de Containeritis (Card Dentro de Card)
- É terminantemente vedado envolver um componente de cartão já delimitado dentro de outro contêiner com borda e background (`rounded-* border bg-card`). Cada entidade visual deve ter uma **Única Casca Soberana (Single Sovereign Surface)**.
- Severidade de Descumprimento: **P0 (Bloqueia Entrega)**.

### Invariante DL-32: Proibição de Grade Dentro de Grade e Compressão Horizontal
- É vedado aninhar `grid` dentro de célula de outra `grid` sem `col-span-full`, ou declarar mais de 2 colunas no desktop para cartões horizontais densos. Largura mínima útil por cartão: 400px.
- Severidade de Descumprimento: **P1 (Bloqueia Merge)**.

### Princípio Belasis de Flexibilidade Operacional (Requisito R2)
- Telas operacionais centrais (Vendas, Atendimentos, Turismo, Tarefas, Clientes) DEVEM oferecer alternância fluida entre modalidades de visualização através do `UniversalViewManager`:
  1. **Modo Kanban:** Focado em transição de estágios com drag-and-drop nativo.
  2. **Modo Tabela:** Focado em densidade de dados, ordenação e exportação.
  3. **Modo Cards:** Focado em fotos, status visual e cartões individuais.
