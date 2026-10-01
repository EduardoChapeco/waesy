/**
 * templates.ts — Matriz Canônica de Templates por Nicho (The Niche Template Matrix)
 * Onboarding instantâneo: o usuário NUNCA começa com uma tela em branco.
 */

import { OmniBlockInstance, OmniPageDocument } from "./types";
import { SITE_BUILDER_BLOCKS } from "./registry";

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

export function getTemplateById(id: string): NicheTemplateDefinition | undefined {
  return NICHE_TEMPLATE_MATRIX.find((t) => t.id === id);
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
    niche: template.niche,
    blocks: hydratedBlocks,
    updated_at: new Date().toISOString(),
  };
}
