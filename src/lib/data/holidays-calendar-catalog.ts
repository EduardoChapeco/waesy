/**
 * Catálogo Canônico de Feriados Nacionais e Datas Comerciais Críticas do Brasil
 * Fonte: Lei Federal nº 10.607/2002, Lei nº 6.802/1980 e Calendário de Varejo Fecomercio/CNC
 * Usado para: Fechamento automático de lojas, agendamento de promoções,
 * precificação dinâmica de frete/entregadores (Surge Pricing) e relatórios sazonais.
 */

export interface HolidayDefinition {
  id: string;
  name: string;
  date_rule: string; // Ex: "01-01", "12-25", "movel-pascoa", "2-domingo-maio", "black-friday"
  type: "feriado_nacional" | "ponto_facultativo" | "data_comercial_alta" | "feriado_estadual" | "feriado_municipal";
  is_official_holiday: boolean;
  commercial_impact: "extremo" | "alto" | "medio" | "baixo";
  surge_multiplier_suggested: number; // Multiplicador para frete/taxa de entrega local (ex: 1.25 a 1.50)
  target_retail_sectors: string[];    // Setores que mais vendem nessa data
  description: string;
  scope?: "nacional" | "estadual" | "municipal";
  state_code?: string; // Ex: "SP", "RS", "RJ", "SC"
  city_name?: string;  // Ex: "São Paulo", "Chapecó", "Curitiba"
  campaign_lead_days?: number; // Antecedência ideal de campanha (ex: 21 dias)
  marketing_theme?: string;   // Tema sugerido para redes sociais e vitrine
  suggested_promotional_actions?: string[]; // Ações práticas (cupom, combo, frete grátis)
}

