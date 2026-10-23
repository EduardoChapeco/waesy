/**
 * Canonical AI Writing Copilot Engine — Context Adapters, Fact Lock Guard,
 * Selection-Scoped Rewriting, Selective Patch Engine & Editorial Quality Heuristics.
 */

export type CopilotScope =
  | 'all_editorial_fields'
  | 'title'
  | 'description'
  | 'summary'
  | 'tags'
  | 'selection'

export type CopilotOperation =
  | 'improve'
  | 'fix_grammar'
  | 'rewrite'
  | 'shorten'
  | 'expand'
  | 'simplify'
  | 'clarify'
  | 'persuasive'
  | 'remove_repetition'
  | 'improve_cta'
  | 'optimize_discovery'
  | 'generate_tags'
  | 'custom_instruction'

export type CopilotTone =
  | 'profissional'
  | 'direto'
  | 'comercial'
  | 'elegante'
  | 'premium'
  | 'amigavel'
  | 'informativo'
  | 'storytelling'
  | 'inspirador'
  | 'tecnico'
  | 'minimalista'

export type CopilotLength = 'short' | 'medium' | 'complete'

export type CopilotGoal =
  | 'conversion'
  | 'clarity'
  | 'discovery'
  | 'trust'
  | 'storytelling'

export type EditorialFieldKey = 'title' | 'description' | 'summary' | 'tags'

export const ALLOWED_COPILOT_EDITORIAL_FIELDS: readonly EditorialFieldKey[] = [
  'title',
  'description',
  'summary',
  'tags',
] as const

export const FORBIDDEN_COPILOT_MUTATION_FIELDS = [
  'price',
  'price_cents',
  'promotional_price_cents',
  'owner_id',
  'user_id',
  'store_id',
  'tenant_id',
  'status',
  'moderation_status',
  'is_verified',
  'permissions',
  'role',
] as const

export interface LockedFact {
  key: string
  label: string
  value: string
  category: 'number' | 'price' | 'date' | 'location' | 'identity' | 'spec'
  mustAppearInText?: boolean
}

export interface CopilotSelectionRange {
  start: number
  end: number
  selectedText: string
}

export interface CopilotWorkingDraft {
  title: string
  description: string
  summary: string
  tags: string[]
}

export interface CopilotFieldChange {
  field: EditorialFieldKey
  before: string | string[]
  after: string | string[]
  reason: string
}

export interface CopilotVariant {
  id: 'version1' | 'version2' | 'version3'
  label: string
  toneLabel: string
  title: string
  description: string
  summary: string
  tags: string[]
  changeExplanations: string[]
}

export interface EditorialQualityHint {
  id: string
  field: EditorialFieldKey
  severity: 'info' | 'warning' | 'good'
  message: string
  suggestedOperation?: CopilotOperation
  suggestedScope?: CopilotScope
}

export interface FactValidationResult {
  isValid: boolean
  lockedFactsPreserved: boolean
  missingFacts: LockedFact[]
  hallucinatedClaims: string[]
  blockedFieldAttempt: boolean
  blockedFieldReason?: string
  warnings: string[]
}

export interface CopilotHistoryEntry {
  id: string
  timestamp: number
  label: string
  operation: CopilotOperation
  scope: CopilotScope
  draft: CopilotWorkingDraft
}

export interface CopilotContextInput {
  entityId?: string
  storeId?: string
  niche: string
  categoryName?: string
  title: string
  description: string
  summary?: string
  tags?: string[]
  price?: string | number
  city?: string
  neighborhood?: string
  attributes?: Record<string, unknown>
}

export interface CopilotStructuredContext {
  niche: string
  nicheLabel: string
  availableFields: EditorialFieldKey[]
  lockedFacts: LockedFact[]
  writingHints: string[]
  nicheRecommendedTone: CopilotTone
  nicheForbiddenTerms: string[]
  factualSummaryLines: string[]
  currentDraft: CopilotWorkingDraft
  sourceFingerprint: string
}

export interface CopilotRewriteRequest {
  entityId?: string
  storeId?: string
  niche: string
  title: string
  description: string
  summary?: string
  tags?: string[]
  attributes?: Record<string, unknown>
  scope?: CopilotScope
  operation?: CopilotOperation
  tone?: CopilotTone
  length?: CopilotLength
  goal?: CopilotGoal
  userInstruction?: string
  selectedText?: string
  selectionRange?: { start: number; end: number }
  sourceVersion?: string
}

export interface CopilotSuggestionResponse {
  version1: {
    title: string
    description: string
    summary: string
    tags: string[]
  }
  version2: {
    title: string
    description: string
    summary: string
    tags: string[]
  }
  version3: {
    title: string
    description: string
    summary: string
    tags: string[]
  }
  variants: CopilotVariant[]
  suggestedTags: string[]
  changes: CopilotFieldChange[]
  changeExplanations: string[]
  warnings: string[]
  lockedFacts: LockedFact[]
  lockedFactsPreserved: boolean
  blockedFieldAttempt: boolean
  blockedFieldReason?: string
  selectionReplacement?: string
  qualityHints: EditorialQualityHint[]
  sourceVersion: string
}

interface NicheCopilotAdapterConfig {
  label: string
  recommendedTone: CopilotTone
  writingHints: string[]
  forbiddenCrossNicheTerms: string[]
  factExtractors: Array<{
    keys: string[]
    label: string
    category: LockedFact['category']
    suffix?: string
    mustAppearInText?: boolean
  }>
}

