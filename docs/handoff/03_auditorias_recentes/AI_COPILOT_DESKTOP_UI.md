# AI_COPILOT_DESKTOP_UI — Especificação Desktop Native (`>= 600px`)

## 1. Geometria e Superfície

- **Primitivo Utilizado**: `Sheet` + `SheetContent` (`src/components/ui/sheet.tsx`) com `side="right"`, `size="xl"` (`max-w-2xl` / `672px` de largura editorial) e `windowVariant="expanded"`.
- **Preservação de Contexto**: O painel abre na lateral direita ocupando `100dvh`, mantendo parte do formulário do anúncio visível à esquerda e preservando a posição de scroll da página principal.
- **Hierarquia de Scroll Única**:
  - **Header Fixo (`shrink-0`)**: Título `"Copilot de Conteúdo"`, subtítulo contextual do nicho, botões `Undo` / `Redo` / `Original` e barra de status `aria-live="polite"`.
  - **Corpo Editorial (`flex-1 overflow-y-auto`)**: Único container rolável contendo Ações Rápidas, Controles de Escrita colapsáveis, Régua Horizontal de Variantes, Resumo de Mudanças e os 4 blocos do `WorkingDraft` (`Título`, `Descrição` auto-expansível, `Síntese` e `Tags`).
  - **Footer Sticky (`shrink-0`)**: Composer conversacional (`Enter` envia) + botão primário único `Aplicar Campos Selecionados`.
- **Erradicação de Colunas Duplas Estreitas**: As variantes (`Rascunho Editável`, `Versão A`, `Versão B`, `Versão C`) são alternadas em abas horizontais (`role="tablist"`), garantindo 100% da largura útil para leitura e edição confortável.
