# Revisão de turismo

Data: 2026-10-31. Branch main. HEAD inicial 7aa076f6c24b3098e81cad7972c078b070905c9c. Worktree inicial limpo; main estava 12 commits à frente da referência local origin/main. PR, CI, deploy e banco aplicado não verificados.

Autorização: pedido do usuário para revisar todos os achados e corrigir/refinar falhas confirmadas. Referência: AUDITORIA-TURISMO-20261030-FLUXOS-E-DESIGN.md, TUR-001 a TUR-025. Não considerar mensagens de commit como prova funcional.

## Preflight

| Fase | Leituras | Escopo | Reprodução/aceite |
|---|---|---|---|
| R1 auditoria | AGENTS, DESIGN, DESIGN-LINT, integrity-auditor, ledger, W12, relatório anterior, arquivos atuais e histórico Git | Turismo UI/rotas/BFF/testes/migrations; somente leitura | Reavaliar os 25 IDs com evidência atual |
| R2 Pix | Spec SPEC-20261030-TURISMO-PIX-SEM-FALLBACK, travel-contract.functions.ts, caller travel-booking-dossier-modal.tsx, pix-payload.ts, travel-contract-public-access.test.ts | travel-contract.functions.ts e novo travel-reservation-checkout-pix.test.ts; não editar schema | Chave ausente não pode criar contrato antes de falhar; ler erro de configuração não pode virar ausência silenciosa |

A spec Pix está autorizada pelo pedido de correção integral de 30/10, reiterado em 31/10. Demais correções precisam de escopo registrado antes da mutação. Nenhuma autorização de pagamento real, envio de mensagem, migration remota ou deploy é inferida.

## Gates iniciados

| Gate | Estado inicial |
|---|---|
| Typecheck global | Em execução |
| Contratos BFF/tabelas, consolidação de schema, paridade de rotas | Em execução |
| Banco real, RLS por papel, providers e browser | Não executados |

## Pendências observadas antes de editar

- TUR-001: fallback de chave eliminado, porém validação ainda ocorre depois de create_staff_travel_contract; teste de regressão exigido.
- Os demais IDs serão classificados após revisão independente dos arquivos atuais; não estão fechados por este documento.
