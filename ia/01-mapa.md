# Mapa Completo de Inteligência Artificial — Waesy (PROMPT 01)

## 1. Visão Geral Executiva
Este documento estabelece o mapeamento exaustivo de todos os pontos de Inteligência Artificial do ecossistema Waesy. Após a execução dos mandatos normativos de Prompts 11 a 28 e 31, 100% das chamadas e serviços de IA foram centralizados em funções de backend (BFF Server Functions), com zero chaves expostas no bundle do cliente, circuit breaker ativo por provedor, cálculo de FinOps por token e governança declarativa de prompts.

---

## 2. FASE B — Ficha por Ponto de IA (Catálogo Normativo)

| Módulo | Arquivo:Linha | Finalidade | Provedor | Modelo | Chave (Variável) | Lado | Entrada | Saída | Temp | Versão Prompt | Fallback | Cache | Telemetria | Trata Erro | Custo Est./Chamada |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AI Core Gateway 2.0** | `src/services/ai-core-gateway.functions.ts:50` | Porta Única universal com Circuit Breaker e FinOps | Groq / Gemini / OpenRouter / OpenAI / Anthropic | `llama-3.3-70b-versatile`, `gemini-2.0-flash` | `api_key_pools`, `secret_vault` | Servidor | `AiCoreGatewayPayload` | `AiCoreGatewayResult` | 0.2 | Dinâmica SemVer | SIM | SIM | SIM | SIM | \$0.000100 - \$0.005000 |
| **Prompts Master** | `src/services/ai-master-prompts.functions.ts:35` | Resolução em cascata e governança SemVer | Interno / Zod | 12 templates canônicos | N/A (Governança) | Servidor | Slug + Variáveis | Prompt interpolado | 0.0 | 1.0.0 a 2.1.0 | SIM | SIM | SIM | SIM | \$0.000000 |
| **Quality Benchmark 2.0** | `src/services/ai-quality-benchmark.functions.ts:40` | Benchmark contínuo com 8 rubricas ancoradas | Gemini / Groq + Heurística | `gemini-1.5-pro` | `api_key_pools` | Servidor | RunId + Case + Output | 8 notas (0 a 5) | 0.1 | 2.0.0 | SIM | SIM | SIM | SIM | \$0.000500 |
| **Memória 5 Camadas** | `src/services/ai-memory-curation.functions.ts:30` | Recuperação contextual por camada com LGPD | Supabase pgvector + Relacional | `text-embedding-3-small` | `api_key_pools` | Servidor | Query + StoreId + UserId | Memórias citadas | 0.0 | 1.0.0 | SIM | SIM | SIM | SIM | \$0.000020 |
| **AI Builders Engine** | `src/services/ai-builder-composition.functions.ts:45` | Composição de sites, docs, slides e cards | Groq / OpenRouter / Gemini | `llama-3.3-70b` | `api_key_pools` | Servidor | Prompt + Arquétipo | Doc + Rubrica >= 80 | 0.3 | 1.2.0 | SIM | NÃO | SIM | SIM | \$0.002500 |
| **Skills & Squads Runtime** | `src/services/ai-skills-router.functions.ts:25` | Roteamento para 10 skills e 3 squads | Heurística + LLM | `llama-3.1-8b-instant` | `api_key_pools` | Servidor | Prompt + Sessão | Skill + Handoff + Veto | 0.2 | 1.0.0 | SIM | SIM | SIM | SIM | \$0.000150 |
| **Chat Commerce** | `src/services/chat-commerce.functions.ts:30` | Compras e agendamentos in-stream idempotentes | Regras Server-Side + IA | `gemini-1.5-flash` | `api_key_pools` | Servidor | Intent + Cart + Key | Card DTO + Pedido | 0.1 | 1.0.0 | SIM | SIM | SIM | SIM | \$0.000200 |
| **Conversational Shell** | `src/services/ai-conversations.functions.ts:35` | Threads com trilha de raciocínio observável | OpenRouter / Gemini | `gemini-1.5-flash` | `api_key_pools` | Servidor | ThreadId + Mensagem | Stream de eventos | 0.4 | 1.0.0 | SIM | NÃO | SIM | SIM | \$0.000800 |
| **Módulos Verticais** | `src/services/vertical-ai-modules.functions.ts:40` | Automação técnica RH, Fiscal, Jurídico | Groq / OpenAI | `llama-3.3-70b`, `gpt-4o` | `api_key_pools` | Servidor | Domínio + Contexto | Parecer ou Planilha | 0.1 | 1.1.0 | SIM | SIM | SIM | SIM | \$0.001800 |
| **RMA & Anti-Fraude** | `src/services/rma.functions.ts:250` | Perícia forense visual de devoluções | Gemini Multimodal Vision | `gemini-1.5-flash` | `api_key_pools` | Servidor | Fotos + Motivo devolução | Risco de fraude + Laudo | 0.0 | 1.0.0 | SIM | SIM | SIM | SIM | \$0.001200 |
| **Servidor WebMCP** | `src/services/mcp-server.functions.ts:30` | Superfície de ferramentas abertas MCP | Protocolo WebMCP | Agnóstico | Bearer / HMAC | Servidor | ToolCall + Argumentos | ToolResult estruturado | 0.0 | 1.0.0 | NÃO | SIM | SIM | SIM | \$0.000000 |
| **AI SDR Qualifier** | `src/services/ai-sdr.functions.ts:45` | Qualificação e cadência de vendas | OpenRouter / Gemini | `gemini-1.5-flash` | `api_key_pools` | Servidor | Histórico + Catálogo | Resposta + Score lead | 0.3 | 1.0.0 | SIM | NÃO | SIM | SIM | \$0.000800 |
| **Travel Boarding OCR** | `src/services/travel-ai-extractor.functions.ts:32` | Extração de bilhetes aéreos e reservas | Gemini Multimodal | `gemini-1.5-flash` | `api_key_pools` | Servidor | Buffer do PDF/Imagem | Vouchers estruturados | 0.0 | 1.0.0 | SIM | SIM | SIM | SIM | \$0.001500 |
| **Multimodal Fiscal OCR** | `src/services/multimodal-ocr.functions.ts:25` | Extração de DANFE e comprovantes | Gemini / OpenAI | `gemini-1.5-pro` | `api_key_pools` | Servidor | Buffer da Imagem | Dados fiscais validados | 0.0 | 1.0.0 | SIM | SIM | SIM | SIM | \$0.002000 |
| **Editorial Mining Squad** | `src/services/mining/editorial-squad.ts:35` | Curadoria jornalística e síntese de notícias | Gemini / Groq | `gemini-1.5-flash` | `api_key_pools` | Servidor | HTML bruto + Fonte | Notícia limpa + Score | 0.2 | 1.1.0 | SIM | SIM | SIM | SIM | \$0.000600 |

