# Pix de reservas

Data: 2026-10-30. Estado: proposta para decisão humana após parada B.10.4; implementação não iniciada.

## Problema

`generateTravelReservationCheckout`, em `src/services/travel-contract.functions.ts:677-689`, presume CNPJ, telefone ou `pix@waesy.com` quando a agência não configurou chave. O BRCode pode ser incluído em instrução ao cliente sem recebedor confirmado. A reprodução deve usar dados inteiramente sintéticos e não chamar gateway, enviar mensagem ou efetuar pagamento.

## Requisitos EARS

- Quando a reserva solicitar Pix com valor positivo, o sistema deve exigir chave explicitamente configurada para a agência autenticada.
- Se a chave estiver ausente, vazia ou composta apenas de espaços, o sistema deve interromper essa geração antes de qualquer efeito colateral de contrato/checkout, com erro acionável para configurar o recebimento.
- Quando existir chave configurada, o sistema deve preservar a chave, o valor em centavos e o vínculo da agência no BRCode.
- Enquanto Pix não for solicitado, o sistema deve preservar o fluxo existente sem exigir chave.
- Se ocorrer falha na validação ou geração de Pix, o sistema não deve retornar sucesso para checkout solicitado com Pix nem incluir código alternativo na mensagem.
- O sistema nunca deve substituir chave ausente por CNPJ, telefone ou e-mail padrão, nem anunciar que a titularidade bancária foi verificada sem integração que a confirme.

## Escopo atômico proposto

| Arquivo | Alteração proposta |
|---|---|
| src/services/travel-contract.functions.ts | Validar configuração antes de efeitos; remover fallback e propagação silenciosa de erro no caminho Pix |
| src/services/travel-reservation-checkout-pix.test.ts | Novo teste focado que invoque o handler real com dependências isoladas, sem pagamentos reais |

Não alterar emissão, assinatura, modelos de comissão, gateways nem políticas corporativas nesta fatia. Se o caller exigir mudança de contrato, registrar paths e revisar escopo antes de editar.

## Prova de aceite

| Caso | Evidência exigida |
|---|---|
| Agência sem chave, com CNPJ/telefone preenchidos | Rejeição; nenhuma alternativa usada e nenhum efeito lateral |
| Agência sem qualquer identificador financeiro | Rejeição; nunca pix@waesy.com |
| Chave vazia ou espaços | Rejeição |
| Chave explícita e valor válido | BRCode usa chave e valor fornecidos; mensagem corresponde |
| Pix não solicitado | Fluxo permanece funcional |
| Erro do gerador | Falha observável, sem success true enganoso |
| Outro tenant | Configuração vem da identidade autorizada, sem entrada cliente que substitua store_id |

Primeiro reproduzir a falha na baseline local, depois aplicar diff cirúrgico, repetir testes e executar os gates aplicáveis. Build, banco, browser e produção são níveis separados. Aprovar esta spec não autoriza pagamento, envio de mensagem, migração ou deploy.
