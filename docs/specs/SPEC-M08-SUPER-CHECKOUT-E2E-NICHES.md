# SPEC-M08: Super Checkout Metamórfico por Nicho, Order Bumps, Produtos Digitais & Governança de Ofertas

## 1. Metadados e Controle Normativo
- **Código:** SPEC-M08-SUPER-CHECKOUT-E2E-NICHES
- **Versão:** 2.0 (Master Enterprise & BigTech Governance)
- **Autoridade:** BigTech Executive Board & Red Team (CPO, Arquiteto Chefe, Engenharia de Dados & Segurança, Design Ops, QA).
- **Invariantes:** M01 (Zero Mocks), M03 (Auditabilidade), M04 (Idempotência), M08 (Integridade Transacional), M10 (Isolamento Multi-Tenant), WCAG 2.2 AA.
- **Normas de UI:** Apple Human Interface Guidelines (HIG), Linear Design System, Proibido !important (DL-04), Proibido Valores Arbitrários (DL-02), Touch Target >= 44px (DL-14), Foco Teclado :focus-visible (DL-15).

---

## 2. Mapa Ontológico de Modelos de Compra dos 18 Super Nichos

| # | Nicho / Vertical | Modelo de Transação | Regras de Checkout & Onboarding | Entrega & Frete | Pós-Checkout & Recibo |
| :- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Turismo & Viagens** | Venda de Vagas / Pacotes | Manifesto de Passageiros (Nomes, CPF/Passaporte, Nascimento), cálculo de subtotal por passageiro (`cart.subtotal * N vagas`), selo Cadastur. | Frete Físico Zerado (dispensa CEP/endereço). | Emissão do Voucher Oficial de Viagem com código único e manifesto registrado. |
| **02** | **Gastronomia & Delivery** | Preparo Imediato & Comanda | Seleção de adicionais/modificadores por prato; pergunta ecológica de talheres e guardanapos; observações de cozinha por item. | Delivery imediato com motoboy sob demanda ou retirada balcão. | KDS em tempo real com status Novo -> Em Preparo -> Pronto -> Em Rota. |
| **03** | **Varejo Físico Tradicional** | SKU Físico / Grade | Seleção de tamanho/cor; cálculo de frete por CEP (Correios/Jadlog/Melhor Envio); dados de entrega e recebedor. | Cotação dinâmica por peso e cubagem. | Rastreamento de encomenda com código de envio e nota fiscal. |
| **04** | **Produtos Digitais & Cursos** | Arquivo, Licença, Link | Dispensa de endereço físico; coleta apenas de e-mail/WhatsApp do titular para liberação. | Frete Físico Zerado. | Liberação imediata: Link seguro com senha única gerada, download direto de arquivo ou chave serial de ativação. |
| **05** | **Serviços & Agendamentos** | Reserva de Horário / Sessão | Seleção de data, horário livre (slot) e profissional; política de sinal configurável (100% online, sinal % ou balcão). | Presencial / No Local. | Comprovante de agendamento, bloqueio de agenda, lembrete automático e controle de no-show. |
| **06** | **Supermercado, Açougue & Feira** | Pesáveis por Quilo / Gramas | Passo de pesagem (100g em 100g); política de substituição (similar, WhatsApp ou cancelar); quem recebe as compras. | Entrega programada ou retirada expressa. | Painel de separação/picking com conferência de balança e ajuste de valor final. |
| **07** | **Locação & Aluguel de Bens** | Curta Duração (Diárias) | Seleção de check-in / check-out com diárias automáticas; termo de responsabilidade; opção de caução/depósito de garantia. | Retirada na loja ou frete de entrega/coleta técnica. | Contrato de locação digital emitido e checklist de vistoria de saída/retorno. |
| **08** | **Pet Shop & Veterinária** | Cuidados & Produtos | Nome/porte do pet quando serviço de banho/tosa; agendamento ou frete padrão para rações e produtos físicos. | Delivery programado ou balcão. | Confirmação da ficha clínica/pet e instruções de acolhimento. |
| **09** | **Farmácia & Drogaria** | Saúde & Medicamentos | Upload de receita quando medicamento controlado; verificação de dosagem e CRM. | Entrega prioritária rápida em até 60 minutos. | Notificação de conferência pelo farmacêutico responsável. |
| **10** | **Eventos & Ingressos** | Lotes / Lugares Marcados | Seleção de lote/setor; identificação nominal de cada portador de ingresso; QR Code individual. | Ingresso digital imediato (sem frete). | Ingresso digital com validação anticópia em wallet/app. |
| **11** | **Veículos & Autopeças** | Alto Valor & Test-Drive | Agendamento de test-drive e proposta para veículos; frete transportadora para autopeças físicas. | Retirada na concessionária ou frete pesado. | Proposta comercial vinculada ao CRM e agendamento de entrega das chaves. |
| **12** | **Imóveis & Locação** | Visita & Proposta | Agendamento de visita presencial, documentação de proposta e análise cadastral. | Atendimento in loco. | Protocolo de análise imobiliária e contato com o corretor responsável. |
| **13** | **Assistência Técnica** | Ordem de Serviço (OS) | Descrição do defeito, número de série/IMEI do aparelho e termo de responsabilidade. | Postagem com código reverso ou entrega em balcão. | Acompanhamento do status da OS em tempo real pelo cliente. |
| **14** | **Advocacia & Consultoria** | Consulta Inicial & Honorários | Agendamento de sessão jurídica inicial, área do direito e termo de confidencialidade. | Reunião presencial ou videoconferência. | Link da sala virtual ou confirmação de presença no escritório. |
| **15** | **Educação Presencial** | Matrícula & Turma | Seleção de turma, turno, dados do aluno e aceite do regulamento acadêmico. | Sem frete físico. | Emissão de comprovante de matrícula e liberação de grade horária. |
| **16** | **Notícias & Assinatura** | Acesso a Conteúdo Local | Seleção de plano de leitura local (mensal/anual), liberação imediata pós-PIX/cartão. | Acesso digital instantâneo. | Desbloqueio imediato do feed sem paywall e envio de newsletter. |
| **17** | **Atacado & Distribuidora** | Faturamento B2B / Grade | Validação de CNPJ e Inscrição Estadual, tabela progressiva por lote e faturamento a prazo. | Frete FOB ou CIF com transportadora credenciada. | Emissão de espelho de pedido B2B e envio para aprovação de crédito. |
| **18** | **Serviço sob Medida** | Briefing & Orçamento | Preenchimento de briefing, envio de fotos/arquivos de referência e solicitação de orçamento. | Visita técnica ou envio digital de proposta. | Proposta comercial formalizada com SLA de aprovação. |

