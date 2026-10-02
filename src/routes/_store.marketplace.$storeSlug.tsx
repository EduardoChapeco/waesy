/**
 * _store.marketplace.$storeSlug.tsx — Vitrine Pública da Loja no Marketplace
 *
 * Fase F07 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Exibe a vitrine pública de uma loja credenciada com SSR e SEO canônico.
 * Isolamento estrito do Pilar 3 (Marketplace): somente empresas credenciadas (Workspace Pro).
 *
 * Invariantes: DL-11/12/13 (loading/empty/error), DL-14 (touch >= 44px), DL-15 (focus-visible),
 *              DL-16/17 (contraste >= 4.5:1), Zero hex/rgb literal, Zero !important.
 */

import React, { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  MapPin,
  WhatsappLogo,
  Storefront,
  ArrowLeft,
  MagnifyingGlass,
  CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { formatMoney } from "@/lib/money";
import {
  getMarketplaceStoreShowcaseFn,
  type MarketplaceProductDTO,
} from "@/services/marketplace-showcase.functions";

export const Route = createFileRoute("/_store/marketplace/$storeSlug")({
  head: ({ loaderData }: any) => {
    const store = loaderData?.store;
    if (store === null || store === undefined) {
      return {
        title: "Empresa Não Encontrada | Marketplace Waesy",
        meta: [
          {
            name: "description",
            content: "A empresa solicitada não foi localizada no Marketplace oficial.",
          },
        ],
      };
    }

    const title = `${store.name} | Vitrine no Marketplace Waesy`;
    const description =
      store.description ||
      `Confira produtos e serviços de ${store.name} com entrega rápida e garantia no Marketplace Waesy.`;

    const metaList = [
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ];

    if (store.logoUrl) {
      metaList.push({ property: "og:image", content: store.logoUrl });
    }

    return {
      title,
      meta: metaList,
      links: [
        {
          rel: "canonical",
          href: `https://usewaesy.pages.dev/marketplace/${store.slug}`,
        },
      ],
    };
  },

  loader: async ({ params }) => {
    try {
      const data = await getMarketplaceStoreShowcaseFn({
        data: { storeSlug: params.storeSlug },
      });
      return {
        store: data.store,
        products: data.products,
        storeSlug: params.storeSlug,
      };
    } catch (err: unknown) {
      console.warn("[marketplace-store] Erro ao carregar vitrine:", err);
      return {
        store: null,
        products: [],
        storeSlug: params.storeSlug,
      };
    }
  },

  component: MarketplaceStoreShowcasePage,
});

function MarketplaceStoreShowcasePage() {
  const { store, products } = Route.useLoaderData();
  const [searchFilter, setSearchFilter] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchFilter.trim()) return products;
    const term = searchFilter.toLowerCase();
    return products.filter((p: MarketplaceProductDTO) =>
      p.title.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }, [products, searchFilter]);

  // Estado 1: Loja Não Encontrada
  if (store === null || store === undefined) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Storefront className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Empresa Não Encontrada
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          A vitrine solicitada não existe ou não está credenciada no Marketplace.
        </p>
        <div className="mt-6">
          <Button asChild variant="default" size="sm" className="h-11 px-6 focus-visible:ring-2">
            <Link to="/marketplace">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Voltar ao Marketplace
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const cleanPhone = store.phone ? store.phone.replace(/\D/g, "") : null;
  const whatsappUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=Olá,%20vi%20sua%20loja%20no%20Marketplace%20Waesy`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:py-8">
      {/* ── Breadcrumb de Navegação ── */}
      <nav aria-label="Navegação estrutural" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          to="/marketplace"
          className="inline-flex h-11 items-center transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring /* focus-visible: */"
        >
          Marketplace
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-foreground">{store.name}</span>
      </nav>

      {/* ── Cabeçalho da Vitrine de Loja ── */}
      <section
        aria-label="Perfil da Empresa"
        className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 sm:p-8 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Avatar / Logo */}
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted sm:size-20">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={`Logo de ${store.name}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Storefront className="size-8 text-muted-foreground" aria-hidden="true" />
            )}
          </div>

          {/* Dados da Loja */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {store.name}
              </h1>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary gap-1">
                <ShieldCheck className="size-3.5" weight="bold" aria-hidden="true" />
                Empresa Verificada
              </Badge>
            </div>

            {store.description && (
              <p className="line-clamp-2 max-w-2xl text-xs text-muted-foreground sm:text-sm">
                {store.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {store.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {store.city}
                  {store.state ? ` — ${store.state}` : ""}
                </span>
              )}
              {store.niche && (
                <Badge variant="secondary" className="text-xs uppercase">
                  {store.niche}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Ações de Contato */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring /* focus-visible: */"
            >
              <WhatsappLogo className="mr-2 size-4 text-success" weight="bold" aria-hidden="true" />
              WhatsApp Oficial
            </a>
          )}
          <Button asChild variant="outline" size="sm" className="h-11 px-4 focus-visible:ring-2">
            <Link to="/places">
              <Storefront className="mr-2 size-4" aria-hidden="true" />
              Guia Places
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Barra de Busca e Filtragem Interna da Vitrine ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Buscar nos produtos da loja..."
            aria-label="Buscar produtos desta empresa"
            className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <span className="text-xs text-muted-foreground">
          {filteredProducts.length}{" "}
          {filteredProducts.length === 1 ? "produto disponível" : "produtos disponíveis"}
        </span>
      </div>

      {/* ── Matriz de Estados: Grade de Produtos ou Vazio ── */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Storefront}
          title="Nenhum produto encontrado"
          description={
            searchFilter
              ? "Nenhum item corresponde à busca informada nesta vitrine."
              : "Esta empresa ainda não cadastrou produtos ativos para compra online."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product: MarketplaceProductDTO) => (
            <article
              key={product.id}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-border/80"
            >
              {/* Imagem do Produto */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-105 motion-reduce:transform-none"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Storefront className="size-8" aria-hidden="true" />
                  </div>
                )}
                {product.compareAtCents && product.compareAtCents > product.priceCents && (
                  <div className="absolute left-2 top-2">
                    <Badge variant="destructive" className="text-xs">
                      Oferta
                    </Badge>
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                <div className="space-y-1">
                  <h2 className="line-clamp-2 text-sm font-semibold text-foreground">
                    {product.title}
                  </h2>
                  {product.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-foreground">
                      {formatMoney(product.priceCents)}
                    </span>
                    {product.compareAtCents && product.compareAtCents > product.priceCents && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatMoney(product.compareAtCents)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-xs text-success">
                    <CheckCircle className="size-3.5" weight="fill" aria-hidden="true" />
                    <span>Pronta entrega</span>
                  </div>
                </div>

                {/* CTA Acessível */}
                <div className="pt-2">
                  <Link
                    to="/produto/$slug"
                    params={{ slug: product.slug }}
                    className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring /* focus-visible: */"
                  >
                    Ver Detalhes
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
