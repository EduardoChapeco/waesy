/**
 * job-opportunity-extractor.ts — Extrator Mecânico Especializado de Vagas de Emprego
 *
 * Pipeline de Alta Fidelidade:
 * 1. Detecção Precoce de Catálogo/Listagem (isJobListingPage) & Spidering de Links Filhos
 * 2. Extração estruturada de Schema.org/JobPosting (JSON-LD e Microdados)
 * 3. Parser Heurístico Limpo com Remoção de Ruído (Navbars, Cookies, Rodapés, Skip-Links)
 * 4. Sanitização Estrita de Títulos de Cargo (Anti-Listing Branding)
 * 5. Normalização de Salários BRL (Zero Text Slicing / Fallback seguro para "A combinar")
 * 6. Extração de Requisitos e Benefícios em Listas Estruturadas (requirements, benefits)
 * 7. Curadoria Contínua com IA e Auto-Purga de Registros Corrompidos
 */

import { getServerClient } from "@/lib/supabase";
import { cleanHtmlText, normalizeUrl } from "@/lib/mining/scraper-utils";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";

export interface MinedJobPosting {
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  category: "clt" | "pj" | "estagio" | "tech" | "comercial" | "operacional" | "saude" | "outros";
  location: string;
  locationCity: string;
  locationState: string;
  workplaceType: "Presencial" | "Híbrido" | "Remoto";
  contractType: "CLT" | "PJ" | "Estágio" | "Freelancer" | "Temporário";
  salaryDisplay: string;
  salaryMinCents?: number;
  salaryMaxCents?: number;
  description: string;
  requirements: string[];
  benefits: string[];
  contactWhatsapp?: string;
  contactEmail?: string;
  applicationMode: "internal" | "external_link" | "whatsapp" | "email";
  applyUrl: string;
  sourceDomain: string;
  qualityScore: number;
}

export interface ExtractJobResult {
  success: boolean;
  job?: MinedJobPosting;
  insertedId?: string;
  isDuplicate?: boolean;
  isListingPage?: boolean;
  queuedJobsCount?: number;
  error?: string;
}

/**
 * Sanitiza e valida o título do cargo, rejeitando títulos de agregação/busca
 * e limpando sufixos publicitários de portais (ex: " - Vagas.com.br", " | Indeed").
 */
