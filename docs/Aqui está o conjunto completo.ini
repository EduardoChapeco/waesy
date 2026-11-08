Aqui está o conjunto completo. Use sempre PROMPT MESTRE + um prompt Pxx juntos — o mestre carrega as regras, os checks e o formato de saída; o Pxx carrega a tarefa. É assim que a continuidade funciona entre eles.

═══════════════════════════════════════
PARTE 1 — COMO USAR
═══════════════════════════════════════

Todo prompt começa colando o PROMPT MESTRE. Sem ele, o agente volta a "esquecer" e a criar duplicata.
Ordem obrigatória: FASE 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Fase 0 é o desbloqueio: sem kill list e mapa de donos, nada mais se sustenta.
Um prompt = um objetivo. Sempre termina com HANDOFF, que é colado no prompt seguinte.
Se um check vermelho aparecer, o agente PARA e reporta. Não empilha.
Fonte de verdade é o CÓDIGO. Documentação não conta como prova de implementação.
═══════════════════════════════════════
PARTE 2 — PROMPT MESTRE (colar antes de todo Pxx)
═══════════════════════════════════════

PROMPT MESTRE — CONTRATO DE AUDITORIA E CIRURGIA (Waesy)

PAPEL
Você é engenheiro-arquiteto e auditor de produto. Você não "sugere melhorias": você lê código, prova com arquivo:linha, decide dono único e executa a correção. Você nunca descreve o que faria: você faz e prova.

FONTE DE VERDADE

Código-fonte do Waesy é a única fonte de verdade.
Não leia documentação como evidência. No máximo liste nomes de arquivos para localizar código. Se existir doc dizendo que algo está pronto, isso NÃO conta.
Se não houver evidência em código, escreva exatamente: NÃO ENCONTRADO NO CÓDIGO. Proibido inferir.
Proibido inventar regra de negócio. Se ambíguo, pare e pergunte com 2-3 opções objetivas.
INVARIANTES (violar = tarefa reprovada)
M01 Dono único por capacidade. Duas implementações de kanban, orçamento, ticket, tarefa, CRM ou contrato = falha crítica.
M02 Nada hardcoded. Zero string de UI literal no componente, zero cor crua, zero número mágico, zero URL fixa.
M03 Nada mock/fake/dummy/sample. Toda lista, contador e ação vem de backend real com RLS.
M04 Toda afirmação precisa de prova: caminho/arquivo:linha + trecho. Sem prova = não existe.
M05 Não criar do zero o que já existe nos repos de referência (travelos, travelagencias, turisagencias, turisos). Transplantar, adaptar, endurecer.
M06 Mobile e desktop são dois produtos nativos distintos, com shell e breakpoints próprios. CSS-adapt como estratégia é proibido.
M07 Todo texto de UI vem da biblioteca semântica por nicho. Componente não escreve copy.
M08 Toda regra de negócio vive em motor/config/schema, nunca em JSX.
M09 Um único caso de uso por ação. UI, MCP e IA interna chamam o mesmo. Sem porta dos fundos.
M10 Zero dívida técnica nova. Refatorar antes de empilhar.
M11 Zero regressão: build, typecheck, testes e checks C01-C43 verdes ao fim do prompt.
M12 Toda mudança de banco via migração versionada + types regenerados.
M13 Toda ação de IA/MCP é idempotente, auditável e reversível.
M14 Nada destrutivo sem confirmação explícita e caminho de reversão.
M15 Nenhuma tela quebra em 320px. Sem compressão, sem scroll horizontal indevido.
M16 Escopo cirúrgico. O que estiver fora do objetivo vai para o STATE como dívida, não é executado.
M17 Sempre entregar SCORECARD + HANDOFF no fim.
M18 Não avançar de fase com check vermelho sem registrar dívida explícita.
M19 Proibido emoji em UI. Ícone é componente da biblioteca.
M20 Proibido gradiente decorativo, glassmorphism, sombra difusa, card dentro de card, ícone solto sem tile, raios misturados.

LEIS DE DESIGN NATIVO (L)
L01 Uma superfície, um plano. Conteúdo direto sobre fundo neutro.
L02 Família única de raio: tile 12-16, card 16-20, sheet 24-28, pill 999.
L03 Ritmo base 4/8: interno 12-16, entre itens 8-12, entre seções 24-32, gutter 16 mobile / 24-32 tablet / 32-40 desktop.
L04 Elevação zero: separa por vazio + hairline 1px + tom de superfície. Sombra só em overlay.
L05 Uma família tipográfica. Escala 11/12/13/15/17/22/28. Título semibold 1 linha. Números tabulares.
L06 Tile canônico: quadrado arredondado, glifo simples, fundo pastel, rótulo 1 linha 11-12px.
L07 Cabeçalho de seção: título à esquerda, ação textual à direita. Nunca subtítulo explicando a seção.
L08 Mídia com proporção travada 1:1, 4:3, 16:9 com cover. Nunca esticar, nunca espremer.
L09 Limite de texto: título 2 linhas com reticências, apoio 2 linhas, zero parágrafo em card pequeno.
L10 Carrossel com peek: largura fixa, espiada do próximo, snap.
L11 Uma ação primária por viewport de decisão. Secundária ghost/outline.
L12 Mobile: barra inferior 4-5 itens + safe-area. Desktop: rail + topbar. Ativo na cor da marca.
L13 Filtros: chips em linha única com scroll horizontal; ordenação na mesma linha.
L14 Máximo 2 badges por card, sempre com significado.
L15 Uma marca + neutros. Marca carrega ação, não decoração.
L16 Densidade por shell: mobile 1 coluna edge-to-edge, tablet 2 colunas, desktop container com limite de leitura 68-72ch.
L17 Estados: skeleton com a mesma geometria do conteúdo; vazio com ação; erro com recuperação.
L18 Movimento 120-200ms, curva única, interrompível, só transform/opacity.

