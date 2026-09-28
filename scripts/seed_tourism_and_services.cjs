const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEFAULT_PROFILE_ID = "2ea9f0aa-8b04-4086-9e1d-e23105560302";
const FASHION_STORE_ID = "32233049-07c6-49bf-a053-989824fef385"; // Loja Moda Teste (Chapecó)
const TOURISM_STORE_ID = "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7"; // Excelência Tour São Miguel do Oeste

// ==============================================================================
// 1. TOURISM EXPERIENCES SEEDS
// ==============================================================================
const TOURISM_EXPERIENCES = [
  {
    title: "Excursão Beto Carrero World & Litoral Norte",
    subtitle: "2 dias mágicos no maior parque temático da América Latina com transporte leito",
    description: "Pacote completo rodoviário com saída de Chapecó e região Oeste Catarinense. Inclui 2 dias inteiros de passaporte no Beto Carrero World, hospedagem selecionada com café da manhã próximo à praia da Penha, transporte em ônibus leito total com serviço de bordo e guia credenciado MTur durante toda a viagem.",
    category: "group_tour",
    location: "Penha, Santa Catarina",
    destination: "Penha, SC",
    destination_city: "Penha",
    departure_city: "Chapecó, SC",
    departure_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    departure_time: "05:00",
    return_date: new Date(Date.now() + 16 * 86400000).toISOString(),
    return_time: "22:00",
    duration: "2 Dias / 1 Noite",
    price_display: "R$ 690,00",
    price_cents: 69000,
    image_url: "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=1200&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=1200&auto=format&fit=crop&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop&q=80",
    ],
    provider_name: "Excelência Tour & Viagens",
    contact_whatsapp: "49991716233",
    rating: 4.95,
    total_seats: 46,
    available_seats: 14,
    included_items: [
      "Transporte em ônibus leito total com ar e Wi-Fi",
      "Passaporte de 2 dias de acesso ao Beto Carrero World",
      "1 diária em hotel com café da manhã incluso",
      "Serviço de bordo com lanches e bebidas",
      "Seguro viagem individual Porto Seguro",
      "Guia acompanhante credenciado MTur",
    ],
    what_to_bring: [
      "Documento de identificação oficial com foto",
      "Calçado confortável para caminhadas",
      "Protetor solar e óculos escuros",
      "Capa de chuva ou agasalho leve",
    ],
    notes: "Embarques em São Miguel do Oeste, Maravilha, Pinhalzinho e Chapecó.",
    is_featured: true,
    status: "active",
  },
  {
    title: "Expedição Canyons de Praia Grande & Aparados da Serra",
    subtitle: "Trilhas imersivas, cachoeiras e mirantes nos cânions mais impressionantes do Brasil",
    description: "Experiência de ecoturismo e aventura aos pés dos Cânions Itaimbezinho e Fortaleza. Roteiro de 3 dias com guias de montanha locais, visitação às piscinas naturais do Rio do Boi, hospedagem em pousada de serra charmosa e possibilidade de voo de balão ao amanhecer.",
    category: "aventura",
    location: "Praia Grande, Santa Catarina",
    destination: "Praia Grande, SC",
    destination_city: "Praia Grande",
    departure_city: "Chapecó, SC",
    departure_date: new Date(Date.now() + 21 * 86400000).toISOString(),
    departure_time: "06:00",
    return_date: new Date(Date.now() + 24 * 86400000).toISOString(),
    return_time: "20:00",
    duration: "3 Dias / 2 Noites",
    price_display: "R$ 1.190,00",
    price_cents: 119000,
    image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&auto=format&fit=crop&q=80",
    ],
    provider_name: "Excelência Tour & Ecoturismo",
    contact_whatsapp: "49991716233",
    rating: 4.98,
    total_seats: 24,
    available_seats: 9,
    included_items: [
      "Transporte executivo climatizado",
      "2 noites de hospedagem com café da manhã artesanal",
      "Ingressos para os Parques Nacionais de Aparados da Serra",
      "Condutores de ecoturismo certificados",
      "Perneiras de proteção para trilhas fluviais",
      "Seguro para esportes de aventura",
    ],
    what_to_bring: [
      "Bota ou tênis de trilha antiderrapante",
      "Mochila pequena de ataque (20L)",
      "Garrafa térmica de água (1.5L)",
      "Repelente e protetor solar",
    ],
    notes: "Nível de dificuldade moderado. Indicado para quem aprecia natureza e belas paisagens.",
    is_featured: true,
    status: "active",
  },
  {
    title: "Descanso & Águas Termais em Piratuba",
    subtitle: "Pensão completa, relaxamento nas termas e passeio histórico de Maria Fumaça",
    description: "Roteiro perfeito para relaxar e renovar as energias. Hospedagem de 3 dias no coração da estância termal de Piratuba com todas as refeições inclusas (café, almoço e jantar com noites temáticas), acesso ilimitado ao complexo de piscinas térmicas com águas sulfurosas a 38°C e passeio nostálgico na histórica ferrovia de Maria Fumaça até Marcelino Ramos.",
    category: "hospedagens",
    location: "Piratuba, Santa Catarina",
    destination: "Piratuba, SC",
    destination_city: "Piratuba",
    departure_city: "Chapecó, SC",
    departure_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    departure_time: "07:30",
    return_date: new Date(Date.now() + 13 * 86400000).toISOString(),
    return_time: "18:00",
    duration: "3 Dias / 2 Noites",
    price_display: "R$ 880,00",
    price_cents: 88000,
    image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&auto=format&fit=crop&q=80",
    ],
    provider_name: "Excelência Tour Piratuba",
    contact_whatsapp: "49991716233",
    rating: 4.88,
    total_seats: 44,
    available_seats: 16,
    included_items: [
      "Transporte ida e volta em ônibus turismo",
      "2 diárias em hotel parceiro com pensão completa",
      "Ingressos ao complexo termal municipal",
      "Passeio de Maria Fumaça histórico incluso",
      "Noite com baile e música ao vivo",
    ],
    what_to_bring: [
      "Trajes de banho para piscinas termais",
      "Roupão ou toalha para parque termal",
      "Medicamentos de uso contínuo",
    ],
    notes: "Excelente opção para famílias e melhor idade.",
    is_featured: false,
    status: "active",
  },
  {
    title: "Enoturismo & Sabores do Vale dos Vinhedos",
    subtitle: "Degustação guiada em vinícolas boutique, almoço colonial típico e cantinas italianas",
    description: "Um mergulho inesquecível na cultura dos imigrantes italianos e na melhor produção vitivinícola do Sul do Brasil. Visita a três vinícolas premiadas na região de Bento Gonçalves, Garibaldi e Monte Belo do Sul, com degustação de espumantes método tradicional, vinhos finos e almoço com galeto al primo canto e polenta na chapa.",
    category: "gastronomia_turistica",
    location: "Bento Gonçalves, Rio Grande do Sul",
    destination: "Bento Gonçalves, RS",
    destination_city: "Bento Gonçalves",
    departure_city: "Chapecó, SC",
    departure_date: new Date(Date.now() + 28 * 86400000).toISOString(),
    departure_time: "05:30",
    return_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    return_time: "21:30",
    duration: "2 Dias / 1 Noite",
    price_display: "R$ 790,00",
    price_cents: 79000,
    image_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=1200&auto=format&fit=crop&q=80",
    ],
    provider_name: "Excelência Tour Rota do Vinho",
    contact_whatsapp: "49991716233",
    rating: 4.92,
    total_seats: 32,
    available_seats: 11,
    included_items: [
      "Transporte confortável categoria executiva",
      "1 diária de hotel central com café colonial farto",
      "Taxas de degustação em 3 vinícolas boutique",
      "Almoço típico italiano em cantina histórica",
      "Taça de cristal comemorativa do circuito",
    ],
    what_to_bring: [
      "Roupas de meia estação elegantes e confortáveis",
      "Casaco para noites frias na serra",
      "Espaço na bagagem para vinhos e queijos artesanais",
    ],
    notes: "Proibido consumo de bebidas alcoólicas por menores de 18 anos.",
    is_featured: false,
    status: "active",
  },
  {
    title: "Passeio de Catamarã & Torres Submersas de Itá",
    subtitle: "Navegação cênica de 2 horas pelo lago de Itá com almoço colonial no mirante",
    description: "Conheça a impressionante história da cidade que foi reconstruída para a formação da represa de Itá. O passeio de barco navega ao redor das históricas torres da antiga igreja matriz que permaneceram acima d'água, seguido de visitação ao mirante da Usina Hidrelétrica de Itá e almoço colonial com vista panorâmica para o Rio Uruguai.",
    category: "passeios",
    location: "Itá, Santa Catarina",
    destination: "Itá, SC",
    destination_city: "Itá",
    departure_city: "Itá, SC",
    departure_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    departure_time: "09:00",
    return_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    return_time: "17:00",
    duration: "1 Dia Inteiro",
    price_display: "R$ 180,00",
    price_cents: 18000,
    image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop&q=80",
    ],
    provider_name: "Catamarã & Ecotur Itá",
    contact_whatsapp: "49991716233",
    rating: 4.85,
    total_seats: 50,
    available_seats: 22,
    included_items: [
      "Ingresso para passeio de barco com narração histórica",
      "Almoço buffet livre em restaurante colonial",
      "Taxa de visitação aos mirantes da usina",
    ],
    what_to_bring: [
      "Óculos de sol, chapéu ou boné",
      "Câmera fotográfica ou smartphone carregado",
    ],
    notes: "Ponto de encontro no atracadouro náutico de Itá.",
    is_featured: false,
    status: "active",
  },
  {
    title: "Gramado & Canela Encantos da Serra Gaúcha",
    subtitle: "Roteiro completo de 4 dias com Snowland, Lago Negro e fábricas de chocolate",
    description: "A viagem dos sonhos para a serra mais charmosa do Brasil. Saída noturna confortável em ônibus semi-leito. 4 dias inesquecíveis passando pelos pontos mais famosos: Mini Mundo, Snowland (único parque de neve coberto das Américas), Catedral de Pedra de Canela, Lago Negro e as melhores lojas de queijos, vinhos e chocolates de Gramado.",
    category: "travel_package",
    location: "Gramado & Canela, Rio Grande do Sul",
    destination: "Gramado, RS",
    destination_city: "Gramado",
    departure_city: "Chapecó, SC",
    departure_date: new Date(Date.now() + 35 * 86400000).toISOString(),
    departure_time: "22:00",
    return_date: new Date(Date.now() + 39 * 86400000).toISOString(),
    return_time: "23:00",
    duration: "4 Dias / 3 Noites",
    price_display: "R$ 1.490,00",
    price_cents: 149000,
    image_url: "https://images.unsplash.com/photo-1548625361-195feee89a0f?w=1200&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1548625361-195feee89a0f?w=1200&auto=format&fit=crop&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1548625361-195feee89a0f?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=1200&auto=format&fit=crop&q=80",
    ],
    provider_name: "Excelência Tour Serra Gaúcha",
    contact_whatsapp: "49991716233",
    rating: 4.96,
    total_seats: 46,
    available_seats: 12,
    included_items: [
      "Transporte ônibus semi-leito Double Decker",
      "3 diárias com buffet de café da manhã em Gramado",
      "Translado para os principais atrativos turísticos",
      "Guia turístico acompanhante credenciado",
      "Seguro viagem completo",
    ],
    what_to_bring: [
      "Roupas de inverno aconchegantes",
      "Luvas e gorro de lã para o Snowland",
      "Documentos pessoais",
    ],
    notes: "Parcelamento disponível em até 10x sem juros.",
    is_featured: true,
    status: "active",
  },
  {
    title: "Cabana Romântica Boutique na Serra Catarinense",
    subtitle: "Refúgio exclusivo nas alturas de Urubici com ofurô aquecido, lareira e vista panorâmica",
    description: "Hospedagem sofisticada para casais que buscam paz, romantismo e contato íntimo com a natureza em Urubici. A cabana conta com ofurô com hidromassagem e deck panorâmico para as montanhas, lareira a lenha europeia, cama king size com lençóis de 400 fios, cesta de café da manhã colonial entregue pontualmente na cabana e adega climatizada.",
    category: "hospedagens",
    location: "Urubici, Santa Catarina",
    destination: "Urubici, SC",
    destination_city: "Urubici",
    departure_city: "Urubici, SC",
    departure_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    departure_time: "14:00",
    return_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    return_time: "12:00",
    duration: "3 Dias / 2 Noites",
    price_display: "R$ 1.350,00",
    price_cents: 135000,
    image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&auto=format&fit=crop&q=80",
    ],
    provider_name: "Refúgio das Araucárias Boutique",
    contact_whatsapp: "49991716233",
    rating: 5.0,
    total_seats: 2,
    available_seats: 1,
    included_items: [
      "Diárias completas para 2 adultos",
      "Ofurô com sais de banho e hidromassagem",
      "Cesta diária de café colonial artesanal",
      "Lenha para lareira à vontade",
      "Garrafa de boas-vindas de espumante da Serra",
    ],
    what_to_bring: [
      "Agasalhos reforçados (temperaturas amenas à noite)",
      "Itens de preferência para jantares românticos",
    ],
    notes: "Acesso por estrada asfaltada a 12km do centro de Urubici.",
    is_featured: false,
    status: "active",
  },
  {
    title: "Circuito Histórico & Memórias da Colonização do Oeste",
    subtitle: "Roteiro cultural com visita ao Museu Tropeiro, Arena Condá e polo cerâmico",
    description: "Um dia completo descobrindo a história e as origens da imigração no Grande Oeste de Santa Catarina. O passeio percorre o Museu Tropeiro, o memorial cultural indígena e caboclo, o centro de eventos e estádio Arena Condá, finalizando com café da tarde tradicional na rota dos queijos e embutidos artesanais de Chapecó.",
    category: "cultura",
    location: "Chapecó, Santa Catarina",
    destination: "Chapecó, SC",
    destination_city: "Chapecó",
    departure_city: "Chapecó, SC",
    departure_date: new Date(Date.now() + 8 * 86400000).toISOString(),
    departure_time: "08:30",
    return_date: new Date(Date.now() + 8 * 86400000).toISOString(),
    return_time: "17:30",
    duration: "1 Dia Inteiro",
    price_display: "R$ 140,00",
    price_cents: 14000,
    image_url: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=1200&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=1200&auto=format&fit=crop&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=1200&auto=format&fit=crop&q=80",
    ],
    provider_name: "Rotas do Oeste Turismo Cultural",
    contact_whatsapp: "49991716233",
    rating: 4.89,
    total_seats: 25,
    available_seats: 15,
    included_items: [
      "Transporte em micro-ônibus com ar condicionado",
      "Entrada em todos os museus e centros culturais",
      "Guia historiador local especializado",
      "Café da tarde colonial farto",
    ],
    what_to_bring: [
      "Calçado confortável",
      "Curiosidade e espírito de aprendizado",
    ],
    notes: "Ponto de partida na Praça Coronel Bertaso em Chapecó.",
    is_featured: false,
    status: "active",
  },
];

