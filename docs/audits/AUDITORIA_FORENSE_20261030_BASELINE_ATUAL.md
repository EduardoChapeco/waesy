# Auditoria Forense Global — Baseline Atual

**Data:** 2026-10-30  
**Branch:** `production-candidate`  
**SHA auditado:** `9b001449e3b5fd67ca1f2ec5e6de1c3be3ab54b1`  
**Base comparativa:** `0128a274ab0aa36b7356513b643a470d49a80291` (`origin/main`)  
**Modo:** somente leitura; nenhum código de produto, migration remota, policy remota, merge, deploy ou push foi executado.

## 1. Decisão Executiva

O repositório evoluiu em cobertura estrutural, mas ainda não pode ser considerado completo, pronto para produção ou seguro de ponta a ponta. O scanner de botões encontrou zero no-op sintático e os contratos locais de BFF, ciclos, tipos e segredos passaram; isso não prova que as ações tenham continuidade, persistência, segurança ou reload verificável.

Os principais gaps atuais são: dados sintéticos entrando em caminhos de produção; pelo menos uma ação de download que exibe sucesso sem gerar arquivo; um chunk acima do orçamento; imports de serviços legados sem decisão canônica; inventários de rotas divergentes; e riscos P0/P1 de RLS, grants, funções `SECURITY DEFINER`, criptografia e drift remoto confirmados pelo conselho de segurança.

**Conclusão:** a implementação anterior trouxe avanços reais de infraestrutura e saneamento, mas a completude alegada não está provada. A próxima onda deve ser de fechamento de evidências e correção de P0/P1, não de remoção ampla de funcionalidades.

## 2. Escopo e Estado do Workspace

| Item | Evidência | Estado |
|---|---|---|
| Branch local | `production-candidate` | Confirmado |
| SHA auditado | `9b001449e3b5fd67ca1f2ec5e6de1c3be3ab54b1` | Confirmado |
| Relação com `origin/main` | 5 commits à frente, 0 atrás | Confirmado |
| Pull requests abertos | 0 no GitHub em 2026-10-30 | Confirmado |
| Worktree | 56 caminhos modificados/não rastreados no preflight | Confirmado |
| Migration/BFF local | 565 migrations; 636 referências BFF; 0 tabelas sem declaração local | Confirmado localmente |
| Banco remoto | Sem replay JWT adversarial, pgTAP ou readback desta sessão | Não verificado |
| Produção/deploy | Sem prova nova nesta sessão | Não verificado |

As alterações preexistentes foram preservadas. Os relatórios gerados pelos scanners também foram preservados como artefatos de auditoria, mas não são tratados como prova de runtime.

## 3. Matriz de Evidências Executadas

| Verificação | Resultado | Interpretação correta |
|---|---:|---|
| `npm run audit:buttons:test` | 19/19 | O classificador cobre casos sintáticos; não prova backend, persistência ou jornada. |
| `button-ast-audit.json` | 8.267 controles; 0 issues sintáticos | Não há no-op sintático detectado pelo scanner atual. |
| `deep-action-audit.mjs` | 671 funções server-side sem chamada frontend detectada | Heurística; exige classificação por import, rota, RPC, job e API antes de remover. |
| `deep-forensic-route-audit.mjs` | 461 rotas, 966 componentes; 57 imports de services legados | Gap arquitetural confirmado; legado não é sinônimo de código morto. |
| `npm run check:bff` | PASS local; 636 referências, 0 ausentes | Contrato físico local presente; schema remoto/grants não provados. |
| `npm run check:cycles` | PASS; 0 ciclos de aplicação | Saúde estrutural de dependências. |
| `npm run check:deadcode` | PASS; 0 órfãos exatos; 23 colisões de nomes | Não elimina duplicação semântica ou templates concorrentes. |
| `npm run check:types-ssot` | PASS | Não elimina DTO divergente em runtime. |
| `npm run check:route-budget` | FAIL | `workspace.builder._documentId.editor-ByT5C7H3.js`: 411,5 kB cru / 85,6 kB gzip; o guard conta o limite cru de 400 kB como falha. |
| `npm run check:schema` | PASS local; 775 tabelas, 243 funções | Diverge do parser BFF que reporta 788; fonte de verdade dos inventários precisa ser unificada. |
| `npm run audit:dependencies` | PASS com 1 advisory HIGH allowlisted | Não equivale a risco zero; mitigação do Zod precisa ser provada nos limites BFF. |
| `npm run audit:secrets` | PASS; fixture allowlisted | Não prova rotação nem ausência de segredo versionado em SQL/migrations. |
| `npm run audit:all` | 31 checks conformes; 12 abertos | Há débito amplo em cores, gradientes, sombras, mocks, `any`, temporizadores e outros sinais. |
| Fallback sweep | 495 candidatos | Inclui testes e falsos positivos; os candidatos de produção abaixo exigem triagem. |
| Mock image sweep | 16 candidatos | Inclui validação/ingestão legítima; não autoriza remoção em massa. |
| Image URL input sweep | 1 candidato | É `URL inicial` de pesquisa web, não input de imagem; falso positivo documentado. |

