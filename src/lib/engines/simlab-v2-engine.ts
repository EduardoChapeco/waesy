/**
 * Waesy SimLab V2 Engine
 * Simulador de Personas Sintéticas, Análise de Elasticidade de Preço e Testes de Mercado com IA.
 */

export interface SyntheticPersonaV2 {
 id: string;
 name: string;
 avatarUrl: string | null;
 age: number;
 socioeconomicClass: 'A' | 'B' | 'C' | 'D';
 occupation: string;
 monthlyIncomeBrl: number;
 location: string;
 preferredNiches: string[];
 personalityTraits: string[];
 priceSensitivity: 'alta' | 'moderada' | 'baixa';
 techSavvy: 'baixo' | 'medio' | 'alto';
 corePainPoints: string[];
 keyPurchasingTriggers: string[];
}

export const SYNTHETIC_PERSONAS_CATALOG: SyntheticPersonaV2[] = [
 {
 id: 'persona-lucas-genz',
 name: 'Lucas Rocha',
 avatarUrl: null,
 age: 22,
 socioeconomicClass: 'C',
 occupation: 'Estudante de Publicidade e Estagiário',
 monthlyIncomeBrl: 1800,
 location: 'São Paulo - SP',
 preferredNiches: ['eventos', 'gastronomia', 'moda', 'musica'],
 personalityTraits: ['Espontâneo', 'Conectado', 'Impulsivo', 'Sociável'],
 priceSensitivity: 'alta',
 techSavvy: 'alto',
 corePainPoints: ['Falta de grana no fim do mês', 'Taxas de conveniência abusivas', 'Apps lentos'],
 keyPurchasingTriggers: ['Desconto no PIX', 'Lineup com amigos', 'Combo promocional'],
 },
 {
 id: 'persona-mariana-familia',
 name: 'Mariana Silveira',
 avatarUrl: null,
 age: 38,
 socioeconomicClass: 'B',
 occupation: 'Gerente de Recursos Humanos',
 monthlyIncomeBrl: 8500,
 location: 'Campinas - SP',
 preferredNiches: ['gastronomia', 'turismo', 'servicos', 'varejo'],
 personalityTraits: ['Pragmática', 'Protetora', 'Planejadora', 'Exigente'],
 priceSensitivity: 'moderada',
 techSavvy: 'medio',
 corePainPoints: ['Falta de tempo', 'Locais barulhentos sem espaço kids', 'Cancelamentos sem aviso'],
 keyPurchasingTriggers: ['Ambiente familiar', 'Estacionamento no local', 'Parcelamento sem juros'],
 },
 {
 id: 'persona-ricardo-premium',
 name: 'Dr. Ricardo Antunes',
 avatarUrl: null,
 age: 49,
 socioeconomicClass: 'A',
 occupation: 'Cirurgião Dentista e Investidor',
 monthlyIncomeBrl: 32000,
 location: 'Curitiba - PR',
 preferredNiches: ['turismo', 'gastronomia', 'juridico', 'eventos'],
 personalityTraits: ['Sofisticado', 'Exigente', 'Racional', 'Valoriza Exclusividade'],
 priceSensitivity: 'baixa',
 techSavvy: 'medio',
 corePainPoints: ['Atendimento amador', 'Filas', 'Produtos de baixa durabilidade'],
 keyPurchasingTriggers: ['Área VIP reservada', 'Carta de vinhos selecionada', 'Concierge personalizado'],
 },
 {
 id: 'persona-claudia-maturidade',
 name: 'Dona Cláudia Mendes',
 avatarUrl: null,
 age: 64,
 socioeconomicClass: 'C',
 occupation: 'Professora Aposentada',
 monthlyIncomeBrl: 4200,
 location: 'Belo Horizonte - MG',
 preferredNiches: ['turismo', 'eventos', 'gastronomia', 'servicos'],
 personalityTraits: ['Tradicional', 'Comunicativa', 'Cautelosa', 'Afetuosa'],
 priceSensitivity: 'moderada',
 techSavvy: 'baixo',
 corePainPoints: ['Dificuldade com telas complexas', 'Medo de golpes online', 'Escadas e falta de acessibilidade'],
 keyPurchasingTriggers: ['Atendimento por WhatsApp com pessoa real', 'Passeios diurnos com guia', 'Nota fiscal garantida'],
 },
 {
 id: 'persona-felipe-b2b',
 name: 'Felipe Barreto',
 avatarUrl: null,
 age: 34,
 socioeconomicClass: 'B',
 occupation: 'Proprietário de Hamburgueria Artesanal',
 monthlyIncomeBrl: 14000,
 location: 'Florianópolis - SC',
 preferredNiches: ['varejo', 'servicos', 'gastronomia'],
 personalityTraits: ['Focado em Métricas', 'Ágil', 'Negociador', 'Workaholic'],
 priceSensitivity: 'moderada',
 techSavvy: 'alto',
 corePainPoints: ['Ruptura de estoque', 'Fornecedores atrasados', 'Sistemas PDV que travam no sábado à noite'],
 keyPurchasingTriggers: ['Garantia de entrega em 24h', 'Preço no atacado', 'Integração direta com ERP'],
 },
];

export interface SimLabSimulationRequest {
 title: string;
 description: string;
 priceCents: number;
 niche: string;
 category?: string;
 targetAudienceHint?: string;
}

