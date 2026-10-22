# 🚀 Waesy Sync • Extensão de Sincronização de Operadoras (Infotravel)

Extensão oficial do ecossistema Waesy para conexão bilateral e extração em segundo plano de reservas, passageiros, comissões e faturas de operadoras de turismo (**Orinter, Incomum Viagens, FRT, Schultz e sistemas Infotravel**).

---

## 📦 Como Instalar no seu Google Chrome (Passo a Passo)

1. Abra o Google Chrome.
2. Na barra de endereços, digite: `chrome://extensions` e pressione **ENTER**.
3. No canto superior direito da tela, **ative a chave "Modo do desenvolvedor"**.
4. No canto superior esquerdo, clique no botão **"Carregar sem compactação"**.
5. Selecione a pasta desta extensão:
   `c:\Users\Excelência Tour SMO\Documents\waesy\tools\infotravel-extension`
6. Pronto! O ícone do **Waesy Sync** aparecerá na barra de extensões do seu Chrome. Fixe-o para facilitar o acesso.

---

## ⚡ Como Usar na Operadora (Ex: Orinter)

1. Faça login normalmente no portal da sua operadora (ex: `https://online.orinter.com.br/infotravel`).
2. Acesse a tela de **Pesquisar Reservas**, selecione o período desejado e clique em **Pesquisar** para exibir a lista na tela.
3. Clique no ícone do **Waesy Sync** no topo do Chrome:
   - O indicador mostrará **"Portal Detectado"** (verde).
   - Ajuste o ritmo humano (recomendado: 1.5s a 5.0s com jitter randômico anti-bloqueio).
4. Clique em **"▶ Iniciar Sincronização em 2º Plano"**.
5. A extensão irá acessar cada reserva, registrar os dados de todos os passageiros (Nomes, CPFs, Idades, Datas de Nascimento) e os dados financeiros (Total, Taxas, Forma de Pagamento e Comissões).
6. A qualquer momento, clique em:
   - **"📊 Baixar CSV (Excel)"**: Baixa o arquivo `.csv` formatado em padrão brasileiro (separador `;` e codificação UTF-8 BOM para abrir com acentuação perfeita no Microsoft Excel).
   - **"📋 Baixar JSON"**: Baixa a estrutura completa de dados para backups ou integrações.

---

## 🛡️ Segurança & Anti-Rate Limit
- A extensão utiliza intervalos randômicos variáveis (1s a 6s) para simular o comportamento humano natural de navegação, prevenindo qualquer bloqueio por requisições em massa.
- Não requer envio de senhas para servidores externos: opera exclusivamente dentro da sua sessão ativa no navegador.
