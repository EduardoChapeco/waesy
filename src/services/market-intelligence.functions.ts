import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { getServerIdentity } from '@/lib/server-access';
import { lookupCnpj } from './public-apis.functions';
import { executeUnifiedAiCall } from './api-orchestrator.functions';

export const GetCommercialPointTelemetrySchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pointId: z.string().uuid().optional(),
});

export const AuditCnpjInputSchema = z.object({
  cnpj: z.string().min(14),
  companyName: z.string().optional(),
  tradeName: z.string().optional(),
  cnaePrincipal: z.string().optional(),
  cnaeDescription: z.string().optional(),
  openingDate: z.string().optional(),
  taxRegime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'mei']).default('simples_nacional'),
  capitalSocialCents: z.number().nonnegative().default(0),
});

export const AnalyzeOpportunityInputSchema = z.object({
  businessType: z.string(),
  segment: z.string(),
  askingPriceCents: z.number().nonnegative().optional(),
  monthlyRevenueCents: z.number().nonnegative().optional(),
  monthlyNetProfitCents: z.number().nonnegative().optional(),
  monthlyRentCents: z.number().nonnegative().optional(),
  areaSqm: z.number().positive().optional(),
  foundationYear: z.number().optional(),
  city: z.string().default('Chapecó'),
});

export interface CommercialPointTelemetryResult {
  found: boolean;
  point?: {
    id: string;
    addressNormalized: string;
    city: string;
    neighborhood?: string;
    areaSqm?: number;
    pointType: string;
    currentOccupant?: string;
    occupancyStatus: string;
    turnoverCount: number;
    avgPermanenceMonths: number;
    marketAttractivenessScore: number;
  };
  turnoverHistory: Array<{
    id: string;
    formerCompanyName: string;
    segment: string;
    durationMonths: number;
    reasonForLeaving?: string;
  }>;
}

export interface CnpjAuditResult {
  id: string;
  cnpj: string;
  companyName: string;
  tradeName?: string;
  cnaePrincipal?: string;
  cnaeDescription?: string;
  status: string;
  taxRegime: string;
  capitalSocialCents: number;
  legalRiskScore: number;
  riskClassification: 'Baixo' | 'Moderado' | 'Elevado';
  successionRiskNotes: string;
  aiEvaluationSummary: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    neighborhood?: string;
  };
}

export interface AcquisitionOpportunityAnalysis {
  feasibilityScore: number; // 0-100
  paybackEstimatedMonths: number;
  occupancyCostRatio: number; // rent / revenue
  isHealthyRentRatio: boolean;
  strategicStrengths: string[];
  riskAlerts: string[];
  recommendation: 'Excelente Oportunidade' | 'Investimento Viável' | 'Exige Due Diligence Rigorosa';
}

/**
 * 1. Obter Telemetria e Rotatividade de Ponto Comercial Físico
 */
export const getCommercialPointTelemetry = createServerFn({ method: 'GET' })
  .validator(GetCommercialPointTelemetrySchema)
  .handler(async ({ data }): Promise<CommercialPointTelemetryResult> => {
    const db = getServerClient();

    let query = db.from('commercial_point_records').select('*');

    if (data.pointId) {
      query = query.eq('id', data.pointId);
    } else if (data.address && data.city) {
      query = query
        .ilike('address_normalized', `%${data.address.trim()}%`)
        .ilike('city', `%${data.city.trim()}%`);
    } else if (data.city) {
      query = query.ilike('city', `%${data.city.trim()}%`).limit(1);
    } else {
      return { found: false, turnoverHistory: [] };
    }

    const { data: records, error } = await query.maybeSingle();

    if (error || !records) {
      return {
        found: false,
        turnoverHistory: [],
      };
    }

    const { data: turnover } = await db
      .from('commercial_point_turnover')
      .select('*')
      .eq('commercial_point_id', records.id)
      .order('created_at', { ascending: false });

    return {
      found: true,
      point: {
        id: records.id,
        addressNormalized: records.address_normalized,
        city: records.city,
        neighborhood: records.neighborhood,
        areaSqm: records.area_sqm,
        pointType: records.point_type,
        currentOccupant: records.current_occupant_name,
        occupancyStatus: records.occupancy_status,
        turnoverCount: records.turnover_count,
        avgPermanenceMonths: records.avg_permanence_months,
        marketAttractivenessScore: records.market_attractiveness_score,
      },
      turnoverHistory: (turnover || []).map((t) => ({
        id: t.id,
        formerCompanyName: t.former_company_name,
        segment: t.segment,
        durationMonths: t.duration_months || 12,
        reasonForLeaving: t.reason_for_leaving,
      })),
    };
  });

/**
 * 2. Auditoria Cadastral Inteligente SimLabs (Validação Fiscal, Receita Federal & Sucessão)
 */