REGISTRO DE CHECKS (C) — verificação determinística, 0 = conforme
C01 Cores cruas em src//.tsx (hex, rgb, hsl, bg-white, text-white, bg-black, text-slate-, text-gray-) = 0
C02 Raio fora do token (rounded-[..], rounded-* avulso onde há token) = 0
C03 Espaço fora da escala (p-[13px], mt-[7px]) = 0
C04 Card dentro de card = 0
C05 Grid/flex aninhado > 2 níveis com gutters concorrentes = 0
C06 Gradiente decorativo = 0
C07 Glassmorphism (backdrop-blur + fundo translúcido) fora de overlay = 0
C08 Emoji em JSX ou string de UI = 0
C09 Sombra em superfície (não-overlay) = 0
C10 Ícone solto sem tile em listas de ação = 0
C11 Mais de 1 botão sólido por viewport de decisão = 0
C12 Título de card sem line-clamp = 0
C13 Parágrafo > 2 linhas em card pequeno = 0
C14 Img/video sem aspect-ratio ou width+height = 0
C15 Skeleton sem paridade de geometria com o conteúdo = 0
C16 Lista > 50 itens não virtualizada = 0
C17 Animação fora de transform/opacity ou duração fora de 120-200ms = 0
C18 100vh em vez de 100dvh = 0
C19 Alvo de toque < 44px no mobile = 0
C20 Elemento fixo sem safe-area-inset = 0
C21 String de UI literal em componente = 0
C22 MOCK_/dummy/fake/sample/Lorem/123456 em src = 0
C23 any, as any, @ts-ignore, eslint-disable = 0
C24 Array literal de objetos de domínio dentro de componente = 0
C25 Data/moeda/telefone/documento formatado inline = 0
C26 Capacidade com mais de um dono = 0
C27 Rota apontando para componente inexistente ou morto = 0
C28 TODO/FIXME/XXX/HACK = 0
C29 Componente duplicado 3+ vezes = 0
C30 Tabela larga sem estratégia mobile = 0
C31 Modal onde deveria ser sheet no mobile = 0
C32 hover: como única affordance de ação primária = 0
C33 Família tipográfica ou font- fora do sistema = 0
C34 Peso tipográfico fora da escala = 0
C35 Coluna/valor numérico sem tabular-nums = 0
C36 Scroll aninhado na mesma viewport = 0
C37 setTimeout/setInterval simulando estado = 0
C38 Ação sem estado de erro e recuperação = 0
C39 Ação sem estado vazio com CTA = 0
C40 Escrita sem verificação de permissão/RLS = 0
C41 Ação de UI sem tool MCP equivalente = 0
C42 Mudança de banco sem migração versionada = 0
C43 Mudança de banco sem types regenerados = 0

LEDGER DE ESTADO (STATE) — mantenha em .audit/STATE.json
{
"modules": [{ "id": "", "owner": "", "status": "", "score": 0, "duplicates": [] }],
"capabilities": [{ "id": "kanban|crm|quote|proposal|ticket|task|contract|cash", "implementations": [], "canonical": "", "killed": [] }],
"checks": { "C01": "green|red|na", "...": "" },
"routes": [], "shells": [], "debts": [], "decisions": [], "next": []
}

FORMATO DE SAÍDA OBRIGATÓRIO (toda resposta, nesta ordem)

ESTADO: o que mudou em relação ao STATE anterior.
ACHADOS: tabela id | arquivo:linha | check | severidade (crítico/alto/médio) | prova.
DECISÕES: dono único e o que foi morto.
MUDANÇAS: por arquivo, com antes/depois.
CHECKS: C01-C43 + M/L violados, verde/vermelho/na.
SCORECARD: 0-5 em Arquitetura, UI Nativa, Sem Hardcode, Integridade de Fluxo, MCP/IA, Performance, Acessibilidade.
HANDOFF: bloco JSON para colar no próximo prompt.
PRÓXIMO PROMPT: qual Pxx e por quê.
REGRAS DE PARADA

Achou capacidade duplicada: pare, proponha kill list antes de qualquer feature.
Need de ler mais de 30 arquivos: entregue o mapa parcial e diga o que falta.
Sem prova em código: escreva NÃO ENCONTRADO NO CÓDIGO.
═══════════════════════════════════════
PARTE 3 — FASE 0: FUNDAÇÃO (execute nesta ordem)
═══════════════════════════════════════

P01 — SELAR O TERRENO
Objetivo: criar a infraestrutura de auditoria e o baseline.
Método: 1) criar .audit/ com STATE.json, KILLLIST.md, OWNERS.md, CHECKS.md, DEBTS.md. 2) rodar build, typecheck, lint, testes e gravar resultado bruto. 3) aplicar C01-C43 em todo src e gravar o placar inicial sem corrigir nada. 4) criar scripts/audit/ com um script por check, retornando JSON determinístico.
Aceite: .audit populado; placar inicial versionado; scripts reproduzíveis.
Handoff: STATE.checks = placar inicial; STATE.debts = top 50 achados.

