# Auditoria de turismo

Data: 2026-10-30. Estado: levantamento estático interrompido por P0 financeiro; auditoria completa e refatoração ainda não concluídas.

## Escopo e evidência

Pedido: auditar a operação de agência desde aquisição e atendimento até viagem, suporte, recebimentos, comissões e corporativo; estabelecer design limpo com base nas referências anexas.

| Campo | Registro |
|---|---|
| Repositório | Waesy, checkout solicitado pelo usuário |
| Branch | production-candidate |
| HEAD e referência origin/production-candidate observada | 9b001449e3b5fd67ca1f2ec5e6de1c3be3ab54b1 |
| Merge-base com origin/main local | 0128a274ab0aa36b7356513b643a470d49a80291 |
| Estado inicial | Muitos arquivos modificados e não rastreados, inclusive turismo, financeiro, integrações e design; preservados |
| Unidade real auditada | HEAD mais alterações locais; o SHA sozinho não representa o código lido |
| Leituras normativas | AGENTS.md, DESIGN.md, DESIGN-LINT.md, integrity-auditor e template do ledger; cartão W12 do masterplan |
| Histórico consultado | Specs de pipeline unificado, remediação visual, InfoTravel, auditoria turística anterior, inteligência comercial e matriz de integrações de 30/10 |
| Chats anteriores | Recuperação solicitada à ferramenta de chats, sem resposta útil até a interrupção; não foi lido todo o histórico de conversas |
| PR, CI, banco instalado e produção | Não verificados nesta execução |
| Alterações desta auditoria | Apenas este relatório e proposta de spec de correção do Pix; nenhum código operacional alterado |

O diagnóstico diferencia estrutura encontrada, defeito estático confirmado e execução comprovada. Documentos anteriores são contexto, não prova de funcionamento atual. Não foram acessadas credenciais nem emitidas reservas, pagamentos ou mensagens.

## Interrupção financeira

**TUR-001 — P0, confirmado no código:** `src/services/travel-contract.functions.ts:677-689` escolhe a chave por `pix_key || cnpj || phone || "pix@waesy.com"`. Em `:712-713` inclui o BRCode na mensagem de reserva. Sem chave explicitamente configurada, o sistema pode produzir instrução de pagamento para identificador não confirmado como recebedor da agência. Não foi realizado pagamento; não há evidência de perda financeira ocorrida.

Condição: `generatePix=true`, valor positivo e ausência de `settings.pix_key`. A regra atual não bloqueia a geração. CNPJ e telefone também podem não estar registrados como chaves Pix. A proposta de contenção está em `docs/specs/SPEC-20261030-TURISMO-PIX-SEM-FALLBACK.md`.

Aplicação de AGENTS.md B.10.4: investigação interrompida após confirmação direta. Demais achados abaixo são registros já apurados. A decisão humana pendente é priorizar a correção deste checkout antes da continuidade transversal.

## Achados apurados

