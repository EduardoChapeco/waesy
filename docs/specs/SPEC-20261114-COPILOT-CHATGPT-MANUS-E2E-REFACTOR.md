# SPEC-20261114-COPILOT-CHATGPT-MANUS-E2E-REFACTOR

## 1. Contexto e Objetivo
Unificar ponta a ponta o ecossistema do **Waesy Copilot**, a navegação do **Workspace Shell** e as ferramentas operacionais (**Sites**, **Mapas**, **Projetos/Pastas**, **Fontes**, **Resultados** e **Alterações**), eliminando duplicação de código entre rotas e protótipos obsoletos e aplicando estética matte minimalista inspirada no padrão **ChatGPT Desktop + Manus AI**.

---

## 2. Requisitos Normativos em Sintaxe EARS

### 2.1 Zero Duplicação & Arquitetura Compartilhada
- **[EARS-01]** *Where* o protótipo obsoleto `src/design-system/copilot/copilot-chat-workspace.tsx` não possui importadores em runtime, *the system shall* remover o arquivo legado mantendo `AIChatShell` como shell único canônico.
- **[EARS-02]** *When* o usuário acessar `/workspace/copilot` ou `/copilot`, *the system shall* compartilhar um controlador único de sessão (`useCopilotSession` em `src/hooks/use-copilot-session.ts`) e um despachante único de ações cliente (`dispatchCopilotClientAction` em `src/lib/copilot-action-dispatcher.ts`), também reutilizado por `WaesyCopilotDrawer`.

### 2.2 Workspace Shell (Coluna 1, Coluna 2 & Coluna 3)
- **[EARS-03]** *While* a barra lateral principal (`Coluna 1`, `56px`, `bg-rail`) estiver renderizada em desktop, *the system shall* exibir o indicador circular de status/uso acima do gatilho **squircle** (`rounded-xl`, nunca circular) de conta pessoal/workspace, além de atalho tátil direto **Sites** (`/workspace/builder`) com tooltip flutuante limpo `"Sites"` ao passar o mouse.
- **[EARS-04]** *While* a barra lateral secundária (`Coluna 2`, `224px`, `bg-sidebar`) estiver expandida no Workspace, *the system shall* exibir inline ao lado de `WorkspaceAccountSwitcher` o sino de notificações real (`NotificationBell`) e o botão tátil de busca rápida (abrindo `WorkspaceAllToolsDialog` via `Ctrl+K`/clique), respeitando piso de toque `min-h-11` e `:focus-visible`.

### 2.3 Copilot Shell Padrão ChatGPT Desktop + Manus Matte (`AIChatShell`, `ChatComposer`, `ChatArtifactCard`)
- **[EARS-05]** *When* o `AIChatShell` estiver ativo em qualquer viewport desktop, *the system shall* consolidar o cabeçalho superior em **uma única barra** (`h-14`) contendo à esquerda o ícone da pasta/conversa + título + chip de contexto e à direita apenas ações ghost minimalistas (menu `...` de sub-visões Habilidades/Agendamentos/Conectores/Métricas/Processos, alternador Computador e botão `PanelRight` para o inspetor contextual).
- **[EARS-06]** *When* a sidebar esquerda de conversas e projetos estiver aberta no Copilot, *the system shall* organizá-la no padrão matte minimalista: topo com identificador do espaço + gatilho de busca inline colapsável, linha sem bordas **"Novo chat"**, seções colapsáveis **"Fixados"** e **"Projetos"** (com árvores de pastas/projetos, recolhimento **"Mostrar mais"** acima de 5 itens e ações por hover/menu `...` para **Fixar/Desafixar**, **Renomear**, **Mover para Projeto**, **Arquivar** e **Excluir**).
- **[EARS-07]** *When* mensagens forem renderizadas no fluxo de conversa, *the system shall* exibir mensagens do usuário em pílula squircle alinhada à direita, respostas do assistente sem bordas em largura editorial (`max-w-3xl`) com tabelas limpas, barra mínima de ações sob a resposta (Copiar, Avaliar, Ouvir, Menu/Tentar novamente) e trilha discreta de marcadores de rolagem à esquerda em telas expandidas.
- **[EARS-08]** *When* o compositor (`ChatComposer`) for renderizado, *the system shall* apresentar uma superfície pílula matte (`rounded-2xl bg-card border border-border/60`) com botão `+` e chips rápidos de ferramentas (**Criar site**, **Mapas**, **Anexar arquivo**, indicador de **Acesso/Contexto**) e controles direitos de modo, voz e envio, sem cores neon, borrões (`backdrop-blur-*`) ou cores Tailwind literais.
- **[EARS-09]** *When* o inspetor contextual direito (`PanelRight`) estiver aberto, *the system shall* renderizar um cartão **squircle** matte elevado (`rounded-2xl`) contendo as seções interativas **Alterações**, **Resultados** (`+` / **"Criar um conteúdo"**) e **Fontes** (`+` / documentos do projeto e fontes grounded + **"Ver tudo"**), permitindo abrir qualquer artefato ou documento clicado inline ou no Editor Completo.

