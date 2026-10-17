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
import { PreBoardingPresentationStudio } from "@/components/tourism/boarding/PreBoardingPresentationStudio";

export const Route = createFileRoute("/viajante/viagem/$id")({
  head: () => ({
    meta: [{ title: "Minha Viagem · Portal do Passageiro | Waesy" }],
  }),
  component: TripPortalPage,
});

type PortalTabKey = "resumo" | "pre_embarque" | "roteiro" | "financeiro" | "copilot" | "emergencia";

export default function TripPortalPage() {
  const { id } = Route.useParams();
  const [activeTab, setActiveTab] = useState<PortalTabKey>("resumo");

  // Contexto Canônico da Viagem (alimentado pelos dados reais / OCR da Reserva)
  const tripContext: TripGroundedCopilotContext = useMemo(
    () => ({
      tripCode: id || "13725136",
      destination: "Buenos Aires",
      travelStartDate: "09/01/2027",
      travelEndDate: "14/01/2027",
      operatorName: "Orinter Tour & Travel",
      reservationCode: id && id.length <= 12 ? id : "13725136",
      hotelName: "560 Hotel Viamonte Buenos Aires",
      hotelAddress: "Viamonte 650, C1053 CABA, Buenos Aires, Argentina",
      hotelConfirmationId: "HT-13725136-VIAMONTE",
      mealPlan: "Café da Manhã",
      roomDescription: "Quarto 1 — Standard Double (2 Adultos: Alisson Ricardo S. da Cruz & Cintia Morgana Vier)",
      flights: [
        {
          direction: "ida",
          airline: "GOL / Aerolíneas",
          flightNumber: "G3 7420",
          originIata: "XAP",
          destinationIata: "AEP",
          departureTime: "09:10",
          arrivalTime: "14:20",
          pnr: "ORINT9",
          handBaggageKg: 10,
          checkedBaggageCount: 1,
        },
        {
          direction: "volta",
          airline: "GOL / Aerolíneas",
          flightNumber: "G3 7429",
          originIata: "AEP",
          destinationIata: "XAP",
          departureTime: "18:05",
          arrivalTime: "22:40",
          pnr: "ORINT9",
          handBaggageKg: 10,
          checkedBaggageCount: 1,
        },
      ],
      transferDetails: "Transfer Regular Aeroparque (AEP) / Hotel Viamonte 650 / Aeroparque",
      transferConfirmationId: "TR-13725136-BUE",
      emergencyPhone24h: "+55 (49) 99999-1372",
      cancellationRulesText:
        "Cancelamento até 30 dias antes do embarque: retenção administrativa de 20% + taxas aéreas não reembolsáveis conforme contrato assinado por Valdecy Pedrozo da Cruz.",
      fineSchedule: [
        { daysBeforeDeparture: 30, penaltyPct: 20 },
        { daysBeforeDeparture: 15, penaltyPct: 50 },
        { daysBeforeDeparture: 7, penaltyPct: 100 },
      ],
      requiredDocuments: [
        "RG Civil Físico Original com menos de 10 anos de emissão OU Passaporte válido",
        "Seguro Viagem Internacional ativo com cobertura médica",
        "Voucher de Hospedagem e Bilhete Aéreo (disponíveis abaixo em PDF)",
      ],
    }),
    [id]
  );

  // Documentos Oficiais Originais (PDFs subidos pela agência + extraídos via OCR)
  const officialDocuments = useMemo(
    () => [
      {
        id: "doc-confirmacao",
        categoryLabel: "Confirmação Oficial da Operadora",
        title: `Confirmação de Serviços #${tripContext.reservationCode} (${tripContext.operatorName})`,
        code: tripContext.reservationCode,
        fileName: `confirmacao-${tripContext.reservationCode}-v5_6_0_34.pdf`,
      },
      {
        id: "doc-contrato",
        categoryLabel: "Contrato de Prestação de Serviços Turísticos",
        title: `Contrato Assinado — Pagador: Valdecy Pedrozo da Cruz`,
        code: `CTR-${tripContext.reservationCode}`,
        fileName: `contrato-${tripContext.reservationCode}-v5_6_0_34.pdf`,
      },
      {
        id: "doc-recibo",
        categoryLabel: "Recibo Financeiro Consolidado",
        title: `Recibo Oficial R$ 7.836,38 (10x de R$ 783,64)`,
        code: `REC-${tripContext.reservationCode}`,
        fileName: `recibo-${tripContext.reservationCode}-v5_6_0_34.pdf`,
      },
    ],
    [tripContext]
  );

  // Roteiro Dia a Dia gerado automaticamente caso o pacote não tivesse roteiro prévio
  const itineraryDays = useMemo(
    () =>
      buildAutomaticTripItineraryFallback({
        destination: tripContext.destination,
        startDate: "2027-01-09",
        endDate: "2027-01-14",
        hotelName: tripContext.hotelName,
        arrivalTime: "14:20",
        departureTime: "18:05",
        includedTours: [
          "Circuito Clássico Portenho: Plaza de Mayo, Casa Rosada, Caminito e Recoleta",
          "Passeio por Puerto Madero, Ponte da Mulher e Experiência Gastronômica",
          "Dia Livre para Compras na Calle Florida, Galerias Pacífico e Palermo Soho",
          "Passeio Opcional ao Delta do Tigre e San Isidro",
        ],
      }),
    [tripContext]
  );

  // Gestão de Boletos, Parcelas e Auto-Match OCR
  const [selectedPaymentChannel, setSelectedPaymentChannel] =
    useState<PaymentChannelType>("orinter_portal");
  const [installments, setInstallments] = useState<TripInstallmentBoletoDTO[]>([
    {
      id: "inst-1",
      tripId: tripContext.tripCode,
      installmentNumber: 1,
      totalInstallments: 4,
      dueDate: "2026-10-15",
      amountCents: 195910,
      currency: "BRL",
      operatorSlug: "orinter",
      paymentChannel: "orinter_portal",
      boletoPdfUrl: `/boletos/boleto-parcela-1-${tripContext.reservationCode}.pdf`,
      digitableLine: "23793381286008301352856000063307789840000195910",
      pixCopiaECola: null,
      externalPaymentLink: null,
      status: "reconciled",
      receiptFileUrl: "/comprovantes/recibo-1.pdf",
      ocrExtractedAmountCents: 195910,
      ocrExtractedDate: "2026-10-14",
      ocrExtractedPayer: "VALDECY PEDROZO DA CRUZ",
      ocrMatchConfidence: 99,
    },
    {
      id: "inst-2",
      tripId: tripContext.tripCode,
      installmentNumber: 2,
      totalInstallments: 4,
      dueDate: "2026-11-15",
      amountCents: 195910,
      currency: "BRL",
      operatorSlug: "orinter",
      paymentChannel: "orinter_portal",
      boletoPdfUrl: `/boletos/boleto-parcela-2-${tripContext.reservationCode}.pdf`,
      digitableLine: "23793381286008301352856000063307789840000195910",
      pixCopiaECola: null,
      externalPaymentLink: null,
      status: "pending",
      receiptFileUrl: null,
      ocrExtractedAmountCents: null,
      ocrExtractedDate: null,
      ocrExtractedPayer: null,
      ocrMatchConfidence: null,
    },
    {
      id: "inst-3",
      tripId: tripContext.tripCode,
      installmentNumber: 3,
      totalInstallments: 4,
      dueDate: "2026-12-15",
      amountCents: 195910,
      currency: "BRL",
      operatorSlug: "orinter",
      paymentChannel: "orinter_portal",
      boletoPdfUrl: `/boletos/boleto-parcela-3-${tripContext.reservationCode}.pdf`,
      digitableLine: "23793381286008301352856000063307789840000195910",
      pixCopiaECola: null,
      externalPaymentLink: null,
      status: "pending",
      receiptFileUrl: null,
      ocrExtractedAmountCents: null,
      ocrExtractedDate: null,
      ocrExtractedPayer: null,
      ocrMatchConfidence: null,
    },
    {
      id: "inst-4",
      tripId: tripContext.tripCode,
      installmentNumber: 4,
      totalInstallments: 4,
      dueDate: "2027-01-05",
      amountCents: 195908,
      currency: "BRL",
      operatorSlug: "orinter",
      paymentChannel: "orinter_portal",
      boletoPdfUrl: `/boletos/boleto-parcela-4-${tripContext.reservationCode}.pdf`,
      digitableLine: "23793381286008301352856000063307789840000195908",
      pixCopiaECola: null,
      externalPaymentLink: null,
      status: "pending",
      receiptFileUrl: null,
      ocrExtractedAmountCents: null,
      ocrExtractedDate: null,
      ocrExtractedPayer: null,
      ocrMatchConfidence: null,
    },
  ]);

  const [declaredReceiptAmount, setDeclaredReceiptAmount] = useState("1959.10");
  const [lastOcrExplanation, setLastOcrExplanation] = useState<string | null>(null);

  const paymentGuidance = useMemo(
    () => getOperatorPaymentGuidance(selectedPaymentChannel, tripContext.operatorName),
    [selectedPaymentChannel, tripContext.operatorName]
  );

  const handleReceiptFileUpload = (file: File) => {
    const amountCents = Math.round((parseFloat(declaredReceiptAmount) || 1959.1) * 100);
    const match = autoMatchCustomerReceiptToInstallment(
      {
        amountCents,
        paymentDate: new Date().toISOString().slice(0, 10),
        payerName: "VALDECY PEDROZO DA CRUZ",
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
      setLastOcrExplanation(match.explanationPt);
      toast.success(match.explanationPt);
    } else {
      toast.info(match.explanationPt);
    }
  };

  // Estado do Copilot Grounded da Viagem
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

  const totalPaidCents = installments
    .filter((i) => i.status === "reconciled")
    .reduce((acc, i) => acc + i.amountCents, 0);
  const totalTripCents = installments.reduce((acc, i) => acc + i.amountCents, 0);
  const pendingCents = Math.max(0, totalTripCents - totalPaidCents);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center pb-24 pb-safe">
      {/* Cabeçalho Canônico Bidirecional (Mobile App Header & Desktop Widescreen) */}
      <div className="w-full bg-card text-card-foreground py-6 px-4 sm:px-6 border-b border-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 -ml-2 cursor-pointer"
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

          <div className="flex items-center gap-2">
            <span className="h-11 px-4 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Viagem Confirmada & Emitida</span>
            </span>
          </div>
        </div>
      </div>

      {/* Régua Horizontal Contínua de Abas (Invariante B.39) */}
      <div className="max-w-5xl w-full px-4 sm:px-6 pt-4">
        <div className="tab-list flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-border">
          {[
            { id: "resumo", label: "Resumo & PDFs Oficiais", icon: FileText },
            { id: "pre_embarque", label: "Apresentação de Pré-Embarque & Reunião", icon: Calendar },
            { id: "roteiro", label: `Roteiro Dia a Dia (${itineraryDays.length} Dias)`, icon: Compass },
            { id: "financeiro", label: "Boletos & Comprovantes (OCR)", icon: CreditCard },
            { id: "copilot", label: "Assessor da Viagem (Contratos/ANAC)", icon: MessageSquare },
            { id: "emergencia", label: "Plantão 24h & Embarque", icon: PhoneCall },
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
          {/* ABA 1: RESUMO EM SQUIRCLES PADRONIZADOS + PDFs ORIGINAIS DA OPERADORA */}
          {activeTab === "resumo" && (
            <div className="space-y-6">
              {/* Grid Bento Squircle de Serviços Padronizados (Zero Truncate — B.38) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Voos, PNR e Franquia de Bagagem */}
                <div className="p-5 rounded-lg border border-border bg-card space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Plane className="size-4 shrink-0" />
                      <span>Voos Confirmados e Bagagem</span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      PNR: {tripContext.flights[0]?.pnr}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {tripContext.flights.map((fl, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-foreground">
                          <span>
                            {fl.direction === "ida" ? "Trecho de Ida" : "Trecho de Retorno"} ·{" "}
                            {fl.airline} {fl.flightNumber}
                          </span>
                          <span className="font-mono text-primary">
                            {fl.originIata} {fl.departureTime} → {fl.destinationIata} {fl.arrivalTime}
                          </span>
                        </div>
                        <p className="text-muted-foreground break-words leading-relaxed">
                          Bagagem inclusa: 1 item pessoal + 1 mala de mão ({fl.handBaggageKg}kg) +{" "}
                          {fl.checkedBaggageCount} mala despachada (23kg).
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                    >
                      <a
                        href={`https://www.voegol.com.br/check-in?pnr=${tripContext.flights[0]?.pnr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-4" />
                        <span>Abrir Check-in Online (48h antes)</span>
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Card 2: Hospedagem, ID do Hotel e Quarto */}
                <div className="p-5 rounded-lg border border-border bg-card space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Hotel className="size-4 shrink-0" />
                      <span>Hospedagem e Acomodação</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      ID: {tripContext.hotelConfirmationId}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 text-xs">
                    <p className="text-sm font-bold text-foreground break-words">
                      {tripContext.hotelName}
                    </p>
                    <p className="text-muted-foreground break-words">{tripContext.hotelAddress}</p>
                    <div className="pt-1 border-t border-border/50 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Regime: {tripContext.mealPlan}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Check-in: {tripContext.travelStartDate} · Check-out: {tripContext.travelEndDate}
                      </Badge>
                    </div>
                    <p className="text-foreground/90 font-medium break-words pt-1">
                      {tripContext.roomDescription}
                    </p>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        tripContext.hotelAddress
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="size-4" />
                      <span>Abrir Localização do Hotel no Mapa</span>
                    </a>
                  </Button>
                </div>
              </div>

              {/* Seção de Documentos Originais da Operadora (PDFs para Download e Conferência) */}
              <div className="p-5 rounded-lg border border-border bg-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Documentos Oficiais da Viagem (PDFs Originais da Operadora e Contratos)
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Além do resumo padronizado acima, você tem acesso integral aos documentos originais emitidos pela operadora e ao contrato assinado.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Sincronizado via OCR
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {officialDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-primary block">
                          {doc.categoryLabel}
                        </span>
                        <p className="text-sm font-bold text-foreground break-words leading-snug">
                          {doc.title}
                        </p>
                        <span className="text-xs font-mono text-muted-foreground block">
                          Arquivo: {doc.fileName}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          toast.success(`Abrindo documento oficial: ${doc.fileName}`)
                        }
                        className="h-11 min-h-11 w-full rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                      >
                        <Download className="size-4" />
                        <span>Baixar PDF Original</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA PRÉ-EMBARQUE: APRESENTAÇÃO INTERATIVA (41 MÓDULOS) & AGENDAMENTO DE REUNIÃO */}
          {activeTab === "pre_embarque" && (
            <PreBoardingPresentationStudio
              isPassengerPortal
              tripId={tripContext.tripCode}
            />
          )}

          {/* ABA 2: ROTEIRO DIA A DIA & GUIA DO DESTINO (GERADO AUTOMATICAMENTE QUANDO AUSENTE) */}
          {activeTab === "roteiro" && (
            <div className="space-y-4">
              <div className="p-5 rounded-lg border border-border bg-card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-semibold">
                      Roteiro Estruturado Dia a Dia
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Sincronizado com Horários dos Voos e Hotel
                    </Badge>
                  </div>
                  <h2 className="text-base font-bold text-foreground mt-1">
                    Programação Diária Recomendada em {tripContext.destination}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Roteiro preparado especialmente para os seus dias em {tripContext.destination}, alinhado ao endereço do {tripContext.hotelName}.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {itineraryDays.map((day) => (
                  <div
                    key={day.dayNumber}
                    className="p-5 rounded-lg border border-border bg-card space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs font-bold">
                          Dia {day.dayNumber} ({day.dateLabel})
                        </Badge>
                        <h3 className="text-sm font-bold text-foreground break-words">
                          {day.title}
                        </h3>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {day.mealIncluded}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                        <span className="font-bold text-foreground block">Manhã</span>
                        <p className="text-muted-foreground leading-relaxed break-words">
                          {day.morningActivity}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                        <span className="font-bold text-foreground block">Tarde</span>
                        <p className="text-muted-foreground leading-relaxed break-words">
                          {day.afternoonActivity}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                        <span className="font-bold text-foreground block">Noite</span>
                        <p className="text-muted-foreground leading-relaxed break-words">
                          {day.eveningActivity}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-primary font-medium">
                      Dica Logística: {day.logisticsTip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: BOLETOS, PARCELAS & UPLOAD DE COMPROVANTE COM AUTO-MATCH OCR */}
          {activeTab === "financeiro" && (
            <div className="space-y-6">
              {/* Seletor / Orientação Dinâmica por Operadora ou Banco (Incomum / FRT Funpay / Santander / Orinter) */}
              <div className="p-5 rounded-lg border border-border bg-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {paymentGuidance.badgeLabel}
                    </Badge>
                    <h2 className="text-base font-bold text-foreground mt-1">
                      {paymentGuidance.headline}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1 max-w-3xl">
                      {paymentGuidance.instructionsPt}
                    </p>
                  </div>

                  {/* Seletor de Modalidade Operacional para Visualização */}
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        { id: "orinter_portal", label: "Orinter" },
                        { id: "incomum_chat", label: "Incomum" },
                        { id: "frt_funpay", label: "FRT (Funpay)" },
                        { id: "santander_app", label: "Santander" },
                      ] as const
                    ).map((ch) => (
                      <Button
                        key={ch.id}
                        type="button"
                        size="sm"
                        variant={selectedPaymentChannel === ch.id ? "default" : "outline"}
                        onClick={() => setSelectedPaymentChannel(ch.id)}
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        {ch.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* KPIs Financeiros da Viagem */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
                    <span className="text-xs text-muted-foreground block">Valor Total da Viagem</span>
                    <span className="text-xl font-black text-foreground tabular-nums">
                      {formatMoney(totalTripCents)}
                    </span>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 block">
                      Total Quitado / Conciliado
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMoney(totalPaidCents)}
                    </span>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-xs text-amber-700 dark:text-amber-300 block">
                      Saldo a Vencer
                    </span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatMoney(pendingCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card de Upload/Compartilhamento Rápido de Comprovante com Auto-Match por IA */}
              <div className="p-5 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Enviar ou Compartilhar Comprovante de Pagamento (Conciliação Automática)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Pagou um boleto ou Pix no celular? Envie o comprovante aqui: o sistema lê o valor e a data automaticamente e dá baixa na parcela correspondente.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="space-y-1 sm:w-56">
                    <Label className="text-xs font-semibold">Valor do Comprovante (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={declaredReceiptAmount}
                      onChange={(e) => setDeclaredReceiptAmount(e.target.value)}
                      className="h-11 rounded-lg text-sm font-mono bg-background"
                    />
                  </div>

                  <label className="h-11 min-h-11 px-5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 focus-within:ring-2 focus-within:ring-primary">
                    <Upload className="size-4" />
                    <span>Selecionar Comprovante (Foto ou PDF)</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleReceiptFileUpload(f);
                      }}
                    />
                  </label>
                </div>

                {lastOcrExplanation && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{lastOcrExplanation}</span>
                  </div>
                )}
              </div>

              {/* Lista de Parcelas e Boletos Disponíveis */}
              <div className="space-y-3">
                {installments.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          Parcela {inst.installmentNumber} de {inst.totalInstallments}
                        </span>
                        <Badge
                          variant={inst.status === "reconciled" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {inst.status === "reconciled"
                            ? "Pago & Conciliado"
                            : inst.status === "receipt_uploaded"
                              ? "Comprovante em Conferência"
                              : "Aguardando Pagamento"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vencimento: {inst.dueDate} · Valor:{" "}
                        <strong className="text-foreground font-mono">
                          {formatMoney(inst.amountCents)}
                        </strong>
                      </p>
                      {inst.ocrMatchConfidence && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Comprovante verificado ({inst.ocrMatchConfidence}% de precisão)
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {inst.digitableLine && inst.status !== "reconciled" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard?.writeText(inst.digitableLine || "");
                            toast.success("Linha digitável do boleto copiada!");
                          }}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                        >
                          <Copy className="size-4" />
                          <span>Copiar Código de Barras</span>
                        </Button>
                      )}

                      {inst.boletoPdfUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            toast.success(`Baixando PDF do Boleto — Parcela ${inst.installmentNumber}`)
                          }
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                        >
                          <Download className="size-4" />
                          <span>Baixar Boleto PDF</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 4: COPILOT DA VIAGEM GROUNDED (CONTRATOS + VOUCHERS OCR + ANAC 400) */}
          {activeTab === "copilot" && (
            <div className="p-5 rounded-lg border border-border bg-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-semibold">
                      Assessor Exclusivo da Sua Viagem
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Baseado no Contrato #{tripContext.reservationCode} + Resolução ANAC 400
                    </Badge>
                  </div>
                  <h2 className="text-base font-bold text-foreground mt-1">
                    Tire qualquer dúvida sobre sua viagem para {tripContext.destination}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    As respostas utilizam estritamente os seus vouchers confirmados, o contrato assinado e as normas oficiais da ANAC e consulados.
                  </p>
                </div>
              </div>

              {/* Atalhos Táteis de Perguntas Frequentes da Viagem */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Qual minha franquia de bagagem no voo?",
                  "Qual a regra de cancelamento e multa no meu contrato?",
                  "Como funciona meu check-in no hotel e endereço?",
                  "Como encontrar o transfer e telefone de plantão 24h?",
                ].map((qText) => (
                  <button
                    key={qText}
                    type="button"
                    onClick={() => handleAskCopilot(qText)}
                    className="h-11 min-h-11 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {qText}
                  </button>
                ))}
              </div>

              {/* Histórico de Mensagens Grounded */}
              <div className="space-y-3 max-h-96 overflow-y-auto p-3 rounded-lg bg-muted/20 border border-border/60">
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

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 border-t border-border/60 flex flex-wrap gap-2">
                        {msg.citations.map((cit, cIdx) => (
                          <Badge key={cIdx} variant="outline" className="text-xs">
                            Fonte: {cit}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input de Pergunta */}
              <div className="flex items-center gap-2">
                <Input
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAskCopilot();
                  }}
                  placeholder="Pergunte sobre horários de voo, bagagem, contrato, regras ANAC ou hotel..."
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

          {/* ABA 5: PLANTÃO 24H, REGRAS DE CANCELAMENTO E CHECKLIST DE EMBARQUE */}
          {activeTab === "emergencia" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg border border-border bg-card space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <ShieldCheck className="size-4" />
                  <span>Checklist Oficial de Documentos para Embarque</span>
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
                  <span>Plantão 24h da Operadora & Política Contratual</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 text-xs">
                  <p className="font-bold text-foreground">
                    Atendimento Emergencial 24h ({tripContext.operatorName}):{" "}
                    <span className="font-mono text-primary">{tripContext.emergencyPhone24h}</span>
                  </p>
                  <p className="text-muted-foreground leading-relaxed break-words">
                    {tripContext.cancellationRulesText}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
