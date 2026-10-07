import type { BuilderAssetRef } from "./asset-contract";
import { isAssetPublicationReady } from "./asset-contract";
import type { OmniBlockStyling } from "@/types/omni-builder";
import type { OmniBlockInstance, OmniPageDocument } from "@/types/omni-builder";
import { STUDIO_TEMPLATE_CATALOG } from "./studio-catalog";
import { getSafeBuilderHref } from "./safe-href";

export type TemplateAuditCategory = "license" | "accessibility" | "performance" | "content" | "security";
export type TemplateAuditSeverity = "error" | "warning" | "info";
export type TemplateAuditStatus = "pass" | "warn" | "fail";

export interface TemplateAuditFinding {
  ruleId: string;
  category: TemplateAuditCategory;
  severity: TemplateAuditSeverity;
  path: string;
  message: string;
}

export interface TemplateAuditResult {
  templateId: string;
  templateName: string;
  status: TemplateAuditStatus;
  score: number;
  findings: TemplateAuditFinding[];
  metrics: {
    blockCount: number;
    serializedBytes: number;
    imageReferences: number;
    externalImageReferences: number;
    assetsWithProvenance: number;
  };
  limitations: string[];
}

export interface StudioAuditThresholds {
  maxSerializedBytes: number;
  maxBlocks: number;
  maxImageReferences: number;
  maxExternalImageReferences: number;
  maxRemoteAssetBytes: number;
}

type StudioAuditBlock = Pick<OmniBlockInstance, "type" | "config"> &
  Partial<Pick<OmniBlockInstance, "id" | "assetRefs" | "isHidden">> & {
    styling?: OmniBlockStyling;
    sectionAnchorId?: string;
  };
type StudioAuditTemplate = { id: string; name: string; blocks: StudioAuditBlock[]; status?: "ready" | "review_required" };

export const DEFAULT_STUDIO_AUDIT_THRESHOLDS: StudioAuditThresholds = {
  maxSerializedBytes: 250_000,
  maxBlocks: 40,
  maxImageReferences: 8,
  maxExternalImageReferences: 4,
  maxRemoteAssetBytes: 2_000_000,
};

const IMAGE_KEY = /image|photo|avatar|cover|thumbnail|poster|background/i;
const URL_PATTERN = /^https?:\/\//i;
const DECORATIVE_OR_EMPTY = /^#$/i;
const CONTRAST_TEXT_THRESHOLD = 4.5;

function addFinding(findings: TemplateAuditFinding[], ruleId: string, category: TemplateAuditCategory, severity: TemplateAuditSeverity, path: string, message: string) {
  findings.push({ ruleId, category, severity, path, message });
}

function collectImageReferences(value: unknown, path: string, result: Array<{ path: string; url: string; owner: Record<string, unknown> }>) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectImageReferences(item, `${path}[${index}]`, result));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    const childPath = path ? `${path}.${key}` : key;
    const isAltOrCaption = /alt|caption|description|label/i.test(key);
    if (IMAGE_KEY.test(key) && !isAltOrCaption && typeof child === "string" && child.trim() && !DECORATIVE_OR_EMPTY.test(child)) {
      result.push({ path: childPath, url: child.trim(), owner: record });
    } else {
      collectImageReferences(child, childPath, result);
    }
  }
}

function isExternal(url: string): boolean { return URL_PATTERN.test(url); }
function assetMatchesUrl(asset: BuilderAssetRef, url: string): boolean { return asset.source_url === url || asset.source_page_url === url; }
function isUnsplashImageUrl(url: string): boolean {
  try { return new URL(url).hostname === "images.unsplash.com"; } catch { return false; }
}

function luminance(hex: string): number | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(normalized)) return null;
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const channels = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number | null {
  const fg = luminance(foreground);
  const bg = luminance(background);
  if (fg === null || bg === null) return null;
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
}