## 4. Achados Confirmados

### ACT-P1-001 — Download HD promete sucesso sem gerar arquivo

| Campo | Evidência |
|---|---|
| Arquivo | `src/components/workspace/social-studio-modal.tsx:170-178` |
| Condição | O botão `Baixar Imagem HD` executa somente `toast.success(...)`. |
| Causa-raiz | O componente possui preview e texto de legenda, mas não possui exportação de canvas, blob, download, BFF ou persistência. |
| Impacto | A interface afirma uma operação concluída que não ocorreu. É uma ação falsa, mesmo com `onClick` presente. |
| Correção | Implementar exportação real determinística do frame visível, com estado loading/erro/sucesso baseado no resultado; ou rotular explicitamente como preview sem CTA transacional. |

### ACT-P1-002 — Artigos sintéticos aparecem quando a consulta real está vazia

| Campo | Evidência |
|---|---|
| Arquivo | `src/components/news/waesy-news-portal.tsx:66-164` |
| Condição | `dbNormalized.length === 0` seleciona `OFFLINE_TEST_FALLBACK_ARTICLES`, com artigos e métricas de redação fictícios. |
| Causa-raiz | Fallback de teste foi colocado dentro do caminho de renderização do portal público. |
| Impacto | Ausência de dados é mascarada como conteúdo publicado; cidade, breaking, likes e comentários podem parecer reais. |
| Correção | Remover o fallback do caminho de produção; renderizar empty state honesto, ou buscar somente dados persistidos via loader/BFF. Testes devem fornecer fixtures no teste, não no componente. |

### ACT-P1-003 — Produtos/preços de subpainel têm fallback sintético no fluxo operacional

| Campo | Evidência |
|---|---|
| Arquivo | `src/routes/portal.subpainel.$token.tsx:74-150` |
| Condição | Quando `dbProducts` está vazio, o carrinho usa `DEFAULT_QUICK_PRODUCTS`, contendo bebidas, comida, merchandise e ingressos com preços. |
| Causa-raiz | O catálogo operacional não diferencia “sem produtos cadastrados” de “erro de carregamento”. |
| Impacto | A tela pode vender ou calcular valores de itens que não existem no catálogo oficial. Isso contradiz a blindagem server-side de preços. |
| Correção | Separar vazio de erro; bloquear adição quando não há catálogo real; o BFF deve resolver produto e preço por ID no banco e rejeitar preço enviado pelo cliente. Testar `dbProducts=[]`, falha de loader e readback do pedido. |

### ACT-P1-004 — Espaço de comunidade usa threads, sessões e produtos fictícios por padrão

