# EVENT_TEMPLATE_AUDIT — Auditoria de Templates, Paridade de Preview e Isolamento Semântico

## 1. Diagnóstico e Correção do Roteamento de Template para Eventos

| Superfície | Comportamento Anterior (Defeituoso) | Comportamento Atual (Corrigido) |
| :--- | :--- | :--- |
| **`UniversalClassifiedShowcase`** (`src/components/classifieds/universal-classified-showcase.tsx`) | A condição `if (isEventShowcase && requestedTemplate !== "standard" && requestedTemplate !== "editorial")` bloqueava `EventClassifiedShowcaseView` quando `template_style` era `"editorial"` (o default do nicho `"evento"`!), fazendo o preview do editor e `/classificados/$id` caírem no template genérico de classificados. | `normalizedNiche === "evento"` agora renderiza **sempre** `<EventClassifiedShowcaseView />`, passando `previewViewport`, `templateStyle` e `displayMode`, garantindo **100% de paridade** entre o Live Preview do Editor, `/classificados/$id` e `/evento/$id`. |
| **Toggle Mobile / Desktop no Editor** | `EventClassifiedShowcaseView` não recebia `previewViewport`, ignorando o toggle Mobile/Desktop do editor. | `EventClassifiedShowcaseView` agora aceita `previewViewport?: "mobile" | "desktop" | "auto"`, alternando instantaneamente entre o layout **Desktop Native** (grid 12 colunas `8 + 4` com sidebar sticky) e **Mobile Native** (coluna única + barra inferior sticky `z-30`). |
| **Isolamento de Nicho (Invariante B.37)** | Risco de vazamento de especificações genéricas de classificados. | Eventos utilizam exclusivamente o contrato `EventDomainViewModel`, sem qualquer vazamento de atributos de veículos, imóveis, conveniência ou turismo. |
