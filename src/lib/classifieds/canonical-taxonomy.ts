/**
 * Waesy Classifieds — Taxonomia Canônica Global & Dicionários Estruturados
 * 
 * Fonte canônica única para mensuração de mercado, analytics de preços,
 * filtros padronizados e formulários inteligentes sem digitação livre divergente.
 */

// ─── 1. VEÍCULOS & AUTOMOTIVO ────────────────────────────────────────────────

export type VehicleType =
 | "carro_passeio"
 | "suv_crossover"
 | "picape_caminhonete"
 | "moto_scooter"
 | "utilitario_van"
 | "nautica_barco"
 | "caminhao_pesado";

export interface VehicleTypeOption {
 id: VehicleType;
 label: string;
}

export const CANONICAL_VEHICLE_TYPES: VehicleTypeOption[] = [
 { id: "carro_passeio", label: "Carro de Passeio / Hatch / Sedan" },
 { id: "suv_crossover", label: "SUV / Crossover" },
 { id: "picape_caminhonete", label: "Picape / Caminhonete" },
 { id: "moto_scooter", label: "Moto / Scooter" },
 { id: "utilitario_van", label: "Utilitário / Furgão / Van" },
 { id: "caminhao_pesado", label: "Caminhão / Veículo Pesado" },
 { id: "nautica_barco", label: "Náutica / Lancha / Jet Ski" },
];

export interface VehicleBrandModels {
 brand: string;
 popularModels: string[];
}

export const CANONICAL_VEHICLE_BRANDS: VehicleBrandModels[] = [
 {
 brand: "Volkswagen",
 popularModels: ["Gol", "Polo", "T-Cross", "Nivus", "Virtus", "Taos", "Amarok", "Jetta", "Saveiro", "Fox", "Up!", "Voyage", "Tiguan"],
 },
 {
 brand: "Chevrolet",
 popularModels: ["Onix", "Onix Plus", "Tracker", "Montana", "S10", "Spin", "Cruze", "Equinox", "Prisma", "Celta", "Trailblazer"],
 },
 {
 brand: "Fiat",
 popularModels: ["Strada", "Toro", "Mobi", "Argo", "Cronos", "Pulse", "Fastback", "Fiorino", "Uno", "Palio", "Ducato", "Siena"],
 },
 {
 brand: "Toyota",
 popularModels: ["Corolla", "Corolla Cross", "Hilux", "SW4", "Yaris Hatch", "Yaris Sedan", "RAV4", "Etios", "Camry"],
 },
 {
 brand: "Hyundai",
 popularModels: ["HB20", "HB20S", "Creta", "Tucson", "Santa Fe", "HR", "IX35", "Ioniq"],
 },
 {
 brand: "Honda",
 popularModels: ["Civic", "HR-V", "City Sedan", "City Hatchback", "WR-V", "CR-V", "Fit", "Accord"],
 },
 {
 brand: "Jeep",
 popularModels: ["Renegade", "Compass", "Commander", "Wrangler", "Gladiator"],
 },
 {
 brand: "BYD",
 popularModels: ["Dolphin Mini", "Dolphin", "Song Plus DM-i", "Yuan Plus", "Seal", "King", "Shark"],
 },
 {
 brand: "GWM",
 popularModels: ["Haval H6", "Haval H6 GT", "Ora 03", "Poer"],
 },
 {
 brand: "Renault",
 popularModels: ["Kwid", "Duster", "Kardian", "Sandero", "Logan", "Oroch", "Master", "Captur"],
 },
 {
 brand: "Nissan",
 popularModels: ["Kicks", "Versa", "Sentra", "Frontier", "March"],
 },
 {
 brand: "BMW",
 popularModels: ["320i", "X1", "X3", "X5", "Série 1", "330e", "X6", "M3"],
 },
 {
 brand: "Mercedes-Benz",
 popularModels: ["C-Class (C 180 / C 200)", "A-Class", "GLA", "GLC", "GLE", "Sprinter"],
 },
 {
 brand: "Audi",
 popularModels: ["A3 Sedan", "A4", "Q3", "Q5", "e-tron"],
 },
 {
 brand: "Ford",
 popularModels: ["Ranger", "Territory", "Maverick", "Bronco Sport", "Mustang", "Ka", "EcoSport"],
 },
 {
 brand: "Volvo",
 popularModels: ["XC40 Recharge", "XC60", "EX30", "XC90"],
 },
 {
 brand: "Peugeot",
 popularModels: ["208", "2008", "Partner", "Expert"],
 },
 {
 brand: "Citroën",
 popularModels: ["C3", "C3 Aircross", "C4 Cactus", "Jumpy"],
 },
 {
 brand: "Honda Motos",
 popularModels: ["CG 160 Fan", "CG 160 Titan", "Biz 125", "NXR 160 Bros", "CB 300F Twister", "XRE 300", "PCX 160", "CB 500X"],
 },
 {
 brand: "Yamaha Motos",
 popularModels: ["Fazer FZ25", "Factor 150", "Crosser 150", "MT-03", "NMAX 160", "Lander 250", "MT-07", "Fluo 125"],
 },
 {
 brand: "BMW Motorrad",
 popularModels: ["R 1250 GS", "F 850 GS", "G 310 GS", "G 310 R", "F 900 R"],
 },
 {
 brand: "Outra Marca",
 popularModels: ["Outro Modelo"],
 },
];

export const CANONICAL_TRANSMISSIONS = [
 "Manual",
 "Automático",
 "CVT",
 "Dupla Embreagem / DSG",
 "Automatizado",
];

export const CANONICAL_FUELS = [
 "Flex (Álcool/Gasolina)",
 "Gasolina",
 "Diesel",
 "Híbrido (HEV / PHEV)",
 "100% Elétrico (EV)",
 "GNV / Gás",
];

export const CANONICAL_VEHICLE_COLORS = [
 "Branco",
 "Preto",
 "Prata",
 "Cinza",
 "Vermelho",
 "Azul",
 "Verde",
 "Marrom / Bronze",
 "Amarelo / Dourado",
 "Outra Cor",
];

export const CANONICAL_VEHICLE_OPTIONS = [
 "Ar-condicionado",
 "Direção Elétrica / Hidráulica",
 "Vidros & Travas Elétricas",
 "Alarme Perimétrico",
 "Freios ABS com EBD",
 "Airbags Frontais & Laterais",
 "Câmera de Ré / 360°",
 "Sensor de Estacionamento",
 "Central Multimídia (CarPlay/Android Auto)",
 "Bancos em Couro",
 "Teto Solar / Panorâmico",
 "Controle de Tração & Estabilidade (ESP)",
 "Piloto Automático / ADAS",
 "Tração 4x4 / AWD",
 "Faróis em LED / Xenon",
 "Chave Presencial & Start/Stop",
 "Rodas de Liga Leve",
 "Retrovisores Elétricos Rebatíveis",
];

export const CANONICAL_VEHICLE_PROVENANCE = [
 "Único Dono",
 "Todas as Revisões na Concessionária",
 "IPVA do Ano Pago",
 "Laudo Cautelar 100% Aprovado",
 "Garantia de Fábrica Vigente",
 "Manual e Chave Reserva",
 "Pneus Novos / Seminovos",
 "Sem Histórico de Sinistro ou Leilão",
];

