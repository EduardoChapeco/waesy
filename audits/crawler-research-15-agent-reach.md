# Agent-Reach como referência para os mineradores Waesy

**Data da análise:** 2026-10-06  
**Snapshot analisado:** `Panniantong/Agent-Reach` no commit `a19a171fa980a0785849596492e0af4db800c82f` (`v1.5.0`, Python `>=3.10`). As conclusões abaixo se referem ao código e à documentação desse snapshot, não a capacidades presumidas de versões futuras. O inventário local consultado foi `SYSTEM_INVENTORY.md`; o código comparado está em `src/services/mining/` e nos utilitários de mineração relacionados.

## Conclusão técnica

Agent-Reach **não é um crawler de fila nem um extrator/persistidor de conteúdo**. É um plano de capacidade para agentes: registra canais, escolhe e instala ferramentas upstream, verifica saúde, orienta a configuração e publica uma cadeia ordenada de backends. A leitura e a busca são feitas pelo agente chamando diretamente `curl`/Jina Reader, `gh`, `yt-dlp`, `bili`, `opencli`, `mcporter` e outros; o próprio projeto declara que não há camada wrapper para a leitura [1] [2].

A melhor ideia para o Waesy é, portanto, **separar control plane de data plane**. O Waesy já possui um data plane mais completo: `crawl_queue`, `scrapeUrl`, retries, circuit breaker, extração mecânica em camadas, gates de integridade, deduplicação, persistência no Supabase e `scraper_audit_log`. Agent-Reach oferece padrões úteis para a camada de controle: backends ordenados por fonte, `active_backend`, doctor JSON, probes sem efeitos colaterais, prescrição de reparos, limites explícitos para cookies/browser e falhas de anti-bot que param em vez de tentar contornar a proteção.

Também há limites importantes. Agent-Reach **não oferece** fila persistente, worker, scheduler próprio de crawling, frontier de URLs, sitemap crawler, banco de resultados, cache de conteúdo, métrica por requisição ou um algoritmo genérico de politeness. Suas regras de retry e frequência ficam espalhadas nas referências de cada canal e nos próprios upstreams. Não se deve atribuir ao Agent-Reach uma capacidade de scraping em escala que o código não implementa.

## Arquitetura observada

### Camada de canais e roteamento

A unidade central é `Channel`, com `name`, `description`, `backends`, `tier`, `can_handle(url)` e `check(config)`. `backends` é uma lista ordenada: o primeiro é a preferência e os seguintes são fallbacks. `ordered_backends()` aceita um override por configuração (`<channel>_backend`) e move somente um backend conhecido para a frente; valores desconhecidos não escondem os candidatos que funcionam [3].

O registro estático em `agent_reach/channels/__init__.py` contém 16 canais: GitHub, Twitter, YouTube, Reddit, Facebook, Instagram, Bilibili, XiaoHongShu, LinkedIn, Boss, Xiaoyuzhou, V2EX, Xueqiu, RSS, Exa Search e Web. A tabela de roteamento, portanto, é explícita e auditável, e não um mecanismo de descoberta automática de sites [4].

Exemplos de cadeias declaradas no código:

- Twitter: `twitter-cli` → OpenCLI → `bird` legado.
- Reddit: OpenCLI → `rdt-cli`, sem caminho anônimo de zero configuração.
- Bilibili: `bili-cli` → OpenCLI → API de busca; `yt-dlp` foi retirado desse canal porque a documentação registra bloqueio HTTP 412 em testes do projeto.
- XiaoHongShu: OpenCLI → `xiaohongshu-mcp` → `xhs-cli` legado.
- Web: Jina Reader.
- GitHub: `gh` CLI.
- Exa: Exa via `mcporter`.

Essa é uma abstração de **capability routing**, não um sistema de adaptadores de conteúdo que padroniza todos os campos. Cada upstream conserva seu comando e seu formato. Para o Waesy, isso sugere registrar a política por fonte sem obrigar todos os miners a conhecer a disponibilidade do backend.

### Instalação e configuração como control plane

