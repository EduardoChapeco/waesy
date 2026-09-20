import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Building2,
  Phone,
  User,
  MapPin,
  Loader2,
  Ticket,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { submitFounderLead } from "@/services/launch.functions";
import type { CnpjCompanyDTO } from "@/services/public-apis.functions";

interface FounderSignupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: {
    companyName: string;
    responsibleName: string;
    whatsapp: string;
    ticketNumber: string;
    city: string;
    companyDetails: CnpjCompanyDTO | null;
  }) => void;
}

export function FounderSignupSheet({
  open,
  onOpenChange,
  onSuccess,
}: FounderSignupSheetProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [businessIdentifier, setBusinessIdentifier] = useState("");
  const [city, setCity] = useState("Chapecó - SC");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formatação de WhatsApp
  const handleWhatsappChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) {
      setWhatsapp(raw);
    } else if (raw.length <= 7) {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }

    const cleanWa = whatsapp.replace(/\D/g, "");
    if (cleanWa.length < 10) {
      toast.error("Por favor, informe um WhatsApp válido com DDD.");
      return;
    }

    setIsSubmitting(true);
    try {
      const isCnpj = /^\d/.test(businessIdentifier.trim());
      const isHandle = businessIdentifier.trim().startsWith("@");

      let cnpjPayload: string | undefined = undefined;
      let instagramPayload: string | undefined = undefined;
      let companyNamePayload: string | undefined = undefined;

      if (isCnpj) {
        cnpjPayload = businessIdentifier.trim();
      } else if (isHandle) {
        instagramPayload = businessIdentifier.trim();
      } else if (businessIdentifier.trim()) {
        companyNamePayload = businessIdentifier.trim();
      }

      const res = await submitFounderLead({
        data: {
          name: name.trim(),
          whatsapp: cleanWa,
          cnpj: cnpjPayload,
          instagram_handle: instagramPayload,
          company_name: companyNamePayload,
          city: city.trim(),
        },
      });

      toast.success("Vaga de Membro Fundador garantida!", {
        description: `Seu número da sorte para viagens é ${res.ticketNumber}`,
      });

      onSuccess({
        companyName:
          res.companyDetails?.tradeName ||
          res.companyDetails?.corporateName ||
          companyNamePayload ||
          (instagramPayload ? `@${instagramPayload.replace(/^@/, "")}` : name.trim()),
        responsibleName: name.trim(),
        whatsapp: cleanWa,
        ticketNumber: res.ticketNumber,
        city: city.trim(),
        companyDetails: res.companyDetails,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar inscrição. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[2rem] max-w-lg mx-auto p-6 space-y-5 border-t border-border/80 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="text-left space-y-2">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] font-bold gap-1 px-2.5 py-0.5"
            >
              <Sparkles className="size-3" />
              <span>Membro Fundador 2027</span>
            </Badge>
            <span className="text-[11px] text-muted-foreground font-mono font-medium">
              Vagas Limitadas
            </span>
          </div>
          <SheetTitle className="text-xl font-bold text-foreground">
            Entre na Lista de Fundadores
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground leading-relaxed">
            Tenha visibilidade antecipada no Circuito Internacional Waesy Chapecó & SMO, participe dos workshops e concorra a viagens em 2027 com chances duplicadas.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Campo Nome */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <User className="size-3.5 text-primary" />
              <span>Seu Nome</span>
            </Label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva"
              className="h-11 rounded-xl text-xs bg-muted/20 border-border"
            />
          </div>

          {/* Campo WhatsApp */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <Phone className="size-3.5 text-primary" />
              <span>WhatsApp para Contato</span>
            </Label>
            <Input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => handleWhatsappChange(e.target.value)}
              placeholder="(49) 99999-9999"
              className="h-11 rounded-xl text-xs bg-muted/20 border-border font-mono"
            />
          </div>

          {/* Campo Empresa / CNPJ / Instagram */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Building2 className="size-3.5 text-primary" />
                <span>Minha Empresa (CNPJ, @ ou Nome)</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">Opcional</span>
            </div>
            <Input
              type="text"
              value={businessIdentifier}
              onChange={(e) => setBusinessIdentifier(e.target.value)}
              placeholder="Ex: 00.000.000/0001-00 ou @sualoja ou Padaria Central"
              className="h-11 rounded-xl text-xs bg-muted/20 border-border"
            />
            <p className="text-[10px] text-muted-foreground">
              Se você inserir o CNPJ, buscamos as informações e a logo oficiais automaticamente.
            </p>
          </div>

          {/* Campo Cidade */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <MapPin className="size-3.5 text-primary" />
              <span>Cidade de Atuação</span>
            </Label>
            <Input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Chapecó - SC ou São Miguel do Oeste - SC"
              className="h-11 rounded-xl text-xs bg-muted/20 border-border"
            />
          </div>

          {/* Benefício em Destaque */}
          <div className="rounded-xl bg-muted/30 border border-border/80 p-3 flex items-start gap-2.5">
            <Ticket className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug">
              <strong className="text-foreground block font-semibold">
                Número da Sorte Automático
              </strong>
              <span className="text-muted-foreground">
                Ao se inscrever, você recebe imediatamente um ticket de confirmação para concorrer a viagens o ano inteiro em 2027.
              </span>
            </div>
          </div>

          {/* Botão de Envio */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Consultando dados & gerando mockup...</span>
              </>
            ) : (
              <>
                <span>Garantir Vaga & Ver Perfil da Empresa</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