| ID | Prioridade | Evidência | Diagnóstico e efeito |
|---|---|---|---|
| TUR-002 | P1 | src/routes/workspace.turismo.comissoes.tsx:59-61,137,255-256 | Erro vira lista vazia e vazio carrega INITIAL_DEMO_SHEETS. Vendas demonstrativas aparecem na superfície operacional. |
| TUR-003 | P1 | src/components/tourism/InlineSalesSpreadsheetAndGoalsPanel.tsx:138-192 | Vendas, agentes e configurações vivem no localStorage. Não há persistência central nesse componente; toast pode anunciar sucesso após falha capturada. |
| TUR-004 | P1 | src/services/travel-continuous-flow.functions.ts:491-531 | Assinatura inventa custo de 88%, comissão do agente de 15%, operadora Orinter, agente genérico e Pix recebido. Assinatura não comprova custo nem recebimento. |
| TUR-005 | P1 | src/services/travel-continuous-flow.functions.ts:455-489 | Carnê presume quatro parcelas, operadora e canal; pode usar contract_id como trip_id. Não é prova de boletos emitidos pela operadora. |
| TUR-006 | P1 | src/services/travel-financials.functions.ts:353-448 | Salva cabeçalho, apaga quatro coleções e reinsere sem transação nem checagem de cada erro; retorna sucesso com possível ficha parcial. |
| TUR-007 | P1 | src/services/travel-continuous-flow.functions.ts:164-229 | Cotas dos pagadores não são reconciliadas contra 100% e total do contrato; exclusão e inserção não são atômicas. |
| TUR-008 | P1 | src/services/travel-lifecycle.functions.ts:259 | Contrato é selecionado pelo destino, não por identidade da viagem/proposta. Pode associar contrato de outra viagem ao mesmo destino; alcance de permissões depende de RLS não executada aqui. |
| TUR-009 | P1 | src/services/travel-lifecycle.functions.ts:256-279 | Erros de passageiros, confirmações, vouchers e contrato aparecem como ausência de dados. |
| TUR-010 | P1 | src/services/travel-lifecycle.functions.ts:556-610 | Viagem manual possui inserções auxiliares sem conferir erros; fabrica localizadores LOC/HTL em :574 e :587. |
| TUR-011 | P1 | src/routes/workspace.turismo.index.tsx:57-77,205-249 | Erros viram vazio. Métricas resumem leads/pipeline; viagens confirmadas contam trips.length após consulta status all. Valor em negociação soma todos os leads. Rótulos não correspondem necessariamente aos recortes. |
| TUR-012 | Lacuna | src/routes/workspace.turismo.index.tsx:679-684 | Painel gerencial é sheet comercial; painel de operação com voos, viajantes, documentos e vencimentos ainda não comprovado. |
| TUR-013 | Lacuna | src/routes/workspace.turismo.embarques.tsx:663-671 | Kanban agrupa por estágio; pedido exige colunas por data. Calendário existente não equivale a essa visualização. |
| TUR-014 | Lacuna | src/services/travel-departures.functions.ts:112-123,203-224 | Check-in oferece links por companhia. Execução de check-in, status de voo e monitoramento preventivo não demonstrados. |
| TUR-015 | P1 | src/services/travel-reaccommodation.functions.ts:110-157 | Rebooking confirmado pode ser apenas atualização de status/notas; falta prova de reemissão externa. |
| TUR-016 | P1 | src/services/corporate-travel.functions.ts:628,678-703; supabase/migrations/20270213000001_corporate_travel_os_consolidation.sql:343-355 | BFF consulta corporate_account_id enquanto schema declara company_id. Arquiva políticas antes de criar nova sem transação. Schema instalado não consultado. |
| TUR-017 | P1 | src/routes/workspace.turismo.corporativo.tsx:197,209 | Crédito manual assume validade de 365 dias e texto sugere EMD gerado. Direito, prazo e emissão precisam de documento do fornecedor. |
| TUR-018 | Lacuna | src/services/whatsapp-corporate-travel-tools.server.ts:48,163,190-225 | Busca estática encontrou somente definições das ferramentas corporativas. Outbox não prova entrega, resposta ou reserva visível ao agente. |
| TUR-019 | Lacuna | src/components/turismo/cancellation-penalty-calculator-dialog.tsx:93; src/routes/workspace.turismo.destinos.tsx:25 | Calculadora local encontrada em Destinos; cancelamento transacional da viagem com multa, estorno, crédito e comissão não comprovado. |
| TUR-020 | Lacuna | src/services/travel-visas.functions.ts:25-34,42-145 | CRUD de processos de visto existe; cotação com preço, custo, fornecedor e venda não demonstrada. |
| TUR-021 | P1 / lacuna | src/services/infotravel.ts:1080-1153; src/components/tourism/unified-proposal-workspace.tsx:126 | Seguro possui conector sem caller encontrado; adicional fixo de 24000 centavos não comprova cotação ou apólice. |
| TUR-022 | Lacuna | src/routes/m.excursao.$token.tsx:33-41,76-121,317-322 | Formulário do passageiro mostra poltrona atribuída; seleção pública e pagamento não encontrados nessa rota. |
| TUR-023 | Lacuna | src/services/tourism-operations.functions.ts:101-155 | Reserva de assento possui função própria; callers encontrados só em testes. Jornada pública e concorrência no banco permanecem pendentes. |
| TUR-024 | Lacuna | tools/infotravel-extension/background.js:25-89 | Extensão usa chrome.storage.local e tenta POST localhost:3333/salvar ignorando falha. Isso não prova sincronização persistida com tenant no Waesy. |
| TUR-025 | Design | src/routes/workspace.turismo.index.tsx:263-271,413-426,472,518,683; src/lib/workspace-navigation.ts:241-286 | Título composto, explicações de módulos, truncamento e nomes técnicos persistem. Revisão em browser não executada. |