export const GLOBAL_HOLIDAYS_CATALOG: HolidayDefinition[] = [
  {
    id: "holiday-ano-novo",
    name: "Confraternização Universal (Ano Novo)",
    date_rule: "01-01",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.50,
    target_retail_sectors: ["gastronomia", "bebidas", "turismo", "hospedagem"],
    description: "Feriado nacional de passagem de ano e confraternização universal.",
  },
  {
    id: "holiday-carnaval-terca",
    name: "Terça-Feira de Carnaval",
    date_rule: "movel-carnaval-terca",
    type: "ponto_facultativo",
    is_official_holiday: false,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.40,
    target_retail_sectors: ["turismo", "eventos", "gastronomia", "bebidas", "vestuario"],
    description: "Ponto facultativo tradicional do Carnaval brasileiro com grande movimentação de festas e turismo.",
  },
  {
    id: "holiday-sexta-feira-santa",
    name: "Sexta-Feira Santa (Paixão de Cristo)",
    date_rule: "movel-sexta-santa",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "alto",
    surge_multiplier_suggested: 1.30,
    target_retail_sectors: ["pescados", "gastronomia", "chocolates", "turismo_religioso"],
    description: "Feriado nacional religioso com forte consumo de pescados e celebrações da Semana Santa.",
  },
  {
    id: "holiday-pascoa",
    name: "Domingo de Páscoa",
    date_rule: "movel-pascoa-domingo",
    type: "data_comercial_alta",
    is_official_holiday: false,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.35,
    target_retail_sectors: ["chocolates", "confeitaria", "supermercados", "gastronomia"],
    description: "Maior pico anual para o setor de chocolates, ovos de páscoa e almoços de família.",
  },
  {
    id: "holiday-tiradentes",
    name: "Tiradentes",
    date_rule: "04-21",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.20,
    target_retail_sectors: ["turismo", "gastronomia"],
    description: "Feriado nacional em homenagem ao mártir da Inconfidência Mineira, Joaquim José da Silva Xavier.",
  },
  {
    id: "holiday-dia-trabalho",
    name: "Dia Mundial do Trabalho",
    date_rule: "05-01",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["gastronomia", "lazer", "delivery"],
    description: "Feriado nacional dedicado aos trabalhadores e mobilizações sociais.",
  },
  {
    id: "holiday-dia-das-maes",
    name: "Dia das Mães",
    date_rule: "segundo-domingo-maio",
    type: "data_comercial_alta",
    is_official_holiday: false,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.50,
    target_retail_sectors: ["flores", "joalheria", "vestuario", "cosmeticos", "gastronomia", "eletronicos"],
    description: "Segunda data mais importante do varejo brasileiro em volume financeiro após o Natal.",
  },
  {
    id: "holiday-corpus-christi",
    name: "Corpus Christi",
    date_rule: "movel-corpus-christi",
    type: "ponto_facultativo",
    is_official_holiday: false,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["turismo", "hospedagem", "gastronomia"],
    description: "Feriado municipal / ponto facultativo comum que forma pontes prolongadas de viagens.",
  },
  {
    id: "holiday-dia-dos-namorados",
    name: "Dia dos Namorados",
    date_rule: "06-12",
    type: "data_comercial_alta",
    is_official_holiday: false,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.45,
    target_retail_sectors: ["gastronomia", "moteis", "joias", "perfumaria", "flores", "chocolates"],
    description: "Pico comercial de reservas em restaurantes e troca de presentes afetivos no Brasil.",
  },
  {
    id: "holiday-dia-dos-pais",
    name: "Dia dos Pais",
    date_rule: "segundo-domingo-agosto",
    type: "data_comercial_alta",
    is_official_holiday: false,
    commercial_impact: "alto",
    surge_multiplier_suggested: 1.30,
    target_retail_sectors: ["vestuario_masculino", "calcados", "eletronicos", "ferramentas", "gastronomia"],
    description: "Forte movimentação em churrascarias, restaurantes e presentes masculinos.",
  },
  {
    id: "holiday-independencia",
    name: "Independência do Brasil",
    date_rule: "09-07",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "alto",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["turismo", "lazer", "gastronomia"],
    description: "Feriado cívico nacional comemorativo da Proclamação da Independência de 1822.",
  },
  {
    id: "holiday-aparecida-criancas",
    name: "N. Sra. Aparecida & Dia das Crianças",
    date_rule: "10-12",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.40,
    target_retail_sectors: ["brinquedos", "confeitaria", "vestuario_infantil", "turismo_religioso", "parques"],
    description: "Data dupla com celebração da Padroeira do Brasil e pico absoluto de venda de brinquedos infantis.",
  },
  {
    id: "holiday-finados",
    name: "Dia de Finados",
    date_rule: "11-02",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "baixo",
    surge_multiplier_suggested: 1.20,
    target_retail_sectors: ["floriculturas", "velas"],
    description: "Feriado nacional de homenagem e respeito à memória dos entes falecidos.",
  },
  {
    id: "holiday-proclamacao-republica",
    name: "Proclamação da República",
    date_rule: "11-15",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["turismo", "hospedagem", "gastronomia"],
    description: "Feriado nacional comemorativo da Proclamação da República de 1889.",
  },
  {
    id: "holiday-consciencia-negra",
    name: "Dia Nacional de Zumbi e da Consciência Negra",
    date_rule: "11-20",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["cultura", "eventos", "gastronomia"],
    description: "Feriado nacional instituído pela Lei nº 14.759/2023 em memória da luta contra a escravidão e o racismo.",
  },
  {
    id: "holiday-black-friday",
    name: "Black Friday Brasil",
    date_rule: "quarta-sexta-feira-novembro",
    type: "data_comercial_alta",
    is_official_holiday: false,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.45,
    target_retail_sectors: ["eletronicos", "eletrodomesticos", "moda", "beleza", "todos_varejo"],
    description: "Maior data de promoções e faturamento do comércio eletrônico e varejo de grande porte.",
  },
  {
    id: "holiday-cyber-monday",
    name: "Cyber Monday",
    date_rule: "segunda-pos-black-friday",
    type: "data_comercial_alta",
    is_official_holiday: false,
    commercial_impact: "alto",
    surge_multiplier_suggested: 1.30,
    target_retail_sectors: ["tecnologia", "gadgets", "software", "e-commerce"],
    description: "Foco intensivo em liquidação de produtos de informática e comércio digital após a Black Friday.",
  },
  {
    id: "holiday-natal",
    name: "Natal",
    date_rule: "12-25",
    type: "feriado_nacional",
    is_official_holiday: true,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.60,
    target_retail_sectors: ["todos_varejo", "supermercados", "brinquedos", "eletronicos", "moda"],
    description: "Maior evento comercial e religioso do ano, pico histórico de movimentação do comércio e delivery.",
  },
  {
    id: "holiday-ano-novo-vespera",
    name: "Véspera de Ano Novo",
    date_rule: "12-31",
    type: "ponto_facultativo",
    is_official_holiday: false,
    commercial_impact: "extremo",
    surge_multiplier_suggested: 1.50,
    target_retail_sectors: ["gastronomia", "bebidas", "supermercados"],
    description: "Último dia do ano com compras de última hora para as ceias de réveillon.",
    scope: "nacional",
    campaign_lead_days: 14,
    marketing_theme: "Brinde ao Novo Ano & Ceia Express",
    suggested_promotional_actions: ["Kits de espumantes", "Pratos prontos para ceia", "Entrega turbo até 18h"],
  },

  // ── FERIADOS ESTADUAIS & REGIONAIS BRASILEIROS ──
  {
    id: "holiday-estadual-sp-9-julho",
    name: "Revolução Constitucionalista de 1932",
    date_rule: "07-09",
    type: "feriado_estadual",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.20,
    target_retail_sectors: ["turismo", "gastronomia", "lazer"],
    description: "Feriado estadual civil em todo o Estado de São Paulo (Lei Estadual nº 9.497/1997).",
    scope: "estadual",
    state_code: "SP",
    campaign_lead_days: 7,
    marketing_theme: "Feriadão Paulista: Lazer e Sabores",
    suggested_promotional_actions: ["Passeios e bate-volta", "Almoço especial de feriado"],
  },
  {
    id: "holiday-estadual-rs-farroupilha",
    name: "Dia do Gaúcho / Revolução Farroupilha",
    date_rule: "09-20",
    type: "feriado_estadual",
    is_official_holiday: true,
    commercial_impact: "alto",
    surge_multiplier_suggested: 1.30,
    target_retail_sectors: ["gastronomia", "carnes", "bebidas", "vestuario_tradicionalista"],
    description: "Feriado estadual no Rio Grande do Sul em homenagem aos heróis farroupilhas.",
    scope: "estadual",
    state_code: "RS",
    campaign_lead_days: 14,
    marketing_theme: "Semana Farroupilha: Tradição e Churrasco",
    suggested_promotional_actions: ["Combos de churrasco", "Descontos em artigos gauchescos", "Cervejas artesanais"],
  },
  {
    id: "holiday-estadual-rj-sao-jorge",
    name: "Dia de São Jorge",
    date_rule: "04-23",
    type: "feriado_estadual",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["gastronomia", "eventos", "feijoadas"],
    description: "Feriado estadual no Rio de Janeiro em homenagem ao Santo Guerreiro.",
    scope: "estadual",
    state_code: "RJ",
    campaign_lead_days: 7,
    marketing_theme: "Feijoada de São Jorge & Celebrações",
    suggested_promotional_actions: ["Feijoadas completas delivery", "Música ao vivo"],
  },
  {
    id: "holiday-estadual-ba-independencia",
    name: "Independência da Bahia (Dois de Julho)",
    date_rule: "07-02",
    type: "feriado_estadual",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["turismo", "cultura", "gastronomia"],
    description: "Feriado cívico na Bahia comemorando a vitória e expulsão definitiva das tropas portuguesas.",
    scope: "estadual",
    state_code: "BA",
    campaign_lead_days: 7,
    marketing_theme: "Orgulho Baiano: Cultura e Sabores da Terra",
    suggested_promotional_actions: ["Pratos típicos baianos", "Artesanato regional"],
  },

  // ── FERIADOS MUNICIPAIS DE CIDADES POLO ──
  {
    id: "holiday-mun-sp-aniversario",
    name: "Aniversário da Cidade de São Paulo",
    date_rule: "01-25",
    type: "feriado_municipal",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["gastronomia", "cultura", "turismo_urbano"],
    description: "Fundação da cidade de São Paulo em 1554 pelo Padre Manuel da Nóbrega e São José de Anchieta.",
    scope: "municipal",
    state_code: "SP",
    city_name: "São Paulo",
    campaign_lead_days: 7,
    marketing_theme: "Parabéns Sampa: Gastronomia e Cultura Urbana",
    suggested_promotional_actions: ["Roteiros gastronômicos", "Promoções de cafés e lanches tradicionais"],
  },
  {
    id: "holiday-mun-rj-sebastiao",
    name: "Dia de São Sebastião (Padroeiro do Rio de Janeiro)",
    date_rule: "01-20",
    type: "feriado_municipal",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.25,
    target_retail_sectors: ["turismo", "praia", "gastronomia"],
    description: "Feriado municipal na cidade do Rio de Janeiro em honra ao padroeiro da Cidade Maravilhosa.",
    scope: "municipal",
    state_code: "RJ",
    city_name: "Rio de Janeiro",
    campaign_lead_days: 7,
    marketing_theme: "Verão Carioca no Feriado de São Sebastião",
    suggested_promotional_actions: ["Aluguel de pranchas e passeios", "Petiscos e drinks de praia"],
  },
  {
    id: "holiday-mun-chapeco-aniversario",
    name: "Aniversário de Chapecó",
    date_rule: "08-25",
    type: "feriado_municipal",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.20,
    target_retail_sectors: ["comercio_local", "gastronomia", "eventos"],
    description: "Emancipação político-administrativa do polo do Oeste Catarinense.",
    scope: "municipal",
    state_code: "SC",
    city_name: "Chapecó",
    campaign_lead_days: 7,
    marketing_theme: "Orgulho Chapecoense: Polo do Oeste em Festa",
    suggested_promotional_actions: ["Ofertas especiais do comércio local", "Combos gastronômicos"],
  },
  {
    id: "holiday-mun-smo-aniversario",
    name: "Aniversário de São Miguel do Oeste",
    date_rule: "02-15",
    type: "feriado_municipal",
    is_official_holiday: true,
    commercial_impact: "medio",
    surge_multiplier_suggested: 1.20,
    target_retail_sectors: ["comercio_local", "gastronomia", "lazer"],
    description: "Aniversário do município polo do Extremo-Oeste Catarinense.",
    scope: "municipal",
    state_code: "SC",
    city_name: "São Miguel do Oeste",
    campaign_lead_days: 7,
    marketing_theme: "Parabéns SMO: Celebre com as Lojas da Nossa Cidade",
    suggested_promotional_actions: ["Cupons locais", "Sorteios nas lojas do município"],
  },
];

