# Extrator Autônomo Infotravel — Waesy Sync

Sistema Playwright local para mineração cadastral de reservas, titulares, passageiros e dados financeiros em qualquer portal Infotravel (**Orinter, FRT, Incomum Viagens, Schultz e portais parceiros**), além do servidor gravador `coletor.mjs` para espelhamento em tempo real com a extensão Chrome/Edge.

---

## Estrutura de Arquivos

```
tools/infotravel-miner/
├── miner.mjs                       # Script Playwright com jitter humano e envio opcional ao CRM
├── coletor.mjs                     # Servidor HTTP local (porta 3333) para espelho com a extensão
├── iniciar_coletor_local.bat       # Sobe coletor.mjs na porta 3333
├── iniciar_teste_piloto.bat        # Executa teste piloto com 10 reservas
├── iniciar_extracao_completa.bat   # Executa extração completa de reservas
└── output/                         # Diretório de saída local (ignorado no empacotamento)
    ├── clientes_excelencia_tour_oficial.csv
    ├── clientes_excelencia_tour_oficial.json
    ├── erros_mineracao.json
    └── progresso.json
```

---

## Como Rodar

1. Instale as dependências na primeira vez (`npm install` nesta pasta ou `iniciar_teste_piloto.bat`).
2. Para integrar com a extensão em tempo real no disco, execute **`iniciar_coletor_local.bat`** (endpoint `http://127.0.0.1:3333/api/status`).
3. Para mineração autônoma via Playwright:
   - Execute **`iniciar_teste_piloto.bat`** (10 reservas) ou **`iniciar_extracao_completa.bat`**.
   - Opcionalmente passe parâmetros no terminal:
     `node miner.mjs --all --url=https://online.orinter.com.br/infotravel --server=https://waesy.com.br --token=wae_...`
   - Faça login no portal, abra **Buscar reservas > Pesquisar** e pressione **ENTER** no terminal.

---

## Colunas Canônicas do CSV (Padrão Excel Brasil)

`ID Reserva`, `Status Reserva`, `Data Criacao`, `Check-in`, `Check-out`, `Operadora`, `Contato Titular`, `Email Contato`, `Telefone Contato`, `Nome Passageiro`, `CPF Passageiro`, `Data Nascimento`, `Idade`, `Tipo (ADT/CHD/INF)`, `E Titular?`, `Hotel / Destino`, `Acomodacao`, `Localizador`, `Valor Total Venda (R$)`, `Taxas Inclusas (R$)`, `Impostos Inclusos (R$)`, `Forma de Pagamento`, `Status Pagamento`, `Score Confianca`, `Banco Emissor`, `Parcelamento`, `Comissao Agencia (R$)`.
