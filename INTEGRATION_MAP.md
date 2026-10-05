# INTEGRATION_MAP.md — Mapa Canônico de Integrações Externas

> Documento Raiz de Conectores e APIs  
> Versão: 2.0.0  
> Status: AUDITADO & HOMOLOGADO

| Integração | Protocolo | Domínio | Provedor / Endpoint | Nível de Risco |
| :--- | :--- | :--- | :--- | :---: |
| **PNCP** | REST HTTPS | Governança | `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao` | Baixo |
| **Banco Central** | OData REST | Finanças | `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` | Baixo |
| **OpenStreetMap** | Overpass QL | Geografia | `https://overpass-api.de/api/interpreter` | Baixo |
| **DataJud CNJ** | REST HTTPS | Jurídico | `https://api-publica.datajud.cnj.jus.br/api_publica_trf4/_search` | Baixo |
| **BrasilAPI** | REST HTTPS | Cadastral | `https://brasilapi.com.br/api/cnpj/v1/` | Baixo |
| **OpenRouter** | OpenAI REST | IA / LLM | `https://openrouter.ai/api/v1/chat/completions` | Médio |
| **Groq** | OpenAI REST | IA Rápida | `https://api.groq.com/openai/v1/chat/completions` | Médio |
| **Firecrawl** | REST HTTPS | Scraping | `https://api.firecrawl.dev/v1/scrape` | Médio |
| **Mercado Pago** | REST / Webhook| Pagamentos | `https://api.mercadopago.com/v1/payments` | Alto |
| **WhatsApp Meta**| Graph API | Mensageria | `https://graph.facebook.com/v21.0/` | Médio |
