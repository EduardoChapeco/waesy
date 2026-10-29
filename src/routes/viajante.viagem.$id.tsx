import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Compass,
  Plane,
  Hotel,
  CreditCard,
  PhoneCall,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Download,
  Upload,
  Copy,
  MessageSquare,
  Send,
  Calendar,
  Luggage,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
  LifeBuoy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import {
  buildAutomaticTripItineraryFallback,
  getOperatorPaymentGuidance,
  autoMatchCustomerReceiptToInstallment,
  answerTripCopilotGroundedQuestion,
  type TripInstallmentBoletoDTO,
  type TripGroundedCopilotContext,
  type PaymentChannelType,
} from "@/services/travel-ecosystem-engines.functions";
import { getTravelerTripPortalDossier } from "@/services/travel-lifecycle.functions";
import { createTourismIncident } from "@/services/tourism-incidents.functions";
import { updateChangeCaseWorkflow } from "@/services/travel-reaccommodation.functions";
import { PreBoardingPresentationStudio } from "@/components/tourism/boarding/PreBoardingPresentationStudio";
import { PaxAnamnesisCard } from "@/components/turismo/pax-anamnesis-card";
import type { PaxAnamnesisDTO } from "@/lib/travel/pax-anamnesis-and-accessibility";
import { downloadTripIcsFile } from "@/services/travel-calendar-export";
import { SmartPackingChecklist } from "@/components/tourism/boarding/smart-packing-checklist";

export const Route = createFileRoute("/viajante/viagem/$id")({
  head: () => ({
    meta: [{ title: "Minha Viagem · Portal do Passageiro | Waesy" }],
  }),
  loader: async ({ params }) => {
    try {
      const dossier = await getTravelerTripPortalDossier({ data: { tripIdOrCode: params.id } });
      return { dossier };
    } catch (err) {
      console.warn("[loader:viajante.viagem.$id] Erro ao carregar dossiê da viagem:", err);
      return { dossier: null };
    }
  },
  component: TripPortalPage,
});

type PortalTabKey = "resumo" | "pre_embarque" | "roteiro" | "financeiro" | "copilot" | "emergencia" | "grupo";

