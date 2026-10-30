# Evidence Ledger — Travel Integrations — 2026-10-30

## Preflight

| Campo | Evidência |
|---|---|
| Repositório | `C:\Users\Excelência Tour SMO\Documents\waesy` |
| Branch | `production-candidate` |
| HEAD | `9b001449` |
| Estado | Worktree previamente sujo; alterações existentes preservadas |
| Escopo | InfoTravel, Wooba, cotação/pacote, viagem corporativa, WhatsApp, contrato, financeiro e rotas relacionadas |
| Referência | `C:\Users\Excelência Tour SMO\Documents\projetos-referencias\travelagencias` |

## Baseline observada

| Verificação | Resultado |
|---|---|
| Build | Passou anteriormente nesta sessão; sem prova de credenciais externas |
| Lint global | Exit 0; avisos existentes |
| Design lint ratchet | Passou; baseline vigente 3774, P0 0 |
| Auditoria semântica de controles | 8288 controles, P0/P1/P2 0 |
| Contratos BFF/tabelas | 636 referências cobertas; 0 não declaradas |
| Ciclos | 0 |
| TypeScript | Não concluído; execução interrompida após lentidão/OOM em execução anterior |
| Build pós-correção | Passou; client, SSR, Nitro Cloudflare Pages, client-leak, injeção Supabase e empacotamento do worker concluídos |

## Achados iniciais

| ID | Achado | Severidade | Evidência | Próximo passo |
|---|---|---:|---|---|
| TRV-001 | Existem conectores e funções reais para InfoTravel/Wooba, mas a cobertura de capacidades e rotas precisa ser cruzada em uma matriz única | P1 | `src/services/infotravel.ts`, `src/services/travel-wooba-connector.service.ts`, rotas `workspace.turismo.*` | Consolidar contrato de capacidade e origem da oferta |
| TRV-002 | O repositório de referência possui fluxo explícito de quote request, search plan/scenarios, package candidates e snapshot | P1 | `projetos-referencias/travelagencias/src/services/quotes.ts` | Comparar com `quotes.functions.ts` e `travel-proposal.functions.ts` sem duplicar lógica |
| TRV-003 | A existência de Server Functions não prova que as telas atuais percorrem a cadeia completa nem que o provedor foi chamado | P1 | Auditoria estática e ausência de tráfego externo nesta fase | Adicionar evidência de jornada e separar status de integração |
| TRV-004 | WhatsApp possui webhook, outbox, automação e funções corporativas; a unicidade da instância Excelência Tour deve ser verificada em loader/RLS | P1 | `src/services/whatsapp-*`, `src/routes/api.webhooks.whatsapp*` | Auditar isolamento de tenant e ponte para cotação canônica |
| TRV-005 | TypeScript continua lento e não tem resultado final nesta fase | P1 | execução interrompida; processo encerrado | Investigar escopo incremental e memória em onda própria |

## Correção aplicada nesta microfase

| ID | Mudança | Prova esperada |
|---|---|---|
| TRV-006 | O orquestrador passou a resolver uma lista explícita de provedores; `flight` sem lista usa somente `wooba`, e o tool corporativo declara `providerCodes: ["wooba"]` | `src/services/travel-supply-orchestrator.test.ts` + auditoria estática do filtro |
| TRV-007 | A busca de voo isolado do workspace foi alinhada ao conector Wooba; removida a mistura de InfoTravel e inventário local sem preço | `searchAgencyGdsFlightsFn`, rota `workspace.turismo.cotacoes.tsx`, teste de contrato a adicionar |
| TRV-008 | A busca de pacotes InfoTravel passou a aceitar e validar múltiplas ocupações de quarto com idades, mantendo compatibilidade com uma sala | `normalizeInfoTravelRoomOccupancies` + `infotravel-room-occupancy.test.ts` |
| TRV-009 | O Studio de propostas deixou de consultar InfoTravel diretamente para voo isolado e passou a consumir o BFF Wooba com preço server-side | `src/components/tourism/studio/sections/SectionFlights.tsx` |

