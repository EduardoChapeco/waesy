import React from "react";
import { SlidersHorizontal, Check, ArrowLeftRight, CreditCard, Flame, Lock, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CANONICAL_CITIES } from "@/lib/constants/cities";
import {
  REAL_ESTATE_DEAL_TYPES,
  REAL_ESTATE_FACETS,
  VEHICLE_GEARBOX_OPTIONS,
  VEHICLE_FUEL_OPTIONS,
  DESAPEGO_SUB_OPTIONS,
  FOOD_SUBNICHE_OPTIONS,
  SERVICE_AUDIENCE_OPTIONS,
  SERVICE_SUBNICHE_OPTIONS,
  SERVICE_MODALITY_OPTIONS,
  BUSINESS_GOAL_OPTIONS,
  BUSINESS_POINT_OPTIONS,
  JOB_REGIME_OPTIONS,
} from "./classified-catalog-types";

export interface ClassifiedFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFiltersCount: number;
  filteredCount: number;
  onClearAll: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onlyBoosted: boolean;
  onToggleBoosted: (val: boolean) => void;
  onlyTrade: boolean;
  onToggleTrade: (val: boolean) => void;
  onlyInstallments: boolean;
  onToggleInstallments: (val: boolean) => void;
  selectedDelivery: "todos" | "local" | "shipping";
  onSelectDelivery: (val: "todos" | "local" | "shipping") => void;
  selectedCategory: string;
  selectedDealType: string;
  onSelectDealType: (val: string) => void;
  selectedAmenities: string[];
  onToggleAmenity: (id: string) => void;
  vehicleGearbox: string;
  onSelectVehicleGearbox: (val: string) => void;
  vehicleFuel: string;
  onSelectVehicleFuel: (val: string) => void;
  onlySingleOwner: boolean;
  onToggleSingleOwner: (val: boolean) => void;
  selectedSubcategory: string;
  onSelectSubcategory: (val: string) => void;
  foodSubniche: string;
  onSelectFoodSubniche: (val: string) => void;
  serviceAudience: string;
  onSelectServiceAudience: (val: string) => void;
  serviceSubniche: string;
  onSelectServiceSubniche: (val: string) => void;
  selectedServiceModality: string;
  onSelectServiceModality: (val: string) => void;
  businessGoal: string;
  onSelectBusinessGoal: (val: string) => void;
  businessPointType: string;
  onSelectBusinessPointType: (val: string) => void;
  onlyBusinessWithNda: boolean;
  onToggleBusinessWithNda: (val: boolean) => void;
  selectedJobRegime: string;
  onSelectJobRegime: (val: string) => void;
  onlyInstantDigital: boolean;
  onToggleInstantDigital: (val: boolean) => void;
}

