import { createFileRoute } from "@tanstack/react-router";
import { NativeMobileHeader } from "@/components/navigation";
import { EmptyState } from "@/components/state/states";
import { getPublicFaqs } from "@/services/catalog.functions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const DEFAULT_FAQS = [
  {
    question: "O que é o ecossistema Waesy e como funciona?",
    answer: "A Waesy é um ecossistema operacional integrado para comércio local, prestadores de serviços, turismo e logística urbana. Conectamos consumidores a estabelecimentos da sua cidade com pagamentos seguros e despacho express.",
  },
  {
    question: "Como funciona o despacho e as entregas urbanas?",
    answer: "Os pedidos podem ser retirados no balcão ou despachados via entregadores autônomos e frotas integradas. A plataforma opera com taxa fixa justa por entrega finalizada, e o cliente pode acompanhar o status em tempo real.",
  },
  {
    question: "Como funciona o módulo Turis e as viagens com a Excelência Tour?",
    answer: "O Turis é o canal oficial de viagens e experiências turísticas do Waesy. Todas as propostas, pacotes aéreos e reservas são operados por agências credenciadas, tendo a Excelência Tour como agência parceira padrão no atendimento e suporte local.",
  },
  {
    question: "Quais são as formas de pagamento aceitas?",
    answer: "Aceitamos Pix com liquidação instantânea, cartões de crédito e débito através de intermediadores seguros com conformidade PCI-DSS, além de faturamento corporativo para empresas cadastradas.",
  },
  {
    question: "Como cadastrar minha empresa ou loja na plataforma?",
    answer: "Acesse a opção 'Cadastrar Negócio' no menu ou rodapé. O onboarding é rápido e permite configurar produtos, horário de funcionamento, formas de entrega e receber pedidos no mesmo dia.",
  },
  {
    question: "Como meus dados são protegidos na plataforma?",
    answer: "Adotamos a governança rigorosa da Lei Geral de Proteção de Dados (LGPD). Seus dados são criptografados e utilizados exclusivamente para o cumprimento dos serviços contratados.",
  },
];

export const Route = createFileRoute("/_store/faq")({
  head: () => ({ meta: [{ title: "Dúvidas Frequentes | Waesy" }] }),
  loader: async () => {
    try {
      const data = await getPublicFaqs();
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_FAQS;
    } catch (err) {
      console.error("[loader:_store.faq] Unhandled error:", err);
      return DEFAULT_FAQS;
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
      <div className="hidden md:flex items-center justify-between border-b border-border/40 pb-4 pt-2 mb-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dúvidas Frequentes</h1>
          <p className="text-xs text-muted-foreground mt-1">Perguntas comuns sobre pedidos, entregas e funcionamento da plataforma</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl py-4 md:py-8 space-y-4">
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
