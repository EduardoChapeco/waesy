/**
 * canonical-specs-resolver.ts — Motor Canônico de Resolução de Especificações de Classificados
 *
 * Mapeia e normaliza 100% dos atributos dos 15 nichos a partir de colunas dedicadas
 * e do JSONB `attributes`, resolvendo divergências de nomenclatura e sinônimos.
 */

import { formatMoney } from "@/lib/money";

export interface ClassifiedSpecItem {
  label: string;
  value: string;
  category?: "technical" | "commercial" | "logistics" | "dimensions" | "hiring";
  highlight?: boolean;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function resolveClassifiedDetailedSpecs(classified: any): ClassifiedSpecItem[] {
  if (!classified) return [];

  const list: ClassifiedSpecItem[] = [];
  const attrs = classified.attributes || {};

  // ── 1. CONDIÇÃO & GARANTIA ──
  const rawCondition = classified.condition || attrs.condition;
  if (rawCondition) {
    let condLabel = "Usado";
    if (rawCondition === "new") condLabel = "Novo na Caixa";
    else if (rawCondition === "refurbished") condLabel = "Revisado / Recondicionado";
    else if (rawCondition === "seminovo") condLabel = "Seminovo Impecável";
    list.push({ label: "Condição", value: condLabel, category: "technical", highlight: true });
  }

  const rawWarranty = attrs.warranty || classified.warranty;
  if (rawWarranty) {
    list.push({ label: "Garantia", value: String(rawWarranty), category: "commercial" });
  }

  // ── 2. VEÍCULOS ──
  const brand = attrs.brand || classified.brand;
  const model = attrs.model || classified.model;
  const version = attrs.version || classified.version;
  const yearFab = attrs.year_fab;
  const yearModel = attrs.year_model;
  const year = attrs.year || (yearFab && yearModel ? `${yearFab}/${yearModel}` : yearModel || yearFab);
  const mileageKm = attrs.mileage_km ?? attrs.mileage ?? classified.mileage;
  const fuel = attrs.fuel_type || attrs.fuel;
  const transmission = attrs.transmission;
  const color = attrs.color;

  if (brand) list.push({ label: "Marca", value: String(brand), category: "technical" });
  if (model) list.push({ label: "Modelo", value: String(model), category: "technical" });
  if (version) list.push({ label: "Versão", value: String(version), category: "technical" });
  if (year) list.push({ label: "Ano", value: String(year), category: "technical" });
  if (mileageKm !== undefined && mileageKm !== null && mileageKm !== "") {
    const numKm = Number(mileageKm);
    list.push({
      label: "Quilometragem",
      value: !isNaN(numKm) ? `${numKm.toLocaleString("pt-BR")} km` : `${mileageKm} km`,
      category: "technical",
    });
  }
  if (fuel) list.push({ label: "Combustível", value: String(fuel), category: "technical" });
  if (transmission) list.push({ label: "Câmbio", value: String(transmission), category: "technical" });
  if (color) list.push({ label: "Cor", value: String(color), category: "technical" });

  if (Array.isArray(attrs.features) && attrs.features.length > 0) {
    list.push({ label: "Opcionais", value: attrs.features.join(", "), category: "technical" });
  }
  if (Array.isArray(attrs.provenance) && attrs.provenance.length > 0) {
    list.push({ label: "Procedência", value: attrs.provenance.join(", "), category: "technical" });
  }

  // ── 3. IMÓVEIS & HOSPEDAGEM ──
  const propertyType = classified.property_type || attrs.property_type;
  const dealType = classified.deal_type || attrs.deal_type;
  const areaSqm = classified.area_sqm ?? attrs.area_sqm;
  const bedrooms = classified.bedrooms ?? attrs.bedrooms;
  const suites = classified.suites ?? attrs.suites;
  const bathrooms = classified.bathrooms ?? attrs.bathrooms;
  const parkingSpots = classified.parking_spots ?? attrs.parking_spots ?? attrs.garage_spots;
  const maxGuests = classified.max_guests ?? attrs.max_guests;
  const cleaningFeeCents = classified.cleaning_fee_cents ?? attrs.cleaning_fee_cents;
  const condoCents = attrs.condo_cents ?? attrs.condominium_cents;
  const iptuCents = attrs.iptu_cents;
  const checkinTime = attrs.checkin_time;
  const checkoutTime = attrs.checkout_time;

  if (propertyType) list.push({ label: "Tipo de Imóvel", value: String(propertyType), category: "technical" });
  if (dealType) {
    const dealLabel = dealType === "venda" ? "Venda" : dealType === "aluguel" ? "Locação Mensal" : dealType === "temporada" ? "Temporada" : String(dealType);
    list.push({ label: "Finalidade", value: dealLabel, category: "commercial" });
  }
  if (areaSqm) list.push({ label: "Área Útil", value: `${areaSqm} m²`, category: "dimensions" });
  if (bedrooms) list.push({ label: "Quartos", value: String(bedrooms), category: "technical" });
  if (suites) list.push({ label: "Suítes", value: String(suites), category: "technical" });
  if (bathrooms) list.push({ label: "Banheiros", value: String(bathrooms), category: "technical" });
  if (parkingSpots !== undefined && parkingSpots !== null) {
    list.push({ label: "Vagas", value: String(parkingSpots), category: "technical" });
  }
  if (maxGuests) list.push({ label: "Capacidade", value: `Até ${maxGuests} hóspedes`, category: "technical" });
  if (cleaningFeeCents && cleaningFeeCents > 0) {
    list.push({ label: "Taxa de Limpeza", value: formatMoney(cleaningFeeCents), category: "commercial" });
  }
  if (condoCents && condoCents > 0) {
    list.push({ label: "Condomínio", value: formatMoney(condoCents), category: "commercial" });
  }
  if (iptuCents && iptuCents > 0) {
    list.push({ label: "IPTU", value: formatMoney(iptuCents), category: "commercial" });
  }
  if (attrs.furnished !== undefined) {
    list.push({ label: "Mobiliado", value: attrs.furnished ? "Sim, completo" : "Não", category: "technical" });
  }
  if (checkinTime) list.push({ label: "Check-in", value: `A partir das ${checkinTime}`, category: "logistics" });
  if (checkoutTime) list.push({ label: "Check-out", value: `Até as ${checkoutTime}`, category: "logistics" });

  // ── 4. SERVIÇOS & PROFISSIONAIS AUTÔNOMOS ──
  const modality = attrs.modality;
  const serviceArea = attrs.service_area;
  const serviceDuration = classified.service_duration_minutes ?? attrs.service_duration_minutes ?? attrs.estimated_duration;
  const serviceSubNiche = attrs.service_subniche;
  const council = attrs.professional_council;
  const specialty = attrs.specialty;
  const workingStart = attrs.working_hours_start;
  const workingEnd = attrs.working_hours_end;

  if (modality) {
    const modLabel = modality === "presencial" ? "Presencial no Local" : modality === "remoto" ? "100% Remoto / Online" : modality === "domicilio" ? "Atendimento a Domicílio" : String(modality);
    list.push({ label: "Modalidade", value: modLabel, category: "technical" });
  }
  if (serviceArea) list.push({ label: "Região de Atendimento", value: String(serviceArea), category: "logistics" });
  if (serviceDuration) list.push({ label: "Duração Média", value: `${serviceDuration} minutos`, category: "technical" });
  if (serviceSubNiche) list.push({ label: "Especialidade", value: String(serviceSubNiche), category: "technical" });
  if (specialty) list.push({ label: "Área de Atuação", value: String(specialty), category: "technical" });
  if (council) list.push({ label: "Registro / Conselho", value: String(council), category: "technical" });
  if (workingStart && workingEnd) {
    list.push({ label: "Horário de Atendimento", value: `${workingStart} às ${workingEnd}`, category: "logistics" });
  }
  if (Array.isArray(attrs.available_weekdays) && attrs.available_weekdays.length > 0) {
    list.push({ label: "Dias de Atendimento", value: attrs.available_weekdays.join(", "), category: "logistics" });
  }

  // ── 5. DESAPEGO / ELETRÔNICOS / INFORMÁTICA / MÓVEIS / MODA ──
  const storage = attrs.storage;
  const batteryHealth = attrs.battery_health;
  const computerType = attrs.computer_type;
  const processor = attrs.processor;
  const ram = attrs.ram;
  const applianceType = attrs.appliance_type;
  const voltage = attrs.voltage;
  const consoleName = attrs.console;
  const room = attrs.room;
  const material = attrs.material;
  const fashionCategory = attrs.fashion_category;
  const fashionGender = attrs.gender;
  const fashionSize = attrs.size;

  if (storage) list.push({ label: "Armazenamento", value: String(storage), category: "technical" });
  if (batteryHealth) list.push({ label: "Saúde da Bateria", value: `${batteryHealth}%`, category: "technical" });
  if (computerType) list.push({ label: "Tipo", value: String(computerType), category: "technical" });
  if (processor) list.push({ label: "Processador", value: String(processor), category: "technical" });
  if (ram) list.push({ label: "Memória RAM", value: String(ram), category: "technical" });
  if (applianceType) list.push({ label: "Equipamento", value: String(applianceType), category: "technical" });
  if (voltage) list.push({ label: "Voltagem", value: String(voltage), category: "technical" });
  if (consoleName) list.push({ label: "Console", value: String(consoleName), category: "technical" });
  if (room) list.push({ label: "Ambiente", value: String(room), category: "technical" });
  if (material) list.push({ label: "Material", value: String(material), category: "technical" });
  if (fashionCategory) list.push({ label: "Categoria Moda", value: String(fashionCategory), category: "technical" });
  if (fashionGender) list.push({ label: "Gênero", value: String(fashionGender), category: "technical" });
  if (fashionSize) list.push({ label: "Tamanho", value: String(fashionSize), category: "dimensions" });
  if (Array.isArray(attrs.accessories) && attrs.accessories.length > 0) {
    list.push({ label: "Acessórios", value: attrs.accessories.join(", "), category: "technical" });
  }

  // ── 6. MERCADO & GASTRONOMIA ──
  const department = attrs.grocery_department || attrs.department;
  const grocerySub = attrs.grocery_sub_category || attrs.sub_category;
  const unitType = attrs.grocery_unit_type || attrs.unit_type;
  const temperature = attrs.temperature || attrs.storage_temp;
  const prepTime = attrs.food_prep_time_minutes;

  if (department) list.push({ label: "Departamento", value: String(department), category: "technical" });
  if (grocerySub) list.push({ label: "Subcategoria", value: String(grocerySub), category: "technical" });
  if (unitType) list.push({ label: "Unidade", value: String(unitType), category: "technical" });
  if (temperature && temperature !== "none") {
    list.push({ label: "Temperatura", value: String(temperature), category: "technical" });
  }
  if (attrs.is_alcoholic !== undefined) {
    list.push({ label: "Bebida Alcoólica", value: attrs.is_alcoholic ? "Sim (+18)" : "Não alcoólico", category: "technical" });
  }
  if (prepTime) list.push({ label: "Tempo de Preparo", value: `~${prepTime} min`, category: "logistics" });

  // ── 7. NEGÓCIOS & M&A ──
  const businessType = attrs.business_type;
  const businessSegment = attrs.business_segment;
  const monthlyRevenue = attrs.monthly_revenue_cents;
  const netProfit = attrs.net_profit_cents;
  const employeesRange = attrs.employees_range;
  const foundationYear = attrs.foundation_year;
  const commercialPointType = attrs.commercial_point_type;

  if (businessType) list.push({ label: "Modelo de Negócio", value: String(businessType), category: "technical" });
  if (businessSegment) list.push({ label: "Segmento", value: String(businessSegment), category: "technical" });
  if (monthlyRevenue && monthlyRevenue > 0) {
    list.push({ label: "Faturamento Médio", value: `${formatMoney(monthlyRevenue)}/mês`, category: "commercial", highlight: true });
  }
  if (netProfit && netProfit > 0) {
    list.push({ label: "Lucro Líquido", value: `${formatMoney(netProfit)}/mês`, category: "commercial", highlight: true });
  }
  if (employeesRange) list.push({ label: "Funcionários", value: String(employeesRange), category: "technical" });
  if (foundationYear) list.push({ label: "Fundação", value: String(foundationYear), category: "technical" });
  if (commercialPointType) list.push({ label: "Ponto Comercial", value: String(commercialPointType), category: "technical" });

  // ── 8. VAGAS DE EMPREGO ──
  const role = attrs.role;
  const workModel = attrs.work_model;
  const regime = attrs.regime;
  const salaryRange = attrs.salary_range;
  const minEducation = attrs.min_education;
  const experienceLevel = attrs.experience_level;

  if (role) list.push({ label: "Cargo", value: String(role), category: "hiring", highlight: true });
  if (workModel) list.push({ label: "Modelo de Trabalho", value: String(workModel), category: "hiring" });
  if (regime) list.push({ label: "Regime", value: String(regime), category: "hiring" });
  if (salaryRange) list.push({ label: "Remuneração", value: String(salaryRange), category: "hiring" });
  if (minEducation) list.push({ label: "Escolaridade", value: String(minEducation), category: "hiring" });
  if (experienceLevel) list.push({ label: "Experiência", value: String(experienceLevel), category: "hiring" });
  if (Array.isArray(attrs.benefits) && attrs.benefits.length > 0) {
    list.push({ label: "Benefícios", value: attrs.benefits.join(", "), category: "hiring" });
  }

  // ── 9. PRODUTOS DIGITAIS ──
  const digitalFileSize = classified.digital_file_size_bytes ?? attrs.digital_file_size_bytes;
  const digitalFileType = attrs.digital_file_type;
  const downloadLimit = classified.download_limit ?? attrs.download_limit;

  if (classified.is_digital || attrs.is_digital) {
    list.push({ label: "Entrega", value: "Download Imediato", category: "logistics", highlight: true });
    if (digitalFileType) list.push({ label: "Formato do Arquivo", value: String(digitalFileType).toUpperCase(), category: "technical" });
    if (digitalFileSize) list.push({ label: "Tamanho", value: formatBytes(digitalFileSize), category: "technical" });
    if (downloadLimit) list.push({ label: "Limite de Downloads", value: `${downloadLimit} vezes`, category: "commercial" });
  }

  // ── 10. LOGÍSTICA & ENVIO GERAL ──
  const deliveryMode = classified.delivery_mode || attrs.delivery_mode;
  if (deliveryMode) {
    let delivLabel = "Retirada no Local";
    if (deliveryMode === "shipping") delivLabel = "Envio para Todo o Brasil";
    else if (deliveryMode === "local_delivery") delivLabel = "Entrega Local";
    else if (deliveryMode === "both") delivLabel = "Retirada ou Envio Disponível";
    list.push({ label: "Logística", value: delivLabel, category: "logistics" });
  }

  return list;
}
