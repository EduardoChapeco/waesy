# SPEC-F07: Vitrine Pública do Marketplace (Cards de Produto com SSR e SEO Canônico)

## 1. Metadados e Controle Normativo
- **Fase:** F07 (Vitrine Pública do Marketplace por Loja).
- **Plano:** Plano Mestre de Estabilização e Desentrelaçamento dos 4 Pilares.
- **Autoridade:** BigTech Executive Board & Red Team.
- **Invariantes:** M01 (Zero Mocks), M02 (SSR / Hidratação Limpa), M03 (Auditabilidade), M08 (Integridade Transacional), M10 (Isolamento Multi-Tenant), WCAG 2.2 AA.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F07-01] Resolução e Renderização SSR da Vitrine por Store Slug
- **EARS (Quando acionado):** QUANDO o usuário navegar para a rota `/marketplace/$storeSlug`, O SISTEMA DEVE buscar os dados canônicos da loja (`stores`) e seus produtos com status ativo (`status = 'active'`) via cliente Supabase de leitura pública ou Server Function.

### [REQ-F07-02] Metadados Canônicos de SEO e OpenGraph
- **EARS (Ubíquo):** O SISTEMA DEVE declarar na rota meta tags `og:title`, `og:description`, e `canonical` baseadas no nome comercial da loja e descrição cadastrada, garantindo indexação e compartilhamento em redes.

### [REQ-F07-03] Matriz Completa de 4 Estados de Interface
- **EARS (Ubíquo):** A tela DEVE implementar a matriz completa de 4 estados:
  1. **Loading:** Skeleton grid adaptativo com placeholders de imagem e texto.
  2. **Empty:** Componente `<EmptyState />` padrão quando a loja não possuir produtos ativos cadastrados.
  3. **Data:** Grade de produtos com imagem, título conciso, selo de nicho, preço formatado e botão de ação direta.
  4. **Error / Not Found:** Estado claro com CTA de retorno ao Hub do Marketplace (`/marketplace`) quando a loja não existir.

### [REQ-F07-04] Ergonomia Visual, Design Silencioso e Acessibilidade (WCAG 2.2 AA)
- **EARS (Ubíquo):** Todos os controles táteis DEVEM possuir altura mínima de 44px (`h-11`), anel de foco visível `:focus-visible:ring-2`, tipografia da escala de tokens, ausência de valores arbitrários entre colchetes e respeito a `motion-reduce`.

### [REQ-F07-05] Navegação e Integração com Checkout B2C
- **EARS (Quando acionado):** AO selecionar um produto ou acionar compra/detalhe, O SISTEMA DEVE conduzir o usuário ao detalhe ou sacola transacional preservando o `store_id` e sem misturar com produtos de outros pilares (como classificados avulsos).

---

## 3. Critérios de Aceite e Métricas
1. Rota `src/routes/_store.marketplace.$storeSlug.tsx` implementada e registrada no router TanStack.
2. Suíte de testes `src/routes/_store.marketplace.$storeSlug.test.ts` com testes unitários passando.
3. `npm run typecheck` Exit Code 0.
4. `node scripts/design-lint.mjs --ratchet` Exit Code 0 com 0 violações P0 e 0 violações P1.
