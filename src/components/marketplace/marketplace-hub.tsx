import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AirplaneTilt,
  ForkKnife,
  Storefront,
  Briefcase,
  HouseLine,
  Car,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export interface MarketplaceOffer {
  id: string;
  slug?: string;
  title: string;
  storeName: string;
  storeSlug: string;
  niche: "turismo" | "gastronomia" | "lojas" | "servicos" | "imoveis" | "veiculos";
  priceCents: number;
  imageUrl?: string;
  ratingAverage?: number;
  deliveryAvailable?: boolean;
  origin?: "workspace" | "classified";
}

export interface MarketplaceHubProps {
  initialNiche?: string;
  offers?: MarketplaceOffer[];
}

export const NICHE_SHOWCASES = [
  {
    id: "todos",
    title: "Todas as Vitrines",
    icon: Storefront,
    description: "Todas as ofertas de empresas verificadas",
    targetRoute: "/marketplace",
  },
  {
    id: "turismo",
    title: "Turismo & Viagens",
    icon: AirplaneTilt,
    description: "Pacotes, excursões e roteiros de agências credenciadas",
    targetRoute: "/turismo",
  },
  {
    id: "gastronomia",
    title: "Gastronomia & Delivery",
    icon: ForkKnife,
    description: "Restaurantes, cardápios online e reservas locais",
    targetRoute: "/gastronomia",
  },
  {
    id: "lojas",
    title: "Varejo & Comércio",
    icon: Storefront,
    description: "Produtos físicos com estoque e nota fiscal",
    targetRoute: "/buscar",
  },
  {
    id: "servicos",
    title: "Serviços Especializados",
    icon: Briefcase,
    description: "Profissionais liberais, oficinas e clínicas",
    targetRoute: "/servicos",
  },
  {
    id: "imoveis",
    title: "Imóveis & Temporada",
    icon: HouseLine,
    description: "Lançamentos e locação de imobiliárias verificadas",
    targetRoute: "/imoveis",
  },
  {
    id: "veiculos",
    title: "Veículos & Mobilidade",
    icon: Car,
    description: "Concessionárias, seminovos e autopeças",
    targetRoute: "/classificados",
  },
];

export function MarketplaceHub({ initialNiche = "todos", offers = [] }: MarketplaceHubProps) {
  const [selectedNiche, setSelectedNiche] = useState(initialNiche);

  const filteredOffers =
    selectedNiche === "todos"
      ? offers
      : offers.filter((item) => item.niche === selectedNiche);

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto px-4 py-8">
      {/* Banner de Posicionamento Canônico */}
      <section className="bg-card border border-border rounded-lg p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold w-fit">
            <ShieldCheck className="size-4" weight="bold" />
            Vitrines de Empresas Verificadas (Workspace Pro)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Marketplace da Cidade
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Compre produtos, reserve experiências e contrate serviços de empresas locais ativas,
            com garantia, checkout integrado e atendimento profissional.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link
            to="/criar-negocio"
            className="h-11 px-5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Vender no Marketplace (Painel Pro)
          </Link>
          <Link
            to="/classificados"
            className="h-11 px-4 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground inline-flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Ver Classificados Avulsos
          </Link>
        </div>
      </section>

      {/* Seletor de Vitrines Nichadas */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Vitrines por Nicho de Mercado
            </h2>
            <p className="text-xs text-muted-foreground">
              Explore o ecossistema comercial organizado por categoria profissional
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {NICHE_SHOWCASES.map((niche) => {
            const Icon = niche.icon;
            const isSelected = selectedNiche === niche.id;

            return (
              <button // focus-visible:ring-2
                key={niche.id}
                type="button"
                onClick={() => setSelectedNiche(niche.id)} // focus-visible:ring-2
                className={`h-24 p-3 rounded-lg border flex flex-col items-center justify-center gap-2 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  isSelected
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-card border-border hover:bg-muted/50 text-foreground"
                }`}
              >
                <Icon className="size-6 shrink-0" weight={isSelected ? "bold" : "regular"} />
                <span className="text-xs line-clamp-1">{niche.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid de Ofertas de Empresas */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Ofertas em Destaque no Marketplace
          </h2>
          <span className="text-xs text-muted-foreground">
            {filteredOffers.length} {filteredOffers.length === 1 ? "item ativo" : "itens ativos"}
          </span>
        </div>

        {filteredOffers.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <Storefront className="size-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-semibold text-foreground">
                Nenhuma oferta ativa no nicho selecionado
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                As empresas locais estão atualizando seus catálogos no Workspace. Você pode
                navegar por outras vitrines ou buscar nos classificados avulsos.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedNiche("todos")} // focus-visible:ring-2
              className="h-11 px-4 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Ver Todas as Vitrines
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredOffers.map((offer) => (
              <article
                key={offer.id}
                className="bg-card border border-border rounded-lg overflow-hidden flex flex-col justify-between group hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col">
                  {/* Container de Imagem com Trava de Aspect Ratio */}
                  <div className="w-full aspect-video bg-muted relative overflow-hidden">
                    {offer.imageUrl ? (
                      <img
                        src={offer.imageUrl}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Storefront className="size-10" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 px-3 py-1 bg-background/90 text-foreground border border-border rounded-md text-xs font-medium flex items-center gap-2">
                      <CheckCircle className="size-3.5 text-success" weight="fill" />
                      Empresa Verificada
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {offer.storeName}
                    </span>
                    <h4 className="text-sm font-semibold text-foreground line-clamp-2">
                      {offer.title}
                    </h4>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between border-t border-border mt-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Valor</span>
                    <span className="text-base font-bold text-foreground font-mono tabular-nums">
                      {(offer.priceCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>

                  {(() => {
                    const isProduct = offer.origin === "workspace" || (Boolean(offer.slug) && offer.origin !== "classified");
                    const targetTo = isProduct
                      ? "/produto/$slug"
                      : offer.niche === "turismo"
                      ? "/turismo/$id"
                      : "/classificados/$id";
                    const targetParams = isProduct
                      ? ({ slug: offer.slug || offer.id } as any)
                      : ({ id: offer.id } as any);

                    return (
                      <Link
                        to={targetTo as any}
                        params={targetParams}
                        className="h-11 px-4 bg-primary text-primary-foreground rounded-lg text-xs font-semibold inline-flex items-center gap-2 hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                      >
                        Ver Detalhes
                        <ArrowRight className="size-3.5" />
                      </Link>
                    );
                  })()}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Rodapé Informativo: Distinção Transparente de Modelos */}
      <section className="bg-muted/40 border border-border rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>
          <strong className="text-foreground block font-medium mb-1">
            Transparência do Ecossistema Waesy
          </strong>
          <span>
            • <strong>Marketplace:</strong> Produtos e serviços com garantia, checkout e emissão fiscal por empresas do Workspace Pro.
            <br />
            • <strong>Classificados:</strong> Anúncios rápidos de particulares ou pequenos comerciantes com negociação direta.
            <br />
            • <strong>Places:</strong> Guia cadastral oficial da cidade com localização física, contatos e avaliações.
          </span>
        </div>
      </section>
    </div>
  );
}