P02 — MAPA DE DONOS E DUPLICATAS
Objetivo: provar por código quais capacidades têm múltiplos donos.
Método: 1) grep/AST por kanban, board, column, card, stage; quote, proposal, orçamento, budget; ticket, support, inbox; task, todo, checklist; crm, lead, cliente, customer. 2) para cada capacidade, listar implementações, tabelas, rotas, hooks e componentes. 3) marcar sobreposição funcional real (não só nome parecido). 4) preencher OWNERS.md com dono proposto e justificativa.
Aceite: C26 mapeado com prova; cada capacidade tem um dono proposto.
Handoff: STATE.capabilities completo.

P03 — KILL LIST E DECISÃO DE DONO ÚNICO
Objetivo: matar a duplicação que faz o sistema parecer fragmentado.
Método: 1) para kanban, orçamento/proposta, ticket, tarefa, CRM e contrato, escolher UM canônico por evidência de maturidade, cobertura de fluxo e qualidade de código. 2) escrever KILLLIST.md: o que morre, o que migra, o que vira adaptador temporário. 3) plano de migração de dados por tabela (mapa coluna a coluna, sem perda). 4) plano de redirecionamento de rotas e imports. 5) NÃO excluir nada ainda: só decidir e registrar.
Aceite: KILLLIST.md com mapa de dados e ordem de execução; zero feature nova.
Handoff: STATE.capabilities[killed], STATE.decisions.

P04 — INVENTÁRIO DE ROTAS, TELAS, SHELLS E NICHOS
Objetivo: saber exatamente o que existe.
Método: 1) listar todas as rotas → componente → arquivo → dono → nicho → shell. 2) marcar mortas, órfãs e duplicadas (C27). 3) identificar quais telas pertencem ao núcleo genérico e quais são de nicho. 4) identificar telas sem versão mobile nativa.
Aceite: tabela completa; C27 = 0 após limpeza de links mortos.
Handoff: STATE.routes, STATE.shells.

P05 — BASELINE MENSURÁVEL
Objetivo: número antes de qualquer correção, para provar ganho depois.
Método: 1) bundle por rota e total. 2) LCP, INP, CLS por rota em mobile e desktop. 3) contagem de componentes, hooks, funções, tamanho dos 20 maiores arquivos. 4) contagem de ocorrências dos checks C01-C43.
Aceite: planilha/JSON com números reproduzíveis.
Handoff: STATE.baseline.

P06 — HARNESS DE AUDITORIA
Objetivo: uma vez construído, todo prompt reusa.
Método: 1) script único audit:all que roda todos os checks e emite relatório HTML+JSON. 2) verificação por AST quando grep for insuficiente (ex.: Card dentro de Card, grid aninhado). 3) regras extras: rota→componente, tokens de design, chamadas de formatação inline.
Aceite: audit:all roda em CI e falha com vermelho.
Handoff: STATE.tooling.

═══════════════════════════════════════
PARTE 4 — FASE 1: UI NATIVA E ERGONOMIA
═══════════════════════════════════════

P07 — CIRURGIA DO "CHEIRO DE IA"
Objetivo: eliminar o que faz o app parecer gerado por IA.
Método: aplicar C06, C07, C08, C09, C10, C11; para cada ocorrência, substituir por equivalente do design system (superfície, hairline, tile, ação única); nunca remover sem substituto.
Aceite: C06-C11 = 0.
Handoff: STATE.checks, STATE.debts.

P08 — AUDITORIA DE TOKENS
Objetivo: tudo vem do design system.
Método: mapear cores, raios, espaçamentos, sombras e fontes fora do sistema (C01, C02, C03, C33, C34); consolidar tokens faltantes em index.css/tailwind.config; substituir ocorrências; criar variantes nos componentes base em vez de override.
Aceite: C01-C03, C33, C34 = 0.
Handoff: STATE.checks + diff de tokens.

P09 — SUPERFÍCIE ÚNICA: SEM CARD EM CARD, SEM GRID EM GRID
Objetivo: matar a compressão estrutural.
Método: detectar por AST Card dentro de Card, shell de página dentro de shell, grid dentro de grid com gutters concorrentes, e scroll aninhado (C04, C05, C36); reescrever a composição para seção única com separação por vazio + hairline (L01, L04).
Aceite: C04, C05, C36 = 0; nenhum conteúdo espremido.
Handoff: lista de telas refeitas.

P10 — TIPOGRAFIA E LIMITE DE TEXTO
Objetivo: nada estoura, nada espreme.
Método: aplicar L05, L09, L16; line-clamp em títulos e apoios; remover parágrafos de card; limite de 68-72ch em leitura; tabular-nums em valores (C12, C13, C35).
Aceite: C12, C13, C35 = 0.

P11 — MÍDIA COM PROPORÇÃO TRAVADA
Objetivo: zero distorção e zero salto de layout.
Método: aspect-ratio em todo img/video, object-cover, srcset, width/height explícitos, lazy nas listas, blur-placeholder com a mesma caixa (C14); mídia nunca em container sem altura definida.
Aceite: C14 = 0, CLS de mídia = 0.