---

## 3. Auditoria Forense: Respostas do Alinhamento vs Planejado vs Implementado

| # | Tópico Alinhado | Diretriz Definida | Estado no Repositório | Ação Corretiva Exigida |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | **Sacola Modular em Abas** | Carrinho global com abas de separação para Físico/Entrega, Agendamentos e Digitais. | Implementado em `CartSheet.tsx`. | Abas de filtragem não-destrutiva ativas. |
| **R2** | **Varejo por Quilo & Mercado** | Lojista escolhe entre faixas de 100g ou separação com balança e ajuste de nota. | Configurado em `workspace.configuracoes.index.tsx`. | Persistência atômica no schema de checkout. |
| **R3** | **Resumo Visual & Order Bump** | Miniaturas com fotos reais no checkout + 1 oferta de Order Bump nativo antes do pagamento. | Implementado em `_store.checkout.tsx` e `upsell.functions.ts`. | Card de Order Bump ativo com preview idêntico. |
| **R4** | **Hierarquia de Configuração** | Regra específica no produto sobrepõe regra global da loja (cascata sem conflito). | Lógica implementada em `getActiveOrderBumpForCart` (trigger produto > loja). | Editor de produto (`$id.tsx`) conectado com `ProductUpsellCard`. |
| **R5** | **Entrega Digital Segura** | Link com senha única/token de acesso gerado, download de arquivo ou licença serial. | Implementado em `confirmacao.tsx` e `workspace.configuracoes.index.tsx`. | Emissão do cartão de liberação instantânea. |
| **R6** | **Layout: Zero-Config + Flex** | Padrão Adaptativo por Nicho com opção de forçar One-Page ou Multi-Step no painel. | Seletor triplo ativo no painel de checkout do Workspace. | Resolução semântica integrada via `getNicheSemantics`. |
| **R7** | **Serviços & Regras Financeiras** | Prestador define: 100% online, sinal % antecipado ou balcão, com política de no-show. | Configurado em `workspace.configuracoes.index.tsx`. | Parâmetros de sinal e cancelamento salvos em banco. |
| **R8** | **Locação & Aluguel de Bens** | Check-in/out, diárias dinâmicas, caução de garantia e aceite de contrato. | Suporte a diárias e caução estruturado no checkout. | Governança multi-diária ativa sem simulação. |

