# SPEC-ADVANCED-ADDRESS-PLATFORM-REFACTOR — Especificação Técnica da Plataforma Canônica de Endereços

## 1. Contexto e Motivação
A gestão e seleção de endereços é um dos pilares mais sensíveis e transacionais do ecossistema Waesy. A experiência atual necessita de uma elevação de padrão para paridade total com o fluxo de checkout e cadastro de endereços líder de mercado (Mercado Livre), incorporando recursos essenciais:
1. Autocompletar com geolocalização imediata do dispositivo ("Complete com minha localização").
2. Identificação estruturada com banner visual imediato de localidade reconhecida (`📍 Santa Catarina, Chapecó, Centro`).
3. Suporte nativo ao marcador "Sem número" (`has_no_number`) com desabilitação contextual do campo e valor canônico "S/N".
4. Seção obrigatória e dedicada de "Dados de quem vai receber" (Nome completo do destinatário e Telefone com DDI/DDD formatado).
5. Ajuste fino de precisão geográfica via mapa interativo vetorial com pino arrastável, suporte a tela cheia e reverse geocoding.
6. Ação atômica de "Adicionar / Editar indicações" (Ponto de referência, interfone, bloco/torre, deixar na portaria) sem fricção.
7. Experiência de seleção e hub de recebimento no Checkout ("Escolha onde você quer receber sua compra") com badge de predefinido, recomendação contextual e rodapé tátil de ações.

Tudo deve obedecer estritamente às normas do design system da Waesy (DL-01 a DL-30, WCAG 2.2 AA, piso tátil de 44px, zero fallbacks sintéticos, sem `!important`).

---

## 2. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### EARS-01: Autocompletar com Localização do Dispositivo (Ubíquo)
* **O sistema DEVE** fornecer o gatilho de topo "Complete com minha localização" em todas as superfícies de cadastro/edição de endereço.
* **QUANDO** o usuário clicar em "Complete com minha localização", **O sistema DEVE** solicitar permissão de geolocalização nativa via `navigator.geolocation`, voar o mapa interativo para as coordenadas obtidas, posicionar o pino com precisão e executar reverse geocoding preenchendo automaticamente CEP, Logradouro, Bairro, Cidade e Estado.

### EARS-02: Reconhecimento de CEP com Banner de Feedback e Link Auxiliar (Orientado a Evento)
* **QUANDO** o usuário digitar um CEP com 8 dígitos válidos, **O sistema DEVE** disparar busca assíncrona nas fontes autoritativas (BrasilAPI / ViaCEP), preencher logradouro, bairro, cidade e estado, reposicionar o mapa se houver coordenadas e renderizar banner informativo no padrão: `📍 [Estado], [Cidade], [Bairro]`.
* **O sistema DEVE** disponibilizar o link acessível "Não sei meu CEP" posicionado estrategicamente ao lado do rótulo do CEP, direcionando com segurança para a consulta oficial dos Correios.

### EARS-03: Suporte a Imóveis Sem Número (Orientado a Estado)
* **ENQUANTO** a opção "Sem número" estiver desmarcada, o campo "Número" é obrigatório e aceita numeração física do imóvel.
* **QUANDO** a opção "Sem número" for ativada pelo usuário, **O sistema DEVE** desabilitar o campo de texto de número, atribuir o valor semântico "S/N", registrar `has_no_number: true` no modelo e prosseguir na validação sem exigir dígitos adicionais.

### EARS-04: Dados de Quem Vai Receber (Ubíquo)
* **O sistema DEVE** exigir na seção "Dados de quem vai receber" o Nome Completo e o Telefone de Contato (formatado com máscara nacional `(99) 99999-9999` e prefixo `+55`), com o subtítulo orientador "Ligaremos se houver algum problema com a entrega." para tranquilidade do comprador e assertividade dos entregadores do Waesy Go.

### EARS-05: Ajuste Fino de Marcador no Mapa Vetorial (Opcional)
* **SE** o usuário interagir com o mapa ou arrastar o pino geográfico, **O sistema DEVE** atualizar as coordenadas `latitude` e `longitude` decimais com precisão de 6 casas, disparar reverse geocoding para sincronizar logradouro/bairro se aplicável, e permitir expansão em Modo Tela Cheia com botão de confirmação e fechamento tátil.

### EARS-06: Edição Rápida de Indicações e Acesso (Orientado a Evento)
* **QUANDO** o usuário acionar o botão "Adicionar indicações" ou "Editar indicações" no card de endereço, **O sistema DEVE** abrir diálogo dedicado com campos de Ponto de Referência, Bloco / Torre, Código de Interfone e Instruções de Entrega, salvando atomicamente no banco sem necessidade de recarregar a página.

### EARS-07: Hub de Escolha no Checkout (Ubíquo)
* **O sistema DEVE** apresentar no passo de entrega do Checkout a casca refinada "Escolha onde você quer receber sua compra", com a opção de topo "Usar minha localização atual", cards de endereços com destinatário, telefone, badge de predefinido, ações de editar endereço e indicações, e rodapé fixo de navegação com "Adicionar novo endereço" e "Continuar".

---

## 3. Modelo de Dados e Invariantes Backend

### 3.1 Migração Supabase
* Tabela: `public.user_addresses`
* Nova coluna: `has_no_number BOOLEAN DEFAULT false`
* Procedure atualizada: `save_user_address_atomic` compatibilizada com o novo parâmetro `p_has_no_number`.
* Nova procedure atômica: `set_default_user_address_atomic(p_id UUID, p_user_id UUID)`
* Nova procedure atômica: `update_address_instructions_atomic(p_id UUID, p_user_id UUID, p_instructions TEXT, p_reference_point TEXT, p_intercom_code TEXT, p_block_tower TEXT)`

### 3.2 BFF Server Functions (`src/services/addresses.functions.ts`)
* Schema Zod `UserAddressInputSchema` expandido com `has_no_number: z.boolean().default(false)`.
* Atualização de `saveUserAddress` para persistir `has_no_number`.
* Nova função `setDefaultUserAddress` com garantia de transação atômica.
* Nova função `updateAddressInstructions` com isolamento de tenant via RLS.

---

## 4. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
1. **Dados**: Formulário limpo e cards informativos com contraste >= 4.5:1.
2. **Carregamento (Loading)**: Spinners discretos ao buscar CEP ou geolocalizar sem congelar a tela.
3. **Vazio (Empty)**: Empty state com CTA primário para adicionar o primeiro endereço.
4. **Erro (Error)**: Toasts orientativos do Sonner com validação defensiva Zod.
5. **Piso Tátil**: Todos os botões, checkboxes, toggles e links possuem altura mínima de 44px (`h-11 min-h-11`) ou área delimitada equivalente, com anéis de foco visível `:focus-visible:ring-2`.

---

## 5. Critérios de Aceite
- [ ] Migração SQL criada e consistente com o banco Supabase.
- [ ] Schema Zod e DTO no BFF devidamente tipados e sincronizados.
- [ ] Componente canônico de formulário com paridade visual com Mercado Livre + Design System Waesy.
- [ ] Modal de edição rápida de indicações funcional.
- [ ] Tela `/conta/enderecos` refatorada e validada.
- [ ] Fluxo `/checkout` com seleção de endereço enriquecida.
- [ ] Testes unitários do BFF atualizados e passando com 100% de sucesso.
- [ ] Catraca de Design Lint com zero regressões (`node scripts/design-lint.mjs --ratchet`).
