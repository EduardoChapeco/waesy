import { createFileRoute, Link, useNavigate, isRedirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Sparkles,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditorialShowcaseView } from "@/components/classifieds/editorial-showcase-view";
import { ProductTelemetry } from "@/components/commerce/product-telemetry";
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
import { createDealProposal } from "@/services/deals.functions";
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
      <div className="pt-2 flex items-center justify-center gap-3">
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/classificados">
            <ArrowLeft className="size-4 mr-1.5" />
            <span>Voltar aos Classificados</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  sale: "Desapego / Item Geral",
  vehicle: "Veículo",
  real_estate: "Imóvel",
  service: "Serviço Profissional",
  job: "Emprego / Vaga",
  trade: "Troca",
  donation: "Doação Solidária",
  subscription: "Clube & Assinatura",
  digital: "Produto Digital",
  equipment: "Locação de Equipamento",
  travel: "Viagem & Turismo",
  hospitality: "Hospedagem & Temporada",
  food: "Gastronomia & Alimentação",
  agri: "Agronegócio & Maquinário",
};

const CONDITION_LABELS: Record<string, string> = {
 new: "Novo / Na Caixa",
 used: "Usado - Bom Estado",
 refurbished: "Revisado / Reformado",
};

const STATUS_LABELS: Record<
 string,
 { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
 active: { label: "Publicado", variant: "default" },
 published: { label: "Publicado", variant: "default" },
 paused: { label: "Pausado", variant: "secondary" },
 reserved: { label: "Reservado", variant: "secondary" },
 completed: { label: "Concluído / Vendido", variant: "outline" },
 archived: { label: "Arquivado", variant: "destructive" },
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

function ClassifiedDetailPage() {
 const navigate = useNavigate();
 const queryClient = useQueryClient();
 const { classified, isOwner, canManage, viewerContext, currentProfile } = ((Route.useLoaderData?.() as any) || {});

 const [activeImage, setActiveImage] = useState(0);
 const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

 // Proposal Dialog State
 const [proposalOpen, setProposalOpen] = useState(false);
 const [proposalPriceCents, setProposalPriceCents] = useState<number | undefined>(
 classified?.price_cents || undefined,
 );
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

  const travelTotalCents = effectiveTravelUnitPriceCents * travelPassengers;
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

    const finalTerms = (proposalTerms.trim() + formattedCustomFields).trim();

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
      toast.info("Identifique-se para comprar com garantia e custódia segura.");
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
          terms: "Compra direta com garantia pelo valor integral anunciado.",
        },
      });

      toast.success("Compra com garantia iniciada! Acompanhe a custódia e entrega em Minhas Negociações.");
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
                disabled={isBooking}
                className="w-full h-11 rounded-xl text-xs font-bold gap-2"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Confirmando Reserva...</span>
                  </>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Forma de Pagamento
                  </label>
                  <Input
                    value={proposalInstallments}
                    onChange={(e) => setProposalInstallments(e.target.value)}
                    placeholder="1 (À vista)"
                    className="h-9 rounded-xl text-xs bg-background font-mono"
                  />
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
          categoryName={classified?.category || "Turismo & Viagens"}
          sku={classified?.id}
          inStock={classified?.status === "active"}
        />
        <EditorialShowcaseView
          classified={classified}
          isOwner={isOwner}
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
      </>
    );
  }

 return (
 <div className="w-full space-y-6">
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

      {/* ── Modo Proprietário Banner (Regra 23) ── */}
      {isOwner && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-bold flex items-center gap-1.5 shrink-0">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              Modo Proprietário Ativo:
            </span>
            <span>Você está visualizando este anúncio como autor. Ajustes feitos no formulário de edição refletem imediatamente aqui.</span>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 text-xs rounded-lg border-amber-500/40 hover:bg-amber-500/20 shrink-0 font-medium cursor-pointer"
          >
            <Link to="/conta/classificados/novo" search={{ editId: classified.id } as any}>
              ✏️ Editar Anúncio
            </Link>
          </Button>
        </div>
      )}

 {/* ── Barra Superior de Navegação & Ações Perfeitas ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
 <div className="flex items-center gap-2 flex-wrap">
 <Link
 to="/classificados"
 className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mr-1"
 >
 <ArrowLeft className="size-3.5" />
 <span>Classificados</span>
 </Link>

 <span className="text-muted-foreground/40 text-xs">/</span>

 <Badge variant="outline" className="text-xs font-semibold gap-1">
 <niche.icon className="size-3 text-primary" />
 <span>{niche.shortLabel}</span>
 </Badge>

 <Badge
 variant={statusInfo.variant}
 className="text-[10px] font-bold uppercase tracking-wider"
 >
 {statusInfo.label}
 </Badge>

 {isOwner && (
 <Badge
 variant="secondary"
 className="text-[10px] font-bold uppercase bg-primary/10 text-primary border-primary/20"
 >
 Seu Anúncio
 </Badge>
 )}
 </div>

 {/* Ações de Compartilhamento, Edição & Menu */}
 <div className="flex items-center gap-2 self-end sm:self-auto">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 if (navigator.share) {
 navigator.share({
 title: classified.title,
 text: classified.content,
 url: window.location.href,
 }).catch(() => {});
 } else {
 navigator.clipboard.writeText(window.location.href);
 toast.success("Link do anúncio copiado!");
 }
 }}
 className="rounded-xl text-xs font-semibold h-8 gap-1.5"
 >
 <Share2 className="size-3.5 text-muted-foreground" />
 <span className="hidden sm:inline">Compartilhar</span>
 </Button>

 {isOwner && (
 <Button
 asChild
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-semibold h-8 gap-1.5"
 >
 <Link to="/conta/classificados/novo" search={{ editId: classified.id } as any}>
 <Edit3 className="size-3.5 text-muted-foreground" />
 <span>Editar</span>
 </Link>
 </Button>
 )}

 <ContentActionsMenu
 entityType="classified"
 entityId={classified.id}
 isOwner={canManage}
 status={classified.status}
 category={classified.category}
 canonicalUrl={`/classificados/${classified.id}`}
 title={classified.title}
 description={classified.content}
 mediaUrl={images[0]}
 onStatusChange={handleStatusChange}
 onEdit={() =>
 navigate({
 to: "/conta/classificados/novo",
 search: { editId: classified.id } as any,
 })
 }
 onDelete={handleDelete}
 />
 </div>
 </div>

  {/* ── Modo Proprietário Banner (Regra 23) ── */}
  {isOwner && (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <span className="font-bold flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          Modo Proprietário Ativo:
        </span>
        <span>Você está visualizando seu próprio anúncio. Os dados públicos exibidos aos clientes estão sincronizados em tempo real.</span>
      </div>
      <Button asChild size="sm" variant="outline" className="h-7 text-xs rounded-lg border-amber-500/40 hover:bg-amber-500/20 shrink-0 font-medium">
        <Link to="/conta/classificados/novo" search={{ editId: classified.id } as any}>
          ✏️ Editar Anúncio
        </Link>
      </Button>
    </div>
  )}

 {/* ── Grid Principal de Apresentação (Split-Layout Maduro) ── */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* Coluna Esquerda: Mídias & Detalhes (7 colunas) */}
 <div className="lg:col-span-7 space-y-6">
 {/* Galeria de Mídias Dominante com Ambient Backdrop */}
 <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
 <div className="relative aspect-[16/10] bg-black/95 flex items-center justify-center overflow-hidden group">
 {/* Ambient Blurred Backdrop para mídias verticais ou formatos mistos */}
 {images.length > 0 && !isVideoUrl(images[activeImage]) && (
 <div
 className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 pointer-events-none transition-all duration-500"
 style={{ backgroundImage: `url(${images[activeImage]})` }}
 />
 )}

 {images.length > 0 ? (
 isVideoUrl(images[activeImage]) ? (
 <video
 src={images[activeImage]}
 controls
 playsInline
 className="relative z-10 size-full max-h-full max-w-full object-contain"
 />
 ) : (
 <img
 src={images[activeImage]}
 alt={`${classified.title} - Imagem ${activeImage + 1}`}
 className="relative z-10 size-full max-h-full max-w-full object-contain select-none cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
 onClick={() => setFullscreenImage(images[activeImage])}
 />
 )
 ) : (
 <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
 <ImageIcon className="size-12 stroke-[1.5]" />
 <span className="text-xs">Sem imagens disponíveis</span>
 </div>
 )}

 {/* Indicador Numérico de Fotos */}
 {images.length > 1 && (
 <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-mono font-bold tracking-wider">
 {activeImage + 1} / {images.length}
 </div>
 )}

 {/* Botão de Expansão Fullscreen */}
 {images.length > 0 && !isVideoUrl(images[activeImage]) && (
 <button
 type="button"
 onClick={() => setFullscreenImage(images[activeImage])}
 className="absolute bottom-3 right-3 z-20 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
 aria-label="Ver imagem cheia"
 >
 <Maximize2 className="size-4" />
 </button>
 )}

 {/* Setas de Navegação */}
 {images.length > 1 && (
 <>
 <button
 type="button"
 onClick={() =>
 setActiveImage((prev) => (prev > 0 ? prev - 1 : images.length - 1))
 }
 className="absolute left-3 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100"
 aria-label="Imagem anterior"
 >
 <ChevronLeft className="size-5" />
 </button>
 <button
 type="button"
 onClick={() =>
 setActiveImage((prev) => (prev < images.length - 1 ? prev + 1 : 0))
 }
 className="absolute right-3 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100"
 aria-label="Próxima imagem"
 >
 <ChevronRight className="size-5" />
 </button>
 </>
 )}
 </div>

 {/* Carrossel de Miniaturas Alinhado e Consistente */}
 {images.length > 1 && (
 <div className="flex items-center gap-2.5 p-3.5 overflow-x-auto no-scrollbar bg-muted/20 ">
 {images.map((img, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => setActiveImage(idx)}
 className={`relative size-16 sm:size-20 aspect-square rounded-xl overflow-hidden border-2 shrink-0 transition-all bg-black/20 ${
 activeImage === idx
 ? "border-primary ring-2 ring-primary/20 scale-105"
 : "border-border/60 opacity-70 hover:opacity-100 hover:border-border"
 }`}
 >
 {isVideoUrl(img) ? (
 <div className="relative size-full flex items-center justify-center bg-black/40">
 <video
 src={img}
 className="size-full object-cover pointer-events-none"
 preload="metadata"
 muted
 />
 <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
 <div className="size-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
 <Play className="size-3 fill-white ml-0.5" />
 </div>
 </div>
 </div>
 ) : (
 <img
 src={img}
 alt={`Miniatura ${idx + 1}`}
 className="size-full object-cover"
 />
 )}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Descrição & Especificações */}
 <div className="bg-card rounded-2xl border border-border/60 p-6 sm:p-7 space-y-4">
 <h2 className="text-base font-bold text-foreground pb-2">
 Descrição do Anúncio
 </h2>
 <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
 {classified.content}
 </div>

 {/* Atributos Gerais Semânticos */}
 <div className=" pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
 {semanticCondition && (
 <div>
 <span className="text-muted-foreground block mb-0.5">{semanticCondition.label}</span>
 <span className="font-semibold text-foreground">
 {semanticCondition.value}
 </span>
 </div>
 )}
 <div>
 <span className="text-muted-foreground block mb-0.5">Negociação</span>
 <span className="font-semibold text-foreground">
 {classified.negotiable !== false ? "Aceita propostas" : "Valor fixo"}
 </span>
 </div>
 {classified.attributes?.modality && (
 <div>
 <span className="text-muted-foreground block mb-0.5">Modalidade</span>
 <span className="font-semibold text-foreground">
 {classified.attributes.modality}
 </span>
 </div>
 )}
 </div>

 {/* ─── Especificações de Imóvel (Casas, Aptos, Temporada) ─── */}
              {classified.category === "real_estate" && (
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Tag className="size-3.5 text-primary" />
                      <span>Características & Facilidades do Imóvel</span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {classified.attributes?.property_type && (
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {classified.attributes.property_type}
                        </Badge>
                      )}
                      {classified.attributes?.furnished && (
                        <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/15 text-primary border-primary/20">
                          {classified.attributes.furnished}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {classified.bedrooms && (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[10px]">Quartos</span>
                        <span className="font-bold text-base text-foreground font-mono">
                          {classified.bedrooms}
                          {classified.attributes?.suites ? ` (${classified.attributes.suites} suítes)` : ""}
                        </span>
                      </div>
                    )}
                    {classified.parking_spots && (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[10px]">Vagas de Garagem</span>
                        <span className="font-bold text-base text-foreground font-mono">{classified.parking_spots}</span>
                      </div>
                    )}
                    {classified.bathrooms && (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[10px]">Banheiros</span>
                        <span className="font-bold text-base text-foreground font-mono">{classified.bathrooms}</span>
                      </div>
                    )}
                    {classified.area_sqm && (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[10px]">Área Útil</span>
                        <span className="font-bold text-base text-foreground font-mono">{classified.area_sqm} m²</span>
                      </div>
                    )}
                  </div>

                  {(classified.attributes?.condo_cents || classified.attributes?.iptu_cents) && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl">
                      {classified.attributes?.condo_cents && (
                        <span>Condomínio: <strong className="text-foreground">{formatMoney(classified.attributes.condo_cents)}</strong></span>
                      )}
                      {classified.attributes?.iptu_cents && (
                        <span>IPTU: <strong className="text-foreground">{formatMoney(classified.attributes.iptu_cents)}</strong></span>
                      )}
                    </div>
                  )}

                  {/* Comodidades do Imóvel com Tags Visuais */}
                  {Array.isArray(classified.amenities || classified.attributes?.amenities) && (classified.amenities || classified.attributes?.amenities).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">
                        Comodidades & Lazer
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(classified.amenities || classified.attributes?.amenities).map((amenity: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-lg gap-1.5 bg-primary/10 text-primary border-primary/20">
                            ✓ {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Ficha Técnica: Hospedagem, Chalé & Temporada ─── */}
              {(classified.category === "hospitality" || classified.category === "hospedagem" || classified.attributes?.niche === "hospitality" || (niche as any)?.id === "hospitality") && (
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Hotel className="size-3.5 text-primary" />
                      <span>Ficha da Hospedagem & Estadia</span>
                    </h3>
                    {classified.attributes?.property_type && (
                      <Badge variant="outline" className="text-[11px] font-semibold">
                        {classified.attributes.property_type}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                      <span className="text-muted-foreground block text-[10px]">Check-in</span>
                      <span className="font-bold text-sm text-foreground font-mono">{classified.attributes?.checkin_time || "14:00"}</span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                      <span className="text-muted-foreground block text-[10px]">Check-out</span>
                      <span className="font-bold text-sm text-foreground font-mono">{classified.attributes?.checkout_time || "11:00"}</span>
                    </div>
                    {classified.attributes?.max_guests && (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[10px]">Capacidade</span>
                        <span className="font-bold text-sm text-foreground font-mono">{classified.attributes.max_guests} hóspedes</span>
                      </div>
                    )}
                    {classified.attributes?.cleaning_fee_cents ? (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[10px]">Taxa Limpeza</span>
                        <span className="font-bold text-sm text-foreground font-mono">{formatMoney(classified.attributes.cleaning_fee_cents)}</span>
                      </div>
                    ) : null}
                    {classified.attributes?.security_deposit_cents ? (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[10px]">Caução</span>
                        <span className="font-bold text-sm text-foreground font-mono">{formatMoney(classified.attributes.security_deposit_cents)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Regras da Casa */}
                  {classified.attributes?.house_rules && (
                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 text-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Regras da Casa & Observações
                      </span>
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                        {classified.attributes.house_rules}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Ficha Técnica de Veículo */}
              {classified.category === "vehicle" && classified.attributes && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Ficha do Veículo
                    </h3>
                    {classified.attributes.version && (
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {classified.attributes.version}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl">
                    {classified.attributes.brand && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Marca</span>
                        <span className="font-bold">{classified.attributes.brand}</span>
                      </div>
                    )}
                    {classified.attributes.model && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Modelo</span>
                        <span className="font-bold">{classified.attributes.model}</span>
                      </div>
                    )}
                    {classified.attributes.year_fab && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Ano Fab/Mod</span>
                        <span className="font-bold">
                          {classified.attributes.year_fab}/{classified.attributes.year_model || "-"}
                        </span>
                      </div>
                    )}
                    {classified.attributes.mileage_km !== undefined && classified.attributes.mileage_km !== null && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Quilometragem</span>
                        <span className="font-bold">
                          {classified.attributes.mileage_km === 0 ? "Zero Km" : `${classified.attributes.mileage_km} km`}
                        </span>
                      </div>
                    )}
                    {classified.attributes.transmission && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Câmbio</span>
                        <span className="font-bold">{classified.attributes.transmission}</span>
                      </div>
                    )}
                    {classified.attributes.fuel_type && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Combustível</span>
                        <span className="font-bold">{classified.attributes.fuel_type}</span>
                      </div>
                    )}
                    {classified.attributes.color && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Cor</span>
                        <span className="font-bold">{classified.attributes.color}</span>
                      </div>
                    )}
                    {classified.attributes.doors && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Portas</span>
                        <span className="font-bold">{classified.attributes.doors} portas</span>
                      </div>
                    )}
                    {classified.attributes.plate_end && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Final da Placa</span>
                        <span className="font-bold">{classified.attributes.plate_end}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

 {/* ─── Ficha Técnica: Alimentação & Gastronomia Artesanal ─── */}
              {(classified.category === "food" || classified.category === "alimentacao" || classified.attributes?.niche === "alimentacao" || niche.id === "food") && (
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Utensils className="size-3.5 text-primary" />
                      <span>Cardápio & Informações da Refeição</span>
                    </h3>
                    <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/20 bg-primary/10">
                      Gastronomia Local
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                      <span className="text-muted-foreground block text-[10px]">Tipo</span>
                      <span className="font-bold text-foreground capitalize">
                        {classified.attributes?.meal_type?.replace(/_/g, " ") || "Refeição Artesanal"}
                      </span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                      <span className="text-muted-foreground block text-[10px]">Preparo / Entrega</span>
                      <span className="font-bold text-foreground">
                        {classified.attributes?.prep_time || "Pronta entrega"}
                      </span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40 col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block text-[10px]">Entrega</span>
                      <span className="font-bold text-foreground">
                        MotoLink & Retirada Local
                      </span>
                    </div>
                  </div>

                  {/* Restrições / Selos Alimentares */}
                  {Array.isArray(classified.attributes?.dietary_tags) && classified.attributes.dietary_tags.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">
                        Selos & Restrições
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {classified.attributes.dietary_tags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-lg gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                            ✓ {tag.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sabores & Opções Selecionáveis */}
                  {classified.attributes?.modifiers_text && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">
                        Sabores / Opções Disponíveis
                      </span>
                      <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 text-xs text-foreground/90 space-y-1.5">
                        {classified.attributes.modifiers_text.split(",").map((opt: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-primary" />
                            <span>{opt.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Ficha Técnica: Desapego & Bens Físicos ─── */}
 {classified.category === "sale" && classified.attributes?.desapego_subcategory && (
 <div className="pt-4 space-y-4">
 <h3 className="text-xs font-medium text-muted-foreground">
 Especificações do Item
 </h3>

 {/* Smartphone */}
 {classified.attributes.desapego_subcategory === "smartphones" && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl">
 {classified.attributes.brand && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Marca</span>
 <span className="font-semibold">{classified.attributes.brand}</span>
 </div>
 )}
 {classified.attributes.model && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Modelo</span>
 <span className="font-semibold">{classified.attributes.model}</span>
 </div>
 )}
 {classified.attributes.storage && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Armazenamento</span>
 <span className="font-semibold">{classified.attributes.storage}</span>
 </div>
 )}
 {classified.attributes.battery_health && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Saúde da Bateria</span>
 <span className="font-semibold">{classified.attributes.battery_health}%</span>
 </div>
 )}
 {classified.attributes.condition && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Estado</span>
 <span className="font-semibold capitalize">{classified.attributes.condition.replace(/_/g, " ")}</span>
 </div>
 )}
 </div>
 )}

 {/* Computador / Notebook */}
 {classified.attributes.desapego_subcategory === "computadores" && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl">
 {classified.attributes.computer_type && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Tipo</span>
 <span className="font-semibold">{classified.attributes.computer_type}</span>
 </div>
 )}
 {classified.attributes.brand && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Marca</span>
 <span className="font-semibold">{classified.attributes.brand}</span>
 </div>
 )}
 {classified.attributes.processor && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Processador</span>
 <span className="font-semibold">{classified.attributes.processor}</span>
 </div>
 )}
 {classified.attributes.ram && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Memória RAM</span>
 <span className="font-semibold">{classified.attributes.ram}</span>
 </div>
 )}
 {classified.attributes.storage && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Armazenamento</span>
 <span className="font-semibold">{classified.attributes.storage}</span>
 </div>
 )}
 {classified.attributes.condition && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Estado</span>
 <span className="font-semibold capitalize">{classified.attributes.condition.replace(/_/g, " ")}</span>
 </div>
 )}
 </div>
 )}

 {/* Eletrodoméstico */}
 {classified.attributes.desapego_subcategory === "eletrodomesticos" && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl">
 {classified.attributes.appliance_type && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Tipo</span>
 <span className="font-semibold">{classified.attributes.appliance_type}</span>
 </div>
 )}
 {classified.attributes.brand && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Marca</span>
 <span className="font-semibold">{classified.attributes.brand}</span>
 </div>
 )}
 {classified.attributes.voltage && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Voltagem</span>
 <span className="font-semibold">{classified.attributes.voltage}</span>
 </div>
 )}
 {classified.attributes.condition && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Estado</span>
 <span className="font-semibold capitalize">{classified.attributes.condition.replace(/_/g, " ")}</span>
 </div>
 )}
 </div>
 )}

 {/* Games & Consoles */}
 {classified.attributes.desapego_subcategory === "games_consoles" && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl">
 {classified.attributes.console && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Console</span>
 <span className="font-semibold">{classified.attributes.console}</span>
 </div>
 )}
 {classified.attributes.condition && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Estado</span>
 <span className="font-semibold capitalize">{classified.attributes.condition.replace(/_/g, " ")}</span>
 </div>
 )}
 </div>
 )}

 {/* Móveis & Decoração */}
 {classified.attributes.desapego_subcategory === "moveis" && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl">
 {classified.attributes.room && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Ambiente</span>
 <span className="font-semibold">{classified.attributes.room}</span>
 </div>
 )}
 {classified.attributes.material && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Material</span>
 <span className="font-semibold">{classified.attributes.material}</span>
 </div>
 )}
 {classified.attributes.condition && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Estado</span>
 <span className="font-semibold capitalize">{classified.attributes.condition.replace(/_/g, " ")}</span>
 </div>
 )}
 </div>
 )}

 {/* Brechó & Moda */}
 {classified.attributes.desapego_subcategory === "moda_brecho" && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl">
 {classified.attributes.fashion_category && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Categoria</span>
 <span className="font-semibold">{classified.attributes.fashion_category}</span>
 </div>
 )}
 {classified.attributes.gender && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Gênero</span>
 <span className="font-semibold">{classified.attributes.gender}</span>
 </div>
 )}
 {classified.attributes.size && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Tamanho</span>
 <span className="font-semibold">{classified.attributes.size}</span>
 </div>
 )}
 {classified.attributes.brand && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Marca</span>
 <span className="font-semibold">{classified.attributes.brand}</span>
 </div>
 )}
 {classified.attributes.condition && (
 <div>
 <span className="text-muted-foreground block text-[10px]">Estado</span>
 <span className="font-semibold capitalize">{classified.attributes.condition.replace(/_/g, " ")}</span>
 </div>
 )}
 </div>
 )}

 {/* Acessórios inclusos (smartphone) */}
 {Array.isArray(classified.attributes.accessories) && classified.attributes.accessories.length > 0 && (
 <div className="space-y-1.5">
 <span className="text-[11px] text-muted-foreground">Incluso no Item</span>
 <div className="flex flex-wrap gap-1.5">
 {classified.attributes.accessories.map((acc: string, i: number) => (
 <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-muted text-foreground font-medium">
 ✓ {acc}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Garantia */}
 {classified.attributes.warranty && (
 <p className="text-xs text-muted-foreground">
 <span className="font-medium text-foreground">Garantia / Procedência:</span> {classified.attributes.warranty}
 </p>
 )}
 </div>
 )}

 {/* ─── Ficha Técnica: Veículo — Cor + Opcionais + Procedência ─── */}
 {classified.category === "vehicle" && classified.attributes && (classified.attributes.color || (Array.isArray(classified.attributes.features) && classified.attributes.features.length > 0)) && (
 <div className="pt-2 space-y-3">
 {classified.attributes.color && (
 <div className="flex items-center gap-2 text-xs">
 <span className="text-muted-foreground">Cor:</span>
 <span className="font-semibold">{classified.attributes.color}</span>
 </div>
 )}
 {Array.isArray(classified.attributes.features) && classified.attributes.features.length > 0 && (
 <div className="space-y-1.5">
 <span className="text-[11px] text-muted-foreground">Opcionais & Diferenciais</span>
 <div className="flex flex-wrap gap-1.5">
 {classified.attributes.features.map((feat: string, i: number) => (
 <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-muted text-foreground font-medium">
 {feat}
 </span>
 ))}
 </div>
 </div>
 )}
 {Array.isArray(classified.attributes.provenance) && classified.attributes.provenance.length > 0 && (
 <div className="space-y-1.5">
 <span className="text-[11px] text-muted-foreground">Procedência & Documentação</span>
 <div className="flex flex-wrap gap-1.5">
 {classified.attributes.provenance.map((prov: string, i: number) => (
 <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium">
 ✓ {prov}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Ficha Técnica de Vaga de Emprego & Oportunidade (BigTech Executive Standard) */}
 {(classified.category === "job" || classified.attributes?.niche === "vaga") && (
 <div className=" pt-4 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Briefcase className="size-4 text-primary" />
 <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Requisitos & Detalhes da Vaga
 </h3>
 </div>
 <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold text-primary border-primary/30">
 {classified.attributes?.role || classified.title}
 </Badge>
 </div>

 {/* Grade de 4 parâmetros mensuráveis */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl text-center">
 <div>
 <span className="text-muted-foreground block text-[10px] mb-0.5">Escolaridade Mínima</span>
 <span className="font-bold text-foreground">
 {getEducationLabel(classified.attributes?.min_education)}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px] mb-0.5">Experiência Mínima</span>
 <span className="font-bold text-foreground">
 {getExperienceLabel(classified.attributes?.experience_level)}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px] mb-0.5">Regime</span>
 <span className="font-bold text-foreground">
 {getRegimeLabel(classified.attributes?.regime)}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px] mb-0.5">Modelo</span>
 <span className="font-bold text-foreground">
 {getWorkplaceModelLabel(classified.attributes?.work_model)}
 </span>
 </div>
 </div>

 {/* Escala / Jornada de Trabalho */}
 {classified.attributes?.work_schedule && (
 <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs flex items-center justify-between">
 <span className="text-muted-foreground font-medium">Jornada / Escala de Trabalho:</span>
 <strong className="text-foreground">{classified.attributes.work_schedule}</strong>
 </div>
 )}

 {/* Benefícios Oferecidos */}
 {Array.isArray(classified.attributes?.benefits) && classified.attributes.benefits.length > 0 && (
 <div className="space-y-2 pt-2">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
 Benefícios & Vantagens Oferecidas
 </span>
 <div className="flex flex-wrap gap-1.5">
 {classified.attributes.benefits.map((ben: string, idx: number) => (
 <Badge key={idx} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-lg gap-1.5 bg-primary/10 text-primary border-primary/20">
 <CheckCircle2 className="size-3 text-primary" />
 <span>{ben}</span>
 </Badge>
 ))}
 </div>
 </div>
 )}

 {/* Habilidades & Competências Exigidas */}
 {Array.isArray(classified.attributes?.skills) && classified.attributes.skills.length > 0 && (
 <div className="space-y-2 pt-2">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
 Competências & Habilidades Desejadas
 </span>
 <div className="flex flex-wrap gap-1.5">
 {classified.attributes.skills.map((skill: string, idx: number) => (
 <Badge key={idx} variant="outline" className="text-xs font-medium px-2.5 py-1 rounded-lg">
 {skill}
 </Badge>
 ))}
 </div>
 </div>
 )}

 {/* Widget de Mensuração e Estatísticas de Candidatos (Padrão Corporativo Waesy) */}
 <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <TrendingUp className="size-4 text-primary" />
 <span className="text-xs font-bold text-foreground">Requisitos & Perfil da Oportunidade</span>
 </div>
 <Badge variant="secondary" className="text-[10px] font-mono text-primary">
 Critérios de Seleção
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground">
 Candidatos que atendem aos requisitos de formação e competências têm maior compatibilidade com esta vaga.
 </p>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-center">
 <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
 <span className="text-[10px] text-muted-foreground block">Status do Processo</span>
 <span className="text-xs font-bold text-emerald-600">Inscrições Abertas</span>
 </div>
 <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
 <span className="text-[10px] text-muted-foreground block">Canal Recomendado</span>
 <span className="text-xs font-bold text-primary">Perfil Profissional</span>
 </div>
 <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
 <span className="text-[10px] text-muted-foreground block">Triagem Média</span>
 <span className="text-xs font-bold text-foreground">Em até 48h</span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Ficha Técnica de Serviço Profissional & Agenda de Atendimento */}
  {(classified.category === "service" || classified.attributes?.niche === "servico") && (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Agenda de Atendimento & Disponibilidade
          </h3>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold text-primary border-primary/30">
          Serviço Agendável
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl text-center">
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Modalidade</span>
          <span className="font-bold text-foreground capitalize">
            {classified.attributes?.modality === "domicilio"
              ? "A Domicílio"
              : classified.attributes?.modality === "remoto"
              ? "Remoto / Online"
              : "No Local / Presencial"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Cobrança</span>
          <span className="font-bold text-foreground capitalize">
            {classified.attributes?.pricing_type === "por_hora"
              ? "Por Hora"
              : classified.attributes?.pricing_type === "a_combinar"
              ? "Sob Consulta"
              : "Preço Fixo"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Duração Média</span>
          <span className="font-bold text-foreground">
            {classified.service_duration_minutes || classified.attributes?.service_duration_minutes || 60} min
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Horário Atendido</span>
          <span className="font-bold text-foreground font-mono">
            {classified.attributes?.working_hours_start || "08:00"} às {classified.attributes?.working_hours_end || "18:00"}
          </span>
        </div>
      </div>

      {/* Dias de Atendimento na Semana */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Dias da Semana com Atendimento Disponível
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "seg", label: "Segunda" },
            { id: "ter", label: "Terça" },
            { id: "qua", label: "Quarta" },
            { id: "qui", label: "Quinta" },
            { id: "sex", label: "Sexta" },
            { id: "sab", label: "Sábado" },
            { id: "dom", label: "Domingo" },
          ].map((day) => {
            const weekdays = Array.isArray(classified.attributes?.available_weekdays)
              ? classified.attributes.available_weekdays
              : ["seg", "ter", "qua", "qui", "sex"];
            const isAvailable = weekdays.includes(day.id);
            return (
              <Badge
                key={day.id}
                variant={isAvailable ? "default" : "outline"}
                className={`text-xs px-2.5 py-1 rounded-lg ${
                  isAvailable
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "opacity-40 line-through"
                }`}
              >
                {day.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {classified.attributes?.service_area && (
        <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Região / Raio de Atendimento:</span>
          <strong className="text-foreground">{classified.attributes.service_area}</strong>
        </div>
      )}
      {classified.attributes?.available_slots !== undefined && (
        <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Vagas / Agendamentos por Dia:</span>
          <strong className="text-foreground font-mono">{classified.attributes.available_slots} vagas disponíveis</strong>
        </div>
      )}
    </div>
  )}

  {/* ─── Ficha Técnica: Equipamentos & Locação de Maquinário ─── */}
  {(classified.category === "equipment" || classified.attributes?.niche === "equipment" || (niche as any)?.id === "equipment") && (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Wrench className="size-3.5 text-primary" />
          <span>Ficha Técnica do Equipamento / Maquinário</span>
        </h3>
        {classified.attributes?.condition && (
          <Badge variant="outline" className="text-[11px] font-semibold capitalize">
            {classified.attributes.condition.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl text-center">
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Período de Locação</span>
          <span className="font-bold text-foreground capitalize">
            {classified.attributes?.equipment_period === "diaria"
              ? "Por Diária"
              : classified.attributes?.equipment_period === "evento"
              ? "Por Evento"
              : classified.attributes?.equipment_period === "semanal"
              ? "Semanal"
              : classified.attributes?.equipment_period === "mensal"
              ? "Mensal"
              : "Por Diária"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Caução / Garantia</span>
          <span className="font-bold text-foreground font-mono">
            {classified.attributes?.deposit_cents ? formatMoney(classified.attributes.deposit_cents) : "Sem caução"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Operador Técnico</span>
          <span className="font-bold text-foreground">
            {classified.attributes?.operator_included ? "Incluso no valor" : "Não incluso"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Entrega / Retirada</span>
          <span className="font-bold text-foreground">
            {classified.attributes?.delivery_available ? "Entrega no local" : "Retirada no balcão"}
          </span>
        </div>
      </div>

      {/* Acessórios & Cabos Inclusos */}
      {Array.isArray(classified.attributes?.accessories) && classified.attributes.accessories.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">
            Acessórios & Itens Inclusos
          </span>
          <div className="flex flex-wrap gap-1.5">
            {classified.attributes.accessories.map((acc: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-lg gap-1.5 bg-primary/10 text-primary border-primary/20">
                ✓ {acc}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )}

  {/* ─── Ficha Técnica: Produtos Digitais & Conteúdo ─── */}
  {(classified.category === "digital" || classified.attributes?.niche === "digital" || (niche as any)?.id === "digital" || classified.attributes?.digital_file_url) && (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <FileArchive className="size-3.5 text-primary" />
          <span>Arquivo & Entrega Digital Imediata</span>
        </h3>
        <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
          Download Instantâneo
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl text-center">
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Formato do Arquivo</span>
          <span className="font-bold text-foreground uppercase font-mono">
            {classified.attributes?.digital_file_type || "PDF / Arquivo"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Tamanho</span>
          <span className="font-bold text-foreground font-mono">
            {classified.attributes?.digital_file_size_bytes
              ? `${(classified.attributes.digital_file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
              : classified.attributes?.file_size || "Acesso Direto"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Limite de Downloads</span>
          <span className="font-bold text-foreground">
            {classified.attributes?.digital_download_limit ? `${classified.attributes.digital_download_limit} tentativas` : "Ilimitado"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Acesso</span>
          <span className="font-bold text-emerald-600">Vitalício</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="space-y-0.5 text-center sm:text-left">
          <p className="text-xs font-bold text-foreground">Acesso ao Arquivo Digital</p>
          <p className="text-[11px] text-muted-foreground">
            Garantia de integridade do arquivo protegido por assinatura criptográfica Waesy.
          </p>
        </div>
        <Button
          onClick={handleDownloadDigitalFile}
          disabled={isDownloadingDigital}
          size="sm"
          className="h-10 px-4 rounded-xl font-bold text-xs gap-2 shrink-0 bg-primary text-primary-foreground shadow-xs cursor-pointer"
        >
          {isDownloadingDigital ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Gerando Link Seguro...</span>
            </>
          ) : (
            <>
              <Download className="size-4" />
              <span>Baixar Arquivo Agora</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )}

  {/* ─── Ficha Técnica: Doação Solidária & Desapego Gratuito ─── */}
  {(classified.category === "donation" || classified.attributes?.niche === "doacao" || (niche as any)?.id === "donation" || (classified.price_cents === 0 && !["service", "real_estate", "job"].includes(classified.category))) && (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <HeartHandshake className="size-3.5 text-emerald-600" />
          <span>Doação Solidária Comunitária</span>
        </h3>
        <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
          100% Gratuito
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl text-center">
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Finalidade</span>
          <span className="font-bold text-foreground">Ajuda Comunitária</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Custo ao Beneficiário</span>
          <span className="font-bold text-emerald-600 font-mono">R$ 0,00 Grátis</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Retirada</span>
          <span className="font-bold text-foreground">
            {classified.attributes?.delivery_mode === "pickup" ? "Retirada em Mãos" : "A Combinar"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Prioridade</span>
          <span className="font-bold text-foreground">Ordem de Pedido</span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
          Termo de Desapego Solidário Waesy
        </span>
        <p className="text-foreground/90 leading-relaxed text-[11px]">
          Este item está sendo doado de forma voluntária e sem qualquer cobrança financeira. A retirada deve ser combinada com respeito e pontualidade diretamente com o doador.
        </p>
      </div>
    </div>
  )}

  {/* ─── Ficha Técnica: Assinatura Recorrente & Clube ─── */}
  {(classified.category === "subscription" || classified.attributes?.niche === "assinatura" || (niche as any)?.id === "subscription") && (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span>Plano de Assinatura & Clube Recorrente</span>
        </h3>
        <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold text-primary border-primary/30 bg-primary/10">
          Recorrência Waesy
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-4 rounded-2xl text-center">
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Ciclo de Cobrança</span>
          <span className="font-bold text-foreground capitalize">
            {classified.attributes?.subscription_cycle === "anual" ? "Cobrança Anual" : "Cobrança Mensal"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Período de Teste</span>
          <span className="font-bold text-foreground">
            {classified.attributes?.trial_days ? `${classified.attributes.trial_days} dias grátis` : "Acesso imediato"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Taxa de Matrícula</span>
          <span className="font-bold text-foreground font-mono">
            {classified.attributes?.setup_fee_cents ? formatMoney(classified.attributes.setup_fee_cents) : "Isento"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] mb-0.5">Fidelidade</span>
          <span className="font-bold text-emerald-600">Sem fidelidade</span>
        </div>
      </div>

      {Array.isArray(classified.attributes?.recurring_features) && classified.attributes.recurring_features.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">
            Benefícios Inclusos no Plano
          </span>
          <div className="flex flex-wrap gap-1.5">
            {classified.attributes.recurring_features.map((feat: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-lg gap-1.5 bg-primary/10 text-primary border-primary/20">
                ✓ {feat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {classified.attributes?.subscription_terms && (
        <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 text-xs space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Regras de Renovação & Cancelamento
          </span>
          <p className="text-foreground/90 leading-relaxed text-[11px] whitespace-pre-line">
            {classified.attributes.subscription_terms}
          </p>
        </div>
      )}
    </div>
  )}

 {/* Ficha Técnica de Imóvel & Hospedagem */}
 {classified.category === "real_estate" && (
 <div className=" pt-4 space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 {classified.deal_type === "temporada"
 ? "Detalhes da Hospedagem (Temporada)"
 : "Detalhes do Imóvel"}
 </h3>
 <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold">
 {classified.deal_type === "temporada"
 ? "Diária / Temporada"
 : classified.deal_type === "aluguel"
 ? "Aluguel Mensal"
 : "Venda"}
 </Badge>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl text-center">
 <div>
 <span className="text-muted-foreground block text-[10px]">Área Útil</span>
 <span className="font-bold">
 {(classified.area_sqm || classified.attributes?.area_sqm)
 ? `${classified.area_sqm || classified.attributes?.area_sqm} m²`
 : "-"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">
 {classified.deal_type === "temporada" ? "Hóspedes" : "Quartos"}
 </span>
 <span className="font-bold">
 {classified.deal_type === "temporada"
 ? `Até ${classified.max_guests || 2}`
 : (classified.bedrooms ?? classified.attributes?.bedrooms ?? "-")}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Suítes / Banheiros</span>
 <span className="font-bold">
 {(classified.suites ?? classified.attributes?.suites) || (classified.bathrooms ?? 1)}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Vagas de Garagem</span>
 <span className="font-bold">
 {classified.parking_spots ?? classified.attributes?.parking_spots ?? "-"}
 </span>
 </div>
 </div>

 {/* Comodidades & Diferenciais */}
 {((classified.amenities && classified.amenities.length > 0) || (classified.attributes?.amenities && classified.attributes.amenities.length > 0)) && (
 <div className="space-y-2 pt-2">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
 Comodidades & Diferenciais
 </span>
 <div className="flex flex-wrap gap-2">
 {(classified.amenities || classified.attributes?.amenities || []).map((amenity: string, idx: number) => (
 <Badge key={idx} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-lg">
 ✓ {amenity}
 </Badge>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Localização no Mapa Real (MapLibre OpenStreetMap) — Suprimido se hide_location */}
 {!Boolean(
   classified.attributes?.hide_location ||
   classified.attributes?.hide_address ||
   classified.attributes?.location_privacy === "hidden" ||
   author?.hide_location
 ) && (
              <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Localização no Mapa</h2>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold">
                    {classified.location_name || classified.location_text || "Região Central"}
                  </Badge>
                </div>

                {(() => {
                  const storedLoc = typeof window !== "undefined" ? getStoredLocation() : null;
                  const mapLat = Number(classified.location_lat || classified.latitude || classified.attributes?.latitude || storedLoc?.lat || -27.1004);
                  const mapLng = Number(classified.location_lng || classified.longitude || classified.attributes?.longitude || storedLoc?.lng || -52.6152);
                  return (
                    <div className="h-[220px] w-full rounded-2xl overflow-hidden border border-border/70 relative shadow-2xs">
                      <MapLibreCanvas
                        center={{
                          lat: mapLat,
                          lng: mapLng,
                        }}
                        zoom={14}
                        markers={[
                          {
                            id: classified.id,
                            lat: mapLat,
                            lng: mapLng,
                            title: classified.title,
                            image_url: classified.media?.[0] || null,
                          },
                        ]}
                      />
                    </div>
                  );
                })()}

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Por segurança e privacidade, a localização no mapa indica a região aproximada do anúncio. O endereço exato é combinado diretamente entre das partes.
                </p>
              </div>
            )}
          </div>

  {/* Coluna Direita: Informações Essenciais & Ações (5 colunas) */}
  <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
    <div className="bg-card rounded-2xl border border-border/70 p-6 sm:p-7 space-y-6 shadow-xs">
      {/* ── 1. Topo & Identificação do Anúncio ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge className="px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/25 text-xs font-black uppercase tracking-wider">
            {CATEGORY_LABELS[classified.category] || classified.category}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5 text-muted-foreground/70" />
            <span>Publicado {formatRelativeTime(classified.created_at)}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="font-mono text-[11px]">Cód. #{classified.id.slice(0, 8)}</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-snug tracking-tight">
          {classified.title}
        </h1>
      </div>

      {/* ── 2. Card Financeiro & Precificação Estruturada ── */}
      <div className="p-5 rounded-2xl bg-muted/25 dark:bg-muted/15 border border-border/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider block">
            {niche.id === "donation"
              ? "Desapego Solidário"
              : niche.id === "equipment"
              ? "Valor da Diária de Locação"
              : classified.deal_type === "aluguel"
              ? "Valor do Aluguel Mensal"
              : classified.deal_type === "temporada"
              ? "Valor por Diária"
              : "Valor"}
          </span>
          {classified.negotiable !== false && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              ✓ Negociável
            </span>
          )}
        </div>

        <div className="text-3xl sm:text-4xl font-black text-foreground font-display tracking-tight flex items-baseline gap-1.5">
          {niche.id === "donation" || (classified.price_cents === 0 && classified.category === "donation") ? (
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">Gratuito (Doação)</span>
          ) : classified.price_cents !== null && classified.price_cents !== undefined ? (
            <>
              <span>{formatMoney(classified.price_cents)}</span>
              {classified.deal_type === "aluguel" && (
                <span className="text-sm font-semibold text-muted-foreground">/mês</span>
              )}
              {(classified.deal_type === "temporada" || niche.id === "equipment") && (
                <span className="text-sm font-semibold text-muted-foreground">/diária</span>
              )}
            </>
          ) : (
            <span className="text-2xl font-bold text-foreground">A Combinar</span>
          )}
        </div>

        {classified.deal_type === "temporada" && classified.cleaning_fee_cents > 0 && (
          <span className="text-xs text-muted-foreground block font-mono">
            + {formatMoney(classified.cleaning_fee_cents)} taxa única de limpeza
          </span>
        )}

        {classified.price_cents && classified.attributes?.accepts_card && (classified.attributes?.max_installments || 12) > 1 && (
          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <CreditCard className="size-3.5 text-primary" />
              <span>ou até <strong>{classified.attributes?.max_installments || 12}x de {formatMoney(Math.round(classified.price_cents / (classified.attributes?.max_installments || 12)))}</strong></span>
            </span>
            <span className="font-semibold text-primary">no cartão</span>
          </div>
        )}
      </div>

      {/* ── 3. Feature Cards Estruturados (Grid de 2 Colunas, Adeus Pills Amontoadas!) ── */}
      {featureCards.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
            Destaques & Especificações
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {featureCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-background border border-border/70 flex items-center gap-3 shadow-2xs hover:border-border transition-colors min-w-0"
                >
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                      {card.title}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-foreground truncate" title={card.value}>
                      {card.value}
                    </span>
                    {card.hint && (
                      <span className="text-[10px] text-muted-foreground truncate">{card.hint}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Formas de Pagamento Estruturadas & Garantia ── */}
      {paymentMethods.length > 0 && (
        <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-2.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
            Formas de Pagamento Aceitas
          </span>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((pm) => {
              const Icon = pm.icon;
              return (
                <div key={pm.id} className="p-2.5 rounded-lg bg-background border border-border/50 flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-md bg-muted/60 flex items-center justify-center text-primary shrink-0">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="font-bold text-xs text-foreground truncate">{pm.label}</span>
                    {pm.badge && <span className="text-[10px] text-muted-foreground truncate">{pm.badge}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {classified.attributes?.cancellation_policy && (
            <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
              <span>Política de Cancelamento: <strong className="text-foreground">{classified.attributes.cancellation_policy}</strong></span>
            </p>
          )}
        </div>
      )}

      {/* ── 5. Autor / Loja / Anunciante Hero Card (Isolamento Estrito Empresa vs Anunciante) ── */}
      {(() => {
        const isCompany = Boolean(classified.store_id && classified.store?.id);
        const sellerName = isCompany ? (classified.store.name || "Loja Oficial") : (author?.full_name || "Anunciante");
        const sellerAvatar = isCompany ? classified.store.logo_url : author?.avatar_url;
        const hideLocation = Boolean(
          classified.attributes?.hide_location ||
          classified.attributes?.hide_address ||
          classified.attributes?.location_privacy === "hidden" ||
          author?.hide_location
        );
        const sellerCity = hideLocation
          ? null
          : isCompany
          ? (classified.store.city ? `${classified.store.city}${classified.store.state ? ` • ${classified.store.state}` : ""}` : (classified.city || "Brasil"))
          : (classified.location_name || classified.city || "Brasil");
        const sellerProfileUrl = isCompany
          ? `/perfil-da-loja?storeId=${classified.store.id}`
          : (author?.id ? `/membro/${author.id}` : null);

        return (
          <div className="p-4 rounded-2xl bg-muted/25 border border-border/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-12 rounded-2xl bg-background border border-border/70 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                {sellerAvatar ? (
                  <img src={sellerAvatar} alt={sellerName} className="size-full object-cover" />
                ) : isCompany ? (
                  <StoreIcon className="size-6 text-muted-foreground" />
                ) : (
                  <User className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black text-sm sm:text-base text-foreground truncate">
                    {sellerName}
                  </span>
                  <CheckCircle2 className="size-4 text-blue-500 shrink-0" title="Verificado Waesy" />
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {sellerCity ? `${sellerCity} • ` : ""}{isCompany ? "Loja Oficial" : "Anunciante Verificado"}
                </span>
              </div>
            </div>

            {sellerProfileUrl && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold h-9 px-3 shrink-0 border-border/80 hover:bg-background"
              >
                <Link to={sellerProfileUrl}>
                  {isCompany ? "Ver Loja" : "Ver Perfil"}
                </Link>
              </Button>
            )}
          </div>
        );
      })()}
    </div>

 {/* Entrega e Download de Produto Digital */}
 {(classified.is_digital || classified.attributes?.is_digital || classified.digital_file_url) && (
   <div className="border border-primary/20 rounded-2xl p-4 bg-primary/5 space-y-3">
     <div className="flex items-center justify-between">
       <div className="flex items-center gap-2 text-xs font-bold text-foreground">
         <FileArchive className="size-4 text-primary" />
         <span>Entrega Digital Imediata</span>
       </div>
       <Badge variant="default" className="text-[10px] font-mono bg-primary text-primary-foreground">
         Download Seguro
       </Badge>
     </div>

     <div className="p-3 rounded-xl bg-background border border-border/60 flex items-center justify-between gap-3">
       <div className="flex items-center gap-2.5 min-w-0 flex-1">
         <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
           <FileArchive className="size-4" />
         </div>
         <div className="min-w-0 flex-1">
           <p className="text-xs font-semibold text-foreground truncate">
             {classified.digital_file_name || classified.attributes?.digital_file_name || "Arquivo Digital (Download Imediato)"}
           </p>
           <p className="text-[10px] text-muted-foreground">
             {classified.digital_file_size_bytes
               ? `${(classified.digital_file_size_bytes / (1024 * 1024)).toFixed(1)} MB • `
               : ""}
             Limite de {classified.download_limit || 5} downloads por comprador
           </p>
         </div>
       </div>

       {(isOwner || !classified.price_cents || classified.price_cents === 0) && (
         <Button
           size="sm"
           onClick={handleDownloadDigitalFile}
           disabled={isDownloadingDigital}
           className="text-xs h-8 gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
         >
           {isDownloadingDigital ? (
             <Loader2 className="size-3.5 animate-spin" />
           ) : (
             <DownloadCloud className="size-3.5" />
           )}
           <span>Baixar</span>
         </Button>
       )}
     </div>

     {classified.digital_preview_url && (
       <div className="pt-1">
         <a
           href={classified.digital_preview_url}
           target="_blank"
           rel="noreferrer"
           className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
         >
           <ExternalLink className="size-3" />
           <span>Acessar demonstração / amostra online</span>
         </a>
       </div>
     )}
   </div>
 )}

  {/* Simulador de Frete & Logística Real (Zero Mock / Baseado em Dados do Anúncio) */}
  {niche.showDeliveryBadges && classified.attributes?.delivery_mode !== "pickup" && (() => {
    const isFreeShipping = Boolean(classified.attributes?.free_shipping || classified.attributes?.free_shipping_local);
    const hasDeliveryFee = Boolean(classified.delivery_fee_cents || classified.attributes?.delivery_fee_cents);
    const deliveryFeeCents = classified.delivery_fee_cents || classified.attributes?.delivery_fee_cents || 0;
    const allowsMotolink = Boolean(Array.isArray(classified.attributes?.service_modes) && classified.attributes?.service_modes.includes("motolink"));

    return (
      <div className="border border-primary/20 rounded-2xl p-4 bg-primary/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Truck className="size-4 text-primary" />
            <span>Condições de Envio & Entrega</span>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
            {isFreeShipping ? "Frete Grátis" : hasDeliveryFee ? "Entrega Disponível" : "A Combinar"}
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs pt-1">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Truck className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">
                  {isFreeShipping
                    ? "Frete Grátis pelo Vendedor"
                    : allowsMotolink
                    ? "Entrega via Motolink / Entregador"
                    : "Entrega Própria / Envio"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {isFreeShipping
                    ? "Sem custo de frete para a região do anúncio"
                    : hasDeliveryFee
                    ? "Taxa fixa de entrega na região"
                    : "Combinar endereço e valor com o vendedor"}
                </p>
              </div>
            </div>
            <span className="font-bold text-xs text-primary font-mono shrink-0 ml-2">
              {isFreeShipping ? "Grátis" : hasDeliveryFee ? formatMoney(deliveryFeeCents) : "A combinar"}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                <Package className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">Retirada no Local</p>
                <p className="text-[10px] text-muted-foreground truncate">Retire no endereço combinado com o anunciante</p>
              </div>
            </div>
            <span className="font-bold text-xs text-emerald-600 font-mono shrink-0 ml-2">
              Grátis
            </span>
          </div>
        </div>
      </div>
    );
  })()}

 {/* Ações de Negociação & Contato */}
 <div className="space-y-3 pt-2">
 {isOwner ? (
 /* Painel de Gestão para o Anunciante Proprietário */
 <div className="p-4 rounded-2xl bg-muted/40 space-y-3">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <ShieldCheck className="size-4 text-primary" />
 <span>Este anúncio pertence a você</span>
 </div>
 <p className="text-[11px] text-muted-foreground">
 Como anunciante, você pode editar informações, pausar o anúncio e acompanhar as
 propostas e reservas recebidas.
 </p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
 {(classified.category === "job" || classified.attributes?.niche === "vaga") && (
 <div className="col-span-2 pb-1">
 <Button
 size="sm"
 onClick={async () => {
 setCandidatesListOpen(true);
 setIsLoadingCandidates(true);
 try {
 const apps = await listClassifiedJobApplications({ data: classified.id });
 setCandidatesList(apps || []);
 } catch (err) {
 toast.error("Erro ao carregar lista de candidatos.");
 } finally {
 setIsLoadingCandidates(false);
 }
 }}
 className="w-full rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground gap-2"
 >
 <Users className="size-3.5" />
 <span>Gerenciar Candidatos Inscritos</span>
 </Button>
 </div>
 )}
 <Button
 asChild
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-bold h-9"
 >
 <Link
 to="/conta/classificados/novo"
 search={{ editId: classified.id } as any}
 >
 <Edit3 className="size-3.5 mr-1" />
 Editar Anúncio
 </Link>
 </Button>
 <Button
 asChild
 size="sm"
 className="rounded-xl text-xs font-bold h-9 bg-foreground text-background"
 >
 <Link to="/conta/negociacoes">
 <Handshake className="size-3.5 mr-1" />
 Ver Propostas
 </Link>
 </Button>
 </div>
 </div>
 ) : (classified.category === "job" || classified.attributes?.niche === "vaga") ? (
 /* Bloco Especial de Candidatura à Vaga */
 <div className="space-y-3">
 <Button
 size="lg"
 onClick={() => setApplyModalOpen(true)}
 className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground gap-2 text-sm shadow-md hover:bg-primary/90 transition-all cursor-pointer"
 >
 <Briefcase className="size-5" />
 <span>Candidatar-se à Vaga</span>
 </Button>

 {(classified.contact_whatsapp || classified.whatsapp || classified.profiles?.phone) && (
                    <ProtectedContactButton
                      phone={classified.contact_whatsapp || classified.whatsapp || classified.profiles?.phone}
                      entityType="job"
                      entityId={classified.id}
                      entityTitle={classified.title}
                      storeId={(classified as any).store_id || null}
                      niche={classified.category || "empregos"}
                      customMessage={`Olá! Vi a oportunidade de "${classified.title}" no portal Waesy e gostaria de me candidatar.`}
                      variant="outline"
                      size="lg"
                      label="Falar com o Recrutador via WhatsApp"
                      className="w-full h-11 rounded-xl font-semibold text-xs border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                    />
                  )}
 </div>
              ) : classified.deal_type === "temporada" ? (
                /* Bloco de Reserva Direta de Hospedagem / Diárias */
                <div className="space-y-3">
                  <Button
                    size="lg"
                    onClick={() => setBookingOpen(true)}
                    className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground gap-2 text-sm shadow-xs cursor-pointer"
                  >
                    <Calendar className="size-5" />
                    <span>Reservar Diárias</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProposalOpen(true)}
                    className="w-full h-10 rounded-xl font-bold text-xs gap-1.5 cursor-pointer"
                  >
                    <Handshake className="size-4 text-muted-foreground" />
                    <span>Fazer Oferta Especial / Negociar</span>
                  </Button>
                </div>
              ) : (classified.category === "service" || classified.booking_enabled || classified.attributes?.booking_enabled) ? (
    /* Bloco Especial de Agendamento de Serviço Profissional */
    <div className="space-y-3">
      <Dialog open={serviceBookingOpen} onOpenChange={setServiceBookingOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground gap-2 text-sm shadow-md hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Calendar className="size-5" />
            <span>Agendar Atendimento</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md sm:rounded-2xl">
          {viewerContext === "anonymous" ? (
            <div className="text-center py-6 space-y-4">
              <Calendar className="size-10 text-primary mx-auto" />
              <div className="space-y-1">
                <DialogTitle className="text-lg font-bold">
                  Identifique-se para agendar
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Faça login na sua conta Waesy para solicitar o agendamento com segurança e garantias regionais.
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
                  <Calendar className="size-5 text-primary" />
                  Agendar Atendimento
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Escolha o dia, horário e modalidade para solicitar o atendimento com {author?.full_name || "o profissional"}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Data Desejada *</label>
                    <Input
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Horário Estimado *</label>
                    <select
                      value={serviceTime}
                      onChange={(e) => setServiceTime(e.target.value)}
                      className="w-full h-10 rounded-xl text-xs bg-background border border-border px-3 font-mono"
                    >
                      {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Modalidade de Atendimento</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { id: "presencial", label: "No Local" },
                      { id: "domicilio", label: "A Domicílio" },
                      { id: "remoto", label: "Online" },
                    ].map((mod) => (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setServiceLocationType(mod.id as any)}
                        className={`py-2 px-1 rounded-xl border text-center font-medium transition-all ${
                          serviceLocationType === mod.id
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                            : "bg-background border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mod.label}
                      </button>
                    ))}
                  </div>
                </div>

                {serviceLocationType === "domicilio" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Endereço de Atendimento *</label>
                    <Input
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                      placeholder="Rua, número, bairro..."
                      className="h-10 rounded-xl text-xs bg-background"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Detalhes do que você precisa</label>
                  <Textarea
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    placeholder="Descreva o que precisa ser feito no atendimento..."
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

                {classified.price_cents && classified.price_cents > 0 ? (
                  <div className="p-3.5 rounded-xl bg-muted/40 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Valor Estimado do Atendimento:</span>
                    <span className="font-bold text-sm text-primary font-mono">{formatMoney(classified.price_cents)}</span>
                  </div>
                ) : null}

                <Button
                  onClick={handleBookService}
                  disabled={isBookingService}
                  className="w-full h-11 rounded-xl text-xs font-bold gap-2"
                >
                  {isBookingService ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Enviando Solicitação...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Confirmar Solicitação de Agendamento</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {(classified.contact_whatsapp || classified.whatsapp || classified.profiles?.phone) && (
        <ProtectedContactButton
          phone={classified.contact_whatsapp || classified.whatsapp || classified.profiles?.phone}
          entityType="classified"
          entityId={classified.id}
          entityTitle={classified.title}
          storeId={(classified as any).store_id || null}
          niche={classified.category || "service"}
          customMessage={`Olá! Vi o seu serviço "${classified.title}" no portal Waesy e gostaria de tirar dúvidas sobre atendimento.`}
          variant="outline"
          size="lg"
          label="Falar com o Prestador via WhatsApp"
          className="w-full h-11 rounded-xl font-semibold text-xs border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
        />
      )}
    </div>
  ) : (
    /* Bloco de Compra / Negociação para Venda, Aluguel e Outros Itens */
    <div className="space-y-3">
      {/* Botão Primário Semântico adaptado ao nicho */}
      {niche.id === "donation" ? (
        <div className="space-y-2">
          <Button
            size="lg"
            onClick={() => setProposalOpen(true)}
            className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-sm shadow-xs cursor-pointer"
          >
            <HeartHandshake className="size-5" />
            <span>Solicitar Doação / Combinar Retirada</span>
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Item 100% gratuito. Combine a retirada com o doador.
          </p>
        </div>
      ) : niche.id === "goods" && classified.price_cents && classified.price_cents > 0 ? (
        <Button
          onClick={handleDirectBuy}
          disabled={isBuyingDirect}
          size="lg"
          className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground gap-2 text-sm"
        >
          {isBuyingDirect ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span>Processando Compra Segura...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="size-5" />
              <span>Comprar com Segurança por {formatMoney(classified.price_cents)}</span>
            </>
          )}
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={() => setProposalOpen(true)}
          className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground gap-2 text-sm shadow-xs cursor-pointer"
        >
          <niche.icon className="size-5" />
          <span>{niche.primaryActionLabel}</span>
        </Button>
      )}

      {/* Botão Fazer Proposta / Negociar (Oculto em Doações Solidárias) */}
      {niche.id !== "donation" && (
        <Button
          variant={classified.price_cents ? "outline" : "default"}
          size="lg"
          onClick={() => setProposalOpen(true)}
          className={`w-full ${classified.price_cents ? "h-10 text-xs" : "h-12 text-sm"} rounded-xl font-bold gap-2 cursor-pointer`}
        >
          <Handshake className="size-4" />
          <span>Fazer Proposta / Negociar Valor</span>
        </Button>
      )}
    </div>
  )}

  {/* Botão de WhatsApp Rastreado */}
  {cleanPhone && (
    <ProtectedContactButton
      phone={cleanPhone}
      entityType="classified"
      entityId={classified.id}
      entityTitle={classified.title}
      storeId={(classified as any).store_id || null}
      niche={classified.category || "classificados"}
      variant="outline"
      size="lg"
      label="Conversar no WhatsApp"
      className="w-full h-11 font-bold border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs"
    />
  )}
  </div>

  {/* Dica de Segurança */}
  <div className="bg-muted/30 rounded-xl p-3.5 flex gap-3 text-xs text-muted-foreground">
    <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
    <div className="space-y-0.5">
      <p className="font-semibold text-foreground">Negociação Segura</p>
      <p>
        Prefira encontros em locais públicos e formalize acordos de valor via proposta na
        Waesy.
      </p>
    </div>
  </div>
  </div>
  </div>
  </div>

  {/* Modal Fullscreen de Imagem */}
  {fullscreenImage && (
    <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
      <DialogContent className="sm:max-w-4xl p-2 bg-black border-none sm:rounded-2xl overflow-hidden">
        <img
          src={fullscreenImage}
          alt="Visualização cheia"
          className="w-full h-auto max-h-[85vh] object-contain rounded-xl mx-auto"
        />
      </DialogContent>
    </Dialog>
  )}

  {/* Modais Compartilhados de Reserva e Negociação */}
  {renderBookingDialog()}
  {renderProposalDialog()}
  </div>
  );
}