A CLI `agent-reach install` é segura por padrão: sem `--system`, apenas verifica o ambiente; instalação global, dependências, configuração MCP e registro do skill exigem consentimento explícito. O guia também proíbe `sudo` sem aprovação, alterações fora de `~/.agent-reach/`, instalação de pacotes não listados, desativação de firewall/proteções e criação de arquivos no workspace do agente [2].

Os diretórios são separados por função: configuração e tokens em `~/.agent-reach/`, repositórios upstream em `~/.agent-reach/tools/`, temporários em `/tmp/` e o skill em diretórios de skills do agente. É um padrão útil para evitar que execução de mineração polua o projeto da aplicação.

A integração MCP própria é deliberadamente mínima. `agent_reach/integrations/mcp_server.py` expõe apenas `get_status`, usando `Config(read_only=True)` e `doctor_report()`. Ela não expõe uma ferramenta de leitura de páginas ou de busca; para isso, a documentação manda usar os upstreams diretamente [5].

## Discovery, filas e fluxo de execução

### Discovery que existe

Há três formas distintas de discovery:

1. **Classificação por URL:** cada canal implementa `can_handle(url)`. O Web é o fallback final (`return True`), enquanto canais específicos validam hostnames como `github.com`, `x.com`, `youtube.com` e assim por diante.
2. **Discovery de adaptadores OpenCLI:** o skill manda usar `opencli list` e depois `opencli <platform> --help`. Isso prova que um adaptador existe, mas não prova autenticação ou conteúdo; comandos read-only e conteúdo não vazio são exigidos quando a tarefa realmente usa a plataforma [6].
3. **Discovery de ferramentas/configuração:** o doctor inspeciona comandos no `PATH`, arquivos de credencial e configurações MCP. Para `mcporter`, ele lê as camadas local/home/projeto e os nomes exatos de `mcpServers`, mas não abre `imports` porque isso ampliaria a fronteira de leitura de credenciais [7].

O projeto tem leitura de RSS por `feedparser`, mas não é um crawler de feeds com persistência própria. Não há no código uma frontier de links, um crawler de sitemap, uma tabela de URLs visitadas ou um scheduler de ingestão.

### Filas e workers: capacidade ausente

A busca por fila, worker, scheduler de crawling, Redis/SQLite/Postgres de resultados e cache de documentos não encontra uma implementação no Agent-Reach. O comando `watch` é um health check rápido com verificação de atualização, adequado para ser chamado por um scheduler externo; ele não mantém uma fila nem processa URLs. A documentação de atualização também trata o projeto como CLI/skill de manutenção, não como worker de coleta [8].

Isso contrasta diretamente com o Waesy. Em `src/services/mining/crawler-batch-engine.ts`, `executeCrawlQueueBatchDirect()` busca itens `pending`, ordena por `priority` e `created_at`, usa lote padrão de 5 e roteia oito tipos de entidade. Ele processa os itens em um `for...of` sequencial, marca `processing`, incrementa `retry_count`, executa o harvester e grava `completed` ou `failed` na tabela `crawl_queue`.

A fila do Waesy é uma força importante, mas o código lido revela duas melhorias necessárias:

- O padrão “selecionar pendentes e depois atualizar para `processing`” não é uma reivindicação de claim atômico. O `update` mostrado usa apenas `id`, sem uma condição de status pendente, lease, `locked_by` ou `locked_until`. Dois workers podem observar o mesmo item antes da primeira atualização; a aquisição deveria ser uma operação transacional/atômica no banco.
- `retry_count` é incrementado quando o item é iniciado, mas o batch engine não mostra uma política de re-enfileiramento com `next_attempt_at`, backoff, limite de tentativas ou dead-letter. Assim, o contador não é, sozinho, uma implementação de retry de fila. Os retries reais estão sobretudo no fetch layer.

### Discovery no Waesy que já é superior para crawling