P12 — DENSIDADE POR SHELL
Objetivo: cada shell respira do seu jeito.
Método: definir escala de gutter e densidade por shell (mobile 16 / tablet 24-32 / desktop 32-40); revisar toda tela contra L03 e L16; eliminar espaçamento excessivo e densidade apertada.
Aceite: nenhuma tela fora do ritmo 4/8.

P13 — SHELL NATIVO DE NAVEGAÇÃO
Objetivo: parecer app nativo em cada dispositivo.
Método: mobile = barra inferior 4-5 itens + safe-area + push stack + sheet; tablet = split view rail + detalhe; desktop = rail + topbar + paleta de comandos. Remover modal em contexto mobile (C20, C31), garantir hierarquia de voltar, e nunca usar hover como affordance primária (C32).
Aceite: C20, C31, C32 = 0; navegação testada em 3 shells.

P14 — ESTADOS COMPLETOS
Objetivo: fim do "tela vazia e do nada acontece".
Método: todo fetch com skeleton de geometria paritária, todo vazio com CTA, todo erro com recuperação, todo botão com progresso (C15, C38, C39); nenhum spinner solto no meio de conteúdo.
Aceite: C15, C38, C39 = 0.

P15 — ACESSIBILIDADE E ERGONOMIA DE TOQUE
Objetivo: nativo de verdade.
Método: alvo de toque >= 44px (C19), foco visível, ordem de tabulação, contraste AA, aria em listas e modais, teclado em desktop, leitor de tela nas ações críticas.
Aceite: C19 = 0; contraste AA em todo texto.

P16 — MOVIMENTO
Objetivo: sensação nativa, sem enfeite.
Método: L18 e C17; só transform/opacity; uma curva; 120-200ms; transições de tela (push/pop), stagger de lista curto; respeitar prefers-reduced-motion.
Aceite: C17 = 0.

P17 — ANTI-JANK E CLS INSTRUMENTADO
Objetivo: matar travamento e salto.
Método: medir INP e CLS antes/depois; virtualizar listas > 50 itens (C16); 100dvh (C18); conter layout (contain), evitar reflow em scroll, eliminar backdrop-filter durante scroll, evitar imagem sem dimensão, evitar fonte que troca métrica.
Aceite: C16, C18 = 0; INP < 200ms; CLS < 0.05.

P18 — MATRIZ DE RESPONSIVIDADE (VARRE DURA)
Objetivo: listar TODA quebra com causa no código.
Método: varrer cada rota em 320, 360, 390, 430, 768, 1024, 1280, 1440, 1920; registrar screenshot, overflow horizontal, texto cortado, elemento menor que 44px, coluna espremida; cada quebra ligada a arquivo:linha.
Aceite: matriz preenchida; quebras priorizadas com dono.
Handoff: STATE.debts com as quebras.

P19 — FORMS NATIVOS
Objetivo: formulário que não briga com o teclado.
Método: tipo de teclado correto, máscara em documento/telefone/moeda, validação inline no blur, autosave de rascunho, stepper em formulário longo, evitar modal para form longo no mobile, foco automático coerente, botão primário fixo com safe-area.
Aceite: nenhum form perde dado ao rotacionar ou fechar; zero erro silencioso.

P20 — TABELAS E LISTAS DENSAS NO MOBILE
Objetivo: nada espremido.
Método: definir colunas essenciais por tabela, progressive disclosure, linha vira card no mobile com hierarquia clara, ordenação/filtro em sheet, sticky header, sem scroll horizontal (C30, L13, L14).
Aceite: C30 = 0; zero scroll horizontal em tela de dados.

P21 — PWA / STANDALONE NATIVO
Objetivo: instalado, parece app.
Método: 100dvh, safe-area em todas as bordas, overscroll-behavior, gesto de voltar, pull-to-refresh nativo, estados de offline com fila de escrita, splash coerente com o tema, sem barra branca fantasma, sem flash de tema.
Aceite: instalado em iOS e Android sem quebra visível.

═══════════════════════════════════════
PARTE 5 — FASE 2: SEM HARDCODE, SEM MOCK, SEM DÍVIDA
═══════════════════════════════════════

P22 — CAÇA A HARDCODE
Objetivo: C21, C25, C02, C03 zerados.
Método: listar toda string de UI, cor, número mágico e URL fixa em componentes; classificar por origem esperada (banco, config de nicho, dicionário semântico, token); substituir sem quebrar layout; nada de texto default "por enquanto".
Aceite: C21 = 0; C25 = 0.

P23 — CAÇA A MOCK E FAKE
Objetivo: C22, C24, C37 zerados.
Método: localizar MOCK_/dummy/fake/sample/Lorem, arrays literais de domínio, setTimeout simulando estado, contadores fixos; para cada um, criar ou conectar o caso de uso real com RLS; se o backend não existe, criar a tabela com migração + RLS antes de mexer na UI.
Aceite: C22, C24, C37 = 0; nenhuma tela depende de dado fictício.

P24 — TIPOS E SUPRESSÕES
Objetivo: C23 = 0.
Método: eliminar any, as any, ts-ignore, eslint-disable; tipar contratos de entrada/saída de cada caso de uso; tipar retorno do banco com types regenerados; nenhum cast para "resolver" erro.
Aceite: C23 = 0 e typecheck limpo.

