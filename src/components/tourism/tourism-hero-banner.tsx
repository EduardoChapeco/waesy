import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AirplaneTilt, Sparkle, ArrowRight, ArrowLeft, Tag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { BannerDTO } from "@/services/banner.functions";

interface TourismHeroBannerProps {
  banner?: BannerDTO | null;
  userEmail?: string | null;
  onOpenQuote?: (destination?: string) => void;
  storeName?: string;
  storeLogoUrl?: string | null;
  badgeLabel?: string;
  backTo?: string;
  showLoyaltyWidget?: boolean;
  ctaLabel?: string;
  ctaSubtext?: string;
  className?: string;
}

export function TourismHeroBanner({
  banner,
  userEmail,
  onOpenQuote,
  storeName,
  storeLogoUrl,
  badgeLabel = "GDS & Tarifas Online",
  backTo = "/",
  showLoyaltyWidget = true,
  ctaLabel,
  ctaSubtext,
  className,
}: TourismHeroBannerProps) {
  const [isDiscountActive, setIsDiscountActive] = useState(false);

  const agencyLabel = storeName || "Agência Oficial";
  const heroTitle =
    banner?.title ||
    (storeName ? `${storeName} · Viagens & Roteiros` : "Seus pedidos viram benefícios pra viajar");
  const heroSubtitle =
    banner?.subtitle ||
    (storeName
      ? `Consulte pacotes, passagens aéreas, hospedagens e atendimento direto com ${storeName}.`
      : `Conecte sua conta ${agencyLabel} e viaje com tarifas exclusivas`);
  const coverImage = banner?.media_url;

  return (
    <section
      aria-label="Capa de Viagens & Programa de Benefícios"
      className={cn("relative w-full rounded-2xl overflow-hidden border border-border/40", className)}
    >
      {/* ── Imagem de Fundo / Capa Customizável via Admin Master ── */}
      {coverImage ? (
        <div className="absolute inset-0 w-full h-full">
          <img
            src={coverImage}
            alt={heroTitle}
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-background" />
        </div>
      ) : (
        /* Fallback Canônico: Céu Noturno Estilizado Padrão Decolar / iFood */
        <div className="absolute inset-0 w-full h-full bg-linear-to-b from-indigo-950 via-slate-900 to-background overflow-hidden">
          {/* Avião estilizado com rastro visual */}
          <div className="absolute top-6 right-8 opacity-80 animate-pulse motion-reduce:animate-none">
            <AirplaneTilt size={48} className="text-sky-300 transform -rotate-12" weight="duotone" />
            <div className="w-24 h-0.5 bg-linear-to-l from-sky-400/80 to-transparent -translate-x-16 -translate-y-4" />
          </div>
          {/* Estrelas / Pontos de Luz decorativos com tokens semânticos */}
          <div className="absolute top-12 left-16 size-1.5 rounded-full bg-card/40" />
          <div className="absolute top-20 right-32 size-2 rounded-full bg-card/30" />
          <div className="absolute top-8 left-1/3 size-1 rounded-full bg-card/50" />
        </div>
      )}

      {/* Conteúdo do Topo (Hero + Parceria) */}
      <div className="relative z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 text-center sm:text-left space-y-4 max-w-2xl">
        {/* Barra Superior Mobile (Botão Voltar + Selo de Agência/Parceria) */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          {backTo && (
            <Link
              to={backTo}
              aria-label="Voltar para o início"
              className="md:hidden size-11 min-h-11 min-w-11 rounded-full bg-card border border-border text-foreground flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border text-xs font-semibold text-foreground">
            {storeLogoUrl ? (
              <img
                src={storeLogoUrl}
                alt={agencyLabel}
                className="size-5 rounded-md object-contain bg-card shrink-0"
              />
            ) : (
              <span className="font-black tracking-tight text-primary">Waesy</span>
            )}
            {!storeName && <span className="opacity-40">+</span>}
            <span className="font-black tracking-tight text-foreground">{agencyLabel}</span>
            {badgeLabel && (
              <span className="text-3xs px-2 py-1 rounded-full bg-muted border border-border text-foreground font-bold uppercase tracking-wider">
                {badgeLabel}
              </span>
            )}
          </div>
        </div>

        {/* Título e Subtítulo */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-neutral-50 leading-tight">
            {heroTitle}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
            {heroSubtitle}
          </p>
        </div>
      </div>

      {/* ── Widget Flutuante de Cotação & Benefícios (Estilo iFood / Decolar) ── */}
      {showLoyaltyWidget && (
        <div className="relative z-10 px-4 sm:px-8 pb-6">
          <div className="w-full max-w-xl mx-auto sm:mx-0 rounded-xl bg-card border border-border p-4 sm:p-5 space-y-4">
            {!storeName && (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-muted border border-border text-destructive flex items-center justify-center shrink-0">
                      <Tag size={18} weight="bold" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Benefícios & Condições Especiais
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Atendimento consultivo em viagens
                      </span>
                    </div>
                  </div>

                  {/* Toggle de Desconto */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                      Tarifa Clube
                    </span>
                    <Switch
                      checked={isDiscountActive}
                      onCheckedChange={setIsDiscountActive}
                      aria-label="Ativar filtro de tarifa clube"
                      className="focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    {userEmail ? (
                      <span className="text-3xs text-muted-foreground font-mono block">
                        {userEmail}
                      </span>
                    ) : (
                      <Link
                        to="/entrar"
                        className="text-xs text-primary hover:underline font-semibold block focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        Entre na sua conta para acompanhar suas viagens e vouchers
                      </Link>
                    )}
                  </div>

                  {isDiscountActive && (
                    <span className="inline-flex items-center gap-1 text-3xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md self-start sm:self-center">
                      <Sparkle size={12} weight="fill" />
                      Tarifas promocionais priorizadas
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Botão Primário Callout */}
            <div className="pt-1">
              <Button
                type="button"
                onClick={() => onOpenQuote?.()}
                className="w-full h-11 min-h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm transition-transform active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring gap-2"
              >
                <Sparkle size={16} weight="fill" />
                <span>{ctaLabel || `Solicitar Cotação com ${agencyLabel}`}</span>
                <ArrowRight size={14} className="ml-auto" />
              </Button>
              <p className="text-3xs text-center text-muted-foreground mt-2">
                {ctaSubtext ||
                  `Consulte pacotes, aéreos e hospedagens direto com especialistas da ${agencyLabel}.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
