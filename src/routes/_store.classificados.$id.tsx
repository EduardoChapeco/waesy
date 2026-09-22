import { createFileRoute, Link, useNavigate, isRedirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  AlertTriangle,
  ArrowLeft,
  Handshake,
  HeartHandshake,
  Loader2,
  Image as ImageIcon,
  Play,
  Maximize2,
  ExternalLink,
  Edit3,
  Truck,
  Package,
  CreditCard,
  QrCode,
  RefreshCw,
  Calendar,
  Users,
  Check,
  Download,
  FileArchive,
  DownloadCloud,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Wrench,
  Banknote,
  Utensils,
  Store as StoreIcon,
  Hotel,
  Building2,
  BookOpenCheck,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditorialShowcaseView } from "@/components/classifieds/editorial-showcase-view";
import { UniversalClassifiedShowcase } from "@/components/classifieds/universal-classified-showcase";
import { ConvenienceShowcaseView } from "@/components/classifieds/convenience-showcase-view";
import { ProductTelemetry } from "@/components/commerce/product-telemetry";
import { AiSdrChat } from "@/components/commerce/ai-sdr-chat";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime, formatDate } from "@/lib/datetime";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { ProtectedContactButton } from "@/components/common/protected-contact-button";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { getStoredLocation } from "@/components/location/location-master-pill";
import {
  getPublicClassifiedById,
  updateClassifiedStatus,
  deleteClassified,
  getDigitalDownloadSignedUrl,
  listClassifiedJobApplications,
} from "@/services/classifieds.functions";
import {
  getEducationLabel,
  getExperienceLabel,
  getRegimeLabel,
  getWorkplaceModelLabel,
} from "@/lib/classifieds/canonical-hiring";
import { createDealProposal, getClassifiedBookedDates } from "@/services/deals.functions";
import { getProfile } from "@/services/auth.functions";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";
import {
  resolveClassifiedNiche,
  getSemanticBadges,
  getSemanticCondition,
  getClassifiedFeatureCards,
  getClassifiedPaymentMethods,
} from "@/lib/classifieds/semantics";
import {
  CANONICAL_TRANSFER_VEHICLES,
  DEPARTURE_STATUS_CONFIG,
  type DepartureOption,
} from "@/lib/classifieds/canonical-airports";
import { cn } from "@/lib/utils";
import {
  DigitalCompanionCard,
  type DigitalCompanionCardProps,
  type CompanionCardNiche,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
} from "@/components/documents/digital-companion-card";

export const Route = createFileRoute("/_store/classificados/$id")({
  head: ({
    loaderData,
  }: {
 loaderData?: { classified: any; isOwner: boolean; canManage: boolean; viewerContext: string };
 }) => {
 const classified = loaderData?.classified;
 const cover = classified?.images?.[0] || "";
 const title = classified?.title ? `${classified.title} | Classificados Waesy` : "Classificado | Waesy";
 const description = classified?.content?.slice(0, 160) || "Anúncio comunitário na plataforma Waesy.";
 const canonicalUrl = classified?.id ? `https://waesy.com.br/classificados/${classified.id}` : "https://waesy.com.br/classificados";

 // JSON-LD: Product ou LocalBusiness conforme categoria
 const isService = ["service", "job"].includes(classified?.category);
 const priceCents = Number(classified?.price_cents || 0);
 const jsonLd = classified ? JSON.stringify(
   isService
     ? {
         "@context": "https://schema.org",
         "@type": "Service",
         name: classified.title,
         description: classified.content?.slice(0, 300),
         image: cover || undefined,
         url: canonicalUrl,
         provider: {
           "@type": "Person",
           name: classified.profiles?.full_name || "Anunciante Waesy",
         },
         areaServed: classified.city || classified.location_name || "Brasil",
       }
     : {
         "@context": "https://schema.org",
         "@type": "Product",
         name: classified.title,
         description: classified.content?.slice(0, 300),
         image: cover ? [cover] : undefined,
         url: canonicalUrl,
         offers: {
           "@type": "Offer",
           priceCurrency: "BRL",
           price: priceCents > 0 ? (priceCents / 100).toFixed(2) : undefined,
           availability: classified.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
           url: canonicalUrl,
         },
         brand: classified.store_name
           ? { "@type": "Brand", name: classified.store_name }
           : undefined,
       }
 ) : null;

 return {
 meta: [
   { title },
   { name: "description", content: description },
   // Open Graph
   { property: "og:title", content: classified?.title || "Classificado Waesy" },
   { property: "og:description", content: description },
   { property: "og:image", content: cover },
   { property: "og:type", content: "website" },
   { property: "og:url", content: canonicalUrl },
   { property: "og:locale", content: "pt_BR" },
   { property: "og:site_name", content: "Waesy" },
   // Twitter Cards
   { name: "twitter:card", content: cover ? "summary_large_image" : "summary" },
   { name: "twitter:title", content: classified?.title || "Classificado Waesy" },
   { name: "twitter:description", content: description },
   { name: "twitter:image", content: cover },
 ],
 links: canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : [],
 scripts: jsonLd ? [{ type: "application/ld+json", children: jsonLd }] : [],
 };
 },

 loader: async ({
 params,
 }): Promise<{ classified: any; isOwner: boolean; canManage: boolean; viewerContext: string; currentProfile: any }> => {
 const [result, profileRes] = await Promise.all([
 getPublicClassifiedById({ data: params.id }).catch(() => null),
 getProfile().catch(() => null),
 ]);
 return {
 classified: result?.classified || null,
 isOwner: result?.isOwner || false,
 canManage: result?.canManage || false,
 viewerContext: result?.viewerContext || "anonymous",
 currentProfile: profileRes || null,
 };
 },
 component: ClassifiedDetailPage,
 errorComponent: ClassifiedDetailError,
});