export const NICHE_COPILOT_ADAPTERS: Record<string, NicheCopilotAdapterConfig> = {
  evento: {
    label: 'Eventos, Shows e Ingressos',
    recommendedTone: 'inspirador',
    writingHints: [
      'Destacar nome oficial do evento, data, horário de abertura, local/cidade e programação confirmada.',
      'Estruturar a descrição em blocos escaneáveis: Sobre o Evento, Atrações/Programação, Ingressos/Setores e Informações Importantes.',
      'Jamais inventar número de participantes, patrocinadores, gratuidade ou superlativos não comprovados.',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'ipva', 'dormitórios', 'garantia de fábrica', 'clt'],
    factExtractors: [
      { keys: ['event_date', 'date', 'start_date'], label: 'Data do Evento', category: 'date' },
      { keys: ['start_time', 'door_time', 'time'], label: 'Horário', category: 'date' },
      { keys: ['venue_name', 'venue', 'location_name'], label: 'Local / Espaço', category: 'location' },
      { keys: ['age_rating', 'classification'], label: 'Classificação Etária', category: 'spec' },
      { keys: ['event_format', 'format'], label: 'Formato', category: 'spec' },
      { keys: ['lineup', 'attractions', 'speakers'], label: 'Atrações / Palestrantes', category: 'identity' },
    ],
  },
  veiculo: {
    label: 'Veículos e Automotivo',
    recommendedTone: 'direto',
    writingHints: [
      'Priorizar marca, modelo, versão, ano/modelo, quilometragem exata, câmbio e combustível logo na abertura.',
      'Destacar histórico de manutenção, documentação e opcionais reais informados pelo anunciante.',
      'Nunca alterar ano, quilometragem, valor FIPE ou inventar único dono/revisões em concessionária sem evidência.',
    ],
    forbiddenCrossNicheTerms: ['quartos', 'suítes', 'condomínio mensal', 'check-in', 'hospedagem'],
    factExtractors: [
      { keys: ['brand', 'vehicle_brand', 'make'], label: 'Marca', category: 'identity' },
      { keys: ['model', 'vehicle_model'], label: 'Modelo', category: 'identity' },
      { keys: ['year', 'vehicle_year', 'model_year'], label: 'Ano', category: 'number', mustAppearInText: true },
      { keys: ['mileage', 'km', 'vehicle_km'], label: 'Quilometragem', category: 'number', suffix: ' km' },
      { keys: ['transmission', 'gearbox'], label: 'Câmbio', category: 'spec' },
      { keys: ['fuel', 'fuel_type'], label: 'Combustível', category: 'spec' },
      { keys: ['color'], label: 'Cor', category: 'spec' },
      { keys: ['armor', 'armored'], label: 'Blindagem', category: 'spec' },
    ],
  },
  imovel: {
    label: 'Imóveis',
    recommendedTone: 'elegante',
    writingHints: [
      'Evidenciar tipologia do imóvel, metragem útil/total, dormitórios, suítes, vagas de garagem e localização.',
      'Organizar a descrição em distribuição interna, diferenciais de acabamento, infraestrutura do condomínio e entorno.',
      'Preservar rigorosamente metragem, número de quartos, valor de condomínio/IPTU e modalidade (venda ou locação).',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'câmbio automático', 'ingressos', 'lote promocional'],
    factExtractors: [
      { keys: ['property_type', 'type'], label: 'Tipo de Imóvel', category: 'spec' },
      { keys: ['transaction_type', 'purpose', 'finalidade'], label: 'Finalidade', category: 'spec' },
      { keys: ['area_sqm', 'area', 'useful_area'], label: 'Área', category: 'number', suffix: 'm²' },
      { keys: ['bedrooms', 'quartos', 'dorms'], label: 'Quartos', category: 'number' },
      { keys: ['suites'], label: 'Suítes', category: 'number' },
      { keys: ['bathrooms', 'banheiros'], label: 'Banheiros', category: 'number' },
      { keys: ['parking_spaces', 'garage', 'vagas'], label: 'Vagas', category: 'number' },
      { keys: ['condo_fee', 'condominio'], label: 'Condomínio', category: 'price' },
      { keys: ['iptu'], label: 'IPTU', category: 'price' },
    ],
  },
  vaga: {
    label: 'Vagas de Emprego e Recrutamento',
    recommendedTone: 'profissional',
    writingHints: [
      'Apresentar cargo, regime de contratação, modelo de trabalho (presencial/híbrido/remoto) e escala de forma objetiva.',
      'Separar claramente Responsabilidades, Requisitos Obrigatórios, Diferenciais e Benefícios oferecidos.',
      'Manter inalterados salário, escala (ex.: 5x2, 6x1, 12x36), carga horária e regime (CLT/PJ/Estágio).',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'ipva pago', 'aceita permuta', 'frete grátis'],
    factExtractors: [
      { keys: ['job_role', 'role', 'position'], label: 'Cargo', category: 'identity' },
      { keys: ['contract_type', 'regime', 'employment_type'], label: 'Regime de Contratação', category: 'spec' },
      { keys: ['work_model', 'modality', 'workplace_type'], label: 'Modelo de Trabalho', category: 'spec' },
      { keys: ['work_schedule', 'schedule', 'escala'], label: 'Escala / Jornada', category: 'spec' },
      { keys: ['salary_range', 'salary', 'remuneration'], label: 'Remuneração', category: 'price' },
      { keys: ['seniority', 'experience_level'], label: 'Senioridade', category: 'spec' },
      { keys: ['benefits'], label: 'Benefícios', category: 'spec' },
    ],
  },
  servico: {
    label: 'Serviços Profissionais e Técnicos',
    recommendedTone: 'profissional',
    writingHints: [
      'Explicar com clareza qual problema o serviço resolve, o que está incluso no atendimento e como funciona o orçamento.',
      'Destacar modalidade de atendimento (domicílio, presencial ou remoto), região atendida e prazo/garantia informados.',
      'Não prometer certificações, plantão 24h ou garantias que não constem nos dados fornecidos.',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'quartos', 'suítes', 'lote de ingresso'],
    factExtractors: [
      { keys: ['service_type', 'specialty'], label: 'Especialidade', category: 'spec' },
      { keys: ['billing_type', 'pricing_model'], label: 'Modelo de Cobrança', category: 'spec' },
      { keys: ['attendance_mode', 'service_location'], label: 'Modalidade de Atendimento', category: 'location' },
      { keys: ['service_warranty', 'warranty'], label: 'Garantia do Serviço', category: 'spec' },
      { keys: ['availability', 'hours'], label: 'Disponibilidade', category: 'date' },
    ],
  },
  viagem: {
    label: 'Turismo, Excursões e Pacotes de Viagem',
    recommendedTone: 'storytelling',
    writingHints: [
      'Destacar destino, cidade de embarque, datas de saída e retorno, duração do pacote e itens inclusos.',
      'Estruturar a narrativa em Experiência no Destino, Roteiro Previsto, O Que Está Incluso e Logística de Embarque.',
      'Proibido vazar termos de produtos físicos (Retirada no Local, Temperatura, Finalidade: Venda) ou alterar datas/valores.',
    ],
    forbiddenCrossNicheTerms: [
      'finalidade: venda',
      'retirada no local',
      'temperatura: gelada',
      'quilometragem',
      'ipva',
      'clt',
    ],
    factExtractors: [
      { keys: ['destination', 'destino', 'destination_city'], label: 'Destino', category: 'location' },
      { keys: ['departure_location', 'origin_city', 'embarque'], label: 'Saída / Embarque', category: 'location' },
      { keys: ['departure_date', 'start_date'], label: 'Data de Ida', category: 'date' },
      { keys: ['return_date', 'end_date'], label: 'Data de Retorno', category: 'date' },
      { keys: ['duration_days', 'days'], label: 'Duração (Dias)', category: 'number' },
      { keys: ['accommodation_name', 'hotel_name'], label: 'Hospedagem', category: 'identity' },
      { keys: ['included_items', 'inclusions'], label: 'Itens Inclusos', category: 'spec' },
    ],
  },
  hospedagem: {
    label: 'Hospedagem e Temporada',
    recommendedTone: 'amigavel',
    writingHints: [
      'Destacar capacidade máxima de hóspedes, configuração de camas/quartos, comodidades e horários de check-in/check-out.',
      'Transmitir hospitalidade, conforto e proximidade de pontos de interesse reais informados.',
      'Manter inalterados limite de hóspedes, regras da casa, horários de check-in/check-out e taxas.',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'câmbio', 'clt', 'salário'],
    factExtractors: [
      { keys: ['max_guests', 'guests', 'capacity'], label: 'Capacidade de Hóspedes', category: 'number' },
      { keys: ['bedrooms', 'rooms'], label: 'Quartos', category: 'number' },
      { keys: ['beds'], label: 'Camas', category: 'number' },
      { keys: ['check_in', 'checkin_time'], label: 'Check-in', category: 'date' },
      { keys: ['check_out', 'checkout_time'], label: 'Check-out', category: 'date' },
      { keys: ['amenities'], label: 'Comodidades', category: 'spec' },
    ],
  },
  gastronomia: {
    label: 'Gastronomia, Alimentação e Bebidas',
    recommendedTone: 'comercial',
    writingHints: [
      'Valorizar ingredientes principais, modo de preparo artesanal, porcionamento (peso/volume/serve quantas pessoas) e conservação.',
      'Informar alertas de alergênicos ou restrições alimentares somente quando confirmados pelo anunciante.',
      'Preservar peso, volume, quantidade da porção e temperatura de entrega.',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'suítes', 'iptu', 'regime clt'],
    factExtractors: [
      { keys: ['portion_size', 'weight', 'volume'], label: 'Porção / Peso / Volume', category: 'number' },
      { keys: ['serves', 'serving_count'], label: 'Rendimento', category: 'number' },
      { keys: ['dietary_info', 'allergens'], label: 'Informação Alimentar', category: 'spec' },
      { keys: ['beverage_temperature', 'temperature'], label: 'Temperatura', category: 'spec' },
    ],
  },
  mercado: {
    label: 'Comércio, Varejo e Conveniência',
    recommendedTone: 'comercial',
    writingHints: [
      'Destacar marca, modelo/linha, especificações técnicas, conteúdo da embalagem e estado de conservação.',
      'Apresentar benefícios práticos de uso e condições reais de entrega ou retirada.',
      'Manter marca, modelo, voltagem, capacidade e medidas exatamente iguais ao original.',
    ],
    forbiddenCrossNicheTerms: ['suítes', 'condomínio', 'check-in', 'escala 5x2'],
    factExtractors: [
      { keys: ['brand', 'product_brand'], label: 'Marca', category: 'identity' },
      { keys: ['model', 'product_model'], label: 'Modelo', category: 'identity' },
      { keys: ['condition', 'product_condition'], label: 'Condição', category: 'spec' },
      { keys: ['voltage', 'power'], label: 'Voltagem / Potência', category: 'spec' },
      { keys: ['dimensions', 'size', 'capacity'], label: 'Dimensões / Capacidade', category: 'number' },
    ],
  },
  desapego: {
    label: 'Desapego, Usados e Seminovos',
    recommendedTone: 'direto',
    writingHints: [
      'Comunicar com transparência o estado real de conservação, tempo de uso, motivo da venda e itens que acompanham.',
      'Passar confiança ao comprador informando funcionamento e eventuais marcas de uso honestas.',
      'Jamais declarar produto lacrado ou com nota/garantia se o anunciante informou item usado sem garantia.',
    ],
    forbiddenCrossNicheTerms: ['suítes', 'iptu', 'regime clt', 'hospedagem inclusa'],
    factExtractors: [
      { keys: ['condition', 'item_condition'], label: 'Condição do Item', category: 'spec' },
      { keys: ['brand'], label: 'Marca', category: 'identity' },
      { keys: ['model'], label: 'Modelo', category: 'identity' },
      { keys: ['usage_time'], label: 'Tempo de Uso', category: 'spec' },
      { keys: ['accessories', 'included_accessories'], label: 'Acessórios Inclusos', category: 'spec' },
    ],
  },
  negocio: {
    label: 'Negócios, Franquias e Oportunidades B2B',
    recommendedTone: 'profissional',
    writingHints: [
      'Destacar segmento de atuação, estrutura operacional, ativos incluídos na operação e diferenciais de ponto/carteira.',
      'Manter indicadores financeiros (faturamento, lucro líquido, aluguel, estoque) estritamente fiéis aos dados informados.',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'câmbio automático', 'check-in'],
    factExtractors: [
      { keys: ['business_type', 'sector'], label: 'Segmento', category: 'spec' },
      { keys: ['monthly_revenue', 'revenue'], label: 'Faturamento Mensal', category: 'price' },
      { keys: ['monthly_profit', 'net_profit'], label: 'Lucro Estimado', category: 'price' },
      { keys: ['employees_count', 'team_size'], label: 'Equipe', category: 'number' },
    ],
  },
  agro: {
    label: 'Agronegócio, Máquinas e Insumos Rurais',
    recommendedTone: 'tecnico',
    writingHints: [
      'Evidenciar especificações técnicas rurais (horas de motor, safra, potência em cv, peso, linhagem ou área em hectares).',
      'Preservar integralmente números de série, horímetro, peso em arrobas/sacas e condições logísticas.',
    ],
    forbiddenCrossNicheTerms: ['suítes', 'condomínio residencial', 'check-in'],
    factExtractors: [
      { keys: ['engine_hours', 'horimetro', 'hours'], label: 'Horímetro / Horas', category: 'number' },
      { keys: ['horsepower', 'power_hp', 'potencia'], label: 'Potência', category: 'number' },
      { keys: ['year', 'harvest_year'], label: 'Ano / Safra', category: 'number' },
      { keys: ['breed', 'variety'], label: 'Raça / Variedade', category: 'spec' },
    ],
  },
  equipamento: {
    label: 'Locação e Venda de Máquinas e Equipamentos',
    recommendedTone: 'tecnico',
    writingHints: [
      'Detalhar capacidade operacional, tensão elétrica, período de locação (diária/semanal/mensal) e requisitos de caução/entrega.',
      'Manter valores de caução, potência e dimensões sem qualquer alteração.',
    ],
    forbiddenCrossNicheTerms: ['suítes', 'dormitórios', 'regime clt'],
    factExtractors: [
      { keys: ['rental_period', 'period'], label: 'Período', category: 'spec' },
      { keys: ['deposit_amount', 'caucao'], label: 'Caução', category: 'price' },
      { keys: ['voltage', 'power'], label: 'Tensão / Potência', category: 'spec' },
    ],
  },
  digital: {
    label: 'Cursos, Infoprodutos e Serviços Digitais',
    recommendedTone: 'persuasivo' as CopilotTone,
    writingHints: [
      'Destacar formato de entrega, carga horária/módulos, público-alvo e resultados práticos de aprendizado.',
      'Não prometer ganhos financeiros garantidos ou certificações não informadas.',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'retirada no local', 'temperatura: gelada', 'iptu'],
    factExtractors: [
      { keys: ['format', 'delivery_format'], label: 'Formato de Acesso', category: 'spec' },
      { keys: ['workload_hours', 'duration'], label: 'Carga Horária', category: 'number' },
      { keys: ['modules_count'], label: 'Módulos', category: 'number' },
    ],
  },
  doacao: {
    label: 'Doações e Impacto Comunitário',
    recommendedTone: 'amigavel',
    writingHints: [
      'Descrever com clareza o item ou causa, estado de conservação e instruções simples para retirada combinada.',
      'Manter tom acolhedor, respeitoso e objetivo.',
    ],
    forbiddenCrossNicheTerms: ['faturamento mensal', 'lucro líquido', 'parcelamento em 12x'],
    factExtractors: [
      { keys: ['condition'], label: 'Estado do Item', category: 'spec' },
      { keys: ['pickup_instructions'], label: 'Instruções de Retirada', category: 'location' },
    ],
  },
  assinatura: {
    label: 'Clubes de Assinatura e Planos Recorrentes',
    recommendedTone: 'comercial',
    writingHints: [
      'Explicar periodicidade (mensal/trimestral/anual), benefícios recorrentes inclusos e regras de cancelamento/fidelidade.',
      'Preservar ciclo de cobrança e franquia de benefícios.',
    ],
    forbiddenCrossNicheTerms: ['quilometragem', 'ipva', 'escritura pública'],
    factExtractors: [
      { keys: ['billing_cycle', 'periodicity'], label: 'Ciclo de Assinatura', category: 'spec' },
      { keys: ['loyalty_months', 'fidelidade'], label: 'Fidelidade', category: 'number' },
    ],
  },
}

