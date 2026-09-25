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
  CreditCard,
  QrCode,
  Money,
} from "@phosphor-icons/react";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";

export interface BookingDetailDesktopProps {
  service: any;
  categoryLabel: string;
  targetGenderLabel: string;
  store: any;
  storeAddress: string;
  storeCity: string;
  storePhone: string;
  onStartBooking: () => void;
}

export function BookingDetailDesktop({
  service,
  categoryLabel,
  targetGenderLabel,
  store,
  storeAddress,
  storeCity,
  storePhone,
  onStartBooking,
}: BookingDetailDesktopProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-4 space-y-6 pb-16 font-sans">
      {/* ── 1. Top Breadcrumb & Share ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/agendar"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para Serviços & Agendamentos</span>
        </Link>

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

      {/* ── 2. Grid 2 Colunas Split-Screen (7 cols / 5 cols) ── */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda (7 cols): Imagem, Título, Detalhes, Especificações */}
        <div className="col-span-7 space-y-6">
          {/* Banner Principal */}
          <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-muted relative border border-border/60 shadow-xs">
            {service.image_url ? (
              <img
                src={service.image_url}
                alt={service.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                <Storefront size={48} weight="thin" />
              </div>
            )}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <Badge className="bg-background/95 text-foreground backdrop-blur-md text-xs font-bold px-3 py-1 rounded-xl shadow-xs border border-border/60">
                {categoryLabel}
              </Badge>
              {service.duration_minutes && (
                <Badge variant="secondary" className="backdrop-blur-md text-xs font-mono font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-xs">
                  <Clock size={13} weight="bold" />
                  <span>{service.duration_minutes} min</span>
                </Badge>
              )}
            </div>
            <div className="absolute top-4 right-4">
              <Badge className="bg-emerald-500/90 text-white backdrop-blur-md text-[11px] font-bold px-3 py-1 rounded-xl shadow-xs flex items-center gap-1">
                <Sparkle size={12} weight="fill" />
                <span>Vagas Hoje</span>
              </Badge>
            </div>
          </div>

          {/* Badges Rápidos de Garantia */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/40 text-[11px] font-semibold text-muted-foreground">
              <ShieldCheck size={14} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
              Profissional Certificado
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/40 text-[11px] font-semibold text-muted-foreground">
              <Sparkle size={14} weight="bold" className="text-amber-500" />
              Biossegurança 100%
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/40 text-[11px] font-semibold text-muted-foreground">
              <CalendarDots size={14} weight="bold" className="text-primary" />
              Reagendamento Grátis
            </span>
          </div>

          {/* Título Principal */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
            {service.title}
          </h1>

          {/* Ficha Técnica / Especificações */}
          <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especificações do Serviço</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground block font-medium">Duração Estimada</span>
                <span className="font-bold text-foreground text-sm">{service.duration_minutes || 60} minutos</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground block font-medium">Público-Alvo</span>
                <span className="font-bold text-foreground text-sm">{targetGenderLabel}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground block font-medium">Categoria</span>
                <span className="font-bold text-foreground text-sm">{categoryLabel}</span>
              </div>
            </div>
          </div>

          {/* Descrição */}
          {service.description && (
            <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sobre o Procedimento</h2>
              <p className="text-sm md:text-base text-foreground/85 leading-relaxed whitespace-pre-line">
                {service.description}
              </p>
            </div>
          )}

          {/* Inclusões e Orientações */}
          {service.included_items && service.included_items.length > 0 && (
            <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O Que Está Incluso</h2>
              <ul className="space-y-2 text-sm text-foreground/85">
                {service.included_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check size={16} weight="bold" className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {service.requirements && service.requirements.length > 0 && (
            <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Orientações e Cuidados</h2>
              <ul className="space-y-2 text-sm text-foreground/85">
                {service.requirements.map((req: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Estabelecimento Parceiro */}
          {store && (
            <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-4 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border/50">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="size-full object-cover" />
                  ) : (
                    <Storefront size={28} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Local de Atendimento
                  </span>
                  <h3 className="font-bold text-base text-foreground truncate">{store.name}</h3>
                  <p className="text-xs text-muted-foreground">{storeCity}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground flex items-start gap-2">
                <MapPin size={16} weight="bold" className="text-foreground shrink-0 mt-0.5" />
                <span>{storeAddress}</span>
              </div>

              {store.slug && (
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold h-9">
                  <Link to="/loja/$slug" params={{ slug: store.slug }}>
                    <span>Conhecer o Espaço Completo</span>
                    <CaretRight size={14} className="ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Coluna Direita (5 cols Sticky): Card de Preço & Agendamento */}
        <div className="col-span-5 space-y-5 sticky top-24">
          <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-6 shadow-sm">
            {/* Preço */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block font-bold">
                Valor da Sessão
              </span>
              <span className="text-3xl font-black text-foreground font-mono">
                {formatMoney(service.price_cents)}
              </span>
            </div>

            {/* Botão Primário */}
            <Button
              onClick={onStartBooking}
              className="w-full h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground gap-2 cursor-pointer shadow-sm hover:bg-primary/90"
            >
              <CalendarDots size={18} weight="bold" />
              <span>Agendar Horário</span>
            </Button>

            {/* Formas de Pagamento Aceitas */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <span className="text-[11px] text-muted-foreground font-semibold block">Formas de Pagamento</span>
              <div className="flex items-center gap-3 text-xs text-foreground font-medium">
                <span className="flex items-center gap-1.5"><QrCode size={16} className="text-primary" /> Pix</span>
                <span className="flex items-center gap-1.5"><CreditCard size={16} /> Cartão</span>
                <span className="flex items-center gap-1.5"><Money size={16} /> Dinheiro</span>
              </div>
            </div>

            {/* Política de Cancelamento */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">Cancelamento Flexível</span>
              <p>Reagende ou cancele gratuitamente até 2 horas antes do horário marcado.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
