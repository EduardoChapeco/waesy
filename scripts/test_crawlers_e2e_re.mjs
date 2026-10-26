import assert from "node:assert";

console.log("======================================================================");
console.log("SUÍTE DE TESTES DETERMINÍSTICOS — CRAWLERS & ENGENHARIA REVERSA (REA)");
console.log("======================================================================\n");

// 1. Content Pruning (Crawl4AI / Scrapling)
function pruneHtmlBoilerplate(html) {
  if (!html) return "";
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, " ")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, " ")
    .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, " ")
    .replace(/<(?:div|section|aside)[^>]*class=["'][^"']*(?:cookie|consent|banner|breadcrumbs|navbar|sidebar|footer|share-bar|ads-container|anuncio)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section|aside)>/gi, " ");
}

const dirtyHtml = `
  <html>
    <body>
      <nav><a href="/home">Home</a></nav>
      <div class="cookie-consent">Aviso de Cookies</div>
      <main>
        <h1>Manchete Real: Polo Industrial de Chapecó Cresce 12%</h1>
        <p>Dados divulgados pela Secretaria de Desenvolvimento Econômico apontam expansão no setor alimentício e de tecnologia.</p>
      </main>
      <div class="ads-container">Banner Publicitário</div>
      <footer>Rodapé com direitos reservados</footer>
    </body>
  </html>
`;

const pruned = pruneHtmlBoilerplate(dirtyHtml);
assert(!pruned.includes("Home"), "Navbar deve ser eliminada");
assert(!pruned.includes("Aviso de Cookies"), "Aviso de cookies deve ser podado");
assert(!pruned.includes("Banner Publicitário"), "Anúncios devem ser podados");
assert(pruned.includes("Polo Industrial de Chapecó"), "Conteúdo editorial principal deve ser preservado");
console.log("✔ [REA-01] Poda Mecânica de Boilerplate (Crawl4AI Content Pruning): APROVADO");

// 2. PT-BR Event Date & Price Parser (Scrapling - Zero Mocks)
const PT_MONTHS = {
  janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3, maio: 4,
  junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
};

function parsePtBrEventDateTime(text) {
  let isFree = undefined;
  let priceMinCents = undefined;
  let priceMaxCents = undefined;
  let venueName = undefined;

  if (/\b(?:gratuito|gr[áa]tis|entrada franca|acesso livre|0800)\b/i.test(text)) {
    isFree = true;
    priceMinCents = 0;
  } else {
    const priceMatches = Array.from(text.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+)/gi));
    if (priceMatches.length > 0) {
      const parsedValues = priceMatches
        .map((m) => {
          const num = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
          return isNaN(num) ? 0 : Math.round(num * 100);
        })
        .filter((v) => v >= 500 && v <= 500000);
      if (parsedValues.length > 0) {
        priceMinCents = Math.min(...parsedValues);
        priceMaxCents = Math.max(...parsedValues);
        isFree = priceMinCents === 0;
      }
    }
  }

  const venueMatch = text.match(/(?:Local|Onde|Espaço|Teatro|Pavilhão|Centro de Eventos|Arena)[:\s]+([^\n.,<]{5,80})/i);
  if (venueMatch && venueMatch[1]) {
    venueName = venueMatch[1].trim();
  }

  const currentYear = new Date().getFullYear();
  let foundDate = null;
  const monthRegex = /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?\b/i;
  const matchA = text.match(monthRegex);
  if (matchA) {
    const day = parseInt(matchA[1], 10);
    const month = PT_MONTHS[matchA[2].toLowerCase()];
    const year = matchA[3] ? parseInt(matchA[3], 10) : currentYear;
    if (day >= 1 && day <= 31 && month !== undefined) {
      foundDate = new Date(year, month, day);
    }
  }

  if (foundDate) {
    const timeRegex = /(?:às|as|ás)?\s*(\d{1,2})h(?:(\d{2}))?|\b(\d{1,2}):(\d{2})\b/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1] || timeMatch[3], 10);
      const minutes = parseInt(timeMatch[2] || timeMatch[4] || "0", 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        foundDate.setHours(hours, minutes, 0, 0);
      }
    } else {
      foundDate.setHours(19, 0, 0, 0);
    }
  }

  return {
    startDate: foundDate ? foundDate.toISOString() : undefined,
    isFree,
    priceMinCents,
    priceMaxCents,
    venueName,
  };
}

