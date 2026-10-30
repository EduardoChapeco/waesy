# SPEC-20261030 — Completude de ações, onda 1

## Objetivo

Implementar os fluxos reais por trás de cada CTA prometido, eliminando ações simuladas sem remover capacidades de produto. A onda trata os controles identificados pela auditoria semântica em rotas e componentes de workspace; previews de classificados permanecem explicitamente `preview-only` apenas quando não prometem transação.

## Requisitos EARS

- Quando um CTA de workspace representar sincronização de dados, o sistema deve executar uma leitura/refetch real e apresentar sucesso somente depois da conclusão.
- Quando um CTA representar uma capacidade de produto, o sistema deve criar ou reutilizar um BFF, entidade e destino verificáveis antes de confirmar a ação.
- Quando faltar backend para uma capacidade prometida, o sistema deve implementar a Server Function mínima com validação, persistência e autorização antes de ligar a UI.
- Quando um CTA puder continuar por uma rota existente, o sistema deve navegar para essa rota usando um link acessível e válido.
- Quando uma superfície for apenas preview, seus callbacks devem informar a limitação sem simular persistência ou confirmação transacional.

## Escopo autorizado

- `src/routes/workspace.atendimento.index.tsx`
- `src/routes/workspace.empresa.viagens.tsx`
- `src/routes/workspace.turismo.corporativo.tsx`
- `src/routes/admin-master.marca.tsx`
- `src/routes/workspace.b2b.index.tsx`
- `src/components/commerce/supermarket/SupermarketClubDashboardView.tsx`
- `src/components/workspace/CustomerDrawer360.tsx`
- `src/routes/_store.conta.classificados.novo.tsx` somente para preservar a classificação `preview-only` sem novo efeito transacional.

## Invariantes

- Nenhum `onClick={() => toast(...)}` será entregue como ação de workspace.
- Botões de comprovante, reenvio, conexão, compra B2B, extrato e anamnese devem permanecer na superfície e completar a operação por serviço real ou por uma continuação verificável.
- Amostras visuais do design system só podem ser não interativas quando forem explicitamente amostras; quando apresentarem um controle, devem executar estado local observável sem simular persistência.
- Operações B2B, extrato e anamnese não podem criar registro vazio nem exibir toast de sucesso antes da resposta do BFF; seus formulários devem validar entradas e recarregar o estado persistido.
- A atualização de dados do canal deve propagar erro e não confirmar sucesso prematuramente.
- O preview não cria reserva, proposta ou registro financeiro.

## Evidências

- Auditoria interativa sem P1 nos arquivos de escopo.
- Testes focados existentes e checagem de rotas concluída.
- Diff cirúrgico, com contratos BFF e políticas de dados preservados; alterações de schema só são autorizadas quando a entidade prometida não possuir contrato físico.
