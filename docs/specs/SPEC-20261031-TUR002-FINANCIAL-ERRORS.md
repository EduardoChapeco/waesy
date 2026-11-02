# TUR002 — Comissões

Data: 2026-10-31. Aprovação: pedido vigente do usuário para corrigir os achados, com escopo delimitado nesta microfase.

## Escopo

- `src/routes/workspace.turismo.comissoes.tsx`: loader, erro recuperável e confirmação de gravação.
- `src/services/travel-financials.functions.ts`: somente import de autorização e handler de listagem.
- `src/services/travel-financials-list.test.ts`: regressão do handler.
- Este documento e `docs/audits/EVIDENCE_LEDGER_20261031_TUR002.md`.

## Requisitos EARS

- Quando a leitura financeira falhar, o sistema deve mostrar erro e permitir repetir, sem apresentar coleção vazia como sucesso.
- Quando não houver registros autorizados, o sistema deve manter a coleção vazia real.
- Quando receber filtro de loja, o servidor deve validar identidade e associação antes de consultar, limitando a leitura ao tenant autorizado.
- Quando a gravação falhar, o sistema deve preservar o formulário, não inserir registro local e não emitir confirmação.
- Quando a gravação retornar sucesso com identificador persistido, a tela deve usar esse identificador e os valores retornados pelo servidor.

## Limites e evidência

Não alterar planilha local, dashboard, liquidação rápida, contrato de gravação geral, migrations ou produção. TUR003 e liquidação rápida continuam abertos. Prova: testes do handler com erro DB, coleção vazia, isolamento e ausência de tenant; diff cirúrgico. Browser, RLS real, typecheck/build globais não fazem parte da evidência desta fatia.
