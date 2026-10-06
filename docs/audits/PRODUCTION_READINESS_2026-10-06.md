# Waesy — Auditoria Holística e Prontidão de Produção

**Data:** 2026-10-06
**Repositório:** `EduardoChapeco/waesy`
**Branch:** `chore/recover-waesy-task-2026-10-06`
**PR:** [#6](https://github.com/EduardoChapeco/waesy/pull/6)
**Escopo:** recuperação integral do trabalho histórico, hardening do Copilot, artefatos/tabelas, migrations, builders e comparação dos repositórios de turismo associados.

## 1. Veredito executivo

O checkout local contém a recuperação completa das alterações históricas e o commit publicado no GitHub já passou o CI principal do repositório (**232 ficheiros de teste, 1.538 testes aprovados** no estado anterior à última camada de hardening). A revisão adicional encontrou e corrigiu problemas que o CI mínimo não cobria:

- tabelas do Copilot que escondiam `rows` reais e exibiam uma linha fictícia;
- exportação CSV divergente do que era apresentado no viewer;
- ações estruturadas sem callback no `/copilot`;
- botão “Abrir no Builder” que abria apenas o inspetor local;
- fluxo de cotação de viagem interceptado pelo dispatcher errado no drawer global;
- fases de telemetria fora da FSM canónica e execuções em cache que permaneciam `running`;
- cache de artefactos sem escopo explícito de tenant/utilizador;
- versões duplicadas de migrations que bloqueavam o gate de schema.

**Estado honesto:** as alterações passaram o CI obrigatório e foram publicadas no branch/PR; o deploy Cloudflare Pages continua condicionado à autenticação/configuração Cloudflare do ambiente. O login OAuth do Wrangler expirou por timeout e não deve ser tratado como deploy concluído. O gate canónico extra retorna `0`, mas emite 511 avisos de decomposição de ficheiros grandes (`86` críticos, `97` altos e `328` médios); isso é dívida técnica não bloqueante no script atual e não deve ser confundida com prontidão máxima.

## 2. Correções aplicadas nesta camada

### 2.1 Copilot, tabelas e artefactos

- `ai-chat-shell.tsx`
  - adicionada normalização única de `dataRows`/`rows`, incluindo linhas objeto;
  - removido o fallback fictício `["1", "Item", "Ok"]`;
  - badge de registros agora usa a quantidade real de linhas;
  - estado vazio informa claramente que não houve registros;
  - CSV usa exatamente as mesmas linhas renderizadas, CRLF, BOM UTF-8, escaping de aspas/semicolons/quebras de linha e prevenção de formula injection;
  - “Abrir no Builder” navega para o documento/artefacto real quando há identificador.

- `structured-message-view.tsx`
  - blocos `table` aceitam `rows` e `dataRows`;
  - linhas objeto e valores complexos são convertidos para texto renderizável sem crash de React.

- `_store.copilot.tsx`
  - ações estruturadas passaram a ter callback real;
  - ações de carrinho, cotação, jurídico e publicação passam pelo dispatcher server-side;
  - navegação usa `href`/`url` somente quando começa por `/`;
  - checkout e mobilidade deixam de ser botões silenciosos.

- `waesy-copilot-drawer.tsx`
  - `request_travel_quote` deixou de ser interceptado pelo ramo que exigia o dispatcher autenticado, permitindo o fluxo próprio de cotação/fallback.

### 2.2 FSM, telemetria e cache

- `copilot-execution-persistence.ts`
  - `PLANNING` foi substituído por `PLANNED`, uma das 13 fases oficiais;
  - conclusão agora grava `COMPLETED`, `FAILED_RETRYABLE`, `FAILED_FINAL` ou `CANCELLED` de forma explícita;
  - steps sem `fsmPhase` não apagam a fase atual com `null`.

- `autonomous-copilot-orchestrator.ts`
  - cache hit finaliza a execução, persiste a trilha e não deixa o registro preso em `running`;
  - hash de cache recebe escopo `store:<id>`, `user:<id>` ou `public`, evitando reutilização cross-tenant;
  - testes de determinismo continuam válidos.

### 2.3 Schema

As 13 migrations que compartilhavam a mesma versão foram renomeadas com versões monotónicas únicas, preservando a ordem e o conteúdo SQL. O gate agora confirma:

```text
migrations=476
tables_declared=590
functions_declared=188
migration version uniqueness: OK
```

Atenção operacional: as migrations renomeadas são futuras no histórico do projeto. Antes de aplicar em um banco já parcialmente migrado, conferir a tabela de histórico de migrations do ambiente e executar o diff/repair oficial do Supabase; não reexecutar cegamente uma migration já registrada sob o nome antigo.

## 3. Evidência de validação

| Gate | Resultado |
|---|---|
| CI principal do PR anterior | **Aprovado:** 5 Quality Gates |
| TypeScript após hardening | **Aprovado** |
| Testes focados Copilot/UI/FSM | **56 testes aprovados em 5 ficheiros** |
| Schema consolidation após renomeação | **Aprovado:** 476 migrations, 590 tabelas, 188 funções |
| Conflitos Git em código/migrations | **Nenhum marcador real encontrado** |
| Gate canónico completo pós-hardening | **Exit 0, com aviso não bloqueante de 511 violações de tamanho** |
| Cloudflare Pages do PR #6 | **Falhou por configuração/autenticação de deploy, não por CI de código** |

## 4. Repositórios de turismo auditados

Os seguintes repositórios foram clonados da conta `EduardoChapeco`, materializados na branch `main` e comparados sem alterações de código:

| Repositório | HEAD auditado | Perfil | Sinais de reaproveitamento |
|---|---:|---|---|
| `aiturisagente` | `339d7ff` | Protótipo Vite/AI Studio pequeno, Gemini + Firebase, `jspdf`/`html2canvas`, Motion | Padrões de geração de documentos, onboarding e IA; não é base para substituir o Waesy |
| `travelagencias` | `95e60fd` | TanStack Start grande, Supabase, Tiptap, Playwright, 271 migrations | Melhor fonte para fluxos de agência, reservas, documentos, CRM e operações de turismo |
| `travelagencias-9d2bd1fc` | `8ef5ab6` | Variante menor do mesmo stack, 207 migrations | Útil para comparação de divergências e recuperação de componentes mais leves |
| `turisagencias` | `f67e39e` | Vite/React/Lovable, 565 TS/TSX, Supabase, Remotion Player | Melhor fonte para editor visual, vídeo/motion, templates e superfícies de turismo |
| `turisagencias-57d8b6f8` | `ea7ef7f` | Variante compacta, 229 TS/TSX, Supabase | Fonte de módulos menores e componentes isolados; requer triagem antes de integração |

### 4.1 Diretriz de consolidação

Não criar um builder por editor. O modelo recomendado para o Waesy é:

1. **Uma engine Omni Builder canónica** com schema versionado, nós, tokens, preview, publicação e exportação.
2. **Templates/archetypes contextuais** para site, landing page, bio-link, anúncio, apresentação, documento e viagem.
3. **Adapters por domínio** para turismo, anúncios, marketplace, documentos, vídeo e social, todos consumindo a mesma engine.
4. **Copilot/agents como orquestrador**, capaz de selecionar template, preencher dados reais, pedir aprovação para ações de impacto e devolver artefacto versionado.
5. **Proveniência obrigatória:** dados observados, dados sintetizados e defaults de UI devem aparecer como categorias diferentes, nunca como “tempo real” indistinto.

### 4.2 O que absorver primeiro

- **Turismo/agência:** consolidar entidades de agência, cliente, proposta, item de proposta, viagem, passageiro, voucher, fornecedores, saídas e mapa de assentos numa camada de domínio única.
- **Editor:** aproveitar Tiptap e Remotion onde forem componentes estáveis, mas ligá-los ao schema do Omni Builder e à autorização multi-tenant do Waesy.
- **Exportação:** unificar PDF/HTML/CSV/apresentação através de jobs autorizados por `artifactId`, com estado observável, idempotência e MIME real.
- **Copilot:** manter um único pipeline oficial; drawer e `/copilot` devem partilhar BFF, FSM, custo, persistência e ações.
- **Design:** absorver tokens, templates e motion somente depois de passar os gates canónicos de design, acessibilidade, proveniência e bundle.

## 5. Estado GitHub e produção

- O branch de recuperação foi publicado no GitHub e está associado ao [PR #6](https://github.com/EduardoChapeco/waesy/pull/6).
- O CI principal do PR já foi aprovado no commit anterior.
- O branch atual contém alterações adicionais de hardening; é necessário aguardar o novo CI antes do merge.
- O check “Cloudflare Pages” falhou anteriormente porque o Wrangler não estava autenticado/configurado no ambiente. Não houve confirmação de deployment em produção.
- Após o CI verde e a validação do estado de migrations, o fluxo correto é:
  1. push da branch atual;
  2. esperar `5 Quality Gates` e checks obrigatórios;
  3. merge do PR para `main`;
  4. autenticar Wrangler via OAuth oficial ou configurar o connector/secret autorizado;
  5. executar `npm run deploy` com os secrets de produção já configurados;
  6. verificar URL pública, health/status, worker, rotas críticas e logs Cloudflare.

## 6. Pendências que não podem ser declaradas como concluídas sem evidência externa

- autenticação Cloudflare e execução efetiva do deploy Pages;
- migração do banco de produção e confirmação do histórico de migrations;
- secrets/variáveis de produção para IA, Supabase, storage, pagamentos e integrações;
- smoke tests autenticados de Copilot, builders, checkout, turismo, documentos e publicação;
- validação E2E em browser contra dados reais de um tenant de staging/produção.
- decomposição dos 511 monólitos apontados pelo gate canónico extra.

Esses itens permanecem explícitos para evitar declarar “tudo em produção” quando o provedor externo ainda não confirmou o deployment.
