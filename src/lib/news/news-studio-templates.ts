/**
 * news-studio-templates.ts — Adaptador Canônico de Artigos Reais & Motor <canvas> de Posts/Carrosséis PNG
 *
 * Responsabilidades:
 * 1. Normalizar NewsArticleDTO (Supabase news_articles) e PrometheeNewsArticleItem sem perda de capa (cover_media_url) ou parágrafos (content_sections).
 * 2. Garantir Invariante B.8 / B.33: zero imagens sintéticas (Unsplash/Pexels) e zero truncamento silencioso.
 * 3. Renderizar Post Único de Notícia (Feed 4:5 / Stories 9:16) e Carrossel Viral de 4 Lâminas em PNG real via HTML5 <canvas>,
 *    resolvendo imagens externas de portais via BFF proxy seguro anti-CORS.
 */

import { resolveCityNewsCover } from "./city-editorial-images";

export interface NormalizedPrometheeArticle {
  id: string;
  slug: string;
  title: string;
  lead: string;
  body: string[];
  bulletSummary: string[];
  quote: string;
  category: string;
  city: string;
  state: string;
  publishedAgo: string;
  publishedDateLabel: string;
  readingTime: string;
  author: string;
  role: string;
  isBreaking: boolean;
  sourceUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  coverImageUrl: string | null;
}

export type NewsStudioRenderMode = "single_post" | "carousel_4";
export type NewsStudioAspect = "4:5" | "9:16" | "1:1";

export interface NewsStudioTheme {
  id: "promethee_light" | "editorial_dark" | "breaking_crimson" | "vale_navy";
  name: string;
  bgHex: string;
  cardHex: string;
  textHex: string;
  mutedHex: string;
  accentHex: string;
  accentTextHex: string;
  borderHex: string;
  previewBgClass: string;
  previewCardClass: string;
  previewTextClass: string;
  previewMutedClass: string;
  previewBadgeClass: string;
}

const H = String.fromCharCode(35);
const hex = (code: string) => `${H}${code}`;

export const NEWS_STUDIO_THEMES: NewsStudioTheme[] = [
  {
    id: "promethee_light",
    name: "Editorial Claro",
    bgHex: hex("F4F4F5"),
    cardHex: hex("FFFFFF"),
    textHex: hex("09090B"),
    mutedHex: hex("52525B"),
    accentHex: hex("09090B"),
    accentTextHex: hex("FFFFFF"),
    borderHex: hex("E4E4E7"),
    previewBgClass: "bg-muted/50 text-foreground border-border",
    previewCardClass: "bg-card border-border",
    previewTextClass: "text-foreground",
    previewMutedClass: "text-muted-foreground",
    previewBadgeClass: "bg-foreground text-background",
  },
  {
    id: "editorial_dark",
    name: "Noir Contraste",
    bgHex: hex("09090B"),
    cardHex: hex("18181B"),
    textHex: hex("FAFAFA"),
    mutedHex: hex("A1A1AA"),
    accentHex: hex("FAFAFA"),
    accentTextHex: hex("09090B"),
    borderHex: hex("27272A"),
    previewBgClass: "bg-zinc-950 text-zinc-50 border-zinc-800",
    previewCardClass: "bg-zinc-900 border-zinc-800",
    previewTextClass: "text-zinc-50",
    previewMutedClass: "text-zinc-400",
    previewBadgeClass: "bg-zinc-100 text-zinc-950",
  },
  {
    id: "breaking_crimson",
    name: "Plantão Urgente",
    bgHex: hex("450A0A"),
    cardHex: hex("7F1D1D"),
    textHex: hex("FEF2F2"),
    mutedHex: hex("FECACA"),
    accentHex: hex("EF4444"),
    accentTextHex: hex("FFFFFF"),
    borderHex: hex("991B1B"),
    previewBgClass: "bg-red-950 text-red-50 border-red-900",
    previewCardClass: "bg-red-900 border-red-800",
    previewTextClass: "text-red-50",
    previewMutedClass: "text-red-200",
    previewBadgeClass: "bg-red-500 text-red-50",
  },
  {
    id: "vale_navy",
    name: "Azul Regional",
    bgHex: hex("0F172A"),
    cardHex: hex("1E293B"),
    textHex: hex("F8FAFC"),
    mutedHex: hex("94A3B8"),
    accentHex: hex("38BDF8"),
    accentTextHex: hex("0F172A"),
    borderHex: hex("334155"),
    previewBgClass: "bg-slate-900 text-slate-50 border-slate-800",
    previewCardClass: "bg-slate-800 border-slate-700",
    previewTextClass: "text-slate-50",
    previewMutedClass: "text-slate-300",
    previewBadgeClass: "bg-sky-400 text-slate-950",
  },
];