// ==============================================================================
// 2. BOOKING SERVICES SEEDS
// ==============================================================================
const BOOKING_SERVICES = [
  {
    title: "Corte Masculino Visagista & Fade / Degradê",
    description: "Corte milimétrico com tesoura e máquina, análise visagista do formato do crânio e rosto, lavagem mentolada refrescante com massagem capilar e finalização com pomada matte premium.",
    duration_minutes: 40,
    price_cents: 6000, // R$ 60,00
    category: "barbearia",
    gender_target: "masculino",
    modality: "in_store",
    image_url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80",
    included_items: [
      "Consultoria visagista pré-corte",
      "Lavagem com shampoo anticaspa e mentol refrescante",
      "Corte tesoura e máquina de alta precisão",
      "Finalização com pomada matte de fixação duradoura",
    ],
    cancellation_policy: "Cancelamento ou reagendamento gratuito com até 2 horas de antecedência.",
    guidelines: "Chegar com 5 minutos de antecedência para melhor comodidade.",
  },
  {
    title: "Barboterapia Tradicional com Toalha Quente",
    description: "Modelagem e desenho da barba com navalhete descartável, protocolo de toalha quente com óleos essenciais de eucalipto, esfoliação suave da pele e bálsamo hidratante anti-irritação.",
    duration_minutes: 35,
    price_cents: 5000, // R$ 50,00
    category: "barbearia",
    gender_target: "masculino",
    modality: "in_store",
    image_url: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80",
    included_items: [
      "Aplicação de óleo pré-barba amaciante",
      "Toalha quente com vapor aromatizado",
      "Alinhamento e navalhagem suave",
      "Bálsamo pós-barba refrescante",
    ],
    cancellation_policy: "Cancelamento gratuito até 1 hora antes.",
    guidelines: "Evite raspar a barba no dia anterior para permitir desenho perfeito.",
  },
  {
    title: "Corte Feminino com Visagismo & Escova Modeladora",
    description: "Corte personalizado de acordo com o estilo de vida e harmonia facial (camadas, reto, bob, long bob ou repicado), lavagem premium com produtos Kérastase e escova de alta fixação com brilho acetinado.",
    duration_minutes: 60,
    price_cents: 14000, // R$ 140,00
    category: "salao_cabelo",
    gender_target: "feminino",
    modality: "in_store",
    image_url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    included_items: [
      "Análise capilar e visagista detalhada",
      "Lavagem relaxante no lavatório com massagem",
      "Corte e texturização de pontas",
      "Escova e modelagem com proteção térmica",
    ],
    cancellation_policy: "Reagendamento sem taxas com até 3 horas de antecedência.",
    guidelines: "Caso possua apliques ou mega hair, informe na observação do agendamento.",
  },
  {
    title: "Alongamento em Fibra de Vidro & Manicure Russa",
    description: "Extensão de unhas ultra resistente com aspecto delicado e natural em fibra de vidro, formato customizado (amendoada, quadrada ou bailarina), cutilagem a seco russa e esmaltação em gel de longa duração.",
    duration_minutes: 120,
    price_cents: 19000, // R$ 190,00
    category: "unhas_manicure",
    gender_target: "feminino",
    modality: "in_store",
    image_url: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=80",
    included_items: [
      "Mapeamento e assepsia profunda das unhas",
      "Aplicação da fibra de vidro de alta durabilidade",
      "Cutilagem combinada método russo",
      "Esmaltação em gel com secagem em cabine LED",
      "Hidratação com óleo essencial de cutículas",
    ],
    cancellation_policy: "Aviso prévio mínimo de 4 horas para cancelamento sem custo.",
    guidelines: "Manutenção recomendada a cada 20 a 25 dias.",
  },
  {
    title: "Limpeza de Pele Profunda com Peeling de Diamante & LED",
    description: "Higienização profunda dos poros, emoliência biológica sem dor, extração manual e a vácuo de comedões/cravos, esfoliação com ponteira diamantada, máscara de ouro calmante e fototerapia LED bactericida e regenerativa.",
    duration_minutes: 75,
    price_cents: 16000, // R$ 160,00
    category: "estetica_massagem",
    gender_target: "unissex",
    modality: "in_store",
    image_url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80",
    included_items: [
      "Higienização com sabonete glicólico",
      "Emoliência com máscara térmica",
      "Extração cuidadosa de cravos e impurezas",
      "Peeling de diamante com renovação celular",
      "Fotobiomodulação com LED azul e vermelho",
      "Protetor solar toque seco",
    ],
    cancellation_policy: "Cancelamento gratuito com 2 horas de antecedência.",
    guidelines: "Evite exposição direta ao sol nas 48h seguintes ao procedimento.",
  },
  {
    title: "Sessão de Fisioterapia & Quiropraxia Postural",
    description: "Avaliação biomecânica completa da coluna e articulações, liberação miofascial instrumental para alívio de nós de tensão e pontos de gatilho, ajustes e manipulações articulares de quiropraxia e orientações de ergonomia.",
    duration_minutes: 60,
    price_cents: 18000, // R$ 180,00
    category: "saude_fisioterapia",
    gender_target: "unissex",
    modality: "in_store",
    image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
    included_items: [
      "Análise postural e testes de amplitude",
      "Terapia manual e liberação miofascial",
      "Ajustes articulares de coluna e pelve",
      "Exercícios corretivos e plano de tratamento",
    ],
    cancellation_policy: "Tolerância de 10 minutos. Cancelamentos sem ônus com 2h de antecedência.",
    guidelines: "Vir com roupas leves e confortáveis (shorts/legging e camiseta).",
  },
  {
    title: "Banho Terapêutico & Tosa Higiênica Pet Premium",
    description: "Banho morno relaxante com água tratada e ozonizada, shampoo hipoalergênico e máscara de hidratação de argan, secagem com proteção acústica, corte e lixamento de unhas, limpeza de ouvidos e tosa higiênica precisa.",
    duration_minutes: 60,
    price_cents: 9500, // R$ 95,00
    category: "pet_shop",
    gender_target: "todos",
    modality: "in_store",
    image_url: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80",
    included_items: [
      "Banho com água ozonizada e cosméticos veganos",
      "Hidratação dos pelos com óleo de argan",
      "Tosa higiênica nas patinhas e área íntima",
      "Limpeza auricular e corte de unhas",
      "Laço ou gravata e perfume suave",
    ],
    cancellation_policy: "Avisar com 1h de antecedência caso não possa comparecer.",
    guidelines: "Trazer a carteirinha de vacinação em dia no primeiro agendamento.",
  },
  {
    title: "Consultoria de Imagem, Estilo & Personal Shopper",
    description: "Sessão presencial individual de 90 minutos para diagnóstico de estilo pessoal, análise cromática (coloração pessoal), mapeamento de silhueta e montagem de looks versáteis para ocasiões profissionais e sociais.",
    duration_minutes: 90,
    price_cents: 25000, // R$ 250,00
    category: "personal_fitness",
    gender_target: "unissex",
    modality: "in_store",
    image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80",
    included_items: [
      "Teste presencial de coloração pessoal com tecidos",
      "Dossiê digital exclusivo em PDF com a cartela de cores",
      "Montagem de 5 combinações de looks completos",
      "Guia de compras inteligentes",
    ],
    cancellation_policy: "Cancelamento ou reagendamento gratuito com até 24h de antecedência.",
    guidelines: "Venha sem maquiagem para precisão no teste de cores.",
  },
];