## Onda 2 — contratos canônicos e segurança de integrações

| ID | Mudança | Prova registrada |
|---|---|---|
| TRV-010 | Sessões canônicas de cotação passaram a persistir fornecedor, execução, snapshot de oferta, validade e contagem de ofertas; ofertas sem preço, identificador ou validade são rejeitadas | `src/services/travel-quote-session.service.ts`, `src/services/infotravel.ts`, `src/services/travel-wooba-connector.service.ts` |
| TRV-011 | Cotação de pacote InfoTravel aceita ocupações por quarto e vincula a sessão/snapshot; falhas de persistência encerram a sessão como falha em vez de criar sucesso fictício | `infotravelSearchPackages`, `tourism-travel-quote-contract.test.ts` |
| TRV-012 | `createAgencyTravelQuote` usa contrato snake_case, valida tenant, liga sessão/lead, persiste ocupações e cria lead CRM com origem e metadados quando necessário | `src/services/tourism.functions.ts`, migration `20270214000002_travel_quote_canonical_links.sql` |
| TRV-013 | Proposta recebe `quote_id` canônico e o Studio não cria voo, hotel, preço, transferência ou condições inventadas quando a fonte não retornou dados reais | `src/components/tourism/unified-proposal-workspace.tsx`, `src/services/travel-proposal.functions.ts` |
| TRV-014 | Evolution API deixou de aceitar chave mestre ou endpoint embutidos; URL e chave agora são obrigatórias no ambiente server-side | `src/services/whatsapp-channel-instances.functions.ts`, lint focado exit 0 |

## Evidência da Onda 2

| Verificação | Resultado |
|---|---|
| Testes focados | 4 arquivos, 14 testes passaram |
| ESLint nos arquivos da onda | Exit 0; avisos existentes, nenhum erro |
| Contratos BFF/tabelas após migration | 571 migrations, 789 tabelas, 637 referências BFF, 0 não declaradas |
| `git diff --check` | Exit 0; apenas avisos de normalização LF/CRLF do Git |
| Tráfego externo autorizado | Não executado; faltam credenciais/ambiente live para provar InfoTravel, Wooba, Evolution e Meta |

## Regra de fechamento

Um item somente será marcado como corrigido quando houver prova positiva e negativa, teste aplicável, leitura após reload/persistência e, para integração externa, evidência de chamada real em ambiente autorizado. Build, teste, merge e deploy permanecem evidências distintas.

## Fechamento da sessão

- Testes focados: 14 passaram em 4 arquivos.
- Lint focado: 0 erros; avisos existentes de `any`/Fast Refresh permanecem.
- Design lint: ratchet aprovado, P0 0, sem regressão da baseline.
- Auditoria de ações: 0 botões falsos, 0 toasts simulados, 0 ações órfãs e 0 `catch` silencioso.
- Integração externa InfoTravel/Wooba/WhatsApp: contratos preparados e isolados, mas credenciais e tráfego de produção não foram exercitados nesta sessão.

## Verificação final pós-onda

| Gate | Resultado | Observação |
|---|---|---|
| TypeScript | PASS — exit 0 | Execução com heap de 8 GB; o grafo ainda é lento e consumiu vários minutos |
| Build | PASS — exit 0 | Client, SSR, Nitro Cloudflare Pages, client-leak, Supabase env injection e worker empacotado |
| Lint global | PASS — exit 0 | 0 erros; 10.373 avisos históricos, predominantemente `any`/Fast Refresh |
| Design lint | PASS — P0 0 | P1/P2/P3 históricos permanecem fora da onda; sem regressão introduzida |
| Auditorias semânticas | PASS | 8.342 controles; P0/P1/P2 0; ações falsas/orphans/toasts simulados 0 |
| Tabelas BFF | PASS | 571 migrations, 789 tabelas, 637 referências, 0 ausentes |
| Provedores externos | NÃO PROVADO | Necessário ambiente autorizado com credenciais reais e leitura de resposta do fornecedor |
