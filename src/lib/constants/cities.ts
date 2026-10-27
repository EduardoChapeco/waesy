export interface CityRecord {
 id: string;
 name: string;
 state: string;
 label: string; // Ex: "Chapecó - SC"
 region: string;
 lat?: number;
 lng?: number;
}

export interface NeighborhoodPreset {
 name: string;
 defaultFeeCents: number;
 defaultTimeMinutes: number;
 active: boolean;
}

export const CHAPECO_NEIGHBORHOODS: NeighborhoodPreset[] = [
 { name: "Centro", defaultFeeCents: 500, defaultTimeMinutes: 30, active: true },
 { name: "Efapi", defaultFeeCents: 800, defaultTimeMinutes: 45, active: true },
 { name: "São Cristóvão", defaultFeeCents: 600, defaultTimeMinutes: 35, active: true },
 { name: "Passo dos Fortes", defaultFeeCents: 500, defaultTimeMinutes: 30, active: true },
 { name: "Seminário", defaultFeeCents: 700, defaultTimeMinutes: 40, active: true },
 { name: "Engenho Braun", defaultFeeCents: 800, defaultTimeMinutes: 45, active: true },
 { name: "Bela Vista", defaultFeeCents: 700, defaultTimeMinutes: 40, active: true },
 { name: "Palmital", defaultFeeCents: 600, defaultTimeMinutes: 35, active: true },
 { name: "Jardim Itália", defaultFeeCents: 500, defaultTimeMinutes: 30, active: true },
 { name: "Presidente Médici", defaultFeeCents: 600, defaultTimeMinutes: 35, active: true },
 { name: "Maria Goretti", defaultFeeCents: 500, defaultTimeMinutes: 30, active: true },
 { name: "Santa Maria", defaultFeeCents: 700, defaultTimeMinutes: 40, active: true },
 { name: "Alvorada", defaultFeeCents: 600, defaultTimeMinutes: 35, active: true },
 { name: "Líder", defaultFeeCents: 700, defaultTimeMinutes: 40, active: true },
 { name: "Quedas do Palmital", defaultFeeCents: 900, defaultTimeMinutes: 50, active: true },
];

export const DEFAULT_GENERIC_NEIGHBORHOODS: NeighborhoodPreset[] = [
  { name: "Centro", defaultFeeCents: 500, defaultTimeMinutes: 30, active: true },
  { name: "Bairros Próximos", defaultFeeCents: 700, defaultTimeMinutes: 40, active: true },
  { name: "Bairros Afastados", defaultFeeCents: 1000, defaultTimeMinutes: 50, active: true },
];

export function getNeighborhoodsForCity(cityName?: string): NeighborhoodPreset[] {
  if (!cityName) return DEFAULT_GENERIC_NEIGHBORHOODS;
  const norm = cityName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (norm.includes("chapeco")) {
    return CHAPECO_NEIGHBORHOODS;
  }
  return DEFAULT_GENERIC_NEIGHBORHOODS;
}

