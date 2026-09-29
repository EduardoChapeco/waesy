---
name: break-triage
description: Triagem, classificação taxonômica (B1 a B12) e pontuação de severidade de quebras de sistema antes de qualquer modificação de código.
---

# Break Triage — Classificação e Priorização de Quebras

## Gatilho
Ao encontrar qualquer falha, anomalia, inconsistência ou quebra de fluxo, antes de tocar em qualquer linha de código.

## Quando NÃO Usar
- Durante refatorações puras onde todos os testes e fluxos já estão íntegros e verificados.

## Entradas
1. Evidência técnica com caminho do arquivo e número da linha (`arquivo:linha`).
2. Linha do tempo produzida por `log-forensics`.
3. Checkpoint específico violado nos fluxos D1 a D5.

## Saídas
- Registro no ledger `reparo/05-ledger.json` com ID, classe B1..B12, checkpoint, causa raiz e score calculado.

## Procedimento
1. Mapear o sintoma para uma das 12 classes objetivas (B1 Tela Morta a B12 Duplicidade).
2. Localizar o checkpoint exato violado no fluxo correspondente (ex: D2-4).
3. Atribuir pontuação nas quatro escalas:
   - Impacto: 1 (cosmético) · 3 (bloqueia tarefa) · 5 (perde dado ou expõe).
   - Alcance: 1 (caso raro) · 3 (maioria) · 5 (toda a sessão).
   - Confiança: 1 (suspeita) · 3 (código e dado) · 5 (reproduzido nos dois shells).
   - Esforço: 1 (um arquivo) · 3 (vários módulos) · 5 (esquema ou dados históricos).
4. Calcular o score da quebra: `score = (impacto * 3 + alcance * 2 + confianca) / esforco`.
5. Inserir a entrada no ledger com estado `aberto`.

## Regras Duras
- Sem evidência comprovada em código (`arquivo:linha`), o item NÃO entra no ledger.
- Sem classe taxonômica explícita (B1 a B12), o item NÃO entra na fila de correção.
- Duplicidades de uma mesma causa contam como UM único achado, nunca múltiplos.

## Anti-Padrões
- Iniciar conserto imediato sem registrar a classificação no ledger.
- Atribuir score artificialmente alto sem justificativa técnica.

## Critério de Pronto
Linha do ledger gravada em `reparo/05-ledger.json` com campos preenchidos e inteligíveis por qualquer engenheiro.