O Waesy possui `discoverFeeds()` em `src/lib/mining/rss-ingester.engine.ts`: primeiro lê tags `<link rel="alternate">` RSS/Atom e, se não encontrar, testa padrões comuns (`/feed`, `/rss`, `/atom.xml`, etc.) com `HEAD`. `parseFeed()` entende RSS e Atom, extrai título, link, descrição, data, imagem, GUID e conteúdo. O batch engine limita a expansão de cada feed aos 15 primeiros itens e usa `upsert` por URL.

Esse discovery é mais apropriado para uma esteira de coleta do que o Agent-Reach. A adaptação recomendada é incorporar a semântica de “canal/backend ativo” ao discovery do Waesy, não trocar a fila por Agent-Reach.

## Politeness, retries e proteção de origem

### O que Agent-Reach realmente faz

`probe_command()` é um probe local, não um fetcher de conteúdo. Ele executa um comando side-effect-free, diferencia `missing`, `broken`, `timeout` e `error`, aceita timeout e um número opcional de retries, e deliberadamente não usa backoff. A própria docstring alerta que retries só devem repetir comandos idempotentes de saúde [9].

A politeness aparece como regra por canal, não como middleware compartilhado:

- XiaoHongShu documenta intervalo de 2–3 segundos entre operações e avisa que buscas em alta frequência ou exploração profunda de comentários pode acionar CAPTCHA; a orientação é reduzir frequência, não contornar o CAPTCHA [6].
- Twitter recomenda uma tentativa direta, upgrade, fallback para OpenCLI e, se necessário, uma rota mais estável como feed/timeline. Também adverte contra chamadas frequentes em IP de datacenter, especialmente followers/following [6].
- Boss documenta cooldown para `RATE_LIMITED`, espera de 5–10 segundos entre buscas e proibição de retentar `ACCOUNT_RISK` ou `ENVIRONMENT_RISK`. Apenas expiração explícita de token pode ter refresh/retry limitado a uma vez [10].
- O fallback de YouTube para transcript aceita no máximo três tentativas em um caso específico de URL de legenda que expira; sucesso significa conteúdo não vazio, não apenas exit code [11].

Não há no Agent-Reach uma fila de domínio, token bucket, contador persistente de requests, `Retry-After` genérico ou circuit breaker HTTP aplicado a todos os canais. O controle de frequência fica nos upstreams, nas instruções do skill ou na operação manual.

### Comparação com o Waesy

Aqui o Waesy já tem uma base mais forte. `src/lib/mining/scraper-utils.ts` implementa:

- retries até um padrão de 3 tentativas;
- backoff exponencial de 1 s até 30 s;
- retry para 408, 429, 500, 502, 503 e 504;
- leitura de `Retry-After` em segundos ou HTTP-Date;
- cooldown por domínio para 429 e desafios Cloudflare, com multiplicador progressivo e persistência em `domain_cooldowns`;
- rate limit em memória por chave;
- timeout de 15 s no fetch;
- classificação de resposta bloqueada/rate-limited.

`crawler-circuit-breaker.ts` acrescenta um circuito por domínio com estados `CLOSED`, `OPEN` e `HALF_OPEN`, limiar de três falhas, cooldown padrão de 30 s e timeout leaf de 8 s. Esses mecanismos são mais completos que os probes de Agent-Reach.

A recomendação é combinar os dois padrões: manter o retry/cooldown/circuit breaker do Waesy e adicionar a disciplina operacional de Agent-Reach. Em particular, o resultado de cada tentativa deve distinguir “erro transitório que pode repetir”, “rate limit que exige esperar”, “challenge que exige parar”, “credencial expirada que exige ação humana” e “risco de conta/ambiente que nunca deve ser repetido automaticamente”.

## Browser, rendering e anti-bot dentro de limites legais

### Caminhos de browser do Agent-Reach

OpenCLI usa uma ponte de extensão e daemon local para dirigir o Chrome real do usuário, reutilizando uma sessão já aberta; o código declara desktop-only e sem headless. O probe seguro executa somente `opencli --version` e consulta o endpoint loopback `127.0.0.1:19825/status`; `opencli doctor` não é usado pelo health check porque pode iniciar o daemon ou alterar `~/.opencli`. Arquivos de extensão no disco não são tratados como prova de que a extensão está carregada; somente uma conexão viva prova `extensionConnected` [12].