export function sanitizeJobTitle(rawTitle: string): string | null {
  if (!rawTitle || typeof rawTitle !== "string") return null;

  let clean = cleanHtmlText(rawTitle)
    .replace(/\s+/g, " ")
    .trim();

  // Remove sufixos e branding de portais
  clean = clean.replace(/\s*[-–|•]\s*(?:vagas\.com\.br|vagas\.com|indeed\.com|indeed|catho|infojobs|gupy\.io|gupy|trabalha\s+brasil|sine|balc[aã]o\s+de\s+empregos).*/i, "").trim();

  // Rejeita padrões claros de catálogo/busca agregada e erros 404
  if (
    /\b\d+[\.,]?\d*\s+vagas?\b/i.test(clean) ||
    /\bvagas?\s+de\s+emprego\b/i.test(clean) ||
    /\boportunidades?\s+em\b/i.test(clean) ||
    /\bresultado[s]?\s+de\s+busca\b/i.test(clean) ||
    /\bbusca\s+de\s+vagas\b/i.test(clean) ||
    /\bencontramos\s+\d+\b/i.test(clean) ||
    /^vagas\s+em\b/i.test(clean) ||
    /^empregos\s+em\b/i.test(clean) ||
    /^trabalhe\s+conosco\b/i.test(clean) ||
    /p[áa]gina\s+n[ãa]o\s+encontrada|page\s+can['’]t\s+be\s+found|not\s+found|erro\s+404/i.test(clean) ||
    /pular\s+para\s+o\s+conte[uú]do/i.test(clean)
  ) {
    return null;
  }

  if (clean.length < 3 || clean.length > 120) {
    return null;
  }

  // Capitalização da primeira letra
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Normaliza e sanitiza valores de salário em Real para centavos inteiros.
 * Zero fatiamento de texto: caso não encontre padrão numérico BRL estrito,
 * padroniza rigorosamente para "A combinar".
 */
export function parseBrlSalaryToCents(rawText: string): { minCents?: number; maxCents?: number; display: string } {
  if (!rawText || typeof rawText !== "string") {
    return { display: "A combinar" };
  }

  // Remove texto de skip link e navegação antes de inspecionar
  const clean = rawText
    .replace(/pular\s+para\s+o\s+conte[uú]do/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const brlRegex = /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+)/gi;
  const matches = Array.from(clean.matchAll(brlRegex));

  if (matches.length === 0) {
    return { display: "A combinar" };
  }

  const parseNum = (valStr: string): number => {
    const sanitized = valStr.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(sanitized);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const firstCents = parseNum(matches[0][1]);
  // Descarta valores espúrios (< R$ 400 ou > R$ 100.000)
  if (firstCents < 40000 || firstCents > 10000000) {
    return { display: "A combinar" };
  }

  if (matches.length > 1) {
    const secondCents = parseNum(matches[1][1]);
    if (secondCents >= 40000 && secondCents <= 10000000) {
      const minCents = Math.min(firstCents, secondCents);
      const maxCents = Math.max(firstCents, secondCents);
      return {
        minCents,
        maxCents,
        display: `R$ ${(minCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} - R$ ${(maxCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      };
    }
  }

  return {
    minCents: firstCents,
    display: `R$ ${(firstCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  };
}

/**
 * Normaliza categoria de trabalho conforme check constraint `jobs_category_check`
 * ['clt', 'pj', 'estagio', 'tech', 'comercial', 'operacional', 'saude', 'outros']
 */
export function normalizeJobCategory(rawText: string): MinedJobPosting["category"] {
  const lower = rawText.toLowerCase();
  if (lower.includes("saude") || lower.includes("saúde") || lower.includes("enferm") || lower.includes("farmac") || lower.includes("medic") || lower.includes("médic") || lower.includes("dentista") || lower.includes("hospital") || lower.includes("laborat")) return "saude";
  if (lower.includes("estagi") || lower.includes("aprendiz") || lower.includes("trainee")) return "estagio";
  if (/\bpj\b/i.test(lower) || lower.includes("prestador") || lower.includes("autônomo") || lower.includes("autonomo") || lower.includes("consultor")) return "pj";
  if (lower.includes("vendas") || lower.includes("comercial") || lower.includes("atendimento") || lower.includes("balcão") || lower.includes("caixa") || lower.includes("recepcionista")) return "comercial";
  if (/\bti\b/i.test(lower) || lower.includes("desenvolv") || lower.includes("programad") || lower.includes("tecnolog") || lower.includes("software") || lower.includes("dados") || lower.includes("redes") || lower.includes("comput")) return "tech";
  if (lower.includes("operac") || lower.includes("producao") || lower.includes("produção") || lower.includes("fabrica") || lower.includes("fábrica") || lower.includes("auxiliar") || lower.includes("estoque") || lower.includes("motorista") || lower.includes("logistica") || lower.includes("logística") || lower.includes("serviços gerais") || lower.includes("limpeza") || lower.includes("soldador") || lower.includes("mecânico") || lower.includes("mecanico")) return "operacional";
  return "clt";
}

/**
 * Remove ruídos mecânicos do HTML (navbars, menus, avisos de cookies, botões de acessibilidade)
 * e isola o corpo textual real da vaga.
 */
export function sanitizeJobHtmlBody(html: string): string {
  if (!html || typeof html !== "string") return "";

  let cleaned = html
    // Remove scripts, estilos e iframes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, " ")
    // Remove nav, header, footer e forms de login/busca
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, " ")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, " ")
    // Remove blocos de consentimento de cookies e acessibilidade
    .replace(/<div[^>]*class=["'][^"']*(?:cookie|consent|banner|skip-link|navbar|breadcrumbs)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, " ");

  // Busca seções de conteúdo principal
  const contentMatch = cleaned.match(/<(?:article|main|div[^>]*class=["'][^"']*(?:job-description|vaga-detalhe|descricao|job-details)[^"']*["'])[^>]*>([\s\S]*?)<\/(?:article|main|div)>/i);
  if (contentMatch && contentMatch[1] && contentMatch[1].length > 150) {
    cleaned = contentMatch[1];
  }

  return cleanHtmlText(cleaned);
}

/**
 * Extrai listas de requisitos e benefícios estruturados a partir do texto ou HTML
 */
export function extractRequirementsAndBenefits(text: string): {
  requirements: string[];
  benefits: string[];
  cleanDescription: string;
} {
  const requirements: string[] = [];
  const benefits: string[] = [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let currentSection: "none" | "req" | "ben" = "none";

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detecta cabeçalhos de requisitos
    if (/^(?:requisitos|exig[êe]ncias|qualifica[çc][õo]es|perfil|o que buscamos|pr[ée]-requisitos)[\s:]*$/i.test(lower)) {
      currentSection = "req";
      continue;
    }

    // Detecta cabeçalhos de benefícios
    if (/^(?:benef[íi]cios|o que oferecemos|vantagens|pacote de benef[íi]cios)[\s:]*$/i.test(lower)) {
      currentSection = "ben";
      continue;
    }

    // Detecta outros cabeçalhos que encerram
    if (/^(?:sobre a empresa|atribui[çc][õo]es|responsabilidades|como se candidatar|contato)[\s:]*$/i.test(lower)) {
      currentSection = "none";
      continue;
    }

    // Extrai itens com marcadores (- , • , * ou números)
    const bulletMatch = line.match(/^(?:[-*•–]|(?:\d+[.)]))\s*(.+)$/);
    if (bulletMatch && bulletMatch[1]) {
      const item = bulletMatch[1].trim();
      if (item.length >= 4 && item.length <= 150) {
        if (currentSection === "req") {
          requirements.push(item);
        } else if (currentSection === "ben") {
          benefits.push(item);
        }
      }
    }
  }

  // Remove trechos de cookies e avisos residuais do corpo
  let cleanDescription = text
    .replace(/Pular para o conteúdo/gi, "")
    .replace(/Usamos cookies para melhorar sua experiência.*/gi, "")
    .replace(/Todos os direitos reservados.*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    requirements: requirements.slice(0, 10),
    benefits: benefits.slice(0, 10),
    cleanDescription: cleanDescription.slice(0, 3500),
  };
}

/**
 * Extrai dados estruturados de vaga a partir de Schema.org JSON-LD
 */
export function extractJobFromJsonLd(
  html: string,
  url: string,
  options?: { city?: string; state?: string }
): MinedJobPosting | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const rawItem of items) {
        const candidates = rawItem["@graph"] ? rawItem["@graph"] : [rawItem];
        for (const item of candidates) {
          const type = String(item["@type"] || "");
          if (/jobposting/i.test(type) === false) continue;

          const rawTitle = cleanHtmlText(item.title || item.name || "");
          const title = sanitizeJobTitle(rawTitle);
          if (!title) continue;

          // Empresa
          let companyName = "Empresa Confidencial";
          let companyLogoUrl: string | undefined;
          if (typeof item.hiringOrganization === "object" && item.hiringOrganization !== null) {
            const orgName = cleanHtmlText(item.hiringOrganization.name || "");
            if (orgName && !/vagas\.com|indeed|confidencial|anônimo/i.test(orgName)) {
              companyName = orgName;
            }
            companyLogoUrl = item.hiringOrganization.logo || item.hiringOrganization.image;
          } else if (typeof item.hiringOrganization === "string" && item.hiringOrganization.trim()) {
            companyName = cleanHtmlText(item.hiringOrganization);
          }

          // Localização
          let locationCity = options?.city || getDefaultCity();
          let locationState = options?.state || getDefaultState();
          if (item.jobLocation?.address) {
            const addr = item.jobLocation.address;
            if (addr.addressLocality) locationCity = cleanHtmlText(addr.addressLocality);
            if (addr.addressRegion) locationState = normalizeStateUf(addr.addressRegion) || cleanHtmlText(addr.addressRegion).slice(0, 2).toUpperCase();
          }
          const geo = resolveCityAndState(locationCity, locationState);
          locationCity = geo.city || locationCity;
          locationState = geo.state || normalizeStateUf(locationState) || locationState;

          // Salário
          let salaryDisplay = "A combinar";
          let salaryMinCents: number | undefined;
          let salaryMaxCents: number | undefined;

          if (item.baseSalary) {
            const val = item.baseSalary.value;
            if (typeof val === "number" && val > 0) {
              salaryMinCents = Math.round(val * 100);
              salaryDisplay = `R$ ${(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
            } else if (typeof val === "object" && val !== null) {
              if (val.minValue) salaryMinCents = Math.round(Number(val.minValue) * 100);
              if (val.maxValue) salaryMaxCents = Math.round(Number(val.maxValue) * 100);
              if (salaryMinCents && salaryMaxCents) {
                salaryDisplay = `R$ ${(salaryMinCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} - R$ ${(salaryMaxCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
              } else if (salaryMinCents) {
                salaryDisplay = `R$ ${(salaryMinCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
              }
            }
          }

          // Modalidade
          let workplaceType: MinedJobPosting["workplaceType"] = "Presencial";
          const rawJobLocationType = String(item.jobLocationType || "").toLowerCase();
          if (rawJobLocationType.includes("telecommute") || rawJobLocationType.includes("remote") || rawJobLocationType.includes("remoto")) {
            workplaceType = "Remoto";
          } else if (rawJobLocationType.includes("hybrid") || rawJobLocationType.includes("hibrido")) {
            workplaceType = "Híbrido";
          }

          // Contrato
          let contractType: MinedJobPosting["contractType"] = "CLT";
          const rawEmpType = String(item.employmentType || "").toUpperCase();
          if (rawEmpType.includes("CONTRACTOR") || rawEmpType.includes("PJ")) contractType = "PJ";
          else if (rawEmpType.includes("INTERN") || rawEmpType.includes("ESTAGIO")) contractType = "Estágio";
          else if (rawEmpType.includes("TEMPORARY") || rawEmpType.includes("TEMPORARIO")) contractType = "Temporário";

          const rawDesc = cleanHtmlText(item.description || title);
          const parsedContent = extractRequirementsAndBenefits(rawDesc);
          const domain = new URL(url).hostname.replace("www.", "");

          return {
            title,
            companyName: companyName.slice(0, 100),
            companyLogoUrl,
            category: normalizeJobCategory(title + " " + parsedContent.cleanDescription),
            location: `${locationCity}, ${locationState}`,
            locationCity,
            locationState,
            workplaceType,
            contractType,
            salaryDisplay,
            salaryMinCents,
            salaryMaxCents,
            description: parsedContent.cleanDescription,
            requirements: parsedContent.requirements,
            benefits: parsedContent.benefits,
            applicationMode: "external_link",
            applyUrl: url,
            sourceDomain: domain,
            qualityScore: 92,
          };
        }
      }
    } catch {
      // Ignora erro de parsing JSON-LD individual
    }
  }

  return null;
}

/**
 * Parser heurístico limpo para páginas de vagas sem JSON-LD
 */
export function extractJobFromHtmlHeuristics(
  html: string,
  url: string,
  options?: { city?: string; state?: string }
): MinedJobPosting | null {
  const domain = new URL(url).hostname.replace("www.", "");

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  const candidateTitle = h1Match ? cleanHtmlText(h1Match[1]) : ogTitleMatch ? cleanHtmlText(ogTitleMatch[1]) : titleTagMatch ? cleanHtmlText(titleTagMatch[1]) : "";
  const title = sanitizeJobTitle(candidateTitle);

  if (!title) {
    return null;
  }

  const cleanBody = sanitizeJobHtmlBody(html);
  if (cleanBody.length < 80) {
    return null;
  }

  const salaryInfo = parseBrlSalaryToCents(cleanBody);
  const parsedContent = extractRequirementsAndBenefits(cleanBody);

  // WhatsApp de contato
  let contactWhatsapp: string | undefined;
  const waMatch = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/i) ||
                  cleanBody.match(/(?:whatsapp|contato|fone)[\s:]*(?:\+?55)?\s*\(?(\d{2})\)?\s*(9?\d{4})[-\s]?(\d{4})/i);
  if (waMatch) {
    const rawNumber = waMatch[0].replace(/\D/g, "");
    if (rawNumber.length >= 10 && rawNumber.length <= 13) {
      contactWhatsapp = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    }
  }

  // E-mail de RH
  let contactEmail: string | undefined;
  const emailMatch = cleanBody.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch != null && emailMatch[0].includes("example") === false && emailMatch[0].includes("dominio") === false) {
    contactEmail = emailMatch[0].toLowerCase();
  }

  // Modalidade
  let workplaceType: MinedJobPosting["workplaceType"] = "Presencial";
  if (/home office|remoto|teletrabalho/i.test(cleanBody)) workplaceType = "Remoto";
  else if (/hibrido|híbrido/i.test(cleanBody)) workplaceType = "Híbrido";

  // Contrato
  let contractType: MinedJobPosting["contractType"] = "CLT";
  if (/\bpj\b|pessoa jurídica|prestador/i.test(cleanBody)) contractType = "PJ";
  else if (/estágio|estagio|estagiário/i.test(cleanBody)) contractType = "Estágio";
  else if (/temporário|temporario/i.test(cleanBody)) contractType = "Temporário";

  // Nome da empresa
  let companyName = "Empresa Confidencial";
  const compMatch = html.match(/(?:empresa|contratante|anunciante)[\s:]*<[^>]+>([^<]{3,60})</i);
  if (compMatch) {
    const candidateComp = cleanHtmlText(compMatch[1]);
    if (!/vagas|indeed|catho|anônimo|confidencial/i.test(candidateComp)) {
      companyName = candidateComp;
    }
  }

  const geo = resolveCityAndState(options?.city, options?.state);
  const locationCity = geo.city || options?.city || getDefaultCity();
  const locationState = geo.state || normalizeStateUf(options?.state) || getDefaultState();

  return {
    title,
    companyName: companyName.slice(0, 100),
    category: normalizeJobCategory(title + " " + parsedContent.cleanDescription.slice(0, 500)),
    location: `${locationCity}, ${locationState}`,
    locationCity,
    locationState,
    workplaceType,
    contractType,
    salaryDisplay: salaryInfo.display,
    salaryMinCents: salaryInfo.minCents,
    salaryMaxCents: salaryInfo.maxCents,
    description: parsedContent.cleanDescription,
    requirements: parsedContent.requirements,
    benefits: parsedContent.benefits,
    contactWhatsapp,
    contactEmail,
    applicationMode: contactWhatsapp ? "whatsapp" : contactEmail ? "email" : "external_link",
    applyUrl: url,
    sourceDomain: domain,
    qualityScore: 82,
  };
}

/**
 * Detecta se a página é um índice/catálogo de vagas (em vez de uma vaga individual)
 */
export function isJobListingPage(title: string, url: string, html: string): boolean {
  const cleanTitle = (title || "").toLowerCase();
  const cleanUrl = (url || "").toLowerCase();

  // 1. Verificação por URL de busca ou listagem
  if (
    /vagas-em-|vagas-de-|empregos-em-|\/cargo\/|\/profissoes\/|\/vagas\?|\/buscar|\/busca\b|\/search\b|\/jobs\?|\/vagas\/[a-z0-9-]+-sc\/?$/i.test(cleanUrl)
  ) {
    return true;
  }

  // 2. Verificação por título agregador de vagas
  if (
    /\b\d+\s+vagas?\b/i.test(cleanTitle) ||
    /\bvagas?\s+de\s+emprego\b/i.test(cleanTitle) ||
    /\boportunidades?\s+em\b/i.test(cleanTitle) ||
    /\bresultado[s]?\s+de\s+busca\b/i.test(cleanTitle) ||
    /\bbusca\s+de\s+vagas\b/i.test(cleanTitle) ||
    /\bencontramos\s+\d+\b/i.test(cleanTitle) ||
    /^vagas\s+em\b/i.test(cleanTitle) ||
    /^empregos\s+em\b/i.test(cleanTitle)
  ) {
    return true;
  }

  // 3. Verificação por múltiplos links de vagas na página
  const jobLinkCount = (html.match(/href=["'][^"']*(?:\/vaga\/|\/emprego\/|\/oportunidade\/|\/cargo\/|\/viewjob|\/vagas\/v\d+)[^"']*["']/gi) || []).length;
  if (jobLinkCount >= 3) {
    return true;
  }

  return false;
}

/**
 * Extrai links de vagas individuais a partir de uma página de catálogo
 */
export function extractJobLinksFromListing(html: string, baseUrl: string): string[] {
  const regexes = [
    // Vagas.com.br
    /href=["'](\/vagas\/v\d+\/[^"'\s?#]+)["']/gi,
    // Indeed
    /href=["']([^"']*(?:viewjob\?jk=[a-f0-9]+|\/rc\/clk\?[^"'\s]+))["']/gi,
    // Catho
    /href=["'](\/vagas\/[a-z0-9-]+\/\d+\/?)["']/gi,
    // Gupy
    /href=["'](https?:\/\/[a-z0-9-]+\.gupy\.io\/job\/\d+[^"'\s]*)["']/gi,
    // InfoJobs
    /href=["'](\/vaga-de[a-zA-Z0-9_.-]+-\d+\.aspx)["']/gi,
    // Trabalha Brasil
    /href=["'](\/vagas-emprego\/[^"'\s]+)["']/gi,
    // Links Genéricos de Vagas Individuais (exclui diretórios /cargo/ e /profissoes/)
    /href=["'](\/(?:vaga|emprego|oportunidade|job)\/[a-zA-Z0-9_-]{4,}[^"'\s]*)["']/gi,
  ];

  const links = new Set<string>();

  for (const regex of regexes) {
    const matches = html.matchAll(regex);
    for (const match of matches) {
      try {
        const resolved = new URL(match[1], baseUrl).toString();
        // Não inclui se for link de busca, diretório de cargos ou paginação
        if (!/busca|search|\?p=|\/vagas-em-|\/vagas-de-|\/cargo\/|\/profissoes\/|\/mapa-de-carreiras/i.test(resolved)) {
          links.add(resolved);
        }
      } catch {}
    }
  }

  return Array.from(links).slice(0, 30);
}

/**
 * Curadoria com IA para estruturar descrição, requisitos e benefícios caso estejam vazios
 */
export async function curateJobPostingWithAi(job: MinedJobPosting): Promise<MinedJobPosting> {
  if (job.requirements.length > 0 && job.benefits.length > 0 && job.description.length >= 200) {
    return job;
  }

  try {
    const prompt = `Você é um especialista em Recrutamento e Seleção de RH no Brasil.
Analise os dados brutos desta vaga e estruture um JSON com:
- "title": cargo profissional limpo (sem publicidade ou números de vagas).
- "company_name": nome da empresa ou "Empresa Confidencial".
- "description": 2 ou 3 parágrafos profissionais em Markdown com as principais responsabilidades e atribuições. Proibido avisos de cookies ou menus.
- "requirements": array de strings com os requisitos (ex: escolaridade, experiência, CNH).
- "benefits": array de strings com os benefícios oferecidos (ex: VT, VR, plano de saúde).

DADOS DA VAGA:
Título: ${job.title}
Empresa: ${job.companyName}
Local: ${job.location}
Salário: ${job.salaryDisplay}
Texto Bruto:
${job.description.slice(0, 1500)}

Responda ESTRITAMENTE em formato JSON puro, sem markdown tags ao redor.`;

    const aiResult = await executeUnifiedAiCall({
      prompt,
      taskType: "editorial",
    });

    if (aiResult && aiResult.text) {
      const cleanJsonText = aiResult.text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJsonText);

      if (parsed.title) job.title = sanitizeJobTitle(parsed.title) || job.title;
      if (parsed.company_name) job.companyName = parsed.company_name;
      if (parsed.description && parsed.description.length > 100) job.description = parsed.description;
      if (Array.isArray(parsed.requirements) && parsed.requirements.length > 0) job.requirements = parsed.requirements;
      if (Array.isArray(parsed.benefits) && parsed.benefits.length > 0) job.benefits = parsed.benefits;
      job.qualityScore = 95;
    }
  } catch (err) {
    // Fallback gracioso mantendo os dados determinísticos
  }

  return job;
}

/**
 * Extrai e persiste uma vaga de emprego na tabela `jobs` do Supabase
 */
export async function extractAndPersistJobOpportunity(
  html: string,
  url: string,
  options?: { storeId?: string; city?: string; state?: string }
): Promise<ExtractJobResult> {
  const normalized = normalizeUrl(url);
  const supabase = getServerClient();

  // 1. Extração do título da página a partir do cabeçalho HTML
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const pageTitle = cleanHtmlText(h1Match ? h1Match[1] : titleTagMatch ? titleTagMatch[1] : "");

  // 2. Se for página de listagem/catálogo, extrai links individuais e enfileira na crawl_queue
  if (isJobListingPage(pageTitle, normalized, html)) {
    const jobLinks = extractJobLinksFromListing(html, normalized);
    if (jobLinks.length > 0) {
      const queueItems = jobLinks.map((link) => ({
        url: link,
        domain: new URL(link).hostname.replace("www.", ""),
        entity_type: "job",
        status: "pending",
        priority: 9,
        discovered_via: "jobs_portal_spider",
        metadata: {
          parent_url: normalized,
          city: options?.city,
          state: options?.state,
        },
      }));

      await supabase.from("crawl_queue").upsert(queueItems, { onConflict: "url", ignoreDuplicates: true });
      return {
        success: true,
        isListingPage: true,
        queuedJobsCount: jobLinks.length,
      };
    }

    return {
      success: true,
      isListingPage: true,
      queuedJobsCount: 0,
    };
  }

  // 3. Extração da Vaga Individual
  let job = extractJobFromJsonLd(html, normalized, options) || extractJobFromHtmlHeuristics(html, normalized, options);

  if (job == null || isJobListingPage(job.title, normalized, html)) {
    return {
      success: false,
      error: `Não foi possível extrair dados de vaga de ${normalized}. Conteúdo sem indicadores de contratação ou página de busca.`,
    };
  }

  // Curadoria com IA caso requisitos ou benefícios estejam vazios
  job = await curateJobPostingWithAi(job);

  if (options?.city) {
    const geo = resolveCityAndState(options.city, options.state);
    job.locationCity = geo.city || options.city;
    job.locationState = geo.state || normalizeStateUf(options.state) || job.locationState;
    job.location = `${job.locationCity}, ${job.locationState}`;
  }

  // 4. Deduplicação segura por URL externa ou (título + empresa)
  const { data: existingUrl } = await supabase
    .from("jobs")
    .select("id")
    .eq("external_url", normalized)
    .maybeSingle();

  let existingId = existingUrl?.id;

  if (!existingId && job.title && job.companyName) {
    const { data: existingTitle } = await supabase
      .from("jobs")
      .select("id")
      .ilike("title", job.title)
      .ilike("company_name", job.companyName)
      .maybeSingle();
    existingId = existingTitle?.id;
  }

  if (existingId) {
    return {
      success: true,
      job,
      insertedId: existingId,
      isDuplicate: true,
    };
  }

  // 5. Inserção na Tabela Canônica `jobs`
  const payload = {
    store_id: options?.storeId || null,
    title: job.title,
    company_name: job.companyName,
    company_logo_url: job.companyLogoUrl || null,
    category: job.category,
    location: job.location,
    location_city: job.locationCity,
    location_state: job.locationState,
    workplace_type: job.workplaceType,
    contract_type: job.contractType,
    salary_display: job.salaryDisplay,
    salary_min_cents: job.salaryMinCents || null,
    salary_max_cents: job.salaryMaxCents || null,
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    contact_whatsapp: job.contactWhatsapp || null,
    contact_email: job.contactEmail || null,
    is_external: true,
    external_url: job.applyUrl,
    external_source: job.sourceDomain,
    application_mode: job.applicationMode,
    apply_url: job.applyUrl,
    data_quality_score: job.qualityScore,
    status: "active",
    is_featured: false,
    linkedin_sync_status: "none",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("jobs")
    .insert(payload)
    .select("id")
    .single();

  if (insertErr) {
    console.error("[JobExtractor] Falha ao persistir vaga:", insertErr.message);
    return {
      success: false,
      job,
      error: insertErr.message,
    };
  }

  return {
    success: true,
    job,
    insertedId: inserted?.id,
    isDuplicate: false,
  };
}

/**
 * Varre a tabela `jobs` e purga registros de listagem espúrios e salários corrompidos
 */
export async function sanitizeAndPurgeCorruptedJobs(): Promise<{
  purgedListingRecords: number;
  fixedSalaries: number;
}> {
  const supabase = getServerClient();

  // 1. Purga de registros com títulos de busca agregada, erros 404 ou contagens de vagas
  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title, salary_display");

  let purgedListingRecords = 0;
  let fixedSalaries = 0;

  if (allJobs && allJobs.length > 0) {
    for (const j of allJobs) {
      const isCorruptedTitle =
        !j.title ||
        /vagas?\s+de\s+emprego|\b\d+[\.,]?\d*\s+vagas?\b|resultado|encontramos|^vagas\s+em\b|^empregos\s+em\b/i.test(j.title) ||
        /pular\s+para\s+o\s+conte/i.test(j.title) ||
        /p[áa]gina\s+n[ãa]o\s+encontrada|page\s+can['’]t\s+be\s+found|not\s+found|404\b/i.test(j.title);

      if (isCorruptedTitle) {
        await supabase.from("jobs").delete().eq("id", j.id);
        purgedListingRecords++;
      } else if (/pular|menu|cad|skip|content|ir\s+para/i.test(j.salary_display || "") || (j.salary_display && j.salary_display.length > 60)) {
        await supabase.from("jobs").update({ salary_display: "A combinar" }).eq("id", j.id);
        fixedSalaries++;
      }
    }
  }

  return { purgedListingRecords, fixedSalaries };
}


/**
 * Semeia portais e catálogos regionais de vagas na crawl_queue quando a fila estiver vazia
 */
export async function seedRegionalJobPortals(
  city = getDefaultCity(),
  state = getDefaultState()
): Promise<{ seeded: number }> {
  const supabase = getServerClient();
  const normalizedCity = city.toLowerCase().replace(/\s+/g, "-");
  const seeds = [
    {
      url: `https://www.vagas.com.br/vagas-em-${normalizedCity}`,
      domain: "vagas.com.br",
      entity_type: "job",
      status: "pending",
      priority: 10,
      discovered_via: "job_seeder",
      metadata: { city, state, source_name: "Vagas.com.br Regional" },
    },
    {
      url: `https://www.sine.net.br/vagas-empregos-em-${normalizedCity}-${state.toLowerCase()}`,
      domain: "sine.net.br",
      entity_type: "job",
      status: "pending",
      priority: 9,
      discovered_via: "job_seeder",
      metadata: { city, state, source_name: "SINE Santa Catarina" },
    },
    {
      url: `https://www.trabalhabrasil.com.br/vagas-empregos-em-${normalizedCity}-${state.toLowerCase()}`,
      domain: "trabalhabrasil.com.br",
      entity_type: "job",
      status: "pending",
      priority: 8,
      discovered_via: "job_seeder",
      metadata: { city, state, source_name: "Trabalha Brasil" },
    },
  ];

  await supabase.from("crawl_queue").upsert(seeds, { onConflict: "url", ignoreDuplicates: true });
  return { seeded: seeds.length };
}

/**
 * Processador em lote de vagas com auto-seeding quando a fila estiver vazia
 */
export async function harvestJobsBatch(limit = 4): Promise<{
  inspected: number;
  harvestedJobs: number;
  queuedFromListings: number;
  errors: number;
}> {
  const { scrapeUrl } = await import("@/lib/mining/firecrawl-client");
  const supabase = getServerClient();

  let { data: jobQueue } = await supabase
    .from("crawl_queue")
    .select("id, url, store_id, metadata")
    .in("entity_type", ["job", "jobs_portal", "jobs", "vagas"])
    .eq("status", "pending")
    .limit(limit);

  if (!jobQueue || jobQueue.length === 0) {
    await seedRegionalJobPortals();
    const { data: refetched } = await supabase
      .from("crawl_queue")
      .select("id, url, store_id, metadata")
      .in("entity_type", ["job", "jobs_portal", "jobs", "vagas"])
      .eq("status", "pending")
      .limit(limit);
    jobQueue = refetched || [];
  }

  let inspected = jobQueue.length;
  let harvestedJobs = 0;
  let queuedFromListings = 0;
  let errors = 0;

  for (const jq of jobQueue) {
    try {
      const scrape = await scrapeUrl(jq.url);
      if (scrape.success && scrape.html) {
        const jRes = await extractAndPersistJobOpportunity(scrape.html, jq.url, {
          storeId: jq.store_id || undefined,
          city: jq.metadata?.city || getDefaultCity(),
          state: jq.metadata?.state || getDefaultState(),
        });
        if (jRes.success) {
          if (jRes.isListingPage) queuedFromListings += jRes.queuedJobsCount || 0;
          else harvestedJobs++;
        }
        await supabase.from("crawl_queue").update({
          status: jRes.success ? "completed" : "failed",
          last_error: jRes.error || null,
          completed_at: new Date().toISOString(),
        }).eq("id", jq.id);
      } else {
        errors++;
        await supabase.from("crawl_queue").update({
          status: "failed",
          last_error: scrape.error || "Falha ao obter HTML da vaga",
          completed_at: new Date().toISOString(),
        }).eq("id", jq.id);
      }
    } catch (err: any) {
      errors++;
      await supabase.from("crawl_queue").update({
        status: "failed",
        last_error: err?.message || "Erro desconhecido ao processar vaga",
        completed_at: new Date().toISOString(),
      }).eq("id", jq.id);
    }
  }

  return { inspected, harvestedJobs, queuedFromListings, errors };
}
