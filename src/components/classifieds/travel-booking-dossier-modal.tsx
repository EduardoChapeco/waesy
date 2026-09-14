import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Users, Plane, ShieldCheck, MessageCircle, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { registerClassifiedLead } from "@/services/company-mvp.functions";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";

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
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adultsCount, setAdultsCount] = useState("2");
  const [childrenCount, setChildrenCount] = useState("0");
  const [passengerNames, setPassengerNames] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const customFields: any[] = classified?.store?.custom_inquiry_fields || [];

  const priceCents = Number(classified?.price_cents || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Por favor, preencha seu nome e telefone para contato.");
      return;
    }

    for (const field of customFields) {
      if (field.required) {
        const val = customAnswers[field.id];
        if (val === undefined || val === null || val === "" || (field.type === "checkbox" && !val)) {
          toast.error(`Por favor, responda o campo obrigatório: "${field.label}"`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const customAnswerText = customFields
        .map((f: any) => {
          const ans = customAnswers[f.id];
          if (ans === undefined || ans === "" || ans === null) return null;
          return `📌 *${f.label}:* ${f.type === "checkbox" ? (ans ? "Sim" : "Não") : ans}`;
        })
        .filter(Boolean);

      const summaryMessage = [
        `🌴 *Solicitação de Reserva / Proposta de Viagem*`,
        `📦 *Pacote:* ${classified.title}`,
        `💰 *Valor Estimado:* ${formatMoney(priceCents)}`,
        `👤 *Cliente:* ${customerName.trim()} (${customerPhone.trim()})`,
        `👥 *Viajantes:* ${adultsCount} Adulto(s) ${Number(childrenCount) > 0 ? `+ ${childrenCount} Criança(s)` : ""}`,
        departureDate ? `📅 *Período:* ${departureDate} até ${returnDate || "a definir"}` : "",
        passengerNames.trim() ? `📝 *Passageiros:* ${passengerNames.trim()}` : "",
        specialRequests.trim() ? `✨ *Preferências:* ${specialRequests.trim()}` : "",
        ...customAnswerText,
      ]
        .filter(Boolean)
        .join("\n");

      // 1. Gravar atomicamente na tabela deals via BFF
      if (classified?.id) {
        await registerClassifiedLead({
          data: {
            classifiedId: classified.id,
            buyerName: customerName.trim(),
            buyerPhone: customerPhone.trim(),
            proposedPriceCents: priceCents,
            message: summaryMessage,
          },
        }).catch((err) => {
          console.warn("[TravelBookingDossierModal] Aviso ao registrar lead assíncrono:", err);
        });
      }

      toast.success("Dossiê gerado com sucesso! Abrindo atendimento...");
      onOpenChange(false);

      // 2. Abertura do WhatsApp com a proposta completa
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
      <DialogContent className="sm:max-w-lg p-5 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Plane className="size-4" />
            <span>Reserva e Proposta</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Solicitar Proposta
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Preencha seus dados para receber o retorno do anunciante.
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
                className="h-10 rounded-xl text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">WhatsApp com DDD *</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(49) 99999-8877"
                required
                className="h-10 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          {/* Datas Desejadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Data de Embarque</span>
              </Label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-10 rounded-xl text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Data de Retorno</span>
              </Label>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="h-10 rounded-xl text-xs bg-background font-mono"
              />
            </div>
          </div>

          {/* Quantidade de Passageiros */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span>Adultos</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={adultsCount}
                onChange={(e) => setAdultsCount(e.target.value)}
                className="h-10 rounded-xl text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Crianças / Bebês</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={childrenCount}
                onChange={(e) => setChildrenCount(e.target.value)}
                className="h-10 rounded-xl text-xs bg-background font-mono"
              />
            </div>
          </div>

          {/* Nomes dos Passageiros */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Nome dos Passageiros
            </Label>
            <Input
              value={passengerNames}
              onChange={(e) => setPassengerNames(e.target.value)}
              placeholder="Ex: Maria Silva, Lucas Silva (8 anos)..."
              className="h-10 rounded-xl text-xs bg-background"
            />
          </div>

          {/* Observações / Preferências */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Preferências Especiais ou Dúvidas
            </Label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Ex: Preferência por quarto com cama king, transfer privativo, dieta vegetariana..."
              rows={2}
              className="rounded-xl text-xs bg-background resize-none leading-relaxed"
            />
          </div>

          {/* Perguntas Personalizadas da Agência / Empresa */}
          {customFields.length > 0 && (
            <div className="space-y-3 pt-2 pb-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Perguntas Específicas da Agência
                </Label>
                <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-medium">
                  Configurado pela loja
                </span>
              </div>
              {customFields.map((field: any) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <span>{field.label}</span>
                    {field.required && <span className="text-rose-500 font-bold">*</span>}
                  </Label>
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
            className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Registrando Dossiê...</span>
              </>
            ) : (
              <>
                <MessageCircle className="size-4" />
                <span>Confirmar & Abrir no WhatsApp</span>
              </>
            )}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Seus dados são protegidos e salvos na sua conta Waesy.</span>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