const eventSample = "Show de Abertura: 20 de dezembro de 2026 às 21h no Centro de Eventos Plínio Arlindo de Nes. Ingressos a R$ 40,00.";
const parsedEvent = parsePtBrEventDateTime(eventSample);
assert(parsedEvent.startDate != null, "Data do evento deve ser extraída com precisão");
const dt = new Date(parsedEvent.startDate);
assert.strictEqual(dt.getDate(), 20, "Dia deve ser 20");
assert.strictEqual(dt.getMonth(), 11, "Mês deve ser Dezembro (11)");
assert.strictEqual(dt.getFullYear(), 2026, "Ano deve ser 2026");
assert.strictEqual(dt.getHours(), 21, "Hora deve ser 21");
assert.strictEqual(parsedEvent.priceMinCents, 4000, "Valor deve ser R$ 40,00 (4000 centavos)");
console.log("✔ [REA-02] Extrator Determinístico PT-BR de Eventos (Scrapling / Zero Mocks): APROVADO");

// 3. Rejeição Honesta de Evento sem Data (Zero Mocks)
const emptyEvent = parsePtBrEventDateTime("Apenas uma menção de feira futura sem qualquer data definida.");
assert.strictEqual(emptyEvent.startDate, undefined, "Sem data real, startDate deve ser undefined");
console.log("✔ [REA-03] Rejeição Honesta de Eventos Sem Data (Prevenção de Fake Dates): APROVADO");

// 4. Catálogo de Vagas e Desempacotamento de Links (Crawlee / Scrapy pattern)
function extractJobLinks(html, baseUrl) {
  const regexes = [
    /href=["'](\/vagas\/v\d+\/[^"'\s?#]+)["']/gi,
    /href=["'](\/vagas-emprego\/[^"'\s]+)["']/gi,
    /href=["'](\/(?:vaga|emprego|oportunidade)\/[a-zA-Z0-9_-]{4,}[^"'\s]*)["']/gi,
  ];
  const links = new Set();
  for (const regex of regexes) {
    const matches = html.matchAll(regex);
    for (const match of matches) {
      try {
        const resolved = new URL(match[1], baseUrl).toString();
        links.add(resolved);
      } catch {}
    }
  }
  return Array.from(links);
}

const jobPortalHtml = `
  <div class="job-list">
    <a href="/vaga/analista-de-dados-chapeco">Analista de Dados</a>
    <a href="/vaga/assistente-fiscal-sc">Assistente Fiscal</a>
    <a href="/vagas-emprego/auxiliar-de-logistica">Auxiliar de Logística</a>
  </div>
`;
const extractedJobs = extractJobLinks(jobPortalHtml, "https://balcaodeempregos.chapeco.sc.gov.br");
assert.strictEqual(extractedJobs.length, 3, "Deve extrair exatamente 3 links de vagas individuais");
assert(extractedJobs.every((l) => l.startsWith("https://balcaodeempregos.chapeco.sc.gov.br")), "Links devem ser canônicos");
console.log("✔ [REA-04] Desempacotamento de Catálogos de Vagas (Crawlee Enqueue Pattern): APROVADO");

// 5. RSS Safe Date Parsing (Defensive Parsing against Invalid Time Value)
function safeParseRssDate(rawDate) {
  if (!rawDate) return undefined;
  try {
    const parsed = new Date(rawDate.trim());
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  } catch {
    return undefined;
  }
}

assert.strictEqual(safeParseRssDate("Sat, 24 Oct 2026 15:30:00 GMT"), "2026-10-24T15:30:00.000Z", "RFC 822 válido");
assert.strictEqual(safeParseRssDate("Data_Invalida_Nao_Padrao"), undefined, "Data inválida não deve lançar RangeError");
console.log("✔ [REA-05] Parsing Defensivo de Datas em RSS (Zero Crash): APROVADO");

// 6. Purificação de Parágrafos Editoriais (Newspaper4k / Trafilatura)
function sanitizeParagraphs(paragraphs) {
  const rejected = [
    "whatsapp", "telegram", "compartilhe", "newsletter", "cookies",
    "publicidade", "anúncio", "todos os direitos reservados"
  ];
  return paragraphs.filter((p) => {
    const lower = p.toLowerCase().trim();
    if (lower.length < 25) return false;
    for (const sub of rejected) {
      if (lower.includes(sub)) return false;
    }
    return true;
  });
}

