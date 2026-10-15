# SPEC-MASTER: Motor de Turismo Inteligente (OCR/IA), Banco Único de Hotéis, Integração InfoTravel v1 e Construtor Modular de Lojas

**Código da Especificação:** `SPEC-MASTER-TRAVEL-OCR-INFOTRAVEL-CMS-BUILDER`  
**Data:** 2026-10-07  
**Status:** Aprovado para Execução  
**Módulos Envolvidos:** Turismo, OCR/Extrator IA, Catálogo de Hotéis, Hub de Integrações (InfoTravel), CRM/Kanban de Viagens, Classificados e Builder CMS Modular  

---

## 1. Visão Geral e Arquitetura Conceitual

A plataforma Waesy unifica a cadeia de valor de viagens e comércio local em 4 grandes pilares interconectados:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ECOSSISTEMA WAESY TURISMO                              │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ 1. EXTRATOR IA (OCR/PDF) │ 2. BANCO CENTRAL ÚNICO   │ 3. INFOTRAVEL GDS & CRM KANBAN   │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ • Upload Print/Flyer/PDF │ • Hotéis/Resorts Globais │ • Credenciais no Hub Vault       │
│ • Parsing Estruturado    │ • Autocomplete Deduplic. │ • Cotação Self-Service (Voos/Hot)│
│ • Pacote Público ou Link │ • Passeios por Operadora │ • Reserva "Pending Issuance"     │
│ • Histórico de Preços    │ • Filtro IA de Reviews   │ • Transbordo Kanban + Contrato   │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. CONSTRUTOR CMS MODULAR (PADRÃO WIX / SUB-APPS DE VANTAGEM)                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • 20 Páginas Canônicas Pré-fabricadas (Home, Vitrine, Detalhes, Carrinho, Conta)       │
│ • Identidade Visual & Design Tokens próprios da Agência com Primitivas Robustas        │
│ • Alimentação direta das Tabelas CMS sem duplicação de rotas ou código legado          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pilar 1: Extrator IA de Propostas e Anúncios Rápidos (OCR/PDF/Mídia)

### 2.1 Fluxo Funcional
1. **Upload de Mídia:** O usuário (agência ou pessoa física em classificados) envia um screenshot, flyer promocional ou PDF de cotação de operadora.
2. **Extração Multimodal Real:**
   - Invoca o pool de IA (`src/services/ai-pool.ts` / `executeUnifiedAiCall`).
   - Extrai: Título, Destino (cidade/estado/país), Aeroportos (origem/destino), Datas e Duração, Hotel/Resort citado, Regime de alimentação, Aéreos, Inclusões, Preço total e Parcelamento.
   - **Tolerância Zero a Mocks:** Elimina fallbacks estáticos (ex: valores hardcoded como `278760` centavos em `travel-ai-extractor.functions.ts`). Se o preço não for legível no documento, marca como `null` e solicita confirmação do usuário.
3. **Visibilidade do Pacote/Anúncio:**
   - `public`: Disponível na vitrine geral, indexado em buscas e carrosséis.
   - `unlisted` ("Apenas quem tem o link"): URL com hash de segurança para propostas personalizadas enviadas a clientes específicos.
4. **Telemetria de Preços e Flutuação:**
   - Tabela `travel_price_history` gravando `{ package_id, snapshot_date, price_cents, days_to_departure }`.
   - Monitora altas e baixas tarifárias conforme a data do embarque se aproxima.

---

## 3. Pilar 2: Banco Central Único de Hotéis, Resorts e Passeios (Global Deduplication)

### 3.1 Unificação e Deduplicação de Hotéis/Resorts
- **Problema Atual:** Cadastros duplicados em lista desorganizada no Admin Master.
- **Solução Arquitetural:**
  - Tabela canônica `global_hotels` contendo `id`, `name`, `canonical_slug`, `city`, `state`, `country`, `address`, `stars`, `amenities`, `latitude`, `longitude`, `verified_by_master`.
  - Componente de UI `HotelAutocompleteInput`: input reativo com busca com debouncing por nome, destino e endereço, impedindo a criação de novos registros para hotéis já existentes.
  - Apenas o Admin Master possui permissão de validação e fusão de registros (`hotel_aliases`).
- **Banco Central de Passeios por Operadora:**
  - Tabela `global_tours` vinculada a `tour_operators` (ex: CVC, ViagensPromo, E-HTL, Schultz, Orinter, Agaxtur).
  - O extrator identifica automaticamente a operadora de origem a partir da diagramação ou cabeçalho do PDF/print.

### 3.2 Curadoria e Filtro Inteligente de Avaliações (AI Review Classifier)
- Uma reclamação de atendimento de agência não pode penalizar a pontuação global do resort.
- Ao submeter uma avaliação, o modelo classifica o teor em três escopos independentes:
  1. `hotel_rating` (Avaliação da estrutura e hospedagem -> alimenta o score global do hotel).
  2. `destination_rating` (Avaliação da cidade/destino turístico).
  3. `agency_service_rating` (Avaliação restrita ao atendimento da agência vendedora).