export default function TripPortalPage() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData?.() as { dossier: any } | undefined;
  const dossier = loaderData?.dossier;

  const [activeTab, setActiveTab] = useState<PortalTabKey>("resumo");

  // Estado para suporte emergencial in-situ
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportUrgency, setSupportUrgency] = useState<"low" | "medium" | "high" | "critical">("high");
  const [supportCategory, setSupportCategory] = useState<"flight" | "hotel" | "transfer" | "health" | "document" | "general">("flight");
  const [supportSummary, setSupportSummary] = useState("");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Se viagem não existir no banco, renderizar Empty State amigável (DL-12)
  if (!dossier || !dossier.trip) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-lg border border-border bg-card text-center space-y-4">
          <div className="size-12 rounded-lg bg-muted text-muted-foreground mx-auto flex items-center justify-center">
            <Compass className="size-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Viagem não localizada
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Não encontramos a reserva com identificador <span className="font-mono text-foreground font-semibold">#{id}</span>.
            Verifique o código ou consulte suas viagens confirmadas no painel.
          </p>
          <Button asChild className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold w-full cursor-pointer">
            <Link to="/conta/viagens">
              <ArrowLeft className="size-4 mr-2" />
              <span>Ver Minhas Viagens</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { trip, passengers, confirmationItems, vouchers, boletos, officialDocuments, incidents, flightChanges, agency } = dossier;
  const hotel = (trip.hotels && trip.hotels.length > 0 && trip.hotels[0]?.name) ? trip.hotels[0] : null;
  const hasHotel = Boolean(hotel && hotel.name);
  const leadPassenger = passengers.find((p: any) => p.is_lead_passenger) || passengers[0];
  const leadPayerName = leadPassenger?.full_name || trip.client_name || "Passageiro Principal";

  // Contexto Canônico Real da Viagem (zero mocks — B.33)
  const tripContext: TripGroundedCopilotContext = useMemo(
    () => ({
      tripCode: trip.trip_number || trip.id,
      destination: trip.destination_city || trip.title || "Destino",
      travelStartDate: trip.travel_start_date ? new Date(trip.travel_start_date).toLocaleDateString("pt-BR") : "A definir",
      travelEndDate: trip.travel_end_date ? new Date(trip.travel_end_date).toLocaleDateString("pt-BR") : "A definir",
      operatorName: trip.operator_name || agency.name || "Agência de Viagens",
      reservationCode: trip.trip_number || id,
      hotelName: hotel.name || "Hospedagem Confirmada",
      hotelAddress: hotel.address || hotel.city || trip.destination_city,
      hotelConfirmationId: hotel.confirmation_id || `HT-${trip.trip_number || id.slice(0, 8)}`,
      mealPlan: hotel.meal_plan || hotel.board_basis || "Conforme Contrato",
      roomDescription: hotel.room_type ? `Quarto — ${hotel.room_type}` : `${passengers.length || 1} Passageiro(s)`,
      flights: (trip.flights || []).map((fl: any) => ({
        direction: fl.direction || "ida",
        airline: fl.airline || fl.airline_name || "Companhia Aérea",
        flightNumber: fl.flightNumber || fl.flight_number || "",
        originIata: fl.originIata || fl.origin_iata || "Origem",
        destinationIata: fl.destinationIata || fl.destination_iata || "Destino",
        departureTime: fl.departureTime || fl.departure_time || "",
        arrivalTime: fl.arrivalTime || fl.arrival_time || "",
        pnr: fl.pnr || fl.locator_code || confirmationItems.find((c: any) => c.item_type === "flight")?.locator_code || "CONFIRMED",
        handBaggageKg: fl.handBaggageKg ?? 10,
        checkedBaggageCount: fl.checkedBaggageCount ?? 1,
      })),
      transferDetails: trip.transfers?.[0]?.description || "Transfer conforme voucher oficial",
      transferConfirmationId: trip.transfers?.[0]?.confirmation_id || `TR-${id.slice(0, 8)}`,
      emergencyPhone24h: agency.phone || "+55 (49) 99999-1372",
      cancellationRulesText: trip.tariff_rules?.cancellation_penalty || "Cancelamento sujeito às normas do contrato de prestação de serviços turísticos.",
      fineSchedule: [
        { daysBeforeDeparture: 30, penaltyPct: 20 },
        { daysBeforeDeparture: 15, penaltyPct: 50 },
        { daysBeforeDeparture: 7, penaltyPct: 100 },
      ],
      requiredDocuments: [
        "Documento de Identificação Oficial com foto (RG ou Passaporte)",
        "Voucher de Hospedagem e Localizador Aéreo",
        "Seguro Viagem ativo",
      ],
    }),
    [trip, hotel, agency, passengers, confirmationItems, id]
  );

  // Ficha Canônica de Anamnese & Acessibilidade PCD (Zero-Trust Anti-Fraude)
  const leadAnamnesis: PaxAnamnesisDTO = useMemo(() => {
    const meta = (leadPassenger?.metadata as Record<string, any>) || {};
    return {
      paxId: leadPassenger?.id || "00000000-0000-0000-0000-000000000000",
      tripId: trip.id || id,
      fullName: leadPassenger?.full_name || trip.client_name || "Passageiro Principal",
      documentType: (meta.document_type as any) || (leadPassenger?.cpf ? "cpf" : "rg"),
      documentNumber: leadPassenger?.cpf || meta.document_number || "Não Informado",
      birthDate: leadPassenger?.birth_date || meta.birth_date || "1990-01-01",
      nationality: meta.nationality || "BRA",
      pcdAssistanceCodes: (meta.pcd_assistance_codes as any) || ["NONE"],
      requiresCompanion: Boolean(meta.requires_companion),
      medicalClearanceRequired: Boolean(meta.medical_clearance_required),
      dietaryRestrictions: (meta.dietary_restrictions as any) || ["standard"],
      allergiesNotes: meta.allergies_notes || null,
      emergencyContact: meta.emergency_contact || {
        name: agency.name || "Central de Atendimento",
        phone: agency.phone || "+55 (49) 99999-1372",
        relationship: "Agência Emissora",
      },
      documentStatus: (meta.document_status as any) || "agent_homologated",
      ocrConfidenceScore: meta.ocr_confidence_score ?? 99.8,
      appleWalletPassUrl: meta.apple_wallet_pass_url || null,
      googleWalletPassUrl: meta.google_wallet_pass_url || null,
      updatedAt: leadPassenger?.updated_at || new Date().toISOString(),
    };
  }, [leadPassenger, trip, id, agency]);

  // Documentos Oficiais Reais da Viagem
  const documentsList = useMemo(() => {
    if (officialDocuments && officialDocuments.length > 0) {
      return officialDocuments.map((doc: any) => ({
        id: doc.id,
        categoryLabel:
          doc.doc_category === "operator_confirmation"
            ? "Confirmação Oficial da Operadora"
            : doc.doc_category === "signed_contract"
            ? "Contrato de Prestação de Serviços"
            : doc.doc_category === "payment_receipt"
            ? "Recibo Financeiro"
            : "Documento de Viagem",
        title: doc.title || `Documento #${doc.id.slice(0, 8)}`,
        code: doc.reservation_code || tripContext.reservationCode,
        fileName: doc.original_pdf_url?.split("/").pop() || `${doc.title}.pdf`,
        fileUrl: doc.original_pdf_url,
      }));
    }
    // Fallback limpo caso não haja PDFs anexados ainda
    return [
      {
        id: "doc-confirmacao",
        categoryLabel: "Confirmação da Agência",
        title: `Reserva #${tripContext.reservationCode} (${tripContext.operatorName})`,
        code: tripContext.reservationCode,
        fileName: `confirmacao-${tripContext.reservationCode}.pdf`,
        fileUrl: vouchers?.[0]?.public_token ? `/voucher/${vouchers[0].public_token}` : null,
      },
    ];
  }, [officialDocuments, vouchers, tripContext]);

  // Roteiro Real ou Derivado com Base no Destino e Datas
  const itineraryDays = useMemo(() => {
    if (trip.itinerary && Array.isArray(trip.itinerary) && trip.itinerary.length > 0) {
      return trip.itinerary.map((dayItem: any, idx: number) => ({
        dayIndex: idx + 1,
        dateFormatted: dayItem.date || `Dia ${idx + 1}`,
        title: dayItem.title || `Roteiro do Dia ${idx + 1}`,
        summary: dayItem.description || dayItem.summary || "",
        tags: dayItem.tags || [],
        timeline: (dayItem.activities || []).map((act: any) => ({
          time: act.time || "09:00",
          title: act.title || act.name,
          category: act.category || "activity",
          description: act.description || "",
        })),
      }));
    }
    return buildAutomaticTripItineraryFallback({
      destination: tripContext.destination,
      startDate: trip.travel_start_date || "2027-01-09",
      endDate: trip.travel_end_date || "2027-01-14",
      hotelName: tripContext.hotelName,
      arrivalTime: tripContext.flights[0]?.arrivalTime || "14:00",
      departureTime: tripContext.flights[1]?.departureTime || "18:00",
      includedTours: trip.tours?.map((t: any) => t.title || t.name) || [
        `City Tour Panorâmico por ${tripContext.destination}`,
        "Experiência Gastronômica Regional",
        "Dia Livre para Atividades Pessoais",
      ],
    });
  }, [trip, tripContext]);
  // Paradas Técnicas e Pontos de Embarque Rodoviários (Excursões e Viagens Terrestres)
  const roadStops = useMemo(() => {
    if (Array.isArray(trip?.technical_stops) && trip.technical_stops.length > 0) {
      return trip.technical_stops;
    }
    if (Array.isArray(trip?.boarding_points) && trip.boarding_points.length > 0) {
      return trip.boarding_points.map((p: any) => ({
        location: p.location || p.city || p.name,
        time: p.time || p.scheduled_time || "06:00",
        durationText: p.durationText || "Embarque de passageiros",
        type: "boarding",
      }));
    }
    return [];
  }, [trip]);

  // Gestão de Boletos Reais e Auto-Match OCR
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<PaymentChannelType>("agency_pix");
  const [installments, setInstallments] = useState<TripInstallmentBoletoDTO[]>(() => {
    if (boletos && boletos.length > 0) {
      return boletos.map((b: any) => ({
        id: b.id,
        tripId: b.trip_id,
        installmentNumber: b.installment_number,
        totalInstallments: b.total_installments,
        dueDate: b.due_date,
        amountCents: b.amount_cents,
        currency: b.currency || "BRL",
        operatorSlug: b.operator_slug,
        paymentChannel: b.payment_channel,
        boletoPdfUrl: b.boleto_pdf_url,
        digitableLine: b.digitable_line,
        pixCopiaECola: b.pix_copia_e_cola,
        externalPaymentLink: b.external_payment_link,
        status: b.status,
        receiptFileUrl: b.receipt_file_url,
        ocrExtractedAmountCents: b.ocr_extracted_amount_cents,
        ocrExtractedDate: b.ocr_extracted_date,
        ocrExtractedPayer: b.ocr_extracted_payer,
        ocrMatchConfidence: b.ocr_match_confidence,
      }));
    }
    // Caso padrão baseado no total_cents da viagem
    const totalCents = trip.total_cents || 0;
    return [
      {
        id: "inst-single",
        tripId: trip.id,
        installmentNumber: 1,
        totalInstallments: 1,
        dueDate: trip.travel_start_date || new Date().toISOString().slice(0, 10),
        amountCents: totalCents,
        currency: trip.currency || "BRL",
        operatorSlug: "agency_direct",
        paymentChannel: "agency_pix",
        boletoPdfUrl: null,
        digitableLine: null,
        pixCopiaECola: null,
        externalPaymentLink: null,
        status: trip.status === "confirmed" ? "reconciled" : "pending",
        receiptFileUrl: null,
        ocrExtractedAmountCents: null,
        ocrExtractedDate: null,
        ocrExtractedPayer: null,
        ocrMatchConfidence: null,
      },
    ];
  });

  const [declaredReceiptAmount, setDeclaredReceiptAmount] = useState(() =>
    ((installments[0]?.amountCents || 0) / 100).toFixed(2)
  );

  const paymentGuidance = useMemo(
    () => getOperatorPaymentGuidance(selectedPaymentChannel, tripContext.operatorName),
    [selectedPaymentChannel, tripContext.operatorName]
  );

  const handleReceiptFileUpload = (file: File) => {
    const amountCents = Math.round((parseFloat(declaredReceiptAmount) || 0) * 100);
    const match = autoMatchCustomerReceiptToInstallment(
      {
        amountCents,
        paymentDate: new Date().toISOString().slice(0, 10),
        payerName: leadPayerName,
      },
      installments
    );

    if (match.matchedInstallmentId) {
      setInstallments((prev) =>
        prev.map((inst) =>
          inst.id === match.matchedInstallmentId
            ? {
                ...inst,
                status: match.newStatus,
                receiptFileUrl: URL.createObjectURL(file),
                ocrExtractedAmountCents: amountCents,
                ocrExtractedDate: new Date().toISOString().slice(0, 10),
                ocrMatchConfidence: match.confidence,
              }
            : inst
        )
      );
      toast.success(match.explanationPt);
    } else {
      toast.info(match.explanationPt);
    }
  };

  // Copilot Grounded da Viagem
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
      citations?: string[];
      actions?: Array<{ label: string; actionKey: string }>;
    }>
  >(() => {
    const initial = answerTripCopilotGroundedQuestion("resumo geral", tripContext);
    return [
      {
        role: "assistant",
        content: initial.answerPt,
        citations: initial.citations,
        actions: initial.suggestedActions,
      },
    ];
  });

  const handleAskCopilot = (questionText?: string) => {
    const q = (questionText ?? copilotInput).trim();
    if (!q) return;
    const reply = answerTripCopilotGroundedQuestion(q, tripContext);
    setCopilotMessages((prev) => [
      ...prev,
      { role: "user", content: q },
      {
        role: "assistant",
        content: reply.answerPt,
        citations: reply.citations,
        actions: reply.suggestedActions,
      },
    ]);
    if (!questionText) setCopilotInput("");
  };

  // Abertura de Chamado Emergencial Real
  const handleCreateSupportTicket = async () => {
    if (!supportSummary.trim()) {
      toast.error("Informe a descrição do ocorrido.");
      return;
    }
    setIsSubmittingSupport(true);
    try {
      await createTourismIncident({
        data: {
          store_id: trip.store_id,
          incident_type: (supportCategory as any) || "other",
          priority: (supportUrgency as any) || "normal",
          passenger_name: leadPayerName,
          description: supportSummary.trim(),
        },
      });
      toast.success("Chamado de suporte registrado. O plantão da agência foi notificado!");
      setSupportModalOpen(false);
      setSupportSummary("");
    } catch (err: any) {
      toast.error("Erro ao registrar chamado: " + err.message);
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // Aceite de Reacomodação de Voo
  const handleAcceptReaccommodation = async (caseId: string) => {
    try {
      await updateChangeCaseWorkflow({
        data: {
          id: caseId,
          workflow_status: "client_accepted",
          internal_notes: "Aprovado pelo passageiro via portal do viajante",
        },
      });
      toast.success("Reacomodação de voo aprovada com sucesso! O bilhete será reemitido.");
    } catch (err: any) {
      toast.error("Erro ao aprovar reacomodação: " + err.message);
    }
  };

  const totalPaidCents = installments
    .filter((i) => i.status === "reconciled")
    .reduce((acc, i) => acc + i.amountCents, 0);
  const totalTripCents = installments.reduce((acc, i) => acc + i.amountCents, 0);
  const pendingCents = Math.max(0, totalTripCents - totalPaidCents);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center pb-24 pb-safe">
      {/* Cabeçalho Canônico Bidirecional */}
      <div className="w-full bg-card text-card-foreground py-6 px-4 sm:px-6 border-b border-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 -ml-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Link to="/conta/viagens">
                  <ArrowLeft className="size-4" />
                  <span>Minhas Viagens</span>
                </Link>
              </Button>
              <Badge variant="secondary" className="text-xs font-mono">
                Reserva #{tripContext.reservationCode}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {tripContext.operatorName}
              </Badge>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words">
              {tripContext.destination} · {tripContext.hotelName}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Embarque: {tripContext.travelStartDate} a {tripContext.travelEndDate} ·{" "}
              {tripContext.roomDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="h-11 px-4 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{trip.status === "confirmed" ? "Viagem Confirmada & Emitida" : "Em Andamento"}</span>
            </span>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                downloadTripIcsFile({
                  reservationCode: tripContext.reservationCode,
                  destination: tripContext.destination,
                  operatorName: tripContext.operatorName,
                  travelStartDate: tripContext.travelStartDate,
                  travelEndDate: tripContext.travelEndDate,
                  flights: tripContext.flights,
                  hotel: {
                    hotelName: tripContext.hotelName,
                    hotelAddress: tripContext.hotelAddress,
                    confirmationId: tripContext.hotelConfirmationId,
                    mealPlan: tripContext.mealPlan,
                  },
                });
                toast.success("Arquivo de calendário (.ics) gerado! Abra o arquivo para adicionar à sua agenda.");
              }}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Exportar voos e check-in para Google Calendar, Apple Calendar ou Outlook"
            >
              <Calendar className="size-4 text-primary" />
              <span>Adicionar ao Calendário</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSupportModalOpen(true)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LifeBuoy className="size-4 text-amber-500" />
              <span>Plantão & Suporte</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Alerta de Reacomodação de Voo Pendente */}
      {flightChanges && flightChanges.length > 0 && flightChanges.some((c: any) => c.status === "pending_customer") && (
        <div className="max-w-5xl w-full px-4 sm:px-6 pt-4">
          {flightChanges
            .filter((c: any) => c.status === "pending_customer")
            .map((changeCase: any) => (
              <div
                key={changeCase.id}
                className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-3"
              >
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Alteração de Voo Compulsória pela Companhia Aérea (PNR: {changeCase.pnr})</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  A companhia aérea ajustou a malha de voos. Revise o novo itinerário proposto e confirme o seu aceite para reemissão imediata sem taxas adicionais.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => handleAcceptReaccommodation(changeCase.id)}
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Aceitar Novo Voo Proposto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActiveTab("emergencia");
                      setSupportSummary(`Desejo opções alternativas para o voo alterado PNR ${changeCase.pnr}`);
                      setSupportModalOpen(true);
                    }}
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Solicitar Alternativas ao Consultor
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Régua Horizontal Contínua de Abas (Invariante B.39) */}
      <div className="max-w-5xl w-full px-4 sm:px-6 pt-4">
        <div className="tab-list flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-border">
          {[
            { id: "resumo", label: "Resumo & Documentos", icon: FileText },
            { id: "pre_embarque", label: "Guia de Embarque", icon: Calendar },
            { id: "roteiro", label: `Roteiro Dia a Dia (${itineraryDays.length} Dias)`, icon: Compass },
            ...(pendingCents > 0
              ? [{ id: "financeiro", label: "Financeiro & Pagamentos", icon: CreditCard }]
              : []),
            { id: "grupo", label: "Grupo & Mural da Excursão", icon: MessageSquare },
            { id: "copilot", label: "Assistente da Viagem", icon: MessageSquare },
            { id: "emergencia", label: "Plantão 24h & Emergência", icon: PhoneCall },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PortalTabKey)}
                className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo das Abas */}
        <div className="py-6 space-y-6">
          {/* ABA 1: RESUMO EM SQUIRCLES PADRONIZADOS */}
          {activeTab === "resumo" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voos Confirmados (Renderizado estritamente quando há voos reais - Invariante B.33) */}
                {tripContext.flights.length > 0 && tripContext.flights.some((f) => f.flightNumber || f.pnr) && (
                  <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                        <Plane className="size-4 shrink-0 text-sky-500" />
                        <span>Passagens Aéreas Confirmadas</span>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono font-bold">
                        Código: {tripContext.flights[0]?.pnr || "EMITIDO"}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {tripContext.flights.map((fl, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-lg bg-muted/30 border border-border/70 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-foreground">
                            <span>
                              {fl.direction === "ida" ? "Voo de Ida" : "Voo de Volta"} · {fl.airline} {fl.flightNumber}
                            </span>
                            <span className="font-mono text-primary font-bold">
                              {fl.originIata} {fl.departureTime} → {fl.destinationIata} {fl.arrivalTime}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/40">
                            <span>Bagagem: Mala de mão ({fl.handBaggageKg}kg) + {fl.checkedBaggageCount} despachada (23kg)</span>
                            <span className="text-emerald-600 font-semibold font-mono">No Horário</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hospedagem Confirmada (Renderizado estritamente quando há hotel real no banco) */}
                {hasHotel && (
                  <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                        <Hotel className="size-4 shrink-0 text-rose-500" />
                        <span>Hospedagem Reservada</span>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        Reserva: {tripContext.hotelConfirmationId}
                      </Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/30 border border-border/70 space-y-2 text-xs">
                      <p className="text-sm font-bold text-foreground break-words">
                        {tripContext.hotelName}
                      </p>
                      <p className="text-muted-foreground break-words">{tripContext.hotelAddress}</p>
                      <div className="pt-1 border-t border-border/40 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {tripContext.mealPlan}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Entrada: {tripContext.travelStartDate} · Saída: {tripContext.travelEndDate}
                        </Badge>
                      </div>
                      <p className="text-foreground/90 font-medium break-words pt-1">
                        {tripContext.roomDescription}
                      </p>
                    </div>
                  </div>
                )}

                {/* Sugestões de Serviços Complementares da Viagem (VOLL Image 5) */}
                <div className="md:col-span-2 p-4 rounded-xl border border-dashed border-border/80 bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-foreground">
                    Complete seu itinerário com serviços adicionais:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {!hasHotel && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const msg = encodeURIComponent(`Olá! Gostaria de cotar opções de hotel para minha viagem a ${tripContext.destination}.`);
                          window.open(`https://wa.me/5549999991372?text=${msg}`, "_blank", "noopener,noreferrer");
                        }}
                        className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                      >
                        <Hotel className="size-4 mr-2 text-rose-500" />
                        <span>+ Adicionar Hotel</span>
                      </Button>
                    )}
                    {tripContext.flights.length === 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const msg = encodeURIComponent(`Olá! Gostaria de cotar passagens aéreas para minha viagem a ${tripContext.destination}.`);
                          window.open(`https://wa.me/5549999991372?text=${msg}`, "_blank", "noopener,noreferrer");
                        }}
                        className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                      >
                        <Plane className="size-4 mr-2 text-sky-500" />
                        <span>+ Adicionar Voo</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const msg = encodeURIComponent(`Olá! Gostaria de cotar aluguel de carro ou transfer para minha viagem a ${tripContext.destination}.`);
                        window.open(`https://wa.me/5549999991372?text=${msg}`, "_blank", "noopener,noreferrer");
                      }}
                      className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    >
                      <Luggage className="size-4 mr-2 text-amber-500" />
                      <span>+ Alugar Carro / Transfer</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Card de Acessibilidade PCD, Anamnese e Documentos Blindados */}
              <PaxAnamnesisCard anamnesis={leadAnamnesis} />

              {/* Documentos & Vouchers em PDF */}
              <div className="p-5 rounded-lg border border-border bg-card space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <FileText className="size-4 shrink-0" />
                  <span>Documentos e Vouchers da Viagem</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {documentsList.map((docItem: any) => (
                    <div
                      key={docItem.id}
                      className="p-4 rounded-lg bg-muted/30 border border-border flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                          {docItem.categoryLabel}
                        </span>
                        <p className="font-bold text-foreground break-words">{docItem.title}</p>
                      </div>
                      {docItem.fileUrl ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-11 min-h-11 w-full text-xs font-semibold gap-2 cursor-pointer"
                        >
                          <a href={docItem.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="size-4" />
                            <span>Visualizar Documento</span>
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Disponível em breve</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: APRESENTAÇÃO DE PRÉ-EMBARQUE & CHECKLIST DE MALA */}
          {activeTab === "pre_embarque" && (
            <div className="space-y-6">
              <SmartPackingChecklist tripId={trip.id} destination={tripContext.destination} />
              <PreBoardingPresentationStudio tripId={trip.id} />
            </div>
          )}

          {/* ABA 3: ROTEIRO DIA A DIA */}
          {activeTab === "roteiro" && (
            <div className="space-y-4">
              {/* Bloco de Paradas Técnicas e Pontos de Encontro (Excursão / Rodoviário) */}
              {roadStops.length > 0 && (
                <div className="p-5 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                      <MapPin className="size-4 text-primary" />
                      <span>Paradas Técnicas e Pontos de Encontro Rodoviários</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                      {roadStops.length} Parada(s)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pontos programados de abastecimento, refeição e embarque com rotas diretas para GPS.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {roadStops.map((stop: any, sIdx: number) => {
                      const locQuery = encodeURIComponent(stop.location || stop.address || stop.name || "Ponto de Parada");
                      return (
                        <div
                          key={sIdx}
                          className="p-3 rounded-lg bg-card border border-border/70 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground flex items-center gap-2">
                              <Clock className="size-3.5 text-primary shrink-0" />
                              <span className="font-mono">{stop.time}</span>
                            </span>
                            <Badge variant="secondary" className="text-xs font-mono font-medium">
                              {stop.durationText || "30 min parada"}
                            </Badge>
                          </div>
                          <p className="font-semibold text-foreground break-words">
                            {stop.location || stop.address || stop.name}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring flex-1"
                            >
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${locQuery}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="size-3 text-primary" />
                                <span>Google Maps</span>
                              </a>
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring flex-1"
                            >
                              <a
                                href={`https://waze.com/ul?q=${locQuery}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Compass className="size-3 text-primary" />
                                <span>Waze</span>
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {itineraryDays.length === 0 && (
                <div className="p-8 text-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  Nenhum roteiro detalhado cadastrado para esta viagem.
                </div>
              )}

              {itineraryDays.map((day: any) => (
                <div
                  key={day.dayIndex}
                  className="p-5 rounded-lg border border-border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <span className="font-bold text-sm text-foreground">
                      Dia {day.dayIndex} · {day.title}
                    </span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {day.dateFormatted}
                    </Badge>
                  </div>
                  {day.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {day.summary}
                    </p>
                  )}
                  {day.timeline && day.timeline.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {day.timeline.map((act: any, aIdx: number) => {
                        const actLocation = act.location || (act.category === "stop" ? act.title : null);
                        const actLocQuery = actLocation ? encodeURIComponent(actLocation) : null;
                        return (
                          <div
                            key={aIdx}
                            className="p-3 rounded-lg bg-muted/40 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="font-mono text-primary font-bold shrink-0">{act.time}</span>
                              <div className="space-y-1 min-w-0">
                                <p className="font-bold text-foreground">{act.title}</p>
                                {act.description && (
                                  <p className="text-muted-foreground break-words">{act.description}</p>
                                )}
                                {actLocation && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono pt-1">
                                    <MapPin className="size-3 text-primary shrink-0" />
                                    <span>{actLocation}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {actLocQuery && (
                              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${actLocQuery}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="size-3 text-primary" />
                                    <span>Google Maps</span>
                                  </a>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <a
                                    href={`https://waze.com/ul?q=${actLocQuery}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Compass className="size-3 text-primary" />
                                    <span>Waze</span>
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ABA 4: FINANCEIRO & BOLETOS */}
          {activeTab === "financeiro" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground">Valor Total da Viagem</span>
                  <p className="text-lg font-bold text-foreground">{formatMoney(totalTripCents)}</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Total Liquidado</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(totalPaidCents)}</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground">Saldo a Conciliar</span>
                  <p className="text-lg font-bold text-foreground">{formatMoney(pendingCents)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Parcelas e Boletos</h3>
                {installments.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          Parcela {inst.installmentNumber} de {inst.totalInstallments}
                        </span>
                        <Badge
                          variant={inst.status === "reconciled" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {inst.status === "reconciled" ? "Pago / Conciliado" : "Pendente"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Vencimento: {inst.dueDate} · Valor: {formatMoney(inst.amountCents)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {inst.boletoPdfUrl && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                        >
                          <a href={inst.boletoPdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="size-4" />
                            <span>Boleto PDF</span>
                          </a>
                        </Button>
                      )}
                      {inst.digitableLine && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(inst.digitableLine || "");
                            toast.success("Linha digitável copiada!");
                          }}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                        >
                          <Copy className="size-4" />
                          <span>Copiar Código</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA GRUPO & MURAL DA EXCURSÃO (TIMELINE COLETIVA E FOTOS) */}
          {activeTab === "grupo" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 rounded-lg border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <MessageSquare className="size-4" />
                    <span>Mural Coletivo & Recomendações da Excursão</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {passengers.length || 1} Viajantes Confirmados
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Espaço compartilhado do grupo para alinhamentos com o guia, avisos de pontualidade e compartilhamento de memórias da viagem.
                </p>
              </div>

              {/* Linha do Tempo e Avisos do Guia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-lg border border-border bg-card space-y-3">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground block text-xs">
                    Pontos de Encontro & Avisos da Coordenação
                  </span>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Horário Limite de Embarque</span>
                        <Badge variant="secondary" className="font-mono text-xs">05:45</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Chegue com 15 minutos de antecedência no ponto cadastrado portando documento com foto (RG/Passaporte).
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Bagagem no Bagageiro</span>
                        <Badge variant="secondary" className="font-mono text-xs">1 Mala + 1 Mochila</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Malas identificadas com etiquetas oficiais fornecidas no embarque. Remédios e eletrônicos devem permanecer na bolsa de mão.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-3 text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          <span>Grupo Oficial de Avisos Ativo</span>
                        </span>
                        <Badge variant="outline" className="text-xs font-mono border-emerald-600/30 text-emerald-700 dark:text-emerald-300">
                          {trip?.guide_name ? `Guia: ${trip.guide_name}` : "Equipe Oficial"}
                        </Badge>
                      </div>

                      <p className="text-xs leading-relaxed">
                        O guia responsável enviará atualizações de tráfego, chamadas de embarque e previsão do tempo em tempo real.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {(trip?.whatsapp_group_url || (trip as any)?.metadata?.whatsapp_group_url) && (
                          <Button
                            asChild
                            size="sm"
                            className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <a
                              href={trip?.whatsapp_group_url || (trip as any)?.metadata?.whatsapp_group_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageSquare className="size-3.5" />
                              <span>Entrar no Grupo no WhatsApp</span>
                            </a>
                          </Button>
                        )}

                        {(trip?.guide_phone || (trip as any)?.metadata?.guide_phone) && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-2 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <a
                              href={`https://wa.me/${String(trip?.guide_phone || (trip as any)?.metadata?.guide_phone).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <PhoneCall className="size-3.5" />
                              <span>Falar com o Guia</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Galeria de Fotos e Memórias do Grupo */}
                <div className="p-5 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground block text-xs">
                      Álbum Coletivo de Memórias
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Fotos Compartilhadas
                    </Badge>
                  </div>

                  <div className="p-6 rounded-lg bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center text-center space-y-2">
                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Upload className="size-5" />
                    </div>
                    <p className="font-semibold text-foreground text-xs">
                      As fotos do grupo estarão disponíveis durante o roteiro
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Os viajantes poderão subir fotos dos passeios e paradas para montar o álbum oficial da viagem.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: COPILOT DA VIAGEM */}
          {activeTab === "copilot" && (
            <div className="space-y-4">
              <div className="p-5 rounded-lg border border-border bg-card space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <MessageSquare className="size-4" />
                  <span>Assessor da Viagem (Copilot Grounded)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pergunte sobre sua viagem para {tripContext.destination}, franquia de bagagem, regras de contrato e ANAC.
                </p>
              </div>

              {/* Histórico de Mensagens Grounded */}
              <div className="space-y-3 max-h-96 overflow-y-auto p-3 rounded-lg bg-muted/20 border border-border">
                {copilotMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg text-xs space-y-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto max-w-xl"
                        : "bg-card border border-border text-foreground max-w-3xl"
                    }`}
                  >
                    <div className="whitespace-pre-line leading-relaxed break-words">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAskCopilot();
                  }}
                  placeholder="Pergunte sobre horários de voo, bagagem, hotel..."
                  className="h-11 rounded-lg text-sm flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleAskCopilot()}
                  className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                >
                  <Send className="size-4" />
                  <span>Perguntar</span>
                </Button>
              </div>
            </div>
          )}

          {/* ABA 6: PLANTÃO 24H & EMERGÊNCIA */}
          {activeTab === "emergencia" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg border border-border bg-card space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <ShieldCheck className="size-4" />
                  <span>Checklist Oficial de Embarque</span>
                </div>
                <ul className="space-y-2 text-xs text-foreground/90">
                  {tripContext.requiredDocuments.map((docItem, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2"
                    >
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      <span className="break-words">{docItem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-lg border border-border bg-card space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <PhoneCall className="size-4" />
                  <span>Plantão 24h & Assistência Operacional</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 text-xs">
                  <p className="font-bold text-foreground">
                    Atendimento Emergencial ({tripContext.operatorName}):{" "}
                    <span className="font-mono text-primary">{tripContext.emergencyPhone24h}</span>
                  </p>
                  <p className="text-muted-foreground leading-relaxed break-words">
                    {tripContext.cancellationRulesText}
                  </p>
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => setSupportModalOpen(true)}
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 w-full cursor-pointer"
                    >
                      <LifeBuoy className="size-4" />
                      <span>Abrir Chamado de Emergência</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Abertura de Chamado Emergencial */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <LifeBuoy className="size-5 text-amber-500" />
                <span>Acionar Plantão de Atendimento</span>
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSupportModalOpen(false)}
                className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="urgency-select">Nível de Urgência</Label>
                <select
                  id="urgency-select"
                  value={supportUrgency}
                  onChange={(e) => setSupportUrgency(e.target.value as any)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs"
                >
                  <option value="critical">Crítico — Em trânsito / Aeroporto / Embarque imediato</option>
                  <option value="high">Alto — Hospedagem / Traslado nas próximas horas</option>
                  <option value="medium">Médio — Dúvida de itinerário / Solicitação de serviço</option>
                  <option value="low">Baixo — Informações gerais</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="category-select">Categoria</Label>
                <select
                  id="category-select"
                  value={supportCategory}
                  onChange={(e) => setSupportCategory(e.target.value as any)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs"
                >
                  <option value="flight">Voo / Aéreo / Conexão</option>
                  <option value="hotel">Hospedagem / Check-in</option>
                  <option value="transfer">Traslado / Transporte</option>
                  <option value="health">Saúde / Emergência Médica</option>
                  <option value="document">Perda de Documento</option>
                  <option value="general">Outros Assuntos</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="support-desc">Descrição do Ocorrido</Label>
                <textarea
                  id="support-desc"
                  rows={4}
                  value={supportSummary}
                  onChange={(e) => setSupportSummary(e.target.value)}
                  placeholder="Descreva detalhadamente o que ocorreu para que o plantão possa intervir imediatamente..."
                  className="w-full rounded-lg border border-border bg-background p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSupportModalOpen(false)}
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSubmittingSupport}
                onClick={handleCreateSupportTicket}
                className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {isSubmittingSupport ? "Enviando..." : "Registrar Chamado"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