---

## 3. FASE C — Auditoria do Pool de Chaves e Orquestrador

### 3.1 Armazenamento e Governança de Segredos
- **Onde vive a chave:** Estritamente no banco relacional Supabase com RLS ativado (`api_key_pools`, `secret_vault` e `tenant_ai_providers`) e criptografia em repouso.
- **Isolamento de Segredos:** Zero chaves expostas no bundle do cliente. Proibido declarar variáveis `VITE_*` contendo credenciais de provedor no código cliente. Todas as chamadas operam exclusivamente na camada BFF (Server Functions) via runtime Nitro.
- **Visibilidade:** Usuários e lojistas nunca veem a chave real em texto claro após o cadastro; a interface exibe apenas o provedor, apelido e os 4 últimos dígitos mascarados (`****sk-1234`). Acesso restrito a administradores autenticados com verificação de identidade no servidor.

### 3.2 Ciclo de Vida, Rotação e Circuit Breaker
- **Seleção de Chave:** Ponderada por status ativo (`is_active = true`), menor número de falhas consecutivas (`consecutive_failures`) e tempo de uso mais antigo (`last_used_at ASC`).
- **Máquina de Estados de Circuit Breaker:**
  - `CLOSED` (Normal): Chave saudável opera com 100% do tráfego.
  - `OPEN` (Circuito Aberto): Após 3 falhas consecutivas (HTTP 429 Rate Limit ou HTTP 5xx), a chave é desativada temporariamente por 60 segundos, impedindo latência inútil.
  - `HALF-OPEN` (Teste de Recuperação): Após o resfriamento de 60 segundos, uma requisição de teste é permitida. Se bem-sucedida, retorna a `CLOSED`; se falhar, reabre por mais 120 segundos.
- **Falha Total do Pool:** Caso todas as chaves do provedor primário falhem, o orquestrador comuta automaticamente para o próximo provedor na matriz de fallback (ex.: Groq -> Gemini -> OpenRouter). Se todos falharem, o sistema retorna erro descritivo tipado sem travar a interface e aciona alerta no log.

### 3.3 Diagrama Textual do Caminho de Execução
```text
[Usuário / Interface de Aplicação]
                 │
                 ▼ (Payload sem segredos)
[BFF Server Function (src/services/)]
                 │
                 ▼ (Validação de Sessão & Rate Limit)
[Prompt Shield (Inspeção Anti-Jailbreak)]
                 │
                 ▼ (Cálculo de Hash SHA-256 do Prompt + Contexto)
[Cache de Respostas / In-Flight Dedup] ──(Hit)──► [Retorna Resposta em Cache (Custo $0)]
                 │ (Miss)
                 ▼
[Resolução de Prompt (ai-master-prompts SemVer)]
                 │
                 ▼
[Orquestrador de Chaves (api_key_pools)]
        ├── Consulta Circuit Breaker (Estado != OPEN)
        ├── Seleção da Chave Saudável com Menor Carga
        └── Rotação Automática de Chaves
                 │
                 ▼
[Disparo HTTP para API Externa (Groq / Gemini / OpenAI)]
        ├── Sucesso: Reset de Falhas da Chave
        └── Falha: Incrementa Falha -> Se 3x, abre circuito -> Próximo Provedor
                 │
                 ▼
[Filtro de Saída (Erradicação de Segredos no Payload)]
                 │
                 ▼
[Gravação de Telemetria e FinOps (ai_telemetry_logs)]
        ├── Rastreio de latência (ms)
        ├── Cálculo de custo por token (precisão de 6 decimais)
        └── Atualização de saldo da loja
                 │
                 ▼
[Retorno Seguro para o Cliente / UI]
```

---

## 4. Evidência de Conformidade com o Mandato
- **Zero Segredos no Cliente**: Auditado em 100% dos componentes e rotas (`src/components/`, `src/routes/`). Nenhuma API de IA é chamada do navegador.
- **FinOps Auditável**: Cada token de entrada e saída é contabilizado na tabela soberana `ai_telemetry_logs`.
- **Governança de Prompts**: Todos os 15 módulos consomem modelos e templates catalogados, proibindo strings soltas e dispersas.
