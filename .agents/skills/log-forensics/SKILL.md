---
name: log-forensics
description: Leitura sistemática de logs, requisições de rede, console e telemetria para montar linha do tempo de eventos e isolar a causa raiz de falhas.
---

# Log Forensics — Análise Forense & Linha do Tempo

## Gatilho
Sempre que existir falha relatada, tela branca, erro de execução ou comportamento anômalo sem causa raiz comprovada.

## Quando NÃO Usar
- Durante edição cosmética onde nenhum erro ou falha de sistema ocorre.
- Em tarefas exclusivamente documentais sem execução de código.

## Entradas
1. Console do navegador (mensagens de erro, avisos, pilha de execução).
2. Tráfego de rede (status HTTP, payloads enviados/recebidos, headers de autorização).
3. Logs de backend e servidor (PostgREST, Edge Functions, RPCs, rejeições de política RLS).
4. Estado de sessão no instante do erro (identidade autenticada, tenant ativo).

## Saídas
- Arquivo `reparo/00-timeline.md` ordenado cronologicamente com evento inicial marcado e hipótese justificada.

## Procedimento
1. Coletar todas as saídas de console com timestamps e stack traces completos.
2. Identificar requisições HTTP com status 4xx/5xx ou falhas CORS/CORS preflight.
3. Extrair logs de backend correlacionados na mesma janela de milissegundos.
4. Ordenar todos os eventos cronologicamente do primeiro ao último.
5. Deduplicar erros em cascata que decorrem do mesmo evento primário.
6. Isolar o PRIMEIRO evento que quebrou o fluxo e justificar por que ele é a causa raiz.

## Regras Duras
- Nunca concluir a causa raiz por um erro isolado sem cruzar rede, console e banco.
- Nunca aceitar erro repetido como múltiplas causas distintas.
- Separar rigorosamente a causa técnica do sintoma visual observado.

## Anti-Padrões
- Corrigir o erro mais chamativo ou recente em vez do evento inicial da cadeia.
- Ignorar requisições com status 401/403/404 assumindo que eram "esperadas".

## Critério de Pronto
Existe linha do tempo documentada em `reparo/00-timeline.md` com o evento inicial isolado e comprovado.
