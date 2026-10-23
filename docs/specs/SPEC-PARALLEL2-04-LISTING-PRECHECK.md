# SPEC-PARALLEL2-04 — Remediação do Listing Precheck

## 1. Escopo

Esta microfase remedia exclusivamente a superfície visual, acessível e responsiva de `src/components/ad-engine/editor/listing-precheck-dialog.tsx`, a partir de `HEAD b27deabf`.

É permitido criar apenas este documento de especificação além do componente autorizado. Não são permitidas alterações em validações, tipos, props, callbacks, rotas, dados, componentes compartilhados, `DECISIONS.md`, lockfiles ou relatórios gerados.

### Fora do escopo

- Alterar a composição de `items`, `validateListingNicheTaxonomy`, regras de título, preço, mídia, taxonomia ou contagens.
- Alterar as assinaturas, ordem, argumentos ou condições de `onOpenChange` e `onConfirmPublish`.
- Criar dados sintéticos, callbacks, estados de negócio ou fallbacks de sucesso.
- Alterar `Dialog`, `DialogContent`, `Button`, `Badge` ou qualquer primitiva compartilhada.
- Alterar textos, rotas, payloads ou contratos de integração.

## 2. Evidência da baseline

A auditoria determinística somente leitura do arquivo na baseline identificou cinco violações P1 comprovadas:

- **DL-18:** `text-white` no badge de sucesso.
- **DL-02:** `max-h-[50vh]` na lista de verificações.
- **DL-14:** `h-10` nos dois controles do rodapé.
- **DL-28:** `animate-spin` sem variante de movimento reduzido.

Os controles usam a primitiva `Button`, cujo contrato já fornece foco visível e piso tátil; esta microfase mantém essa garantia explícita no componente e não depende de comentários como evidência.

## 3. Invariantes protegidas

1. `ListingPrecheckDialogProps`, `PrecheckItem`, seus tipos e opcionalidade permanecem equivalentes.
2. A sequência e o conteúdo das validações, o cálculo de `failCount`, `warnCount` e `canPublish`, e todos os dados derivados de `listing` permanecem semanticamente inalterados.
3. `open`, `onOpenChange`, `listing`, `onConfirmPublish` e `isPublishing` continuam sendo as únicas entradas do componente; nenhum estado novo é criado.
4. O fechamento continua chamando `onOpenChange(false)` e a confirmação continua chamando `onConfirmPublish` sob as mesmas condições de `disabled`.
5. A matriz existente de `pass`, `warn`, `fail` e o estado de publicação (`isPublishing`) permanece intacta; apenas sua exposição visual e semântica pode ser reforçada.
6. O diálogo continua usando as primitivas canônicas e a rolagem continua contida no conteúdo/lista, sem sobreposição de rodapé ou perda da safe area em viewport compacto.
7. Cada controle focável mantém `focus-visible:ring-2` com token semântico e alvo mínimo de 44px (`h-11`/`min-h-11` ou `size-11`/`min-w-11`).
8. Nenhuma cor literal proibida, classe arbitrária, espaçamento fora da grade ou animação sem respeito a movimento reduzido é introduzida.

## 4. Requisitos EARS

### EARS-01 — Conteúdo do diálogo

**Quando** o diálogo estiver aberto em viewport compacto ou expandido, **o sistema deve** manter uma casca rolável e uma lista com limite de altura tokenizado, garantindo que cabeçalho, diagnóstico, verificações e rodapé permaneçam alcançáveis sem alterar os dados renderizados.

### EARS-02 — Foco visível

**Quando** qualquer controle de fechar, voltar ou confirmar receber foco via teclado, **o sistema deve** exibir anel `:focus-visible` de 2px com token de foco contrastante, preservando os handlers já existentes.

### EARS-03 — Alvos táteis

**Quando** os controles do rodapé forem renderizados em tela compacta, **o sistema deve** expor dimensão mínima canônica de 44px e permitir agrupamento seguro sem compressão ou overflow, sem alterar o callback associado.

### EARS-04 — Estados existentes

**Quando** o precheck apresentar pendências, avisos, aprovação ou publicação em andamento, **o sistema deve** manter os estados `fail`, `warn`, `pass` e `isPublishing`, tornando o diagnóstico e a atividade de publicação perceptíveis e anunciáveis sem inventar estados ou alterar regras.

### EARS-05 — Movimento reduzido

**Quando** o indicador de publicação estiver animado, **o sistema deve** interromper a animação para usuários que preferem movimento reduzido, mantendo o ícone e o texto existentes.

### EARS-06 — Preservação funcional

**Quando** o usuário fechar, voltar ao editor ou confirmar a publicação, **o sistema deve** executar os mesmos callbacks, argumentos, validações e condições da baseline.

## 5. Critérios de aceite

- [ ] O diff final contém somente o componente autorizado e esta spec.
- [ ] Não há `text-white`/`text-black`, classes arbitrárias de valor, ou `h-*`/`size-*` abaixo de `11` em controles interativos deste componente.
- [ ] Os controles têm foco visível real via `focus-visible:ring-2`; comentários não contam como conformidade.
- [ ] O conteúdo do diálogo e a lista de verificações usam limites/rolagem tokenizados, sem `max-h-[50vh]`.
- [ ] O badge de sucesso, o diagnóstico, os avisos e o estado de publicação continuam exibindo os mesmos dados e semântica de negócio; `isPublishing` continua bloqueando confirmação.
- [ ] O indicador animado possui tratamento `motion-reduce`.
- [ ] Nenhuma validação, prop, callback, rota, contrato ou dado é alterado.
- [ ] `git diff --check` termina com código 0.
- [ ] `npm run typecheck` é executado no worktree e seu resultado é registrado no fechamento.
- [ ] O lint determinístico do arquivo termina com zero violações P0/P1 e nenhum relatório gerado é incluído no diff.
- [ ] Não são alterados `DECISIONS.md`, lockfiles ou arquivos fora do escopo.

## 6. Evidência esperada

1. `git diff --check` no worktree `/home/ubuntu/waesy-parallel2-listing-precheck`.
2. `npm run typecheck` no mesmo worktree.
3. Lint determinístico somente do componente, em modo somente leitura, com contagem por severidade.
4. Verificação textual de preservação de `validateListingNicheTaxonomy`, contagens, `onOpenChange(false)`, `onConfirmPublish`, `disabled={!canPublish || isPublishing}` e `isPublishing`.
5. Commit `fix(design): remediate listing-precheck` no branch `paralelo2/listing-precheck`, sem push ou merge.