## Estruturas existentes que devem ser aproveitadas

| Domínio | Estrutura encontrada | O que falta provar |
|---|---|---|
| Conversão | travel-lifecycle.functions.ts:125-220 usa RPC convert_accepted_travel_proposal_staff | Aceite até pagamento, contrato, emissão, comissão e reload |
| Contratos | travel-contract.functions.ts:297-358,413-443 usa RPC staff e assinatura pública | Pagante extraído, validação humana, partes corretas, versão e aditivo |
| Comissão | travel-commission.functions.ts:31-158 e migration 20261006130000_global_travel_commissions.sql:98-149 | Conexão da tela/planilha com regras, apropriação e liquidação canônicas |
| Pagamento | travel-financial.functions.ts:6-48 oferece Pix, cartão, boleto, dinheiro e transferência | Callers TSX não encontrados na busca; split com conciliação e estorno não comprovado |
| Suporte | tourism-incidents.functions.ts:164,195,228,290; migration 20260920000000_tourism_incident_tickets.sql | Tickets/eventos/vínculos existem; permissões, anexos, SLA, portal e recuperação precisam de execução |
| Oportunidades | docs/audits/TRAVEL_COMMERCIAL_INTELLIGENCE_CURRENT_STATE.md | Preservar distinção entre interesse futuro e lead ativo; comprovar matching, consentimento e abordagem |
| Provedores | Wooba, InfoTravel e orquestrador; matriz TRAVEL_INTEGRATION_COVERAGE_MATRIX_20261030.md | Contrato comercial, endpoints homologados, credenciais, timeout, preço revalidado e IDs reais |
| Mineração | Admin Master > Integrações > InfoTravel; tools/infotravel-extension e tools/infotravel-miner | Importação tenant-aware, deduplicação, revisão, proveniência, atualização e retorno de falha |
| Aquisição | crm.functions.ts:485-510 reconhece UTM, Meta e gclid | Evento real até lead, atribuição, consentimento, dedupe Pixel/CAPI e retorno de venda |

## Cobertura integral do pedido para continuidade

Esta matriz é o escopo de auditoria e critérios propostos; não uma lista de funcionalidades entregues.

