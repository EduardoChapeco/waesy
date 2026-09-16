import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Printer,
  Download,
  Share2,
  ArrowLeft,
  Loader2,
  Check,
  Compass,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPublicVoucherByToken } from "@/services/travel-lifecycle.functions";
import { VoucherBoardingCard } from "@/components/tourism/voucher-boarding-card";
import { exportElementAsPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/_store/voucher/$token")({
 head: ({ loaderData }: any) => ({
 meta: [
 {
 title: loaderData?.voucher
 ? `Voucher de Embarque: ${loaderData.voucher.destination || "Viagem"} — Waesy`
 : "Voucher de Embarque — Waesy",
 },
 ],
 }),
  loader: async ({ params }) => {
    try {
      const data = await getPublicVoucherByToken({ data: { token: params.token } });
      return { data };
    } catch (err) {
      console.error("[loader:_store.voucher.$token] Unhandled loader error:", err);
      return { data: null };
    }
  },
 component: PublicTravelVoucherPage,
});

function PublicTravelVoucherPage() {
 const { data } = ((Route.useLoaderData?.() as any) || {});
 const [isExportingPdf, setIsExportingPdf] = useState(false);
 const [isCopied, setIsCopied] = useState(false);

 if (!data || !data.voucher) {
 return (
 <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
 <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
 <Compass className="size-7" />
 </div>
 <div className="space-y-1">
 <h1 className="text-base font-bold text-foreground">Voucher não encontrado</h1>
 <p className="text-xs text-muted-foreground max-w-sm">
 Este voucher de viagem não está mais disponível ou o link informado expirou.
 </p>
 </div>
 <Button asChild size="sm" variant="outline" className="rounded-xl">
 <Link to="/">Ir para a Página Inicial</Link>
 </Button>
 </div>
 );
 }

 const { voucher, trip, store } = data;

 const handlePrint = () => {
 if (typeof window !== "undefined") {
 window.print();
 }
 };

 const handleExportPdf = async () => {
 try {
 setIsExportingPdf(true);
 await exportElementAsPdf(
 "voucher-printable-area",
 `Voucher_${voucher.voucher_code || "Embarque"}.pdf`
 );
 toast.success("Voucher PDF gerado com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao gerar PDF do voucher.");
 } finally {
 setIsExportingPdf(false);
 }
 };

 const handleCopyLink = () => {
 if (typeof navigator !== "undefined") {
 navigator.clipboard.writeText(window.location.href);
 setIsCopied(true);
 toast.success("Link do voucher copiado!");
 setTimeout(() => setIsCopied(false), 2000);
 }
 };

 const cleanPhone = (store.whatsapp_phone || "").replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-muted/20 py-4 sm:py-8 px-0 sm:px-4 md:px-0 space-y-6 animate-in fade-in duration-200">
 {/* ── BARRA DE AÇÕES SUPERIOR (OCULTA NA IMPRESSÃO) ── */}
 <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/80 print:hidden">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
 <Compass className="size-4" />
 </div>
 <div>
 <h1 className="text-xs font-bold text-foreground">Guia Oficial de Embarque</h1>
 <p className="text-[11px] text-muted-foreground">
 Voucher emitido por <span className="font-semibold text-foreground">{store.name}</span>
 </p>
 </div>
 </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="rounded-xl text-xs font-bold gap-1.5 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9"
          >
            {isCopied ? <Check className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5" />}
            <span>{isCopied ? "Copiado" : "Compartilhar"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isExportingPdf}
            onClick={handleExportPdf}
            className="rounded-xl text-xs font-bold gap-1.5 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9"
          >
            {isExportingPdf ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>Baixar PDF</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="rounded-xl text-xs font-bold gap-1.5 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 bg-foreground text-background hover:bg-foreground/90"
          >
            <Printer className="size-3.5" />
            <span>Imprimir</span>
          </Button>

 {cleanPhone && (
 <Button
 asChild
 size="sm"
 className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 <a
 href={`https://wa.me/55${cleanPhone}?text=Ol%C3%A1%2C%20estou%20com%20meu%20voucher%20${voucher.voucher_code}%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.`}
 target="_blank"
 rel="noopener noreferrer"
 >
 <WhatsappLogo className="size-4" weight="fill" />
 <span>Plantão Agência</span>
 </a>
 </Button>
 )}
 </div>
 </div>

 {/* ── CARD OFICIAL A4 DE EMBARQUE ── */}
 <VoucherBoardingCard
 voucher={voucher}
 tripNumber={trip?.trip_number}
 agency={{
 name: store.name,
 logo_url: store.logo_url,
 whatsapp_phone: store.whatsapp_phone,
 }}
 />
 </div>
 );
}
