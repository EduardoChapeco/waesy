# 🚀 Extrator Autônomo de Clientes Infotravel / Orinter

Sistema automatizado de mineração e extração cadastral de reservas, titulares, passageiros e dados financeiros a partir da plataforma Infotravel.

---

## 📁 Estrutura de Arquivos no seu Computador

```
tools/infotravel-miner/
├── miner.mjs                       # Script principal Playwright com jitter humano (1s a 6s)
├── coletor.mjs                     # Servidor HTTP local (porta 3333) para integração com extensão
├── iniciar_teste_piloto.bat        # Executa teste piloto com 10 reservas
├── iniciar_extracao_completa.bat   # Executa extração COMPLETA das 2.000+ reservas
├── abrir_pasta_dos_arquivos.bat    # Abre imediatamente a pasta com os CSVs no Windows Explorer
└── output/                         # Diretório onde os arquivos são salvos
    ├── clientes_excelencia_tour_oficial.csv  # CSV pronto para o Excel (separador ; e UTF-8 BOM)
    ├── clientes_excelencia_tour_oficial.json # Estrutura JSON com passageiros e financeiro
    └── progresso.json                        # Memória de onde parou (não repete reservas)
```

---

## ⚡ Como Rodar no seu Computador (Passo a Passo Simples)

1. Para ver onde estão os arquivos gerados a qualquer momento, dê dois cliques em:  
   👉 **`abrir_pasta_dos_arquivos.bat`** (Abre a pasta `output` diretamente na sua tela).
2. Para testar 10 reservas com intervalo seguro e humano:  
   👉 **`iniciar_teste_piloto.bat`**
3. Para extrair todas as 2.000+ reservas com intervalo randômico de 1 a 6 segundos:  
   👉 **`iniciar_extracao_completa.bat`**
   - O Google Chrome real abrirá na sua tela.
   - Faça seu login normal (com usuário, senha e 2FA se houver).
   - Vá na busca de reservas e clique em Pesquisar.
   - Pressione **[ENTER]** na janela preta do terminal.
   - O robô irá varrer as páginas, coletar todos os passageiros e valores e salvar diretamente no seu disco!
   - Ao terminar, a pasta com o CSV abrirá automaticamente na sua tela.

---

## 📊 Colunas Gravadas no Arquivo CSV (Padrão Excel Brasil)

- **ID Reserva** (Código único do Infotravel)
- **Status Reserva** (Confirmada, Em Viagem, etc.)
- **Data Criação**
- **Contato Principal / Titular**
- **Email Contato**
- **Telefone Contato**
- **Nome Completo do Passageiro** (ADT/CHD/INF)
- **CPF Passageiro**
- **Data Nascimento**
- **Idade**
- **Tipo de Passageiro**
- **Titular? (SIM/NÃO)**
- **Hotel / Destino da Viagem**
- **Valor Total Venda (R$)**
- **Taxas Inclusas (R$)**
- **Impostos Inclusos (R$)**
- **Forma de Pagamento**
- **Parcelamento**
- **Comissão Agência (R$)**
