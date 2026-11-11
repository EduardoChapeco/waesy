# Waesy Sync — Extensão para Operadoras Infotravel

Extensão oficial do ecossistema Waesy para extração em segundo plano de reservas, passageiros, faturas, comissões e cotações em qualquer portal que utilize o sistema Infotravel (**Orinter, FRT, Incomum Viagens, Schultz, New Age, Ancoradouro e portais white-label Infotravel**).

---

## Como Instalar no Google Chrome ou Microsoft Edge

1. Abra `chrome://extensions` (Chrome) ou `edge://extensions` (Edge).
2. Ative a chave **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta `tools/infotravel-extension`.
5. Fixe o ícone **Waesy Sync** na barra do navegador.

---

## Conexão com o Waesy CRM (Token Bearer)

1. No painel Waesy (**Workspace Turismo > Operadoras Infotravel**), gere seu Token de Integração (`wae_...`).
2. Abra a extensão **Waesy Sync**, acesse a aba **Conexão Waesy**.
3. Informe a URL do servidor (ex.: `https://waesy.com.br`) e cole seu Token `wae_...`.
4. Clique em **Salvar Configurações de Conexão** e depois em **Validar Token e Servidor**.

---

## Como Extrair de Qualquer Portal Infotravel

1. Faça login normalmente no portal da operadora (ex.: Orinter, FRT, Incomum, Schultz ou qualquer URL com `/infotravel`).
2. Se for um domínio white-label diferente dos padrões, abra o popup da extensão e clique em **Ativar neste Portal** para conceder permissão sob demanda ao domínio.
3. Acesse a tela de **Pesquisar Reservas**, selecione o período desejado e pesquise.
4. No popup do **Waesy Sync** (indicando **Portal Detectado** em verde), ajuste o ritmo humano e clique em **Iniciar Sincronização em 2º Plano**.
5. As reservas são gravadas localmente e enviadas automaticamente para `/api/v1/ingest/infotravel-reservations` (quando o envio automático e o token estiverem configurados). Você também pode clicar em **Enviar Reservas Coletadas ao Waesy CRM**, **Exportar CSV (Excel BR)** ou **Exportar JSON**.
6. Na navegação diária de voos, hotéis ou carrinho, a aba **Cotações** captura orçamentos passivamente para transmissão ao Radar de Oportunidades via **Transmitir ao Waesy CRM & Radar**.

---

## Segurança e Anti-Rate Limit

- O ritmo randômico ajustável (1s a 9s) evita rajadas artificiais e respeita a sessão ativa da agência no portal.
- Credenciais da operadora nunca deixam o navegador; o servidor Waesy recebe apenas os dados estruturados via token Bearer autenticado.
