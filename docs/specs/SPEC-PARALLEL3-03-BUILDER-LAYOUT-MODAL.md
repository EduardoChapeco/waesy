# SPEC-PARALLEL3-03 — Remediação do Builder Layout Modal

## 1. Escopo

Esta microfase remedia exclusivamente a superfície visual e acessível de `src/components/admin/builder/builder-layout-switcher-modal.tsx`, a partir de `HEAD 37cd62754b1a5c049a44fe747e9f684702053b2a`, no branch `paralelo3/builder-layout-modal`.

É permitido criar apenas este documento de especificação além do componente autorizado. Não são permitidas alterações em validações, tipos, props, callbacks, rotas, dados, componentes compartilhados, `DECISIONS.md`, lockfiles ou relatórios gerados.

### Fora do escopo

- Alterar, remover, reordenar ou inventar qualquer opção de `CANONICAL_LAYOUT_OPTIONS`, incluindo seus IDs, labels, descrições e ícones.
- Alterar `BuilderLayoutOption`, `BuilderLayoutSwitcherModalProps`, `currentNode`, a leitura de `layout_rules.variant` ou o fallback `grid`.
- Alterar a assinatura, ordem, argumentos ou condições de `onClose` e `onApplyLayout`.
- Criar estado, dados sintéticos, callbacks, rotas, persistência ou fallbacks de sucesso.
- Alterar `Button`, `Badge`, `cn`, ícones importados ou qualquer primitiva compartilhada.

## 2. Evidência da baseline

A auditoria determinística somente leitura, isolada no componente, encontrou 10 violações comprovadas:

- **P0 / DL-15:** o `<button>` de cada opção não declara foco visível `focus-visible:ring-2`.
- **P1 / DL-14:** o botão de fechar usa `size-8`, abaixo do alvo tátil mínimo de 44px.
- **P1 / DL-14:** o botão `Concluir` usa `h-8`, abaixo do alvo tátil mínimo de 44px.
- **P1 / DL-18:** o backdrop usa `bg-black/40` em vez do token semântico de overlay.
- **P1 / DL-02:** a grade usa `max-h-[65vh]` com valor arbitrário.
- **P1 / DL-02:** a descrição usa `text-[10px]` com valor arbitrário.
- **P1 / DL-02:** o ícone de seleção usa `stroke-[3]` com valor arbitrário.
- **P2 / DL-07:** a superfície interna usa `shadow-2xl` sem semântica explícita de diálogo.
- **P3 / DL-27:** o botão de opção usa `transition-all`.
- **P3 / DL-27:** o contêiner do ícone usa `transition-all`.

As entradas `animate-in` e as transições de hover existentes também exigem tratamento explícito de movimento reduzido conforme DL-28 e a constituição visual, sem remover a resposta visual para usuários que não solicitam redução.

## 3. Invariantes protegidas

1. A lista canônica continua contendo exatamente as seis opções existentes, com os mesmos IDs `grid`, `masonry`, `collage`, `slider`, `strip` e `column`, na mesma ordem, labels, descrições e ícones.
2. `BuilderLayoutOption` e `BuilderLayoutSwitcherModalProps` permanecem semanticamente equivalentes, com os mesmos tipos, opcionalidade e nomes.
3. O retorno antecipado para `!isOpen || !currentNode`, a leitura de `currentNode.layout_rules?.variant || "grid"` e todo o conteúdo de dados permanecem inalterados.
4. Clicar em uma opção continua chamando `onApplyLayout(layout.id)` uma vez e depois `onClose()`; fechar pelo X ou por `Concluir` continua chamando somente `onClose()`.
5. Nenhuma opção nova, estado de negócio, callback, rota, persistência ou dado sintético é criado.
6. O modal mantém a mesma casca central, grade de opções, rolagem interna e rodapé; apenas tokens, semântica e dimensões mínimas podem ser corrigidos.
7. Todo controle focável no componente expõe foco visível real com `focus-visible:ring-2` e token semântico, sem depender de comentário ou texto auxiliar.
8. Todo controle interativo mantém alvo mínimo de 44x44px em viewport compacto (`h-11`/`min-h-11` ou `size-11`/`min-w-11`).
9. O diálogo declara semântica acessível (`role="dialog"`, `aria-modal` e relações nome/descrição) sem introduzir uma árvore duplicada ou alterar o fluxo de foco dos callbacks.
10. Animações e transições existentes continuam funcionando para movimento normal, mas possuem alternativa `motion-reduce` explícita; `transition-all` não é usado.
11. O componente não introduz cores literais proibidas, classes arbitrárias, espaçamentos fora da grade ou alteração em arquivos fora do escopo.

