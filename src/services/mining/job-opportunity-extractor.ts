/**
 * job-opportunity-extractor.ts — Extrator Mecânico Especializado de Vagas de Emprego
 * 
 * Pipeline:
 * 1. Extração estruturada de Schema.org/JobPosting (JSON-LD e Microdados)
 * 2. Fallback heurístico em HTML bruto para portais regionais brasileiros (Balcão de Empregos, Sine, Vagas)
 * 3. Normalização de salários em BRL para centavos (salary_min_cents, salary_max_cents)
 * 4. Validação estrita contra os Check Constraints canônicos da tabela `jobs`
 * 5. Inserção atômica e deduplicada na tabela canônica `jobs` da Waesy
 */

import { getServerClient } from "@/lib/supabase";
import { cleanHtmlText, normalizeUrl } from "@/lib/mining/scraper-utils";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";

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
  error?: string;
}

/**
 * Normaliza e sanitiza valores de salário em Real para centavos inteiros
 */
export function parseBrlSalaryToCents(rawText: string): { minCents?: number; maxCents?: number; display: string } {
  const clean = rawText.replace(/\s+/g, " ").trim();
  const brlRegex = /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+)/gi;
  const matches = Array.from(clean.matchAll(brlRegex));

  if (matches.length === 0) {
    if (/combinar|a combinar/i.test(clean)) {
      return { display: "A combinar" };
    }
    return { display: clean.slice(0, 40) || "A combinar" };
  }

  const parseNum = (valStr: string): number => {
    const sanitized = valStr.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(sanitized);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const firstCents = parseNum(matches[0][1]);
  if (matches.length > 1) {
    const secondCents = parseNum(matches[1][1]);
    const minCents = Math.min(firstCents, secondCents);
    const maxCents = Math.max(firstCents, secondCents);
    return {
      minCents,
      maxCents,
      display: `R$ ${(minCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} - R$ ${(maxCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    };
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
  if (lower.includes("vendas") || lower.includes("comercial") || lower.includes("atendimento") || lower.includes("balcão")) return "comercial";
  if (lower.includes("ti") || lower.includes("desenvolv") || lower.includes("programad") || lower.includes("tecnolog") || lower.includes("software") || lower.includes("dados")) return "tech";
  if (lower.includes("operac") || lower.includes("producao") || lower.includes("fabrica") || lower.includes("auxiliar") || lower.includes("estoque") || lower.includes("motorista") || lower.includes("logistica")) return "operacional";
  if (lower.includes("saude") || lower.includes("enferm") || lower.includes("farmac") || lower.includes("medic") || lower.includes("dentista") || lower.includes("hospital")) return "saude";
  if (lower.includes("estagio") || lower.includes("estágio") || lower.includes("aprendiz")) return "estagio";
  if (lower.includes("pj") || lower.includes("prestador") || lower.includes("autônomo")) return "pj";
  return "clt";
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

          const title = cleanHtmlText(item.title || item.name || "");
          if (title == null || title.length < 4) continue;

          // Empresa
          let companyName = "Empresa Confidencial";
          let companyLogoUrl: string | undefined;
          if (typeof item.hiringOrganization === "object" && item.hiringOrganization !== null) {
            companyName = cleanHtmlText(item.hiringOrganization.name || companyName);
            companyLogoUrl = item.hiringOrganization.logo || item.hiringOrganization.image;
          } else if (typeof item.hiringOrganization === "string") {
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

          // Modalidade conforme `jobs_workplace_type_check`: ['Presencial', 'Híbrido', 'Remoto']
          let workplaceType: MinedJobPosting["workplaceType"] = "Presencial";
          const rawJobLocationType = String(item.jobLocationType || "").toLowerCase();
          if (rawJobLocationType.includes("telecommute") || rawJobLocationType.includes("remote") || rawJobLocationType.includes("remoto")) {
            workplaceType = "Remoto";
          } else if (rawJobLocationType.includes("hybrid") || rawJobLocationType.includes("hibrido")) {
            workplaceType = "Híbrido";
          }

          // Contrato conforme `jobs_contract_type_check`: ['CLT', 'PJ', 'Estágio', 'Freelancer', 'Temporário']
          let contractType: MinedJobPosting["contractType"] = "CLT";
          const rawEmpType = String(item.employmentType || "").toUpperCase();
          if (rawEmpType.includes("CONTRACTOR") || rawEmpType.includes("PJ")) contractType = "PJ";
          else if (rawEmpType.includes("INTERN") || rawEmpType.includes("ESTAGIO")) contractType = "Estágio";
          else if (rawEmpType.includes("TEMPORARY") || rawEmpType.includes("TEMPORARIO")) contractType = "Temporário";

          const description = cleanHtmlText(item.description || title);
          const domain = new URL(url).hostname.replace("www.", "");

          return {
            title,
            companyName,
            companyLogoUrl,
            category: normalizeJobCategory(title + " " + description),
            location: `${locationCity}, ${locationState}`,
            locationCity,
            locationState,
            workplaceType,
            contractType,
            salaryDisplay,
            salaryMinCents,
            salaryMaxCents,
            description: description.slice(0, 4000),
            requirements: [],
            benefits: [],
            applicationMode: "external_link",
            applyUrl: url,
            sourceDomain: domain,
            qualityScore: 88,
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
 * Parser heurístico para páginas de vagas sem JSON-LD
 */
export function extractJobFromHtmlHeuristics(
  html: string,
  url: string,
  options?: { city?: string; state?: string }
): MinedJobPosting | null {
  const domain = new URL(url).hostname.replace("www.", "");

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const rawTitle = h1Match ? cleanHtmlText(h1Match[1]) : ogTitleMatch ? cleanHtmlText(ogTitleMatch[1]) : "";

  if (rawTitle == null || rawTitle.length < 5 || /error|404|not found|acesso negado/i.test(rawTitle)) {
    return null;
  }

  const bodyText = cleanHtmlText(html);
  const salaryInfo = parseBrlSalaryToCents(bodyText);

  // WhatsApp de contato
  let contactWhatsapp: string | undefined;
  const waMatch = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/i) ||
                  bodyText.match(/(?:whatsapp|contato|fone)[\s:]*(?:\+?55)?\s*\(?(\d{2})\)?\s*(9?\d{4})[-\s]?(\d{4})/i);
  if (waMatch) {
    const rawNumber = waMatch[0].replace(/\D/g, "");
    if (rawNumber.length >= 10 && rawNumber.length <= 13) {
      contactWhatsapp = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    }
  }

  // E-mail de RH
  let contactEmail: string | undefined;
  const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch != null && emailMatch[0].includes("example") === false && emailMatch[0].includes("dominio") === false) {
    contactEmail = emailMatch[0].toLowerCase();
  }

  // Modalidade conforme `jobs_workplace_type_check`
  let workplaceType: MinedJobPosting["workplaceType"] = "Presencial";
  if (/home office|remoto|teletrabalho/i.test(bodyText)) workplaceType = "Remoto";
  else if (/hibrido|híbrido/i.test(bodyText)) workplaceType = "Híbrido";

  // Contrato conforme `jobs_contract_type_check`
  let contractType: MinedJobPosting["contractType"] = "CLT";
  if (/\bpj\b|pessoa jurídica|prestador/i.test(bodyText)) contractType = "PJ";
  else if (/estágio|estagio|estagiário/i.test(bodyText)) contractType = "Estágio";
  else if (/temporário|temporario/i.test(bodyText)) contractType = "Temporário";

  // Nome da empresa
  let companyName = options?.city ? `Empresa em ${options.city}` : "Empresa Confidencial";
  const compMatch = html.match(/(?:empresa|contratante|anunciante)[\s:]*<[^>]+>([^<]{3,60})</i);
  if (compMatch) {
    companyName = cleanHtmlText(compMatch[1]);
  }

  const geo = resolveCityAndState(options?.city, options?.state);
  const locationCity = geo.city || options?.city || getDefaultCity();
  const locationState = geo.state || normalizeStateUf(options?.state) || getDefaultState();

  return {
    title: rawTitle.slice(0, 150),
    companyName: companyName.slice(0, 100),
    category: normalizeJobCategory(rawTitle + " " + bodyText.slice(0, 500)),
    location: `${locationCity}, ${locationState}`,
    locationCity,
    locationState,
    workplaceType,
    contractType,
    salaryDisplay: salaryInfo.display,
    salaryMinCents: salaryInfo.minCents,
    salaryMaxCents: salaryInfo.maxCents,
    description: bodyText.slice(0, 3000),
    requirements: [],
    benefits: [],
    contactWhatsapp,
    contactEmail,
    applicationMode: contactWhatsapp ? "whatsapp" : contactEmail ? "email" : "external_link",
    applyUrl: url,
    sourceDomain: domain,
    qualityScore: 78,
  };
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

  const job = extractJobFromJsonLd(html, normalized, options) || extractJobFromHtmlHeuristics(html, normalized, options);

  if (job == null) {
    return {
      success: false,
      error: `Não foi possível extrair dados de vaga de ${normalized}. Conteúdo sem indicadores de contratação.`,
    };
  }

  if (options?.city) {
    const geo = resolveCityAndState(options.city, options.state);
    job.locationCity = geo.city || options.city;
    job.locationState = geo.state || normalizeStateUf(options.state) || job.locationState;
    job.location = `${job.locationCity}, ${job.locationState}`;
  }

  // Deduplicação por URL externa ou (título + empresa)
  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .or(`external_url.eq."${normalized}",and(title.ilike."${job.title}",company_name.ilike."${job.companyName}")`)
    .maybeSingle();

  if (existing?.id) {
    return {
      success: true,
      job,
      insertedId: existing.id,
      isDuplicate: true,
    };
  }

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
