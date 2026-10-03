# SPEC-M08: Super Checkout Metamórfico por Nicho, Order Bumps, Produtos Digitais & Governança de Ofertas (Versão 1.0 - Histórica)

## 1. Metadados e Controle Normativo
- **Código:** SPEC-M08-SUPER-CHECKOUT-E2E-NICHES-V1
- **Versão:** 1.0 (Arquivo Histórico de Especificação)
- **Autoridade:** BigTech Executive Board & Red Team (CPO, Arquiteto Chefe, Engenharia de Dados & Segurança, Design Ops, QA).
- **Invariantes:** M01 (Zero Mocks), M03 (Auditabilidade), M04 (Idempotência), M08 (Integridade Transacional), M10 (Isolamento Multi-Tenant), WCAG 2.2 AA.
- **Normas de UI:** Apple Human Interface Guidelines (HIG), Linear Design System, Proibido !important (DL-04), Proibido Valores Arbitrários (DL-02), Touch Target >= 44px (DL-14), Foco Teclado :focus-visible (DL-15).

---

## 2. Mapa Ontológico de Modelos de Compra por Nicho

| Nicho / Vertical | Modelo de Transação | Regras de Checkout & Onboarding | Entrega & Frete | Pós-Checkout |
| :--- | :--- | :--- | :--- | :--- |
| **Turismo & Viagens** | Venda de Vagas / Pacotes | Manifesto de Passageiros (Nomes, CPF/Passaporte, Nascimento), cálculo de subtotal por passageiro (`cart.subtotal * N vagas`), selo Cadastur. | Frete Físico Zerado (dispensa CEP/endereço). | Emissão do Voucher Oficial de Viagem com código único e manifesto registrado. |
| **Produtos Digitais & Cursos** | Arquivo, Licença, Link | Dispensa de endereço físico; coleta apenas de e-mail/WhatsApp do titular para liberação. | Frete Físico Zerado. | Liberação imediata: Link seguro com senha única gerada, download direto de arquivo ou chave serial de ativação. |
| **Serviços & Agendamentos** | Reserva de Horário / Sessão | Seleção de data, horário livre (slot) e profissional; política de sinal configurável (100% online, sinal % ou balcão). | Presencial / No Local. | Comprovante de agendamento, bloqueio de agenda, lembrete automático e controle de no-show. |
| **Gastronomia & Delivery** | Preparo Imediato & Comanda | Seleção de adicionais/modificadores por prato; pergunta ecológica de talheres e guardanapos; observações de cozinha por item. | Delivery imediato com motoboy sob demanda ou retirada balcão. | KDS em tempo real com status Novo -> Em Preparo -> Pronto -> Em Rota. |
| **Supermercado, Açougue & Feira** | Pesáveis por Quilo / Gramas | Passo de pesagem (100g em 100g); política de substituição (similar, WhatsApp ou cancelar); quem recebe as compras. | Entrega programada ou retirada expressa. | Painel de separação/picking com conferência de balança e ajuste de valor final. |
| **Locação & Aluguel de Bens** | Curta Duração (Diárias) | Seleção de check-in / check-out com diárias automáticas; termo de responsabilidade; opção de caução/depósito de garantia. | Retirada na loja ou frete de entrega/coleta técnica. | Contrato de locação digital emitido e checklist de vistoria de saída/retorno. |
| **Varejo Físico Tradicional** | SKU Físico / Grade | Seleção de tamanho/cor; cálculo de frete por CEP (Correios/Jadlog/Melhor Envio); dados de entrega e recebedor. | Cotação dinâmica por peso e cubagem. | Rastreamento de encomenda com código de envio e nota fiscal. |
| **Pet Shop & Veterinária** | Cuidados & Produtos | Nome/porte do pet quando serviço de banho/tosa; agendamento ou frete padrão para rações e produtos físicos. | Delivery programado ou balcão. | Confirmação da ficha clínica/pet e instruções de acolhimento. |
| **Farmácia & Drogaria** | Saúde & Medicamentos | Upload de receita quando medicamento controlado; verificação de dosagem e CRM. | Entrega prioritária rápida em até 60 minutos. | Notificação de conferência pelo farmacêutico responsável. |
| **Eventos & Ingressos** | Lotes / Lugares Marcados | Seleção de lote/setor; identificação nominal de cada portador de ingresso; QR Code individual. | Ingresso digital imediato (sem frete). | Ingresso digital com validação anticópia em wallet/app. |
| **Veículos & Autopeças** | Alto Valor & Test-Drive | Agendamento de test-drive e proposta para veículos; frete transportadora para autopeças físicas. | Retirada na concessionária ou frete pesado. | Proposta comercial vinculada ao CRM e agendamento de entrega das chaves. |
| **Imóveis & Locação** | Visita & Proposta | Agendamento de visita presencial, documentação de proposta e análise cadastral. | Atendimento in loco. | Protocolo de análise imobiliária e contato com o corretor responsável. |
| **Assistência Técnica** | Ordem de Serviço (OS) | Descrição do defeito, número de série/IMEI do aparelho e termo de responsabilidade. | Postagem com código reverso ou entrega em balcão. | Acompanhamento do status da OS em tempo real pelo cliente. |
| **Advocacia & Consultoria** | Consulta Inicial & Honorários | Agendamento de sessão jurídica inicial, área do direito e termo de confidencialidade. | Reunião presencial ou videoconferência. | Link da sala virtual ou confirmação de presença no escritório. |
| **Educação Presencial** | Matrícula & Turma | Seleção de turma, turno, dados do aluno e aceite do regulamento acadêmico. | Sem frete físico. | Emissão de comprovante de matrícula e liberação de grade horária. |
| **Notícias & Assinatura** | Acesso a Conteúdo Local | Seleção de plano de leitura local (mensal/anual), liberação imediata pós-PIX/cartão. | Acesso digital instantâneo. | Desbloqueio imediato do feed sem paywall e envio de newsletter. |
| **Atacado & Distribuidora** | Faturamento B2B / Grade | Validação de CNPJ e Inscrição Estadual, tabela progressiva por lote e faturamento a prazo. | Frete FOB ou CIF com transportadora credenciada. | Emissão de espelho de pedido B2B e envio para aprovação de crédito. |
| **Serviço sob Medida** | Briefing & Orçamento | Preenchimento de briefing, envio de fotos/arquivos de referência e solicitação de orçamento. | Visita técnica ou envio digital de proposta. | Proposta comercial formalizada com SLA de aprovação. |

---

## 3. Matriz Ontológica dos 15 Arquétipos Canônicos de Oferta

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MOTOR UNIVERSAL DE OFERTAS WAESY                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ A01: Produto Simples com Estoque      │ A09: Serviço por Orçamento                     │
│ A02: Produto com Variações (SKU)      │ A10: Locação de Curta Duração (Diárias)        │
│ A03: Produto Composto / Kit / Combo   │ A11: Locação de Longa Duração (Contratos)      │
│ A04: Produto com Adicionais e Extras  │ A12: Venda de Alto Valor com Documentação      │
│ A05: Produto Digital (Link/Licença)   │ A13: Ingresso / Evento / Lotes                 │
│ A06: Assinatura / Plano / Clube       │ A14: Varejo de Consumo / Peso (100g em 100g)   │
│ A07: Pacote / Bundle de Serviços      │ A15: Serviço Avulso / Taxa / Processo          │
│ A08: Serviço com Agendamento & Vagas  │                                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
