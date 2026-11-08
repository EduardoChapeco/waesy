# 19 — Itens Não Verificados e Dependências de Hardware / Terceiros

Os seguintes itens não puderam ser verificados em ambiente de desenvolvimento local devido à dependência estrita de chaves de produção, credenciais bancárias e dispositivos físicos:

1. **Transmissão Real de NF-e para a SEFAZ:**
   - Depende de certificado digital A1 válido em produção e credenciais de webservice da SEFAZ estadual. Validado em ambiente mock/homologação.
2. **Impressão Térmica Física (ESC/POS):**
   - Depende de impressora térmica física conectada via USB/Rede local (comandas de cozinha no PDV).
3. **Webhooks Bancários em Tempo Real:**
   - Depende de liquidação bancária real de Pix e boleto nos gateways Mercado Pago e Asaas. Validado via simulação de payloads assinados.
4. **Telemetria de Geolocalização Contínua em Background:**
   - Rastreamento contínuo de entregadores do MotoLink em segundo plano depende de hardware real Android/iOS com permissão `ACCESS_BACKGROUND_LOCATION`.
