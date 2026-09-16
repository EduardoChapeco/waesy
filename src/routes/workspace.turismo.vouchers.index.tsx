import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Plane,
  Building2,
  Car,
  Download,
  Trash2,
  Ticket,
  Shield,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";
import { VoucherCreationSheet } from "@/components/tourism/vouchers/voucher-creation-sheet";
import { OperatorVoucherImportSheet } from "@/components/tourism/vouchers/operator-voucher-import-sheet";
import { toast } from "sonner";
import { getStoreSettings } from "@/services/store.functions";
import {
  listTravelVouchers,
  deleteTravelVoucher,
} from "@/services/travel-vouchers.functions";
import { VOUCHER_TYPE_LABELS, type VoucherType } from "@/types/travel-vouchers";
import { TemplateVoucherA4 } from "@/components/tourism/vouchers/templates/template-voucher-a4";
import { exportElementAsPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/workspace/turismo/vouchers/")({
  head: () => ({
    meta: [{ title: "Central de Vouchers & Boarding Passes | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    return { store };
    } catch (err) {
      console.error("[loader:workspace.turismo.vouchers.index] Unhandled loader error:", err);
      return { store: null };
    }
  },
  component: WorkspaceVouchersPage,
});

export default function WorkspaceVouchersPage() {
  const { store } = ((Route.useLoaderData?.() as any) || {});
  const storeId = store?.id || "";

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [isCreationSheetOpen, setIsCreationSheetOpen] = useState(false);
  const [isImportVoucherOpen, setIsImportVoucherOpen] = useState(false);
  const [creationType, setCreationType] = useState<VoucherType>("flight");
  const [previewVoucher, setPreviewVoucher] = useState<any | null>(null);

  const {
    data: vouchers = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["travel-vouchers", storeId, selectedType],
    queryFn: () =>
      listTravelVouchers({
        data: { store_id: storeId, type: selectedType },
      }),
  });

  const filtered = vouchers.filter(
    (v: any) =>
      v.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.voucher_number?.toLowerCase().includes(search.toLowerCase()) ||
      v.title?.toLowerCase().includes(search.toLowerCase())
  );

  const flightVouchersCount = vouchers.filter(
    (v: any) => v.voucher_type === "flight"
  ).length;
  const hotelVouchersCount = vouchers.filter(
    (v: any) => v.voucher_type === "hotel"
  ).length;
  const transferVouchersCount = vouchers.filter(
    (v: any) => v.voucher_type === "transfer"
  ).length;

  const metricsItems: MetricCardItem[] = [
    {
      label: "Total de Vouchers",
      value: `${vouchers.length} emitidos`,
      description: "Documentos e bilhetes gerados pela agência",
    },
    {
      label: "Passagens Aéreas",
      value: `${flightVouchersCount} vouchers`,
      description: "Cartões de embarque com código localizador",
    },
    {
      label: "Hotéis & Resorts",
      value: `${hotelVouchersCount} vouchers`,
      description: "Confirmações de hospedagem e pensão",
    },
    {
      label: "Transfers & Receptivos",
      value: `${transferVouchersCount} vouchers`,
      description: "Vouchers de transporte e passeios locais",
    },
  ];

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Deseja realmente excluir o voucher ${num}?`)) return;
    try {
      await deleteTravelVoucher({ data: { id } });
      toast.success("Voucher removido com sucesso!");
      refetch();
    } catch (err: any) {
      toast.error("Erro ao remover voucher: " + err?.message);
    }
  };

  const handleDownloadPdf = async (v: any) => {
    setPreviewVoucher(v);
    setTimeout(async () => {
      try {
        await exportElementAsPdf("voucher-a4-canvas", `${v.voucher_number}.pdf`);
        toast.success("Voucher baixado em PDF!");
      } catch (err: any) {
        toast.error("Erro ao gerar PDF: " + err?.message);
      }
    }, 300);
  };

  const TABS = [
    { id: "all", label: "Todos os Vouchers", icon: Ticket, count: vouchers.length },
    { id: "flight", label: "Aéreos & Voos", icon: Plane, count: flightVouchersCount },
    { id: "hotel", label: "Hospedagens", icon: Building2, count: hotelVouchersCount },
    { id: "transfer", label: "Transfers", icon: Car, count: transferVouchersCount },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── 1. TOOLBAR CANÔNICA PADRÃO Waesy ── */}
      <WorkspaceCanonicalToolbar
        tabs={TABS}
        activeTab={selectedType}
        onTabChange={(id) => setSelectedType(id)}
        searchPlaceholder="Buscar por passageiro, destino ou nº do voucher..."
        searchValue={search}
        onSearchChange={setSearch}
        onOpenDashboard={() => setIsMetricsOpen(true)}
        dashboardLabel="Métricas"
        metricsBadge={`${vouchers.length} docs`}
        primaryAction={{
          label: "Importar Operadora (OCR)",
          icon: FileText,
          onClick: () => setIsImportVoucherOpen(true),
        }}
        secondaryAction={{
          label: "Emitir Manual",
          icon: Plus,
          onClick: () => {
            setCreationType("flight");
            setIsCreationSheetOpen(true);
          },
        }}
      />

      {/* ── 2. GRID OPERACIONAL DE VOUCHERS ── */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          Carregando vouchers emitidos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/70 bg-card space-y-3">
          <FileText className="size-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground">Nenhum voucher emitido no momento</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Emita cartões de embarque aéreos, vouchers de hotelaria e transfers para seus passageiros.
          </p>
          <Button
            size="default"
            onClick={() => {
              setCreationType("flight");
              setIsCreationSheetOpen(true);
            }}
            className="h-11 sm:h-9 px-5 rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="size-4 sm:size-3.5" />
            <span>Emitir Primeiro Voucher</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-foreground/20 transition-all shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground font-bold">
                      {v.voucher_number}
                    </span>
                    <h3 className="text-sm font-bold text-foreground leading-tight">
                      {v.passenger_name}
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono font-semibold">
                    {VOUCHER_TYPE_LABELS[v.voucher_type as VoucherType]?.split("/")[0] || v.voucher_type}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground font-medium line-clamp-2">
                  {v.title}
                </p>

                {v.voucher_type === "flight" && v.flight_data && (
                  <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 text-xs space-y-1">
                    <p className="font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                      <Plane className="size-3.5 shrink-0" />
                      <span>{v.flight_data.airline || "Cia Aérea"} ({v.flight_data.origin || "ORIG"} ➔ {v.flight_data.destination || "DEST"})</span>
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span>Voo: {v.flight_data.flightNumber || "-"}</span>
                      <span>Assento: {v.flight_data.seat || "-"}</span>
                    </div>
                  </div>
                )}

                {v.voucher_type === "hotel" && v.hotel_data && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Building2 className="size-3.5 shrink-0" />
                      <span>{v.hotel_data.hotelName || "Hotel / Resort"}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.hotel_data.roomType || "Quarto Standard"} · {v.hotel_data.boardBasis || "All Inclusive"}
                    </p>
                  </div>
                )}

                {v.voucher_type === "transfer" && v.transfer_data && (
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-1">
                    <p className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                      <Car className="size-3.5 shrink-0" />
                      <span>{v.transfer_data.pickupLocation || "Origem"} ➔ {v.transfer_data.dropoffLocation || "Destino"}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.transfer_data.vehicleType || "Veículo Executivo"}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 pt-3 flex items-center gap-2 justify-between text-xs">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownloadPdf(v)}
                  className="h-11 sm:h-8 px-4 sm:px-3 rounded-xl text-xs font-bold gap-1.5 border-border/70 flex-1 sm:flex-initial cursor-pointer"
                >
                  <Download className="size-4 sm:size-3.5" />
                  <span>Baixar PDF</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDelete(v.id, v.voucher_number)}
                  className="size-11 sm:size-8 p-0 rounded-xl text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                  title="Excluir voucher"
                >
                  <Trash2 className="size-4 sm:size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 3. SHEET DE EMISSÃO COMPLETA DE VOUCHER ── */}
      <VoucherCreationSheet
        open={isCreationSheetOpen}
        onOpenChange={setIsCreationSheetOpen}
        defaultType={creationType}
        storeId={storeId}
        onSuccess={refetch}
      />

      {/* ── 3.1 SHEET DE IMPORTAÇÃO DE VOUCHER DE OPERADORA (OCR) ── */}
      <OperatorVoucherImportSheet
        open={isImportVoucherOpen}
        onOpenChange={setIsImportVoucherOpen}
        storeId={storeId}
        onSuccess={() => refetch()}
      />

      {/* ── 4. DASHBOARD SHEET DE MÉTRICAS ── */}
      <WorkspaceDashboardSheet
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        title="Painel de Emissão de Vouchers"
        subtitle="Auditoria de cartões de embarque e confirmações"
        metrics={metricsItems}
      />

      {/* ── 5. CONTAINER OCULTO PARA GERAR PDF A4 ── */}
      {previewVoucher && (
        <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <TemplateVoucherA4 voucher={previewVoucher} agencyName={store?.name} />
        </div>
      )}
    </div>
  );
}
