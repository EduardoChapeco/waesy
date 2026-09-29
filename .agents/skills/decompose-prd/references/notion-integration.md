# Integração com Bancos de Dados Notion

Esquema de propriedades para sincronização bidirecional entre a decomposição e o Notion Workspace.

## Tabelas Conectadas
1. **Épicos:**
   - `ID` (Title), `Nome` (Rich Text), `Objetivo` (Rich Text), `Status` (Select: Backlog, Em Progresso, Concluído), `Features` (Relation para Features).
2. **Features:**
   - `ID` (Title), `Nome` (Rich Text), `Épico` (Relation), `Given/When/Then` (Rich Text), `Tarefas` (Relation para Tarefas), `Status` (Select).
3. **Tarefas:**
   - `ID` (Title), `Nome` (Rich Text), `Feature` (Relation), `Inputs` (Rich Text), `Outputs` (Rich Text), `Dependências` (Relation para Tarefas - auto-relacionamento), `Camada DAG` (Number), `Status` (Status).
