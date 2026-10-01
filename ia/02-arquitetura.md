# Arquitetura do Núcleo de IA — Porta Única, Roteamento e Governança (Prompt 02)

## 1. Visão Geral e Princípio da Porta Única

Nenhum módulo ou componente da aplicação Waesy chama diretamente os SDKs de provedores externos (OpenAI, Anthropic, Google Gemini, Groq, OpenRouter). Toda solicitação de IA do sistema passa obrigatoriamente por uma **Porta Única Server-Side** (`executeAiCoreGateway`).

```
[ Módulos do Sistema ] (Chat, SDR, Builder, OCR, Studio, SimLab, etc.)
         |
         v
+--------------------------------------------------------------------------+
|                       AI CORE GATEWAY (Porta Única)                     |
|                                                                          |
|  1. Segurança: Auth Context + Prompt Shield (Anti-Injection / Sanitizer) |
|  2. Limites & Orçamento: Budget check por Workspace, Usuário e Plano     |
|  3. Deduplicação Simultânea: In-flight Promise sharing por SHA-256 Hash  |
|  4. Cache de Respostas: Cache semântico/impressão digital em disco/banco |
|  5. Roteamento por Tarefa: Seleção por Custo / Latência / Qualidade      |
|  6. Key Pool Manager & Circuit Breaker: Estados Active/Exhausted/Dead    |
|  7. Execução Multiprovedor com Fallback em Cascata & Degradação Gradual   |
|  8. Sanitização de Saída: Anti-leakage de credenciais e PII              |
|  9. Telemetria FinOps: Latência, Tokens In/Out, Custo USD e Fallback Tax |
+--------------------------------------------------------------------------+
         |
         +------------------------------------------------+
         |                        |                       |
   [ Modo Síncrono ]     [ Modo Streaming SSE ]   [ Fila Assíncrona ]
   (Respostas < 15s)     (Chat e Copilot)        (Imagens, Vídeos, Docs)
         |                        |                       |
         v                        v                       v
  [ Groq / Qwen ]         [ Gemini 1.5 ]          [ Worker / Webhook ]
  [ Llama 3.3 ]           [ GPT-4o-mini ]         [ Job Polling ]
```

---

## 2. Pool de Chaves com Circuit Breaker Resiliente

### 2.1 Estados das Chaves e do Circuito
Cada chave na tabela `api_key_pools` possui ciclo de vida controlado por autômato de estados:
- **`active`**: Chave saudável e pronta para despachar requisições.
- **`exhausted`**: Atingiu cota diária ou limite de taxa (HTTP 429). Aguarda janela de resfriamento antes de retornar a `active`.
- **`dead`**: Falha de autenticação irreversível (HTTP 401/403) ou chave revogada. Notifica administradores e não é mais despachada.

O **Circuit Breaker** previne tempestades de requisições sobre provedores instáveis:
- **`closed`**: Tráfego normal. Falhas consecutivas incrementam contador.
- **`open`**: Ao atingir 3 falhas consecutivas ou timeout contínuo, o circuito abre por 60 segundos. Requisições ignoram este provedor na hora sem gastar latência.
- **`half_open`**: Após o período de resfriamento, uma única requisição canário é autorizada. Se tiver sucesso, o circuito fecha (`closed`); se falhar, reabre (`open`) por mais 180 segundos.

---

## 3. Roteamento por Tarefa & Matriz Custo x Latência

| Tarefa (`task`) | Provedor Preferencial | Modelo Preferencial | Provedor Fallback 1 | Provedor Fallback 2 | Custo / 1M In | Custo / 1M Out | Latência P95 |
|---|---|---|---|---|---|---|---|
| **chat** | Groq | `llama-3.3-70b-versatile` | Gemini Flash | OpenRouter | $0.59 | $0.79 | ~350ms |
| **resumo** | Groq | `llama-3.1-8b-instant` | Gemini Flash | OpenAI Mini | $0.05 | $0.08 | ~180ms |
| **classificacao**| Groq | `llama-3.1-8b-instant` | Gemini Flash | OpenAI Mini | $0.05 | $0.08 | ~150ms |
| **extracao** | Gemini | `gemini-1.5-flash` | Groq 70B | OpenAI Mini | $0.075 | $0.30 | ~650ms |
| **geracao_texto**| Groq | `llama-3.3-70b-versatile` | Gemini Flash | OpenRouter | $0.59 | $0.79 | ~800ms |
| **ocr** | Gemini | `gemini-1.5-flash` (Visão) | OpenAI GPT-4o-mini | Anthropic | $0.075 | $0.30 | ~1200ms |
| **codigo** | Gemini | `gemini-1.5-pro` | Groq 70B | OpenAI GPT-4o | $1.25 | $5.00 | ~1500ms |
| **embedding** | Gemini | `text-embedding-004` | OpenAI | Cohere | $0.02 | N/A | ~120ms |
| **imagem** | OpenAI | `dall-e-3` | Flux / Replicate | Stable Diffusion | $0.040/img| N/A | ~8000ms |
| **video** | Fila Assíncrona | `minimax / luma` | Runway | Pika | $0.200/vid| N/A | ~45000ms |

---

## 4. Guardas de Operação e FinOps
1. **Cache por Impressão Digital (SHA-256):** Requisições idênticas para tarefas determinísticas (resumos, classificações, extrações) são cacheadas por até 24h na tabela `ai_response_cache`.
2. **In-Flight Deduplication:** Se 5 clientes dispararem a mesma extração no mesmo segundo, apenas 1 chamada remota é feita. As outras 4 aguardam a mesma Promise.
3. **Orçamento e Tetos de Consumo:** Cada workspace e usuário possui cota diária de custo e tokens configurável. Ao atingir 100%, a porta degrada suavemente ou rejeita requisições não essenciais com código `BUDGET_EXCEEDED`.
4. **Telemetria Centralizada (`ai_telemetry_logs`):** Cada execução registra latência, tokens, custo em microssegundos de dólar, taxa de fallback e hash de auditoria.

---

## 5. Painel de Telemetria e FinOps
A função analítica `getAiTelemetryMetrics` em `src/services/ai-core-gateway.functions.ts` provê agregação em tempo real:
- **Volume Total e Custo:** Contagem de chamadas e somatório de custo em dólares com precisão de 6 casas decimais.
- **Latência Média:** Tempo médio de resposta por provedor e por tarefa.
- **Taxa de Erro & Taxa de Fallback:** Percentual de requisições que acionaram o segundo ou terceiro provedor da cascata.
- **Distribuição por Provedor e Tarefa:** Matriz analítica para visualização gerencial e auditoria de gastos por tenant.

---

## 6. Convergência e Migração de Módulos Legados
1. `src/services/ai.functions.ts`: Totalmente migrado para consumir `executeAiCoreGateway`, preservando a atualização da carteira de tokens da loja e retornando os metadados de telemetria da porta única.
2. `src/services/api-orchestrator.functions.ts`: Suporta cascata e BYOK com integração ao `api_key_pools`.
3. Zero dependência de chamadas no navegador: 100% de chamadas externas de LLM ocorrem estritamente no runtime Nitro do backend.

