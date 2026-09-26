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
  Smartphone,
  Layers,
  Eye,
} from "lucide-react";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  createTravelVoucher,
  deleteTravelVoucher,
} from "@/services/travel-vouchers.functions";
import { VOUCHER_TYPE_LABELS, type VoucherType } from "@/types/travel-vouchers";
import { TemplateVoucherA4 } from "@/components/tourism/vouchers/templates/template-voucher-a4";
import { TemplateVoucherStory } from "@/components/tourism/vouchers/templates/template-voucher-story";
import { exportElementAsPdf } from "@/lib/pdf-export";
import {
  DigitalCompanionCard,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
} from "@/components/documents/digital-companion-card";
import { MultimodalOcrUploader } from "@/components/documents/multimodal-ocr-uploader";

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
  const [isUniversalOcrOpen, setIsUniversalOcrOpen] = useState(false);
  const [creationType, setCreationType] = useState<VoucherType>("flight");
  const [previewVoucher, setPreviewVoucher] = useState<any | null>(null);
  const [companionModalVoucher, setCompanionModalVoucher] = useState<any | null>(null);
  const [previewFormat, setPreviewFormat] = useState<"story" | "companion" | "a4">("story");

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

  const handleDelete = async (id: string, num?: string) => {
    try {
      await deleteTravelVoucher({ data: { id } });
      toast.success(`Voucher ${num ? num + " " : ""}removido com sucesso!`);
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

  const handleSaveExtractedVoucherToDb = async (extracted: any) => {
    try {
      const flights = (extracted.sections || []).filter((s: any) => s.type === "flight");
      const hotels = (extracted.sections || []).filter((s: any) => s.type === "hotel");
      const transfers = (extracted.sections || []).filter((s: any) => s.type === "transport");

      const voucherType =
        flights.length > 0
          ? "flight"
          : hotels.length > 0
            ? "hotel"
            : transfers.length > 0
              ? "transfer"
              : "other";

      await createTravelVoucher({
        data: {
          store_id: storeId,
          voucher_type: voucherType as any,
          title: extracted.title || "Voucher Importado via OCR",
          passenger_name: extracted.participants?.[0] || "Passageiro Principal",
          flight_data: flights[0]
            ? {
                airline: flights[0].title?.split("·")[0]?.trim() || "Cia Aérea",
                flightNumber: flights[0].title?.split("·")[1]?.trim() || "",
                origin: flights[0].subtitle?.split("➔")[0]?.trim() || "",
                destination: flights[0].subtitle?.split("➔")[1]?.trim() || "",
                locator: extracted.code || "",
              }
            : {},
          hotel_data: hotels[0]
            ? {
                hotelName: hotels[0].title,
                address: hotels[0].subtitle,
                confirmationCode: extracted.code || "",
              }
            : {},
          transfer_data: transfers[0]
            ? {
                pickupLocation: transfers[0].title?.split("➔")[0]?.trim() || "",
                dropoffLocation: transfers[0].title?.split("➔")[1]?.trim() || "",
              }
            : {},
        },
      });

      toast.success("Voucher registrado no banco de dados com sucesso!");
      refetch();
      setIsUniversalOcrOpen(false);
    } catch (err: any) {
      toast.error("Erro ao registrar voucher: " + err?.message);
      throw err;
    }
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
        secondaryActions={[
          {
            label: "Scanner 9:16 (IA)",
            icon: Smartphone,
            onClick: () => setIsUniversalOcrOpen(true),
          },
          {
            label: "Emitir Manual",
            icon: Plus,
            onClick: () => {
              setCreationType("flight");
              setIsCreationSheetOpen(true);
            },
          },
        ]}
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
                      {[v.hotel_data.roomType, v.hotel_data.boardBasis].filter(Boolean).join(" · ") || "Acomodação conforme reserva"}
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
                <div className="flex items-center gap-1.5 flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCompanionModalVoucher(v)}
                    className="h-11 sm:h-8 px-3 rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                    title="Visualizar Cartão 9:16 para WhatsApp e Stories"
                  >
                    <Smartphone className="size-4 sm:size-3.5" />
                    <span>Cartão 9:16</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDownloadPdf(v)}
                    className="h-11 sm:h-8 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/70 cursor-pointer"
                    title="Baixar em formato A4 tradicional"
                  >
                    <Download className="size-4 sm:size-3.5" />
                    <span>A4</span>
                  </Button>
                </div>

                <CrudActionsMenu
                  entityName="Voucher"
                  onDelete={() => handleDelete(v.id, v.voucher_number)}
                  deleteConfirmTitle={`Excluir voucher ${v.voucher_number}?`}
                  deleteConfirmDescription="Esta ação removerá permanentemente o voucher operacional emitido."
                  customActions={[
                    {
                      id: "view-companion",
                      label: "Abrir Cartão 9:16",
                      icon: Smartphone,
                      onClick: () => setCompanionModalVoucher(v),
                    },
                    {
                      id: "download-pdf-menu",
                      label: "Baixar PDF (A4)",
                      icon: Download,
                      onClick: () => handleDownloadPdf(v),
                    },
                  ]}
                />
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

      {/* ── 3.2 MODAL DE SCANNER MULTIMODAL OCR (GERADOR 9:16 & WHATSAPP) ── */}
      <Dialog open={isUniversalOcrOpen} onOpenChange={setIsUniversalOcrOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Smartphone className="size-4 text-primary" />
              <span>Scanner Multimodal de Documentos & Vouchers 9:16 (IA)</span>
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <MultimodalOcrUploader
              nicheHint="tourism"
              showPreviewModal={true}
              onSaveToDatabase={handleSaveExtractedVoucherToDb}
              onExtracted={() => {
                refetch();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 4. DASHBOARD SHEET DE MÉTRICAS ── */}
      <WorkspaceDashboardSheet
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        title="Painel de Emissão de Vouchers"
        subtitle="Auditoria de cartões de embarque e confirmações"
        metrics={metricsItems}
      />

      {/* ── 4.1 MODAL DE VISUALIZAÇÃO E EXPORTAÇÃO 9:16 (WHATSAPP & STORIES) ── */}
      <Dialog
        open={Boolean(companionModalVoucher)}
        onOpenChange={(open) => {
          if (!open) setCompanionModalVoucher(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-xs">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualizador de Voucher & Bilhete</DialogTitle>
          </DialogHeader>

          {companionModalVoucher && (
            <div className="w-full space-y-4">
              {/* Header do Modal com Seletor de Formato */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60 gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Smartphone className="size-4 text-primary" />
                    <span>Visualizador de Voucher Oficial</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Alterne o formato entre Stories 9:16, Cartão Interativo e Folha A4
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border/40">
                  <Button
                    type="button"
                    size="sm"
                    variant={previewFormat === "story" ? "default" : "ghost"}
                    onClick={() => setPreviewFormat("story")}
                    className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Smartphone className="size-3.5" />
                    <span>Story 9:16</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewFormat === "companion" ? "default" : "ghost"}
                    onClick={() => setPreviewFormat("companion")}
                    className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Layers className="size-3.5" />
                    <span>Interativo</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewFormat === "a4" ? "default" : "ghost"}
                    onClick={() => setPreviewFormat("a4")}
                    className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Download className="size-3.5" />
                    <span>Padrão A4</span>
                  </Button>
                </div>
              </div>

              {/* Renderização condicional por formato */}
              {previewFormat === "story" && (
                <div className="py-2 flex justify-center animate-in fade-in zoom-in-95 duration-200">
                  <TemplateVoucherStory
                    voucher={companionModalVoucher}
                    agencyName={store?.name}
                    agencySlug={store?.slug}
                    agencyLogo={store?.logo_url}
                  />
                </div>
              )}

              {previewFormat === "companion" && (
                <div className="animate-in fade-in duration-200">
                  <DigitalCompanionCard
                    niche="tourism"
                    title={
                      companionModalVoucher.title ||
                      (companionModalVoucher.voucher_type === "flight"
                        ? `${companionModalVoucher.flight_data?.origin || "Origem"} ➔ ${companionModalVoucher.flight_data?.destination || "Destino"}`
                        : companionModalVoucher.hotel_data?.hotelName || "Voucher de Viagem")
                    }
                    subtitle={companionModalVoucher.title}
                    code={companionModalVoucher.voucher_number}
                    companyName={store?.name || "Agência de Viagens"}
                    companyLogoUrl={store?.logo_url}
                    participantsLabel="Passageiro"
                    participants={[companionModalVoucher.passenger_name].filter(Boolean)}
                    sections={buildCompanionSections(companionModalVoucher)}
                    rules={buildCompanionRules(companionModalVoucher)}
                    emergencyContacts={buildCompanionContacts(companionModalVoucher, store)}
                  />
                </div>
              )}

              {previewFormat === "a4" && (
                <div className="py-2 flex flex-col items-center gap-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-end w-full">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDownloadPdf(companionModalVoucher)}
                      className="rounded-xl text-xs font-bold gap-1.5"
                    >
                      <Download className="size-3.5" />
                      <span>Baixar PDF (A4)</span>
                    </Button>
                  </div>
                  <div className="w-full overflow-x-auto p-4 bg-muted/30 rounded-2xl border border-border/40 flex justify-center">
                    <div className="scale-75 sm:scale-85 md:scale-90 origin-top shadow-xs">
                      <TemplateVoucherA4
                        voucher={companionModalVoucher}
                        agencyName={store?.name}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 5. CONTAINER OCULTO PARA GERAR PDF A4 ── */}
      {previewVoucher && (
        <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <TemplateVoucherA4 voucher={previewVoucher} agencyName={store?.name} />
        </div>
      )}
    </div>
  );
}

function buildCompanionSections(v: any): CompanionCardSectionItem[] {
  const sections: CompanionCardSectionItem[] = [];

  if (v.voucher_type === "flight" && v.flight_data) {
    sections.push({
      type: "flight",
      badge: v.flight_data.seat ? `Assento: ${v.flight_data.seat}` : "Voo Confirmado",
      title: `${v.flight_data.airline || "Cia Aérea"} · ${v.flight_data.flightNumber || "Voo"}`,
      subtitle: `${v.flight_data.origin || "Origem"} ➔ ${v.flight_data.destination || "Destino"}`,
      details: [
        { label: "Embarque", value: v.flight_data.departureTime || "-", highlight: true },
        { label: "Chegada", value: v.flight_data.arrivalTime || "-" },
        {
          label: "Terminal / Portão",
          value: [
            v.flight_data.terminal ? `T${v.flight_data.terminal}` : "",
            v.flight_data.gate ? `Portão ${v.flight_data.gate}` : "",
          ]
            .filter(Boolean)
            .join(" · ") || "-",
        },
        { label: "Bagagem", value: v.flight_data.baggage || "1x 10kg mão inclusa" },
      ].filter((d) => Boolean(d.value && d.value !== "-")),
    });
  } else if (v.voucher_type === "hotel" && v.hotel_data) {
    sections.push({
      type: "hotel",
      badge: v.hotel_data.confirmationCode ? `Reserva: ${v.hotel_data.confirmationCode}` : "Hospedagem",
      title: v.hotel_data.hotelName || "Hotel / Resort",
      subtitle: v.hotel_data.address || "Endereço da Hospedagem",
      details: [
        { label: "Check-in", value: v.hotel_data.checkInDate || "-", highlight: true },
        { label: "Check-out", value: v.hotel_data.checkOutDate || "-" },
        { label: "Acomodação", value: v.hotel_data.roomType || "Quarto Standard" },
        { label: "Regime", value: v.hotel_data.boardBasis || "Café da Manhã" },
      ].filter((d) => Boolean(d.value && d.value !== "-")),
    });
  } else if (v.voucher_type === "transfer" && v.transfer_data) {
    sections.push({
      type: "transport",
      badge: "Transfer Executivo",
      title: `${v.transfer_data.pickupLocation || "Origem"} ➔ ${v.transfer_data.dropoffLocation || "Destino"}`,
      subtitle: v.transfer_data.vehicleType || "Veículo Executivo",
      details: [
        { label: "Horário de Coleta", value: v.transfer_data.pickupTime || "A combinar", highlight: true },
        { label: "Motorista", value: v.transfer_data.driverName || "Informado no local" },
        { label: "Contato", value: v.transfer_data.driverPhone || "-" },
      ].filter((d) => Boolean(d.value && d.value !== "-")),
    });
  } else {
    sections.push({
      type: "custom",
      badge: "Voucher de Serviço",
      title: v.title || "Serviço Confirmado",
      subtitle: `Código: ${v.voucher_number}`,
      details: [
        { label: "Beneficiário", value: v.passenger_name || "-", highlight: true },
        {
          label: "Emissão",
          value: v.created_at ? new Date(v.created_at).toLocaleDateString("pt-BR") : "-",
        },
      ].filter((d) => Boolean(d.value && d.value !== "-")),
    });
  }

  return sections;
}

function buildCompanionRules(v: any): CompanionRuleItem[] {
  if (v.voucher_type === "flight") {
    return [
      {
        title: "Horário no Aeroporto",
        description: "Compareça com 2h de antecedência em voos nacionais e 3h em internacionais.",
        badge: "Embarque",
        highlight: true,
      },
      {
        title: "Documentação de Identificação",
        description: "RG original ou CNH dentro da validade para embarque.",
        badge: "Documentos",
      },
      {
        title: "Franquia de Bagagem",
        description: "1 mala de mão de até 10kg inclusa respeitando as dimensões padrão.",
        badge: "Bagagem",
      },
    ];
  }

  if (v.voucher_type === "hotel") {
    return [
      {
        title: "Horário de Check-in",
        description: "Entrada a partir das 14h00. Diárias encerram às 11h00/12h00.",
        badge: "Hotel",
        highlight: true,
      },
      {
        title: "Apresentação de Voucher",
        description: "Apresente este voucher digital no balcão da recepção acompanhado de documento com foto.",
        badge: "Recepção",
      },
    ];
  }

  return [
    {
      title: "Orientações Gerais",
      description: "Mantenha o voucher salvo no celular e apresente ao prestador no momento do atendimento.",
      badge: "Atendimento",
      highlight: true,
    },
  ];
}

function buildCompanionContacts(v: any, store: any): CompanionContactItem[] {
  const contacts: CompanionContactItem[] = [];
  const settings = store?.settings || {};
  const agencyPhone = settings.whatsapp_phone || settings.phone || store?.whatsapp_phone;

  if (agencyPhone) {
    contacts.push({
      name: store?.name || "Agência de Viagens",
      category: "Plantão da Agência",
      phone: agencyPhone,
      whatsapp: true,
      is24h: false,
    });
  }

  if (v.voucher_type === "transfer" && v.transfer_data?.driverPhone) {
    contacts.push({
      name: v.transfer_data.driverName || "Motorista Transfer",
      category: "Receptivo / Motorista",
      phone: v.transfer_data.driverPhone,
      whatsapp: true,
      is24h: true,
    });
  }

  return contacts;
}
