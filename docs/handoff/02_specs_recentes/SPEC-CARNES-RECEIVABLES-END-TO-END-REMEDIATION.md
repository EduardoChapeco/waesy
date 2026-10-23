# SPEC-CARNES-RECEIVABLES-END-TO-END-REMEDIATION — Auditoria, Correção e Refatoração End-to-End do Módulo de Carnês, Parcelamentos e Acordos

## 1. Contexto e Motivação
A funcionalidade de Carnês (`/_store/conta/carnes`) e seu espelho de gestão no Workspace (`/workspace/financeiro/recebiveis`) representam o motor central de crédito próprio, parcelamento lojista e confissão de dívidas comerciais da plataforma Waesy.
O módulo não pode ser apenas um mostrador estático de parcelas: ele é o elo transacional entre a origem da compra/acordo, o cronograma financeiro, os encargos contratuais de atraso, o envio de comprovantes, a conciliação bilateral, o lançamento no financeiro pessoal e a auditoria imutável no ledger.

A auditoria identificou os seguintes gaps estruturais e funcionais que esta especificação resolve:
1. **Ausência de Chave de Pedido e Origem em Receivables**: O modelo `receivables` não possuía chave estrangeira `order_id` nem tipagem explícita de `origin_type` ('order', 'deal_p2p', 'store_pos', 'condicional_conversion', 'renegotiation'), limitando a rastreabilidade entre compras de catálogo e carnês;
2. **Desconexão com a Agenda Pessoal (`_store.agenda.tsx`)**: As parcelas de carnê eram mapeadas com propriedades incorretas (`carne.total_installments` em vez de `installments_count`, `carne.store_name` em vez de `store.name`), gerando rótulos quebrados como "Parcela 1/undefined";
3. **Cálculo de Quitação Antecipada Inexistente**: O cliente não possuía endpoint ou fluxo para simular e quitar integralmente as parcelas vincendas com dedução de juros futuros e desconto de pontualidade;
4. **Renegociação Estruturada de Inadimplência**: Faltava o fluxo de refinanciamento de carnês em atraso com geração de novo contrato (`renegotiated_from_id`), encerramento do carnê anterior e registro na tabela `receivable_adjustment_log`;
5. **Ausência de Realtime no Portal do Cliente**: Quando a loja aprovava ou rejeitava um comprovante no Workspace, a interface do cliente não se atualizava reativamente sem um F5 manual;
6. **Suporte Contextualizado de Cobrança**: Ao precisar de atendimento ou contestar um encargo, não havia transporte direto dos parâmetros do carnê e da parcela para o canal de suporte.

---

## 2. Requisitos em Sintaxe EARS

### [EARS-01] Rastreabilidade da Origem Comercial
- **Quando** um carnê for criado por qualquer das origens da plataforma (Pedido em loja, Negociação P2P em Classificados, Venda Balcão no Workspace, Conversão de Mala Condicional ou Renegociação);
- **O sistema DEVE** registrar a origem canônica (`order_id`, `deal_id`, `contract_id`, `renegotiated_from_id`) e o `origin_type`, tornando o carnê consultável tanto pelo cliente quanto pela loja com link bilateral para o documento original;
- **Invariante:** Se a loja alterar suas políticas genéricas de juros ou multas após a emissão do carnê, as taxas pactuadas no cabeçalho do carnê (`interest_rate_monthly`, `fine_percent`, `grace_days`) permanecem imutáveis.

### [EARS-02] Transparência e Recalculo Contábil de Encargos
- **Quando** o cliente ou a loja visualizar as parcelas de um carnê ativo;
- **O sistema DEVE** calcular dinamicamente os dias de atraso (`late_days`), a multa contratual (`fine_cents`) e os juros moratórios pro-rata die (`interest_accrued_cents`) a partir das taxas gravadas no cabeçalho, exibindo o detalhamento matemático completo (Nominal + Multa + Juros - Desconto = Total);
- **Invariante:** Parcelas quitadas (`status = 'paid'`) têm seus valores financeiros e datas de liquidação congelados imutavelmente.

