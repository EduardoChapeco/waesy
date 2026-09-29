import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
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
 } catch (e: any) {
 // If it's already a redirect, re-throw it
 if (isRedirect(e) || e?.to || e?.status) throw e;
 }

 // Fallback: Redireciona para o Hub de Sites & Vitrines
 throw redirect({
 to: "/workspace/marketing/vitrine",
 });
 },
 component: BiolinkRedirectPage,
});

function BiolinkRedirectPage() {
 return (
   <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2 text-center">
     <Loader2 className="size-6 text-foreground/40 animate-spin" />
     <p className="text-xs text-muted-foreground font-medium">Carregando...</p>
   </div>
 );
}

export default BiolinkRedirectPage;
