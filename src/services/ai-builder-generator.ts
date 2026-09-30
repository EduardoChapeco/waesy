import type { ExperienceNode, BlockType } from '@/lib/builder-types';

export interface GenerateExperienceOptions {
 niche?: 'varejo' | 'turismo' | 'gastronomia' | 'servicos' | 'imobiliario';
 storeName?: string;
 theme?: 'dark' | 'light';
}

function generateSimpleId(): string {
 return 'node_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

export function generateExperienceFromPrompt(
 prompt: string,
 options: GenerateExperienceOptions = {}
): Partial<ExperienceNode>[] {
 const cleanPrompt = prompt.toLowerCase();
 let niche = options.niche;

 if (!niche) {
 if (cleanPrompt.includes('viag') || cleanPrompt.includes('turism') || cleanPrompt.includes('voo') || cleanPrompt.includes('hotel')) {
 niche = 'turismo';
 } else if (cleanPrompt.includes('restaur') || cleanPrompt.includes('comida') || cleanPrompt.includes('cardapio') || cleanPrompt.includes('lanche')) {
 niche = 'gastronomia';
 } else if (cleanPrompt.includes('imovel') || cleanPrompt.includes('casa') || cleanPrompt.includes('apartam') || cleanPrompt.includes('imobil')) {
 niche = 'imobiliario';
 } else if (cleanPrompt.includes('consult') || cleanPrompt.includes('advoc') || cleanPrompt.includes('medic') || cleanPrompt.includes('servico')) {
 niche = 'servicos';
 } else {
 niche = 'varejo';
 }
 }

 const storeName = options.storeName || (niche === 'turismo' ? 'Destinos Incríveis' : niche === 'gastronomia' ? 'Bistrô & Sabor' : niche === 'imobiliario' ? 'Prime Imóveis' : niche === 'servicos' ? 'Apex Consultoria' : 'Loja Oficial');

 const nodes: Partial<ExperienceNode>[] = [];

 // Section 1: Hero
 const s1 = generateSimpleId();
 const c1 = generateSimpleId();
 nodes.push({
 id: s1,
 node_type: 'section',
 block_type: 'section',
 parent_id: null,
 sort_order: 0,
 design_tokens: {
 backgroundColor: options.theme === 'light' ? '#f8fafc' : '#0f172a',
 textColor: options.theme === 'light' ? '#0f172a' : '#ffffff',
 animation: { trigger: 'fade_up', speed: 'normal' },
 },
 });
 nodes.push({
 id: c1,
 node_type: 'container',
 block_type: 'container',
 parent_id: s1,
 sort_order: 0,
 layout_rules: { maxWidth: 'container', display: 'flex', flexDirection: 'col', gap: 'md' },
 });
 nodes.push({
 id: generateSimpleId(),
 node_type: 'composition',
 block_type: 'hero_carousel',
 parent_id: c1,
 sort_order: 0,
 content: {
 autoPlay: true,
 banners: [
 {
 title: `Bem-vindo à ${storeName}`,
 subtitle: `Experiências exclusivas criadas para surpreender você.`,
 ctaText: 'Ver Destaques',
 link: '#destaques',
 },
 ],
 },
 });

 // Section 2: Core Niche Block
 const s2 = generateSimpleId();
 const c2 = generateSimpleId();
 nodes.push({
 id: s2,
 node_type: 'section',
 block_type: 'section',
 parent_id: null,
 sort_order: 1,
 design_tokens: {
 backgroundColor: options.theme === 'light' ? '#ffffff' : '#020617',
 animation: { trigger: 'fade_up', speed: 'normal', hover: 'lift' },
 },
 });
 nodes.push({
 id: c2,
 node_type: 'container',
 block_type: 'container',
 parent_id: s2,
 sort_order: 0,
 layout_rules: { maxWidth: 'container', display: 'flex', flexDirection: 'col', gap: 'lg' },
 });

 if (niche === 'turismo') {
 nodes.push({
 id: generateSimpleId(),
 node_type: 'composition',
 block_type: 'bento_grid',
 parent_id: c2,
 sort_order: 0,
 content: {
 title: 'Destinos & Roteiros Mais Desejados',
 subtitle: 'Pacotes completos com passagens, hospedagem e passeios exclusivos.',
 },
 });
 } else if (niche === 'gastronomia') {
 nodes.push({
 id: generateSimpleId(),
 node_type: 'composition',
 block_type: 'bento_grid',
 parent_id: c2,
 sort_order: 0,
 content: {
 title: 'Nosso Cardápio Especial',
 subtitle: 'Ingredientes frescos e receitas artesanais preparadas por nossos chefs.',
 },
 });
 } else if (niche === 'imobiliario') {
 nodes.push({
 id: generateSimpleId(),
 node_type: 'composition',
 block_type: 'bento_grid',
 parent_id: c2,
 sort_order: 0,
 content: {
 title: 'Imóveis de Alto Padrão em Destaque',
 subtitle: 'Casas, coberturas e apartamentos nas melhores localizações.',
 },
 });
 } else {
 nodes.push({
 id: generateSimpleId(),
 node_type: 'composition',
 block_type: 'product_rail',
 parent_id: c2,
 sort_order: 0,
 content: {
 title: 'Ofertas Imperdíveis da Semana',
 subtitle: 'Os produtos mais vendidos com descontos especiais.',
 },
 data_bindings: { source: 'featured_products' },
 });
 }

 // Section 3: Trust & Assurance
 const s3 = generateSimpleId();
 const c3 = generateSimpleId();
 nodes.push({
 id: s3,
 node_type: 'section',
 block_type: 'section',
 parent_id: null,
 sort_order: 2,
 design_tokens: {
 backgroundColor: options.theme === 'light' ? '#f8fafc' : '#0f172a',
 animation: { trigger: 'fade_up', speed: 'fast' },
 },
 });
 nodes.push({
 id: c3,
 node_type: 'container',
 block_type: 'container',
 parent_id: s3,
 sort_order: 0,
 layout_rules: { maxWidth: 'container' },
 });
 nodes.push({
 id: generateSimpleId(),
 node_type: 'composition',
 block_type: 'trust_badges',
 parent_id: c3,
 sort_order: 0,
 content: {
 badges: [
 { title: 'Garantia de Qualidade', desc: 'Atendimento 100% humanizado' },
 { title: 'Formas de Pagamento', desc: 'PIX instantâneo e cartões' },
 { title: 'Contratos Digitais', desc: 'Conformidade com a MP 2.200-2/2001' },
 ],
 },
 });

 return nodes;
}
