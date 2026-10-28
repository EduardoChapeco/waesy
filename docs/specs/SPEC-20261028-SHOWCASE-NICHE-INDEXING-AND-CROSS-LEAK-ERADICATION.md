# SPEC-20261028-SHOWCASE-NICHE-INDEXING-AND-CROSS-LEAK-ERADICATION.md
## Auditoria Completa de Vitrines & Erradicação de Vazamento Cruzado de Produtos e Serviços

- **Status:** Aprovado para Implementação
- **Data:** 2026-10-28
- **Contexto:** Auditoria detalhada das 21 vitrines da plataforma revelou 4 anomalias críticas no mecanismo de filtragem e indexação de produtos e estabelecimentos:
  1. **Vazamento Cruzado por Substring Frágil no BFF (`getModularSurfaceFeed` em `surface-cms.functions.ts`):** Produtos de restaurantes (como "Pizza à Moda da Casa", "Pão da Casa", "Molho da Casa", "Petiscos de Boteco") eram indevidamente indexados em vitrines de Moda (`_store.moda`), Casa/Decoração (`_store.casa`) e Pet Shop (`_store.pet`), porque o BFF usava `titleLower.includes(kw)` com palavras-chave genéricas como `"casa"`, `"moda"`, `"pet"`, `"bar"`.
  2. **Heurística de Fallback Falso nas Rotas (`|| allProducts.length <= N`):** Em `_store.casa.tsx`, `_store.construcao.tsx`, `_store.beleza.tsx`, `_store.livros.tsx` e `_store.servicos.tsx`, quando a lista de produtos retornados era pequena (<= 10 ou <= 15), o código forçava `return true` para qualquer item indiscriminadamente, violando as Invariantes B.33 (Zero Fallbacks Sintéticos) e B.37 (Isolamento Semântico Estrito de Nichos).
  3. **Falso Positivo em Seções de Flash Deals (`surface-cms.functions.ts`):** Na ausência de ofertas com desconto (`flashPool.length === 0`), o feed caía para `allProducts`, exibindo itens comuns como se fossem promoções relâmpago.
  4. **Contaminação de Lojas por Nome em vez de Segmento:** Lojas do ramo alimentício (ex: "Casa do Pastel", "Casa de Carnes") eram indexadas na vitrine de Móveis & Decoração porque o nome continha a palavra "Casa", em vez de respeitar a vertical cadastrada em `settings.segment`.

---

### 1. Requisitos em Sintaxe EARS

#### 1.1 Isolamento Semântico de Estabelecimentos por Segmento Declarado
- **Quando** o BFF `getModularSurfaceFeed` filtrar estabelecimentos para uma vitrine específica (ex: `moda`, `casa`, `pet`, `gastronomia`, `mercado`), **o sistema deve** priorizar o segmento cadastrado da loja (`store.settings.segment`, `store.settings.niche` ou `store.category`).
- **Se** o segmento cadastrado da loja pertencer explicitamente a outra vertical (ex: `gastronomia` ou `alimentos` quando a vitrine ativa for `casa`, `moda` ou `construcao`), **o sistema deve** excluir sumariamente o estabelecimento, impedindo que lojas de comida vazem para vitrines industriais, de vestuário ou de móveis por mera coincidência de nome.

#### 1.2 Erradicação de Vazamento Cruzado de Produtos
- **Quando** o BFF `getModularSurfaceFeed` filtrar produtos de uma vitrine, **o sistema deve** indexar apenas:
  1. Produtos cujas lojas pertençam ao nicho aprovado da vitrine (`matchingStoreIds.has(p.store_id)`); OU
  2. Produtos cujos atributos declarem expressamente o nicho correspondente (`p.attributes?.tipo === niche` ou `p.attributes?.niche === niche`).
- **O sistema não deve** incorporar produtos de lojas não pertencentes ao nicho apenas porque o título do produto contém uma substring acidental (como `"da casa"`, `"à moda"` ou `"petiscos"`).

#### 1.3 Eliminação dos Fallbacks Artificiais (`|| allProducts.length <= N`)
- **Nas rotas** `_store.casa.tsx`, `_store.construcao.tsx`, `_store.beleza.tsx`, `_store.livros.tsx` e `_store.servicos.tsx`, **o sistema deve** remover imediatamente qualquer cláusula `|| allProducts.length <= N` e `|| stores.length <= 15`.
- **Se** não houver produtos ou prestadores correspondentes ao filtro ativo, **o sistema deve** renderizar honestamente o componente `EmptyState`, em estrita observância à Invariante B.33.

#### 1.4 Refinamento de Palavras-Chave e Limites de Palavra (Word Boundaries)
- **O sistema deve** utilizar correspondência de limites de palavra (`\b`) para palavras curtas de alto risco (`pet`, `bar`, `moda`), garantindo que `"pet"` nunca capture `"petiscos"` e `"bar"` nunca capture `"barbearia"`.
- **Em `casa`**, o termo genérico isolado `"casa"` deve ser substituído por expressões inequívocas de decoração e mobiliário (`"artigos para casa"`, `"móveis"`, `"decoração"`, `"cama e banho"`, `"utilidades"`).

#### 1.5 Honestidade Estrita em Flash Deals
- **Quando** não houver produtos com desconto real (`discount_percent > 0`) em uma seção de `flash_deals`, **o sistema deve** retornar lista vazia ou omitir o bloco, sendo terminantemente proibido preencher com produtos regulares a preço cheio.

---

### 2. Matriz de Arquivos Afetados

| Arquivo | Papel na Correção |
| :--- | :--- |
| `src/services/marketplace.functions.ts` | Refinamento de `NICHE_STORE_KEYWORDS` com remoção de ambiguidades ("casa" bare, "bar", "pet") e adição de matcher com word boundaries. |
| `src/services/surface-cms.functions.ts` | Correção em `getModularSurfaceFeed`: validação de segmento estrito de lojas, erradicação de vazamento cruzado de produtos por substring de título, e remoção do fallback fake de flash deals. |
| `src/routes/_store.casa.tsx` | Erradicação do fallback `|| allProducts.length <= 12` e refinamento de termos de louças/utensílios domésticos (eliminação de "prato" e "copo" soltos). |
| `src/routes/_store.construcao.tsx` | Erradicação do fallback `|| allProducts.length <= 10`. |
| `src/routes/_store.beleza.tsx` | Erradicação do fallback `|| allProducts.length <= 12` e isolamento de termos cosméticos (eliminação de "creme" e "óleo" genéricos que colidiam com alimentação). |
| `src/routes/_store.livros.tsx` | Erradicação do fallback `|| allProducts.length <= 12`. |
| `src/routes/_store.servicos.tsx` | Erradicação do fallback `|| stores.length <= 15`. |
| `docs/design/DECISIONS.md` | Registro canônico da decisão arquitetural DEC-353. |