// ─── 2. BENS PESSOAIS & DESAPEGO (MICROSEGMENTAÇÃO) ──────────────────────────

export type GoodsSegment =
 | "smartphones"
 | "computadores"
 | "eletronicos"
 | "eletrodomesticos"
 | "moveis"
 | "moda_brecho"
 | "games_consoles"
 | "som_instrumentos"
 | "garagem_ferramentas"
 | "outros";

export interface GoodsSegmentOption {
 id: GoodsSegment;
 label: string;
 iconName: string;
 badge: string;
}

export const CANONICAL_GOODS_SEGMENTS: GoodsSegmentOption[] = [
 { id: "smartphones", label: "Celulares e Smartphones", iconName: "Smartphone", badge: "Alta Demanda" },
 { id: "computadores", label: "Notebooks, PCs e Acessórios", iconName: "Laptop", badge: "Informática" },
 { id: "eletrodomesticos", label: "Eletrodomésticos e Cozinha", iconName: "Refrigerator", badge: "Casa & Cozinha" },
 { id: "eletronicos", label: "Eletrônicos e Smart TVs", iconName: "Tv", badge: "Eletrônicos" },
 { id: "moveis", label: "Móveis e Decoração", iconName: "Armchair", badge: "Mobiliário" },
 { id: "moda_brecho", label: "Brechó, Roupas e Calçados", iconName: "Shirt", badge: "Moda Sustentável" },
 { id: "games_consoles", label: "Games e Videogames", iconName: "Gamepad2", badge: "Gamer" },
 { id: "som_instrumentos", label: "Som e Instrumentos Musicais", iconName: "Music", badge: "Áudio & Som" },
 { id: "garagem_ferramentas", label: "Venda de Garagem e Ferramentas", iconName: "Wrench", badge: "Lotes / Garagem" },
 { id: "outros", label: "Outros Bens e Objetos", iconName: "Package", badge: "Diversos" },
];

// Condição Canônica para Mensuração de Bens Físicos
export const CANONICAL_ITEM_CONDITIONS = [
 { id: "novo", label: "Novo / Lacrado na Caixa", desc: "Nunca utilizado, caixa lacrada de fábrica ou com lacre original." },
 { id: "usado_excelente", label: "Seminovo / Impecável", desc: "Em estado de novo, sem nenhum risco, marca ou avaria perceptível." },
 { id: "usado_bom", label: "Usado - Bom Estado", desc: "100% operacional, com pequenas marcas normais de uso estético." },
 { id: "com_marcas", label: "Usado - Com Marcas Visíveis", desc: "Totalmente funcional, mas com desgastes ou detalhes estéticos claros." },
 { id: "para_pecas", label: "Para Conserto ou Peças", desc: "Item com defeito ou incompleto, ideal para técnicos e reaproveitamento." },
];

// Dicionário de Smartphones
export const CANONICAL_SMARTPHONE_BRANDS = [
 {
 brand: "Apple",
 models: [
 "iPhone 16 Pro Max",
 "iPhone 16 Pro",
 "iPhone 16 Plus",
 "iPhone 16",
 "iPhone 15 Pro Max",
 "iPhone 15 Pro",
 "iPhone 15 Plus",
 "iPhone 15",
 "iPhone 14 Pro Max",
 "iPhone 14 Pro",
 "iPhone 14 Plus",
 "iPhone 14",
 "iPhone 13 Pro Max",
 "iPhone 13 Pro",
 "iPhone 13",
 "iPhone 13 mini",
 "iPhone 12 Pro Max",
 "iPhone 12",
 "iPhone 11",
 "iPhone SE (3ª Geração)",
 ],
 },
 {
 brand: "Samsung",
 models: [
 "Galaxy S24 Ultra",
 "Galaxy S24+",
 "Galaxy S24",
 "Galaxy S23 Ultra",
 "Galaxy S23+",
 "Galaxy S23",
 "Galaxy S23 FE",
 "Galaxy Z Fold 6",
 "Galaxy Z Fold 5",
 "Galaxy Z Flip 6",
 "Galaxy Z Flip 5",
 "Galaxy A55 5G",
 "Galaxy A54 5G",
 "Galaxy A35 5G",
 "Galaxy A15 5G",
 "Galaxy M54 5G",
 ],
 },
 {
 brand: "Xiaomi",
 models: [
 "Xiaomi 14 Ultra",
 "Xiaomi 14",
 "Xiaomi 13T Pro",
 "Redmi Note 13 Pro+ 5G",
 "Redmi Note 13 Pro 5G",
 "Redmi Note 13 4G/5G",
 "Redmi 13C",
 "Poco X6 Pro 5G",
 "Poco F6 Pro",
 "Poco F6",
 "Poco M6 Pro",
 ],
 },
 {
 brand: "Motorola",
 models: [
 "Edge 50 Ultra",
 "Edge 50 Pro",
 "Edge 50 Fusion",
 "Edge 40 Neo",
 "Moto G84 5G",
 "Moto G54 5G",
 "Moto G24 Power",
 "Moto G04s",
 "Razr 50 Ultra",
 "Razr 40 Ultra",
 ],
 },
 {
 brand: "Google",
 models: ["Pixel 9 Pro", "Pixel 9", "Pixel 8 Pro", "Pixel 8", "Pixel 7 Pro", "Pixel 7a"],
 },
 {
 brand: "Outra Marca",
 models: ["Outro Modelo de Smartphone"],
 },
];

export const CANONICAL_SMARTPHONE_STORAGE = ["64GB", "128GB", "256GB", "512GB", "1TB"];

// Dicionário de Computadores & Notebooks
export const CANONICAL_COMPUTER_TYPES = [
 "Notebook / Laptop",
 "PC Gamer / Desktop",
 "MacBook / Mac",
 "Monitor",
 "Tablet / iPad",
 "All-in-One",
 "Acessório / Periférico",
];

export const CANONICAL_COMPUTER_BRANDS = [
 "Apple",
 "Dell",
 "Lenovo",
 "Acer",
 "Asus",
 "Samsung",
 "HP",
 "LG",
 "Custom / Montado",
 "Outra Marca",
];

export const CANONICAL_PROCESSORS = [
 "Apple M3 Pro / Max",
 "Apple M3",
 "Apple M2 Pro / Max",
 "Apple M2",
 "Apple M1",
 "Intel Core i9",
 "Intel Core i7",
 "Intel Core i5",
 "Intel Core i3",
 "Intel Core Ultra",
 "AMD Ryzen 9",
 "AMD Ryzen 7",
 "AMD Ryzen 5",
 "AMD Ryzen 3",
 "Outro Processador",
];

export const CANONICAL_RAM_OPTIONS = ["4 GB", "8 GB", "16 GB", "24 GB", "32 GB", "64 GB+"];

export const CANONICAL_STORAGE_OPTIONS = [
 "128 GB SSD",
 "256 GB SSD NVMe",
 "512 GB SSD NVMe",
 "1 TB SSD NVMe",
 "2 TB SSD NVMe",
 "HD Tradicional",
];

// Dicionário de Eletrodomésticos
export const CANONICAL_APPLIANCE_TYPES = [
 "Geladeira / Refrigerador / Freezer",
 "Máquina de Lavar / Lava e Seca",
 "Fogão / Cooktop / Forno de Embutir",
 "Ar-condicionado / Climatizador",
 "Micro-ondas",
 "Air Fryer / Fritadeira Elétrica",
 "Cafeteira / Máquina de Café Expresso",
 "Lava-louças",
 "Aspirador de Pó / Robô Aspirador",
 "Batedeira / Liquidificador / Processador",
 "Purificador / Bebedouro de Água",
];