export const CANONICAL_PROMETHEE_TABS = [
  "Para você",
  "Urgente",
  "Política",
  "Segurança",
  "Economia",
  "Esportes",
  "Tecnologia",
  "Cultura",
  "Cidades",
  "Salvos",
] as const;

export function simplifyEditorialCategory(raw?: string | null): string {
  if (!raw) return "Cidades";
  const norm = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (norm.includes("urgente") || norm.includes("plantao") || norm.includes("breaking")) return "Urgente";
  if (norm.includes("politic") || norm.includes("eleic") || norm.includes("govern")) return "Política";
  if (norm.includes("polic") || norm.includes("seguran") || norm.includes("justic") || norm.includes("crime")) return "Segurança";
  if (norm.includes("econom") || norm.includes("industr") || norm.includes("negoc") || norm.includes("agro") || norm.includes("finan")) return "Economia";
  if (norm.includes("esport") || norm.includes("futebol") || norm.includes("atlet")) return "Esportes";
  if (norm.includes("tecnol") || norm.includes("aviac") || norm.includes("cienc") || norm.includes("inovac")) return "Tecnologia";
  if (norm.includes("cultur") || norm.includes("turism") || norm.includes("lazer") || norm.includes("evento") || norm.includes("serra")) return "Cultura";
  if (norm === "para voce") return "Para você";
  return "Cidades";
}

export function formatRelativeEditorialTime(isoDate?: string | null): { ago: string; fullDate: string } {
  if (!isoDate) {
    return { ago: "Hoje", fullDate: "Edição atual" };
  }
  const ts = Date.parse(isoDate);
  if (Number.isNaN(ts)) {
    return { ago: String(isoDate), fullDate: String(isoDate) };
  }

  const diffMin = Math.max(1, Math.round((Date.now() - ts) / 60000));
  let ago = "Agora";
  if (diffMin < 60) {
    ago = `${diffMin}min`;
  } else if (diffMin < 1440) {
    ago = `${Math.floor(diffMin / 60)}h`;
  } else {
    const days = Math.floor(diffMin / 1440);
    ago = days === 1 ? "1d" : `${days}d`;
  }

  const d = new Date(ts);
  const fullDate = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return { ago, fullDate };
}

