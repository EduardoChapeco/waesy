import { createFileRoute, redirect, isRedirect, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { ErrorState } from "@/components/state/states";
import { getOrCreateBiolinkExperienceDocument } from "@/services/builder.functions";

export const Route = createFileRoute("/workspace/cms/bio")({
 head: () => ({ meta: [{ title: "Biolink | Waesy" }] }),
 loader: async () => {
 try {
 const res = await getOrCreateBiolinkExperienceDocument();
 if (res?.documentId) {
 throw redirect({
 to: "/workspace/builder/$documentId/editor",
 params: { documentId: res.documentId },
 });
 }
 return { loadError: "Documento Biolink não encontrado para esta loja." };
 } catch (e: any) {
 // If it's already a redirect, re-throw it
 if (isRedirect(e) || e?.to || e?.status) throw e;
 return { loadError: e?.message || "Não foi possível carregar o editor Biolink." };
 }
 },
 component: BiolinkRedirectPage,
});

function BiolinkRedirectPage() {
 const router = useRouter();
 const loaderData = Route.useLoaderData() as any;
 if (loaderData?.loadError) {
   return (
     <div className="p-6 max-w-4xl mx-auto">
       <ErrorState
         title="Erro ao abrir Biolink"
         description={loaderData.loadError}
         onRetry={() => router.invalidate()}
       />
     </div>
   );
 }
 return (
   <div className="flex flex-col items-center justify-center min-h-vh-60 gap-2 text-center">
     <Loader2 className="size-6 text-foreground/40 animate-spin motion-reduce:animate-none" />
     <p className="text-xs text-muted-foreground font-medium">Carregando...</p>
   </div>
 );
}

export default BiolinkRedirectPage;