function requiredAltText(owner: Record<string, unknown>): string | undefined {
  for (const key of ["alt", "imageAlt", "image_alt", "altText", "alt_text"]) {
    const value = owner[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function auditActionNames(value: unknown, path: string, findings: TemplateAuditFinding[]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => auditActionNames(item, `${path}[${index}]`, findings));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    const childPath = `${path}.${key}`;
    if (/cta|button|action/i.test(key) && child && typeof child === "object" && !Array.isArray(child)) {
      const action = child as Record<string, unknown>;
      if (action.href && ![action.label, action.ariaLabel, action.aria_label, action.text].some((name) => typeof name === "string" && name.trim())) {
        addFinding(findings, "A11Y_ACTION_NAME", "accessibility", "error", childPath, "Ação com destino precisa de rótulo textual ou nome acessível.");
      }
    }
    auditActionNames(child, childPath, findings);
  }
}

function auditSafeNavigationLinks(blocks: OmniBlockInstance[], findings: TemplateAuditFinding[]) {
  const visit = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = `${path}.${key}`;
      if (/href$/i.test(key) && typeof child === "string" && child.trim() && !getSafeBuilderHref(child)) {
        addFinding(findings, "SECURITY_UNSAFE_HREF", "security", "error", childPath, "Link não seguro: use uma rota local, âncora, mailto/tel válidos ou URL HTTPS sem credenciais.");
      }
      visit(child, childPath);
    }
  };
  blocks.forEach((block, index) => visit(block.config, `blocks[${index}].config`));
}

function auditContentIntegrity(blocks: OmniBlockInstance[], findings: TemplateAuditFinding[]) {
  const unresolvedToken = /\[\[[^\]]{2,100}\]\]/u;
  const visit = (value: unknown, path: string) => {
    if (typeof value === "string") {
      if (unresolvedToken.test(value)) {
        addFinding(findings, "CONTENT_PLACEHOLDER_UNRESOLVED", "content", "error", path, "Texto placeholder permanece no documento. Preencha com informação real ou remova a seção antes de publicar.");
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) visit(child, path ? `${path}.${key}` : key);
  };

  blocks.forEach((block, index) => {
    visit(block.config, `blocks[${index}].config`);
    if (block.type === "testimonials_social_proof") {
      const testimonials = Array.isArray(block.config?.testimonials) ? block.config.testimonials : [];
      if (testimonials.length === 0) addFinding(findings, "CONTENT_SOCIAL_PROOF_EMPTY", "content", "error", `blocks[${index}].config.testimonials`, "Adicione depoimentos reais autorizados ou remova a seção antes de publicar.");
      else addFinding(findings, "CONTENT_SOCIAL_PROOF_REVIEW", "content", "warning", `blocks[${index}].config.testimonials`, "Confirme que cada depoimento é real, autorizado e fiel; o campo verified não comprova autenticidade.");
    }
    if (block.type === "faq_clean_accordion") {
      const items = Array.isArray(block.config?.items) ? block.config.items : [];
      if (items.length === 0) addFinding(findings, "CONTENT_FAQ_EMPTY", "content", "error", `blocks[${index}].config.items`, "Adicione respostas verificadas para este negócio ou remova a seção antes de publicar.");
    }
    if (block.type === "contact_form_direct") {
      const whatsappDigits = typeof block.config?.whatsappNumber === "string" ? block.config.whatsappNumber.replace(/\D/g, "") : "";
      if (!/^\d{10,15}$/.test(whatsappDigits)) addFinding(findings, "CONTENT_FORM_DESTINATION_MISSING", "content", "error", `blocks[${index}].config.whatsappNumber`, "Configure um destino WhatsApp válido; este bloco ainda não envia leads por e-mail/CRM.");
    }
    if (["pricing_tables_clean", "pricing_three_tiers"].includes(block.type)) {
      const tiers = Array.isArray(block.config?.tiers) ? block.config.tiers : [];
      if (tiers.length === 0) {
        addFinding(findings, "CONTENT_PRICING_EMPTY", "content", "error", `blocks[${index}].config.tiers`, "Adicione planos reais ou remova a seção de pricing antes de publicar.");
      } else {
        tiers.forEach((tier, tierIndex) => {
          const tierConfig = tier && typeof tier === "object" ? tier as Record<string, unknown> : {};
          const target = typeof tierConfig.ctaHref === "string" ? tierConfig.ctaHref.trim() : typeof tierConfig.href === "string" ? tierConfig.href.trim() : "";
          if (!target) addFinding(findings, "CONTENT_PRICING_CTA_MISSING", "content", "error", `blocks[${index}].config.tiers[${tierIndex}].ctaHref`, "Configure um destino CTA seguro para este plano; a publicação não redireciona para uma rota genérica do workspace.");
        });
        addFinding(findings, "CONTENT_PRICING_REVIEW", "content", "warning", `blocks[${index}].config.tiers`, "Revise preço, periodicidade, condições e política de reembolso com dados atuais do negócio.");
      }
    }
  });
}