export function calculateEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Helper que retorna o enésimo dia da semana de um mês específico
 */
function getNthDayOfMonth(year: number, month: number, targetDayOfWeek: number, nth: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1) break;
    if (d.getDay() === targetDayOfWeek) {
      count++;
      if (count === nth) return day;
    }
  }
  return 1;
}

/**
 * Retorna todos os feriados e datas comerciais com datas ISO (YYYY-MM-DD) calculadas para um determinado ano
 */
export function getHolidaysForYear(year: number): Array<HolidayDefinition & { date: string }> {
  const easter = calculateEasterSunday(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));

  // Carnaval: Terça-feira gorda (47 dias antes da Páscoa)
  const carnivalDate = new Date(easterDate.getTime() - 47 * 24 * 60 * 60 * 1000);
  // Sexta-feira Santa: 2 dias antes da Páscoa
  const goodFridayDate = new Date(easterDate.getTime() - 2 * 24 * 60 * 60 * 1000);
  // Corpus Christi: 60 dias após a Páscoa
  const corpusChristiDate = new Date(easterDate.getTime() + 60 * 24 * 60 * 60 * 1000);

  // Dia das Mães: 2º domingo de Maio (month 5, dayOfWeek 0, nth 2)
  const mothersDay = getNthDayOfMonth(year, 5, 0, 2);
  // Dia dos Pais: 2º domingo de Agosto (month 8, dayOfWeek 0, nth 2)
  const fathersDay = getNthDayOfMonth(year, 8, 0, 2);

  // Black Friday: 4ª sexta-feira de Novembro (month 11, dayOfWeek 5, nth 4)
  const blackFridayDay = getNthDayOfMonth(year, 11, 5, 4);
  const blackFridayDate = new Date(Date.UTC(year, 10, blackFridayDay));
  // Cyber Monday: 3 dias após a Black Friday
  const cyberMondayDate = new Date(blackFridayDate.getTime() + 3 * 24 * 60 * 60 * 1000);

  const formatIso = (d: Date) => d.toISOString().split("T")[0];
  const pad = (n: number) => String(n).padStart(2, "0");

  return GLOBAL_HOLIDAYS_CATALOG.map((h) => {
    let resolvedDate: string;
    switch (h.date_rule) {
      case "movel-carnaval-terca":
        resolvedDate = formatIso(carnivalDate);
        break;
      case "movel-sexta-santa":
        resolvedDate = formatIso(goodFridayDate);
        break;
      case "movel-pascoa-domingo":
        resolvedDate = formatIso(easterDate);
        break;
      case "movel-corpus-christi":
        resolvedDate = formatIso(corpusChristiDate);
        break;
      case "segundo-domingo-maio":
        resolvedDate = `${year}-05-${pad(mothersDay)}`;
        break;
      case "segundo-domingo-agosto":
        resolvedDate = `${year}-08-${pad(fathersDay)}`;
        break;
      case "quarta-sexta-feira-novembro":
        resolvedDate = `${year}-11-${pad(blackFridayDay)}`;
        break;
      case "segunda-pos-black-friday":
        resolvedDate = formatIso(cyberMondayDate);
        break;
      default:
        // Feriados de data fixa (ex: "01-01", "12-25")
        resolvedDate = `${year}-${h.date_rule}`;
        break;
    }

    return {
      ...h,
      date: resolvedDate,
    };
  });
}

