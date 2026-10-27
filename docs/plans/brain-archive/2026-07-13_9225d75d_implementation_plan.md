# Plano de Implementação — Fase 2 (Fontes Canônicas & Design System)

## 1. Conclusão da Fase 1 & Baseline Atual
- **Ciclos de Dependência:** Desacoplamos com sucesso o `TaskShell.tsx` do arquivo de rotas `daily-tasks.tsx` resolvendo o ciclo de dependência circular detectado. O typecheck e build de produção compilaram com sucesso.
- **Ledger de Cobertura:** Mantido e atualizado com as duas últimas entidades verificadas e comprovadas.

---

## 2. Diagnóstico da Fase 2 (Design System & RLS)

### Shadows Proibidos
Identificamos classes residuais de sombra (`shadow-lg`, `shadow-xl`, `shadow-2xl`, etc.) declaradas inline no JSX dos componentes. Embora sejam neutralizadas no CSS global (`box-shadow: none !important`), estas declarações representam dívida técnica no código do produto e violam o princípio flat-glass do `DESIGN.md`.

### RLS Permissiva no `brand_kit`
Identificamos uma política RLS `brand public read` de SELECT com a expressão `QUAL: true` para a role `anon,authenticated` na tabela `brand_kit`.
- **Análise:** Não vaza dados confidenciais (a tabela contém apenas cores, fontes e links de redes sociais da agência), mas permite dumps públicos indiscriminados de branding de todas as agências.
- **Ação Recomendada:** Manter a leitura pública apenas sob filtro restrito ou refinar a RLS no Supabase. Como a política pública é necessária para que visitantes anônimos vejam a identidade visual em páginas de propostas B2C, propomos documentar essa exceção técnica legítima ou mantê-la monitorada.

---

## 3. Mudanças Propostas nesta Turno (Design System Cleanup)

Limpar as classes residuais de sombras no JSX dos seguintes arquivos para restabelecer a consistência do código do Design System:

### [Route] Quotes Workspace

#### [MODIFY] [agency.$slug.quotes.index.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.quotes.index.tsx)
- Linha 712: Remover classe `shadow-xs`.
- Linha 1163: Remover classe `shadow-xl`.
- Linha 1337: Remover classe `shadow-xl`.
- Linha 1448: Remover classe `shadow-xl`.

### [Component] Tasks Workspace

#### [MODIFY] [KanbanView.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/components/tasks/views/KanbanView.tsx)
- Remover classes `shadow-xs`, `shadow-lg`, `shadow-xl` e `shadow-md` nas linhas 97, 147, 286, 351, 820, 850.

#### [MODIFY] [ListView.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/components/tasks/views/ListView.tsx)
- Remover classes `shadow-xs` nas linhas 155 e 252.

#### [MODIFY] [TimelineView.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/components/tasks/views/TimelineView.tsx)
- Remover classe `shadow-sm` na linha 116.

#### [MODIFY] [TaskDetailDrawer.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/components/tasks/TaskDetailDrawer.tsx)
- Remover classe `shadow-2xl` na linha 249 e `shadow-sm shadow-brand/20` na linha 529.

#### [MODIFY] [NewTaskModal.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/components/tasks/NewTaskModal.tsx)
- Remover classe `shadow-2xl` na linha 115.

---

## 4. Plano de Verificação

### Testes Automatizados
- Executar `npm run typecheck` para garantir que nenhuma refatoração visual quebrou classes ou tipos TypeScript.
- Executar `npm run build` para garantir integridade do empacotamento Nitro.
