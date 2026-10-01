PLANO DE IMPLEMENTAÇÃO — MOTOR DE ANÚNCIOS E VITRINE (CLASSIFICADOS + WORKSPACE)
Cole este plano junto do PROMPT ZERO e do MÉTODO 8A. Ele é o plano de domínio; os dois anteriores são as leis e o processo.

===========================================
0. O QUE ESTE PLANO RESOLVE
===========================================
Você vai auditar, corrigir, refatorar e levar ao estado da arte o motor de anúncios do Waesy, que hoje tem duas origens (Classificados e Workspace/Marketplace) servindo a mesma vitrine, com campos duplicados, telas quebradas, preview falso, templates incoerentes com o nicho e fluxos desvinculados.

Regra de escopo: este plano não cria um sistema paralelo. Ele unifica o que existe, dando dono único a cada informação e fazendo toda a cadeia (editor → banco → render → compra → gestão) funcionar de ponta a ponta por nicho.

===========================================

AS 12 REGRAS FUNDACIONAIS DO DOMÍNIO
R01 UM CAMPO, UM DONO, UM LUGAR NO EDITOR, UM LUGAR NO RENDER. Nunca dois.
R02 Uma origem de anúncio: CLASSIFICADOS (pessoa ou empresa sem gestão completa, expira) e WORKSPACE (empresa, vitrine + gestão). Um único modelo, um único motor. Origem muda regras, não a estrutura.
R03 Classificados é a vitrine rápida. Workspace é a gestão completa. O Workspace precisa ter TODAS as capacidades do Classificados, mais as avançadas.
R04 O que o cliente vê é o que existe. Campo que não renderiza não fica no editor. Campo interno é marcado como interno e nunca renderiza.
R05 O preview é REAL. Mesma árvore de componentes da página pública, dentro de iframe real, com dados reais, responsivo e sem quebra.
R06 O template é COMPOSIÇÃO, não tema. O nicho define quais seções existem, em que ordem e com quais rótulos. Template incoerente com o nicho não pode aparecer.
R07 Nada de conteúdo de consumidor dentro do admin. CTA de compra não existe na tela de criação.
R08 Toda ação gera registro real: reservar, comprar, agendar, orçar, assinar, emitir. Nada de estado só na tela.
R09 Duplicidade é bug de arquitetura, não de UI. Formas de pagamento, parcelamento, desconto, imagens, condições, fiscal: cada um com um único lugar.
R10 O nicho é dado, não código. Nada de if (nicho === "turismo") espalhado. Tudo pelo manifesto de nicho e pela biblioteca semântica.
R11 O fluxo de compra muda por nicho — produto físico, serviço com agendamento, turismo com reserva, serviço por orçamento, assinatura recorrente — mas o motor é um só.
R12 Nada quebra em 320px, nada é espremido, nada fica parcial. Estado da arte ou não entra.
===========================================
2. MAPA DO DOMÍNIO (a fonte de verdade do modelo)
===========================================
Entidades mínimas, todas com origem, dono e ciclo de vida:
Listagem (anúncio), origem, tipo (produto, serviço, pacote, roteiro, imóvel, veículo, vaga, orçamento), nicho, categoria, atributos de nicho, mídia, variações, matriz de variações, adicionais/modificadores, preço e condições, fiscal, estoque/disponibilidade/agenda, localização, contato, políticas, exclusões/inclusos, SEO, status, validade, visibilidade, publicador (pessoa ou empresa), organização.
Derivações do fluxo: lead, conversa, orçamento/proposta, pedido, reserva, agendamento, contrato, voucher, nota fiscal, título financeiro, entrega, avaliação, ticket de suporte, tarefa.

Relação obrigatória: TODA derivação aponta para o anúncio de origem. Se não aponta, o vínculo está quebrado.