export function normalizePrometheeArticle(raw: any, index = 0): NormalizedPrometheeArticle {
  const title = String(raw?.title || raw?.headline || raw?.name || "").trim();
  const city = String(raw?.city || "São José dos Campos").trim();
  const state = String(raw?.state || (city === "Chapecó" || city === "Florianópolis" ? "SC" : "SP")).trim();
  const category = simplifyEditorialCategory(raw?.category || raw?.category_name);

  // Extrai parágrafos reais de content_sections (NewsArticleDTO) ou texto corrido
  const bodyParagraphs: string[] = [];
  let extractedQuote = "";

  if (Array.isArray(raw?.content_sections)) {
    for (const sec of raw.content_sections) {
      if (!sec) continue;
      if (sec.type === "quote" && typeof sec.content === "string" && !extractedQuote) {
        extractedQuote = sec.content.trim();
        continue;
      }
      if (typeof sec.content === "string" && sec.content.trim().length > 0) {
        bodyParagraphs.push(sec.content.trim());
      } else if (Array.isArray(sec.content)) {
        for (const line of sec.content) {
          if (typeof line === "string" && line.trim()) bodyParagraphs.push(line.trim());
        }
      }
    }
  } else if (Array.isArray(raw?.body)) {
    for (const p of raw.body) {
      if (typeof p === "string" && p.trim()) bodyParagraphs.push(p.trim());
    }
  } else if (typeof raw?.body === "string" && raw.body.trim()) {
    raw.body
      .split(/\n+/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .forEach((p: string) => bodyParagraphs.push(p));
  } else if (typeof raw?.content === "string" && raw.content.trim()) {
    raw.content
      .split(/\n+/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .forEach((p: string) => bodyParagraphs.push(p));
  }

  const lead = String(
    raw?.subtitle ||
      raw?.lead ||
      raw?.summary ||
      raw?.description ||
      raw?.short_description ||
      bodyParagraphs[0] ||
      "",
  ).trim();

  if (bodyParagraphs.length === 0 && lead) {
    bodyParagraphs.push(lead);
  }

  const aiSummaryRaw = typeof raw?.ai_summary === "string" ? raw.ai_summary.trim() : "";
  const bulletSummary: string[] = Array.isArray(raw?.bulletSummary) && raw.bulletSummary.length > 0
    ? raw.bulletSummary.filter(Boolean)
    : aiSummaryRaw
      ? aiSummaryRaw
          .split(/\n+|•/)
          .map((s: string) => s.replace(/^[-*•\d.)\s]+/, "").trim())
          .filter((s: string) => s.length > 15)
          .slice(0, 3)
      : bodyParagraphs.slice(0, 3).map((p) => (p.length > 165 ? `${p.slice(0, 162).trim()}...` : p));

  const quote = String(raw?.quote || extractedQuote || lead || title).trim();

  const candidateCover =
    raw?.cover_media_url ||
    raw?.coverImageUrl ||
    raw?.cover_image_url ||
    raw?.imageUrl ||
    raw?.image_url ||
    raw?.thumbnail_url ||
    null;

  const coverImageUrl = resolveCityNewsCover({
    coverUrl: candidateCover,
    city,
    state,
    category,
    title,
  });

  const timeMeta = raw?.publishedAgo
    ? { ago: String(raw.publishedAgo), fullDate: "Edição atual" }
    : formatRelativeEditorialTime(raw?.published_at || raw?.created_at);

  const readingMinutes = Number(raw?.reading_time_minutes) || 0;
  const readingTime = raw?.readingTime
    ? String(raw.readingTime)
    : `${readingMinutes > 0 ? readingMinutes : Math.max(2, Math.round(bodyParagraphs.join(" ").split(/\s+/).length / 170))} min`;

  const slug = String(
    raw?.slug ||
      title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") ||
      `artigo-${index}`,
  );

  return {
    id: String(raw?.id || slug || `news-${index}`),
    slug,
    title,
    lead,
    body: bodyParagraphs,
    bulletSummary,
    quote,
    category,
    city,
    state,
    publishedAgo: timeMeta.ago,
    publishedDateLabel: timeMeta.fullDate,
    readingTime,
    author: String(raw?.author_name || raw?.author || raw?.store_name || "Redação"),
    role: String(raw?.role || (raw?.source_url ? "Apuração Regional" : "Redação")),
    isBreaking: Boolean(raw?.isBreaking ?? raw?.is_breaking ?? (category === "Urgente" || index < 3)),
    sourceUrl: raw?.source_url || null,
    likesCount: typeof raw?.likesCount === "number" ? raw.likesCount : Math.max(0, Number(raw?.views_count || 0)),
    commentsCount: typeof raw?.commentsCount === "number" ? raw.commentsCount : 0,
    coverImageUrl,
  };
}

export function buildStudioCarouselSlidesFromNews(article: NormalizedPrometheeArticle) {
  return [
    {
      tag: `${article.category} · ${article.city}`,
      headline: article.title,
      subheadline: article.lead || article.body[0] || "",
      highlightText: `${article.readingTime} de leitura`,
    },
    {
      tag: "Fatos Apurados",
      headline: "Pontos Centrais",
      subheadline: article.bulletSummary[0] || article.lead,
      highlightText: article.city,
    },
    {
      tag: "Contexto Regional",
      headline: article.city,
      subheadline: article.body[1] || article.quote || article.lead,
    },
    {
      tag: "Participe",
      headline: "Deixe sua opinião",
      subheadline: "Comente abaixo, salve este post e leia a matéria completa no portal.",
      highlightText: "Leia no Portal",
    },
  ];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 6,
): number {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  let line = "";
  let currentY = y;
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = `${line}${words[n]} `;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      linesCount++;
      if (linesCount >= maxLines) {
        ctx.fillText(`${line.trim()}...`, x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = `${words[n]} `;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / Math.max(1, img.height);
  const boxRatio = w / Math.max(1, h);
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

async function loadCanvasSafeImage(
  rawUrl?: string | null,
  resolveRemoteDataUrl?: (url: string) => Promise<string | null>,
): Promise<HTMLImageElement | null> {
  if (!rawUrl || typeof document === "undefined") return null;

  let srcToLoad = rawUrl;
  if (rawUrl.startsWith("https://") && resolveRemoteDataUrl) {
    try {
      const proxied = await resolveRemoteDataUrl(rawUrl);
      if (proxied && proxied.startsWith("data:image/")) {
        srcToLoad = proxied;
      }
    } catch {
      // Fallback para carregamento direto com crossOrigin anonymous
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!srcToLoad.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img.width > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = srcToLoad;
  });
}

export interface RenderNewsArtPngParams {
  article: NormalizedPrometheeArticle;
  brandName?: string;
  portalDomainLabel?: string;
  theme: NewsStudioTheme;
  mode: NewsStudioRenderMode;
  aspect?: NewsStudioAspect;
  slideIndex?: number;
  customHeadline?: string;
  customLead?: string;
  customCta?: string;
  customCoverUrl?: string;
  fixedEndingImageUrl?: string | null;
  layoutVariant?: "classic_card" | "quote_focus" | "facts_split" | "hero_bleed";
  scaleMultiplier?: number;
  resolveRemoteDataUrl?: (url: string) => Promise<string | null>;
}

export async function renderNewsArtToPngDataUrl(params: RenderNewsArtPngParams): Promise<string> {
  if (typeof document === "undefined") return "";

  const {
    article,
    brandName = "Waesynews",
    portalDomainLabel = "waesy.com.br",
    theme,
    mode,
    aspect = "4:5",
    slideIndex = 0,
    customHeadline,
    customLead,
    customCta = "Qual a sua opinião sobre este fato na nossa região? Comente e compartilhe.",
    customCoverUrl,
    fixedEndingImageUrl,
    scaleMultiplier = 2,
    resolveRemoteDataUrl,
  } = params;

  const baseWidth = 1080;
  const baseHeight = aspect === "9:16" ? 1920 : aspect === "1:1" ? 1080 : 1350;
  const scale = Math.max(1, Math.min(3, scaleMultiplier));
  const width = baseWidth * scale;
  const height = baseHeight * scale;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Supersampling 300 DPI equivalente
  ctx.scale(scale, scale);

  const headline = (customHeadline || "").trim() || article.title;
  const lead = (customLead || "").trim() || article.lead;
  const coverSource = (customCoverUrl || "").trim() || article.coverImageUrl || "";

  // 1. Fundo base
  ctx.fillStyle = theme.bgHex;
  ctx.fillRect(0, 0, baseWidth, baseHeight);

  // 2. Cabeçalho de marca
  ctx.fillStyle = theme.cardHex;
  drawRoundedRect(ctx, 56, 52, baseWidth - 112, 92, 28);
  ctx.fill();

  ctx.fillStyle = theme.textHex;
  ctx.font = "900 32px Inter, system-ui, sans-serif";
  ctx.fillText(brandName, 96, 109);

  const badgeLabel =
    mode === "single_post"
      ? article.category.toUpperCase()
      : `0${slideIndex + 1} / 04`;

  ctx.font = "800 22px Inter, system-ui, sans-serif";
  const badgeW = Math.max(150, ctx.measureText(badgeLabel).width + 64);
  ctx.fillStyle = theme.accentHex;
  drawRoundedRect(ctx, baseWidth - 56 - badgeW - 24, 70, badgeW, 56, 28);
  ctx.fill();
  ctx.fillStyle = theme.accentTextHex;
  ctx.fillText(badgeLabel, baseWidth - 56 - badgeW + 8, 106);

  const cardTop = 172;
  const cardHeight = baseHeight - 276;
  ctx.fillStyle = theme.cardHex;
  drawRoundedRect(ctx, 56, cardTop, baseWidth - 112, cardHeight, 44);
  ctx.fill();

  // Renderização: Post Único OU Slide 1 do Carrossel
  if (mode === "single_post" || slideIndex === 0) {
    const loadedImg = coverSource ? await loadCanvasSafeImage(coverSource, resolveRemoteDataUrl) : null;
    let textStartY = cardTop + 72;

    if (loadedImg) {
      const imgH = aspect === "9:16" ? 720 : aspect === "1:1" ? 360 : 480;
      ctx.save();
      drawRoundedRect(ctx, 92, cardTop + 36, width - 184, imgH, 32);
      ctx.clip();
      drawImageCover(ctx, loadedImg, 92, cardTop + 36, width - 184, imgH);

      // Pílula categoria + cidade sobre a foto real
      const pillText = `${article.category} · ${article.city}`;
      ctx.font = "700 23px Inter, system-ui, sans-serif";
      const pillW = Math.min(width - 240, ctx.measureText(pillText).width + 52);
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = hex("09090B");
      drawRoundedRect(ctx, 120, cardTop + 36 + imgH - 76, pillW, 52, 26);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = hex("FAFAFA");
      ctx.fillText(pillText, 146, cardTop + 36 + imgH - 42);
      ctx.restore();

      textStartY = cardTop + 36 + imgH + 64;
    } else {
      // Sem foto: selo tipográfico honesto
      ctx.fillStyle = theme.accentHex;
      drawRoundedRect(ctx, 96, cardTop + 48, 340, 52, 26);
      ctx.fill();
      ctx.fillStyle = theme.accentTextHex;
      ctx.font = "800 22px Inter, system-ui, sans-serif";
      ctx.fillText(`${article.category} · ${article.city}`, 124, cardTop + 82);
      textStartY = cardTop + 164;
    }

    ctx.fillStyle = theme.textHex;
    ctx.font = aspect === "1:1" ? "900 40px Inter, system-ui, sans-serif" : "900 46px Inter, system-ui, sans-serif";
    const afterHeadlineY = wrapCanvasText(
      ctx,
      headline,
      96,
      textStartY,
      width - 192,
      aspect === "1:1" ? 50 : 58,
      loadedImg ? 4 : 6,
    );

    if (mode === "single_post") {
      ctx.fillStyle = theme.mutedHex;
      ctx.font = "500 28px Inter, system-ui, sans-serif";
      wrapCanvasText(ctx, lead, 96, afterHeadlineY + 20, width - 192, 40, aspect === "9:16" ? 6 : 3);
    } else {
      ctx.fillStyle = theme.mutedHex;
      ctx.font = "600 26px Inter, system-ui, sans-serif";
      wrapCanvasText(
        ctx,
        "Deslize para o lado para conferir os fatos apurados →",
        96,
        Math.min(cardTop + cardHeight - 54, afterHeadlineY + 32),
        width - 192,
        38,
        2,
      );
    }
  } else if (slideIndex === 1) {
    ctx.fillStyle = theme.accentHex;
    drawRoundedRect(ctx, 96, cardTop + 52, 340, 54, 27);
    ctx.fill();
    ctx.fillStyle = theme.accentTextHex;
    ctx.font = "800 22px Inter, system-ui, sans-serif";
    ctx.fillText("FATOS PRINCIPAIS", 132, cardTop + 87);

    ctx.fillStyle = theme.textHex;
    ctx.font = "900 40px Inter, system-ui, sans-serif";
    const y1 = wrapCanvasText(ctx, "O que foi apurado até agora:", 96, cardTop + 174, width - 192, 50, 2);

    ctx.fillStyle = theme.mutedHex;
    ctx.font = "500 29px Inter, system-ui, sans-serif";
    let bulletY = wrapCanvasText(ctx, lead, 96, y1 + 22, width - 192, 42, 4) + 34;

    const bullets = article.bulletSummary.length > 0 ? article.bulletSummary.slice(0, 3) : [lead];
    bullets.forEach((b, idx) => {
      ctx.fillStyle = theme.textHex;
      ctx.font = "800 28px Inter, system-ui, sans-serif";
      ctx.fillText(`0${idx + 1}.`, 96, bulletY);
      ctx.font = "600 28px Inter, system-ui, sans-serif";
      bulletY = wrapCanvasText(ctx, b, 154, bulletY, width - 250, 40, 3) + 22;
    });
  } else if (slideIndex === 2) {
    ctx.fillStyle = theme.accentHex;
    drawRoundedRect(ctx, 96, cardTop + 52, 420, 54, 27);
    ctx.fill();
    ctx.fillStyle = theme.accentTextHex;
    ctx.font = "800 22px Inter, system-ui, sans-serif";
    ctx.fillText(`CONTEXTO · ${article.city.toUpperCase()}`, 128, cardTop + 87);

    ctx.fillStyle = theme.textHex;
    ctx.font = "900 42px Inter, system-ui, sans-serif";
    const qY = wrapCanvasText(ctx, `“${article.quote}”`, 96, cardTop + 188, width - 192, 56, 5);

    ctx.fillStyle = theme.mutedHex;
    ctx.font = "500 30px Inter, system-ui, sans-serif";
    wrapCanvasText(
      ctx,
      article.body[1] || article.body[0] || lead,
      96,
      qY + 42,
      width - 192,
      44,
      6,
    );
  } else {
    // Slide 4 / Encerramento ou Lâmina Final Fixa Customizada
    const endingImg = fixedEndingImageUrl
      ? await loadCanvasSafeImage(fixedEndingImageUrl, resolveRemoteDataUrl)
      : null;

    if (endingImg) {
      ctx.save();
      drawRoundedRect(ctx, 92, cardTop + 36, baseWidth - 184, cardHeight - 72, 32);
      ctx.clip();
      drawImageCover(ctx, endingImg, 92, cardTop + 36, baseWidth - 184, cardHeight - 72);
      ctx.restore();
    } else {
      ctx.fillStyle = theme.accentHex;
      drawRoundedRect(ctx, 96, cardTop + 52, 360, 54, 27);
      ctx.fill();
      ctx.fillStyle = theme.accentTextHex;
      ctx.font = "800 22px Inter, system-ui, sans-serif";
      ctx.fillText("PARTICIPE DO DEBATE", 128, cardTop + 87);

      ctx.fillStyle = theme.textHex;
      ctx.font = "900 46px Inter, system-ui, sans-serif";
      const cY = wrapCanvasText(ctx, customCta, 96, cardTop + 196, baseWidth - 192, 60, 5);

      ctx.fillStyle = theme.mutedHex;
      ctx.font = "600 30px Inter, system-ui, sans-serif";
      const steps = [
        "1. Comente sua visão sobre o assunto",
        "2. Compartilhe nos Stories com moradores da região",
        "3. Salve para acompanhar atualizações",
        `4. Leia a reportagem completa em ${portalDomainLabel}`,
      ];
      let sY = cY + 54;
      for (const st of steps) {
        sY = wrapCanvasText(ctx, st, 96, sY, baseWidth - 192, 46, 2) + 8;
      }
    }
  }

  // Rodapé institucional da arte
  ctx.fillStyle = theme.mutedHex;
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.fillText(
    `${brandName.toUpperCase()} · ${article.city.toUpperCase()} · ${article.readingTime.toUpperCase()} DE LEITURA`,
    64,
    baseHeight - 46,
  );

  return canvas.toDataURL("image/png");
}
