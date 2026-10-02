/**
 * Motor Canônico de Presets de Grupos de Opções / Adicionais / Opcionais por Nicho
 *
 * Fornece templates predefinidos de adicionais, grades, seguros e itens complementares
 * pertinentes à realidade de cada segmento comercial (Turismo, Gastronomia, Varejo, etc.).
 */

import { PlusCircle, Utensils, Coffee, Plane, Shield, MapPin, BedDouble, Sliders, Scissors, Layers, Shirt, Tag, Gift, Wrench, Smartphone, Scale, FileCheck, Building2, Calendar, KeyRound, HeartPulse, type LucideIcon } from 'lucide-react';

export interface OptionValuePreset {
 label: string;
 description: string;
 price_modifier_cents: number;
 is_default: boolean;
 is_active: boolean;
}

export interface OptionGroupPreset {
 id: string;
 name: string;
 icon: LucideIcon;
 desc: string;
 data: {
 display_name: string;
 internal_name: string;
 description: string;
 selection_type: "single" | "multiple";
 is_required: boolean;
 min_selections: number;
 max_selections: number;
 values: OptionValuePreset[];
 };
}

export const NICHE_OPTION_PRESETS: Record<string, OptionGroupPreset[]> = {
 // 1. TURISMO & VIAGENS
 tourism: [
 {
 id: "tourism-regime",
 name: "Regime de Alimentação",
 icon: Utensils,
 desc: "Plano de refeições incluso no pacote",
 data: {
 display_name: "Regime de Alimentação Incluso",
 internal_name: "regime-alimentacao",
 description: "Escolha o plano de refeições desejado para a hospedagem",
 selection_type: "single",
 is_required: true,
 min_selections: 1,
 max_selections: 1,
 values: [
 { label: "Café da Manhã Incluso", description: "Buffet completo servido diariamente no restaurante principal", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Meia Pensão (Café + Jantar)", description: "Café da manhã e jantar buffet com bebidas não alcoólicas", price_modifier_cents: 18000, is_default: false, is_active: true },
 { label: "Pensão Completa (Café + Almoço + Jantar)", description: "Todas as refeições principais inclusas no hotel", price_modifier_cents: 32000, is_default: false, is_active: true },
 { label: "All-Inclusive Premium", description: "Comidas, petiscos e bebidas alcoólicas/não alcoólicas à vontade 24h", price_modifier_cents: 55000, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "tourism-insurance",
 name: "Seguro Viagem & Assistência",
 icon: Shield,
 desc: "Cobertura médica e de bagagem",
 data: {
 display_name: "Proteção & Seguro Viagem",
 internal_name: "seguro-viagem",
 description: "Adicione cobertura médica hospitalar e extravio de bagagem",
 selection_type: "single",
 is_required: false,
 min_selections: 0,
 max_selections: 1,
 values: [
 { label: "Sem Seguro Adicional", description: "O passageiro viaja com cobertura particular prévia", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Seguro Nacional Completo (Cobertura R$ 60k)", description: "Assistência médica, odontológica e telemedicina 24h", price_modifier_cents: 9500, is_default: false, is_active: true },
 { label: "Seguro Internacional Plus (USD 40.000)", description: "Cobertura hospitalar internacional, repatriação e atraso de voo", price_modifier_cents: 22000, is_default: false, is_active: true },
 { label: "Seguro Internacional VIP (USD 100.000)", description: "Máxima cobertura internacional para Europa (Schengen) e EUA", price_modifier_cents: 39000, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "tourism-transfers",
 name: "Passeios & Transfers Opcionais",
 icon: MapPin,
 desc: "Atrações e traslados in/out",
 data: {
 display_name: "Passeios & Experiências Complementares",
 internal_name: "passeios-opcionais",
 description: "Selecione passeios guiados e transfers para enriquecer o roteiro",
 selection_type: "multiple",
 is_required: false,
 min_selections: 0,
 max_selections: 4,
 values: [
 { label: "Transfer Aeroporto / Hotel / Aeroporto (In/Out)", description: "Veículo executivo climatizado com recepção nominal no saguão", price_modifier_cents: 14000, is_default: false, is_active: true },
 { label: "City Tour Histórico com Guia Credenciado Cadastur", description: "Passeio panorâmico de meio período pelos principais pontos turísticos", price_modifier_cents: 12000, is_default: false, is_active: true },
 { label: "Passeio de Barco / Escuna Exclusivo", description: "Navegação pelas ilhas com parada para banho de mar e almoço caiçara", price_modifier_cents: 19000, is_default: false, is_active: true },
 { label: "Noite Cultural com Jantar Típico e Show", description: "Ingresso para show regional com transporte e menu degustação", price_modifier_cents: 25000, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "tourism-room-type",
 name: "Configuração de Quarto / Acomodação",
 icon: BedDouble,
 desc: "Single, Duplo, Triplo ou Frente Mar",
 data: {
 display_name: "Configuração do Quarto",
 internal_name: "tipo-quarto",
 description: "Escolha a categoria e ocupação desejada no hotel",
 selection_type: "single",
 is_required: true,
 min_selections: 1,
 max_selections: 1,
 values: [
 { label: "Quarto Duplo Standard (2 pessoas)", description: "1 cama de casal ou 2 camas de solteiro com vista interna", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Quarto Individual (Single Uso Exclusivo)", description: "Acomodação privativa sem compartilhamento com outro viajante", price_modifier_cents: 45000, is_default: false, is_active: true },
 { label: "Quarto Triplo Familiar", description: "1 cama de casal + 1 cama de solteiro para até 3 hóspedes", price_modifier_cents: 12000, is_default: false, is_active: true },
 { label: "Upgrade Suíte Luxo Frente Mar", description: "Andar alto com varanda panorâmica e amenities especiais", price_modifier_cents: 38000, is_default: false, is_active: true },
 ],
 },
 },
 ],

 // 2. GASTRONOMIA & RESTAURANTES
 gastronomy: [
 {
 id: "gastro-addons",
 name: "Adicionais Pagos",
 icon: PlusCircle,
 desc: "Bacon, queijos extras, molhos especiais",
 data: {
 display_name: "Turbine seu Pedido (Adicionais)",
 internal_name: "adicionais-extras",
 description: "Escolha adicionais para turbinar o prato ou lanche",
 selection_type: "multiple",
 is_required: false,
 min_selections: 0,
 max_selections: 5,
 values: [
 { label: "Bacon Crocante Extra", description: "Fatias generosas de bacon artesanal defumado", price_modifier_cents: 450, is_default: false, is_active: true },
 { label: "Queijo Cheddar Cremoso", description: "Dose generosa de queijo cheddar fundido", price_modifier_cents: 350, is_default: false, is_active: true },
 { label: "Ovo Caipira na Chapa", description: "Ovo frito com gema mole ou no ponto", price_modifier_cents: 250, is_default: false, is_active: true },
 { label: "Molho Especial da Casa (50ml)", description: "Receita artesanal exclusiva à base de ervas", price_modifier_cents: 300, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "gastro-meat-point",
 name: "Ponto da Carne",
 icon: Utensils,
 desc: "1 opção obrigatória de cocção",
 data: {
 display_name: "Ponto da Carne",
 internal_name: "ponto-carne",
 description: "Selecione o ponto de preparo da carne",
 selection_type: "single",
 is_required: true,
 min_selections: 1,
 max_selections: 1,
 values: [
 { label: "Mal Passado", description: "Centro vermelho bem úmido e selado por fora", price_modifier_cents: 0, is_default: false, is_active: true },
 { label: "Ao Ponto", description: "Centro rosado suculento e macio", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Bem Passado", description: "Totalmente cozido e dourado por completo", price_modifier_cents: 0, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "gastro-beverage",
 name: "Bebida Acompanhamento",
 icon: Coffee,
 desc: "Refrigerantes, sucos e combos",
 data: {
 display_name: "Deseja Bebida Gelada?",
 internal_name: "bebida-combo",
 description: "Adicione uma bebida refrescante ao seu pedido",
 selection_type: "single",
 is_required: false,
 min_selections: 0,
 max_selections: 1,
 values: [
 { label: "Não, obrigado", description: "Prosseguir sem bebida", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Coca-Cola Original 350ml", description: "Lata trincando de gelada", price_modifier_cents: 600, is_default: false, is_active: true },
 { label: "Coca-Cola Zero 350ml", description: "Lata 350ml sem açúcar", price_modifier_cents: 600, is_default: false, is_active: true },
 { label: "Suco Natural de Laranja 400ml", description: "100% fruta espremida na hora", price_modifier_cents: 850, is_default: false, is_active: true },
 ],
 },
 },
 ],

 // 3. VAREJO & MODA
 retail: [
 {
 id: "retail-size",
 name: "Grade de Tamanhos (Vestuário)",
 icon: Shirt,
 desc: "P, M, G, GG ou Numérico",
 data: {
 display_name: "Selecione o Tamanho",
 internal_name: "tamanho-peca",
 description: "Escolha o tamanho correto conforme tabela de medidas",
 selection_type: "single",
 is_required: true,
 min_selections: 1,
 max_selections: 1,
 values: [
 { label: "P (Pequeno)", description: "Veste manequim 36-38", price_modifier_cents: 0, is_default: false, is_active: true },
 { label: "M (Médio)", description: "Veste manequim 40-42", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "G (Grande)", description: "Veste manequim 44", price_modifier_cents: 0, is_default: false, is_active: true },
 { label: "GG (Extra Grande)", description: "Veste manequim 46-48", price_modifier_cents: 0, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "retail-colors",
 name: "Variação de Cores",
 icon: Tag,
 desc: "Preto, Branco, Azul, Bege",
 data: {
 display_name: "Escolha a Cor",
 internal_name: "cor-produto",
 description: "Selecione a tonalidade desejada",
 selection_type: "single",
 is_required: true,
 min_selections: 1,
 max_selections: 1,
 values: [
 { label: "Preto Clássico", description: "Cor sóbria e versátil", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Branco Off-White", description: "Acabamento luminoso premium", price_modifier_cents: 0, is_default: false, is_active: true },
 { label: "Azul Marinho", description: "Tom elegante atemporal", price_modifier_cents: 0, is_default: false, is_active: true },
 { label: "Terracota / Bege", description: "Tonalidade terrena estilizada", price_modifier_cents: 0, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "retail-gift",
 name: "Embalagem para Presente",
 icon: Gift,
 desc: "Caixa rígida com laço e cartão",
 data: {
 display_name: "Opções de Embalagem",
 internal_name: "embalagem-presente",
 description: "Envie diretamente com pacote especial de presente",
 selection_type: "single",
 is_required: false,
 min_selections: 0,
 max_selections: 1,
 values: [
 { label: "Embalagem Padrão de Envio", description: "Envelope de segurança reforçado", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Caixa Presente com Laço de Cetim", description: "Caixa rígida magnética com laço e papel de seda", price_modifier_cents: 1500, is_default: false, is_active: true },
 { label: "Kit Presente VIP + Cartão Escrito à Mão", description: "Embalagem de luxo e mensagem personalizada", price_modifier_cents: 2200, is_default: false, is_active: true },
 ],
 },
 },
 ],

 // 4. SERVIÇOS, BELEZA & ESTÉTICA
 services: [
 {
 id: "services-addons",
 name: "Procedimento Extra / Hidratação",
 icon: Sliders,
 desc: "Tratamentos complementares durante a sessão",
 data: {
 display_name: "Adicionais do Atendimento",
 internal_name: "extras-atendimento",
 description: "Complemente o serviço com procedimentos de cuidado adicional",
 selection_type: "multiple",
 is_required: false,
 min_selections: 0,
 max_selections: 3,
 values: [
 { label: "Hidratação Profunda com Ozonioterapia", description: "Recuperação celular e brilho imediato (20 min)", price_modifier_cents: 6500, is_default: false, is_active: true },
 { label: "Massagem Relaxante Facial / Capilar", description: "Manobras drenantes com óleo essencial relaxante (15 min)", price_modifier_cents: 4500, is_default: false, is_active: true },
 { label: "Aplicação de Ampola Concentrada de Colágeno", description: "Nutrição profunda pós-procedimento", price_modifier_cents: 3500, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "services-homecare",
 name: "Produto Homecare Recomendado",
 icon: HeartPulse,
 desc: "Manutenção do resultado em casa",
 data: {
 display_name: "Kit de Cuidados em Casa (Homecare)",
 internal_name: "homecare-pos",
 description: "Leve os cosméticos profissionais para manter o resultado em casa",
 selection_type: "multiple",
 is_required: false,
 min_selections: 0,
 max_selections: 2,
 values: [
 { label: "Sérum Reparador Noturno (30ml)", description: "Fórmula antioxidante de rápida absorção", price_modifier_cents: 8900, is_default: false, is_active: true },
 { label: "Protetor Térmico / Solar FPS 60", description: "Proteção contra calor do secador e raios UV", price_modifier_cents: 7500, is_default: false, is_active: true },
 ],
 },
 },
 ],

 // 5. ASSISTÊNCIA TÉCNICA & REPAROS
 tech_repair: [
 {
 id: "tech-screen-type",
 name: "Procedência da Peça / Tela",
 icon: Smartphone,
 desc: "Original Nacional vs Premium OLED",
 data: {
 display_name: "Tipo de Peça Utilizada",
 internal_name: "qualidade-peca",
 description: "Selecione o padrão de qualidade e garantia da tela/bateria",
 selection_type: "single",
 is_required: true,
 min_selections: 1,
 max_selections: 1,
 values: [
 { label: "Tela Premium OLED com 3 Meses Garantia", description: "Alta fidelidade de cores e touch screen rápido", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Tela Original Nacional com 1 Ano Garantia", description: "Mesma peça homologada pelo fabricante com selo oficial", price_modifier_cents: 18000, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "tech-glass-protection",
 name: "Película 3D & Capa Protetora",
 icon: Shield,
 desc: "Aplicação imediata após conserto",
 data: {
 display_name: "Proteção Imediata Pós-Reparo",
 internal_name: "protecao-pos-reparo",
 description: "Saia com o aparelho 100% blindado contra novas quedas",
 selection_type: "multiple",
 is_required: false,
 min_selections: 0,
 max_selections: 2,
 values: [
 { label: "Película de Vidro 3D Cerâmica Aplicada", description: "Vidro temperado com bordas curvas anti-impacto", price_modifier_cents: 3500, is_default: false, is_active: true },
 { label: "Capa Anti-Impacto com Borda Airbag", description: "Silicone rígido com proteção reforçada de câmera", price_modifier_cents: 4500, is_default: false, is_active: true },
 ],
 },
 },
 ],

 // 6. LOCAÇÃO DE EQUIPAMENTOS & ESTRUTURAS
 rental: [
 {
 id: "rental-operator",
 name: "Operador Técnico Habilitado",
 icon: Wrench,
 desc: "Profissional para operar durante o evento",
 data: {
 display_name: "Inclusão de Operador Técnico",
 internal_name: "operador-tecnico",
 description: "Contrate profissional qualificado para montagem e operação do equipamento",
 selection_type: "single",
 is_required: true,
 min_selections: 1,
 max_selections: 1,
 values: [
 { label: "Sem Operador (Operado pelo Contratante)", description: "Responsabilidade técnica integral do cliente", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Técnico Especialista em Diária (8h)", description: "Acompanhamento integral durante todo o período do evento", price_modifier_cents: 35000, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "rental-cables",
 name: "Cabos, Extensões & Acessórios",
 icon: Layers,
 desc: "Kits de cabeamento e suportes",
 data: {
 display_name: "Acessórios de Montagem",
 internal_name: "acessorios-montagem",
 description: "Itens complementares para cabeamento e instalação segura",
 selection_type: "multiple",
 is_required: false,
 min_selections: 0,
 max_selections: 3,
 values: [
 { label: "Kit Extensões 20m com Protetor de Cabo de Solo", description: "Cabo emborrachado com canaleta passa-cabo reforçada", price_modifier_cents: 6000, is_default: false, is_active: true },
 { label: "Tripé / Suporte Metálico Telescópico Reforçado", description: "Suporte com travas de segurança e bolsa de transporte", price_modifier_cents: 4500, is_default: false, is_active: true },
 ],
 },
 },
 ],
};

/**
 * Retorna a lista de presets recomendados para o nicho informado.
 * Se o nicho não tiver lista específica, utiliza o fallback de varejo.
 */
export function getNicheOptionGroupPresets(nicheId: string): OptionGroupPreset[] {
 return NICHE_OPTION_PRESETS[nicheId] || NICHE_OPTION_PRESETS.retail;
}
