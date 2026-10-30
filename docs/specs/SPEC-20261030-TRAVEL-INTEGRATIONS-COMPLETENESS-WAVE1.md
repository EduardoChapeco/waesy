# SPEC-20261030 Travel Integrations Completeness Wave 1

## Objetivo

Auditar e fechar a cadeia de cotação, composição de pacote, reserva, aprovação, contrato, pagamento, viagem do cliente, financeiro e canais WhatsApp para turismo e viagens corporativas, preservando os conectores existentes e sem criar uma segunda lógica concorrente.

## Requisitos EARS

- **Quando** o cliente buscar somente transporte aéreo, **o sistema deve** consultar e renderizar apenas ofertas do canal Wooba configurado para a agência, com origem do provedor e snapshot persistível.
- **Quando** o cliente montar um pacote com hotel, aéreo, traslado, passeio ou seguro, **o sistema deve** usar o orquestrador canônico, preservar a origem de cada oferta e validar passageiros, idades e ocupação de quartos antes de permitir reserva.
- **Quando** uma cotação ou pacote for salvo, **o sistema deve** persistir cliente, viajantes, composição, ofertas, preços server-side, agência e lead CRM em uma operação rastreável, sem confiar em preço enviado pelo cliente.
- **Quando** uma oferta virar reserva, **o sistema deve** revalidar disponibilidade/preço no provedor, criar ou atualizar a viagem, emitir contrato e registrar o estado financeiro sem declarar sucesso antes da confirmação correspondente.
- **Quando** uma cotação entrar por WhatsApp, **o sistema deve** vincular a instância exclusivamente à loja/agência autorizada, registrar a sessão e encaminhar a mesma entidade de cotação usada no app e no workspace.
- **Quando** o fluxo corporativo exigir aprovação, **o sistema deve** aplicar política, aprovador, orçamento e trilha de auditoria antes da emissão ou cobrança.
- **Quando** um provedor, credencial ou endpoint estiver indisponível, **o sistema deve** mostrar estado honesto, registrar erro operacional e manter o rascunho recuperável, sem toast de sucesso simulado.

## Invariantes

1. Rotas e componentes não acessam Supabase diretamente para mutações; usam `src/services/`.
2. Segredos de provedores permanecem server-side e isolados por agência/loja.
3. Wooba e InfoTravel têm capacidades explícitas; uma busca de voo isolada não pode misturar resultados de pacote.
4. Valores financeiros, taxas, markup e total são calculados e revalidados no servidor.
5. Toda transição importante possui estado carregando, sucesso confirmado, erro recuperável e persistência verificável.
6. Uma única entidade canônica conecta cotação, lead, proposta, reserva, contrato, pagamento e viagem.

## Evidências obrigatórias

- Matriz de rotas, funções BFF, tabelas/migrations, RLS e testes.
- Testes de contrato para seleção de canal, passageiros/quartos, snapshot e transição cotação → proposta → reserva.
- Testes de regressão para WhatsApp, corporativo, contrato e financeiro.
- Verificação de contratos físicos BFF/tabelas e auditoria de botões após cada mutação.
- Evidência separada para código, testes, build e tráfego real de provedor; código existente não prova credenciais nem chamadas externas vivas.

## Escopo da onda

- Inventário comparativo entre Waesy e `projetos-referencias/travelagencias`.
- Identificação de duplicações e lacunas de integração sem remoção de fluxo.
- Fechamento do contrato canônico de seleção de canal e composição de busca.
- Registro de riscos que exigem credenciais, ambiente de homologação ou validação humana antes de produção.
