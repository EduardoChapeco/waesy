# SPEC-OMNICHANNEL-CRM-TAGS-EMAIL-360-V2 — Revisão End-to-End de Atendimento Omnichannel, Sistema de Tags/Pastas, Coluna 360º, Gerador de Cards Visuais, PNR/Viagens e E-mail Corporativo Cloudwebly/cPanel

## 1. Escopo e Objetivo
Modernizar e estabilizar ponta a ponta o ecossistema de Atendimento Omnichannel (`/workspace/atendimento/chat`), Ficha 360º do Cliente, Catálogo de Tags e Pastas (paridade superior a Umbler Talk, Whaticket e Monday.com), Ferramentas Avançadas de Disparo (Faturas PIX, Boletos, Pedidos/Carrinho, Gerador de Card Visual em Imagem e E-mail Vinculado ao Cliente/Ticket/PNR) e o Hub de Integrações Cloudwebly/cPanel para provisionamento e roteamento de caixas de e-mail corporativo por setor e atendente.

## 2. Requisitos Estruturados (Sintaxe EARS)

### REQ-01: Catálogo de Tags Editável com Grupos/Pastas e Filtro na Fila
- **WHEN** o operador abrir o seletor de tags (`ThreadTagsPicker`) no cabeçalho da conversa ou na coluna 360º, **THE SYSTEM SHALL** exibir as tags organizadas por grupos/pastas (ex.: Funil Comercial, Temperatura, Financeiro / PIX, Pós-Venda / Suporte, Viagens / Operadora) com busca instantânea.
- **WHEN** o operador criar, editar (nome, cor semântica, pasta/grupo) ou excluir uma tag ou grupo, **THE SYSTEM SHALL** persistir o catálogo em `stores.settings.crm_tag_catalog` e propagar renomeações/exclusões nas conversas (`chat_threads.tags`) da loja.
- **WHEN** o operador selecionar uma tag ou grupo na barra de filtros da Coluna 1 (Lista de Conversas), **THE SYSTEM SHALL** filtrar as conversas exibidas em tempo real e renderizar pílulas compactas das tags aplicadas nos itens da fila.

### REQ-02: Densidade Visual Minimalista com Botões Squircle Compactos
- **WHILE** o operador estiver no Workspace de Atendimento (`AtendimentoSubmoduleHeader`, `AtendimentoChatWorkspace`, `ThreadTagsPicker`), **THE SYSTEM SHALL** utilizar botões e chips squircle enxutos (`rounded-lg` / `rounded-xl` com `py-1 px-2` ou `py-1 px-3` na grade de 4px), eliminando botões inflados no topo, cabeçalho da thread, barra de modo do compositor e barra de macros rápidas, mantendo anéis `:focus-visible:ring-2` e conformidade com `scripts/design-lint.mjs`.

### REQ-03: Reestruturação Lógica da Coluna 360º e Sincronização de Foto/Identidade WhatsApp
- **WHEN** uma conversa do WhatsApp for listada ou inspecionada no Perfil 360º, **THE SYSTEM SHALL** ocultar e-mails sintéticos `@whatsapp.waesy` da interface, exibir o telefone formatado real e buscar ativamente a foto de perfil (`fetchProfilePictureUrl`) e nome na Evolution API quando ausentes, persistindo em `chat_threads.metadata.avatar_url`, `profiles.avatar_url` e `whatsapp_contact_identities`.
- **WHILE** o painel lateral direito (`Customer360Sidebar`) estiver aberto, **THE SYSTEM SHALL** ordenar os blocos na sequência operacional estrita:
  1. Identidade no Topo: Foto/Capa do Contato (com botão de sincronizar foto do WhatsApp e edição rápida), Nome, Telefone, E-mail real, CPF e Cidade;
  2. Ações Rápidas: Etiquetas/Tags (com pastas e edição inline) e Observações da Equipe (`internal_notes` com salvamento direto);
  3. Inteligência Artificial e Roteamento: Seleção da Persona/Agente de IA ativo (ex.: Consultor Comercial, Concierge Turismo/ANAC, Financeiro/Cobrança, Triagem SAC), Modo de Atendimento (`IA Copilot`, `Fila`, `Humano`), Setor/Fila e Atendente Responsável;
  4. Dossiê de Viagem / PNR / Operadora: Atalhos e registro rápido de Localizador PNR da Cia Aérea, ID do Pacote na Operadora, Nome da Operadora, Status do Voo/Reserva e disparo de consulta para a operadora;
  5. Documentos, Faturas, Boletos e Pedidos/Carrinho: Atalhos diretos para emitir e enviar Fatura PIX, Boleto, Proposta Comercial, Contrato e Carrinho/Pedido no chat;
  6. E-mails Vinculados ao Cliente/Ticket/PNR: Histórico e compositor de e-mail vinculado com metadados `[CID:...] [THREAD:...] [PNR:...] [TKT:...]` para cliente, operadora ou cia aérea.

### REQ-04: Gerador de Imagem (Card Visual) para o Cliente no Compositor
- **WHEN** o atendente acionar a ferramenta "Gerar Imagem / Card" no compositor (`ChatQuickComposerModals`), **THE SYSTEM SHALL** permitir compor um card visual (Cotação/Oferta, Voucher/PNR de Viagem, Comprovante/PIX ou Aviso de Voo/Pedido), renderizá-lo em PNG via HTML5 Canvas e dispará-lo como mensagem de imagem (`message_type: "image"`) na conversa do cliente.

### REQ-05: Hub Cloudwebly / cPanel de Hospedagem e Caixas de E-mail Corporativo
- **WHEN** o gestor acessar `/workspace/configuracoes/integracoes`, **THE SYSTEM SHALL** disponibilizar a gestão completa de Hospedagem & E-mail Corporativo (Cloudwebly / cPanel UAPI + SMTP/IMAP), permitindo conectar o servidor cPanel/Cloudwebly, criar contas de e-mail do domínio (`@suaempresa.com.br`), excluir contas, definir cotas e vincular cada caixa de e-mail a setores/filas e usuários específicos do workspace.

## 3. Entradas, Saídas e Invariantes
- **Entradas:** Eventos de UI no chat omnichannel, payloads validados via Zod nas Server Functions (`chat.functions.ts`, `integrations.functions.ts`).
- **Saídas:** Atualizações persistidas em `stores.settings`, `chat_threads`, `chat_messages`, `customers_crm`, `tourism_trips` e `integration_credentials`.
- **Invariantes:**
  - Zero uso de `!important` (DL-04), zero cores hex/rgb literais em JSX (DL-01), zero valores arbitrários com colchetes (DL-02), grade de 4px estrita (DL-03), zero emojis (DL-23).
  - Regra Pétrea de Mutação Cirúrgica (`edit_file` exclusivo para arquivos existentes).

## 4. Critérios de Aceite e Evidências
- `npm run typecheck` com Exit Code 0.
- `node scripts/design-lint.mjs --ratchet` aprovado sem regressões P0/P1.
- `npm run build` concluído com Exit Code 0.
- Testes unitários validando as novas Server Functions e fluxos de tags, PNR, e-mail vinculado e Cloudwebly/cPanel.
