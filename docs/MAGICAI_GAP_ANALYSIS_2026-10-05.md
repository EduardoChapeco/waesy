
## 10. Tool-calling persistido e créditos — checkpoint 2026-10-05

O pipeline ReAct existente já executava MCP, mas o estado persistido continha apenas passos genéricos. Agora cada execução registra `tool`, argumentos JSON, status, duração, timestamp e resumo sanitizado do resultado em `payload.toolCalls`; o carregamento de threads também devolve esse campo para o frontend e para futuras retomadas/revisões.

A chamada do gateway de chat foi envolvida por `requireTokensOrTollbooth` quando há `storeId`, usando a RPC ACID existente, chave idempotente por thread/execução, categoria `heavy_ia_llm` e estorno automático em falha upstream. Contextos guest sem tenant continuam sem cobrança, pois não existe carteira segura para debitar.

Validação: 11 testes de chat/gateway passaram; typecheck voltou a 136 erros baseline; não há erro nos arquivos alterados; `git diff --check` passou. Ainda falta persistir uma tabela própria de execuções/steps para retomada após crash — o lote atual usa o payload append-only da mensagem sem introduzir uma tabela duplicada.