// ==============================================================================
// 3. COMMERCE PRODUCTS SEEDS (Loja Moda Teste)
// ==============================================================================
const RETAIL_PRODUCTS = [
  {
    title: "Camisa de Linho Puro Manga Longa Slim",
    slug: "camisa-linho-puro-manga-longa-slim",
    short_description: "Linho francês nobre pré-encolhido com corte alfaiataria slim fit.",
    description: "Confeccionada com 100% linho puro cultivado na França e lavado a seco, esta camisa combina o frescor inigualável das fibras naturais com a elegância de uma modelagem contemporânea. Possui gola estruturada, botões de madrepérola natural e costuras reforçadas.",
    brand: "Waesy Atelier",
    price_cents: 28900, // R$ 289,00
    compare_at_cents: 34900,
    cost_cents: 11000,
    is_physical: true,
    weight_kg: 0.35,
    images: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "P / Branco", sku: "LINHO-BR-P", stock: 12 },
      { name: "M / Branco", sku: "LINHO-BR-M", stock: 24 },
      { name: "G / Branco", sku: "LINHO-BR-G", stock: 18 },
      { name: "GG / Branco", sku: "LINHO-BR-GG", stock: 8 },
    ],
  },
  {
    title: "Blazer Alfaiataria Italiano Estruturado",
    slug: "blazer-alfaiataria-italiano-estruturado",
    short_description: "Lã fria com corte sob medida, ombreiras suaves e forro em cetim jacquard.",
    description: "O blazer definitivo para quem busca autoridade e elegância impecável. Produzido com lã fria Super 120s que não amassa, possui acabamento com ponto picado feito à mão nas lapelas, abotoamento duplo ou simples e bolsos frontais com portinhola embutida.",
    brand: "Vértice Alfaiataria",
    price_cents: 69000, // R$ 690,00
    compare_at_cents: 85000,
    cost_cents: 29000,
    is_physical: true,
    weight_kg: 0.85,
    images: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "48 / Azul Marinho", sku: "BLAZ-MAR-48", stock: 10 },
      { name: "50 / Azul Marinho", sku: "BLAZ-MAR-50", stock: 15 },
      { name: "52 / Azul Marinho", sku: "BLAZ-MAR-52", stock: 12 },
    ],
  },
  {
    title: "Calça Chino Confort Algodão Egípcio",
    slug: "calca-chino-confort-algodao-egipcio",
    short_description: "Toque aveludado com 3% de elastano para máxima mobilidade no dia a dia.",
    description: "Versatilidade e requinte em uma única peça. Desenvolvida em algodão egípcio de fibra longa e tingimento reativo que mantém o tom original após dezenas de lavagens. Modelagem clássica afunilada, bolsos faca e fecho com gancho de alfaiate.",
    brand: "Waesy Atelier",
    price_cents: 23900, // R$ 239,00
    compare_at_cents: 28900,
    cost_cents: 9500,
    is_physical: true,
    weight_kg: 0.45,
    images: [
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "40 / Cáqui", sku: "CHINO-CAQ-40", stock: 16 },
      { name: "42 / Cáqui", sku: "CHINO-CAQ-42", stock: 20 },
      { name: "44 / Cáqui", sku: "CHINO-CAQ-44", stock: 14 },
    ],
  },
  {
    title: "Vestido Midi Seda Floral Boho Chic",
    slug: "vestido-midi-seda-floral-boho-chic",
    short_description: "Toque suave de seda com caimento fluido, manga 3/4 e cintura ajustável.",
    description: "Fluidez, feminilidade e poesia em cada movimento. Este vestido midi conta com estampa botânica exclusiva desenvolvida em ateliê, forro respirável em viscose pura, decote em V discreto com amarração e babado sutil na barra.",
    brand: "Nordic Studio",
    price_cents: 42000, // R$ 420,00
    compare_at_cents: 52000,
    cost_cents: 16000,
    is_physical: true,
    weight_kg: 0.38,
    images: [
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "P / Floral Terracota", sku: "VEST-FLO-P", stock: 8 },
      { name: "M / Floral Terracota", sku: "VEST-FLO-M", stock: 12 },
      { name: "G / Floral Terracota", sku: "VEST-FLO-G", stock: 9 },
    ],
  },
  {
    title: "Tênis Minimalista Couro Bovino Legítimo",
    slug: "tenis-minimalista-couro-bovino-legitimo",
    short_description: "Design clássico monocrático, palmilha com memória de impacto e solado costurado.",
    description: "Produzido artesanalmente no polo calçadista do Sul com couro nobre vegetal integral. Possui entressola acolchoada e solado de borracha natural vulcanizada 100% costurado (blaqueado) garantindo durabilidade para anos de uso urbano.",
    brand: "Vértice Footwear",
    price_cents: 34900, // R$ 349,00
    compare_at_cents: 42900,
    cost_cents: 14500,
    is_physical: true,
    weight_kg: 0.9,
    images: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "39 / Branco Puro", sku: "TENIS-BR-39", stock: 10 },
      { name: "40 / Branco Puro", sku: "TENIS-BR-40", stock: 15 },
      { name: "41 / Branco Puro", sku: "TENIS-BR-41", stock: 18 },
      { name: "42 / Branco Puro", sku: "TENIS-BR-42", stock: 12 },
    ],
  },
  {
    title: "Jaqueta Bomber Couro Premium Envelhecido",
    slug: "jaqueta-bomber-couro-premium-envelhecido",
    short_description: "Couro bovino espessura 1.2mm, punhos canelados em lã e zíperes YKK antioxidantes.",
    description: "Uma peça herança que ganha mais personalidade a cada ano. Inspirada nas clássicas jaquetas de aviação, conta com forro térmico acolchoado em padrão matelassê, bolsos internos de segurança e gola bomber confortável.",
    brand: "Vértice Alfaiataria",
    price_cents: 98000, // R$ 980,00
    compare_at_cents: 120000,
    cost_cents: 42000,
    is_physical: true,
    weight_kg: 1.4,
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "M / Marrom Café", sku: "BOMB-MAR-M", stock: 6 },
      { name: "G / Marrom Café", sku: "BOMB-MAR-G", stock: 8 },
      { name: "GG / Marrom Café", sku: "BOMB-MAR-GG", stock: 4 },
    ],
  },
  {
    title: "Bolsa Tote Bag Couro Conhaque Artesanal",
    slug: "bolsa-tote-bag-couro-conhaque-artesanal",
    short_description: "Espaço para laptop de até 15\", costuras manuais e metais em banho ouro velho.",
    description: "A companheira perfeita para a rotina executiva e viagens rápidas. Comporta notebook, documentos, nécessaire e garrafa térmica com ampla divisória central e fechamento por zíper de correr suave. Acompanha alça tiracolo removível.",
    brand: "Nordic Studio",
    price_cents: 49000, // R$ 490,00
    compare_at_cents: 59000,
    cost_cents: 18000,
    is_physical: true,
    weight_kg: 0.75,
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "Tamanho Único / Conhaque", sku: "TOTE-CON-U", stock: 15 },
    ],
  },
  {
    title: "Óculos de Sol Acetato Polarizado Havana",
    slug: "oculos-de-sol-acetato-polarizado-havana",
    short_description: "Lentes com proteção UV400 completa, dobradiças alemãs de 5 pontos e estojo rígido.",
    description: "Design clássico atemporal que harmoniza com diversos formatos de rosto. Estrutura esculpida em acetato italiano polido manualmente, com lentes verdes G15 polarizadas que eliminam reflexos solares com clareza cristalina.",
    brand: "Waesy Atelier",
    price_cents: 29900, // R$ 299,00
    compare_at_cents: 36000,
    cost_cents: 8900,
    is_physical: true,
    weight_kg: 0.15,
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1508296695146-257a814070b4?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "Único / Havana Tartaruga", sku: "OCUL-HAV-U", stock: 20 },
    ],
  },
  {
    title: "Suéter Gola Alta Lã Merino Extra Fina",
    slug: "sueter-gola-alta-la-merino-extra-fina",
    short_description: "Fio nobre antialérgico que regula a temperatura corporal naturalmente sem pinicar.",
    description: "A lã Merino é reconhecida globalmente pela maciez incomparável e leveza extrema. Este suéter de gola alta é ideal para composições de inverno sob paletós ou jaquetas, oferecendo aquecimento superior com volume mínimo.",
    brand: "Nordic Studio",
    price_cents: 36000, // R$ 360,00
    compare_at_cents: 43000,
    cost_cents: 13000,
    is_physical: true,
    weight_kg: 0.35,
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "P / Preto Carvão", sku: "SUET-PR-P", stock: 8 },
      { name: "M / Preto Carvão", sku: "SUET-PR-M", stock: 14 },
      { name: "G / Preto Carvão", sku: "SUET-PR-G", stock: 10 },
    ],
  },
  {
    title: "Relógio Cronógrafo Aço Inox Safira",
    slug: "relogio-cronografo-aco-inox-safira",
    short_description: "Movimento quartz japonês de alta precisão, vidro de cristal de safira anti-risco e 5ATM.",
    description: "Minimalismo industrial com acabamento acetinado. Caixa de 40mm em aço inoxidável cirúrgico 316L, mostrador solar discreto, cronógrafo funcional com ponteiros luminescentes e pulseira de malha milanesa ajustável.",
    brand: "Vértice Horlogerie",
    price_cents: 58000, // R$ 580,00
    compare_at_cents: 72000,
    cost_cents: 21000,
    is_physical: true,
    weight_kg: 0.25,
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1000&auto=format&fit=crop&q=80",
    ],
    variants: [
      { name: "Único / Prata & Fundo Preto", sku: "RELOG-PRAT-U", stock: 12 },
    ],
  },
];

