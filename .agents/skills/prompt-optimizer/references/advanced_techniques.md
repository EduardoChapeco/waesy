# Advanced EARS Techniques — Multi-Stakeholder, NFRs & Complex Logic

> **Técnicas Avançadas:** Para sistemas empresariais complexos, múltiplos atores interagem com a mesma funcionalidade, sob exigências estritas de desempenho e regras booleanas defensivas.

---

## 👥 1. EARS para Múltiplas Partes Interessadas (Multi-Stakeholder)

Quando uma funcionalidade cruza diferentes jornadas de usuário, estruture declarações EARS separadas para cada persona (Comprador, Lojista, Entregador e Administrador):

### Exemplo: Ciclo de Vida de Pedido Delivery Waesy Go
1. **Comprador (Consumidor Civil):**
   - `[EARS-BUYER-1] When the customer submits checkout, the system shall charge via PIX or Card and generate a tracking token with realtime status.`
   - `[EARS-BUYER-2] While waiting for delivery, when courier marks arrival, the system shall show a 10-minute countdown with door/reception instructions.`
2. **Lojista (Operador do Workspace):**
   - `[EARS-STORE-1] When a new paid order arrives, the system shall play an audio chime and print the kitchen order ticket with modifiers.`
   - `[EARS-STORE-2] If stock of any ordered item is depleted, then the system shall allow safe cancellation without platform quality score penalty.`
3. **Entregador (Courier Waesy Go):**
   - `[EARS-COURIER-1] When the courier arrives within 200m of the delivery address, the system shall enable the 'Arrived at Address' button.`
   - `[EARS-COURIER-2] If customer waiting time exceeds 15 minutes, then the system shall calculate a waiting fee of R$ 0.50/min and credit the courier wallet.`

---

## ⚡ 2. Requisitos Não-Funcionais (NFRs) Quantificados

Requisitos não-funcionais nunca devem ser declarações vagas como *"o sistema deve ser rápido e seguro"*. Eles devem ser formulados no padrão Ubíquo (`The system shall...`) com métricas quantitativas verificáveis:

| Dimensão NFR | Vaga (Rejeitada) | EARS Quantificado (Aprovado) |
| :--- | :--- | :--- |
| **Desempenho** | *"O sistema deve ser veloz."* | `The system shall process and return POS checkout transactions in less than 350ms (p95) under a concurrency load of 250 requests/sec.` |
| **Disponibilidade** | *"Alta disponibilidade."* | `The system shall maintain an uptime of >= 99.95% during operating hours (06:00 to 23:59 UTC-3).` |
| **Acessibilidade** | *"Acessível a todos."* | `The system shall satisfy all WCAG 2.2 Level AA success criteria, maintaining a minimum Lighthouse accessibility score of 98.` |
| **Resiliência** | *"Não pode cair com erro."* | `If a 3rd-party webhook fails or times out after 4 seconds, then the system shall retry with exponential backoff (1s, 2s, 4s, 8s) up to 5 times.` |

---

## 🔀 3. Lógica Booleana Complexa & Condições Aninhadas

Para regras de negócio que envolvem múltiplas validações simultâneas:

### Exemplo: Autorização de Cancelamento Seguro de Pedido
```text
IF:
  (order.status IN ['created', 'accepted', 'preparing'])
  AND
  (
    (reason = 'suspected_fraud' AND customer.trust_score < 40)
    OR
    (reason = 'gps_mismatch' AND distance_deviation_km > 3.5)
    OR
    (reason = 'stock_out' AND verified_by_store_staff = true)
  )
THEN:
  The system shall cancel the order, release reserved inventory, initiate automatic refund in integer cents, AND exempt the store from algorithmic penalty.
ELSE:
  The system shall reject cancellation and require standard customer support mediation.
```

---

## 🛡️ 4. Matriz de Rastreabilidade Anti-Esquecimento

Todo projeto derivado de uma otimização EARS deve manter uma tabela de rastreabilidade 1:1:

| ID EARS | Descrição Normativa | Camada Banco | Camada BFF | Camada UI | Teste Vitest |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `[EARS-1]` | Persistência de planta 2D | `store_floor_plans` | `getStoreFloorPlan` | `PdvTerminal` | `pdv-floor-plan.test.ts` |
| `[EARS-2]` | Despacho para comanda | `order_items` | `addItemsToTableComanda` | `handleSendItemsToTable` | `pdv-floor-plan.test.ts` |
| `[EARS-3]` | Perícia visual anti-fraude | `rma_requests.notes` | `analyzeClaimForScam` | `ResolutionDrawer` | `rma-modifiers.test.ts` |
