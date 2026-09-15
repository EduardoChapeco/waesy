import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  ShieldCheck,
  Download,
  FileCode,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getStoreNFeConfig,
  saveStoreNFeConfig,
  emitNFeInvoice,
  listStoreNFeInvoices,
  type StoreNFeConfigDTO,
  type StoreNFeInvoiceDTO,
  type NFeProvider,
  type TaxRegime,
} from "@/services/fiscal-nfe.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/fiscal/nfe")({
  head: () => ({
    meta: [{ title: "Módulo Fiscal & NF-e | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [config, invoices] = await Promise.all([
        getStoreNFeConfig(),
        listStoreNFeInvoices(),
      ]);
      return { initialConfig: config, initialInvoices: invoices };
    } catch (err) {
      console.error("[loader:workspace.fiscal.nfe] error:", err);
      return { initialConfig: null, initialInvoices: [] };
    }
  },
  component: FiscalNFePage,
});

function FiscalNFePage() {
  const { initialConfig, initialInvoices } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"invoices" | "config">("invoices");
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  // Config states
  const [cnpj, setCnpj] = useState(initialConfig?.cnpj || "");
  const [razaoSocial, setRazaoSocial] = useState(initialConfig?.razao_social || "");
  const [nomeFantasia, setNomeFantasia] = useState(initialConfig?.nome_fantasia || "");
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState(initialConfig?.inscricao_municipal || "");
  const [inscricaoEstadual, setInscricaoEstadual] = useState(initialConfig?.inscricao_estadual || "");
  const [provider, setProvider] = useState<NFeProvider>(initialConfig?.provider || "focus_nfe");
  const [regime, setRegime] = useState<TaxRegime>(initialConfig?.regime_tributario || "simples_nacional");
  const [environment, setEnvironment] = useState<"sandbox" | "production">(initialConfig?.environment || "sandbox");
  const [apiToken, setApiToken] = useState(initialConfig?.api_token || "");
  const [autoEmitOnProcessing, setAutoEmitOnProcessing] = useState(initialConfig?.auto_emit_on_processing ?? false);
  const [autoEmitMarketplaces, setAutoEmitMarketplaces] = useState(initialConfig?.auto_emit_marketplaces ?? true);
  const [accountantEmail, setAccountantEmail] = useState(initialConfig?.accountant_email || "");

  // Issue states
  const [tomadorNome, setTomadorNome] = useState("");
  const [tomadorDoc, setTomadorDoc] = useState("");
  const [tomadorEmail, setTomadorEmail] = useState("");
  const [valorTotalReais, setValorTotalReais] = useState("100.00");

  const { data: config = initialConfig } = useQuery({
    queryKey: ["store-nfe-config"],
    queryFn: () => getStoreNFeConfig(),
    initialData: initialConfig,
  });

  const { data: invoices = initialInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["store-nfe-invoices"],
    queryFn: () => listStoreNFeInvoices(),
    initialData: initialInvoices,
  });

  const saveConfigMutation = useMutation({
    mutationFn: (payload: any) => saveStoreNFeConfig({ data: payload }),
    onSuccess: () => {
      toast.success("Configuração fiscal atualizada!");
      queryClient.invalidateQueries({ queryKey: ["store-nfe-config"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar configuração.");
    },
  });

  const emitInvoiceMutation = useMutation({
    mutationFn: (payload: any) => emitNFeInvoice({ data: payload }),
    onSuccess: () => {
      toast.success("NF-e emitida com sucesso!");
      setIssueModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["store-nfe-invoices"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro na emissão da NF-e.");
    },
  });

  const handleSaveConfig = () => {
    saveConfigMutation.mutate({
      cnpj,
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia,
      inscricao_municipal: inscricaoMunicipal,
      inscricao_estadual: inscricaoEstadual,
      provider,
      regime_tributario: regime,
      environment,
      api_token: apiToken,
      auto_emit_on_processing: autoEmitOnProcessing,
      auto_emit_marketplaces: autoEmitMarketplaces,
      accountant_email: accountantEmail || undefined,
    });
  };

  const handleEmit = () => {
    const cents = Math.round(parseFloat(valorTotalReais || "0") * 100);
    if (cents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    emitInvoiceMutation.mutate({
      tomadorNome,
      tomadorDocumento: tomadorDoc,
      tomadorEmail: tomadorEmail || undefined,
      valorTotalCents: cents,
      invoiceType: "nfe",
    });
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-0 sm:px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Compliance & Tributação"
          title="Emissão Fiscal & NF-e"
          description="Gestão de notas fiscais eletrônicas, integração com SEFAZ, prefeituras e emissor nacional."
        />
        <div className="flex items-center gap-2 flex-wrap">
          {!config?.api_token && (
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-xs font-semibold gap-1.5 py-1.5 px-3 rounded-xl"
              title="Configure o provedor fiscal ou certificado A1 na aba de Configurações"
            >
              <AlertCircle className="size-3.5 text-amber-600" />
              Certificado Digital A1 / Provedor Pendente
            </Badge>
          )}
          <Button
            className="h-10 rounded-xl text-xs font-semibold bg-foreground text-background"
            onClick={() => setIssueModalOpen(true)}
          >
            <Plus className="size-4 mr-1" /> Emitir NF-e
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
            activeTab === "invoices" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Notas Emitidas ({invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("config")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
            activeTab === "config" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Configurações Fiscais & Certificado
        </button>
      </div>

      {activeTab === "invoices" ? (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
              <FileText className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-semibold text-foreground">Nenhuma nota fiscal emitida</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Configure seus dados fiscais e emita notas fiscais automáticas ao faturar pedidos.
              </p>
              <Button
                variant="outline"
                className="mt-4 h-9 rounded-xl text-xs font-medium"
                onClick={() => setActiveTab("config")}
              >
                Configurar Dados Fiscais
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-medium">
                    <tr>
                      <th className="py-3 px-4">Número / Série</th>
                      <th className="py-3 px-4">Destinatário</th>
                      <th className="py-3 px-4">Valor Total</th>
                      <th className="py-3 px-4">Chave de Acesso</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Downloads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {invoices.map((inv: StoreNFeInvoiceDTO) => (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {inv.nfe_number} <span className="text-muted-foreground font-normal">Série {inv.nfe_serie}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-foreground">{inv.tomador_nome || "Consumidor Final"}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{inv.tomador_documento || "—"}</p>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {(inv.valor_total_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {inv.nfe_key ? `${inv.nfe_key.slice(0, 12)}...${inv.nfe_key.slice(-6)}` : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]">
                            {inv.status === "issued" ? "Emitida" : inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {inv.danfe_pdf_url && (
                            <a href={inv.danfe_pdf_url} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                <Download className="size-3 mr-1" /> DANFE
                              </Button>
                            </a>
                          )}
                          {inv.xml_url && (
                            <a href={inv.xml_url} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                <FileCode className="size-3 mr-1" /> XML
                              </Button>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Configurações Fiscais */
        <div className="max-w-2xl rounded-2xl border border-border/70 p-6 bg-card space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">CNPJ da Empresa</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Razão Social</Label>
              <Input
                placeholder="Nome empresarial oficial"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome Fantasia</Label>
              <Input
                placeholder="Nome de vitrine"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Inscrição Estadual (IE)</Label>
              <Input
                placeholder="Número da IE ou ISENTO"
                value={inscricaoEstadual}
                onChange={(e) => setInscricaoEstadual(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border/50">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Provedor de Emissão</Label>
              <Select value={provider} onValueChange={(v: NFeProvider) => setProvider(v)}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="focus_nfe">Focus NFe</SelectItem>
                  <SelectItem value="nuvem_fiscal">Nuvem Fiscal</SelectItem>
                  <SelectItem value="nfs_nacional">NFS-e Padrão Nacional (Gov Federal)</SelectItem>
                  <SelectItem value="plugnotas">PlugNotas / TecnoSpeed</SelectItem>
                  <SelectItem value="enotas">eNotas Gateway</SelectItem>
                  <SelectItem value="webmania">Webmania NF-e / NFC-e</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Regime Tributário</Label>
              <Select value={regime} onValueChange={(v: TaxRegime) => setRegime(v)}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="mei">Microempreendedor (MEI)</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Ambiente SEFAZ</Label>
              <Select value={environment} onValueChange={(v: "sandbox" | "production") => setEnvironment(v)}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Homologação (Testes)</SelectItem>
                  <SelectItem value="production">Produção (Com valor fiscal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-medium">API Token do Provedor</Label>
            <Input
              type="password"
              placeholder="Cole seu token de autenticação..."
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="h-10 text-xs rounded-xl font-mono"
            />
          </div>

          {/* Automação de Emissão em Background */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Automação & Inteligência Fiscal
            </h4>
            
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">Emissão Automatizada ao Mudar para "Em Separação"</p>
                <p className="text-[11px] text-muted-foreground">
                  Gera a nota em segundo plano, salva XML e DANFE no Storage e vincula ao comprovante do cliente.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoEmitOnProcessing}
                onChange={(e) => setAutoEmitOnProcessing(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">Obrigatoriedade de Marketplaces (ML / Amazon / iFood)</p>
                <p className="text-[11px] text-muted-foreground">
                  Emite a nota fiscal automaticamente para pedidos de canais integrados que exigem NF-e para despacho.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoEmitMarketplaces}
                onChange={(e) => setAutoEmitMarketplaces(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Integração Contábil B2B */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Acesso da Contabilidade & Lote SPED
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Permita que seu contador acesse a DRE, notas e extratos diretamente pelo portal contábil.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-xl h-8 text-xs font-semibold">
                <Link to="/workspace/contador">
                  Abrir Portal do Contador
                </Link>
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">E-mail do Escritório Contábil</Label>
              <Input
                type="email"
                placeholder="contato@contabilidade.com.br"
                value={accountantEmail}
                onChange={(e) => setAccountantEmail(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              className="h-10 rounded-xl text-xs font-semibold bg-foreground text-background"
              onClick={handleSaveConfig}
              disabled={saveConfigMutation.isPending}
            >
              {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configuração Fiscal"}
            </Button>
          </div>
        </div>
      )}

      {/* Modal Emitir NF-e */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Emitir NF-e</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Gera e transmite a nota fiscal eletrônica diretamente para a SEFAZ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome do Cliente / Razão Social</Label>
              <Input
                placeholder="Ex: Maria dos Santos"
                value={tomadorNome}
                onChange={(e) => setTomadorNome(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">CPF ou CNPJ do Destinatário</Label>
              <Input
                placeholder="000.000.000-00"
                value={tomadorDoc}
                onChange={(e) => setTomadorDoc(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">E-mail para envio do DANFE/XML</Label>
              <Input
                type="email"
                placeholder="cliente@email.com"
                value={tomadorEmail}
                onChange={(e) => setTomadorEmail(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valor Total da Nota (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorTotalReais}
                onChange={(e) => setValorTotalReais(e.target.value)}
                className="h-10 text-xs rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              variant="outline"
              className="h-10 rounded-xl text-xs"
              onClick={() => setIssueModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="h-10 rounded-xl text-xs font-semibold bg-foreground text-background"
              onClick={handleEmit}
              disabled={emitInvoiceMutation.isPending}
            >
              {emitInvoiceMutation.isPending ? "Transmitindo..." : "Transmitir NF-e"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FiscalNFePage;