| Frente | Fluxo a provar | Resultado esperado |
|---|---|---|
| Painel | Identidade/cargo/equipe → consultas → pendência → ação → atualização | Gestor vê operação global; agente vê sua carteira. Voos hoje, embarques, viajantes em viagem, retorno, documentos, assinaturas, pagamentos, inadimplência, prazos de emissão, suporte e projeções com filtros e fonte dos totais |
| Atendimento | Anúncio/WhatsApp/site/balcão → lead → responsável → atividades | Tags, estágio, cliente existente, vínculo/troca de agente, comentários internos, agenda, reuniões, formulários, consentimento e documentos indexados; histórico preservado |
| Perfil do viajante | Cliente/pagante/passageiro → preferências/documentos → acesso autorizado | Separar identidades e vínculos. Necessidades de acessibilidade/alimentação/saúde apenas quando necessárias, com consentimento e acesso restrito |
| Cotação | Solicitação → fornecedor → preço/custo válido → proposta versionada → aceite | Aéreo, hotel, traslado, ingresso, passeio, seguro, visto e terrestre; múltiplos quartos, idades, datas e alternativas; mudança de preço exige reconfirmação |
| Reserva | Aceite → hold → prazo → pagamento → contrato → emissão | Estados distintos para cotado, reservado e emitido, IDs reais, retry idempotente e recuperação de falha parcial |
| Documentos | Upload de confirmação/recibo/contrato → extração → revisão de divergência → aplicação | Arquivo original, hash, origem, campos/confiança, pagante identificado e confirmado; nenhuma IA altera preço/partes silenciosamente |
| Pagamentos | Venda → pagadores → meios/parcelas → comprovantes → conciliação | Dinheiro, Pix, cartão, boleto e transferência, pagamento misto, favorecido agência/operadora, vencimentos, carnê e boletos externos; juros/taxas e estorno explícitos |
| Contrato | Dados confirmados → partes → assinatura → aditivo | Pagante e viajantes conforme capacidade e representação aplicáveis; troca de pagamento após assinatura preserva original e registra nova versão/aceite |
| Comissão | Regra versionada → venda/custo → receita → agente → competência → aprovação → pagamento | Separar venda bruta, NET, taxas, over, comissão da agência, retenção, repasse e remuneração do agente; projeção não é recebido; vínculo real com RH/folha |
| Vendas | Ficha central → lista/planilha → filtros → exportação | Vendedor/agente, operadora, produto, período, custo, margem, recebimento e comissão; edição com permissão, motivo e trilha de auditoria |
| Viagem | Reserva → detalhe → passageiros/aéreo/hotel/serviços/documentos/pagamentos | Adições e alterações recalculam diferença de preço, custo, pagamento, contrato e comissão; suporte e timeline vinculados |
| Pós-venda | Reserva confirmada → pendências → contrato/documentos → viagem pronta | Fila por responsável, prazos e alertas; não confundir onboarding comercial com acompanhamento pós-venda |
| Embarques | Mês → colunas por dia → trechos → checklist → ação | Janela contínua e virtualizada, fuso do aeroporto, ida/conexão/volta, horários, documentos, check-in e responsável; mobile mantém leitura tátil |
| Voos | Provider → mudança/status → caso → opções → aceite → reemissão | Link oficial, status e check-in são capacidades diferentes; registrar origem e atualização; integração depende da companhia/consolidadora |
| Suporte | Ticket/ID → viagem/passageiro → eventos/anexos → resolução | Prioridade, responsável, SLA, comentários internos separados de mensagens públicas, hash/proveniência e acesso por papel |
| Cancelamento | Regra contratada → simulação → decisão → fornecedor → estorno/crédito/multa | Cancelamento parcial/total, no-show, comissão estornada e débitos; crédito permanece direito no fornecedor e não saldo sacável fictício |
| Corporativo | Empresa/política → solicitação → aprovação → compra → suporte | Centro de custo/projeto, aprovadores, limites e exceções, política visível, reservado versus emitido, créditos, logística e viajantes em risco |
| WhatsApp corporativo | Mensagem → identidade → solicitação → política → aprovação → reserva | Mesmo ID/caso visível no workspace; outbox, webhook e entrega correlacionados; handoff humano e dedupe |
| Publicação | Pacote/roteiro → rascunho → revisão → publicação → vitrine → pedido | CMS bilateral, disponibilidade/preço reais, roteiro diário, inclusão/exclusão, documentos e validade; reload e link público verificados |
| Grupos | Saída → ônibus/mapa → inscrição → hold assento → pagamento → confirmação | Escolha pública de poltrona, expiração de hold, concorrência, quartos, ponto de embarque, lista, caixa e cancelamento |
| Seguro/visto | Pedido → dados mínimos → cotação → aceite → emissão/processo | Custo, fornecedor, comissão, documento, prazo e acompanhamento; seguro cotado separado de adicional editorial |
| IA | Contexto autorizado → extração/análise → revisão → aplicação auditada | Provider real, quota/custo, cancelamento/retry, confiança/proveniência; emissão, multa e pagamento exigem dados e regras determinísticos |

## Direção visual derivada das imagens

As imagens anexas são referências visuais, não contratos funcionais dos fornecedores. Foram observadas as composições fornecidas no pedido, incluindo Uber, PassHub/Passabot, VOLL, checkout, planejamento e kanban.

| Referência | Aplicação proposta | Limite |
|---|---|---|
| PassHub, imagens 10-16 e 20-22 | Navegação compacta, valores legíveis, filtros curtos, linhas de oferta com comissão interna | Não copiar saldos/valores promocionais como fatos, nem expor NET/comissão no portal do cliente |
| Uber, imagens 1-4 | Ação principal clara, seleção simples, sheets e detalhes por hierarquia | Ilustrações e marketing não substituem dados operacionais |
| VOLL, imagens 17 e 28 | Recortes corporativos, viajantes e contexto geográfico com origem dos dados | Mapa só aparece com dados úteis e permissão |
| Kanban, imagem 29 | Colunas claras e detalhe lateral com atividades, comentários e documentos | Cards sem explicações de módulo; separar nota interna de mensagem ao cliente |
| Planejador e viagem, imagens 19,23,24,27 | Viagem como centro de itinerário, serviços, documentos e ações | Sem abas opcionais vazias nem controles que prometem fluxos inexistentes |

