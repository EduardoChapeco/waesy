# SPEC-CLASSIFIED-NICHE-ISOLATION-AND-SPEC-CARD-OVERFLOW-REMEDIATION: Remediação de Vazamento Cruzado de Nichos e Anti-Quebra Tipográfica em Cards

## 1. Contexto e Motivação
Auditoria visual na rota de detalhe de classificados/produtos (`_store.classificados.$id`) identificou duas quebras críticas:
1. **Vazamento Cruzado de Nichos (Violação da Invariante B.37):** Em produtos de conveniência/bebidas (ex.: "Drink Pronto Mansão Maromba Whisky Double Darkness - 1L Alcoólico"), a ficha técnica exibia especificações exclusivas de Turismo/Hotelaria (`Capacidade: Até 1 hóspedes`) e de Imóveis/Veículos (`Finalidade: Venda`).
   - Causa raiz: No resolvedor `canonical-specs-resolver.ts`, a verificação de veículos acionava `isVehicle = true` por conter `brand` (Marca), e as seções de Veículos, Imóveis e Equipamentos eram protegidas apenas por `if (!isTravel)`, executando colunas de imóveis (`max_guests` herdado como 1 do banco) para qualquer classificado comum.
2. **Estouro e Truncamento Brusco de Texto em Cards Squircles (Violação da Invariante B.38):** No grid de destaques (`NicheSpecificationsDisplay` / `TeteterisGridView`), a grade forçava 4 colunas em contêineres de 500px, gerando caixas de 90px com `font-mono lg:text-xl break-words`, provocando corte de palavras no meio de sílabas (`Mansão Maromb / a`, `hósped / es`, `Retira / da ou / Envio / Dispon / ível`).

---

## 2. Requisitos em Sintaxe EARS

### REQ-EARS-01: Isolamento Semântico Rígido por Nicho (Ubiquitous)
O motor `canonical-specs-resolver.ts` **SHALL** restringir a avaliação de cada grupo de atributos estritamente ao seu nicho canônico correspondente:
- Atributos de Imóveis/Hospedagem (`max_guests`, `property_type`, `area_sqm`, `bedrooms`, `condo_cents`, `iptu_cents`, `checkin_time`) **SHALL ONLY** ser resolvidos se `isRealEstate || isHospitality`.
- A especificação `Finalidade` **SHALL ONLY** ser adicionada se `isRealEstate || isVehicle || isEquipment || isBusiness`, sendo terminantemente proibida em produtos de conveniência, bebidas, alimentos ou desapego.
- A especificação `Capacidade` com contagem de hóspedes **SHALL ONLY** ser adicionada se `isHospitality || (isRealEstate && dealType === "temporada")`.
- A flag `isVehicle` **SHALL NOT** ser acionada pela simples existência de `brand` ou `marca`.

### REQ-EARS-02: Resolução Fiel de Produtos de Conveniência, Bebidas e Mercado (State-Driven)
**IF** o classificado for classificado como conveniência, mercado, bebida ou gastronomia (`isGrocery`), o motor `canonical-specs-resolver.ts` **SHALL**:
- Resolver `Marca` a partir de `attrs.brand` ou `classified.brand`.
- Resolver `Conteúdo / Volume` a partir de `attrs.volume` ou extração defensiva no título (`1L`, `500ml`, `350ml`, `2L`, etc.).
- Resolver `Classificação` como `"Bebida Alcoólica (+18)"` se `attrs.is_alcoholic` for verdadeiro ou se o título/descrição contiver termos etílicos (`whisky`, `cerveja`, `vinho`, `vodka`, `gin`, `alcoólico`).
- Resolver `Departamento` como `"Bebidas & Conveniência"` ou valor cadastrado em `grocery_department`.
- Resolver `Logística` como `"Entrega Local ou Retirada"` quando `delivery_mode === "both"`.

### REQ-EARS-03: Ergonomia Tipográfica e Anti-Separação Silábica em Cards (Ubiquitous)
O componente `NicheSpecificationsDisplay` **SHALL**:
- Utilizar `break-normal text-wrap hyphens-none` para que palavras nunca sejam partidas no meio de suas sílabas (`Maromb / a`).
- Aplicar escala tipográfica proporcional baseada na extensão da string (strings longas $\ge 16$ caracteres em `text-xs sm:text-sm font-bold`; strings médias em `text-sm sm:text-base font-bold`; métricas numéricas curtas em `text-base sm:text-lg font-black`).
- Reservar `font-mono` estritamente para métricas numéricas e valores monetários, utilizando `font-sans` para texto em linguagem natural.

### REQ-EARS-04: Densidade Adaptativa de Colunas no TeteterisGridView (Ubiquitous)
O componente `TeteterisGridView` **SHALL** utilizar malha adaptativa ao contêiner (`grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4`), assegurando que cada card squircles possua largura útil mínima $\ge 180$px, eliminando colunas estranguladas em layouts de 2 colunas no desktop.

---

## 3. Invariantes do Repositório (AGENTS.md)
- **Invariante B.37:** Isolamento Semântico Estrito de Nichos & Erradicação de Vazamento Cruzado.
- **Invariante B.38:** Integridade Textual Plena em Cards Squircles (Anti-Truncate).
- **Invariante B.8 / B.9:** 0 classes arbitrárias de colchetes, 0 `!important`, cores semânticas, grade de 4px, alvos táteis $\ge 44$px.

---

## 4. Evidências de Aceite
1. Execução de `vitest run src/lib/classifieds/canonical-specs-resolver.test.ts` com 100% dos testes aprovados.
2. Adição de teste unitário verificando que bebidas/conveniência não vazam `Capacidade: Até 1 hóspedes` nem `Finalidade: Venda`.
3. Design Lint com 0 violações P0 e 0 violações P1.
4. Compilação e build Cloudflare Pages com Exit Code 0.
