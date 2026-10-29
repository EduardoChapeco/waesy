# SPEC-20261028-SUBVITRINES-NICHE-HUBS-AND-B2B-MULTIPRICE.md

## 1. Identificação do Módulo e Metadados
- **Título**: Especificação Arquitetural de Subvitrines, Macro-Hubs Especializados, Reutilização do Padrão Hero Cover e Motor B2B Multi-Tabelas de Preço
- **Data**: 2026-10-28
- **Autor**: Antigravity Platform Architect & Product Manager
- **Status**: Proposta Aprovada para Implementação
- **Escopo**:
  1. Taxonomia de 8 Macro-Hubs no SuperApp & Drawer Mobile sem poluição visual.
  2. Subvitrines dedicadas para: Imóveis (Aluguel vs Temporada/Hospedagem), Mobilidade/Frete/Mudança/Carona, Beleza & Saúde (Barbearia vs Salão/SPA), Obra/Construção & Decoração, Eventos (Estrutura, LED, Brinquedos, Buffet e Ocasiões: 15 Anos, Casamento, Chá Revelação), Varejo Segmentado (Bazar, Papelaria, Moda Masc/Fem, Celulares & Acessórios), Açougue/Carnes e Listas de Presentes/Casamento.
  3. Componente Canônico Reutilizável de Vitrine Imersiva (`ShowcaseHeroCoverLayout`), derivado do padrão de sucesso de Eventos, 100% sincronizado com Admin Master CMS (`marketplace_surfaces`, `marketplace_sections` e `hotpages`).
  4. Motor B2B de Múltiplas Tabelas de Preço & Clube de Assinatura (Varejo, Atacado/CNPJ, Quantidade Mínima, Membros do Clube da Loja) com interface de gestão ágil no Workspace e cálculo de preço efetivo no checkout.

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### 2.1 EARS — Navegação Inteligente & Macro-Hubs no Mobile Drawer
- **EARS-01 (Ubíquo)**: O sistema DEVE categorizar todos os serviços e produtos em 8 Macro-Hubs soberanos no SuperApp Drawer, impedindo a sobrecarga cognitiva do usuário por botões soltos desordenados.
- **EARS-02 (Orientado a Eventos)**: QUANDO o usuário tocar em qualquer Macro-Hub no Drawer ou no TopBar, O sistema DEVE direcioná-lo para a vitrine temática correspondente contendo a Capa Hero imersiva no topo e a grade squircle de subnichos editáveis via CMS.
- **EARS-03 (Orientado a Estados)**: ENQUANTO o usuário estiver navegando em uma cidade específica, O sistema DEVE filtrar os subnichos e prestadores/produtos de acordo com a disponibilidade ativa na praça (`activeCity`), sem injetar itens órfãos de outras localidades.

### 2.2 EARS — Subvitrines Especializadas e Filtros Facetados
- **EARS-04 (Imóveis & Temporada)**: O módulo `/imoveis` DEVE bifurcar claramente entre:
  - (a) `Aluguel Residencial/Comercial` (mensal, garantias, fiador, caução);
  - (b) `Temporada & Hospedagem` (diárias, check-in/out, integrado à infraestrutura de turismo);
  - (c) `Comprar Imóvel` (lançamentos, usados, financiamento).
- **EARS-05 (Mobilidade & Fretes)**: O módulo `/mobilidade` DEVE expor na UI de topo e no drawer os 4 modais urbanos:
  - (a) `Corridas & MotoLink` (passageiro);
  - (b) `Fretes & Mudanças` (carretos, caminhões, ajudantes);
  - (c) `Caronas Comunitárias` (intermunicipais);
  - (d) `Entregas Turbo` (encomendas expressas).
- **EARS-06 (Obra, Construção & Decoração)**: O módulo `/construcao` DEVE apresentar de forma agregada e descompactada:
  - (a) `Prestadores de Serviço` (pedreiros, eletricistas, encanadores, pintores, serralheiros);
  - (b) `Materiais para Obra` (hidráulica, elétrica, cimento, ferragens);
  - (c) `Lojas & Depósitos` da cidade;
  - (d) `Decoração & Interiores` (móveis planejados, iluminação, arquitetura).
- **EARS-07 (Eventos, Estrutura & Ocasiões)**: O módulo `/eventos` DEVE estruturar subnichos por categoria física e por ocasião:
  - (a) Físico: `Estrutura & Palcos`, `Som & Iluminação`, `Painéis de LED`, `Aluguel de Brinquedos`, `Buffet & Bebidas`, `Decoração`;
  - (b) Ocasião: `Casamento`, `15 Anos (Debutante)`, `Chá Revelação / Bebê`, `Infantil`, `Corporativo / Feiras`.
- **EARS-08 (Beleza & Bem-Estar)**: O módulo `/beleza` DEVE segmentar sem ambiguidade:
  - (a) `Barbearias` (cuidados masculinos, cortes, barba);
  - (b) `Salões de Beleza & Cabelereiros`;
  - (c) `Estética & SPA` (massagens, tratamentos corporais);
  - (d) `Terapeutas & Saúde Integrativa`.
- **EARS-09 (Listas de Presentes & Casamento)**: A plataforma DEVE permitir a criação e gestão de:
  - (a) `Lista de Casamento`;
  - (b) `Chá Revelação / Chá de Casa Nova`;
  - (c) `Gift Cards & Vouchers` com resgate por convidados e conversão em crédito para os anfitriões.

