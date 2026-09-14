import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
 Plus,
 Bus,
 Search,
 Copy,
 Trash2,
 Edit3,
 Layers,
 Users,
 CheckCircle2,
 Car,
 Plane,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/state/states";

import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import {
 listVehicleLayouts,
 createVehicleLayout,
 duplicateVehicleLayout,
 deleteVehicleLayout,
} from "@/services/vehicle-layouts.functions";

export const Route = createFileRoute("/workspace/turismo/frota/")({
 head: () => ({ meta: [{ title: "Frota & Ônibus | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const store = await getStoreSettings().catch(() => null);
 const storeId = store?.id || "";
 const layouts = storeId
 ? await listVehicleLayouts({ data: { store_id: storeId } }).catch(() => [])
 : [];
 return {
 store,
 initialLayouts: layouts || [],
 };
   } catch (err) {
     console.error("[loader:workspace.turismo.frota.index] Unhandled loader error:", err);
     return { store: null, initialLayouts: null };
   }
 },
 component: VehicleLayoutsListPage,
});

function VehicleLayoutsListPage() {
 const { store, initialLayouts } = (Route.useLoaderData as any)();
 const router = useRouter();
 const storeId = store?.id || "";

 const [layouts, setLayouts] = useState<any[]>(initialLayouts);
 const [searchQuery, setSearchQuery] = useState("");
 const [typeFilter, setTypeFilter] = useState("all");

 const [modalOpen, setModalOpen] = useState(false);
 const [name, setName] = useState("");
 const [vehicleType, setVehicleType] = useState<"bus" | "van" | "plane" | "microbus">("bus");
 const [rows, setRows] = useState(12);
 const [cols, setCols] = useState(5);
 const [isDoubleDecker, setIsDoubleDecker] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [layoutToDelete, setLayoutToDelete] = useState<any | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 const reload = async () => {
 if (!storeId) return;
 try {
 const updated = await listVehicleLayouts({ data: { store_id: storeId } });
 setLayouts(updated);
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao recarregar layouts");
 }
 };

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) {
 toast.error("Informe o nome do modelo de veículo");
 return;
 }

 try {
 setSubmitting(true);
 const created = await createVehicleLayout({
 data: {
 store_id: storeId,
 name: name.trim(),
 vehicle_type: vehicleType,
 rows: Number(rows) || 12,
 cols: Number(cols) || 5,
 is_double_decker: isDoubleDecker,
 },
 });

 toast.success("Modelo de veículo criado!");
 setModalOpen(false);
 setName("");
 reload();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao criar veículo");
 } finally {
 setSubmitting(false);
 }
 };

 const handleDuplicate = async (layout: any) => {
 const newName = window.prompt("Nome do novo modelo duplicado:", `${layout.name} (Cópia)`);
 if (!newName) return;

 try {
 await duplicateVehicleLayout({
 data: {
 store_id: storeId,
 layout_id: layout.id,
 new_name: newName,
 },
 });
 toast.success("Modelo duplicado com sucesso!");
 reload();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao duplicar layout");
 }
 };

  const handleDelete = (layout: any) => {
    setLayoutToDelete(layout);
  };

  const confirmDelete = async () => {
    if (!layoutToDelete) return;
    setIsDeleting(true);
    try {
      await deleteVehicleLayout({
        data: { store_id: storeId, layout_id: layoutToDelete.id },
      });
      toast.success("Modelo de veículo excluído com sucesso");
      setLayoutToDelete(null);
      reload();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir modelo");
    } finally {
      setIsDeleting(false);
    }
  };

 const [isMetricsOpen, setIsMetricsOpen] = useState(false);

 const filtered = layouts.filter((l) => {
 if (typeFilter !== "all" && l.vehicle_type !== typeFilter) return false;
 if (searchQuery.trim()) {
 return l.name.toLowerCase().includes(searchQuery.toLowerCase());
 }
 return true;
 });

 const totalSeatsInFleet = useMemo(() => {
 return layouts.reduce((acc, curr) => {
 const seats = Array.isArray(curr.seat_map)
 ? curr.seat_map.filter((c: any) => c.type === "seat").length
 : 0;
 return acc + seats;
 }, 0);
 }, [layouts]);

 const doubleDeckersCount = useMemo(() => {
 return layouts.filter((l) => l.is_double_decker).length;
 }, [layouts]);

 const metricsItems: MetricCardItem[] = useMemo(() => {
 return [
 {
 label: "Modelos Cadastrados",
 value: `${layouts.length} plantas`,
 description: "Ônibus, vans e micro-ônibus configurados",
 },
 {
 label: "Capacidade Total da Frota",
 value: `${totalSeatsInFleet} assentos`,
 description: "Somatório de poltronas mapeadas",
 },
 {
 label: "Double Deckers (2 Pisos)",
 value: `${doubleDeckersCount} unidades`,
 description: "Veículos com piso inferior e superior",
 },
 {
 label: "Média por Veículo",
 value: layouts.length > 0 ? `${Math.round(totalSeatsInFleet / layouts.length)} assentos` : "0",
 description: "Lotação média da frota ativa",
 },
 ];
 }, [layouts.length, totalSeatsInFleet, doubleDeckersCount]);

 const FILTER_OPTIONS = [
 { id: "all", label: "Todos os Veículos" },
 { id: "bus", label: "Ônibus Rodoviários" },
 { id: "van", label: "Vans Executivas" },
 { id: "microbus", label: "Micro-ônibus" },
 ];

 return (
 <NicheOperationalGuard
 targetNiche="tourism"
 toolTitle="Modelos de Frota & Ônibus 2D"
 toolDescription="Editor interativo de plantas baixas de ônibus (Double Decker, Executivo, Leito) com mapa de assentos para agências de turismo e fretamento."
 store={store}
 >
 <div className="flex flex-col min-h-[calc(100vh-4rem)] w-full">
 {/* ── 1. BARRA CANÔNICA APPLE HIG ── */}
 <WorkspaceCanonicalToolbar
 placeholder="Buscar modelo de veículo..."
 searchTerm={searchQuery}
 onSearchChange={setSearchQuery}
 filterChips={FILTER_OPTIONS.map((f) => ({
 id: f.id,
 label: f.label,
 active: typeFilter === f.id,
 }))}
  onFilterChange={(id: string) => setTypeFilter(id)}
 primaryAction={{
 label: "Novo Modelo",
 icon: Plus,
 onClick: () => setModalOpen(true),
 }}
 onMetricsClick={() => setIsMetricsOpen(true)}
 metricsBadge={`${layouts.length} frotas`}
 />

 {/* ── 2. Grid de Modelos ── */}
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filtered.map((layout) => (
 <div
 key={layout.id}
 className="flex flex-col justify-between p-5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all space-y-4"
 >
 <div className="space-y-3">
 <div className="flex items-start justify-between gap-2">
 <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
 {layout.vehicle_type === "bus" && <Bus className="size-5" />}
 {layout.vehicle_type === "van" && <Car className="size-5" />}
 {layout.vehicle_type === "microbus" && <Bus className="size-5" />}
 {layout.vehicle_type === "plane" && <Plane className="size-5" />}
 </div>

 <div className="flex items-center gap-1">
 <Badge variant="outline" className="text-[10px] font-mono capitalize">
 {layout.vehicle_type === "bus"
 ? "Ônibus"
 : layout.vehicle_type === "van"
 ? "Van"
 : layout.vehicle_type === "microbus"
 ? "Micro-ônibus"
 : "Avião"}
 </Badge>
 {layout.is_double_decker && (
 <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-none">
 2 Andares (DD)
 </Badge>
 )}
 </div>
 </div>

 <div className="space-y-1">
 <h3 className="font-bold text-sm text-foreground tracking-tight line-clamp-1">
 {layout.name}
 </h3>
 <p className="text-xs text-muted-foreground flex items-center gap-2">
 <span className="font-semibold text-foreground">{layout.total_capacity}</span> assentos
 <span>•</span>
 <span>{layout.rows} fileiras × {layout.cols} colunas</span>
 </p>
 </div>
 </div>

 {/* Rodapé de Ações */}
 <div className="flex items-center justify-between pt-3 border-t border-border/60">
 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleDuplicate(layout)}
 title="Duplicar modelo"
 className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <Copy className="size-3.5" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(layout)}
 title="Excluir modelo"
 className="size-8 rounded-lg text-muted-foreground hover:text-rose-600 cursor-pointer"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>

 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-8.5 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
 >
 <Link to={"/workspace/turismo/frota/$id" as any} params={{ id: layout.id } as any}>
 <Edit3 className="size-3.5" /> Editar Mapa 2D
 </Link>
 </Button>
 </div>
 </div>
 ))}
 </div>

 {filtered.length === 0 && (
 <EmptyState
 title="Nenhum modelo de veículo encontrado"
 description="Crie o mapa de assentos de um ônibus, micro-ônibus ou van para usar nas suas excursões."
 />
 )}

 {/* ── 4. Sheet Lateral de Novo Modelo ── */}
   <Sheet open={modalOpen} onOpenChange={setModalOpen}>
     <SheetContent
       side="right"
       size="wide"
       className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] border-l border-border/70 bg-card p-6 space-y-4 overflow-y-auto"
     >
      <SheetHeader>
        <SheetTitle className="text-base font-bold text-foreground">
          Novo Modelo de Veículo
        </SheetTitle>
        <SheetDescription className="text-xs text-muted-foreground">
          Configure a estrutura de assentos do veículo para compor o mapa 2D.
        </SheetDescription>
      </SheetHeader>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Nome do Modelo *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Marcopolo G7 1200 - 46 Lugares Executivo"
            className="h-11 rounded-xl text-xs"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tipo de Veículo</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as any)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="bus">Ônibus</option>
              <option value="microbus">Micro-ônibus</option>
              <option value="van">Van</option>
              <option value="plane">Avião</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Fileiras</label>
            <Input
              type="number"
              min={2}
              max={30}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="h-11 rounded-xl text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">Ônibus Double-Decker (DD)</p>
            <p className="text-[10px] text-muted-foreground">Possui dois andares com escada</p>
          </div>
          <input
            type="checkbox"
            checked={isDoubleDecker}
            onChange={(e) => setIsDoubleDecker(e.target.checked)}
            className="size-5 rounded border-border text-primary cursor-pointer"
          />
        </div>

        <SheetFooter className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setModalOpen(false)}
            disabled={submitting}
            className="h-10 px-4 rounded-xl text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || !name.trim()}
            className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {submitting ? "Criando..." : "Criar Modelo"}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>

    <WorkspaceDashboardSheet
      title="Telemetria da Frota"
      open={isMetricsOpen}
      onOpenChange={setIsMetricsOpen}
      items={metricsItems}
    />

    {/* Diálogo de Confirmação de Exclusão */}
    <AlertDialog open={Boolean(layoutToDelete)} onOpenChange={(open) => { if (!open) setLayoutToDelete(null); }}>
      <AlertDialogContent className="max-w-md rounded-2xl p-6 border-border/80">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold">
            Excluir modelo de veículo?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Tem certeza que deseja excluir o modelo <strong className="text-foreground">{layoutToDelete?.name}</strong>?
            Esta ação não poderá ser desfeita e removerá a configuração de assentos associada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="h-10 px-4 rounded-xl text-xs font-semibold"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirmDelete();
            }}
            disabled={isDeleting}
            className="h-10 px-4 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</div>
</NicheOperationalGuard>
  );
}
