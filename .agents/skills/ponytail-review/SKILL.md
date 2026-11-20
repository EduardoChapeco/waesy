---
name: ponytail-review
description: >
  Code review rigoroso estilo Ponytail adaptado ao Waesy: verifica lógica, segurança BFF/RLS,
  concorrência sob carga, callers impactados, testes de risco e excesso de código (bloat).
  Uso: "review this", "ponytail-review", "revisar PR/diff".
---

# Ponytail Review — Revisão de Mudanças (Waesy Edition)

Revise o diff como o engenheiro sênior que será acordado se isso quebrar em produção.
Ordem de prioridade: **correto > seguro > aguenta carga > testado > rápido > enxuto**.
Apenas lista achados; não altera código.

---

## 1. Entender Primeiro
- Identificar o alvo: alterações não commitadas (`git diff`), branch, PR ou arquivos nomeados.
- Ler o diff **e o código conectado**: fazer `git grep` de todos os *callers* de funções modificadas em `src/services/` ou `src/lib/`, além de testes e migrations relacionadas.
- Rastrear o fluxo real: entrada -> Zod -> `getServerIdentity()` -> banco/RPC -> saída.
- Assumir uso concorrente multi-tenant.

## 2. O que Procurar
1. **Bug:** edge cases (vazio, zero, arredondamento, timezone), caller quebrado por mudança de assinatura/retorno, correção aplicada só em um caller.
2. **Risco / Segurança:** `createServerFn` sem Zod, payload confiando em `store_id`/`tenant_id`/`price`, bypass de RLS, `Math.random()` em segurança, segredo exposto, erro engolido.
3. **Escala:** *check-then-write* race condition, query dentro de loop (N+1), estado em memória por processo.
4. **Falta de Teste:** nova lógica de dinheiro, auth, permissão, webhook ou parser sem teste que falhe se quebrar.
5. **Velocidade:** lentidão real em caminho crítico.
6. **Lean:** código morto introduzido, helper duplicando utilitário existente em `src/lib/`, dependência nova desnecessária, wrapper sem valor.

## 3. Regras de Qualidade do Review
- Sem achados vagos ("considere melhorar", "estilo"). Cada item precisa de cenário concreto de falha.
- Reconfirmar no arquivo real antes de apontar (ex.: verificar se o caller realmente existe ou se o valor pode realmente ser nulo).
- Propor sempre a menor correção possível.

## 4. Formato de Saída
- `What this change does:` (2–3 frases).
- Achados numerados em **Must fix**, **Should fix**, **Nice to have** (cada um com `What this is`, `Problem` com `arquivo:linhas`, `Fix` e `If we skip it`).
- Encerrar com:
  - `Verdict:` `Ship.` ou `Fix <números> first.`
  - `Lean:` `-N lines possible.` (se aplicável).
  - `Not checked:` o que não foi possível verificar.