===========================================
3. MATRIZ DE DUPLICIDADE PROIBIDA (entregável obrigatório)
===========================================
Produza uma matriz com uma linha por campo, com 6 colunas: campo | coluna/tabela dona | única tela onde é editado | bloco(s) onde renderiza | condição por nicho | tool MCP. Campos que hoje aparecem em dois lugares são bug. Os casos conhecidos a resolver:

Formas de pagamento aceitas (hoje aparecem em mais de um bloco).
Parcelamento máximo, parcelas sem juros, desconto PIX, sinal/entrada, prazo do saldo.
Descontos e cupons.
Imagens, capa, vídeo, ordem, limites.
Inclusos, exclusos, condições, políticas de cancelamento.
Preço de venda, preço comparativo, preço de custo, margem, markup.
Fiscal: NCM, CEST, CFOP, IBS, CBS, enquadramento, regime.
Variações (produto) e variações de embarque/quarto/acomodação (turismo).
Adicionais e modificadores.
Estoque, disponibilidade, agenda, capacidade, unidade de venda.
Localização, raio de atendimento, frete/entrega.
SEO: título, slug, descrição, tags.
Contato, WhatsApp, proposta.
Status, validade, expiração, destaque.
Regra dura: campo que renderiza em dois lugares tem dois donos e é reprovado no A6.

===========================================
4. CASOS OBSERVADOS (evidência inicial — confirmar no código)
===========================================
Estas hipóteses vêm de telas reais do sistema. Você não pode tratá-las como verdade: cada uma precisa ser confirmada ou descartada com arquivo:linha.
O01 Editor "Criar Novo Pacote / Roteiro": preview lateral vazio, "0 Inclusos", rótulo "COMO..." truncado.
O02 Seletor de template exibindo opção "Mercado" dentro do nicho Turismo.
O03 Botão "Reservar Pacote" dentro da tela de criação do anunciante (bleed de contexto).
O04 Condições de pagamento e parcelamento repetidas em abas diferentes.
O05 Blocos de inclusos/exclusos competindo e repetindo informação.
O06 Preview "Mobile (390px) / Desktop" que não reflete o conteúdo digitado nem escala proporcionalmente.
O07 Página de detalhe do classificados com aba que renderiza placeholder ("Carrossel de Destaques").
O08 Divergência entre a página de detalhe real e o mockup de referência (fotos, hospedagem, roteiro, condições).
O09 Faixa "Modo Proprietário Ativo" empurrando o layout e quebrando a grade.
O10 Mistura de raios, badges e elevações entre as páginas de detalhe.
O11 Galeria/estado vazio permanente em telas já preenchidas.
O12 Textos fixos em blocos de render de vitrine.

===========================================
5. AS 48 FASES
===========================================

BLOCO A — VERDADE E DIAGNÓSTICO (F01 a F06)
F01 — INVENTÁRIO DO DOMÍNIO DE ANÚNCIOS
Objetivo: listar tudo que existe: classificados, workspace, catálogo mestre, banco central de produtos, vitrines, marketplaces, editor, preview, páginas de detalhe. Cada item com arquivo:linha, rota, tabela, componente.
Aceite: nenhuma dessas áreas sem mapeamento; zero inferência.
F02 — MATRIZ DE DUPLICIDADE E DONO ÚNICO
Objetivo: preencher a matriz da seção 3 e decidir o dono único de cada campo.
Aceite: nenhum campo com dois donos; kill list dos duplicados.
F03 — MAPA DE FLUXOS DO ANÚNCIO
Objetivo: desenhar o fluxo real: criar → salvar rascunho → validar → publicar → indexar na vitrine → abrir detalhe → comprar/orçar/agendar → gerar registros internos → gestão → expirar/arquivar.
Aceite: cada seta do fluxo com a função real que a executa (arquivo:linha) ou marcada como inexistente.
F04 — MAPA DE CONTRATOS DO ANÚNCIO
Objetivo: cadeia de cada campo: coluna → tipo gerado → schema → payload → formulário do editor → bloco de render → tool MCP.
Aceite: zero órfão, zero divergente, zero faltante.
F05 — DIAGNÓSTICO VISUAL E DE QUEBRAS
Objetivo: catalogar quebras reais (não gosto pessoal): layout empurrado, preview falso, CTA fora de contexto, grid dentro de grid, card dentro de card, texto cortado, badge inconsistente, radius misturado, alvo de toque pequeno, scroll aninhado, CLS.
Aceite: cada quebra com arquivo:linha e severidade.
F06 — BASELINE E TRAVAS
Objetivo: congelar números (build, testes, bundle, LCP/INP/CLS, contagem de campos duplicados, rotas quebradas) e definir os gates deste plano.
Aceite: baseline versionado em docs/audit.