## 4. Requisitos EARS

### EARS-01 — Semântica do diálogo

**Quando** o seletor de layout estiver aberto com `currentNode` válido, **o sistema deve** expor uma única superfície com papel de diálogo modal, nome acessível pelo título e descrição associada, mantendo a mesma estrutura visual e os mesmos dados.

### EARS-02 — Foco visível

**Quando** o usuário navegar por teclado entre fechar, opções e concluir, **o sistema deve** exibir anel `:focus-visible` de 2px com token semântico em cada controle focável, preservando os handlers existentes.

### EARS-03 — Alvos táteis

**Quando** os controles forem renderizados em viewport compacto, **o sistema deve** expor dimensão mínima de 44x44px para fechar, selecionar uma opção e concluir, sem alterar rótulos, callbacks ou sequência de aplicação.

### EARS-04 — Movimento reduzido

**Quando** o usuário preferir movimento reduzido, **o sistema deve** desativar as animações/transições ativas do backdrop, superfície e estados hover/seleção por meio de variantes `motion-reduce`, mantendo a opção selecionada, seus dados e sua affordance visual estática.

### EARS-05 — Layout e rolagem

**Quando** o modal for exibido em viewport compacto ou expandido, **o sistema deve** manter a grade de opções contida em limite de altura tokenizado com rolagem interna, sem oclusão do cabeçalho ou rodapé e sem valores arbitrários.

### EARS-06 — Preservação funcional

**Quando** o usuário escolher um layout ou fechar o modal, **o sistema deve** executar os mesmos callbacks, argumentos e condições da baseline, sem alterar qualquer opção canônica ou dado de `currentNode`.

## 5. Critérios de aceite

- [ ] O diff final contém somente `src/components/admin/builder/builder-layout-switcher-modal.tsx` e esta spec.
- [ ] As seis opções canônicas permanecem idênticas em conteúdo, ordem e quantidade.
- [ ] O diálogo possui nome/descrição acessíveis e `role="dialog"`/`aria-modal` sem alterar o fluxo funcional.
- [ ] Não há `bg-black`/`text-black`/`text-white`, classes arbitrárias ou controles com `h-*`/`size-*` abaixo de 11 no componente.
- [ ] Todos os controles têm foco visível real via `focus-visible:ring-2`.
- [ ] Não há `transition-all`; animações e transições têm tratamento `motion-reduce` explícito.
- [ ] Não há alteração de tipos, props, callbacks, rotas, contratos ou dados.
- [ ] `git diff --check` termina com código 0.
- [ ] `npm run typecheck` termina com código 0.
- [ ] O design lint determinístico executado somente sobre este arquivo termina sem violações P0/P1 e nenhum relatório gerado é incluído no diff.
- [ ] Não são alterados `DECISIONS.md`, lockfiles ou arquivos fora do escopo.
- [ ] O commit é `fix(design): remediate builder-layout-modal`, sem push ou merge.

## 6. Evidência esperada

1. Baseline e lint final via `lintFiles([arquivo autorizado])`, em modo somente leitura e sem gravar relatório.
2. `git diff --check` no worktree `/home/ubuntu/waesy-parallel3-builder-layout-modal`.
3. `npm run typecheck` no mesmo worktree.
4. Verificação textual da preservação de seis IDs, `currentNode.layout_rules?.variant || "grid"`, `onApplyLayout(layout.id)`, `onClose()` e do retorno antecipado.
5. Commit no branch `paralelo3/builder-layout-modal`, sem push ou merge.
