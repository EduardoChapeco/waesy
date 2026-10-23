# SPEC-PARALLEL-06 — Remediação do Listing Editor

## 1. Escopo

Esta microfase remedia somente a superfície visual e de interação de `src/components/ad-engine/editor/unified-listing-editor.tsx`.

É permitido criar este documento em `docs/specs/SPEC-PARALLEL-06-LISTING-EDITOR.md`. Não são permitidas alterações em schemas, tipos, props, callbacks, eventos, rotas, dados, `DECISIONS.md`, lockfiles ou relatórios gerados.

### Fora do escopo

- Alterar `listingCreationSchema` ou qualquer outro schema.
- Alterar as assinaturas ou a ordem de `onSaveDraft`, `onPublish`, `onBack` e `onOpenMasterCatalog`.
- Criar novos dados de anúncio, callbacks ou estados de negócio.
- Alterar componentes filhos, primitivas compartilhadas ou estilos globais.
- Adicionar estados sintéticos de carregamento, vazio ou erro que não existam no contrato atual.

## 2. Invariantes protegidas

1. O contrato público de `UnifiedListingEditorProps` permanece equivalente em nomes, tipos e opcionalidade.
2. `listingCreationSchema.safeParse` continua recebendo os mesmos campos e a publicação continua usando os mesmos payloads e status (`draft`/`active`).
3. Os estados existentes `saved`, `saving` e `unsaved`, assim como `isSavingDraft`, `isPublishing`, `isPrecheckOpen`, `showLivePreview` e `isSplitLayout`, permanecem as únicas fontes de estado desta superfície.
4. Todos os handlers, rotas, dados, imports funcionais e componentes filhos continuam sendo usados com o mesmo comportamento.
5. Nenhum valor arbitrário de cor, espaçamento, sombra, schema ou callback é introduzido.
6. Todo controle interativo deste arquivo conserva foco visível por teclado com anel de 2px e alvo mínimo de 44px.
7. O espaçamento novo ou ajustado segue a grade modular de 4px.

## 3. Requisitos EARS

### EARS-01 — Alvos táteis

**Quando** o editor renderizar controles de voltar, alternância de modo, preview, salvamento, publicação ou confirmação de saída, **o sistema deve** expor uma dimensão mínima canônica de 44px (`h-11`/`size-11`), sem alterar o handler associado.

### EARS-02 — Foco visível

**Quando** qualquer controle do editor receber foco via teclado, **o sistema deve** renderizar `:focus-visible` com anel de 2px e contraste semântico, preservando a ação existente e sem depender de comentário como evidência de acessibilidade.

### EARS-03 — Grade e adaptação

**Quando** a barra de ações e os rodapés forem renderizados em viewport compacto, **o sistema deve** permitir agrupamento e quebra seguros usando somente espaçamentos da grade de 4px, evitando compressão ou overflow dos controles.

### EARS-04 — Estados existentes

**Quando** o estado de salvamento mudar entre `saved`, `saving` e `unsaved`, **o sistema deve** expor a mudança de forma anunciável e manter o bloqueio já existente durante o salvamento explícito, sem inventar um novo estado ou alterar callbacks.

### EARS-05 — Preservação funcional

**Quando** o usuário alternar modo, abrir/fechar preview, salvar, publicar, voltar ou descartar alterações, **o sistema deve** executar os mesmos callbacks, payloads, validações e transições de estado da baseline.

## 4. Critérios de aceite

- [ ] Apenas o componente autorizado e esta spec aparecem como arquivos modificados/criados.
- [ ] Não há `h-*`/`size-*` abaixo de `11` em elementos interativos deste componente.
- [ ] Cada controle interativo mantém `focus-visible` real no atributo de classe; comentários não contam como conformidade.
- [ ] Barra de ações e rodapé não comprimem os alvos táteis em viewport compacto.
- [ ] O status de salvamento mantém os três valores e fica exposto via região `aria-live` sem novo estado de negócio.
- [ ] Schemas, props, callbacks, eventos, rotas e dados permanecem inalterados.
- [ ] `git diff --check` passa.
- [ ] `npm run typecheck` é executado no worktree; qualquer falha anterior ao diff é registrada no fechamento.
- [ ] A revisão final confirma que não foram alterados `DECISIONS.md`, lockfiles ou relatórios gerados.

## 5. Evidência esperada

1. `git diff --check` no worktree `/home/ubuntu/waesy-parallel-listing-editor`.
2. `npm run typecheck` no mesmo worktree, com saída e classificação de baseline registradas no resultado.
3. Diff restrito a este componente e a esta spec, revisado contra `HEAD 2dd4aad8`.
4. Verificação textual dos handlers, schema, payloads e estados preservados.
5. Commit `fix(design): remediate listing-editor` no branch `paralelo/listing-editor`, sem push ou merge.
