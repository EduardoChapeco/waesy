# W2.6 — Assinatura manual de envelope

**Data:** 2026-10-07  
**Branch:** `audit/full-remediation-20261007`

## Findings

O handler aceitava entradas sem limites, não bloqueava envelope expirado e fazia a transição para `signed` sem compare-and-set; duas requisições concorrentes poderiam registrar evidências duplicadas.

## Correção

- token, imagem, metadados de cliente e coordenadas agora têm limites/validação;
- envelope expirado é rejeitado;
- evidência é verificada antes da transição;
- status só muda de `pending` para `signed` em operação condicional;
- a tentativa concorrente perdedora remove sua própria evidência e retorna de modo idempotente.

## Evidência

4 arquivos / 9 testes focados verdes; typecheck verde; diff check verde. A garantia transacional definitiva em RPC/SQL e o uso de IP real do request permanecem pendentes para prova em runtime/banco.
