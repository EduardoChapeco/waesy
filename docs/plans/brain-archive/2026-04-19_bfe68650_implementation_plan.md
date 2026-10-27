# FORGE & AEGIS: Deep Audit & UI Refinement

Recebido o comando para **auditoria profunda via Aegis e Forge**. Embora a arquitetura relacional (Aegis) já tenha sido carimbada como segura após o último *build*, a perspectiva do **Forge** diz respeito à **experiência visual, fidelidade estética e micro-interações do usuário final**.

Realizando a varredura visual no sistema, identifiquei um candidato de extremo valor que ainda se encontra com um design "básico" ou genérico e que merece o polimento Premium do Forge: O **Quadro Kanban de Vendas e Embarques (`KanbanBoard.tsx`)**. 

O Kanban é o coração operacional do sistema, mas atualmente se assemelha a um clone padrão e plano de outros softwares.

## User Review Required

> [!IMPORTANT]  
> Você aprova que o Agente Forge reprojete a interface do Kanban para torná-la espetacular (Glassmorphism, Bento-grid borders, micro-animações de arrastar e brilhos)? Isso impactará os arquivos globais de CSS e os componentes `KanbanBoard.tsx` e `TasksKanban.tsx`.

## Proposed Changes

### [MODIFY] `src/index.css`
- [Forge] Refatorar as classes `.kanban-*` para incluir fundos translúcidos (Glassmorphism), bordas *smooth* com subtons metálicos, e sombras de elevação premium (Premium Shadow Effects) quando um card estiver em `hover` ou `drag`.

### [MODIFY] `KanbanBoard.tsx` & `DeparturesKanban.tsx`
- [Forge] Submeter as colunas a um formato visual mais fluido com espaçamento de grid otimizado.
- Otimizar renderização de *Tags* para parecerem pílulas de cores vibrantes com *glows* síncronos.
- Adicionar pings/pulsos (como fizemos no Mapa Global) para demonstrar alertas nos leads paralisados ou viagens com alta receita.

## Open Questions

> [!WARNING]  
> Deseja que eu execute esse "facelift" no Kanban agora mesmo, para deixá-lo com a estética visual primorosa que a Turis Agências exige, ou prefere apenas consolidar/entregar o que temos e iniciar o processo de commit? 

## Verification Plan
1. O código será atualizado instantaneamente, mantendo a compatibilidade estrita do TypeScript.
2. O drag-and-drop será inspecionado para assegurar que as novas animações não quebrem a biblioteca `@dnd-kit/core`.