---

## 4. Matriz Ontológica dos 15 Arquétipos Canônicos de Oferta

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

---

## 5. Requisitos em Sintaxe EARS

### [REQ-M08-01] Resumo Visual Rico com Miniatura Fotográfica Squircle
- **EARS (Ubíquo):** O SISTEMA DEVE renderizar em todas as etapas e resumos de checkout uma miniatura fotográfica (`size-12 rounded-lg object-cover`), quantidade, título oficial, badges dos complementos e observações por item.

### [REQ-M08-02] Motor Transacional de Order Bump Silencioso
- **EARS (Quando acionado):** QUANDO o consumidor alcançar a etapa final de conferência, O SISTEMA DEVE exibir a oferta de Order Bump contextual. Ao marcar o checkbox (toque >= 44px), o sistema soma o preço promocional ao total e grava na tabela `order_items` de forma atômica no banco de dados.

### [REQ-M08-03] Liberação Digital Instantânea com Senha Única Gerada
- **EARS (Quando acionado):** QUANDO o pedido contiver produto digital (A05) e o pagamento for confirmado, O SISTEMA DEVE dispensar frete físico e gerar na confirmação um cartão com a chave de licença/senha única gerada (`WAESY-TOKEN`), botão de copiar e link protegido.

### [REQ-M08-04] Sacola Modular em Abas para Pedidos Heterogêneos
- **EARS (Quando acionado):** QUANDO o carrinho possuir itens físicos, serviços agendados ou digitais, O SISTEMA DEVE fornecer abas no `CartSheet.tsx` para filtragem e visualização segregada por modalidade de entrega.

### [REQ-M08-05] Gestão Avançada de Checkout no Workspace do Lojista
- **EARS (Ubíquo):** A tela `/workspace/configuracoes` (aba Checkout) DEVE permitir ao lojista configurar:
  1. Modo de layout (Adaptativo por Nicho, One-Page Fluido ou Multi-Step).
  2. Gerenciador de Order Bumps (criação e exclusão com produto gatilho, oferta e desconto %).
  3. Parâmetros de pesáveis (faixas de 100g vs ajuste de balança).
  4. Parâmetros de entrega digital (URL externa, instruções, chave serial).
  5. Políticas financeiras de serviço (100% online, sinal % ou balcão).

### [REQ-M08-06] Resolução Canônica de Nicho por `getNicheSemantics`
- **EARS (Ubíquo):** O SISTEMA DEVE utilizar a biblioteca canônica `getNicheSemantics(storeProfile)` como autoridade central para definir se o checkout deve acionar o fluxo de Turismo, Gastronomia, Serviços, Supermercado ou Varejo Físico, eliminando checagens manuais frágeis e garantindo que empresas como "Excelência Tour" ativem invariavelmente o fluxo de Turismo e Manifesto de Passageiros sem solicitar frete ou endereço físico indevido.
