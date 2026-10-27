# AI_COPILOT_PATCH_MODEL — Modelo de Patch Seletivo, Escopo de Trecho e Histórico

## 1. Modelo de Patch Seletivo (`buildSelectivePatch`)

O Copilot nunca sobrescreve o formulário às cegas. Toda aplicação passa por `buildSelectivePatch`:

```ts
export interface CopilotFieldChange {
  field: 'title' | 'description' | 'summary' | 'tags'
  before: string | string[]
  after: string | string[]
  reason: string
}
```

### Modos de Aplicação Disponíveis na UI
1. **Aplicação Individual Rápida por Campo**:
   - `[Aplicar título]` → aplica exclusivamente `workingDraft.title`.
   - `[Aplicar descrição]` → aplica exclusivamente `workingDraft.description`.
   - `[Aplicar síntese]` → aplica exclusivamente `workingDraft.summary` (e sincroniza `travelBioBullets` em Viagens).
   - `[Aplicar tags]` → aplica exclusivamente `workingDraft.tags` em `attributes.tags`.
2. **Aplicação Seletiva Combinada (`Aplicar Campos Selecionados`)**:
   - Checkboxes independentes em cada bloco (`Título`, `Descrição`, `Síntese`, `Tags`) permitem aplicar qualquer subconjunto de campos de uma só vez.

## 2. Reescrita de Trecho Selecionado (`applySelectionReplacement`)

Quando o usuário seleciona um intervalo `[start, end]` no `<Textarea>` da descrição:
- A barra contextual exibe: `Melhorar trecho`, `Encurtar trecho`, `Expandir trecho`, `Corrigir gramática`.
- A requisição envia `scope: "selection"` e `selectedText`.
- `applySelectionReplacement(fullText, { start, end }, replacementText)` substitui estritamente a substring `[start, end]`, mantendo todos os parágrafos anteriores e posteriores intactos.

## 3. Histórico de Sessão (`Undo` / `Redo` / `Restaurar Original`)

- Cada geração ou troca de variante empilha um `CopilotHistoryEntry` imutável.
- Botões `Undo`, `Redo` e `Original` no cabeçalho permitem navegar entre versões sem perda de edições manuais.
