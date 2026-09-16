import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Share2,
  Calendar,
  CheckCircle,
  Building2,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listStoreNFeInvoices,
  exportFiscalBatch,
  generateAccountantShareLink,
  getStoreNFeConfig,
} from "@/services/fiscal-nfe.functions";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/contador/")({
  head: () => ({
    meta: [{ title: "Portal da Contabilidade & Lote Fiscal | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [config, invoices, batch] = await Promise.all([
        getStoreNFeConfig().catch(() => null),
        listStoreNFeInvoices().catch(() => []),
        exportFiscalBatch().catch(() => null),
      ]);
      return { config, invoices, batch };
    } catch {
      return { config: null, invoices: [], batch: null };
    }
  },
  component: AccountantPortalPage,
});

function AccountantPortalPage() {
  const loaderData = Route.useLoaderData() as any;
  const [accountantEmail, setAccountantEmail] = useState(loaderData?.config?.accountant_email || "");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: invoices = loaderData?.invoices || [] } = useQuery({
    queryKey: ["accountantInvoices"],
    queryFn: () => listStoreNFeInvoices(),
    initialData: loaderData?.invoices || [],
  });

  const generateLinkMutation = useMutation({
    mutationFn: () => generateAccountantShareLink({ data: { accountantEmail } }),
    onSuccess: (res) => {
      setGeneratedLink(res.share_url);
      toast.success("Link com validade de 7 dias gerado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao gerar link contábil");
    },
  });

  const handleDownloadCsv = () => {
    if (!loaderData?.batch?.csv_content) {
      toast.error("Nenhum dado fiscal para exportação no período.");
      return;
    }
    const blob = new Blob([loaderData.batch.csv_content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lote_fiscal_contabilidade_${new Date().toISOString().slice(0, 7)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo CSV contábil baixado com sucesso!");
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    toast.success("Link temporário copiado para a área de transferência!");
  };

  const totalValueCents = invoices.reduce((acc: number, cur: any) => acc + (cur.valor_total_cents || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Portal da Contabilidade"
        subtitle="Exportação de notas fiscais, XMLs e relatórios mensais para escritórios contábeis."
      />

      {/* Corporate Summary & Share Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CNPJ Info Card */}
        <div className="bg-surface-paper border border-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-primary" /> Empresa & Regime
          </div>
          <p className="text-base font-bold text-foreground">
            {loaderData?.config?.razao_social || "Razão Social Não Cadastrada"}
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            CNPJ: {loaderData?.config?.cnpj || "Inexistente"}
          </p>
          <Badge variant="outline" className="text-[11px] font-medium mt-1">
            Regime: {loaderData?.config?.regime_tributario || "Simples Nacional"}
          </Badge>
        </div>

        {/* Issued Volume */}
        <div className="bg-surface-paper border border-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Total Faturado Emitido
          </div>
          <p className="text-2xl font-black text-foreground">
            {formatMoney(totalValueCents)}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            {invoices.length} notas autorizadas pela SEFAZ
          </p>
        </div>

        {/* 1-Click Export CSV */}
        <div className="bg-surface-paper border border-border rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <FileSpreadsheet className="w-4 h-4 text-amber-500" /> Exportação de Lote
            </div>
            <p className="text-xs text-muted-foreground">
              Baixe a planilha contábil completa com todos os XMLs e links DANFE do período.
            </p>
          </div>
          <Button
            onClick={handleDownloadCsv}
            className="w-full h-10 text-xs font-bold gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar Planilha CSV Contábil
          </Button>
        </div>
      </div>

      {/* Share 7-Day Token with Accountant */}
      <div className="bg-surface-paper border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Gerar Link de Acesso Seguro para o Contador
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                Expira em 7 dias
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Envie um acesso temporário direto para que seu escritório contábil faça o download dos arquivos fiscais.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Input
            type="email"
            placeholder="E-mail da contabilidade (ex: contador@escritorio.com.br)"
            value={accountantEmail}
            onChange={(e) => setAccountantEmail(e.target.value)}
            className="h-10 text-xs flex-1"
          />
          <Button
            onClick={() => generateLinkMutation.mutate()}
            disabled={generateLinkMutation.isPending}
            className="w-full sm:w-auto h-10 px-5 text-xs font-bold gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {generateLinkMutation.isPending ? "Gerando..." : "Gerar Link Seguro"}
          </Button>
        </div>

        {generatedLink && (
          <div className="p-3 bg-muted/50 border border-border rounded-lg flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-foreground truncate">{generatedLink}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedLink ? "Copiado!" : "Copiar Link"}
            </Button>
          </div>
        )}
      </div>

      {/* Invoices List Table */}
      <div className="bg-surface-paper border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Histórico de Notas Fiscais Emitidas
          </h3>
          <Badge variant="outline" className="text-xs">
            {invoices.length} Registros
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Número / Série</TableHead>
              <TableHead className="text-xs">Chave de Acesso</TableHead>
              <TableHead className="text-xs">Destinatário</TableHead>
              <TableHead className="text-xs">Data Emissão</TableHead>
              <TableHead className="text-xs text-right">Valor Total</TableHead>
              <TableHead className="text-xs text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma nota fiscal emitida até o momento.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="text-xs font-semibold">
                    NF-e #{inv.nfe_number || "---"} (Série {inv.nfe_serie || "1"})
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground max-w-[180px] truncate">
                    {inv.nfe_key || "---"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-medium text-foreground">{inv.tomador_nome || "Consumidor Final"}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{inv.tomador_documento || "---"}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(inv.issued_at || inv.created_at)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-bold text-foreground">
                    {formatMoney(inv.valor_total_cents || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {inv.danfe_pdf_url && (
                        <a
                          href={inv.danfe_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] h-7 px-2.5 rounded-lg border border-border bg-background hover:bg-muted font-medium text-foreground transition-colors"
                        >
                          DANFE <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                      {inv.xml_url && (
                        <a
                          href={inv.xml_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] h-7 px-2.5 rounded-lg border border-border bg-background hover:bg-muted font-medium text-foreground transition-colors"
                        >
                          XML <Download className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