async function main() {
  console.log("==================================================================");
  console.log("SEMENTES DO ECOSSISTEMA WAESY: TURISMO, AGENDAMENTOS & PRODUTOS");
  console.log("==================================================================");

  // 1. Inserir Turismo
  console.log("\n1. Inserindo Experiências e Pacotes de Turismo...");
  let tourismCreated = 0;
  for (const item of TOURISM_EXPERIENCES) {
    const payload = {
      ...item,
      store_id: TOURISM_STORE_ID,
      author_profile_id: DEFAULT_PROFILE_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("tourism_experiences").insert(payload);
    if (error) {
      console.error(`- Erro ao inserir "${item.title}":`, error.message);
    } else {
      tourismCreated++;
      console.log(`✓ Turismo inserido: "${item.title}" (${item.price_display})`);
    }
  }

  // 2. Inserir Booking Services
  console.log("\n2. Inserindo Serviços de Agendamento...");
  let servicesCreated = 0;
  const createdServices = [];

  for (const s of BOOKING_SERVICES) {
    const payload = {
      ...s,
      store_id: FASHION_STORE_ID,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("booking_services").insert(payload).select().single();
    if (error) {
      console.error(`- Erro ao inserir serviço "${s.title}":`, error.message);
    } else {
      servicesCreated++;
      createdServices.push(data);
      console.log(`✓ Serviço inserido: "${s.title}" (R$ ${(s.price_cents / 100).toFixed(2)})`);
    }
  }

  // 3. Inserir Pacotes de Serviços (Service Packages)
  console.log("\n3. Inserindo Pacotes de Serviços com Créditos de Sessões...");
  if (createdServices.length > 0) {
    const barberService = createdServices.find((s) => s.category === "barbearia") || createdServices[0];
    const fisioService = createdServices.find((s) => s.category === "saude_fisioterapia") || createdServices[0];
    const manicureService = createdServices.find((s) => s.category === "unhas_manicure") || createdServices[0];

    const PACKAGES = [
      {
        store_id: FASHION_STORE_ID,
        service_id: barberService.id,
        title: "Clube da Barba & Cabelo (4 Sessões Mensais)",
        description: "Assinatura ou pacote de 4 cortes visagistas e barboterapia completos. Economia de 25% com validade de 60 dias e reagendamentos flexíveis.",
        total_credits: 4,
        price_cents: 35000, // R$ 350,00
        validity_days: 60,
        is_recurring: false,
        is_active: true,
      },
      {
        store_id: FASHION_STORE_ID,
        service_id: fisioService.id,
        title: "Tratamento de Alinhamento Postural (5 Sessões)",
        description: "Programa intensivo com 5 sessões completas de fisioterapia, quiropraxia e liberação miofascial. Válido por 90 dias com acompanhamento de evolução.",
        total_credits: 5,
        price_cents: 75000, // R$ 750,00
        validity_days: 90,
        is_recurring: false,
        is_active: true,
      },
      {
        store_id: FASHION_STORE_ID,
        service_id: manicureService.id,
        title: "Passaporte Unhas & Spa dos Pés (4 Cuidados)",
        description: "4 sessões completas de manicure com cutilagem perfeita e spa dos pés relaxante. Validade de 45 dias.",
        total_credits: 4,
        price_cents: 26000, // R$ 260,00
        validity_days: 45,
        is_recurring: false,
        is_active: true,
      },
    ];

    for (const pkg of PACKAGES) {
      const { error } = await supabase.from("service_packages").insert(pkg);
      if (error) {
        console.error(`- Erro ao inserir pacote "${pkg.title}":`, error.message);
      } else {
        console.log(`✓ Pacote inserido: "${pkg.title}" (${pkg.total_credits} créditos / R$ ${(pkg.price_cents / 100).toFixed(2)})`);
      }
    }
  }

  // 4. Inserir Produtos de Varejo / Moda
  console.log("\n4. Inserindo Catálogo de Produtos e Variações de Moda...");
  let productsCreated = 0;

  for (const p of RETAIL_PRODUCTS) {
    const productPayload = {
      store_id: FASHION_STORE_ID,
      title: p.title,
      slug: p.slug,
      short_description: p.short_description,
      description: p.description,
      brand: p.brand,
      price_cents: p.price_cents,
      compare_at_cents: p.compare_at_cents,
      cost_cents: p.cost_cents,
      status: "published",
      is_physical: p.is_physical,
      weight_kg: p.weight_kg,
      publish_to_marketplace: true,
      availability_channels: ["all"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: prod, error: prodErr } = await supabase.from("products").insert(productPayload).select().single();
    if (prodErr) {
      console.error(`- Erro ao criar produto "${p.title}":`, prodErr.message);
      continue;
    }

    productsCreated++;
    console.log(`✓ Produto criado: "${prod.title}" (R$ ${(prod.price_cents / 100).toFixed(2)})`);

    // Inserir Mídias do Produto
    if (p.images && p.images.length > 0) {
      const mediaInserts = p.images.map((url, idx) => ({
        product_id: prod.id,
        url,
        media_type: "image",
        sort_order: idx,
        created_at: new Date().toISOString(),
      }));
      await supabase.from("product_media").insert(mediaInserts);
    }

    // Inserir Variações com Estoque
    if (p.variants && p.variants.length > 0) {
      const variantInserts = p.variants.map((v) => ({
        product_id: prod.id,
        display_name: `${prod.title} — ${v.name}`,
        sku: v.sku,
        status: "active",
        stock_on_hand: v.stock,
        allow_backorder: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await supabase.from("product_variants").insert(variantInserts);
    }
  }

  console.log("\n==================================================================");
  console.log(`RESUMO DO SEEDING:`);
  console.log(`- Turismo: ${tourismCreated} pacotes/experiências criados.`);
  console.log(`- Serviços: ${servicesCreated} serviços de agendamento criados.`);
  console.log(`- Produtos: ${productsCreated} produtos de moda com variações criados.`);
  console.log("==================================================================");
}

main().catch(console.error);
