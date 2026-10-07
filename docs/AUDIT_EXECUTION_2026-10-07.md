

## Oitava onda — redução incremental do editor legado de classificados

O próximo maior módulo de aplicação priorizado pelo plano foi `src/routes/_store.conta.classificados.novo.tsx`, com aproximadamente 490 KB e mais de 9.500 linhas. A primeira fatia foi escolhida por fronteira funcional clara e baixo risco: o seletor inicial de formatos (`CreateTypePicker`) dependia somente da taxonomia, do fluxo de criação assistida por IA e de callbacks de navegação.

O componente foi extraído para `src/components/classifieds/create-type-picker.tsx`. O contrato agora recebe explicitamente os cards de nicho, a taxonomia de desapego e os callbacks `onSelect`/`onAiPrefill`, eliminando dependências implícitas da rota. A lógica e a apresentação foram preservadas; nenhuma mutação ou contrato de backend foi alterado. A rota também recebeu reserva inferior canônica para que o action bar sticky não cubra conteúdo em telas menores.

Resultado estrutural: a rota caiu de **9.573 para 9.167 linhas**, uma redução líquida de **406 linhas**; o novo componente ficou com 415 linhas isoladas, testáveis e reutilizáveis. O novo componente e a rota ficaram sem achados diretos no Design Lint.

Validação desta onda:
- Typecheck completo: passou.
- Design lint ratchet: passou sem regressão, mantendo 13.754 violações legadas catalogadas e redução acumulada de 538 violações.
- Testes de classificados, viagem e ciclo de vida: **9/9 passaram**.
- `git diff --check`: passou.

Próxima fatia: separar o primeiro bloco coeso do `SpecializedClassifiedEditor`, priorizando uma seção de estado local com contrato de props explícito e sem mover mutações de publicação até que existam testes de regressão do payload.


## Nona onda — navegação operacional e contratos acíclicos do editor legado

A segunda fatia do `SpecializedClassifiedEditor` isolou o bloco de navegação operacional em `src/components/classifieds/classified-editor-navigation.tsx`. O componente agora concentra topbar, alternador mobile Editar/Prévia, ação Publicar/Salvar, stepper de cinco etapas, restauração/descartes de rascunho e barra de qualidade. Seu contrato recebe apenas estado e callbacks explícitos; nenhuma mutação, consulta Supabase ou montagem de payload foi movida.

Durante a auditoria end-to-end foi detectado que importar tipos diretamente da rota criava dois ciclos de dependência entre rota e componentes extraídos. Em vez de suprimir o gate, os contratos `ClassifiedNicheType` e `NicheDefinition` foram movidos para `src/types/classified-editor.ts`, que se tornou o SSOT acíclico. A rota mantém reexport compatível para consumidores existentes, enquanto os componentes dependem somente do contrato compartilhado.

Resultado estrutural: a rota caiu para **9.015 linhas**; os componentes extraídos ficaram isolados em 415 e 215 linhas, respectivamente. Os três arquivos apresentaram **0 achados diretos** no Design Lint.

Validação end-to-end final:
- Typecheck: passou.
- Testes específicos de classificados: **24/24 passaram**.
- Suíte completa Vitest: **238 arquivos e 1.547 testes passaram**.
- Build de produção: passou; worker Cloudflare gerado.
- Client/server leak: passou com **492 chunks verificados**.
- Auditoria interativa: **19/19 testes passaram; P0/P1/P2 = 0** em 1.031 arquivos e 6.182 controles.
- Testes normativos do Design Lint: **45/45 passaram**.
- Schema checker: 471 migrations, 590 tabelas, 193 funções e unicidade de versões aprovada.
- SSOT: 1.935 arquivos, 0 tipos duplicados e nenhum `Database = any`.
- Grafo de dependências: **0 ciclos; aprovado**.

A primeira execução do build revelou o ciclo e um erro de composição JSX; ambos foram corrigidos e os gates foram repetidos no estado final. A próxima fatia deve extrair uma seção visual de formulário do editor com contrato de props explícito, mantendo o pipeline de publicação dentro da rota até haver testes de payload específicos.