### 2.3 EARS — Motor B2B de Múltiplas Tabelas de Preço & Clube
- **EARS-10 (Tabelas de Preço Dinâmicas)**: O lojista DEVE poder configurar múltiplas tabelas em `price_tables`:
  - `standard`: Varejo consumidor final;
  - `wholesale_cnpj`: Atacado com exigência de CNPJ e/ou pedido mínimo;
  - `club_members`: Preços exclusivos para assinantes do Clube de Fidelidade da loja;
  - `volume_tier`: Preço escalonado por faixas de quantidade mínima no produto (`min_quantity`).
- **EARS-11 (Resolução Automática de Preço Efetivo)**: QUANDO o cliente civil ou corporativo visualizar o produto ou adicionar ao carrinho, O sistema BFF DEVE resolver o `effective_price_cents` aplicando a regra de maior benefício elegível para aquele perfil autenticado.
- **EARS-12 (Transparência de Preço)**: SE o produto possuir preço menor para membros do Clube ou Atacado, A interface de vitrine DEVE exibir o badge informativo (ex: "R$ 49,90 no Clube" ou "R$ 39,90 no Atacado a partir de 10 un").

---

## 3. Matriz MECE de Macro-Hubs e Taxonomia Canônica

| ID | Macro-Hub | Rota Principal | Subvitrines / Subnichos | Ícone Sugerido |
|:---|:---|:---|:---|:---|
| HUB-1 | **Gastronomia, Bebidas & Mercado** | `/_store.gastronomia` | Restaurantes, Supermercados, Casa de Carnes/Açougue, Bebidas & Adega, Farmácias | `Utensils` / `Wine` |
| HUB-2 | **Mobilidade, Fretes & Mudança** | `/_store.mobilidade` | Corridas MotoLink, Frete & Carreto, Mudanças com Ajudante, Caronas Intermunicipais, Entrega Expressa | `Car` / `Truck` |
| HUB-3 | **Imóveis & Temporada** | `/_store.imoveis` | Aluguel Mensal, Aluguel por Temporada & Hospedagem, Venda de Casas e Aptos, Salas Comerciais | `Building` / `House` |
| HUB-4 | **Obra, Construção & Reforma** | `/_store.construcao` | Prestadores (Pedreiro, Eletricista, Encanador, Pintor), Lojas de Materiais, Ferramentas, Decoração & Interiores | `HardHat` / `Wrench` |
| HUB-5 | **Eventos, Festas & Ingressos** | `/_store.eventos` | Estrutura & Palcos, LED & Som, Aluguel de Brinquedos, Buffet & Bartender, Casamentos, 15 Anos, Chá Revelação | `Ticket` / `Confetti` |
| HUB-6 | **Beleza, Barbearia & Saúde** | `/_store.beleza` | Barbearias Masculinas, Salões de Beleza, Estética & SPA, Massoterapia, Clínicas de Saúde | `Sparkles` / `Scissors` |
| HUB-7 | **Varejo, Moda & Eletrônicos** | `/_store.moda` & `/_store.eletronicos` | Moda Feminina, Moda Masculina, Calçados & Tênis, Joias & Acessórios, Celulares & Assistência, Bazar & Papelaria | `Shirt` / `ShoppingBag` |
| HUB-8 | **Presentes, Listas & Gift Cards**| `/_store.gift-cards.index` | Lista de Casamento, Chá Revelação, Lista de Aniversário, Vouchers de Lojas, Cartões Presente | `Gift` / `Heart` |

---

## 4. Arquitetura do Componente Canônico Hero Cover (`ShowcaseHeroCoverLayout`)

### 4.1 Estrutura em Camadas
1. **Top Hero Cover**:
   - Imagem de capa imersiva em alta resolução com aspect ratio canônico e overlay gradiente sem estourar contraste.
   - Pílula de localização ativa (`activeCity`) e botão de retorno tátil (`h-11 min-h-11`).
   - Callout e selo de destaque (ex: "Aqui tem desconto pra quem é Clube!").
2. **Folha de Conteúdo Deslizada (Curved Sheet)**:
   - `-mt-2 rounded-t-3xl bg-background` com sombra de profundidade suave.
3. **Grade Squircle de Botões de Subnichos**:
   - Grade adaptativa (4 colunas no mobile, até 8 colunas no desktop).
   - Botões com badge de contagem real ou "Novo", touch target 44px, estados ativo e inativo.
   - 100% configuráveis pelo Admin Master através de `hotpages` (`template_type: 'drawer_module' | 'category_hub'`).
4. **Trilhos Temáticos & Feed Descompactado**:
   - Omissão automática de trilhos vazios (Invariante B.33).
   - Sem "card dentro de card" (Containeritis - Invariante B.8 / DL-31).

---

## 5. Arquitetura do Motor B2B Multi-Tabelas de Preço & Clube

### 5.1 Enriquecimento do Esquema SQL (`price_tables` e `price_table_items`)
- Campo `target_audience`: `'all' | 'cnpj_wholesale' | 'club_members' | 'vip' | 'custom'`.
- Tabela `store_club_members`: Cadastro de clientes associados ao clube da loja (`store_id`, `profile_id`, `tier`, `active_until`).
- Função BFF `getEffectiveProductPrice`:
  - Entrada: `{ productId, storeId, buyerProfileId?, quantity?: number, buyerCnpj?: string }`.
  - Saída: `{ basePriceCents, effectivePriceCents, appliedTableId, appliedRule, discountCents, tierBadges }`.

---

## 6. Critérios de Aceite & Evidências
- [x] Zero erros TypeScript (`npm run typecheck` Exit Code 0).
- [x] Build de produção aprovado (`npm run build`).
- [x] Conformidade com Design-Lint e WCAG 2.2 AA (touch targets >= 44px).
- [x] Sem valores mágicos entre colchetes ou `!important`.
- [x] Invariante de bilateralidade respeitada: todos os subnichos configuráveis pelo CMS Master.
- [x] Decisão documentada em `docs/design/DECISIONS.md`.
