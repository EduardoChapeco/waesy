---
description: Disciplina Ponytail de Segurança, Menor Diff Funcional e Teste Obrigatório para o Waesy
globs: "src/services/**,src/lib/**,src/routes/**,supabase/migrations/**"
---

# 04 — Ponytail Security & Lean Engineering (Waesy Standard)

> **Princípio Central:** O melhor código é o código não escrito — menos código e menos dependências significam menor superfície de ataque. Nunca economizar linhas cortando validação, segurança, tratamento de erro ou testes de risco.

---

## 1. Antes de Editar (Escopo e Callers)
- **Grep de Callers Obrigatório:** Antes de alterar assinatura, retorno ou regra de qualquer função em `src/services/` ou `src/lib/`, executar busca (`git grep`) em todos os chamadores, rotas, testes e webhooks conectados.
- **Raiz Única:** Se um bug existe em função compartilhada, corrigir uma vez na raiz; proibido remendar apenas um caller deixando os demais vulneráveis.

## 2. Menor Mudança Completa (Anti-Bloat & Redução de Superfície)
- **Reuso Primeiro:** Verificar helpers, componentes e RPCs já existentes no repositório antes de criar novos.
- **Zero Dependência Supérflua:** Usar Web APIs/stdlib ou dependências já instaladas; nunca adicionar pacote novo para poucas linhas.
- **Zero Abstração Especulativa:** Proibido criar wrappers pass-through, factories de um produto ou configurações "para o futuro". Deletar código morto sempre que seguro.

## 3. Fronteiras Intocáveis (Never Cut)
- **Validação de Entrada:** Toda `createServerFn` em `src/services/*.functions.ts` valida payload com Zod na borda antes de qualquer query.
- **Autoridade Server-Side:** Nunca confiar em `user_id`, `tenant_id`, `store_id`, preço ou saldo vindo do cliente; derivar identidade via `getServerIdentity()` e recalcular valores no servidor/PostgreSQL.
- **Atomicidade Sob Carga:** Operações de saldo, estoque, cupom ou reserva não podem usar padrão *check-then-write* no JS; devem usar `.rpc()` atômico ou constraint no PostgreSQL.
- **Segredos e Aleatoriedade:** Proibido `Math.random()` para tokens, códigos de verificação, IDs de segurança ou senhas (usar `crypto.randomUUID()` / `crypto.getRandomValues()`).

## 4. Teste Obrigatório em Lógica de Risco
- Toda alteração não-trivial em **dinheiro (centavos), autenticação, autorização/RLS, parser, webhook ou escrita crítica** deve deixar pelo menos 1 teste automatizado que falhe se a regra quebrar.

## 5. Fechamento Transparente
- Ao final de auditorias ou mudanças de risco, registrar explicitamente o que **não foi checado** (`Not checked`) e qualquer risco residual conhecido.