---

## 4. Pilar 3: Integração InfoTravel v1 (Hub de Conexões, Reserva e Kanban)

### 4.1 Hub de Integrações e Cofre de Credenciais
- Rota de gestão: `/workspace/settings/integrations` (ou `/hub`).
- Cada agência configura suas variáveis da InfoTravel (`agency_id`, `api_endpoint`, `api_token`), armazenadas de forma segura e criptografada via `src/services/secret-vault.functions.ts`.
- O conector `src/services/infotravel.ts` consome os segredos por tenant sem vazamento entre agências.

### 4.2 Cotação Self-Service do Cliente
- Na vitrine pública da agência (`_store.*`) ou no hotsite da agência:
  - O viajante busca voos, hotéis e passeios em tempo real via chamadas reais da API InfoTravel.
  - Seleciona as opções e clica em **"Solicitar Reserva"**.

### 4.3 Fluxo de Reserva e Notificação ("Pending Issuance")
- O sistema cria o registro em `travel_bookings` com status obrigatório:
  `status = "RESERVED_PENDING_ISSUANCE"`
- A interface exibe aviso claro ao cliente: **"Sua viagem está reservada! A emissão das passagens e vouchers será concluída pelo seu agente de viagens."**
- Nenhuma passagem aérea é faturada automaticamente sem o crivo do agente.

### 4.4 Transbordo para o CRM / Kanban da Agência
1. **Entrada do Lead no Kanban:** Um card é gerado na coluna `Novas Cotações / Reservas` do Kanban de viagens.
2. **Geração do Contrato:** O agente clica em "Gerar Contrato", preenchendo automaticamente passageiros, datas, valores e políticas de cancelamento via `src/services/travel-contract.functions.ts`.
3. **Assinatura Eletrônica:** Disparo do contrato com link seguro para o cliente assinar via celular ou desktop.
4. **Cobrança Integrada:** Geração de cobrança via Pix ou link de cartão de crédito.
5. **Atualização do Status:** Após confirmação de pagamento e emissão no GDS, o card avança para `Emitido / Concluído`.

---

## 5. Pilar 4: Construtor CMS Modular (Arquitetura Padrão Wix)

### 5.1 O Modelo de "Sub-Apps" e Tabelas CMS Compartilhadas
- Cada tenant (agência ou loja) herda um conjunto canônico de **20 páginas pré-configuradas**:
  1. `Home` (Hero, destaques, trilhos de ofertas, busca rápida).
  2. `Vitrine / Catálogo` (Filtros, ordenação, busca geográfica).
  3. `Detalhe do Pacote / Produto` (Galeria, roteiro diário, hotéis, inclusões).
  4. `Carrinho / Resumo de Viagem`.
  5. `Cotações Self-Service` (Buscador integrado InfoTravel).
  6. `Minha Conta / Minhas Viagens` (Histórico, vouchers, contratos).
  7. `Propostas Exclusivas` (Páginas unlisted para clientes VIP).
- **Personalização Estrita por Design Tokens:**
  - As páginas compartilham os mesmos contratos BFF (`travel-catalog.functions.ts`, `cart.functions.ts`).
  - O que varia entre lojas é exclusivamente o tema, paleta de cores, tipografia, logotipo e seções dinâmicas ativadas no CMS da loja, sem duplicação de rotas ou código fonte.

---

## 6. Matriz de Ondas de Implementação (Roadmap Sequencial)

| Onda | Escopo Técnico | Arquivos e Entregáveis | Critério de Aceite |
|---|---|---|---|
| **Onda 1** | **Saneamento e Extrator IA de Mídia** | `travel-ai-extractor.functions.ts`, `travel-promo-flyer-modal.tsx` | OCR real via pool de IA, zero preços/inclusões hardcoded, suporte a `unlisted` por link |
| **Onda 2** | **Banco Único de Hotéis & Deduplicação** | `supabase/migrations/*global_hotels.sql`, `hotel-autocomplete-input.tsx` | Autocomplete reativo, zero duplicatas, classificação IA de reviews |
| **Onda 3** | **Hub de Conexões & Conector InfoTravel Real** | `services/infotravel.ts`, `workspace.integracoes.tsx`, `secret-vault` | Chamadas reais à API InfoTravel com credenciais por agência, sem respostas simuladas |
| **Onda 4** | **Fluxo de Reserva, Kanban & Contratos** | `travel-booking-dossier-modal.tsx`, `travel-contract.functions.ts` | Reserva `PENDING_ISSUANCE`, card criado no Kanban, contrato e link Pix gerados |
| **Onda 5** | **Modularização do Builder CMS (Estilo Wix)** | `src/components/commerce/experience-renderer.tsx`, páginas canônicas | 20 layouts canônicos reutilizáveis alimentados por tabelas CMS e design tokens |
| **Onda 6** | **Qualidade, A11y e Build Limpo** | Todo o repositório | `typecheck`, testes automatizados e `build` com Exit Code 0 |