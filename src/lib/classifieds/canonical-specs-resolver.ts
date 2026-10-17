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
  if (year) list.push({ label: "Ano", value: String(year), category: "technical", highlight: true });
  if (mileageKm !== undefined && mileageKm !== null && mileageKm !== "") {
    const numKm = Number(mileageKm);
    list.push({
      label: "Quilometragem",
      value: !isNaN(numKm) ? `${numKm.toLocaleString("pt-BR")} km` : `${mileageKm} km`,
      category: "technical",
      highlight: true,
    });
  }
  if (fuel) list.push({ label: "Combustível", value: String(fuel), category: "technical", highlight: true });
  if (transmission) list.push({ label: "Câmbio", value: String(transmission), category: "technical", highlight: true });
  if (color) list.push({ label: "Cor", value: String(color), category: "technical" });

  const doors = attrs.doors || classified.doors;
  if (doors) list.push({ label: "Portas", value: `${doors} Portas`, category: "technical" });

  const motor = attrs.motor || attrs.engine || classified.motor;
  if (motor) list.push({ label: "Motorização", value: String(motor), category: "technical" });

  const bodyType = attrs.body_type || classified.body_type;
  if (bodyType) list.push({ label: "Carroceria", value: String(bodyType), category: "technical" });

  const plateFinal = attrs.chassis_plate_final || attrs.plate_end || classified.plate_end;
  if (plateFinal !== undefined && plateFinal !== null && plateFinal !== "") {
    list.push({ label: "Final da Placa", value: String(plateFinal), category: "technical" });
  }

  if (attrs.armored !== undefined) {
    list.push({ label: "Blindagem", value: attrs.armored ? "Blindado" : "Não blindado", category: "technical" });
  }

  const financialSit = attrs.financial_situation;
  if (financialSit) {
    list.push({ label: "Situação do Veículo", value: String(financialSit), category: "commercial" });
  }

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
  const totalAreaSqm = classified.total_area_sqm ?? attrs.total_area_sqm;
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
  const floorNumber = attrs.floor || classified.floor;
  const constructionYear = attrs.construction_year;
  const solarPosition = attrs.solar_position;

  if (propertyType) list.push({ label: "Tipo de Imóvel", value: String(propertyType), category: "technical" });
  if (dealType) {
    const dealLabel = dealType === "venda" ? "Venda" : dealType === "aluguel" ? "Locação Mensal" : dealType === "temporada" ? "Temporada" : String(dealType);
    list.push({ label: "Finalidade", value: dealLabel, category: "commercial" });
  }
  if (areaSqm) list.push({ label: "Área Útil", value: `${areaSqm} m²`, category: "dimensions", highlight: true });
  if (totalAreaSqm && totalAreaSqm !== areaSqm) {
    list.push({ label: "Área Total", value: `${totalAreaSqm} m²`, category: "dimensions" });
  }
  if (bedrooms) list.push({ label: "Quartos", value: String(bedrooms), category: "technical", highlight: true });
  if (suites) list.push({ label: "Suítes", value: String(suites), category: "technical", highlight: true });
  if (bathrooms) list.push({ label: "Banheiros", value: String(bathrooms), category: "technical" });
  if (parkingSpots !== undefined && parkingSpots !== null) {
    list.push({ label: "Vagas", value: String(parkingSpots), category: "technical", highlight: true });
  }
  if (floorNumber) list.push({ label: "Andar", value: `${floorNumber}º Andar`, category: "technical" });
  if (constructionYear) list.push({ label: "Ano Construção", value: String(constructionYear), category: "technical" });
  if (solarPosition) list.push({ label: "Posição Solar", value: String(solarPosition), category: "technical" });
  if (attrs.pets_allowed !== undefined) {
    list.push({ label: "Aceita Animais", value: attrs.pets_allowed ? "Sim, aceita pets" : "Não permite", category: "technical" });
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

  // ── 3.5 EQUIPAMENTOS E MÁQUINAS ──
  const equipmentPeriod = attrs.equipment_period || attrs.rental_period;
  const depositCents = attrs.deposit_cents || attrs.security_deposit_cents;
  const equipmentPower = attrs.equipment_power || attrs.power;
  if (equipmentPeriod) {
    const pLabel = equipmentPeriod === "diaria" ? "Diária (24h)" : equipmentPeriod === "evento" ? "Por Evento" : equipmentPeriod === "semanal" ? "Semanal (7 dias)" : equipmentPeriod === "mensal" ? "Mensal (30 dias)" : String(equipmentPeriod);
    list.push({ label: "Período Base", value: pLabel, category: "commercial", highlight: true });
  }
  if (depositCents && depositCents > 0) {
    list.push({ label: "Caução / Garantia", value: formatMoney(depositCents), category: "commercial", highlight: true });
  }
  if (equipmentPower) {
    list.push({ label: "Potência / Tensão", value: String(equipmentPower), category: "technical", highlight: true });
  }
  if (attrs.operator_included !== undefined) {
    list.push({ label: "Operador de Máquina", value: attrs.operator_included ? "Incluso no aluguel" : "Não incluso (apenas equipamento)", category: "technical" });
  }

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
    list.push({ label: "Modalidade", value: modLabel, category: "technical", highlight: true });
  }
  if (serviceArea) list.push({ label: "Região de Atendimento", value: String(serviceArea), category: "logistics", highlight: true });
  if (serviceDuration) list.push({ label: "Duração Média", value: `${serviceDuration} minutos`, category: "technical", highlight: true });
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

  if (storage) list.push({ label: "Armazenamento", value: String(storage), category: "technical", highlight: true });
  if (batteryHealth) list.push({ label: "Saúde da Bateria", value: `${batteryHealth}%`, category: "technical", highlight: true });
  if (computerType) list.push({ label: "Tipo", value: String(computerType), category: "technical" });
  if (processor) list.push({ label: "Processador", value: String(processor), category: "technical" });
  if (ram) list.push({ label: "Memória RAM", value: String(ram), category: "technical", highlight: true });
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

  // ── 5.5 TURISMO & VIAGENS ──
  const destinationCity = attrs.destination_city || attrs.destination;
  const departureCity = attrs.departure_city || attrs.origin_city || attrs.origin;
  const durationText = attrs.duration_text || attrs.duration;
  const mealPlan = attrs.meal_plan;
  const departureDate = attrs.departure_date;
  const returnDate = attrs.return_date;
  const guestsText = attrs.guests_text;
  const passComp = attrs.passenger_composition;
  const transportType = attrs.transport_type || attrs.transport;
  const cancelPolicy = attrs.cancellation_policy;

  if (destinationCity) {
    list.push({ label: "Destino", value: String(destinationCity), category: "logistics", highlight: true });
  }
  if (departureCity) {
    list.push({ label: "Origem", value: String(departureCity), category: "logistics" });
  }
  if (durationText) {
    list.push({ label: "Duração", value: String(durationText), category: "logistics", highlight: true });
  }
  if (transportType) {
    const tLabel = transportType === "airplane" || transportType === "aereo"
      ? "Aéreo Regular"
      : transportType === "bus" || transportType === "terrestre"
      ? "Ônibus Leito / Terrestre"
      : transportType === "cruise" || transportType === "cruzeiro"
      ? "Cruzeiro Marítimo"
      : transportType === "train" || transportType === "ferrovia"
      ? "Ferroviário"
      : transportType === "combo" || transportType === "misto"
      ? "Multimodal Combinado"
      : String(transportType);
    list.push({ label: "Transporte", value: tLabel, category: "logistics", highlight: true });
  }
  if (mealPlan) {
    const mLabel = mealPlan === "all_inclusive"
      ? "All Inclusive"
      : mealPlan === "cafe" || mealPlan === "cafe_manha"
      ? "Café da Manhã Incluso"
      : mealPlan === "meia_pensao"
      ? "Meia Pensão"
      : mealPlan === "pensao_completa" || mealPlan === "completa"
      ? "Pensão Completa"
      : String(mealPlan);
    list.push({ label: "Regime", value: mLabel, category: "technical", highlight: true });
  }
  if (departureDate) {
    list.push({ label: "Embarque", value: String(departureDate), category: "logistics" });
  }
  if (returnDate) {
    list.push({ label: "Retorno", value: String(returnDate), category: "logistics" });
  }
  if (passComp && (passComp.adults || passComp.children)) {
    const compText = `${passComp.adults || 1} Adulto(s)${passComp.children ? ` + ${passComp.children} Criança(s)` : ""}`;
    list.push({ label: "Composição", value: compText, category: "technical" });
  } else if (guestsText) {
    list.push({ label: "Passageiros", value: String(guestsText), category: "technical" });
  }
  if (cancelPolicy) {
    const cLabel = cancelPolicy === "flexible" ? "Flexível" : cancelPolicy === "moderate" ? "Moderado" : "Especial de Grupo";
    list.push({ label: "Cancelamento", value: cLabel, category: "commercial" });
  }

  // ── 5.6 ASSINATURAS, PLANOS RECORRENTES & DOAÇÕES ──
  const rawCategory = String(
    classified.category_slug ||
    classified.category_name ||
    classified.category ||
    attrs.niche ||
    attrs.vertical ||
    ""
  ).toLowerCase();

  const isSubscription = classified.pricing_model === "recurring" || attrs.pricing_model === "recurring" || rawCategory.includes("assinatura");
  if (isSubscription) {
    const billingCycle = classified.billing_cycle || attrs.billing_cycle;
    if (billingCycle) {
      const cycleLabel = billingCycle === "yearly" ? "Cobrança Anual" : billingCycle === "quarterly" ? "Trimestral" : billingCycle === "semiannual" ? "Semestral" : "Cobrança Mensal";
      list.push({ label: "Ciclo de Cobrança", value: cycleLabel, category: "commercial", highlight: true });
    }
    const setupFee = classified.setup_fee_cents ?? attrs.setup_fee_cents;
    if (setupFee !== undefined && setupFee !== null) {
      list.push({ label: "Adesão", value: setupFee > 0 ? formatMoney(setupFee) : "Isenta (R$ 0)", category: "commercial" });
    }
    const trialDays = classified.trial_days ?? attrs.trial_days;
    if (trialDays && trialDays > 0) {
      list.push({ label: "Período de Teste", value: `${trialDays} dias grátis`, category: "commercial", highlight: true });
    }
  }

  const isDonation = attrs.is_donation || classified.is_donation || rawCategory.includes("doacao");
  if (isDonation) {
    list.push({ label: "Finalidade", value: "Doação Gratuita (R$ 0,00)", category: "commercial", highlight: true });
  }

  // ── 6. MERCADO, CONVENIÊNCIA & GASTRONOMIA (Isolado contra vazamento em outros nichos) ──

  const isTravelOrOtherVertical =
    Boolean(
      attrs.destination_city ||
      attrs.destination ||
      attrs.itinerary_days?.length ||
      attrs.lodgings?.length ||
      attrs.departure_options?.length ||
      attrs.flight_details ||
      classified.template_style === "editorial" ||
      rawCategory.includes("turismo") ||
      rawCategory.includes("viag") ||
      rawCategory.includes("hosped") ||
      rawCategory.includes("hotel") ||
      rawCategory.includes("imove") ||
      rawCategory.includes("veic") ||
      rawCategory.includes("servic")
    );

  const isGroceryOrBeverage =
    !isTravelOrOtherVertical &&
    Boolean(
      classified.template_style === "convenience" ||
      attrs.template_style === "conveniencia" ||
      attrs.grocery_department ||
      attrs.department ||
      attrs.food_prep_time_minutes ||
      rawCategory.includes("bebida") ||
      rawCategory.includes("mercado") ||
      rawCategory.includes("conveniencia") ||
      rawCategory.includes("gastronomia") ||
      rawCategory.includes("aliment")
    );

  if (isGroceryOrBeverage) {
    const department = attrs.grocery_department || attrs.department;
    const grocerySub = attrs.grocery_sub_category || attrs.sub_category;
    const unitType = attrs.grocery_unit_type || attrs.unit_type;
    const volume = attrs.volume;
    const temperature = attrs.temperature || attrs.storage_temp;
    const prepTime = attrs.food_prep_time_minutes;

    if (department) list.push({ label: "Departamento", value: String(department), category: "technical" });
    if (grocerySub) list.push({ label: "Subcategoria", value: String(grocerySub), category: "technical" });
    if (unitType) list.push({ label: "Unidade", value: String(unitType), category: "technical" });
    if (volume) list.push({ label: "Volume / Peso", value: String(volume), category: "dimensions" });
    if (temperature && temperature !== "none") {
      list.push({ label: "Temperatura", value: String(temperature), category: "technical" });
    }
    if (attrs.is_alcoholic !== undefined) {
      list.push({ label: "Bebida Alcoólica", value: attrs.is_alcoholic ? "Sim (+18)" : "Não alcoólico", category: "technical" });
    }
    if (prepTime) list.push({ label: "Tempo de Preparo", value: `~${prepTime} min`, category: "logistics" });
  }

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
  if (salaryRange) list.push({ label: "Remuneração", value: String(salaryRange), category: "hiring", highlight: true });
  if (workModel) list.push({ label: "Modelo de Trabalho", value: String(workModel), category: "hiring", highlight: true });
  if (regime) list.push({ label: "Regime", value: String(regime), category: "hiring", highlight: true });
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
