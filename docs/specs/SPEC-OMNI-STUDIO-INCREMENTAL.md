# SPEC-OMNI-STUDIO-INCREMENTAL: Evolução Incremental do Omni Studio, Domínios e Hospedagem

## 1. Metadados da Especificação
- **ID da Spec**: SPEC-OMNI-STUDIO-INCREMENTAL-01
- **Status**: Ativa / Em Execução
- **Data**: 2026-10-23
- **Autor**: Antigravity Autonomous Pair Engineer
- **Módulo Alvo**: `src/components/builder/`, `src/services/hosting/`, `src/routes/workspace.builder.$documentId.editor.tsx`

---

## 2. Princípios de Segurança & Invariantes de Não-Regressão
1. **Invariante de Não-Destruição**: Nenhuma propriedade, bloco ou componente existente em `SITE_BUILDER_BLOCKS` e `OmniEditor.tsx` pode ser removido ou quebrado.
2. **Invariante de Isolamento de Falhas (Error Sandboxing)**: Se um bloco individual falhar ao renderizar (devido a dados incompletos ou props inválidas), o sistema SHALL renderizar um fallback neutro sem derrubar o canvas nem o editor.
3. **Invariante de Compatibilidade com o Design System**: Todo modal, drawer, controle ou botão adicionado SHALL seguir as regras de `DESIGN.md` (altura canônica de 44px para toques móveis `h-11`, cores via tokens de `styles.css`, anéis `:focus-visible`).
4. **Invariante de Persistência Segura**: Nenhuma exportação para servidor externo de hospedagem pode substituir ou impedir o salvamento canônico no banco de dados Supabase (`experience_documents` e `experience_versions`).

---

## 3. Requisitos em Sintaxe EARS

### 3.1 Blindagem do Canvas e Renderização (Submódulo 1)
- **REQ-01 (Ubiquitous)**: O renderizador de blocos do OmniEditor SHALL encapsular cada instância de bloco em um `BlockErrorBoundary`.
- **REQ-02 (Unwanted Behavior)**: IF a renderização de um bloco disparar uma exceção de runtime, THEN o sistema SHALL capturar o erro, exibir um card de recuperação neutro com mensagem técnica clara e manter os demais blocos e a barra de ferramentas interativos.
- **REQ-03 (State-Driven)**: WHILE o editor estiver em modo rascunho (*draft*), o sistema SHALL manter o histórico de snapshots em memória para permitir reversão imediata de alterações.

### 3.2 Integração de Hospedagem Própria & Domínio (Submódulo 2)
- **REQ-04 (Event-Driven)**: WHEN o usuário acionar o menu de publicação, o sistema SHALL apresentar a opção de publicação no ecossistema Waesy (`slug.waesy.com.br`) e a opção de vincular à conta de hospedagem própria (*CloudWeby LiteSpeed*).
- **REQ-05 (Unwanted Behavior)**: IF a conexão com a API do cPanel/WHM falhar ou sofrer timeout durante o deploy externo, THEN o sistema SHALL registrar a falha, preservar o status publicado localmente no banco de dados e orientar o lojista sobre o reenvio sem perda de progresso.
- **REQ-06 (Event-Driven)**: WHEN o lojista solicitar a criação de uma conta de e-mail corporativo (`@seudominio.com.br`), o sistema SHALL validar o formato via Zod, invocar a Server Function BFF autenticada e persistir o registro em `corporate_email_accounts`.

### 3.3 Hidratação Dinâmica de Templates de Nicho (Submódulo 3)
- **REQ-07 (Event-Driven)**: WHEN um template de nicho for selecionado (ex: Gastronomia ou Institucional), o sistema SHALL alimentar os blocos com os dados reais já carregados pelo loader (`categories`, `collections`, `products`, `store_hours`) em vez de dados sintéticos estáticos.
- **REQ-08 (State-Driven)**: WHILE uma coleção de dados (ex: catálogo de produtos) estiver vazia no banco da loja, os blocos dinâmicos correspondentes SHALL renderizar em estado vazio honesto (*empty state*) ou ocultar o trilho silenciosamente.

---

## 4. Matriz de Rastreabilidade e Evidências

| Requisito | Arquivo de Implementação | Teste / Evidência de Validação |
| :--- | :--- | :--- |
| **REQ-01, REQ-02** | `src/components/builder/BlockErrorBoundary.tsx` | Teste unitário de renderização forçando erro e verificando isolamento. |
| **REQ-03** | `src/components/builder/OmniEditor.tsx` | Verificação do fluxo de edição e undo. |
| **REQ-04, REQ-05** | `src/services/hosting/cpanel-provisioning.functions.ts` | Teste BFF de branches presentes/ausentes com validação Zod. |
| **REQ-06** | `src/services/hosting/email-provisioning.functions.ts` | Teste BFF de criação de caixa de e-mail. |
| **REQ-07, REQ-08** | `src/components/builder/templates.ts` | Validação de hidratação com dados reais do catálogo. |

---

## 5. Critérios de Aceite (Definition of Done)
- [ ] TypeScript compila com 0 erros (`npm run typecheck` Exit Code 0).
- [ ] 0 violações P0 e P1 no linter de design (`scripts/design-lint.mjs`).
- [ ] Nenhuma regressão no carregamento, edição e salvamento de páginas existentes no builder.
- [ ] Todas as mutações e chamadas ao WHM/cPanel isoladas em Server Functions seguras.
