# Cotas contratuais

Autorização: correções da auditoria autorizadas pelo usuário; fatia TUR007 e confirmação de gravação da planilha. Escopo exclusivo: `src/services/travel-continuous-flow.functions.ts`, teste de handler novo e este ledger/spec.

- QUANDO configurar assinantes, O SISTEMA DEVE reconciliar percentuais em 100% e valores em centavos com o total contratual antes de excluir registros.
- SE uma cota monetária for informada, O SISTEMA DEVE respeitá-la, inclusive zero, sem substituição silenciosa pelo percentual.
- SE a exclusão ou inserção falhar, O SISTEMA DEVE informar erro e não anunciar configuração salva.
- QUANDO registrar a linha financeira após assinatura, O SISTEMA DEVE anunciar `commissionRecorded` somente após confirmar o ID persistido.

Não existe RPC de substituição de assinantes encontrada nas migrations consultadas. Esta fatia não promete atomicidade, isolamento concorrente, emissão de boleto nem cálculo canônico de comissão. Exclusão seguida de inserção ainda requer RPC transacional futura. Não altera regras comerciais de rateio ou tratamento de papéis.

Aceite: testes executam handlers importados, positivos e negativos de percentual, centavos, zero explícito, falha de exclusão/inserção e confirmação da linha financeira. Nenhuma migration aplicada nem deploy.
