# Auditoria Completa e Refatoração do Sistema

Este plano aborda a correção dos problemas críticos relatados (Kanban quebrado, SheetPages pequenas, selects invisíveis/quebrados) e a refatoração do Dashboard ("Início") para remover nomenclaturas exageradas e focar em métricas úteis reais com interface estilo Bento Grid.

## Resumo dos Problemas e Causas Encontradas

1. **Kanban "Quadros Recriados" (Em branco):** A lógica no `useKanbanBoards` aciona a recriação através da função do banco de dados, mas o frontend pode não estar aguardando a sincronização, renderizando a tela enquanto as listas/cartões não retornam do banco.
2. **SheetPages pequenas (Drawer/Popup):** O componente base de Sheets (`src/components/ui/sheet.tsx`) tem a classe `sm:max-w-sm`, o que força a largura ser no máximo 384px em desktop, impossibilitando a visão esperada de 70% da tela (70vw).
3. **Selects quebrando nos CRUDs:** O componente raiz do Radix UI para os `Selects` desenha os popups via portal. Quando usados dentro de uma aba `SheetPage` (que tem z-index alto), os seletores acabam ficando com z-index menor ou sem portal ativo, "escondendo-se" atrás da tela.
4. **Build Errors / Componentes não carregando (`Tickets-xx.js`):** Ocasionalmente a importação assíncrona quebra devido à reconstrução, mas o TypeScript compila sem erros (100% OK), restando unicamente resolver as falhas operacionais e de layout.
5. **Dashboard ("Início") & "Cofre de Inteligência / Agent 7":** Termos exagerados serão trocados. O Dashboard terá cartões mais focados em operações práticas (Check-ins, Vouchers, Embarques de hoje), layout mais encaixado (Bentogrid real) e as notícias carregadas do RSS usarão cartões no formato blog corporativo (sem "Inteligência exclamativa").

---

## Proposed Changes

### Componentes UI Core

#### [MODIFY] `src/components/ui/sheet.tsx`
- **Mudar:** Remover `sm:max-w-sm` dos variantes `left` e `right` e substituir por `w-[90vw] sm:max-w-[70vw] lg:max-w-4xl`.
- **Por quê:** Isso fará com que qualquer página aberta em "Sheet" use automaticamente um espaço muito maior, funcionando como uma verdadeira "SheetPage".

#### [MODIFY] `src/components/ui/select.tsx`
- **Mudar:** Adicionar classe utilitária `z-[150]` ao `SelectContent` e verificar onde ele é injetado no Portal para garantir a sobreposição correta acima de qualquer Sheet/Modal (`z-50`).

### Refatoração do Dashboard / Nomes Base

#### [MODIFY] `src/pages/Index.tsx`
- **Mudar:** Alterar toda a composição de cards do Dashboard. Criar blocos baseados em utilidade: Embarques, Vouchers, Retornos.
- **Mudar:** Limpar nomenclaturas (remover Inteligência exagerada).
- **Mudar:** Adaptar a área de notícias para exibir o feed (que já existe no projeto!) no formato Bento Grid "Tetris".

#### [MODIFY] `src/components/AppSidebar.tsx` (e menus globais)
- **Mudar:** Procurar e renomear itens como "Cofre de Inteligência" e "Agent 7" para termos executivos e profissionais (e.g. "Base de Conhecimento", "Automações").

### Correção no Kanban

#### [MODIFY] `src/hooks/useKanbanBoards.ts` / [MODIFY] Componentes do Kanban
- **Mudar:** Corrigir os estados de "carregamento" ou recarregamento agressivo. O alerta de "Quadros Recriados" ocorre quando os dados não estão predefinidos, porém a Query não sofre `invalidateQueries` corretamente bloqueando a re-renderização. Vamos garantir que a UI mostre as colunas e conserte o fluxo inicial.

## User Review Required

> [!IMPORTANT]
> - O repositório referenciado (clone mais antigo) foi analisado passivamente. No entanto, o seu banco de dados Supabase e arquitetura atual estão ligeiramente à frente em termos de tabelas (graças à correção do schema feita pelo Lovable recentemente). **Usarei as versões instaladas no seu ambiente atual e ajustarei as lógicas de React para refletir o visual desejado em vez de fazer um downgrade no seu TypeScript.**
> - O layout Bento Grid do Dashboard será moldado ao padrão visual que já temos (borda arredondada, estilo "App" e Mapas integrados).

## Verification Plan

### Testes Visuais e Funcionais
- Testar a página "Kanban do Dia" para verificar se as colunas (A Fazer, Em Progresso...) carregam de primeira sem telas em branco.
- Clicar em ações de CRUD ("Nova Cotação", "Editar Cliente") para abrir as SheetPages e confirmar se estão em 70% da tela (`70vw`) com o layout devidamente espaçado.
- Abrir um formulário em Sheet e abrir um `Select` (`<Select>`), garantindo que o popup de opções apareça sobreposto corretamente (sem z-index bugs).
- Avaliar visualmente o novo Dashboard `Index.tsx`.
