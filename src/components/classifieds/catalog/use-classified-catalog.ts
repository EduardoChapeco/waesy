import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import { CLASSIFIED_CHIPS } from "./classified-catalog-types";
import type { ViewModeType } from "@/components/commerce/discovery-control-bar";

export interface UseClassifiedCatalogProps {
  initialClassifieds?: any[];
  hotpages?: any[];
  searchParams?: {
    category?: string;
    dealType?: string;
    search?: string;
    subniche?: string;
    ponto?: string;
  };
}

export function useClassifiedCatalog({
  initialClassifieds = [],
  hotpages = [],
  searchParams = {},
}: UseClassifiedCatalogProps) {
  const initialCategory = (() => {
    const raw = searchParams.category?.toLowerCase();
    if (!raw) return "todos";
    if (raw === "negocios" || raw === "negocio" || raw === "business" || raw === "m&a") return "business";
    if (raw === "doacoes" || raw === "doacao" || raw === "donation") return "donation";
    if (raw === "gastronomia" || raw === "food") return "food";
    if (raw === "imoveis" || raw === "real_estate") return "real_estate";
    if (raw === "veiculos" || raw === "vehicle") return "vehicle";
    if (raw === "servicos" || raw === "service") return "service";
    if (raw === "turismo" || raw === "travel") return "travel";
    if (raw === "evento" || raw === "eventos" || raw === "event" || raw === "ingressos") return "event";
    if (raw === "agro" || raw === "agronegocio" || raw === "agri" || raw === "rural") return "agri";
    if (raw === "farmacia" || raw === "drogaria" || raw === "saude" || raw === "pharmacy") return "pharmacy";
    if (raw === "vagas" || raw === "vaga" || raw === "empregos" || raw === "emprego" || raw === "job" || raw === "jobs") return "job";
    return raw;
  })();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedDealType, setSelectedDealType] = useState(searchParams.dealType || "todos");
  const [selectedCity, setSelectedCity] = useState("todos");
  const [selectedDelivery, setSelectedDelivery] = useState<"todos" | "local" | "shipping">("todos");
  const [onlyInstallments, setOnlyInstallments] = useState(false);
  const [onlyTrade, setOnlyTrade] = useState(false);
  const [search, setSearch] = useState(searchParams.search || "");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");

  // Facetas Especializadas de Imóveis
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Facetas Especializadas de Veículos
  const [vehicleGearbox, setVehicleGearbox] = useState<string>("todos");
  const [vehicleFuel, setVehicleFuel] = useState<string>("todos");
  const [onlySingleOwner, setOnlySingleOwner] = useState(false);

  // Facetas Especializadas de Negócios
  const [businessGoal, setBusinessGoal] = useState<string>("todos");
  const [businessPointType, setBusinessPointType] = useState<string>(searchParams.ponto || "todos");
  const [businessRevenueRange, setBusinessRevenueRange] = useState<string>("todos");
  const [onlyBusinessWithNda, setOnlyBusinessWithNda] = useState<boolean>(false);

  // Facetas Especializadas de Gastronomia & Serviços
  const [serviceAudience, setServiceAudience] = useState<string>("todos");
  const [foodSubniche, setFoodSubniche] = useState<string>(searchParams.subniche || "todos");
  const [serviceSubniche, setServiceSubniche] = useState<string>("todos");

  // Faceta de Produtos Digitais
  const [onlyInstantDigital, setOnlyInstantDigital] = useState(false);

  // Facetas Especializadas de Desapego, Serviços e Vagas
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("todos");
  const [selectedServiceModality, setSelectedServiceModality] = useState<string>("todos");
  const [selectedJobRegime, setSelectedJobRegime] = useState<string>("todos");
  // Facetas Especializadas de Agro, Farmácia e Eventos
  const [agriSubcategory, setAgriSubcategory] = useState<string>("todos");
  const [agriTraction, setAgriTraction] = useState<string>("todos");
  const [pharmacySubniche, setPharmacySubniche] = useState<string>("todos");
  const [onlyPrescription, setOnlyPrescription] = useState<boolean>(false);
  const [eventType, setEventType] = useState<string>("todos");
  const [onlyBoosted, setOnlyBoosted] = useState<boolean>(false);
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState<boolean>(false);

  // Chips dinâmicos do CMS
  const dynamicCategoryChips = useMemo(() => {
    return CLASSIFIED_CHIPS.map((chip) => {
      const match = (hotpages || []).find(
        (h: any) =>
          h.slug === chip.id ||
          h.slug === `classificados-${chip.id}` ||
          h.target_route?.includes(`category=${chip.id}`) ||
          h.title?.toLowerCase() === chip.label.toLowerCase()
      );
      return {
        ...chip,
        label: match?.title || chip.label,
        customIconUrl: match?.custom_icon_url || null,
        bgMediaUrl: match?.bg_media_url || match?.cover_image_url || null,
        textColor: match?.text_color || null,
        isActive: match ? match.is_active !== false : true,
      };
    }).filter((c) => c.isActive !== false);
  }, [hotpages]);

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCity !== "todos") count++;
    if (onlyBoosted) count++;
    if (onlyTrade) count++;
    if (onlyInstallments) count++;
    if (selectedDelivery !== "todos") count++;
    if (selectedDealType !== "todos") count++;
    if (selectedAmenities.length > 0) count += selectedAmenities.length;
    if (vehicleGearbox !== "todos") count++;
    if (vehicleFuel !== "todos") count++;
    if (onlySingleOwner) count++;
    if (selectedSubcategory !== "todos") count++;
    if (selectedServiceModality !== "todos") count++;
    if (selectedJobRegime !== "todos") count++;
    if (businessGoal !== "todos") count++;
    if (businessPointType !== "todos") count++;
    if (foodSubniche !== "todos") count++;
    if (serviceAudience !== "todos") count++;
    if (serviceSubniche !== "todos") count++;
    if (onlyInstantDigital) count++;
    if (agriSubcategory !== "todos") count++;
    if (agriTraction !== "todos") count++;
    if (pharmacySubniche !== "todos") count++;
    if (onlyPrescription) count++;
    if (eventType !== "todos") count++;
    return count;
  }, [
    selectedCity,
    onlyBoosted,
    onlyTrade,
    onlyInstallments,
    selectedDelivery,
    selectedDealType,
    selectedAmenities,
    vehicleGearbox,
    vehicleFuel,
    onlySingleOwner,
    selectedSubcategory,
    selectedServiceModality,
    selectedJobRegime,
    businessGoal,
    businessPointType,
    foodSubniche,
    serviceAudience,
    serviceSubniche,
    onlyInstantDigital,
    agriSubcategory,
    setAgriSubcategory,
    agriTraction,
    setAgriTraction,
    pharmacySubniche,
    setPharmacySubniche,
    onlyPrescription,
    setOnlyPrescription,
    eventType,
    setEventType,
  ]);

  const handleClearAllFilters = () => {
    setSelectedCity("todos");
    setSelectedDealType("todos");
    setSelectedAmenities([]);
    setVehicleGearbox("todos");
    setVehicleFuel("todos");
    setOnlySingleOwner(false);
    setSelectedSubcategory("todos");
    setSelectedServiceModality("todos");
    setSelectedJobRegime("todos");
    setOnlyTrade(false);
    setOnlyInstallments(false);
    setOnlyBoosted(false);
    setSelectedDelivery("todos");
    setBusinessGoal("todos");
    setBusinessPointType("todos");
    setFoodSubniche("todos");
    setServiceAudience("todos");
    setServiceSubniche("todos");
    setOnlyInstantDigital(false);
    setAgriSubcategory("todos");
    setAgriTraction("todos");
    setPharmacySubniche("todos");
    setOnlyPrescription(false);
    setEventType("todos");
  };

  const { data: classifieds } = useQuery({
    queryKey: ["classifieds-master-list", selectedCategory, selectedDealType, search],
    queryFn: () =>
      getPublicClassifieds({
        data: {
          category:
            selectedCategory !== "todos" &&
            selectedCategory !== "digital" &&
            selectedCategory !== "donation" &&
            selectedCategory !== "travel" &&
            selectedCategory !== "food" &&
            selectedCategory !== "business"
              ? selectedCategory
              : undefined,
          dealType:
            selectedCategory === "real_estate" && selectedDealType !== "todos"
              ? selectedDealType
              : undefined,
          search: search || undefined,
        },
      }),
    initialData: initialClassifieds,
  });

  const filtered = useMemo(() => {
    return (classifieds || []).filter((item: any) => {
      // Categoria e Nichos
      if (selectedCategory === "digital") {
        const isDigital = item.is_digital || item.category === "digital" || item.attributes?.is_digital;
        if (Boolean(isDigital) === false) return false;
      } else if (selectedCategory === "donation") {
        const isDonation = item.is_free_donation || item.price_cents === 0 || item.attributes?.is_free_donation;
        if (Boolean(isDonation) === false) return false;
      } else if (selectedCategory === "business") {
        const isBiz =
          item.category === "business" ||
          item.category === "negocios" ||
          item.category === "negocio" ||
          Boolean(item.attributes?.is_business_sale) ||
          item.attributes?.niche === "business";
        if (Boolean(isBiz) === false) return false;

        if (businessGoal !== "todos") {
          const bType = String(item.attributes?.business_type || "").toLowerCase();
          const hasInv = Boolean(item.attributes?.target_investment_cents || item.attributes?.investment_model);
          if (businessGoal === "venda") {
            if (bType !== "venda_total" && bType !== "cotas" && bType !== "franquia") return false;
          } else if (businessGoal === "ponto") {
            if (bType !== "repasse_ponto") return false;
          } else if (businessGoal === "investimento") {
            if (bType !== "busca_socio" && bType !== "captacao_investimento" && Boolean(hasInv) === false) return false;
          }
        }

        if (businessPointType !== "todos") {
          const pt = (item.attributes?.commercial_point_type || "").toLowerCase();
          if (Boolean(pt.includes(businessPointType.toLowerCase())) === false) return false;
        }

        if (businessRevenueRange !== "todos") {
          const rev = Number(item.attributes?.monthly_revenue_cents) || 0;
          if (businessRevenueRange === "under_50k" && rev > 5000000) return false;
          if (businessRevenueRange === "50k_150k" && (rev < 5000000 || rev > 15000000)) return false;
          if (businessRevenueRange === "150k_500k" && (rev < 15000000 || rev > 50000000)) return false;
          if (businessRevenueRange === "over_500k" && rev < 50000000) return false;
        }

        if (onlyBusinessWithNda) {
          const reqNda = Boolean(item.attributes?.requires_nda || item.attributes?.is_confidential);
          if (Boolean(reqNda) === false) return false;
        }
      } else if (selectedCategory === "travel") {
        const isTravel =
          item.category === "travel" ||
          item.category === "viagem" ||
          item.category === "tourism" ||
          item.attributes?.niche_category === "travel";
        if (Boolean(isTravel) === false) return false;
      } else if (selectedCategory === "food") {
        const isFood =
          item.category === "food" ||
          item.category === "gastronomia" ||
          item.attributes?.niche_category === "food";
        if (Boolean(isFood) === false) return false;

        if (foodSubniche !== "todos") {
          const sub = (item.attributes?.food_subniche || item.attributes?.subniche || "").toLowerCase();
          if (Boolean(sub.includes(foodSubniche.toLowerCase())) === false) return false;
        }
      } else if (selectedCategory === "service") {
        const isService =
          item.category === "service" ||
          item.category === "servicos" ||
          item.category === "servico";
        if (Boolean(isService) === false) return false;

        if (serviceAudience !== "todos") {
          const aud = (item.attributes?.audience || item.attributes?.target_audience || "").toLowerCase();
          const isB2B = Boolean(item.attributes?.is_b2b || aud === "b2b" || aud === "empresa" || aud === "cnpj");
          if (serviceAudience === "empresa" && Boolean(isB2B) === false) return false;
          if (serviceAudience === "pessoa" && isB2B) return false;
        }

        if (serviceSubniche !== "todos") {
          const sub = (item.attributes?.service_subniche || item.attributes?.professional_council || "").toLowerCase();
          if (Boolean(sub.includes(serviceSubniche.toLowerCase())) === false) return false;
        }
      } else if (selectedCategory === "agri") {
        const isAgri =
          item.category === "agri" ||
          item.category === "agro" ||
          item.attributes?.niche === "agri" ||
          item.attributes?.niche === "agro";
        if (Boolean(isAgri) === false) return false;

        if (agriSubcategory !== "todos") {
          const sub = String(item.attributes?.subniche || item.attributes?.implement_type || item.title || "").toLowerCase();
          if (!sub.includes(agriSubcategory.toLowerCase())) return false;
        }
        if (agriTraction !== "todos") {
          const tr = String(item.attributes?.traction || item.attributes?.tracao || "").toLowerCase();
          if (!tr.includes(agriTraction.toLowerCase())) return false;
        }
      } else if (selectedCategory === "pharmacy") {
        const isPharm =
          item.category === "pharmacy" ||
          item.category === "farmacia" ||
          item.attributes?.niche === "pharmacy" ||
          item.attributes?.niche === "farmacia";
        if (Boolean(isPharm) === false) return false;

        if (pharmacySubniche !== "todos") {
          const sub = String(item.attributes?.subniche || item.title || "").toLowerCase();
          if (!sub.includes(pharmacySubniche.toLowerCase())) return false;
        }
        if (onlyPrescription) {
          const req = Boolean(
            item.attributes?.retention_prescription ||
            item.attributes?.requires_prescription ||
            item.attributes?.retem_receita
          );
          if (!req) return false;
        }
      } else if (selectedCategory === "event") {
        const isEvent =
          item.category === "event" ||
          item.category === "eventos" ||
          item.attributes?.niche === "event" ||
          item.attributes?.niche === "eventos";
        if (Boolean(isEvent) === false) return false;

        if (eventType !== "todos") {
          const evt = String(item.attributes?.event_type || item.title || "").toLowerCase();
          if (!evt.includes(eventType.toLowerCase())) return false;
        }
      } else if (selectedCategory === "job") {
        const isJob =
          item.category === "job" ||
          item.category === "job_offer" ||
          item.category === "vagas" ||
          item.attributes?.niche === "job";
        if (Boolean(isJob) === false) return false;

        if (selectedJobRegime !== "todos") {
          const reg = String(item.attributes?.contract_regime || item.attributes?.regime || "").toLowerCase();
          if (!reg.includes(selectedJobRegime.toLowerCase())) return false;
        }
      } else if (selectedCategory !== "todos" && item.category !== selectedCategory) {
        return false;
      }

      if (selectedCategory === "real_estate" && selectedDealType !== "todos") {
        if (item.deal_type !== selectedDealType) return false;
      }

      // Filtro Facetado de Imóveis
      if (selectedCategory === "real_estate" && selectedAmenities.length > 0) {
        const rawAmenities = item.amenities || item.attributes?.amenities || [];
        const itemAmenities = Array.isArray(rawAmenities)
          ? rawAmenities.map((a: any) => String(a).toLowerCase())
          : [String(rawAmenities).toLowerCase()];

        const contentLower = `${item.title || ""} ${item.content || ""}`.toLowerCase();

        const hasAll = selectedAmenities.every((amenity) => {
          if (amenity === "furnished") {
            return itemAmenities.includes("furnished") || itemAmenities.includes("mobiliado") || contentLower.includes("mobiliado");
          }
          if (amenity === "garage") {
            return itemAmenities.includes("garage") || itemAmenities.includes("garagem") || itemAmenities.includes("vaga") || contentLower.includes("garagem") || contentLower.includes("vaga");
          }
          if (amenity === "pool") {
            return itemAmenities.includes("pool") || itemAmenities.includes("piscina") || contentLower.includes("piscina");
          }
          if (amenity === "air_conditioning") {
            return itemAmenities.includes("air_conditioning") || itemAmenities.includes("ar condicionado") || contentLower.includes("ar condicionado") || contentLower.includes("ar-condicionado");
          }
          return true;
        });

        if (Boolean(hasAll) === false) return false;
      }

      // Filtro Facetado de Veículos
      if (selectedCategory === "vehicle") {
        if (vehicleGearbox !== "todos") {
          const trans = String(item.attributes?.transmission || item.attributes?.gearbox || "").toLowerCase();
          if (Boolean(trans.includes(vehicleGearbox.toLowerCase())) === false) return false;
        }
        if (vehicleFuel !== "todos") {
          const fuel = String(item.attributes?.fuel_type || item.attributes?.fuel || "").toLowerCase();
          if (Boolean(fuel.includes(vehicleFuel.toLowerCase())) === false) return false;
        }
        if (onlySingleOwner) {
          const isSingle = Boolean(item.attributes?.single_owner || item.attributes?.unico_dono);
          if (Boolean(isSingle) === false) return false;
        }
      }

      // Cidade
      if (selectedCity !== "todos") {
        const city = item.location_name || item.location_text || "";
        if (Boolean(city.toLowerCase().includes(selectedCity.toLowerCase())) === false) return false;
      }

      // Entrega / Retirada
      if (selectedDelivery === "local") {
        const mode = item.attributes?.delivery_mode || item.delivery_mode;
        if (mode !== "local_delivery" && mode !== "both") return false;
      } else if (selectedDelivery === "shipping") {
        const mode = item.attributes?.delivery_mode || item.delivery_mode;
        if (mode !== "national_shipping" && mode !== "both") return false;
      }

      // Condições Comerciais
      if (onlyInstallments) {
        const acceptsCard = item.attributes?.accepts_card ?? item.accepts_card;
        const maxInst = item.attributes?.max_installments ?? item.max_installments;
        if (Boolean(acceptsCard) === false || (maxInst && maxInst <= 1)) return false;
      }
      if (onlyTrade) {
        const acceptsTrade = item.attributes?.accepts_trade ?? item.accepts_trade;
        if (Boolean(acceptsTrade) === false) return false;
      }
      if (onlyInstantDigital) {
        const isDig = item.is_digital || item.category === "digital" || item.attributes?.is_digital;
        if (Boolean(isDig) === false) return false;
      }

      return true;
    });
  }, [
    classifieds,
    selectedCategory,
    selectedDealType,
    selectedCity,
    selectedDelivery,
    onlyInstallments,
    onlyTrade,
    selectedAmenities,
    vehicleGearbox,
    vehicleFuel,
    onlySingleOwner,
    businessGoal,
    businessPointType,
    businessRevenueRange,
    onlyBusinessWithNda,
    foodSubniche,
    serviceAudience,
    serviceSubniche,
    onlyInstantDigital,
    agriSubcategory,
    setAgriSubcategory,
    agriTraction,
    setAgriTraction,
    pharmacySubniche,
    setPharmacySubniche,
    onlyPrescription,
    setOnlyPrescription,
    eventType,
    setEventType,
  ]);

  return {
    selectedCategory,
    setSelectedCategory,
    selectedDealType,
    setSelectedDealType,
    selectedCity,
    setSelectedCity,
    selectedDelivery,
    setSelectedDelivery,
    onlyInstallments,
    setOnlyInstallments,
    onlyTrade,
    setOnlyTrade,
    search,
    setSearch,
    viewMode,
    setViewMode,
    selectedAmenities,
    toggleAmenity,
    vehicleGearbox,
    setVehicleGearbox,
    vehicleFuel,
    setVehicleFuel,
    onlySingleOwner,
    setOnlySingleOwner,
    businessGoal,
    setBusinessGoal,
    businessPointType,
    setBusinessPointType,
    businessRevenueRange,
    setBusinessRevenueRange,
    onlyBusinessWithNda,
    setOnlyBusinessWithNda,
    serviceAudience,
    setServiceAudience,
    foodSubniche,
    setFoodSubniche,
    serviceSubniche,
    setServiceSubniche,
    onlyInstantDigital,
    agriSubcategory,
    setAgriSubcategory,
    agriTraction,
    setAgriTraction,
    pharmacySubniche,
    setPharmacySubniche,
    onlyPrescription,
    setOnlyPrescription,
    eventType,
    setEventType,
    setOnlyInstantDigital,
    selectedSubcategory,
    setSelectedSubcategory,
    selectedServiceModality,
    setSelectedServiceModality,
    selectedJobRegime,
    setSelectedJobRegime,
    onlyBoosted,
    setOnlyBoosted,
    mobileFilterSheetOpen,
    setMobileFilterSheetOpen,
    dynamicCategoryChips,
    activeFiltersCount,
    handleClearAllFilters,
    filtered,
  };
}
