# NICHE_ENGINE_MAP.md — Mapa Completo da Engine de Nichos e Matriz de Compatibilidade

**Data:** 2026-10-21
**Status:** Auditado & Normalizado

---

## 1. Taxonomia dos 17 Nichos de Classificados (`src/lib/classifieds/canonical-taxonomy.ts`)

| Niche ID (`NicheId`) | Categoria DB (`canonicalCategory`) | Templates Permitidos (`ClassifiedTemplateStyle[]`) | Template Padrão (`defaultTemplate`) | Resolvedor de Ficha Técnica (`resolveClassifiedDetailedSpecs`) |
| :--- | :--- | :--- | :--- | :--- |
| `viagem` | `travel` | `editorial`, `resort_hotel`, `standard` | `editorial` | `isTravel` (Destino, Duração, Transporte, Bagagem, Roteiro, Hospedagem) |
| `hospedagem` | `real_estate` | `resort_hotel`, `imobiliario`, `editorial`, `standard` | `resort_hotel` | `isHospitality` (Hóspedes, Quartos, Banheiros, Check-in/out, Comodidades) |
| `imovel` | `real_estate` | `imobiliario`, `standard`, `editorial` | `imobiliario` | `isRealEstate` (Finalidade, Tipo, Área m², Quartos, Suítes, Vagas, Condomínio, IPTU) |
| `veiculo` | `vehicle` | `automotivo`, `standard`, `editorial` | `automotivo` | `isVehicle` (Marca, Modelo, Versão, Ano Fab/Mod, KM, Combustível, Câmbio, Cor, Opcionais) |
| `agro` | `sale` | `automotivo`, `standard`, `editorial` | `automotivo` | `isAgro` (Horímetro, Tração, Potência CV, Cabine, Implemento, Ano) |
| `servico` | `service` | `servicos_agenda`, `standard`, `editorial` | `servicos_agenda` | `isServices` (Especialidade, Modalidade, Área de Atendimento, Duração, Agenda, Conselho) |
| `mercado` | `sale` | `conveniencia`, `standard` | `conveniencia` | `isGrocery` (Departamento, Unidade, Temperatura, Marca, Frescor/Maturação, Preparo) |
| `gastronomia` | `food` | `conveniencia`, `standard`, `editorial` | `conveniencia` | `isGastronomy` (Especialidade, Tempo de Preparo, Logística Delivery/Retirada) |
| `farmacia` | `sale` | `conveniencia`, `standard` | `conveniencia` | `isPharmacy` (Categoria, Princípio Ativo, Laboratório, Registro ANVISA, Receita) |
| `evento` | `event` | `editorial`, `standard` | `editorial` | `isEvent` (Data, Horário, Local, Classificação, Lotes, Programação, Speakers) |
| `vaga` | `job` | `standard`, `editorial` | `standard` | `isJob` (Cargo, Modelo de Trabalho, Regime, Faixa Salarial, Escolaridade, Benefícios) |
| `negocio` | `business` | `editorial`, `imobiliario`, `standard` | `editorial` | `isBusiness` (Modalidade B2B, Segmento, Faturamento, Lucro Líquido, Ponto, NDA) |
| `desapego` | `sale` | `standard`, `editorial`, `conveniencia` | `standard` | `isPhysicalGoods` (Condição, Garantia, Marca/Modelo/Armazenamento/Voltagem/Tamanho) |
| `equipamento` | `equipment` | `standard`, `servicos_agenda` | `standard` | `isEquipment` (Período de Locação, Caução, Condição) |
| `digital` | `sale` | `standard`, `editorial` | `standard` | `isDigital` (Formato, Tamanho, Limite de Downloads, Entrega Imediata) |
| `assinatura` | `service` | `servicos_agenda`, `standard`, `editorial` | `servicos_agenda` | `isSubscription` (Ciclo de Cobrança, Taxa de Adesão, Degustação, Benefícios) |
| `doacao` | `donation` | `standard` | `standard` | `isDonation` (Condição, Retirada Solidária, Gratuito) |

---

## 2. Taxonomia Unificada do Ad Engine (`src/lib/ad-engine/niche-taxonomy-manifest.ts` & `template-metamorphosis.ts`)

| Chave Canônica | Aliases Suportados (`normalizeNicheKey`) | Templates Canônicos (`CANONICAL_TEMPLATES_CATALOG`) | Template Default |
| :--- | :--- | :--- | :--- |
| `turismo` | `turismo`, `travel`, `viagem`, `hospedagem` | `tourism_editorial`, `tourism_compact` | `tourism_editorial` |
| `mercado` | `mercado`, `grocery`, `supermarket`, `conveniencia` | `grocery_Fresco`, `grocery_pack`, `retail_standard` | `grocery_Fresco` |
| `varejo` | `varejo`, `retail`, `desapego`, `sale`, `produtos` | `retail_standard`, `retail_ecommerce`, `retail_grid` | `retail_standard` |
| `servico` | `servico`, `servicos`, `services`, `service`, `assinatura` | `service_schedule`, `service_booking`, `service_portfolio` | `service_schedule` |
| `imovel` | `imovel`, `imoveis`, `real_estate`, `property` | `real_estate_luxury`, `real_estate_property` | `real_estate_luxury` |
| `veiculo` | `veiculo`, `veiculos`, `vehicles`, `vehicle`, `automotive`, `agro` | `automotive_deal`, `vehicle_showroom` | `automotive_deal` |
| `digital` | `digital`, `infoproduto` | `digital_access`, `retail_standard` | `digital_access` |
| `gastronomia` | `gastronomia`, `food_service`, `food` | `grocery_Fresco`, `retail_standard` | `grocery_Fresco` |

---

## 3. Regras de Isolamento Semântico (Invariante B.37)

1. **Zero Vazamento de Turismo (`viagem`):** `destination_city`, `flight_details`, `lodgings`, `itinerary_days`, `story_highlights` e `bio_bullets` só são emitidos no preview e no payload de persistência quando `niche.id === "viagem"`.
2. **Precedência de Nicho Explícito no Resolvedor (`canonical-specs-resolver.ts`):** Quando `rawNiche` está definido (ex.: `veiculo`, `imovel`, `servico`, `desapego`, `vaga`, `negocio`, `mercado`, `gastronomia`, `agro`, `farmacia`, `equipamento`, `digital`, `doacao`), o resolvedor classifica estritamente pelo nicho ativo e bloqueia falsos positivos de colunas herdadas (`deal_type`, `delivery_mode`, `max_guests`).
3. **Transição Segura de Nicho × Template:** Ao trocar de nicho, se o `templateStyle` atual pertencer à lista de templates permitidos do novo nicho, ele é mantido; caso contrário, o motor aplica automaticamente o `defaultTemplate` do novo nicho.