Para XiaoHongShu em servidor, o caminho alternativo é `xiaohongshu-mcp`, um upstream externo que pode baixar um browser headless. Agent-Reach exige configuração explícita via Cookie-Editor e uma chamada de verificação de login; não apresenta o browser headless externo como uma capacidade nativa do próprio Agent-Reach [2] [6].

Boss usa um Chrome dedicado com CDP em `127.0.0.1:9222`, profile separado e modo `existing-browser`. O doctor consulta o endpoint CDP e lê somente o cookie `wt2` via `Storage.getCookies`; a documentação manda pausar para o usuário confirmar visualmente a sessão. O projeto distingue claramente login expirado, página de security check e risco de ambiente, e proíbe fallback automático para headless [10].

A rota Web comum não renderiza JavaScript: `web.py` chama `https://r.jina.ai/<URL>`, limita a resposta a 5 MiB, aplica timeout de 30 s e detecta padrões de challenge Cloudflare/CAPTCHA. Se recebe uma página de verificação, levanta erro orientando usar ferramenta específica ou browser [13].

### Limites de autenticação e anti-bot

Os limites são uma parte importante do padrão:

- Agent-Reach não deve fazer login pelo usuário nem ler cookies do browser para XiaoHongShu; OpenCLI pode usar apenas uma sessão Chrome existente e explicitamente controlada pelo usuário.
- Twitter usa Cookie-Editor exportado manualmente; o valor salvo para o doctor não é automaticamente injetado no shell. O comando upstream precisa receber as variáveis de ambiente explicitamente.
- A extração automática de browser é restrita a uma plataforma explicitamente selecionada. A implementação rejeita Twitter/X e XiaoHongShu nesse caminho e requer exportação manual para esses canais [14].
- O guia recomenda conta secundária, não automatiza CAPTCHA/slider e não promete contornar limitações da plataforma.
- Proxy é configurável para conectividade em redes restritas, mas não é apresentado como autorização para burlar limites de uso.

Para Waesy, “anti-bot dentro de limites legais” deve significar: obedecer termos/robots quando aplicável, usar APIs públicas e feeds oficiais primeiro, respeitar `Retry-After`, reduzir frequência após 429/challenge, identificar e registrar páginas de desafio, parar quando a origem exige interação humana e nunca resolver CAPTCHA, roubar sessão, automatizar login ou rodar uma rotação de IP/User-Agent como tentativa de evasão.

O código Waesy atual chama um “Stealth HTTP Fetcher”, gira User-Agent e usa headers de navegador em `fetchHtmlWithStealth()`. Isso pode ser útil para compatibilidade HTTP, mas o nome e o objetivo de “anti-bloqueio” devem ser revistos. Um User-Agent honesto, identificável e estável, junto a cooldown e consentimento, é uma postura mais segura que simular uma identidade diferente para atravessar controles. A detecção de Cloudflare/CAPTCHA já existente em `scraper-utils.ts` deve conduzir a parada/cooldown, não a uma sequência de bypass.

## Extração, normalização e qualidade

### Extração do Agent-Reach

A extração é descentralizada nos upstreams:

- Jina Reader retorna Markdown limpo para páginas Web.
- `yt-dlp` obtém metadados, legendas e, quando autorizado, comentários; a documentação adverte que comentários são best-effort e que legendas automáticas podem exigir pós-processamento [11].
- Bilibili usa `bili-cli` para busca/detalhes e OpenCLI para legendas.
- XiaoHongShu tem `format_xhs_result()` que reduz respostas a título, corpo, usuário, métricas, imagens, tags e comentários; isso é uma limpeza específica de canal, não um parser universal.
- RSS é delegado a `feedparser`.
- Transcrição tem limites concretos: fonte de até 512 MiB, áudio de até 4 horas, no máximo 24 chunks de 10 minutos, áudio comprimido e limites de API. Também bloqueia URLs literais locais/privadas para reduzir SSRF [15].

