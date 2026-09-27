---
description: Regras de Segurança, Integridade Transacional e BFF do Omni-Commerce
globs: ["src/services/**", "src/routes/**", "supabase/migrations/**"]
---

# 03 — Omni-Commerce Backend & Segurança Server-Side (Waesy Standard)

> **Regra de Ouro:** Zero Math no Cliente. Nenhuma decisão financeira ou transacional ocorre no navegador. O servidor é a autoridade absoluta de verdade.

---

## 1. Fortaleza Matemática Server-Side (Zero Math)
- **Payload do Cliente:** O frontend envia estritamente `product_id` e `quantity`. É EXPRESSAMENTE PROIBIDO enviar `total_amount`, preço unitário ou taxas calculadas pelo cliente.
- **Cálculo de Preço:** O BFF consulta o preço oficial na tabela `products`/`product_variants`, aplica cupons do banco, calcula taxas de entrega e comissões e assina a transação no PostgreSQL (`.rpc`).
- **Dinheiro em Centavos:** Dinheiro é SEMPRE integer cents (`price_cents`, `total_cents`, BRL). Proibido float no banco ou em contratos.

## 2. Isolamento de Identidades (Identity Nexus)
- **Separação de Entidades:**
  * **Conta Civil (`user_id`):** Compras, responsabilidade jurídica, dados transacionais (CPF, Nome Legal).
  * **Persona Criador (`creator_profile_id`):** Vitrines digitais, biolinks e links de afiliados. Não realiza compras diretamente.
  * **Empresa / Loja (`store_id`):** Inventário, catálogo, faturamento e logística.
- **Context Switcher:** A alternância de contexto ocorre via cookie seguro (`waesy_active_context`), derivando autoridade no servidor.

## 3. RLS & Autorização Deny-by-Default
- **Sem Confiança no Payload:** Mutações nunca confiam em `tenant_id` ou `store_id` passados pelo cliente. A autoridade é derivada via `getServerIdentity()` a partir da sessão Supabase.
- **Validação de UUID:** Toda rota dinâmica ou mutation DEVE validar IDs com Zod (`z.string().uuid()`).
- **UUID Não é Permissão:** Conhecer o identificador de uma entidade não concede direito de consulta. A política de RLS e o BFF devem auditar a posse do tenant.

## 4. Atomicidade & Anti-Concorrência
- **Idempotência:** Operações financeiras, de estoque e de despacho utilizam transações atômicas no PostgreSQL.
- **Anti-Double Booking:** Recursos temporais usam restrição `btree_gist` e verificação atômica de sobreposição (`hold_resource_slot`).
