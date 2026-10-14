import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state/states";
import { OfferCard } from "@/design-system/primitives/card";
import { CategoryBubbleCarousel } from "@/design-system/patterns/discovery-patterns";
import { listPublishedProducts, listPublishedCategories } from "@/services/catalog.functions";
import { formatMoney } from "@/lib/money";
import type { CategoryDTO, ProductCardDTO } from "@/types/catalog";

export const Route = createFileRoute("/_store/categoria/$slug")({
 loader: async ({ params }) => {
   try {
 const [productsResult, categoriesResult] = await Promise.all([
 listPublishedProducts({ data: { categorySlug: params.slug } }),
 listPublishedCategories(),
 ]);
 return { productsResult, categoriesResult, slug: params.slug };
   } catch (err) {
     console.error("[loader:_store.categoria.$slug] Unhandled error:", err);
     return { productsResult: null, categoriesResult: null, slug: null };
   }
 },
 head: ({ loaderData }) => {
 const data = loaderData as any;
 const categoryName =
 data?.categoriesResult?.find((c: CategoryDTO) => c.slug === data?.slug)?.name ??
 data?.slug ??
 "Categoria";
 const title = `${categoryName}`;
 const description = `Confira os produtos da categoria ${categoryName} no Waesy. Qualidade, estilo e conforto para o seu dia a dia.`;
 const canonical =
 typeof window !== "undefined" ? `${window.location.origin}/categoria/${data?.slug}` : "";

 return {
 meta: [
 { title },
 { name: "description", content: description },
 { property: "og:title", content: title },
 { property: "og:description", content: description },
 { property: "og:type", content: "website" },
 ...(canonical ? [{ property: "og:url", content: canonical }] : []),
 { name: "twitter:title", content: title },
 { name: "twitter:description", content: description },
 ],
 links: canonical ? [{ rel: "canonical", href: canonical }] : [],
 scripts: [
 {
 type: "application/ld+json",
 children: JSON.stringify({
 "@context": "https://schema.org",
 "@type": "BreadcrumbList",
 itemListElement: [
 {
 "@type": "ListItem",
 position: 1,
 name: "Início",
 item: typeof window !== "undefined" ? window.location.origin : "",
 },
 {
 "@type": "ListItem",
 position: 2,
 name: "Catálogo",
 item: typeof window !== "undefined" ? `${window.location.origin}/catalogo` : "",
 },
 { "@type": "ListItem", position: 3, name: categoryName },
 ],
 }),
 },
 ],
 };
 },
 component: CategoryPage,
});

function CategoryPage() {
  const { productsResult, categoriesResult, slug } = ((Route.useLoaderData?.() as any) || {});
  const navigate = useNavigate();

  const categories: CategoryDTO[] = Array.isArray(categoriesResult) ? categoriesResult : [];
  const category: CategoryDTO | undefined = categories.find((c: CategoryDTO) => c.slug === slug);
  const products: ProductCardDTO[] = productsResult?.status === "ok" ? productsResult.data : [];

  const bubbleItems = useMemo(
    () => [
      { id: "all", label: "Todas", icon: <Store className="size-5" /> },
      ...categories.map((c: CategoryDTO) => ({
        id: c.slug,
        label: c.name,
        imageUrl: (c as any).image_url || (c as any).icon_url || undefined,
      })),
    ],
    [categories]
  );

  return (
    <div className="mx-auto max-w-screen-xl px-0 sm:px-4 py-3 sm:py-8 md:px-6 md:py-12 space-y-5">
      {/* Breadcrumb Limpo */}
      <nav
        aria-label="Navegação estrutural"
        className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto no-scrollbar py-1 table-wrapper"
      >
        <Link
          to="/"
          className="hover:text-foreground whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Início
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <Link
          to="/mercado"
          className="hover:text-foreground whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Catálogo
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <span className="text-foreground font-semibold truncate">{category?.name ?? slug}</span>
      </nav>

      {/* Carrossel de Categorias Irmãs Canônico Waesy DS 4.0 */}
      {categories.length > 0 && (
        <section aria-label="Navegação por Categorias" className="py-1">
          <CategoryBubbleCarousel
            items={bubbleItems}
            selectedId={slug ?? "all"}
            onSelect={(selectedId) => {
              if (selectedId === "all") {
                navigate({ to: "/mercado" });
              } else {
                navigate({ to: "/categoria/$slug", params: { slug: selectedId } });
              }
            }}
          />
        </section>
      )}

      {/* Título Limpo & Contagem */}
      <div className="space-y-1 pt-1">
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          {category?.name ?? slug}
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          {products.length} {products.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
      </div>

      <div className="pt-1">
        {products.length === 0 ? (
          <EmptyState
            title="Nenhum produto nesta categoria"
            action={
              <Button asChild className="h-11 min-h-11 px-5 rounded-lg font-semibold text-xs cursor-pointer">
                <Link to="/mercado">Ver todos os produtos</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: ProductCardDTO) => {
              const formattedPrice = formatMoney(product.priceCents);
              const formattedOriginal =
                product.compareAtCents && product.compareAtCents > product.priceCents
                  ? formatMoney(product.compareAtCents)
                  : undefined;

              return (
                <OfferCard
                  key={product.id}
                  title={product.title}
                  price={formattedPrice}
                  originalPrice={formattedOriginal}
                  imageUrl={product.coverUrl ?? undefined}
                  category={category?.name}
                  ctaText="Ver Produto"
                  onCtaClick={() =>
                    navigate({ to: "/produto/$slug", params: { slug: product.slug } })
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