function ClassifiedDetailError({ error }: { error: Error }) {
  if (isRedirect(error)) {
    throw error;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
        <Tag className="size-8 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-foreground">Anúncio Indisponível</h1>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        Não foi possível carregar os dados deste anúncio no momento. Tente novamente em instantes.
      </p>
      {/* [REQ-18] Erro técnico transparente para diagnóstico - padrão BigTech / No-Blackbox Mandate */}
      {error?.message && error.message !== "" && (
        <details className="mx-auto max-w-md text-left">
          <summary className="cursor-pointer text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            Detalhes técnicos
          </summary>
          <pre className="mt-2 rounded-xl bg-muted/50 border border-border/50 p-3 text-[10px] text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap break-all">
            {error.message}
          </pre>
        </details>
      )}
      <div className="pt-2 flex items-center justify-center gap-3">
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/classificados">
            <ArrowLeft className="size-4 mr-1.5" />
            <span>Voltar aos Classificados</span>
          </Link>
        </Button>
        <Button variant="ghost" className="rounded-xl text-xs" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  sale: "Desapego",
  vehicle: "Veículo",
  real_estate: "Imóvel",
  service: "Serviço",
  job: "Vagas",
  trade: "Troca",
  donation: "Doações",
  subscription: "Assinatura",
  digital: "Digital",
  equipment: "Equipamentos",
  travel: "Viagens",
  hospitality: "Hospedagem",
  food: "Gastronomia",
  agri: "Agro",
  business: "Negócios",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "Novo",
  used: "Usado",
  refurbished: "Revisado",
};

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; dotClass: string }
> = {
  active: { label: "Ativo", variant: "secondary", dotClass: "bg-emerald-500" },
  published: { label: "Ativo", variant: "secondary", dotClass: "bg-emerald-500" },
  paused: { label: "Pausado", variant: "secondary", dotClass: "bg-amber-500" },
  reserved: { label: "Reservado", variant: "secondary", dotClass: "bg-blue-500" },
  completed: { label: "Concluído", variant: "outline", dotClass: "bg-muted-foreground" },
  archived: { label: "Arquivado", variant: "outline", dotClass: "bg-destructive" },
};

function isVideoUrl(url?: string | null): boolean {
 if (!url) return false;
 const clean = url.split("?")[0].toLowerCase();
 return (
 clean.endsWith(".mp4") ||
 clean.endsWith(".webm") ||
 clean.endsWith(".mov") ||
 clean.includes("video")
 );
}

function formatBookingCompanions(companions: any[]) {
  if (!Array.isArray(companions) || companions.length === 0) return null;
  return companions.map((c) => ({
    full_name: c.fullName || c.name || "",
    document: c.document || "",
    email: c.email || "",
    phone: c.phone || "",
  }));
}