export const CANONICAL_APPLIANCE_BRANDS = [
 "Brastemp",
 "Electrolux",
 "Consul",
 "Samsung",
 "LG",
 "Mondial",
 "Philco",
 "Britânia",
 "Oster",
 "Arno",
 "Panasonic",
 "Midea",
 "Fischer",
 "Tramontina",
 "Outra Marca",
];

export const CANONICAL_VOLTAGES = ["110V (127V)", "220V", "Bivolt Automático"];

// Dicionário de Móveis
export const CANONICAL_FURNITURE_ROOMS = [
 "Sala de Estar / Home Theater",
 "Sala de Jantar / Copa",
 "Quarto de Casal / Solteiro",
 "Home Office / Escritório",
 "Cozinha / Área Gourmet",
 "Varanda / Jardim / Área Externa",
 "Banheiro / Lavabo",
];

export const CANONICAL_FURNITURE_MATERIALS = [
 "Madeira Maciça / Demolição",
 "MDF / MDP Laminado",
 "Estofado em Linho / Veludo",
 "Couro Natural / Sintético",
 "Metal / Aço Industrial",
 "Vidro Temperado / Espelho",
 "Mármore / Granito",
 "Fibras Naturais / Rattan",
];

// Dicionário de Brechó & Moda
export const CANONICAL_FASHION_CATEGORIES = [
 "Vestidos & Saias",
 "Camisas, Blusas & Tops",
 "Calças, Jeans & Bermudas",
 "Casacos, Jaquetas & Moletons",
 "Calçados, Tênis & Sandálias",
 "Bolsas, Mochilas & Malas",
 "Relógios & Óculos de Sol",
 "Joias, Semijoias & Acessórios",
];

export const CANONICAL_FASHION_SIZES = [
 "PP / 34-36",
 "P / 38",
 "M / 40",
 "G / 42",
 "GG / 44",
 "XGG / Plus Size (46+)",
 "Calçado 34",
 "Calçado 35",
 "Calçado 36",
 "Calçado 37",
 "Calçado 38",
 "Calçado 39",
 "Calçado 40",
 "Calçado 41",
 "Calçado 42",
 "Calçado 43",
 "Calçado 44",
 "Tamanho Único",
];

// Dicionário de Games & Videogames
export const CANONICAL_GAME_CONSOLES = [
 "PlayStation 5 (PS5)",
 "PlayStation 4 (PS4 / Pro)",
 "Xbox Series X",
 "Xbox Series S",
 "Xbox One (S / X)",
 "Nintendo Switch OLED",
 "Nintendo Switch Standard",
 "Nintendo Switch Lite",
 "PC Gamer Portátil (Steam Deck / ROG Ally)",
 "Acessórios / Controles / Volantes",
 "Jogos em Mídia Física",
];

// ─── 3. IMÓVEIS & MERCADO IMOBILIÁRIO (CRECI / COFECI) ───────────────────────
import { GLOBAL_REAL_ESTATE_TYPES_CATALOG, RealEstateTypeDefinition } from "@/lib/data/real-estate-types-catalog";

export const CANONICAL_REAL_ESTATE_TYPES: RealEstateTypeDefinition[] = GLOBAL_REAL_ESTATE_TYPES_CATALOG;

export const CANONICAL_REAL_ESTATE_CATEGORIES = [
  { id: "residencial", label: "Residencial (Apartamentos, Casas, Sobrados)" },
  { id: "comercial", label: "Comercial (Salas, Lojas, Pontos Comerciais)" },
  { id: "industrial", label: "Industrial e Logístico (Galpões, Docas)" },
  { id: "terreno_incorporacao", label: "Terrenos e Lotes Urbanos/Condomínio" },
  { id: "rural", label: "Rural (Chácaras, Sítios, Fazendas)" },
];

export const CANONICAL_REAL_ESTATE_FEATURES = [
  "Elevador",
  "Sacada com Churrasqueira",
  "Piscina Privativa",
  "Piscina no Condomínio",
  "Portaria 24h & Câmeras",
  "Salão de Festas & Espaço Gourmet",
  "Academia Equipada",
  "Quadra Poliesportiva / Beach Tennis",
  "Playground & Brinquedoteca",
  "Bicicletário & Coworking",
  "Vaga de Garagem Coberta",
  "Energia Solar Fotovoltaica",
  "Pé-direito Duplo",
  "Docas de Carga / Pátio de Manobra",
  "Mobiliado / Semi-mobiliado",
  "Ar-condicionado Split Instalado",
  "Vista Panorâmica / Andar Alto",
  "Gás Central & Medidores Individuais",
  "Acesso Biométrico / Fechadura Digital",
];

// ─── 4. GASTRONOMIA & DELIVERY SUB-NICHOS ────────────────────────────────────
export interface FoodSubNicheOption {
  id: string;
  label: string;
  description: string;
  defaultPrepTime: string;
  suggestedItems: string[];
}

export const CANONICAL_FOOD_SUBNICHES: FoodSubNicheOption[] = [
  {
    id: "sushi",
    label: "Sushi e Culinária Japonesa",
    description: "Combinados, temakis, sashimis, hots e pratos orientais com opções de wasabi e shoyu.",
    defaultPrepTime: "25-40 min",
    suggestedItems: ["Combinado 20 peças", "Temaki Salmão Completo", "Hot Filadélfia 10 un", "Sashimi Salmão 8 un"],
  },
  {
    id: "pizzaria",
    label: "Pizzaria e Forneria",
    description: "Pizzas artesanais, calzones, bordas recheadas e tamanhos broto a família.",
    defaultPrepTime: "30-50 min",
    suggestedItems: ["Pizza Grande Calabresa Especial", "Pizza 4 Queijos Artesanal", "Calzone Presunto e Queijo", "Pizza Doce Nutella"],
  },
  {
    id: "hamburgueria",
    label: "Hamburgueria e Smash Burgers",
    description: "Burgers artesanais, smash, carnes nobres, blends especiais e combos com batatas.",
    defaultPrepTime: "20-35 min",
    suggestedItems: ["Smash Burger Duplo Cheddar Bacon", "Burger Costela Artesanal", "Combo Burger + Fritas + Refri", "Porção Batata Rústica"],
  },
  {
    id: "marmitaria",
    label: "Marmitaria e Prato Feito (PF)",
    description: "Comida caseira, marmitas do dia, opções fit, low carb e pratos executivos.",
    defaultPrepTime: "15-30 min",
    suggestedItems: ["Marmita Executiva Bife a Cavalo", "Marmita Fit Frango com Batata Doce", "PF Filé de Peixe", "Feijoada Completa"],
  },
  {
    id: "confeitaria",
    label: "Confeitaria, Bolos e Doces",
    description: "Bolos de festa por encomenda, doces finos, brigadeiros gourmet e sobremesas.",
    defaultPrepTime: "Encomenda prévia",
    suggestedItems: ["Bolo de Aniversário 2kg", "Cento de Brigadeiros Gourmet", "Torta Holandesa", "Bolo no Pote"],
  },
  {
    id: "cafeteria",
    label: "Cafeteria, Lanchonete e Salgados",
    description: "Cafés especiais, cappuccinos, salgados assados/fritos, pão de queijo e lanches rápidos.",
    defaultPrepTime: "10-20 min",
    suggestedItems: ["Café Expresso Especial", "Cappuccino Italiano", "Coxinha de Frango com Catupiry", "Pão de Queijo Recheado"],
  },
  {
    id: "churrascaria",
    label: "Churrasco, Espetos e Assados",
    description: "Cortes nobres assados, espetinhos, costela na brasa e guarnições tradicionais.",
    defaultPrepTime: "30-45 min",
    suggestedItems: ["Picanha Fatiada na Brasa (500g)", "Espeto de Alcatra Completo", "Costela Gaúcha Assada", "Farofa de Alho & Vinagrete"],
  },
];

