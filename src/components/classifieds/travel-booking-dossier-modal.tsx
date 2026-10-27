import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  Plane,
  ShieldCheck,
  MessageCircle,
  Loader2,
  Star,
  Lock,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { registerClassifiedLead } from "@/services/company-mvp.functions";
import { createAgencyTravelQuote } from "@/services/tourism.functions";
import { generateTravelReservationCheckout } from "@/services/travel-contract.functions";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { type DepartureOption } from "@/lib/classifieds/canonical-airports";

export interface PassengerSlotData {
  role: "adult" | "child";
  label: string;
  fullName: string;
  document: string;
  birthDateOrAge: string;
}

interface TravelBookingDossierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classified: any;
}

export function TravelBookingDossierModal({
  open,
  onOpenChange,
  classified,
}: TravelBookingDossierModalProps) {
  const attrs = classified?.attributes || {};
  const departureOptions: DepartureOption[] = Array.isArray(attrs?.departure_options)
    ? attrs.departure_options
    : [];

  // Composição Tarifária do Orçamento / Pacote
  const rawComp = classified?.passenger_composition || attrs?.passenger_composition || {};
  const configuredAdults = Math.max(1, Number(rawComp.adults ?? attrs?.adults_count ?? 2) || 2);
  const configuredChildren = Math.max(0, Number(rawComp.children ?? attrs?.children_count ?? 0) || 0);
  const childrenMaxAge = Math.max(1, Number(rawComp.children_max_age ?? 12) || 12);

  const isCustomOrUnlistedQuote = Boolean(
    classified?.is_custom_quote ||
      classified?.visibility_mode === "unlisted" ||
      attrs?.is_custom_quote ||
      attrs?.visibility_mode === "unlisted" ||
      rawComp.allow_custom_count === false
  );

  const [isCompositionLocked, setIsCompositionLocked] = useState<boolean>(
    isCustomOrUnlistedQuote || rawComp.allow_custom_count === false
  );

  const [dateMode, setDateMode] = useState<"confirmed" | "flexible">(
    departureOptions.length > 0 || attrs?.departure_date ? "confirmed" : "flexible"
  );
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>(
    departureOptions[0]?.id || ""
  );
  const [departureDate, setDepartureDate] = useState(attrs?.departure_date || "");
  const [returnDate, setReturnDate] = useState(attrs?.return_date || "");
  const [flexiblePeriodText, setFlexiblePeriodText] = useState("");
  const [flexibleDaysPlusMinus, setFlexibleDaysPlusMinus] = useState(true);

  const [adultsCount, setAdultsCount] = useState<number>(configuredAdults);
  const [childrenCount, setChildrenCount] = useState<number>(configuredChildren);
  const [childrenAges, setChildrenAges] = useState<string[]>(
    Array.from({ length: configuredChildren }, () => "")
  );

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [passengerSlots, setPassengerSlots] = useState<PassengerSlotData[]>([]);
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincroniza os slots de passageiros exatamente com (adultsCount + childrenCount)
  useEffect(() => {
    setPassengerSlots((prev) => {
      const next: PassengerSlotData[] = [];
      for (let i = 0; i < adultsCount; i++) {
        const existing = prev.find((p, idx) => p.role === "adult" && idx === i);
        next.push({
          role: "adult",
          label: i === 0 ? "Adulto 1 (Titular da Reserva)" : `Adulto ${i + 1}`,
          fullName: existing?.fullName || (i === 0 ? customerName : ""),
          document: existing?.document || "",
          birthDateOrAge: existing?.birthDateOrAge || "",
        });
      }
      for (let c = 0; c < childrenCount; c++) {
        const slotIdx = adultsCount + c;
        const existing = prev[slotIdx];
        next.push({
          role: "child",
          label: `Criança ${c + 1} (até ${childrenMaxAge} anos)`,
          fullName: existing?.fullName || "",
          document: existing?.document || "",
          birthDateOrAge: existing?.birthDateOrAge || childrenAges[c] || "",
        });
      }
      return next;
    });
  }, [adultsCount, childrenCount, childrenMaxAge]);

  // Perguntas Customizadas (Estilo Meta Ads / Anunciante)
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  const customLeadQuestions: any[] = [
    ...(Array.isArray(attrs?.lead_form_questions) ? attrs.lead_form_questions : []),
    ...(Array.isArray(classified?.store?.custom_inquiry_fields)
      ? classified.store.custom_inquiry_fields
      : []),
  ].filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

  const priceCents = Number(classified?.price_cents || 0);
  const transportType = attrs?.flight_details?.transport_type || attrs?.transport_type || "airplane";
  const isAirplane = transportType === "airplane" || transportType === "aereo";

  const handleChildrenCountChange = (count: number) => {
    if (isCompositionLocked) return;
    const validCount = Math.max(0, Math.min(10, count));
    setChildrenCount(validCount);
    setChildrenAges((prev) => {
      const next = [...prev];
      if (validCount > next.length) {
        for (let i = next.length; i < validCount; i++) {
          next.push("");
        }
      } else {
        next.length = validCount;
      }
      return next;
    });
  };

  const handleSlotChange = (
    index: number,
    field: keyof PassengerSlotData,
    value: string
  ) => {
    setPassengerSlots((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
    if (index === 0 && field === "fullName") {
      setCustomerName(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const titularName = (passengerSlots[0]?.fullName || customerName).trim();
    if (!titularName || !customerPhone.trim()) {
      toast.error("Por favor, preencha o nome completo do titular e o WhatsApp.");
      return;
    }

    // Validação estrita dos slots de passageiros e idade máxima de criança
    for (let i = 0; i < passengerSlots.length; i++) {
      const slot = passengerSlots[i];
      if (!slot.fullName.trim()) {
        toast.error(`Informe o nome completo de: ${slot.label}`);
        return;
      }
      if (slot.role === "child") {
        const ageNum = parseInt(slot.birthDateOrAge, 10);
        if (isNaN(ageNum) || ageNum < 0) {
          toast.error(`Informe a idade de ${slot.label}.`);
          return;
        }
        if (ageNum > childrenMaxAge) {
          toast.error(
            `A tarifa de ${slot.label} permite crianças de até ${childrenMaxAge} anos (informado: ${ageNum} anos).`
          );
          return;
        }
      }
    }

    for (const field of customLeadQuestions) {
      if (field.required) {
        const val = customAnswers[field.id];
        if (val === undefined || val === null || val === "" || (field.type === "boolean" && !val)) {
          toast.error(`Por favor, responda o campo obrigatório: "${field.label}"`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      let periodSummary = "";
      if (dateMode === "confirmed" && selectedDepartureId) {
        const selected = departureOptions.find((d) => d.id === selectedDepartureId);
        if (selected) {
          periodSummary = `*Saida Confirmada:* ${selected.label} (${selected.departure_date} ate ${selected.return_date || "retorno"}${selected.departure_time ? ` as ${selected.departure_time}` : ""})`;
        }
      } else if (flexiblePeriodText.trim()) {
        periodSummary = `*Periodo de Interesse:* ${flexiblePeriodText.trim()} ${flexibleDaysPlusMinus ? "(Flexibilidade +/- 3 dias)" : ""}`;
      } else if (departureDate) {
        periodSummary = `*Datas do Pacote:* ${departureDate} ate ${returnDate || "conforme roteiro"}`;
      }

      const formattedPassengerList = passengerSlots
        .map(
          (p) =>
            `- ${p.label}: ${p.fullName.trim()}${p.document ? ` (Doc: ${p.document.trim()})` : ""}${p.birthDateOrAge ? ` [${p.role === "child" ? `${p.birthDateOrAge} anos` : p.birthDateOrAge}]` : ""}`
        )
        .join("\n");

      const customAnswerLines = customLeadQuestions
        .map((f: any) => {
          const ans = customAnswers[f.id];
          if (ans === undefined || ans === "" || ans === null) return null;
          return `*${f.label}:* ${f.type === "boolean" ? (ans ? "Sim" : "Nao") : ans}`;
        })
        .filter(Boolean);

      const summaryMessage = [
        isCustomOrUnlistedQuote
          ? `*ACEITE DE ORCAMENTO E RESERVA DE PACOTE*`
          : `*SOLICITACAO DE RESERVA / COTACAO DE VIAGEM*`,
        `*Pacote:* ${classified.title}`,
        priceCents > 0 ? `*Valor Acordado / Referencia:* ${formatMoney(priceCents)}` : "",
        `*Titular:* ${titularName} (${customerPhone.trim()})`,
        `*Composicao:* ${adultsCount} Adulto(s)${childrenCount > 0 ? ` + ${childrenCount} Crianca(s) (ate ${childrenMaxAge} anos)` : ""}`,
        periodSummary,
        `*Lista Nominal de Passageiros:*\n${formattedPassengerList}`,
        specialRequests.trim() ? `*Observacoes:* ${specialRequests.trim()}` : "",
        ...customAnswerLines,
      ]
        .filter(Boolean)
        .join("\n");

      if (classified?.id) {
        await Promise.allSettled([
          registerClassifiedLead({
            data: {
              classifiedId: classified.id,
              buyerName: titularName,
              buyerPhone: customerPhone.trim(),
              proposedPriceCents: priceCents,
              message: summaryMessage,
            },
          }),
          createAgencyTravelQuote({
            data: {
              contact_name: titularName,
              contact_whatsapp: customerPhone.trim(),
              origin_city: classified.city || "Chapecó",
              origin_iata: attrs?.flight_details?.departure_iata || null,
              destination_city: attrs?.destination_city || classified.title || "Destino Turístico",
              destination_iata: attrs?.flight_details?.arrival_iata || null,
              departure_date: selectedDepartureId
                ? departureOptions.find((d) => d.id === selectedDepartureId)?.departure_date ||
                  departureDate ||
                  null
                : departureDate || null,
              return_date: returnDate || null,
              adults_count: adultsCount,
              children_count: childrenCount,
              children_ages: passengerSlots
                .filter((p) => p.role === "child")
                .map((p) => parseInt(p.birthDateOrAge, 10) || 0),
              flexible_dates: dateMode === "flexible",
              trip_type:
                attrs?.flight_details?.transport_type === "bus"
                  ? "bus"
                  : attrs?.flight_details?.transport_type === "cruise"
                    ? "cruise"
                    : "air_package",
              quote_amount_cents: priceCents || null,
              special_notes: summaryMessage,
              status: "new",
            },
          }),
        ]).catch(() => {});
      }

      let finalWhatsAppMessage = summaryMessage;
      try {
        const checkoutRes = await generateTravelReservationCheckout({
          data: {
            classifiedId: classified?.id || null,
            storeId: classified?.store_id || classified?.store?.id || null,
            clientName: titularName,
            clientPhone: customerPhone.trim(),
            destination: attrs?.destination_city || classified.title || "Destino Turístico",
            packageSummary: classified.title,
            totalValueCents: priceCents,
            travelStartDate: selectedDepartureId
              ? departureOptions.find((d) => d.id === selectedDepartureId)?.departure_date ||
                departureDate ||
                null
              : departureDate || null,
            travelEndDate: returnDate || null,
            passengers: passengerSlots.map((p) => ({
              name: p.fullName.trim(),
              document: p.document.trim() || undefined,
            })),
            generatePix: priceCents > 0,
          },
        });

        if (checkoutRes?.contractUrl || checkoutRes?.pixBrCode) {
          const contractPart = checkoutRes.contractUrl
            ? `\n\n*Contrato de Viagem Online:*\n${checkoutRes.contractUrl}`
            : "";
          const pixPart = checkoutRes.pixBrCode
            ? `\n\n*Chave Pix Copia e Cola:*\n\`${checkoutRes.pixBrCode}\``
            : "";
          finalWhatsAppMessage = `${summaryMessage}${contractPart}${pixPart}`;
        }
      } catch {}

      toast.success(
        isCustomOrUnlistedQuote
          ? "Orçamento aceito! Gerando contrato e abrindo atendimento..."
          : "Reserva iniciada com sucesso! Abrindo WhatsApp..."
      );
      onOpenChange(false);

      const targetPhone =
        classified?.contact_whatsapp || classified?.whatsapp || classified?.profiles?.phone;
      if (targetPhone) {
        await trackAndOpenWhatsApp(targetPhone, finalWhatsAppMessage, {
          classifiedId: classified.id,
          classifiedTitle: classified.title,
          action: "travel_dossier_booking",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-5 sm:p-6 rounded-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-bold uppercase tracking-wider text-primary border-primary/25 bg-primary/10"
            >
              {isCustomOrUnlistedQuote
                ? "Aceite Oficial de Orçamento"
                : isAirplane
                  ? "Reserva & Emissão Aérea"
                  : "Dossiê de Reserva"}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Plane className="size-5 text-primary" />
            <span>
              {isCustomOrUnlistedQuote
                ? "Aceitar Orçamento e Confirmar Passageiros"
                : "Reservar Pacote / Confirmar Passageiros"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isCompositionLocked
              ? `Este orçamento foi dimensionado para ${adultsCount} Adulto(s)${childrenCount > 0 ? ` e ${childrenCount} Criança(s) (até ${childrenMaxAge} anos)` : ""}. Preencha os dados exatos de cada passageiro abaixo.`
              : "Preencha os dados dos viajantes e confirme as datas para emitir o contrato e garantir a tarifa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Bloco de Composição Tarifária (Travada por Padrão em Orçamentos) */}
          <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Composição do Pacote:{" "}
                  <strong className="text-primary">
                    {adultsCount} {adultsCount === 1 ? "Adulto" : "Adultos"}
                    {childrenCount > 0
                      ? ` + ${childrenCount} ${childrenCount === 1 ? "Criança" : "Crianças"} (até ${childrenMaxAge} anos)`
                      : ""}
                  </strong>
                </span>
              </div>
              {isCompositionLocked ? (
                <button
                  type="button"
                  onClick={() => setIsCompositionLocked(false)}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Lock className="size-3" />
                  <span>Alterar composição</span>
                </button>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Personalizável
                </Badge>
              )}
            </div>

            {!isCompositionLocked && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Adultos (+{childrenMaxAge} anos)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={adultsCount}
                    onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Crianças (0 a {childrenMaxAge} anos)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={childrenCount}
                    onChange={(e) => handleChildrenCountChange(parseInt(e.target.value) || 0)}
                    className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Slots Nominais Estritos por Passageiro (Ex: 2 Adultos + 1 Criança) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                <span>Identificação dos Passageiros ({passengerSlots.length})</span>
              </Label>
              <span className="text-xs text-muted-foreground">Conforme documento de embarque</span>
            </div>

            <div className="space-y-2">
              {passengerSlots.map((slot, idx) => (
                <div
                  key={`${slot.role}-${idx}`}
                  className="p-4 rounded-lg border border-border/60 bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-primary" />
                      {slot.label}
                    </span>
                    <Badge
                      variant={slot.role === "child" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {slot.role === "child" ? `Até ${childrenMaxAge} anos` : "Tarifa Adulto"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <Input
                        value={slot.fullName}
                        onChange={(e) => handleSlotChange(idx, "fullName", e.target.value)}
                        placeholder="Nome completo conforme RG/Passaporte *"
                        required
                        className="h-11 rounded-lg text-xs bg-background font-medium"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        value={slot.document}
                        onChange={(e) => handleSlotChange(idx, "document", e.target.value)}
                        placeholder="CPF ou RG"
                        className="h-11 rounded-lg text-xs bg-background font-mono"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      {slot.role === "child" ? (
                        <Input
                          type="number"
                          min={0}
                          max={childrenMaxAge}
                          value={slot.birthDateOrAge}
                          onChange={(e) => handleSlotChange(idx, "birthDateOrAge", e.target.value)}
                          placeholder={`Idade (0-${childrenMaxAge}) *`}
                          required
                          className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
                        />
                      ) : (
                        <Input
                          type="text"
                          value={slot.birthDateOrAge}
                          onChange={(e) => handleSlotChange(idx, "birthDateOrAge", e.target.value)}
                          placeholder="Nascimento (opc.)"
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp do Titular */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              WhatsApp do Titular para Receber Voucher e Contrato *
            </Label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(49) 99999-8877"
              required
              className="h-11 rounded-lg text-xs bg-background font-medium font-mono"
            />
          </div>

          {/* Datas / Saída Confirmada */}
          {departureOptions.length > 0 && (
            <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Calendar className="size-3.5 text-primary" />
                <span>Data de Embarque Selecionada</span>
              </Label>
              <select
                value={selectedDepartureId}
                onChange={(e) => setSelectedDepartureId(e.target.value)}
                className="w-full h-11 rounded-lg text-xs bg-background border border-border px-3 font-medium text-foreground"
              >
                {departureOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} — Saída {opt.departure_date} (
                    {opt.status === "confirmed" ? "Confirmada" : "Prevista"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Perguntas Personalizadas (se houver) */}
          {customLeadQuestions.length > 0 && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Star className="size-3.5 text-primary" />
                <span>Informações Adicionais da Reserva</span>
              </Label>
              {customLeadQuestions.map((field: any) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type="text"
                    value={customAnswers[field.id] || ""}
                    onChange={(e) =>
                      setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder || "Sua resposta..."}
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Observações de Quarto / Assento (Opcional)
            </Label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Ex: Cama de casal, berço no quarto, restrição alimentar..."
              rows={2}
              className="rounded-lg text-xs bg-background resize-none"
            />
          </div>

          {/* Resumo do Valor */}
          {priceCents > 0 && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground block">Valor do Orçamento / Pacote:</span>
                <span className="text-xs text-muted-foreground">
                  Para {adultsCount} adulto(s)
                  {childrenCount > 0 ? ` + ${childrenCount} criança(s)` : ""}
                </span>
              </div>
              <span className="font-black text-base text-primary font-mono">
                {formatMoney(priceCents)}
              </span>
            </div>
          )}

          {/* Botão Primário Tátil */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 min-h-11 rounded-lg text-xs sm:text-sm font-bold gap-2 bg-primary text-primary-foreground cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Processando Aceite e Contrato...</span>
              </>
            ) : (
              <>
                <MessageCircle className="size-4" />
                <span>
                  {isCustomOrUnlistedQuote
                    ? "Aceitar Orçamento e Emitir Reserva"
                    : "Confirmar Passageiros e Solicitar Reserva"}
                </span>
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Contrato digital e chave Pix gerados com segurança pela agência.</span>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
