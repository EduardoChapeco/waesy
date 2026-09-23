import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state/states";
import { ProductCard } from "@/components/commerce/product-card";
import { getCollectionBySlug } from "@/services/catalog.functions";

export const Route = createFileRoute("/_store/colecao/$slug")({
  loader: async ({ params }) => {
    try {
      return getCollectionBySlug({ data: { slug: params.slug } });
    } catch (err) {
      console.error("[loader:_store.colecao.$slug] Unhandled error:", err);
      return null as any;
    }
  },
  head: ({ loaderData }) => {
    const data = loaderData as any;
    const title = data?.collection?.seo_title || data?.collection?.name || "Coleção";
    const description = data?.collection?.seo_description || data?.collection?.description || "";
    return {
      meta: [
        { title: `${title} | Waesy` },
        { name: "description", content: description },
      ],
    };
  },
  component: CollectionPage,
});

function CollectionPage() {
  const { collection, products } = ((Route.useLoaderData?.() as any) || {});
  const productList = Array.isArray(products) ? products : [];

  if (!collection) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-20">
        <EmptyState
          title="Coleção não encontrada"
          action={
            <Button asChild className="rounded-xl h-11 px-6 text-sm font-semibold shadow-xs">
              <Link to="/mercado">Ver todos os produtos</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-0 sm:px-4 py-4 sm:py-8 md:px-6 md:py-12 space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Navegação estrutural"
        className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
      >
        <Link to="/" className="hover:text-foreground">
          Início
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link to="/mercado" className="hover:text-foreground">
          Catálogo
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <span className="text-foreground font-medium">{collection.name}</span>
      </nav>

      {/* Header do Título */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {collection.description}
          </p>
        )}
      </div>

      {/* Cover */}
      {collection.cover_url && (
        <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden bg-muted shadow-xs">
          <img
            src={collection.cover_url}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Grid */}
      {productList.length === 0 ? (
        <EmptyState
          title="Coleção ainda sem produtos"
          description="Esta coleção está sendo abastecida com novas peças e itens exclusivos."
          action={
            <Button asChild className="rounded-xl h-11 px-6 text-sm font-semibold shadow-xs">
              <Link to="/mercado">Explorar Catálogo</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {productList.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