O projeto não tem um modelo universal de `ExtractedDocument`, não persiste o HTML/Markdown resultante e não aplica um gate editorial ou um score comum a todos os canais. O que parece “read” em uma plataforma pode ser JSON/YAML, Markdown, legenda ou transcript, conforme o upstream.

### Extração do Waesy

O Waesy tem maior profundidade de extração. `mechanical-extractor.ts` faz quatro camadas: JSON-LD/Schema.org, OpenGraph/metatags, seletores específicos por domínio e densidade textual/readability. `integrity-gate.ts` rejeita título genérico, CAPTCHA/challenge, corpo curto, corpo que apenas repete o título/lead e notícias com poucos parágrafos; também calcula `qualityScore`, flags e saúde da imagem.

Os harvesters especializados cobrem `JobPosting`, `Event`, PNCP, leilões, imóveis, places e feeds. `semantic-deduplicator.ts` normaliza tokens, calcula Jaccard e agrupa histórias em janela de 48 horas. `automated-harvest.ts` usa hash SHA-256 de URL canônica, elimina parâmetros de tracking e registra estimativa de tokens economizados.

A adaptação mais valiosa é trazer para o Waesy o **contrato de observação** de Agent-Reach: guardar, por item, `backend_candidate`, `active_backend`, versão/fonte do extractor, motivo de fallback, status de conteúdo e prescrição de reparo. Não é necessário substituir o extrator mecânico; é necessário tornar explícita a rota que o produziu e separar “fetch bem-sucedido” de “conteúdo extraído e validado”.

Há uma cautela concreta no Waesy: `firecrawl-client.ts` possui fallback Steel que, quando obtém screenshot, retorna um HTML sintético com comentário `Steel screenshot captured`. Isso marca a tentativa como `success`, mas não entrega texto extraível. Esse resultado não pode seguir para `extractContentMechanically()` como se fosse HTML real. Deve ser classificado como artefato visual (`screenshot_only`) e ir para revisão/rendering separado, ou ser rejeitado para miners textuais.

## Observabilidade e diagnóstico

### Doctor do Agent-Reach

`doctor.py` percorre os canais e captura exceção por canal para que uma falha não derrube o relatório inteiro. Cada entrada contém `status`, nome/descrição, mensagem, tier, lista de backends e `active_backend`; URLs com credenciais são limpas antes da saída. A saída JSON é adequada para automação e a saída Rich é legível para humanos [16].

O doctor distingue `ok`, `warn`, `off` e `error`, mas não deve ser interpretado como prova de sucesso do alvo. Vários canais fazem apenas probe local ou de infraestrutura: `yt-dlp --version` não verifica um vídeo; OpenCLI conectado não verifica a página nem o login da plataforma; Twitter configurado não executa `twitter status` justamente para não ler cookies silenciosamente. O skill documenta que uma verificação read-only específica pode ser exigida quando a tarefa realmente usa o canal [6].

Os testes formam um contrato mínimo: nomes únicos, tier válido, status conhecido, mensagens não vazias, `active_backend` nulo/string e `ordered_backends()` como permutação da lista original [17]. Isso é um bom padrão de regressão para os adapters do Waesy.

### Auditoria do Waesy

O Waesy grava `scraper_audit_log` nos harvesters PNCP, leilões, imóveis e no harvest automatizado, incluindo duração, itens encontrados/extraídos/inseridos e mensagens de erro. O batch engine retorna resultado por item e mantém `error_message` na fila. Isso é mais próximo de telemetria de ingestão que o Agent-Reach.

O gap é de **saúde do plano de execução**. O Waesy registra o que aconteceu depois do fetch, mas não tem, no inventário analisado, um doctor unificado que responda: qual backend de cada fonte está ativo, qual último erro categorizado ocorreu, quando termina o cooldown, qual versão do provider está instalada e qual prescrição de reparo deve ser executada. Um `mining-doctor --json` com esse contrato teria alto retorno.

Sugestão de campos por backend/fonte:

