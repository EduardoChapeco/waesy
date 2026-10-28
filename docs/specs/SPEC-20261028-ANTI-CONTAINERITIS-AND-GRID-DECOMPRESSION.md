# SPEC-20261028-ANTI-CONTAINERITIS-AND-GRID-DECOMPRESSION
## Erradicação de Containeritis (Card-in-Card), Descompressão de Grades e Otimização de Espaço Mobile

### 1. Contexto & Diagnóstico
O usuário identificou anomalias críticas de layout decorrentes de "AI Smell" e containeritis crônica:
1. **Cards dentro de Card (Double Border):** Em `src/components/home/HomeDesktopWebApp.tsx`, o loop de lojas `storeFeedItems.map(...)` renderizava `<div key={store.id} className="rounded-xl border border-border/60 bg-card px-2">` envolvendo diretamente `<IFoodStoreFeedCard store={store} variant="list" ... />`, que por sua vez já é uma superfície com `rounded-2xl bg-card border border-border/60 p-3`. Isso gerava borda dupla visível, preenchimento interno comprimido e layout amador.
2. **Compressão Anômala em 3 Colunas no Desktop:** A grade de lojas usava `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Em desktops widescreen onde a barra lateral do AppShell já ocupa 280px, 3 colunas reduzem a largura de cada cartão horizontal para ~280px, espremendo título ("11º Batalhão de Polícia Militar de Fronteira"), categoria e ícone de favorito.
3. **Paddings Laterais Acumulados no Mobile:** Em dispositivos móveis (< 600px), a combinação de padding do AppShell + padding do container de página + padding de seções consome mais de 30% da largura útil da tela, deixando a área central espremida.
4. **Reescrita Desnecessária de Arquivos ("Balde"):** Violação da Regra Pétrea B.7 (Anti-Reescrita), que exige mutação cirúrgica com `edit_file`.

### 2. Requisitos EARS (Easy Approach to Requirements Syntax)

- **REQ-01 (Ubíquo - Single Surface):** O sistema SEMPRE deverá renderizar cada cartão visual como uma superfície única com exatamente uma borda estrutural (`Single Surface Rule`), sendo terminantemente proibido aninhar um contêiner com borda e background (`rounded-* border bg-card`) diretamente como wrapper de componentes de cartão (`IFoodStoreFeedCard`, `OfferCard`, `StoreCard`, `ClassifiedItemCard`, `DirectoryBusinessCard`).
- **REQ-02 (Ubíquo - Descompressão Desktop):** O sistema SEMPRE deverá renderizar cartões de layout horizontal (logo + título + metadados em linha) no desktop em no máximo 2 colunas (`grid grid-cols-1 lg:grid-cols-2 gap-4`), garantindo largura útil mínima de 400px por cartão ao lado do menu lateral de 280px.
- **REQ-03 (Ubíquo - Descompressão Mobile):** O sistema SEMPRE deverá preservar no mínimo 92% da largura útil da viewport móvel (< 600px) para o conteúdo, utilizando `px-0 sm:px-4` nos contêineres de rotas públicas e proibindo a soma de paddings laterais aninhados.
- **REQ-04 (Orientado a Eventos - Grid Nesting):** QUANDO uma grade (`grid`) for declarada como filha de outra grade, ELA DEVE obrigatoriamente declarar `col-span-full` ou pertencer a um componente atômico autocontido, prevenindo o esmagamento de itens em subgrades aninhadas.
- **REQ-05 (Normativo - Gates DL-31 e DL-32 no Design Lint):** O script `scripts/design-lint.mjs` DEVE conter verificadores determinísticos DL-31 (Containeritis / Card-in-Card) e DL-32 (Grade dentro de Grade / Compressão Anômala de Colunas), bloqueando qualquer regressão no CI.
- **REQ-06 (Mutação Cirúrgica):** TODA alteração de código DEVE utilizar estritamente edições contíguas cirúrgicas (`edit_file`), preservando 100% dos imports, hooks e lógicas vizinhas sem reescrever arquivos inteiros.

### 3. Invariantes
- Invariante 1: Zero nós DOM com `border bg-card` aninhados diretamente em outros nós com `border bg-card` em listas públicas.
- Invariante 2: Zero erros de compilação TypeScript (`npm run typecheck` com código de saída 0).
- Invariante 3: Zero regressões no design lint (`node scripts/design-lint.mjs --ratchet` com status PASS).
- Invariante 4: Altura e ergonomia de toque mínima de 44px (`h-11 min-h-11`) preservadas em todos os controles interativos.

### 4. Evidências Esperadas
- Diff cirúrgico em `src/components/home/HomeDesktopWebApp.tsx`.
- Diff cirúrgico em `src/components/builder/blocks/vitrine-app-blocks.tsx`.
- Inclusão dos Gates DL-31 e DL-32 em `AGENTS.md`, `.agents/AGENTS.md` e `docs/design/DESIGN-LINT.md`.
- Verificação mecânica no design linter (`scripts/design-lint.mjs`).
- Execução dos testes automatizados e typecheck limpo.