const UNSUPPORTED_SUPERLATIVE_PATTERNS: RegExp[] = [
  /\b(o\s+maior\s+evento\s+da\s+regi[aã]o)\b/i,
  /\b(o\s+melhor\s+do\s+brasil)\b/i,
  /\b(n[uú]mero\s+1\s+do\s+mercado)\b/i,
  /\b(100%\s+garantido\s+sem\s+risco)\b/i,
  /\b(lucro\s+garantido)\b/i,
  /\b(evento\s+100%\s+gratuito)\b/i,
  /\b(\d+\s*mil\s+participantes\s+confirmados)\b/i,
  /\b(500\s+participantes)\b/i,
]

const FORBIDDEN_FIELD_MUTATION_INSTRUCTION_PATTERNS: Array<{
  pattern: RegExp
  field: string
  reason: string
}> = [
  {
    pattern: /\b(alter(?:e|ar)|mud(?:e|ar)|troqu(?:e|ar)|defin(?:a|ir)|abaix(?:e|ar)|sub(?:a|ir))\s+(?:o\s+)?(pre[cç]o|valor)\s+para\b/i,
    field: 'price_cents',
    reason: 'O Copilot Editorial não tem permissão para alterar o campo de preço financeiro do anúncio. Altere o preço diretamente no formulário.',
  },
  {
    pattern: /\b(alter(?:e|ar)|mud(?:e|ar))\s+(?:o\s+)?(owner_id|store_id|user_id|status|permiss[aã]o|role)\b/i,
    field: 'permissions',
    reason: 'Campos de propriedade, loja, status ou permissões são protegidos e imutáveis pelo Copilot Editorial.',
  },
]

