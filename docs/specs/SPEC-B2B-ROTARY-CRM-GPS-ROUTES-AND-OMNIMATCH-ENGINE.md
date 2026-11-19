# SPEC-B2B-ROTARY-CRM-GPS-ROUTES-AND-OMNIMATCH-ENGINE.md
# Especificação Técnica Canônica: Waesy Comercial B2B, Carteira Rotativa, Rotas GPS & OmniMatch Neural Engine

## 1. Contexto e Objetivos do Domínio
O Waesy opera como ecossistema multi-nicho soberano. Esta especificação formaliza e consolida duas frentes críticas:
1. **Comercial B2B, Carteira Rotativa e Rotas de Campo:**
   - Mitigação definitiva da brecha de segurança RLS em `price_tables` e `price_table_items`.
   - Matriz de distribuição comercial `(Cliente × Vendedor × Catálogo × Tabela de Preço)`.
   - Fila operacional diária "Dia a Dia" (Segunda a Sexta) orientada por ciclo médio de recompra (`avg_repurchase_days`) e telemetria de visitas.
   - Roteirização de visitas com telemetria GPS, verificação de geofence Haversine (piso 200m) e registro em `sales_visit_logs`.
2. **OmniMatch / MatchTravel Parametric Engine:**
   - Motor paramétrico de descoberta e qualificação tátil (estilo swipe deck) desacoplado de IDs de produto estáticos.
   - Suporte unificado a 5 tipos de cartas: `hot_offer`, `travel_package`, `trade_off`, `product`, `service`.
   - Cérebro neural do visitante (`match_visitor_brains`) com pontuação de eixos (`axis_scores`) e vetor de preferência `vector(1536)` atualizado incrementalmente a cada swipe.
   - Costura de identidade soberana (`stitchMatchBrainToCustomerOrLeadFn`) que funde visitantes anônimos a leads do CRM sem gerar duplicações.
   - Studio de curadoria no Workspace (`/workspace/match-time`) e experiência nativa no App Próprio (`/app/:slug`).

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Segurança e RLS de Tabelas de Preço B2B
- **WHEN** um usuário não autenticado ou cliente sem autorização consultar tabelas de preço via GraphQL/PostgREST,
- **THE SYSTEM SHALL** retornar exclusivamente tabelas cujo `visibility_scope = 'public'` e `active = true`.
- **WHEN** um cliente B2B autenticado consultar o catálogo de preços,
- **THE SYSTEM SHALL** conceder leitura apenas às tabelas vinculadas em `customer_price_table_assignments` para o respectivo `customer_id` ou ao staff da loja (`is_store_staff(store_id)`).

### 2.2 Carteira Rotativa e Fila Operacional Dia a Dia
- **WHILE** o vendedor visualiza a aba "Dia a Dia" no Workspace CRM,
- **THE SYSTEM SHALL** agrupar os clientes por dia de visita semanal (`visit_weekdays`) e calcular dinamicamente o status de atenção:
  - `on_track`: dias desde o último pedido < 80% do `avg_repurchase_days`.
  - `attention`: dias desde o último pedido entre 80% e 100% do `avg_repurchase_days`.
  - `risk`: dias desde o último pedido entre 100% e 150% do `avg_repurchase_days`.
  - `churn_loss`: dias desde o último pedido > 150% do `avg_repurchase_days`.

### 2.3 Check-in de Campo e Geofence Haversine
- **WHEN** o representante de campo acionar "Registrar Visita" informando coordenadas (`lat`, `lng`),
- **THE SYSTEM SHALL** calcular a distância ortodrômica até o endereço cadastrado do cliente. Se `distancia <= 200` metros, classificar como `within_geofence`; caso contrário, `outside_geofence`, persistindo a auditoria em `sales_visit_logs`.

### 2.4 OmniMatch Neural e Costura de Identidade
- **WHEN** o visitante deslizar para a direita (`like`) ou esquerda (`pass`) em uma carta de trade-off ou oferta,
- **THE SYSTEM SHALL** atualizar os `axis_scores` acumulados e recalcular a média exponencial ponderada do vetor de preferência `vector(1536)`.
- **WHEN** o visitante solicitar proposta ou atendimento no final do deck informando nome e WhatsApp,
- **THE SYSTEM SHALL** costurar o `visitor_session_id` ao lead correspondente no CRM sem duplicar o contato, anexando as preferências extraídas em `crm_leads.notes` e `lead_interests`.

---

## 3. Matriz Comparativa por Nicho de Negócio

| Nicho | Caso de Uso | Mecânica de Preço | Fila do CRM / Carteira | Experiência OmniMatch |
| :--- | :--- | :--- | :--- | :--- |
| **Distribuidora B2B** | Pedidos de reposição atacado, múltiplos CNPJs, rotas de representantes | Tabela de preço restrita vinculada a cliente (`customer_price_table_assignments`) com pedido mínimo | Fila rotativa semanal (Seg a Sex) orientada por ciclo de recompra de 14/28 dias | Deck de Trade-offs: Prazo de Pagamento vs Desconto à Vista; Pedido Paletizado vs Fracionado |
| **Turismo Lazer** | Agência de viagens, pacotes, lua de mel, resorts | Preço soberano em `travel_proposals` e `hot_offers` com parcelamento até 12x | Funil de qualificação por data de embarque e destino dos sonhos | MatchTravel: Destinos praianos vs montanha fria; Resort all-inclusive vs Aventura independente |
| **Turismo Corporativo** | Viagens empresariais, feiras, acordos de operadoras | Taxa de fee fixa/DU por bilhete + fatura quinzenal B2B | SLA de cotação de 30 minutos por centro de custo | Trade-offs: Tarifa reembolsável flexível vs Tarifa light restritiva; Voo direto vs Escala econômica |
| **Serviços / Varejo** | Atendimento local, conveniência, delivery | Catálogo de produtos/serviços com preço de balcão e cupons rápidos | Histórico de atendimentos WhatsApp e data do último agendamento | Match Time: Ofertas relâmpago de produtos com regras dinâmicas e cupom parametrizado |

---

## 4. Invariantes de Dados e Arquitetura

1. **Zero-Trust Pricing:** O preço exibido e faturado é resolvido exclusivamente no servidor por `resolveEffectiveCustomerOffer`. Parâmetros de desconto enviados pelo cliente HTTP são sumariamente ignorados.
2. **Zero Lead Leak:** A costura de identidade (`stitchMatchBrainToCustomerOrLeadFn`) sanitiza números de telefone pelo padrão E.164 soberano e busca lead existente antes de qualquer insert.
3. **Consistência Visual DL-01 a DL-33:** Todos os componentes do Studio e do App respeitam alvos de toque >= 44px (`h-11`), zero colchetes mágicos e animações com suporte a `motion-reduce:animate-none`.