| Campo | Evidência |
|---|---|
| Arquivo | `src/components/community/CommunitySpacesView.tsx:91-150` |
| Condição | Props ausentes recebem `DEFAULT_THREADS`, `DEFAULT_SESSIONS` e `DEFAULT_PRODUCTS`, com autores, contagens, evento e preço. |
| Causa-raiz | Componente reutilizável foi desenhado com dados de showcase no contrato padrão. |
| Impacto | Comunidade sem dados aparece populada; abas e CTAs podem induzir a ações sobre entidades inexistentes. |
| Correção | Props devem ser obrigatórias ou receber arrays vazios; mostrar empty states e esconder abas de coleções vazias. Fixtures de showcase devem ficar em story/test. |

### ACT-P1-005 — Orçamento de bundle de rota excedido pelo tamanho cru

| Campo | Evidência |
|---|---|
| Arquivo | `dist/assets/workspace.builder._documentId.editor-ByT5C7H3.js` |
| Condição | 421.386 bytes, acima de 400 KiB; gzip 85,6 KiB permanece abaixo de 95 KiB. O script falha por `maxRaw || maxGzip`. |
| Causa-raiz | O guard aplica limite cru e gzip, mas a saída enfatiza o limite gzip; a rota do builder concentra dependências pesadas. |
| Impacto | Gate de performance falha; o carregamento do editor fica mais caro. |
| Correção | Primeiro medir composição do chunk e separar editor/exportadores pesados por lazy boundary. Depois manter o guard coerente com a política documentada e atualizar evidência. |

### SEC-P0-001 — Policy pública de signatários não vincula o token ao registro

| Campo | Evidência |
|---|---|
| Arquivo | `supabase/migrations/20270210000000_travel_ecosystem_wave1_continuous_flow.sql:112` |
| Condição | `travel_contract_signers` possui `SELECT USING (true)` e `UPDATE` público para registro pendente com `WITH CHECK (true)`. |
| Causa-raiz | A policy não limita o registro por token/identidade nem força o fluxo BFF. |
| Impacto | Enumeração de signatários, PII e alteração indevida de assinatura. |
| Próxima prova | Teste `anon` com token inválido e UUID de terceiro; revisar grants e policy efetiva. Não aplicar correção remota nesta auditoria. |

### SEC-P1-002 a SEC-P1-012 — Família de riscos de segurança

O conselho de segurança confirmou, no SQL/banco consultado ou no código local, os seguintes candidatos/achados: `SEC-P1-02` RPC `SECURITY DEFINER` sem `search_path` e execução pública; `SEC-P1-03` sequência de nota fiscal sem tenant e com `MAX()+1`; `SEC-P1-04` `getReceiptDetails` sem identidade usando client service-role; `SEC-P1-05` liquidação PIX sem validação suficiente de provider/valor; `SEC-P1-06` fallback de chaves criptográficas previsíveis; `SEC-P1-07` segredo HMAC/PIN versionado em migration; `SEC-P1-08` drift de `store_cashback_ledger`; `SEC-P1-09` logs/telemetria com insert público; `SEC-P1-10` respostas de pesquisa com identidade controlada pelo cliente; `SEC-P2-11` grants amplos em tabelas financeiras; `SEC-P1-12` aceitação de formatos de ticket sem contexto criptográfico obrigatório.

Esses achados não devem ser “corrigidos” por apagar tabelas, desabilitar features ou trocar RLS por mensagens. Cada um precisa de spec, teste adversarial com roles reais, migration/revisão de grants e readback.

### UI-P0-001 a UI-P0-003 — Fluxos financeiros locais sem mutation

| ID | Evidência | Causa-raiz | Impacto |
|---|---|---|---|
| UI-P0-001 | `src/components/finance/LoanSimulationSheet.tsx:138` e `src/routes/_store.conta.financas.tsx:1136` | A simulação chama callback opcional e a rota apenas exibe toast/abre drawer. | “Proposta gerada” não cria proposta financeira persistida. |
| UI-P0-002 | `src/components/finance/InstallmentTimelineDrawer.tsx:66` e `src/routes/_store.conta.financas.tsx:1143` | “Antecipação gerada” aparece antes de qualquer callback/mutation. | Ação financeira enganosa e risco de divergência bancária. |
| UI-P0-003 | `src/components/finance/LoanSimulationSheet.tsx:56` e `src/routes/_store.conta.financas.tsx:1333` | Juros, CET, IOF e QR Pix possuem defaults sem origem oficial fornecida pela rota. | Valores financeiros podem ser exibidos/calculados sem autoridade server-side. |