/**
 * Consulta se uma data específica (YYYY-MM-DD ou Date) é feriado nacional ou data de pico comercial
 */
export function getHolidayOnDate(targetDate: string | Date): (HolidayDefinition & { date: string }) | undefined {
  let isoDateStr: string;
  let year: number;

  if (typeof targetDate === "string") {
    isoDateStr = targetDate.includes("T") ? targetDate.split("T")[0] : targetDate;
    year = parseInt(isoDateStr.split("-")[0], 10);
  } else {
    isoDateStr = targetDate.toISOString().split("T")[0];
    year = targetDate.getFullYear();
  }

  const holidays = getHolidaysForYear(year);
  return holidays.find((h) => h.date === isoDateStr);
}

/**
 * Retorna o multiplicador de frete / surge pricing recomendado para uma data específica
 */
export function getSuggestedSurgeMultiplierForDate(targetDate: string | Date): number {
  const holiday = getHolidayOnDate(targetDate);
  return holiday ? holiday.surge_multiplier_suggested : 1.00;
}

/**
 * Retorna próximas datas comemorativas e comerciais relevantes para o calendário editorial
 */
export function getUpcomingMarketingCalendar(
  daysAhead: number = 60,
  options?: { sector?: string; stateCode?: string; cityName?: string }
): Array<HolidayDefinition & { date: string; days_until: number }> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const allHolidays = [
    ...getHolidaysForYear(currentYear),
    ...getHolidaysForYear(currentYear + 1),
  ];

  const todayIso = now.toISOString().split("T")[0];
  const nowTime = now.getTime();

  return allHolidays
    .filter((h) => h.date >= todayIso)
    .map((h) => {
      const targetTime = new Date(h.date + "T00:00:00Z").getTime();
      const diffDays = Math.ceil((targetTime - nowTime) / (1000 * 60 * 60 * 24));
      return {
        ...h,
        days_until: diffDays,
      };
    })
    .filter((h) => h.days_until <= daysAhead)
    .filter((h) => {
      if (options?.stateCode && h.state_code && h.state_code.toUpperCase() !== options.stateCode.toUpperCase()) {
        return false;
      }
      if (options?.cityName && h.city_name && h.city_name.toLowerCase() !== options.cityName.toLowerCase()) {
        return false;
      }
      if (!options?.sector) return true;
      return (
        h.target_retail_sectors.includes(options.sector) ||
        h.target_retail_sectors.includes("todos_varejo")
      );
    })
    .sort((a, b) => a.days_until - b.days_until);
}


