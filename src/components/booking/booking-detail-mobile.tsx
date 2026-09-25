import React from "react";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CalendarDots,
  ArrowLeft,
  Storefront,
  ShieldCheck,
  Sparkle,
  Check,
  X,
  MapPin,
  WhatsappLogo,
  CaretRight,
} from "@phosphor-icons/react";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";

export interface BookingDetailMobileProps {
  service: any;
  categoryLabel: string;
  targetGenderLabel: string;
  store: any;
  storeAddress: string;
  storeCity: string;
  storePhone: string;
  onStartBooking: () => void;
}

export function BookingDetailMobile({
  service,
  categoryLabel,
  targetGenderLabel,
  store,
  storeAddress,
  storeCity,
  storePhone,
  onStartBooking,
}: BookingDetailMobileProps) {
  return (
    <div className="w-full min-h-[100dvh] bg-background text-foreground pb-24 font-sans select-none antialiased">
      {/* ── 1. Hero Edge-to-Edge com Ações Flutuantes ── */}
      <div className="relative w-full aspect-video sm:aspect-[16/9] bg-muted overflow-hidden">
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
            <Storefront size={48} weight="thin" />
          </div>
        )}

        {/* Gradiente superior para contraste dos botões */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 via-black/25 to-transparent pointer-events-none z-10" />

        {/* Botão Circular Flutuante "Voltar" */}
        <Link
          to="/agendar"
          className="absolute top-3 left-3 size-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 active:scale-95 transition-transform z-20 shadow-md"
          aria-label="Voltar para Serviços"
        >
          <ArrowLeft size={18} weight="bold" />
        </Link>

        {/* Ações Flutuantes Superior Direito */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          <div className="size-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-md">
            <ContentActionsMenu
              entityType="product"
              entityId={service.id}
              isOwner={false}
              canonicalUrl={`/agendar/${service.id}`}
              title={service.title}
              description={service.description || ""}
              mediaUrl={service.image_url}
            />
          </div>
        </div>

        {/* Badges Flutuantes sobre a foto */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 z-20">
          <Badge className="bg-background/90 text-foreground text-[10px] font-bold border border-border/50 backdrop-blur-md">
            {categoryLabel}
          </Badge>
          {service.duration_minutes && (
            <Badge variant="secondary" className="backdrop-blur-md text-[10px] font-mono font-bold px-2 py-0.5 flex items-center gap-1 bg-black/60 text-white border border-white/20">
              <Clock size={11} weight="bold" />
              <span>{service.duration_minutes} min</span>
            </Badge>
          )}
        </div>
      </div>

      {/* ── 2. Corpo do Serviço ── */}
      <div className="p-4 space-y-5">
        {/* Badges Rápidos de Garantia */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/40 text-[10px] font-semibold text-muted-foreground">
            <ShieldCheck size={12} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
            Profissional Certificado
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/40 text-[10px] font-semibold text-muted-foreground">
            <Sparkle size={12} weight="bold" className="text-amber-500" />
            Biossegurança 100%
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/40 text-[10px] font-semibold text-muted-foreground">
            <CalendarDots size={12} weight="bold" className="text-primary" />
            Reagendamento Grátis
          </span>
        </div>

        {/* Título Principal & Preço */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
            {service.title}
          </h1>

          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
              Valor da Sessão
            </span>
            <span className="text-xl font-black text-primary font-mono">
              {formatMoney(service.price_cents)}
            </span>
          </div>
        </div>

        {/* ── 3. Ficha Técnica / Especificações ── */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especificações do Serviço</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-medium">Duração Estimada</span>
              <span className="font-bold text-foreground">{service.duration_minutes || 60} minutos</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-medium">Público-Alvo</span>
              <span className="font-bold text-foreground">{targetGenderLabel}</span>
            </div>
          </div>
        </div>

        {/* ── 4. Descrição ── */}
        {service.description && (
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sobre o Procedimento</h2>
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
              {service.description}
            </p>
          </div>
        )}

        {/* ── 5. Inclusões e Orientações ── */}
        {service.included_items && service.included_items.length > 0 && (
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O Que Está Incluso</h2>
            <ul className="space-y-1.5 text-xs text-foreground/85">
              {service.included_items.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <Check size={14} weight="bold" className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {service.requirements && service.requirements.length > 0 && (
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Orientações e Cuidados</h2>
            <ul className="space-y-1.5 text-xs text-foreground/85">
              {service.requirements.map((req: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── 6. Estabelecimento Parceiro ── */}
        {store && (
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border/50">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="size-full object-cover" />
                ) : (
                  <Storefront size={24} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Local de Atendimento
                </span>
                <h3 className="font-bold text-sm text-foreground truncate">{store.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{storeCity}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground flex items-start gap-2">
              <MapPin size={14} weight="bold" className="text-foreground shrink-0 mt-0.5" />
              <span>{storeAddress}</span>
            </div>

            {store.slug && (
              <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold h-9">
                <Link to="/loja/$slug" params={{ slug: store.slug }}>
                  <span>Conhecer o Espaço Completo</span>
                  <CaretRight size={14} className="ml-1" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── 7. Sticky Bottom Action Bar (Thumb Zone & Safe-Area) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] mobile-nav-hide-on-keyboard flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Valor da Sessão
          </span>
          <span className="text-base font-black text-foreground font-mono">
            {formatMoney(service.price_cents)}
          </span>
        </div>

        <Button
          onClick={onStartBooking}
          className="h-12 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5 shadow-sm shrink-0"
        >
          <CalendarDots size={16} weight="bold" />
          <span>Agendar Horário</span>
        </Button>
      </div>
    </div>
  );
}
