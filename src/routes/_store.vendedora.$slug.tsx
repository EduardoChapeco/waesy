import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicExperienceDocumentBySlug } from "@/services/builder.functions";
import { ExperienceRenderer } from "@/components/commerce/experience-renderer";
import { useEffect } from "react";

export const Route = createFileRoute("/_store/vendedora/$slug")({
 loader: async ({ params }) => {
   try {
 const res = await getPublicExperienceDocumentBySlug({
 data: { slug: params.slug, document_type: "seller_showcase" },
 });

 if (res.status !== "ok") throw notFound();

 return {
 document: res.data.document,
 tree: res.data.tree,
 };
   } catch (err) {
     console.error("[loader:_store.vendedora.$slug] Unhandled error:", err);
     return { document: null, tree: null };
   }
 },
 head: ({ loaderData }) => {
 if (!loaderData || !loaderData.document) return { meta: [{ title: "Vitrine não encontrada" }] };
 return {
 meta: [
 {
 title: loaderData.document.seo_metadata?.title || `${loaderData.document.title}`,
 },
 { name: "description", content: loaderData.document.seo_metadata?.description || "" },
 ],
 };
 },
 component: SellerShowcasePage,
});

function SellerShowcasePage() {
 const { document, tree } = ((Route.useLoaderData?.() as any) || {});

 useEffect(() => {
 if (document && document.owner_id) {
 // Set the affiliate attribution cookie for 30 days
 window.document.cookie = `waesy_affiliate_id=${document.owner_id}; path=/; max-age=2592000; SameSite=Lax`;
 }
 }, [document?.owner_id]);

 if (!document) return null;

 return (
 <main className="w-full flex flex-col gap-0 min-h-dvh">
 <ExperienceRenderer nodes={tree} />
 </main>
 );
}