- `source`, `capability`, `backend`, `priority`, `status`, `active`;
- `probe_kind` (`local_version`, `loopback`, `public_read`, `credential_presence`);
- `last_checked_at`, `latency_ms`, `http_status`, `retry_after_seconds`;
- `domain_cooldown_until`, `consecutive_failures`, `error_class`;
- `credentials_required`, `credentials_present`, `credential_read_scope`;
- `repair_hint`, sem token, cookie ou URL com segredo.

## Storage e segurança

Agent-Reach salva configuração em `~/.agent-reach/config.yaml`. O código rejeita symlink em diretório/arquivo, limita a leitura a 1 MiB, grava YAML de forma atômica, usa permissões de proprietário (`0600` em Unix), faz fsync e mascara campos sensíveis em `to_dict()` [18]. O doctor pode operar sem escrever e a integração MCP usa configuração somente leitura.

Não há storage de documentos, fila ou histórico de extrações no Agent-Reach. Cookies/keys ficam em configuração local ou em arquivos dos upstreams, com política de escopo explícito. O Waesy, por outro lado, persiste dados de negócio e auditoria no Supabase Postgres; a adaptação recomendada é separar:

- dados de conteúdo e resultados, no Supabase;
- estado operacional de crawler (lease, retries, cooldown, provider), também no Supabase, com RLS e retenção definida;
- segredos de provider em vault/secret store, nunca em `crawl_queue`, `metadata`, `scraper_audit_log` ou payloads de erro;
- artefatos temporários em diretório isolado com TTL.

O padrão de escrita atômica, rejeição de symlink, leitura read-only e mascaramento deve ser aplicado também às ferramentas locais/arquivos que o Waesy eventualmente use em workers.

## Comparação direta com o inventário Waesy

O inventário descreve 21 arquivos em `src/services/mining/`, oito verticais, Supabase Postgres com RLS/pg_cron/pg_net/pgvector e um BFF/server functions baseado em TanStack Start/Zod. O código analisado confirma os seguintes pontos:

**Onde o Waesy já é mais forte:**

- fila persistente e roteamento por entidade;
- persistência canônica e idempotência por URL/identificadores;
- retries com backoff, `Retry-After`, rate limit, cooldown e circuit breaker por domínio;
- extração mecânica estruturada e especializada;
- gates de integridade, score de qualidade e detecção de conteúdo poluído;
- deduplicação por hash/Jaccard e janela temporal;
- auditoria de duração, contagem e erros no banco;
- integração React/ReAct para tentar novamente/replanejar scraping até três iterações.

**Onde Agent-Reach oferece padrões que faltam ou estão implícitos no Waesy:**

- lista de backends por fonte com prioridade explícita e override seguro;
- health check real que não confunde `which()`/arquivo presente com ferramenta funcionando;
- `active_backend` e relatório JSON com prescrição de reparo;
- isolamento de probes para que uma fonte quebrada não derrube o diagnóstico global;
- fronteira explícita entre verificação local, presença de credencial e leitura real;
- sessão de browser dedicada, CDP apenas em loopback e confirmação humana para login;
- proibição de leitura silenciosa de cookies, login automático e retry de riscos de conta/ambiente;
- separação de workspace, configuração privada e temporários;
- contratos de testes para registry/adapters.

**O que não deve ser copiado como se fosse uma capacidade:**

- Agent-Reach não substitui `crawl_queue`/worker do Waesy.
- A existência de `active_backend` não torna a leitura do alvo bem-sucedida.
- Jina Reader não é navegador headless; a rota Web não renderiza JavaScript.
- OpenCLI não é um bypass de autenticação; depende da extensão e de uma sessão Chrome existente.
- `xiaohongshu-mcp`, Steel, Firecrawl e demais upstreams são dependências/serviços externos, não componentes próprios automaticamente disponíveis.
- Proxy, User-Agent de navegador ou browser session não autorizam ignorar termos, CAPTCHA, rate limits ou controle de acesso.
- Screenshot capturado não equivale a texto extraído.

