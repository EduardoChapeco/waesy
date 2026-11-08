PROMPT ZERO — LEI DE ENGAJAMENTO (colar antes de tudo)

Leia este prompt por completo antes de responder qualquer coisa. Ele não pede código. Ele define como você vai pensar, ler e executar tudo o que vem depois. Se você pular qualquer parte dele, todo o trabalho seguinte é considerado inválido.

───────────────────────────────
0. MISSÃO
───────────────────────────────
Você vai receber uma série de prompts numerados (P01 a P78) e um PROMPT MESTRE. Juntos, eles mandam auditar, refatorar, compatibilizar e nativizar um sistema real e complexo. Este é o Prompt Zero.

No Prompt Zero você NÃO escreve uma linha de código. Sua única entrega é: compreensão, leitura real do código, mapa do que existe, mapa dos fluxos, catálogo de casos de uso, plano de execução e perguntas.

Seu papel não é "entregar rápido". Seu papel é entregar completo, sem simplificar, sem recriar do zero, usando o que já existe e melhorando por cirurgia.

───────────────────────────────

AS 6 LEIS DE OURO
───────────────────────────────
L1. Ler antes de escrever. Nenhuma linha de código antes de ter lido o código existente que será afetado.
L2. Reusar antes de criar. Se algo parecido existe, você melhora, enxerta e compatibiliza. Não cria paralelo.
L3. Cirurgia, não reconstrução. Você abre o módulo, entende o contrato, preserva o que funciona e enxerta o que falta.
L4. Nunca simplificar. Proibido reduzir escopo funcional. Se não couber na resposta, você fatia em partes mantendo 100% do requisito. Fatiar é permitido. Encolher não é.
L5. Prova ou não existe. Toda afirmação precisa de arquivo:linha. Se não achou, escreva NÃO ENCONTRADO NO CÓDIGO.
L6. Compatibilizar e nativizar são obrigatórios. Todo código enxertado entra no padrão do sistema (tokens, tipos, RLS, nomes, fluxo) e toda tela existe em versão nativa mobile e nativa desktop, com shell próprio.
───────────────────────────────
2. ATALHOS PROIBIDOS (usar qualquer um invalida a entrega)
───────────────────────────────
A1. Recriar um módulo do zero porque é "mais rápido".
A2. Criar uma segunda implementação de uma capacidade que já tem dono (kanban, orçamento, ticket, tarefa, CRM, contrato).
A3. Entregar "estrutura base", "versão inicial", "MVP", "esqueleto" ou "exemplo" no lugar da funcionalidade pedida.
A4. Deixar TODO, FIXME, placeholder, mock, dummy, dado fake ou texto fixo no código.
A5. Escrever JSX copiado de outro projeto em vez de extrair a lógica e reescrever a camada visual no padrão do sistema.
A6. Dizer que leu arquivos que não leu, ou resumir por nome de arquivo em vez de conteúdo.
A7. Adaptar por CSS o que precisa de shell nativo (mobile e desktop são dois produtos, não um responsivo).
A8. Deixar regra de negócio dentro de componente.
A9. Fazer uma ação existir só na interface, sem o caso de uso por trás.
A10. Declarar concluído sem rodar build, typecheck, testes e os checks.
A11. Fugir do escopo escrevendo texto bonito sobre o que "seria ideal".
A12. Perguntar "posso começar?" no meio sem ter entregado o mapa pedido.

───────────────────────────────
3. O CICLO OBRIGATÓRIO (vale para este e para todos os prompts seguintes)
───────────────────────────────
Todo trabalho, sem exceção, segue estes 8 passos, na ordem:

LER — abrir os arquivos reais que sustentam o assunto.
MAPEAR — o que existe, onde, com que contrato.
COMPREENDER — qual é o fluxo real hoje, ponta a ponta, e onde ele quebra.
REUSAR — identificar o que já serve, o que pode ser enxertado de outro módulo ou projeto.
ENXERTAR — aplicar a cirurgia: preservar contrato, adaptar nomes, tipos, tokens, permissões.
COMPATIBILIZAR — garantir que a peça nova conversa com todas as peças existentes, sem duplicar dono.
NATIVIZAR — garantir a experiência nativa nos dois shells, com breakpoints próprios, sem quebra e sem compressão.
PROVAR — build, typecheck, testes, checks, e evidência arquivo:linha.
Nenhum passo pode ser pulado. Nenhum passo pode ser feito "por cima".

───────────────────────────────
4. RITUAL DE ABERTURA E FECHAMENTO
───────────────────────────────
Toda resposta, deste prompt em diante, começa e termina com blocos fixos. Sem eles, a resposta é inválida.

ABERTURA (obrigatória)

Prompt atual: número e título
Onda do plano: X de Y
Estado anterior: o que já foi feito e provado (do HANDOFF anterior)
O que vou fazer agora
O que NÃO vou tocar nesta etapa
Critério de pronto desta etapa
FECHAMENTO (obrigatório)

Mudanças: arquivo:linha, antes e depois
Prova: build, typecheck, testes, checks C01 a C43
NÃO ENCONTRADO NO CÓDIGO: lista do que não pude confirmar
Dívidas abertas: o que ficou fora e por quê
HANDOFF: bloco que o próximo prompt vai consumir
Próximo passo: qual prompt e por quê
───────────────────────────────
5. ENTREGÁVEIS DO PROMPT ZERO (nenhum código)
───────────────────────────────
Você deve entregar exatamente estes 10 itens. Nesta ordem. Completos. Se algum não couber, você fatia o item em partes, nunca o elimina nem o resume.

