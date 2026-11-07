# 16 — Inventário de Integrações Externas

| Categoria | Provedor / Serviço | Arquivo de Integração | Finalidade Operacional |
| :--- | :--- | :--- | :--- |
| **Pagamentos** | MercadoPago | `marketplace-webhooks.functions.ts` | Processamento de Pix, Cartão e Webhooks de confirmação. |
| **Pagamentos** | Asaas | `billing.functions.ts` | Cobrança recorrente de assinaturas de lojistas e carnês. |
| **Comunicação** | WhatsApp (Evolution / Baileys) | `whatsapp-messaging.functions.ts` | Disparo de mensagens ativas, suporte e notificações. |
| **Inteligência Artificial**| OpenAI, Gemini, Groq | `ai-core-gateway.functions.ts` | Copilot operacional, geração de cópias e SimLab. |
| **Geolocalização** | Google Maps & Places | `geo-search.functions.ts` | Autocompletar de endereços, geocodificação e cálculo de frete. |
| **Armazenamento** | Supabase Storage | `storage.functions.ts` | Buckets de fotos de produtos, comprovantes e vouchers. |
| **Fiscal** | Focus NFe / SEFAZ | `fiscal-nfe.functions.ts` | Emissão de notas fiscais eletrônicas e contingência. |
| **Imagens / Stock** | Unsplash API | `unsplash.functions.ts` | Busca opcional de fotos conceituais para banners do builder. |
| **Veículos** | Tabela FIPE | `fipe.functions.ts` | Consulta oficial de preços médios para classificados de carros. |