### 2.4 Fluxos Ponta a Ponta: Sites, Mapas, Fontes e Renomeação (UI -> BFF -> Bridge -> DB)
- **[EARS-10]** *When* o usuário acionar **"Criar site"** ou solicitar landing page/site no chat, *the system shall* classificar explicitamente a intenção `website_builder` (incluindo schema do Stage 1 LLM), gerar e persistir documento estruturado via `createBuilderArtifactFromCopilot({ docType: "website" })`, retornar fontes grounded e renderizar prévia visual de seções (`hero`, `features`, `pricing`, `cta`) dentro de `ArtifactBuilderEditor` com navegação direta para `/workspace/builder?doc=<id>`.
- **[EARS-11]** *When* o usuário acionar **"Mapas"** ou buscar estabelecimentos/locais, *the system shall* propagar as coordenadas reais `latitude` e `longitude` retornadas de `directory_listings` (ou fallback explícito da cidade apenas quando ausentes no banco), incluir fontes verificadas (`OpenStreetMap` / `Diretório Waesy`) no resultado da execução e renderizar mapa interativo real via `MapLibreCanvas` dentro de `ArtifactInteractiveMap` com seleção sincronizada entre marcadores do mapa e cards squircle.
- **[EARS-12]** *When* o usuário renomear uma conversa pelo menu `...` da sidebar, *the system shall* invocar `renameAiConversationThread` no BFF validando autoria/acesso de loja e persistir a alteração tanto em `ai_threads.title` quanto em `chat_threads.subject`.

---

## 3. Lista de Arquivos Autorizados para Mutação
- `src/design-system/copilot/copilot-chat-workspace.tsx` (exclusão do protótipo obsoleto)
- `src/hooks/use-copilot-session.ts` (novo — controlador unificado de sessão)
- `src/lib/copilot-action-dispatcher.ts` (novo — despachante compartilhado de ações)
- `src/types/chat.ts` (adição opcional de `sources?: ChatSourceItem[]` e `CopilotQuickToolMode`)
- `src/services/ai-conversations.functions.ts` (fix coordenadas reais do mapa, intenção `website_builder` / `interactive_map`, coleta de `sources`, adição de `renameAiConversationThread`)
- `src/components/chat/artifacts/ArtifactInteractiveMap.tsx` (embutir `MapLibreCanvas` real + remover paleta crua `emerald-*`)
- `src/components/chat/artifacts/ArtifactBuilderEditor.tsx` (renderização visual estruturada para `website` / `landing_page` + limpeza visual)
- `src/components/chat/copilot-message-renderer.tsx` (substituir cores cruas `slate-*`/`emerald-*` por tokens semânticos + tabelas editoriais limpas)
- `src/components/chat/chat-artifact-card.tsx` (card squircle clicável limpo, remoção de `bg-green-500` literal)
- `src/components/chat/chat-composer.tsx` (pílula matte com menu `+`, ferramentas **Criar site** e **Mapas**, chip de contexto e controles limpos)
- `src/components/chat/ai-chat-shell.tsx` (cabeçalho único, sidebar ChatGPT Desktop com Fixados/Projetos/Mostrar mais/menu `...`, stream editorial + minimap, cartão direito squircle `Alterações`/`Resultados`/`Fontes`)
- `src/components/chat/waesy-copilot-drawer.tsx` (consumo do despachante unificado e superfície matte limpa)
- `src/routes/workspace.copilot.tsx` (redução via `useCopilotSession` + micro-trilho lateral compatível / integração limpa)
- `src/routes/_store.copilot.tsx` (redução via `useCopilotSession` + paridade completa com hierarquia)
- `src/components/workspace/workspace-shell.tsx` (Col 1 squircle `EX`/usuário + anel de status + atalho Sites; Col 2 `NotificationBell` + Busca rápida inline ao switcher)
- `src/services/copilot-chatgpt-e2e-refactor.test.ts` (novo — regressão cobrindo EARS-01 a EARS-12)
- `docs/design/DECISIONS.md` (registro `DEC-500`)

---

## 4. Gates de Qualidade e Critérios de Aceite
- `npm.cmd run lint:design`: zero novas violações P0/P1 nos arquivos modificados (`--ratchet` aprovado).
- `node scripts/audit-interactive-buttons.mjs`: zero violações P0/P1/P2.
- `npm.cmd run check:tokens`, `check:schema`, `check:bff`, `check:route-budget`: Exit Code 0.
- `npm.cmd run build`: Exit Code 0.
- Todos os testes direcionados e regressões do módulo Copilot + Workspace Navigation + Multicolumn aprovados em Vitest.