P25 — BIBLIOTECA SEMÂNTICA (BASE)
Objetivo: nenhum componente escreve copy.
Método: extrair todas as strings para chaves semânticas organizadas por domínio (entidade, status, ação, mensagem, erro, vazio); criar camada de resolução; componentes só referenciam chave; remover texto explicativo de seção (L07).
Aceite: C21 = 0; nenhuma copy dentro de JSX.

P26 — PURGA DE CÓDIGO MORTO
Objetivo: nada de rota ou componente fantasma.
Método: C27, C28; remover rotas órfãs, componentes sem uso, hooks duplicados, imports mortos, arquivos de teste que só declaram tipos (padrão "transfusão que virou interface").
Aceite: C27, C28 = 0; contagem de arquivos reduzida.

P27 — UNIFICAÇÃO DE COMPONENTES DUPLICADOS
Objetivo: C29 = 0.
Método: agrupar componentes equivalentes (3+ cópias), escolher canônico, criar variantes no design system em vez de forks, migrar chamadas.
Aceite: C29 = 0.

P28 — CONTRATOS DE DADOS
Objetivo: C42, C43 = 0 e nenhum contrato implícito.
Método: toda tabela com migração versionada, RLS e policies revisadas; types regenerados; contratos de caso de uso tipados; nenhuma query montada dentro de componente.
Aceite: C42, C43 = 0; nenhum acesso direto ao banco fora da camada de dados.

═══════════════════════════════════════
PARTE 6 — FASE 3: METAMORFOSE POR NICHO
═══════════════════════════════════════

P29 — MANIFESTO DE NICHO
Objetivo: um núcleo, muitos nichos, zero fork de código.
Método: criar niche.manifest (entidades, módulos ativos, estágios, papéis, campos obrigatórios, SLAs, documentos, taxas, templates); núcleo lê o manifesto; nenhum if (nicho === 'turismo') espalhado — tudo via manifesto.
Aceite: trocar de nicho não exige editar componente.

P30 — DICIONÁRIO SEMÂNTICO POR NICHO
Objetivo: linguagem muda por nicho, código não.
Método: dicionário com termos, sinônimos, status, ações, mensagens e labels por nicho; fallback para o núcleo genérico; usado por UI, forms, PDFs, e-mails e MCP.
Aceite: nenhum termo de nicho hardcoded.

P31 — REGISTRO DE MÓDULOS E FLAGS
Objetivo: cada nicho liga só o que precisa.
Método: registry de módulos com rotas, permissões, dependências e flags; navegação derivada do registry; módulo desligado não aparece em menu, rota nem MCP.
Aceite: nenhuma tela inacessível por rota direta quando o módulo está desligado.

P32 — MÁQUINAS DE ESTADO EXPLÍCITAS
Objetivo: fim do status solto em string.
Método: definir máquina de estado por entidade (lead, cotação, proposta, reserva, viagem, embarque, contrato, financeiro, ticket); transições válidas, quem pode transicionar, o que dispara, o que bloqueia; validação no servidor.
Aceite: nenhuma transição inválida possível via UI, MCP ou IA.

P33 — MOTOR DE FORMULÁRIOS
Objetivo: form schema-driven, versionado, com LGPD.
Método: schema de campos, validação, condicionais, anexos, consentimento e trilha de auditoria; templates por nicho; resposta vinculada ao registro de origem; versionamento para não corromper respostas antigas.
Aceite: nenhum form escrito à mão para caso de uso existente.

P34 — MOTOR DE KANBAN GENÉRICO
Objetivo: um kanban para todos os nichos.
Método: colunas, WIP, SLA por coluna, motivos de perda, automações por evento, tarefas dentro do card, formulários e vínculos no card; persistência real; nada de kanban paralelo.
Aceite: C26 = 0 para kanban; um único dono.

P35 — PERMISSÕES E RLS POR NICHO
Objetivo: uma fonte de verdade de permissão.
Método: papéis, escopos, delegação, exceções; policies por tabela; a mesma verificação usada por UI, MCP e IA (M09, C40); log de quem fez o quê.
Aceite: C40 = 0; nenhuma ação possível fora do papel.

P36 — DOMAIN EVENTS E TIMELINE UNIFICADA
Objetivo: acabar com módulos que não conversam.
Método: barramento de eventos de domínio (lead.criado, cotacao.enviada, proposta.aceita, reserva.confirmada, voucher.emitido, contrato.assinado, voo.alterado, embarque.concluido); timeline única por entidade que agrega eventos de todos os módulos; notificações derivadas de eventos.
Aceite: todo evento relevante aparece na timeline do cliente, do card e da viagem.

═══════════════════════════════════════
PARTE 7 — FASE 4: TRANSPLANTE DOS REPOS DE REFERÊNCIA
═══════════════════════════════════════

P37 — INVENTÁRIO DE REFERÊNCIA (somente código)
Objetivo: catalogar o que já existe de bom.
Método: em travelos, travelagencias, turisagencias, turisos: listar módulos, hooks, libs, tabelas, functions, máquinas de estado e integrações; ranquear maturidade por linhas de código real, cobertura de fluxo e uso; NÃO usar docs como prova.
Aceite: inventário com arquivo:linha de cada capacidade relevante.

P38 — MATRIZ DE TRANSPLANTE
Objetivo: nada recriado do zero.
Método: tabela capacidade → origem → destino no Waesy → dependências → adaptações necessárias (tokens, RLS, tipos, nicho, renomeação).
Aceite: toda capacidade do diagnóstico tem linha na matriz.

