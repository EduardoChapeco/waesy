import { createFileRoute } from "@tanstack/react-router";
import { NativeMobileHeader } from "@/components/navigation";
import { EmptyState } from "@/components/state/states";
import { getPublicFaqs } from "@/services/catalog.functions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_store/faq")({
 head: () => ({ meta: [{ title: "Perguntas frequentes" }] }),
 loader: async () => {
   try {
     return await getPublicFaqs();
   } catch (err) {
     console.error("[loader:_store.faq] Unhandled error:", err);
     return [];
   }
 },
 component: Page,
});

function Page() {
 const faqs = Route.useLoaderData() as Array<{
 question: string;
 answer: string;
 q?: string;
 a?: string;
 }>;

 return (
    <div className="w-full">
      <NativeMobileHeader
        title="Dúvidas"
        fallbackHref="/"
      />
      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between border-b border-border/40 pb-4 pt-2 mb-6 max-w-3xl mx-auto px-4 md:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dúvidas Frequentes</h1>
          <p className="text-xs text-muted-foreground mt-1">Perguntas comuns sobre pedidos, entregas e funcionamento da plataforma</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10 space-y-6">
 {!faqs || faqs.length === 0 ? (
 <EmptyState title="Nenhuma pergunta publicada" />
 ) : (
 <Accordion type="single" collapsible className="w-full space-y-3">
 {faqs.map((faq, i) => {
 const question = faq.question || faq.q || "Pergunta";
 const answer = faq.answer || faq.a || "";
 return (
 <AccordionItem
 key={i}
 value={`faq-${i}`}
 className="rounded-lg px-4 bg-card border border-border/50"
 >
 <AccordionTrigger className="text-base font-medium py-4 hover:no-underline text-left">
 {question}
 </AccordionTrigger>
 <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
 {answer}
 </AccordionContent>
 </AccordionItem>
 );
 })}
 </Accordion>
 )}
 </div>
 </div>
 );
}