export function normalizeNicheKey(rawNiche?: string | null): string {
  const cleaned = String(rawNiche || 'desapego')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (NICHE_COPILOT_ADAPTERS[cleaned]) return cleaned
  if (cleaned.includes('auto') || cleaned.includes('veic') || cleaned.includes('moto') || cleaned.includes('carro')) return 'veiculo'
  if (cleaned.includes('imov') || cleaned.includes('apart') || cleaned.includes('casa')) return 'imovel'
  if (cleaned.includes('event') || cleaned.includes('show') || cleaned.includes('ingress')) return 'evento'
  if (cleaned.includes('vag') || cleaned.includes('empreg') || cleaned.includes('recrut')) return 'vaga'
  if (cleaned.includes('viag') || cleaned.includes('turism') || cleaned.includes('excurs')) return 'viagem'
  if (cleaned.includes('hosped') || cleaned.includes('temporad') || cleaned.includes('hotel')) return 'hospedagem'
  if (cleaned.includes('servic') || cleaned.includes('profiss')) return 'servico'
  if (cleaned.includes('gastron') || cleaned.includes('aliment') || cleaned.includes('comida') || cleaned.includes('restaur')) return 'gastronomia'
  if (cleaned.includes('mercad') || cleaned.includes('varej') || cleaned.includes('conveni') || cleaned.includes('produt')) return 'mercado'
  if (cleaned.includes('negoc') || cleaned.includes('franq')) return 'negocio'
  if (cleaned.includes('agro') || cleaned.includes('rural')) return 'agro'
  if (cleaned.includes('equip') || cleaned.includes('locac')) return 'equipamento'
  if (cleaned.includes('digit') || cleaned.includes('curso')) return 'digital'
  if (cleaned.includes('doac')) return 'doacao'
  if (cleaned.includes('assinat') || cleaned.includes('clube')) return 'assinatura'
  return 'desapego'
}

