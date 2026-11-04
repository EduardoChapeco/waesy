# 10 — Inventário de Formulários Operacionais

A plataforma Waesy adota validação de formulários através de **Zod Schemas** integrados com **React Hook Form** ou estados locais controlados com piso tátil de 44px (`h-11 min-h-11`).

## 1. Principais Formulários do Sistema
1. **Formulário de Cadastro e Edição de Produtos (`product-editor`):**
   - Dados básicos (título, descrição, SKU, código de barras, unidade).
   - Grade de variações (cor, tamanho, voltagem) com precificação individual.
   - Upload de mídias fotográficas e ordenação por arraste.
   - Parâmetros fiscais (NCM, CEST, CFOP, origem da mercadoria).
2. **Formulário de Cotação de Turismo (`travel-proposal`):**
   - Destino, datas de ida e volta, número de passageiros (adultos e crianças).
   - Tarifário por quarto (single, duplo, triplo) e taxas de embarque.
   - Fornecedores envolvidos e percentual de comissão da agência.
3. **Formulário de Captura Direta no Builder (`ContactFormDirect`):**
   - Nome, telefone/WhatsApp, e-mail e mensagem.
   - Persistência nativa via Server Function `submitOmniPageLeadFn` conectada ao CRM da loja.
4. **Calculadora Interativa de Cotações (`InteractiveQuoteCalculator`):**
   - Quantidade de itens/pessoas com incremento e decremento.
   - Seleção de opcionais adicionais com recalculo de preço em tempo real.
   - Envio de lead estruturado com metadados para atendimento.
5. **Formulário de Checkout Transparente (`checkout`):**
   - Identificação do comprador (CPF, nome, telefone).
   - Endereço de entrega com busca automática de CEP via ViaCEP.
   - Método de pagamento (Pix com QR Code copia-e-cola ou Cartão de Crédito com parcelamento).
6. **Formulário de Submissão KYC (`kyc`):**
   - Dados empresariais (CNPJ, Razão Social, Inscrição Estadual).
   - Upload de contrato social e documento de identidade do responsável.
