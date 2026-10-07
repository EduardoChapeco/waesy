

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
