import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Printer,
  Copy,
  Check,
  CheckCircle2,
  FileSignature,
  FileText,
  ShieldCheck,
  QrCode,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getCommercialInvoiceByPublicToken } from "@/services/commercial-invoices.functions";
import { BudgetCorporateClean } from "@/components/documents/templates/BudgetCorporateClean";
import type { CommercialDocumentData } from "@/components/documents/types";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_store/fatura/$token")({
  head: ({ loaderData }: { loaderData?: { invoice: any; loadError?: boolean } }) => ({
    meta: [
      {
        title: loaderData?.invoice?.invoice_code
          ? `Orçamento ${loaderData.invoice.invoice_code} | Waesy`
          : "Fatura Comercial | Waesy",
      },
      {
        name: "description",
        content: "Visualize seu orçamento comercial, faturas discriminadas e efetue pagamento ou aceite digital.",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const res = await getCommercialInvoiceByPublicToken({ data: { token: params.token } });
      return {
        invoice: res?.invoice || null,
        contractSigningToken: res?.contractSigningToken || null,
        contractVerificationCode: res?.contractVerificationCode || null,
        loadError: false,
      };
    } catch (err) {
      console.error("[loader:_store.fatura.$token] Loader error:", err);
      return { invoice: null, loadError: true };
    }
  },
  component: PublicCommercialInvoicePage,
});

