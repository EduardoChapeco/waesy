import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state/states";
import { ProductCard } from "@/components/commerce/product-card";
import { listPublishedProducts, listPublishedCategories } from "@/services/catalog.functions";
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

  const categories: CategoryDTO[] = Array.isArray(categoriesResult) ? categoriesResult : [];

  const category: CategoryDTO | undefined = categories.find((c: CategoryDTO) => c.slug === slug);

  const products: ProductCardDTO[] = productsResult?.status === "ok" ? productsResult.data : [];

  return (
    <div className="mx-auto max-w-screen-xl px-0 sm:px-4 py-3 sm:py-8 md:px-6 md:py-12 space-y-5">
      {/* Breadcrumb Limpo */}
      <nav
        aria-label="Navegação estrutural"
        className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto no-scrollbar py-0.5"
      >
        <Link to="/" className="hover:text-foreground whitespace-nowrap">
          Início
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <Link to="/mercado" className="hover:text-foreground whitespace-nowrap">
          Catálogo
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <span className="text-foreground font-semibold truncate">{category?.name ?? slug}</span>
      </nav>

      {/* Sibling Categories Chips Rail (1-Tap Fast Navigation) */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-semibold h-8 px-3.5 border-border/80 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Link to="/mercado">
              Todas
            </Link>
          </Button>
          {categories.map((c: CategoryDTO) => {
            const isActive = c.slug === slug;
            return (
              <Button
                key={c.id}
                asChild
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`rounded-full text-xs font-semibold h-8 px-3.5 shrink-0 transition-all ${
                  isActive
                    ? "shadow-xs font-bold"
                    : "border-border/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link to={"/categoria/$slug" as any} params={{ slug: c.slug } as any}>
                  {c.name}
                </Link>
              </Button>
            );
          })}
        </div>
      )}

      {/* Título Limpo & Contagem */}
      <div className="space-y-0.5 pt-1">
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
              <Button asChild className="rounded-xl">
                <Link to="/mercado">Ver todos os produtos</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product: ProductCardDTO) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