Correção obrigatória: contrato Zod, Server Function, idempotência, cálculo server-side, estado de processamento/erro e readback. Não substituir por outro toast.

### UI-P1-004 a UI-P1-010 — Ações, uploads e dados comerciais incompletos

| ID | Evidência | Problema |
|---|---|---|
| UI-P1-004 | `src/components/finance/PixHubDrawer.tsx:279`, consumidor em `_store.conta.financas.tsx:1115` | “Gerenciar chaves”, “Meus limites” e “Agendar” terminam em `toast.info` ou callback sem fluxo final. |
| UI-P1-005 | `src/components/finance/CardSettingsDrawer.tsx:247` | Cartão virtual/segunda via são toasts; switches alteram apenas estado local. |
| UI-P1-006 | `src/components/finance/CreditCardInvoiceView.tsx:224` | “Meus cartões” e “Investir em CDB” são toasts; pagamento real convive com fallback enganoso. |
| UI-P1-007 | `src/components/ui/media-uploader.tsx:293` | Falha do BFF faz fallback para upload client-side e URL pública. |
| UI-P1-008 | `src/components/classifieds/digital-file-dropzone.tsx:54` | Arquivo digital é enviado diretamente para bucket público sem autorização central. |
| UI-P1-009 | `src/components/ui/image-upload.tsx:65` | URL externa é aceita como `rawUrl` e recebe sucesso sem `ingestExternalMediaUrl`. |
| UI-P1-010 | `src/routes/admin-master.mining.tsx:1140` | Artigo sem mídia recebe `getFallbackThematicImage`, contrariando mídia honesta. |
| UI-P1-011 | `src/components/classifieds/event-classified-showcase-view.tsx:1553` | Rating ausente vira `5` estrelas. |

Esses itens devem ser corrigidos por família, preservando a promessa funcional: conectar ao BFF e ao Storage protegido quando a operação for real; quando não houver entidade/dado, exibir empty state neutro e não simular sucesso.

### UI-P1-012 — Bifurcação mobile/desktop duplicada

`src/components/classifieds/editorial-showcase-view.tsx:693` mantém árvores mobile e desktop simultâneas com `md:hidden`/`hidden lg:block`. Isso viola a bifurcação estrutural exigida pelo contrato do projeto e aumenta risco de divergência, CLS e interações residuais. A correção deve renderizar uma única casca por classe de viewport, com teste DOM em viewport compacta e expandida.

### UI-P2-013 a UI-P2-015 — Descoberta e densidade

| ID | Evidência | Impacto |
|---|---|---|
| UI-P2-013 | `/workspace/viabilidade`, `/workspace/copilot`, `/workspace/afiliados/conciliacao` sem link direto | Rotas existentes ficam invisíveis para a navegação principal; precisa de decisão de exposição, busca ou deep-link autorizado. |
| UI-P2-014 | `scripts/check-route-size.mjs`: 663 monólitos, 116 críticos; checkout 3.011 linhas e novo classificado 11.764 | Aumenta risco de regressão e dificulta prova de completude. |
| UI-P2-015 | `src/components/workspace/workspace-all-tools-dialog.tsx:601` | Texto operacional conversacional dentro do modal reduz densidade e mistura instrução com ação. |

### ARCH-P0-001 — Modelos concorrentes de estoque

`src/services/canonical-stock-ledger.functions.ts:52,96-115` trabalha com `stock/reserved_stock`, enquanto migrations posteriores ainda referenciam `stock_on_hand/stock_reserved` e `supabase/migrations/20260725170000_cleanup_dead_reservations.sql:17` remove uma coluna usada por outro modelo. O problema é sistêmico: a sequência de migrations pode falhar ou produzir estoque divergente. Antes de alterar qualquer tabela, é necessário escolher um modelo canônico, consolidar RPC/BFF, replayar migrations em banco limpo e testar concorrência/idempotência.

