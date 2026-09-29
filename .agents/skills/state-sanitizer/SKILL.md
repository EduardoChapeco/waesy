---
name: state-sanitizer
description: Higienização de estado multi-contexto (Civil, Loja, Criador) e eliminação de resíduos de sessão (B7), cookies divergentes e vazamento de dados.
---

# State Sanitizer — Sanitização de Estado e Multi-Contexto

## Gatilho
Ao alternar perfis, criar negócios, navegar entre workspace e vitrine pública ou detectar resíduo de estado de loja anterior.

## Quando NÃO Usar
- Em componentes puramente apresentacionais sem dependência de identidade de usuário ou tenant.

## Entradas
1. Cookies de sessão (`waesy_active_tenant`, `waesy_active_context`, `waesy_active_creator`).
2. Identidade do servidor (`getServerIdentity()`, `getUserSession()`).
3. Cache de consultas de cliente (React Query / TanStack Router context).

## Saídas
- Estado de sessão sincronizado atômico, sem vazamento entre lojas e sem resíduos B7.

## Procedimento
1. Verificar a coerência dos três polos de verdade:
   - Identidade autenticada (`auth.uid()`).
   - Contexto ativo declarado no cliente (cookie / estado de UI).
   - Contexto ativo reconhecido pelo backend no request (`getServerIdentity()`).
2. Se qualquer polo divergir, sanitizar setando os cookies sincronizados em lote.
3. Ao alternar para contexto de loja:
   - Gravar `waesy_active_context=store`.
   - Gravar `waesy_active_tenant={store_id}`.
   - Limpar `waesy_active_creator` (max-age=0).
4. Ao alternar para contexto civil:
   - Gravar `waesy_active_context=civil`.
   - Limpar `waesy_active_tenant` (max-age=0).
   - Limpar `waesy_active_creator` (max-age=0).
5. Invalidar caches de dados pertencentes exclusivamente ao escopo anterior.

## Regras Duras
- Existir mais de uma fonte de verdade para "perfil ativo" é achado grave de classe B7.
- Nunca confiar no `store_id` vindo do frontend sem validação de vínculo na sessão do servidor.
- Contexto civil e criador NUNCA podem carregar `store_id` ativo (Zero-Trust Civil Root).

## Anti-Padrões
- Setar cookie de tenant sem atualizar o cookie de contexto correspondente.
- Deixar dados da loja anterior na tela após o usuário selecionar outra empresa.

## Critério de Pronto
Alternância de perfil executada sem resíduo de dados e validada nos dois sentidos com sessão limpa.
