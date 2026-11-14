# SPEC-20261114 — Refatoracao E2E de Propostas (Sheet + Grid) e Cotacoes

## 1. Contexto e Objetivo
A tela `/workspace/turismo/propostas` (`src/routes/workspace.turismo.propostas.index.tsx`) e o fluxo ponta a ponta entre cotações recebidas (`/workspace/turismo/cotacoes`), criação/edição de propostas (`travel-proposal.functions.ts`) e visualização pública do cliente (`_store.proposta.$token.tsx`) apresentam lacunas visuais, funcionais e de segurança:
1. O layout atual exibe exclusivamente uma grade com múltiplos botões primários concorrentes ("Abrir Studio"), sem modo Lista/Planilha (Sheet) denso e sem edição rápida inline.
2. Os controles de privacidade, ocultamento e proteção por senha eram simulados por prefixos de texto em `special_notes` (`[SENHA:...]`), com vazamento de `access_pin` no DTO público e ausência total de bloqueio real na rota `_store.proposta.$token.tsx`.
3. A filtragem por abas no BFF zera os contadores das demais abas e `bundleTravelProposalsIntoSingleLink` não garante `valid_until` futuro.
4. O módulo de cotações (`tourism.functions.ts` + `workspace.turismo.cotacoes.tsx`) não exibe contagem/links das propostas vinculadas a cada cotação e carece de verificação estrita de tenant em updates/deletes.

Este documento especifica a refatoração completa em 4 camadas (Banco/RLS -> BFF Server Functions -> UI Workspace + Rota Pública -> Testes E2E).

## 2. Requisitos em Sintaxe EARS

### R1. Visualização Dual (Modo Lista/Sheet e Modo Grid Refinado)
- **WHEN** um operador de turismo acessa `/workspace/turismo/propostas`, **THE SYSTEM SHALL** disponibilizar alternância explícita entre **Lista (Sheet)** e **Grade (Cards)** no `viewSwitcher` da `WorkspaceCanonicalToolbar`, persistida por dispositivo/sessão de navegação (`localStorage`).
- **WHEN** a viewport for compacta (`< 600px`, `useWindowSizeClass()`), **THE SYSTEM SHALL** renderizar cartões móveis empilhados com alvos táteis mínimos de `44x44px` (`h-11 min-h-11`), sem árvores DOM ocultas duplicadas e sem compressão horizontal de colunas.
- **THE SYSTEM SHALL** manter no máximo 1 botão primário (`variant="default"`) na superfície principal (`+ Nova Proposta`), removendo botões primários repetidos nos cartões e linhas da tabela.

### R2. Edição Inline Rápida na Lista e nos Cards
- **WHEN** o usuário aplica duplo clique no título da proposta (ou aciona o botão de edição inline de título por teclado), **THE SYSTEM SHALL** transformar o título em `<Input>` focado inline, confirmando com `Enter` ou `onBlur` via `updateTravelProposal` e cancelando com `Escape` sem recarregar a página.

### R3. Privacidade, Ocultamento e Bloqueio Real por Senha (4 Camadas)
- **WHEN** o operador alterna **Privada** (`visibility_mode = "private"`), **Somente Link** (`"link_only"`), **Pública** (`"public"`) ou **Oculta/Arquivada** (`is_hidden = true`), **THE SYSTEM SHALL** persistir no Postgres (`travel_proposals`), aplicar imediatamente de forma otimista/reativa e oferecer ação **Desfazer** no toast para transições reversíveis (Ocultar/Privacidade).
- **WHEN** o operador define proteção por senha/PIN (`visibility_mode = "password"`), **THE SYSTEM SHALL** armazenar o hash SHA-256 com sal específico da proposta em `access_pin_hash` no servidor e **NEVER SHALL** retornar senha em texto claro ou `access_pin_hash` para o navegador em respostas públicas (`toPublicTravelProposalDTO`).
- **WHEN** um visitante acessa `/proposta/$token` de uma proposta privada ou oculta, **THE SYSTEM SHALL** bloquear a exibição do conteúdo comercial, preços e aceite online e apresentar aviso estruturado de acesso restrito.
- **WHEN** um visitante acessa `/proposta/$token` de uma proposta protegida por senha sem comprovação prévia válida, **THE SYSTEM SHALL** retornar metadados mínimos redatados (`access_locked: true`, `lock_reason: "pin_required"`) e exigir validação server-side em `verifyTravelProposalAccessPin` antes de liberar o conteúdo completo, exportação em PDF ou aceite.