// ─── 5. SERVIÇOS ESPECIALIZADOS SUB-NICHOS ──────────────────────────────────
export interface ServiceSubNicheOption {
  id: string;
  label: string;
  councilName: string;
  councilFieldLabel: string;
  councilPlaceholder: string;
  requiresLicense: boolean;
  specialties: string[];
}

export const CANONICAL_SERVICE_SUBNICHES: ServiceSubNicheOption[] = [
  {
    id: "advocacia",
    label: "Advocacia e Assessoria Jurídica",
    councilName: "OAB",
    councilFieldLabel: "Número de Registro na OAB",
    councilPlaceholder: "Ex: 123456/SP",
    requiresLicense: true,
    specialties: [
      "Direito Cível & Consumidor",
      "Direito Trabalhista",
      "Direito Previdenciário (INSS)",
      "Direito Tributário & Fiscal",
      "Direito de Família & Sucessões",
      "Direito Imobiliário & Contratos",
      "Direito Penal & Criminal",
      "Direito Empresarial & Societário",
    ],
  },
  {
    id: "engenharia_arquitetura",
    label: "Engenharia e Arquitetura",
    councilName: "CREA / CAU",
    councilFieldLabel: "Número do CREA ou CAU",
    councilPlaceholder: "Ex: 5061234567-SP",
    requiresLicense: true,
    specialties: [
      "Projetos Arquitetônicos Residenciais/Comerciais",
      "Cálculo Estrutural & Fundações",
      "Emissão de ART / RRT de Reforma",
      "Laudos Técnicos e Perícias",
      "Instalações Elétricas e Hidráulicas",
      "Design de Interiores & Decoração",
      "Regularização de Obras & Habite-se",
    ],
  },
  {
    id: "saude_estetica",
    label: "Saúde, Estética e Bem-Estar",
    councilName: "CRM / CRBM / CRO / COREN",
    councilFieldLabel: "Conselho Profissional & Registro",
    councilPlaceholder: "Ex: CRM 123456 ou CRBM 7890",
    requiresLicense: true,
    specialties: [
      "Harmonização Facial & Botox",
      "Dermatologia & Cuidados com a Pele",
      "Odontologia & Clareamento Dental",
      "Fisioterapia & Pilates",
      "Nutrição Clínica & Esportiva",
      "Massoterapia & Drenagem Linfática",
      "Podologia & Cuidados Especializados",
    ],
  },
  {
    id: "construcao_reformas",
    label: "Construção Civil e Reformas",
    councilName: "Alvará / Registro Municipal",
    councilFieldLabel: "CNPJ ou Alvará da Construtora",
    councilPlaceholder: "Ex: 00.000.000/0001-00",
    requiresLicense: false,
    specialties: [
      "Construção de Casas do Zero",
      "Reformas Gerais & Acabamentos",
      "Pintura Residencial & Comercial",
      "Instalação de Porcelanato & Pisos",
      "Gesso, Drywall & Iluminação",
      "Telhados, Calhas & Impermeabilização",
      "Elétrica e Hidráulica Predial",
    ],
  },
  {
    id: "contabilidade_bpo",
    label: "Contabilidade e BPO Financeiro",
    councilName: "CRC",
    councilFieldLabel: "Número do Registro no CRC",
    councilPlaceholder: "Ex: 1SP123456/O",
    requiresLicense: true,
    specialties: [
      "Abertura e Encerramento de Empresas",
      "Declaração de Imposto de Renda (IRPF / IRPJ)",
      "BPO Financeiro & Gestão de Fluxo",
      "Assessoria Fiscal e Tributária",
      "Departamento Pessoal & Folha de Pagamento",
      "Regularização de MEI e Simples Nacional",
    ],
  },
  {
    id: "tecnologia_design",
    label: "Tecnologia, Software e Design",
    councilName: "Portfólio / Registro",
    councilFieldLabel: "GitHub, Portfólio ou CNPJ",
    councilPlaceholder: "https://seusite.com.br",
    requiresLicense: false,
    specialties: [
      "Desenvolvimento de Sites & E-commerces",
      "Aplicativos Mobile (iOS / Android)",
      "Design de Interface (UI/UX) & Marca",
      "Tráfego Pago (Google Ads / Meta Ads)",
      "Automação com IA & Chatbots",
      "Segurança e Infraestrutura Cloud",
    ],
  },
];

// ─── 6. NEGÓCIOS, EMPRESAS & M&A (meuBIZ / Quero Um Negócio / invoop) ───────
export interface BusinessTypeOption {
  id: string;
  label: string;
  description: string;
}

export const CANONICAL_BUSINESS_TYPES: BusinessTypeOption[] = [
  {
    id: "venda_total",
    label: "Venda de Empresa",
    description: "Venda integral da operação, marca, clientes, equipamentos e contratos.",
  },
  {
    id: "repasse_ponto",
    label: "Repasse de Ponto Comercial",
    description: "Ponto comercial montado, infraestrutura física, mobiliário e cessão de locação.",
  },
  {
    id: "busca_socio",
    label: "Procura de Sócio (Investidor ou Operador)",
    description: "Busca de sócio que entre com capital e/ou trabalho para expansão do negócio.",
  },
  {
    id: "captacao_investimento",
    label: "Captação de Investimento / Aporte",
    description: "Solicitação de aporte para expansão de unidade, compra de máquinas ou capital de giro.",
  },
  {
    id: "franquia",
    label: "Repasse de Franquia",
    description: "Unidade franqueada em operação, com marca consolidada e suporte da franqueadora.",
  },
  {
    id: "cotas",
    label: "Venda de Cotas Societárias",
    description: "Participação societária minoritária ou majoritária em empresa ativa.",
  },
];

export interface InvestmentModelOption {
  id: string;
  label: string;
  description: string;
}

export const CANONICAL_INVESTMENT_MODELS: InvestmentModelOption[] = [
  {
    id: "socio_investidor",
    label: "Sócio Investidor (% de Cotas)",
    description: "Entrada de capital em troca de percentual societário na empresa.",
  },
  {
    id: "socio_operador",
    label: "Sócio Operador (Capital + Gestão)",
    description: "Entrada de capital e atuação ativa na administração do dia a dia.",
  },
  {
    id: "mutuo_expansao",
    label: "Mútuo / Empréstimo de Expansão",
    description: "Aporte financeiro remunerado com retorno pré-fixado ou conversível em cotas.",
  },
  {
    id: "anjo_seed",
    label: "Investimento Anjo (Projeto / Startup)",
    description: "Aporte financeiro para projeto inovador, produto validado ou startup em tração.",
  },
  {
    id: "abertura_filial",
    label: "Parceria para Nova Filial",
    description: "Investimento para abrir nova unidade da marca em outra cidade ou bairro.",
  },
];