BLOCO B — MODELO ÚNICO DE ANÚNCIO (F07 a F14)
F07 — MODELO CANÔNICO DA LISTAGEM
Objetivo: uma entidade de anúncio com origem classificados|workspace, tipo, nicho, status, validade, dono. Migração versionada, tipos regenerados, RLS.
Aceite: nada de duas tabelas concorrentes de anúncio; o que existir vira adaptador ou é migrado.
F08 — CICLO DE VIDA E EXPIRAÇÃO
Objetivo: rascunho, em revisão, publicado, pausado, ocultado, expirado, vendido, arquivado. Regras por origem: classificados expira, workspace controla manualmente.
Aceite: nenhuma transição inválida possível; expiração automática com job e trilha.
F09 — TAXONOMIA POR NICHO
Objetivo: categoria, subcategoria, tipo e atributos por nicho, com herança e fallback para o núcleo.
Aceite: nenhum atributo de nicho hardcoded; nenhuma categoria órfã.
F10 — ATRIBUTOS DINÂMICOS E VALIDAÇÃO CONDICIONAL
Objetivo: schema de atributos por nicho, com obrigatoriedade condicional e erro por campo.
Aceite: publicar sem atributo obrigatório é impossível; campo irrelevante ao nicho não aparece.
F11 — VITRINE E DESCOBERTA
Objetivo: indexação, busca facetada, filtros, ordenação, destaque, patrocínio, paginação, densidade por shell, layout por nicho.
Aceite: anúncio publicado aparece na vitrine correta do nicho, e some quando oculto ou expirado.
F12 — MODERAÇÃO E DENÚNCIA
Objetivo: estados de moderação, denúncia, ocultação, re-publicação, histórico.
Aceite: toda decisão de moderação registrada com ator e motivo.
F13 — BANCO CENTRAL DE PRODUTOS
Objetivo: decidir com prova: reconstruir de forma visível e funcional, ou eliminar e justificar. Se ficar, precisa ser útil (buscar, importar, publicar, sincronizar) e visível na interface.
Aceite: nenhuma tela que "não é nada funcional" permanece no sistema.
F14 — SEO E DESCOBERTA EXTERNA
Objetivo: metadados, slug, canonical, dados estruturados por tipo de anúncio, sitemap e exposição de leitura via WebMCP.
Aceite: todo anúncio publicado com metadados válidos.

