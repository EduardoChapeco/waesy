# Integração de imagens Unsplash no Waesy Studio

**Revisão das fontes:** 2026-10-07. Esta nota registra os requisitos oficiais consultados para orientar a implementação. Ela não substitui os termos vigentes nem aprovação do app Unsplash.

## Fontes primárias

- [Documentação oficial da Unsplash API](https://unsplash.com/documentation)
- [Changelog da API](https://unsplash.com/documentation/changelog)
- [Diretrizes oficiais da API](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- [Diretriz: hotlinking de imagens](https://help.unsplash.com/api-guidelines/guideline-hotlinking-images)
- [Diretriz: disparar eventos de download](https://help.unsplash.com/api-guidelines/guideline-triggering-a-download)
- [Diretriz: atribuição](https://help.unsplash.com/api-guidelines/guideline-attribution)
- [Diretriz: experiências de alta qualidade e autênticas](https://help.unsplash.com/api-guidelines/guideline-high-quality-authentic-experiences)
- [Licença geral Unsplash](https://unsplash.com/license)
- [Termos da Unsplash API](https://unsplash.com/api-terms)

## Fatos verificados

- O changelog oficial informa que **Unsplash Source** foi descontinuado em 2021 e encerrado em **2024-06-11**; aplicações novas devem migrar para a API completa.
- A documentação atual pede que todas as imagens provenientes da API sejam exibidas por meio de `photo.urls.*` retornada pela API (hotlinking), para contabilizar visualizações e dar estatísticas aos fotógrafos. O asset original não deve ser copiado para storage próprio como substituição automática desse requisito. Em uso que precise de infraestrutura própria, consultar a equipe API sobre alternativa permitida.
- Quando uma pessoa usuária escolhe/insere uma foto, deve-se chamar, de forma assíncrona, a URL `photo.links.download_location` retornada pela API; manter a query string existente. Esse endpoint é só telemetria — nunca é a URL da imagem — e exige autorização.
- Ao exibir foto da API, apresentar crédito a Unsplash e à pessoa fotógrafa, com link ao perfil e links Unsplash contendo `utm_source=<nome do app registrado>&utm_medium=referral`.
- Access Key e Secret Key devem permanecer confidenciais; a API deve ser chamada por proxy/servidor quando necessário.
- O modo demo começa em 50 requests/hora; a documentação orienta solicitar produção quando pronto e informa que o app será avaliado pelas diretrizes.
- As diretrizes de uso pedem experiências autênticas, de alta qualidade e não automatizadas, e proíbem treinamento de modelos com o conteúdo da API. Não usar a integração para criar um dump de fotos ou um catálogo concorrente.
- A licença geral e as diretrizes da API são camadas diferentes: independentemente da licença, integração via API requer observar atribuição, hotlinking e tracking definidos nas diretrizes.

## Regras de implementação no Waesy

1. Manter a Access Key em `UNSPLASH_ACCESS_KEY` como secret privado no ambiente Cloudflare Pages do servidor/worker, nunca em `VITE_*`, HTML, logs, source maps ou resposta do endpoint. O wrapper `scripts/wrap-worker.js` mescla o binding `env` do Pages por requisição em `process.env`/`globalThis.__env__`; não adicione essa chave ao mapa de fallback estático nem a arquivos versionados.
2. A busca acontece por escolha humana no editor; nunca buscar e fixar automaticamente imagens em lote nos templates gerados por IA.
3. Preservar ID da foto, URL de exibição devolvida pela API, página da foto, fotógrafo, link do perfil, atribuição, alt, licença indicada, data, slot e estado do evento de download.
4. O estado de provenance `provider-reported` significa metadados recebidos da API, não certificação jurídica do Waesy.
5. Atribuir imagens a slots explícitos (`hero`, item de galeria etc.). URL sem origem/provenance permanece não-publicável segundo a política atual do auditor.
6. Eventos de download só no comando explícito “Usar imagem”; nenhum evento em busca, preview ou renderização de página.
7. Buscar mediação comercial por confirmação escrita da equipe Unsplash antes de habilitar a integração em planos pagos do SaaS. Não assumir que “uso comercial da imagem” resolve por si só a permissão e condições comerciais do cliente/API.
8. Assets de produto real, imóvel anunciado, equipe ou clínica devem vir do cliente ou de uma fonte precisa e autorizada; fotos Unsplash servem para ambiente/inspiração genérica e não podem induzir o visitante a acreditar que representam algo real do negócio.

## Implementação Waesy (branch/PR de continuação; PR #4 já mesclada)

- `UnsplashAssetPicker` só é exibido se o manifesto ativo contém slot com `allowUnsplash=true` **e** `subjectPolicy=decorative-only`. Não é um importador em lote: cada foto exige busca e clique de seleção explícitos.
- `UNSPLASH_ACCESS_KEY` é lida exclusivamente no server function, via ambiente runtime do worker. O browser recebe apenas estado booleano, resultados normalizados e URLs oficiais necessárias para hotlink/atribuição; a key nunca aparece em resposta. A chave deve ser provisionada pelo proprietário do projeto no ambiente Pages (Production e, se desejado, Preview), sem incluí-la em `VITE_*` ou no código do wrapper.
- Ao selecionar, o backend busca novamente `GET /photos/{id}`, confere que a URL `download_location` recebida corresponde à foto oficial e chama aquele endpoint com o `Client-ID`. Em seguida grava no `unsplash_studio_selections` (store, photo, slot, URL de imagem/página, autor/perfil, licença, usuário e timestamp). Se tracking ou persistência falhar, o cliente não adiciona a foto.
- Na publicação, `publishOmniPageDocument` verifica a referência contra o ledger do mesmo `store_id`, foto e `usage_slot`; também compara o caminho da imagem hotlinked, página da foto, fotógrafo, perfil e licença. Trocar `provider` para `upload` em `images.unsplash.com` é explicitamente bloqueado pelo auditor. A falta da migration faz a publicação falhar de forma segura quando houver referência Unsplash.
- `BuilderAssetCredits` renderiza crédito visível com links de fotógrafo e Unsplash no renderer público. A autoria/URL recebida é escapada como texto React e os hosts de links são verificados.
- `20270114010000_unsplash_studio_selection_ledger.sql` cria ledger sem acesso browser direto; as funções backend autenticadas usam o server client. A migration é parte do código, mas sua aplicação na base não foi executada por esta PR.
- Rate limit da busca (20/min por usuário/loja) e geração (4/min) é atualmente por processo em memória; antes de tráfego escalado, migrar para quota distribuída no KV/DB.

## Checklist antes de habilitar em produção

1. Registrar a aplicação e confirmar com Unsplash que o fluxo SaaS/comercial está alinhado às diretrizes/review atuais; **não** inferir aprovação a partir do código.
2. Aplicar as migrations `20270114000000_studio_template_library.sql` e `20270114010000_unsplash_studio_selection_ledger.sql` pelo processo de banco do projeto.
3. Criar o secret privado `UNSPLASH_ACCESS_KEY` no ambiente server/worker e definir `UNSPLASH_APP_NAME` somente se o nome correspondente estiver registrado.
4. Executar a suíte de testes, build, CI, smoke test autenticado de busca/seleção, verificar hotlink/atribuição na página publicada e testar que tracking com erro e metadata forjada são bloqueados.
5. Promover somente templates revisados; os 3 pilotos atuais continuam com placeholders intencionais e **não** devem ser publicados sem substituição por fatos verdadeiros.
