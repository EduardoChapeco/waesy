import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plane, ShieldCheck, MessageCircle, Loader2, Sparkles } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { registerClassifiedLead } from "@/services/company-mvp.functions";
import { createAgencyTravelQuote } from "@/services/tourism.functions";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { type DepartureOption } from "@/lib/classifieds/canonical-airports";

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

  const [dateMode, setDateMode] = useState<"confirmed" | "flexible">(
    departureOptions.length > 0 ? "confirmed" : "flexible"
  );
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>(
    departureOptions[0]?.id || ""
  );
  const [departureDate, setDepartureDate] = useState(attrs?.departure_date || "");
  const [returnDate, setReturnDate] = useState(attrs?.return_date || "");
  const [flexiblePeriodText, setFlexiblePeriodText] = useState("");
  const [flexibleDaysPlusMinus, setFlexibleDaysPlusMinus] = useState(true);

  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [childrenAges, setChildrenAges] = useState<string[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [passengerNames, setPassengerNames] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Perguntas Customizadas (Estilo Meta Ads / Anunciante)
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  
  const customLeadQuestions: any[] = [
    ...(Array.isArray(attrs?.lead_form_questions) ? attrs.lead_form_questions : []),
    ...(Array.isArray(classified?.store?.custom_inquiry_fields) ? classified.store.custom_inquiry_fields : []),
  ].filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

  const priceCents = Number(classified?.price_cents || 0);
  const transportType = attrs?.flight_details?.transport_type || attrs?.transport_type || "airplane";
  const isAirplane = transportType === "airplane" || transportType === "aereo";

  const handleChildrenCountChange = (count: number) => {
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

  const handleChildAgeChange = (index: number, val: string) => {
    setChildrenAges((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Por favor, preencha seu nome completo e WhatsApp.");
      return;
    }

    if (childrenCount > 0) {
      const missingAge = childrenAges.some((age) => !age || age.trim() === "");
      if (missingAge) {
        toast.error("Por favor, informe a idade de todas as crianças para cálculo da tarifa aérea.");
        return;
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
      // 1. Resumo das datas e período
      let periodSummary = "";
      if (dateMode === "confirmed" && selectedDepartureId) {
        const selected = departureOptions.find((d) => d.id === selectedDepartureId);
        if (selected) {
          periodSummary = `📅 *Saída Confirmada:* ${selected.label} (${selected.departure_date} até ${selected.return_date || "retorno"}${selected.departure_time ? ` às ${selected.departure_time}` : ""})`;
        }
      } else if (flexiblePeriodText.trim()) {
        periodSummary = `📅 *Período de Interesse:* ${flexiblePeriodText.trim()} ${flexibleDaysPlusMinus ? "(Flexibilidade +/- 3 dias)" : ""}`;
      } else if (departureDate) {
        periodSummary = `📅 *Datas Pretendidas:* ${departureDate} até ${returnDate || "a definir"}`;
      }

      // 2. Resumo das crianças e idades
      const childrenSummary = childrenCount > 0
        ? `👶 *Crianças (${childrenCount}):* Idades: ${childrenAges.map((a) => `${a} ano(s)`).join(", ")}`
        : "";

      // 3. Respostas das perguntas personalizadas (Meta Ads style)
      const customAnswerLines = customLeadQuestions
        .map((f: any) => {
          const ans = customAnswers[f.id];
          if (ans === undefined || ans === "" || ans === null) return null;
          return `📌 *${f.label}:* ${f.type === "boolean" ? (ans ? "Sim" : "Não") : ans}`;
        })
        .filter(Boolean);

      const summaryMessage = [
        `✈️ *Solicitação de Cotação de Viagem*`,
        `📦 *Pacote:* ${classified.title}`,
        priceCents > 0 ? `💰 *Valor de Referência:* ${formatMoney(priceCents)}` : "",
        `👤 *Cliente:* ${customerName.trim()} (${customerPhone.trim()})`,
        `👥 *Viajantes:* ${adultsCount} Adulto(s) ${childrenCount > 0 ? `+ ${childrenCount} Criança(s)` : ""}`,
        childrenSummary,
        periodSummary,
        passengerNames.trim() ? `📝 *Passageiros:* ${passengerNames.trim()}` : "",
        specialRequests.trim() ? `✨ *Preferências:* ${specialRequests.trim()}` : "",
        ...customAnswerLines,
      ]
        .filter(Boolean)
        .join("\n");

      // 4. Gravar atomicamente na tabela deals via BFF (Universal CRM) e em travel_quotes (Turismo CRM)
      if (classified?.id) {
        await Promise.allSettled([
          registerClassifiedLead({
            data: {
              classifiedId: classified.id,
              buyerName: customerName.trim(),
              buyerPhone: customerPhone.trim(),
              proposedPriceCents: priceCents,
              message: summaryMessage,
            },
          }),
          createAgencyTravelQuote({
            data: {
              contact_name: customerName.trim(),
              contact_whatsapp: customerPhone.trim(),
              origin_city: classified.city || "Chapecó",
              origin_iata: attrs?.flight_details?.departure_iata || null,
              destination_city: attrs?.destination_city || classified.title || "Destino Turístico",
              destination_iata: attrs?.flight_details?.arrival_iata || null,
              departure_date: selectedDepartureId
                ? departureOptions.find((d) => d.id === selectedDepartureId)?.departure_date || departureDate || null
                : departureDate || null,
              return_date: returnDate || null,
              adults_count: adultsCount,
              children_count: childrenCount,
              children_ages: childrenAges.map((a) => parseInt(a, 10) || 0),
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
        ]).catch((err) => {
          console.warn("[TravelBookingDossierModal] Aviso ao registrar lead no CRM:", err);
        });
      }

      toast.success("Dossiê de cotação gerado com sucesso! Abrindo WhatsApp...");
      onOpenChange(false);

      // 5. Abertura do WhatsApp com a proposta completa e rastreável
      const targetPhone = classified?.contact_whatsapp || classified?.whatsapp || classified?.profiles?.phone;
      if (targetPhone) {
        await trackAndOpenWhatsApp(targetPhone, summaryMessage, {
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
      <DialogContent className="sm:max-w-xl p-5 sm:p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/25 bg-primary/10">
              {isAirplane ? "Cotação Aérea Sob Medida" : "Dossiê de Interesse"}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Plane className="size-5 text-primary" />
            <span>Solicitar Cotação do Pacote</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Informe a quantidade de passageiros, idades das crianças e datas pretendidas para receber a melhor tarifa disponível.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Dados Pessoais do Solicitante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Seu Nome Completo *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                required
                className="h-10 rounded-xl text-xs bg-background font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">WhatsApp com DDD *</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(49) 99999-8877"
                required
                className="h-10 rounded-xl text-xs bg-background font-medium font-mono"
              />
            </div>
          </div>

          {/* Quantidade de Passageiros (Adultos e Crianças) */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span>Passageiros & Viajantes</span>
              </Label>
              <span className="text-[11px] font-mono text-muted-foreground">
                Total: {adultsCount + childrenCount} viajante(s)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-medium">Adultos (+12 anos)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={adultsCount}
                    onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10 rounded-xl text-xs bg-background font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-medium">Crianças e Bebês (0 a 11 anos)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={childrenCount}
                    onChange={(e) => handleChildrenCountChange(parseInt(e.target.value) || 0)}
                    className="h-10 rounded-xl text-xs bg-background font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Inputs Dinâmicos para a Idade de Cada Criança */}
            {childrenCount > 0 && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">
                    Idade de Cada Criança (Cia aérea e hotel diferenciam colo 0-23m e 2-11 anos):
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Array.from({ length: childrenCount }).map((_, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Criança {idx + 1}:
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={17}
                        value={childrenAges[idx] ?? ""}
                        onChange={(e) => handleChildAgeChange(idx, e.target.value)}
                        placeholder="Ex: 4 anos"
                        required
                        className="h-9 rounded-xl text-xs bg-background font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Período de Interesse ou Saída Confirmada */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Datas e Período de Interesse</span>
              </Label>
              {departureOptions.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setDateMode("confirmed")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      dateMode === "confirmed"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Saída Confirmada
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode("flexible")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      dateMode === "flexible"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Período Livre
                  </button>
                </div>
              )}
            </div>

            {dateMode === "confirmed" && departureOptions.length > 0 ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground font-medium">Selecione uma saída confirmada do pacote:</Label>
                <select
                  value={selectedDepartureId}
                  onChange={(e) => setSelectedDepartureId(e.target.value)}
                  className="w-full h-10 rounded-xl text-xs bg-background border border-border px-3 font-medium text-foreground"
                >
                  {departureOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} — Saída {opt.departure_date} ({opt.status === "confirmed" ? "Confirmada" : "Prevista"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">
                    Mês, Temporada ou Período Pretendido:
                  </Label>
                  <Input
                    value={flexiblePeriodText}
                    onChange={(e) => setFlexiblePeriodText(e.target.value)}
                    placeholder="Ex: Julho de 2027, Segunda quinzena, Férias escolares..."
                    className="h-10 rounded-xl text-xs bg-background font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Data Inicial (Opcional)</Label>
                    <Input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="h-9 rounded-xl text-xs bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Data Final (Opcional)</Label>
                    <Input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-9 rounded-xl text-xs bg-background font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={flexibleDaysPlusMinus}
                    onChange={(e) => setFlexibleDaysPlusMinus(e.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">
                    Tenho flexibilidade de 3 a 5 dias para encontrar melhores tarifas de voo
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Perguntas Personalizadas (Estilo Meta Ads) */}
          {customLeadQuestions.length > 0 && (
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/[0.03] space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <span>Perguntas da Agência (Formulário de Interesse)</span>
                </Label>
                <span className="text-[10px] font-mono text-primary font-bold">
                  Personalizado
                </span>
              </div>

              {customLeadQuestions.map((field: any) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <span>{field.label}</span>
                    {field.required && <span className="text-rose-500 font-bold">*</span>}
                  </Label>
                  {field.type === "select" && Array.isArray(field.options) ? (
                    <select
                      value={customAnswers[field.id] || ""}
                      onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      className="w-full h-9 rounded-xl text-xs bg-background border border-border px-3 font-medium text-foreground"
                    >
                      <option value="">Selecione...</option>
                      {field.options.map((opt: string, i: number) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === "boolean" ? (
                    <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={!!customAnswers[field.id]}
                        onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.checked }))}
                        className="size-4 rounded accent-primary"
                      />
                      <span className="text-xs text-muted-foreground">{field.placeholder || "Sim, confirmo"}</span>
                    </label>
                  ) : (
                    <Input
                      type="text"
                      value={customAnswers[field.id] || ""}
                      onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder || "Sua resposta..."}
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Preferências / Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Preferências ou Dúvidas Adicionais
            </Label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Ex: Preferência por voo matutino, quarto conjugado, transfer privativo, etc..."
              rows={2}
              className="rounded-xl text-xs bg-background resize-none leading-relaxed text-xs"
            />
          </div>

          {/* Resumo do Valor */}
          {priceCents > 0 && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Valor Estimado do Pacote:</span>
              <span className="font-bold text-sm text-primary font-mono">{formatMoney(priceCents)}</span>
            </div>
          )}

          {/* Ação de Envio */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-md cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Registrando Cotação...</span>
              </>
            ) : (
              <>
                <MessageCircle className="size-4" />
                <span>Enviar Solicitação de Cotação via WhatsApp</span>
              </>
            )}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Seu lead é registrado no CRM da agência e enviado direto para atendimento.</span>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