## Adaptações priorizadas para os miners Waesy

### P0 — confiabilidade da fila e seleção de backend

1. **Implementar claim atômico com lease.** Criar uma função SQL/RPC que selecione até `N` itens pendentes por prioridade/idade e altere o status para `processing` no mesmo comando, gravando `lease_owner`, `lease_until`, `attempt_count` e `started_at`. Um worker pode recuperar leases expirados. O update final deve exigir o `lease_owner` atual.
2. **Separar retry de item de retry de requisição.** `crawl_queue` deve guardar `next_attempt_at`, `last_error_class`, `last_http_status`, `retry_after_seconds` e `dead_letter_at`. Re-enfileirar somente classes transitórias; challenges, `AUTH_REQUIRED`, `ACCOUNT_RISK` e `ENVIRONMENT_RISK` exigem ação/intervenção, não loop.
3. **Adicionar `SourceBackendPolicy`.** Para cada domínio/capacidade, registrar candidatos ordenados, probe seguro, comando/provider, formatos, custo, requisitos de credencial, consentimento e limites. A execução escolhe o primeiro backend que passa um probe adequado e grava a decisão no item.
4. **Criar `mining-doctor --json`.** Reusar o contrato de Agent-Reach: status por fonte, backend ativo, probe usado, cooldown, última falha e reparo. Nunca emitir segredo; limpar query strings que contenham credenciais.

### P1 — politeness e anti-bot responsável

5. **Unificar políticas por domínio.** Manter `fetchWithRetry`, mas registrar cooldown e contadores no banco para que vários workers não ignorem a pausa local. Respeitar `Retry-After`; usar jitter quando vários workers acordarem juntos; impor limite por domínio e limite global por provider.
6. **Adicionar robots/termos e origem oficial como decisão de rota.** Preferir PNCP, APIs públicas, RSS, Schema.org e páginas autorizadas. Se a resposta parecer challenge/paywall/CAPTCHA, persistir `ACCESS_CHALLENGE`, abrir cooldown e não chamar Steel/headless automaticamente para “furar” a proteção.
7. **Revisar “stealth”.** Trocar rotação indiscriminada de User-Agent por um identificador estável e transparente do crawler, com contato/política quando permitido. O objetivo deve ser compatibilidade e polidez, não evasão de detecção.
8. **Browser consentido e isolado.** Para fontes que só funcionam em sessão, usar profile dedicado e CDP loopback, nunca o Chrome diário por padrão; pedir ação visual do usuário e nunca extrair cookies de todas as plataformas. Guardar somente o mínimo necessário e não registrar tokens em logs.

### P1 — qualidade e extraction provenance

9. **Fixar o contrato de sucesso.** `success: true` deve exigir conteúdo extraível e validado, não somente HTML/screenshot/provider HTTP 200. Introduzir `content_kind: html|markdown|json|yaml|transcript|screenshot_only` e `extraction_status: accepted|rejected|challenge|empty`.
10. **Preservar a cadeia de extração.** Em cada resultado, armazenar `provider`, `backend`, `extraction_method`, `fallback_from`, `attempts`, `response_bytes`, `word_count`, `paragraph_count`, `quality_score` e flags do gate. O Waesy já tem muitos desses campos; padronizar entre verticais reduz investigação manual.
11. **Separar rendering visual de mineração textual.** O fallback Steel deve produzir um artefato de screenshot explicitamente marcado, ou ser seguido por uma rota de OCR aprovada. Não encaminhar HTML sintético de screenshot para os extratores de texto.
12. **Preservar o bom pipeline mecânico.** Manter JSON-LD → metatags → seletor → readability do Waesy e adicionar fallback por fonte apenas quando houver evidência de sucesso. O padrão de Agent-Reach é trocar o backend, não esconder a falha.

### P2 — observabilidade, storage e manutenção

