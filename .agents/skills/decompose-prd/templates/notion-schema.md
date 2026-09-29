# Esquema Notion para Decomposição de PRD

### Tabela 1: Épicos
- `ID` (Title, ex: EPIC-01)
- `Nome` (Rich Text)
- `Objetivo` (Rich Text)
- `Status` (Select: Backlog, Em Andamento, Concluído)
- `Features` (Relation -> Features)

### Tabela 2: Funcionalidades
- `ID` (Title, ex: FEAT-01)
- `Nome` (Rich Text)
- `Épico` (Relation -> Épicos)
- `User Story` (Rich Text)
- `Critérios de Aceitação` (Rich Text)
- `Tarefas` (Relation -> Tarefas)
- `Status` (Select)

### Tabela 3: Tarefas
- `ID` (Title, ex: TASK-01)
- `Nome` (Rich Text)
- `Feature` (Relation -> Features)
- `Inputs` (Rich Text)
- `Outputs` (Rich Text)
- `Camada DAG` (Number: 0, 1, 2...)
- `Pré-requisitos` (Relation -> Tarefas [Auto-relation])
- `Caminho Crítico` (Checkbox)
- `Status` (Status: A Fazer, Executando, Concluído)
