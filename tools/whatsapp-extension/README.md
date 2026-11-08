# 📱 Waesy Ingest • Extensão WhatsApp Web (Grupos & Contatos)

Extensão oficial para Google Chrome do ecossistema Waesy, desenvolvida exclusivamente para a agência **Excelência Tour São Miguel do Oeste**.

---

## ⚡ O que esta extensão faz?

1. **Lê grupos do WhatsApp Web:** Detecta automaticamente o grupo ou conversa aberta.
2. **Extrai participantes:** Varre os números de telefone e nomes de membros do grupo diretamente no navegador.
3. **Higieniza telefones:** Formata automaticamente para padrão internacional brasileiro (+55 DDD NNNNN-NNNN).
4. **Sincronização Idempotente com o Waesy CRM:** Envia os contatos como oportunidades comerciais pré-CRM sem rebaixar clientes já cadastrados e sem duplicar registros.

---

## 📦 Como Instalar no Google Chrome

1. Abra o Google Chrome e digite na barra de endereços: `chrome://extensions`
2. No canto superior direito, **ative o "Modo do desenvolvedor"**.
3. Clique em **"Carregar sem compactação"**.
4. Selecione a pasta descompactada da extensão:
   `tools/whatsapp-extension`
5. Fixe o ícone do Waesy Ingest na barra de ferramentas do seu navegador.

---

## 🔑 Como Conectar com seu Workspace Waesy

1. No Waesy Workspace da agência, acesse:
   **Turismo > Oportunidades > Extensão WhatsApp**
2. Clique em **Gerar Novo Token**.
3. Copie o token de ingestão gerado (`wae_...`).
4. Abra a extensão no navegador, vá na aba **"Conexão Waesy"**:
   - Cole a URL do Servidor (ex: `https://waesy.com.br`)
   - Cole o seu Token de Ingestão
   - Clique em **Validar Credencial** e em seguida **Salvar**.

---

## 🚀 Como Capturar e Enviar Contatos

1. Abra o **WhatsApp Web** (`https://web.whatsapp.com`).
2. Abra o grupo desejado. (Dica: clique no nome do grupo no topo para abrir os dados do grupo na lateral).
3. Abra a extensão Waesy Ingest:
   - Clique em **"Escanear Participantes do Grupo"**.
   - Visualize a lista de contatos encontrados.
   - Clique em **"Enviar ao Waesy CRM (Oportunidades)"**.
4. Pronto! Os contatos estarão disponíveis instantaneamente no painel de Oportunidades e Leads do Turismo.