function auditSectionAnchors(blocks: OmniBlockInstance[], findings: TemplateAuditFinding[]) {
  const anchors = new Set<string>();
  blocks.forEach((block, index) => {
    const anchor = (block as any).sectionAnchorId;
    if (typeof anchor !== "string" || !anchor) return;
    if (anchors.has(anchor)) addFinding(findings, "LINK_DUPLICATE_SECTION_ANCHOR", "accessibility", "error", `blocks[${index}].sectionAnchorId`, `Âncora duplicada: ${anchor}.`);
    anchors.add(anchor);
  });
  if (anchors.size === 0) return;

  const visit = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = `${path}.${key}`;
      if (key.toLowerCase() === "href" && typeof child === "string" && child.startsWith("#") && child !== "#" && !anchors.has(child.slice(1))) {
        addFinding(findings, "LINK_BROKEN_SECTION_ANCHOR", "accessibility", "error", childPath, `O CTA aponta para a âncora inexistente ${child}.`);
      } else visit(child, childPath);
    }
  };
  blocks.forEach((block, index) => visit(block.config, `blocks[${index}].config`));
}

function auditBlockAccessibility(block: OmniBlockInstance, index: number, findings: TemplateAuditFinding[]) {
  const config = block.config ?? {};
  const path = `blocks[${index}]`;
  const images: Array<{ path: string; url: string; owner: Record<string, unknown> }> = [];
  collectImageReferences(config, `${path}.config`, images);
  for (const image of images) {
    if (!requiredAltText(image.owner)) addFinding(findings, "A11Y_IMAGE_ALT", "accessibility", "error", image.path, "Imagem não decorativa sem texto alternativo. Adicione alt descritivo ou marque explicitamente como decorativa.");
  }

  auditActionNames(config, `${path}.config`, findings);

  const title = config.title ?? config.sectionTitle;
  if (typeof title === "string" && title.length > 120) addFinding(findings, "A11Y_HEADING_LENGTH", "accessibility", "warning", `${path}.config.title`, "Título muito longo; revise a hierarquia e a leitura em telas pequenas.");
  const styling = block.styling;
  if (styling?.textColor && styling.backgroundColor) {
    const ratio = contrastRatio(styling.textColor, styling.backgroundColor);
    if (ratio !== null && ratio < CONTRAST_TEXT_THRESHOLD) addFinding(findings, "A11Y_COLOR_CONTRAST", "accessibility", "error", `${path}.styling`, `Contraste estimado ${ratio.toFixed(2)}:1; o mínimo para texto normal é ${CONTRAST_TEXT_THRESHOLD}:1.`);
    else if (ratio === null) addFinding(findings, "A11Y_COLOR_CONTRAST_UNVERIFIED", "accessibility", "warning", `${path}.styling`, "Contraste não pôde ser calculado automaticamente para as cores informadas.");
  }
  if (styling?.scrollAnimation && styling.scrollAnimation !== "none" && (styling.animationDelayMs ?? 0) > 1000) addFinding(findings, "A11Y_MOTION_DELAY", "accessibility", "warning", `${path}.styling.animationDelayMs`, "Animação com atraso acima de 1 segundo pode atrasar a descoberta do conteúdo; reduza ou remova o atraso.");
}