const rawParas = [
  "O governador do estado sancionou o novo plano de incentivo fiscal à indústria regional.",
  "Receba nossas notícias no WhatsApp e compartilhe com amigos.",
  "Publicidade: Conheça os melhores planos de consórcio da região.",
  "O projeto prevê investimentos superiores a R$ 120 milhões na duplicação de rodovias do Oeste."
];
const filteredParas = sanitizeParagraphs(rawParas);
assert.strictEqual(filteredParas.length, 2, "Apenas parágrafos jornalísticos devem passar");
assert(!filteredParas[0].includes("WhatsApp"), "Spam deve ser removido");
console.log("✔ [REA-06] Purificação Editorial de Parágrafos (Newspaper4k / Trafilatura): APROVADO");

// 7. Bloqueio de Links de Afiliados e Reviews Comerciais (Anti-Spam Editorial)
const COMMERCIAL_AFFILIATE_PATTERNS = [
  /\b(em promoç[ãa]o na amazon|ofertas? na amazon|comprar na amazon|seleç[ãa]o na amazon)\b/i,
  /\b(em promoç[ãa]o no mercado livre|ofertas? no mercado livre)\b/i,
  /\b(cupom de desconto|cupons de desconto|compre com desconto)\b/i,
  /\/(?:reviews|publieditorial|afiliados|guia-de-compras|compras)\//i,
];
function isCommercialAffiliateContent(title, url) {
  if (COMMERCIAL_AFFILIATE_PATTERNS.some((p) => p.test(title))) return true;
  if (url && COMMERCIAL_AFFILIATE_PATTERNS.some((p) => p.test(url))) return true;
  return false;
}
assert.strictEqual(
  isCommercialAffiliateContent(
    "Hora de colocar um smartwatch no pulso: veja opções em promoção na Amazon",
    "https://olhardigital.com.br/2026/10/16/reviews/smartwatch-promocao/"
  ),
  true,
  "Artigos de afiliados e /reviews/ devem ser bloqueados"
);
assert.strictEqual(
  isCommercialAffiliateContent(
    "Setor agroindustrial de Chapecó amplia exportações em 14%",
    "https://portal.com.br/economia/agroindustria-chapeco"
  ),
  false,
  "Notícias jornalísticas legítimas devem ser aprovadas"
);
console.log("✔ [REA-07] Bloqueio Precoce de Reviews de Afiliados e Spam Comercial: APROVADO");

// 8. Validação e Normalização Estrita de Telefones ANATEL E.164 (Anti-Timestamp / URL Decode)
const VALID_BR_DDDS = new Set([
  "11","12","13","14","15","16","17","18","19","21","22","24","27","28",
  "31","32","33","34","35","37","38","41","42","43","44","45","46","47","48","49",
  "51","53","54","55","61","62","63","64","65","66","67","68","69",
  "71","73","74","75","77","79","81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99"
]);
function normalizeAndValidateBrPhone(raw) {
  if (!raw || typeof raw !== "string") return null;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { decoded = raw.replace(/%20/g, " "); }
  let digits = decoded.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return null;
  if (/^20[12]\d/.test(digits)) return null;
  if (/^1[678]\d{8,9}$/.test(digits) && !decoded.includes("(") && !decoded.includes("-")) return null;
  const ddd = digits.slice(0, 2);
  if (!VALID_BR_DDDS.has(ddd)) return null;
  const sub = digits.slice(2);
  if (sub.length === 8) return ["2","3","4","5"].includes(sub[0]) ? `(${ddd}) ${sub.slice(0, 4)}-${sub.slice(4)}` : null;
  if (sub.length === 9) return sub[0] === "9" && sub[1] !== "0" ? `(${ddd}) ${sub.slice(0, 5)}-${sub.slice(5)}` : null;
  return null;
}
assert.strictEqual(normalizeAndValidateBrPhone("2026091812"), null, "Timestamp de data deve ser rejeitado");
assert.strictEqual(normalizeAndValidateBrPhone("17921943044"), null, "Epoch timestamp sem formatação deve ser rejeitado");
assert.strictEqual(normalizeAndValidateBrPhone("55%2049%2099179-4654"), "(49) 99179-4654", "URL-encoded %20 deve ser decodificado antes de extrair dígitos");
assert.strictEqual(normalizeAndValidateBrPhone("(49) 3319-2000"), "(49) 3319-2000", "Telefone fixo válido deve ser formatado");
console.log("✔ [REA-08] Validação Estrita de Telefones ANATEL (Anti-Timestamp & URL-Decode): APROVADO");

console.log("\n======================================================================");
console.log("TODOS OS 8 TESTES DE ENGENHARIA REVERSA APROVADOS COM 100% DE SUCESSO");
console.log("======================================================================");
