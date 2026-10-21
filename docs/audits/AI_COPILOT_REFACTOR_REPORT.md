# AI_COPILOT_REFACTOR_REPORT — Relatório Consolidado Antes vs. Depois

## 1. Comparativo Sistemático Antes × Depois

| Dimensão | Antes (Popup Modal Estreito) | Depois (Copilot Editorial Bidirecional) |
| :--- | :--- | :--- |
| **Superfície Desktop** | `<Dialog>` centralizado (`max-w-3xl`) com 2 colunas estreitas (`md:grid-cols-2`) e scroll interno `max-h-48`. | Painel lateral amplo (`Sheet side="right" max-w-2xl`) de altura total (`100dvh`) com scroll principal único e textarea auto-expansível. |
| **Superfície Mobile** | Mesmo `<Dialog>` comprimido com múltiplos scrolls internos. | Superfície nativa full-screen (`Sheet side="bottom" h-dvh`) com safe-area, réguas horizontais táteis e composer sticky. |
| **Edição Pré-Aplicação** | Inexistente (tags `<p>` estáticas de leitura apenas). | `WorkingDraft` 100% editável (`Título`, `Descrição`, `Síntese de Destaques`, `Tags`) antes de aplicar. |
| **Comparação de Variantes** | 2 colunas espremidas lado a lado. | Régua horizontal de abas (`Rascunho Editável`, `Versão A · Comercial`, `Versão B · Storytelling`, `Versão C · Executiva`) + toggle `Comparar original`. |
| **Escopo de Aplicação** | Tudo-ou-nada (sobrescrevia `title` e `description` juntos e **descartava `suggestedTags`**). | Botões individuais (`Aplicar título`, `Aplicar descrição`, `Aplicar síntese`, `Aplicar tags`) + checkboxes de aplicação seletiva real. |
| **Reescrita de Trecho** | Inexistente. | Barra contextual ao selecionar qualquer trecho da descrição (`Melhorar trecho`, `Encurtar trecho`, `Expandir trecho`, `Corrigir gramática`). |
| **Cobertura de Nichos** | 8 nichos parciais no cliente. | 16 nichos canônicos em `NICHE_COPILOT_ADAPTERS` com isolamento semântico (B.37). |
| **Fact Lock & Segurança** | Apenas instrução textual no prompt; sem verificação pós-resposta. | Extração determinística de `LockedFacts`, validação numérica (`2026`, `5x2`, `120m²`, `R$ 1.200`), bloqueio de superlativos falsos e bloqueio de mutação de preço/permissão. |
| **Histórico e Concorrência** | Sem `Undo`/`Redo`, sem cancelamento e sem detecção de conflito. | Pilha de histórico (`Undo` / `Redo` / `Original`), cancelamento de requisição (`requestId`) e alerta de conflito (`sourceFingerprint`). |