function auditLicenses(blocks: OmniBlockInstance[], findings: TemplateAuditFinding[]) {
  const imageReferences: Array<{ path: string; url: string; owner: Record<string, unknown> }> = [];
  blocks.forEach((block, index) => collectImageReferences(block.config, `blocks[${index}].config`, imageReferences));
  for (const image of imageReferences) {
    if (/^(?:data|blob):/i.test(image.url)) {
      addFinding(findings, "LICENSE_EPHEMERAL_IMAGE", "license", "error", image.path, "Imagem data:/blob: não é um asset durável com provenance verificável; envie pelo Asset Manager ou selecione uma fonte aprovada.");
      continue;
    }
    if (!isExternal(image.url)) {
      addFinding(findings, "LICENSE_LOCAL_ASSET_UNVERIFIED", "license", "warning", image.path, "Asset local/inline sem metadados de licença vinculados; confirme direitos no Asset Manager.");
      continue;
    }
    const blockIndex = Number(image.path.match(/^blocks\[(\d+)\]/)?.[1]);
    const matchingAsset = (blocks[blockIndex]?.assetRefs ?? []).find((asset) => assetMatchesUrl(asset, image.url));
    if (!matchingAsset) addFinding(findings, "LICENSE_PROVENANCE_MISSING", "license", "error", image.path, "Imagem remota sem referência de asset vinculada. Registre fornecedor, origem, autoria e licença antes da publicação.");
    else if (isUnsplashImageUrl(image.url) && matchingAsset.provider !== "unsplash") addFinding(findings, "LICENSE_PROVIDER_MISMATCH", "license", "error", image.path, "URL images.unsplash.com precisa corresponder a um asset Unsplash verificado; não pode ser rotulada como upload/user.");
    else if (!isAssetPublicationReady(matchingAsset)) addFinding(findings, "LICENSE_NOT_PUBLICATION_READY", "license", "error", image.path, "Provenance/licença incompleta para publicação; mantenha o template como rascunho até completar os metadados.");
  }
  blocks.forEach((block, index) => (block.assetRefs ?? []).forEach((asset) => {
    if (!isAssetPublicationReady(asset)) addFinding(findings, "LICENSE_ASSET_REF_INCOMPLETE", "license", "error", `blocks[${index}].assetRefs.${asset.asset_id}`, "Referência de asset não atende à política mínima de publicação.");
  }));
}

function auditPerformance(blocks: OmniBlockInstance[], serializedBytes: number, thresholds: StudioAuditThresholds, findings: TemplateAuditFinding[]) {
  if (blocks.length > thresholds.maxBlocks) addFinding(findings, "PERF_BLOCK_BUDGET", "performance", "error", "blocks", `${blocks.length} blocos excedem o orçamento estático de ${thresholds.maxBlocks}.`);
  if (serializedBytes > thresholds.maxSerializedBytes) addFinding(findings, "PERF_DOCUMENT_BYTES", "performance", "error", "document", `JSON do template (${serializedBytes} bytes) excede o orçamento de ${thresholds.maxSerializedBytes} bytes.`);
  const imageReferences: Array<{ path: string; url: string; owner: Record<string, unknown> }> = [];
  blocks.forEach((block, index) => collectImageReferences(block.config, `blocks[${index}].config`, imageReferences));
  const externalImages = imageReferences.filter((image) => isExternal(image.url));
  if (imageReferences.length > thresholds.maxImageReferences) addFinding(findings, "PERF_IMAGE_COUNT", "performance", "warning", "blocks", `${imageReferences.length} referências de imagem elevam o custo potencial de carregamento (limite recomendado ${thresholds.maxImageReferences}).`);
  if (externalImages.length > thresholds.maxExternalImageReferences) addFinding(findings, "PERF_REMOTE_IMAGE_COUNT", "performance", "warning", "blocks", `${externalImages.length} imagens remotas podem aumentar a latência e dependência de terceiros.`);
  const assets = blocks.flatMap((block) => block.assetRefs ?? []);
  const knownRemoteBytes = assets.filter((asset) => isExternal(asset.source_url ?? "")).reduce((total, asset) => total + (asset.byte_size ?? 0), 0);
  if (knownRemoteBytes > thresholds.maxRemoteAssetBytes) addFinding(findings, "PERF_REMOTE_ASSET_BYTES", "performance", "error", "assets", `Assets remotos conhecidos somam ${knownRemoteBytes} bytes; o orçamento é ${thresholds.maxRemoteAssetBytes} bytes.`);
  if (externalImages.some((image) => !assets.some((asset) => assetMatchesUrl(asset, image.url) && typeof asset.byte_size === "number"))) addFinding(findings, "PERF_ASSET_SIZE_UNKNOWN", "performance", "warning", "assets", "Há imagem remota sem byte_size. O orçamento binário real exige metadados ou medição Lighthouse/telemetria.");
}