function ClassifiedDetailPage() {
 const navigate = useNavigate();
 const queryClient = useQueryClient();
 const { classified, isOwner, canManage, viewerContext, currentProfile } = ((Route.useLoaderData?.() as any) || {});

  const effectiveIsOwner = Boolean(
    isOwner ||
    canManage ||
    (currentProfile?.id && classified?.author_profile_id === currentProfile.id)
  );

 const [activeImage, setActiveImage] = useState(0);
 const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
 const [companionModalOpen, setCompanionModalOpen] = useState(false);

 // Proposal Dialog State
 const [proposalOpen, setProposalOpen] = useState(false);
 const [proposalPriceCents, setProposalPriceCents] = useState<number | undefined>(
 classified?.price_cents || undefined,
 );
 const [proposalPaymentMethod, setProposalPaymentMethod] = useState<string>("pix");
 const [proposalInstallments, setProposalInstallments] = useState("1");
 const [proposalDepositCents, setProposalDepositCents] = useState<number | undefined>(undefined);
 const [proposalTerms, setProposalTerms] = useState("");
 const [isSendingProposal, setIsSendingProposal] = useState(false);
 // Perguntas customizadas configuradas pelo lojista
 const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

 // Direct Booking State (Hospedagem / Temporada / Diárias & Pacotes de Viagem)
 const [bookingOpen, setBookingOpen] = useState(false);
 const [checkInDate, setCheckInDate] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 1);
 return d.toISOString().split("T")[0];
 });
 const [checkOutDate, setCheckOutDate] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 4);
 return d.toISOString().split("T")[0];
 });
 const [bookingGuests, setBookingGuests] = useState(1);
 const [isBooking, setIsBooking] = useState(false);
 const [isBuyingDirect, setIsBuyingDirect] = useState(false);

  // Consulta datas já reservadas para este anúncio no banco de dados (Camadas 1, 2 e 6)
  const { data: bookedDates = [] } = useQuery({
    queryKey: ["classified-booked-dates", classified?.id],
    queryFn: () => getClassifiedBookedDates({ data: { classifiedId: classified.id } }),
    enabled: Boolean(classified?.id),
  });

  const isDateRangeOverlapping = useMemo(() => {
    if (!checkInDate || !checkOutDate || !bookedDates || bookedDates.length === 0) return false;
    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    return bookedDates.some((b: any) => {
      if (!b.startDate || !b.endDate) return false;
      const bStart = new Date(b.startDate).getTime();
      const bEnd = new Date(b.endDate).getTime();
      return start <= bEnd && end >= bStart;
    });
  }, [checkInDate, checkOutDate, bookedDates]);

  // Travel Package Specific Booking State
  const [selectedDeparture, setSelectedDeparture] = useState<DepartureOption | null>(null);
  const [travelPassengers, setTravelPassengers] = useState(1);
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState<string>("");

  // Service Booking State
  const [serviceBookingOpen, setServiceBookingOpen] = useState(false);
  const [serviceDate, setServiceDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [serviceTime, setServiceTime] = useState("09:00");
  const [serviceLocationType, setServiceLocationType] = useState<"presencial" | "domicilio" | "remoto">("presencial");
  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [isBookingService, setIsBookingService] = useState(false);

  const handleBookService = async () => {
    if (!serviceDate || !serviceTime) {
      toast.error("Por favor, selecione a data e o horário desejado.");
      return;
    }

    setIsBookingService(true);
    try {
      const scheduledDateTime = new Date(`${serviceDate}T${serviceTime}:00`).toISOString();
      await createDealProposal({
        data: {
          classifiedId: classified.id,
          sellerId: classified.author_profile_id,
          proposedPriceCents: classified.price_cents || 0,
          dealType: "service",
          startDate: scheduledDateTime,
          terms: `Agendamento de Serviço: ${classified.title}\nData: ${serviceDate} às ${serviceTime}\nModalidade: ${serviceLocationType === "domicilio" ? "A Domicílio" : serviceLocationType === "remoto" ? "Remoto / Online" : "No Estabelecimento do Prestador"}${serviceAddress ? `\nEndereço: ${serviceAddress}` : ""}${serviceNotes ? `\nObservações: ${serviceNotes}` : ""}`,
        },
      });

      toast.success("Solicitação de agendamento enviada com sucesso! O prestador foi notificado.");
      setServiceBookingOpen(false);
      navigate({ to: "/conta/negociacoes" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar agendamento.");
    } finally {
      setIsBookingService(false);
    }
  };

 // Job Candidacy State (BigTech Executive Standard)
 const [applyModalOpen, setApplyModalOpen] = useState(false);
 const [applyTab, setApplyTab] = useState<"perfil_waesy" | "upload_cv" | "whatsapp">("perfil_waesy");
 const [coverNote, setCoverNote] = useState("");
 const [candidateName, setCandidateName] = useState(currentProfile?.fullName || currentProfile?.full_name || "");
 const [candidateEmail, setCandidateEmail] = useState(currentProfile?.email || "");
 const [candidatePhone, setCandidatePhone] = useState(currentProfile?.phone || "");
 const [candidateEducation, setCandidateEducation] = useState("superior_completo");
 const [candidateExperience, setCandidateExperience] = useState("1_a_2_anos");
 const [candidateRole, setCandidateRole] = useState(currentProfile?.occupation || "");
 const [cvFileUrl, setCvFileUrl] = useState("");
 const [isSubmittingApp, setIsSubmittingApp] = useState(false);
 const [candidatesListOpen, setCandidatesListOpen] = useState(false);
 const [candidatesList, setCandidatesList] = useState<any[]>([]);
 const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

 const nightsCount = useMemo(() => {
 if (!checkInDate || !checkOutDate) return 1;
 const start = new Date(checkInDate).getTime();
 const end = new Date(checkOutDate).getTime();
 const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
 return diff > 0 ? diff : 1;
 }, [checkInDate, checkOutDate]);

 const cleaningFeeCents = classified?.cleaning_fee_cents || 0;
 const dailyRateCents = classified?.price_cents || 0;
 const bookingTotalCents = dailyRateCents * nightsCount + cleaningFeeCents;

  // Cálculos Derivados para Pacote de Viagem / Excursão / Turismo
  const isTravelPackage =
    classified?.category === "travel" ||
    classified?.category === "viagem" ||
    classified?.category === "tourism" ||
    classified?.attributes?.niche === "viagem" ||
    classified?.attributes?.niche === "travel" ||
    classified?.attributes?.template_style === "editorial" ||
    classified?.attributes?.template_style === "instagram_resort";

  const departureOptions: DepartureOption[] = Array.isArray(classified?.attributes?.departure_options)
    ? classified.attributes.departure_options
    : [];

  const flightDetails = classified?.attributes?.flight_details || null;
  const boardingGateways: string[] = Array.isArray(flightDetails?.boarding_gateways)
    ? flightDetails.boarding_gateways
    : [];

  const effectiveTravelUnitPriceCents = (selectedDeparture?.price_override_cents && selectedDeparture.price_override_cents > 0)
    ? selectedDeparture.price_override_cents
    : (classified?.price_cents || 0);

  const travelPricingMode = classified?.attributes?.pricing_mode || classified?.attributes?.travel?.pricing_mode || "total_package";
  const isPerPerson = travelPricingMode === "per_person";

  const travelTotalCents = isPerPerson ? effectiveTravelUnitPriceCents * travelPassengers : effectiveTravelUnitPriceCents;
  const maxInstallments = Math.max(1, Number(classified?.attributes?.max_installments) || 12);
  const travelInstallmentCents = Math.round(travelTotalCents / maxInstallments);

 // Status Mutation
 const statusMutation = useMutation({
 mutationFn: updateClassifiedStatus,
 onSuccess: () => {
 queryClient.invalidateQueries();
 navigate({ reloadDocument: true });
 },
 });

 // Delete Mutation
 const deleteMutation = useMutation({
 mutationFn: deleteClassified,
 onSuccess: () => {
 queryClient.invalidateQueries();
 navigate({ to: "/conta/classificados" });
 },
 });

 const handleStatusChange = async (newStatus: string) => {
 if (!classified) return;
 await statusMutation.mutateAsync({
 data: {
 id: classified.id,
 status: newStatus as any,
 },
 });
 };

 const handleDelete = async () => {
 if (!classified) return;
 await deleteMutation.mutateAsync({ data: classified.id });
 };

 const handleSendProposal = async () => {
 if (!classified) return;
 const priceCents = proposalPriceCents ?? classified.price_cents ?? 0;

 if (!priceCents || priceCents <= 0) {
 toast.error("Informe um valor válido para a proposta.");
 return;
 }

 const depositCents = proposalDepositCents ?? 0;
 const installments = parseInt(proposalInstallments) || 1;

    // Validação de campos obrigatórios configurados pela Empresa
    const customFields: any[] = classified?.store?.custom_inquiry_fields || [];
    for (const field of customFields) {
      if (field.required) {
        const val = customAnswers[field.id];
        if (val === undefined || val === null || val === "" || (field.type === "checkbox" && !val)) {
          toast.error(`Por favor, responda o campo obrigatório: "${field.label}"`);
          return;
        }
      }
    }

    let formattedCustomFields = "";
    if (customFields.length > 0) {
      const answered = customFields
        .map((f: any) => {
          const ans = customAnswers[f.id];
          if (ans === undefined || ans === "" || ans === null) return null;
          if (f.type === "checkbox") return `• ${f.label}: ${ans ? "Sim" : "Não"}`;
          return `• ${f.label}: ${ans}`;
        })
        .filter(Boolean);
      if (answered.length > 0) {
        formattedCustomFields = `\n\n[Respostas Personalizadas Solicitadas]\n${answered.join("\n")}`;
      }
    }

    const paymentMethodLabel =
      proposalPaymentMethod === "pix"
        ? "PIX à vista"
        : proposalPaymentMethod === "cartao_credito"
        ? `Cartão de Crédito em ${installments}x`
        : proposalPaymentMethod === "boleto"
        ? "Boleto à vista"
        : proposalPaymentMethod === "boleto_parcelado"
        ? `Boleto Parcelado em ${installments}x`
        : proposalPaymentMethod === "carne_digital"
        ? `Carnê Digital da Loja em ${installments}x`
        : proposalPaymentMethod === "dinheiro"
        ? "Dinheiro em espécie"
        : proposalPaymentMethod === "permuta"
        ? "Permuta / Troca"
        : "Financiamento Bancário";

    const finalTerms = (
      `[Forma de Pagamento: ${paymentMethodLabel}${depositCents > 0 ? ` com entrada de ${formatMoney(depositCents)}` : ""}]\n` +
      proposalTerms.trim() +
      formattedCustomFields
    ).trim();

 setIsSendingProposal(true);
 try {
 await createDealProposal({
 data: {
 classifiedId: classified.id,
 sellerId: classified.author_profile_id,
 proposedPriceCents: priceCents,
 depositCents,
 installmentsCount: installments,
 dealType: classified.category === "real_estate" ? "rental" : "sale",
 terms: finalTerms || undefined,
 },
 });

 toast.success("Proposta enviada ao vendedor! Acompanhe em Minhas Negociações.");
 setProposalOpen(false);
 navigate({ to: "/conta/negociacoes" });
 } catch (err: any) {
 console.error("Erro ao enviar proposta:", err);
 toast.error(err?.message || "Erro ao enviar proposta. Verifique se você está autenticado.");
 } finally {
 setIsSendingProposal(false);
 }
 };

  const handleDirectBooking = async () => {
    if (!classified) return;
    setIsBooking(true);
    try {
      if (isTravelPackage) {
        const depDate = selectedDeparture?.departure_date || "";
        const retDate = selectedDeparture?.return_date || "";
        const depTime = selectedDeparture?.departure_time ? ` às ${selectedDeparture.departure_time}` : "";
        const boarding = selectedBoardingPoint || flightDetails?.meeting_point || (boardingGateways[0] || "A combinar com a agência");

        await createDealProposal({
          data: {
            classifiedId: classified.id,
            sellerId: classified.author_profile_id,
            proposedPriceCents: travelTotalCents,
            totalPriceCents: travelTotalCents,
            guestsCount: travelPassengers,
            dealType: "travel",
            startDate: depDate || undefined,
            endDate: retDate || undefined,
            isDirectBooking: true,
            terms: `Reserva de Pacote de Viagem: ${classified.title}\nSaída: ${selectedDeparture?.label || "Saída Confirmada"}${depDate ? ` (${depDate}${retDate ? ` até ${retDate}` : ""}${depTime})` : ""}\nLocal de Embarque: ${boarding}\nViajantes: ${travelPassengers} passageiro(s)\nValor por pessoa: ${formatMoney(effectiveTravelUnitPriceCents)}\nTotal: ${formatMoney(travelTotalCents)}`,
          },
        });

        toast.success("Solicitação de reserva de pacote enviada com sucesso! O operador foi notificado.");
      } else {
        if (isDateRangeOverlapping) {
          toast.error("O intervalo de datas selecionado coincide com uma reserva já confirmada.");
          setIsBooking(false);
          return;
        }

        await createDealProposal({
          data: {
            classifiedId: classified.id,
            sellerId: classified.author_profile_id,
            proposedPriceCents: bookingTotalCents,
            totalPriceCents: bookingTotalCents,
            dailyRateCents,
            cleaningFeeCents,
            nightsCount,
            guestsCount: bookingGuests,
            dealType: "rental",
            startDate: checkInDate,
            endDate: checkOutDate,
            isDirectBooking: true,
            terms: `Reserva direta de ${nightsCount} diárias (${checkInDate} a ${checkOutDate}) para ${bookingGuests} hóspede(s).`,
          },
        });

        toast.success("Reserva confirmada! Acompanhe em Minhas Negociações e na sua Agenda.");
      }
      setBookingOpen(false);
      navigate({ to: "/conta/negociacoes" });
    } catch (err: any) {
      console.error("Erro ao reservar:", err);
      toast.error(err?.message || "Erro ao efetuar reserva.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleDirectBuy = async () => {
    if (!classified) return;
    if (viewerContext === "anonymous") {
      toast.info("Identifique-se para continuar a compra com segurança.");
      navigate({
        to: "/entrar",
        search: { returnUrl: `/classificados/${classified.id}` },
      });
      return;
    }
    setIsBuyingDirect(true);
    try {
      const deal = await createDealProposal({
        data: {
          classifiedId: classified.id,
          sellerId: classified.author_profile_id,
          proposedPriceCents: classified.price_cents || 0,
          totalPriceCents: classified.price_cents || 0,
          dealType: classified.category === "real_estate" ? "rental" : "sale",
          isDirectBooking: true,
          terms: "Compra direta pelo valor integral anunciado.",
        },
      });

      toast.success("Compra iniciada! Acompanhe o pedido em Minhas Negociações.");
      navigate({ to: "/conta/negociacoes" });
    } catch (err: any) {
      console.error("Erro ao comprar direto:", err);
      toast.error(err?.message || "Erro ao processar compra.");
    } finally {
      setIsBuyingDirect(false);
    }
  };

const [isDownloadingDigital, setIsDownloadingDigital] = useState(false);

const handleDownloadDigitalFile = async () => {
  if (!classified) return;
  setIsDownloadingDigital(true);
  try {
    const res = await getDigitalDownloadSignedUrl({
      data: { classifiedId: classified.id },
    });
    if (res?.downloadUrl) {
      window.open(res.downloadUrl, "_blank");
      toast.success(`Download de "${res.fileName}" liberado com sucesso!`);
    } else {
      toast.error("Link de download não disponível no momento.");
    }
  } catch (err: any) {
    console.error("Erro ao baixar arquivo:", err);
    toast.error(err?.message || "Falha ao gerar link de download.");
  } finally {
    setIsDownloadingDigital(false);
  }
};

  const niche = useMemo(() => (classified ? resolveClassifiedNiche(classified) : ({} as any)), [classified]);
  const semanticBadges = useMemo(() => (classified ? getSemanticBadges(classified) : []), [classified]);
  const semanticCondition = useMemo(() => (classified ? getSemanticCondition(classified) : null), [classified]);
  const featureCards = useMemo(() => (classified ? getClassifiedFeatureCards(classified) : []), [classified]);
  const paymentMethods = useMemo(() => (classified ? getClassifiedPaymentMethods(classified) : []), [classified]);

 if (!classified) {
 return (
 <div className="mx-auto max-w-4xl px-4 py-16 text-center">
 <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
 <Tag className="size-8" />
 </div>
 <h1 className="text-2xl font-bold text-foreground">Anúncio não encontrado</h1>
 <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
 Este anúncio pode ter sido pausado, vendido ou encerrado pelo proprietário.
 </p>
 <div className="mt-6 flex items-center justify-center gap-3">
 <Button asChild variant="outline" className="rounded-xl">
 <Link to="/mercado">
 <ArrowLeft className="size-4 mr-2" />
 Voltar ao Mercado
 </Link>
 </Button>
 </div>
 </div>
 );
 }

  const images: string[] =
    (Array.isArray(classified.images) && classified.images.length > 0 ? classified.images : null) ||
    (Array.isArray(classified.media) && classified.media.length > 0 ? classified.media : null) ||
    (Array.isArray(classified.media_urls) && classified.media_urls.length > 0 ? classified.media_urls : null) ||
    [];

 const rawPhone = classified.contact_whatsapp || classified.whatsapp;
 const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, "") : null;
 // whatsappUrl: removido — usamos trackAndOpenWhatsApp para rastreamento real de conversões
 const author = classified.profiles as any;
 const authorInitial = author?.full_name?.charAt(0)?.toUpperCase() ?? "J";
 const statusInfo = STATUS_LABELS[classified.status] || {
 label: classified.status,
 variant: "outline",
 };

  const renderBookingDialog = () => (
    <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
      <DialogContent className="sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {viewerContext === "anonymous" ? (
          <div className="text-center py-6 space-y-4">
            <Calendar className="size-10 text-primary mx-auto" />
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                Identifique-se para reservar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Para solicitar sua reserva com garantias e acompanhamento oficial, faça login na sua conta Waesy.
              </DialogDescription>
            </div>
            <Button
              asChild
              className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground text-sm"
            >
              <Link
                to="/entrar"
                search={{ returnUrl: `/classificados/${classified.id}` }}
              >
                Entrar na Minha Conta
              </Link>
            </Button>
          </div>
        ) : isTravelPackage ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/25 bg-primary/10">
                  Reserva de Pacote
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                <span>Reservar Pacote de Viagem</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecione a data de saída confirmada, o ponto de embarque e a quantidade de passageiros.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Seleção de Saída Confirmada */}
              {departureOptions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Opções de Saída Disponíveis *</span>
                    <span className="text-[11px] font-mono text-muted-foreground font-normal">
                      {departureOptions.length} confirmada(s)
                    </span>
                  </label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {departureOptions.map((opt, i) => {
                      const cfg = DEPARTURE_STATUS_CONFIG[opt.status] || DEPARTURE_STATUS_CONFIG.confirmed;
                      const depDate = opt.departure_date ? new Date(opt.departure_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
                      const retDate = opt.return_date ? new Date(opt.return_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
                      const isSelected = selectedDeparture ? selectedDeparture.id === opt.id : i === 0;
                      return (
                        <div
                          key={opt.id || i}
                          onClick={() => setSelectedDeparture(opt)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5",
                            isSelected
                              ? "border-primary ring-2 ring-primary/25 bg-primary/5"
                              : "border-border/70 hover:border-primary/40 bg-card"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground">
                                {opt.label || `Opção ${i + 1}`}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded-full">
                                  ✓ Selecionada
                                </span>
                              )}
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.color)}>
                                {cfg.icon} {cfg.label}
                              </span>
                            </div>
                            {opt.price_override_cents && opt.price_override_cents > 0 ? (
                              <span className="font-mono font-bold text-xs text-foreground">
                                {formatMoney(opt.price_override_cents)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {depDate}{depDate && retDate && " — "}{retDate}
                            {opt.departure_time && <span className="font-mono ml-1 font-semibold text-foreground">• Embarque: {opt.departure_time}</span>}
                          </p>
                          {opt.available_seats !== undefined && opt.available_seats > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {opt.available_seats} vagas restantes
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ponto de Embarque */}
              {(boardingGateways.length > 0 || flightDetails?.meeting_point) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    <span>Local de Embarque / Ponto de Encontro *</span>
                  </label>
                  {boardingGateways.length > 0 ? (
                    <select
                      value={selectedBoardingPoint || boardingGateways[0]}
                      onChange={(e) => setSelectedBoardingPoint(e.target.value)}
                      className="w-full h-10 rounded-xl text-xs bg-background border border-border px-3 font-medium text-foreground"
                    >
                      {boardingGateways.map((gw, idx) => (
                        <option key={idx} value={gw}>
                          {gw}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={selectedBoardingPoint}
                      onChange={(e) => setSelectedBoardingPoint(e.target.value)}
                      placeholder={flightDetails?.meeting_point || "Informe a cidade ou ponto de embarque..."}
                      className="h-10 rounded-xl text-xs bg-background"
                    />
                  )}
                </div>
              )}

              {/* Quantidade de Viajantes / Passageiros */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-primary" />
                    <span>Número de Viajantes (Passageiros)</span>
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {travelPassengers} {travelPassengers === 1 ? "passageiro" : "passageiros"}
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={selectedDeparture?.available_seats || 10}
                    value={travelPassengers}
                    onChange={(e) => setTravelPassengers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10 rounded-xl text-xs bg-background font-mono w-28 text-center font-bold"
                  />
                  <div className="text-xs text-muted-foreground flex-1">
                    {selectedDeparture?.available_seats ? (
                      <span>Até {selectedDeparture.available_seats} assentos disponíveis nesta saída</span>
                    ) : (
                      <span>Vagas limitadas por ordem de confirmação</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumo Financeiro Transparente */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-2 text-xs">
                {isPerPerson ? (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Valor por pessoa</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatMoney(effectiveTravelUnitPriceCents)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Viajantes</span>
                      <span className="font-mono font-medium text-foreground">
                        × {travelPassengers}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Valor Base do Pacote</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatMoney(effectiveTravelUnitPriceCents)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Viajantes Inclusos</span>
                      <span className="font-mono font-medium text-foreground">
                        {travelPassengers} {travelPassengers === 1 ? "passageiro" : "passageiros"}
                      </span>
                    </div>
                  </>
                )}
                <div className="pt-2 border-t border-border/40 flex justify-between items-baseline font-bold text-sm text-foreground">
                  <div>
                    <span>Total do Pacote</span>
                    {maxInstallments > 1 && (
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        em até {maxInstallments}x de {formatMoney(travelInstallmentCents)}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-primary text-base font-extrabold">
                    {formatMoney(travelTotalCents)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleDirectBooking}
                disabled={isBooking}
                className="w-full h-12 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Enviando Solicitação de Reserva...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>Confirmar Reserva — {formatMoney(travelTotalCents)}</span>
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                Reservar Hospedagem por Diária
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecione as datas de check-in e check-out para confirmar sua estadia.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Check-in *
                  </label>
                  <Input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-background font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Check-out *
                  </label>
                  <Input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Número de Hóspedes
                </label>
                <Input
                  type="number"
                  min={1}
                  max={classified.max_guests || 10}
                  value={bookingGuests}
                  onChange={(e) => setBookingGuests(parseInt(e.target.value) || 1)}
                  className="h-10 rounded-xl text-xs bg-background font-mono"
                />
              </div>

              {/* Alerta de conflito de datas */}
              {bookedDates.length > 0 && (
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-[11px] space-y-1">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-amber-500 shrink-0" />
                    Datas já reservadas neste anúncio:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {bookedDates.slice(0, 4).map((b: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
                        {b.startDate} a {b.endDate}
                      </span>
                    ))}
                    {bookedDates.length > 4 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{bookedDates.length - 4} período(s)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isDateRangeOverlapping && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>As datas selecionadas coincidem com uma reserva já confirmada. Por favor, escolha outro período.</span>
                </div>
              )}

              {/* Resumo de Valores */}
              <div className="p-3.5 rounded-xl bg-muted/40 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {formatMoney(dailyRateCents)} × {nightsCount} diária(s)
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {formatMoney(dailyRateCents * nightsCount)}
                  </span>
                </div>
                {cleaningFeeCents > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa única de limpeza</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatMoney(cleaningFeeCents)}
                    </span>
                  </div>
                )}
                <div className="pt-2 flex justify-between font-bold text-sm text-foreground">
                  <span>Total Estimado</span>
                  <span className="font-mono text-primary">
                    {formatMoney(bookingTotalCents)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleDirectBooking}
                disabled={isBooking || isDateRangeOverlapping}
                className={`w-full h-11 rounded-xl text-xs font-bold gap-2 ${
                  isDateRangeOverlapping ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {isBooking ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Confirmando Reserva...</span>
                  </>
                ) : isDateRangeOverlapping ? (
                  <span>Período Indisponível (Já Reservado)</span>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>Confirmar Reserva de {formatMoney(bookingTotalCents)}</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  const renderProposalDialog = () => (
    <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {viewerContext === "anonymous" ? (
          <div className="text-center py-6 space-y-4">
            <Handshake className="size-10 text-primary mx-auto" />
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                Identifique-se para negociar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Para enviar propostas, negociar valores e trocar itens com segurança,
                faça login na sua conta Waesy.
              </DialogDescription>
            </div>
            <Button
              asChild
              className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground text-sm"
            >
              <Link
                to="/entrar"
                search={{ returnUrl: `/classificados/${classified.id}` }}
              >
                Entrar na Minha Conta
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Handshake className="size-5 text-primary" />
                Enviar Proposta de Negociação
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Envie uma oferta formal para o anunciante. O valor e os termos ficarão
                registrados com segurança.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Sua Oferta de Preço (R$) *
                </label>
                <CurrencyField
                  value={proposalPriceCents}
                  onChange={setProposalPriceCents}
                  placeholder="0,00"
                  className="h-10 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Meio de Pagamento Desejado *</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Condições aceitas pelo anúncio</span>
                  </label>
                  <Select value={proposalPaymentMethod} onValueChange={setProposalPaymentMethod}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
                      <SelectValue placeholder="Selecione o meio de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">
                        PIX à Vista {classified?.attributes?.pix_discount_percent ? `(${classified.attributes.pix_discount_percent}% de desconto)` : ""}
                      </SelectItem>
                      <SelectItem value="cartao_credito">
                        Cartão de Crédito (até {classified?.attributes?.max_installments || 12}x)
                      </SelectItem>
                      <SelectItem value="boleto">
                        Boleto Bancário à Vista
                      </SelectItem>
                      <SelectItem value="boleto_parcelado">
                        Boleto Parcelado Direto (até {classified?.attributes?.max_boleto_installments || 12}x)
                      </SelectItem>
                      <SelectItem value="carne_digital">
                        Carnê Digital da Loja / Crediário (até {classified?.attributes?.max_carne_installments || 12}x)
                      </SelectItem>
                      <SelectItem value="dinheiro">
                        Dinheiro em Espécie (na entrega / retirada)
                      </SelectItem>
                      <SelectItem value="permuta">
                        Permuta / Troca por outro item
                      </SelectItem>
                      <SelectItem value="financiamento">
                        Financiamento Bancário / Consórcio
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-campos de Parcelamento e Entrada */}
                {(proposalPaymentMethod === "cartao_credito" || proposalPaymentMethod === "carne_digital" || proposalPaymentMethod === "boleto_parcelado") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Número de Parcelas
                      </label>
                      <Select
                        value={proposalInstallments}
                        onValueChange={setProposalInstallments}
                      >
                        <SelectTrigger className="h-9 rounded-xl text-xs bg-background font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            {
                              length: proposalPaymentMethod === "carne_digital"
                                ? (Number(classified?.attributes?.max_carne_installments) || 12)
                                : proposalPaymentMethod === "boleto_parcelado"
                                ? (Number(classified?.attributes?.max_boleto_installments) || 12)
                                : (Number(classified?.attributes?.max_installments) || 12)
                            },
                            (_, i) => i + 1
                          ).map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}x {proposalPriceCents && proposalPriceCents > 0 ? `de ${formatMoney(Math.round(Math.max(0, proposalPriceCents - (proposalDepositCents || 0)) / n))}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Sinal / Entrada (R$)
                      </label>
                      <CurrencyField
                        value={proposalDepositCents}
                        onChange={setProposalDepositCents}
                        placeholder="0,00"
                        className="h-9 rounded-xl text-xs bg-background"
                      />
                    </div>
                  </div>
                )}

                {proposalPaymentMethod === "carne_digital" && (
                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground/80 flex items-start gap-2">
                    <BookOpenCheck className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Ao aprovar esta proposta, o vendedor poderá emitir seu <strong>Carnê Digital</strong> oficial. Você acompanhará os boletos, datas e comprovantes em <strong>Minha Conta &gt; Carnês</strong>.
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Termos ou Condições Especiais
                </label>
                <Textarea
                  value={proposalTerms}
                  onChange={(e) => setProposalTerms(e.target.value)}
                  placeholder="Ex: Retiro no sábado, parcelamento combinado..."
                  rows={3}
                  className="rounded-xl text-xs bg-background resize-none leading-relaxed"
                />
              </div>

              {/* Perguntas Personalizadas configuradas pela Empresa/Vendedor */}
              {classified?.store?.custom_inquiry_fields && classified.store.custom_inquiry_fields.length > 0 && (
                <div className="space-y-3 pt-2.5 pb-1 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Perguntas Adicionais do Vendedor
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-medium">
                      Personalizado pela loja
                    </span>
                  </div>
                  {classified.store.custom_inquiry_fields.map((field: any) => (
                    <div key={field.id} className="space-y-1">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <span>{field.label}</span>
                        {field.required && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <Textarea
                          value={customAnswers[field.id] || ""}
                          onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder="Sua resposta..."
                          rows={2}
                          className="rounded-xl text-xs bg-background resize-none leading-relaxed"
                        />
                      ) : field.type === "checkbox" ? (
                        <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                          <input
                            type="checkbox"
                            checked={!!customAnswers[field.id]}
                            onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.checked }))}
                            className="size-4 rounded accent-primary"
                          />
                          <span className="text-xs text-muted-foreground">{field.label}</span>
                        </label>
                      ) : (
                        <Input
                          type="text"
                          value={customAnswers[field.id] || ""}
                          onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder="Sua resposta..."
                          className="h-9 rounded-xl text-xs bg-background"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleSendProposal}
                disabled={isSendingProposal}
                className="w-full h-10 rounded-xl text-xs font-bold gap-2"
              >
                {isSendingProposal ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Enviando Proposta...</span>
                  </>
                ) : (
                  <>
                    <Handshake className="size-4" />
                    <span>Confirmar e Enviar Proposta</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  const renderCompanionDialog = () => (
    <Dialog open={companionModalOpen} onOpenChange={setCompanionModalOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Guia Digital 9:16 do Anúncio</DialogTitle>
          <DialogDescription>Cartão e guia digital interativo do anúncio</DialogDescription>
        </DialogHeader>
        {classified && (
          <div className="w-full">
            <DigitalCompanionCard {...buildClassifiedCompanionData(classified)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const isConvenienceProduct = Boolean(
    classified?.attributes?.template_style === "conveniencia" ||
    classified?.category === "mercado" ||
    classified?.attributes?.niche === "mercado" ||
    classified?.attributes?.grocery_department ||
    classified?.category === "food" ||
    classified?.attributes?.niche === "gastronomia" ||
    (classified?.title && /drink|whisky|cerveja|refrigerante|energético|vinho|vodka|gin|suco|água mineral|conveniência|fardo|picanha|filé|costela|alcatra|queijo|presunto/i.test(classified.title))
  );

  if (isConvenienceProduct) {
    return (
      <>
        <ProductTelemetry
          storeId={classified?.store_id || classified?.storeId}
          productId={classified?.id}
          title={classified?.title || "Produto de Conveniência"}
          description={classified?.content}
          priceCents={classified?.price_cents || 0}
          currency="BRL"
          imageUrl={classified?.images?.[0]}
          brandName={classified?.store_name || "Comunidade Waesy"}
          categoryName="Conveniência"
          sku={classified?.id}
          inStock={classified?.status === "active"}
        />
        <ConvenienceShowcaseView
          classified={classified}
          isOwner={effectiveIsOwner}
          onEdit={() =>
            navigate({
              to: "/conta/classificados/novo",
              search: { editId: classified.id } as any,
            })
          }
        />
        {classified?.ai_agent_enabled && (
          <AiSdrChat
            classifiedId={classified.id}
            storeName={classified.store_name || undefined}
            sellerName={classified.profiles?.full_name || (classified as any).author_profile?.full_name || undefined}
          />
        )}
      </>
    );
  }

  if (
    niche.id === "travel" ||
    classified?.category === "travel" ||
    classified?.category === "viagem" ||
    classified?.category === "tourism" ||
    classified?.attributes?.template_style === "editorial" || classified?.attributes?.template_style === "immersive" || classified?.attributes?.template_style === "instagram" ||
    classified?.attributes?.template_style === "instagram_resort"
  ) {
    return (
      <>
        <ProductTelemetry
          storeId={classified?.store_id || classified?.storeId}
          productId={classified?.id}
          title={classified?.title || "Anúncio"}
          description={classified?.content}
          priceCents={classified?.price_cents || 0}
          currency="BRL"
          imageUrl={classified?.images?.[0]}
          brandName={classified?.store_name || "Comunidade Waesy"}
          categoryName={classified?.category || "Turismo"}
          sku={classified?.id}
          inStock={classified?.status === "active"}
        />
        <EditorialShowcaseView
          classified={classified}
          isOwner={effectiveIsOwner}
          onOpenBookingModal={(dep) => {
            if (dep) setSelectedDeparture(dep);
            setBookingOpen(true);
          }}
          onOpenProposalModal={() => setProposalOpen(true)}
          onEditClassified={() =>
            navigate({
              to: "/conta/classificados/novo",
              search: { editId: classified.id } as any,
            })
          }
        />
        {renderBookingDialog()}
        {renderProposalDialog()}
        {classified?.ai_agent_enabled && (
          <AiSdrChat
            classifiedId={classified.id}
            storeName={classified.store_name || undefined}
            sellerName={classified.profiles?.full_name || (classified as any).author_profile?.full_name || undefined}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ProductTelemetry
        storeId={classified?.store_id || classified?.storeId}
        productId={classified?.id}
        title={classified?.title || "Anúncio"}
        description={classified?.content}
        priceCents={classified?.price_cents || 0}
        currency="BRL"
        imageUrl={classified?.images?.[0]}
        brandName={classified?.store_name || "Comunidade Waesy"}
        categoryName={classified?.category || "Classificados"}
        sku={classified?.id}
        inStock={classified?.status === "active"}
      />
      <UniversalClassifiedShowcase
        classified={classified}
        isOwner={effectiveIsOwner}
        canManage={effectiveIsOwner || canManage}
        viewerContext={viewerContext}
        currentProfile={currentProfile}
        onOpenBookingModal={(payload) => {
          if (payload) {
            if (payload.checkIn) setCheckInDate(payload.checkIn);
            if (payload.checkOut) setCheckOutDate(payload.checkOut);
            if (payload.guests) setBookingGuests(payload.guests);
            if (payload.departure_date || payload.id) setSelectedDeparture(payload);
          }
          setBookingOpen(true);
        }}
        onOpenProposalModal={() => setProposalOpen(true)}
        onDirectBuy={handleDirectBuy}
        onDownloadDigital={handleDownloadDigitalFile}
        onOpenCompanion={() => setCompanionModalOpen(true)}
        onEdit={() =>
          navigate({
            to: "/conta/classificados/novo",
            search: { editId: classified.id } as any,
          })
        }
        isBooking={isBooking}
        isBuyingDirect={isBuyingDirect}
        isDownloadingDigital={isDownloadingDigital}
      />
      {renderBookingDialog()}
      {renderProposalDialog()}
      {renderCompanionDialog()}
      {classified?.ai_agent_enabled && (
        <AiSdrChat
          classifiedId={classified.id}
          storeName={classified.store_name || undefined}
          sellerName={classified.profiles?.full_name || (classified as any).author_profile?.full_name || undefined}
        />
      )}
    </>
  );
}

function buildClassifiedCompanionData(classified: any): DigitalCompanionCardProps {
  const attrs = classified?.attributes || {};
  const cat = (classified?.category || "").toLowerCase();

  const nicheType: CompanionCardNiche =
    cat === "real_estate" || cat === "imoveis" || cat === "hospedagem" || cat === "temporada"
      ? "real_estate"
      : cat === "vehicles" || cat === "veiculos" || cat === "automotivo" || cat === "auto"
        ? "auto"
        : cat === "services" || cat === "servicos"
          ? "service"
          : cat === "travel" || cat === "viagem" || cat === "turismo"
            ? "tourism"
            : "retail";

  const title = classified?.title || "Anúncio Waesy";
  const subtitle = [classified?.city, classified?.state].filter(Boolean).join(" - ") || "Brasil";
  const code = classified?.id?.slice(0, 8).toUpperCase() || "WAESY";
  const companyName = classified?.store_name || classified?.profiles?.full_name || "Waesy Comunidade";
  const companyLogoUrl = classified?.profiles?.avatar_url || undefined;
  const price = classified?.price_cents ? formatMoney(classified.price_cents) : "Sob Consulta";

  const sections: CompanionCardSectionItem[] = [
    {
      type: "custom",
      badge: "Detalhes Comerciais",
      title,
      subtitle,
      details: [
        { label: "Valor Anunciado", value: price, highlight: true },
        ...(classified?.condition ? [{ label: "Condição", value: classified.condition === "new" ? "Novo" : "Usado" }] : []),
        ...(attrs.delivery_available ? [{ label: "Entrega", value: "Disponível" }] : []),
        ...(classified?.address ? [{ label: "Local", value: classified.address }] : []),
      ],
    },
  ];

  const rules: CompanionRuleItem[] = [];

  const sellerPhone =
    classified?.contact_whatsapp ||
    classified?.whatsapp ||
    classified?.store?.settings?.whatsapp_phone ||
    classified?.profiles?.phone;

  const emergencyContacts: CompanionContactItem[] = [
    ...(sellerPhone
      ? [
          {
            name: companyName,
            category: "Anunciante / Vendedor",
            phone: sellerPhone,
            whatsapp: true,
            is24h: false,
          },
        ]
      : []),
    {
      name: "Suporte Waesy",
      category: "Central de Ajuda",
      phone: "0800 000 0000",
      whatsapp: true,
      is24h: true,
    },
  ];

  return {
    niche: nicheType,
    title,
    subtitle,
    code,
    companyName,
    companyLogoUrl,
    participantsLabel: "Interessado",
    participants: [],
    sections,
    rules,
    emergencyContacts,
    observations: classified?.content?.slice(0, 300) || undefined,
  };
}