### R4. Ações Rápidas, Visualização Instantânea e Exportação Direta (PDF / PNG / CSV / JSON)
- **WHEN** o operador clica no ícone da proposta ou no botão de visualização rápida em qualquer linha/card, **THE SYSTEM SHALL** abrir o painel `QuickPreviewDrawer` exibindo os modos **Apresentação Editorial** e **Lâmina Studio (Canvas)** sem sair da página.
- **WHEN** o operador aciona **Exportar PDF** ou **Exportar PNG** diretamente em uma linha da lista, em um card ou no Quick Preview, **THE SYSTEM SHALL** renderizar o `ProposalCanvasRenderer` correspondente em contêiner dedicado fora da área visível e gerar o download real via `exportElementAsPdf` / `exportElementAsImage`.
- **THE SYSTEM SHALL** disponibilizar na lista e nos cards ações rápidas acessíveis (mínimo `size-11 min-h-11`, `focus-visible:ring-2`): Visualizar rápido, Copiar link (com opção 1-clique para publicar rascunho), Abrir página própria (`/proposta/$token`), Abrir Studio (`/workspace/turismo/propostas/$id`), Exportar (PDF/PNG/JSON), Enviar no WhatsApp, Duplicar, Alternar privacidade/ocultar, Converter em viagem (quando aplicável) e Excluir.

### R5. Contadores Reativos, Vínculo Cotações <-> Propostas e Higiene de Dados
- **THE SYSTEM SHALL** preservar contadores reais de todas as abas (`Todas`, `Rascunhos`, `Publicadas`, `Aprovadas`, `Privadas / Senha`, `Ocultas`) sem zerar contagens ao selecionar um filtro específico.
- **WHEN** `bundleTravelProposalsIntoSingleLink` publica um comparativo consolidado, **THE SYSTEM SHALL** garantir `valid_until` válido futuro, `visibility_mode` acessível e atualização atômica do `snapshot_hash`.
- **WHEN** `duplicateTravelProposal` duplica uma proposta, **THE SYSTEM SHALL** criá-la em status `"draft"` com contadores/aceite zerados e novo `public_token`.
- **THE SYSTEM SHALL** enriquecer `listAgencyTravelQuotes` com contagem e referência das propostas vinculadas (`linked_proposals_count`, `linked_proposals`), e exigir pertencimento explícito ao tenant (`store_id`) em `updateAgencyTravelQuote` e `deleteAgencyTravelQuote`.

## 3. Escopo de Arquivos
- **SQL Migration:** `supabase/migrations/20270411000000_travel_proposals_visibility_security_and_quote_sync.sql`
- **BFF:**
  - `src/services/travel-proposal.functions.ts`
  - `src/services/tourism.functions.ts`
- **Componentes Modulares de UI (`src/components/tourism/proposals/`):**
  - `ProposalQuickPreviewSheet.tsx`
  - `ProposalPasswordDialog.tsx`
  - `ProposalsSheetTable.tsx`
  - `ProposalGridCard.tsx`
- **Rotas:**
  - `src/routes/workspace.turismo.propostas.index.tsx`
  - `src/routes/_store.proposta.$token.tsx`
  - `src/routes/workspace.turismo.cotacoes.tsx`
- **Testes:**
  - `src/services/travel-proposal-security-and-e2e.test.ts`

## 4. Critérios de Aceite e Gates
1. `npm.cmd run check:schema` e `npm.cmd run check:bff` aprovados com código de saída 0.
2. `node scripts/design-lint.mjs --ratchet` aprovado sem regressões e zero violações P0/P1 nos arquivos modificados/criados.
3. Testes Vitest cobrindo: bloqueio de proposta privada/oculta, redação de DTO público, verificação de PIN (positivo, negativo e legado `[SENHA:...]`), atualização inline, duplicação em rascunho, validade em agrupamento, e isolamento de tenant em cotações.
4. `npm.cmd run typecheck` e `npm.cmd run build` concluídos com código de saída 0.
