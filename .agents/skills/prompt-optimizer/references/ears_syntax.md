# EARS Syntax Reference — Easy Approach to Requirements Syntax

> **Origem:** Metodologia criada por Alistair Mavin (Rolls-Royce) para erradicar ambiguidades, inconsistências e omissões em especificações de engenharia crítica.

---

## 📐 Os 5 Padrões Canônicos do EARS

### 1. Requisito Ubíquo (Ubiquitous)
Aplica-se universalmente ao sistema, sem depender de eventos pontuais ou estados específicos.
- **Estrutura:** `The system shall <action>`
- **Exemplo:** `The system shall store all financial transactions as integer cents in BRL currency.`
- **Aplicação:** Invariantes de arquitetura, segurança de dados e políticas permanentes.

### 2. Orientado a Eventos (Event-Driven)
Disparado quando um evento externo ou ação do usuário acontece.
- **Estrutura:** `When <trigger>, the system shall <action>`
- **Exemplo:** `When the customer completes the PIX payment, the system shall transition order status to 'paid' and notify the store's dispatch panel within 2 seconds.`
- **Aplicação:** Transições de estado, cliques de botão, webhooks e recebimento de payloads.

### 3. Impulsionado por Estado (State-Driven)
Aplica-se continuamente enquanto o sistema ou entidade permanece em determinado estado.
- **Estrutura:** `While <state>, the system shall <action>`
- **Exemplo:** `While the cash register shift is open, the system shall permit POS sales and register entries.`
- **Aplicação:** Modos operacionais, sessões ativas, status de comanda e flags temporais.

### 4. Condicional / Opcional (Optional Features)
Aplica-se apenas quando uma configuração ou capacidade específica está habilitada.
- **Estrutura:** `Where <feature is included>, the system shall <action>`
- **Exemplo:** `Where the store has apartment delivery enabled, the system shall present condo access fields (block, tower, intercom) and apply the door fee.`
- **Aplicação:** Multi-tenant, módulos de nicho, flags de plano e recursos premium.

### 5. Comportamento Indesejado / Defensivo (Unwanted Behavior)
Lida com exceções, falhas de rede, limites estourados, violações de segurança e recuperação graciosa.
- **Estrutura:** `If <trigger/failure>, then the system shall <prevent/mitigate> AND execute <recovery>`
- **Exemplo:** `If the delivery GPS coordinates deviate more than 3.5 km from the informed address, then the system shall flag a location mismatch alert and request user confirmation before charging.`
- **Aplicação:** Prevenção de fraude, circuit breakers, validação de payload e fallbacks.

---

## 🔀 6. Padrões Complexos e Combinados

Na engenharia de sistemas robustos, múltiplos padrões são combinados de forma rigorosa:
- **Estado + Evento:** `While <state>, when <trigger>, the system shall <action>`
  - *Exemplo:* `While an order is in 'dispatched' state, when the courier crosses the 200m geofence, the system shall record arrival time and start the 10-minute waiting window.`
- **Estado + Evento + Condição:** `While <state>, when <trigger>, if <condition>, the system shall <action>`
  - *Exemplo:* `While checkout is active, when the user selects 'delivery', if the total amount is below store minimum order value, the system shall disable the submit button and display the missing amount.`

---

## 🚫 Anti-Padrões Proibidos na Redação EARS

| ❌ Erro Comum | Por que Falha | ✅ Correção EARS |
| :--- | :--- | :--- |
| *"O sistema deve ser rápido ao carregar o feed."* | Vago, não testável. | `When the user scrolls the feed, the system shall render the next page of items within 250ms (p95).` |
| *"Permitir cadastro de produtos com opcionais e fotos facilmente."* | Composto e prolixo. | Dividir em 2 declarações atômicas: uma para upload de imagem e outra para grupos de modificadores. |
| *"Caso o usuário erre a senha, avisar."* | Falta gatilho, status e segurança. | `If password validation fails, then the system shall increment failed_attempts counter, display a generic invalid credentials message, and lock the account after 5 consecutive failures.` |
