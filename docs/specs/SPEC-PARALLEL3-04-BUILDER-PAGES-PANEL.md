# SPEC-PARALLEL3-04 — Builder Pages Panel

## Escopo

Remediar exclusivamente `src/components/admin/builder/builder-pages-panel.tsx` para que as ações e a lista de páginas tenham estados de interface e foco acessíveis, sem alterar o CRUD, as rotas ou os contratos do componente.

### Achados comprovados

- A seleção de uma página é um `div` clicável sem semântica de controle, foco de teclado ou indicador `focus-visible`.
- Os botões de SEO, exclusão e fechamento do formulário usam alvos menores que 44 px e não declaram anel de foco visível no arquivo.
- O botão de fechar usa um caractere pictográfico, incompatível com a regra de interface sem emoji/caracteres pictográficos; deve usar um ícone Lucide já disponível no catálogo de dependências.
- A listagem vazia não possui estado vazio descritivo.
- A superfície usa `transition-all`, em desacordo com a transição específica exigida pelo lint.

O componente recebe uma coleção já materializada por `pages`; portanto, loading e erro assíncronos não fazem parte deste contrato e não serão inventados nem adicionados como props ou dados sintéticos.

## Requisitos EARS

- **EARS-01 (Ubíquo — contrato):** O componente DEVE preservar `BuilderPageItem`, `BuilderPagesPanelProps`, todas as props, callbacks, dados recebidos, rotas e chamadas de CRUD existentes.
- **EARS-02 (Quando — seleção):** Quando o usuário focar ou acionar uma página da lista por ponteiro ou teclado, o componente DEVE expor um controle semântico focável, indicar a página ativa e chamar `onSelectPage` com o mesmo `pageId` recebido.
- **EARS-03 (Quando — ações):** Quando o usuário acionar Nova, fechar, cancelar, SEO, salvar SEO ou excluir, cada controle DEVE ter alvo mínimo de 44 px, nome acessível quando for icon-only e foco visível via `focus-visible:ring-2`, preservando o callback original.
- **EARS-04 (Estado vazio):** Quando `pages.length === 0`, a lista DEVE renderizar uma mensagem honesta e orientativa de estado vazio, sem criar páginas, contadores ou metadados sintéticos.
- **EARS-05 (Estado de edição):** Enquanto SEO estiver aberto para uma página, os campos e ações de edição DEVEM continuar vinculados ao `id` e aos valores existentes, sem alterar a forma dos payloads de `onUpdatePageSeo`.
- **EARS-06 (Movimento):** Quando houver animação ou transição na superfície, o componente DEVE usar propriedades específicas e respeitar movimento reduzido.

## Invariantes

1. Nenhuma rota, serviço, persistência, contrato de prop ou assinatura de callback será alterado.
2. `onAddPage`, `onDeletePage`, `onDuplicatePage`, `onUpdatePageSeo`, `onSelectPage` e `onClose` mantêm seus tipos e semântica; não serão criados dados sintéticos.
3. Página inicial continua sem ação de exclusão; confirmação e mensagens existentes permanecem inalteradas.
4. O slug, a normalização de título, os estados locais e os toasts existentes permanecem funcionalmente equivalentes.
5. Todo controle interativo introduzido ou remediado no arquivo terá foco visível, alvo mínimo de 44 px e rótulo acessível quando necessário.
6. A listagem vazia é o único novo estado de dados; não há loading/error disponível no contrato atual.
7. Somente o componente autorizado e esta especificação podem aparecer no diff.

## Critérios de aceite

- [ ] `pages` não vazio mantém a seleção, SEO, exclusão, criação e demais callbacks sem mudança de contrato.
- [ ] Seleção de página funciona por teclado e ponteiro em controle semântico com estado ativo exposto.
- [ ] Ações icon-only possuem `aria-label`/`title` coerentes e foco visível.
- [ ] Controles interativos do painel usam altura/largura mínima de 44 px (`h-11`, `min-h-11` ou `size-11`).
- [ ] `pages.length === 0` mostra estado vazio descritivo sem inventar registros.
- [ ] Não há `transition-all`, emoji pictográfico, cor literal, classe arbitrária ou `!important` no arquivo.
- [ ] `git diff --check` passa.
- [ ] `npm run typecheck` passa.
- [ ] Design lint determinístico isolado do componente passa sem novo débito P0/P1.
- [ ] Commit criado com a mensagem `fix(design): remediate builder-pages-panel`; sem push ou merge.

## Evidências esperadas

- Diff restrito a este arquivo e a esta spec.
- Saída de `git diff --check`, `npm run typecheck` e do lint determinístico isolado do arquivo.
- Hash do commit final e estado limpo dos arquivos não autorizados.
