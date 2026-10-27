/**
 * contact-extractor.ts — Extração pura de contatos a partir de HTML/Markdown/links.
 * Sem I/O: recebe conteúdo já raspado (Firecrawl / Steel / fetch) e devolve contatos validados.
 */

export interface ExtractedContacts {
  emails: string[];
  phones: string[];
  whatsapp?: string;
  socials: Partial<Record<"instagram" | "facebook" | "linkedin" | "youtube" | "tiktok", string>>;
}

export interface ContactSource {
  html?: string;
  markdown?: string;
  links?: string[];
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const JUNK_EMAIL_DOMAINS = ["example.com", "sentry.io", "wixpress.com", "sentry-next.wixpress.com", "domain.com", "email.com", "seudominio.com.br"];
const JUNK_EMAIL_SUFFIX = /\.(png|jpe?g|gif|svg|webp|css|js)$/i;
const BR_PHONE_RE = /(?:\+?55\s?)?\(?\b([1-9]{2})\)?\s?(9?\d{4})[-\s]?(\d{4})\b/g;

const SOCIAL_HOSTS: Array<[keyof ExtractedContacts["socials"], RegExp]> = [
  ["instagram", /^(?:www\.)?instagram\.com$/i],
  ["facebook", /^(?:www\.|m\.|pt-br\.)?facebook\.com$/i],
  ["linkedin", /^(?:www\.|br\.)?linkedin\.com$/i],
  ["youtube", /^(?:www\.|m\.)?youtube\.com$/i],
  ["tiktok", /^(?:www\.)?tiktok\.com$/i],
];
const SOCIAL_BLOCKED_PATHS = /^\/(?:p|reel|reels|explore|sharer|share|tr|plugins|dialog|login|watch|embed|hashtag)(?:\/|$)/i;

export function deobfuscate(text: string): string {
  return text
    .replace(/\s*\[\s*(?:at|arroba)\s*\]\s*|\s*\(\s*(?:at|arroba)\s*\)\s*/gi, "@")
    .replace(/\s*\[\s*(?:dot|ponto)\s*\]\s*|\s*\(\s*(?:dot|ponto)\s*\)\s*/gi, ".")
    .replace(/&#64;|&commat;/gi, "@");
}

export function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (JUNK_EMAIL_SUFFIX.test(lower)) return false;
  const domain = lower.split("@")[1] || "";
  if (JUNK_EMAIL_DOMAINS.includes(domain)) return false;
  if (lower.startsWith("u003e") || lower.length > 80) return false;
  return true;
}

export function extractEmails(text: string): string[] {
  const found = new Set<string>();
  for (const match of deobfuscate(text).match(EMAIL_RE) || []) {
    const email = match.toLowerCase();
    if (isValidEmail(email)) found.add(email);
  }
  return [...found];
}

export function extractBrazilianPhones(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(BR_PHONE_RE)) {
    const digits = `${m[1]}${m[2]}${m[3]}`;
    if (digits.length === 10 || digits.length === 11) found.add(digits);
  }
  return [...found];
}

export function extractWhatsapp(links: string[], text: string): string | undefined {
  for (const link of [...links, ...(text.match(/https?:\/\/[^\s"'<>)]+/g) || [])]) {
    try {
      const url = new URL(link);
      const host = url.hostname.replace(/^www\./, "");
      let digits = "";
      if (host === "wa.me") digits = url.pathname.replace(/\D/g, "");
      else if (host === "api.whatsapp.com" || host === "web.whatsapp.com") digits = (url.searchParams.get("phone") || "").replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 13) return digits;
    } catch {
      /* link malformado: ignora */
    }
  }
  return undefined;
}

export function extractSocials(links: string[]): ExtractedContacts["socials"] {
  const socials: ExtractedContacts["socials"] = {};
  for (const link of links) {
    try {
      const url = new URL(link);
      for (const [network, hostRe] of SOCIAL_HOSTS) {
        if (socials[network] || !hostRe.test(url.hostname)) continue;
        if (url.pathname.length <= 1 || SOCIAL_BLOCKED_PATHS.test(url.pathname)) continue;
        socials[network] = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
      }
    } catch {
      /* link malformado: ignora */
    }
  }
  return socials;
}

export function extractContacts(source: ContactSource): ExtractedContacts {
  const html = source.html || "";
  const markdown = source.markdown || "";
  const links = [...(source.links || [])];
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) links.push(m[1]);
  const mailtos = links.filter((l) => l.toLowerCase().startsWith("mailto:")).map((l) => decodeURIComponent(l.slice(7).split("?")[0]));
  const text = `${markdown}\n${html}\n${mailtos.join("\n")}`;

  const emails = extractEmails(text);
  // mailto explícito tem prioridade sobre e-mails soltos no texto
  const prioritized = [...mailtos.map((e) => e.toLowerCase()).filter(isValidEmail), ...emails];
  return {
    emails: [...new Set(prioritized)].slice(0, 5),
    phones: extractBrazilianPhones(markdown || html.replace(/<[^>]+>/g, " ")).slice(0, 5),
    whatsapp: extractWhatsapp(links, text),
    socials: extractSocials(links),
  };
}

/** Bloqueia SSRF: só http(s) público, sem localhost, IP privado ou host interno. */
export function isPublicHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) return false;
    if (/^(?:127|10)\./.test(host) || /^192\.168\./.test(host) || /^172\.(?:1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host) || /^0\./.test(host)) return false;
    if (host.startsWith("[")) return false;
    return true;
  } catch {
    return false;
  }
}