export const CANONICAL_PROJECT_STAGES = [
  { id: "ideia_validada", label: "Ideia Validada / Projeto Pré-operacional" },
  { id: "em_operacao", label: "Em Operação (Ativa)" },
  { id: "faturando", label: "Operando e Faturando" },
  { id: "expansao", label: "Em Escala / Expansão Nacional" },
] as const;

export const CANONICAL_USE_OF_FUNDS = [
  "Abertura de Nova Filial",
  "Compra de Máquinas & Equipamentos",
  "Capital de Giro & Estoque",
  "Marketing & Expansão Comercial",
  "Tecnologia, Software & App",
  "Reforma & Instalações do Ponto",
] as const;

export const CANONICAL_BUSINESS_SEGMENTS = [
  "Alimentação & Gastronomia (Restaurante, Bar, Cafeteria, Delivery)",
  "Varejo & Comércio (Loja de Roupas, Mercado, Cosméticos, Calçados)",
  "Serviços & Consultorias (Agência, Salão de Beleza, Academia, Coworking)",
  "Construção Civil & Engenharia (Construtora, Loja de Materiais, Empreiteira)",
  "Saúde, Odontologia & Farmácia (Clínica, Laboratório, Drogaria)",
  "Tecnologia, Startups & E-commerce (SaaS, Loja Virtual, Aplicativos)",
  "Indústria & Manufatura (Fábrica de Embalagens, Têxtil, Pré-moldados)",
  "Educação & Cursos (Escola de Idiomas, Treinamentos, Creche)",
  "Logística, Frotas & Transporte (Transportadora, Depósito, Centro de Distribuição)",
  "Hotelaria & Pousadas (Pousada, Hostel, Chalés)",
];

export const CANONICAL_SALE_REASONS = [
  "Mudança de prioridade profissional",
  "Aposentadoria do proprietário",
  "Mudança de cidade ou país",
  "Motivo pessoal / saúde",
  "Dissolução amigável de sociedade",
  "Foco em outro negócio / expansão de grupo",
  "Busca de capital para acelerar crescimento",
];

export const CANONICAL_EMPLOYEES_RANGES = [
  "Apenas o proprietário (0 funcionários)",
  "1 a 2 colaboradores",
  "3 a 5 colaboradores",
  "6 a 10 colaboradores",
  "11 a 20 colaboradores",
  "21 a 50 colaboradores",
  "Mais de 50 colaboradores",
];

export const CANONICAL_COMMERCIAL_POINT_TYPES = [
  "Loja de Rua / Ponto de Calçada",
  "Shopping Center / Galeria Comercial",
  "Galpão Industrial / Logístico",
  "Sala / Conjunto Comercial em Prédio",
  "Quiosque em Galeria / Supermercado",
  "Casa Comercial / Sobrado Adaptado",
  "Operação 100% Digital / Sem Ponto Físico",
];

// ─── 8. MERCADO, CONVENIÊNCIA, CARNES & PERECÍVEIS ─────────────────────────────

export interface GroceryDepartment {
  id: string;
  label: string;
  iconName: string;
  badge: string;
  suggestedUnits: string[];
  subCategories: string[];
  defaultTemperature?: string;
  supportsPrepOptions?: boolean;
}

export const CANONICAL_GROCERY_DEPARTMENTS: GroceryDepartment[] = [
  {
    id: "acougue_carnes",
    label: "Açougue e Carnes Frescas",
    iconName: "Flame",
    badge: "Açougue",
    suggestedUnits: ["kg", "g", "bandeja", "peça"],
    subCategories: ["Bovinos (Bifes e Peças)", "Bovino Moído", "Suínos & Costela", "Aves & Frango", "Peixes & Frutos do Mar", "Linguiças & Churrasco", "Carnes Especiais & Cortes Nobres"],
    defaultTemperature: "resfriado",
    supportsPrepOptions: true,
  },
  {
    id: "hortifruti",
    label: "Hortifrúti e Feira Fresca",
    iconName: "Apple",
    badge: "Hortifrúti",
    suggestedUnits: ["kg", "un", "g", "bandeja", "maço"],
    subCategories: ["Frutas Frescas", "Legumes", "Verduras & Folhagens", "Temperos & Ervas", "Orgânicos Certificados", "Ovos & Granja"],
    defaultTemperature: "ambiente",
  },
  {
    id: "padaria_confeitaria",
    label: "Padaria e Confeitaria",
    iconName: "Croissant",
    badge: "Padaria",
    suggestedUnits: ["un", "kg", "pct", "bandeja"],
    subCategories: ["Pães do Dia (Francês, Ciabatta)", "Pães de Forma & Embalados", "Bolos & Tortas", "Salgados & Lanches", "Torradas & Biscoitos Artesanais"],
    defaultTemperature: "ambiente",
    supportsPrepOptions: true,
  },
  {
    id: "frios_laticinios",
    label: "Frios, Queijos e Laticínios",
    iconName: "Milk",
    badge: "Frios & Queijos",
    suggestedUnits: ["g", "kg", "un", "bandeja", "pct"],
    subCategories: ["Queijos (Mussarela, Prato, Especiais)", "Presuntos & Embutidos Fatiados", "Leites & Bebidas Lácteas", "Iogurtes & Sobremesas", "Manteigas & Requeijão"],
    defaultTemperature: "resfriado",
    supportsPrepOptions: true,
  },
  {
    id: "bebidas_adega",
    label: "Bebidas, Cervejas e Adega",
    iconName: "Wine",
    badge: "Bebidas",
    suggestedUnits: ["un", "L", "ml", "fardo", "pack", "garrafa"],
    subCategories: ["Cervejas & Chopps", "Destilados & Whiskeys", "Vinhos & Espumantes", "Refrigerantes & Sucos", "Energéticos & Isotônicos", "Água Mineral & Gelo"],
    defaultTemperature: "gelada",
  },
  {
    id: "mercearia_basicos",
    label: "Mercearia e Alimentos Básicos",
    iconName: "Package",
    badge: "Mercearia",
    suggestedUnits: ["un", "kg", "pct", "cx"],
    subCategories: ["Arroz, Feijão & Grãos", "Óleos, Azeites & Vinagres", "Massas, Molhos & Extratos", "Farinhas & Misturas", "Café, Chá, Açúcar & Adoçantes", "Enlatados & Conservas"],
    defaultTemperature: "ambiente",
  },
  {
    id: "bomboniere_snacks",
    label: "Bomboniere, Chocolates e Snacks",
    iconName: "Candy",
    badge: "Bomboniere",
    suggestedUnits: ["un", "pct", "cx", "display"],
    subCategories: ["Chocolates & Bombons", "Salgadinhos & Batatas Chips", "Balas, Gomas & Pirulitos", "Biscoitos, Bolachas & Wafers", "Barras de Cereal & Castanhas"],
    defaultTemperature: "ambiente",
  },
  {
    id: "congelados",
    label: "Congelados e Pratos Prontos",
    iconName: "Snowflake",
    badge: "Congelados",
    suggestedUnits: ["un", "pct", "cx", "kg"],
    subCategories: ["Pizzas & Lasanhas", "Hambúrgueres & Empanados", "Batatas Congeladas", "Sorvetes & Picolés", "Gelo em Cubo / Escama"],
    defaultTemperature: "congelado",
  },
  {
    id: "higiene_perfumaria",
    label: "Higiene Pessoal e Perfumaria",
    iconName: "CheckCircle2",
    badge: "Higiene",
    suggestedUnits: ["un", "pct", "kit"],
    subCategories: ["Sabonetes & Banho", "Shampoos & Condicionadores", "Higiene Bucal", "Desodorantes", "Fraldas & Cuidados com Bebê"],
    defaultTemperature: "ambiente",
  },
  {
    id: "limpeza_casa",
    label: "Limpeza e Cuidados com a Casa",
    iconName: "Home",
    badge: "Limpeza",
    suggestedUnits: ["un", "L", "ml", "kg", "pct"],
    subCategories: ["Lava Roupas & Amaciantes", "Detergentes & Desengordurantes", "Desinfetantes & Cloro", "Papéis Higiênicos & Guardanapos", "Sacos de Lixo & Descartáveis"],
    defaultTemperature: "ambiente",
  },
  {
    id: "conveniencia_tabacaria",
    label: "Conveniência Rápida e Tabacaria",
    iconName: "Zap",
    badge: "Conveniência",
    suggestedUnits: ["un", "pct", "pack"],
    subCategories: ["Gelo & Carvão para Churrasco", "Sedas, Isqueiros & Tabacaria", "Snacks Rápidos de Balcão", "Copos & Descartáveis para Festas"],
    defaultTemperature: "ambiente",
  },
];