## Décima onda — seção de mídias e integridade de uploads concorrentes

A seção `1. Mídias do Anúncio` foi extraída do `SpecializedClassifiedEditor` para `src/components/classifieds/classified-media-section.tsx`. O componente encapsula a galeria Hero, a galeria exclusiva do Feed, limites, formatos, recorte e callbacks de alteração. O pipeline de publicação e a persistência do anúncio permaneceram na rota.

Foi corrigida uma falha de estado concorrente: os dois `MediaUploader` compartilhavam diretamente um único setter booleano. Se os uploads Hero e Feed ocorressem ao mesmo tempo, o primeiro a terminar poderia liberar a publicação enquanto o segundo ainda estivesse ativo. O novo componente mantém estados independentes e publica o estado agregado `Hero || Feed`, usando a regra pura testável em `src/lib/classifieds/media-state.ts`.

Também foram refinados os componentes previamente extraídos. O contrato de pré-preenchimento por IA deixou de usar `any`, o tratamento de erro passou a usar `unknown` com narrowing seguro e os três `useMemo` do seletor passaram a declarar as coleções que realmente consultam como dependências.

Validação da onda:
- Typecheck: passou.
- Testes focados: **16/16 passaram**, incluindo 3 regressões da agregação de uploads.
- Suíte completa Vitest: **239 arquivos e 1.550 testes passaram**.
- Build de produção: passou; worker Cloudflare e rotas gerados.
- Client/server leak: passou com **492 chunks verificados**.
- Design Lint direto nos quatro arquivos alterados: **0 achados**.
- Auditoria de botões: **19/19 testes passaram**.
- Grafo de dependências: **0 ciclos**.
- Schema, SSOT, route budget e `git diff --check`: aprovados.

A rota principal caiu para aproximadamente **8.936 linhas** após a extração. Próxima oportunidade: extrair a seção de informações básicas em subcomponentes menores, começando por campos comuns e mantendo campos especializados por nicho isolados até haver contratos de validação específicos.


## Décima primeira onda — Informações Básicas e fronteira pronta para assistência do Copilot

A moldura da seção `2. Informações` foi extraída para `src/components/classifieds/classified-basic-info-section.tsx`. O componente agora possui contrato explícito para nicho, título, descrição, refinamento assistido por IA, estados de refinamento e conteúdo especializado via `children`. A decisão de manter o bloco de precificação, validade, estoque e disclaimers dentro da rota foi intencional: essas regras ainda possuem comportamento específico de domínio e permanecem próximas do payload de publicação até a próxima cobertura de contrato.

A nova fronteira já permite evoluir o Copilot de forma segura: sugestões de título/descrição podem ser injetadas por callbacks tipados, sem o componente visual conhecer provider, prompt ou persistência. Isso preserva a separação entre orquestração, evidência real e apresentação, alinhada ao SPEC-MASTER. O próximo passo de integração do Copilot deve usar uma operação estruturada com preview e aprovação antes de mutar o payload, não um fallback sintético.

Validação final da onda:
- Typecheck: passou.
- Testes focados: **16/16 passaram**.
- Suíte completa Vitest: **239 arquivos e 1.550 testes passaram**.
- Build de produção: passou; worker Cloudflare e rotas gerados.
- Client/server leak: passou com **492 chunks verificados**.
- Design Lint direto nos quatro arquivos auditados: **0 achados**.
- Auditoria interativa: **19/19 testes passaram**.
- Grafo de dependências: **0 ciclos**.
- Schema, SSOT, route budget e `git diff --check`: aprovados.

A rota principal caiu para aproximadamente **8.890 linhas**. A próxima melhoria recomendada é extrair a localização comum e, em seguida, criar uma camada de comando/preview para o refinamento assistido pelo Copilot, com payload versionado, evidência da sugestão e aprovação humana antes da publicação.


## Décima segunda onda — localização comum e preview versionado do Copilot