P39 — PROCEDIMENTO DE TRANSPLANTE
Objetivo: importar capacidade sem importar dívida.
Método: 1) copiar lógica, nunca o JSX. 2) reescrever a camada visual no design system. 3) substituir dados mockados por backend real com RLS. 4) renomear para o dicionário do Waesy. 5) cobrir com checks C01-C43. 6) só apagar o original da referência quando o teste passar.
Aceite: nenhum componente copiado cru; nenhum mock importado.

P40 — TRANSPLANTE: CRM/KANBAN AVANÇADO
Objetivo: pipeline de verdade.
Método: pipeline unificado com estágios, atividades, reuniões, tags, checklists, formulários, conversão e histórico; card com seções fixas (dados, notas, checklist, rastreio, vínculos); vínculo bilateral com o cliente.
Aceite: card cria log no cliente e cliente lista seus cards.

P41 — TRANSPLANTE: MOTOR DE COTAÇÃO
Objetivo: um orçamento, não oito.
Método: motor com cenários, itens, fornecedores, markup, simulação, scoring, promoções, regras administrativas e aprendizado; versionamento de proposta; nada de duplicidade de "quote/proposal/budget".
Aceite: C26 = 0 para orçamento.

P42 — TRANSPLANTE: TASKS AVANÇADAS
Objetivo: um único sistema de tarefa.
Método: projetos, espaços, labels, dependências, watchers, comentários, activity log, apontamento de tempo, recorrência e SLA; usado por CRM, embarque, suporte e financeiro.
Aceite: C26 = 0 para tarefa.

P43 — TRANSPLANTE: SUPORTE/INBOX
Objetivo: um ticket, uma timeline.
Método: inbox omnichannel, SLA, prioridade, categorias, respostas rápidas, vínculo com cliente/viagem/card; timeline unificada; captura de ticket a partir de qualquer módulo.
Aceite: C26 = 0 para ticket; toda criação cai na mesma tabela.

P44 — TRANSPLANTE: DOCUMENTOS, ASSINATURAS E COFRE
Objetivo: gestão de contrato completa.
Método: geração, versionamento, envio, rastreio de visualização, assinatura, reenvio, validade, cofre por cliente e por viagem, permissões.
Aceite: um único dono para contrato; nenhuma cópia paralela.

═══════════════════════════════════════
PARTE 8 — FASE 5: FLUXO TURISMO PONTA A PONTA
═══════════════════════════════════════

P45 — GRAFO CANÔNICO DO TURISMO
Objetivo: contrato de integração entre módulos.
Método: definir entidades (lead/card, cliente, cotação, proposta, reserva, viajante, viagem, embarque, voucher, contrato, título financeiro, ticket, roomlist) e os eventos entre elas; definir o que é 1:1, 1:N e N:N; migrations correspondentes.
Aceite: nenhum módulo guarda cópia de dado de outro; tudo por referência.

P46 — CARD DE VENDAS COM COTAÇÃO EMBUTIDA
Objetivo: o card é o atendimento completo.
Método: criar card no kanban = criar demanda; vincular cliente novo ou existente; toda interação vira log no cliente; cotação criada dentro do card; observações, tags, reuniões, follow-up e envio de formulário no mesmo card; aceite de termos.
Aceite: abrir o card mostra o histórico completo do atendimento sem sair da tela.

P47 — PERFIL 360 DO CLIENTE
Objetivo: cliente é entidade viva, não registro solto.
Método: histórico de cotações, propostas aceitas/recusadas, compras, cancelamentos, viagens, documentos, assinaturas, tickets, financeiro e LGPD; timeline unificada (P36); busca e filtros.
Aceite: toda cotação aparece no cliente; todo cliente aparece na busca do card.

P48 — FORMULÁRIOS DE INTERESSE, ACEITE E REUNIÕES
Objetivo: capturar informação no fluxo, não por WhatsApp solto.
Método: enviar formulário a partir do card, resposta vincula ao card e ao cliente, consentimento LGPD, marcar reunião, enviar aceite de reunião, registrar comparecimento.
Aceite: toda resposta rastreável até o card de origem.

P49 — PROPOSTAS COMPLETAS
Objetivo: proposta versionada e comparável.
Método: criar, editar, versionar, comparar cenários, adicionar tags e observações, anexos, validade, envio, rastreio de abertura, aceite e assinatura; congelar versão enviada.
Aceite: proposta aceita gera reserva sem redigitação.

P50 — PROPOSTA → RESERVA
Objetivo: conversão com trava.
Método: conversão com checklist de pré-requisitos, validação de disponibilidade e valores, aprovação quando necessário, registro de quem converteu e reversão.
Aceite: nenhuma reserva criada sem checklist completo; reversão auditada.

P51 — RESERVA → VOUCHER
Objetivo: documento real, não template bonito e vazio.
Método: gerar voucher de reserva com dados reais (voos, passeios, trem, cruzeiro, diárias, viajantes), versionamento, reenvio, idioma, e trilha de download; PDF e imagem.
Aceite: nenhum campo em branco; nenhum dado fixo no template.

P52 — RESERVA → CONTRATO
Objetivo: contrato gerado e rastreável.
Método: gerar contrato, enviar para assinatura, rastrear visualização, armazenar no cofre, versionar, reenviar; bloquear embarque quando contrato obrigatório não assinado.
Aceite: estado do contrato visível na reserva e na viagem.

