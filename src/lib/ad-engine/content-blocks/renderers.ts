/**
 * renderers.ts — Renderizadores Multicanais Canônicos de Conteúdo (G23)
 * 
 * Regra: Escrever uma vez, renderizar em todos (Web, Markdown, E-mail, Voucher, Contrato).
 * Todo renderizador público aplica a catraca de sanitização G24.
 */

import { CanonicalAdContent } from './types';
import { stripInternalContent, assertNoInternalLeaks } from './sanitizer';

/**
 * Renderiza o anúncio estruturado em formato Markdown limpo e universal
 */
export function renderToMarkdown(rawAd: CanonicalAdContent): string {
  const ad = stripInternalContent(rawAd);
  const { blocks, narrativeDescription } = ad;

  const lines: string[] = [];

  // B1: Identidade
  lines.push(`# ${blocks.b1_identity.title}`);
  if (blocks.b1_identity.subtitle) {
    lines.push(`_${blocks.b1_identity.subtitle}_\n`);
  }

  // B2: Proposta de Valor
  lines.push(`> ${blocks.b2_value_proposition.summaryLine}\n`);
  if (blocks.b2_value_proposition.highlights.length > 0) {
    for (const highlight of blocks.b2_value_proposition.highlights) {
      lines.push(`- **Destaque:** ${highlight}`);
    }
    lines.push('');
  }

  // Descrição Narrativa Sanitizada
  if (narrativeDescription) {
    lines.push('## Descrição');
    lines.push(`${narrativeDescription}\n`);
  }

  // B4: Especificações
  if (blocks.b4_specifications.specs.length > 0) {
    lines.push('## Especificações');
    for (const spec of blocks.b4_specifications.specs) {
      const unit = spec.unit ? ` ${spec.unit}` : '';
      lines.push(`- **${spec.label}:** ${spec.value}${unit}`);
    }
    lines.push('');
  }

  // B5: Inclusos e Exclusos
  if (blocks.b5_inclusions_exclusions.items.length > 0) {
    lines.push('## O que está incluso');
    for (const item of blocks.b5_inclusions_exclusions.items) {
      const mark = item.isIncluded ? '[x]' : '[ ]';
      const notes = item.notes ? ` (${item.notes})` : '';
      lines.push(`- ${mark} ${item.label}${notes}`);
    }
    lines.push('');
  }

  // B6: Condições Comerciais
  lines.push('## Condições Comerciais');
  lines.push(`- **Forma de Entrega:** ${blocks.b6_commercial_conditions.fulfillmentType}`);
  lines.push(`- **Meios de Pagamento:** ${blocks.b6_commercial_conditions.paymentMethods.join(', ')}`);
  if (blocks.b6_commercial_conditions.warrantyPeriodDays) {
    lines.push(`- **Garantia:** ${blocks.b6_commercial_conditions.warrantyPeriodDays} dias`);
  }
  lines.push('');

  // B7: Políticas
  lines.push('## Políticas de Cancelamento e Reembolso');
  lines.push(`- **Cancelamento:** ${blocks.b7_policies.cancellationPolicy}`);
  lines.push(`- **Reembolso:** ${blocks.b7_policies.refundPolicy}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Renderiza o anúncio em texto plano sem formatação (ideal para SMS, WhatsApp ou notificações push)
 */
export function renderToPlainText(rawAd: CanonicalAdContent): string {
  const md = renderToMarkdown(rawAd);
  return md
    .replace(/#+\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/_/g, '')
    .replace(/>\s/g, '')
    .trim();
}

/**
 * Renderiza o payload público seguro para consumo de Web, Apps e WebMCP (G24)
 */
export function renderToPublicJson(rawAd: CanonicalAdContent): CanonicalAdContent {
  const publicAd = stripInternalContent(rawAd);
  // Catraca obrigatória: lança erro se algum dado interno vazar
  assertNoInternalLeaks(publicAd);
  return publicAd;
}

/**
 * Renderiza o contexto canônico para emissão de Voucher de atendimento ou embarque
 */
export interface VoucherContext {
  title: string;
  category: string;
  summary: string;
  inclusions: string[];
  exclusions: string[];
  cancellationTerms: string;
  coverImage?: string;
  timestamp: string;
}

export function renderToVoucherContext(rawAd: CanonicalAdContent): VoucherContext {
  const ad = stripInternalContent(rawAd);

  const inclusions = ad.blocks.b5_inclusions_exclusions.items
    .filter((i) => i.isIncluded)
    .map((i) => i.label);

  const exclusions = ad.blocks.b5_inclusions_exclusions.items
    .filter((i) => !i.isIncluded)
    .map((i) => i.label);

  const coverItem = ad.blocks.b3_role_media.items.find((m) => m.role === 'cover');

  return {
    title: ad.blocks.b1_identity.title,
    category: ad.blocks.b1_identity.category,
    summary: ad.blocks.b2_value_proposition.summaryLine,
    inclusions,
    exclusions,
    cancellationTerms: ad.blocks.b7_policies.cancellationPolicy,
    coverImage: coverItem ? coverItem.url : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Renderiza o contexto canônico para elaboração de Minuta de Contrato
 */
export interface ContractContext {
  objectTitle: string;
  objectCategory: string;
  specifications: Array<{ label: string; value: string }>;
  paymentTerms: string;
  warrantyPeriodDays?: number;
  cancellationPolicy: string;
  jurisdictionDisclaimers: string[];
}

export function renderToContractContext(rawAd: CanonicalAdContent): ContractContext {
  const ad = stripInternalContent(rawAd);

  const specifications = ad.blocks.b4_specifications.specs.map((s) => ({
    label: s.label,
    value: `${s.value}${s.unit ? ' ' + s.unit : ''}`,
  }));

  const paymentTerms = `Aceita ${ad.blocks.b6_commercial_conditions.paymentMethods.join(', ')}. Modalidade: ${ad.blocks.b6_commercial_conditions.fulfillmentType}.`;

  return {
    objectTitle: ad.blocks.b1_identity.title,
    objectCategory: ad.blocks.b1_identity.category,
    specifications,
    paymentTerms,
    warrantyPeriodDays: ad.blocks.b6_commercial_conditions.warrantyPeriodDays,
    cancellationPolicy: ad.blocks.b7_policies.cancellationPolicy,
    jurisdictionDisclaimers: [
      'As partes elegem o foro da comarca de domicílio do consumidor para dirimir litígios oriundos deste instrumento.',
    ],
  };
}