export function extractSignificantNumbersAndTokens(text: string): string[] {
  if (!text) return []
  const matches = new Set<string>()

  // Years (1950 - 2099)
  const years = text.match(/\b(19[5-9]\d|20\d{2})\b/g) || []
  years.forEach((y) => matches.add(y))

  // Work schedules / dimensions like 5x2, 6x1, 12x36, 4x4
  const schedules = text.match(/\b\d{1,2}x\d{1,2}\b/gi) || []
  schedules.forEach((s) => matches.add(s.toLowerCase()))

  // Measurements / specs like 120m², 120 m2, 45.000 km, 220v, 110v, 500g, 2kg
  const measurements =
    text.match(
      /\b\d+(?:[.,]\d+)?\s?(?:m²|m2|km|cv|hp|kg|g|ml|l|h|hrs|horas|v|gb|tb|quartos|su[ií]tes|vagas|dias)(?=\s|[.,;!?)]|$)/gi,
    ) || []
  measurements.forEach((m) => matches.add(m.trim()))

  // Currency values like R$ 1.200, R$ 85,00
  const currencies = text.match(/R\$\s?\d+(?:\.\d{3})*(?:,\d{2})?/gi) || []
  currencies.forEach((c) => matches.add(c.replace(/\s+/g, ' ').trim()))

  return Array.from(matches)
}

export function computeSourceFingerprint(input: {
  title: string
  description: string
  summary?: string
  tags?: string[]
}): string {
  const normalized = [
    (input.title || '').trim(),
    (input.description || '').trim(),
    (input.summary || '').trim(),
    (input.tags || []).map((t) => t.trim().toLowerCase()).join(','),
  ].join('||')

  let hash = 5381
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i)
  }
  return `v1_${(hash >>> 0).toString(16)}`
}

export function normalizeTagList(rawTags: unknown): string[] {
  if (!rawTags) return []
  const items: string[] = Array.isArray(rawTags)
    ? rawTags.map((t) => String(t ?? ''))
    : typeof rawTags === 'string'
      ? rawTags.split(/[,;\n]+/)
      : []

  const seen = new Set<string>()
  const result: string[] = []

  for (const item of items) {
    const cleaned = item
      .replace(/^#+/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

    if (!cleaned || cleaned.length < 2 || cleaned.length > 36) continue
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    result.push(cleaned)
    if (result.length >= 12) break
  }

  return result
}

export function extractAdCopilotContext(input: CopilotContextInput): CopilotStructuredContext {
  const nicheKey = normalizeNicheKey(input.niche)
  const adapter = NICHE_COPILOT_ADAPTERS[nicheKey] || NICHE_COPILOT_ADAPTERS.desapego
  const attrs = input.attributes && typeof input.attributes === 'object' ? input.attributes : {}
  const specs =
    attrs.specs && typeof attrs.specs === 'object'
      ? (attrs.specs as Record<string, unknown>)
      : {}
  const mergedAttrs: Record<string, unknown> = { ...specs, ...attrs }

  const lockedFacts: LockedFact[] = []
  const seenFactKeys = new Set<string>()

  const pushFact = (fact: LockedFact) => {
    const normValue = String(fact.value || '').trim()
    if (!normValue || normValue === 'undefined' || normValue === 'null') return
    const dedupeKey = `${fact.label.toLowerCase()}:${normValue.toLowerCase()}`
    if (seenFactKeys.has(dedupeKey)) return
    seenFactKeys.add(dedupeKey)
    lockedFacts.push({ ...fact, value: normValue })
  }

  // 1. Extract from adapter-defined keys
  for (const extractor of adapter.factExtractors) {
    for (const key of extractor.keys) {
      const rawVal = mergedAttrs[key]
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
        const formatted = Array.isArray(rawVal)
          ? rawVal.filter(Boolean).join(', ')
          : `${String(rawVal).trim()}${extractor.suffix && !String(rawVal).endsWith(extractor.suffix) ? extractor.suffix : ''}`
        pushFact({
          key,
          label: extractor.label,
          value: formatted,
          category: extractor.category,
          mustAppearInText: extractor.mustAppearInText,
        })
        break
      }
    }
  }

  // 2. Extract location & price if provided
  const city = String(input.city || mergedAttrs.city || mergedAttrs.cidade || '').trim()
  const neighborhood = String(input.neighborhood || mergedAttrs.neighborhood || mergedAttrs.bairro || '').trim()
  if (city || neighborhood) {
    pushFact({
      key: 'location',
      label: 'Localização',
      value: [neighborhood, city].filter(Boolean).join(', '),
      category: 'location',
    })
  }

  if (input.price !== undefined && input.price !== null && String(input.price).trim() !== '' && String(input.price) !== '0') {
    pushFact({
      key: 'price',
      label: 'Valor Informado',
      value: String(input.price).trim(),
      category: 'price',
    })
  }

  // 3. Extract additional non-empty human-readable attributes from mergedAttrs
  const ignoredAttrKeys = new Set([
    'specs',
    'tags',
    'gallery',
    'images',
    'template_id',
    'niche',
    'bio_bullets',
    'summary',
  ])
  for (const [k, v] of Object.entries(mergedAttrs)) {
    if (ignoredAttrKeys.has(k)) continue
    if (v === undefined || v === null || typeof v === 'object') continue
    const strVal = String(v).trim()
    if (!strVal || strVal === 'false' || strVal === 'true') continue
    pushFact({
      key: k,
      label: k.replace(/_/g, ' '),
      value: strVal,
      category: 'spec',
    })
  }

  // 4. Extract significant numbers/dates/schedules already present in title or description
  const combinedSourceText = `${input.title || ''} ${input.description || ''}`
  const tokensInSource = extractSignificantNumbersAndTokens(combinedSourceText)
  for (const token of tokensInSource) {
    pushFact({
      key: `token_${token}`,
      label: 'Dado Numérico Original',
      value: token,
      category: 'number',
      mustAppearInText: true,
    })
  }

  const rawTags = input.tags ?? (mergedAttrs.tags as string[] | string | undefined)
  const normalizedTags = normalizeTagList(rawTags)

  const rawSummary =
    input.summary ??
    (Array.isArray(mergedAttrs.bio_bullets)
      ? (mergedAttrs.bio_bullets as string[]).join('\n')
      : typeof mergedAttrs.summary === 'string'
        ? mergedAttrs.summary
        : '')

  const currentDraft: CopilotWorkingDraft = {
    title: (input.title || '').trim(),
    description: (input.description || '').trim(),
    summary: String(rawSummary || '').trim(),
    tags: normalizedTags,
  }

  const factualSummaryLines = lockedFacts.map((f) => `- ${f.label}: ${f.value}`)

  return {
    niche: nicheKey,
    nicheLabel: adapter.label,
    availableFields: ['title', 'description', 'summary', 'tags'],
    lockedFacts,
    writingHints: adapter.writingHints,
    nicheRecommendedTone: adapter.recommendedTone,
    nicheForbiddenTerms: adapter.forbiddenCrossNicheTerms,
    factualSummaryLines,
    currentDraft,
    sourceFingerprint: computeSourceFingerprint(currentDraft),
  }
}