BLOCO C — EDITOR: MODO RÁPIDO E MODO COMPLETO (F15 a F24)
F15 — ARQUITETURA DO EDITOR
Objetivo: editor schema-driven com seções, ordem por nicho, salvar, salvar rascunho, publicar, autosave, detecção de alteração não salva, saída segura.
Aceite: é possível salvar em todas as etapas (o problema "não tem como salvar" desaparece).
F16 — MODO RÁPIDO
Objetivo: pessoa física ou empresa publicam em poucos campos, com defaults inteligentes por nicho, e o resto fica editável depois.
Aceite: publicar rápido sem campo obrigatório faltando; nunca gerar anúncio incompleto silenciosamente.
F17 — MODO COMPLETO
Objetivo: reorganizar as abas e a ordem das seções por nicho, eliminando redundância e competição entre blocos.
Aceite: nenhuma seção repetida; ordem coerente com a decisão de negócio; zero CTA de consumidor no admin.
F18 — PREÇO, CONDIÇÕES E PAGAMENTO (DONO ÚNICO)
Objetivo: consolidar preço de venda, comparativo, custo, margem, parcelamento, parcelas sem juros, desconto PIX, sinal, prazo do saldo, formas aceitas, em um único lugar, com regra por nicho.
Aceite: um único bloco edita cada campo; um único lugar renderiza.
F19 — VARIAÇÕES E MATRIZ
Objetivo: variações de produto (atributos, combinações, preço, estoque, imagem, SKU) e variações de serviço/turismo (embarque, quarto, acomodação, horário).
Aceite: matriz gera combinações consistentes; nada de variação fantasma.
F20 — ADICIONAIS E MODIFICADORES
Objetivo: grupos de adicionais, mínimo/máximo, obrigatório, preço, disponibilidade, ligação com a compra.
Aceite: adicional escolhido no detalhe aparece no pedido/reserva e no valor final.
F21 — MÍDIA
Objetivo: galeria, capa, ordem, marca d'água, vídeo, limites por origem, armazenamento, otimização, lazy, proporção travada.
Aceite: nenhuma imagem distorcida; nenhuma tela com estado vazio permanente.
F22 — FISCAL E TRIBUTÁRIO
Objetivo: NCM, CEST, CFOP, IBS, CBS, regime, enquadramento, busca no catálogo mestre — condicional por nicho, por tipo de item e por empresa com emissão ativa.
Aceite: turismo não mostra fiscal de mercadoria; produto mostra; regra é declarativa, não espalhada.
F23 — PUBLICAÇÃO E PRÉ-CHECAGEM
Objetivo: validação completa antes de publicar, erro por campo, o que bloqueia e o que avisa, confirmação e trilha.
Aceite: publicar nunca falha silenciosamente; erro sempre aponta o campo.
F24 — TEMPLATES POR NICHO
Objetivo: template = composição de seções. O sistema só oferece templates coerentes com o nicho e com o tipo.
Aceite: eliminado qualquer template incoerente ("Mercado" em Turismo) e qualquer template que não renderize de verdade.

BLOCO D — PREVIEW REAL E PÁGINA PÚBLICA (F25 a F32)
F25 — PREVIEW REAL EM IFRAME
Objetivo: o preview usa a MESMA árvore de componentes da página pública, em iframe, com dados reais do formulário, atualizando a cada alteração.
Aceite: nenhum preview mock, nenhum bloco genérico, nenhum rótulo truncado.
F26 — RESPONSIVIDADE DO PREVIEW
Objetivo: alternar mobile 390, tablet 768 e desktop 1280 com escala proporcional ao container, sem quebra, sem corte, sem overflow.
Aceite: ao reduzir a janela, o preview reduz proporcionalmente; zero scroll horizontal.
F27 — PÁGINA DE DETALHE POR NICHO
Objetivo: seções, ordem e conteúdo definidos pelo nicho; blocos que renderizam, blocos internos que nunca renderizam; abas sem duplicidade.
Aceite: nenhuma aba que renderiza placeholder; nenhum bloco repetido; nenhum texto fixo.
F28 — FLUXO DE COMPRA POR NICHO
Objetivo: implementar de verdade os modos: pedido (produto), agendamento (serviço com agenda), reserva (turismo), orçamento (serviço sob consulta), assinatura (recorrente), com regras de quantidade, capacidade, sinal e confirmação.
Aceite: cada modo gera o registro interno correto.
F29 — CONTATO, WHATSAPP E NEGOCIAÇÃO
Objetivo: contato, proposta, negociação segura, selos de verificação, sem misturar com o admin.
Aceite: ação de contato gera lead, não só abre um link.
F30 — ERROS, VAZIOS E DEGRADAÇÃO
Objetivo: estados de erro, vazio, sem permissão, expirado, fora de estoque, fora de agenda.
Aceite: nenhuma tela morta; todo vazio com ação.
F31 — DESIGN SILENCIOSO E PADRONIZADO
Objetivo: aplicar design.md e design system nas páginas de vitrine e detalhe: superfície única, sem card em card, sem grid em grid, raio consistente, badges com significado, zero enfeite.
Aceite: checks de design verdes em todas as páginas tocadas.
F32 — ACESSIBILIDADE E PERFORMANCE DA VITRINE
Objetivo: contraste, foco, teclado, alvo de toque, imagens com dimensão, listas virtualizadas, LCP/INP/CLS dentro do orçamento.
Aceite: métricas dentro do orçamento definido em F06.