export function ClassifiedFilterSheet({
  open,
  onOpenChange,
  activeFiltersCount,
  filteredCount,
  onClearAll,
  selectedCity,
  onSelectCity,
  onlyBoosted,
  onToggleBoosted,
  onlyTrade,
  onToggleTrade,
  onlyInstallments,
  onToggleInstallments,
  selectedDelivery,
  onSelectDelivery,
  selectedCategory,
  selectedDealType,
  onSelectDealType,
  selectedAmenities,
  onToggleAmenity,
  vehicleGearbox,
  onSelectVehicleGearbox,
  vehicleFuel,
  onSelectVehicleFuel,
  onlySingleOwner,
  onToggleSingleOwner,
  selectedSubcategory,
  onSelectSubcategory,
  foodSubniche,
  onSelectFoodSubniche,
  serviceAudience,
  onSelectServiceAudience,
  serviceSubniche,
  onSelectServiceSubniche,
  selectedServiceModality,
  onSelectServiceModality,
  businessGoal,
  onSelectBusinessGoal,
  businessPointType,
  onSelectBusinessPointType,
  onlyBusinessWithNda,
  onToggleBusinessWithNda,
  selectedJobRegime,
  onSelectJobRegime,
  onlyInstantDigital,
  onToggleInstantDigital,
}: ClassifiedFilterSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-screen rounded-none sm:rounded-lg p-5 space-y-4 overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <DialogTitle className="text-base font-bold">Filtros Avançados</DialogTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs font-mono font-bold">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll} /* focus-visible: */
              className="text-xs text-muted-foreground hover:text-foreground h-11 px-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Limpar Todos
            </Button>
          )}
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Cidades */}
          <div className="space-y-2">
            <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
              Cidade / Região
            </span>
            <div className="flex flex-wrap gap-2">
              <button /* focus-visible: */
                type="button"
                onClick={() => onSelectCity("todos")} /* focus-visible: */
                className={cn(
                  "px-3 py-2 rounded-lg font-mono text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedCity === "todos"
                    ? "bg-foreground text-background font-bold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                )}
              >
                Todas
              </button>
              {CANONICAL_CITIES.map((c) => (
                <button /* focus-visible: */
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCity(selectedCity === c.name ? "todos" : c.name)} /* focus-visible: */
                  className={cn(
                    "px-3 py-2 rounded-lg font-mono text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedCity === c.name
                      ? "bg-foreground text-background font-bold"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Condições Comerciais */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
              Condições Comerciais
            </span>
            <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/40">
              <div className="flex items-center justify-between">
                <Label htmlFor="sheet-boosted" className="text-xs cursor-pointer flex items-center gap-2">
                  <Flame className="size-3.5 text-foreground" />
                  <span>Apenas Destaques</span>
                </Label>
                <Switch
                  id="sheet-boosted"
                  checked={onlyBoosted}
                  onCheckedChange={onToggleBoosted}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sheet-trade" className="text-xs cursor-pointer flex items-center gap-2">
                  <ArrowLeftRight className="size-3.5 text-muted-foreground" />
                  <span>Aceita Troca</span>
                </Label>
                <Switch
                  id="sheet-trade"
                  checked={onlyTrade}
                  onCheckedChange={onToggleTrade}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sheet-card" className="text-xs cursor-pointer flex items-center gap-2">
                  <CreditCard className="size-3.5 text-muted-foreground" />
                  <span>Parcelamento no Cartão</span>
                </Label>
                <Switch
                  id="sheet-card"
                  checked={onlyInstallments}
                  onCheckedChange={onToggleInstallments}
                />
              </div>
            </div>
          </div>

          {/* Modalidade de Entrega */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
              Modalidade de Entrega
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "todos", label: "Todas" },
                { id: "local", label: "Retirada Local / Balcão" },
                { id: "shipping", label: "Envio Nacional / Correios" },
              ].map((m) => (
                <button /* focus-visible: */
                  key={m.id}
                  type="button"
                  onClick={() => onSelectDelivery(m.id as any)} /* focus-visible: */
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedDelivery === m.id
                      ? "bg-foreground text-background font-bold"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* IMÓVEIS */}
          {selectedCategory === "real_estate" && (
            <div className="space-y-3 pt-2 border-t border-border/40">
              <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
                Opções de Imóveis e Hospedagem
              </span>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Finalidade</Label>
                <div className="flex flex-wrap gap-2">
                  {REAL_ESTATE_DEAL_TYPES.map((dt) => (
                    <button /* focus-visible: */
                      key={dt.id}
                      type="button"
                      onClick={() => onSelectDealType(dt.id)} /* focus-visible: */
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedDealType === dt.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Comodidades</Label>
                <div className="flex flex-wrap gap-2">
                  {REAL_ESTATE_FACETS.map((facet) => {
                    const isChecked = selectedAmenities.includes(facet.id);
                    return (
                      <button /* focus-visible: */
                        key={facet.id}
                        type="button"
                        onClick={() => onToggleAmenity(facet.id)} /* focus-visible: */
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isChecked
                            ? "bg-primary text-primary-foreground font-bold"
                            : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                        )}
                      >
                        <span>{facet.label}</span>
                        {isChecked && <Check className="size-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VEÍCULOS */}
          {selectedCategory === "vehicle" && (
            <div className="space-y-3 pt-2 border-t border-border/40">
              <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
                Opções de Veículos
              </span>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Câmbio</Label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_GEARBOX_OPTIONS.map((opt) => (
                    <button /* focus-visible: */
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectVehicleGearbox(opt.id)} /* focus-visible: */
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        vehicleGearbox === opt.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Combustível</Label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_FUEL_OPTIONS.map((opt) => (
                    <button /* focus-visible: */
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectVehicleFuel(opt.id)} /* focus-visible: */
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        vehicleFuel === opt.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border border-border/40">
                <Label htmlFor="sheet-single-owner" className="text-xs cursor-pointer">
                  Apenas Único Dono
                </Label>
                <Switch
                  id="sheet-single-owner"
                  checked={onlySingleOwner}
                  onCheckedChange={onToggleSingleOwner}
                />
              </div>
            </div>
          )}

          {/* DESAPEGOS */}
          {selectedCategory === "sale" && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
                Subcategorias de Desapego
              </span>
              <div className="flex flex-wrap gap-2">
                {DESAPEGO_SUB_OPTIONS.map((opt) => (
                  <button /* focus-visible: */
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectSubcategory(opt.id)} /* focus-visible: */
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selectedSubcategory === opt.id
                        ? "bg-foreground text-background font-bold"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GASTRONOMIA */}
          {selectedCategory === "food" && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
                Especialidade Gastronômica
              </span>
              <div className="flex flex-wrap gap-2">
                {FOOD_SUBNICHE_OPTIONS.map((opt) => (
                  <button /* focus-visible: */
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectFoodSubniche(opt.id)} /* focus-visible: */
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      foodSubniche === opt.id
                        ? "bg-foreground text-background font-bold"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SERVIÇOS */}
          {selectedCategory === "service" && (
            <div className="space-y-3 pt-2 border-t border-border/40">
              <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
                Opções de Serviços
              </span>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Público-Alvo</Label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_AUDIENCE_OPTIONS.map((opt) => (
                    <button /* focus-visible: */
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectServiceAudience(opt.id)} /* focus-visible: */
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        serviceAudience === opt.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Área de Atuação</Label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_SUBNICHE_OPTIONS.map((opt) => (
                    <button /* focus-visible: */
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectServiceSubniche(opt.id)} /* focus-visible: */
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        serviceSubniche === opt.id
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Modalidade</Label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_MODALITY_OPTIONS.map((opt) => (
                    <button /* focus-visible: */
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectServiceModality(opt.id)} /* focus-visible: */
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedServiceModality === opt.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NEGÓCIOS */}
          {selectedCategory === "business" && (
            <div className="space-y-3 pt-2 border-t border-border/40">
              <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
                Empresas à Venda
              </span>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Objetivo</Label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_GOAL_OPTIONS.map((opt) => (
                    <button /* focus-visible: */
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectBusinessGoal(opt.id)} /* focus-visible: */
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        businessGoal === opt.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo de Ponto Comercial</Label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_POINT_OPTIONS.map((opt) => (
                    <button /* focus-visible: */
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectBusinessPointType(opt.id)} /* focus-visible: */
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        businessPointType === opt.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border border-border/40">
                <Label htmlFor="sheet-nda" className="text-xs cursor-pointer flex items-center gap-2">
                  <Lock className="size-3.5 text-muted-foreground" />
                  <span>Apenas com Sigilo / NDA Assinado</span>
                </Label>
                <Switch
                  id="sheet-nda"
                  checked={onlyBusinessWithNda}
                  onCheckedChange={onToggleBusinessWithNda}
                />
              </div>
            </div>
          )}

          {/* VAGAS */}
          {(selectedCategory === "job" || selectedCategory === "job_offer") && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="font-bold font-mono uppercase text-muted-foreground block text-xs tracking-wider">
                Regime de Contratação
              </span>
              <div className="flex flex-wrap gap-2">
                {JOB_REGIME_OPTIONS.map((opt) => (
                  <button /* focus-visible: */
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectJobRegime(opt.id)} /* focus-visible: */
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selectedJobRegime === opt.id
                        ? "bg-foreground text-background font-bold"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PRODUTOS DIGITAIS */}
          {selectedCategory === "digital" && (
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border border-border/40">
                <Label htmlFor="sheet-instant-digital" className="text-xs cursor-pointer flex items-center gap-2">
                  <FileText className="size-3.5 text-muted-foreground" />
                  <span>Download Imediato</span>
                </Label>
                <Switch
                  id="sheet-instant-digital"
                  checked={onlyInstantDigital}
                  onCheckedChange={onToggleInstantDigital}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border/40">
          <Button
            type="button"
            onClick={() => onOpenChange(false)} /* focus-visible: */
            className="w-full h-11 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver {filteredCount} {filteredCount === 1 ? "Anúncio" : "Anúncios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