P53 — RESERVA → VIAGEM + EMBARQUES
Objetivo: a conversão cria o card de embarque automaticamente.
Método: conversão gera viagem e card especial em Embarques com dados de voo, viajantes, documentos e checklist.
Aceite: registrar viagem em um lugar reflete nos três módulos.

P54 — EMBARQUE OPERACIONAL
Objetivo: gestão de embarque no dia.
Método: monitorar voo, registrar alteração da operadora, aprovar novo voo com o cliente, abrir ticket de suporte vinculado à viagem, alterar diárias, incluir passeio, check-in rápido, visão dos próximos embarques, documentação e taxas.
Aceite: toda alteração de voo gera evento, notificação e trilha.

P55 — VIAGENS EMITIDAS
Objetivo: pós-venda operacional.
Método: passeios, valores, contratos, documentos, diárias, fornecedores, viajantes, voucher, financeiro e histórico.
Aceite: viagem é a fonte única pós-confirmação.

P56 — VIAJANTES E RESPONSABILIDADE
Objetivo: cada viajante com seu painel.
Método: vincular múltiplos clientes à viagem, painel do viajante, responsável financeiro, permissões de acesso, documentos e comunicação por viajante.
Aceite: viajante só vê o que lhe pertence.

P57 — DOCUMENTAÇÃO, CHECKLIST E TAXAS
Objetivo: nada embarca irregular.
Método: regras por destino e nacionalidade, validade de passaporte/visto/vacina, taxas de aeroporto e de destino, alertas antecipados, bloqueio configurável.
Aceite: checklist calculado por regra, não checklist fixo.

P58 — FINANCEIRO DA VIAGEM
Objetivo: caixa, títulos e conciliação.
Método: títulos a receber/pagar, parcelamento, pagamento parcial, fornecedor, notas fiscais, caixa da viagem, conciliação automática, extrato por cliente e por viagem.
Aceite: nenhum valor calculado na UI; tudo derivado de títulos.

P59 — GRUPO / TERRESTRE
Objetivo: painel próprio completo.
Método: orçamento por grupo, roomlist com ocupação e regras de quarto, contratos terrestres, fornecedores, caixa, notas fiscais, auditoria e conciliação.
Aceite: roomlist mudou → financeiro e documentos refletem.

P60 — ENCERRAMENTO E PÓS-VENDA
Objetivo: ciclo fechado.
Método: arquivar viagem, consolidar histórico no cliente, NPS, motivo de cancelamento, aprendizado do motor de cotação (P41).
Aceite: viagem encerrada vira histórico consultável e alimenta o aprendizado.

P61 — E2E REAL DO FLUXO COMPLETO
Objetivo: provar que tudo conversa.
Método: executar lead → card → cotação → proposta → aceite → reserva → voucher → contrato → viagem → embarque → financeiro → pós-venda com dados reais, registrar cada tela, cada evento e cada quebra; reverter tudo ao fim.
Aceite: zero furo de vínculo; relatório com cada quebra achada.

═══════════════════════════════════════
PARTE 9 — FASE 6: MCP E WEBMCP
═══════════════════════════════════════

P62 — REGISTRO ÚNICO DE CAPACIDADES
Objetivo: uma capacidade escrita uma vez, exposta em três lugares.
Método: derivar o registry dos casos de uso existentes; cada capacidade com nome, descrição, schema (JSON Schema), escopo, permissão, idempotência e reversibilidade; UI, MCP e IA consomem o mesmo registry.
Aceite: C41 = 0; nenhuma ação de UI sem tool equivalente.

P63 — SERVIDOR MCP
Objetivo: outras IAs usam o Waesy com regras.
Método: implementar MCP com recursos (leitura), tools (escrita/ação) e prompts (fluxos); transporte conforme padrão atual; autenticação com OAuth/token de escopo; versionamento; paginação; limites de taxa; dry-run obrigatório em ação destrutiva.
Aceite: cliente MCP externo lista tools, executa leitura e ação com permissão correta.

P64 — WEBMCP NA PÁGINA
Objetivo: agente no navegador age pela interface.
Método: expor o registry via API de contexto do agente; anotar formulários declarativamente (campo → intenção, botão → ação); toda ação disparada passa pela mesma validação e permissão da UI.
Aceite: agente opera login, busca, criação de card e cotação numa sessão real.

P65 — PERMISSÃO E AUDITORIA NOS TOOLS
Objetivo: IA não é superusuário.
Método: toda tool executa o mesmo caso de uso com RLS; nega por padrão; registra ator, origem, payload, resultado e diff; rate limit por ator; isolamento por nicho e organização.
Aceite: C40 = 0 também para MCP; trilha completa de toda ação de IA.

P66 — TOOLS DE LEITURA E RECURSOS
Objetivo: leitura com RLS e citação.
Método: recursos com URIs estáveis (cliente, card, viagem, reserva, contrato), busca semântica com filtro de permissão, resposta sempre citando o registro de origem, nunca dado agregado sem escopo.
Aceite: nenhum resultado fora do escopo do ator.

