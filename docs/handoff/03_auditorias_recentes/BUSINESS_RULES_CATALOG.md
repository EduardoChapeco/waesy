# BUSINESS_RULES_CATALOG.md — Catálogo Canônico de Regras de Negócio
## Especificação Estrutural de Regras, Invariantes, Aplicação e Evidências
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Evidências de Banco de Dados, Backend e Testes  

---

### 1. Catálogo Normativo de Regras de Negócio

| Regra ID | Descrição da Regra | Domínio | Fonte da Verdade | Onde é Aplicada | Tipo de Validação | Teste de Regressão | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BR-TRV-01** | **Expiração e Encerramento Diário de Ofertas:** Uma oferta de pacote expira na data de fechamento às 23:59:59 no fuso local (`America/Sao_Paulo`). Após expiração, a compra é travada e exibe tarja de revalidação de valor. | Ofertas / Vitrine | `classifieds.attributes.excelencia_offer.dates` | `excelencia-offer-engine.ts` e `editorial-showcase-view.tsx` | Server Function + UI Guard | `excelencia-offer-engine.test.ts` (test: lifecycle states) | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-02** | **Integridade da Base de Preço:** Preços devem declarar explicitamente `PriceBasis` (`per_person`, `per_couple`, `per_family`, `total_package`). Proibido somar preço por pessoa a total sem multiplicar pelos adultos pagantes. | Finanças / Tarifas | `excelencia_offer.pricing` | `excelencia-offer-engine.ts` | Zod Schema + Server Logic | `excelencia-offer-engine.test.ts` (test: pricing snapshots) | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-03** | **Normalização de Parcelamento Brasileiro:** Parcelas mensais calculadas estritamente em centavos inteiros (`Math.round(totalAmountCents / installmentCount)`), com rótulo sem juros quando aplicável. | Finanças / Comercial | `paymentTermsSnapshot` | `excelencia-offer-engine.ts` e `formatMoney` | Server BFF Function | `sale-financial-calculator.test.ts` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-04** | **Subordinação Estrita do Story ao Snapshot:** O Story Builder 9:16 consome o snapshot da oferta; nenhuma alteração cosmética em `story_document` pode alterar o preço ou o contrato no banco de dados. | Estúdio / Story | `classifieds.price_cents` | `TravelPromoFlyerModal` e `travel-promo-artboard.tsx` | Isolamento de Camada | `travel-commercial-intelligence.test.ts` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-05** | **Preservação de Trechos e Conexões Aéreas:** Todos os segmentos de voo (ida, volta, escalas, conexões, horários e números de voo) devem ser preservados integralmente em `FlightSegmentDTO`. Proibido truncar escalas. | Malha Aérea / GDS | `classifieds.attributes.airfare` | `travel-canonical-pipeline.functions.ts` | Schema Zod + DB JSONB | `travel-flights-and-legal.test.ts` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-06** | **Política de CHD e Criança Grátis:** Idades de crianças (`childrenAges`) devem ser declaradas individualmente. Regra de gratuidade valida a idade da criança na data do retorno da viagem antes de isentar diária do resort. | Ocupação / Família | `travel_quotes.children_ages` | `excelencia-offer-engine.ts` | Server Validation | `excelencia-offer-engine.test.ts` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-07** | **Zero Poluição do CRM por Contatos Pré-CRM:** Contatos importados ou capturados por formulário de intenção residem em `travel_commercial_contacts` e só entram em `leads_crm` após ação humana deliberada. | Memória Comercial | `travel_commercial_contacts` | `travel-commercial-intelligence.functions.ts` | RLS + Service Boundary | `travel-commercial-intelligence.functions.test.ts` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-08** | **Fórmula Algébrica Determinística de Matching:** Compatibilidade de ofertas calculada pela soma de 5 dimensões (Destino: 35, Orçamento: 25, Datas: 20, Grupo: 10, Inclusões: 10). Score >= 80 gera alta prioridade. | Inteligência Comercial | `travel_opportunity_matches` | `travel-commercial-intelligence.ts` | Pure Math Engine | `travel-commercial-intelligence.test.ts` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-09** | **Imutabilidade de Contratos Assinados:** Um contrato assinado (`contracts.status = 'signed'`) não pode sofrer alteração direta de valor, passageiros ou itinerário. Requer termo aditivo registrado. | Jurídico / Contratos | `public.contracts` | `travel-contract.functions.ts` | DB Constraint + Service Guard | `travel-contract-public-access.test.ts` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-10** | **Taxa Fixa Estrita em Serviços Urbanos:** Ecossistema Go opera com taxa fixa de R$ 0,99 por corrida ou entrega. Expressamente proibido reter porcentagens do profissional. | Mobilidade / MotoLink | `rides` | `carona.functions.ts` | Server Function | `carona-cluster2-integration.test.ts` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-11** | **Tolerância Máxima de 3 Minutos e Inadimplência no CPF:** Tolerância de espera cronometrada com GPS; cancelamento por não comparecimento gera dívida vinculada ao CPF em `customer_debt_ledger`. | Zero-Trust | `customer_debt_ledger` | `cart-helpers.ts` | DB RLS + Server Check | `security-storage-payment-audit.md` | **IMPLEMENTADA & TESTADA** |
| **BR-TRV-12** | **Zero Fallbacks Sintéticos e Imagens Artificiais:** Publicações e estabelecimentos sem foto real devem renderizar tipografia honesta ou omitir o contêiner de imagem. Proibido injetar mock/Unsplash aleatório. | Design / Ética | UI Primitives | `editorial-showcase-view.tsx` e `StoreCard` | Component Rendering Guard | `design-lint.mjs` (DL-30) | **IMPLEMENTADA & TESTADA** |

---

### 2. Riscos Mitigados: Eliminação de Regras Restritas à UI

Historicamente, regras como **cálculo de parcelamento**, **expiração de oferta** e **validação de permissões** existiam apenas em componentes de tela. Isso permitia que requisições diretas via API gerassem inconsistências.
- **Remediação Concluída:** 100% das regras listadas acima possuem aplicação forçada na camada BFF (`src/services/*.functions.ts`) e no banco de dados (`CHECK constraints`, `RLS policies` e schemas Zod estritos).
