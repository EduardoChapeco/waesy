# Transformation Examples — EARS & Prompt Optimizer

> **Guia Prático:** Quatro transformações completas demonstrando a evolução de uma solicitação vaga para uma especificação executável de alto padrão.

---

## Exemplo 1: Aplicativo de Tarefas & Anti-Procrastinação

### 1.1 Requisito Original
> *"Crie um app de lembretes e tarefas para pessoas que procrastinam muito, que ajude a organizar o dia e não deixe a pessoa esquecer as coisas."*

### 1.2 Diagnóstico de Fragilidades
- **Excessivamente abrangente:** Não especifica o que caracteriza a procrastinação nem como quebrar tarefas.
- **Gatilhos ausentes:** Falta definir quando os alertas são enviados e com qual frequência.
- **Critérios não mensuráveis:** *"Não deixe a pessoa esquecer"* não define taxa de sucesso nem canais de notificação.

### 1.3 Transformação EARS
1. `[EARS-1] When a user inputs a task with estimated duration > 30 minutes, the system shall prompt automatic decomposition into 2-5 actionable micro-steps (<= 15 minutes each).`
2. `[EARS-2] While a task is scheduled for today, when the deadline is within 45 minutes and status is 'pending', the system shall trigger a high-priority notification with single-touch action 'Start 5-min Sprint'.`
3. `[EARS-3] When the user completes any micro-step, the system shall update the visual progress bar and trigger an immediate haptic feedback and micro-celebration animation.`
4. `[EARS-4] If the user ignores 3 consecutive scheduled nudges, then the system shall offer a friction-reduction modal to reschedule or downscale the task.`

### 1.4 Teorias de Domínio Aplicadas
- **Modelo BJ Fogg (B = MAT):** Aumenta a habilidade quebrando a tarefa em micro-passos para exigir menor motivação inicial.
- **Efeito Zeigarnik:** Visualização da barra de progresso estimula a conclusão do ciclo inacabado.
- **Cognitive Load Theory:** Eliminação de formulários extensos em favor de captura rápida em 1 toque.

### 1.5 Prompt Otimizado Resultante
```markdown
# Role: Senior Behavioral Product Designer & Fullstack Engineer

## Skills
- Task Decomposition via Fogg Behavior Model
- Micro-interaction Design (Haptic feedback, positive reinforcement)
- Time-triggered Notifications with Progressive Escalation

## Workflows
1. Capture & Decompose: User inputs title -> Parser detects cognitive weight -> Generates 3 subtasks.
2. Sprint Execution: Floating timer on Thumb Zone -> 15-minute countdown -> Check completion.
3. Resiliency: Auto-snooze with friction analysis if delayed.

## Formats
- Database: tables \`tasks\` and \`task_substeps\` with integer minutes and status enum.
- Mobile UI: Edge-to-edge list (<640px) with 44px touch targets.
```

---

## Exemplo 2: PDP de E-commerce com Modificadores & Frete

### 2.1 Requisito Original
> *"Quero uma página de produto bonita que tenha complementos, mostre o frete e deixe o cliente comprar fácil."*

### 2.2 Diagnóstico de Fragilidades
- **Sem regras de validação:** Não especifica grupos obrigatórios de complementos nem limites mínimo/máximo de seleção.
- **Ausência de modelo financeiro:** Não declara moeda em centavos (`Integer Cents`) nem tolerância geográfica de frete.

### 2.3 Transformação EARS
1. `[EARS-1] When the product detail page loads, the system shall fetch the item and all active modifier groups from 'product_modifier_groups'.`
2. `[EARS-2] While the user selects optional modifiers, the system shall dynamically compute and display the updated total unit price in the bottom Thumb Zone in Integer Cents (BRL).`
3. `[EARS-3] If any modifier group has 'isRequired = true' and current selections < minSelections, then the system shall disable the 'Add to Bag' button and display a badge indicating remaining required choices.`
4. `[EARS-4] When the user requests shipping calculation, the system shall validate CEP via ViaCEP and compute delivery distance via Haversine Formula within 500ms.`

### 2.4 Teorias de Domínio Aplicadas
- **Lei de Hick:** Agrupamento de adicionais em acordeões contextuais para reduzir a sobrecarga cognitiva de escolha.
- **Ancoragem de Preços:** Destaque para o valor base e exibição clara do delta (`+ R$ X,XX`) por item.

---

## Exemplo 3: Redefinição de Senha & Segurança contra Fraude

### 3.1 Requisito Original
> *"Faça uma tela de esqueci minha senha que envie um e-mail com link para trocar a senha com segurança."*

### 3.2 Diagnóstico de Fragilidades
- **Risco de Enumeração de Usuários:** Revelar se o e-mail existe no banco vaza dados de clientes (LGPD).
- **Sem Limites de Taxa:** Vulnerabilidade a ataques de negação de serviço e spam de e-mails via bot.

### 3.3 Transformação EARS
1. `[EARS-1] When a password reset request is submitted, the system shall respond with a generic confirmation message regardless of whether the email exists in the database.`
2. `[EARS-2] If the submitted email exists, then the system shall generate a cryptographically secure, single-use token with 15-minute expiration and dispatch the reset link.`
3. `[EARS-3] If more than 3 reset requests are made for the same IP or email within 10 minutes, then the system shall reject subsequent attempts with HTTP 429 (Too Many Requests).`
4. `[EARS-4] While setting a new password, the system shall enforce minimum 8 characters, allow clipboard paste (WCAG 3.3.8) and invalidate all existing active sessions upon success.`

### 3.4 Teorias de Domínio Aplicadas
- **Zero Trust & OWASP Top 10:** Prevenção de enumeração de contas e proteção contra replay attacks.
- **WCAG 2.2 (3.3.8 Accessible Authentication):** Permissão irrestrita para geradores de senhas colarem credenciais.

---

## Exemplo 4: Painel de Vendas Multi-Tenant com Auditoria

### 4.1 Requisito Original
> *"Um dashboard de vendas da loja com gráficos, faturamento e lista dos últimos pedidos."*

### 4.2 Diagnóstico de Fragilidades
- **Multi-Tenant Frágil:** Sem garantia de isolamento criptográfico e RLS por `store_id`.
- **Valores Flutuantes:** Falta de conciliação com o caixa aberto (`cash_registers`).

### 4.3 Transformação EARS
1. `[EARS-1] When a store staff loads the dashboard, the system shall derive tenant identity exclusively from the authenticated session JWT and enforce RLS where store_id = session.store_id.`
2. `[EARS-2] The system shall compute total revenue strictly by summing 'amount_paid_cents' from orders with status 'paid' or 'delivered'.`
3. `[EARS-3] While telemetry is enabled, the system shall render sales progression in 24-hour and 30-day aggregations with zero cumulative layout shift (CLS < 0.1).`
4. `[EARS-4] If a network error occurs during metrics polling, then the system shall display cached local data with a non-intrusive 'Offline / Reconnecting' indicator and auto-retry using exponential backoff.`
