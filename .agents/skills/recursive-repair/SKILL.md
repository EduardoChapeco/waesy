---
name: recursive-repair
description: Ciclo fechado de correção profunda na raiz (Fase H), proibindo os 5 remendos superficiais e reauditando a vizinhança em 2 saltos.
---

# Recursive Repair — Ciclo Recursivo de Reparo Profundo

## Gatilho
Ao corrigir qualquer achado registrado no ledger `reparo/05-ledger.json`.

## Quando NÃO Usar
- Durante a fase inicial de diagnóstico e levantamento de evidências (Fase A).

## Entradas
1. Item do ledger com status `aberto` e score priorizado.
2. Análise forense da causa raiz.
3. As 5 perguntas de correção profunda respondidas por escrito.

## Saídas
- Código corrigido na raiz, diff documentado e vizinhança (chamadores/chamados) reauditada.

## Procedimento
1. Responder por escrito às 5 perguntas de correção profunda antes de editar o código:
   - 1: Qual é a evidência de que este é o ponto exato de falha?
   - 2: Por que rompeu aqui e não antes na cadeia?
   - 3: O que impede essa falha de voltar?
   - 4: Quem mais depende do que vou mudar?
   - 5: Se eu reverter, o sintoma volta idêntico?
2. Aplicar a alteração mínima necessária para erradicar a causa raiz.
3. Auditar a vizinhança imediata em dois saltos (quem chama e quem é chamado pela função/componente).
4. Rodar o teste de regressão e verificar se a reprodução original não mais ocorre.
5. Atualizar o status do item no ledger para `corrigido`.

## Regras Duras
- Os 5 Remendos Proibidos são terminantemente vetados:
  1: Engolir exceção em bloco catch vazio.
  2: Devolver dado padrão fictício para mascarar ausência.
  3: Adicionar setTimeout para "dar tempo de carregar".
  4: Trocar a key do React sem entender o ciclo de vida.
  5: Redirecionar para a home para escapar do erro.
- Proibido reduzir capacidade ou apagar campo para "fazer funcionar".

## Anti-Padrões
- Corrigir apenas onde o erro apareceu sem investigar a fonte que gerou o dado inválido.
- Modificar múltiplos módulos não correlacionados em um mesmo turno sem prova unitária.

## Critério de Pronto
Causa raiz corrigida, teste de vizinhança limpo e item selado no ledger.
