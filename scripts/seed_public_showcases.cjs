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

const REAL_ESTATE_ITEMS = [
  {
    title: "Apartamento Alto Padrão no Centro de Chapecó",
    content: "Apartamento com 3 suítes, ampla sacada gourmet com churrasqueira a carvão, piso aquecido nos banheiros, 2 vagas de garagem individuais e depósito. Condomínio com piscina aquecida, academia de ponta e salão de festas.",
    category: "real_estate",
    deal_type: "venda",
    property_type: "apartamento",
    price_cents: 125000000, // R$ 1.250.000,00
    location_name: "Centro — Chapecó - SC",
    bedrooms: 3,
    bathrooms: 4,
    suites: 3,
    parking_spots: 2,
    area_sqm: 168,
    condition: "new",
    whatsapp: "49999123456",
    contact_whatsapp: "49999123456",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Casa Contemporânea em Condomínio Fechado",
    content: "Residência unifamiliar moderna com automação residencial completa, energia solar fotovoltaica, piscina com borda infinita e hidromassagem. Living integrado com pé-direito duplo.",
    category: "real_estate",
    deal_type: "venda",
    property_type: "casa",
    price_cents: 240000000, // R$ 2.400.000,00
    location_name: "Jardim Itália — Chapecó - SC",
    bedrooms: 4,
    bathrooms: 5,
    suites: 4,
    parking_spots: 4,
    area_sqm: 340,
    condition: "new",
    whatsapp: "49999234567",
    contact_whatsapp: "49999234567",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Apartamento Mobiliado 2 Quartos para Locação",
    content: "Apartamento 100% mobiliado e decorado, pronto para morar. Cozinha com eletros embutidos, ar condicionado split em todos os cômodos, sacada com churrasqueira.",
    category: "real_estate",
    deal_type: "aluguel",
    property_type: "apartamento",
    price_cents: 320000, // R$ 3.200,00 / mês
    location_name: "São Cristóvão — Chapecó - SC",
    bedrooms: 2,
    bathrooms: 2,
    suites: 1,
    parking_spots: 1,
    area_sqm: 78,
    condition: "used",
    whatsapp: "49999345678",
    contact_whatsapp: "49999345678",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Studio / Kitnet Universitário Próximo à UFFS e Unochapecó",
    content: "Studio moderno planejado para estudantes e profissionais. Wi-Fi de alta velocidade incluso no condomínio, lavanderia compartilhada OMO e portaria remota 24h.",
    category: "real_estate",
    deal_type: "aluguel",
    property_type: "apartamento",
    price_cents: 145000, // R$ 1.450,00 / mês
    location_name: "Efapi — Chapecó - SC",
    bedrooms: 1,
    bathrooms: 1,
    suites: 0,
    parking_spots: 0,
    area_sqm: 35,
    condition: "used",
    whatsapp: "49999456789",
    contact_whatsapp: "49999456789",
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Sala Comercial em Centro Executivo Corporativo",
    content: "Sala comercial pronta para consultório, escritório de advocacia ou tecnologia. Piso em porcelanato retificado, forro rebaixado em gesso com luminárias LED, 1 vaga privativa.",
    category: "real_estate",
    deal_type: "comercial",
    property_type: "sala_comercial",
    price_cents: 280000, // R$ 2.800,00 / mês
    location_name: "Centro — Chapecó - SC",
    bedrooms: 0,
    bathrooms: 1,
    suites: 0,
    parking_spots: 1,
    area_sqm: 52,
    condition: "new",
    whatsapp: "49999567890",
    contact_whatsapp: "49999567890",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Pavilhão Industrial e Logístico com Doca",
    content: "Galpão industrial com pé direito de 9 metros, piso industrial de alta resistência com capacidade de 6 ton/m², doca de carga e descarga para carretas, escritório administrativo com vestiários.",
    category: "real_estate",
    deal_type: "comercial",
    property_type: "galpao",
    price_cents: 1800000, // R$ 18.000,00 / mês
    location_name: "Distrito Industrial — Chapecó - SC",
    bedrooms: 0,
    bathrooms: 4,
    suites: 0,
    parking_spots: 10,
    area_sqm: 1200,
    condition: "used",
    whatsapp: "49999678901",
    contact_whatsapp: "49999678901",
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Terreno Residencial Plano em Loteamento Nobre",
    content: "Lote totalmente plano, pronto para construir, posição solar leste-norte, infraestrutura completa com água, esgoto tratado, iluminação em LED e pavimentação asfáltica.",
    category: "real_estate",
    deal_type: "terreno",
    property_type: "terreno",
    price_cents: 38000000, // R$ 380.000,00
    location_name: "Bela Vista — Chapecó - SC",
    bedrooms: 0,
    bathrooms: 0,
    suites: 0,
    parking_spots: 0,
    area_sqm: 450,
    condition: "new",
    whatsapp: "49999789012",
    contact_whatsapp: "49999789012",
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Chácara Produtiva com Açude, Pomar e Casa de Campo",
    content: "Propriedade rural de 2,5 hectares a apenas 15 minutos do centro. Casa mista com fogão a lenha, quiosque com churrasqueira na beira do açude com peixes, galinheiro e pomar formado com mais de 30 espécies frutíferas.",
    category: "real_estate",
    deal_type: "rural",
    property_type: "sitio",
    price_cents: 89000000, // R$ 890.000,00
    location_name: "Linha Tomazelli — Chapecó - SC",
    bedrooms: 3,
    bathrooms: 2,
    suites: 1,
    parking_spots: 4,
    area_sqm: 25000,
    condition: "used",
    whatsapp: "49999890123",
    contact_whatsapp: "49999890123",
    images: [
      "https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  }
];

const CLASSIFIED_ITEMS = [
  {
    title: "Toyota Corolla Cross XRE 2.0 Flex 2024 Automático",
    content: "Único dono, apenas 18.000 km rodados, revisões feitas na concessionária CarHouse. Bancos em couro, pacote Toyota Safety Sense com frenagem autônoma de emergência e piloto automático adaptativo.",
    category: "vehicle",
    deal_type: "venda",
    price_cents: 16900000, // R$ 169.000,00
    location_name: "Passo dos Fortes — Chapecó - SC",
    condition: "used",
    whatsapp: "49999112233",
    contact_whatsapp: "49999112233",
    images: [
      "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Jeep Compass Longitude T270 Turbo Flex 2023",
    content: "Veículo impecável com painel digital de 10.25 polegadas, central multimídia com Apple CarPlay e Android Auto sem fio. Sem detalhes de pintura, pneus novos Michelin.",
    category: "vehicle",
    deal_type: "venda",
    price_cents: 15400000, // R$ 154.000,00
    location_name: "Centro — Chapecó - SC",
    condition: "used",
    whatsapp: "49999223344",
    contact_whatsapp: "49999223344",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "MacBook Pro 16 M3 Max 36GB RAM SSD 1TB Cinza Espacial",
    content: "Máquina profissional em estado de zero, apenas 42 ciclos de bateria com 100% de saúde. Acompanha caixa original, carregador MagSafe 3 de 140W e cabo trançado.",
    category: "sale",
    deal_type: "venda",
    price_cents: 2250000, // R$ 22.500,00
    location_name: "Jardim Itália — Chapecó - SC",
    condition: "used",
    whatsapp: "49999334455",
    contact_whatsapp: "49999334455",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "iPhone 16 Pro Max 256GB Titânio Natural Lacrado com NF",
    content: "Aparelho nacional Anatel, lacrado na caixa com nota fiscal emitida há 1 semana e garantia Apple de 1 ano no Brasil. Aceito troca por iPhone 15 Pro com volta.",
    category: "sale",
    deal_type: "venda",
    price_cents: 920000, // R$ 9.200,00
    location_name: "Centro — Chapecó - SC",
    condition: "new",
    whatsapp: "49999445566",
    contact_whatsapp: "49999445566",
    images: [
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  },
  {
    title: "Consultoria Contábil e Planejamento Tributário B2B",
    content: "Serviços especializados de revisão tributária e recuperação de créditos PIS/COFINS e ICMS para empresas do Simples Nacional e Lucro Presumido no Oeste Catarinense.",
    category: "service",
    deal_type: "service",
    price_cents: 120000, // R$ 1.200,00
    location_name: "Centro — Chapecó - SC",
    condition: "new",
    whatsapp: "49999556677",
    contact_whatsapp: "49999556677",
    images: [
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80"
    ],
    status: "active"
  }
];

const MINED_TENDERS_ITEMS = [
  {
    pncp_id: "83102434000130-1-000089/2026",
    title: "Edital 089/2026: Contratação de Empresa de Engenharia para Pavimentação Asfáltica e Drenagem",
    description: "Execução de obras de pavimentação asfáltica em CBUQ, drenagem pluvial, sinalização viária e passeios públicos acessíveis no Bairro Efapi.",
    agency_name: "Prefeitura Municipal de Chapecó",
    agency_cnpj: "83.102.434/0001-30",
    modality: "Concorrência Eletrônica",
    estimated_amount_cents: 485000000, // R$ 4.850.000,00
    publication_date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    closing_date: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString(),
    city: "Chapecó",
    uf: "SC",
    portal_url: "https://pncp.gov.br",
    edital_url: "https://chapeco.sc.gov.br/transparencia/editais",
    ai_risk_score: 12,
    ai_curated_digest: {
      summary: "Obra de infraestrutura urbana de alto porte em Chapecó. Exige atestado de capacidade técnica em CBUQ e certidões negativas em dia.",
      key_requirements: ["Atestado de responsabilidade técnica CREA/CAU", "Garantia de proposta de 1%", "Visita técnica facultativa"]
    }
  },
  {
    pncp_id: "11234567000189-1-000031/2026",
    title: "Edital 031/2026: Aquisição de Medicamentos e Insumos Hospitalares para Unidades de Pronto Atendimento",
    description: "Registro de preços para fornecimento parcelado de medicamentos essenciais, antibióticos, anestésicos e materiais descartáveis para a Rede Municipal de Saúde.",
    agency_name: "Fundo Municipal de Saúde de Concórdia",
    agency_cnpj: "11.234.567/0001-89",
    modality: "Pregão Eletrônico",
    estimated_amount_cents: 182000000, // R$ 1.820.000,00
    publication_date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    closing_date: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    city: "Concórdia",
    uf: "SC",
    portal_url: "https://pncp.gov.br",
    edital_url: "https://concordia.sc.gov.br/transparencia",
    ai_risk_score: 8,
    ai_curated_digest: {
      summary: "Licitação dividida em 64 itens individuais. Aceita cotas exclusivas para ME/EPP nos lotes até R$ 80.000.",
      key_requirements: ["Autorização de Funcionamento ANVISA", "Certificado de Boas Práticas de Distribuição"]
    }
  },
  {
    pncp_id: "07891234000155-1-000014/2026",
    title: "Edital 014/2026: Contratação de Solução de Nuvem e Suporte Especializado em Cibersegurança",
    description: "Contratação de serviços de computação em nuvem governamental, backup imutável contra ransomware e monitoramento contínuo SOC 24x7.",
    agency_name: "Consórcio Intermunicipal do Oeste Catarinense (CIMCERO)",
    agency_cnpj: "07.891.234/0001-55",
    modality: "Dispensa Eletrônica",
    estimated_amount_cents: 29500000, // R$ 295.000,00
    publication_date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    closing_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    city: "Chapecó",
    uf: "SC",
    portal_url: "https://pncp.gov.br",
    edital_url: "https://cimcero.sc.gov.br",
    ai_risk_score: 5,
    ai_curated_digest: {
      summary: "Contratação direta com disputa eletrônica de lances. Prazo de implementação de 30 dias com SLA de 99.9%.",
      key_requirements: ["Certificação ISO 27001 ou SOC 2 do provedor de nuvem", "Equipe técnica com certificação CISSP ou Security+"]
    }
  }
];

async function main() {
  console.log("=== INICIANDO SEED DE SHOWCASES PÚBLICAS (IMOVEIS, CLASSIFICADOS, LICITACOES) ===");

  // 1. Seed Real Estate
  console.log("\n1. Injetando Imóveis em classified_ads...");
  for (const item of REAL_ESTATE_ITEMS) {
    const { data: existing } = await supabase
      .from("classified_ads")
      .select("id")
      .eq("title", item.title)
      .maybeSingle();

    if (existing) {
      console.log(`  - Imóvel já existe: ${item.title}`);
    } else {
      const { error } = await supabase.from("classified_ads").insert({
        ...item,
        author_profile_id: DEFAULT_PROFILE_ID,
      });
      if (error) {
        console.error(`  x Erro ao inserir imóvel ${item.title}:`, error.message);
      } else {
        console.log(`  ✓ Imóvel cadastrado: ${item.title} (${item.deal_type})`);
      }
    }
  }

  // 2. Seed General Classifieds
  console.log("\n2. Injetando Classificados Gerais em classified_ads...");
  for (const item of CLASSIFIED_ITEMS) {
    const { data: existing } = await supabase
      .from("classified_ads")
      .select("id")
      .eq("title", item.title)
      .maybeSingle();

    if (existing) {
      console.log(`  - Classificado já existe: ${item.title}`);
    } else {
      const { error } = await supabase.from("classified_ads").insert({
        ...item,
        author_profile_id: DEFAULT_PROFILE_ID,
      });
      if (error) {
        console.error(`  x Erro ao inserir classificado ${item.title}:`, error.message);
      } else {
        console.log(`  ✓ Classificado cadastrado: ${item.title} (${item.category})`);
      }
    }
  }

  // 3. Seed Mined Tenders
  console.log("\n3. Injetando Licitações em mined_tenders...");
  for (const item of MINED_TENDERS_ITEMS) {
    const { data: existing } = await supabase
      .from("mined_tenders")
      .select("id")
      .eq("title", item.title)
      .maybeSingle();

    if (existing) {
      console.log(`  - Licitação já existe: ${item.title}`);
    } else {
      const { error } = await supabase.from("mined_tenders").insert(item);
      if (error) {
        console.error(`  x Erro ao inserir licitação ${item.title}:`, error.message);
      } else {
        console.log(`  ✓ Licitação cadastrada: ${item.title} (${item.city})`);
      }
    }
  }

  // 4. Verification counts
  const [resRealEstate, resVehicles, resTenders] = await Promise.all([
    supabase.from("classified_ads").select("*", { count: "exact", head: true }).eq("category", "real_estate"),
    supabase.from("classified_ads").select("*", { count: "exact", head: true }).eq("category", "vehicles"),
    supabase.from("mined_tenders").select("*", { count: "exact", head: true }),
  ]);

  console.log("\n=== STATUS FINAL DAS TABELAS ===");
  console.log(`Imóveis (category: real_estate): ${resRealEstate.count}`);
  console.log(`Veículos (category: vehicles): ${resVehicles.count}`);
  console.log(`Licitações (mined_tenders): ${resTenders.count}`);
}

main().catch(console.error);
