# SPEC-ENDERECOS-CANONICAL-ADDRESS-PLATFORM.md — Especificação Canônica do Módulo Meus Endereços / Address Platform

## 1. Visão Geral e Arquitetura de Domínio
O módulo `Meus Endereços` é o serviço central de identidade geográfica e logística da plataforma Waesy. Ele não é um CRUD isolado de usuário, mas a Fonte Única da Verdade (SSOT) para endereços reutilizáveis de clientes, servindo de base para:
- Checkout de e-commerce e delivery local (`_store.checkout`).
- Gestão de pedidos e entregas com motoboy/veículo (`orders`, `couriers`, `waesy_go`).
- Agendamento de serviços em domicílio (`booking_appointments`, `services`).
- Faturamento, faturas comerciais e notas fiscais (`payments`, `customer_invoices`).

### Invariante Fundamental: Endereço Salvo (Mutável) ≠ Snapshot Transacional (Imutável)
- **`user_addresses` (Endereço Vivo / Preferência Atual):** O usuário pode criar, editar apelido, complementar dados e alterar logradouro ou coordenadas a qualquer momento.
- **`order.shipping_address` / `booking.address_snapshot` (Snapshot Histórico Congelado):** Uma vez que um pedido é gerado ou um agendamento é confirmado, o endereço de entrega/atendimento é congelado em formato JSONB imutável no momento da transação. Edições posteriores em "Minha Casa" JAMAIS alteram pedidos passados ou em andamento.

---

## 2. Requisitos Estruturados em Sintaxe EARS

### EARS-01: Cadastro Estruturado e Autocompletação Geográfica Resiliente
- **Quando** o usuário informa um CEP de 8 dígitos ou aciona busca por texto livre,
- **O sistema deve** consultar prioritariamente o serviço nacional de endereçamento (BrasilAPI v2 / ViaCEP) e o geocodificador Nominatim/OpenStreetMap, preenchendo automaticamente logradouro, bairro, cidade, UF e coordenadas geodésicas (`latitude`, `longitude`) com precisão submétrica.
- **Caso** a consulta externa falhe ou esteja indisponível,
- **O sistema deve** preservar todos os campos já digitados e permitir o preenchimento manual irrestrito acompanhado de posicionamento manual de pino no mapa interativo.

### EARS-02: Pino Interativo no Mapa com Reverse Geocoding e Modo Fullscreen
- **Quando** o usuário interage com o mapa interativo integrado,
- **O sistema deve** permitir:
  1. Arraste do pino com recálculo reverso de endereço (`reverseGeocode`) ao soltar (`dragend`).
  2. Clique em qualquer ponto do mapa para reposicionar o pino.
  3. Botão "Usar Minha Localização" acionando a Geolocation API do navegador com consentimento explícito.
  4. Modo "Expandir Mapa / Tela Cheia" com zoom e pan para ajuste de precisão em telas mobile (< 600px).
  5. Botão de recentralização no ponto atual.

### EARS-03: Suporte Nativo a Condomínios, Torres e Acesso Residencial (V139)
- **Quando** o endereço for classificado como condomínio, edifício ou apartamento,
- **O sistema deve** persistir explicitamente:
  - `is_apartment`: booleano indicativo.
  - `block_tower`: identificação de bloco, torre ou conjunto.
  - `intercom_code`: ramal ou código de interfone para o entregador.
  - `reference_point`: ponto de referência visual.
  - `instructions`: instruções para a portaria ou entrega na porta.

### EARS-04: Atomicidade de Endereço Padrão (Single Default Invariant)
- **Quando** o usuário define um endereço como padrão (`is_default = true`),
- **O sistema deve** executar uma transação atômica que desmarca qualquer outro endereço padrão anterior do mesmo usuário, garantindo que exatamente 0 ou 1 endereço permaneça com a flag de padrão ativa por usuário, sem condições de corrida.

### EARS-05: Integração Omnichannel com Checkout & Opção "Salvar em Meus Endereços"
- **Quando** o cliente preencher um novo endereço durante o fluxo de checkout (`_store.checkout`),
- **O sistema deve** exibir a opção explícita: `[x] Salvar este endereço em Meus Endereços para compras futuras`. Ao finalizar o pedido com a opção marcada, o endereço é gravado atomicamente em `user_addresses` sem duplicidade de chamadas.
- **Se** o cliente selecionar um endereço já cadastrado no catálogo,
- **O sistema deve** gerar o snapshot transacional congelado em `orders.shipping_address` contendo coordenadas e especificações de condomínio, calculando o frete baseado na distância real.

### EARS-06: Edição e Exclusão Seguras (Soft Delete & Imutabilidade)
- **Quando** o usuário solicitar a exclusão de um endereço cadastrado,
- **O sistema deve** validar o ownership via RLS (`user_id = auth.uid()`). A exclusão em `user_addresses` não afetará nenhuma transação histórica em `orders`, `booking_appointments` ou `payments`, que mantêm seus próprios snapshots isolados.

### EARS-07: Design Ergonomicamente Bifurcado & Acessibilidade WCAG 2.2 AA
- **O sistema deve** renderizar:
  - No Mobile (< 600px): `NativeMobileHeader` sticky, cards verticais em squircle `rounded-xl`, alvos de toque mínimos de 44px (`h-11 min-h-11`), mapa expansível e zero `truncate` (respeitando B.38).
  - No Desktop (>= 840px): Layout widescreen `max-w-5xl mx-auto`, Bento Grid de 2 colunas, ações de edição com modal lateral e visualização clara de coordenadas e CEP.
