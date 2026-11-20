import { createFileRoute } from "@tanstack/react-router";
import { getLegalDocumentBySlug } from "@/services/legal.functions";
import { getPageBySlug } from "@/services/cms.functions";
import { LegalDocumentViewer } from "@/components/legal/legal-document-viewer";
import { PageHeader } from "@/components/commerce/page-header";
import { EmptyState } from "@/components/state/states";
import { sanitizeNarrativeDescription } from "@/lib/ad-engine/content-blocks/sanitizer";

export const Route = createFileRoute("/_store/politicas/$slug")({
 head: ({ loaderData }) => ({
 meta: [
 {
 title: (loaderData as any)?.title
 ? `${(loaderData as any).title} | Waesy`
 : "Políticas & Diretrizes | Waesy",
 },
 ],
 }),
 loader: async ({ params }) => {
 try {
 // 1. Tenta carregar do repositório canônico de documentos legais
 const legalDoc = await getLegalDocumentBySlug({ data: { slug: params.slug } }).catch(() => null);
 if (legalDoc) {
 return { type: "legal_document" as const, data: legalDoc };
 }

 // 2. Fallback para CMS de páginas da loja
 const res = await getPageBySlug({ data: { slug: params.slug } }).catch(() => null);
 if (res && !("status" in res)) {
 return { type: "cms_page" as const, data: res };
 }

 return { type: null, data: null };
 } catch {
 return { type: null, data: null };
 }
 },
 component: PoliticasSlugPage,
});

function PoliticasSlugPage() {
 const result = Route.useLoaderData() as
 | { type: "legal_document"; data: any }
 | { type: "cms_page"; data: any }
 | { type: null; data: null }
 | null;

 if (!result || !result.data) {
 return (
 <div className="container py-20">
 <EmptyState title="Documento legal não encontrado" />
 </div>
 );
 }

 if (result.type === "legal_document") {
 return <LegalDocumentViewer document={result.data} />;
 }

 const page = result.data as any;

 return (
 <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
 <PageHeader eyebrow="Documento" title={page?.title || "Política"} />
 <div className="mt-8">
 <div className="prose prose-neutral dark:prose-invert max-w-none">
 {page?.sections?.map((section: any) => (
 <div key={section.id}>
 {section.section_type === "text" && (
 <div dangerouslySetInnerHTML={{ __html: sanitizeNarrativeDescription(section.content?.html || "") }} />
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
