# Integridade pós-assinatura

Autorização: pedido do usuário para corrigir os achados da auditoria; fatia delegada TUR004/005/007. Escopo: travel-continuous-flow.functions.ts e testes desta fatia. Preservar alterações anteriores de segurança.

- QUANDO configurar pagadores, O SISTEMA DEVE validar que suas cotas somam exatamente o total do contrato e 100%, antes de qualquer escrita.
- SE já houver assinatura concluída, O SISTEMA DEVE rejeitar reconfiguração para preservar a versão assinada.
- QUANDO concluir uma assinatura, O SISTEMA DEVE confirmar as leituras e a atualização do contrato antes de anunciar conclusão de todos os signatários.
- QUANDO faltarem condições financeiras confirmadas, O SISTEMA NÃO DEVE criar carnês, comissões ou recebimentos estimados; DEVE retornar pendências explícitas de conciliação financeira.
- SE a assinatura foi persistida e a conclusão auxiliar falhar, O SISTEMA DEVE distinguir assinatura salva de conclusão pendente.

Evidência: testes dos handlers reais com cliente de banco simulado, incluindo falhas de leitura/escrita e ausência de efeitos financeiros. Isso não prova RLS, transações concorrentes, navegador ou produção. Não inclui migration nem deploy.