### [EARS-03] Simulação e Quitação Antecipada (Amortização com Desconto)
- **Quando** o cliente solicitar a quitação antecipada de uma ou mais parcelas vincendas através de `calculateEarlySettlement`;
- **O sistema DEVE** calcular o montante total com isenção total de juros futuros e aplicação de eventual desconto de pontualidade oferecido pelo credor, gerando o PIX copia-e-cola correspondente;
- **Invariante:** A baixa antecipada deve liquidar simultaneamente as parcelas selecionadas somente após conciliação da loja.

### [EARS-04] Conciliação Bilateral Zero-Trust com Espelhamento no Financeiro Pessoal
- **Quando** a loja aprovar a conciliação de um comprovante no Workspace (`approveInstallmentPayment`);
- **O sistema DEVE** executar a transação atômica (`approve_installment_conciliation` RPC): marcar a parcela como paga, recalcular o status do carnê para `settled` se todas as parcelas forem pagas, registrar automaticamente o lançamento imutável de despesa em `personal_financial_entries` do cliente, selar a operação no Ledger Criptográfico (`recordLedgerEntryCore`) e notificar o devedor;
- **Invariante:** O envio de comprovante pelo cliente NUNCA quita a dívida automaticamente; o status permanece em `conciliation_status = 'pending'` até conferência da loja.

### [EARS-05] Sincronização Perfeita com a Agenda Pessoal
- **Quando** o usuário civil autenticado acessar `/_store/agenda`;
- **O sistema DEVE** mapear todas as parcelas ativas a vencer, populando com exatidão `title: Parcela X/Y`, `subtitle: Nome da Loja`, `image: Logo da Loja`, data de vencimento e valor formatado, permitindo salto com 1 clique para a tela de quitação;
- **Invariante:** Nenhuma parcela pode exibir propriedades indefinidas (`undefined`) ou lojas anônimas quando os dados estiverem disponíveis no cadastro.

### [EARS-06] Renegociação de Carnês Inadimplentes
- **Quando** a loja ou o cliente acordarem um refinanciamento de parcelas em atraso via `renegotiateCarne`;
- **O sistema DEVE** cancelar as parcelas abertas do carnê devedor, marcar o carnê anterior como `renegotiated`, criar o novo carnê vinculado por `renegotiated_from_id` e registrar o histórico completo na tabela de auditoria `receivable_adjustment_log`;
- **Invariante:** O valor total refinanciado deve corresponder exatamente ao saldo devedor recalculado ou ao novo valor contratual pactuado entre as partes.

### [EARS-07] Notificação e Realtime Reativo
- **Quando** qualquer evento de conciliação (aprovação, recusa, lembrete ou renegociação) ocorrer;
- **O sistema DEVE** notificar o usuário civil por notificação in-app e propagar a alteração via canal Realtime da tabela `receivable_installments`, atualizando a interface sem exigir recarregamento.

---

## 3. Matriz de Aceite e Evidências
1. Migration `supabase/migrations/20270219000000_carnes_receivables_hardening.sql` criada com adições seguras (`order_id`, `origin_type`, `renegotiated_from_id`, `early_settlement_discount_cents`, `settled_at`);
2. BFF `src/services/receivables.functions.ts` refatorado com enriquecimento das queries, funções `calculateEarlySettlement`, `renegotiateCarne`, `getClientCarneDossier` e validação Zod rigorosa;
3. Rota `src/routes/_store.agenda.tsx` corrigida eliminando `undefined` e mapeando `carne.installments_count` e `carne.store?.name`;
4. Rota `src/routes/_store.conta.carnes.tsx` atualizada com:
   - Realtime subscription com cleanup seguro;
   - Alvos táteis de 44px (`h-11 min-h-11`);
   - Textos honestos de estado vazio para cada aba;
   - Modal de Quitação Antecipada com simulação transparente;
   - Botão de atendimento / suporte contextualizado para `/u/suporte`;
   - Link para Pedido quando `carne.order_id` existir;
5. Suíte de testes automatizados `src/services/__tests__/carnes-receivables-end-to-end.test.ts` cobrindo 100% dos fluxos;
6. `npm run typecheck` com Exit Code 0;
7. Registro de DEC-279 em `docs/design/DECISIONS.md`.
