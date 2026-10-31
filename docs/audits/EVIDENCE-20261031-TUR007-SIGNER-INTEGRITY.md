# Evidência TUR007

Data 2026-10-31; branch main; HEAD 7aa076f6c24b3098e81cad7972c078b070905c9c; base origin/main (ahead 12). Worktree inicial limpo; relatório revisional criado pelo líder durante a auditoria preservado. PR/checks remotos não consultados.

Preflight: AGENTS, skill waesy-integrity-auditor, template ledger, DESIGN, DESIGN-LINT, cartão W12.3/W12.4, relatório AUDITORIA-TURISMO-20261030, BFF, tipos importados, migrations de signers/planilha/carnê e testes existentes lidos. Sem edição de UI/SQL. Autorização do líder baseada no pedido explícito de correção do usuário.

Baseline: configureContractSigners exclui pendentes sem reconciliar cotas; ignora erro de exclusão; signContractAsPayer anuncia commissionRecorded sem confirmar INSERT. Teste novo antes da mutação: 8 casos, 6 falhas esperadas, 2 passes; exit 1. Falhas: percentual, centavos, zero explícito, erro delete, erro INSERT financeiro e ausência de ID financeiro.

Depois da correção: 5 arquivos/31 testes PASS, exit 0, 17.28s, incluindo os 8 testes de handler. Foram adicionados depois dois controles positivos (centavos explícitos e flag financeira com ID): execução final do arquivo de handler com 10 testes PASS, exit 0, 2.78s. Diff-check do BFF: exit 0. Nenhum build/typecheck global executado nesta fatia.

Alterações: esquema distingue centavos ausentes de zero; totais reconciliados antes da primeira escrita; delete com erro aborta antes de INSERT; flag financeira exige ID retornado sem erro. Demais branches e modelo financeiro preservados.

Limites: banco simulado nos testes de handler; nenhuma prova de RLS, banco real, concorrência, reload, navegador, CI ou produção. Atomicidade permanece aberta sem RPC; demais problemas de carnê e modelo financeiro não são corrigidos nesta fatia. Signers previamente assinados não são substituídos pelo delete e podem acumular com nova configuração: requer bloqueio/versionamento transacional posterior. Arredondamento que não feche o total é rejeitado, exigindo centavos explícitos. TUR007 permanece parcial.