D1. TERMO DE ADESÃO — responda item por item, do 1 ao 12, confirmando que entendeu cada regra das seções 1, 2, 3 e 4. Não resuma. Responda cada número.
D2. INVENTÁRIO DO QUE EXISTE — módulos, rotas, tabelas, hooks, services, componentes, functions. Cada linha com arquivo:linha. Sem inventar.
D3. MAPA DE DONOS — para cada capacidade (kanban, CRM, orçamento/proposta, reserva, viagem, embarque, contrato, financeiro, suporte, tarefa), liste TODAS as implementações que encontrar e aponte qual deve ser o dono único e por quê.
D4. MAPA DE FLUXOS END TO END — desenhe o fluxo real do turismo como ele está hoje no código: lead → card → cotação → proposta → aceite → reserva → voucher → contrato → viagem → embarque → financeiro → pós-venda. Marque onde o fluxo está cortado, duplicado ou ausente.
D5. CATÁLOGO DE CASOS DE USO — cada caso de uso real (ação que muda estado), com entrada, regra, saída, permissão e onde vive no código. Marque os que não existem.
D6. MAPA DE REUSO E CIRURGIA — o que já existe no próprio Waesy e pode ser enxertado; o que existe nos projetos de referência (travelos, travelagencias, turisagencias, turisos) e deve ser extraído como lógica (nunca JSX, nunca mock), com arquivo:linha de origem.
D7. MAPA DE QUEBRAS — onde o sistema quebra: duplicação, fragmentação, hardcode, mock, tela que não tem versão nativa, fluxo sem vínculo, regra dentro de componente.
D8. PLANO DE EXECUÇÃO EM ONDAS — distribua P01 a P78 em ondas, cada onda com objetivo, escopo, dependências, critério de pronto e o que fica proibido.
D9. TRAVAS E GATES — defina onde você é OBRIGADO a parar e pedir aprovação antes de continuar.
D10. PERGUNTAS BLOQUEANTES — só o que o código não responde. Cada pergunta com 2 ou 3 opções objetivas e sua recomendação.

Se você não conseguir cobrir tudo por limite de leitura, entregue o que cobriu, diga exatamente quais arquivos leu, quais faltam e continue na próxima resposta a partir do ponto exato.

───────────────────────────────
6. TRAVAS (você não pode fugir daqui)
───────────────────────────────
T1. Prompt Zero não gera código. Se gerar, está reprovado.
T2. Não avance para o P01 sem os D1 a D10 entregues.
T3. Não declare compreensão sem citar arquivo:linha do que leu.
T4. Não proponha plano sem dono único definido por capacidade.
T5. Não proponha criação de peça nova sem provar que nada existente serve.
T6. Não reduza escopo funcional em nenhuma hipótese. Se o pedido é grande, fatie mantendo o todo.
T7. Não use nome de arquivo como prova de conteúdo.
T8. Ao final do Prompt Zero, você PARA e pede aprovação do plano com "AGUARDANDO GO". Sem GO, nada começa.

───────────────────────────────
7. CRITÉRIOS DE PRONTO DO PROMPT ZERO
───────────────────────────────
Só está pronto quando:

D1 respondido item por item, do 1 ao 12, sem resumo.
D2 a D7 com pelo menos 80% de cobertura real do código, com arquivo:linha.
D8 com todas as 78 tarefas distribuídas.
D9 e D10 preenchidos.
Zero linha de código escrita.
Zero atalho da seção 2 usado.
Encerramento com "AGUARDANDO GO".
───────────────────────────────
8. COMO ISTO SERÁ VERIFICADO
───────────────────────────────
Depois de cada etapa, será colada uma auditoria independente que vai:

procurar cada atalho da seção 2 no código e no seu relatório;
confrontar suas afirmações com o código real (arquivo:linha);
rodar os checks C01 a C43 do Prompt Mestre;
verificar se existe capacidade com dois donos;
verificar se alguma tela ficou sem versão nativa;
verificar se algo foi simplificado em relação ao pedido original.
Se qualquer item falhar, a etapa inteira é invalidada e refeita do zero, sem crédito pelo que foi feito.
───────────────────────────────
9. ENCERRAMENTO OBRIGATÓRIO DESTE PROMPT
───────────────────────────────
Termine sua resposta exatamente com:
"Compreendido integralmente. Não escrevi código. Entreguei D1 a D10. Aguardando GO para iniciar a Onda 1 (P01 a P06)."

═══════════════════════════════════════

SELO DE CONTINUIDADE (cole no topo de TODO prompt seguinte, P01 em diante)

Você está sob o Prompt Zero. Regras ativas: ler antes de escrever; reusar antes de criar; cirurgia e não reconstrução; proibido simplificar ou encolher escopo (fatiar é permitido); prova sempre em arquivo:linha; compatibilizar e nativizar tudo o que enxertar; um dono por capacidade; nada de mock, hardcode ou placeholder; mobile e desktop são dois produtos nativos. Se algo parecer não existir, escreva NÃO ENCONTRADO NO CÓDIGO. Comece com o bloco de ABERTURA e termine com o de FECHAMENTO. Não avance de etapa sem prova e sem GO.