export const CANONICAL_UNIT_TYPES = [
  { id: "un", label: "Unidade (un)" },
  { id: "kg", label: "Quilo (kg)" },
  { id: "g", label: "Gramas (g)" },
  { id: "L", label: "Litros (L)" },
  { id: "ml", label: "Mililitros (ml)" },
  { id: "fardo", label: "Fardo / Pack" },
  { id: "pct", label: "Pacote (pct)" },
  { id: "bandeja", label: "Bandeja" },
  { id: "cx", label: "Caixa (cx)" },
] as const;

export const CANONICAL_STORAGE_TEMPERATURES = [
  { id: "ambiente", label: "Ambiente / Seco", icon: "️" },
  { id: "gelada", label: "Gelada / Imediata", icon: "" },
  { id: "resfriado", label: "Resfriado (0°C a 4°C)", icon: "" },
  { id: "congelado", label: "Congelado (-18°C)", icon: "️" },
] as const;

export const CANONICAL_MEAT_CUT_OPTIONS = [
  "Peça inteira",
  "Bifes finos",
  "Bifes médios",
  "Bifes grossos",
  "Moído 1x",
  "Moído 2x",
  "Em cubos / estrogonofe",
  "Iscas / tiras",
  "Desossado",
  "Com osso",
  "Limpo sem gordura",
  "Com capa de gordura",
] as const;

export const CANONICAL_BAKERY_PREP_OPTIONS = [
  "Inteiro",
  "Fatiado na hora",
  "Aquecido",
  "Pedaço",
  "Bandeja fechada",
] as const;

// ─── 9. VAREJO ALIMENTAR PRO: HORTIFRÚTI FRESCO, MATURAÇÃO & GAMIFICAÇÃO ──────

export type GroceryPricingMode = "unit" | "weight";
export type RipenessStage = "menos_maduro" | "maduro" | "mais_maduro";

export interface GroceryFreshPricing {
  supports_fresh_pricing: boolean;
  default_pricing_mode: GroceryPricingMode;
  avg_piece_weight_grams?: number; // ex: 500g por mamão papaya
  min_increment_grams?: number; // ex: 100g, 250g
  price_per_kg_cents?: number;
  price_per_unit_cents?: number;
}

export interface GroceryRipenessConfig {
  enabled: boolean;
  stages: RipenessStage[];
  default_stage: RipenessStage;
  labels?: Partial<Record<RipenessStage, string>>;
}

export const DEFAULT_RIPENESS_LABELS: Record<RipenessStage, { title: string; desc: string }> = {
  menos_maduro: { title: "Menos maduro", desc: "Mais firme, para consumo ao longo da semana" },
  maduro: { title: "Maduro", desc: "Ponto ideal, textura perfeita para consumir em 1-2 dias" },
  mais_maduro: { title: "Mais maduro", desc: "Bem maduro e doce, ideal para consumir hoje ou preparar sucos" },
};

export interface ProgressiveDiscountTier {
  min_quantity: number; // ex: 2, 3, 5
  discount_type: "percentage" | "fixed_cents"; // '%' ou 'R$'
  discount_value: number; // ex: 10 para 10%, ou 500 para R$ 5,00
  label?: string; // ex: "Pague Menos (2 un)", "Preço Atacado (5+ un)"
}

export interface OrderBumpOffer {
  enabled: boolean;
  mode: "manual" | "category_related";
  target_product_id?: string;
  target_title?: string;
  target_image_url?: string;
  special_price_cents?: number;
  original_price_cents?: number;
  badge_text?: string;
}

/**
 * Calcula o desconto progressivo acumulado dado o preço base e a quantidade de itens.
 */
export function calculateProgressiveDiscount(
  basePriceCents: number,
  quantity: number,
  tiers?: ProgressiveDiscountTier[]
): {
  finalUnitPriceCents: number;
  subtotalCents: number;
  activeTier: ProgressiveDiscountTier | null;
  totalSavedCents: number;
} {
  const normalSubtotal = basePriceCents * quantity;
  if (!tiers || tiers.length === 0 || quantity <= 1) {
    return {
      finalUnitPriceCents: basePriceCents,
      subtotalCents: normalSubtotal,
      activeTier: null,
      totalSavedCents: 0,
    };
  }

  // Ordena os tiers do maior min_quantity para o menor para encontrar a melhor faixa ativa
  const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
  const active = sortedTiers.find((t) => quantity >= t.min_quantity) || null;

  if (!active) {
    return {
      finalUnitPriceCents: basePriceCents,
      subtotalCents: normalSubtotal,
      activeTier: null,
      totalSavedCents: 0,
    };
  }

  let finalUnitPriceCents = basePriceCents;
  if (active.discount_type === "percentage") {
    finalUnitPriceCents = Math.round(basePriceCents * (1 - active.discount_value / 100));
  } else {
    finalUnitPriceCents = Math.max(0, basePriceCents - active.discount_value);
  }

  const finalSubtotal = finalUnitPriceCents * quantity;
  const totalSavedCents = Math.max(0, normalSubtotal - finalSubtotal);

  return {
    finalUnitPriceCents,
    subtotalCents: finalSubtotal,
    activeTier: active,
    totalSavedCents,
  };
}

// ─── 16. VIAGENS, PACOTES & LEADS DINÂMICOS (BIGTECH AIR & TRAVEL) ─────────────

export type TravelPricingMode = "total_package" | "per_person";

