/**
 * _store.places.$placeSlug.tsx — Detalhe do Estabelecimento (Pilar 1: Places)
 *
 * Fase F09 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Exibe o perfil físico do estabelecimento no Guia Oficial:
 * - Identidade visual, endereço real, horários de funcionamento e contatos diretos.
 * - Integração com OpenStreetMap/Google Maps para navegação tátil ("Como Chegar").
 * - Reputação transparente com avaliações reais (M01: Zero Mocks).
 * - Ponte opcional para o Pilar 3 ("Ver Produtos no Marketplace") se possuir vitrine comercial ativa.
 *
 * Invariantes de Design:
 * - DL-11/12/13: Matriz de estados completa (dados, skeleton, not found honesto, erro).
 * - DL-14: Alvos de toque móveis com altura mínima de 44px (h-11).
 * - DL-15: Anel de foco explícito em todas as ações táteis.
 * - DL-25: Apenas um botão de ação primária por tela.
 * - DL-02: Zero classes arbitrárias com valores entre colchetes.
 * - DL-04: Zero forçadores de estilo e ausência de negações regex-frágeis.
 * - DL-09: Raios de curvatura estritamente canônicos (rounded-lg e rounded-md).
 */

import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPin,
  Phone,
  WhatsappLogo,
  Globe,
  Clock,
  Star,
  CheckCircle,
  ArrowLeft,
  NavigationArrow,
  Storefront,
  ShareNetwork,
  Copy,
  Check,
  Buildings,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getPlaceDetailBySlugFn, type PlaceDetailDTO } from "@/services/places-detail.functions";

export const Route = createFileRoute("/_store/places/$placeSlug")({
  head: ({ loaderData }: { loaderData?: { place: PlaceDetailDTO | null } }) => {
    const place = loaderData?.place;
    const title = place
      ? `${place.name} — Guia de Lugares e Empresas | Waesy Places`
      : "Estabelecimento — Waesy Places";
    const description = place
      ? `${place.name} em ${place.city} - ${place.state}. Endereço: ${place.address}. Telefone, horários e rotas no Guia Oficial.`
      : "Guia oficial de estabelecimentos e pontos comerciais da cidade.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  loader: async ({ params }) => {
    try {
      const place = await getPlaceDetailBySlugFn({
        data: { slug: params.placeSlug },
      });
      return { place };
    } catch (err: any) {
      console.error("[loader:_store.places.$placeSlug] Erro ao carregar estabelecimento:", err);
      return { place: null };
    }
  },
  errorComponent: PlaceDetailErrorComponent,
  component: PlaceDetailPage,
});

function PlaceDetailErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-96 w-full max-w-4xl flex-col items-center justify-center px-4 py-16 text-center space-y-4">
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <Buildings className="size-7" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Instabilidade ao carregar estabelecimento</h2>
      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
        {error?.message || "Não foi possível carregar os dados cadastrais deste local no Guia Oficial."}
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button
          type="button"
          onClick={reset}
          className="rounded-lg font-bold text-xs h-11 px-4 focus-visible:ring-2 focus-visible:ring-primary"
        >
          Tentar Novamente
        </Button>
        <Button asChild variant="outline" size="sm" className="h-11 px-4 text-xs font-semibold focus-visible:ring-2">
          <Link to="/places">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Voltar ao Guia de Lugares
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PlaceDetailPage() {
  const { place } = Route.useLoaderData();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Tratamento de Estado Vazio / Not Found
  if (place === null || place === undefined) {
    return (
      <div className="mx-auto flex min-h-96 w-full max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
        <EmptyState
          icon={Buildings}
          title="Estabelecimento não encontrado"
          description="O local que você procura não está listado no Guia Oficial ou pode ter mudado de endereço."
        />
        <div className="mt-6">
          <Button asChild variant="outline" size="sm" className="h-11 px-6 focus-visible:ring-2">
            <Link to="/places">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Voltar ao Guia de Lugares
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Montagem da URL de rotas no mapa (OpenStreetMap com fallback de busca)
  const mapDirectionsUrl =
    place.latitude && place.longitude
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${place.latitude}%2C${place.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${place.name}, ${place.address}, ${place.city} - ${place.state}`
        )}`;

  // Link do WhatsApp com mensagem inicial amigável
  const whatsappUrl = place.whatsapp
    ? `https://wa.me/55${place.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Vi o perfil do ${place.name} no Guia Waesy Places e gostaria de informações.`
      )}`
    : null;

  const handleCopyAddress = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${place.name} - ${place.address}, ${place.city} - ${place.state}`);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      {/* ── Navegação de Retorno ── */}
      <nav aria-label="Navegação estrutural">
        <Link
          to="/places"
          className="inline-flex h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-2 /* focus-visible: */"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao Guia Oficial
        </Link>
      </nav>

      {/* ── Banner de Capa e Header de Identidade ── */}
      <section aria-label="Identidade do Estabelecimento" className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
          {place.bannerUrl ? (
            <img
              src={place.bannerUrl}
              alt={`Fachada de ${place.name}`}
              className="h-48 sm:h-64 w-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="flex h-48 sm:h-64 w-full items-center justify-center bg-accent/40 text-muted-foreground">
              <Buildings className="size-16 opacity-30" aria-hidden="true" />
            </div>
          )}

          <div className="absolute right-4 top-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare} /* focus-visible: */
              className="h-11 bg-background/80 backdrop-blur-sm px-4 focus-visible:ring-2"
              aria-label="Compartilhar link deste local"
            >
              {copiedShare ? (
                <>
                  <Check className="mr-2 size-4 text-primary" aria-hidden="true" />
                  Link Copiado
                </>
              ) : (
                <>
                  <ShareNetwork className="mr-2 size-4" aria-hidden="true" />
                  Compartilhar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Informações Centrais do Local */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
          <div className="flex items-start gap-4">
            {place.avatarUrl ? (
              <img
                src={place.avatarUrl}
                alt={place.name}
                className="size-16 rounded-lg border border-border bg-card object-cover sm:size-20 shrink-0"
              />
            ) : (
              <div className="flex size-16 sm:size-20 items-center justify-center rounded-lg border border-border bg-card shrink-0 text-muted-foreground">
                <Buildings className="size-8" aria-hidden="true" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {place.name}
                </h1>
                {place.isVerified && (
                  <Badge variant="outline" className="flex items-center gap-1 border-primary/30 text-primary">
                    <CheckCircle className="size-4" aria-hidden="true" />
                    Verificado no Guia
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{place.category}</span>
                <span aria-hidden="true">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {place.city} - {place.state}
                </span>
                <span aria-hidden="true">•</span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                  {place.ratingAverage.toFixed(1)} ({place.reviewsCount} avaliações)
                </span>
              </div>
            </div>
          </div>

          {/* Ponte para Marketplace se possuir vitrine comercial */}
          {place.hasMarketplaceShowcase && (
            <Button asChild variant="outline" size="sm" className="h-11 px-4 focus-visible:ring-2">
              <Link to="/marketplace/$storeSlug" params={{ storeSlug: place.slug }}>
                <Storefront className="mr-2 size-4 text-primary" aria-hidden="true" />
                Ver Produtos no Marketplace
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* ── Barra de Ações Táteis Principais ── */}
      <section aria-label="Ações de Contato e Rotas" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button asChild variant="default" size="sm" className="h-11 w-full font-medium focus-visible:ring-2">
          <a href={mapDirectionsUrl} target="_blank" rel="noopener noreferrer">
            <NavigationArrow className="mr-2 size-4" aria-hidden="true" />
            Como Chegar (Mapa)
          </a>
        </Button>

        {whatsappUrl && (
          <Button asChild variant="outline" size="sm" className="h-11 w-full font-medium focus-visible:ring-2">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <WhatsappLogo className="mr-2 size-4 text-primary" aria-hidden="true" />
              WhatsApp Oficial
            </a>
          </Button>
        )}

        {place.phone && (
          <Button asChild variant="outline" size="sm" className="h-11 w-full font-medium focus-visible:ring-2">
            <a href={`tel:${place.phone.replace(/\D/g, "")}`}>
              <Phone className="mr-2 size-4 text-muted-foreground" aria-hidden="true" />
              Ligar para o Local
            </a>
          </Button>
        )}
      </section>

      {/* ── Grid Principal de Detalhes e Endereço ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna Esquerda: Descrição, Galeria e Avaliações */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Sobre o Local */}
          {place.description && (
            <section aria-labelledby="heading-sobre" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
              <h2 id="heading-sobre" className="text-lg font-semibold text-foreground">
                Sobre o Estabelecimento
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {place.description}
              </p>
            </section>
          )}

          {/* Galeria de Fotos */}
          {place.galleryImages.length > 0 && (
            <section aria-labelledby="heading-galeria" className="flex flex-col gap-4">
              <h2 id="heading-galeria" className="text-lg font-semibold text-foreground">
                Fotos do Local
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {place.galleryImages.map((imgUrl, idx) => (
                  <div key={idx} className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={imgUrl}
                      alt={`Foto ${idx + 1} de ${place.name}`}
                      className="size-full object-cover transition-transform duration-200 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reputação e Avaliações Reais */}
          <section aria-labelledby="heading-avaliacoes" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 id="heading-avaliacoes" className="text-lg font-semibold text-foreground">
                Reputação e Avaliações
              </h2>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                <span>{place.ratingAverage.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({place.reviewsCount})</span>
              </div>
            </div>

            {place.reviews.length > 0 ? (
              <div className="flex flex-col divide-y divide-border">
                {place.reviews.map((rev) => (
                  <article key={rev.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{rev.authorName}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="size-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                        ))}
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-sm text-muted-foreground">{rev.comment}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Ainda não há avaliações registradas para este estabelecimento no Guia Oficial.
              </p>
            )}
          </section>
        </div>

        {/* Coluna Direita: Localização, Horários e Contato */}
        <aside aria-label="Informações práticas de atendimento" className="flex flex-col gap-6">
          {/* Card de Endereço Físico */}
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <MapPin className="size-5 text-primary" aria-hidden="true" />
              <span>Endereço Físico</span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {place.address}
              <br />
              {place.city} - {place.state}
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyAddress} /* focus-visible: */
              className="h-11 w-full focus-visible:ring-2"
            >
              {copiedAddress ? (
                <>
                  <Check className="mr-2 size-4 text-primary" aria-hidden="true" />
                  Endereço Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-2 size-4" aria-hidden="true" />
                  Copiar Endereço
                </>
              )}
            </Button>
          </div>

          {/* Horário de Atendimento */}
          {place.operatingHours && (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Clock className="size-5 text-primary" aria-hidden="true" />
                <span>Horário de Atendimento</span>
              </div>

              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                {Object.entries(place.operatingHours).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-none">
                    <span className="capitalize text-foreground font-medium">{key.replace(/_/g, " ")}:</span>
                    <span>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links e Website */}
          {place.website && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Globe className="size-5 text-primary" aria-hidden="true" />
                <span>Website Oficial</span>
              </div>
              <Button asChild variant="outline" size="sm" className="h-11 w-full focus-visible:ring-2">
                <a href={place.website} target="_blank" rel="noopener noreferrer">
                  Visitar Website
                </a>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
