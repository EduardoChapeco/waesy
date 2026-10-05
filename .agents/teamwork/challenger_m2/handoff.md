# Handoff Report — Challenger M2: BFF Adversarial Challenge

- **Milestone:** M2 (Camada BFF e Ingestores de Telemetria 360º — Requisito R2)
- **Agent:** Challenger M2 (`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\challenger_m2`)
- **Status:** REQUEST_CHANGES (Adversarial Defect Found with Empirical Proof)
- **Data:** 2026-10-05

---

## 1. Observation

1. **Execução da Suíte Base do Worker M2:**
   - Comando: `cmd /c npx vitest run src/services/admin-360-governance.functions.test.ts`
   - Resultado: 24 de 24 testes passaram em 252ms (Exit Code 0).
   ```
   ✓ src/services/admin-360-governance.functions.test.ts (24 tests) 252ms
   Test Files  1 passed (1)
        Tests  24 passed (24)
   ```

2. **Detecção de Defeito Crítico de Perda de Dados em `recordCartTelemetryEvent`:**
   - Arquivo: `src/services/admin-360-governance.functions.ts`
   - Linhas 194-195 (Schema Zod):
     ```ts
     metadata: z.record(z.any()).optional().default({}),
     payload: z.record(z.any()).optional().default({}),
     ```
   - Linha 881 (Handler):
     ```ts
     const safePayload = metadata ?? payload ?? {};
     ```
   - Linhas 908-909 (Insert no Banco):
     ```ts
     payload: safePayload,
     metadata: safePayload,
     ```
   - Prova Empírica em `src/services/admin-360-governance.adversarial.test.ts:248`:
     Chamando `recordCartTelemetryEvent` com `{ payload: { customKey: "valor_critico", coupon: "DESC10" } }` (sem passar `metadata`), o Zod aplica o default `{}` para `metadata`. Como `{}` não é nulo nem indefinido, a coalescência `metadata ?? payload` avalia para `{}`.
     Resultado verbatim da execução do teste Vitest:
     ```
     FAIL  src/services/admin-360-governance.adversarial.test.ts > EMPIRICAL CHECK: recordCartTelemetryEvent quando invocado apenas com 'payload' (sem 'metadata')
     AssertionError: expected {} to deeply equal { customKey: 'valor_critico', coupon: 'DESC10' }
     - Expected
     + Received
     - {
     -   "coupon": "DESC10",
     -   "customKey": "valor_critico",
     - }
     + {}
     ```

3. **Detecção de Defeito de Perda de Dados em `recordStaffActionLog`:**
   - Arquivo: `src/services/admin-360-governance.functions.ts`
   - Linhas 209-210 (Schema Zod):
     ```ts
     details: z.record(z.any()).optional().default({}),
     metadata: z.record(z.any()).optional().default({}),
     ```
   - Linha 1022 (Handler):
     ```ts
     const safeDetails = details ?? metadata ?? {};
     ```
   - Prova Empírica em `src/services/admin-360-governance.adversarial.test.ts:267`:
     Chamando `recordStaffActionLog` com `{ metadata: { chave_nfe: "422610..." } }` (sem passar `details`), o Zod aplica o default `{}` para `details`. A coalescência `details ?? metadata` avalia para `{}`, descartando silenciosamente o `metadata`.
     Resultado verbatim da execução do teste Vitest:
     ```
     FAIL  src/services/admin-360-governance.adversarial.test.ts > EMPIRICAL CHECK: recordStaffActionLog quando invocado apenas com 'metadata' (sem 'details')
     AssertionError: expected {} to deeply equal { Object (chave_nfe) }
     - Expected
     + Received
     - {
     -   "chave_nfe": "42261000000000000000000000000000000000000000",
     - }
     + {}
     ```

4. **Detecção de Fragilidade de Sanitização Rasa em `recordFormSubmissionAudit`:**
   - Arquivo: `src/services/admin-360-governance.functions.ts`
   - Linhas 777-792: A iteração sobre `safePayload` inspeciona apenas o primeiro nível de chaves (`Object.entries(safePayload)`). Caso um formulário envie dados aninhados (ex: `{ usuario: { password: "..." } }`), as credenciais aninhadas não são redactadas e vazam em texto claro no banco.

5. **Verificação do Motor SHA-256 (`computeSha256Digest`):**
   - 500 iterações com payload idêntico geraram 100% de paridade estrita (determinismo comprovado).
   - 1.000 entradas com mutação de entropia geraram 1.000 hashes hexadecimais de 64 caracteres com zero colisões (resistência a colisão comprovada).
   - Sensibilidade a ordem de chaves confirmada: `{ a: 1, b: 2 }` e `{ b: 2, a: 1 }` geram hashes diferentes devido ao `JSON.stringify` nativo. Como os snapshots do BFF são construídos com chaves literais estáticas, a ordem interna é estável.

