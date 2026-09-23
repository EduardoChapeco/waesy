import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  FileSignature,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Eye,
  Sliders,
  Share2,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listContracts } from "@/services/contracts.functions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
  WorkspaceCanonicalToolbar,
  type WorkspaceToolbarTab,
} from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";

export const Route = createFileRoute("/workspace/contratos/")({
  head: () => ({ meta: [{ title: "Contratos & Assinaturas Digitais | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const contracts = await listContracts().catch(() => []);
      return { contracts };
    } catch (err) {
      console.error("[loader:workspace.contratos.index] Unhandled error:", err);
      return { contracts: null };
    }
  },
  component: ContractsDashboard,
});

const CATEGORY_LABELS: Record<string, string> = {
  tourism_package: "Turismo & Viagens",
  real_estate_rental: "Imóveis & Locação",
  real_estate_sale: "Imóveis & Venda",
  vehicle_sale: "Veículos & Frota",
  vehicle_consignation: "Consignação de Veículo",
  fashion_retail: "Moda & Mala Condicional",
  pos_retail: "Balcão PDV & Carnê",
  legal_retainer: "Jurídico & Advocacia",
  service_agreement: "Prestação de Serviços",
  medical_aesthetic_consent: "Saúde & Estética",
  employment: "Contrato de Trabalho",
  general_deal: "Acordo Comercial",
  partnership: "Parceria Comercial",
  ndas: "Confidencialidade (NDA)",
  lease: "Locação de Bens",
  general: "Acordo Geral",
};

function ContractsDashboard() {
 const router = useRouter();
  const { contracts: initialContracts } = ((Route.useLoaderData?.() as any) || {});

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts-list"],
    queryFn: () => listContracts(),
    initialData: initialContracts || [],
  });

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [copiedContractId, setCopiedContractId] = useState<string | null>(null);

  const contractsList = (contracts || []) as any[];
  const totalContracts = contractsList.length;
  const signedContracts = contractsList.filter((c) => c.status === "signed").length;
  const signingContracts = contractsList.filter((c) => c.status === "signing").length;
  const draftContracts = contractsList.filter((c) => c.status === "draft" || !c.status).length;
  const totalValueCents = contractsList.reduce((acc, c) => acc + (c.deal?.proposed_price_cents || 0), 0);
  const signedRate = totalContracts > 0 ? Math.round((signedContracts / totalContracts) * 100) : 0;

  const tabs: WorkspaceToolbarTab[] = [
    { id: "all", label: "Todos", count: totalContracts },
    { id: "signed", label: "Assinados", count: signedContracts },
    { id: "signing", label: "Aguardando", count: signingContracts },
    { id: "draft", label: "Rascunhos", count: draftContracts },
  ];

  const filteredContracts = useMemo(() => {
    return contractsList.filter((c) => {
      if (activeTab === "signed" && c.status !== "signed") return false;
      if (activeTab === "signing" && c.status !== "signing") return false;
      if (activeTab === "draft" && c.status !== "draft" && c.status) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (c.title || "").toLowerCase().includes(q);
        const matchesCategory = (CATEGORY_LABELS[c.category] || c.category || "").toLowerCase().includes(q);
        const matchesCreator = (c.creator?.full_name || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory && !matchesCreator) return false;
      }
      return true;
    });
  }, [contractsList, activeTab, searchQuery]);

  const dashboardMetrics: MetricCardItem[] = [
    {
      id: "total_contracts",
      label: "Contratos Criados",
      value: String(totalContracts),
      description: "Total de documentos legais gerenciados",
      icon: FileText,
      variant: "primary",
    },
    {
      id: "signed_contracts",
      label: "Contratos Assinados",
      value: String(signedContracts),
      description: `${signedRate}% de taxa de efetivação jurídica`,
      icon: CheckCircle2,
      variant: "success",
    },
    {
      id: "signing_pending",
      label: "Aguardando Assinatura",
      value: String(signingContracts),
      description: "Envelopes enviados para partes e testemunhas",
      icon: Clock,
      variant: "warning",
    },
    {
      id: "total_value",
      label: "Volume Negociado",
      value: formatMoney(totalValueCents),
      description: "Valor econômico protegido por contratos",
      icon: DollarSign,
      variant: "info",
    },
  ];

  const handleCopyLink = (e: React.MouseEvent, contractId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/workspace/contratos/${contractId}/editor`;
    navigator.clipboard.writeText(url);
    setCopiedContractId(contractId);
    toast.success("Link do contrato copiado com sucesso!");
    setTimeout(() => setCopiedContractId(null), 2500);
  };

  const handleShareWhatsApp = (e: React.MouseEvent, contract: any) => {
    e.preventDefault();
    e.stopPropagation();
    const link = contract.verification_code
      ? `${window.location.origin}/verify/document/${contract.verification_code}`
      : `${window.location.origin}/workspace/contratos/${contract.id}/editor`;
    const text = `Olá! Segue o link de acesso ao contrato *${contract.title}*: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-0 sm:px-4 md:px-0 pb-20">
      {/* ── 1. Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Gestão Jurídica & Compliance"
          title="Contratos & Assinaturas Digitais"
          description="Gestão de acordos formais, envelopes de assinatura eletrônica com carimbo de tempo e evidências criptográficas imutáveis."
        />
        <div className="flex items-center gap-2">
          <Button asChild className="h-11 rounded-xl text-xs font-semibold bg-primary text-primary-foreground cursor-pointer shadow-xs">
            <Link to="/workspace/contratos/novo" className="flex items-center gap-2">
              <Plus className="size-4" />
              Novo Contrato
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Toolbar Canônica ── */}
      <WorkspaceCanonicalToolbar
        searchPlaceholder="Buscar por título do contrato, signatário ou categoria..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenDashboard={() => setDashboardOpen(true)}
      />

      {/* ── 3. Painel de Métricas Lateral (Dashboard Sheet) ── */}
      <WorkspaceDashboardSheet
        open={dashboardOpen}
        onOpenChange={setDashboardOpen}
        title="Painel Jurídico & Contratos"
        description="Métricas consolidadas de conformidade, envelopes emitidos e volume financeiro sob contrato."
        metrics={dashboardMetrics}
      />

      {/* ── 4. Conteúdo: Listagem em Cards Elegantes (Paradigma Clean) ── */}
      {filteredContracts.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-card rounded-2xl p-8 border border-dashed border-border">
          <div className="size-12 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <FileSignature className="size-6" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Nenhum contrato encontrado</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || activeTab !== "all"
              ? "Tente ajustar o termo de busca ou selecione outra aba de status."
              : "Comece criando o seu primeiro documento legal ou utilize um template inteligente de prestação de serviços."}
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-xl h-10 px-4 text-xs font-semibold mt-2 cursor-pointer">
            <Link to="/workspace/contratos/novo">Criar Primeiro Contrato</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract: any) => {
            const isSigned = contract.status === "signed";
            const isSigning = contract.status === "signing";
            const isCopied = copiedContractId === contract.id;
            const categoryLabel = CATEGORY_LABELS[contract.category] || "Geral";

            return (
              <div
                key={contract.id}
                className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 transition-all shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-medium bg-muted/40">
                        {categoryLabel}
                      </Badge>
                      {contract.is_settled && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                          Quitado ✓
                        </Badge>
                      )}
                    </div>

                    {isSigned ? (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-semibold gap-1">
                        <CheckCircle2 size={11} /> Assinado
                      </Badge>
                    ) : isSigning ? (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold gap-1">
                        <Clock size={11} /> Em Assinatura
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground font-medium">
                        Rascunho
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                      {contract.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground" />
                      Criado em {formatDate(contract.created_at)}
                    </p>
                  </div>

                  {contract.deal && (
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Valor sob Contrato:</span>
                      <span className="font-bold text-foreground font-mono">
                        {formatMoney(contract.deal.proposed_price_cents || 0)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
 <Button asChild size="sm" className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-1.5 flex-1">
 <Link to="/workspace/contratos/$id/editor" params={{ id: contract.id }}>
 <FileSignature className="size-3.5" />
 <span>Abrir Contrato</span>
 </Link>
 </Button>

 <CrudActionsMenu
 triggerVariant="outline"
 triggerClassName="h-9 px-3 rounded-xl border-border/60 hover:bg-muted"
 customActions={[
 {
 label: isCopied ? "Link Copiado!" : "Copiar Link de Assinatura",
 icon: isCopied ? Check : Copy,
 onClick: (e) => handleCopyLink(e, contract.id),
 },
 {
 label: "Enviar via WhatsApp",
 icon: WhatsappLogo as any,
 onClick: (e) => handleShareWhatsApp(e, contract),
 },
 ...(contract.verification_code
 ? [
 {
 label: "Certificado Público de Assinatura",
 icon: ExternalLink,
 onClick: () => router.navigate({ to: "/verify/document/$code", params: { code: contract.verification_code } }),
 },
 ]
 : []),
 ]}
 />
 </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ContractsDashboard;