BLOCO E — FLUXOS GERADOS E INTEGRAÇÃO (F33 a F40)
F33 — O QUE TODO PEDIDO/RESERVA/AGENDAMENTO GERA
Objetivo: ao comprar, reservar ou agendar, o sistema cria: registro do pedido, título financeiro, documento/contrato quando aplicável, voucher/comprovante, tarefa operacional, evento na timeline, notificação.
Aceite: nenhum registro manual necessário; nada desvinculado do anúncio de origem.
F34 — ORÇAMENTO E PROPOSTA A PARTIR DO ANÚNCIO
Objetivo: anúncio de serviço/pacote gera orçamento com cenários, validade, envio, rastreio de abertura e aceite.
Aceite: proposta aceita cria reserva/pedido sem redigitação.
F35 — ESTOQUE, DISPONIBILIDADE, AGENDA E CAPACIDADE
Objetivo: controle por tipo de anúncio, com trava real na compra.
Aceite: não é possível vender além do disponível.
F36 — FINANCEIRO
Objetivo: títulos, parcelas, PIX, sinal, saldo, conciliação, nota fiscal, estorno, cancelamento.
Aceite: todo valor na tela vem de título, nunca calculado no componente.
F37 — INTEGRAÇÃO COM CRM E KANBAN
Objetivo: anúncio gera lead e card, com vínculo bilateral no perfil do cliente.
Aceite: abrir o card mostra o anúncio de origem; abrir o anúncio mostra as negociações.
F38 — INTEGRAÇÃO COM CONTRATOS, VOUCHERS, EMBARQUE, ENTREGA
Objetivo: cada nicho gera seus documentos e sua operação (turismo: contrato, voucher, embarque; produto: nota, entrega; serviço: ordem de serviço, agenda).
Aceite: nenhum módulo com cópia de dado do anúncio.
F39 — NOTIFICAÇÕES E TIMELINE
Objetivo: timeline única por anúncio, cliente e pedido, alimentada por eventos de domínio.
Aceite: toda ação relevante aparece nas três visões.
F40 — IA QUE CRIA ANÚNCIO
Objetivo: fluxo real e visível: rascunho por IA a partir de texto/foto, revisão humana obrigatória, preenchimento por nicho, sem publicar sem aprovação, com trilha.
Aceite: IA usa os mesmos casos de uso, as mesmas regras e o mesmo schema do editor.

