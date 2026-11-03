# SPEC-20261103-ADMIN-MASTER-CLEAN-MINIMAL-DESIGN

## 1. Contexto e Problema
O usuário identificou que o painel administrativo (`/admin-master/home-editor`) apresenta layout sobrecarregado e "expremido" (cramped), com:
- Múltiplas camadas de abas, pills e links externos concorrendo na mesma faixa.
- Barra de filtros duplicada com caixas cinzas pesadas.
- Cabeçalhos de cards de seção com até 8 controles comprimidos horizontalmente na mesma linha.
- Subtítulos e parênteses prolixos gerando poluição cognitiva (AI-smell).
- Erro no ancoramento do Omni Builder ("Nenhuma loja base ativa encontrada para ancorar o documento Omni Builder.").
- Container de layout com restrição de largura excessiva para a densidade dos dados.

## 2. Requisitos em Sintaxe EARS

### [REQ-ADM-01] Cabeçalho Silencioso e Ação Primária Única
- **Quando** o administrador acessar `/admin-master/home-editor`, o sistema **deve** renderizar um cabeçalho limpo com título conciso ("Páginas & Seções"), subtítulo objetivo de uma linha e exatamente UMA ação primária destacada (`+ Nova Seção`), mantendo ações secundárias (`Omni Builder`, `Preview`) em botões outline discretos.

### [REQ-ADM-02] Segmented Control de Contexto Despoluído
- **Quando** o usuário navegar entre contextos de tela (Todas, Início, Explorar, Chat Noor, Menus Mobile), o sistema **deve** utilizar um Segmented Control unificado em estilo Apple/Linear, removendo links de navegação para outras rotas (que já pertencem à barra lateral).

### [REQ-ADM-03] Barra de Ferramentas Integrada e Não-Expremida
- **Quando** o usuário pesquisar ou filtrar seções, o sistema **deve** exibir uma única barra de ferramentas integrada combinando:
  1. Campo de busca com ícone de lupa e atalho de limpeza.
  2. Filtro de status (`Todas`, `Ativas`, `Inativas`) em abas compactas integradas.
  3. Dropdown de `Presets Rápidos` alinhado à direita.
  4. Botão de alternância de visualização (`Cards` vs `Planilha`).

### [REQ-ADM-04] Cards de Seção com Hierarquia e Espaço Respirável
- **Quando** a lista de seções for renderizada, cada cartão **deve**:
  1. Conter cabeçalho espaçado com `#Ordem`, Título claro e Badge discreto de layout.
  2. Agrupar os controles de forma harmoniosa: Switch de ativação (com label sutil), Botão `+ Card`, e menu de ações (`Configurar`, `Mover`, `Excluir`).
  3. Eliminar parênteses prolixos e textos explicativos redundantes.
  4. Manter cantos suaves (`rounded-2xl`) com borda sutil (`border-border/60`).

### [REQ-ADM-05] Empty State Calmo e Direto
- **Quando** uma seção não contiver cards cadastrados, o sistema **deve** exibir uma área limpa e convidativa com mensagem direta e botão de ação para upload imediato, sem caixas pontilhadas sufocantes.

### [REQ-ADM-06] Resolução Robusta de Loja Base para Omni Builder
- **Quando** o usuário abrir uma página no Omni Builder através de `openOrCreatePageExperienceDocument`, o sistema **deve** localizar deterministicamente a loja base sem falhar caso o campo `status` não seja `active` ou RLS oculte registros padrão, buscando em `stores` gerais, memberships do usuário ou criando ancoragem de sistema segura.

### [REQ-ADM-07] Layout Workstation Arejado no Admin Master
- **Quando** o shell do Admin Master for renderizado no desktop, a área de conteúdo principal **deve** utilizar largura adaptativa fluida com teto amplo (`max-w-[1600px]` ou `w-full max-w-7xl 2xl:max-w-screen-2xl`), espaçamento `p-6 lg:p-8`, e zero margem acumulada redundante.

## 3. Critérios de Aceite
1. Zero elementos sobrepostos ou espremidos em telas `>= 1024px` e em mobile `< 600px`.
2. Apenas uma ação primária no cabeçalho superior.
3. Remoção de links externos duplicados do tabstrip de seções.
4. Redução de 7+ controles na linha do card para layout balanceado.
5. `npm run typecheck` Exit Code 0.
6. `npm run test` com 100% de aprovação.
7. `node scripts/design-lint.mjs --ratchet` sem violações P0/P1.
8. `npm run build` gerando bundle limpo e Cloudflare worker.