export const CANONICAL_CITIES: CityRecord[] = [
 // ── Grande Oeste Catarinense (Foco Principal Waesy) ──
 { id: "chapeco-sc", name: "Chapecó", state: "SC", label: "Chapecó - SC", region: "Oeste SC", lat: -27.1004, lng: -52.6152 },
 { id: "xanxere-sc", name: "Xanxerê", state: "SC", label: "Xanxerê - SC", region: "Oeste SC", lat: -26.8747, lng: -52.4036 },
 { id: "concordia-sc", name: "Concórdia", state: "SC", label: "Concórdia - SC", region: "Oeste SC", lat: -27.2341, lng: -52.0264 },
 { id: "sao-miguel-do-oeste-sc", name: "São Miguel do Oeste", state: "SC", label: "São Miguel do Oeste - SC", region: "Extremo Oeste SC", lat: -26.7264, lng: -53.5186 },
 { id: "descanso-sc", name: "Descanso", state: "SC", label: "Descanso - SC", region: "Extremo Oeste SC", lat: -26.8267, lng: -53.5042 },
 { id: "guaraciaba-sc", name: "Guaraciaba", state: "SC", label: "Guaraciaba - SC", region: "Extremo Oeste SC", lat: -26.5986, lng: -53.5208 },
 { id: "sao-jose-do-cedro-sc", name: "São José do Cedro", state: "SC", label: "São José do Cedro - SC", region: "Extremo Oeste SC", lat: -26.4681, lng: -53.5008 },
 { id: "dionisio-cerqueira-sc", name: "Dionísio Cerqueira", state: "SC", label: "Dionísio Cerqueira - SC", region: "Extremo Oeste SC", lat: -26.2558, lng: -53.6372 },
 { id: "ipora-do-oeste-sc", name: "Iporã do Oeste", state: "SC", label: "Iporã do Oeste - SC", region: "Extremo Oeste SC", lat: -26.9881, lng: -53.5358 },
 { id: "mondai-sc", name: "Mondaí", state: "SC", label: "Mondaí - SC", region: "Extremo Oeste SC", lat: -27.1061, lng: -53.4008 },
 { id: "paraiso-sc", name: "Paraíso", state: "SC", label: "Paraíso - SC", region: "Extremo Oeste SC", lat: -26.6189, lng: -53.6719 },
 { id: "bandeirante-sc", name: "Bandeirante", state: "SC", label: "Bandeirante - SC", region: "Extremo Oeste SC", lat: -26.7681, lng: -53.6408 },
 { id: "belmonte-sc", name: "Belmonte", state: "SC", label: "Belmonte - SC", region: "Extremo Oeste SC", lat: -26.8406, lng: -53.5786 },
 { id: "anchieta-sc", name: "Anchieta", state: "SC", label: "Anchieta - SC", region: "Extremo Oeste SC", lat: -26.3689, lng: -53.3325 },
 { id: "romelandia-sc", name: "Romelândia", state: "SC", label: "Romelândia - SC", region: "Extremo Oeste SC", lat: -26.5083, lng: -53.3139 },
 { id: "palma-sola-sc", name: "Palma Sola", state: "SC", label: "Palma Sola - SC", region: "Extremo Oeste SC", lat: -26.3475, lng: -53.2806 },
 { id: "tunapolis-sc", name: "Tunápolis", state: "SC", label: "Tunápolis - SC", region: "Extremo Oeste SC", lat: -26.9722, lng: -53.6389 },
 { id: "santa-helena-sc", name: "Santa Helena", state: "SC", label: "Santa Helena - SC", region: "Extremo Oeste SC", lat: -26.9389, lng: -53.6083 },
 { id: "sao-joao-do-oeste-sc", name: "São João do Oeste", state: "SC", label: "São João do Oeste - SC", region: "Extremo Oeste SC", lat: -27.0861, lng: -53.5972 },
 { id: "riqueza-sc", name: "Riqueza", state: "SC", label: "Riqueza - SC", region: "Extremo Oeste SC", lat: -27.0667, lng: -53.3167 },
 { id: "joacaba-sc", name: "Joaçaba", state: "SC", label: "Joaçaba - SC", region: "Meio-Oeste SC", lat: -27.1772, lng: -51.5039 },
 { id: "pinhalzinho-sc", name: "Pinhalzinho", state: "SC", label: "Pinhalzinho - SC", region: "Oeste SC", lat: -26.8458, lng: -52.9933 },
 { id: "maravilha-sc", name: "Maravilha", state: "SC", label: "Maravilha - SC", region: "Oeste SC", lat: -26.7622, lng: -53.1764 },
 { id: "xaxim-sc", name: "Xaxim", state: "SC", label: "Xaxim - SC", region: "Oeste SC", lat: -26.9608, lng: -52.5358 },
 { id: "seara-sc", name: "Seara", state: "SC", label: "Seara - SC", region: "Oeste SC", lat: -27.1517, lng: -52.3117 },
 { id: "coronel-freitas-sc", name: "Coronel Freitas", state: "SC", label: "Coronel Freitas - SC", region: "Oeste SC", lat: -26.9083, lng: -52.7042 },
 { id: "palmitos-sc", name: "Palmitos", state: "SC", label: "Palmitos - SC", region: "Extremo Oeste SC", lat: -27.0678, lng: -53.1611 },
 { id: "itapiranga-sc", name: "Itapiranga", state: "SC", label: "Itapiranga - SC", region: "Extremo Oeste SC", lat: -27.1681, lng: -53.7125 },
 { id: "sao-lourenco-do-oeste-sc", name: "São Lourenço do Oeste", state: "SC", label: "São Lourenço do Oeste - SC", region: "Noroeste SC", lat: -26.3589, lng: -52.8514 },
 { id: "cunha-pora-sc", name: "Cunha Porã", state: "SC", label: "Cunha Porã - SC", region: "Oeste SC", lat: -26.9536, lng: -53.1683 },
 { id: "quilombo-sc", name: "Quilombo", state: "SC", label: "Quilombo - SC", region: "Oeste SC", lat: -26.7267, lng: -52.7239 },
 { id: "saudades-sc", name: "Saudades", state: "SC", label: "Saudades - SC", region: "Oeste SC", lat: -26.9242, lng: -53.0033 },
 { id: "abelardo-luz-sc", name: "Abelardo Luz", state: "SC", label: "Abelardo Luz - SC", region: "Oeste SC", lat: -26.5683, lng: -52.3278 },
 { id: "guatambu-sc", name: "Guatambu", state: "SC", label: "Guatambu - SC", region: "Oeste SC", lat: -27.1333, lng: -52.7833 },
 { id: "cordilheira-alta-sc", name: "Cordilheira Alta", state: "SC", label: "Cordilheira Alta - SC", region: "Oeste SC", lat: -26.9833, lng: -52.6167 },
 { id: "nova-erechim-sc", name: "Nova Erechim", state: "SC", label: "Nova Erechim - SC", region: "Oeste SC", lat: -26.8986, lng: -52.9069 },
 { id: "caxambu-do-sul-sc", name: "Caxambu do Sul", state: "SC", label: "Caxambu do Sul - SC", region: "Oeste SC", lat: -27.1625, lng: -52.8806 },
 { id: "aguas-de-chapeco-sc", name: "Águas de Chapecó", state: "SC", label: "Águas de Chapecó - SC", region: "Oeste SC", lat: -27.0694, lng: -52.9867 },
 { id: "sao-carlos-sc", name: "São Carlos", state: "SC", label: "São Carlos - SC", region: "Oeste SC", lat: -27.0811, lng: -53.0039 },

 // ── Outras Macrorregiões de Santa Catarina ──
 { id: "florianopolis-sc", name: "Florianópolis", state: "SC", label: "Florianópolis - SC", region: "Grande Florianópolis", lat: -27.5954, lng: -48.5480 },
 { id: "sao-jose-sc", name: "São José", state: "SC", label: "São José - SC", region: "Grande Florianópolis", lat: -27.6136, lng: -48.6364 },
 { id: "palhoca-sc", name: "Palhoça", state: "SC", label: "Palhoça - SC", region: "Grande Florianópolis", lat: -27.6453, lng: -48.6678 },
 { id: "joinville-sc", name: "Joinville", state: "SC", label: "Joinville - SC", region: "Norte SC", lat: -26.3045, lng: -48.8487 },
 { id: "blumenau-sc", name: "Blumenau", state: "SC", label: "Blumenau - SC", region: "Vale do Itajaí", lat: -26.9194, lng: -49.0661 },
 { id: "balneario-camboriu-sc", name: "Balneário Camboriú", state: "SC", label: "Balneário Camboriú - SC", region: "Litoral Norte SC", lat: -26.9926, lng: -48.6353 },
 { id: "itajai-sc", name: "Itajaí", state: "SC", label: "Itajaí - SC", region: "Litoral Norte SC", lat: -26.9078, lng: -48.6619 },
 { id: "criciuma-sc", name: "Criciúma", state: "SC", label: "Criciúma - SC", region: "Sul SC", lat: -28.6775, lng: -49.3697 },
 { id: "lages-sc", name: "Lages", state: "SC", label: "Lages - SC", region: "Serra Catarinense", lat: -27.8161, lng: -50.3261 },
 { id: "brusque-sc", name: "Brusque", state: "SC", label: "Brusque - SC", region: "Vale do Itajaí", lat: -27.0978, lng: -48.9106 },
 { id: "tubarao-sc", name: "Tubarão", state: "SC", label: "Tubarão - SC", region: "Sul SC", lat: -28.4739, lng: -49.0072 },
 { id: "rio-do-sul-sc", name: "Rio do Sul", state: "SC", label: "Rio do Sul - SC", region: "Alto Vale SC", lat: -27.2153, lng: -49.6431 },
 { id: "jaragua-do-sul-sc", name: "Jaraguá do Sul", state: "SC", label: "Jaraguá do Sul - SC", region: "Norte SC", lat: -26.4853, lng: -49.0839 },
 { id: "videira-sc", name: "Videira", state: "SC", label: "Videira - SC", region: "Meio-Oeste SC", lat: -27.0083, lng: -51.1528 },
 { id: "cacador-sc", name: "Caçador", state: "SC", label: "Caçador - SC", region: "Meio-Oeste SC", lat: -26.7753, lng: -51.0125 },

 // ── Paraná ──
 { id: "curitiba-pr", name: "Curitiba", state: "PR", label: "Curitiba - PR", region: "Capital PR", lat: -25.4284, lng: -49.2733 },
 { id: "pato-branco-pr", name: "Pato Branco", state: "PR", label: "Pato Branco - PR", region: "Sudoeste PR", lat: -26.2289, lng: -52.6711 },
 { id: "francisco-beltrao-pr", name: "Francisco Beltrão", state: "PR", label: "Francisco Beltrão - PR", region: "Sudoeste PR", lat: -26.0792, lng: -53.0553 },
 { id: "cascavel-pr", name: "Cascavel", state: "PR", label: "Cascavel - PR", region: "Oeste PR", lat: -24.9578, lng: -53.4595 },
 { id: "foz-do-iguacu-pr", name: "Foz do Iguaçu", state: "PR", label: "Foz do Iguaçu - PR", region: "Oeste PR", lat: -25.5163, lng: -54.5854 },
 { id: "londrina-pr", name: "Londrina", state: "PR", label: "Londrina - PR", region: "Norte PR", lat: -23.3045, lng: -51.1696 },
 { id: "maringa-pr", name: "Maringá", state: "PR", label: "Maringá - PR", region: "Norte PR", lat: -23.4205, lng: -51.9333 },
 { id: "ponta-grossa-pr", name: "Ponta Grossa", state: "PR", label: "Ponta Grossa - PR", region: "Campos Gerais PR", lat: -25.0994, lng: -50.1583 },

 // ── Rio Grande do Sul ──
 { id: "porto-alegre-rs", name: "Porto Alegre", state: "RS", label: "Porto Alegre - RS", region: "Capital RS", lat: -30.0346, lng: -51.2177 },
 { id: "erechim-rs", name: "Erechim", state: "RS", label: "Erechim - RS", region: "Norte RS", lat: -27.6342, lng: -52.2739 },
 { id: "passo-fundo-rs", name: "Passo Fundo", state: "RS", label: "Passo Fundo - RS", region: "Norte RS", lat: -28.2628, lng: -52.4067 },
 { id: "caxias-do-sul-rs", name: "Caxias do Sul", state: "RS", label: "Caxias do Sul - RS", region: "Serra Gaúcha", lat: -29.1678, lng: -51.1794 },
 { id: "nonoai-rs", name: "Nonoai", state: "RS", label: "Nonoai - RS", region: "Norte RS", lat: -27.3592, lng: -52.7744 },
 { id: "frederico-westphalen-rs", name: "Frederico Westphalen", state: "RS", label: "Frederico Westphalen - RS", region: "Norte RS", lat: -27.3589, lng: -53.3961 },

 // ── Vale do Paraíba, Litoral Norte & Serra da Mantiqueira (SP) ──
 { id: "sao-jose-dos-campos-sp", name: "São José dos Campos", state: "SP", label: "São José dos Campos - SP", region: "Vale do Paraíba SP", lat: -23.1896, lng: -45.8841 },
 { id: "taubate-sp", name: "Taubaté", state: "SP", label: "Taubaté - SP", region: "Vale do Paraíba SP", lat: -23.0205, lng: -45.5564 },
 { id: "jacarei-sp", name: "Jacareí", state: "SP", label: "Jacareí - SP", region: "Vale do Paraíba SP", lat: -23.3053, lng: -45.9658 },
 { id: "pindamonhangaba-sp", name: "Pindamonhangaba", state: "SP", label: "Pindamonhangaba - SP", region: "Vale do Paraíba SP", lat: -22.9244, lng: -45.4617 },
 { id: "guaratingueta-sp", name: "Guaratinguetá", state: "SP", label: "Guaratinguetá - SP", region: "Vale do Paraíba SP", lat: -22.8164, lng: -45.1925 },
 { id: "cacapava-sp", name: "Caçapava", state: "SP", label: "Caçapava - SP", region: "Vale do Paraíba SP", lat: -23.1008, lng: -45.7069 },
 { id: "lorena-sp", name: "Lorena", state: "SP", label: "Lorena - SP", region: "Vale do Paraíba SP", lat: -22.7308, lng: -45.1253 },
 { id: "aparecida-sp", name: "Aparecida", state: "SP", label: "Aparecida - SP", region: "Vale do Paraíba SP", lat: -22.8469, lng: -45.2297 },
 { id: "cruzeiro-sp", name: "Cruzeiro", state: "SP", label: "Cruzeiro - SP", region: "Vale do Paraíba SP", lat: -22.5761, lng: -44.9614 },
 { id: "caraguatatuba-sp", name: "Caraguatatuba", state: "SP", label: "Caraguatatuba - SP", region: "Litoral Norte SP", lat: -23.6204, lng: -45.4132 },
 { id: "ubatuba-sp", name: "Ubatuba", state: "SP", label: "Ubatuba - SP", region: "Litoral Norte SP", lat: -23.4339, lng: -45.0711 },
 { id: "sao-sebastiao-sp", name: "São Sebastião", state: "SP", label: "São Sebastião - SP", region: "Litoral Norte SP", lat: -23.8063, lng: -45.4017 },
 { id: "ilhabela-sp", name: "Ilhabela", state: "SP", label: "Ilhabela - SP", region: "Litoral Norte SP", lat: -23.7785, lng: -45.3581 },
 { id: "campos-do-jordao-sp", name: "Campos do Jordão", state: "SP", label: "Campos do Jordão - SP", region: "Serra da Mantiqueira SP", lat: -22.7394, lng: -45.5914 },
 { id: "santo-antonio-do-pinhal-sp", name: "Santo Antônio do Pinhal", state: "SP", label: "Santo Antônio do Pinhal - SP", region: "Serra da Mantiqueira SP", lat: -22.8256, lng: -45.6625 },

 // ── Demais Capitais e Polos Nacionais ──
 { id: "sao-paulo-sp", name: "São Paulo", state: "SP", label: "São Paulo - SP", region: "Sudeste", lat: -23.5505, lng: -46.6333 },
 { id: "campinas-sp", name: "Campinas", state: "SP", label: "Campinas - SP", region: "Interior SP", lat: -22.9056, lng: -47.0608 },
 { id: "santos-sp", name: "Santos", state: "SP", label: "Santos - SP", region: "Litoral SP", lat: -23.9618, lng: -46.3322 },
 { id: "rio-de-janeiro-rj", name: "Rio de Janeiro", state: "RJ", label: "Rio de Janeiro - RJ", region: "Sudeste", lat: -22.9068, lng: -43.1729 },
 { id: "niteroi-rj", name: "Niterói", state: "RJ", label: "Niterói - RJ", region: "Sudeste", lat: -22.8859, lng: -43.1153 },
 { id: "belo-horizonte-mg", name: "Belo Horizonte", state: "MG", label: "Belo Horizonte - MG", region: "Sudeste", lat: -19.9167, lng: -43.9345 },
 { id: "uberlandia-mg", name: "Uberlândia", state: "MG", label: "Uberlândia - MG", region: "Triângulo Mineiro", lat: -18.9186, lng: -48.2772 },
 { id: "vitoria-es", name: "Vitória", state: "ES", label: "Vitória - ES", region: "Sudeste", lat: -20.3155, lng: -40.3128 },
 { id: "brasilia-df", name: "Brasília", state: "DF", label: "Brasília - DF", region: "Centro-Oeste", lat: -15.7975, lng: -47.8919 },
 { id: "goiania-go", name: "Goiânia", state: "GO", label: "Goiânia - GO", region: "Centro-Oeste", lat: -16.6869, lng: -49.2648 },
 { id: "cuiaba-mt", name: "Cuiabá", state: "MT", label: "Cuiabá - MT", region: "Centro-Oeste", lat: -15.6014, lng: -56.0979 },
 { id: "campo-grande-ms", name: "Campo Grande", state: "MS", label: "Campo Grande - MS", region: "Centro-Oeste", lat: -20.4697, lng: -54.6201 },
 { id: "salvador-ba", name: "Salvador", state: "BA", label: "Salvador - BA", region: "Nordeste", lat: -12.9777, lng: -38.5016 },
 { id: "recife-pe", name: "Recife", state: "PE", label: "Recife - PE", region: "Nordeste", lat: -8.0476, lng: -34.8770 },
 { id: "fortaleza-ce", name: "Fortaleza", state: "CE", label: "Fortaleza - CE", region: "Nordeste", lat: -3.7327, lng: -38.5270 },
 { id: "natal-rn", name: "Natal", state: "RN", label: "Natal - RN", region: "Nordeste", lat: -5.7945, lng: -35.2110 },
 { id: "joao-pessoa-pb", name: "João Pessoa", state: "PB", label: "João Pessoa - PB", region: "Nordeste", lat: -7.1195, lng: -34.8450 },
 { id: "maceio-al", name: "Maceió", state: "AL", label: "Maceió - AL", region: "Nordeste", lat: -9.6498, lng: -35.7089 },
 { id: "aracaju-se", name: "Aracaju", state: "SE", label: "Aracaju - SE", region: "Nordeste", lat: -10.9472, lng: -37.0731 },
 { id: "sao-luis-ma", name: "São Luís", state: "MA", label: "São Luís - MA", region: "Nordeste", lat: -2.5307, lng: -44.3068 },
 { id: "teresina-pi", name: "Teresina", state: "PI", label: "Teresina - PI", region: "Nordeste", lat: -5.0920, lng: -42.8038 },
 { id: "manaus-am", name: "Manaus", state: "AM", label: "Manaus - AM", region: "Norte", lat: -3.1190, lng: -60.0217 },
 { id: "belem-pa", name: "Belém", state: "PA", label: "Belém - PA", region: "Norte", lat: -1.4558, lng: -48.4902 },
 { id: "porto-velho-ro", name: "Porto Velho", state: "RO", label: "Porto Velho - RO", region: "Norte", lat: -8.7619, lng: -63.9039 },
 { id: "palmas-to", name: "Palmas", state: "TO", label: "Palmas - TO", region: "Norte", lat: -10.2491, lng: -48.3243 },
 { id: "rio-branco-ac", name: "Rio Branco", state: "AC", label: "Rio Branco - AC", region: "Norte", lat: -9.9753, lng: -67.8249 },
 { id: "macapa-ap", name: "Macapá", state: "AP", label: "Macapá - AP", region: "Norte", lat: 0.0356, lng: -51.0705 },
 { id: "boa-vista-rr", name: "Boa Vista", state: "RR", label: "Boa Vista - RR", region: "Norte", lat: 2.8235, lng: -60.6758 },
];