BLOCO F — SEGURANÇA, MCP, BLINDAGEM (F41 a F48)
F41 — RLS E PAPÉIS NO DOMÍNIO DE ANÚNCIOS
Objetivo: dono, gerente, operador, anunciante pessoa; anúncio pertence a pessoa ou organização; nenhuma leitura cruzada; nenhuma edição fora de competência.
Aceite: teste de acesso negado por tabela e por rota.
F42 — MCP E WEBMCP DO DOMÍNIO
Objetivo: criar, editar, publicar, pausar, orçar e comprar por agente, com o mesmo caso de uso e a mesma permissão da UI, com confirmação e idempotência.
Aceite: paridade total: toda ação do editor existe como tool, e toda tool respeita RLS.
F43 — EVALS E OBSERVABILIDADE
Objetivo: casos de sucesso, permissão negada, campo inválido, anúncio expirado, estoque esgotado; medir acerto de fluxo, custo e latência.
Aceite: relatório versionado com taxa de acerto.
F44 — REGRESSÃO VISUAL POR NICHO
Objetivo: screenshots em 320/390/768/1280/1920 para vitrine, detalhe, editor e preview, por nicho, com diff bloqueando merge.
Aceite: nenhuma quebra visual volta.
F45 — CI DO DOMÍNIO
Objetivo: bloquear duplicidade de campo, orfandade de contrato, hardcode, mock, qualquer, ts-ignore e quebra de RLS.
Aceite: PR que reintroduz duplicidade não passa.
F46 — PERFORMANCE E ANTI-JANK DO EDITOR
Objetivo: editor não travar em formulário longo, sem re-render desnecessário, preview sem engasgo, upload com progresso.
Aceite: INP dentro do orçamento com o editor completo aberto.
F47 — MIGRAÇÃO SEM QUEBRAR
Objetivo: anúncios existentes migrados sem perda, com reversão, e a vitrine nunca fora do ar.
Aceite: contagem antes e depois igual; nenhum anúncio perdido ou duplicado.
F48 — CICLO CONTÍNUO POR NICHO
Objetivo: repetir o loop de polimento nicho por nicho até estabilizar, com placar por página e por nicho.
Aceite: uma passagem completa sem achado crítico ou alto.

===========================================
6. REGRA DE TEMPLATES E NICHOS
===========================================
Template não é tema. É a composição: quais seções existem, em que ordem, com quais rótulos e quais campos são obrigatórios.
O sistema só oferece o que é coerente com o nicho e o tipo de anúncio. Turismo não vê template de mercado. Produto físico não vê template de pacote.
Trocar de nicho nunca deve exigir editar componente. Deve mudar o manifesto, a biblioteca semântica e a composição.

===========================================
7. ESPECIFICAÇÃO OBRIGATÓRIA DO PREVIEW
===========================================
P1 Mesma árvore de componentes da página pública. Não existe componente de preview separado.
P2 Dados reais do formulário, refletindo a cada digitação, sem debounce visível.
P3 Dentro de iframe real, isolado de estilo, com a folha de estilo da página pública.
P4 Modos mobile 390, tablet 768 e desktop 1280, com escala proporcional ao container.
P5 Sem corte, sem truncamento de rótulo, sem bloco vazio fixo, sem placeholder permanente.
P6 Sem "0 Inclusos" quando existem inclusos; sem imagem vazia quando há imagem.
P7 Sem qualquer CTA de consumidor dentro do editor.

===========================================
8. GATES
===========================================
G1 Terminado o Bloco A, você PARA e apresenta a matriz de duplicidade e a kill list. Sem aprovação, não altera modelo.
G2 Terminado o Bloco B, você PARA antes de mexer no editor.
G3 Nenhum bloco avança com contrato divergente.
G4 Nenhum bloco avança com duplicidade de campo existente.
G5 Nenhuma fase é declarada concluída sem prova de execução, de contrato e visual.

===========================================
9. SUA PRIMEIRA RESPOSTA DESTE PLANO
===========================================
Sem escrever código:

Confirme ou descarte cada caso da seção 4, com arquivo:linha.
Entregue a matriz de duplicidade com o dono único proposto para cada campo.
Entregue o mapa de fluxos do anúncio, marcando onde está cortado.
Entregue o mapa de contratos com órfãos e divergentes.
Distribua F01 a F48 em ondas, com dependências e critério de pronto.
Encerre com: "Diagnóstico do domínio de anúncios completo. Aguardando GO para o Bloco B."