# SPEC-20261106-option-groups-error-sanitizer-and-tenant-resilience: Resiliência Multi-Tenant de Adicionais e Sanitizador Universal Anti-[object Object]

## 1. Contexto e Problema Empírico
Ao cadastrar ou vincular um Grupo de Adicionais/Modificadores no editor de produtos (`/workspace/catalogo/produtos/novo` e `/workspace/catalogo/produtos/$id`), o operador foi confrontado com um toast opaco exibindo:
`! [object Object]`
A análise forense e adversarial identificou uma cadeia de 4 falhas sistêmicas estruturais:
1. **Sanitização de Erros na UI (DL/UI Smells):** `toast.error(e?.message)` repassa diretamente instâncias ou payloads de erro onde `message` é um objeto serializado (ex: Zod issues, TanStack Start error response, JSON-RPC), resultando na conversão forçada `String(obj) === "[object Object]"`.
2. **Resolução de `store_id` Frágil em Server Functions:** `upsertOptionGroup`, `listOptionGroups` e `deleteOptionGroup` utilizavam cegamente `const { store_id } = await getServerIdentity();` sem aceitar `store_id` explícito no input e sem fallback defensivo para `identity.memberships[0]?.store_id`. Quando `waesy_active_context` do usuário estava em `"civil"`, `identity.store_id` era forçado a `null`, causando violação de restrição `NOT NULL` do PostgreSQL na tabela `option_groups`.
3. **Validação Zod de UUID Rígida com Strings Vazias:** Os schemas Zod exigiam `z.string().uuid().optional()`. Quando a UI repassa `id: ""` ou IDs voláteis temporários (`"temp-..."`), o Zod rejeita com `invalid_string (uuid)` em vez de converter strings vazias para `undefined`.
4. **Isolamento de Tenant em Builder Documents:** Em `src/services/builder.functions.ts`, verificações de existência de documentos lançavam `Error("No store found")` quando `identity.store_id` era `null`, sem consultar a loja ativa nos vínculos do membro.

## 2. Requisitos em Sintaxe EARS

### [EARS-01] Sanitização Universal de Mensagens de Erro
*QUANDO* qualquer operação assíncrona, Server Function ou chamada de rede capturar uma exceção `unknown`,
*O SISTEMA DEVE* invocar `extractErrorMessage(err, fallback)` garantindo que o texto retornado seja uma string legível em português, desempacotando JSON aninhado, mensagens de Zod e payloads de erro, e *NUNCA* emitir `"[object Object]"` para a interface.

### [EARS-02] Resolução Resiliente e Bilateral de `store_id` em Grupos de Opções
*QUANDO* o cliente invocar `upsertOptionGroup`, `listOptionGroups` ou `deleteOptionGroup`,
*O SISTEMA DEVE* aceitar opcionalmente `store_id` no payload, priorizando `input.store_id ?? identity.store_id ?? identity.memberships[0]?.store_id`, verificar autorização via `assertStoreAccess(identity, MANAGER_ROLES, targetStoreId)`, e vincular atomicamente o registro à loja ativa.

### [EARS-03] Tolerância a Chaves Primárias Vazias e IDs Temporários
*QUANDO* o formulário de grupo de opções submeter dados com `id` vazio (`""`), nulo ou prefixado com `"temp-"`,
*O SISTEMA DEVE* normalizar essas chaves para `undefined` tanto no schema do cliente quanto no validador Zod do BFF, executando `INSERT` limpo sem colisão de UUID.

### [EARS-04] Preservação de Contexto de Loja em Sessões Ativas
*QUANDO* um usuário autenticado possuir um cookie `waesy_active_tenant` válido que corresponda a um de seus `memberships`,
*O SISTEMA DEVE* preservar `identity.store_id = matchedMembership.store_id` mesmo se o cookie legado `waesy_active_context` estiver marcado como `"civil"`, prevenindo quedas silenciosas de tenant em rotas corporativas.

## 3. Critérios de Aceite e Evidências
- [ ] Utilitário puro `extractErrorMessage` exportado em `src/lib/utils.ts` com cobertura de testes unitários em `src/lib/__tests__/extract-error-message.test.ts` (100% dos cenários: string, Error, JSON aninhado, objeto Zod, objeto com statusText, e fallback).
- [ ] `upsertOptionGroup` aceita `store_id` e normaliza IDs vazios/temporários, gravando corretamente em `option_groups` e `option_values`.
- [ ] `QuickOptionGroupDialog` higieniza dados antes do envio e consome `extractErrorMessage` em todos os blocos `catch`.
- [ ] `identity.server.ts` mantém resiliência quando `matchedMembership` existe para o tenant ativo.
- [ ] `builder.functions.ts` usa fallback `identity?.store_id || identity?.memberships?.[0]?.store_id` eliminando o falso-positivo "No store found".
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
- [ ] `npm test -- src/lib/__tests__/` com 100% dos testes aprovados.
