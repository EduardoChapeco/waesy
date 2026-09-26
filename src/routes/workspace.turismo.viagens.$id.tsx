import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plane,
  Building2,
  Users,
  FileText,
  Ticket,
  Calendar,
  Phone,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Printer,
  Download,
  Luggage,
  Shield,
  Clock,
  Car,
  FileCheck2,
  Loader2,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  CreditCard,
  Receipt,
  ShieldAlert,
  DollarSign,
  Building,
  Barcode,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getTripAggregate,
  saveConfirmationItem,
  saveTripPassenger,
  deleteTripPassenger,
  saveTripFinancialDetails,
  type TripAggregateDTO,
  type TripConfirmationItemDTO,
  type TripPassengerDTO,
} from "@/services/travel-lifecycle.functions";
import { processBoletoOcr } from "@/services/travel-operator-ocr.functions";
import { VoucherBoardingCard } from "@/components/tourism/voucher-boarding-card";
import { OperatorVoucherImportSheet } from "@/components/tourism/vouchers/operator-voucher-import-sheet";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { formatMoney } from "@/lib/money";
import { FAMOUS_HOTEL_PRESETS } from "@/lib/hotel-presets";

export const Route = createFileRoute("/workspace/turismo/viagens/$id")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.aggregate?.trip
          ? `${loaderData.aggregate.trip.destination_city || "Viagem"} (${loaderData.aggregate.trip.trip_number}) | Workspace Waesy`
          : "Detalhes da Viagem | Workspace Waesy",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const aggregate = await getTripAggregate({ data: { tripId: params.id } });
      return { aggregate };
    } catch {
      return { aggregate: null };
    }
  },
  component: WorkspaceTripDetailPage,
});

type ActiveTab = "overview" | "passengers" | "locators" | "contract" | "vouchers" | "financial";

function checkDocumentValidity(
  expiryDateStr?: string | null,
  tripStartDateStr?: string | null
): {
  status: "valid" | "warning" | "expired" | "unknown";
  label: string;
  daysRemaining?: number;
} {
  if (!expiryDateStr) return { status: "unknown", label: "Não informada" };
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return { status: "unknown", label: "Data inválida" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expiry < today) {
    return { status: "expired", label: "VENCIDO" };
  }

  const baseDate = tripStartDateStr ? new Date(tripStartDateStr) : today;
  const diffTime = expiry.getTime() - baseDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: "expired", label: "Vence antes do embarque" };
  } else if (diffDays < 180) {
    return {
      status: "warning",
      label: `Vence em ${diffDays} dias (< 6 meses)`,
      daysRemaining: diffDays,
    };
  }

  return { status: "valid", label: "Documento Válido", daysRemaining: diffDays };
}

