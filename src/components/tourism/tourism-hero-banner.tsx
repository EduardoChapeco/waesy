import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AirplaneTilt, Sparkle, ArrowRight, ShieldCheck, Tag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { BannerDTO } from "@/services/banner.functions";

interface TourismHeroBannerProps {
  banner?: BannerDTO | null;
  userEmail?: string | null;
  onOpenQuote?: (destination?: string) => void;
  className?: string;
}

export function TourismHeroBanner({
  banner,
  userEmail,
  onOpenQuote,
  className,
}: TourismHeroBannerProps) {
  const [isDiscountActive, setIsDiscountActive] = useState(false);

  const heroTitle = banner?.title || "Seus pedidos Waesy viram pontos pra viajar";
  const heroSubtitle =
    banner?.subtitle || "Conecte sua conta Excelência Tour e viaje com tarifas exclusivas";
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
          <div className="absolute top-12 left-16 size-1.5 rounded-full bg-white/40" />
          <div className="absolute top-20 right-32 size-2 rounded-full bg-white/30" />
          <div className="absolute top-8 left-1/3 size-1 rounded-full bg-white/50" />
        </div>
      )}

      {/* Conteúdo do Topo (Hero + Parceria) */}
      <div className="relative z-10 px-4 sm:px-8 pt-8 pb-4 text-center sm:text-left space-y-4 max-w-2xl">
        {/* Badge de Parceria Oficial */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-foreground">
          <span className="font-black tracking-tight text-primary">Waesy</span>
          <span className="opacity-40">+</span>
          <span className="font-black tracking-tight text-foreground">Excelência Tour</span>
          <span className="text-3xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold uppercase tracking-wider">
            GDS & Wooba
          </span>
        </div>

        {/* Título e Subtítulo */}
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            {heroTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-medium">
            {heroSubtitle}
          </p>
        </div>
      </div>

      {/* ── Widget Flutuante de Pontos & Fidelidade (Estilo iFood / Decolar) ── */}
      <div className="relative z-10 px-4 sm:px-8 pb-6">
        <div className="w-full max-w-xl mx-auto sm:mx-0 rounded-xl bg-card/95 backdrop-blur-md border border-border/80 p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                <Tag size={18} weight="bold" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Seus pontos & Benefícios
                </span>
                <span className="text-xs text-muted-foreground block">
                  Programa fidelidade em viagens
                </span>
              </div>
            </div>

            {/* Toggle de Desconto */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                Ativar desconto
              </span>
              <Switch
                checked={isDiscountActive}
                onCheckedChange={setIsDiscountActive}
                aria-label="Ativar desconto de pontos"
                className="focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Saldo de Pontos & Conversão */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black font-mono text-red-600">
                  1.000 pts
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-bold text-foreground">
                  R$ 24,00 de desconto na Excelência Tour
                </span>
              </div>
              {userEmail ? (
                <span className="text-3xs text-muted-foreground font-mono block">
                  {userEmail}
                </span>
              ) : (
                <Link
                  to="/entrar"
                  className="text-3xs text-primary hover:underline font-semibold block focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  Entre na sua conta para resgatar milhas e descontos
                </Link>
              )}
            </div>

            {isDiscountActive && (
              <span className="inline-flex items-center gap-1 text-3xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md self-start sm:self-center">
                <Sparkle size={12} weight="fill" />
                Desconto aplicado na busca
              </span>
            )}
          </div>

          {/* Botão Primário Callout iFood/Decolar */}
          <div className="pt-1">
            <Button
              type="button"
              onClick={() => onOpenQuote?.()}
              className="w-full h-11 min-h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring gap-2"
            >
              <Sparkle size={16} weight="fill" />
              <span>Ganhe 250 pontos grátis na primeira reserva</span>
              <ArrowRight size={14} className="ml-auto" />
            </Button>
            <p className="text-3xs text-center text-muted-foreground mt-2">
              Consulte pacotes com consultores especializados da Excelência Tour no WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
