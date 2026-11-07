/**
 * Motor Canônico de Presets de Grupos de Opções / Adicionais / Opcionais por Nicho
 *
 * Fornece templates predefinidos de adicionais, grades, seguros e itens complementares
 * pertinentes à realidade de cada segmento comercial (Turismo, Gastronomia, Varejo, etc.).
 */

import { PlusCircle, Utensils, Coffee, Plane, Shield, MapPin, BedDouble, Sliders, Scissors, Layers, Shirt, Tag, Gift, Wrench, Smartphone, Scale, FileCheck, Building2, Calendar, KeyRound, HeartPulse, Apple, Sparkles, Car, GraduationCap, Briefcase, ShoppingBag, Package, Box, Pill, Dog, Hammer, Ticket, BookOpen, Clock, Stethoscope, Dumbbell, Palette, ShieldCheck, Truck, Award, type LucideIcon } from 'lucide-react';

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
 {
 id: "retail-numeric-size",
 name: "Grade Numérica (Alfaiataria & Calçados)",
 icon: Shirt,
 desc: "Numerações do 36 ao 44",
 data: {
 display_name: "Tamanho Numérico",
 internal_name: "tamanho-numerico",
 description: "Selecione a numeração exata da peça ou calçado",
 selection_type: "single",
 is_required: true,
 min_selections: 1,
 max_selections: 1,
 values: [
 { label: "Tamanho 36", description: "Medida padrão 36", price_modifier_cents: 0, is_default: false, is_active: true },
 { label: "Tamanho 38", description: "Medida padrão 38", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Tamanho 40", description: "Medida padrão 40", price_modifier_cents: 0, is_default: false, is_active: true },
 { label: "Tamanho 42", description: "Medida padrão 42", price_modifier_cents: 0, is_default: false, is_active: true },
 { label: "Tamanho 44", description: "Medida padrão 44", price_modifier_cents: 0, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "retail-tailoring",
 name: "Ajuste de Barra & Alfaiataria",
 icon: Scissors,
 desc: "Barra original, italiana ou ajuste de cós",
 data: {
 display_name: "Serviço de Ajuste & Barra",
 internal_name: "ajustes-costura",
 description: "Envie a peça com ajustes de costura sob medida",
 selection_type: "single",
 is_required: false,
 min_selections: 0,
 max_selections: 1,
 values: [
 { label: "Sem Ajuste (Barra de Fábrica)", description: "Peça entregue no comprimento original", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Barra Simples Feita sob Medida", description: "Ajustada conforme altura informada", price_modifier_cents: 2000, is_default: false, is_active: true },
 { label: "Barra Original Mantida", description: "Desfeita e reaplicada a barra original", price_modifier_cents: 3500, is_default: false, is_active: true },
 { label: "Ajuste Completo de Cintura / Gancho", description: "Ajuste lateral anatômico por alfaiate", price_modifier_cents: 4500, is_default: false, is_active: true },
 ],
 },
 },
 {
 id: "retail-protection",
 name: "Garantia & Seguro contra Danos",
 icon: ShieldCheck,
 desc: "Proteção contra acidentes e garantia estendida",
 data: {
 display_name: "Plano de Proteção do Produto",
 internal_name: "garantia-protecao",
 description: "Cobertura adicional contra defeitos e danos",
 selection_type: "single",
 is_required: false,
 min_selections: 0,
 max_selections: 1,
 values: [
 { label: "Garantia Legal Padrão (90 dias)", description: "Cobertura legal contra defeitos", price_modifier_cents: 0, is_default: true, is_active: true },
 { label: "Garantia Estendida (+12 meses)", description: "Reparo ou substituição por 1 ano extra", price_modifier_cents: 2990, is_default: false, is_active: true },
 { label: "Proteção Total (Quebra/Rasgo + Troca Fácil)", description: "Troca sem burocracia mesmo por acidentes", price_modifier_cents: 4990, is_default: false, is_active: true },
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

  // 7. SUPERMERCADO, HORTIFRUTI & AÇOUGUE
  supermarket: [
    {
      id: "supermarket-maturation",
      name: "Ponto de Maturação das Frutas",
      icon: Apple,
      desc: "Verdes para a semana ou prontas para consumo",
      data: {
        display_name: "Ponto de Maturação Desejado",
        internal_name: "ponto-maturacao-frutas",
        description: "Selecione o ponto ideal para a separação do seu hortifruti",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "No Ponto (Consumo em 1-2 dias)", description: "Fruta madura, pronta para consumo imediato", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Mais Verde (Amadurecer ao longo da semana)", description: "Ideal para programar consumo gradual", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Bem Madura (Para sucos, polpas e doces)", description: "Fruta macia e com máxima doçura", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "supermarket-cut",
      name: "Tipo de Corte da Carne",
      icon: Utensils,
      desc: "Bife fino, grosso, em cubos ou moído",
      data: {
        display_name: "Corte do Açougue",
        internal_name: "tipo-corte-carne",
        description: "Escolha como o açougueiro deve preparar a peça",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Bife Fino (Frigideira / Grelha Rápida)", description: "Fatiado fino para preparo ágil", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Bife Alto / Steak (Churrasqueira)", description: "Corte alto de aproximadamente 2 dedos com suculência", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Em Cubos (Para Ensopados e Molhos)", description: "Cortado em cubos regulares limpos", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Moído 2x (Massa homogênea)", description: "Moagem dupla resfriada na hora", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Peça Inteira Embalada a Vácuo", description: "Sem cortes adicionais, preservando textura original", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "supermarket-slicing",
      name: "Fatiamento de Frios & Queijos",
      icon: Layers,
      desc: "Fatiado fino, padrão ou peça inteira",
      data: {
        display_name: "Espessura do Fatiamento",
        internal_name: "espessura-fatiamento",
        description: "Defina como quer receber seus frios na bandeja",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Fatiado Bem Fino (Quase Transparente)", description: "Excelente para sanduíches e petiscos delicados", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Fatiamento Médio Tradicional", description: "Espessura comercial para café da manhã", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Pedaço Inteiro sem Fatiar", description: "Cunha inteira para ralar ou cortar em casa", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "supermarket-bags",
      name: "Tipo de Embalagem & Sacolas",
      icon: Package,
      desc: "Caixa ecológica, sacolas reforçadas ou eco-bags",
      data: {
        display_name: "Embalagem para Separação",
        internal_name: "tipo-embalagem-supermercado",
        description: "Escolha como suas compras serão acomodadas",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        values: [
          { label: "Caixas de Papelão Sustentáveis (Sem Custo)", description: "Reutilização de caixas limpas e recicláveis", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Sacolas Biodegradáveis Reforçadas", description: "Kit de sacolas plásticas oxi-biodegradáveis", price_modifier_cents: 150, is_default: false, is_active: true },
          { label: "Sacola Retornável Ecobag Waesy", description: "Sacola em lona resistente reutilizável para até 20kg", price_modifier_cents: 890, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 8. FARMÁCIA, SAÚDE & MANIPULAÇÃO
  pharmacy: [
    {
      id: "pharmacy-form",
      name: "Forma Farmacêutica",
      icon: Pill,
      desc: "Cápsulas gelatinosas, sachês ou gotas sublinguais",
      data: {
        display_name: "Forma de Apresentação",
        internal_name: "forma-farmaceutica",
        description: "Selecione a forma prescrita pelo médico ou nutricionista",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Cápsulas Gelatinosas Incolores", description: "Cápsula padrão de liberação gástrica rápida", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Cápsulas Vegetais (Veganas)", description: "Produzidas em celulose 100% vegetal sem derivados animais", price_modifier_cents: 1200, is_default: false, is_active: true },
          { label: "Sachês Efervescentes / Solúveis", description: "Dose individual para dissolver em água com sabor leve", price_modifier_cents: 1800, is_default: false, is_active: true },
          { label: "Gotas Sublinguais Concentradas", description: "Absorção imediata pela mucosa sublingual", price_modifier_cents: 1500, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "pharmacy-flavor",
      name: "Sabor de Fórmulas Orais",
      icon: Coffee,
      desc: "Morango, Laranja, Menta ou Neutro",
      data: {
        display_name: "Saborizante da Fórmula",
        internal_name: "sabor-formula-manipulada",
        description: "Ideal para formulações orais pediátricas ou líquidas",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Sabor Neutro / Sem Corante", description: "Fórmula pura sem aromas artificiais adicionados", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Morango Suave", description: "Aroma suave com dulçor calibrado com stevia", price_modifier_cents: 500, is_default: false, is_active: true },
          { label: "Laranja Cítrica", description: "Toque cítrico refrescante", price_modifier_cents: 500, is_default: false, is_active: true },
          { label: "Menta Refrescante", description: "Sensação mentolada prolongada", price_modifier_cents: 500, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "pharmacy-homecare",
      name: "Aplicação & Curativo Domiciliar",
      icon: Stethoscope,
      desc: "Atendimento farmacêutico em casa",
      data: {
        display_name: "Serviço Farmacêutico Domiciliar",
        internal_name: "servico-farmaceutico-domiciliar",
        description: "Profissional habilitado pelo CRF para procedimentos no domicílio",
        selection_type: "multiple",
        is_required: false,
        min_selections: 0,
        max_selections: 2,
        values: [
          { label: "Aplicação de Injetável por Farmacêutico", description: "Administração com agulha descartável e descarte seguro", price_modifier_cents: 2500, is_default: false, is_active: true },
          { label: "Aferição de Pressão + Teste de Glicemia", description: "Verificação completa com relatório impresso de parâmetros", price_modifier_cents: 1500, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "pharmacy-packaging",
      name: "Embalagem Térmica Especial",
      icon: ShieldCheck,
      desc: "Gelo gel para medicamentos termolábeis",
      data: {
        display_name: "Embalagem e Controle Térmico",
        internal_name: "embalagem-termolabeis",
        description: "Garante manutenção de cadeia fria (2°C a 8°C) no trajeto",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        values: [
          { label: "Embalagem Térmica com 2 Placas de Gelo Gel", description: "Monitoramento de temperatura por até 4 horas de percurso", price_modifier_cents: 1200, is_default: false, is_active: true },
          { label: "Embalagem Lacrada Discreta (Anti-Violação)", description: "Envelope opaco selado com protocolo de segurança", price_modifier_cents: 400, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 9. PET SHOP, VETERINÁRIA & BANHO/TOSA
  pet: [
    {
      id: "pet-size",
      name: "Porte do Animal",
      icon: Dog,
      desc: "Mini, Pequeno, Médio, Grande ou Gigante",
      data: {
        display_name: "Porte do Pet",
        internal_name: "porte-pet",
        description: "Adequação de dosagens, banheira e tempo de tosa",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Porte Mini (Até 5 kg)", description: "Ex: Pinscher, Chihuahua, Yorkshire pequeno", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Porte Pequeno (5 a 10 kg)", description: "Ex: Shih Tzu, Poodle Toy, Maltês, Pug", price_modifier_cents: 1000, is_default: true, is_active: true },
          { label: "Porte Médio (10 a 20 kg)", description: "Ex: Beagle, Bulldog Francês, Cocker, SRD médio", price_modifier_cents: 2500, is_default: false, is_active: true },
          { label: "Porte Grande (20 a 35 kg)", description: "Ex: Golden Retriever, Labrador, Pastor Alemão", price_modifier_cents: 4500, is_default: false, is_active: true },
          { label: "Porte Gigante (Acima de 35 kg)", description: "Ex: Bernese, Rottweiler, Dogue Alemão, São Bernardo", price_modifier_cents: 7000, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "pet-grooming-extras",
      name: "Adicionais de Banho & Tosa",
      icon: Scissors,
      desc: "Tosa higiênica, hidratação e corte de unhas",
      data: {
        display_name: "Cuidados Especiais de Estética",
        internal_name: "extras-estetica-pet",
        description: "Adicione procedimentos de higiene e embelezamento ao banho",
        selection_type: "multiple",
        is_required: false,
        min_selections: 0,
        max_selections: 4,
        values: [
          { label: "Tosa Higiênica Completa (Almofadas e Genitais)", description: "Higiene sanitária com máquina e tesoura de precisão", price_modifier_cents: 2000, is_default: false, is_active: true },
          { label: "Corte e Lixamento de Unhas", description: "Acabamento seguro sem sangramento nem cantos afiados", price_modifier_cents: 1500, is_default: false, is_active: true },
          { label: "Hidratação de Pelos com Óleo de Argan e Queratina", description: "Peluagem macia, desembaraçada e com brilho intenso", price_modifier_cents: 3000, is_default: false, is_active: true },
          { label: "Escovação de Dentes com Gel Hipoalergênico", description: "Higiene bucal com remoção de placa bacteriana superficial", price_modifier_cents: 1800, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "pet-perfume",
      name: "Perfume & Finalização",
      icon: Sparkles,
      desc: "Fragrância suave hipoalergênica ou sem cheiro",
      data: {
        display_name: "Finalização do Banho",
        internal_name: "finalizacao-perfume-pet",
        description: "Escolha a colônia de finalização após secagem",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Colônia Baby Suave Hipoalergênica", description: "Fragrância floral sutil e delicada para cães e gatos", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Fragrância Frutas Tropicais Frescas", description: "Aroma alegre e refrescante de longa duração", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Sem Perfume (Totalmente Neutro)", description: "Para pets alérgicos ou tutores sensíveis a odores", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "pet-antiparasitic",
      name: "Aplicação de Antipulgas & Carrapatos",
      icon: ShieldCheck,
      desc: "Pipeta tópica ou comprimido mastigável",
      data: {
        display_name: "Proteção Antiparasitária Pós-Banho",
        internal_name: "antipulgas-pos-banho",
        description: "Aplicação imediata com o pelo limpo e seco",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        values: [
          { label: "Aplicação de Pipeta Tópica Mensal (Dorso)", description: "Proteção contra pulgas e carrapatos por 30 dias", price_modifier_cents: 4800, is_default: false, is_active: true },
          { label: "Comprimido Mastigável Palatável (Proteção 90 dias)", description: "Administração oral assistida com proteção trimestral", price_modifier_cents: 11000, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 10. OFICINAS MECÂNICAS, AUTO CENTERS & LAVA-CAR
  automotive: [
    {
      id: "auto-oil-grade",
      name: "Tipo de Óleo Lubrificante",
      icon: Car,
      desc: "Mineral, Semissintético ou 100% Sintético",
      data: {
        display_name: "Especificação do Óleo do Motor",
        internal_name: "especificacao-oleo-motor",
        description: "Atenda ao manual do fabricante com o lubrificante correto",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Óleo Semissintético 15W40 (API SN)", description: "Para motores flex tradicionais com troca a cada 5.000 km", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Óleo 100% Sintético 5W30 (Dexos 1 Gen 3)", description: "Alta proteção contra atrito, economia de combustível e troca 10.000 km", price_modifier_cents: 14000, is_default: false, is_active: true },
          { label: "Óleo 100% Sintético 0W20 Premium (Motores Turbo)", description: "Para veículos modernos turbo e injeção direta de alta performance", price_modifier_cents: 22000, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "auto-alignment-3d",
      name: "Alinhamento & Balanceamento Laser",
      icon: Wrench,
      desc: "Geometria 3D computadorizada e balanceamento",
      data: {
        display_name: "Geometria & Balanceamento 3D",
        internal_name: "alinhamento-balanceamento-3d",
        description: "Evite desgaste irregular dos pneus e trepidação no volante",
        selection_type: "multiple",
        is_required: false,
        min_selections: 0,
        max_selections: 3,
        values: [
          { label: "Balanceamento das 4 Rodas (Chumbo Colado)", description: "Elimina vibrações em velocidades acima de 80 km/h", price_modifier_cents: 6000, is_default: false, is_active: true },
          { label: "Alinhamento de Direção Laser 3D", description: "Leitura milimétrica de caster, camber e convergência", price_modifier_cents: 8000, is_default: false, is_active: true },
          { label: "Rodízio dos 4 Pneus + Calibragem com Nitrogênio", description: "Pressão estável que reduz aquecimento em viagens longas", price_modifier_cents: 3500, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "auto-ac-sanitizing",
      name: "Higienização de Ar-Condicionado",
      icon: Sparkles,
      desc: "Oxi-sanitização com ozônio e filtro novo",
      data: {
        display_name: "Higienização de Cabine & Ar",
        internal_name: "higienizacao-ar-condicionado",
        description: "Elimina 99,9% de fungos, ácaros e bactérias do habitáculo",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        values: [
          { label: "Oxi-Sanitização por Ozônio (Sem Troca de Filtro)", description: "Desinfecção profunda com gerador de ozônio por 30 minutos", price_modifier_cents: 7000, is_default: false, is_active: true },
          { label: "Higienização Completa + Troca do Filtro de Cabine Antipólen", description: "Filtro de carvão ativado novo instalado com sanitização inclusa", price_modifier_cents: 13500, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 11. CONSTRUÇÃO CIVIL, TINTAS & MATERIAIS
  construction: [
    {
      id: "construction-paint-finish",
      name: "Acabamento da Tinta",
      icon: Palette,
      desc: "Fosco aveludado, acetinado ou semibrilho",
      data: {
        display_name: "Acabamento da Pintura",
        internal_name: "acabamento-tinta",
        description: "Selecione o reflexo e a lavabilidade da tinta",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Fosco Aveludado (Disfarça Imperfeições)", description: "Sem reflexo de luz, toque suave e fácil retoque", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Acetinado Suave (Lavável e Requintado)", description: "Brilho sutil com excelente resistência a manchas e limpeza fácil", price_modifier_cents: 4500, is_default: false, is_active: true },
          { label: "Semibrilho Alta Proteção (Fachadas e Áreas Úmidas)", description: "Máxima impermeabilidade e resistência a sol e chuva", price_modifier_cents: 6500, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "construction-tinting-system",
      name: "Sistema Tintométrico Personalizado",
      icon: Sparkles,
      desc: "Cor de linha do catálogo ou leitura personalizada",
      data: {
        display_name: "Preparação de Cor no Sistema Tintométrico",
        internal_name: "preparacao-cor-tintometrico",
        description: "Pigmentação exata de fábrica via dosador computadorizado",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Cor Pronta de Linha (Branco Neve / Gelo / Palha)", description: "Tinta pronta embalada na fábrica sem pigmentação adicional", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Cor Personalizada via Leque Tintométrico", description: "Dosagem exata com corantes de alta durabilidade e código único", price_modifier_cents: 3500, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "construction-unloading",
      name: "Logística de Descarga da Obra",
      icon: Truck,
      desc: "Descarga manual no térreo ou caminhão munck no 2º piso",
      data: {
        display_name: "Condições de Descarga no Canteiro",
        internal_name: "logistica-descarga-obra",
        description: "Indique como o material deve ser descarregado no local",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Descarga Manual no Térreo (Calçada / Garagem)", description: "Até 10 metros de distância do caminhão sem escadas", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Içamento / Descarga com Braço Munck no 2º Pavimento", description: "Elevação mecânica direta para a laje ou piso superior", price_modifier_cents: 28000, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 12. EVENTOS, SHOWS, CASAS NOTURNAS & INGRESSOS
  events: [
    {
      id: "events-sector",
      name: "Setor & Área do Evento",
      icon: Ticket,
      desc: "Pista, Frontstage, Camarote Open Bar ou Lounge",
      data: {
        display_name: "Escolha o Setor do Ingresso",
        internal_name: "setor-ingresso-evento",
        description: "Defina sua localização e comodidades dentro do recinto",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Pista Comum", description: "Acesso à arena principal com banheiros e bares de suporte", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Pista Premium / Frontstage", description: "Área colada ao palco com visão privilegiada e entrada dedicada", price_modifier_cents: 12000, is_default: false, is_active: true },
          { label: "Camarote Open Bar & Food VIP", description: "Bebidas premium liberadas, buffet gastronômico e banheiros climatizados", price_modifier_cents: 35000, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "events-vip-access",
      name: "Experiências VIP & Bastidores",
      icon: Award,
      desc: "Meet & Greet com artista e entrada sem filas",
      data: {
        display_name: "Experiências de Bastidores",
        internal_name: "experiencias-vip-evento",
        description: "Aproveite momentos únicos com acesso antecipado e artistas",
        selection_type: "multiple",
        is_required: false,
        min_selections: 0,
        max_selections: 2,
        values: [
          { label: "Meet & Greet Oficial com Artista + Foto", description: "Encontro reservado no camarim com fotógrafo profissional", price_modifier_cents: 45000, is_default: false, is_active: true },
          { label: "Early Entry (Entrada 1h Antes sem Filas)", description: "Entrada antecipada pelo portão VIP para garantir melhor lugar", price_modifier_cents: 6000, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "events-merchandise",
      name: "Kit & Copo Oficial Colecionável",
      icon: Gift,
      desc: "Copo térmico exclusivo e pulseira comemorativa",
      data: {
        display_name: "Lembranças e Merchandising Oficial",
        internal_name: "merchandising-oficial-evento",
        description: "Adquira seus itens antecipadamente com desconto e retire no bar",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        values: [
          { label: "Copo Térmico Colecionável Oficial com Tirante", description: "Copo personalizado em inox com alça tirante para o evento", price_modifier_cents: 4500, is_default: false, is_active: true },
          { label: "Combo Colecionável (Copo + Camiseta da Turnê)", description: "Camiseta em algodão 100% oficial e copo numerado", price_modifier_cents: 12000, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 13. CURSOS, EDUCAÇÃO & TREINAMENTOS
  education: [
    {
      id: "education-access-period",
      name: "Modalidade & Tempo de Acesso",
      icon: GraduationCap,
      desc: "Acesso por 1 ano, mentoria ao vivo ou vitalício",
      data: {
        display_name: "Período de Acesso ao Curso",
        internal_name: "periodo-acesso-curso",
        description: "Selecione o plano de vigência do seu conteúdo e suporte",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Acesso Completo por 12 Meses", description: "Acesso a todas as aulas gravadas, exercícios e fórum de dúvidas", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Plano Híbrido com Mentorias Semanais ao Vivo (6 Meses)", description: "Encontros online em grupo com o professor para tirar dúvidas ao vivo", price_modifier_cents: 49000, is_default: false, is_active: true },
          { label: "Acesso Vitalício VIP + Próximas Atualizações", description: "Sem expiração e com inclusão de módulos e turmas futuras", price_modifier_cents: 89000, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "education-certificate",
      name: "Certificação e Emissão Oficial",
      icon: Award,
      desc: "Certificado digital PDF ou físico enquadrado",
      data: {
        display_name: "Opções de Certificado de Conclusão",
        internal_name: "certificado-conclusao-curso",
        description: "Comprovação de carga horária com autenticação digital por QR Code",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Certificado Digital em PDF com Hash de Validação (Incluso)", description: "Download imediato após conclusão com carga horária e ementa", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Certificado Físico Assinado e Enquadrado com Envio Postal", description: "Impresso em papel linho 240g com chancela e entrega rastreada", price_modifier_cents: 8500, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "education-kit",
      name: "Material Físico & Livros Didáticos",
      icon: BookOpen,
      desc: "Apostila impressa e kit de ferramentas",
      data: {
        display_name: "Material Complementar de Estudos",
        internal_name: "material-didatico-impresso",
        description: "Receba o material impresso no seu endereço residencial",
        selection_type: "multiple",
        is_required: false,
        min_selections: 0,
        max_selections: 2,
        values: [
          { label: "Apostila Impressa Espiralada Colorida + Planner", description: "Material encadernado com 280 páginas e guia prático de exercícios", price_modifier_cents: 6500, is_default: false, is_active: true },
          { label: "Kit Boas-Vindas Oficial (Caderno Moleskine + Caneta + Garrafa)", description: "Kit personalizado de estudos para seu escritório", price_modifier_cents: 8900, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 14. IMÓVEIS & IMOBILIÁRIA
  real_estate: [
    {
      id: "real-estate-survey",
      name: "Vistoria Imobiliária Detalhada",
      icon: FileCheck,
      desc: "Laudo fotográfico com teste de carga elétrica e hidráulica",
      data: {
        display_name: "Serviço de Vistoria de Entrada",
        internal_name: "vistoria-imovel-entrada",
        description: "Garantia documental do estado exato do imóvel na entrega das chaves",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Laudo Fotográfico Padrão com Registro em Nuvem", description: "Mais de 150 fotos em alta definição com assinatura digital", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Vistoria Técnica com Teste de Tensão e Estanqueidade", description: "Inspeção completa de disjuntores, tomadas, registros e ralos", price_modifier_cents: 35000, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "real-estate-guarantee",
      name: "Modalidade de Fiança / Garantia",
      icon: Shield,
      desc: "Seguro fiança parcelado, fiador ou caução",
      data: {
        display_name: "Garantia Locatícia",
        internal_name: "garantia-locaticia-contrato",
        description: "Como a locação será afiançada para dispensa de fiador tradicional",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Seguro Fiança Locatícia (Parcela Mensal no Boleto)", description: "Aprovação rápida em 15 minutos sem necessidade de fiador", price_modifier_cents: 12000, is_default: true, is_active: true },
          { label: "Título de Capitalização (Caução Restituível)", description: "Valor caucionado em fundo de investimento restituível ao final", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Fiador Tradicional com Imóvel Quitado na Região", description: "Exige apresentação de matrícula atualizada e comprovação de renda", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "real-estate-furniture",
      name: "Mobília & Eletrodomésticos Inclusos",
      icon: BedDouble,
      desc: "Vazio, semi-mobiliado ou porteira fechada",
      data: {
        display_name: "Condição de Mobília do Imóvel",
        internal_name: "condicao-mobilia-imovel",
        description: "Itens que permanecerão no imóvel durante a locação",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Imóvel Desocupado / Vazio", description: "Pronto para receber sua própria mobília e decoração", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Semi-Mobiliado (Armários Planejados na Cozinha e Banheiros)", description: "Inclui armários embutidos de marcenaria de alta qualidade", price_modifier_cents: 25000, is_default: false, is_active: true },
          { label: "Porteira Fechada (100% Mobiliado e com Eletrodomésticos)", description: "Cama, sofá, smart TV, geladeira frost free, fogão e lavadora", price_modifier_cents: 65000, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 15. ATACADO, DISTRIBUIDORAS & B2B
  wholesale: [
    {
      id: "wholesale-pack-type",
      name: "Unidade de Faturamento & Embalagem B2B",
      icon: Box,
      desc: "Fardo, caixa master ou palete fechado",
      data: {
        display_name: "Tipo de Embalagem para Revenda",
        internal_name: "unidade-embalagem-b2b",
        description: "Defina o agrupamento para movimentação logística no seu estoque",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Fardo Termoencolhível com 12 Unidades", description: "Fardo prático com alça de manuseio para atacado de autosserviço", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Caixa Master Reforçada com 48 Unidades", description: "Papelão ondulado duplo ideal para empilhamento em estantes", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Palete Fechado PBR (480 Unidades Strechado)", description: "Pronto para descarregamento rápido via empilhadeira", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "wholesale-freight-type",
      name: "Modalidade de Frete Comercial",
      icon: Truck,
      desc: "FOB (Retirada pelo cliente) ou CIF (Com seguro de carga)",
      data: {
        display_name: "Modalidade de Frete e Expedição",
        internal_name: "modalidade-frete-b2b",
        description: "Indique como a carga será retirada ou entregue",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "FOB — Retirada por Transportadora Contratada pelo Cliente", description: "Coleta no centro de distribuição com agendamento prévio de doca", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "CIF — Entrega Direta com Seguro de Carga Incluso", description: "Transporte rastreado porta a porta com descarregamento no seu CD", price_modifier_cents: 28000, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "wholesale-ean-label",
      name: "Etiquetagem com EAN/DUN do Revendedor",
      icon: Tag,
      desc: "Aplicação prévia de código de barras personalizado",
      data: {
        display_name: "Serviço de Etiquetagem e Precificação",
        internal_name: "etiquetagem-customizada-b2b",
        description: "Receba as caixas já prontas para abastecer sua gôndola",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        values: [
          { label: "Etiquetas com Código DUN-14 nas Caixas Master", description: "Facilita recebimento WMS e conferência eletrônica de entrada", price_modifier_cents: 4500, is_default: false, is_active: true },
          { label: "Etiquetas Individuais com Preço Sugerido e SKU do Cliente", description: "Elimina tempo de etiquetagem na chegada ao ponto de venda", price_modifier_cents: 12000, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 16. EMPREGOS, RECRUTAMENTO & RH
  jobs: [
    {
      id: "jobs-contract-regime",
      name: "Regime de Contratação",
      icon: Briefcase,
      desc: "CLT, PJ ou Estágio",
      data: {
        display_name: "Regime Contratual Proposto",
        internal_name: "regime-contratacao-vaga",
        description: "Selecione o enquadramento trabalhista da posição",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "CLT Efetivo (Com 13º Salário e Férias Remuneradas)", description: "Contrato por tempo indeterminado com todos os direitos legais", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "PJ Prestador de Serviços (Nota Fiscal)", description: "Contrato empresarial B2B com honorários mensais fixos", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Estágio de Nível Superior (Bolsa + Seguro)", description: "Jornada de 30h semanais com termo de compromisso de estágio", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "jobs-work-model",
      name: "Modelo de Trabalho",
      icon: Building2,
      desc: "Presencial, Híbrido ou 100% Remoto",
      data: {
        display_name: "Jornada e Local de Atuação",
        internal_name: "modelo-presenca-vaga",
        description: "Defina onde as atividades do colaborador serão desempenhadas",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "100% Presencial na Sede da Empresa", description: "Atuação direta nas instalações físicas com equipe", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Modelo Híbrido Flexível (3 dias presenciais, 2 dias remotos)", description: "Equilíbrio entre integração presencial e autonomia em home office", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "100% Remoto (Qualquer Cidade do Brasil)", description: "Trabalho totalmente à distância com equipamentos fornecidos pela empresa", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "jobs-benefits-package",
      name: "Pacote de Benefícios Oferecido",
      icon: Gift,
      desc: "Alimentação, plano de saúde e auxílio home office",
      data: {
        display_name: "Benefícios Corporativos Inclusos",
        internal_name: "beneficios-corporativos-vaga",
        description: "Selecione o pacote de atrativos para os candidatos",
        selection_type: "multiple",
        is_required: false,
        min_selections: 0,
        max_selections: 3,
        values: [
          { label: "Vale Alimentação & Refeição (R$ 950/mês sem desconto em folha)", description: "Cartão multibenefícios aceito em supermercados e restaurantes", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Plano de Saúde e Odontológico Nacional Bradesco/Unimed", description: "Cobertura médica integral para o titular com coparticipação zero", price_modifier_cents: 0, is_default: false, is_active: true },
          { label: "Auxílio Home Office & Ergonomia (R$ 200/mês)", description: "Ajuda de custo para energia elétrica e internet em trabalho remoto", price_modifier_cents: 0, is_default: false, is_active: true },
        ],
      },
    },
  ],

  // 17. ADVOCACIA, CONSULTORIA & JURÍDICO
  legal: [
    {
      id: "legal-consultation-format",
      name: "Formato da Consulta ou Parecer",
      icon: Scale,
      desc: "Videoconferência gravada ou parecer formal assinado",
      data: {
        display_name: "Tipo de Atendimento Jurídico",
        internal_name: "formato-consulta-juridica",
        description: "Selecione a entrega formal do seu serviço jurídico",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        values: [
          { label: "Consulta Verbal por Videoconferência (1 hora)", description: "Orientação estratégica online com gravação disponibilizada ao cliente", price_modifier_cents: 0, is_default: true, is_active: true },
          { label: "Parecer Jurídico Escrito Assinado Digitalmente (ICP-Brasil)", description: "Documento fundamentado com análise de risco e jurisprudência dos tribunais", price_modifier_cents: 95000, is_default: false, is_active: true },
        ],
      },
    },
    {
      id: "legal-diligence",
      name: "Acompanhamento em Audiência ou Órgão Público",
      icon: FileCheck,
      desc: "Presença de advogado titular em audiência de conciliação ou júri",
      data: {
        display_name: "Diligência Presencial Externa",
        internal_name: "diligencia-presencial-juridica",
        description: "Representação jurídica presencial com sustentação de interesses",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        values: [
          { label: "Acompanhamento em Audiência de Conciliação ou Instrução", description: "Advogado sênior presente em sala de audiências", price_modifier_cents: 75000, is_default: false, is_active: true },
          { label: "Despacho Direto com Magistrado / Desembargador", description: "Apresentação de memoriais e despacho de liminar urgente em gabinete", price_modifier_cents: 120000, is_default: false, is_active: true },
        ],
      },
    },
  ],
};

/**
 * Mapeamento canônico de apelidos/sinônimos de nichos para suas verticais de presets.
 */
const NICHE_ALIASES: Record<string, string> = {
  vehicles: "automotive",
  healthcare: "pharmacy",
  creator: "services",
  news: "services",
  generic: "retail",
};

/**
 * Nomes amigáveis e descritivos das 17 verticais de negócio.
 */
export const NICHE_LABELS: Record<string, string> = {
  retail: "Varejo, Moda & Vestuário",
  gastronomy: "Gastronomia, Restaurantes & Delivery",
  tourism: "Turismo, Agências de Viagens & Roteiros",
  supermarket: "Supermercado, Hortifruti & Carnes",
  pharmacy: "Farmácia, Manipulação & Saúde",
  pet: "Pet Shop, Veterinária & Banho/Tosa",
  tech_repair: "Assistência Técnica & Eletrônicos",
  services: "Serviços Gerais, Beleza & Estética",
  automotive: "Oficinas Mecânicas & Automotivo",
  construction: "Construção Civil & Materiais",
  events: "Eventos, Shows & Ingressos",
  education: "Cursos, Educação & Treinamentos",
  rental: "Locação de Equipamentos & Estruturas",
  real_estate: "Imóveis & Imobiliária",
  wholesale: "Atacado & Distribuidoras (B2B)",
  jobs: "Empregos & Recrutamento",
  legal: "Advocacia & Serviços Jurídicos",
};

/**
 * Interface canônica para placeholders adaptativos de modificadores e adicionais por nicho.
 */
export interface NicheModifierPlaceholders {
  groupNamePlaceholder: string;
  groupInternalPlaceholder: string;
  groupDescPlaceholder: string;
  optionLabelPlaceholder: string;
  optionDescPlaceholder: string;
}

/**
 * Retorna placeholders 100% humanizados e aderentes à realidade do nicho ativo,
 * erradicando vazamento de termos gastronômicos (ex: bacon) em moda, turismo ou serviços.
 */
export function getNicheModifierPlaceholders(nicheId?: string): NicheModifierPlaceholders {
  const resolved = NICHE_ALIASES[nicheId || ""] || nicheId || "retail";

  switch (resolved) {
    case "retail":
      return {
        groupNamePlaceholder: "Ex: Grade de Tamanhos (P, M, G) ou Variação de Cores",
        groupInternalPlaceholder: "Ex: grade-tamanhos-vestuario",
        groupDescPlaceholder: "Ex: Selecione o tamanho e cor ideais da sua peça",
        optionLabelPlaceholder: "Nome da opção (ex: Tamanho M / Cor Azul Marinho)",
        optionDescPlaceholder: "Descrição curta (ex: 100% algodão penteado com caimento slim)",
      };
    case "gastronomy":
      return {
        groupNamePlaceholder: "Ex: Ponto da Carne ou Adicionais do Prato",
        groupInternalPlaceholder: "Ex: ponto-da-carne",
        groupDescPlaceholder: "Ex: Escolha até 3 opções para turbinar seu pedido",
        optionLabelPlaceholder: "Nome do adicional (ex: Bacon Crocante Especial)",
        optionDescPlaceholder: "Descrição curta (ex: 2 fatias defumadas em lenha de macieira)",
      };
    case "tourism":
      return {
        groupNamePlaceholder: "Ex: Regime de Alimentação ou Opcionais do Roteiro",
        groupInternalPlaceholder: "Ex: regime-alimentacao-incluso",
        groupDescPlaceholder: "Ex: Selecione os opcionais e serviços inclusos no seu pacote",
        optionLabelPlaceholder: "Nome do opcional (ex: Café da Manhã Incluso / All-Inclusive)",
        optionDescPlaceholder: "Descrição curta (ex: Buffet completo servido diariamente no restaurante principal)",
      };
    case "supermarket":
      return {
        groupNamePlaceholder: "Ex: Ponto de Maturação ou Tipo de Corte do Açougue",
        groupInternalPlaceholder: "Ex: tipo-corte-acougue",
        groupDescPlaceholder: "Ex: Escolha como deseja receber o produto fresco preparado",
        optionLabelPlaceholder: "Nome da preferência (ex: Bife Fino para Frigideira)",
        optionDescPlaceholder: "Descrição curta (ex: Fatiado fino e embalado a vácuo em porções de 500g)",
      };
    case "pharmacy":
      return {
        groupNamePlaceholder: "Ex: Forma Farmacêutica ou Concentração da Dose",
        groupInternalPlaceholder: "Ex: forma-farmaceutica-apresentacao",
        groupDescPlaceholder: "Ex: Selecione a apresentação prescrita pelo médico",
        optionLabelPlaceholder: "Nome da opção (ex: Cápsulas Gelatinosas Incolores 500mg)",
        optionDescPlaceholder: "Descrição curta (ex: Frasco com 60 cápsulas de absorção gastro-resistente)",
      };
    case "pet":
      return {
        groupNamePlaceholder: "Ex: Porte do Animal ou Serviços Extras de Tosa",
        groupInternalPlaceholder: "Ex: porte-do-pet",
        groupDescPlaceholder: "Ex: Selecione as características para o atendimento do seu pet",
        optionLabelPlaceholder: "Nome do serviço/opção (ex: Tosa Higiênica + Hidratação de Argan)",
        optionDescPlaceholder: "Descrição curta (ex: Limpeza auricular completa e corte de unhas inclusos)",
      };
    case "tech_repair":
      return {
        groupNamePlaceholder: "Ex: Procedência da Peça / Tela ou Película Protetora",
        groupInternalPlaceholder: "Ex: qualidade-tela-substituicao",
        groupDescPlaceholder: "Ex: Selecione o padrão de qualidade e garantia das peças",
        optionLabelPlaceholder: "Nome da peça/serviço (ex: Tela Original Nacional com 1 Ano de Garantia)",
        optionDescPlaceholder: "Descrição curta (ex: Alta resolução OLED e sensibilidade touch original)",
      };
    case "services":
      return {
        groupNamePlaceholder: "Ex: Procedimento Adicional ou Finalização Especial",
        groupInternalPlaceholder: "Ex: adicionais-atendimento",
        groupDescPlaceholder: "Ex: Escolha adicionais para enriquecer seu atendimento",
        optionLabelPlaceholder: "Nome do procedimento (ex: Hidratação Profunda com Ozonioterapia)",
        optionDescPlaceholder: "Descrição curta (ex: Recuperação celular com brilho imediato por 20 minutos)",
      };
    case "automotive":
      return {
        groupNamePlaceholder: "Ex: Especificação do Óleo ou Geometria 3D",
        groupInternalPlaceholder: "Ex: especificacao-oleo-motor",
        groupDescPlaceholder: "Ex: Atenda às recomendações do fabricante com serviços especializados",
        optionLabelPlaceholder: "Nome do serviço/insumo (ex: Óleo 100% Sintético 5W30 com Filtro Novo)",
        optionDescPlaceholder: "Descrição curta (ex: Troca completa com descarte ecológico do óleo usado)",
      };
    case "construction":
      return {
        groupNamePlaceholder: "Ex: Acabamento da Tinta ou Logística de Descarga",
        groupInternalPlaceholder: "Ex: acabamento-tinta-fachada",
        groupDescPlaceholder: "Ex: Defina as especificações técnicas para a sua obra",
        optionLabelPlaceholder: "Nome da especificação (ex: Acetinado Suave Lavável)",
        optionDescPlaceholder: "Descrição curta (ex: Resistente a manchas com facilidade de limpeza diária)",
      };
    case "events":
      return {
        groupNamePlaceholder: "Ex: Setor do Ingresso ou Acesso aos Bastidores",
        groupInternalPlaceholder: "Ex: setor-ingresso-show",
        groupDescPlaceholder: "Ex: Defina a área de acesso e comodidades do participante",
        optionLabelPlaceholder: "Nome do setor (ex: Camarote Open Bar & Food VIP)",
        optionDescPlaceholder: "Descrição curta (ex: Acesso a bebidas premium, buffet livre e visão panorâmica)",
      };
    case "education":
      return {
        groupNamePlaceholder: "Ex: Período de Acesso ou Modalidade do Certificado",
        groupInternalPlaceholder: "Ex: plano-acesso-curso",
        groupDescPlaceholder: "Ex: Selecione a vigência e formato dos materiais didáticos",
        optionLabelPlaceholder: "Nome do plano/item (ex: Acesso Vitalício VIP + Próximas Atualizações)",
        optionDescPlaceholder: "Descrição curta (ex: Inclui mentorias ao vivo e todas as futuras turmas)",
      };
    case "rental":
      return {
        groupNamePlaceholder: "Ex: Operador Técnico Habilitado ou Seguro Contra Danos",
        groupInternalPlaceholder: "Ex: operador-tecnico-diaria",
        groupDescPlaceholder: "Ex: Itens e suporte operacional para a locação do equipamento",
        optionLabelPlaceholder: "Nome do opcional (ex: Técnico Especialista por Diária de 8h)",
        optionDescPlaceholder: "Descrição curta (ex: Acompanhamento integral durante todo o período do evento)",
      };
    case "real_estate":
      return {
        groupNamePlaceholder: "Ex: Garantia Locatícia ou Vistoria Técnica",
        groupInternalPlaceholder: "Ex: garantia-locaticia-contrato",
        groupDescPlaceholder: "Ex: Parâmetros contratuais e condições de entrega do imóvel",
        optionLabelPlaceholder: "Nome da modalidade (ex: Seguro Fiança Parcelado no Boleto)",
        optionDescPlaceholder: "Descrição curta (ex: Dispensa fiador tradicional e agiliza aprovação em 15 minutos)",
      };
    case "wholesale":
      return {
        groupNamePlaceholder: "Ex: Unidade de Embalagem B2B ou Modalidade de Frete",
        groupInternalPlaceholder: "Ex: unidade-embalagem-revenda",
        groupDescPlaceholder: "Ex: Padrão logístico para manuseio e expedição no atacado",
        optionLabelPlaceholder: "Nome do padrão (ex: Caixa Master Reforçada com 48 Unidades)",
        optionDescPlaceholder: "Descrição curta (ex: Papelão ondulado duplo ideal para empilhamento vertical)",
      };
    case "jobs":
      return {
        groupNamePlaceholder: "Ex: Regime de Contratação ou Modelo de Trabalho",
        groupInternalPlaceholder: "Ex: regime-contratacao-vaga",
        groupDescPlaceholder: "Ex: Enquadramento trabalhista e política de benefícios",
        optionLabelPlaceholder: "Nome do regime (ex: CLT Efetivo com Benefícios Integrais)",
        optionDescPlaceholder: "Descrição curta (ex: Vale alimentação, plano de saúde nacional e 13º salário)",
      };
    case "legal":
      return {
        groupNamePlaceholder: "Ex: Formato do Parecer ou Diligência Presencial",
        groupInternalPlaceholder: "Ex: formato-atendimento-juridico",
        groupDescPlaceholder: "Ex: Escopo da prestação de serviços advocatícios e consultoria",
        optionLabelPlaceholder: "Nome do serviço (ex: Parecer Jurídico Escrito com Certificação Digital)",
        optionDescPlaceholder: "Descrição curta (ex: Análise doutrinária e jurisprudencial detalhada em PDF assinado)",
      };
    default:
      return {
        groupNamePlaceholder: "Ex: Opções e Variações do Item",
        groupInternalPlaceholder: "Ex: opcoes-complementares",
        groupDescPlaceholder: "Ex: Escolha as opções desejadas para personalizar o item",
        optionLabelPlaceholder: "Nome da opção (ex: Opção Padrão)",
        optionDescPlaceholder: "Descrição curta dos detalhes desta opção",
      };
  }
}

/**
 * Retorna a lista de presets recomendados para o nicho informado.
 * Se o nicho não tiver lista específica, resolve via alias ou utiliza o fallback de varejo.
 */
export function getNicheOptionGroupPresets(nicheId: string): OptionGroupPreset[] {
  const resolved = NICHE_ALIASES[nicheId] || nicheId;
  return NICHE_OPTION_PRESETS[resolved] || NICHE_OPTION_PRESETS.retail;
}

/**
 * Retorna todos os grupos de presets organizados por vertical comercial.
 */
export function getAllOptionGroupPresets(): Array<{
  nicheId: string;
  nicheLabel: string;
  presets: OptionGroupPreset[];
}> {
  return Object.keys(NICHE_OPTION_PRESETS).map((key) => ({
    nicheId: key,
    nicheLabel: NICHE_LABELS[key] || key,
    presets: NICHE_OPTION_PRESETS[key] || [],
  }));
}

/**
 * Busca presets em todo o catálogo global ou restrito a um nicho específico.
 */
export function searchOptionGroupPresets(query: string, nicheId?: string): OptionGroupPreset[] {
  const normalizedQuery = query.toLowerCase().trim();
  const targetNiches =
    nicheId && nicheId !== "all"
      ? [NICHE_ALIASES[nicheId] || nicheId]
      : Object.keys(NICHE_OPTION_PRESETS);

  const matched: OptionGroupPreset[] = [];
  const seenIds = new Set<string>();

  for (const nid of targetNiches) {
    const list = NICHE_OPTION_PRESETS[nid] || [];
    for (const preset of list) {
      if (seenIds.has(preset.id)) continue;

      if (!normalizedQuery) {
        matched.push(preset);
        seenIds.add(preset.id);
        continue;
      }

      const matchName = preset.name.toLowerCase().includes(normalizedQuery);
      const matchDesc = preset.desc.toLowerCase().includes(normalizedQuery);
      const matchDisplayName = preset.data.display_name.toLowerCase().includes(normalizedQuery);
      const matchValues = preset.data.values.some(
        (v) =>
          v.label.toLowerCase().includes(normalizedQuery) ||
          v.description.toLowerCase().includes(normalizedQuery),
      );

      if (matchName || matchDesc || matchDisplayName || matchValues) {
        matched.push(preset);
        seenIds.add(preset.id);
      }
    }
  }

  return matched;
}

