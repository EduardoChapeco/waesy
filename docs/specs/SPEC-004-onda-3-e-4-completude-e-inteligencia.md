# SPEC-004 — Execução das Ondas 3 e 4: Higiene Cognitiva, Inteligência Transacional e Devolução de Valor

## 0. Metadados e Controle
- **ID da Spec:** SPEC-004
- **Módulos:** Checkout, Marketing, CRM (Leads WhatsApp), RH/Segurança (PIN Audit), Stories e Logística
- **Status:** APROVADA
- **Data:** 2026-10-01
- **Dependência:** SPEC-000 (Diretrizes de Design), SPEC-001 (Fundamentos do Ledger), SPEC-002 (Onda 1), SPEC-003 (Onda 2)

---

## 1. Escopo Delimitado e Arquivos Autorizados
Esta especificação autoriza intervenções atômicas nos seguintes arquivos delimitados:
1. `src/routes/_store.checkout.tsx` (Correção da verificação de erro/sucesso na aplicação de cupom e vale-presente)
2. `src/routes/workspace.marketing.carrinhos.tsx` (Vinculação de cupom de desconto real no disparador de recuperação WhatsApp)
3. `src/services/crm.functions.ts` (Implementação de `listWhatsAppLeads`, `claimWhatsAppLead` e `listLeadActivities`)
4. `src/routes/workspace.crm.tsx` (Adição da aba de Inbox de Leads WhatsApp com atribuição rápida a vendedor)
5. `src/services/hr.functions.ts` (Implementação de `listEmployeePinAuditLogs` para rastreabilidade de acessos e autorizações gerenciais)
6. `src/services/stories.functions.ts` (Implementação de `getStoreStoriesAnalytics` agregando views, retenção e cliques em produto)
7. `src/services/shipping.functions.ts` (Implementação de `getShippingQuotesAnalytics` agregando cotações de frete por CEP/região)
8. `melhoria/05-ledger.json` (Atualização de status dos gaps para RESOLVIDO)
9. `melhoria/_estado.md` (Registro do estado de fechamento das Ondas 3 e 4)
10. `docs/design/DECISIONS.md` (Registro canônico DEC-054)

---

## 2. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### EARS-01: Validação Resiliente de Cupons e Vales no Checkout
- **Quando** o usuário digita um código promocional em `src/routes/_store.checkout.tsx`,
- **O sistema deve** validar o retorno da Server Function `applyCouponToCart`. Se o resultado contiver `status: "error"`, o sistema NÃO deve disparar toast de sucesso, devendo tentar alternativamente a consulta como vale-presente (`checkGiftCardBalance`) ou exibir o erro real informado pela regra de negócio.

### EARS-02: Recuperação de Carrinho com Cupom no WhatsApp
- **Quando** o comerciante clica no botão de recuperar carrinho via WhatsApp em `src/routes/workspace.marketing.carrinhos.tsx`,
- **O sistema deve** registrar a tentativa no banco (`markRecoveryAttempt`) e formatar a mensagem com menção explícita de oportunidade ou cupom de desconto ativo, incentivando a conversão sem fricção.

### EARS-03: Inbox de Leads WhatsApp no CRM
- **Onde quer que** mensagens sejam recebidas pelo webhook de WhatsApp em `whatsapp_leads`,
- **O sistema deve** disponibilizar no CRM (`src/routes/workspace.crm.tsx`) a visualização dessas oportunidades com número, última mensagem, canal e ação direta de "Assumir Lead" atribuindo o operador autenticado.

### EARS-04: Timeline de Auditoria de PIN Gerencial
- **Quando** um gestor consulta o histórico de segurança e autorizações no painel gerencial,
- **O sistema deve** retornar as ocorrências gravadas em `employee_pin_audit_logs` via `listEmployeePinAuditLogs` com horário, colaborador, terminal e status (sucesso ou bloqueio).

### EARS-05: Consolidação de Métricas de Stories e Logística
- **Enquanto** o lojista monitora o desempenho de marketing e frete,
- **O sistema deve** calcular agregados de visualizações em `story_analytics_events` e volume de cotações em `shipping_quotes` a partir dos dados já gravados na esteira operacional.

---

## 3. Diretrizes de Silêncio Visual e Erradicação do AI-Smell
1. **Sem Títulos Compostos:** Rótulos como "Leads WhatsApp" e "Carrinhos Abandonados" (máximo 4 palavras).
2. **Sem Placeholders:** Nenhum dado simulado ou "em breve"; estados vazios renderizam `EmptyState` canônico.
3. **Ergonomia e Toque:** Todos os botões e seletores mantêm altura mínima `h-10` ou `h-11` (>= 44px no mobile).
4. **Sem `!important` ou Valores Mágicos:** Uso estrito de tokens semânticos (`bg-card`, `border-border/60`, `font-mono`).

---

## 4. Critérios de Aceite e Evidência Esperada
- [ ] TypeScript compila com 0 erros (`npm run typecheck` Exit Code 0).
- [ ] Design lint mantém catraca com 0 regressões (`node scripts/design-lint.mjs --ratchet`).
- [ ] Gaps da Onda 3 e Onda 4 auditados e atualizados no `melhoria/05-ledger.json`.
- [ ] Registro canônico registrado em `docs/design/DECISIONS.md`.
