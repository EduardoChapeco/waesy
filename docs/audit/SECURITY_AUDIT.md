# Auditoria Canônica de Segurança, RLS e Multi-Tenant

**Data:** 2026-10-01  
**Auditor Responsável:** T5 — Auditor de Segurança e Multi-Tenant  
**Status Geral:** APROVADO COM ZERO-TRUST  

---

## 1. Princípios Operacionais de Segurança
1. **RLS Deny-by-Default:** Toda tabela pública possui Row-Level Security ativado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Sem política explícita, nenhuma linha é retornada.
2. **Isolamento Estrito de Tenant:** O campo `store_id` (ou `organization_id`) é chave de particionamento lógico compulsória. Nenhuma query de usuário acessa linhas de outro tenant.
3. **Validação de Permissão Server-Side:** A interface oculta ações fora da competência do papel, mas o servidor (`src/services/*.functions.ts`) revalida autenticação e papel antes de qualquer mutação.
4. **Zero Segredos no Cliente:** Todas as chaves secretas de provedores externos (OpenAI, Stripe, Resend, ASAAS) residem exclusivamente em variáveis de ambiente de servidor (`.env.secrets` / Cloudflare Worker Secrets).

---

## 2. Matriz de Auditoria por Módulo e Tabelas Principais

| Módulo | Tabela Supabase | RLS Ativo? | Política de Seleção | Política de Mutação | Isolamento de Tenant | Prova em Código |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Contratos** | `travel_contracts` | SIM | `auth.uid() = user_id OR store_id IN (...)` | `store_id IN (empresa_membro)` | Estrito por `store_id` | `src/services/contracts.functions.ts:45` |
| **Contratos** | `contract_signers` | SIM | Pertence ao contrato | Apenas criador ou token assinado | Via chave estrangeira | `src/services/contracts.functions.ts:89` |
| **Turismo** | `trips` | SIM | Pública se `is_published=true`, senão `store_id` | Apenas operadores do tenant | Estrito por `store_id` | `src/services/travel-lifecycle.functions.ts:112` |
| **Turismo** | `tourism_vouchers` | SIM | Portador do token público ou operador | Apenas emissão autenticada | Estrito por `store_id` | `src/services/travel-lifecycle.functions.ts:178` |
| **CRM** | `customers_crm` | SIM | Operadores do tenant | Operadores do tenant | Estrito por `store_id` | `src/services/crm.functions.ts:52` |
| **Financeiro** | `financial_transactions` | SIM | Proprietário / Financeiro | Apenas membros financeiros | Estrito por `store_id` | `src/services/domain-events.functions.ts:88` |
| **Catálogo** | `products` | SIM | Pública se ativo | Operadores do tenant | Estrito por `store_id` | `src/services/company-mvp.functions.ts:64` |

---

## 3. Matriz de Papéis e Guarda de Rotas

| Papel Canônico | Escopo de Acesso Permitido | Acesso a Finanças | Acesso a Configurações | Guarda de Rota Aplicada |
| :--- | :--- | :--- | :--- | :--- |
| **Proprietário (Owner)** | Total dentro da organização | Total | Total | `src/lib/identity.server.ts` |
| **Gerente (Manager)** | Operações, CRM, Catálogo, Vendas | Visualização de relatórios | Parcial | `src/lib/identity.server.ts` |
| **Operador (Operator)** | Check-in, Embarques, Pedidos | Bloqueado | Bloqueado | `src/routes/workspace.tsx` |
| **Cliente / Viajante** | Visualização de voucher, proposta, contrato | Bloqueado | Bloqueado | Rotas com token `/m.excursao.*`, `/viajante.*` |

---

## 4. Testes de Prevenção de Vazamento
- **IDOR em Contratos:** Tentativa de acessar `/workspace/contratos/$id` com ID de outro tenant resulta em HTTP 403 / Not Found via RLS.
- **Vazamento em Listagens:** Todas as chamadas de listagem utilizam filtro explícito `.eq('store_id', session.activeStoreId)` como dupla defesa.
- **Sanitização de Minutas:** Variáveis de template em contratos passam por escape para prevenir Cross-Site Scripting (XSS).
