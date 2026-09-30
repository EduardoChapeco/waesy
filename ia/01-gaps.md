# Diagnóstico de Gaps de IA no Sistema (Prompt 01)

## 1. Gaps Críticos Identificados

1. **Ausência de Porta Única Rígida:**
   - Módulos diferentes invocam ou o `ai.functions.ts`, ou o `api-orchestrator.functions.ts`, ou chamam diretamente instâncias via `openrouter.ts`. Não há um ponto de passagem mandatório onde toda e qualquer chamada passe.
   
2. **Exposição Potencial de Chaves no Bundle do Cliente:**
   - Em `src/lib/ai/openrouter.ts:73`, há leitura de `process.env?.VITE_OPENROUTER_API_KEY`. Qualquer código importado por componentes client-side em Vite pode expor tokens com o prefixo `VITE_`. Deve ser estritamente server-side.

3. **Circuit Breaker Inexistente:**
   - Quando um provedor (ex: Groq ou Gemini) atinge rate limit (HTTP 429) ou sofre timeout (HTTP 504), a falha apenas itera para o próximo na hora. Não há marcação de estado "circuito aberto" (OPEN) temporário que evite sobrecarregar o provedor e gaste tempo de latência em requisições subsequentes.

4. **Falta de Deduplicação Simultânea (In-flight Dedup) e Cache por Hash:**
   - Múltiplas requisições simultâneas idênticas (ex.: 2 usuários requisitando o mesmo resumo ou importação do mesmo link) acionam a API de LLM duas vezes em paralelo, duplicando custo e consumo de tokens.

5. **Telemetria e FinOps Incompletos:**
   - O sistema grava tokens totais na carteira da loja em `ai.functions.ts`, mas não grava uma tabela centralizada de `ai_telemetry_logs` contendo:
     - Tarefa (`task`)
     - Custo real em dólares calculado via tabela de precificação por modelo
     - Latência em milissegundos
     - Rastreio de fallback (se o provedor primário falhou e qual assumiu)
     - Versão do prompt utilizada
     - Status HTTP / Erro detalhado

6. **Acoplamento a Strings de Prompt Dispersas:**
   - Prompts de sistema estão espalhados como strings soltas em arquivos de serviço, dificultando testes A/B, versionamento e governança centralizada.