const LIMITATIONS = [
  "Auditoria de performance é estática: não executa navegador, rede, Lighthouse nem mede LCP/INP/CLS/TTFB.",
  "Contraste só é calculado quando foreground e background são cores hex opacas explícitas; gradientes e imagens exigem revisão visual.",
  "Metadados fornecidos pelo usuário/provedor são evidência de provenance, não uma opinião jurídica sobre licença.",
];

function summarize(templateId: string, templateName: string, blocks: OmniBlockInstance[], serializedBytes: number, findings: TemplateAuditFinding[]): TemplateAuditResult {
  const imageReferences: Array<{ path: string; url: string; owner: Record<string, unknown> }> = [];
  blocks.forEach((block, index) => collectImageReferences(block.config, `blocks[${index}].config`, imageReferences));
  const externalImageReferences = imageReferences.filter((image) => isExternal(image.url)).length;
  const assetsWithProvenance = blocks.flatMap((block) => block.assetRefs ?? []).filter(isAssetPublicationReady).length;
  const hasErrors = findings.some((finding) => finding.severity === "error");
  const hasWarnings = findings.some((finding) => finding.severity === "warning");
  const score = Math.max(0, 100 - findings.reduce((penalty, finding) => penalty + (finding.severity === "error" ? 20 : finding.severity === "warning" ? 5 : 0), 0));
  return {
    templateId, templateName, status: hasErrors ? "fail" : hasWarnings ? "warn" : "pass", score, findings,
    metrics: { blockCount: blocks.length, serializedBytes, imageReferences: imageReferences.length, externalImageReferences, assetsWithProvenance },
    limitations: LIMITATIONS,
  };
}

export function auditStudioTemplate(
  template: StudioAuditTemplate,
  options: { thresholds?: Partial<StudioAuditThresholds>; theme?: OmniPageDocument["theme"] } = {},
): TemplateAuditResult {
  const thresholds = { ...DEFAULT_STUDIO_AUDIT_THRESHOLDS, ...options.thresholds };
  const blocks = template.blocks as OmniBlockInstance[];
  const serializedBytes = new TextEncoder().encode(JSON.stringify({ id: template.id, blocks })).byteLength;
  const findings: TemplateAuditFinding[] = [];
  auditLicenses(blocks, findings);
  auditContentIntegrity(blocks, findings);
  auditSafeNavigationLinks(blocks, findings);
  auditSectionAnchors(blocks, findings);
  blocks.forEach((block, index) => auditBlockAccessibility(block, index, findings));
  auditPerformance(blocks, serializedBytes, thresholds, findings);
  if (options.theme?.textColor && options.theme.backgroundColor) {
    const ratio = contrastRatio(options.theme.textColor, options.theme.backgroundColor);
    if (ratio !== null && ratio < CONTRAST_TEXT_THRESHOLD) addFinding(findings, "A11Y_THEME_CONTRAST", "accessibility", "error", "theme", `Contraste do tema ${ratio.toFixed(2)}:1 abaixo de ${CONTRAST_TEXT_THRESHOLD}:1.`);
  }
  return summarize(template.id, template.name, blocks, serializedBytes, findings);
}

export function auditOmniDocument(document: OmniPageDocument, thresholds?: Partial<StudioAuditThresholds>): TemplateAuditResult {
  return auditStudioTemplate({ id: document.id ?? document.page_id, name: document.title, blocks: document.blocks }, { thresholds, theme: document.theme });
}

export function getPublicationBlockingFindings(result: TemplateAuditResult): TemplateAuditFinding[] {
  return result.findings.filter((finding) => finding.severity === "error");
}

export function auditAllStudioTemplates(templates: StudioAuditTemplate[] = STUDIO_TEMPLATE_CATALOG): {
  generatedAt: string;
  summary: { total: number; passed: number; warnings: number; failed: number; reviewRequired: number; publishableFailed: number };
  templates: TemplateAuditResult[];
} {
  const results = templates.map((template) => auditStudioTemplate(template));
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter((result) => result.status === "pass").length,
      warnings: results.filter((result) => result.status === "warn").length,
      failed: results.filter((result) => result.status === "fail").length,
      reviewRequired: templates.filter((template) => "status" in template && template.status === "review_required").length,
      publishableFailed: results.filter((result) => result.status === "fail" && templates.some((template) => template.id === result.templateId && template.status === "ready")).length,
    },
    templates: results,
  };
}
