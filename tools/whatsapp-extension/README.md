# Waesy Ingest — Extensão WhatsApp Web (Grupos e Contatos)

Extensão oficial para Google Chrome e Microsoft Edge do ecossistema Waesy para extração virtualizada de participantes de grupos do WhatsApp Web e ingestão idempotente no Waesy CRM.

---

## O que esta extensão faz

1. **Detecta a conversa aberta:** Identifica o grupo ou conversa ativa no WhatsApp Web.
2. **Varredura com rolagem automática:** Percorre o painel lateral de participantes e o modal "Ver todos", incluindo listas virtualizadas por rolagem e atributos JID (`@c.us` / `@s.whatsapp.net`).
3. **Higienização de telefones:** Normaliza números brasileiros com DDI `+55`.
4. **Sincronização em lotes idempotentes:** Divide lotes grandes em blocos de até 500 contatos com relatório exato (`created`, `merged`, `skipped_customer`, `skipped_opted_out`).

---

## Como Instalar no Google Chrome ou Edge

1. Abra `chrome://extensions` (Chrome) ou `edge://extensions` (Edge).
2. Ative a chave **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta `tools/whatsapp-extension`.
5. Fixe o ícone **Waesy Ingest** na barra de ferramentas.

---

## Como Conectar com seu Workspace Waesy

1. No Waesy Workspace, acesse **Turismo > Oportunidades > Extensão WhatsApp**.
2. Clique em **Gerar Novo Token** e copie o token (`wae_...`).
3. Na extensão, abra a aba **Conexão Waesy**, informe o servidor (`https://waesy.com.br`), cole o token e clique em **Validar Credencial** e **Salvar**.

---

## Como Capturar e Enviar Contatos

1. Abra o **WhatsApp Web** (`https://web.whatsapp.com`) e selecione o grupo desejado.
2. Clique no nome do grupo para abrir o painel de participantes (ou em "Ver todos os participantes").
3. Abra a extensão **Waesy Ingest**, clique em **Escanear Participantes do Grupo** e depois em **Enviar ao Waesy CRM (Oportunidades)**.
