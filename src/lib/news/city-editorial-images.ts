/**
 * city-editorial-images.ts — SSOT de Resolução Editorial de Imagens para Notícias
 * 
 * Garante que 100% das matérias jornalísticas exibam fotografia de alta resolução
 * da cidade ou do tema editorial correspondente quando a capa original da fonte
 * não existir ou for inválida, eliminando cards vazios ou imagens quebradas.
 */

function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Banco Canônico de Imagens por Cidade / Microrregião
 */
export const CITY_EDITORIAL_IMAGE_MAP: Record<string, string> = {
  // Extremo-Oeste Catarinense (São Miguel do Oeste e microrregião)
  sao_miguel_do_oeste: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  maravilha: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  pinhalzinho: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  dionisio_cerqueira: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  itapiranga: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  guaraciaba: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  ipora_do_oeste: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  descanso: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",

  // Grande Oeste / Bacia do Chapecó (Chapecó, Xanxerê, Concórdia, Joaçaba)
  chapeco: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
  xanxere: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
  concordia: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
  joacaba: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
  seara: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
  xaxim: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",

  // Litoral e Capital (Florianópolis, São José, Palhoça)
  florianopolis: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80",
  sao_jose: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80",
  palhoca: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80",

  // Foz do Rio Itajaí e Litoral Norte (Balneário Camboriú, Itajaí, Itapema, Bombinhas)
  balneario_camboriu: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  itapema: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  itajai: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  bombinhas: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  porto_belo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",

  // Norte Catarinense (Joinville, Jaraguá do Sul)
  joinville: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80",
  jaragua_do_sul: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80",

  // Vale Europeu (Blumenau, Brusque, Pomerode, Gaspar)
  blumenau: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
  brusque: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
  pomerode: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",

  // Serra Catarinense (Lages, São Joaquim, Urubici)
  lages: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  urubici: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  sao_joaquim: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",

  // Sul Catarinense (Criciúma, Tubarão)
  criciuma: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  tubarao: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",

  // Capitais Vizinhas
  curitiba: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80",
  porto_alegre: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
  sao_paulo: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80",
};

/**
 * Banco Canônico de Imagens por Categoria / Nicho Temático
 */
export const CATEGORY_EDITORIAL_IMAGE_MAP: Record<string, string> = {
  agro: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
  agronegocio: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
  economia: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
  negocios: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
  mercado: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
  tecnologia: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  inovacao: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  politica: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
  gestao: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
  cidade: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
  saude: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
  educacao: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
  esportes: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
  seguranca: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
  policia: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
  transito: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
  comunidade: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1200&q=80",
  sociedade: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1200&q=80",
  transporte: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
  mobilidade: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
  turismo: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
};

export const DEFAULT_CANONICAL_NEWS_IMAGE =
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80";

export interface ResolveCityNewsCoverParams {
  coverUrl?: string | null;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  tags?: string[] | null;
  title?: string | null;
}

/**
 * Resolve com segurança a imagem de capa de uma notícia:
 * 1. Se a notícia já possuir capa legítima (URL válida de imagem), preserva a original.
 * 2. Se não possuir capa, consulta o mapa geográfico da cidade da notícia.
 * 3. Se a cidade não for encontrada no mapa, consulta o nicho/categoria ou tags.
 * 4. Fallback final para foto canônica regional de Santa Catarina.
 */
export function resolveCityNewsCover(params?: ResolveCityNewsCoverParams | null): string {
  if (!params) return DEFAULT_CANONICAL_NEWS_IMAGE;

  const rawCover = params.coverUrl ? String(params.coverUrl).trim() : null;
  if (
    rawCover &&
    (rawCover.startsWith("http://") || rawCover.startsWith("https://") || rawCover.startsWith("/")) &&
    !rawCover.includes("1511707171634-5f897ff02560") &&
    rawCover !== "undefined" &&
    rawCover !== "null"
  ) {
    return rawCover;
  }

  // 1. Tenta correspondência por Cidade
  const normalizedCity = normalizeText(params.city);
  if (normalizedCity) {
    for (const [key, url] of Object.entries(CITY_EDITORIAL_IMAGE_MAP)) {
      const cleanKey = key.replace(/_/g, " ");
      if (normalizedCity.includes(cleanKey) || cleanKey.includes(normalizedCity)) {
        return url;
      }
    }
  }

  // 2. Tenta correspondência por Título ou Tags que mencionem a cidade
  const normalizedTitle = normalizeText(params.title);
  const normalizedTags = Array.isArray(params.tags)
    ? params.tags.map((t) => normalizeText(String(t)))
    : [];

  for (const [key, url] of Object.entries(CITY_EDITORIAL_IMAGE_MAP)) {
    const cleanKey = key.replace(/_/g, " ");
    if (normalizedTitle.includes(cleanKey)) {
      return url;
    }
    if (normalizedTags.some((t) => t.includes(cleanKey))) {
      return url;
    }
  }

  // 3. Tenta correspondência por Categoria ou Tags de nicho
  const normalizedCategory = normalizeText(params.category);
  if (normalizedCategory) {
    for (const [key, url] of Object.entries(CATEGORY_EDITORIAL_IMAGE_MAP)) {
      if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
        return url;
      }
    }
  }

  for (const [key, url] of Object.entries(CATEGORY_EDITORIAL_IMAGE_MAP)) {
    if (normalizedTags.some((t) => t.includes(key))) {
      return url;
    }
  }

  return DEFAULT_CANONICAL_NEWS_IMAGE;
}