export interface CustomLeadFormField {
  id: string;
  label: string;
  type: "text" | "select" | "boolean";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface TravelLeadPayload {
  adultsCount: number;
  childrenCount: number;
  childrenAges: string[];
  departureDate?: string;
  returnDate?: string;
  flexiblePeriodText?: string;
  isFlexibleDates?: boolean;
  passengerNames?: string;
  specialRequests?: string;
  customAnswers?: Record<string, any>;
  customerName: string;
  customerPhone: string;
}


// ─── 17. MOTOR DE TEMPLATES CANÔNICOS, COMPATIBILIDADE POR NICHO & LAYOUT BIDIRECIONAL ───

export type ClassifiedTemplateStyle =
  | "standard"
  | "editorial"
  | "automotivo"
  | "imobiliario"
  | "resort_hotel"
  | "servicos_agenda"
  | "conveniencia";

export type ClassifiedNicheId =
  | "viagem"
  | "hospedagem"
  | "imovel"
  | "veiculo"
  | "equipamento"
  | "servico"
  | "vaga"
  | "digital"
  | "assinatura"
  | "doacao"
  | "negocio"
  | "gastronomia"
  | "mercado"
  | "evento"
  | "agro"
  | "farmacia"
  | "desapego";

export interface TemplateViewportManifest {
  columns: number;
  heroAspectRatio: "16:10" | "21:9" | "4:3" | "1:1";
  layoutPattern: "split_8_4" | "editorial_magazine" | "catalog_2col" | "mobile_native_stack";
  featuredStripMode: "telemetry" | "architectural" | "hospitality" | "schedule" | "editorial" | "standard" | "commerce";
  stickyConversionPosition: "right_rail" | "bottom_bar";
  defaultActiveTab: "specs" | "details" | "conditions";
}

export interface ClassifiedTemplateManifest {
  id: ClassifiedTemplateStyle;
  label: string;
  shortLabel: string;
  badgeText: string;
  description: string;
  compatibleNiches: ClassifiedNicheId[];
  desktop: TemplateViewportManifest;
  mobile: TemplateViewportManifest;
}

export const CLASSIFIED_TEMPLATES_CATALOG: Record<ClassifiedTemplateStyle, ClassifiedTemplateManifest> = {
  standard: {
    id: "standard",
    label: "Vitrine Padrão Universal",
    shortLabel: "Padrão",
    badgeText: "Vitrine Oficial",
    description: "Layout equilibrado com galeria estruturada, ficha técnica completa e conversão direta.",
    compatibleNiches: [
      "desapego",
      "veiculo",
      "imovel",
      "hospedagem",
      "viagem",
      "servico",
      "vaga",
      "digital",
      "assinatura",
      "equipamento",
      "doacao",
      "negocio",
      "gastronomia",
      "mercado",
      "evento",
      "agro",
      "farmacia",
    ],
    desktop: {
      columns: 12,
      heroAspectRatio: "16:10",
      layoutPattern: "split_8_4",
      featuredStripMode: "standard",
      stickyConversionPosition: "right_rail",
      defaultActiveTab: "specs",
    },
    mobile: {
      columns: 1,
      heroAspectRatio: "4:3",
      layoutPattern: "mobile_native_stack",
      featuredStripMode: "standard",
      stickyConversionPosition: "bottom_bar",
      defaultActiveTab: "specs",
    },
  },
  editorial: {
    id: "editorial",
    label: "Editorial & Storytelling",
    shortLabel: "Editorial",
    badgeText: "Curadoria Editorial",
    description: "Narrativa visual imersiva com tipografia destacada, destaques curatoriais e experiência revista.",
    compatibleNiches: [
      "viagem",
      "hospedagem",
      "imovel",
      "veiculo",
      "servico",
      "evento",
      "negocio",
      "gastronomia",
      "desapego",
      "vaga",
      "digital",
      "assinatura",
      "agro",
    ],
    desktop: {
      columns: 12,
      heroAspectRatio: "21:9",
      layoutPattern: "editorial_magazine",
      featuredStripMode: "editorial",
      stickyConversionPosition: "right_rail",
      defaultActiveTab: "details",
    },
    mobile: {
      columns: 1,
      heroAspectRatio: "4:3",
      layoutPattern: "mobile_native_stack",
      featuredStripMode: "editorial",
      stickyConversionPosition: "bottom_bar",
      defaultActiveTab: "details",
    },
  },
  automotivo: {
    id: "automotivo",
    label: "Showroom Automotivo & Maquinário",
    shortLabel: "Auto",
    badgeText: "Showroom Certificado",
    description: "Cockpit técnico com barra de telemetria rápida (Ano, KM, Câmbio, Motor/Potência) e procedência.",
    compatibleNiches: ["veiculo", "agro"],
    desktop: {
      columns: 12,
      heroAspectRatio: "16:10",
      layoutPattern: "split_8_4",
      featuredStripMode: "telemetry",
      stickyConversionPosition: "right_rail",
      defaultActiveTab: "specs",
    },
    mobile: {
      columns: 1,
      heroAspectRatio: "4:3",
      layoutPattern: "mobile_native_stack",
      featuredStripMode: "telemetry",
      stickyConversionPosition: "bottom_bar",
      defaultActiveTab: "specs",
    },
  },
  imobiliario: {
    id: "imobiliario",
    label: "Planta & Patrimônio Imobiliário",
    shortLabel: "Imóvel",
    badgeText: "Ficha Patrimonial",
    description: "Destaque arquitetônico para área privativa, dormitórios/suítes, vagas e composição mensal (Condomínio + IPTU).",
    compatibleNiches: ["imovel", "hospedagem", "negocio"],
    desktop: {
      columns: 12,
      heroAspectRatio: "16:10",
      layoutPattern: "split_8_4",
      featuredStripMode: "architectural",
      stickyConversionPosition: "right_rail",
      defaultActiveTab: "specs",
    },
    mobile: {
      columns: 1,
      heroAspectRatio: "4:3",
      layoutPattern: "mobile_native_stack",
      featuredStripMode: "architectural",
      stickyConversionPosition: "bottom_bar",
      defaultActiveTab: "specs",
    },
  },
  resort_hotel: {
    id: "resort_hotel",
    label: "Resort, Pousada & Hospitalidade",
    shortLabel: "Resort",
    badgeText: "Estadia & Lazer",
    description: "Experiência hoteleira focada em capacidade de hóspedes, horários de check-in/out e comodidades de estadia.",
    compatibleNiches: ["hospedagem", "viagem"],
    desktop: {
      columns: 12,
      heroAspectRatio: "16:10",
      layoutPattern: "split_8_4",
      featuredStripMode: "hospitality",
      stickyConversionPosition: "right_rail",
      defaultActiveTab: "specs",
    },
    mobile: {
      columns: 1,
      heroAspectRatio: "4:3",
      layoutPattern: "mobile_native_stack",
      featuredStripMode: "hospitality",
      stickyConversionPosition: "bottom_bar",
      defaultActiveTab: "specs",
    },
  },
  servicos_agenda: {
    id: "servicos_agenda",
    label: "Agenda Profissional & Serviços",
    shortLabel: "Serviço",
    badgeText: "Atendimento & Agenda",
    description: "Vitrine de prestação de serviços, locação e assinaturas com disponibilidade, SLA e agendamento imediato.",
    compatibleNiches: ["servico", "assinatura", "equipamento"],
    desktop: {
      columns: 12,
      heroAspectRatio: "16:10",
      layoutPattern: "split_8_4",
      featuredStripMode: "schedule",
      stickyConversionPosition: "right_rail",
      defaultActiveTab: "specs",
    },
    mobile: {
      columns: 1,
      heroAspectRatio: "4:3",
      layoutPattern: "mobile_native_stack",
      featuredStripMode: "schedule",
      stickyConversionPosition: "bottom_bar",
      defaultActiveTab: "specs",
    },
  },
  conveniencia: {
    id: "conveniencia",
    label: "Catálogo Rápido & Delivery",
    shortLabel: "Delivery",
    badgeText: "Pronta Entrega",
    description: "Vitrine transacional de compra rápida com seletor de quantidade, descontos progressivos e pedido em 3 toques.",
    compatibleNiches: ["mercado", "gastronomia", "farmacia", "desapego"],
    desktop: {
      columns: 12,
      heroAspectRatio: "1:1",
      layoutPattern: "catalog_2col",
      featuredStripMode: "commerce",
      stickyConversionPosition: "right_rail",
      defaultActiveTab: "specs",
    },
    mobile: {
      columns: 1,
      heroAspectRatio: "1:1",
      layoutPattern: "mobile_native_stack",
      featuredStripMode: "commerce",
      stickyConversionPosition: "bottom_bar",
      defaultActiveTab: "specs",
    },
  },
};

export const NICHE_TEMPLATE_COMPATIBILITY_MAP: Record<
  ClassifiedNicheId,
  {
    defaultTemplate: ClassifiedTemplateStyle;
    allowedTemplates: ClassifiedTemplateStyle[];
  }
> = {
  viagem: {
    defaultTemplate: "editorial",
    allowedTemplates: ["editorial", "resort_hotel", "standard"],
  },
  hospedagem: {
    defaultTemplate: "resort_hotel",
    allowedTemplates: ["resort_hotel", "imobiliario", "editorial", "standard"],
  },
  imovel: {
    defaultTemplate: "imobiliario",
    allowedTemplates: ["imobiliario", "standard", "editorial"],
  },
  veiculo: {
    defaultTemplate: "automotivo",
    allowedTemplates: ["automotivo", "standard", "editorial"],
  },
  agro: {
    defaultTemplate: "automotivo",
    allowedTemplates: ["automotivo", "standard", "editorial"],
  },
  servico: {
    defaultTemplate: "servicos_agenda",
    allowedTemplates: ["servicos_agenda", "standard", "editorial"],
  },
  assinatura: {
    defaultTemplate: "servicos_agenda",
    allowedTemplates: ["servicos_agenda", "standard", "editorial"],
  },
  equipamento: {
    defaultTemplate: "standard",
    allowedTemplates: ["standard", "servicos_agenda"],
  },
  mercado: {
    defaultTemplate: "conveniencia",
    allowedTemplates: ["conveniencia", "standard"],
  },
  gastronomia: {
    defaultTemplate: "conveniencia",
    allowedTemplates: ["conveniencia", "standard", "editorial"],
  },
  farmacia: {
    defaultTemplate: "conveniencia",
    allowedTemplates: ["conveniencia", "standard"],
  },
  desapego: {
    defaultTemplate: "standard",
    allowedTemplates: ["standard", "editorial", "conveniencia"],
  },
  evento: {
    defaultTemplate: "editorial",
    allowedTemplates: ["editorial", "standard"],
  },
  vaga: {
    defaultTemplate: "standard",
    allowedTemplates: ["standard", "editorial"],
  },
  negocio: {
    defaultTemplate: "editorial",
    allowedTemplates: ["editorial", "imobiliario", "standard"],
  },
  digital: {
    defaultTemplate: "standard",
    allowedTemplates: ["standard", "editorial"],
  },
  doacao: {
    defaultTemplate: "standard",
    allowedTemplates: ["standard"],
  },
};

export function normalizeClassifiedNicheId(rawNiche?: string | null, rawCategory?: string | null): ClassifiedNicheId {
  const n = (rawNiche || "").toLowerCase().trim();
  const c = (rawCategory || "").toLowerCase().trim();

  if (n in NICHE_TEMPLATE_COMPATIBILITY_MAP) {
    return n as ClassifiedNicheId;
  }
  if (n === "travel" || n === "turismo" || c === "travel") return "viagem";
  if (n === "hospitality" || n === "temporada") return "hospedagem";
  if (n === "real_estate" || n === "imoveis" || c === "real_estate") return "imovel";
  if (n === "vehicle" || n === "veiculos" || n === "vehicles" || c === "vehicle") return "veiculo";
  if (n === "agri" || n === "agronegocio") return "agro";
  if (n === "service" || n === "servicos" || n === "services" || c === "service") return "servico";
  if (n === "job" || n === "job_offer" || n === "emprego" || c === "job" || c === "job_offer") return "vaga";
  if (n === "business" || n === "negocios" || c === "business") return "negocio";
  if (n === "food" || n === "food_service" || c === "food") return "gastronomia";
  if (n === "grocery" || n === "supermarket" || n === "conveniencia") return "mercado";
  if (n === "pharmacy" || n === "saude") return "farmacia";
  if (n === "event" || n === "eventos" || c === "event") return "evento";
  if (n === "equipment" || n === "locacao" || c === "equipment") return "equipamento";
  if (n === "donation" || c === "donation") return "doacao";
  return "desapego";
}

export function getDefaultClassifiedTemplateForNiche(nicheId?: string | null, category?: string | null): ClassifiedTemplateStyle {
  const normalized = normalizeClassifiedNicheId(nicheId, category);
  return NICHE_TEMPLATE_COMPATIBILITY_MAP[normalized]?.defaultTemplate || "standard";
}

export function getAllowedClassifiedTemplatesForNiche(nicheId?: string | null, category?: string | null): ClassifiedTemplateManifest[] {
  const normalized = normalizeClassifiedNicheId(nicheId, category);
  const allowedIds = NICHE_TEMPLATE_COMPATIBILITY_MAP[normalized]?.allowedTemplates || ["standard"];
  return allowedIds.map((id) => CLASSIFIED_TEMPLATES_CATALOG[id]).filter(Boolean);
}

/**
 * Resolve o template ativo ao alternar de nicho:
 * - Se `preserveIfCompatible === true` e o template atual for suportado no novo nicho, preserva-o;
 * - Caso contrário, retorna o template canônico default do novo nicho.
 */
export function resolveCompatibleClassifiedTemplate(
  nicheId?: string | null,
  currentTemplate?: string | null,
  options?: { preserveIfCompatible?: boolean; category?: string | null }
): ClassifiedTemplateStyle {
  const normalized = normalizeClassifiedNicheId(nicheId, options?.category);
  const rule = NICHE_TEMPLATE_COMPATIBILITY_MAP[normalized] || NICHE_TEMPLATE_COMPATIBILITY_MAP.desapego;
  const preserve = options?.preserveIfCompatible ?? true;

  if (
    preserve &&
    currentTemplate &&
    (rule.allowedTemplates as string[]).includes(currentTemplate)
  ) {
    return currentTemplate as ClassifiedTemplateStyle;
  }

  return rule.defaultTemplate;
}

export function resolveClassifiedTemplateManifest(
  templateStyle?: string | null,
  nicheId?: string | null,
  category?: string | null
): ClassifiedTemplateManifest {
  const resolvedStyle = resolveCompatibleClassifiedTemplate(nicheId, templateStyle, {
    preserveIfCompatible: true,
    category,
  });
  return CLASSIFIED_TEMPLATES_CATALOG[resolvedStyle] || CLASSIFIED_TEMPLATES_CATALOG.standard;
}
