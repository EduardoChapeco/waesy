
## 11. Providers efetivos no gateway — checkpoint 2026-10-05

O registry multi-provider já existia, mas o Copilot ainda usava a cascata legada (`groq → gemini → openrouter`). O gateway canônico foi alinhado: Anthropic Messages e DeepSeek Chat Completions agora possuem adapter real, precificação FinOps e entram na cascata de `chat`/`codigo` sem alterar a prioridade histórica do primeiro provider. Assim, as chaves configuradas no pool passam a ser efetivamente utilizáveis pelo Copilot.

Validação: 8 testes de gateway/registry passaram; typecheck permaneceu em 136 erros baseline; nenhuma falha nos arquivos alterados; diff limpo.
