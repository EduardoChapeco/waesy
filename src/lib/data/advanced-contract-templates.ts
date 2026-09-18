/**
 * advanced-contract-templates.ts — Biblioteca Central de Minutas Jurídicas Avançadas
 * Elaborado em estrita consonância com a Legislação Brasileira Vigente (Código Civil,
 * CDC, Lei do Inquilinato 8.245/91, LGPD Lei 13.709/18, CLT/Lei 13.467/17 e ANAC 400).
 */

export interface ContractClause {
  order: number;
  title: string;
  content: string;
  is_mandatory: boolean;
}

export interface ContractVariableDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "currency" | "date" | "document" | "select";
  default_value?: string;
  options?: string[];
}

export interface ContractTemplateDefinition {
  id: string;
  title: string;
  category: string;
  summary: string;
  legal_framework: string;
  variables_schema: ContractVariableDefinition[];
  clauses: ContractClause[];
}

export const ADVANCED_CONTRACT_TEMPLATES: ContractTemplateDefinition[] = [
  // ── 1. PRESTAÇÃO DE SERVIÇOS GERAIS & EMPRESARIAIS ──
  {
    id: "template-prestacao-servicos",
    title: "Contrato de Prestação de Serviços Técnicos e Especializados",
    category: "service_agreement",
    summary: "Minuta avançada para prestação de serviços B2B ou B2C com SLA, confidencialidade, entregáveis e responsabilidade técnica.",
    legal_framework: "Artigos 593 a 609 do Código Civil Brasileiro (Lei nº 10.406/2002) e LGPD (Lei nº 13.709/2018)",
    variables_schema: [
      { key: "contratante_nome", label: "Nome/Razão Social do Contratante", type: "text" },
      { key: "contratante_documento", label: "CPF/CNPJ do Contratante", type: "document" },
      { key: "contratante_endereco", label: "Endereço Completo do Contratante", type: "text" },
      { key: "contratado_nome", label: "Nome/Razão Social do Contratado", type: "text" },
      { key: "contratado_documento", label: "CPF/CNPJ do Contratado", type: "document" },
      { key: "contratado_endereco", label: "Endereço Completo do Contratado", type: "text" },
      { key: "descricao_servicos", label: "Descrição Detalhada do Escopo", type: "text" },
      { key: "valor_total", label: "Valor Total do Contrato", type: "currency" },
      { key: "forma_pagamento", label: "Forma e Condições de Pagamento", type: "text" },
      { key: "prazo_vigencia", label: "Prazo de Execução / Vigência", type: "text" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "São Miguel do Oeste - SC" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO OBJETO",
        content: "O presente instrumento tem por objeto a prestação, pela CONTRATADA ao CONTRATANTE, dos serviços profissionais consistentes em: {{descricao_servicos}}, a serem executados com estrita observância das normas técnicas aplicáveis e boas práticas do setor.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DAS OBRIGAÇÕES DA CONTRATADA",
        content: "A CONTRATADA obriga-se a: a) Executar os serviços contratados com zelo, pontualidade e perícia técnica; b) Fornecer mão de obra qualificada e equipamentos necessários; c) Responder por quaisquer danos causados diretamente ao CONTRATANTE ou a terceiros em razão de dolo ou culpa na execução dos serviços; d) Manter sigilo sobre informações confidenciais do CONTRATANTE.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DAS OBRIGAÇÕES DO CONTRATANTE",
        content: "O CONTRATANTE obriga-se a: a) Fornecer à CONTRATADA todas as informações, acessos e documentos essenciais ao regular cumprimento do objeto; b) Efetuar os pagamentos estipulados na Cláusula Quarta nas datas acordadas; c) Manifestar-se formalmente sobre relatórios ou entregáveis no prazo improrrogável de 5 (cinco) dias úteis.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DO PREÇO E CONDIÇÕES DE PAGAMENTO",
        content: "Pelos serviços pactuados, o CONTRATANTE pagará à CONTRATADA o valor total de {{valor_total}}, a ser liquidado conforme as seguintes condições: {{forma_pagamento}}. O atraso em qualquer pagamento sujeitará o CONTRATANTE a multa moratória de 2% (dois por cento) sobre a parcela em atraso, acrescida de juros de 1% (um por cento) ao mês e correção monetária pelo IPCA/IBGE.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DA VIGÊNCIA E RESCISÃO",
        content: "Este contrato vigorará pelo prazo de {{prazo_vigencia}}. Qualquer das partes poderá rescindi-lo motivadamente em caso de descumprimento contratual mediante notificação prévia de 15 (quinze) dias, aplicando-se multa rescisória compensatória de 10% sobre o saldo remanescente do contrato, sem prejuízo de eventuais perdas e danos comprovados.",
        is_mandatory: true,
      },
      {
        order: 6,
        title: "CLÁUSULA SEXTA — DA PROTEÇÃO DE DADOS (LGPD)",
        content: "As partes comprometem-se a tratar quaisquer dados pessoais aos quais tiverem acesso em estrita conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), adotando medidas de segurança técnicas e administrativas aptas a proteger os dados de acessos não autorizados.",
        is_mandatory: true,
      },
      {
        order: 7,
        title: "CLÁUSULA SÉTIMA — DO FORO DE ELEIÇÃO",
        content: "Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem expressamente o Foro da Comarca de {{foro_cidade}}, com renúncia irrevogável a qualquer outro, por mais privilegiado que seja.",
        is_mandatory: true,
      },
    ],
  },

  // ── 2. MARKETING DE INFLUÊNCIA, GESTÃO DE TRÁFEGO & PUBLICIDADE DIGITAL ──
  {
    id: "template-marketing-influenciador",
    title: "Contrato de Parceria Publicitária, Direitos de Imagem & Marketing Digital",
    category: "general_deal",
    summary: "Regulamenta ações de influenciadores, creators, criadores de conteúdo e agências de marketing, com licenciamento de imagem e métricas.",
    legal_framework: "Artigos 421 e seguintes do Código Civil, Código de Autorregulamentação Publicitária (CONAR) e LGPD",
    variables_schema: [
      { key: "anunciante_nome", label: "Razão Social do Anunciante/Marca", type: "text" },
      { key: "anunciante_documento", label: "CNPJ do Anunciante", type: "document" },
      { key: "creator_nome", label: "Nome Civil / Artístico do Criador(a)", type: "text" },
      { key: "creator_documento", label: "CPF/CNPJ do Criador", type: "document" },
      { key: "creator_redes", label: "Perfis Oficiais (ex: @perfil no Instagram/TikTok)", type: "text" },
      { key: "entregaveis", label: "Entregáveis (ex: 2 Reels + 6 Stories com Link)", type: "text" },
      { key: "cache_total", label: "Valor do Cachê / Remuneração", type: "currency" },
      { key: "prazo_exclusividade", label: "Prazo de Licenciamento de Imagem (dias/meses)", type: "text" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "São Paulo - SP" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO OBJETO E ENTREGÁVEIS",
        content: "O presente contrato tem por objeto a contratação do(a) CRIADOR(A) para realização de campanhas publicitárias e veiculação de conteúdos institucionais da MARCA em seus canais oficiais digitais ({{creator_redes}}), compreendendo: {{entregaveis}}.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA APROVAÇÃO PRÉVIA E CONAR",
        content: "Todos os conteúdos a serem postados deverão ser submetidos à prévia e formal aprovação da MARCA com antecedência mínima de 48 (quarenta e oito) horas. O(A) CRIADOR(A) obriga-se a sinalizar claramente a postagem como '#publicidade' ou 'Parceria Paga', em cumprimento às diretrizes do CONAR e do Código de Defesa do Consumidor.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DO LICENCIAMENTO DE IMAGEM, VOZ E NOME",
        content: "O(A) CRIADOR(A) cede e licencia à MARCA, a título oneroso e pelo período de {{prazo_exclusividade}}, o direito de uso de sua imagem, voz, nome e das publicações contratadas, exclusivamente para anúncios patrocinados (Dark Posts / Ads) e repostagens nos canais oficiais da MARCA.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DA CLÁUSULA MORAL E DE CONDUTA",
        content: "O(A) CRIADOR(A) compromete-se a não emitir declarações públicas ou se envolver em polêmicas, ilícitos ou manifestações de ódio, racismo, preconceito ou fake news que possam direta ou indiretamente depreciar a reputação da MARCA. A infração a este dever autoriza a rescisão imediata do contrato, com restituição proporcional do cachê e multa de 30%.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DA REMUNERAÇÃO",
        content: "Pela realização integral dos serviços e cessão de direitos aqui pactuados, a MARCA pagará ao(à) CRIADOR(A) o valor líquido de {{cache_total}}, mediante apresentação da correspondente Nota Fiscal e relatório comprobatório de postagem (print com métricas de alcance).",
        is_mandatory: true,
      },
      {
        order: 6,
        title: "CLÁUSULA SEXTA — DO FORO",
        content: "Fica eleito o Foro da Comarca de {{foro_cidade}} para dirimir quaisquer litígios decorrentes deste ajuste.",
        is_mandatory: true,
      },
    ],
  },

  // ── 3. PERMUTA COMERCIAL / BARTER ──
  {
    id: "template-permuta-comercial",
    title: "Contrato de Permuta Mercantil de Bens e Prestação Recíproca de Serviços",
    category: "general_deal",
    summary: "Instrumento legal para troca de mercadorias, espaços publicitários ou serviços entre empresas sem desembolso financeiro imediato.",
    legal_framework: "Artigo 533 do Código Civil Brasileiro (Lei nº 10.406/2002)",
    variables_schema: [
      { key: "primeiro_permutante", label: "Primeiro Permutante (Nome/Razão Social)", type: "text" },
      { key: "primeiro_permutante_doc", label: "CPF/CNPJ do Primeiro Permutante", type: "document" },
      { key: "segundo_permutante", label: "Segundo Permutante (Nome/Razão Social)", type: "text" },
      { key: "segundo_permutante_doc", label: "CPF/CNPJ do Segundo Permutante", type: "document" },
      { key: "objeto_primeiro", label: "Bens/Serviços entregues pelo Primeiro Permutante", type: "text" },
      { key: "objeto_segundo", label: "Bens/Serviços entregues pelo Segundo Permutante", type: "text" },
      { key: "valor_equivalencia", label: "Valor Econômico de Equivalência (R$)", type: "currency" },
      { key: "prazo_execucao", label: "Prazos de Cumprimento Mútuo", type: "text" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "Chapecó - SC" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO OBJETO DA PERMUTA",
        content: "Constitui objeto deste contrato a troca (permuta recíproca) de bens e/ou serviços entre as partes, onde o PRIMEIRO PERMUTANTE fornecerá: {{objeto_primeiro}}; e o SEGUNDO PERMUTANTE fornecerá em contrapartida: {{objeto_segundo}}.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA EQUIVALÊNCIA ECONÔMICA E AUSÊNCIA DE TORNA",
        content: "As partes reconhecem expressamente que os bens e serviços permutados possuem valor de mercado rigorosamente equivalente, avaliados em {{valor_equivalencia}}, razão pela qual inexiste qualquer obrigação de torna, compensação financeira complementar ou restituição monetária entre os pactuantes.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DOS PRAZOS E DA ENTREGA",
        content: "O cumprimento das obrigações recíprocas dar-se-á nos seguintes termos e prazos: {{prazo_execucao}}. A parte que incorrer em mora imotivada será constituída de pleno direito mediante notificação, ficando sujeita a indenizar a outra parte no valor correspondente ao bem ou serviço inadimplido.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DA QUITAÇÃO RECÍPROCA",
        content: "Concluída a entrega e aceite formal dos bens e serviços discriminados nas cláusulas anteriores, as partes outorgarão mútua, plena, geral e irrevogável quitação de todas as obrigações pactuadas, nada mais tendo a reclamar a qualquer título.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DO FORO",
        content: "As partes elegem o Foro da Comarca de {{foro_cidade}} para dirimir qualquer dúvida ou litígio decorrente deste contrato.",
        is_mandatory: true,
      },
    ],
  },

  // ── 4. COMPRA E VENDA MERCANTIL DE PRODUTOS & FORNECIMENTO ──
  {
    id: "template-compra-venda-mercantil",
    title: "Contrato de Compra, Venda Mercantil & Fornecimento de Mercadorias",
    category: "general_deal",
    summary: "Minuta para venda e remessa de produtos entre fabricantes, distribuidores e lojistas com garantia de entrega e vícios redibitórios.",
    legal_framework: "Artigos 481 a 532 do Código Civil Brasileiro e Código de Defesa do Consumidor",
    variables_schema: [
      { key: "vendedor_nome", label: "Razão Social da Vendedora", type: "text" },
      { key: "vendedor_documento", label: "CNPJ da Vendedora", type: "document" },
      { key: "comprador_nome", label: "Razão Social / Nome do Comprador", type: "text" },
      { key: "comprador_documento", label: "CNPJ/CPF do Comprador", type: "document" },
      { key: "produtos_descricao", label: "Relação de Mercadorias / Lote / Quantidade", type: "text" },
      { key: "valor_total", label: "Valor Total da Compra", type: "currency" },
      { key: "modalidade_frete", label: "Modalidade de Frete (FOB ou CIF)", type: "select", options: ["CIF (Frete pago pelo Vendedor)", "FOB (Frete pago pelo Comprador)"] },
      { key: "prazo_entrega", label: "Prazo de Remessa e Entrega", type: "text" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "Florianópolis - SC" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO OBJETO E ESPECIFICAÇÕES",
        content: "A VENDEDORA compromete-se a vender e entregar ao COMPRADOR as seguintes mercadorias e produtos: {{produtos_descricao}}, em perfeitas condições de uso, acondicionamento e conformidade técnica.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DO PREÇO E FATURAMENTO",
        content: "O preço total das mercadorias é de {{valor_total}}, acompanhado da competente Nota Fiscal Eletrônica (NF-e) com destaque regular dos tributos incidentes (ICMS, IPI, PIS/COFINS e regimes de substituição tributária aplicáveis).",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DO TRANSPORTE E RISCOS DA COISA",
        content: "O transporte das mercadorias obedecerá à modalidade: {{modalidade_frete}}. Na modalidade CIF, o risco do transporte corre por conta da VENDEDORA até a efetiva entrega; na modalidade FOB, o risco e despesas de frete transferem-se ao COMPRADOR a partir do carregamento na origem.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DA INSPEÇÃO E GARANTIA",
        content: "O COMPRADOR terá o prazo de 7 (sete) dias úteis a contar do recebimento para inspecionar os lotes e acusar eventuais avarias visíveis ou faltas quantitativas. A garantia legal para vícios ocultos reger-se-á pelos prazos do Art. 445 do Código Civil e Art. 26 do CDC.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DO FORO",
        content: "Fica eleito o Foro da Comarca de {{foro_cidade}} para a resolução judicial de quaisquer divergências.",
        is_mandatory: true,
      },
    ],
  },

  // ── 5. LOCAÇÃO RESIDENCIAL & COMERCIAL (LEI 8.245/91) ──
  {
    id: "template-locacao-imobiliaria",
    title: "Contrato de Locação de Imóvel Residencial / Comercial",
    category: "real_estate_rental",
    summary: "Minuta completa e rigorosa baseada na Lei do Inquilinato nº 8.245/91, com caução, fiador, encargos e vistoria.",
    legal_framework: "Lei Federal nº 8.245/1991 (Lei do Inquilinato) e Código Civil",
    variables_schema: [
      { key: "locador_nome", label: "Nome do Locador(a) / Proprietário", type: "text" },
      { key: "locador_documento", label: "CPF/CNPJ do Locador", type: "document" },
      { key: "locatario_nome", label: "Nome do Locatário(a) / Inquilino", type: "text" },
      { key: "locatario_documento", label: "CPF/CNPJ do Locatário", type: "document" },
      { key: "imovel_endereco", label: "Endereço Completo do Imóvel", type: "text" },
      { key: "aluguel_mensal", label: "Valor do Aluguel Mensal", type: "currency" },
      { key: "data_vencimento", label: "Dia de Vencimento do Aluguel", type: "text", default_value: "Dia 10 de cada mês" },
      { key: "modalidade_garantia", label: "Garantia Locatícia (Caução, Fiador ou Seguro)", type: "text" },
      { key: "prazo_meses", label: "Prazo da Locação (em meses)", type: "text", default_value: "30 meses" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "São Miguel do Oeste - SC" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO IMÓVEL E DESTINAÇÃO",
        content: "O LOCADOR cede em locação ao LOCATÁRIO o imóvel de sua propriedade situado em: {{imovel_endereco}}, com todas as instalações descritas no Termo de Vistoria Inicial anexo, destinando-se exclusivamente ao uso residencial/comercial pactuado.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DO PRAZO",
        content: "A presente locação é celebrada pelo prazo determinado de {{prazo_meses}}, iniciando-se na data de assinatura deste instrumento e término de pleno direito na data aprazada, independentemente de aviso prévio ou notificação.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DO ALUGUEL E ENCARGOS",
        content: "O aluguel mensal inicial é de {{aluguel_mensal}}, devendo ser pago impreterivelmente até o {{data_vencimento}}. Além do aluguel, correrão por conta do LOCATÁRIO os encargos de condomínio, taxa de lixo, IPTU proporcional e consumos de água, esgoto, energia elétrica e gás.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DA GARANTIA LOCATÍCIA",
        content: "Para garantia do fiel cumprimento das obrigações contratuais, é adotada a seguinte modalidade: {{modalidade_garantia}}, em estrita observância ao Artigo 37 da Lei nº 8.245/1991, sendo vedada a exigência de mais de uma modalidade de garantia.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DA VISTORIA E CONSERVAÇÃO",
        content: "O LOCATÁRIO declara receber o imóvel no estado descrito no Laudo de Vistoria de Entrada, comprometendo-se a mantê-lo em perfeito estado de conservação, higiene e segurança, restituindo-o pintado e limpo ao término da locação.",
        is_mandatory: true,
      },
      {
        order: 6,
        title: "CLÁUSULA SEXTA — DO FORO",
        content: "Para dirimir controvérsias decorrentes deste pacto locatício, as partes elegem o Foro da Comarca de localização do imóvel: {{foro_cidade}}.",
        is_mandatory: true,
      },
    ],
  },

  // ── 6. ASSESSORIA EMPRESARIAL, CONSULTORIA & PARCERIA ESTRATÉGICA ──
  {
    id: "template-assessoria-consultoria",
    title: "Contrato de Assessoria Empresarial, Consultoria Estratégica & Assessoramento",
    category: "service_agreement",
    summary: "Minuta de alta governança corporativa para consultores, assessores jurídicos/financeiros, com cláusulas de NDA e não-aliciamento.",
    legal_framework: "Código Civil Brasileiro e Lei de Propriedade Industrial (Lei nº 9.279/1996)",
    variables_schema: [
      { key: "contratante_nome", label: "Razão Social da Contratante", type: "text" },
      { key: "contratante_documento", label: "CNPJ da Contratante", type: "document" },
      { key: "consultor_nome", label: "Razão Social / Nome da Assessoria/Consultoria", type: "text" },
      { key: "consultor_documento", label: "CNPJ/CPF da Consultoria", type: "document" },
      { key: "area_assessoria", label: "Área de Atuação (Estratégica, Financeira, Gestão)", type: "text" },
      { key: "honorarios_mensais", label: "Honorários Mensais / Retainer", type: "currency" },
      { key: "success_fee", label: "Taxa de Sucesso / Success Fee (se houver)", type: "text", default_value: "Não aplicável ou conforme anexo" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "Curitiba - PR" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO ESCOPO DE ASSESSORAMENTO",
        content: "A ASSESSORIA prestará à CONTRATANTE serviços de consultoria especializada na área de: {{area_assessoria}}, englobando diagnósticos organizacionais, análise de processos, emissão de pareceres executivos e assessoramento em tomada de decisões de gestão.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA CONFIDENCIALIDADE RIGOROSA (NON-DISCLOSURE)",
        content: "A ASSESSORIA obriga-se a guardar absoluto e irrevogável sigilo a respeito de quaisquer segredos industriais, dados contábeis, planos de negócios, códigos-fonte e carteiras de clientes da CONTRATANTE, vigendo o dever de sigilo durante todo o contrato e por 5 (cinco) anos após o seu término.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DOS HONORÁRIOS E DESPESAS",
        content: "Como contraprestação, a CONTRATANTE pagará os honorários mensais fixos de {{honorarios_mensais}}, além do eventual success fee estipulado: {{success_fee}}. Despesas de deslocamento, hospedagem e alimentação previamente autorizadas serão reembolsadas mediante comprovação.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DA NÃO EXCLUSIVIDADE E AUTONOMIA",
        content: "O presente contrato não estabelece exclusividade, podendo a ASSESSORIA prestar serviços a outras empresas, desde que não concorrentes diretas da CONTRATANTE no mesmo segmento de atuação.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DO FORO",
        content: "Elegem as partes o Foro da Comarca de {{foro_cidade}} para solucionar eventuais conflitos oriundos deste contrato.",
        is_mandatory: true,
      },
    ],
  },

  // ── 7. PRESTAÇÃO DE SERVIÇOS AUTÔNOMOS / PJ (LEI 13.467/17 - REFORMA TRABALHISTA) ──
  {
    id: "template-prestacao-pj-autonomo",
    title: "Contrato de Prestação de Serviços por Pessoa Jurídica (PJ) / Autônomo",
    category: "employment",
    summary: "Blindagem jurídica contra riscos de vínculo de emprego conforme Artigo 442-B da CLT, garantindo autonomia e ausência de subordinação.",
    legal_framework: "Artigo 442-B da Consolidação das Leis do Trabalho (Lei nº 13.467/2017) e Código Civil",
    variables_schema: [
      { key: "tomador_nome", label: "Razão Social da Empresa Tomadora", type: "text" },
      { key: "tomador_documento", label: "CNPJ da Tomadora", type: "document" },
      { key: "prestador_pj_nome", label: "Razão Social da PJ Prestadora", type: "text" },
      { key: "prestador_pj_documento", label: "CNPJ da Prestadora", type: "document" },
      { key: "servicos_especializados", label: "Serviços Especializados Contratados", type: "text" },
      { key: "remuneracao_mensal", label: "Remuneração Mensal Acordada", type: "currency" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "São Paulo - SP" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DA NATUREZA EMINENTEMENTE CIVIL",
        content: "O presente contrato rege-se pelas normas de Direito Civil e Comercial, inexistindo entre a TOMADORA e a PRESTADORA ou seus sócios qualquer relação de subordinação jurídica, pessoalidade mandatória, horário rígido de trabalho ou dependência econômica, nos termos do Art. 442-B da CLT.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA AUTONOMIA NA EXECUÇÃO DOS SERVIÇOS",
        content: "A PRESTADORA executará os serviços de: {{servicos_especializados}}, com total independência técnica e autonomia na fixação de sua rotina de trabalho e métodos, respondendo exclusivamente pelos resultados e entregáveis pactuados.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DA REMUNERAÇÃO E EMISSÃO DE NOTA FISCAL",
        content: "Pelos serviços autônomos, a TOMADORA pagará à PRESTADORA o valor de {{remuneracao_mensal}}, mediante o envio e validação da correspondente Nota Fiscal de Serviços Eletrônica (NFS-e), incidindo as retenções tributárias devidas por lei.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DOS ENCARGOS TRIBUTÁRIOS E PREVIDENCIÁRIOS",
        content: "É de responsabilidade exclusiva da PRESTADORA o recolhimento de todos os impostos, contribuições e encargos sociais de sua equipe ou sócios (IRPJ, CSLL, PIS, COFINS, ISSQN e recolhimentos previdenciários de pró-labore).",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DO FORO",
        content: "As partes elegem o Foro da Comarca de {{foro_cidade}} para quaisquer litígios civis decorrentes desta contratação.",
        is_mandatory: true,
      },
    ],
  },

  // ── 8. TURISMO, VIAGENS & PACOTES (CADASTUR & ANAC 400) ──
  {
    id: "template-turismo-pacote-viagem",
    title: "Contrato de Prestação de Serviços de Turismo, Intermediação de Viagens e Hospedagem",
    category: "tourism_package",
    summary: "Minuta em conformidade estrita com Embratur, CADASTUR, Código de Defesa do Consumidor e Resolução ANAC 400.",
    legal_framework: "Lei Geral do Turismo (Lei nº 11.771/2008), Resolução ANAC nº 400 e CDC (Lei nº 8.078/1990)",
    variables_schema: [
      { key: "agencia_nome", label: "Nome/Razão Social da Agência de Viagens", type: "text" },
      { key: "agencia_documento", label: "CNPJ e CADASTUR da Agência", type: "text" },
      { key: "cliente_nome", label: "Nome Completo do Contratante / Passageiro", type: "text" },
      { key: "cliente_documento", label: "CPF e RG do Contratante", type: "text" },
      { key: "destino_roteiro", label: "Destino, Hotel e Itinerário Contratado", type: "text" },
      { key: "data_embarque", label: "Data Prevista de Embarque e Retorno", type: "text" },
      { key: "valor_total_pacote", label: "Valor Total do Pacote / Proposta", type: "currency" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "São Miguel do Oeste - SC" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO OBJETO E INTERMEDIAÇÃO TURÍSTICA",
        content: "A AGÊNCIA compromete-se a intermediar a prestação dos serviços turísticos contratados pelo PASSAGEIRO, consistentes em passagens aéreas/rodoviárias, reservas hoteleiras, passeios e traslados conforme especificado no voucher anexo: {{destino_roteiro}}.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA RESPONSABILIDADE SOLIDÁRIA E FORNECEDORES",
        content: "A AGÊNCIA atua como intermediária qualificada entre o PASSAGEIRO e os fornecedores finais (companhias aéreas, redes hoteleiras e transportadoras). Questões relativas a atrasos, cancelamentos de voos e reacomodação regem-se estritamente pela Resolução ANAC nº 400/2016.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DO PREÇO E CANCELAMENTOS",
        content: "O valor total do pacote contratado é de {{valor_total_pacote}}. Em caso de desistência imotivada pelo PASSAGEIRO, as multas compensatórias e taxas de remarcação obedecerão aos regulamentos tarifários específicos de cada fornecedor e às diretrizes da Deliberação Normativa Embratur nº 161/1985.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DA DOCUMENTAÇÃO DE VIAGEM E NO-SHOW",
        content: "É dever exclusivo do PASSAGEIRO portar documento oficial de identidade válido com foto (RG emitido há menos de 10 anos ou Passaporte com visto consular para viagens internacionais). O não comparecimento ao embarque (no-show) por falta de documento acarreta a perda integral da tarifa.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DO FORO",
        content: "Fica eleito o Foro da Comarca do domicílio do consumidor: {{foro_cidade}}.",
        is_mandatory: true,
      },
    ],
  },

  // ── 9. COMPRA, VENDA & CONSIGNAÇÃO DE VEÍCULOS AUTOMOTORES ──
  {
    id: "template-compra-venda-veiculo",
    title: "Contrato de Compra, Venda & Garantia de Veículo Automotor",
    category: "vehicle_sale",
    summary: "Minuta para transações de automóveis e motocicletas com ateste de quilometragem, histórico de multas e garantia mecânica legal de 90 dias.",
    legal_framework: "Código Civil Brasileiro e Código de Defesa do Consumidor (Artigo 26)",
    variables_schema: [
      { key: "vendedor_nome", label: "Nome/Razão Social do Vendedor", type: "text" },
      { key: "vendedor_documento", label: "CPF/CNPJ do Vendedor", type: "document" },
      { key: "comprador_nome", label: "Nome do Comprador", type: "text" },
      { key: "comprador_documento", label: "CPF/CNPJ do Comprador", type: "document" },
      { key: "veiculo_dados", label: "Marca, Modelo, Ano, Placa e Chassi", type: "text" },
      { key: "quilometragem_atual", label: "Quilometragem Registrada no Hodômetro", type: "text" },
      { key: "preco_veiculo", label: "Valor da Venda", type: "currency" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "Chapecó - SC" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DA IDENTIFICAÇÃO DO VEÍCULO",
        content: "O VENDEDOR declara ser legítimo proprietário do veículo automotor caracterizado por: {{veiculo_dados}}, encontrando-se com a quilometragem apurada de {{quilometragem_atual}}, livre e desembaraçado de ônus judiciais ou gravames financeiros não informados.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DO PREÇO E FORMA DE PAGAMENTO",
        content: "A presente venda é ajustada pelo valor certo e líquido de {{preco_veiculo}}, cujo pagamento efetivar-se-á mediante quitação integral antes da tradição e liberação do Certificado de Registro de Veículo (CRV/ATPV-e).",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DOS DÉBITOS, MULTAS E TRANSFERÊNCIA",
        content: "O VENDEDOR responde por quaisquer débitos tributários (IPVA, licenciamento), multas de trânsito e pontuações na CNH ocorridas até a data e hora da efetiva entrega do veículo. A partir da entrega, o COMPRADOR obriga-se a transferir a propriedade junto ao DETRAN no prazo improrrogável de 30 (trinta) dias.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DA GARANTIA LEGAL DE MOTOR E CÂMBIO",
        content: "Nas vendas realizadas por estabelecimento comercial, incide a garantia legal de 90 (noventa) dias para motor e câmbio nos termos do Art. 26 do CDC, mediante manutenção preventiva adequada pelo COMPRADOR.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DO FORO",
        content: "Para todas as questões resultantes deste contrato, fica eleito o Foro da Comarca de {{foro_cidade}}.",
        is_mandatory: true,
      },
    ],
  },
  // ── 10. INTERMEDIAÇÃO & CORRETAGEM IMOBILIÁRIA (CRECI) ──
  {
    id: "template-corretagem-imobiliaria",
    title: "Contrato de Prestação de Serviços de Corretagem Imobiliária",
    category: "service_agreement",
    summary: "Minuta para imobiliárias e corretores credenciados ao CRECI regulando exclusividade de venda, honorários e due diligence do imóvel.",
    legal_framework: "Artigos 722 a 729 do Código Civil Brasileiro e Lei Federal nº 6.530/1978 (Regulamentação da Profissão de Corretor de Imóveis)",
    variables_schema: [
      { key: "proprietario_nome", label: "Nome do Proprietário", type: "text" },
      { key: "proprietario_documento", label: "CPF/CNPJ do Proprietário", type: "document" },
      { key: "corretor_nome", label: "Nome do Corretor / Razão Social Imobiliária", type: "text" },
      { key: "corretor_creci", label: "Número de Registro CRECI", type: "text" },
      { key: "imovel_descricao", label: "Endereço, Matrícula e Descrição do Imóvel", type: "text" },
      { key: "valor_venda_pretendido", label: "Preço de Venda Autorizado", type: "currency" },
      { key: "comissao_percentual", label: "Percentual de Comissão de Corretagem (%)", type: "number", default_value: "6" },
      { key: "prazo_exclusividade_dias", label: "Prazo de Autorização (dias)", type: "number", default_value: "180" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "Florianópolis - SC" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO OBJETO E AUTORIZAÇÃO DE VENDA",
        content: "O PROPRIETÁRIO autoriza expressamente o CORRETOR DE IMÓVEIS (CRECI nº {{corretor_creci}}) a promover, intermediar e anunciar a venda do imóvel situado em {{imovel_descricao}}, pelo preço base estipulado de {{valor_venda_pretendido}}.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA COMISSÃO DE CORRETAGEM",
        content: "Concluída a transação por força da aproximação útil das partes, o PROPRIETÁRIO pagará ao CORRETOR a comissão de {{comissao_percentual}}% calculada sobre o valor total pactuado no negócio, nos termos do Art. 725 do Código Civil.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DO PRAZO E CONDUTA ÉTICA",
        content: "A presente autorização vigorará pelo prazo de {{prazo_exclusividade_dias}} dias. O CORRETOR obriga-se a prestar aos interessados informações verídicas sobre as certidões e estado documental do imóvel.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DO FORO",
        content: "Fica eleito o foro da Comarca de {{foro_cidade}} para dirimir quaisquer dúvidas oriundas deste ajuste.",
        is_mandatory: true,
      },
    ],
  },
  // ── 11. TRANSPORTE RODOVIÁRIO DE PASSAGEIROS & EXCURSÕES (ANTT) ──
  {
    id: "template-transporte-excursao-antt",
    title: "Contrato de Fretamento Rodoviário de Passageiros e Turismo",
    category: "tourism_package",
    summary: "Minuta de fretamento eventual de ônibus ou vans de turismo em conformidade com as exigências da ANTT, lista de passageiros e seguro de viagem.",
    legal_framework: "Resoluções da ANTT nº 4.770/2015 e Lei Federal nº 11.771/2008 (Política Nacional de Turismo)",
    variables_schema: [
      { key: "contratante_nome", label: "Nome do Contratante / Responsável pelo Grupo", type: "text" },
      { key: "contratante_documento", label: "CPF/CNPJ do Contratante", type: "document" },
      { key: "transportadora_nome", label: "Razão Social da Empresa de Transporte", type: "text" },
      { key: "antt_registro", label: "Número do Certificado ANTT / CADASTUR", type: "text" },
      { key: "itinerario_detalhes", label: "Origem, Paradas e Destino Final", type: "text" },
      { key: "veiculo_tipo", label: "Tipo do Veículo (ex: Ônibus Leito Double Decker 44 Lugares)", type: "text" },
      { key: "valor_fretamento", label: "Valor Total do Fretamento", type: "currency" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "Chapecó - SC" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO VEÍCULO E SERVIÇO DE FRETAMENTO",
        content: "A TRANSPORTADORA, devidamente cadastrada junto à ANTT sob o registro {{antt_registro}}, obriga-se a realizar o transporte rodoviário em circuito fechado no veículo tipo {{veiculo_tipo}}, com saída e destino discriminados em: {{itinerario_detalhes}}.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA LISTAGEM DE PASSAGEIROS E SEGURO",
        content: "O CONTRATANTE fornecerá a lista oficial de passageiros completa (nome, CPF, RG e órgão emissor) com antecedência mínima de 48 horas da viagem para emissão da licença de viagem da ANTT. A viagem conta com seguro obrigatório de responsabilidade civil (RCO).",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DO PREÇO E COMBUSTÍVEL",
        content: "O fretamento é ajustado no valor de {{valor_fretamento}}, inclusos motoristas profissionais com cursos regulamentados pelo CONTRAN, pedágios, taxas e combustível para a rota acordada.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DO FORO",
        content: "As partes elegem o Foro da Comarca de {{foro_cidade}} para solução de controvérsias decorrentes deste contrato.",
        is_mandatory: true,
      },
    ],
  },
  // ── 12. LOCAÇÃO E FRETAMENTO DE VEÍCULOS / RENT A CAR ──
  {
    id: "template-locacao-veiculo-rentacar",
    title: "Contrato de Locação de Veículo Automotor sem Motorista",
    category: "vehicle_sale",
    summary: "Minuta de locação de frota ou veículo individual com franquia de seguro, vistoria de entrega, caução e responsabilidade por multas de trânsito.",
    legal_framework: "Artigos 565 a 578 do Código Civil Brasileiro e Súmula 492 do STF",
    variables_schema: [
      { key: "locadora_nome", label: "Razão Social da Locadora", type: "text" },
      { key: "locatario_nome", label: "Nome do Locatário / Condutor", type: "text" },
      { key: "locatario_cnh", label: "Número e Validade da CNH do Condutor", type: "text" },
      { key: "veiculo_modelo_placa", label: "Modelo, Ano e Placa do Veículo Locado", type: "text" },
      { key: "diaria_valor", label: "Valor da Diária / Período", type: "currency" },
      { key: "franquia_seguro", label: "Valor da Coparticipação / Franquia de Sinistro", type: "currency" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "São Paulo - SP" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO OBJETO E CONDUTOR AUTORIZADO",
        content: "A LOCADORA cede em locação temporária ao LOCATÁRIO o veículo automotor {{veiculo_modelo_placa}}, o qual somente poderá ser conduzido pelo LOCATÁRIO ou condutores previamente registrados portadores de CNH válida nº {{locatario_cnh}}.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA RESPONSABILIDADE POR MULTAS E INFRAÇÕES",
        content: "O LOCATÁRIO assume total e irrestrita responsabilidade administrativa, civil e pecuniária por todas as infrações de trânsito cometidas durante o período da locação, autorizando a cobrança dos valores e pontuação em sua CNH.",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DO SEGURO E COBERTURAS",
        content: "Em caso de colisão, furto ou roubo, o LOCATÁRIO responderá pelo pagamento da coparticipação/franquia estipulada em {{franquia_seguro}}, desde que não incorra em dolo ou embriaguez ao volante.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DO FORO",
        content: "Para dirimir controvérsias deste instrumento, fica eleito o Foro da Comarca de {{foro_cidade}}.",
        is_mandatory: true,
      },
    ],
  },
  // ── 13. DESENVOLVIMENTO DE SOFTWARE & SLA TECNOLÓGICO ──
  {
    id: "template-desenvolvimento-software-sla",
    title: "Contrato de Desenvolvimento de Software, Cessão de Direitos e SLA",
    category: "service_agreement",
    summary: "Minuta avançada de engenharia de software contendo cronograma de sprints, critérios de aceite, segurança da informação, código-fonte e SLA de uptime.",
    legal_framework: "Lei do Software nº 9.609/1998, Lei de Direitos Autorais nº 9.610/1998 e LGPD nº 13.709/2018",
    variables_schema: [
      { key: "contratante_nome", label: "Razão Social da Contratante", type: "text" },
      { key: "contratado_dev", label: "Razão Social da Software House / Desenvolvedor", type: "text" },
      { key: "projeto_nome", label: "Nome e Descrição Técnica do Projeto", type: "text" },
      { key: "valor_projeto", label: "Investimento Total do Projeto", type: "currency" },
      { key: "sla_uptime", label: "Disponibilidade Mínima de SLA (%)", type: "number", default_value: "99.5" },
      { key: "foro_cidade", label: "Comarca de Eleição do Foro", type: "text", default_value: "São Paulo - SP" },
    ],
    clauses: [
      {
        order: 1,
        title: "CLÁUSULA PRIMEIRA — DO ESCOPO DE DESENVOLVIMENTO",
        content: "A CONTRATADA compromete-se a desenvolver a solução tecnológica denominada {{projeto_nome}}, em conformidade com as especificações arquiteturais, APIs e wireframes aprovados em backlog.",
        is_mandatory: true,
      },
      {
        order: 2,
        title: "CLÁUSULA SEGUNDA — DA PROPRIEDADE INTELECTUAL E CÓDIGO-FONTE",
        content: "Mediante a quitação integral das faturas pactuadas no valor de {{valor_projeto}}, a CONTRATADA cede à CONTRATANTE os direitos patrimoniais de uso e exploração econômica do código-fonte desenvolvido, ressalvadas bibliotecas de terceiros sob licenças de código aberto (MIT/Apache).",
        is_mandatory: true,
      },
      {
        order: 3,
        title: "CLÁUSULA TERCEIRA — DO ACORDO DE NÍVEL DE SERVIÇO (SLA)",
        content: "Durante o período de sustentação em produção, a infraestrutura manterá disponibilidade mensal mínima de {{sla_uptime}}% de uptime, com tempo de resposta para incidentes críticos não superior a 2 (duas) horas corridas.",
        is_mandatory: true,
      },
      {
        order: 4,
        title: "CLÁUSULA QUARTA — DA CONFIDENCIALIDADE E LGPD",
        content: "As partes obrigam-se a tratar dados pessoais de usuários com estrita observância à Lei nº 13.709/2018 (LGPD), vedado o compartilhamento ou uso de base de clientes para finalidades estranhas ao contrato.",
        is_mandatory: true,
      },
      {
        order: 5,
        title: "CLÁUSULA QUINTA — DO FORO",
        content: "Fica eleito o Foro da Comarca de {{foro_cidade}} para dirimir quaisquer disputas resultantes deste contrato.",
        is_mandatory: true,
      },
    ],
  },
];