---

## 2. Logic Chain

1. **Origem do Defeito:**
   O Worker M2 implementou schemas Zod onde campos sinônimos (`payload`/`metadata` e `details`/`metadata`) foram declarados simultaneamente com `.optional().default({})`.
2. **Falha de Coalescência Nula:**
   No operador de coalescência nula do TypeScript/JavaScript (`A ?? B`), a expressão avalia `B` somente se `A === null` ou `A === undefined`. Quando o Zod valida o objeto de entrada, ele preenche campos ausentes com o valor default `{}`. Portanto, `A` nunca é nullish, tornando `B` inalcançável.
3. **Impacto na Persistência:**
   Em `recordCartTelemetryEvent`, qualquer chamada que utilize a chave canônica `payload` (prevista no contrato e na migration SQL) tem seus dados substituídos por `{}` e gravados em branco tanto em `payload` quanto em `metadata`. O mesmo ocorre em `recordStaffActionLog` para a chave `metadata`.
4. **Violação da Invariante B.25:**
   A Invariante B.25 exige expressamente: "incluindo tratamento defensivo para valores opcionais/nulos, acompanhada de testes unitários que exercitem branches com parâmetros presentes e ausentes". O teste anterior não testou a branch onde `payload` está presente e `metadata` está ausente, permitindo que a perda silenciosa de dados passasse despercebida.
5. **Decisão:**
   O papel do Challenger proíbe modificar o código de produção diretamente. Portanto, o veredito obrigatório é `REQUEST_CHANGES`, solicitando que o Worker M2 aplique as correções pontuais recomendadas e unifique os testes.

---

## 3. Caveats

- **No caveats.** Os dois defeitos de perda de dados foram reproduzidos empiricamente via Vitest com asserções estritas que falharam em tempo de execução real.
- O motor SHA-256 opera conforme as especificações em ambiente Web Crypto, com determinismo e resistência a colisão validados.

---

## 4. Conclusion

**Veredito:** `REQUEST_CHANGES`

O módulo `src/services/admin-360-governance.functions.ts` possui excelente estrutura e atende à maioria dos requisitos de segurança e isolamento Master. No entanto, contém 2 defeitos críticos de descarte silencioso de payload e metadata nas Server Functions de telemetria e auditoria, além de uma sanitização rasa em formulários.

### Correções Necessárias pelo Worker M2:

1. **Em `recordCartTelemetryEvent` (linha 881):**
   Substituir:
   ```ts
   const safePayload = metadata ?? payload ?? {};
   ```
   Por união/merge resiliente onde nenhum dado seja perdido:
   ```ts
   const safePayload = { ...(payload || {}), ...(metadata || {}) };
   ```

2. **Em `recordStaffActionLog` (linha 1022):**
   Substituir:
   ```ts
   const safeDetails = details ?? metadata ?? {};
   ```
   Por união/merge resiliente:
   ```ts
   const safeDetails = { ...(metadata || {}), ...(details || {}) };
   ```

3. **Em `recordFormSubmissionAudit` (linhas 777-792):**
   Tornar a sanitização de dados sensíveis recursiva para objetos aninhados.

4. **Incorporar os testes de `src/services/admin-360-governance.adversarial.test.ts`** na suíte principal `src/services/admin-360-governance.functions.test.ts` para blindagem definitiva contra regressões.

---

## 5. Verification Method

Para reproduzir empiricamente a falha reportada:

1. **Executar a suíte adversarial criada pelo Challenger:**
   ```powershell
   cmd /c npx vitest run src/services/admin-360-governance.adversarial.test.ts
   ```
   *Evidência Observada:* 2 testes falham comprovando o descarte de `payload` e `metadata` com `AssertionError: expected {} to deeply equal { ... }`.

2. **Executar a suíte base existente:**
   ```powershell
   cmd /c npx vitest run src/services/admin-360-governance.functions.test.ts
   ```
   *Evidência Observada:* 24 testes passam, demonstrando que a suíte base tinha um falso-positivo por não verificar a preservação do payload alternativo.

3. **Condição de Invalidação deste Relatório:**
   O relatório é invalidado se o Worker M2 alterar as linhas 881 e 1022 para efetuar o merge de aliases e ambos os testes em `admin-360-governance.adversarial.test.ts` passarem com Exit Code 0.
