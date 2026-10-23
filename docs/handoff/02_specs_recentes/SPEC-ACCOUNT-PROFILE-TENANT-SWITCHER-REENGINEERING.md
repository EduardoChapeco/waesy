# SPEC-ACCOUNT-PROFILE-TENANT-SWITCHER-REENGINEERING.md — Especificação Técnica de Reengenharia do Sistema de Alternância de Contas, Perfis e Tenants

## 1. Metadados e Controle do Documento
- **ID da Spec:** SPEC-ACCOUNT-PROFILE-TENANT-SWITCHER-REENGINEERING
- **Data de Criação:** 2026-10-18
- **Autor:** Antigravity AI Engine (Red Team / BigTech Executive Board / State-Sanitizer)
- **Status:** APROVADA
- **Alinhamento Normativo:** AGENTS.md B.1 a B.12, B.8, B.14, B.22, B.25, B.26, B.37, B.38; WCAG 2.2 AA.

---

## 2. Diagnóstico Forense das Falhas Relatadas

### F-01: Vazamento e Persistência Residual do Modo Empresa no Usuário Pessoal
- **Sintoma:** O usuário navega em sua conta pessoal civil (`/conta`, `/`) e a interface insiste em declarar que ele está no perfil de uma empresa, poluindo o drawer de perfil do topo (`UtilityCluster`), o cabeçalho de `/conta` (`ContextSwitcher`) e os links operacionais.
- **Causa Raiz:** O cookie `waesy_active_context=store` é gravado ao entrar no `/workspace`. Ao sair do Workspace para páginas civis ou ao navegar diretamente em `/conta`, nenhum guardião purificava o contexto civil. Os componentes liam o cookie e forçavam o estado corporativo sobre a identidade civil.

### F-02: Quebra na Alternância de Loja (Excelência Tour -> Loja Moda Teste)
- **Sintoma:** Ao selecionar uma loja secundária ("Excelência Tour"), o sistema redireciona e carrega a loja de testes inicial ("Loja Moda Teste").
- **Causa Raiz:** Três fatores concorrentes:
  1. Em `_store.conta.lojas.tsx` e `_store.conta.index.tsx`, a ação definia `waesy_active_tenant` no cliente sem sincronizar atomicamente `waesy_active_context=store`.
  2. O servidor (`identity.server.ts`), ao receber `waesy_active_context=civil`, acionava o Zero-Trust Civil Root e limpava `activeStoreId = null`.
  3. No carregamento de `/workspace`, o hook `useEffect` em `workspace.tsx` detectava `session.store_id === null` e executava `session.store_id || session.memberships[0].store_id`, forçando o primeiro item da lista ("Loja Moda Teste") de volta no cookie do cliente.
  4. O cache de identidade em memória (`IDENTITY_MEMO_CACHE` em `identity.server.ts`) retinha a identidade anterior por até 10 segundos sem invalidação quando `setTenantContext` era invocado.

### F-03: Metáfora Quebrada de "Portfólio Empresarial" (Anti-Pattern Meta Business Suite)
- **Sintoma:** O componente `WorkspaceAccountSwitcher` criava artificialmente um "Portfólio" com o nome da loja ativa (`activeStore.name`), exibindo todas as empresas do usuário como se fossem subordinadas da loja selecionada. Ao alternar de loja, a outra loja passava a se chamar "Portfólio" de todas as outras.
- **Causa Raiz:** Clonagem inadequada do modelo de 2 colunas do Meta Business Suite sem refletir a taxonomia real da plataforma Waesy (onde o usuário civil é o proprietário soberano de múltiplos negócios e personas).

---

## 3. Especificação Formal em Sintaxe EARS (Easy Approach to Requirements Syntax)

### R-01 (Sincronização Atômica de Cookies e Contexto):
- **Quando** o usuário solicitar a alternância para uma loja ou espaço de trabalho (`handleSwitchStore`),
- **O sistema DEVE** sincronizar atomicamente no cliente e no servidor:
  1. `waesy_active_context=store` (com `path=/; max-age=31536000; SameSite=Lax`).
  2. `waesy_active_tenant=<store_id>` (com `path=/; max-age=31536000; SameSite=Lax`).
  3. `waesy_store_id=<store_id>` (para retrocompatibilidade legada com `path=/; max-age=31536000; SameSite=Lax`).
  4. Expurgo imediato de `waesy_active_creator=""` (com `path=/; max-age=0`).
  5. Invocação confirmada de `setTenantContext({ data: { store_id } })`.

