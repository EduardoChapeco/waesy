import React from "react";
import { useRouter } from "@tanstack/react-router";
import { CaretLeft, CaretDown, MapPin, Sparkle, Ticket } from "@phosphor-icons/react";
import { LocationMasterPill } from "@/components/location/location-master-pill";
import { EventAppleCalendarButton } from "./EventAppleCalendarButton";
import { cn } from "@/lib/utils";

export interface EventTopHeroCoverProps {
  activeCity?: string;
  coverImageUrl?: string | null;
  themeColor?: string;
  calloutTitle?: string;
  partnerLogoUrl?: string | null;
  showBackButton?: boolean;
  onBackClick?: () => void;
  selectedDateFilter?: string;
  onSelectDateFilter?: (filter: string) => void;
  className?: string;
}

export function EventTopHeroCover({
  activeCity = "São Miguel do Oeste",
  coverImageUrl,
  themeColor = "#0284c7",
  calloutTitle = "Aqui tem desconto pra quem é Clube!",
  partnerLogoUrl,
  showBackButton = true,
  onBackClick,
  selectedDateFilter = "all",
  onSelectDateFilter,
  className,
}: EventTopHeroCoverProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div
      className={cn("w-full relative overflow-visible select-none", className)}
      data-testid="event-top-hero-cover"
    >
      {/* ── Capa Imersiva de Fundo com Gradiente ou Ilustração / Upload CMS ── */}
      <div
        className="w-full h-52 sm:h-56 relative overflow-hidden bg-primary transition-colors duration-300"
        style={{
          background: coverImageUrl
            ? undefined
            : `linear-gradient(135deg, ${themeColor} 0%, #1e3a8a 100%)`,
        }}
      >
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt="Capa de Eventos"
            className="size-full object-cover"
          />
        ) : (
          /* Ilustração vetorial nativa quando não houver imagem personalizada enviada pelo Admin Master */
          <div className="absolute inset-0 pointer-events-none opacity-20 [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]">
            <svg
              className="size-full"
              viewBox="0 0 400 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="80" cy="180" r="100" fill="currentColor" className="text-primary-foreground" />
              <circle cx="340" cy="60" r="80" fill="currentColor" className="text-primary-foreground" />
              <path
                d="M120 40 L160 100 L80 120 Z"
                fill="currentColor"
                className="text-primary-foreground"
                opacity="0.5"
              />
            </svg>
          </div>
        )}

        {/* Overlay sutil para garantir legibilidade dos controles do cabeçalho */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* ── LADO ESQUERDO: Botão Voltar Circular (44x44px - Piso Ergonômico DL-14 e B.26) ── */}
        {showBackButton && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar para a página anterior"
            className="absolute top-4 left-4 z-20 size-11 min-w-11 min-h-11 rounded-full bg-background/40 backdrop-blur-md border border-white/20 text-primary-foreground hover:bg-background/60 active:scale-95 transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <CaretLeft size={22} weight="bold" />
          </button>
        )}

        {/* ── LADO DIREITO: Co-Branding Sympla/Waesy + Chamada Clube de Benefícios ── */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end text-right max-w-56">
          {partnerLogoUrl ? (
            <img
              src={partnerLogoUrl}
              alt="Parceria Ingressos"
              className="h-8 max-w-36 object-contain drop-shadow-sm mb-1"
            />
          ) : (
            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-card/20 backdrop-blur-md border border-white/30 text-primary-foreground mb-1 shadow-xs">
              <Ticket size={14} weight="fill" className="text-amber-300" />
              <span className="text-2xs font-black tracking-wider uppercase">
                Waesy + Ingressos
              </span>
            </div>
          )}
          <p className="text-xs font-bold text-primary-foreground drop-shadow-md leading-tight flex items-center gap-1">
            <Sparkle size={13} weight="fill" className="text-purple-300 shrink-0" />
            <span>{calloutTitle}</span>
          </p>
        </div>
      </div>

      {/* ── BARRA FLUTUANTE SOBREPOSTA: CALENDÁRIO APPLE (ESQ) + LOCALIZAÇÃO MASTER (DIR) ── */}
      <div className="absolute -bottom-5.5 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* LADO ESQUERDO: Botão Quadrado Calendário Apple (iOS) */}
        <div className="pointer-events-auto">
          <EventAppleCalendarButton
            selectedDateFilter={selectedDateFilter}
            onSelectDateFilter={onSelectDateFilter}
          />
        </div>

        {/* LADO DIREITO: Pílula de Localização Minimalista (Branca Sólida / Card - Semitransparência Zero) */}
        <div className="pointer-events-auto">
          <LocationMasterPill className="bg-card h-11 min-h-11 px-4 rounded-full border border-border/80 shadow-md shadow-black/10 flex items-center gap-2 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-foreground font-bold text-xs" />
        </div>
      </div>
    </div>
  );
}
