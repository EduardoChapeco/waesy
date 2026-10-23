# SPEC-PARALLEL-02 — Remediação do Builder Add Panel

## 0. Metadados e controle

- **ID da spec:** SPEC-PARALLEL-02-BUILDER-ADD-PANEL
- **Título:** Remediação de foco, tokens e alvos táteis do painel de adição do Builder
- **Branch:** `paralelo/builder-add-panel`
- **Base:** `2dd4aad8bc0fcdbee34499f4384db5f4b74bccf4`
- **Data de aprovação:** 2026-10-22
- **Status:** CONCLUÍDO

## 1. Missão, escopo e não-objetivos

- **Missão:** Corrigir somente violações comprovadas de design no painel de três colunas do Builder, elevando o piso de foco de teclado, tokenização de cores/tipografia e áreas táteis sem mudar a criação de blocos ou seções.
- **Escopo incluído:**
  - `src/components/admin/builder/builder-add-panel-3col.tsx`
  - `docs/specs/SPEC-PARALLEL-02-BUILDER-ADD-PANEL.md`
- **Não-objetivos:** não alterar props, tipos, callbacks, eventos de negócio, rotas, catálogo, templates/dados de inserção, fluxo de fechamento, ordenação, filtros, documentos de decisão, lockfiles, relatórios gerados ou qualquer arquivo fora do escopo.

## 2. Requisitos EARS

- **Ubíquo:** O componente DEVE preservar os contratos `BuilderAddPanel3ColProps`, `onClose`, `onSelectTemplate` e `onInsertSingleBlock`, incluindo os mesmos argumentos e a mesma ordem de chamadas.
- **Ubíquo:** O componente DEVE consumir somente classes/tokens canônicos para cores, tipografia e dimensões, sem cores literais (`#HEX`, `rgb()`, `hsl()`) ou classes arbitrárias comprovadas no arquivo.
- **Acionado por evento:** QUANDO uma categoria ou subcategoria receber foco e ativação por teclado, o painel DEVE executar a mesma transição de seleção que o clique existente.
- **Acionado por evento:** QUANDO um cartão de template ou bloco individual receber ativação por teclado ou ponteiro, o painel DEVE chamar exatamente o callback já existente e, em seguida, `onClose`, sem criar estado ou dado novo.
- **Enquanto:** ENQUANTO um controle interativo estiver focado, o elemento DEVE expor anel `:focus-visible` de 2px com token de foco contrastante.
- **Enquanto:** ENQUANTO o painel estiver aberto em viewport compacto, botões e cartões acionáveis DEVEM manter alvo mínimo de 44x44px, sem reduzir o ícone visual.
- **Opcional:** ONDE houver transição de cor/opacidade/transformação, o componente DEVE declarar a propriedade específica e respeitar `motion-reduce`; nenhum gradiente decorativo DEVE ser introduzido.
- **Exceção:** SE a busca não encontrar templates, o estado vazio existente DEVE permanecer igual em conteúdo, condição e ação; não criar loading, erro ou dados sintéticos para esta alteração.

## 3. Invariantes de comportamento e dados

1. `isOpen === false` continua renderizando `null`.
2. A árvore `CATEGORY_TREE`, `SINGLE_BLOCKS`, `SINGLE_BLOCK_SUBCATEGORIES` e todos os valores de template permanecem semanticamente inalterados; somente valores de cor literal comprovados são referenciados por tokens CSS equivalentes.
3. A busca continua filtrando `sectionTemplates` por `name` e `description`; o modo `blocos` continua usando `SINGLE_BLOCKS[singleBlockSub]`.
4. Clique/ativação em categoria e subcategoria preserva os mesmos `setSelectedCatId`, `setSelectedSubId` e `setSingleBlockSub`.
5. Inserção de bloco individual continua chamando `onInsertSingleBlock(block.type)` e `onClose`; inserção de seção continua chamando `onSelectTemplate(template)` e `onClose`.
6. Nenhuma rota, prop, evento de negócio, contrato TypeScript, dado de catálogo ou estado novo é criado.
7. Não há gradiente no componente antes da mudança; o resultado final também não pode conter `bg-gradient-`, `linear-gradient`, `radial-gradient` ou `conic-gradient`.

## 4. Evidência da baseline e violações delimitadas

A inspeção da baseline `2dd4aad8` e do relatório existente identificou 25 ocorrências no arquivo autorizado:

- **P0 / DL-15:** cinco controles sem `focus-visible` (botões das linhas 282, 320 e 337; cartões acionáveis nas linhas 385 e 411).
- **P1 / DL-01:** três cores literais em dados de template (`hsl(0, 84%, 60%)`, `#25D366`, `#ffffff`).
- **P1 / DL-02:** oito classes arbitrárias (`text-[11px]`, `text-[10px]`, `text-[9px]`, `w-[380px]`).
- **P1 / DL-14:** um botão de fechar com `size-7`.
- **P2/P3 registrados, sem mudança de comportamento:** sombras decorativas (`shadow-2xl`, `shadow-md`) e `transition-all` também foram observados no relatório; a implementação substituirá apenas utilitários equivalentes quando isso for necessário para remover a violação comprovada sem alterar a interação.
- **Gradiente:** busca literal na baseline não encontrou gradiente no arquivo; o critério é preventivo para não introduzir regressão.

## 5. Critérios de aceite

1. O diff contém somente o componente autorizado e esta spec.
2. `git diff --check` termina com código 0.
3. `npm run typecheck` é executado no worktree; se falhar por diagnósticos pré-existentes fora do diff, a validação registra explicitamente a separação e os arquivos afetados.
4. O componente não contém cores literais, classes arbitrárias ou gradientes decorativos conforme as regras DL-01, DL-02 e DL-08.
5. Todo `<button>` e todo acionável de cartão possui `focus-visible:ring-2` (DL-15); o botão de fechamento e os cartões acionáveis têm mínimo de 44px (DL-14).
6. Os callbacks existentes são chamados exatamente uma vez por ativação e preservam seus argumentos.
7. O commit é criado com a mensagem exata `fix(design): remediate builder-add-panel`; não fazer push nem merge.

## 6. Evidência esperada no fechamento

- SHA do commit final e `git status --short` limpo após o commit.
- Saída/código de `git diff --check`.
- Saída/código de `npm run typecheck`, com distinção explícita entre falha nova e falha anterior ao diff quando aplicável.
- Busca negativa para cores literais, gradientes, classes arbitrárias, `transition-all` e controles sem `focus-visible` no arquivo autorizado.

## 7. Evidência registrada

- `git diff --check`: aprovado.
- `npm run typecheck`: aprovado após disponibilizar no worktree a árvore de dependências já existente; a primeira tentativa falhou somente porque o worktree recém-criado não possuía `node_modules/typescript`, sem diagnóstico TypeScript e sem relação com o diff.
- Design lint determinístico somente para o componente, executado em modo somente leitura via `lintFiles`: 0 violações totais, 0 P0, 0 P1, 0 P2 e 0 P3.
- Busca focal negativa para cores literais, gradientes, classes arbitrárias e `transition-all`; os acionáveis usam controles nativos, `focus-visible:ring-2` e alvos mínimos `min-h-11`/`min-w-11`.
- Nenhum relatório gerado, lockfile, `DECISIONS.md` ou arquivo fora do escopo foi alterado.