export function detectForbiddenFieldMutationInstruction(userInstruction?: string): {
  blocked: boolean
  field?: string
  reason?: string
} {
  if (!userInstruction || !userInstruction.trim()) {
    return { blocked: false }
  }
  for (const rule of FORBIDDEN_FIELD_MUTATION_INSTRUCTION_PATTERNS) {
    if (rule.pattern.test(userInstruction)) {
      return {
        blocked: true,
        field: rule.field,
        reason: rule.reason,
      }
    }
  }
  return { blocked: false }
}

export function validateCopilotOutputFacts(params: {
  originalDraft: CopilotWorkingDraft
  suggestedDraft: CopilotWorkingDraft
  lockedFacts: LockedFact[]
  niche?: string
  userInstruction?: string
  scope?: CopilotScope
}): FactValidationResult {
  const {
    originalDraft,
    suggestedDraft,
    lockedFacts,
    niche,
    userInstruction,
    scope = 'all_editorial_fields',
  } = params

  const warnings: string[] = []
  const missingFacts: LockedFact[] = []
  const hallucinatedClaims: string[] = []

  // 1. Check if user instruction attempted to mutate a forbidden field (e.g. price_cents, permissions)
  const instructionCheck = detectForbiddenFieldMutationInstruction(userInstruction)
  if (instructionCheck.blocked && instructionCheck.reason) {
    warnings.push(instructionCheck.reason)
  }

  const combinedOriginal = `${originalDraft.title} ${originalDraft.description} ${originalDraft.summary}`.toLowerCase()
  const combinedSuggested = `${suggestedDraft.title} ${suggestedDraft.description} ${suggestedDraft.summary}`.toLowerCase()

  // 2. Verify mustAppearInText locked facts (years, schedules, explicit numbers in original text)
  if (scope === 'all_editorial_fields' || scope === 'description' || scope === 'title') {
    for (const fact of lockedFacts) {
      if (!fact.mustAppearInText) continue
      const tokenLower = fact.value.toLowerCase()
      const wasInOriginal =
        scope === 'title'
          ? originalDraft.title.toLowerCase().includes(tokenLower)
          : combinedOriginal.includes(tokenLower)

      if (!wasInOriginal) continue

      const isInSuggested =
        scope === 'title'
          ? suggestedDraft.title.toLowerCase().includes(tokenLower)
          : combinedSuggested.includes(tokenLower)

      if (!isInSuggested) {
        missingFacts.push(fact)
        warnings.push(
          `O dado factual "${fact.value}" (${fact.label}) constava no original e deve ser preservado.`,
        )
      }
    }
  }

  // 3. Detect unsupported superlative claims or invented factual numbers not present in original context
  for (const pattern of UNSUPPORTED_SUPERLATIVE_PATTERNS) {
    const matchInSuggested = combinedSuggested.match(pattern)
    const matchInOriginal = combinedOriginal.match(pattern)
    if (matchInSuggested && !matchInOriginal) {
      const claim = matchInSuggested[0]
      hallucinatedClaims.push(claim)
      warnings.push(
        `Afirmação não comprovada detectada e bloqueada pelo Fact Lock: "${claim}".`,
      )
    }
  }

  // 4. Check cross-niche forbidden leakage terms
  if (niche) {
    const adapter = NICHE_COPILOT_ADAPTERS[normalizeNicheKey(niche)]
    if (adapter) {
      for (const forbiddenTerm of adapter.forbiddenCrossNicheTerms) {
        const termLower = forbiddenTerm.toLowerCase()
        if (combinedSuggested.includes(termLower) && !combinedOriginal.includes(termLower)) {
          hallucinatedClaims.push(forbiddenTerm)
          warnings.push(
            `Termo incompatível com o nicho ${adapter.label} detectado: "${forbiddenTerm}".`,
          )
        }
      }
    }
  }

  const lockedFactsPreserved = missingFacts.length === 0 && hallucinatedClaims.length === 0

  return {
    isValid: lockedFactsPreserved && !instructionCheck.blocked,
    lockedFactsPreserved,
    missingFacts,
    hallucinatedClaims,
    blockedFieldAttempt: instructionCheck.blocked,
    blockedFieldReason: instructionCheck.reason,
    warnings,
  }
}

export function sanitizeSuggestedDraftAgainstFactLock(params: {
  originalDraft: CopilotWorkingDraft
  suggestedDraft: CopilotWorkingDraft
  lockedFacts: LockedFact[]
  niche?: string
}): CopilotWorkingDraft {
  const { originalDraft, suggestedDraft, lockedFacts, niche } = params
  let cleanTitle = (suggestedDraft.title || originalDraft.title).trim()
  let cleanDescription = (suggestedDraft.description || originalDraft.description).trim()
  let cleanSummary = (suggestedDraft.summary || originalDraft.summary).trim()

  const combinedOriginal = `${originalDraft.title} ${originalDraft.description}`.toLowerCase()

  // Strip unsupported superlatives that were not in the original text
  for (const pattern of UNSUPPORTED_SUPERLATIVE_PATTERNS) {
    if (!pattern.test(combinedOriginal)) {
      cleanTitle = cleanTitle.replace(pattern, '').replace(/\s{2,}/g, ' ').trim()
      cleanDescription = cleanDescription.replace(pattern, '').replace(/\s{2,}/g, ' ').trim()
      cleanSummary = cleanSummary.replace(pattern, '').replace(/\s{2,}/g, ' ').trim()
    }
  }

  // Strip cross-niche leakage terms
  if (niche) {
    const adapter = NICHE_COPILOT_ADAPTERS[normalizeNicheKey(niche)]
    if (adapter) {
      for (const term of adapter.forbiddenCrossNicheTerms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
        if (!regex.test(combinedOriginal)) {
          cleanDescription = cleanDescription.replace(regex, '').replace(/\s{2,}/g, ' ').trim()
        }
      }
    }
  }

  // Ensure critical tokens from original title (like year 2026) remain if stripped accidentally
  const titleNumbers = extractSignificantNumbersAndTokens(originalDraft.title)
  for (const numToken of titleNumbers) {
    if (!cleanTitle.toLowerCase().includes(numToken.toLowerCase())) {
      cleanTitle = `${cleanTitle} ${numToken}`.trim()
    }
  }

  // Ensure mustAppearInText facts from original description are preserved
  const missingInDescription: string[] = []
  for (const fact of lockedFacts) {
    if (!fact.mustAppearInText) continue
    const tokenLower = fact.value.toLowerCase()
    if (
      originalDraft.description.toLowerCase().includes(tokenLower) &&
      !cleanDescription.toLowerCase().includes(tokenLower)
    ) {
      missingInDescription.push(`${fact.label}: ${fact.value}`)
    }
  }

  if (missingInDescription.length > 0 && cleanDescription) {
    cleanDescription = `${cleanDescription}\n\nDados confirmados: ${missingInDescription.join(' • ')}.`
  }

  // Enforce title limit (max 100 chars without cutting words mid-way)
  if (cleanTitle.length > 100) {
    cleanTitle = cleanTitle.slice(0, 97).replace(/\s+\S*$/, '').trim()
  }

  return {
    title: cleanTitle || originalDraft.title,
    description: cleanDescription || originalDraft.description,
    summary: cleanSummary,
    tags: normalizeTagList(
      suggestedDraft.tags?.length ? suggestedDraft.tags : originalDraft.tags,
    ),
  }
}