export function getCitiesByState(uf: string): CityRecord[] {
 if (!uf) return CANONICAL_CITIES;
 return CANONICAL_CITIES.filter((c) => c.state.toUpperCase() === uf.toUpperCase());
}

export function searchCanonicalCities(query: string, limit = 12): CityRecord[] {
 if (!query || query.trim().length === 0) {
 return CANONICAL_CITIES.slice(0, limit);
 }

 const normalize = (str: string) =>
 str
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .trim();

 const q = normalize(query);

 return CANONICAL_CITIES.map((c) => {
 const normName = normalize(c.name);
 const normLabel = normalize(c.label);
 const normState = normalize(c.state);

 let score = 0;
 if (normName === q || normLabel === q) score = 100;
 else if (normName.startsWith(q)) score = 80;
 else if (normLabel.includes(q)) score = 60;
 else if (normState === q) score = 40;
 else if (normalize(c.region).includes(q)) score = 30;

 return { city: c, score };
 })
 .filter((item) => item.score > 0)
 .sort((a, b) => b.score - a.score)
 .slice(0, limit)
 .map((item) => item.city);
}

export function findCityByLabel(label: string): CityRecord | undefined {
 if (!label) return undefined;
 return CANONICAL_CITIES.find(
 (c) =>
 c.label.toLowerCase() === label.toLowerCase() ||
 c.name.toLowerCase() === label.toLowerCase() ||
 c.id.toLowerCase() === label.toLowerCase()
 );
}

export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
 const R = 6371; // Raio da Terra em km
 const dLat = ((lat2 - lat1) * Math.PI) / 180;
 const dLon = ((lon2 - lon1) * Math.PI) / 180;
 const a =
 Math.sin(dLat / 2) * Math.sin(dLat / 2) +
 Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
 return R * c;
}

export function findClosestCanonicalCity(
 lat: number,
 lng: number
): (CityRecord & { distanceKm: number }) | undefined {
 if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return undefined;

 let closest: (CityRecord & { distanceKm: number }) | undefined = undefined;
 let minDistanceKm = Infinity;

 for (const city of CANONICAL_CITIES) {
 if (typeof city.lat === "number" && typeof city.lng === "number") {
 const distKm = calculateHaversineDistanceKm(lat, lng, city.lat, city.lng);
 if (distKm < minDistanceKm) {
 minDistanceKm = distKm;
 closest = { ...city, distanceKm: Math.round(distKm * 10) / 10 };
 }
 }
 }

 return closest;
}

