
## 15. Persistência retomável e painel realtime — checkpoint 2026-10-05

A telemetria agregada `copilot_activity_steps` não era suficiente para retomada: armazenava o array completo depois da execução, sem entidade de execução, estado corrente, sequência individual ou canal realtime dedicado.

Foi adicionada a migration `supabase/migrations/20270101010000_copilot_react_execution_persistence.sql` com:

- `copilot_executions`: estado da execução, thread, tenant, usuário, domínio, plano, estado, fase, status, erro, contagem de retomadas e timestamps.
- `copilot_execution_steps`: cada etapa individual com sequência, agent, tipo, label, status, observação, tool call, tokens, custo e erro.
- RLS deny-by-default para leitura por usuário/tenant/admin.
- Índices para thread, tenant, execução e estados retomáveis.
- Publicação em `supabase_realtime`.

`src/services/copilot-execution-persistence.ts` fornece início, upsert idempotente de steps, fechamento, retomada e um coletor Proxy que persiste cada `steps.push` individualmente sem alterar o contrato legado do orquestrador.

O `autonomous-copilot-orchestrator.ts` agora inicia a execução persistida, usa o coletor individual e fecha o estado com `completed` ou `failed_retryable`, preservando `copilot_activity_steps` para compatibilidade histórica.

A `AIActivityTrail` passou a assinar `copilot_execution_steps` via o cliente realtime canônico, mesclando eventos persistidos com a atividade recebida na mensagem. O `executionId` é transportado pelo pipeline, payload da mensagem, histórico e drawer/shell do Copilot.

## 16. ReAct nativo para mineração — checkpoint 2026-10-05

Foi criado `src/services/mining/react-mining-adapter.ts`. O crawler contínuo usa Plan → Act → Observe → Reflect para chamadas de scraping. A observação rejeita respostas sem conteúdo útil; o limite é de três iterações. O provider de scraping continua sendo `firecrawl-client`, que mantém sua cascata Firecrawl → Steel.dev → native-fetch, circuit breaker e rate-limit handling. Assim, o ReAct passa a governar a qualidade da extração sem duplicar o provider.

## 17. Redesign global — checkpoint 2026-10-05

O design system recebeu tokens canônicos de movimento, easing, foco e elevação em `src/styles.css`, além de baseline global para `:focus-visible`, transições rápidas de 150ms e `prefers-reduced-motion`. Isso propaga a regra para shells, dialogs, buttons, builders, editores e cards que consomem os tokens Tailwind existentes.

O redesign de alto nível permanece incremental e deve continuar por superfícies: primeiro Copilot/timeline, depois workspace shell, builders/editors, classifieds e demais módulos. O objetivo é manter MagicAI como referência estrutural, Apple HIG para interação/acessibilidade e WhatsApp para densidade de conversa/histórico, sem introduzir uma segunda fonte de tokens.

Validação: 26 testes passaram; typecheck em 136 erros baseline; nenhum erro novo nos arquivos alterados; `git diff --check` passou.

## 18. Enriquecimento completo de anúncios por IA — checkpoint 2026-10-05

O extractor `createListingWithAI` foi ampliado para retornar, além de título/descrição/preço/localização textual:

- localização estruturada: cidade, UF, bairro e CEP;
- modalidade logística e `shipping_mode`;
- estoque;
- marca e condição;
- inclusões e exclusões;
- política de cancelamento;
- configuração de pagamentos: Pix, desconto, cartão, parcelamento, dinheiro e troca;
- aliases compatíveis com estados legados do editor (`payment_rules`, `accepted_payment_methods`, `location_name` e atributos de busca).

O fallback heurístico agora possui o mesmo contrato rico. Também foi corrigida uma falha real em que a regex interpretava o número de modelos como preço (`PS5` era capturado como `R$ 5`). A extração agora prioriza valores monetários explícitos e só aceita números isolados.

Validação específica: 13 testes passaram; typecheck mantém 136 erros baseline; nenhum erro novo nos arquivos alterados.