function PublicCommercialInvoicePage() {
  const { invoice, contractSigningToken, contractVerificationCode, loadError } =
    ((Route.useLoaderData?.() as any) || {});
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);

  if (loadError || !invoice) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border border-destructive/30 bg-destructive/5 rounded-lg p-6 text-center space-y-4">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Orçamento Não Encontrado</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O link informado pode ter expirado ou o código do documento não existe mais. Entre em contato com a empresa emissora.
          </p>
          <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-4 rounded-lg mt-2 font-bold">
            <Link to="/">
              <ArrowLeft className="size-4 mr-2" />
              Voltar ao Início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const customer = invoice.customer_snapshot || {};
  const issuer = invoice.issuer_snapshot || {};
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const paymentTerms = invoice.payment_terms || {};

  // Formata os dados para o template institucional BudgetCorporateClean
  const documentData: CommercialDocumentData = useMemo(() => {
    return {
      id: invoice.id,
      code: invoice.invoice_code,
      title: `Orçamento Comercial · ${invoice.invoice_code}`,
      category: invoice.document_type || "budget",
      status: invoice.status || "draft",
      issueDate: new Intl.DateTimeFormat("pt-BR").format(new Date(invoice.issued_at || invoice.created_at)),
      validUntilDate: invoice.valid_until
        ? new Intl.DateTimeFormat("pt-BR").format(new Date(invoice.valid_until))
        : "Imediata",
      issuer: {
        companyName: issuer.companyName || "Empresa Parceira",
        tradingName: issuer.tradingName || issuer.companyName,
        cnpjOrCpf: issuer.cnpjOrCpf || "Não informado",
        address: issuer.address || "Endereço comercial",
        cityState: issuer.cityState || "Cidade - UF",
        phoneOrWhatsapp: issuer.phoneOrWhatsapp || "",
        email: issuer.email || "",
        logoUrl: issuer.logoUrl || undefined,
        pixKey: paymentTerms.pixKey || issuer.pixKey,
      },
      client: {
        name: customer.name || "Cliente",
        companyName: customer.companyName || undefined,
        cnpjOrCpf: customer.cpfOrCnpj || "Não informado",
        address: customer.address || "",
        cityState: customer.cityState || "",
        email: customer.email || "",
        phone: customer.phone || "",
      },
      items: items.map((it: any, idx: number) => ({
        id: it.id || `item-${idx}`,
        sku: it.sku || "",
        title: it.title || "Item",
        quantity: it.quantity || 1,
        unitPriceCents: it.unitPriceCents || 0,
        totalPriceCents: it.totalPriceCents || 0,
      })),
      subtotalCents: invoice.subtotal_cents || 0,
      discountCents: invoice.discount_cents || 0,
      totalCents: invoice.total_cents || 0,
      paymentTerms: {
        method: paymentTerms.method || "pix",
        methodLabel: paymentTerms.methodLabel || undefined,
        installmentsCount: paymentTerms.installmentsCount || 1,
        installmentValueCents: paymentTerms.installmentValueCents || invoice.total_cents,
        notes: paymentTerms.notes || paymentTerms.paymentInstructions || "",
      },
      legalNotes: invoice.notes || "Orçamento sujeito a disponibilidade de estoque e prazos acordados.",
    };
  }, [invoice, customer, issuer, items, paymentTerms]);

  const pixKey = paymentTerms.pixKey || issuer.pixKey || issuer.cnpjOrCpf || "";

  const handleCopyPix = () => {
    if (!pixKey) {
      toast.error("Chave PIX não cadastrada pela empresa.");
      return;
    }
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const phone = (issuer.phoneOrWhatsapp || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Telefone da empresa não disponível.");
      return;
    }
    const msg = `Olá! Estou visualizando o orçamento *${invoice.invoice_code}* no valor de ${formatMoney(invoice.total_cents)} e gostaria de tirar uma dúvida.`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-muted/20 text-foreground py-6 sm:py-10 px-4 print:p-0 print:bg-card">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Barra Superior com Controles e Ações do Cliente */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-lg print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs px-2 py-1 border-primary/30 text-primary">
                {invoice.invoice_code}
              </Badge>
              <Badge variant="secondary" className="text-2xs capitalize">
                {invoice.document_type === "invoice" ? "Fatura" : "Orçamento Comercial"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Emitido para <strong className="text-foreground">{customer.name}</strong> • Total: <strong className="text-primary font-mono">{formatMoney(invoice.total_cents)}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-11 min-h-11 px-4 text-xs font-semibold focus-visible:ring-2"
            >
              <Printer className="size-4 mr-2" />
              Imprimir A4
            </Button>

            {pixKey && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPixModalOpen(true)}
                className="h-11 min-h-11 px-4 text-xs font-semibold text-emerald-600 hover:text-emerald-700 focus-visible:ring-2"
              >
                <QrCode className="size-4 mr-2" />
                Pagar com PIX
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenWhatsApp}
              className="h-11 min-h-11 px-4 text-xs font-semibold text-emerald-600 hover:text-emerald-700 focus-visible:ring-2"
            >
              <WhatsappLogo className="size-4 mr-2" />
              Falar com a Empresa
            </Button>

            {invoice.contract_id && (
              <Button
                asChild
                className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2"
              >
                <Link to="/workspace/contratos/$id/editor" params={{ id: invoice.contract_id }}>
                  <FileSignature className="size-4 mr-2" />
                  Ver Contrato
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Folha de Papel A4 do Orçamento */}
        <div className="bg-card border border-border/80 rounded-lg p-2 sm:p-6 print:border-none print:p-0">
          <BudgetCorporateClean data={documentData} />
        </div>
      </div>

      {/* Modal de Pagamento PIX com QR Code Dinâmico */}
      <Dialog open={pixModalOpen} onOpenChange={setPixModalOpen}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <QrCode className="size-6" />
            </div>
            <DialogTitle className="text-lg font-bold">Pagamento via PIX</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transfira o valor exato do orçamento para a empresa emissora.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/40 p-4 rounded-lg border border-border/70 space-y-2">
              <span className="text-xs text-muted-foreground block">Valor do Orçamento:</span>
              <span className="text-3xl font-black font-mono text-primary block">
                {formatMoney(invoice.total_cents)}
              </span>
              <span className="text-2xs text-muted-foreground block">
                Beneficiário: <strong className="text-foreground">{issuer.companyName}</strong>
              </span>
            </div>

            <div className="space-y-2 text-left">
              <span className="text-xs font-semibold text-muted-foreground">Chave PIX:</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted p-3 rounded-lg font-mono text-xs truncate border border-border">
                  {pixKey}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyPix}
                  className="h-11 min-h-11 px-4 text-xs font-semibold shrink-0"
                >
                  {copiedPix ? <Check className="size-4 mr-1 text-emerald-600" /> : <Copy className="size-4 mr-1" />}
                  {copiedPix ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPixModalOpen(false)}
              className="h-11 min-h-11 w-full text-xs font-bold"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
