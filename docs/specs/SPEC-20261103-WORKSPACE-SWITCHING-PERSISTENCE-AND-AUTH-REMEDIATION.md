# SPEC-20261103: Remediação de Persistência de Workspace, Alternância de Contextos e Desbloqueio de Sessão

## 1. Contexto e Problema
O usuário reportou que ao clicar no botão de perfil no cabeçalho desktop para alternar entre seus workspaces/empresas (especificamente "Excelência Tour"):
1. O sistema não persistia a empresa selecionada, abrindo um workspace incorreto (fallback para o primeiro da lista, `Loja Moda Teste`).
2. O sistema entrava em laço de redirecionamento intermitente (ping-pong entre `/workspace`, `/entrar` e `/admin-master`).
3. Usuário com papéis master era sequestrado para `/admin-master` em vez de permanecer no seu workspace de operação de loja.

## 2. Taxonomia de Quebras (Break Triage)
- **B7 (Resíduo e Conflito de Estado de Sessão / Multi-Contexto):** Em `src/components/shell/utility-cluster.tsx`, a checagem em tempo de renderização `if (activeContext === "store")` executava `setClientContextCookies({ context: "civil" })`, purgando o cookie corporativo `waesy_active_tenant` silenciosamente a cada visita a páginas com o cabeçalho público.
- **B5 (Dessincronia de Token e Mapeamento de Cookies SSR):** Em `src/lib/supabase.ts`, o cliente de browser omitia `name: "waesy-auth-token"` em `cookieOptions`, gravando cookies sob `sb-*-auth-token`, enquanto `src/lib/supabase-ssr.server.ts` possuía `hasWaesy = parsed.some(c => c.name.startsWith("waesy-auth-token"))`, que caía em falso-positivo devido ao `waesy-auth-token-code-verifier` gerado pelo fluxo PKCE, bloqueando o mapeamento do token real e gerando `session: null`.
- **B10 (Perda de Parâmetro Determinístico e Fallback Incorreto de Tenant):** Em `utility-cluster.tsx`, `workspace-shell.tsx`, `context-switcher.tsx` e `workspace.lojas.index.tsx`, a navegação para alternância de empresa executava `window.location.href = "/workspace"` sem propagar `?storeId=${storeId}` na URL. A rota `/workspace/` (`workspace.index.tsx`) não validava parâmetros de busca e realizava fallback server-side estático para `memberships[0]`.

## 3. Requisitos em Sintaxe EARS
- **REQ-01 (Alternância Explícita de Tenant):** QUANDO o usuário selecionar uma empresa no dropdown de perfil (`UtilityCluster`) ou no switcher do workspace (`WorkspaceShell`/`WorkspaceAccountSwitcher`), O SISTEMA DEVE persistir atomicamente os cookies (`waesy_active_context=store` e `waesy_active_tenant=${storeId}`) E navegar com query param determinístico `/workspace?storeId=${storeId}`.
- **REQ-02 (Resolução Determinística de Tenant no Loader do Workspace):** QUANDO o loader de `/workspace/` for executado, O SISTEMA DEVE priorizar o `storeId` recebido via search params (se válido/autorizado), em seguida o cookie de tenant da sessão do servidor, e apenas em última instância o primeiro membership.
- **REQ-03 (Isolamento de Métricas por Loja Alvo):** QUANDO `getDashboardData` ou `getWorkspaceDashboardKpisFn` forem executados, O SISTEMA DEVE aceitar `storeId` opcional e passá-lo para `assertStoreAccess(identity, allowedRoles, targetStoreId)`, assegurando isolamento multi-tenant estrito sem assumir dados da primeira loja.
- **REQ-04 (Erradicação do Falso Positivo PKCE em Cookies SSR):** QUANDO o servidor ler cookies em `getSSRClient()`, O SISTEMA DEVE verificar se existem tokens de sessão válidos (`waesy-auth-token` ou chunks numéricos) E mapear `sb-*-auth-token` caso nenhum token válido esteja presente, ignorando chaves auxiliares como `-code-verifier`.
- **REQ-05 (Unificação de Nome de Cookie no Browser):** QUANDO o cliente de browser Supabase for instanciado em `getBrowserClient()`, O SISTEMA DEVE declarar explicitamente `cookieOptions: { name: "waesy-auth-token" }` para unificar a escrita de cookies entre cliente e servidor.
- **REQ-06 (Erradicação do Sequestro para Admin Master):** QUANDO um usuário autenticado acessar `/entrar` sem `returnUrl` explícito, O SISTEMA DEVE verificar se o usuário possui lojas cadastradas (`memberships.length > 0`); se positivo, redirecionar prioritariamente para `/workspace`, reservando `/admin-master` para administradores que não operam lojas civis.
- **REQ-07 (Eliminação de Efeito Colateral Destrutivo em Render):** O componente `UtilityCluster` NÃO DEVE disparar mutações de cookies (`setClientContextCookies`) durante a renderização para alterar estado civil, devendo aplicar apenas o estilo civil visual na interface pública sem purgar cookies corporativos.

## 4. Critérios de Aceite e Verificação
- [x] Zero erros de tipagem TypeScript (`cmd /c npm run typecheck` Exit Code 0).
- [x] Testes unitários de contexto e autenticação aprovados (`vitest run`).
- [x] Alternância para "Excelência Tour" carrega o workspace correto com métricas e identidade de Excelência Tour.
- [x] Ausência de loops de login/redirecionamento.
