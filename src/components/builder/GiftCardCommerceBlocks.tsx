/**
 * GiftCardCommerceBlocks.tsx — Blocos Nativos de Vales-Presente para o Omni-Builder
 *
 * Integra Vales-Presente como Content/Commerce Type nativo em sites de lojistas e vitrines.
 * Permite adicionar seções temáticas (ex: Natal, Aniversário, Fidelidade) com compra direta.
 */

import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, ArrowRight, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WzCardMockup } from "@/components/wz/WzCardMockup";
import { formatWz, wzToBrlCentsReference } from "@/lib/wz-quote-engine";

export interface GiftCardHeroBlockProps {
  title?: string;
  subtitle?: string;
  storeName?: string;
  storeLogo?: string | null;
  ctaText?: string;
  ctaLink?: string;
  featuredAmountWz?: number;
  designId?: string;
}

export function GiftCardHeroBlock({
  title = "Presenteie com Momentos Inesquecíveis",
  subtitle = "Escolha um vale-presente oficial, personalize com sua mensagem e entregue na hora ou agende para datas especiais.",
  storeName = "Nossa Loja",
  storeLogo,
  ctaText = "Comprar Vale-Presente",
  ctaLink = "/gift-cards",
  featuredAmountWz = 500000,
  designId = "classic_gold",
}: GiftCardHeroBlockProps) {
  return (
    <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 lg:px-8 bg-card border-y border-border/40 overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Lado Esquerdo: Mensagem e Ação */}
        <div className="space-y-4 text-center md:text-left">
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 gap-2 border-primary/30 text-primary">
            <Gift className="size-3.5" />
            <span>Vale-Presente Oficial</span>
          </Badge>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            {title}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">
            {subtitle}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
            <Button asChild className="rounded-xl h-11 min-h-11 px-6 font-bold text-sm bg-primary text-primary-foreground">
              <Link to={ctaLink as any}>
                <span>{ctaText}</span>
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl h-11 min-h-11 px-5 text-sm font-semibold">
              <Link to="/conta/gift-cards">
                <span>Resgatar Código</span>
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4 pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" /> Válido na Loja
            </span>
            <span className="flex items-center gap-1">
              <Shield className="size-3.5 text-primary" /> Protegido em $WZ
            </span>
          </div>
        </div>

        {/* Lado Direito: Mockup 3D Interativo */}
        <div className="flex justify-center">
          <WzCardMockup
            issuerName={storeName}
            issuerLogo={storeLogo}
            wzInitial={featuredAmountWz}
            cardDesignId={designId}
            scopeType="MERCHANT"
            showFlipButton
          />
        </div>
      </div>
    </section>
  );
}

export interface GiftCardShowcaseBlockProps {
  storeName?: string;
  storeLogo?: string | null;
  cards?: Array<{
    id: string;
    name: string;
    amountWz: number;
    designId: string;
  }>;
}

export function GiftCardShowcaseBlock({
  storeName = "Nossa Loja",
  storeLogo,
  cards = [
    { id: "c1", name: "Vale Especial", amountWz: 100000, designId: "minimal_dark" },
    { id: "c2", name: "Vale Ouro", amountWz: 500000, designId: "classic_gold" },
    { id: "c3", name: "Vale Aniversário", amountWz: 1000000, designId: "aniversario" },
  ],
}: GiftCardShowcaseBlockProps) {
  return (
    <section className="w-full py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Escolha o Valor do Presente
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Todos os vales são denominados em $WZ e utilizáveis em qualquer compra ou reserva.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const refCents = wzToBrlCentsReference(card.amountWz);
            const refBrl = (refCents / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            });

            return (
              <div
                key={card.id}
                className="bg-card rounded-2xl border border-border/60 p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
              >
                <WzCardMockup
                  issuerName={storeName}
                  issuerLogo={storeLogo}
                  wzInitial={card.amountWz}
                  cardDesignId={card.designId}
                  showFlipButton={false}
                  interactive={false}
                />

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{card.name}</span>
                    <span className="text-xs font-semibold text-primary">{formatWz(card.amountWz)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Valor de compra: {refBrl}
                  </p>
                </div>

                <Button asChild className="w-full rounded-xl h-11 min-h-11 font-bold text-xs bg-foreground text-background hover:bg-foreground/90">
                  <Link to="/gift-cards" search={{ amount: card.amountWz, design: card.designId } as any}>
                    Presentear Agora
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
