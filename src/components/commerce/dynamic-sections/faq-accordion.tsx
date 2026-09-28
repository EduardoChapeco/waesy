import * as React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface FAQAccordionProps {
 node_id: string;
 block_type: string;
 content?: {
 title?: string;
 description?: string;
 faqs?: Array<{
 question: string;
 answer: string;
 }>;
 };
 design_tokens?: any;
}

export function FaqAccordion({ content, design_tokens }: FAQAccordionProps) {
 const faqs = content?.faqs || [];

 return (
 <div
 className={cn("w-full py-8", design_tokens?.className)}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 <div className="mx-auto max-w-3xl px-4 @md:px-6">
 {(content?.title || content?.description) && (
 <div className="mb-8 text-center">
 {content?.title && (
 <h2 className="text-3xl font-bold tracking-tight mb-2">{content.title}</h2>
 )}
 {content?.description && <p className="text-muted-foreground">{content.description}</p>}
 </div>
 )}

 {faqs.length > 0 ? (
 <Accordion type="single" collapsible className="w-full">
 {faqs.map((faq, idx) => (
 <AccordionItem key={idx} value={`item-${idx}`}>
 <AccordionTrigger className="text-left text-base font-medium">
 {faq.question}
 </AccordionTrigger>
 <AccordionContent className="text-muted-foreground leading-relaxed">
 {faq.answer}
 </AccordionContent>
 </AccordionItem>
 ))}
 </Accordion>
 ) : (
 <div className="p-4 border border-dashed text-center text-muted-foreground bg-muted/50 rounded-xl">
 Adicione perguntas frequentes pelo inspetor.
 </div>
 )}
 </div>
 </div>
 );
}
