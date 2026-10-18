/**
 * templates.ts — Matriz Canônica de Templates por Nicho (The Niche Template Matrix)
 * Onboarding instantâneo: o usuário NUNCA começa com uma tela em branco.
 */

import type { OmniBlockInstance, OmniPageDocument } from "@/types/omni-builder";

export interface NicheTemplateDefinition {
  id: string;
  name: string;
  niche: string;
  description: string;
  badge: string;
  blocks: Omit<OmniBlockInstance, "id">[];
}

export const NICHE_TEMPLATE_MATRIX: NicheTemplateDefinition[] = [
  // 1. ADVOCACIA & JURÍDICO (LEGAL JUS)
  {
    id: "template_legal_jus",
    name: "Advocacia & Jurídico",
    niche: "legal",
    description: "Design sóbrio para escritórios de advocacia, consultores e assessores.",
    badge: "Jurídico",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "SOCIEDADE DE ADVOGADOS • OAB/SP 12.345",
          title: "Defesa estratégica de direitos com rigor técnico e discrição absoluta.",
          subtitle: "Atuação consultiva e contenciosa especializada em Direito Civil, Empresarial e Tributário para pessoas físicas e jurídicas.",
          primaryCta: {
            label: "Agendar Consulta",
            href: "#contato",
          },
          secondaryCta: {
            label: "Áreas de Atuação",
            href: "#areas",
          },
          floatingStat: {
            label: "SEGURANÇA JURÍDICA",
            value: "20+ Anos de Prática",
            statusDot: true,
          },
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Áreas de Atuação e Práticas Especializadas",
          sectionSubtitle: "Soluções estruturadas para mitigação de riscos e resolução célere de litígios.",
          cells: [
            {
              id: "c-1",
              tag: "EMPRESARIAL",
              title: "Contratos & Fusões",
              description: "Elaboração de acordos societários, due diligence e governança corporativa.",
              colSpan: 2,
            },
            {
              id: "c-2",
              tag: "TRIBUTÁRIO",
              title: "Planejamento Fiscal",
              description: "Recuperação de créditos tributários e defesa em autos de infração.",
              colSpan: 1,
            },
            {
              id: "c-3",
              tag: "PATRIMONIAL",
              title: "Proteção Familiar",
              description: "Holdings familiares, inventários e sucessão planejada sem desgastes.",
              colSpan: 1,
            },
            {
              id: "c-4",
              tag: "CONTENCIOSO",
              title: "Tribunais Superiores",
              description: "Sustentações orais e recursos estratégicos em instâncias recursais.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Reconhecimento & Confiança",
          subtitle: "O que dizem os clientes que defendemos em momentos decisivos.",
          testimonials: [
            {
              id: "t-1",
              name: "Eduardo Chapeco",
              role: "CEO na Vanguarda Agro",
              rating: 5,
              comment: "A condução do processo societário foi exemplar. Clareza em cada parecer e segurança inabalável em juízo.",
              verified: true,
            },
            {
              id: "t-2",
              name: "Beatriz Nogueira",
              role: "Diretora na Logística Sul",
              rating: 5,
              comment: "Economizamos milhões com a reestruturação tributária desenhada pela banca. Parceiros indispensáveis.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes",
          subtitle: "Orientações iniciais sobre o atendimento e sigilo profissional.",
          items: [
            {
              id: "f-1",
              question: "Como funciona a primeira consulta de avaliação?",
              answer: "A consulta inicial pode ser presencial ou online com criptografia ponta a ponta. Analisamos os documentos e emitimos um parecer de viabilidade preliminar.",
            },
            {
              id: "f-2",
              question: "Os contratos e procurações são assinados digitalmente?",
              answer: "Sim. Utilizamos assinaturas digitais com selo de evidências SHA-256 e conformidade ICP-Brasil, sem necessidade de deslocamento físico.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Solicite um Contato Sigiloso",
          subtitle: "Nossa equipe jurídica responderá com total discrição e presteza.",
          submitButtonText: "Solicitar Atendimento",
          whatsappNumber: "5511999998888",
          successMessage: "Recebemos sua mensagem. Um advogado especialista entrará em contato em breve.",
        },
      },
    ],
  },

  // 2. GASTRONOMIA & RESTAURANTES (FOOD & DRINKS)
  {
    id: "template_gastronomy",
    name: "Gastronomia Autoral & Restaurante",
    niche: "gastronomy",
    description: "Visual apetitoso, cardápio digital, reservas de mesa e entrega expressa.",
    badge: "Restaurantes",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "COZINHA ARTESANAL • ABERTO AGORA",
          title: "Sabores autênticos que despertam memórias inesquecíveis.",
          subtitle: "Ingredientes frescos de produtores locais, receitas autorais e uma carta de vinhos selecionada com carinho.",
          primaryCta: {
            label: "Ver Cardápio & Pedir",
            href: "#cardapio",
          },
          secondaryCta: {
            label: "Reservar Mesa",
            href: "#reserva",
          },
          imageUrl: "",
          floatingStat: {
            label: "TEMPO MÉDIO DE ENTREGA",
            value: "28 Minutos",
            statusDot: true,
          },
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Nossa Experiência Gastronômica",
          subtitle: "Pratos icônicos, ambiente acolhedor e detalhes pensados para você.",
          layout: "mosaic",
          items: [
            {
              id: "g-1",
              imageUrl: "",
              title: "Prato Principal do Chef",
              caption: "Ingredientes sazonais colhidos no mesmo dia",
            },
            {
              id: "g-2",
              imageUrl: "",
              title: "Ambiente do Salão",
              caption: "Música ambiente suave e iluminação intimista",
            },
            {
              id: "g-3",
              imageUrl: "",
              title: "Carta de Vinhos",
              caption: "Rótulos artesanais de pequenas vinícolas",
            },
            {
              id: "g-4",
              imageUrl: "",
              title: "Sobremesas Finas",
              caption: "Finalize sua experiência com maestria",
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Elogios de Quem Saboreou",
          subtitle: "A opinião espontânea de clientes que frequentam nosso salão.",
          testimonials: [
            {
              id: "t-1",
              name: "Juliana Camargo",
              role: "Crítica Gastronômica",
              rating: 5,
              comment: "O ponto da carne e o equilíbrio dos temperos são perfeitos. Sem dúvida o melhor restaurante da cidade.",
              verified: true,
            },
            {
              id: "t-2",
              name: "Marcelo Rossi",
              role: "Cliente Frequente",
              rating: 5,
              comment: "Atendimento impecável e entrega ultrarrápida no delivery. O prato chega quentinho como se saísse da cozinha agora.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Reserve Sua Mesa ou Evento Privado",
          subtitle: "Garanta seu lugar sem filas ou solicite um orçamento para comemorações.",
          submitButtonText: "Solicitar Reserva",
          whatsappNumber: "5511999998888",
          successMessage: "Reserva solicitada! Entraremos em contato via WhatsApp para confirmar seu horário.",
        },
      },
    ],
  },

  // 3. TURISMO & VIAGENS (TRAVEL & TOURS)
  {
    id: "template_tourism",
    name: "Turismo & Viagens",
    niche: "tourism",
    description: "Destinos, cotações de passagens e pacotes com assinatura digital.",
    badge: "Turismo",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "ROTEIROS 2027 • TEMPORADA ABERTA",
          title: "Descubra o mundo com roteiros desenhados exclusivamente para você.",
          subtitle: "Viagens personalizadas, excursões com guias credenciados, resorts de luxo e suporte 24h em cada etapa da sua jornada.",
          primaryCta: {
            label: "Solicitar Cotação Grátis",
            href: "#cotacao",
          },
          secondaryCta: {
            label: "Ver Destinos Populares",
            href: "#destinos",
          },
          imageUrl: "",
          floatingStat: {
            label: "PASSAGEIROS EMBARCADOS",
            value: "14.200+",
            statusDot: true,
          },
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Destinos & Experiências Inspiradoras",
          subtitle: "Paisagens arrebatadoras que esperam por você nas próximas férias.",
          layout: "mosaic",
          items: [
            {
              id: "g-1",
              imageUrl: "",
              title: "Praias Paradisíacas",
              caption: "Resorts all-inclusive com vista para o mar",
            },
            {
              id: "g-2",
              imageUrl: "",
              title: "Montanhas & Ecoturismo",
              caption: "Trilhas deslumbrantes e ar puro",
            },
            {
              id: "g-3",
              imageUrl: "",
              title: "Cidades Históricas",
              caption: "Cultura, gastronomia e arquitetura clássica",
            },
            {
              id: "g-4",
              imageUrl: "",
              title: "Excursões Rodoviárias",
              caption: "Ônibus leito com conforto de primeira classe",
            },
          ],
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Pacotes em Destaque",
          subtitle: "Parcelamento facilitado em até 12x sem juros no cartão ou carnê da agência.",
          tiers: [
            {
              id: "tier-1",
              name: "Final de Semana Serra",
              priceMonthlyCents: 89000,
              description: "3 Dias e 2 Noites em chalé com lareira e café colonial.",
              features: ["Transporte Executivo Ida/Volta", "Hospedagem com Café da Manhã", "Guia Regional Cadastur", "Seguro Viagem Completo"],
              ctaLabel: "Reservar Vaga",
            },
            {
              id: "tier-2",
              name: "Férias no Nordeste",
              priceMonthlyCents: 249000,
              isPopular: true,
              badge: "Mais Vendido",
              description: "7 Dias em Resort All-Inclusive beira-mar com voos inclusos.",
              features: ["Aéreo Ida e Volta com Bagagem", "Resort All-Inclusive", "Transfer Aeroporto/Hotel", "Passeio de Barco Incluso"],
              ctaLabel: "Garantir Pacote",
            },
            {
              id: "tier-3",
              name: "Circuito Europa Clássica",
              priceMonthlyCents: 890000,
              description: "12 Dias conhecendo Paris, Roma e Madri com guia em português.",
              features: ["Passagens Aéreas Internacionais", "Hotéis 4 Estrelas Centrais", "Trens de Alta Velocidade", "City Tours Exclusivos"],
              ctaLabel: "Consultar Datas",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Solicite Sua Lâmina Personalizada de Viagem",
          subtitle: "Diga para onde deseja ir e enviaremos um roteiro sob medida em seu WhatsApp.",
          submitButtonText: "Receber Roteiro no WhatsApp",
          whatsappNumber: "5511999998888",
          successMessage: "Perfeito! Nossos consultores de viagem já estão preparando sua cotação.",
        },
      },
    ],
  },

  // 4. CRIADORES, INFOPRODUTOS & MENTORIAS
  {
    id: "template_creators",
    name: "Criadores & Cursos",
    niche: "creators",
    description: "Alta conversão para cursos, mentorias e infoprodutos.",
    badge: "Infoprodutos",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "NOVA TURMA ABERTA • VAGAS LIMITADAS",
          title: "Domine as habilidades certas e transforme conhecimento em receita previsível.",
          subtitle: "Um método direto e sem enrolação, validado por centenas de profissionais do mercado digital.",
          primaryCta: {
            label: "Garantir Minha Vaga",
            href: "#planos",
          },
          secondaryCta: {
            label: "Conhecer a Metodologia",
            href: "#metodologia",
          },
          floatingStat: {
            label: "ALUNOS CERTIFICADOS",
            value: "3.840+",
            statusDot: true,
          },
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "O Que Você Vai Conquistar Dentro do Treinamento",
          sectionSubtitle: "Um passo a passo estruturado para tirar sua ideia do papel e escalar sua operação.",
          cells: [
            {
              id: "c-1",
              tag: "MÓDULO 01",
              title: "Fundamentos & Posicionamento",
              description: "Como criar uma oferta irresistível e atrair os clientes certos sem gastar rios de dinheiro.",
              colSpan: 2,
            },
            {
              id: "c-2",
              tag: "MÓDULO 02",
              title: "Funis de Vendas",
              description: "Páginas de captura e checkout com alta conversão.",
              colSpan: 1,
            },
            {
              id: "c-3",
              tag: "MÓDULO 03",
              title: "Tráfego & Anúncios",
              description: "Estratégias validadas para Meta Ads e Google Ads.",
              colSpan: 1,
            },
            {
              id: "c-4",
              tag: "COMUNIDADE",
              title: "Mentoria Semanal ao Vivo",
              description: "Tire dúvidas diretamente com os instrutores e faça networking de alto nível.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Escolha Seu Nível de Acesso",
          subtitle: "Garantia incondicional de 7 dias. Se não gostar, devolvemos 100% do seu dinheiro.",
          tiers: [
            {
              id: "starter",
              name: "Acesso Essencial",
              priceMonthlyCents: 49700,
              description: "Ideal para quem quer aprender no próprio ritmo.",
              features: ["Acesso a todas as aulas gravadas", "Materiais de apoio e planilhas", "Certificado de conclusão", "1 Ano de Acesso"],
              ctaLabel: "Entrar no Essencial",
            },
            {
              id: "pro",
              name: "Mentoria VIP",
              badge: "Mais Procurado",
              isPopular: true,
              priceMonthlyCents: 99700,
              description: "Para quem busca aceleração rápida com acompanhamento próximo.",
              features: ["Tudo do plano Essencial", "Encontros quinzenais pelo Zoom", "Grupo exclusivo de networking", "Revisão individual de projetos"],
              ctaLabel: "Garantir Vaga na Mentoria",
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Perguntas Frequentes",
          subtitle: "Tudo o que você precisa saber antes de se inscrever.",
          items: [
            {
              id: "f-1",
              question: "Por quanto tempo terei acesso ao conteúdo?",
              answer: "Você terá acesso integral por 12 meses a todas as aulas gravadas e às futuras atualizações do curso.",
            },
            {
              id: "f-2",
              question: "Como funciona a garantia incondicional de 7 dias?",
              answer: "Se por qualquer motivo você achar que o treinamento não é para você, basta solicitar o reembolso em 1 clique e devolveremos seu valor integral.",
            },
          ],
        },
      },
    ],
  },

  // 5. IMOBILIÁRIA & LOCAÇÕES DE ALTO PADRÃO
  {
    id: "template_real_estate",
    name: "Imóveis & Temporada",
    niche: "real_estate",
    description: "Apresentação visual para corretores e locações por temporada.",
    badge: "Imobiliária",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "LANÇAMENTOS EXCLUSIVOS • SANTA CATARINA & LITORAL",
          title: "Empreendimentos arquitetônicos que redefinem o viver bem.",
          subtitle: "Curadoria rigorosa de coberturas, residências de praia e studios de alta rentabilidade com atendimento concierge.",
          primaryCta: {
            label: "Ver Catálogo Prime",
            href: "#galeria",
          },
          secondaryCta: {
            label: "Falar com Corretor",
            href: "#contato",
          },
          floatingStat: {
            label: "VALORIZAÇÃO MÉDIA",
            value: "+24.8% a.a.",
            statusDot: true,
          },
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Portfólio de Residências Selecionadas",
          subtitle: "Explore os detalhes de acabamento, localização privilegiada e vista panorâmica.",
          layout: "mosaic",
          items: [
            {
              id: "imv-1",
              imageUrl: "",
              title: "Villa Solarium",
              caption: "4 Suítes • Vista Mar • Piscina Aquecida",
            },
            {
              id: "imv-2",
              imageUrl: "",
              title: "Penthouse Infinity",
              caption: "Design assinado e rooftop privativo",
            },
            {
              id: "imv-3",
              imageUrl: "",
              title: "Reserva das Araucárias",
              caption: "Chácara urbana com área verde preservada",
            },
            {
              id: "imv-4",
              imageUrl: "",
              title: "Studio Horizon",
              caption: "Ideal para Airbnb e locação executiva",
            },
          ],
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Diferenciais do Nosso Atendimento Imobiliário",
          sectionSubtitle: "Segurança jurídica e consultoria patrimonial de ponta a ponta.",
          cells: [
            {
              id: "imb-1",
              tag: "DUE DILIGENCE",
              title: "Auditoria Jurídica 100% Blindada",
              description: "Análise profunda de matrículas e certidões antes da assinatura de qualquer contrato.",
              colSpan: 2,
            },
            {
              id: "imb-2",
              tag: "RENTABILIDADE",
              title: "Gestão de Aluguel",
              description: "Administração completa de hóspedes com taxa de ocupação otimizada.",
              colSpan: 1,
            },
            {
              id: "imb-3",
              tag: "CONCIERGE",
              title: "Atendimento VIP",
              description: "Transporte e visitas guiadas privativas para investidores.",
              colSpan: 1,
            },
            {
              id: "imb-4",
              tag: "TECNOLOGIA",
              title: "Contratos Digitais",
              description: "Assinatura eletrônica e fechamento sem burocracia de cartório presencial.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Agende sua Visita Exclusiva",
          subtitle: "Preencha seus dados para receber a ficha técnica detalhada dos imóveis.",
          submitButtonText: "Solicitar Apresentação VIP",
          whatsappRedirect: true,
        },
      },
    ],
  },

  // 6. ESTÉTICA, BEM-ESTAR & CLÍNICAS
  {
    id: "template_services_wellness",
    name: "Estética & Saúde",
    niche: "services",
    description: "Minimalismo para clínicas médicas, estética e bem-estar.",
    badge: "Estética",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "MEDICINA ESTÉTICA INTEGRATIVA • RESPONSÁVEL CRM/SP",
          title: "Harmonia, naturalidade e protocolos que valorizam sua essência.",
          subtitle: "Procedimentos não invasivos com tecnologia de ponta para rejuvenescimento facial, corporal e bem-estar profundo.",
          primaryCta: {
            label: "Agendar Avaliação",
            href: "#contato",
          },
          secondaryCta: {
            label: "Conhecer Protocolos",
            href: "#servicos",
          },
          floatingStat: {
            label: "PACIENTES ATENDIDOS",
            value: "4.800+ Vidas",
            statusDot: true,
          },
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Protocolos Clínicos em Destaque",
          sectionSubtitle: "Planos de tratamento personalizados com acompanhamento individualizado.",
          cells: [
            {
              id: "w-1",
              tag: "FACIAL",
              title: "Bioestimuladores & Harmonização Suave",
              description: "Recuperação do contorno e estímulo de colágeno natural sem exageros artificiais.",
              colSpan: 2,
            },
            {
              id: "w-2",
              tag: "CORPORAL",
              title: "Remodelagem Não Invasiva",
              description: "Tecnologia de ultrassom macrofocado para firmeza e definição.",
              colSpan: 1,
            },
            {
              id: "w-3",
              tag: "BEM-ESTAR",
              title: "Terapia Integrativa",
              description: "Sessões de relaxamento, massagens terapêuticas e desintoxicação.",
              colSpan: 1,
            },
            {
              id: "w-4",
              tag: "TECNOLOGIA",
              title: "Equipamentos de Última Geração",
              description: "Aparelhos certificados pela ANVISA para máxima segurança e resultados imediatos.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Experiências Reais de Cuidado",
          subtitle: "A opinião espontânea de quem transformou a autoestima em nossa clínica.",
          testimonials: [
            {
              id: "tw-1",
              name: "Camila Guimarães",
              role: "Arquiteta",
              rating: 5,
              comment: "O atendimento superou qualquer expectativa. A naturalidade do resultado me devolveu a confiança.",
              verified: true,
            },
            {
              id: "tw-2",
              name: "Juliana Mendes",
              role: "Empresária",
              rating: 5,
              comment: "Ambiente impecável, profissionais que realmente escutam antes de sugerir qualquer tratamento.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre Procedimentos",
          subtitle: "Esclareça as perguntas mais comuns antes da sua primeira visita.",
          items: [
            {
              id: "fw-1",
              question: "Os procedimentos exigem repouso ou afastamento do trabalho?",
              answer: "A grande maioria dos nossos protocolos são minimamente invasivos, permitindo retorno imediato às atividades diárias.",
            },
            {
              id: "fw-2",
              question: "Como é realizada a consulta de avaliação inicial?",
              answer: "Realizamos um mapeamento facial/corporal detalhado em 3D para diagnosticar as necessidades exatas antes de propor qualquer intervenção.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Reserve seu Horário com Exclusividade",
          subtitle: "Nossa equipe entrará em contato via WhatsApp para confirmar a melhor data.",
          submitButtonText: "Solicitar Agendamento",
          whatsappRedirect: true,
        },
      },
    ],
  },

  // 7. CRIADORES: LINK NA BIO - CREATOR PRO (MASTER PROMPT V137)
  {
    id: "template_creator_biolink",
    name: "Link na Bio - Creator Pro",
    niche: "creators",
    description: "Apresentação magnética para criadores, influenciadores e infoprodutores com foto de perfil expandida, links de destaque, galeria masonry e captura de newsletter.",
    badge: "Creator Pro",
    blocks: [
      {
        type: "hero_minimal_split",
        styling: {
          borderRadius: "full",
          maxWidth: "md",
          paddingY: "sm",
        },
        config: {
          badgeText: "CRIADOR OFICIAL • @CREATORPRO",
          title: "Lucas Silva — Direção Criativa & Estratégia Digital",
          subtitle: "Podcaster, ensaísta e produtor de conteúdo. Acompanhe meus lançamentos, projetos autorais e comunidade fechada.",
          primaryCta: {
            label: "️ Ouvir Último Episódio do Podcast",
            href: "https://spotify.com",
          },
          secondaryCta: {
            label: "Acessar Comunidade VIP no WhatsApp",
            href: "https://chat.whatsapp.com",
          },
          imageUrl: "",
          floatingStat: {
            label: "AUDIÊNCIA TOTAL",
            value: "250K+ Seguidores",
            statusDot: true,
          },
        },
      },
      {
        type: "bento_asymmetric_4",
        styling: {
          maxWidth: "md",
        },
        config: {
          sectionTitle: "Projetos em Destaque & Plataformas",
          sectionSubtitle: "Acesse rapidamente os principais lançamentos, mentorias e canais oficiais.",
          cells: [
            {
              id: "cp-1",
              tag: "CURSO INTENSIVO",
              title: "Masterclass de Storytelling Visual",
              description: "Inscrições abertas com acesso vitalício e templates prontos.",
              colSpan: 2,
            },
            {
              id: "cp-2",
              tag: "YOUTUBE",
              title: "Canal de Ensaios Semanais",
              description: "Tutoriais profundos e bastidores de produções reais.",
              colSpan: 1,
            },
            {
              id: "cp-3",
              tag: "SUBSTACK",
              title: "Newsletter de Bastidores",
              description: "Artigos e notas conceituais direto no seu e-mail.",
              colSpan: 1,
            },
            {
              id: "cp-4",
              tag: "PARCERIAS",
              title: "Media Kit & Propostas Comerciais",
              description: "Campanhas publicitárias, palestras e consultoria para marcas.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Galeria Visual & Ensaios Criativos",
          subtitle: "Trabalhos autorais recentes, campanhas conceituais e momentos de estúdio.",
          layout: "mosaic",
          items: [
            {
              id: "mg-1",
              imageUrl: "",
              title: "Ensaio Editorial Urbano",
              caption: "Direção de fotografia e luz natural",
            },
            {
              id: "mg-2",
              imageUrl: "",
              title: "Estúdio de Gravação",
              caption: "Captação acústica e masterização",
            },
            {
              id: "mg-3",
              imageUrl: "",
              title: "Bastidores de Produção",
              caption: "Equipamentos analógicos e digitais",
            },
            {
              id: "mg-4",
              imageUrl: "",
              title: "Workflow Criativo",
              caption: "Design de interfaces e pós-produção",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        styling: {
          maxWidth: "md",
        },
        config: {
          title: "Receba Minhas Cartas Semanais (VIP)",
          subtitle: "Assine a newsletter para receber insights sobre negócios criativos, novidades e convites para encontros fechados.",
          submitButtonText: "Inscrever-se Gratuitamente",
          showPhoneField: false,
          showMessageField: false,
          successMessage: "Inscrição confirmada com sucesso! Verifique sua caixa de entrada.",
        },
      },
    ],
  },

  // 8. CLÍNICA: LANDING PAGE - CLÍNICA PREMIUM (MASTER PROMPT V137)
  {
    id: "template_clinic_premium",
    name: "Landing Page - Clínica Premium",
    niche: "clinica",
    description: "Estrutura refinada de autoridade médica e estética com corpo clínico de especialistas com avatares grandes, especialidades e agendamento instantâneo via WhatsApp.",
    badge: "Clínica Médica",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "INSTITUTO MÉDICO INTEGRADO • CRM/SP 48.902",
          title: "Medicina de precisão, acolhimento humano e excelência clínica.",
          subtitle: "Diagnósticos completos, equipe multidisciplinar de especialistas e estrutura hospitalar boutique pensada para o seu conforto absoluto.",
          primaryCta: {
            label: "Agendar Consulta via WhatsApp",
            href: "https://wa.me/5511999998888",
          },
          secondaryCta: {
            label: "Conhecer Especialidades",
            href: "#especialidades",
          },
          imageUrl: "",
          floatingStat: {
            label: "CORPO CLÍNICO",
            value: "24 Especialistas",
            statusDot: true,
          },
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Corpo Clínico & Especialistas Residentes",
          subtitle: "Médicos graduados nas mais prestigiadas instituições com dedicação integral ao paciente.",
          testimonials: [
            {
              id: "doc-1",
              name: "Dr. Alexandre Vasconcellos",
              role: "Cardiologista Chefe • CRM 52.100",
              avatarUrl: "",
              rating: 5,
              comment: "Doutorado pela USP e fellowship em Harvard. Especialista em prevenção e reabilitação cardiovascular avançada.",
              verified: true,
            },
            {
              id: "doc-2",
              name: "Dra. Mariana Dornelles",
              role: "Dermatologia & Laser • CRM 61.420",
              avatarUrl: "",
              rating: 5,
              comment: "Especialista em dermatologia clínica e rejuvenescimento biológico de alta precisão com tecnologias não invasivas.",
              verified: true,
            },
            {
              id: "doc-3",
              name: "Dr. Felipe Albuquerque",
              role: "Ortopedia & Medicina Esportiva • CRM 49.330",
              avatarUrl: "",
              rating: 5,
              comment: "Cirurgião articular com foco em recuperação rápida, artroscopia e tratamento de lesões musculoesqueléticas.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Centros de Especialidades & Diagnóstico",
          sectionSubtitle: "Atendimento integrado em um único local, eliminando deslocamentos e esperas desnecessárias.",
          cells: [
            {
              id: "esp-1",
              tag: "CARDIOLOGIA",
              title: "Check-up Cardiovascular Avançado",
              description: "Ecocardiograma, Mapa, Holter e teste ergométrico computadorizado com laudo no mesmo dia.",
              colSpan: 2,
            },
            {
              id: "esp-2",
              tag: "DERMATOLOGIA",
              title: "Protocolos Cutâneos & Laser",
              description: "Mapeamento corporal de nevos em alta resolução e regeneração dérmica segura.",
              colSpan: 1,
            },
            {
              id: "esp-3",
              tag: "LABORATÓRIO",
              title: "Exames de Coleta Expressa",
              description: "Resultados liberados em até 4 horas com integração direta ao prontuário eletrônico.",
              colSpan: 1,
            },
            {
              id: "esp-4",
              tag: "CONCIERGE",
              title: "Check-up Executivo em Meio Turno",
              description: "Suíte privativa com concierge médico exclusivo e café da manhã gourmet incluso.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre Atendimento",
          subtitle: "Informações sobre convênios, estacionamento com manobrista e agendamentos.",
          items: [
            {
              id: "fqc-1",
              question: "A clínica atende convênios ou somente particular?",
              answer: "Atendemos de forma particular com emissão de nota fiscal detalhada e relatório médico para reembolso integral nos principais planos de saúde.",
            },
            {
              id: "fqc-2",
              question: "Existe serviço de telemedicina para pacientes de outras cidades?",
              answer: "Sim, disponibilizamos consultas por telemedicina com prontuário criptografado e prescrição eletrônica válida em todo o território nacional.",
            },
            {
              id: "fqc-3",
              question: "Qual o procedimento para agendar consultas e exames no mesmo dia?",
              answer: "Nossa equipe de concierge organiza uma grade integrada para que você realize a consulta com o especialista e os exames de triagem na mesma manhã.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Agende sua Consulta com Exclusividade",
          subtitle: "Nossa equipe concierge responderá imediatamente via WhatsApp para confirmar o horário ideal.",
          submitButtonText: "Solicitar Agendamento via WhatsApp",
          whatsappNumber: "5511999998888",
          whatsappRedirect: true,
          showPhoneField: true,
          showMessageField: true,
        },
      },
    ],
  },

  // 9. GASTRONOMIA: CATÁLOGO - DARK KITCHEN EXPRESS (MASTER PROMPT V137)
  {
    id: "template_dark_kitchen",
    name: "Catálogo - Dark Kitchen Express",
    niche: "gastronomy",
    description: "Menu de alta conversão estilo app de delivery com navegação rápida por categorias, imagens apetitosas sangradas nos cartões e pedido instantâneo no WhatsApp.",
    badge: "Dark Kitchen",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "COZINHA ARTESANAL • ENTREGA EM 25 MIN",
          title: "Burgers artesanais na brasa, smash ultra-crocante e batatas rústicas.",
          subtitle: "Blend 100% Angus fresco grelhado no fogo alto, queijo derretido de verdade e pão brioche amanteigado selado na perfeição.",
          primaryCta: {
            label: "Ver Cardápio & Pedir",
            href: "#cardapio",
          },
          secondaryCta: {
            label: "Combos em Destaque",
            href: "#combos",
          },
          imageUrl: "",
          floatingStat: {
            label: "DELIVERY RÁPIDO",
            value: "25 Minutos",
            statusDot: true,
          },
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Cardápio Visual — Os Favoritos da Cozinha",
          subtitle: "Imagens reais de cada burger e porção servidos em embalagens térmicas ecológicas e seladas.",
          layout: "mosaic",
          items: [
            {
              id: "dk-1",
              imageUrl: "",
              title: "Smash Duplo Cheddar",
              caption: "2x 100g Angus, cheddar inglês cremoso e cebola caramelizada",
            },
            {
              id: "dk-2",
              imageUrl: "",
              title: "Bacon Truffle Prime",
              caption: "180g Angus, fatias crocantes de bacon e maionese trufada",
            },
            {
              id: "dk-3",
              imageUrl: "",
              title: "Fritas Rústicas com Alecrim",
              caption: "Batatas crocantes temperadas com sal marinho e ervas frescas",
            },
            {
              id: "dk-4",
              imageUrl: "",
              title: "Milkshake Artesanal de Pistache",
              caption: "Sorvete cremoso batido na hora com calda de pistache italiana",
            },
          ],
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Combos Promocionais com Desconto Especial",
          subtitle: "Peça o combo completo e economize até 30% em relação aos itens avulsos.",
          tiers: [
            {
              id: "combo-1",
              name: "Combo Solo Smash",
              priceMonthlyCents: 3890,
              description: "O clássico perfeito para uma refeição rápida e deliciosa.",
              features: [
                "1x Smash Burger Simples",
                "1x Fritas Rústica Pequena",
                "1x Refrigerante Lata 350ml",
                "1x Molho da Casa Grátis",
              ],
              ctaLabel: "Pedir Combo Solo",
            },
            {
              id: "combo-2",
              name: "Combo Casal Prime",
              badge: "Mais Pedido",
              isPopular: true,
              priceMonthlyCents: 7490,
              description: "Para compartilhar a dois com fartura e muito sabor.",
              features: [
                "2x Smash Duplo Cheddar",
                "1x Fritas Rústica Grande com Bacon",
                "2x Bebidas à Escolha",
                "2x Molhos Especiais da Cozinha",
              ],
              ctaLabel: "Garantir Combo Casal",
            },
            {
              id: "combo-3",
              name: "Box Galera & Família",
              priceMonthlyCents: 13990,
              description: "A festa do hambúrguer completa com tudo que tem direito.",
              features: [
                "4x Burgers à Escolha da Linha Prime",
                "2x Fritas Mega com Cheddar e Bacon",
                "10x Tiras de Frango Crocante",
                "1x Refrigerante 2L Incluso",
              ],
              ctaLabel: "Pedir Box Família",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Fazer Pedido Imediato pelo WhatsApp",
          subtitle: "Envie sua escolha de burgers e combos para despacho imediato com rastreamento da entrega.",
          submitButtonText: "Enviar Pedido para a Cozinha",
          whatsappNumber: "5511999998888",
          whatsappRedirect: true,
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Pedido recebido! Nossa cozinha iniciou a preparação imediatamente.",
        },
      },
    ],
  },
];

export interface TourismWixAppPageTemplate extends NicheTemplateDefinition {
  slug: string;
  title: string;
  document_type: "storefront" | "campaign" | "landing_page" | "institutional";
  is_home: boolean;
}

export const TOURISM_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_tourism_home",
    name: "Vitrine Principal & Buscador GDS",
    niche: "tourism",
    slug: "inicio-turismo",
    title: "Início — Viagens & Buscador GDS",
    document_type: "storefront",
    is_home: true,
    badge: "App Turismo • Home",
    description: "Página principal integrada ao motor de busca InfoTravel GDS, destinos e hotéis parceiros.",
    blocks: [
      {
        type: "dynamic_booking_hero",
        config: {
          title: "Sua Próxima Viagem Começa Aqui",
          subtitle: "Pacotes completos, passagens aéreas e resorts exclusivos com cotação online imediata.",
          badge: "Tarifas Exclusivas de Agência • InfoTravel GDS",
          defaultOrigin: "Chapecó, SC",
          defaultDestination: "Maceió, AL",
          showBenefitsBar: true,
        },
      },
      {
        type: "tourism_destinations_carousel",
        config: {
          title: "Destinos Mais Desejados",
          subtitle: "Roteiros com aéreo, hospedagem selecionada e suporte completo da agência.",
        },
      },
      {
        type: "travel_hotel_slider",
        config: {
          title: "Hotéis e Resorts Conveniados",
          subtitle: "Hospedagens verificadas com tarifas negociadas diretamente com operadoras.",
        },
      },
      {
        type: "tourism_services_grid",
        config: {
          title: "Especialidades da Agência",
          subtitle: "Assessoria completa antes, durante e após o seu embarque.",
        },
      },
    ],
  },
  {
    id: "wix_tourism_packages",
    name: "Catálogo de Pacotes & Roteiros",
    niche: "tourism",
    slug: "pacotes",
    title: "Pacotes & Roteiros",
    document_type: "campaign",
    is_home: false,
    badge: "App Turismo • Pacotes",
    description: "Vitrine dedicada a pacotes promocionais, excursões em grupo e cronograma dia a dia.",
    blocks: [
      {
        type: "travel_package_hero",
        config: {
          title: "Pacotes Completos com Aéreo e Resort",
          subtitle: "Saídas garantidas, bloqueios aéreos exclusivos e parcelamento facilitado.",
        },
      },
      {
        type: "tourism_destinations_carousel",
        config: {
          title: "Saídas Confirmadas da Temporada",
          subtitle: "Escolha seu destino e garanta tarifa de lote promocional.",
        },
      },
      {
        type: "travel_itinerary_timeline",
        config: {
          title: "Como Funciona a Experiência Dia a Dia",
          subtitle: "Planejamento transparente do embarque ao retorno.",
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas sobre Pacotes e Reservas",
          subtitle: "Informações claras sobre bagagem, documentação e formas de pagamento.",
          items: [
            {
              id: "faq-pkg-1",
              question: "Como funciona o parcelamento no boleto e cartão?",
              answer: "Você pode parcelar sua viagem com entrada reduzida via Pix e saldo em até 12x no cartão ou boleto bancário sujeito à aprovação.",
            },
            {
              id: "faq-pkg-2",
              question: "Os pacotes incluem bagagem despachada e transfer?",
              answer: "Cada opção da proposta detalha de forma transparente a franquia de bagagem incluída e o tipo de traslado entre aeroporto e hotel.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "wix_tourism_hotels",
    name: "Buscador de Hotéis, Resorts & Voos",
    niche: "tourism",
    slug: "hoteis",
    title: "Hotéis, Resorts & Aéreo",
    document_type: "campaign",
    is_home: false,
    badge: "App Turismo • Hotéis & GDS",
    description: "Página de autoatendimento conectada ao InfoTravel para pesquisa de hospedagens e malha aérea.",
    blocks: [
      {
        type: "dynamic_booking_hero",
        config: {
          title: "Reserve Hotéis, Resorts e Passagens Aéreas",
          subtitle: "Compare opções verificadas em tempo real e receba sua proposta interativa.",
          badge: "Conexão Direta Operadoras",
          defaultOrigin: "São Paulo, SP",
          defaultDestination: "Gramado, RS",
          showBenefitsBar: false,
        },
      },
      {
        type: "travel_hotel_slider",
        config: {
          title: "Seleção de Resorts & Hotéis Recomendados",
          subtitle: "Opções avaliadas por viajantes reais nos principais destinos.",
        },
      },
      {
        type: "travel_product_detail",
        config: {
          title: "Destaque da Semana em Hospedagem",
          subtitle: "Estrutura completa de lazer, gastronomia e conforto para sua família.",
        },
      },
    ],
  },
  {
    id: "wix_tourism_quote",
    name: "Central de Cotação Personalizada",
    niche: "tourism",
    slug: "cotacao",
    title: "Solicitar Cotação Sob Medida",
    document_type: "landing_page",
    is_home: false,
    badge: "App Turismo • Cotação",
    description: "Captura estruturada de orçamento integrada diretamente ao Kanban de Cotações da agência.",
    blocks: [
      {
        type: "tourism_quote_hero",
        config: {
          title: "Planeje Sua Viagem Sob Medida",
          subtitle: "Informe seu destino, datas e configuração de quartos para receber uma proposta comparativa com até 4 opções.",
          badge: "Atendimento Especializado",
          destinationPresets: ["Maceió", "Gramado", "Buenos Aires", "Punta Cana", "Orlando", "Europa"],
        },
      },
      {
        type: "tourism_services_grid",
        config: {
          title: "O Que Incluímos no Seu Planejamento",
          subtitle: "Cuidamos de passagens, hospedagem, seguro viagem, locação de veículos e vistos.",
        },
      },
      {
        type: "interactive_quote_calculator",
        config: {
          title: "Simulador de Viagens em Grupo & Pacotes",
          subtitle: "Calcule uma estimativa preliminar para o seu grupo com comodidades inclusas.",
          basePriceCents: 120000,
          unitLabel: "Viajante",
          unitPluralLabel: "Viajantes",
          minUnits: 1,
          maxUnits: 40,
          defaultUnits: 2,
          unitPriceCents: 85000,
          options: [
            {
              id: "opt-seguro",
              label: "Seguro Viagem Internacional Completo",
              description: "Cobertura médica de até USD 60.000 e extravio de bagagem.",
              priceCents: 18000,
              isDefault: true,
            },
            {
              id: "opt-transfer",
              label: "Transfer Privativo Aeroporto ↔ Hotel",
              description: "Recepção com motorista credenciado em van executiva.",
              priceCents: 25000,
              isDefault: false,
            },
          ],
          whatsappNumber: "5511999998888",
          submitButtonText: "Solicitar Proposta Completa da Agência",
          successMessage: "Simulação enviada com sucesso! Um consultor entrará em contato.",
          disclaimer: "Estimativa baseada em tarifas médias de baixa temporada. Sujeito à disponibilidade no ato da reserva.",
        },
      },
    ],
  },
  {
    id: "wix_tourism_portal",
    name: "Portal do Viajante (Vouchers & Contratos)",
    niche: "tourism",
    slug: "minhas-viagens",
    title: "Portal do Viajante — Minhas Viagens",
    document_type: "institutional",
    is_home: false,
    badge: "App Turismo • Portal B2C",
    description: "Área do passageiro para consulta de reservas, download de vouchers, contratos e pré-embarque.",
    blocks: [
      {
        type: "customer_travel_portal",
        config: {
          title: "Portal do Viajante",
          subtitle: "Acesse seus vouchers, localizadores aéreos, contrato digital e guia de pré-embarque.",
        },
      },
    ],
  },
];

export const COMMERCE_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_commerce_home",
    name: "Vitrine Principal do E-Commerce",
    niche: "commerce",
    slug: "inicio-loja",
    title: "Início — Vitrine Oficial da Loja",
    document_type: "storefront",
    is_home: true,
    badge: "App Loja • Home",
    description: "Página inicial com carrossel dinâmico, produtos em alta, ofertas relâmpago e selos de segurança.",
    blocks: [
      {
        type: "hero_interactive_carousel",
        config: {
          autoPlay: true,
          intervalSeconds: 5,
          slides: [
            {
              id: "sl-1",
              badgeText: "NOVIDADES DA SEMANA",
              title: "Coleção exclusiva com pronta entrega para todo o Brasil.",
              subtitle: "Produtos selecionados com garantia de procedência e frete rápido.",
              primaryCta: { label: "Ver Produtos", href: "#produtos" },
              highlightTag: "Destaque",
              floatingStat: { label: "SATISFAÇÃO", value: "4.9/5 Estrelas", statusDot: true },
            },
          ],
        },
      },
      {
        type: "category_icon_grid",
        config: {
          title: "Navegue por Categorias",
          subtitle: "Encontre exatamente o que você procura em poucos cliques.",
          columns: 6,
        },
      },
      {
        type: "curated_hits_rail",
        config: {
          title: "Top Mais Vendidos da Semana",
          subtitle: "Os itens mais pedidos pelos clientes com disponibilidade imediata.",
        },
      },
      {
        type: "product_grid",
        config: {
          title: "Destaques do Estoque",
          subtitle: "Grade completa de produtos disponíveis para compra com 1 toque.",
          columns: 4,
        },
      },
      {
        type: "flash_sale_hero",
        config: {
          title: "Descontos Especiais por Tempo Limitado",
          subtitle: "Aproveite cupons promocionais válidos até o final da semana.",
          discountPercentage: "25% OFF",
          couponCode: "PRIMEIRACOMPRA",
          buttonText: "Comprar com Desconto",
          targetLink: "#produtos",
        },
      },
      {
        type: "trust_badges",
        config: {
          badges: [
            { icon: "Truck", title: "Entrega Rastreada", description: "Envio rápido com código de acompanhamento" },
            { icon: "ShieldCheck", title: "Pagamento 100% Protegido", description: "Pix instantâneo e parcelamento seguro" },
            { icon: "RotateCcw", title: "Troca Sem Burocracia", description: "7 dias para devolução gratuita" },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "O Que Nossos Clientes Dizem",
          subtitle: "Avaliações verificadas de quem comprou e aprovou nossos produtos.",
          testimonials: [],
        },
      },
    ],
  },
  {
    id: "wix_commerce_catalog",
    name: "Catálogo Completo & Busca",
    niche: "commerce",
    slug: "catalogo-produtos",
    title: "Catálogo Completo — Todos os Produtos",
    document_type: "storefront",
    is_home: false,
    badge: "App Loja • Catálogo",
    description: "Página dedicada para navegação aprofundada com categorias, ordenação e vitrines completas.",
    blocks: [
      {
        type: "category_icon_grid",
        config: {
          title: "Categorias da Loja",
          subtitle: "Filtre por departamentos e linhas de produtos.",
          columns: 6,
        },
      },
      {
        type: "product_grid",
        config: {
          title: "Todos os Produtos",
          subtitle: "Catálogo completo sincronizado com nosso estoque em tempo real.",
          columns: 4,
        },
      },
      {
        type: "product_rail",
        config: {
          title: "Outros Lançamentos",
          subtitle: "Novidades que acabaram de chegar ao centro de distribuição.",
        },
      },
      {
        type: "info_cards",
        config: {
          cards: [
            { icon: "truck", title: "Frete Inteligente", description: "Cálculo direto no carrinho com transportadoras parceiras." },
            { icon: "shield", title: "Compra Segura", description: "Ambiente criptografado com validação antifraude." },
          ],
        },
      },
    ],
  },
  {
    id: "wix_commerce_pdp",
    name: "Página de Produto (PDP) & Detalhes",
    niche: "commerce",
    slug: "detalhes-produto",
    title: "Detalhe do Produto — Especificações e Compra",
    document_type: "storefront",
    is_home: false,
    badge: "App Loja • Produto",
    description: "Estrutura padrão de página de produto com composição, tabela de medidas e dúvidas frequentes.",
    blocks: [
      {
        type: "shop_the_look_hotspots",
        config: {
          title: "Composição & Detalhes da Peça",
          subtitle: "Observe a matéria-prima, caimento e acabamentos técnicos.",
          hotspots: [],
        },
      },
      {
        type: "size_guide_table",
        config: {
          title: "Guia de Medidas & Caimento",
          subtitle: "Consulte as medidas exatas para escolher o tamanho perfeito.",
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Galeria de Fotos do Produto",
          subtitle: "Ângulos em alta definição e fotos de clientes.",
          items: [],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre Envio e Devoluções",
          subtitle: "Respostas claras para você comprar com tranquilidade.",
          items: [
            {
              id: "faq-pdp-1",
              question: "Qual o prazo médio de entrega para a minha cidade?",
              answer: "O prazo varia de acordo com o CEP informado no checkout. Capitais costumam receber entre 2 a 5 dias úteis, com rastreamento completo.",
            },
            {
              id: "faq-pdp-2",
              question: "Como funciona caso o tamanho não sirva?",
              answer: "Você tem até 7 dias corridos após o recebimento para solicitar a primeira troca de forma totalmente gratuita.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "wix_commerce_portal",
    name: "Central do Cliente (Meus Pedidos & Carnês)",
    niche: "commerce",
    slug: "minhas-compras",
    title: "Minha Conta — Pedidos, Entregas e Faturas",
    document_type: "institutional",
    is_home: false,
    badge: "App Loja • Minha Conta",
    description: "Área logada do consumidor para rastrear compras, emitir segunda via de boletos/Pix e avaliar produtos.",
    blocks: [
      {
        type: "portal_orders_rentals",
        config: {
          title: "Meus Pedidos e Compras",
          subtitle: "Acompanhe o status de preparação, despacho e entrega dos seus pedidos.",
        },
      },
      {
        type: "portal_carnes_bills",
        config: {
          title: "Carnês & Boletos em Aberto",
          subtitle: "Acesse parcelas e gere códigos Pix para liquidação imediata.",
        },
      },
      {
        type: "reputation_score_header",
        config: {
          company_name: "Loja Oficial",
          reputation_score: 9.6,
          reputation_badge: "Excelente",
          total_complaints: 4,
          resolved_percentage: 100,
        },
      },
      {
        type: "reputation_badges_strip",
        config: {},
      },
    ],
  },
];

export const SERVICES_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_services_home",
    name: "Apresentação & Especialistas",
    niche: "services",
    slug: "inicio-servicos",
    title: "Início — Atendimento & Consultoria Especializada",
    document_type: "storefront",
    is_home: true,
    badge: "App Serviços • Home",
    description: "Página de apresentação com diferenciais em Bento grid, equipe técnica e depoimentos reais.",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "ATENDIMENTO DE EXCELÊNCIA",
          title: "Soluções profissionais sob medida com agendamento simplificado.",
          subtitle: "Conheça nossos serviços, simule valores e reserve horários com nossa equipe de especialistas.",
          primaryCta: { label: "Agendar Horário", href: "#agendamento" },
          secondaryCta: { label: "Calcular Cotação", href: "#simulador" },
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Por Que Escolher Nossos Serviços",
          sectionSubtitle: "Compromisso com pontualidade, rigor técnico e satisfação garantida.",
          cells: [
            { id: "s-1", tag: "QUALIFICAÇÃO", title: "Profissionais Certificados", description: "Equipe com titulação e ampla experiência de mercado.", colSpan: 2 },
            { id: "s-2", tag: "AGILIDADE", title: "Confirmação Imediata", description: "Notificações de lembrete diretamente pelo WhatsApp.", colSpan: 1 },
            { id: "s-3", tag: "TRANSPARÊNCIA", title: "Valores Claros", description: "Sem taxas ocultas ou surpresas na conclusão do atendimento.", colSpan: 1 },
            { id: "s-4", tag: "GARANTIA", title: "Suporte Pós-Atendimento", description: "Acompanhamento dedicado para assegurar os melhores resultados.", colSpan: 2 },
          ],
        },
      },
      {
        type: "specialist_team_grid",
        config: {
          title: "Nossa Equipe de Especialistas",
          subtitle: "Profissionais dedicados prontos para oferecer a melhor assistência.",
        },
      },
      {
        type: "trust_badges",
        config: {
          badges: [
            { icon: "ShieldCheck", title: "Profissionais Credenciados", description: "Registros e licenças ativas" },
            { icon: "Clock", title: "Pontualidade Rigorosa", description: "Horários agendados sem atrasos" },
            { icon: "RotateCcw", title: "Garantia de Satisfação", description: "Revisão garantida sem custo adicional" },
          ],
        },
      },
    ],
  },
  {
    id: "wix_services_booking",
    name: "Agendamento Online & Agenda",
    niche: "services",
    slug: "agendamento-online",
    title: "Agendar Horário — Seleção de Data e Serviço",
    document_type: "landing_page",
    is_home: false,
    badge: "App Serviços • Agenda",
    description: "Calendário interativo integrado à agenda dos profissionais com confirmação por WhatsApp.",
    blocks: [
      {
        type: "booking_calendar",
        config: {
          title: "Escolha o Dia e Horário Desejado",
          subtitle: "Consulte a disponibilidade em tempo real e garanta sua reserva em minutos.",
        },
      },
      {
        type: "service_pricing_table",
        config: {
          title: "Tabela de Procedimentos & Serviços",
          subtitle: "Confira a relação completa de atendimentos, duração e valores correspondentes.",
        },
      },
      {
        type: "routine_steps",
        config: {
          title: "Passo a Passo do Atendimento",
          steps: [
            { step: "1", title: "Escolha na Agenda", description: "Selecione o profissional e o melhor dia/horário." },
            { step: "2", title: "Confirmação Imediata", description: "Você receberá uma confirmação com os detalhes no WhatsApp." },
            { step: "3", title: "Atendimento Realizado", description: "Compareça no local ou conecte-se na sala virtual." },
          ],
        },
      },
    ],
  },
  {
    id: "wix_services_calculator",
    name: "Simulador de Cotação Interativa",
    niche: "services",
    slug: "simulador-cotacao",
    title: "Simule sua Cotação — Orçamento em Tempo Real",
    document_type: "landing_page",
    is_home: false,
    badge: "App Serviços • Cotação",
    description: "Calculadora em tempo real para orçamentos complexos com opcionais e envio para CRM.",
    blocks: [
      {
        type: "interactive_quote_calculator",
        config: {
          title: "Calculadora de Proposta & Serviços",
          subtitle: "Selecione os parâmetros e comodidades para obter uma estimativa de investimento instantânea.",
          basePriceCents: 25000,
          unitLabel: "Hora de Consultoria",
          unitPluralLabel: "Horas de Consultoria",
          minUnits: 1,
          maxUnits: 20,
          defaultUnits: 4,
          unitPriceCents: 12000,
          options: [
            {
              id: "opt-urgencia",
              label: "Atendimento Prioritário (Em até 24h)",
              description: "Início imediato fora do horário comercial.",
              priceCents: 15000,
              isDefault: false,
            },
            {
              id: "opt-laudo",
              label: "Emissão de Laudo Técnico Assinado",
              description: "Documento oficial assinado com certificação digital.",
              priceCents: 8000,
              isDefault: true,
            },
          ],
          whatsappNumber: "5511999998888",
          submitButtonText: "Solicitar Proposta Formal",
          successMessage: "Simulação recebida! Enviaremos a proposta detalhada em breve.",
          disclaimer: "Estimativa inicial não vinculante. Valores finais formalizados em contrato de prestação de serviços.",
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre Orçamentos",
          subtitle: "Esclarecimentos sobre formas de pagamento, prazos e escopo.",
          items: [
            {
              id: "faq-svc-1",
              question: "Os valores calculados incluem emissão de Nota Fiscal?",
              answer: "Sim. Todos os serviços prestados contam com emissão regular de Nota Fiscal de Serviços eletrônica (NFS-e).",
            },
            {
              id: "faq-svc-2",
              question: "Como funciona a forma de pagamento?",
              answer: "Aceitamos Pix instantâneo, boleto bancário faturado para empresas e parcelamento no cartão em até 12x.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Dúvidas Específicas ou Projetos Customizados",
          subtitle: "Caso sua necessidade exija escopo personalizado, fale diretamente com nossa diretoria técnica.",
          submitButtonText: "Enviar Mensagem Direta",
          whatsappNumber: "5511999998888",
        },
      },
    ],
  },
  {
    id: "wix_services_portal",
    name: "Central de Atendimento & Contratos",
    niche: "services",
    slug: "meus-atendimentos",
    title: "Minha Área — Agendamentos e Contratos",
    document_type: "institutional",
    is_home: false,
    badge: "App Serviços • Portal",
    description: "Painel do cliente para consulta de horários marcados, download de contratos e assinatura digital.",
    blocks: [
      {
        type: "portal_appointments",
        config: {
          title: "Meus Agendamentos Confirmados",
          subtitle: "Consulte data, horário e profissional responsável pelo seu atendimento.",
        },
      },
      {
        type: "portal_contracts",
        config: {
          title: "Contratos de Prestação de Serviços",
          subtitle: "Documentos pendentes de assinatura e termos vigentes com validade jurídica.",
        },
      },
      {
        type: "office_contract_viewer",
        config: {
          title: "Assinador Digital Integrado",
          documentNumber: "CONTRATO-SERVICOS-2027",
        },
      },
    ],
  },
];

export const FORM_LEAD_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_lead_quiz",
    name: "Quiz Interativo & Diagnóstico de Leads",
    niche: "general",
    slug: "quiz-diagnostico",
    title: "Quiz Diagnóstico — Descubra a Solução Ideal",
    document_type: "landing_page",
    is_home: false,
    badge: "App Formulários • Quiz",
    description: "Quiz dinâmico multi-etapas com qualificação de perfil e captura direta para o CRM.",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "DIAGNÓSTICO PERSONALIZADO EM 2 MINUTOS",
          title: "Descubra qual a melhor estratégia para o seu momento de vida ou negócio.",
          subtitle: "Responda a 3 perguntas rápidas e receba uma orientação sob medida dos nossos consultores.",
          primaryCta: { label: "Iniciar Diagnóstico", href: "#formulario" },
        },
      },
      {
        type: "routine_steps",
        config: {
          title: "Como Funciona o Diagnóstico",
          steps: [
            { step: "1", title: "Responda o Briefing", description: "Informe seu perfil e principais desafios atuais." },
            { step: "2", title: "Análise da Equipe", description: "Cruzamos suas necessidades com nossas soluções." },
            { step: "3", title: "Receba o Plano", description: "Proposta formal detalhada enviada diretamente no seu WhatsApp." },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Envie seus Dados para Receber o Relatório",
          subtitle: "Garantimos sigilo absoluto e resposta em até 2 horas úteis.",
          submitButtonText: "Receber Diagnóstico Gratuito",
          whatsappNumber: "5511999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Respostas gravadas com sucesso! Entraremos em contato com a devolutiva.",
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Resultados de Quem Já Fez o Diagnóstico",
          subtitle: "Veja a experiência de outros clientes que transformaram seus resultados.",
          testimonials: [],
        },
      },
    ],
  },
  {
    id: "wix_lead_survey",
    name: "Pesquisa de Satisfação & Feedback (NPS)",
    niche: "general",
    slug: "pesquisa-satisfacao",
    title: "Pesquisa de Satisfação — Avalie sua Experiência",
    document_type: "institutional",
    is_home: false,
    badge: "App Formulários • NPS",
    description: "Formulário de avaliação pós-venda para medir reputação, coletar depoimentos e melhorar processos.",
    blocks: [
      {
        type: "reputation_score_header",
        config: {
          company_name: "Atendimento & Qualidade",
          reputation_score: 9.8,
          reputation_badge: "Excelente",
          total_complaints: 0,
          resolved_percentage: 100,
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Sua Opinião Faz Toda a Diferença",
          subtitle: "Conte-nos como foi seu atendimento para continuarmos aprimorando nossos serviços.",
          submitButtonText: "Enviar Avaliação",
          whatsappNumber: "5511999998888",
          showPhoneField: false,
          showMessageField: true,
          successMessage: "Agradecemos de coração pelo seu feedback!",
        },
      },
      {
        type: "trust_badges",
        config: {
          badges: [
            { icon: "ShieldCheck", title: "Opinião Verificada", description: "Avaliações auditadas de clientes reais" },
            { icon: "HeartHandshake", title: "Compromisso com Você", description: "Melhoria contínua de nossos processos" },
          ],
        },
      },
    ],
  },
  {
    id: "wix_lead_careers",
    name: "Trabalhe Conosco & Banco de Talentos",
    niche: "general",
    slug: "trabalhe-conosco",
    title: "Carreiras — Venha Fazer Parte da Nossa Equipe",
    document_type: "institutional",
    is_home: false,
    badge: "App Formulários • RH",
    description: "Página de recrutamento e seleção com mural de vagas abertas e captação de currículos.",
    blocks: [
      {
        type: "careers_hero_banner",
        config: {
          title: "Construa sua Carreira Conosco",
          subtitle: "Buscamos pessoas apaixonadas por excelência, autonomia e crescimento acelerado.",
        },
      },
      {
        type: "careers_job_grid",
        config: {
          title: "Oportunidades em Aberto",
          subtitle: "Confira as vagas disponíveis e encontre a posição ideal para seu perfil.",
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Banco de Talentos",
          subtitle: "Não encontrou uma vaga para o seu perfil? Envie seu currículo para posições futuras.",
          submitButtonText: "Enviar Candidatura",
          whatsappNumber: "5511999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Candidatura recebida! Nossa equipe de Gente & Gestão avaliará seu perfil.",
        },
      },
    ],
  },
];

export function getTemplateById(id: string): NicheTemplateDefinition | undefined {
  return (
    NICHE_TEMPLATE_MATRIX.find((t) => t.id === id) ||
    TOURISM_WIX_APP_PAGES.find((t) => t.id === id) ||
    COMMERCE_WIX_APP_PAGES.find((t) => t.id === id) ||
    SERVICES_WIX_APP_PAGES.find((t) => t.id === id) ||
    FORM_LEAD_WIX_APP_PAGES.find((t) => t.id === id)
  );
}

export function getTemplateByNiche(niche: string): NicheTemplateDefinition {
  const found = NICHE_TEMPLATE_MATRIX.find((t) => t.niche === niche);
  return found || NICHE_TEMPLATE_MATRIX[0];
}

/**
 * Injeta o array de blocos do template selecionado no documento da página
 */
export function applyTemplateToPage(page: OmniPageDocument, templateId: string): OmniPageDocument {
  const template = getTemplateById(templateId);
  if (!template) return page;

  const hydratedBlocks: OmniBlockInstance[] = template.blocks.map((block, index) => ({
    id: `blk_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
    type: block.type,
    config: JSON.parse(JSON.stringify(block.config)),
    styling: block.styling ? JSON.parse(JSON.stringify(block.styling)) : undefined,
    isHidden: false,
  }));

  return {
    ...page,
    schemaVersion: page.schemaVersion ?? 1,
    niche: template.niche,
    source_template_id: template.id,
    source_template_version: "1.0.0",
    blocks: hydratedBlocks,
    updated_at: new Date().toISOString(),
  };
}

