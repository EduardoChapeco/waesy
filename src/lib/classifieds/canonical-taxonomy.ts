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
 { id: "smartphones", label: "Celulares & Smartphones", iconName: "Smartphone", badge: "Alta Demanda" },
 { id: "computadores", label: "Notebooks, PCs & Acessórios", iconName: "Laptop", badge: "Informática" },
 { id: "eletrodomesticos", label: "Eletrodomésticos & Cozinha", iconName: "Refrigerator", badge: "Casa & Cozinha" },
 { id: "eletronicos", label: "Eletrônicos & Smart TVs", iconName: "Tv", badge: "Eletrônicos" },
 { id: "moveis", label: "Móveis & Decoração", iconName: "Armchair", badge: "Mobiliário" },
 { id: "moda_brecho", label: "Brechó, Roupas & Calçados", iconName: "Shirt", badge: "Moda Sustentável" },
 { id: "games_consoles", label: "Games & Videogames", iconName: "Gamepad2", badge: "Gamer" },
 { id: "som_instrumentos", label: "Som & Instrumentos Musicais", iconName: "Music", badge: "Áudio & Som" },
 { id: "garagem_ferramentas", label: "Venda de Garagem & Ferramentas", iconName: "Wrench", badge: "Lotes / Garagem" },
 { id: "outros", label: "Outros Bens & Objetos", iconName: "Package", badge: "Diversos" },
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
  { id: "industrial", label: "Industrial & Logístico (Galpões, Docas)" },
  { id: "terreno_incorporacao", label: "Terrenos & Lotes Urbanos/Condomínio" },
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