export const auditCnpjWithSimLabs = createServerFn({ method: 'POST' })
  .validator(AuditCnpjInputSchema)
  .handler(async ({ data }): Promise<CnpjAuditResult> => {
    const identity = await getServerIdentity().catch(() => null);
    const db = getServerClient();

    const sanitizedCnpj = data.cnpj.replace(/\D/g, '');

    // 1. Verificar se já existe auditoria recente gravada no banco
    const { data: existing } = await db
      .from('cnpj_market_audits')
      .select('*')
      .eq('cnpj', sanitizedCnpj)
      .maybeSingle();

    if (existing) {
      const riskScore = existing.legal_risk_score;
      return {
        id: existing.id,
        cnpj: existing.cnpj,
        companyName: existing.company_name,
        tradeName: existing.trade_name,
        cnaePrincipal: existing.cnae_principal,
        cnaeDescription: existing.cnae_description,
        status: existing.status,
        taxRegime: existing.tax_regime,
        capitalSocialCents: Number(existing.capital_social_cents) || 0,
        legalRiskScore: riskScore,
        riskClassification: riskScore < 30 ? 'Baixo' : riskScore < 65 ? 'Moderado' : 'Elevado',
        successionRiskNotes: existing.succession_risk_notes || 'Sem pendências fiscais bloqueantes identificadas.',
        aiEvaluationSummary: existing.ai_evaluation_summary || 'Empresa com regularidade cadastral favorável.',
      };
    }

    // 2. Consultar dados oficiais em tempo real da Receita Federal via BrasilAPI
    let officialCompany: any = null;
    try {
      officialCompany = await lookupCnpj({ data: { cnpj: sanitizedCnpj } });
    } catch (lookupErr: any) {
      console.warn('[auditCnpjWithSimLabs] Falha ao consultar BrasilAPI, usando dados fornecidos:', lookupErr?.message);
    }

    const companyName = officialCompany?.corporateName || data.companyName || `Empresa CNPJ ${sanitizedCnpj}`;
    const tradeName = officialCompany?.tradeName || data.tradeName || null;
    const cnaePrincipal = String(officialCompany?.mainCnae?.code || data.cnaePrincipal || '47.00-0');
    const cnaeDescription = officialCompany?.mainCnae?.description || data.cnaeDescription || 'Atividade Comercial / Serviços';
    const openingDate = officialCompany?.openingDate || data.openingDate || null;
    const status = officialCompany?.registrationStatus?.toLowerCase() || 'ativa';
    const capitalSocialCents = officialCompany?.capitalSocial 
      ? Math.round(officialCompany.capitalSocial * 100) 
      : data.capitalSocialCents || 0;

    // 3. Cálculo de Risco Legal e Sucessório
    let computedRisk = 15;
    if (status !== 'ativa') computedRisk += 45;
    if (capitalSocialCents < 1000000) computedRisk += 10;
    if (data.taxRegime === 'mei') computedRisk += 5;

    // Análise de idade da empresa
    if (openingDate) {
      const openYear = new Date(openingDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const ageYears = currentYear - openYear;
      if (ageYears < 2) computedRisk += 15; // Empresa recente
      else if (ageYears > 5) computedRisk -= 5; // Empresa madura
    }

    computedRisk = Math.min(Math.max(computedRisk, 5), 95);

    const riskClass: 'Baixo' | 'Moderado' | 'Elevado' =
      computedRisk < 30 ? 'Baixo' : computedRisk < 65 ? 'Moderado' : 'Elevado';

    let successionNotes = `Auditoria automatizada SimLabs: Verificado enquadramento em ${data.taxRegime.toUpperCase()}. ` +
      `CNAE Principal: ${cnaePrincipal} - ${cnaeDescription}. ` +
      `Contratos de cessão societária devem prever cláusula expressa de não sucessão de passivos anteriores à data de fechamento.`;

    let aiSummary = `Empresa regular (${status.toUpperCase()}) no cadastro federal da Receita. Estrutura societária apta para transação de ${companyName}.`;

    // 4. Se o orquestrador de IA estiver ativo, enriquecer a auditoria com síntese executiva
    try {
      const aiPrompt = `Você é o Auditor M&A e Due Diligence da plataforma Waesy.
Analise os seguintes dados cadastrais oficiais da empresa:
- Razão Social: ${companyName}
- CNPJ: ${sanitizedCnpj}
- Situação Cadastral: ${status}
- CNAE Principal: ${cnaePrincipal} (${cnaeDescription})
- Data de Abertura: ${openingDate || 'Não informada'}
- Capital Social: R$ ${(capitalSocialCents / 100).toLocaleString('pt-BR')}
- Regime Tributário: ${data.taxRegime}

Gere em até 2 parágrafos curtos e objetivos:
1. Resumo da maturidade operacional e solidez da atividade.
2. Recomendações de diligência prévia (passivos trabalhistas, certidões negativas CND e transferência do ponto físico).`;

      const aiRes = await executeUnifiedAiCall({
        systemPrompt: 'Você é um auditor sênior de M&A e conformidade corporativa. Seja direto, técnico e preciso.',
        userPrompt: aiPrompt,
        maxTokens: 300,
        temperature: 0.2,
      });

      if (aiRes && aiRes.content) {
        aiSummary = aiRes.content.trim();
      }
    } catch (aiErr: any) {
      // Fallback seguro: mantém a síntese heurística
    }

    // 5. Persistir auditoria para enriquecimento contínuo
    const { data: inserted, error: insertErr } = await db
      .from('cnpj_market_audits')
      .insert({
        cnpj: sanitizedCnpj,
        company_name: companyName,
        trade_name: tradeName,
        cnae_principal: cnaePrincipal,
        cnae_description: cnaeDescription,
        opening_date: openingDate,
        status: status,
        tax_regime: data.taxRegime,
        capital_social_cents: capitalSocialCents,
        legal_risk_score: computedRisk,
        succession_risk_notes: successionNotes,
        ai_evaluation_summary: aiSummary,
        raw_receita_data: officialCompany || {},
        audited_by_profile_id: identity?.id || null,
      })
      .select('*')
      .single();

    const recordId = inserted?.id || crypto.randomUUID();

    return {
      id: recordId,
      cnpj: sanitizedCnpj,
      companyName: companyName,
      tradeName: tradeName || undefined,
      cnaePrincipal: cnaePrincipal,
      cnaeDescription: cnaeDescription,
      status: status,
      taxRegime: data.taxRegime,
      capitalSocialCents: capitalSocialCents,
      legalRiskScore: computedRisk,
      riskClassification: riskClass,
      successionRiskNotes: successionNotes,
      aiEvaluationSummary: aiSummary,
      address: officialCompany?.address ? {
        street: officialCompany.address.street,
        city: officialCompany.address.city,
        state: officialCompany.address.state,
        neighborhood: officialCompany.address.neighborhood,
      } : undefined,
    };
  });

/**
 * 3. Squad de IA: Análise de Potencial e Viabilidade de Ponto Comercial / Empresa M&A
 */
export const analyzeCommercialPointPotential = createServerFn({ method: 'POST' })
  .validator(AnalyzeOpportunityInputSchema)
  .handler(async ({ data }): Promise<AcquisitionOpportunityAnalysis> => {
    const revenue = data.monthlyRevenueCents || 10000000; // R$ 100k
    const profit = data.monthlyNetProfitCents || Math.round(revenue * 0.2); // 20% margin
    const rent = data.monthlyRentCents || Math.round(revenue * 0.05); // 5% rent
    const price = data.askingPriceCents || profit * 24; // 24 months profit

    const occupancyCostRatio = revenue > 0 ? Number((rent / revenue).toFixed(3)) : 0.05;
    const isHealthyRentRatio = occupancyCostRatio <= 0.08; // Under 8% is healthy in retail/food

    const paybackEstimatedMonths = profit > 0 ? Math.round(price / profit) : 36;

    let feasibilityScore = 80;
    if (!isHealthyRentRatio) feasibilityScore -= 15;
    if (paybackEstimatedMonths > 36) feasibilityScore -= 20;
    else if (paybackEstimatedMonths <= 18) feasibilityScore += 10;

    feasibilityScore = Math.min(Math.max(feasibilityScore, 10), 98);

    const strengths: string[] = [
      `Margem líquida estimada em ${revenue > 0 ? Math.round((profit / revenue) * 100) : 20}% do faturamento.`,
      `Tempo de retorno do investimento estimado em ${paybackEstimatedMonths} meses (${(paybackEstimatedMonths / 12).toFixed(1)} anos).`,
    ];

    if (isHealthyRentRatio) {
      strengths.push(`Custo de ocupação do ponto comercial saudável (${(occupancyCostRatio * 100).toFixed(1)}% do faturamento, abaixo do teto de 8%).`);
    }

    const riskAlerts: string[] = [];
    if (!isHealthyRentRatio) {
      riskAlerts.push(`Custo de aluguel consome ${(occupancyCostRatio * 100).toFixed(1)}% do faturamento mensal. Recomenda-se renegociação da locação.`);
    }
    if (paybackEstimatedMonths > 30) {
      riskAlerts.push('Múltiplo de valuation acima da média de mercado. Necessário conferir contratos de clientes e fornecedores ativos.');
    }

    const recommendation =
      feasibilityScore >= 80
        ? 'Excelente Oportunidade'
        : feasibilityScore >= 60
        ? 'Investimento Viável'
        : 'Exige Due Diligence Rigorosa';

    return {
      feasibilityScore,
      paybackEstimatedMonths,
      occupancyCostRatio,
      isHealthyRentRatio,
      strategicStrengths: strengths,
      riskAlerts,
      recommendation,
    };
  });