Nomes propostos: Painel, Atendimento, Cotações, Viagens, Embarques, Suporte, Vendas, Comissões, Empresas, Grupos, Clientes e Catálogo. Agrupamento e permissão devem reduzir o menu conforme papel; não exibir tudo a todos.

Desktop: navegação lateral, lista/kanban e detalhe lateral, densidade de trabalho. Mobile: uma única casca renderizada, alvos de 44px, safe-area, ações acessíveis e abas horizontais. Medium precisa de decisão explícita de casca. Tokens canônicos, foco e contraste medidos, skeletons isomórficos, dados/vazio/erro distintos. Retirar títulos compostos e textos que descrevem a própria tela; manter apenas orientação necessária para decisão, erro ou condição comercial.

## Verificações executadas

| Verificação | Resultado | Limite |
|---|---|---|
| vitest: travel-pre-boarding-and-commissions, travel-proposal-conversion-flow, travel-continuous-flow, corporate-travel-os, travel-pipeline-e2e | 5 arquivos e 35 testes passaram; exit 0 | Código local alterado, sem banco/browser/provider real |
| travel-pipeline-e2e.test.ts | Leitura encontrou TravelPipelineContractHarness em memória | Nome E2E não prova jornada real |
| travel-continuous-flow.test.ts:37-77 | Casos de cotas e assinatura calculam arrays/booleanos locais | Não reproduzem os defeitos dos BFFs encontrados |
| Regressão do P0 Pix | Não executada; spec proposta | Nenhuma correção implementada |
| Typecheck/build/design lint | Não executados nesta auditoria interrompida | Nenhum selo de módulo fechado ou conformidade visual |
| Browser/reload/RLS/providers/CI/deploy | Não executados | Sem alegação de funcionamento ou publicação |

## Sequência proposta após decisão humana

| Ordem | Fatia | Prova necessária |
|---|---|---|
| 1 | Checkout sem chave Pix presumida | Regressão falha na baseline; ausência não gera BRCode; chave configurada preserva valor e agência |
| 2 | Integridade financeira e contrato | Remover dados demonstrativos e percentuais inventados; vínculos por ID; transação, rollback, retry e isolamento |
| 3 | Modelo canônico de vendas/comissão | Planilha central, regra versionada, recebimentos reais, lista por agente e ligação RH |
| 4 | Jornada comercial completa | Lead → proposta → aceite → reserva → pagamento → contrato → emissão com IDs persistidos e reload |
| 5 | Viagem, pós-venda e embarques | Alterações, documentos, suporte, kanban diário e monitoramento comprovado |
| 6 | Corporativo e canais | Política, aprovação, WhatsApp, créditos e contingência em um caso rastreável |
| 7 | Catálogo, grupos e integrações | Publicação bilateral, assento concorrente, checkout e provedores homologados |
| 8 | Refatoração visual por superfície | Evidência antes/depois em mobile/desktop, dados reais, foco/contraste e ratchet sem atualizar baseline |

Cada fatia exige preflight próprio, spec atômica, reprodução anterior, teste positivo/negativo, falha parcial, persistência, reload e revisão adversarial. Não iniciar uma reescrita transversal.

## Fontes externas de viabilidade

Pesquisa do auditor de integrações: [Wooba Developer](https://www.wooba.tur.br/developer) e [cadastro de parceiros](https://developer.wooba.travel/register/) indicam acesso comercial às integrações; não homologam os endpoints escritos no Waesy. [Asaas](https://docs.asaas.com/docs/visao-geral) e [webhooks de cobranças](https://docs.asaas.com/docs/webhook-para-cobrancas) documentam recursos de pagamento; não provam conciliação turística implementada. Documentação oficial pública que confirme o endpoint InfoTravel de seguro não foi localizada.

## Handoff

Data: 2026-10-30. Identificador: AUD-TUR-20261030.
Contexto: auditoria de turismo com trabalho anterior preservado.
Decisão adotada: interromper ao confirmar fallback financeiro crítico, conforme B.10.4.
Fundamentação: identidade do recebedor não pode ser presumida em instrução Pix.
Consequências: nenhum código alterado; continuidade depende da decisão sobre a correção prioritária.
Estado: achados estáticos abertos; auditoria completa e redesign pendentes.