function WorkspaceTripDetailPage() {
  const { aggregate: initialAggregate } = ((Route.useLoaderData?.() as any) || {});
  const [aggregate, setAggregate] = useState<TripAggregateDTO | null>(initialAggregate);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [isCopied, setIsCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImportVoucherOpen, setIsImportVoucherOpen] = useState(false);

  // ── Estados Financeiros & Boletos 3-em-1 ──
  const tripFinancialDetails = (aggregate?.trip?.financial_details || {}) as any;
  const [financialGrossCents, setFinancialGrossCents] = useState<number>(
    tripFinancialDetails.gross_price_cents ?? aggregate?.trip?.total_cents ?? 0
  );
  const [financialOperatorNetCents, setFinancialOperatorNetCents] = useState<number>(
    tripFinancialDetails.operator_net_cents ?? 0
  );
  const [financialAgentPercent, setFinancialAgentPercent] = useState<number>(
    tripFinancialDetails.agent_commission_percent ?? 30
  );
  const [financialOperatorName, setFinancialOperatorName] = useState<string>(
    tripFinancialDetails.operator_name || aggregate?.trip?.operator_name || ""
  );
  const [financialExternalUrl, setFinancialExternalUrl] = useState<string>(
    tripFinancialDetails.external_finance_url || ""
  );
  const [financialPaymentMethod, setFinancialPaymentMethod] = useState<string>(
    tripFinancialDetails.payment_method || aggregate?.trip?.payment_method || "boleto_parcelado"
  );
  const [financialInstallments, setFinancialInstallments] = useState<any[]>(
    Array.isArray(tripFinancialDetails.installments) ? tripFinancialDetails.installments : []
  );
  const [isOcrBoletoLoading, setIsOcrBoletoLoading] = useState(false);
  const [isSavingFinancial, setIsSavingFinancial] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [newInstNumber, setNewInstNumber] = useState(1);
  const [newInstTotal, setNewInstTotal] = useState(10);
  const [newInstDueDate, setNewInstDueDate] = useState("");
  const [newInstAmountCents, setNewInstAmountCents] = useState(0);
  const [newInstDigitableLine, setNewInstDigitableLine] = useState("");
  const [newInstBankName, setNewInstBankName] = useState("Banco");

  // Modal de Adicionar Localizador
  const [isAddLocatorOpen, setIsAddLocatorOpen] = useState(false);
  const [locatorForm, setLocatorForm] = useState({
    itemType: "flight" as const,
    providerName: "",
    locatorCode: "",
    status: "confirmed" as const,
    serviceDate: "",
    notes: "",
  });

  // Modal de Passageiro
  const [isPassengerSheetOpen, setIsPassengerSheetOpen] = useState(false);
  const [passengerForm, setPassengerForm] = useState({
    id: undefined as string | undefined,
    fullName: "",
    documentType: "rg",
    document: "",
    documentExpiry: "",
    nationality: "Brasileira",
    birthDate: "",
    email: "",
    phone: "",
    seatNumber: "",
    isLeadPassenger: false,
    notes: "",
  });

  const saveLocatorMutation = useMutation({
    mutationFn: (data: typeof locatorForm) =>
      saveConfirmationItem({
        data: {
          tripId: aggregate?.trip?.id || "",
          itemType: data.itemType,
          providerName: data.providerName,
          locatorCode: data.locatorCode,
          status: data.status,
          serviceDate: data.serviceDate || undefined,
          notes: data.notes || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success("Localizador cadastrado com sucesso!");
      setIsAddLocatorOpen(false);
      setLocatorForm({
        itemType: "flight",
        providerName: "",
        locatorCode: "",
        status: "confirmed",
        serviceDate: "",
        notes: "",
      });
      const newItem: TripConfirmationItemDTO = {
        id: res.id,
        trip_id: aggregate?.trip?.id || "",
        item_type: locatorForm.itemType,
        provider_name: locatorForm.providerName,
        locator_code: locatorForm.locatorCode,
        status: locatorForm.status,
        service_date: locatorForm.serviceDate || null,
        notes: locatorForm.notes || null,
      };
      setAggregate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          confirmationItems: [newItem, ...(prev.confirmationItems || [])],
        };
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar localizador");
    },
  });

  const savePassengerMut = useMutation({
    mutationFn: (data: typeof passengerForm) =>
      saveTripPassenger({
        data: {
          id: data.id,
          tripId: aggregate?.trip?.id || "",
          fullName: data.fullName,
          documentType: data.documentType,
          document: data.document,
          documentExpiry: data.documentExpiry || undefined,
          nationality: data.nationality,
          birthDate: data.birthDate || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          seatNumber: data.seatNumber || undefined,
          isLeadPassenger: data.isLeadPassenger,
          notes: data.notes || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success("Passageiro salvo com sucesso!");
      setIsPassengerSheetOpen(false);
      const updated = await getTripAggregate({ data: { tripId: aggregate?.trip?.id || "" } }).catch(() => null);
      if (updated) setAggregate(updated);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar passageiro");
    },
  });

  const deletePassengerMut = useMutation({
    mutationFn: (passengerId: string) =>
      deleteTripPassenger({
        data: { passengerId },
      }),
    onSuccess: async () => {
      toast.success("Passageiro excluído!");
      const updated = await getTripAggregate({ data: { tripId: aggregate?.trip?.id || "" } }).catch(() => null);
      if (updated) setAggregate(updated);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir passageiro");
    },
  });

  if (!aggregate || !aggregate.trip) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <Compass className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-foreground">Viagem não encontrada</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            A reserva solicitada não existe ou ainda não foi confirmada.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
          <Link to="/workspace/turismo/viagens">Voltar para Viagens & Reservas</Link>
        </Button>
      </div>
    );
  }

  const trip = aggregate.trip;
  const store = aggregate.store;
  const mainVoucher = aggregate.vouchers[0];

  const origin = typeof window !== "undefined" ? window.location.origin : "https://usewaesy.com";
  const voucherPublicUrl = mainVoucher ? `${origin}/voucher/${mainVoucher.public_token}` : "";
  const contractPublicUrl = aggregate.contract?.public_token
    ? `${origin}/contrato/${aggregate.contract.public_token}`
    : "";

  const handleCopyVoucherUrl = () => {
    if (!voucherPublicUrl) return;
    navigator.clipboard.writeText(voucherPublicUrl);
    setIsCopied(true);
    toast.success("Link do voucher copiado!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportElementAsPdf(
        "voucher-printable-area",
        `Voucher_${trip.trip_number}_${trip.destination_city}.pdf`
      );
      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const openNewPassenger = () => {
    setPassengerForm({
      id: undefined,
      fullName: "",
      documentType: "passport",
      document: "",
      documentExpiry: "",
      nationality: "Brasileira",
      birthDate: "",
      email: "",
      phone: "",
      seatNumber: "",
      isLeadPassenger: false,
      notes: "",
    });
    setIsPassengerSheetOpen(true);
  };

  const openEditPassenger = (pax: TripPassengerDTO) => {
    setPassengerForm({
      id: pax.id,
      fullName: pax.full_name || "",
      documentType: pax.document_type || "rg",
      document: pax.document || "",
      documentExpiry: pax.document_expiry || "",
      nationality: pax.nationality || "Brasileira",
      birthDate: pax.birth_date || "",
      email: pax.email || "",
      phone: pax.phone || "",
      seatNumber: pax.seat_number || "",
      isLeadPassenger: pax.is_lead_passenger || false,
      notes: pax.notes || "",
    });
    setIsPassengerSheetOpen(true);
  };

  const cleanWhatsapp = (trip.client_whatsapp || "").replace(/\D/g, "");

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── 1. CABEÇALHO DA VIAGEM ── */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NativeBackButton fallbackHref="/workspace/turismo/viagens" />

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase">
                  {trip.trip_number}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">
                  {trip.status}
                </Badge>
                {trip.operator_name && (
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
                    Operadora: {trip.operator_name}
                  </Badge>
                )}
              </div>
              <h1 className="text-base font-bold text-foreground truncate">
                {trip.destination_city || trip.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportVoucherOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 cursor-pointer"
            >
              <FileText className="size-4 sm:size-3.5" />
              <span>Importar da Operadora (OCR)</span>
            </Button>

            {voucherPublicUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyVoucherUrl}
                className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 cursor-pointer"
              >
                {isCopied ? <Check className="size-4 sm:size-3.5 text-emerald-600" /> : <Copy className="size-4 sm:size-3.5" />}
                <span>Copiar Voucher</span>
              </Button>
            )}

            {voucherPublicUrl && (
              <Button asChild variant="outline" className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 cursor-pointer">
                <a href={voucherPublicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4 sm:size-3.5" />
                  <span>Abrir Voucher</span>
                </a>
              </Button>
            )}

            {contractPublicUrl && (
              <Button asChild variant="outline" className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 cursor-pointer">
                <a href={contractPublicUrl} target="_blank" rel="noopener noreferrer">
                  <FileCheck2 className="size-4 sm:size-3.5 text-primary" />
                  <span>Contrato</span>
                </a>
              </Button>
            )}

            <Button asChild variant="outline" className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 cursor-pointer">
              <Link to="/workspace/turismo/vouchers">
                <Ticket className="size-4 sm:size-3.5 text-primary" />
                <span>Central de Vouchers</span>
              </Link>
            </Button>

            <Button
              type="button"
              onClick={() => {
                const rawPhone = (trip.client_whatsapp || "").replace(/\D/g, "");
                if (!rawPhone) {
                  toast.error("Cliente não possui WhatsApp cadastrado.");
                  return;
                }
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const walletUrl = `${origin}/viajante/carteira`;
                const contractUrl = (trip as any).contract_token ? `${origin}/contrato/${(trip as any).contract_token}` : "";
                const msg = encodeURIComponent(
                  `Olá ${trip.client_name}! ✈️ Segue o seu Kit de Viagem para ${trip.destination_city} (Ref: ${trip.trip_number}):\n\n` +
                  `🎟️ Carteira Digital de Embarque & Vouchers: ${walletUrl}\n` +
                  (contractUrl ? `📄 Contrato de Intermediação Assinado: ${contractUrl}\n\n` : "\n") +
                  `Estamos à disposição no plantão da agência para qualquer apoio antes ou durante a viagem!`
                );
                window.open(`https://wa.me/55${rawPhone}?text=${msg}`, "_blank");
                toast.success("Abrindo WhatsApp com Kit de Viagem...");
              }}
              className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              <WhatsappLogo size={16} weight="fill" />
              <span>Disparar Kit WhatsApp</span>
            </Button>
          </div>
        </div>

        {/* Metadados Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60 text-xs">
          <div>
            <span className="text-[11px] text-muted-foreground block">Cliente Titular</span>
            <span className="font-bold text-foreground">{trip.client_name}</span>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Período de Viagem</span>
            <span className="font-bold text-foreground">
              {trip.travel_start_date ? new Date(trip.travel_start_date).toLocaleDateString("pt-BR") : "A definir"}
              {trip.travel_end_date && ` até ${new Date(trip.travel_end_date).toLocaleDateString("pt-BR")}`}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Passageiros</span>
            <span className="font-bold text-foreground">
              {aggregate.passengers.length || (trip.adults_count + trip.children_count)} pessoa(s)
            </span>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Valor Total</span>
            <span className="font-bold text-primary">{formatMoney(trip.total_cents)}</span>
          </div>
        </div>
      </div>

      {/* ── 2. ABAS DE NAVEGAÇÃO ── */}
      <div className="flex items-center gap-1 border-b border-border/80 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`min-h-[44px] sm:min-h-[38px] px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "overview"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="size-3.5" />
          <span>Visão Geral & Roteiro</span>
        </button>

        <button
          onClick={() => setActiveTab("passengers")}
          className={`min-h-[44px] sm:min-h-[38px] px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "passengers"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-3.5" />
          <span>Viajantes & Validades ({aggregate.passengers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("locators")}
          className={`min-h-[44px] sm:min-h-[38px] px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "locators"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ticket className="size-3.5" />
          <span>Localizadores PNR ({aggregate.confirmationItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("contract")}
          className={`min-h-[44px] sm:min-h-[38px] px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "contract"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCheck2 className="size-3.5" />
          <span>Contrato Digital</span>
        </button>

        <button
          onClick={() => setActiveTab("vouchers")}
          className={`min-h-[44px] sm:min-h-[38px] px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "vouchers"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plane className="size-3.5" />
          <span>Central de Vouchers A4</span>
        </button>

        <button
          onClick={() => setActiveTab("financial")}
          className={`min-h-[44px] sm:min-h-[38px] px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "financial"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="size-3.5" />
          <span>Financeiro, Boletos & Comissões</span>
        </button>
      </div>

      {/* ── 3. CONTEÚDO DAS ABAS ── */}

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* ── CARD 1: CHECKLIST OPERACIONAL DE ATENDIMENTO DA AGÊNCIA [REQ-19] ── */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Checklist de Atendimento
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={Boolean(trip.client_document)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-foreground block">1. Validade de Documentos</span>
                  <span className="text-[11px] text-muted-foreground block leading-tight">
                    RG &lt; 10 anos ou Passaporte válido por mais de 6 meses + Visto aplicável.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={Boolean((trip as any).contract_token)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-foreground block">2. Contrato Assinado</span>
                  <span className="text-[11px] text-muted-foreground block leading-tight">
                    Minuta de intermediação turística aceita ou assinada com hash SHA-256.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={Boolean(mainVoucher)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-foreground block">3. Vouchers & Apólices Emitidos</span>
                  <span className="text-[11px] text-muted-foreground block leading-tight">
                    Bilhetes carregados e disponíveis na Carteira Digital do Viajante (PWA).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={aggregate.confirmationItems.some((it) => it.item_type === "flight" && it.status === "confirmed")}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-foreground block">4. Check-in & Disparo de Kit</span>
                  <span className="text-[11px] text-muted-foreground block leading-tight">
                    Check-in aéreo concluído e kit de viagem disparado no WhatsApp do cliente.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Card de Operadora & Suporte de Emergência */}
          {(trip.operator_name || trip.operator_contacts) && (
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Operadora & Central de Plantão 24h
                  </h3>
                </div>
                {trip.operator_name && (
                  <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                    {trip.operator_name}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {trip.operator_contacts?.emergency_phone && (
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Phone className="size-3.5 text-amber-500" /> Plantão de Emergência 24h
                    </span>
                    <p className="font-mono font-bold text-foreground text-sm">
                      {trip.operator_contacts.emergency_phone}
                    </p>
                  </div>
                )}
                {trip.operator_contacts?.commercial_phone && (
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Phone className="size-3.5 text-primary" /> Suporte Comercial
                    </span>
                    <p className="font-mono font-bold text-foreground text-sm">
                      {trip.operator_contacts.commercial_phone}
                    </p>
                  </div>
                )}
                {trip.operator_contacts?.support_email && (
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Mail className="size-3.5 text-muted-foreground" /> Desk Operacional
                    </span>
                    <p className="font-mono text-foreground text-xs truncate">
                      {trip.operator_contacts.support_email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card de Regras Tarifárias & Cancelamento */}
          {trip.tariff_rules && Object.keys(trip.tariff_rules).length > 0 && (
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <ShieldAlert className="size-4 text-amber-500" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Regras Tarifárias, Cancelamento & Bagagem
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {(trip.tariff_rules.cancellation_deadline || trip.tariff_rules.cancel_deadline) && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block">
                      Prazo Limite de Cancelamento
                    </span>
                    <p className="text-foreground text-xs">
                      {trip.tariff_rules.cancellation_deadline || trip.tariff_rules.cancel_deadline}
                    </p>
                  </div>
                )}

                {(trip.tariff_rules.cancellation_penalty || trip.tariff_rules.cancel_penalty_text) && (
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Penalidades e Multas de Cancelamento
                    </span>
                    <p className="text-foreground text-xs">
                      {trip.tariff_rules.cancellation_penalty || trip.tariff_rules.cancel_penalty_text}
                    </p>
                  </div>
                )}

                {(trip.tariff_rules.baggage_rules || trip.tariff_rules.baggage_allowance_summary) && (
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <Luggage className="size-3.5 text-primary" /> Franquia de Bagagem Oficial
                    </span>
                    <p className="text-foreground text-xs">
                      {trip.tariff_rules.baggage_rules || trip.tariff_rules.baggage_allowance_summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card de Condições Financeiras & Boletos */}
          {(trip.financial_details || trip.payment_method) && (
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Condições Financeiras & Pagamento
                  </h3>
                </div>
                <span className="text-xs font-bold text-primary font-mono">
                  {formatMoney(trip.total_cents)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Forma de Pagamento</span>
                  <p className="font-bold text-foreground">
                    {trip.payment_method || trip.financial_details?.payment_method || "A Definir"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Condição de Parcelamento</span>
                  <p className="font-bold text-foreground">
                    {trip.installments_count || trip.financial_details?.installments_count || 1}x sem juros
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Status Financeiro</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 font-bold uppercase">
                    Confirmado
                  </Badge>
                </div>
              </div>

              {/* Boletos / Linhas digitáveis se houver */}
              {trip.financial_details?.installments && trip.financial_details.installments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Barcode className="size-4 text-primary" /> Parcelas / Boletos Bancários
                  </span>
                  <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/10">
                    {trip.financial_details.installments.map((inst: any, idx: number) => (
                      <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground">
                            Parcela {inst.number || idx + 1}: {inst.amount_cents ? formatMoney(inst.amount_cents) : "—"}
                          </span>
                          {inst.due_date && (
                            <p className="text-[11px] text-muted-foreground">Vencimento: {inst.due_date}</p>
                          )}
                          {inst.barcode && (
                            <p className="font-mono text-[10px] text-muted-foreground break-all">
                              Linha: {inst.barcode}
                            </p>
                          )}
                        </div>
                        {inst.barcode && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(inst.barcode);
                              toast.success("Código do boleto copiado!");
                            }}
                            className="rounded-xl text-xs font-bold gap-1.5 h-8 self-start sm:self-auto"
                          >
                            <Copy className="size-3" />
                            <span>Copiar Código</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voos */}
          {trip.flights && trip.flights.length > 0 && (
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <Plane className="size-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Voos & Malha Aérea
                </h3>
              </div>

              <div className="space-y-2">
                {trip.flights.map((f: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground">
                        {f.origin} ➔ {f.destination}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {f.airline || "Cia Aérea"} • Voo {f.flight_number || "—"} {f.date && `• ${f.date}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      {f.locator && (
                        <div className="bg-card px-2.5 py-1 rounded-lg border border-border/80">
                          <span className="text-[9px] text-muted-foreground block uppercase">PNR</span>
                          <span className="font-bold text-foreground">{f.locator}</span>
                        </div>
                      )}
                      {(f.departure_time || f.arrival_time) && (
                        <span>
                          {f.departure_time || "--:--"} - {f.arrival_time || "--:--"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hospedagens */}
          {trip.hotels && trip.hotels.length > 0 && (
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <Building2 className="size-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Hospedagens & Resorts
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trip.hotels.map((h: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-foreground">{h.name}</span>
                      {h.confirmation && (
                        <span className="font-mono text-[10px] bg-card px-2 py-0.5 rounded border border-border">
                          Loc: {h.confirmation}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                      <span>Regime: <strong className="text-foreground">{h.meal_plan || "Café"}</strong></span>
                      <span>Quarto: <strong className="text-foreground">{h.room_type || "Standard"}</strong></span>
                      <span>Check-in: <strong className="text-foreground">{h.checkin || "—"}</strong></span>
                      <span>Check-out: <strong className="text-foreground">{h.checkout || "—"}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inclusões & Observações */}
          {(trip.includes?.length > 0 || trip.notes) && (
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3 text-xs">
              <h3 className="font-bold text-foreground uppercase tracking-wider text-xs">
                Inclusões & Orientações ao Viajante
              </h3>
              {trip.includes?.length > 0 && (
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  {trip.includes.map((inc: string, i: number) => (
                    <li key={i}>{inc}</li>
                  ))}
                </ul>
              )}
              {trip.notes && (
                <p className="p-3 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground leading-relaxed">
                  {trip.notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: PASSAGEIROS & ROOMING LIST (Com Acompanhamento de Validade de Documentos) */}
      {activeTab === "passengers" && (
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span>Lista Oficial de Viajantes & Controle de Documentação</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Documentos completos extraídos via OCR ou editados pelo agente, com monitoramento automático de validade de passaportes.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {aggregate.passengers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    toast.success(`Vouchers emitidos e atualizados para todos os ${aggregate.passengers.length} viajantes! Disponíveis na Carteira Digital.`);
                  }}
                  className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-3.5 cursor-pointer border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Ticket className="size-3.5" />
                  <span>Emitir Vouchers para Todos ({aggregate.passengers.length})</span>
                </Button>
              )}

              <Button
                type="button"
                onClick={openNewPassenger}
                className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 cursor-pointer shadow-xs"
              >
                <Plus className="size-4 sm:size-3.5" />
                <span>Novo Passageiro</span>
              </Button>
            </div>
          </div>

          {aggregate.passengers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
              <Users className="size-10 mx-auto text-muted-foreground/40" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Nenhum passageiro detalhado cadastrado</p>
                <p className="text-[11px]">Importe um voucher via OCR ou adicione os viajantes manualmente.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={openNewPassenger}
                className="h-11 sm:h-9 px-5 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cadastrar Passageiro Titular
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aggregate.passengers.map((pax) => {
                const validity = checkDocumentValidity(pax.document_expiry, trip.travel_start_date);
                const docTypeLabel =
                  pax.document_type === "passport"
                    ? "Passaporte"
                    : pax.document_type === "rg"
                    ? "RG"
                    : pax.document_type === "cnh"
                    ? "CNH"
                    : pax.document_type === "cpf"
                    ? "CPF"
                    : "Documento";

                return (
                  <div
                    key={pax.id}
                    className="p-4 rounded-xl border border-border/60 bg-muted/15 space-y-3 text-xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{pax.full_name}</span>
                            {pax.is_lead_passenger && (
                              <Badge variant="outline" className="text-[9px] font-bold text-primary border-primary/30">
                                Titular
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Nacionalidade: <strong className="text-foreground">{pax.nationality || "Brasileira"}</strong>
                            {pax.birth_date && ` • Nascimento: ${pax.birth_date}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditPassenger(pax)}
                            className="size-10 sm:size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Edit2 className="size-4 sm:size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={deletePassengerMut.isPending}
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir o passageiro ${pax.full_name}?`)) {
                                deletePassengerMut.mutate(pax.id);
                              }
                            }}
                            className="size-10 sm:size-7 p-0 rounded-xl text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="size-4 sm:size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Caixa de Documentos & Validade */}
                      <div className="p-2.5 rounded-lg bg-card border border-border/70 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {docTypeLabel}: <strong className="font-mono text-foreground">{pax.document || "Não cadastrado"}</strong>
                          </span>
                          <Badge variant="outline" className="text-[9px] uppercase font-mono">
                            {pax.document_type || "Doc"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-[11px]">
                          <span className="text-muted-foreground">
                            Validade: <strong className="font-mono text-foreground">{pax.document_expiry || "Não informada"}</strong>
                          </span>

                          {/* Badge de Alerta de Validade */}
                          {validity.status === "expired" && (
                            <Badge className="text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 gap-1">
                              <AlertTriangle className="size-3" />
                              <span>{validity.label}</span>
                            </Badge>
                          )}
                          {validity.status === "warning" && (
                            <Badge className="text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1">
                              <AlertTriangle className="size-3" />
                              <span>{validity.label}</span>
                            </Badge>
                          )}
                          {validity.status === "valid" && (
                            <Badge className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1">
                              <CheckCircle2 className="size-3" />
                              <span>{validity.label}</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {pax.seat_number && (
                        <p className="text-[11px] text-muted-foreground">
                          Assento Reservado: <strong className="font-mono text-foreground">{pax.seat_number}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: LOCALIZADORES PNR */}
      {activeTab === "locators" && (
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Localizadores & Confirmações de Fornecedores
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Códigos PNR de companhias aéreas, reservas de hotéis, apólices de seguros e transfers.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsAddLocatorOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 cursor-pointer shadow-xs"
            >
              <Plus className="size-4 sm:size-3.5" />
              <span>Novo Localizador</span>
            </Button>
          </div>

          {aggregate.confirmationItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <Plane className="size-8 mx-auto text-muted-foreground/50" />
              <p>Nenhum localizador específico cadastrado ainda.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddLocatorOpen(true)}
                className="h-11 sm:h-9 px-5 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cadastrar Primeiro Localizador
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {aggregate.confirmationItems.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{item.provider_name}</span>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono">
                        {item.item_type}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 font-bold uppercase">
                        {item.status}
                      </Badge>
                    </div>
                    {item.notes && <p className="text-[11px] text-muted-foreground">{item.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60 font-mono font-bold text-sm text-foreground">
                      {item.locator_code}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(item.locator_code);
                        toast.success(`Localizador ${item.locator_code} copiado!`);
                      }}
                      className="size-10 sm:size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Copy className="size-4 sm:size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 4: CONTRATO DIGITAL */}
      {activeTab === "contract" && (
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Contrato Digital de Viagem
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Documento jurídico vinculado com assinatura eletrônica e fé pública.
              </p>
            </div>

            {contractPublicUrl && (
              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5 h-8.5">
                <a href={contractPublicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  <span>Página de Assinatura</span>
                </a>
              </Button>
            )}
          </div>

          {aggregate.contract ? (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">{aggregate.contract.contract_title}</h4>
                  <span className="text-[11px] text-muted-foreground">
                    Contratante: {aggregate.contract.client_name} • CPF: {aggregate.contract.client_document}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold uppercase ${
                    aggregate.contract.status === "signed"
                      ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                      : "text-amber-600 border-amber-500/30 bg-amber-500/10"
                  }`}
                >
                  {aggregate.contract.status === "signed" ? "Assinado" : "Pendente de Assinatura"}
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-2">
                <span className="font-bold text-foreground block">Cláusulas e Condições Gerais:</span>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  {aggregate.contract.package_summary}
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
                    <Link to="/workspace/turismo/contratos">Abrir Central de Contratos</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <FileCheck2 className="size-8 mx-auto text-muted-foreground/50" />
              <p>Nenhum contrato digital foi gerado automaticamente.</p>
              <Button asChild size="sm" className="rounded-xl text-xs font-bold">
                <Link to="/workspace/turismo/contratos">Emitir Novo Contrato</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ABA 5: CENTRAL DE VOUCHERS */}
      {activeTab === "vouchers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Voucher Oficial de Embarque (Padrão A4)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Documento de apresentação com código de autenticidade e QR Code para embarque.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsImportVoucherOpen(true)}
                className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-8.5 px-4 sm:px-3 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 cursor-pointer"
              >
                <FileText className="size-4 sm:size-3.5" />
                <span>Importar Voucher (OCR)</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isExportingPdf}
                onClick={handleExportPdf}
                className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-8.5 px-4 sm:px-3 cursor-pointer"
              >
                {isExportingPdf ? <Loader2 className="size-4 sm:size-3.5 animate-spin" /> : <Download className="size-4 sm:size-3.5" />}
                <span>Baixar PDF</span>
              </Button>

              <Button
                type="button"
                onClick={handlePrint}
                className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-8.5 px-4 sm:px-3 bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
              >
                <Printer className="size-4 sm:size-3.5" />
                <span>Imprimir Voucher</span>
              </Button>
            </div>
          </div>

          {/* Cartão de Embarque A4 Renderizado */}
          <div id="voucher-printable-area" className="flex justify-center">
            <VoucherBoardingCard
              trip={trip}
              voucher={mainVoucher}
              passengers={aggregate.passengers}
              confirmationItems={aggregate.confirmationItems}
              store={store}
            />
          </div>
        </div>
      )}

      {/* ABA 6: GESTÃO FINANCEIRA, BOLETOS & COMISSÕES (PADRÃO BIGTECH) */}
      {activeTab === "financial" && (
        <div className="space-y-6">
          {/* 1. KPIs FINANCEIROS & MARGEM DA AGÊNCIA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground block">Venda Bruta (Cliente)</span>
              <span className="text-base sm:text-lg font-bold text-foreground">
                {formatMoney(financialGrossCents)}
              </span>
              <span className="text-[10px] text-muted-foreground block">Valor final contratado</span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground block">Custo Operadora B2B</span>
              <span className="text-base sm:text-lg font-bold text-muted-foreground">
                {formatMoney(financialOperatorNetCents)}
              </span>
              <span className="text-[10px] text-muted-foreground block">{financialOperatorName || "Operadora"} líquida</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">Lucro Bruto Agência</span>
              <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(Math.max(0, financialGrossCents - financialOperatorNetCents))}
              </span>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 block">
                {financialGrossCents > 0
                  ? `${(((financialGrossCents - financialOperatorNetCents) / financialGrossCents) * 100).toFixed(1)}% de margem`
                  : "0%"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
              <span className="text-[11px] font-semibold text-primary block">Comissão do Consultor</span>
              <span className="text-base sm:text-lg font-bold text-primary">
                {formatMoney(Math.round(Math.max(0, financialGrossCents - financialOperatorNetCents) * (financialAgentPercent / 100)))}
              </span>
              <span className="text-[10px] text-primary/80 block">{financialAgentPercent}% do lucro agência</span>
            </div>
          </div>

          {/* 2. CONFIGURAÇÃO DE VALORES E OPERADORA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Composição da Venda & Comissão
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor Total Bruto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(financialGrossCents / 100).toFixed(2)}
                  onChange={(e) => setFinancialGrossCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Custo Líquido Operador (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(financialOperatorNetCents / 100).toFixed(2)}
                  onChange={(e) => setFinancialOperatorNetCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Operadora / Consolidadora</Label>
                <Input
                  value={financialOperatorName}
                  onChange={(e) => setFinancialOperatorName(e.target.value)}
                  placeholder="Ex: CVC, Trend, Orinter, Visual"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">% Comissão do Consultor</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={financialAgentPercent}
                  onChange={(e) => setFinancialAgentPercent(Number(e.target.value || 0))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Forma de Pagamento Contratada</Label>
                <Select value={financialPaymentMethod} onValueChange={setFinancialPaymentMethod}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financiamento_bancario">Financiamento Bancário / Carnê Parceiro</SelectItem>
                    <SelectItem value="cartao_operadora">Cartão de Crédito via Operadora</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito Direto na Agência</SelectItem>
                    <SelectItem value="boleto_parcelado">Boleto Bancário Parcelado / Carnê</SelectItem>
                    <SelectItem value="pix">Pix / TED à Vista</SelectItem>
                    <SelectItem value="faturado_corporativo">Faturamento Corporativo a Prazo</SelectItem>
                    <SelectItem value="checkout_app_terrestre">Pagamento Online no App (Exclusivo Terrestre / Excursões)</SelectItem>
                    <SelectItem value="combinado_consultor">Personalizado / Combinado com Consultor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Link da Financiadora Externa (Opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={financialExternalUrl}
                    onChange={(e) => setFinancialExternalUrl(e.target.value)}
                    placeholder="https://financiadora.com.br/proposta/..."
                    className="h-9 text-xs rounded-xl flex-1 font-mono"
                  />
                  {financialExternalUrl && (
                    <Button asChild size="sm" variant="outline" className="h-9 rounded-xl px-2.5 shrink-0">
                      <a href={financialExternalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. GESTÃO DE BOLETOS 3-EM-1 (OCR POR IA, MANUAL E EXTERNO) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Barcode className="size-4 text-primary" />
                  Carnê & Boletos Bancários ({financialInstallments.length} parcelas)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Suporte às 3 modalidades: extração por IA, upload manual ou link externo da financiadora.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Input Invisível para OCR de Boletos */}
                <input
                  type="file"
                  id="boleto-ocr-file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsOcrBoletoLoading(true);
                    try {
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const base64 = (reader.result as string).split(",")[1];
                        const res = await processBoletoOcr({
                          data: {
                            fileBase64: base64,
                            fileMime: file.type,
                            fileName: file.name,
                          },
                        });
                        if (res.success && res.data.installments.length > 0) {
                          setFinancialInstallments((prev) => [
                            ...prev,
                            ...res.data.installments.map((inst, i) => ({
                              id: crypto.randomUUID(),
                              ...inst,
                            })),
                          ]);
                          toast.success(`OCR concluído: ${res.data.installments.length} parcelas extraídas com sucesso!`);
                        } else {
                          toast.warning("Nenhuma parcela foi identificada no arquivo.");
                        }
                      };
                      reader.readAsDataURL(file);
                    } catch (err: any) {
                      toast.error(err?.message || "Erro ao processar boleto com IA.");
                    } finally {
                      setIsOcrBoletoLoading(false);
                      e.target.value = "";
                    }
                  }}
                />

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isOcrBoletoLoading}
                  onClick={() => document.getElementById("boleto-ocr-file")?.click()}
                  className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 cursor-pointer"
                >
                  {isOcrBoletoLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Barcode className="size-3.5" />}
                  <span>{isOcrBoletoLoading ? "Lendo Carnê..." : "⚡ Importar Carnê (OCR IA)"}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewInstNumber(financialInstallments.length + 1);
                    setNewInstTotal(Math.max(10, financialInstallments.length + 1));
                    setNewInstAmountCents(
                      financialGrossCents > 0
                        ? Math.round(financialGrossCents / Math.max(1, financialInstallments.length + 1))
                        : 0
                    );
                    setIsAddInstallmentOpen(true);
                  }}
                  className="rounded-xl text-xs font-bold gap-1.5 h-9 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Adicionar Parcela</span>
                </Button>
              </div>
            </div>

            {/* TABELA DE PARCELAS DO CARNÊ */}
            {financialInstallments.length === 0 ? (
              <div className="py-8 text-center space-y-2 border border-dashed border-border/70 rounded-xl">
                <Barcode className="size-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-bold text-foreground">Nenhum boleto registrado nesta viagem</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Utilize o botão "⚡ Importar Carnê (OCR IA)" para ler um PDF bancário com todas as parcelas ou adicione manualmente.
                </p>
              </div>
            ) : (
              <div className="border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
                {financialInstallments.map((inst, idx) => {
                  const isPaid = inst.status === "paid";
                  return (
                    <div key={inst.id || idx} className="p-3 bg-card hover:bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFinancialInstallments((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, status: item.status === "paid" ? "pending" : "paid", paid_at: item.status === "paid" ? null : new Date().toISOString() }
                                  : item
                              )
                            );
                          }}
                          className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                            isPaid
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-border/80 hover:border-primary text-transparent"
                          }`}
                        >
                          <Check className="size-4" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              Parcela {inst.installment_number} de {inst.total_installments || financialInstallments.length}
                            </span>
                            <Badge
                              variant={isPaid ? "default" : "secondary"}
                              className={`text-[9px] px-1.5 py-0 font-bold ${
                                isPaid ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isPaid ? "PAGA" : "PENDENTE"}
                            </Badge>
                            {inst.bank_name && (
                              <span className="text-[10px] text-muted-foreground">({inst.bank_name})</span>
                            )}
                          </div>

                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Vencimento: <strong className="text-foreground">{inst.due_date || "Não informada"}</strong>
                          </span>

                          {inst.digitable_line && (
                            <span className="font-mono text-[10px] text-muted-foreground/80 truncate block max-w-xs sm:max-w-md">
                              {inst.digitable_line}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-xs font-bold text-foreground">
                          {formatMoney(inst.amount_cents)}
                        </span>

                        {inst.digitable_line && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(inst.digitable_line);
                              toast.success("Linha digitável copiada!");
                            }}
                            className="h-8 w-8 rounded-lg cursor-pointer"
                            title="Copiar Linha Digitável"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setFinancialInstallments((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="h-8 w-8 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Remover Parcela"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BOTÃO SALVAR ALTERAÇÕES FINANCEIRAS */}
            <div className="flex justify-end pt-3">
              <Button
                type="button"
                disabled={isSavingFinancial}
                onClick={async () => {
                  setIsSavingFinancial(true);
                  try {
                    await saveTripFinancialDetails({
                      data: {
                        tripId: trip.id,
                        grossPriceCents: financialGrossCents,
                        operatorNetCents: financialOperatorNetCents,
                        agencyCommissionCents: Math.max(0, financialGrossCents - financialOperatorNetCents),
                        agentCommissionCents: Math.round(Math.max(0, financialGrossCents - financialOperatorNetCents) * (financialAgentPercent / 100)),
                        agentCommissionPercent: financialAgentPercent,
                        operatorName: financialOperatorName || undefined,
                        paymentMethod: financialPaymentMethod,
                        installmentsCount: financialInstallments.length || undefined,
                        externalFinanceUrl: financialExternalUrl || undefined,
                        installments: financialInstallments,
                      },
                    });
                    toast.success("Dados financeiros e boletos salvos com sucesso!");
                  } catch (err: any) {
                    toast.error(err?.message || "Erro ao salvar dados financeiros.");
                  } finally {
                    setIsSavingFinancial(false);
                  }
                }}
                className="rounded-xl text-xs font-bold gap-1.5 h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
              >
                {isSavingFinancial ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                <span>{isSavingFinancial ? "Salvando..." : "Salvar Alterações Financeiras"}</span>
              </Button>
            </div>
          </div>

          {/* MODAL PARA ADICIONAR PARCELA MANUAL */}
          <Sheet open={isAddInstallmentOpen} onOpenChange={setIsAddInstallmentOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto space-y-4">
              <SheetHeader>
                <SheetTitle className="text-sm font-bold text-foreground">Adicionar Parcela de Carnê</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Cadastre uma parcela com linha digitável e vencimento para conciliação.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Número da Parcela</Label>
                    <Input
                      type="number"
                      value={newInstNumber}
                      onChange={(e) => setNewInstNumber(parseInt(e.target.value || "1"))}
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Total de Parcelas</Label>
                    <Input
                      type="number"
                      value={newInstTotal}
                      onChange={(e) => setNewInstTotal(parseInt(e.target.value || "10"))}
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Vencimento</Label>
                    <Input
                      type="date"
                      value={newInstDueDate}
                      onChange={(e) => setNewInstDueDate(e.target.value)}
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Valor da Parcela (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(newInstAmountCents / 100).toFixed(2)}
                      onChange={(e) => setNewInstAmountCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Banco Emissor</Label>
                  <Input
                    value={newInstBankName}
                    onChange={(e) => setNewInstBankName(e.target.value)}
                    placeholder="Ex: Banco emissor"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Linha Digitável (47-48 dígitos)</Label>
                  <Input
                    value={newInstDigitableLine}
                    onChange={(e) => setNewInstDigitableLine(e.target.value.replace(/\D/g, ""))}
                    placeholder="Cole os números da linha digitável"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddInstallmentOpen(false)}
                  className="rounded-xl h-9 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!newInstDueDate || newInstAmountCents <= 0) {
                      toast.error("Informe a data de vencimento e o valor da parcela.");
                      return;
                    }
                    setFinancialInstallments((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        installment_number: newInstNumber,
                        total_installments: newInstTotal,
                        due_date: newInstDueDate,
                        amount_cents: newInstAmountCents,
                        digitable_line: newInstDigitableLine,
                        bank_name: newInstBankName,
                        status: "pending",
                      },
                    ]);
                    setIsAddInstallmentOpen(false);
                    toast.success("Parcela adicionada!");
                  }}
                  className="rounded-xl h-9 text-xs font-bold"
                >
                  Adicionar
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* ── MODAL / SHEET: CADASTRAR / EDITAR PASSAGEIRO ── */}
      <Sheet open={isPassengerSheetOpen} onOpenChange={setIsPassengerSheetOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6 overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b border-border/60">
            <SheetTitle className="text-sm font-bold text-foreground">
              {passengerForm.id ? "Editar Passageiro" : "Novo Passageiro"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Dados oficiais e controle de validade de passaporte/documento para embarque.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo (como no Documento) *</Label>
              <Input
                value={passengerForm.fullName}
                onChange={(e) => setPassengerForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Ex: Carlos Eduardo Silva"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Documento</Label>
                <Select
                  value={passengerForm.documentType}
                  onValueChange={(val) => setPassengerForm((p) => ({ ...p, documentType: val }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passaporte</SelectItem>
                    <SelectItem value="rg">RG</SelectItem>
                    <SelectItem value="cnh">CNH</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Número do Documento</Label>
                <Input
                  value={passengerForm.document}
                  onChange={(e) => setPassengerForm((p) => ({ ...p, document: e.target.value.toUpperCase() }))}
                  placeholder="Ex: FL938472 ou 12.345.678-9"
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Validade do Documento *</Label>
                <Input
                  type="date"
                  value={passengerForm.documentExpiry}
                  onChange={(e) => setPassengerForm((p) => ({ ...p, documentExpiry: e.target.value }))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nacionalidade</Label>
                <Input
                  value={passengerForm.nationality}
                  onChange={(e) => setPassengerForm((p) => ({ ...p, nationality: e.target.value }))}
                  placeholder="Ex: Brasileira"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={passengerForm.birthDate}
                  onChange={(e) => setPassengerForm((p) => ({ ...p, birthDate: e.target.value }))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assento</Label>
                <Input
                  value={passengerForm.seatNumber}
                  onChange={(e) => setPassengerForm((p) => ({ ...p, seatNumber: e.target.value.toUpperCase() }))}
                  placeholder="Ex: 14A"
                  className="h-9 text-xs rounded-xl font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">WhatsApp / Telefone</Label>
                <Input
                  value={passengerForm.phone}
                  onChange={(e) => setPassengerForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input
                  type="email"
                  value={passengerForm.email}
                  onChange={(e) => setPassengerForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@email.com"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isLeadCheck"
                checked={passengerForm.isLeadPassenger}
                onChange={(e) => setPassengerForm((p) => ({ ...p, isLeadPassenger: e.target.checked }))}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isLeadCheck" className="text-xs font-medium text-foreground cursor-pointer">
                Passageiro Titular / Responsável pela Reserva
              </label>
            </div>
          </div>

          <SheetFooter className="gap-2 sm:gap-2 pt-4 border-t border-border/60 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPassengerSheetOpen(false)}
              className="h-11 sm:h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={savePassengerMut.isPending || !passengerForm.fullName}
              onClick={() => savePassengerMut.mutate(passengerForm)}
              className="h-11 sm:h-9 px-5 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              {savePassengerMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              <span>Salvar Passageiro</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── MODAL / SHEET: ADICIONAR LOCALIZADOR ── */}
      <Sheet open={isAddLocatorOpen} onOpenChange={setIsAddLocatorOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6"
        >
          <SheetHeader className="pb-4 border-b border-border/60">
            <SheetTitle className="text-sm font-bold text-foreground">
              Cadastrar Localizador de Serviço
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Adicione códigos de reserva (PNR de voo, confirmação de hotel, etc.)
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4 text-xs">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Serviço *</Label>
                <Select
                  value={locatorForm.itemType}
                  onValueChange={(val: any) =>
                    setLocatorForm((prev) => ({ ...prev, itemType: val }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">Voo / Malha Aérea</SelectItem>
                    <SelectItem value="hotel">Hotel / Hospedagem</SelectItem>
                    <SelectItem value="transfer">Transfer / Receptivo</SelectItem>
                    <SelectItem value="tour">Passeio / Ingresso</SelectItem>
                    <SelectItem value="insurance">Seguro Viagem</SelectItem>
                    <SelectItem value="cruise">Cruzeiro Marítimo</SelectItem>
                    <SelectItem value="other">Outro Fornecedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(locatorForm.itemType as string) === "hotel" && (
                <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <Label className="text-[11px] font-bold text-primary flex items-center gap-1">
                    <Compass className="size-3" />
                    <span>Banco de Hotéis & Resorts Renomados (Preset Canônico)</span>
                  </Label>
                  <Select
                    onValueChange={(presetId) => {
                      const preset = FAMOUS_HOTEL_PRESETS.find((p) => p.id === presetId);
                      if (preset) {
                        setLocatorForm((prev) => ({
                          ...prev,
                          providerName: preset.name,
                          notes: `${preset.city}/${preset.state} · ${preset.regime_options[0] || "All Inclusive"} · ⭐ ${preset.stars} estrelas`,
                        }));
                        toast.success(`Dados de ${preset.name} carregados com sucesso!`);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                      <SelectValue placeholder="Selecione um resort pré-cadastrado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FAMOUS_HOTEL_PRESETS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Fornecedor / Cia *</Label>
                <Input
                  value={locatorForm.providerName}
                  onChange={(e) => setLocatorForm((prev) => ({ ...prev, providerName: e.target.value }))}
                  placeholder="Ex: LATAM, Gol, CVC, Hotel Fasano"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código Localizador / Reserva *</Label>
                <Input
                  value={locatorForm.locatorCode}
                  onChange={(e) => setLocatorForm((prev) => ({ ...prev, locatorCode: e.target.value.toUpperCase() }))}
                  placeholder="Ex: AB34XY ou 982341"
                  className="h-9 text-xs font-mono rounded-xl uppercase tracking-wider"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Observações / Detalhes</Label>
                <Input
                  value={locatorForm.notes}
                  onChange={(e) => setLocatorForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: Voo JJ3451 ou Quarto Vista Mar"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="gap-2 sm:gap-2 pt-4 border-t border-border/60 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddLocatorOpen(false)}
              className="h-11 sm:h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saveLocatorMutation.isPending || !locatorForm.providerName || !locatorForm.locatorCode}
              onClick={() => saveLocatorMutation.mutate(locatorForm)}
              className="h-11 sm:h-9 px-5 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              {saveLocatorMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              <span>Salvar Localizador</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── SHEET DE IMPORTAÇÃO DE VOUCHER DA OPERADORA COM OCR IA ── */}
      <OperatorVoucherImportSheet
        open={isImportVoucherOpen}
        onOpenChange={setIsImportVoucherOpen}
        tripId={trip.id}
        storeId={trip.store_id}
        onSuccess={async () => {
          const updated = await getTripAggregate({ data: { tripId: trip.id } }).catch(() => null);
          if (updated) setAggregate(updated);
        }}
      />
    </div>
  );
}
