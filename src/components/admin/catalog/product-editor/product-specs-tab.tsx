import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Layers,
  Car,
  Home as HomeIcon,
  Wrench,
  Package,
  Shirt,
  ThermometerSnowflake,
  Pill,
  PawPrint,
  Cpu,
  Boxes,
  Calendar,
  Truck,
} from "lucide-react";
import {
  calculateLogisticsMetrics,
  PACKAGING_FORMATS,
  type ProductLogisticsMetadata,
} from "./product-packaging-selector";

export interface NicheAttributesData {
  // Veículo
  brand?: string;
  model?: string;
  year?: string;
  mileage?: number | string;
  transmission?: string;
  fuel_type?: string;
  color?: string;
  doors?: string;
  license_plate_end?: string;

  // Imóvel
  usable_area?: number | string;
  total_area?: number | string;
  bedrooms?: number | string;
  suites?: number | string;
  bathrooms?: number | string;
  parking_spaces?: number | string;

  // Serviço
  service_duration?: number | string;
  service_modality?: string;
  service_warranty?: string;

  // Turismo / Viagem
  travel_category?: string;
  meal_plan?: string;
  lodging_category?: string;
  baggage_policy?: string;
  required_documents?: string;
  guide_language?: string;

  // Moda, Vestuário & Varejo Físico
  weight_kg?: number | string;
  dimensions?: string;
  material?: string;
  fit_type?: string;
  target_gender?: string;
  season_collection?: string;
  care_instructions?: string;
  warranty_months?: number | string;
  origin_region?: string;

  // Gastronomia & Supermercado / Perecíveis
  storage_temperature?: string;
  shelf_life_days?: number | string;
  sanitary_registration?: string;

  // Farmácia, Drogaria & Cosméticos
  active_ingredient?: string;
  dosage?: string;
  anvisa_registration?: string;
  prescription_type?: string;

  // Pet Shop & Veterinária
  pet_species?: string;
  pet_size?: string;
  pet_life_stage?: string;

  // Eletrônicos, Assistência & Locação
  voltage?: string;
  item_condition?: string;
  anatel_code?: string;
  security_deposit_info?: string;
  setup_requirements?: string;

  // Atacado & Distribuidora B2B
  units_per_box?: number | string;
  boxes_per_pallet?: number | string;
  dun14_code?: string;

  // Eventos & Educação
  modality?: string;
  workload_hours?: number | string;
  age_rating?: string;
  venue_name?: string;

  // Logística & WMS Sincronizado
  logistics?: ProductLogisticsMetadata;

  // Campos dinâmicos por Tipo de Produto (product_types.field_schema)
  custom_fields?: Record<string, any>;
}

export interface ProductSpecsTabProps {
  attributes: NicheAttributesData;
  onChange: (attrs: NicheAttributesData) => void;
  nicheContext?: any;
  nicheId?: string;
  selectedProductType?: { id: string; name: string; field_schema?: any[] } | null;
  synchronizedLogistics?: {
    weightKg?: number | string | null;
    lengthCm?: number | string | null;
    widthCm?: number | string | null;
    heightCm?: number | string | null;
    isPhysical?: boolean;
    logistics?: ProductLogisticsMetadata;
    onJumpToPackaging?: () => void;
  };
}

/**
 * ProductSpecsTab — Ficha Técnica e Especificações Canônicas do Produto/Serviço no Workspace
 * Isolamento Semântico Estrito de Nichos (Regra B.37) + Sincronização com Embalagem & WMS
 */