### ARCH-P1-002 a ARCH-P1-006 — Integrações e fluxos canônicos incompletos

| ID | Evidência | Causa-raiz/impacto |
|---|---|---|
| ARCH-P1-002 | `src/lib/routes.ts:1`, `src/lib/workspace-navigation.ts:31,241-244,441`, `src/routes/workspace.b2b.index.tsx:1` | Registry, arquivos físicos e navegação divergem; 9 rotas fora do registry formal e 3 sem mapeamento de navegação. |
| ARCH-P1-003 | `scripts/check-route-size.mjs:37-46`; rotas de classificados e hotéis | 663 monólitos, 116 críticos; dificulta contratos, testes e evolução. |
| ARCH-P1-004 | `src/services/tourism.functions.ts:681-745`, `travel-proposal.functions.ts:640-747`, `travel-lifecycle.functions.ts:1166-1200` | `travel_quotes`, `travel_proposals` e `quotes` recebem escritas espelhadas; falhas são tratadas como aviso. Risco de propostas divergentes. |
| ARCH-P1-005 | `src/services/proposals.ts:146-181`, `src/components/tourism/proposals/ProposalStudio.tsx:3,34` | Histórico usa IDs sintéticos e helper “AI” retorna listas determinísticas. Usuário pode acreditar em histórico/inteligência inexistentes. |
| ARCH-P1-006 | `src/services/travel-wooba-connector.service.ts:219-223,285-293,397,608-624,711-718`; `travel-supply-orchestrator.service.ts:314-333` | Payload incompleto recebe defaults comerciais; saga de reserva termina bloqueada e não executa hold/confirm/cancel real. |

### ARCH-P1-007 a ARCH-P2-009 — Oferta pública, catálogo e estado de erro

| ID | Evidência | Impacto |
|---|---|---|
| ARCH-P1-007 | `src/services/infotravel.ts:1491-1599` | Frota e preços determinísticos entram quando o provedor falha; disponibilidade parece comercial sem confirmação. |
| ARCH-P1-008 | `src/services/supermarket.functions.ts:141-189,209-268,318-380` | Janelas, clube, tier e estoque têm defaults; `inStock` pode ser forçado para `true`. |
| ARCH-P2-009 | `src/services/supermarket.functions.ts:318-380`; rotas `_store.mercado` e `_store.departamento` | `getSupermarketProducts` não tem consumidor interno detectado, enquanto as rotas usam outro caminho de catálogo. Exige decisão antes de remover. |
| ARCH-P2-010 | `src/services/travel-lifecycle.functions.ts:1473-1484` | Token inválido/lookup ausente pode retornar estado genérico antes da validação final. Estados de erro podem parecer sucesso. |

## 5. Achados Parciais e Hipóteses que Exigem Prova

| ID | Evidência | Classificação atual | Próxima ação |
|---|---|---|---|
| ARCH-001 | 57 imports de services não-`.functions.ts` | Gap arquitetural; não prova código morto | Mapear cada import para BFF canônico, job, RPC ou integração; só remover após cobertura equivalente. |
| ARCH-002 | 671 Server Functions sem chamada frontend detectada | Heurística | Classificar por route loader, action, cron, webhook, MCP, job e testes. Gerar allowlist explicada antes de qualquer exclusão. |
| INV-001 | Inventário reporta 461 rotas; `.audit/ROUTES.json` reporta 440 | Inconsistência de inventário confirmada | Unificar o enumerador e registrar a fonte canônica. |
| DATA-001 | `CarRentalOfferCard` exporta defaults B2C/B2B | Possível fixture/contrato legado | Confirmar todos os imports; se entrar em produção, substituir por empty state ou consulta real. |
| DATA-002 | `new-group-tour-sheet` inicia capacidade em 46 lugares | Default de formulário | Manter apenas se for valor explícito editável e não uma capacidade persistida automática; validar no BFF. |
| ARCH-003 | `src/components/tourism/CarRentalOfferCard.tsx:62-149` exporta ofertas default B2C/B2B | Possível fixture/contrato legado | Confirmar consumidores e garantir que nenhuma oferta/preço default chegue a usuário final. |
| ARCH-004 | `dead-code.report.json` lista 72 allowlisted e 0 desconhecidos; `getSupermarketProducts` sem consumidor interno | Código morto não confirmado | Revisar consumidores externos e manter shims até prova de substituição. |
| SEC-UNV-001 | RLS remota e JWT adversarial não foram reproduzidos nesta sessão | Não verificado | Obter sessão autorizada de auditoria e executar matriz anon/authenticated/service_role. |
| UI-UNV-001 | Rotas críticas e mobile/desktop não foram exercitadas no browser nesta sessão | Não verificado | Executar jornadas reais com rede, console, reload e prova de persistência. |