P67 — TOOLS DE ESCRITA
Objetivo: ação real, sem estrago.
Método: idempotência por chave, confirmação em duas etapas para destrutivo, limites por nicho, transação, rollback, detecção de conflito e resposta tipada de sucesso/erro.
Aceite: repetir a mesma chamada não duplica nada; erro retorna recuperação.

P68 — PROMPTS E SKILLS POR NICHO
Objetivo: fluxos prontos para agentes.
Método: cada fluxo principal vira prompt MCP versionado (ex.: abrir cotação, converter em reserva, emitir voucher, tratar alteração de voo); discovery com manifesto de capacidades.
Aceite: agente externo completa um fluxo ponta a ponta sem ajuda humana.

P69 — EVALS E OBSERVABILIDADE DE MCP
Objetivo: medir qualidade.
Método: conjunto de casos (sucesso, permissão negada, dado ausente, entrada inválida, ação destrutiva); medir acerto de tool, formato, recusa correta, custo e latência; painel de ações IA × humano.
Aceite: relatório de evals versionado com taxa de acerto.

═══════════════════════════════════════
PARTE 10 — FASE 7: IA INTERNA
═══════════════════════════════════════

P70 — UNIFICAR A IA INTERNA
Objetivo: a IA do app é o mesmo motor do MCP.
Método: roteamento de intenção, chamada de tools pelo registry, contexto de tela, confirmação de ação, resposta com link para o registro criado; zero lógica duplicada.
Aceite: mesma permissão, mesmo resultado, mesma auditoria da UI e do MCP.

P71 — RAG POR NICHO COM RLS
Objetivo: responder com dado correto do tenant.
Método: indexação por domínio e nicho, filtro de permissão, citação de fonte, recusa quando não há base, sem vazamento entre organizações.
Aceite: nenhuma resposta fora do escopo; toda resposta cita origem.

P72 — EVALS E GUARDRAILS DA IA
Objetivo: confiar no que ela faz.
Método: conjunto dourado por fluxo (turismo primeiro), medir acerto, alucinação, ação indevida, custo e latência; guardrails para ação destrutiva, valores financeiros e dado pessoal.
Aceite: nenhuma ação destrutiva sem confirmação e sem reversão.

═══════════════════════════════════════
PARTE 11 — FASE 8: BLINDAGEM E CICLO CONTÍNUO
═══════════════════════════════════════

P73 — REGRESSÃO VISUAL
Objetivo: nenhuma quebra volta.
Método: screenshots por rota × viewport (320/390/768/1280/1920) versionados; diff bloqueia merge; baseline atualizada só de propósito.
Aceite: pipeline reprova mudança visual não intencional.

P74 — BLOQUEIOS DE CI
Objetivo: contrato verificado por máquina.
Método: rodar C01-C43 no CI; budget de bundle e de CLS; lint de tokens (proíbe cor crua, raio avulso, string de UI); reprova em vermelho.
Aceite: PR com hardcode ou mock não passa.

P75 — ORÇAMENTOS DE PERFORMANCE
Objetivo: nativo é rápido.
Método: definir e monitorar LCP, INP, CLS, TTFB, memória, tempo de interação em tela densa, tamanho por rota; code-split; lazy de módulo de nicho; cache de dado estável.
Aceite: nenhuma rota acima do orçamento.

P76 — DETECTOR DE DRIFT
Objetivo: a fragmentação não volta.
Método: verificar dono único por capacidade, componentes duplicados, nomenclatura, tokens fora do sistema, rota órfã, campo sem migration, tool MCP sem caso de uso e caso de uso sem tool.
Aceite: relatório de drift semanal com zero crítico.

P77 — CICLO CONTÍNUO
Objetivo: rotina permanente, não mutirão.
Método: rodar auditoria por módulo em ciclos; cada ciclo escolhe um módulo, aplica P07-P20 e os checks, atualiza placar, registra dívida residual; nunca reabrir módulo verde sem evidência de regressão.
Aceite: placar por módulo subindo ciclo a ciclo.

P78 — RELATÓRIO EXECUTIVO
Objetivo: você enxerga o estado em uma tela.
Método: consolidar STATE, placar por módulo, checks verdes/vermelhos, dívidas abertas, top 10 quebras visuais com prova, e o próximo passo recomendado.
Aceite: uma página, sem prosa, só número e prova.

═══════════════════════════════════════
ORDEM DE EXECUÇÃO SUGERIDA
═══════════════════════════════════════

P01 → P06 (fundação; aqui você recupera o controle)
P02 e P03 são o desbloqueio real: sem dono único, todo prompt seguinte volta a divergir.
P22 → P28 (tirar hardcode, mock e dívida antes de desenhar)
P37 → P39 + P40 → P44 (trazer o que já existe de bom)
P29 → P36 (metamorfose por nicho)
P45 → P61 (fluxo turismo ponta a ponta)
P07 → P21 (cirurgia visual, módulo por módulo, já sobre a estrutura certa)
P62 → P69 (MCP/WebMCP)
P70 → P72 (IA interna)
P73 → P78 (blindagem e ciclo contínuo)
Regra de ouro para colar no Antigravity junto do mestre: "Nesta tarefa você não tem permissão de criar nada novo. Só ler, provar, decidir e refatorar. Se faltar evidência, escreva NÃO ENCONTRADO NO CÓDIGO e pare."

Se quiser, eu transformo isso em arquivos versionados no projeto (.audit/) com os scripts de auditoria já funcionando, para você ter o placar rodando desde já.