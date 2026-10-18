---
name: api-pool-manager
description: "Guia e governa a integração de APIs de IA gratuitas e orquestradas (OpenRouter, Groq, SteelDev, Firecrawl) com isolamento no cofre e proxy seguro."
---

# API Pool Manager — Governança e Roteamento de IA

## Missão
Assegurar que toda inferência de IA na plataforma passe por uma porta única server-side, com failover dinâmico, controle de orçamento, rate limiting e zero exposição de chaves ao cliente.

## Arquitetura de Roteamento

```
[Cliente / Frontend]
        │
        ▼ (Requisição autenticada sem secrets)
[BFF Server Function / api-orchestrator.functions.ts]
        │
        ├── 1. Validação de Sessão & Autorização Multi-Tenant
        ├── 2. Consulta de Quota & Saldo da Loja
        ├── 3. Seleção de Chave no Pool (Cofre Seguro)
        ├── 4. Circuit Breaker & Failover Automático
        └── 5. Log de Telemetria e Custo em tokens_ledger
        │
        ▼ (Chamada direta externa)
[Provedor de IA: OpenRouter / Groq / Gemini / OpenAI]
```

## Diretrizes de Segurança Invioláveis
1. **Zero Segredos no Cliente:** Nenhuma chave de API de IA pode estar presente em arquivos do bundle do navegador. Violação é classificada como P0.
2. **Circuit Breaker:** Chaves que apresentem erro 429 (rate limit) ou 401 são temporariamente retiradas da rotação, ativando automaticamente o próximo provedor da cascata.
3. **Cache de Inferência:** Respostas com embeddings idênticos para tarefas determinísticas são cacheadas em banco para evitar custos repetidos.
