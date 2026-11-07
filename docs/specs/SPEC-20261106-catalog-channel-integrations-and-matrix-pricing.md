# SPEC-20261106-catalog-channel-integrations-and-matrix-pricing: Prevenção de Falso-Positivo em Canais Externos, Preço Âncora da Matriz e Sincronização de Estoque

## 1. Contexto e Problema Empírico
1. **Falso-Positivo em Canais de Divulgação Externa:**
   Na aba "Preço & Grade 2D" (`product-pricing-tab.tsx`), o operador pode marcar switches para Google Merchant Center, Sacolinha Instagram/Meta, Mercado Livre e Delivery Externo mesmo quando a loja **não possui as respectivas credenciais conectadas** em `/workspace/configuracoes/integracoes`. Isso gera uma falsa ilusão de que o produto está ativo e sincronizando com feeds e marketplaces globais.
2. **Descolamento do Preço Padrão do Anúncio com a Matriz 2D:**
   Ao cadastrar variações de produto com preços de exceção na grade 2D (ex: Tam 38 = R$ 36,00, Tam 39 = R$ 38,00, Tam 40 = R$ 50,00), o campo "Preço de Venda (R$)" do produto pai permanece estático no valor manual antigo (R$ 38,00) e a prévia do anúncio (`ProductPreviewPane`) continua exibindo R$ 38,00 em vez do menor preço real da matriz ("A partir de R$ 36,00").
3. **Furo de Estoque entre Cabeçalho e Grade:**
   O campo "Estoque Inicial" exibe unidades manuais (ex: 10 un) descoladas da soma real das linhas da grade (1 + 5 + 3 = 9 un), gerando inconsistência física e na prévia da vitrine.

## 2. Requisitos em Sintaxe EARS

### [EARS-01] Prevenção de Falso-Positivo e Telemetria de Canais
*QUANDO* a aba de precificação for exibida,
*O SISTEMA DEVE* consultar o status real de conexão de cada canal (`google_merchant`, `meta_instagram`, `mercadolivre`, `ifood`) para a loja ativa, exibir selo visual explícito (`Conectado` vs `Não Conectado`) e alertar o operador com link de ativação caso tente habilitar um canal desconectado.

### [EARS-02] Derivação do Preço Âncora pela Matriz de Variações
*QUANDO* a grade 2D de variações contiver itens com preços cadastrados,
*O SISTEMA DEVE* identificar o menor preço efetivo ($\min_{v} (v.\text{override} \mathbin{??} \text{basePrice})$), indicar a faixa de variação na interface de precificação com atalho de 1 clique para sincronizar, e garantir que a gravação em `products.price_cents` reflita o menor preço de entrada para vitrines, buscas e feeds.

### [EARS-03] Soma Canônica de Estoque da Grade
*QUANDO* existirem variações ativas na matriz,
*O SISTEMA DEVE* sincronizar o estoque total do anúncio pai com a soma estrita do estoque de todas as variações ($\sum_{v} v.\text{stock}$), bloqueando furos de inventário e refletindo o saldo exato na prévia.

### [EARS-04] Prévia de Vitrine Fidedigna
*QUANDO* o componente `ProductPreviewPane` renderizar um produto configurável com variações,
*O SISTEMA DEVE* inspecionar a matriz de variantes e exibir "A partir de R$ X,XX" (ou a faixa de preço) e a contagem real de estoque e variações disponíveis.

### [EARS-05] Alimentação Bidirecional de Fotos de Variações na Galeria Principal
*QUANDO* a grade de variações possuir imagens cadastradas nas variantes ou atributos (ex: cores),
*O SISTEMA DEVE* detectar automaticamente tais fotos na aba "Fotos" (`ProductMediaTab`), permitir puxá-las individualmente ou em lote para a galeria do anúncio pai sem duplicidade, e manter o upload direto de fotos/vídeos individuais ativo.

### [EARS-06] Tolerância e Fallback Visual de Capa na Prévia
*QUANDO* a galeria principal do anúncio ainda não contiver fotos mas a grade possuir ao menos uma imagem de variação cadastrada,
*O SISTEMA DEVE* utilizar a foto da variação como capa provisória na prévia do anúncio, eliminando o estado "Sem foto de capa" e enriquecendo o carrossel.

### [EARS-07] Resolução Resiliente de Loja Multi-Tenant sem Falso-Negativo (DEC-455)
*QUANDO* qualquer formulário do Workspace ou criador de catálogo (`createProduct`, `createCategory`, `createStoreBrand`, `createProductType`, `createCollection`, etc.) for submetido,
*O SISTEMA DEVE* resolver o identificador de loja de forma tolerante a partir da cadeia hierárquica `input.store_id` $\rightarrow$ `clientTenant` (cookie) $\rightarrow$ `identity.store_id` $\rightarrow$ `identity.memberships[0].store_id` $\rightarrow$ `stores` (fallback para platform admins), garantindo que operadores e administradores nunca sofram falsa rejeição ("Nenhuma loja ativa selecionada") enquanto operam autenticados.

## 3. Critérios de Aceite e Evidências
- [x] Utilitário puro em `src/lib/catalog-channel-integrations.ts` com funções determinísticas de cálculo, resolução de status e extração de fotos (`extractVariantImages`).
- [x] Testes unitários em `src/lib/__tests__/catalog-channel-integrations.test.ts` (8/8 testes aprovados).
- [x] Server Function `getStoreChannelIntegrationsStatus` em `src/services/admin-catalog.functions.ts` consultando `integration_credentials` e `marketplace_connectors`.
- [x] `ProductPricingTab` exibindo badges de status para os 4 canais com alerta de canal desconectado e link para configuração.
- [x] `ProductPreviewPane` recebendo `variants`, exibindo menor preço, soma de estoque e fotos de variações como capa de prévia quando galeria vazia.
- [x] `ProductMediaTab` com detecção de fotos de variações, botão de lote para puxar fotos da grade, botões individuais e dropzone direto preservado.
- [x] Resolução resiliente de loja em `src/lib/identity.server.ts`, `src/services/store.functions.ts` e `src/services/admin-catalog.functions.ts` com função `resolveStoreIdWithFallback`.
- [x] Fallback no cliente implementado em `use-product-editor.ts`, `workspace.catalogo.produtos.novo.tsx`, `product-edit-general-form.tsx`, `workspace.catalogo.categorias.novo.tsx`, `workspace.catalogo.tipos.tsx` e `workspace.catalogo.colecoes.novo.tsx`.
- [x] 11 suítes de teste e 90 testes unitários/adversariais aprovados com 100% de sucesso.
- [x] `node scripts/design-lint.mjs --ratchet` Exit Code 0 com 0 violações P0 e 0 regressões.