export interface PersonaSimulationEvaluation {
 persona: SyntheticPersonaV2;
 affinityScore: number; // 0-100
 willConvert: boolean;
 conversionProbabilityPct: number;
 sentiment: 'entusiasmado' | 'favoravel' | 'neutro' | 'cético' | 'rejeitado';
 quote: string;
 mainObjection?: string;
 triggerActivated?: string;
}

export interface SimLabSimulationOutput {
 overallScore: number; // 0-100
 estimatedConversionRatePct: number;
 priceElasticityScore: number; // 0-100
 totalPersonasSimulated: number;
 conversionCount: number;
 evaluations: PersonaSimulationEvaluation[];
 topObjections: string[];
 actionableInsights: string[];
 executiveSummary: string;
}

export class SimLabV2Engine {
 /**
 * Executa a simulação estocástica de mercado com base no catálogo calibrado de personas.
 */
 public static simulateOffer(request: SimLabSimulationRequest): SimLabSimulationOutput {
 const priceBrl = request.priceCents / 100;
 const titleLower = request.title.toLowerCase();
 const descLower = request.description.toLowerCase();

 const evaluations: PersonaSimulationEvaluation[] = SYNTHETIC_PERSONAS_CATALOG.map((persona) => {
 let affinity = 50;

 // 1. Afinidade de Nicho
 if (persona.preferredNiches.includes(request.niche.toLowerCase())) {
 affinity += 20;
 }

 // 2. Análise de Renda vs Preço
 const monthlyBudgetShare = (priceBrl / persona.monthlyIncomeBrl) * 100;

 if (persona.priceSensitivity === 'alta' && monthlyBudgetShare > 15) {
 affinity -= 35;
 } else if (persona.priceSensitivity === 'alta' && monthlyBudgetShare <= 5) {
 affinity += 15;
 }

 if (persona.priceSensitivity === 'baixa') {
 affinity += 15; // Não se intimida com ticket alto
 }

 // 3. Gatilhos Semânticos no Título/Descrição
 let triggerFound: string | undefined;
 for (const trigger of persona.keyPurchasingTriggers) {
 if (titleLower.includes(trigger.toLowerCase()) || descLower.includes(trigger.toLowerCase())) {
 affinity += 15;
 triggerFound = trigger;
 break;
 }
 }

 // Normalizar 0 a 100
 const finalAffinity = Math.max(5, Math.min(95, affinity));
 const willConvert = finalAffinity >= 60;
 const conversionProb = willConvert ? Math.round(finalAffinity * 0.9) : Math.round(finalAffinity * 0.4);

 let sentiment: PersonaSimulationEvaluation['sentiment'] = 'neutro';
 if (finalAffinity >= 80) sentiment = 'entusiasmado';
 else if (finalAffinity >= 60) sentiment = 'favoravel';
 else if (finalAffinity >= 40) sentiment = 'neutro';
 else if (finalAffinity >= 25) sentiment = 'cético';
 else sentiment = 'rejeitado';

 // Geração de Citações e Objeções Realistas
 let quote = `Achei a proposta interessante, mas preciso avaliar o custo-benefício.`;
 let objection: string | undefined;

 if (sentiment === 'entusiasmado') {
 quote = `Excelente proposta! Era exatamente o que eu estava procurando para ${request.niche}.`;
 } else if (sentiment === 'favoravel') {
 quote = `Gostei do formato e do valor. Se tiver facilidade de pagamento, fecho na hora.`;
 } else if (sentiment === 'cético' || sentiment === 'rejeitado') {
 objection = persona.priceSensitivity === 'alta' && priceBrl > 100
 ? 'Preço muito alto para o meu orçamento mensal.'
 : `Não vejo clareza de valor ou garantia para ${persona.occupation}.`;
 quote = `Para mim não faz sentido neste momento: ${objection}`;
 }

 return {
 persona,
 affinityScore: finalAffinity,
 willConvert,
 conversionProbabilityPct: conversionProb,
 sentiment,
 quote,
 mainObjection: objection,
 triggerActivated: triggerFound,
 };
 });

 const conversionCount = evaluations.filter((e) => e.willConvert).length;
 const overallScore = Math.round(
 evaluations.reduce((acc, curr) => acc + curr.affinityScore, 0) / evaluations.length
 );
 const estimatedConversionRatePct = Math.round((conversionCount / evaluations.length) * 100);

 const objections = evaluations
 .map((e) => e.mainObjection)
 .filter((obj): obj is string => Boolean(obj));

 const insights: string[] = [];
 if (estimatedConversionRatePct >= 60) {
 insights.push('A oferta possui excelente aderência multissegmento no ecossistema.');
 } else {
 insights.push('Considere incluir parcelamento sem juros ou desconto no PIX para reduzir atrito.');
 }
 if (priceBrl > 500) {
 insights.push('Para tickets mais altos, destaque certificados de garantia e depoimentos reais.');
 }

 return {
 overallScore,
 estimatedConversionRatePct,
 priceElasticityScore: Math.min(100, Math.round((100 - (priceBrl / 50)) + overallScore * 0.5)),
 totalPersonasSimulated: evaluations.length,
 conversionCount,
 evaluations,
 topObjections: Array.from(new Set(objections)),
 actionableInsights: insights,
 executiveSummary: `Simulação SimLab V2 concluída com score ${overallScore}/100 e taxa estimada de conversão de ${estimatedConversionRatePct}%.`,
 };
 }
}