13. **Adicionar métricas por backend/domínio.** Contabilizar latência, sucesso, bytes, HTTP status, rate limits, challenges, conteúdo vazio e qualidade, com retenção e agregação. Isso complementa `scraper_audit_log`, que já registra contagens por execução.
14. **Endurecer estado local de workers.** Usar escrita atômica, permissões owner-only e rejeição de symlink para arquivos fora do banco, seguindo `Config` do Agent-Reach. Segredos devem sair de `metadata` e de mensagens de exceção.
15. **Testar contratos como o Agent-Reach.** Para cada adapter: nomes únicos, backend ordenado, probe sem efeitos colaterais, status válido, fallback determinístico, segredo nunca aparece na mensagem, e erro isolado não derruba o doctor.
16. **Manter o controle externo de agendamento.** `pg_cron`/jobs serverless do Waesy podem chamar workers; não transformar o Agent-Reach em scheduler paralelo. A ideia útil de `watch` é uma operação leve de saúde/update que um scheduler externo pode invocar.

## Limites e caveats da evidência

- O repositório analisado estava em `main` no commit indicado acima; backends upstream podem mudar independentemente.
- “Saudável” no doctor frequentemente significa que a infraestrutura local ou o comando existe e passou uma verificação read-only. A documentação explicitamente diferencia isso de uma leitura real do alvo.
- O relatório não valida login nem chama plataformas protegidas. A análise é de código e documentação primária; não há inferência de acesso onde o projeto declara que exige cookies, sessão ou intervenção humana.
- Afirmações de patrocinadores no README sobre stealth browsing, CAPTCHA ou proxies pertencem aos patrocinadores e **não** foram atribuídas ao Agent-Reach.

## Referências

[1]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/docs/README_en.md "Agent-Reach README oficial em inglês — arquitetura, plataformas e filosofia"

[2]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/docs/install.md "Agent-Reach guia oficial de instalação, limites e configuração"

[3]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/channels/base.py "Agent-Reach contrato base de canais e backends ordenados"

[4]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/channels/__init__.py "Agent-Reach registro oficial de canais"

[5]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/integrations/mcp_server.py "Agent-Reach servidor MCP oficial — status read-only"

[6]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/skill/references/social.md "Agent-Reach referência oficial de canais sociais, retries e frequência"

[7]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/channels/mcporter.py "Agent-Reach inspeção oficial de configuração mcporter/MCP"

[8]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/docs/update.md "Agent-Reach guia oficial de atualização e watch"

[9]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/probe.py "Agent-Reach probes oficiais, classificação de falhas e retry sem backoff"

[10]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/skill/references/career.md "Agent-Reach referência oficial Boss/CDP, cooldowns e riscos"

[11]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/skill/references/video.md "Agent-Reach referência oficial de vídeo, legendas e transcrição"

[12]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/backends/opencli.py "Agent-Reach probe oficial do OpenCLI e browser bridge"

[13]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/channels/web.py "Agent-Reach canal Web oficial via Jina Reader e detecção de challenge"

[14]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/cookie_extract.py "Agent-Reach extração oficial de cookies com escopo explícito"

[15]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/transcribe.py "Agent-Reach transcrição oficial com limites, chunks e proteção SSRF"

[16]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/doctor.py "Agent-Reach doctor oficial e relatório por canal"

[17]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/tests/test_channel_contracts.py "Agent-Reach testes oficiais de contratos de canais"

[18]: https://github.com/Panniantong/Agent-Reach/blob/a19a171fa980a0785849596492e0af4db800c82f/agent_reach/config.py "Agent-Reach configuração oficial, escrita atômica e proteção de segredos"

**Fontes locais comparadas:** `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`; `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`; `/home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts`; `/home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts`; `/home/ubuntu/waesy-audit/src/services/mining/integrity-gate.ts`; `/home/ubuntu/waesy-audit/src/services/mining/semantic-deduplicator.ts`; `/home/ubuntu/waesy-audit/src/lib/mining/scraper-utils.ts`; `/home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts`; `/home/ubuntu/waesy-audit/src/lib/mining/crawler-circuit-breaker.ts`; `/home/ubuntu/waesy-audit/src/lib/mining/rss-ingester.engine.ts`.
