---
name: ponytail-audit
description: >
  Auditoria de qualidade, segurança, concorrência e enxugamento (Ponytail) adaptada ao Waesy:
  bugs, furos de BFF/RLS, race conditions, código de risco sem teste e código morto/duplicado.
  Gera relatório ranqueado sem alterar código. Uso: "auditar codebase", "ponytail-audit",
  "varredura de segurança e bloat".
---

# Ponytail Audit — Auditoria Completa (Waesy Edition)

Audite o escopo solicitado como o engenheiro sênior que será acionado de madrugada quando quebrar.
Ordem de prioridade: **correto > seguro > aguenta carga > testado > rápido > enxuto**.
Relatório *one-shot*: não modifica código.

---

## 1. Mapear Primeiro
- Definir o alvo: pasta, módulo (`src/services/`, `src/routes/`, `supabase/migrations/`) ou repositório inteiro.
- Ler `package.json` (scripts de auditoria e dependências), `AGENTS.md`, regras em `.agents/rules/` e pontos de entrada (`src/services/*.functions.ts`, webhooks, jobs).
- Assumir carga multi-tenant concorrente (múltiplos usuários, lojas, motoristas e webhooks simultâneos).
- Rastrear fluxos críticos ponta a ponta: entrada do usuário -> validação Zod -> `getServerIdentity()` -> query/RPC PostgreSQL -> resposta ao cliente.

## 2. O que Procurar (6 Eixos)

1. **Bug:** resultado errado, crash, edge case (vazio, zero, arredondamento, fuso horário UTC vs `America/Sao_Paulo`), callers que discordam do retorno, mesma regra aplicada diferente em dois lugares.
2. **Risco / Segurança:**
   - `createServerFn` sem `.inputValidator()` / schema Zod.
   - Confiança em `tenant_id`, `store_id`, `user_id`, preço ou desconto vindo do payload do cliente.
   - Uso de client admin/service-role (`supabaseAdmin`) sem validação explícita de posse/permissão.
   - Injeção, `dangerouslySetInnerHTML` sem sanitização, `Math.random()` em tokens/OTPs, segredos hardcoded, vazamento server->client.
   - Perda de dados (erros engolidos silenciosamente, escritas fora de transação).
3. **Escala / Concorrência:** padrão *check-then-write* (ler saldo/estoque no JS e depois atualizar) sujeito a race condition; queries N+1 em loops; estado mutável em memória de worker; crescimento ilimitado de lista/memória.
4. **Falta de Teste:** lógica de risco (dinheiro, auth, permissão/RLS, webhook, parser, escrita crítica) sem teste `.test.ts` que falhe quando quebrar.
5. **Velocidade:** gargalos reais em caminhos quentes (evitar micro-otimizações irrelevantes).
6. **Lean (Enxugamento):**
   - *delete:* código morto, flags/opções nunca usadas, features especulativas.
   - *reuse:* helpers duplicados fazendo a mesma coisa.
   - *stdlib / native:* dependência externa usada para algo que Web API/Node/JS nativo resolve em poucas linhas.
   - *yagni:* abstração com 1 implementação, wrapper pass-through.
   - *merge / split:* cópias quase iguais que devem andar juntas, ou arquivos/funções monolíticas misturando responsabilidades não testáveis.

## 3. Checar Antes de Reportar
- Todo achado exige **caso concreto**: "esta entrada/situação gera este resultado errado". Sem caso concreto, não reportar.
- Antes de marcar código como morto, rodar `git grep` em todo o repo (incluindo rotas, testes, configs e referências dinâmicas).
- Propor a **menor correção funcional** possível, preferindo deletar código a adicionar camadas.

## 4. Formato de Saída
- Iniciar com `What this repo/scope does:` (2–3 frases + carga assumida).
- Agrupar achados em **Must fix**, **Should fix**, **Nice to have** (omitir grupos vazios), numerados sequencialmente (máx. 20 achados; se houver mais, informar quantos ficaram de fora).
- Cada achado com 4 campos curtos:
  - **What this is:** o que o trecho faz.
  - **Problem:** a falha concreta (arquivo e linhas).
  - **Fix:** menor correção possível.
  - **If we skip it:** impacto real se não corrigir.
- Encerrar com:
  - `Verdict:` o que corrigir primeiro (ou `Healthy. Nothing to fix.`).
  - `Lean:` `-N linhas / -M dependências` possíveis, quando aplicável.
  - `Not checked:` o que não foi lido ou executado.
