# SPEC-20261027: Correção End-to-End de Páginas Quebradas, Navegação e Limpeza Resiliente

## 1. Contexto e Declaração do Problema
Ao navegar no produto e visitar páginas criadas pelo usuário, vitrines comerciais ou links internos, ocorriam erros 404/not_found, telas brancas ou falhas de carregamento decorrentes de:
1. Validação restritiva de `document_type` em `getPublicExperienceDocumentBySlug`, forçando `storefront` em páginas de campanha/customizadas.
2. Incompatibilidade entre os campos de snapshot do OmniBuilder (`omni_page_published`, `omni_page_draft` e `omni_page`).
3. Ausência de `BlockErrorBoundary` no `OmniPageRenderer.tsx`, permitindo que falhas isoladas em blocos derrubassem a página inteira.
4. Links para rotas canônicas utilizando o prefixo interno `/_store/` que é uma rota de layout sem segmento público.
5. Inconsistência de fallback em `getPublicStoreProfile` para estabelecimentos cadastrados no diretório local.

## 2. Requisitos em Sintaxe EARS

### EARS-01: Resolução de Documentos Públicos por Slug
- **Quando** o usuário acessar a rota pública `/paginas/$slug` com qualquer tipo de documento (`campaign`, `storefront`, `custom`, `landing_page`),
- **O sistema DEVE** localizar o documento ativo correspondente pelo slug, independente do `document_type` inicial cadastrado, e extrair o snapshot do OmniBuilder a partir de `omni_page_published`, `omni_page` ou `omni_page_draft`.

### EARS-02: Isolamento Defensivo de Blocos
- **Quando** o `OmniPageRenderer` renderizar a lista de blocos de uma página pública,
- **O sistema DEVE** envelopar cada bloco em um `BlockErrorBoundary` para que eventuais falhas em um componente específico não impeçam a renderização dos demais blocos da página.

### EARS-03: Resolução Resiliente de Perfis de Loja
- **Quando** o usuário acessar `/loja/$slug`,
- **O sistema DEVE** resolver o estabelecimento pesquisando primeiro em `stores` (por id ou slug) e, caso não localizado, pesquisar em `directory_listings`, garantindo que cadastros válidos nunca exibam tela de não encontrado.

### EARS-04: Correção de Links Internos de Rota
- **Quando** links navegarem para módulos da vitrine (`/mural`, `/voucher/$token`),
- **O sistema DEVE** utilizar caminhos canônicos sem o prefixo `/_store/`.

## 3. Arquivos Autorizados no Escopo
1. `src/services/builder.functions.ts`
2. `src/routes/_store.paginas.$slug.tsx`
3. `src/components/builder/OmniPageRenderer.tsx`
4. `src/services/catalog.functions.ts`
5. `src/routes/_store.c.$slug.tsx`
6. `src/routes/viajante.viagem.$id.tsx`
7. `src/components/commerce/dynamic-sections/travel-product-detail.tsx`

## 4. Critérios de Aceite e Evidências
- [ ] Zod schema de `getPublicExperienceDocumentBySlug` aceita `document_type` opcional sem forçar default `storefront`.
- [ ] Páginas salvas como `omni_page_published` ou `omni_page_draft` são renderizadas com sucesso no `OmniPageRenderer`.
- [ ] Cada bloco no `OmniPageRenderer` possui isolamento de erro via `BlockErrorBoundary`.
- [ ] Testes automatizados executados com sucesso.
- [ ] Compilação TypeScript limpa (`typecheck`).
