import React from "react";
import {
  CheckCircle2,
  Sparkles,
  MapPin,
  Ticket,
  Star,
  ShoppingBag,
  Clock,
  Share2,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CnpjCompanyDTO } from "@/services/public-apis.functions";

interface FounderSmartphoneMockupProps {
  companyName: string;
  responsibleName: string;
  whatsapp: string;
  ticketNumber: string;
  city?: string;
  companyDetails?: CnpjCompanyDTO | null;
  onReset?: () => void;
}

export function FounderSmartphoneMockup({
  companyName,
  responsibleName,
  whatsapp,
  ticketNumber,
  city = "Chapecó / SMO - SC",
  companyDetails,
  onReset,
}: FounderSmartphoneMockupProps) {
  const displayCity = companyDetails?.address?.city
    ? `${companyDetails.address.city} - ${companyDetails.address.state}`
    : city;

  const segment =
    companyDetails?.mainCnae?.description ||
    "Comércio, Turismo & Experiências Regionais";

  const sampleProducts = [
    {
      name: "Experiência Especial",
      price: "R$ 89,90",
      image:
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Reserva Premium",
      price: "R$ 149,00",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Combo Fundador",
      price: "R$ 199,00",
      image:
        "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80",
    },
  ];

  const cleanWa = whatsapp.replace(/\D/g, "");

  return (
    <div className="w-full max-w-sm mx-auto animate-in zoom-in-95 duration-500">
      {/* Moldura do Smartphone Apple */}
      <div className="relative rounded-[2.5rem] border-[6px] border-neutral-900 bg-card shadow-2xl overflow-hidden ring-1 ring-border/80">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-neutral-900 rounded-full z-30 flex items-center justify-between px-2.5">
          <div className="size-2 rounded-full bg-neutral-800" />
          <div className="size-1.5 rounded-full bg-sky-500/40" />
        </div>

        {/* Barra de Status */}
        <div className="pt-2 px-6 pb-2 flex items-center justify-between text-[11px] font-bold text-muted-foreground z-20 relative bg-background/80 backdrop-blur-xs">
          <span>09:41</span>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Conteúdo do Perfil da Empresa */}
        <div className="px-4 pt-2 pb-6 space-y-4 max-h-[580px] overflow-y-auto scrollbar-none text-left">
          {/* Topo do Perfil com Avatar e Capa Compacta */}
          <div className="flex items-center gap-3">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-muted border border-border flex items-center justify-center font-bold text-xl text-primary shrink-0 shadow-xs uppercase">
              {companyName.charAt(0) || "W"}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground truncate leading-tight">
                  {companyName}
                </h3>
                <CheckCircle2 className="size-3.5 text-primary shrink-0 fill-primary/20" />
              </div>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                <span>{displayCity}</span>
              </p>
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star className="size-3 fill-amber-400 text-amber-400" /> 5.0
                </span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Clock className="size-2.5" /> Aberto agora
                </span>
              </div>
            </div>
          </div>

          {/* Badge Oficial de Membro Fundador */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="size-3 text-amber-500" />
                Membro Fundador 2027
              </span>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[9px] font-mono font-bold">
                OFICIAL
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Empresa credenciada no Circuito Internacional Waesy Chapecó & SMO.
            </p>
          </div>

          {/* Cartão de Sorteio de Viagens (Número da Sorte) */}
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Ticket className="size-3.5" />
                Sorteio de Viagens 2027
              </span>
              <span className="text-[10px] text-primary/80 font-medium">Chances 2x</span>
            </div>
            <div className="flex items-center justify-between bg-card/80 rounded-xl px-3 py-1.5 border border-border/80">
              <span className="text-xs font-mono font-bold text-foreground">
                {ticketNumber}
              </span>
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                Ativo
              </span>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              asChild
              size="sm"
              className="w-full rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10 gap-1.5 shadow-xs"
            >
              <a
                href={cleanWa ? `https://wa.me/55${cleanWa}` : "#"}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsappLogo className="size-4" weight="fill" />
                <span>WhatsApp</span>
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold h-10 gap-1.5 border-border"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${companyName} na Waesy`,
                    text: `Conheça a ${companyName} no Circuito Waesy 2027! Ticket: ${ticketNumber}`,
                    url: window.location.href,
                  });
                }
              }}
            >
              <Share2 className="size-3.5" />
              <span>Compartilhar</span>
            </Button>
          </div>

          {/* Vitrine Demonstrativa de Produtos */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-primary" />
                Vitrine Digital da Loja
              </span>
              <span className="text-[10px] text-muted-foreground">3 itens ativos</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {sampleProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/80 bg-muted/20 overflow-hidden space-y-1 p-1 text-center"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full aspect-square object-cover rounded-lg"
                    loading="lazy"
                  />
                  <p className="text-[9px] font-semibold text-foreground truncate px-0.5">
                    {p.name}
                  </p>
                  <p className="text-[10px] font-bold text-primary font-mono">
                    {p.price}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Informações Oficiais de Enriquecimento (se houver CNPJ) */}
          {companyDetails && (
            <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground space-y-0.5">
              <p className="truncate">
                <strong className="text-foreground">Razão Social:</strong> {companyDetails.corporateName}
              </p>
              <p className="truncate">
                <strong className="text-foreground">Atividade:</strong> {segment}
              </p>
              <p className="truncate">
                <strong className="text-foreground">Responsável:</strong> {responsibleName}
              </p>
            </div>
          )}
        </div>

        {/* Barra inferior do celular */}
        <div className="py-2 flex justify-center bg-background/80 border-t border-border/40">
          <div className="w-28 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>

      {onReset && (
        <div className="text-center pt-3">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 cursor-pointer"
          >
            Cadastrar outra empresa na lista
          </button>
        </div>
      )}
    </div>
  );
}