export function ProductSpecsTab({
  attributes,
  onChange,
  nicheContext,
  nicheId: explicitNicheId,
  selectedProductType,
  synchronizedLogistics,
}: ProductSpecsTabProps) {
  const updateField = (key: keyof NicheAttributesData, value: any) => {
    onChange({
      ...attributes,
      [key]: value,
    });
  };

  const updateCustomField = (fieldName: string, value: any) => {
    onChange({
      ...attributes,
      custom_fields: {
        ...(attributes.custom_fields || {}),
        [fieldName]: value,
      },
    });
  };

  const resolvedNicheId = explicitNicheId || nicheContext?.nicheId || "retail";
  const isTourism = Boolean(
    resolvedNicheId === "tourism" ||
    nicheContext?.isTourismBusiness ||
    nicheContext?.isTravel ||
    nicheContext?.showcaseMode === "travel"
  );
  const isVehicle = Boolean(resolvedNicheId === "vehicles" || nicheContext?.isVehicleBusiness);
  const isRealEstate = Boolean(resolvedNicheId === "real_estate" || nicheContext?.isRealEstateBusiness);
  const isService = Boolean(
    resolvedNicheId === "services" ||
    resolvedNicheId === "legal" ||
    nicheContext?.isServiceBusiness
  );
  const isFoodOrMarket = Boolean(
    resolvedNicheId === "gastronomy" ||
    resolvedNicheId === "supermarket" ||
    nicheContext?.isFoodBusiness ||
    nicheContext?.isSupermarketBusiness
  );
  const isPharmacy = resolvedNicheId === "pharmacy";
  const isPet = resolvedNicheId === "pet";
  const isTech = resolvedNicheId === "tech_repair";
  const isRental = resolvedNicheId === "rental";
  const isWholesale = resolvedNicheId === "wholesale";
  const isEventOrEdu = resolvedNicheId === "events" || resolvedNicheId === "education";
  const isPhysical = !isTourism && !isVehicle && !isRealEstate && !isService && !isEventOrEdu && !isFoodOrMarket;

  const logisticsMeta = synchronizedLogistics?.logistics || attributes.logistics || {};
  const metrics = React.useMemo(() => {
    if (!synchronizedLogistics) return null;
    return calculateLogisticsMetrics({
      weightKg: synchronizedLogistics.weightKg,
      lengthCm: synchronizedLogistics.lengthCm,
      widthCm: synchronizedLogistics.widthCm,
      heightCm: synchronizedLogistics.heightCm,
      packagingType: logisticsMeta.packaging_type,
    });
  }, [synchronizedLogistics, logisticsMeta.packaging_type]);

  const formatLabel =
    PACKAGING_FORMATS.find((f) => f.id === (logisticsMeta.packaging_type || "box"))?.label ||
    "Caixa de Papelão";

  return (
    <div className="space-y-6">
      {/* 0. Especificações de Turismo & Viagem (Se aplicável) */}
      {isTourism && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Layers className="size-4 text-primary shrink-0" />
            <span>Ficha Técnica do Pacote</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Categoria da Viagem</Label>
              <Select
                value={attributes.travel_category || "nacional"}
                onValueChange={(v) => updateField("travel_category", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional / Brasil</SelectItem>
                  <SelectItem value="internacional">Internacional</SelectItem>
                  <SelectItem value="excursao">Excursão Rodoviária</SelectItem>
                  <SelectItem value="resort">Resort & Relaxamento</SelectItem>
                  <SelectItem value="ecoturismo">Ecoturismo & Aventura</SelectItem>
                  <SelectItem value="cruzeiro">Cruzeiro Marítimo</SelectItem>
                  <SelectItem value="neve">Neve & Esqui</SelectItem>
                  <SelectItem value="cultural">Histórico & Cultural</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Regime Alimentar Principal</Label>
              <Select
                value={attributes.meal_plan || "cafe_da_manha"}
                onValueChange={(v) => updateField("meal_plan", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_inclusive">All Inclusive (Tudo Incluso)</SelectItem>
                  <SelectItem value="pensao_completa">Pensão Completa (3 Refeições)</SelectItem>
                  <SelectItem value="meia_pensao">Meia Pensão (Café e Jantar)</SelectItem>
                  <SelectItem value="cafe_da_manha">Café da Manhã Incluso</SelectItem>
                  <SelectItem value="sem_refeicoes">Só Hospedagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Padrão da Hospedagem</Label>
              <Select
                value={attributes.lodging_category || "hotel_4_estrelas"}
                onValueChange={(v) => updateField("lodging_category", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder="Classificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resort_5_estrelas">Resort 5 Estrelas Luxo</SelectItem>
                  <SelectItem value="hotel_5_estrelas">Hotel 5 Estrelas</SelectItem>
                  <SelectItem value="hotel_4_estrelas">Hotel 4 Estrelas Superior</SelectItem>
                  <SelectItem value="hotel_3_estrelas">Hotel 3 Estrelas Turístico</SelectItem>
                  <SelectItem value="pousada_boutique">Pousada Boutique / Charme</SelectItem>
                  <SelectItem value="chale_montanha">Chalé / Serra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Franquia de Bagagem Recomendada</Label>
              <Input
                value={attributes.baggage_policy ?? ""}
                onChange={(e) => updateField("baggage_policy", e.target.value)}
                placeholder="Ex: Item pessoal + mala de mão 10kg inclusos"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Guia e Idiomas</Label>
              <Input
                value={attributes.guide_language ?? ""}
                onChange={(e) => updateField("guide_language", e.target.value)}
                placeholder="Ex: Guia credenciado CADASTUR em Português"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Documentação Mínima</Label>
              <Input
                value={attributes.required_documents ?? ""}
                onChange={(e) => updateField("required_documents", e.target.value)}
                placeholder="Ex: RG com menos de 10 anos ou Passaporte válido"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1. Resumo Sincronizado de Logística, Embalagem & Composição (Sem Duplicação com Básico) */}
      {isPhysical && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-5 border border-border">
          {metrics && synchronizedLogistics?.isPhysical !== false && (
            <div className="p-4 rounded-lg bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Truck className="size-4 text-primary shrink-0" />
                  <span>Embalagem & Cubagem Sincronizadas: {formatLabel}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  Medidas: {Number(synchronizedLogistics?.lengthCm) || 0} × {Number(synchronizedLogistics?.widthCm) || 0} × {Number(synchronizedLogistics?.heightCm) || 0} cm · Peso Real: {metrics.realWeightKg} kg · Peso Tarifado: {metrics.chargeableWeightKg} kg · Modal: {metrics.recommendedLocalVehicleLabel}
                  {logisticsMeta.aisle_location ? ` · Bin WMS: ${logisticsMeta.aisle_location}` : ""}
                </p>
              </div>
              {synchronizedLogistics?.onJumpToPackaging && (
                <button
                  type="button"
                  onClick={synchronizedLogistics.onJumpToPackaging}
                  className="h-11 px-4 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Configurar Embalagem
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Shirt className="size-4 text-primary shrink-0" />
            <span>Ficha Técnica, Material & Conservação</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Material / Composição</Label>
              <Input
                value={attributes.material ?? ""}
                onChange={(e) => updateField("material", e.target.value)}
                placeholder="Ex: Algodão Egípcio 100%, Aço Inox, Couro"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Modelagem / Formato</Label>
              <Select
                value={attributes.fit_type || "padrao"}
                onValueChange={(v) => updateField("fit_type", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">Padrão / Regular</SelectItem>
                  <SelectItem value="slim">Slim Fit / Ajustado</SelectItem>
                  <SelectItem value="oversized">Oversized / Amplo</SelectItem>
                  <SelectItem value="alfaiataria">Alfaiataria / Social</SelectItem>
                  <SelectItem value="anatomico">Anatômico / Esportivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Público / Gênero</Label>
              <Select
                value={attributes.target_gender || "unissex"}
                onValueChange={(v) => updateField("target_gender", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unissex">Unissex / Universal</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="infantil">Infantil / Kids</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Instruções de Lavagem / Cuidado</Label>
              <Input
                value={attributes.care_instructions ?? ""}
                onChange={(e) => updateField("care_instructions", e.target.value)}
                placeholder="Ex: Lavar à mão, secar à sombra, não alvejar"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Garantia (Meses)</Label>
              <Input
                type="number"
                min="0"
                value={attributes.warranty_months ?? ""}
                onChange={(e) => updateField("warranty_months", e.target.value)}
                placeholder="Ex: 3"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Origem / Procedência</Label>
              <Input
                value={attributes.origin_region ?? ""}
                onChange={(e) => updateField("origin_region", e.target.value)}
                placeholder="Ex: Nacional, Importado, Produção Local"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1.B Especificações de Gastronomia, Supermercado & Perecíveis */}
      {isFoodOrMarket && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <ThermometerSnowflake className="size-4 text-primary shrink-0" />
            <span>Conservação, Validade & Rastreabilidade Alimentar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Temperatura de Conservação</Label>
              <Select
                value={attributes.storage_temperature || "ambiente"}
                onValueChange={(v) => updateField("storage_temperature", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambiente">Ambiente / Seco</SelectItem>
                  <SelectItem value="resfriado">Resfriado (0°C a 7°C)</SelectItem>
                  <SelectItem value="congelado">Congelado (-18°C)</SelectItem>
                  <SelectItem value="quente">Consumo Quente Imediato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Validade Média (Dias)</Label>
              <Input
                type="number"
                min="0"
                value={attributes.shelf_life_days ?? ""}
                onChange={(e) => updateField("shelf_life_days", e.target.value)}
                placeholder="Ex: 30"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Registro Sanitário (MAPA / SIF)</Label>
              <Input
                value={attributes.sanitary_registration ?? ""}
                onChange={(e) => updateField("sanitary_registration", e.target.value)}
                placeholder="Ex: SIF 1234 ou Isento"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1.C Especificações de Farmácia, Drogaria & Cosméticos */}
      {isPharmacy && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Pill className="size-4 text-primary shrink-0" />
            <span>Especificações Farmacêuticas & ANVISA</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Princípio Ativo / Ativo</Label>
              <Input
                value={attributes.active_ingredient ?? ""}
                onChange={(e) => updateField("active_ingredient", e.target.value)}
                placeholder="Ex: Dipirona Monoidratada"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Dosagem / Concentração</Label>
              <Input
                value={attributes.dosage ?? ""}
                onChange={(e) => updateField("dosage", e.target.value)}
                placeholder="Ex: 500mg, FPS 70"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Registro MS / ANVISA</Label>
              <Input
                value={attributes.anvisa_registration ?? ""}
                onChange={(e) => updateField("anvisa_registration", e.target.value)}
                placeholder="Ex: 1.0235.1234.001-2"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Classificação / Tarja</Label>
              <Select
                value={attributes.prescription_type || "mip_isento"}
                onValueChange={(v) => updateField("prescription_type", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mip_isento">Isento de Prescrição (MIP)</SelectItem>
                  <SelectItem value="dermocosmetico">Dermocosmético / Higiene</SelectItem>
                  <SelectItem value="suplemento">Suplemento / Vitamina</SelectItem>
                  <SelectItem value="tarja_vermelha">Tarja Vermelha (Sob Prescrição)</SelectItem>
                  <SelectItem value="retencao_receita">Retenção de Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* 1.D Especificações de Pet Shop & Veterinária */}
      {isPet && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <PawPrint className="size-4 text-primary shrink-0" />
            <span>Perfil Pet (Espécie, Porte e Fase)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Espécie Animal</Label>
              <Select
                value={attributes.pet_species || "caes"}
                onValueChange={(v) => updateField("pet_species", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caes">Cães</SelectItem>
                  <SelectItem value="gatos">Gatos</SelectItem>
                  <SelectItem value="caes_e_gatos">Cães e Gatos</SelectItem>
                  <SelectItem value="aves">Aves</SelectItem>
                  <SelectItem value="roedores">Roedores & Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Porte Recomendado</Label>
              <Select
                value={attributes.pet_size || "todos"}
                onValueChange={(v) => updateField("pet_size", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Portes</SelectItem>
                  <SelectItem value="mini">Mini / Toy</SelectItem>
                  <SelectItem value="pequeno">Pequeno Porte</SelectItem>
                  <SelectItem value="medio">Médio Porte</SelectItem>
                  <SelectItem value="grande">Grande / Gigante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Fase da Vida</Label>
              <Select
                value={attributes.pet_life_stage || "adulto"}
                onValueChange={(v) => updateField("pet_life_stage", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Idades</SelectItem>
                  <SelectItem value="filhote">Filhotes</SelectItem>
                  <SelectItem value="adulto">Adultos</SelectItem>
                  <SelectItem value="senior">Sênior / Castrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* 1.E Especificações de Eletrônicos, Assistência & Locação */}
      {(isTech || isRental) && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Cpu className="size-4 text-primary shrink-0" />
            <span>Especificações Elétricas, Homologação & Condição</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Voltagem / Alimentação</Label>
              <Select
                value={attributes.voltage || "bivolt"}
                onValueChange={(v) => updateField("voltage", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bivolt">Bivolt Automático (110V/220V)</SelectItem>
                  <SelectItem value="220v">220V</SelectItem>
                  <SelectItem value="110v">110V</SelectItem>
                  <SelectItem value="bateria_usb">Bateria Recarregável / USB-C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Condição do Equipamento</Label>
              <Select
                value={attributes.item_condition || "novo_lacrado"}
                onValueChange={(v) => updateField("item_condition", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo_lacrado">Novo Lacrado</SelectItem>
                  <SelectItem value="vitrine_open_box">Vitrine / Open Box</SelectItem>
                  <SelectItem value="recondicionado">Recondicionado Certificado</SelectItem>
                  <SelectItem value="seminovo">Seminovo Revisado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">
                {isRental ? "Caução / Requisitos de Montagem" : "Homologação ANATEL / Part Number"}
              </Label>
              <Input
                value={(isRental ? attributes.setup_requirements : attributes.anatel_code) ?? ""}
                onChange={(e) =>
                  updateField(isRental ? "setup_requirements" : "anatel_code", e.target.value)
                }
                placeholder={isRental ? "Ex: Requer tomada 20A" : "Ex: ANATEL 01234-24-01999"}
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1.F Especificações de Atacado & Distribuidora B2B */}
      {isWholesale && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Boxes className="size-4 text-primary shrink-0" />
            <span>Empacotamento B2B, Caixa Master & Paletização</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Unidades por Caixa / Fardo</Label>
              <Input
                type="number"
                min="1"
                value={attributes.units_per_box ?? ""}
                onChange={(e) => updateField("units_per_box", e.target.value)}
                placeholder="Ex: 12 ou 24"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Caixas por Palete Padrão</Label>
              <Input
                type="number"
                min="1"
                value={attributes.boxes_per_pallet ?? ""}
                onChange={(e) => updateField("boxes_per_pallet", e.target.value)}
                placeholder="Ex: 60"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Código DUN-14 (Caixa Master)</Label>
              <Input
                value={attributes.dun14_code ?? ""}
                onChange={(e) => updateField("dun14_code", e.target.value)}
                placeholder="Ex: 17891234567897"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1.G Especificações de Eventos & Educação */}
      {isEventOrEdu && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Calendar className="size-4 text-primary shrink-0" />
            <span>Modalidade, Carga Horária & Local</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Modalidade de Acesso</Label>
              <Select
                value={attributes.modality || "presencial"}
                onValueChange={(v) => updateField("modality", v)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online_ao_vivo">Online Ao Vivo</SelectItem>
                  <SelectItem value="ead_gravado">Digital / Gravado</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Carga Horária / Duração (Horas)</Label>
              <Input
                type="number"
                min="1"
                value={attributes.workload_hours ?? ""}
                onChange={(e) => updateField("workload_hours", e.target.value)}
                placeholder="Ex: 40"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Local / Plataforma</Label>
              <Input
                value={attributes.venue_name ?? ""}
                onChange={(e) => updateField("venue_name", e.target.value)}
                placeholder="Ex: Centro de Eventos / Plataforma Online"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1.H Campos Dinâmicos do Tipo de Produto (product_types.field_schema) */}
      {selectedProductType && Array.isArray(selectedProductType.field_schema) && selectedProductType.field_schema.length > 0 && (
        <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Package className="size-4 text-primary shrink-0" />
              <span>Atributos do Tipo: {selectedProductType.name}</span>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {selectedProductType.field_schema.length} campo(s)
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {selectedProductType.field_schema.map((field: any, idx: number) => {
              const fieldKey = field.name || `field_${idx}`;
              const currentVal = attributes.custom_fields?.[fieldKey] ?? "";
              return (
                <div key={fieldKey} className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">
                    {fieldKey} {field.required ? "*" : ""}
                  </Label>
                  {field.kind === "boolean" ? (
                    <Select
                      value={String(Boolean(currentVal))}
                      onValueChange={(v) => updateCustomField(fieldKey, v === "true")}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sim</SelectItem>
                        <SelectItem value="false">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : field.kind === "select_single" && Array.isArray(field.options) && field.options.length > 0 ? (
                    <Select
                      value={String(currentVal || field.options[0])}
                      onValueChange={(v) => updateCustomField(fieldKey, v)}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt: string) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.kind === "number" ? "number" : "text"}
                      value={currentVal}
                      onChange={(e) => updateCustomField(fieldKey, e.target.value)}
                      placeholder={`Informe ${fieldKey.toLowerCase()}...`}
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Especificações de Veículos (Apenas Veículos) */}
      {isVehicle && (
      <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Car className="size-4 text-primary shrink-0" />
          <span>Veículo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Marca</Label>
            <Input
              value={attributes.brand ?? ""}
              onChange={(e) => updateField("brand", e.target.value)}
              placeholder="Ex: Toyota, Honda, Volkswagen"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Modelo</Label>
            <Input
              value={attributes.model ?? ""}
              onChange={(e) => updateField("model", e.target.value)}
              placeholder="Ex: Corolla XEi 2.0"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Ano (Fab/Mod)</Label>
            <Input
              value={attributes.year ?? ""}
              onChange={(e) => updateField("year", e.target.value)}
              placeholder="Ex: 2022/2023"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Quilometragem (km)</Label>
            <Input
              type="number"
              value={attributes.mileage ?? ""}
              onChange={(e) => updateField("mileage", e.target.value)}
              placeholder="Ex: 45000"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Câmbio</Label>
            <Select
              value={attributes.transmission || "none"}
              onValueChange={(v) => updateField("transmission", v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue placeholder="Selecione o câmbio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                <SelectItem value="automatic">Automático</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="cvt">CVT</SelectItem>
                <SelectItem value="semi_automatic">Automatizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Combustível</Label>
            <Select
              value={attributes.fuel_type || "none"}
              onValueChange={(v) => updateField("fuel_type", v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue placeholder="Selecione o combustível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                <SelectItem value="flex">Flex (Álcool/Gasolina)</SelectItem>
                <SelectItem value="gasolina">Gasolina</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="hybrid">Híbrido</SelectItem>
                <SelectItem value="electric">Elétrico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Cor Externa</Label>
            <Input
              value={attributes.color ?? ""}
              onChange={(e) => updateField("color", e.target.value)}
              placeholder="Ex: Prata Metálico, Preto"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Portas</Label>
            <Input
              type="number"
              value={attributes.doors ?? ""}
              onChange={(e) => updateField("doors", e.target.value)}
              placeholder="Ex: 4"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Final da Placa</Label>
            <Input
              maxLength={1}
              value={attributes.license_plate_end ?? ""}
              onChange={(e) => updateField("license_plate_end", e.target.value)}
              placeholder="Ex: 8"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>
      </div>
      )}

      {/* 3. Especificações de Imóveis (Apenas Imóveis) */}
      {isRealEstate && (
      <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <HomeIcon className="size-4 text-primary shrink-0" />
          <span>Imóvel</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Área Útil (m²)</Label>
            <Input
              type="number"
              value={attributes.usable_area ?? ""}
              onChange={(e) => updateField("usable_area", e.target.value)}
              placeholder="Ex: 85"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Área Total (m²)</Label>
            <Input
              type="number"
              value={attributes.total_area ?? ""}
              onChange={(e) => updateField("total_area", e.target.value)}
              placeholder="Ex: 120"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Quartos</Label>
            <Input
              type="number"
              value={attributes.bedrooms ?? ""}
              onChange={(e) => updateField("bedrooms", e.target.value)}
              placeholder="Ex: 3"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Suítes</Label>
            <Input
              type="number"
              value={attributes.suites ?? ""}
              onChange={(e) => updateField("suites", e.target.value)}
              placeholder="Ex: 1"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Banheiros</Label>
            <Input
              type="number"
              value={attributes.bathrooms ?? ""}
              onChange={(e) => updateField("bathrooms", e.target.value)}
              placeholder="Ex: 2"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Vagas de Garagem</Label>
            <Input
              type="number"
              value={attributes.parking_spaces ?? ""}
              onChange={(e) => updateField("parking_spaces", e.target.value)}
              placeholder="Ex: 2"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>
      </div>
      )}

      {/* 4. Especificações de Serviços (Apenas Serviços) */}
      {isService && (
      <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Wrench className="size-4 text-primary shrink-0" />
          <span>Serviço</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Duração Estimada (min)</Label>
            <Input
              type="number"
              value={attributes.service_duration ?? ""}
              onChange={(e) => updateField("service_duration", e.target.value)}
              placeholder="Ex: 60"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Regime de Atendimento</Label>
            <Select
              value={attributes.service_modality || "none"}
              onValueChange={(v) => updateField("service_modality", v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue placeholder="Selecione o local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                <SelectItem value="presencial">Presencial no Estabelecimento</SelectItem>
                <SelectItem value="domicilio">Atendimento no Local do Cliente</SelectItem>
                <SelectItem value="remoto">Online / Remoto</SelectItem>
                <SelectItem value="both">Presencial ou Remoto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Garantia do Serviço</Label>
            <Input
              value={attributes.service_warranty ?? ""}
              onChange={(e) => updateField("service_warranty", e.target.value)}
              placeholder="Ex: 90 dias com emissão de nota"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
