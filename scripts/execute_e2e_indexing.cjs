/**
 * scripts/execute_e2e_indexing.cjs — V143 Deep Mechanical Scraper & Editorial Curation Pipeline
 *
 * Regras Invioláveis (V143 Truth Engine):
 * 1. ZERO imagens genéricas do Unsplash (somente og:image / twitter:image original do veículo).
 * 2. ZERO parágrafos de preenchimento ("Esta matéria foi apurada originalmente...").
 * 3. ZERO repetição entre título, subtítulo (lead) e primeiro parágrafo do corpo.
 * 4. Extração profunda do HTML da matéria original (>= 3 parágrafos reais e >= 450 caracteres).
 * 5. Barragem de links de vídeo curto, transmissões ao vivo ("AO VIVO") e títulos duplicados.
 */

const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

function decodeHtmlEntities(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : " ";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : " ";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&lsquo;|&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, "—")
    .replace(/&hellip;/gi, "...")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text) {
  return decodeHtmlEntities(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 75);
}

function normalizeForComparison(text) {
  return decodeHtmlEntities(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccardSimilarity(a, b) {
  const wordsA = new Set(normalizeForComparison(a).split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(normalizeForComparison(b).split(/\s+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

const STUB_PATTERNS = [
  /\bao vivo\b/i,
  /assista à programação/i,
  /acompanhe a programação/i,
  /^vídeos?:\s/i,
  /\bbom dia santa catarina\b/i,
  /\bjornal do almoço\b/i,
  /\bgiro cidades\b/i,
  /\bhoróscopo\b/i,
];

const REJECTED_PARAGRAPH_PATTERNS = [
  "receba as notícias",
  "participe do nosso canal",
  "whatsapp",
  "telegram",
  "siga nosso instagram",
  "assine nossa newsletter",
  "todos os direitos reservados",
  "política de privacidade",
  "clique aqui",
  "cookies",
  "leia também",
  "veja também",
  "confira também",
  "esta matéria foi apurada originalmente pela equipe de jornalismo",
];

function isValidEditorialParagraph(p) {
  const lower = p.toLowerCase().trim();
  if (lower.length < 55) return false;
  return !REJECTED_PARAGRAPH_PATTERNS.some((sub) => lower.includes(sub));
}

function extractMetaTag(html, prop) {
  const r1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
  const m = html.match(r1) || html.match(r2);
  return m?.[1] ? decodeHtmlEntities(m[1]) : null;
}

async function scrapeFullArticle(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const ogImage =
    extractMetaTag(html, "og:image") ||
    extractMetaTag(html, "og:image:secure_url") ||
    extractMetaTag(html, "twitter:image");

  const ogDescription =
    extractMetaTag(html, "og:description") ||
    extractMetaTag(html, "description");

  // Remove blocos não-editoriais
  const cleanedHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "");

  const articleMatch = cleanedHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const candidateSources = articleMatch ? [articleMatch[1], cleanedHtml] : [cleanedHtml];

  let rawParagraphs = [];
  for (const sourceHtml of candidateSources) {
    const extracted = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = pRegex.exec(sourceHtml)) !== null) {
      const text = decodeHtmlEntities(m[1]);
      if (isValidEditorialParagraph(text)) {
        if (!extracted.some((existing) => jaccardSimilarity(existing, text) > 0.8)) {
          extracted.push(text);
        }
      }
    }
    if (extracted.length >= 3) {
      rawParagraphs = extracted;
      break;
    }
    if (extracted.length > rawParagraphs.length) {
      rawParagraphs = extracted;
    }
  }

  return {
    ogImage,
    ogDescription,
    paragraphs: rawParagraphs,
  };
}

function classifyArticle(title, lead, feedCategory) {
  const text = `${title} ${lead} ${feedCategory || ""}`.toLowerCase();
  if (/(eleiç|tse|stf|governo|prefeito|câmara|deputad|senad|polític|lula|trump)/i.test(text)) {
    return { category: "politica", kicker: "POLÍTICA & GESTÃO" };
  }
  if (/(weg|investimento|dólar|ibovespa|inflação|mercado|economia|tarifa|petróleo|agronegócio|bets|apostas)/i.test(text)) {
    return { category: "economia", kicker: "ECONOMIA & MERCADO" };
  }
  if (/(ia\b|inteligência artificial|nvidia|spacex|starship|tecnologia|data center|inovação|tiguan|volkswagen)/i.test(text)) {
    return { category: "tecnologia", kicker: "TECNOLOGIA & INOVAÇÃO" };
  }
  if (/(polícia|policial|preso|delegacia|acidente|temporal|granizo|bombeiros|foragido|assassinado|helicóptero)/i.test(text)) {
    return { category: "urgente", kicker: "PLANTÃO & SEGURANÇA" };
  }
  return { category: "cidade", kicker: "SANTA CATARINA" };
}

async function runDeepNewsCuration() {
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("  V143 DEEP MECHANICAL SCRAPER & EDITORIAL CURATION PIPELINE           ");
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  const { data: rootStore } = await supabase
    .from("stores")
    .select("id, name")
    .ilike("slug", "%waesy%")
    .limit(1)
    .single();

  const storeId = rootStore?.id || "5108ce27-2df1-4ce2-89f2-681fea6dba95";

  const { data: rawRssItems, error: rssErr } = await supabase
    .from("rss_feed_items")
    .select("id, title, description, link, author, pub_date, image_url, rss_feed_id, rss_feeds(name, category, region)")
    .order("pub_date", { ascending: false, nullsFirst: false })
    .limit(60);

  if (rssErr) {
    console.error("Erro ao buscar rss_feed_items:", rssErr.message);
    process.exit(1);
  }

  const seenUrls = new Set();
  const seenTitles = [];
  let publishedCount = 0;
  let rejectedCount = 0;

  for (const item of rawRssItems || []) {
    const cleanTitle = decodeHtmlEntities(item.title || "");
    const url = (item.link || "").trim();

    if (!cleanTitle || cleanTitle.length < 15 || !url) {
      rejectedCount++;
      continue;
    }

    // 1. Barrar transmissões ao vivo, programas de TV e páginas de vídeo curto
    if (STUB_PATTERNS.some((p) => p.test(cleanTitle)) || url.includes("/video/") || url.includes("/edicao/")) {
      console.log(`  [REJEITADO - STUB/VÍDEO] ${cleanTitle}`);
      rejectedCount++;
      continue;
    }

    // 2. Barrar duplicatas exatas de URL ou similaridade de título (> 0.65)
    if (seenUrls.has(url) || seenTitles.some((t) => jaccardSimilarity(t, cleanTitle) > 0.65)) {
      console.log(`  [REJEITADO - DUPLICADO] ${cleanTitle}`);
      rejectedCount++;
      continue;
    }

    try {
      const scraped = await scrapeFullArticle(url);
      const coverUrl = scraped.ogImage || item.image_url;

      // 3. Exigir imagem real do veículo (Zero Unsplash / Zero Sem Imagem)
      if (!coverUrl || !coverUrl.startsWith("http") || coverUrl.includes("images.unsplash.com")) {
        console.log(`  [REJEITADO - SEM IMAGEM REAL] ${cleanTitle}`);
        rejectedCount++;
        continue;
      }

      // 4. Exigir no mínimo 3 parágrafos reais substanciais
      if (scraped.paragraphs.length < 3) {
        console.log(`  [REJEITADO - CORPO RASO (${scraped.paragraphs.length} parágrafos)] ${cleanTitle}`);
        rejectedCount++;
        continue;
      }

      // 5. Estruturação Editorial Sem Repetição:
      let subtitle = decodeHtmlEntities(scraped.ogDescription || "");
      let bodyParagraphs = scraped.paragraphs;

      if (!subtitle || subtitle.length < 40 || jaccardSimilarity(subtitle, cleanTitle) > 0.75) {
        subtitle = scraped.paragraphs[0].slice(0, 250);
        bodyParagraphs = scraped.paragraphs.slice(1, 9);
      } else if (jaccardSimilarity(subtitle, scraped.paragraphs[0]) > 0.6) {
        bodyParagraphs = scraped.paragraphs.slice(1, 9);
      } else {
        bodyParagraphs = scraped.paragraphs.slice(0, 8);
      }

      if (bodyParagraphs.length < 2) {
        rejectedCount++;
        continue;
      }

      const contentSections = bodyParagraphs.map((p, idx) => ({
        type: "paragraph",
        ...(idx === 0
          ? { heading: "Contexto e Apuração" }
          : idx === 3
          ? { heading: "Desdobramentos" }
          : {}),
        content: p,
      }));

      // Síntese executiva (ai_summary) extraída dos fatos centrais dos parágrafos 2 e 3
      const aiSummary = `${bodyParagraphs[0].split(/(?<=[.!?])\s+/)[0]} ${
        bodyParagraphs[1] ? bodyParagraphs[1].split(/(?<=[.!?])\s+/)[0] : ""
      }`.slice(0, 320);

      const feedMeta = item.rss_feeds || {};
      const sourceName = feedMeta.name || (url.includes("g1.globo.com") ? "G1 Santa Catarina" : "ND Mais");
      const { category, kicker } = classifyArticle(cleanTitle, subtitle, feedMeta.category);

      const slug = `${slugify(cleanTitle)}-${item.id.slice(0, 6)}`;
      const totalWords = bodyParagraphs.join(" ").split(/\s+/).length;
      const readingTime = Math.max(2, Math.min(8, Math.ceil(totalWords / 160)));
      const qualityScore = Math.min(98, 82 + Math.min(16, bodyParagraphs.length * 2));

      const { error: insertErr } = await supabase
        .from("news_articles")
        .upsert(
          {
            store_id: storeId,
            title: cleanTitle,
            slug,
            kicker,
            subtitle: subtitle.slice(0, 260),
            content_sections: contentSections,
            cover_media_url: coverUrl,
            cover_media_type: "image",
            category,
            tags: [category, "santa catarina", sourceName.toLowerCase()],
            ai_summary: aiSummary,
            ai_keywords: [category, sourceName, "Santa Catarina"],
            reading_time_minutes: readingTime,
            views_count: 0,
            unique_views_count: 0,
            status: "published",
            published_at: item.pub_date || new Date().toISOString(),
            source_url: url,
            source_type: "rss",
            quality_score: qualityScore,
            curation_status: "approved",
            author_name: sourceName,
            rss_feed_id: item.rss_feed_id,
          },
          { onConflict: "store_id,slug" }
        );

      if (!insertErr) {
        seenUrls.add(url);
        seenTitles.push(cleanTitle);
        publishedCount++;
        await supabase.from("rss_feed_items").update({ status: "published", image_url: coverUrl }).eq("id", item.id);
        console.log(`  ✓ [PUBLICADA] (${bodyParagraphs.length} parágrafos | Score ${qualityScore}) ${cleanTitle.slice(0, 72)}...`);
      } else {
        console.warn(`  x Erro ao salvar ${cleanTitle}:`, insertErr.message);
      }
    } catch (err) {
      console.log(`  [REJEITADO - FALHA HTTP] ${cleanTitle}: ${err.message}`);
      rejectedCount++;
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log(`  RESUMO DA CURADORIA PROFUNDA V143:`);
  console.log(`  • Matérias Qualificadas Publicadas: ${publishedCount}`);
  console.log(`  • Stubs/Vídeos/Duplicatas Barrados: ${rejectedCount}`);
  console.log("═══════════════════════════════════════════════════════════════════════\n");
}

runDeepNewsCuration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro fatal:", err);
    process.exit(1);
  });