export function applySelectionReplacement(
  fullText: string,
  range: { start: number; end: number },
  replacementText: string,
): { updatedText: string; newSelectionEnd: number } {
  const safeStart = Math.max(0, Math.min(range.start, fullText.length))
  const safeEnd = Math.max(safeStart, Math.min(range.end, fullText.length))
  const prefix = fullText.slice(0, safeStart)
  const suffix = fullText.slice(safeEnd)
  const trimmedReplacement = replacementText.trim()
  const updatedText = `${prefix}${trimmedReplacement}${suffix}`
  return {
    updatedText,
    newSelectionEnd: safeStart + trimmedReplacement.length,
  }
}

export function buildSelectivePatch(params: {
  originalDraft: CopilotWorkingDraft
  workingDraft: CopilotWorkingDraft
  selectedFields: Record<EditorialFieldKey, boolean>
}): {
  patchedDraft: CopilotWorkingDraft
  appliedFields: EditorialFieldKey[]
  changes: CopilotFieldChange[]
} {
  const { originalDraft, workingDraft, selectedFields } = params
  const appliedFields: EditorialFieldKey[] = []
  const changes: CopilotFieldChange[] = []

  const patchedDraft: CopilotWorkingDraft = {
    title: originalDraft.title,
    description: originalDraft.description,
    summary: originalDraft.summary,
    tags: [...originalDraft.tags],
  }

  if (selectedFields.title && workingDraft.title.trim() !== originalDraft.title.trim()) {
    patchedDraft.title = workingDraft.title.trim()
    appliedFields.push('title')
    changes.push({
      field: 'title',
      before: originalDraft.title,
      after: patchedDraft.title,
      reason: 'Título atualizado para maior clareza e especificidade.',
    })
  }

  if (
    selectedFields.description &&
    workingDraft.description.trim() !== originalDraft.description.trim()
  ) {
    patchedDraft.description = workingDraft.description.trim()
    appliedFields.push('description')
    changes.push({
      field: 'description',
      before: originalDraft.description,
      after: patchedDraft.description,
      reason: 'Descrição reestruturada com parágrafos escaneáveis e fatos preservados.',
    })
  }

  if (selectedFields.summary && workingDraft.summary.trim() !== originalDraft.summary.trim()) {
    patchedDraft.summary = workingDraft.summary.trim()
    appliedFields.push('summary')
    changes.push({
      field: 'summary',
      before: originalDraft.summary,
      after: patchedDraft.summary,
      reason: 'Síntese de destaques refinada para leitura rápida nos cards.',
    })
  }

  const normOrigTags = normalizeTagList(originalDraft.tags)
  const normWorkTags = normalizeTagList(workingDraft.tags)
  if (selectedFields.tags && normOrigTags.join(',') !== normWorkTags.join(',')) {
    patchedDraft.tags = normWorkTags
    appliedFields.push('tags')
    changes.push({
      field: 'tags',
      before: normOrigTags,
      after: normWorkTags,
      reason: 'Tags de descoberta normalizadas e alinhadas ao nicho.',
    })
  }

  return {
    patchedDraft,
    appliedFields,
    changes,
  }
}

export function computeEditorialQualityHints(
  draft: CopilotWorkingDraft,
  context: CopilotStructuredContext,
): EditorialQualityHint[] {
  const hints: EditorialQualityHint[] = []
  const titleLen = draft.title.trim().length
  const descLen = draft.description.trim().length
  const paragraphs = draft.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (titleLen === 0) {
    hints.push({
      id: 'title-empty',
      field: 'title',
      severity: 'warning',
      message: 'Adicione um título claro informando o item principal e o diferencial.',
      suggestedOperation: 'improve',
      suggestedScope: 'title',
    })
  } else if (titleLen < 18) {
    hints.push({
      id: 'title-short',
      field: 'title',
      severity: 'info',
      message: 'Título muito curto. Incluir especificação ou localização melhora a descoberta na busca.',
      suggestedOperation: 'optimize_discovery',
      suggestedScope: 'title',
    })
  } else if (titleLen > 85) {
    hints.push({
      id: 'title-long',
      field: 'title',
      severity: 'info',
      message: 'Título extenso. Versões entre 35 e 75 caracteres têm leitura mais rápida nos cards.',
      suggestedOperation: 'shorten',
      suggestedScope: 'title',
    })
  } else {
    hints.push({
      id: 'title-good',
      field: 'title',
      severity: 'good',
      message: 'Comprimento de título equilibrado para vitrines Desktop e Mobile.',
    })
  }

  if (descLen < 80) {
    hints.push({
      id: 'desc-short',
      field: 'description',
      severity: 'warning',
      message: `Descrição curta (${descLen} caracteres). Anúncios de ${context.nicheLabel} convertem melhor quando detalham contexto e condições reais.`,
      suggestedOperation: 'expand',
      suggestedScope: 'description',
    })
  } else if (descLen > 450 && paragraphs.length <= 1) {
    hints.push({
      id: 'desc-wall-of-text',
      field: 'description',
      severity: 'info',
      message: 'Texto concentrado em bloco único. Dividir em parágrafos ou tópicos facilita a leitura.',
      suggestedOperation: 'clarify',
      suggestedScope: 'description',
    })
  } else {
    hints.push({
      id: 'desc-good',
      field: 'description',
      severity: 'good',
      message: `Descrição estruturada em ${paragraphs.length} bloco(s) de leitura clara.`,
    })
  }

  if (draft.tags.length < 3) {
    hints.push({
      id: 'tags-few',
      field: 'tags',
      severity: 'info',
      message: 'Adicione pelo menos 4 a 6 tags relevantes para ampliar a encontrabilidade nas buscas.',
      suggestedOperation: 'generate_tags',
      suggestedScope: 'tags',
    })
  }

  return hints
}

