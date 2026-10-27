# SPEC-PAINEL-EMPRESAS-DIRECT-AUTH — Entrada Corporativa Dedicada & Onboarding Imediato

## 1. Contexto e Motivação
Empresas, lojistas e prestadores de serviços do ecossistema Waesy demandam um canal de acesso direto para gestão operacional de seus workspaces, desacoplado da navegação de consumo civil (`waesy.com.br/entrar`).
Adicionalmente, novos empreendedores que chegam por este canal B2B devem poder criar sua conta de usuário e serem conduzidos imediatamente para o fluxo de abertura e provisionamento de sua empresa (`/criar-negocio`), eliminando fricções de navegação intermediária.

## 2. Requisitos em Sintaxe EARS

### EARS-01: Resolução de Domínio e Rota Canônica
- **WHEN** uma requisição HTTP for recebida no servidor com cabeçalho `Host` iniciado por `painel.` e caminho `/`
- **THE SYSTEM SHALL** reescrever/rotear a requisição internamente para a rota canônica `/painel` preservando parâmetros de consulta (`searchParams`).

### EARS-02: Verificação de Sessão Prévia no Painel
- **WHEN** um usuário autenticado acessar `/painel` (ou `painel.waesy.com.br`)
- **IF** o usuário possuir pelo menos uma loja ou vínculo de membro ativo (`store_id` ou `memberships.length > 0`)
- **THE SYSTEM SHALL** redirecionar imediatamente com status 302 para `/workspace`.
- **ELSE** (usuário autenticado sem loja associada)
- **THE SYSTEM SHALL** redirecionar imediatamente com status 302 para `/criar-negocio`.

### EARS-03: Autenticação de Lojista no Painel
- **WHEN** um lojista não autenticado submeter credenciais válidas na aba "Acessar Workspace" de `/painel`
- **THE SYSTEM SHALL** autenticar a sessão via `signInWithPassword`, sincronizar os cookies de sessão SSR (`Domain=.waesy.com.br` em produção) e redirecioná-lo para `/workspace` (ou `/criar-negocio` caso ainda não possua estabelecimento).

### EARS-04: Criação de Conta Empresarial com Encadeamento Imediato
- **WHEN** um novo empreendedor submeter o formulário de cadastro em `/painel`
- **THE SYSTEM SHALL** criar a credencial de usuário via `signUpWithPassword` gerando o perfil correspondente na tabela `profiles`, autenticar a sessão imediatamente e redirecionar compulsoriamente para `/criar-negocio` para que o cadastro do negócio seja iniciado de forma ininterrupta.

### EARS-05: Isolamento Civil e Não-Regressão
- **WHILE** a rota `/painel` estiver em operação
- **THE SYSTEM SHALL** manter inalterada a rota `_store.entrar.tsx` e a integridade do modelo multi-tenant (`profiles` + `store_members`), assegurando conformidade estrita com o piso WCAG 2.2 AA (DL-14 a DL-17).

## 3. Invariantes Arquiteturais
1. **SSOT de Autenticação**: Zero contas isoladas ou tabelas paralelas. Toda credencial corporativa reside no Supabase Auth + `profiles`.
2. **Design System & Acessibilidade**:
   - Altura mínima de 44px (`h-11 min-h-11`) em todos os alvos de toque interativos.
   - Anéis de foco obrigatórios `:focus-visible:ring-2 focus-visible:ring-ring`.
   - Cores semânticas exclusivas de tokens (`tokens.json`/`styles.css`), zero classes arbitrárias entre colchetes (`DL-02`) e zero `!important` (`DL-04`).
   - Zero emojis em elementos de interface e textos explicativos prolixos.
3. **Resiliência Multi-Ambiente**: O portal funciona de forma idêntica tanto em `painel.waesy.com.br` quanto em `waesy.com.br/painel` e `localhost:3000/painel`.

## 4. Arquivos no Escopo Atômico
- `docs/specs/SPEC-PAINEL-EMPRESAS-DIRECT-AUTH.md` (Documento normativo)
- `src/server.ts` (Middleware de host para resolução de subdomínio `painel.*`)
- `src/lib/supabase-ssr.server.ts` (Suporte a cookie compartilhado de subdomínio em produção)
- `src/routes/painel.tsx` (Rota do Painel de Entrada Corporativa B2B)
- `src/routes/__tests__/painel-auth-flow.test.ts` (Testes automatizados da spec)
- `docs/design/DECISIONS.md` (Registro da decisão arquitetural)

## 5. Critérios de Aceite e Evidências
- [ ] Rota `/painel` compila sem erros TypeScript (`npm run typecheck` Exit Code 0).
- [ ] Testes unitários de roteamento e encadeamento passam com sucesso.
- [ ] Design lint aprovado com zero novas violações P0/P1.
- [ ] Build de produção (`npm run build`) validado.