A seção comum de localização do `SpecializedClassifiedEditor` foi extraída para `src/components/classifieds/classified-location-section.tsx`. O componente concentra o `CityCombobox` e o controle de privacidade LGPD, recebendo somente valores e callbacks tipados; a montagem do payload e a persistência continuam na rota. Durante a integração foi encontrado e corrigido um delimitador JSX duplicado no bloco de telefone, que havia quebrado a composição `aside/main`.

A assistência de título e descrição foi refinada de mutação imediata para um fluxo de **preview com evidência**. Cada sugestão recebe versão incremental, timestamp, origem, hash do texto-base e snapshot anterior. A aplicação valida novamente o hash antes de mutar o formulário; se o usuário editou o texto nesse intervalo, o preview é descartado e nenhuma edição é sobrescrita. A evidência aplicada segue no payload como `ai_refinement_evidence`, permitindo rastreabilidade real sem inventar conteúdo.

Resultado estrutural: a rota ficou com **8.899 linhas**; a localização isolada ficou em 56 linhas, e o contrato compartilhado `src/types/classified-editor.ts` passou a concentrar o hash/evidência do refinamento sem criar ciclos.

Validação end-to-end desta onda:
- Typecheck: passou.
- Testes focados: **4 arquivos e 15 testes passaram**.
- Suíte completa Vitest: **240 arquivos e 1.552 testes passaram**.
- Build de produção: passou; worker Cloudflare e rotas gerados.
- Client/server leak: passou com **492 chunks verificados**.
- Schema, SSOT, route budget e `git diff --check`: aprovados.
- Design Lint ratchet: passou, com redução acumulada de **538 violações**; o débito histórico de 13.754 achados permanece explicitamente catalogado, sem atualização artificial do baseline.

Próxima fase: auditar os blocos restantes do editor especializado (preço, estoque, validade e especificações por nicho), priorizando extrações que tenham regras puras testáveis e contratos de payload antes de mover qualquer mutação de publicação.


## Décima terceira onda — preço, validade, estoque e continuidade versionada

A renderização completa do bloco de preço, validade e estoque foi extraída para `src/components/classifieds/classified-pricing-lifecycle-section.tsx`, sem mover o estado de domínio, a montagem do payload ou a publicação para fora da rota. A fronteira mantém todas as modalidades de preço (`fixed`, `starting_at`, `price_range`, `on_quote`, `exchange_only` e `free`), negociação, preço inicial, faixa mínima/máxima, validade de 30/60/90 dias, limite de ofertas, estoque físico e todos os avisos legais existentes. Os contratos `ClassifiedPricingType`, `ClassifiedPriceDisclaimer` e `ClassifiedValidityDays` foram centralizados no SSOT `src/types/classified-editor.ts`.

A auditoria de sobreposição confirmou que esta extração não duplica o Copilot de aprovações: o motor persistido continua em `src/services/ai-conversations.functions.ts` e nos painéis de chat; o preview de refinamento permanece uma sugestão local com hash/evidência e não executa ação externa. A nova documentação versionada também inclui o SPEC-MASTER herdado e o playbook de continuidade com log de ações, regras anti-mocks, regras anti-duplicação e backlog P0/P1/P2.

Resultado estrutural: a rota caiu para **8.685 linhas**, redução de 214 linhas nesta fatia; o componente de preço/ciclo de vida ficou com 290 linhas, preservando a renderização especializada e os callbacks explícitos.

Validação desta onda:
- Typecheck: passou.
- Suíte completa Vitest: **240 arquivos e 1.552 testes passaram**.
- Build de produção, worker Cloudflare e route budget: passaram.
- Client/server leak: aprovado pelo gate canônico.
- Schema, SSOT, naming, ciclos, Design Lint e auditorias canônicas: aprovados.
- `check:canonical`: exit code 0.

O playbook operacional está em `docs/WAESY_CONTINUATION_PLAYBOOK_2026-10-07.md`; a especificação arquitetural herdada está em `docs/specs/SPEC-MASTER-COPILOT-AUTONOMOUS-ENGINE.md`. A próxima fase deve testar as regras puras de payload/preço antes de extrair especificações por nicho ou alterar qualquer mutação de publicação.