export function buildDeterministicCopilotFallback(
  request: CopilotRewriteRequest,
  context: CopilotStructuredContext,
): CopilotSuggestionResponse {
  const origTitle = (request.title || '').trim() || `Anúncio de ${context.nicheLabel}`
  const origDesc = (request.description || '').trim()
  const factBulletLines = context.lockedFacts
    .filter((f) => f.category !== 'number' || !f.key.startsWith('token_'))
    .slice(0, 6)
    .map((f) => `• ${f.label}: ${f.value}`)

  const factsBlock =
    factBulletLines.length > 0 ? `\n\nDestaques e Especificações:\n${factBulletLines.join('\n')}` : ''

  // Handle selection-only fallback deterministically
  let selectionReplacement: string | undefined
  if (request.scope === 'selection' && request.selectedText) {
    const cleanSel = request.selectedText.replace(/\s+/g, ' ').trim()
    if (request.operation === 'shorten') {
      const firstSentence = cleanSel.split(/(?<=[.!?])\s+/)[0] || cleanSel
      selectionReplacement = firstSentence
    } else if (request.operation === 'expand') {
      selectionReplacement = `${cleanSel} Todos os detalhes seguem rigorosamente as especificações informadas no anúncio.`
    } else {
      selectionReplacement = cleanSel.charAt(0).toUpperCase() + cleanSel.slice(1)
    }
  }

  const baseTags = normalizeTagList([
    ...(request.tags || []),
    context.niche,
    ...context.lockedFacts
      .filter((f) => f.category === 'identity' || f.category === 'location' || f.category === 'spec')
      .map((f) => f.value),
    ...origTitle.split(/\s+/).filter((w) => w.length >= 4),
  ])

  const summaryBullets =
    request.summary?.trim() ||
    context.lockedFacts
      .slice(0, 4)
      .map((f) => `${f.label}: ${f.value}`)
      .join('\n') ||
    origTitle

  const v1Title = origTitle
  const v1Desc = origDesc
    ? `${origDesc}${factsBlock}\n\nEntre em contato pelo chat ou WhatsApp para tirar dúvidas e confirmar disponibilidade.`
    : `${origTitle}.${factsBlock}\n\nEntre em contato para mais informações e condições.`

  const v2Title = origTitle.length <= 78 ? `${origTitle} — Confira os Detalhes` : origTitle
  const v2Desc = origDesc
    ? `${origDesc}\n\nPor que escolher esta opção?\n${factBulletLines.length > 0 ? factBulletLines.join('\n') : '• Atendimento ágil e informações transparentes.'}\n\nFale conosco para agendar ou solicitar mais detalhes.`
    : v1Desc

  const v3Title = origTitle
  const v3Desc = origDesc
    ? `${origDesc}${factsBlock}\n\nAtendimento qualificado com total transparência em todas as etapas.`
    : v1Desc

  const sanitizedV1 = sanitizeSuggestedDraftAgainstFactLock({
    originalDraft: context.currentDraft,
    suggestedDraft: { title: v1Title, description: v1Desc, summary: summaryBullets, tags: baseTags },
    lockedFacts: context.lockedFacts,
    niche: context.niche,
  })

  const sanitizedV2 = sanitizeSuggestedDraftAgainstFactLock({
    originalDraft: context.currentDraft,
    suggestedDraft: { title: v2Title, description: v2Desc, summary: summaryBullets, tags: baseTags },
    lockedFacts: context.lockedFacts,
    niche: context.niche,
  })

  const sanitizedV3 = sanitizeSuggestedDraftAgainstFactLock({
    originalDraft: context.currentDraft,
    suggestedDraft: { title: v3Title, description: v3Desc, summary: summaryBullets, tags: baseTags },
    lockedFacts: context.lockedFacts,
    niche: context.niche,
  })

  const validation = validateCopilotOutputFacts({
    originalDraft: context.currentDraft,
    suggestedDraft: sanitizedV1,
    lockedFacts: context.lockedFacts,
    niche: context.niche,
    userInstruction: request.userInstruction,
    scope: request.scope,
  })

  const variants: CopilotVariant[] = [
    {
      id: 'version1',
      label: 'Versão A · Direta & Comercial',
      toneLabel: 'Direto e Escaneável',
      ...sanitizedV1,
      changeExplanations: [
        'Organização em parágrafos curtos com preservação integral dos dados factuais.',
        'Inclusão de fechamento claro para contato sem inventar condições.',
      ],
    },
    {
      id: 'version2',
      label: 'Versão B · Contextual & Atrativa',
      toneLabel: 'Contextualizado',
      ...sanitizedV2,
      changeExplanations: [
        'Abertura contextualizada destacando os diferenciais reais do anúncio.',
        'Estruturação de lista de destaques para leitura rápida no Mobile e Desktop.',
      ],
    },
    {
      id: 'version3',
      label: 'Versão C · Executiva & Premium',
      toneLabel: 'Sobriedade e Confiança',
      ...sanitizedV3,
      changeExplanations: [
        'Linguagem sóbria e foco em credibilidade e precisão técnica.',
      ],
    },
  ]

  return {
    version1: sanitizedV1,
    version2: sanitizedV2,
    version3: sanitizedV3,
    variants,
    suggestedTags: baseTags,
    changes: [
      {
        field: 'title',
        before: context.currentDraft.title,
        after: sanitizedV1.title,
        reason: 'Título revisado mantendo dados factuais originais.',
      },
      {
        field: 'description',
        before: context.currentDraft.description,
        after: sanitizedV1.description,
        reason: 'Descrição estruturada para leitura escaneável.',
      },
      {
        field: 'summary',
        before: context.currentDraft.summary,
        after: sanitizedV1.summary,
        reason: 'Síntese de destaques extraída das especificações reais.',
      },
      {
        field: 'tags',
        before: context.currentDraft.tags,
        after: baseTags,
        reason: 'Tags de busca normalizadas a partir do contexto do nicho.',
      },
    ],
    changeExplanations: variants[0].changeExplanations,
    warnings: validation.warnings,
    lockedFacts: context.lockedFacts,
    lockedFactsPreserved: validation.lockedFactsPreserved,
    blockedFieldAttempt: validation.blockedFieldAttempt,
    blockedFieldReason: validation.blockedFieldReason,
    selectionReplacement,
    qualityHints: computeEditorialQualityHints(sanitizedV1, context),
    sourceVersion: context.sourceFingerprint,
  }
}