### R-02 (Invalidação Imediata do Cache de Identidade Server-Side):
- **Quando** `setTenantContext` for executado com sucesso no servidor,
- **O sistema DEVE** expurgar imediatamente do `IDENTITY_MEMO_CACHE` qualquer entrada vinculada ao usuário ou requisição ativa, impedindo que requisições subsequentes do browser recebam o `store_id` anterior.

### R-03 (Proteção Anti-Overwrite no Shell do Workspace):
- **Enquanto** a rota `/workspace` estiver montando ou revalidando dados,
- **O sistema DEVE** validar se o cookie `waesy_active_tenant` já contém uma loja válida e pertencente aos `memberships` do usuário antes de recorrer ao fallback de `session.memberships[0].store_id`.

### R-04 (Eliminação do Anti-Pattern de Portfólio e Novo Switcher Canônico):
- **O componente** `WorkspaceAccountSwitcher` **DEVE** operar sob arquitetura linear unificada (Padrão Stripe/Linear/Slack):
  1. **Bloco de Negócio Ativo:** Card squircle com logo/inicial, nome do negócio, cidade, segmento e badge de status "Ativo".
  2. **Campo de Busca Instantânea:** Filtragem dinâmica em tempo real para contas com múltiplos negócios.
  3. **Lista de Meus Negócios:** Itens clicáveis com feedback tátil, ícone de rádio/check na ativa e disparo da alternância em 1 clique.
  4. **Seção de Contexto Pessoal & Personas:** Link direto e proeminente para "Minha Conta Pessoal (Civil)" com acionamento do modo civil.
  5. **Rodapé Operacional:** Botões padronizados com altura $\ge 44$px (`h-11 min-h-11`) para "Criar Negócio" e "Gerenciar Negócios".

### R-05 (Isolamento Civil Transacional nas Superfícies Públicas):
- **Quando** o usuário estiver navegando em rotas estritamente civis (`/conta`, `/conta/pedidos`, `/conta/favoritos`),
- **O sistema DEVE** respeitar e priorizar a identidade civil do usuário (`userName`, `userAvatar`, `userHandle`), permitindo que a alternância para lojas seja uma ação voluntária e explícita sem contaminação forçada do perfil de compras.

---

## 4. Matriz de Estados do Switcher

| Estado | Contexto Ativo | Visualização no Gatilho | Ações Primárias |
| :--- | :--- | :--- | :--- |
| **Loja Ativa (Workspace)** | `store` (`store_id` válido) | Logo da Empresa + Nome + Chevron | Alternar para outro negócio ou ir para Conta Civil |
| **Conta Civil (/conta)** | `civil` (`store_id === null`) | Avatar Pessoal + Nome Pessoal | Gerenciar pedidos civis e acessar lojas gerenciadas |
| **Criador Ativo (/conta/criadores)** | `creator` (`activeCreator` válido) | Avatar do Criador + @handle | Painel de afiliação e retorno para Conta Civil |
| **Entregador Ativo (/conta/entregador)** | `courier` (perfil ativo) | Ícone de Moto + Waesy Go | Painel de corridas e retorno para Conta Civil |

---

## 5. Critérios de Aceite e Verificação
1. [ ] Transição para "Excelência Tour" deve carregar `c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7` sem fallback para `Loja Moda Teste`.
2. [ ] Cache server-side limpo instantaneamente em `setTenantContext`.
3. [ ] Modal de portfólio Meta de 2 colunas substituído pelo seletor canônico Linear/Stripe em coluna única clara.
4. [ ] Contexto civil pessoal preservado em `/conta` sem declaração forçada de que o usuário é uma loja.
5. [ ] Alvos de toque $\ge 44$px (`min-h-11`) em todos os botões interativos do alternador.
6. [ ] Zero erros de compilação TypeScript e aprovação completa em `npm run build` e `design-lint`.