## 6. Causa Sistêmica

1. **Contrato de intenção incompleto:** presença de handler foi usada como proxy de funcionalidade. O sistema precisa provar intenção, destino, mutação, feedback e reload.
2. **Fixtures no runtime:** dados de showcase, teste e fallback foram colocados em defaults de componentes/rotas, mascarando vazio, erro e drift.
3. **Governança de serviços fragmentada:** `.functions.ts`, services legados, RPCs, webhooks e jobs não têm um mapa único de ownership.
4. **Auditoria local desacoplada do remoto:** migrations e scanners passam localmente, mas grants, policies efetivas, schema aplicado e secrets de produção não foram revalidados.
5. **Gates com fontes divergentes:** contagens de rotas/tabelas e critérios de orçamento não são apresentados por uma única fonte canônica.

## 7. Plano de Correção em Microfases

| Fase | Escopo | Evidência de saída | Dependência |
|---|---|---|---|
| W0 | Congelar baseline, inventário, dirty worktree e ledger | SHA, paths preservados, relatório atual | Concluída nesta auditoria |
| W1 | Fechar P0 de signatários e matriz de grants/policies | Testes anon/authenticated/service_role + readback | Acesso autorizado ao banco |
| W2 | Blindar secrets, HMAC, ticket e PIX | Fail-closed, rotação, replay negativo e logs | W1 |
| W3 | Remover dados sintéticos de notícias, comunidade e subpainel | Empty/error honestos, fixtures só em testes | Spec de ação/dados |
| W4 | Corrigir Social Studio e demais toasts de sucesso | Arquivo baixado verificável ou CTA rotulado preview | W3 |
| W5 | Mapear 57 services legados e 671 funções heurísticas | Grafo de chamadas e decisão por módulo | W1-W4 |
| W6 | Unificar inventário de rotas, tabelas e budgets | Um enumerador, relatório estável e gate reproduzível | W5 |
| W7 | Reduzir chunk do Builder | Build e budget pass | W6 |
| W8 | Jornadas críticas browser/E2E | marketplace, classificados, eventos, checkout, conta, workspace/admin | W1-W7 |
| W9 | Revisão design bidirecional e acessibilidade | mobile native/desktop system, estados e foco | W8 |
| W10 | Release candidate | typecheck, lint, design, build, CI, deploy e readback separados | Todas as anteriores |

## 8. Critério de Completude

Não declarar “corrigido” por scanner isolado. Cada item precisa de: reprodução negativa na baseline; correção; teste positivo e negativo; cadeia UI→rota→identidade→BFF→Zod→schema/RLS→persistência→reload; prova de console/rede; e, para produção, CI/deploy/readback independentes.

## 9. Fora do Escopo desta Sessão

Nenhuma remoção de código legado, alteração de UI, criação de BFF, alteração de RLS, aplicação de migration, commit, push, merge, build de release ou deploy foi realizada. A auditoria encontrou o que deve ser corrigido e preservou o sistema para a próxima microfase controlada.
