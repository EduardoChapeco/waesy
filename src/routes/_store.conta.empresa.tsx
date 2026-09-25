import { createFileRoute, Link, redirect, isRedirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Store,
  ExternalLink,
  Plus,
  Phone,
  FileText,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Package,
  Layers,
  ArrowUpRight,
  TrendingUp,
  MessageCircle,
  Building2,
  MapPin,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Star,
  Sliders,
  ArrowRight,
  Bike,
  Briefcase,
  GraduationCap,
  Award,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { NativeMobileHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserSession } from "@/services/auth.functions";
import {
  listCompanyLeadsAndOrders,
  updateCompanyLeadStatus,
  getCompanyReceiptData,
  listCompanyCatalogClassifieds,
  toggleCompanyClassifiedStatus,
  listCompanyJobApplications,
  updateCompanyJobApplicationStatus,
  getCompanyCustomFormSettings,
  updateCompanyCustomFormSettings,
} from "@/services/company-mvp.functions";
import { listStoreDealReviews } from "@/services/deal-reviews.functions";
import { CompanyReputationCard } from "@/components/deals/company-reputation-card";
import { DealReviewModal } from "@/components/deals/deal-review-modal";
import { CompanyNotificationsBell } from "@/components/notifications/company-notifications-bell";
import { LeadPushNotificationPrompt } from "@/components/notifications/lead-push-notification-prompt";
import { CompanyDeliveryManagerModal } from "@/components/delivery/company-delivery-manager-modal";
import { DispatchDeliveryModal } from "@/components/delivery/dispatch-delivery-modal";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_store/conta/empresa")({
  head: () => ({
    meta: [{ title: "Painel da Empresa | Waesy" }],
  }),
  beforeLoad: async ({ location }) => {
    let session: any = null;
    try {
      session = await getUserSession();
    } catch {
      session = null;
    }

    if (!session?.user) {
      throw redirect({
        to: "/entrar",
        search: { returnUrl: location.pathname + location.searchStr },
      });
    }
    return { session };
  },
  loader: async ({ location }) => {
    try {
      let session: any = null;
      try {
        session = await getUserSession();
      } catch {
        session = null;
      }

      if (!session?.user) {
        throw redirect({
          to: "/entrar",
          search: { returnUrl: location.pathname + location.searchStr },
        });
      }

      const [leadsRes, catalogRes, appsRes, formSettingsRes] = await Promise.all([
        listCompanyLeadsAndOrders({ data: {} }).catch(() => ({ store: null, currentStore: null, leads: [] })),
        listCompanyCatalogClassifieds({ data: {} }).catch(() => ({ classifieds: [] })),
        listCompanyJobApplications({ data: {} }).catch(() => ({ applications: [], total: 0 })),
        getCompanyCustomFormSettings({ data: {} }).catch(() => ({ fields: [] })),
      ]);

      const resolvedStore = (leadsRes as any)?.currentStore || (leadsRes as any)?.store;
      let reviewsRes: any = { reviews: [], stats: { average_rating: 5.0, total_reviews: 0 } };
      if (resolvedStore?.id) {
        reviewsRes = await listStoreDealReviews({ data: { storeId: resolvedStore.id } }).catch(() => reviewsRes);
      }

      return {
        session,
        initialLeads: leadsRes,
        initialCatalog: catalogRes,
        initialReviews: reviewsRes,
        initialApplications: appsRes,
        initialFormSettings: formSettingsRes,
      };
    } catch (err) {
      if (isRedirect(err)) throw err;
      return {
        session: null,
        initialLeads: { store: null, leads: [] },
        initialCatalog: { classifieds: [] },
        initialReviews: { reviews: [], stats: { average_rating: 5.0, total_reviews: 0 } },
        initialApplications: { applications: [], total: 0 },
        initialFormSettings: { fields: [] },
      };
    }
  },
  component: PainelEmpresaPage,
});

function PainelEmpresaPage() {
  const {
    session,
    initialLeads,
    initialCatalog,
    initialReviews,
    initialApplications,
    initialFormSettings,
  } = Route.useLoaderData() as any;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"leads" | "catalog" | "jobs" | "reviews">("leads");
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [reviewModalDeal, setReviewModalDeal] = useState<{ dealId: string; title: string } | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [dispatchModalLead, setDispatchModalLead] = useState<any | null>(null);

  // Estados do Modal de Formulário Personalizado
  const [isCustomFormModalOpen, setIsCustomFormModalOpen] = useState(false);
  const [customFields, setCustomFields] = useState<any[]>(initialFormSettings?.fields || []);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "textarea" | "select" | "checkbox">("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Queries
  const { data: leadsData, refetch: refetchLeads } = useQuery({
    queryKey: ["company-leads"],
    queryFn: () => listCompanyLeadsAndOrders({ data: {} }),
    initialData: initialLeads,
  });

  const { data: catalogData, refetch: refetchCatalog } = useQuery({
    queryKey: ["company-catalog"],
    queryFn: () => listCompanyCatalogClassifieds({ data: {} }),
    initialData: initialCatalog,
  });

  const { data: appsData, refetch: refetchApps } = useQuery({
    queryKey: ["company-job-applications"],
    queryFn: () => listCompanyJobApplications({ data: {} }),
    initialData: initialApplications,
  });

  const applications = appsData?.applications || [];

  const store = leadsData?.currentStore || leadsData?.store;

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["company-reviews", store?.id],
    queryFn: () => (store?.id ? listStoreDealReviews({ data: { storeId: store.id } }) : Promise.resolve(initialReviews)),
    initialData: initialReviews,
    enabled: !!store?.id,
  });
  const leads = leadsData?.leads || [];
  const classifieds = catalogData?.classifieds || [];

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      return await updateCompanyLeadStatus({ data: { dealId: leadId, status: status as any } });
    },
    onSuccess: () => {
      toast.success("Status da negociação atualizado!");
      refetchLeads();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar status");
    },
  });

  const toggleCatalogMutation = useMutation({
    mutationFn: async ({ classifiedId, status }: { classifiedId: string; status: string }) => {
      return await toggleCompanyClassifiedStatus({ data: { classifiedId, newStatus: status as any } });
    },
    onSuccess: () => {
      toast.success("Status do anúncio atualizado!");
      refetchCatalog();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao alterar anúncio");
    },
  });

  const updateCandidateStatusMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: any }) => {
      return await updateCompanyJobApplicationStatus({ data: { applicationId, status } });
    },
    onSuccess: () => {
      toast.success("Status do candidato atualizado!");
      refetchApps();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar status do candidato");
    },
  });

  const saveCustomFormMutation = useMutation({
    mutationFn: async (fields: any[]) => {
      return await updateCompanyCustomFormSettings({ data: { fields } });
    },
    onSuccess: () => {
      toast.success("Perguntas personalizadas salvas com sucesso!");
      setIsCustomFormModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar formulário personalizado");
    },
  });

  const handleOpenReceipt = async (leadId: string) => {
    setLoadingReceiptId(leadId);
    try {
      const receipt = await getCompanyReceiptData({ data: { dealId: leadId } });
      setSelectedReceipt(receipt);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível carregar o comprovante");
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShareWhatsApp = (receipt: any) => {
    if (!receipt) return;
    const text = `*COMPROVANTE TIMBRADO - ${receipt.storeName}*\nRecibo Nº: ${receipt.receiptNumber}\nData: ${new Date(receipt.date).toLocaleDateString("pt-BR")}\nCliente: ${receipt.customerName}\nItem: ${receipt.itemTitle}\nValor: ${formatMoney(receipt.amountCents)}\nStatus: ${receipt.status.toUpperCase()}\nCódigo de Autenticação: ${receipt.authCode}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (!store) {
    return (
      <div className="min-h-screen bg-background py-10 sm:py-16 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Store className="size-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Nenhuma Empresa Vinculada</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Você ainda não possui uma empresa cadastrada com seu perfil de usuário. Crie o perfil da sua empresa em 1 minuto para começar a anunciar e receber clientes.
          </p>
          <div className="pt-2">
            <Button asChild className="h-11 rounded-xl text-xs font-bold gap-2">
              <Link to="/criar-negocio">
                <Plus className="size-4" />
                Cadastrar Perfil da Minha Empresa
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = leads.filter((l: any) => l.status === "completed").length;
  const pendingCount = leads.filter((l: any) => l.status === "pending" || l.status === "contacted").length;

  return (
    <div className="min-h-screen bg-background pb-20">
            {/* Top Bar Operacional Nativa */}
      <NativeMobileHeader
        fallbackHref="/conta"
        title={store.name}
        subtitle={`${store.settings?.category || "Comércio & Serviços"} • ${store.city || "Chapecó"}, ${store.state || "SC"}`}
        rightActions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CompanyNotificationsBell />
            <Button asChild size="sm" className="h-8.5 px-3 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground">
              <Link to="/workspace">
                <Store className="size-3.5" />
                <span className="hidden xs:inline">Workspace</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6 animate-in fade-in duration-200">
        {/* Barra de Ações Rápidas da Empresa */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <Button asChild variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs gap-1.5 border-border/80 hover:bg-muted/50 shrink-0">
            <Link to="/perfil-da-loja" search={{ storeId: store.id }} target="_blank">
              <span>Ver Perfil Público</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs gap-1.5 border-border/80 hover:bg-muted/50 shrink-0">
            <Link to="/workspace/marketing/brand-kit">
              <Edit className="size-3.5 text-primary" />
              <span>Editar Perfil & Marca</span>
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shrink-0">
            <Link to="/portal-completo">
              <Layers className="size-3.5" />
              <span>Gestão Pro</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomFields(initialFormSettings?.fields || []);
              setIsCustomFormModalOpen(true);
            }}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:bg-muted/50 shrink-0"
          >
            <FileText className="size-3.5 text-primary" />
            <span>Campos da Proposta</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeliveryModalOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:bg-muted/50 shrink-0"
          >
            <Bike className="size-3.5 text-primary" />
            <span>Configurar Entregas</span>
          </Button>
        </div>
        {/* Métricas Principais em Grid Simétrico 4-Col (Apple HIG) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Negociações</span>
            <p className="text-2xl font-bold text-foreground font-mono">{leads.length}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Em Andamento</span>
            <p className="text-2xl font-bold text-amber-600 font-mono">{pendingCount}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Concluídas</span>
            <p className="text-2xl font-bold text-emerald-600 font-mono">{completedCount}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Catálogo</span>
            <p className="text-2xl font-bold text-foreground font-mono">{classifieds.length}</p>
          </div>
        </div>

        {/* Navegação entre Abas com Scroll Horizontal */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border/60 pb-2 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab("leads")}
              className={cn(
                "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
                activeTab === "leads"
                  ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
              )}
            >
              Mural de Negociações ({leads.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={cn(
                "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
                activeTab === "catalog"
                  ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
              )}
            >
              Catálogo ({classifieds.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("jobs")}
              className={cn(
                "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
                activeTab === "jobs"
                  ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
              )}
            >
              <Briefcase className="size-4 shrink-0" />
              <span>Vagas & Candidatos ({applications.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={cn(
                "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98",
                activeTab === "reviews"
                  ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
              )}
            >
              <Star className="size-4 shrink-0 fill-amber-400 text-amber-500" />
              <span>Avaliações ({reviewsData?.reviews?.length || 0})</span>
            </button>
          </div>

          {activeTab === "catalog" && (
            <Button asChild size="sm" className="h-8 rounded-xl text-xs font-bold gap-1.5">
              <Link to="/conta/classificados/novo" search={{ storeId: store.id }}>
                <Plus className="size-3.5" />
                <span>Adicionar ao Catálogo</span>
              </Link>
            </Button>
          )}
        </div>

        {/* ABA 1: Mural de Negociações */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            {leads.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 border border-border/60 text-center space-y-3">
                <MessageCircle className="size-8 mx-auto text-muted-foreground opacity-40" />
                <h3 className="text-sm font-bold text-foreground">Nenhuma negociação recebida ainda</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Quando um cliente clicar em "Comprar", "Reservar" ou "Agendar" no seu perfil ou anúncios, o pedido aparecerá diretamente aqui para você gerenciar o status e emitir comprovantes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead: any) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    contacted: "bg-sky-500/10 text-sky-600 border-sky-500/20",
                    negotiating: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
                    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
                  };

                  const statusLabels: Record<string, string> = {
                    pending: "Pendente",
                    contacted: "Contatado",
                    negotiating: "Em Negociação",
                    completed: "Concluído / Pago",
                    cancelled: "Cancelado",
                  };

                  return (
                    <div
                      key={lead.id}
                      className="bg-card rounded-2xl p-4 sm:p-5 border border-border/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] font-semibold ${statusColors[lead.status] || ""}`}>
                            {statusLabels[lead.status] || lead.status}
                          </Badge>
                          <span className="text-xs font-bold text-foreground">{lead.customer_name}</span>
                          {lead.classified_title && (
                            <span className="text-xs text-muted-foreground truncate max-w-xs">
                              • Ref: {lead.classified_title}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {lead.amount_cents > 0 && (
                            <span className="font-bold text-foreground">
                              {formatMoney(lead.amount_cents)}
                            </span>
                          )}
                          <span>Data: {new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                          {lead.customer_phone && (
                            <span className="font-mono">{lead.customer_phone}</span>
                          )}
                        </div>

                        {lead.customer_message && (
                          <p className="text-xs text-foreground/80 bg-muted/30 p-2 rounded-xl mt-1">
                            "{lead.customer_message}"
                          </p>
                        )}
                      </div>

                      {/* Ações Rápidas de 1-Toque */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
                        {lead.customer_phone && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl text-xs gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/5"
                          >
                            <a
                              href={`https://wa.me/55${lead.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${lead.customer_name}, vi seu interesse em "${lead.classified_title || "nosso serviço"}". Como posso te ajudar?`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Phone className="size-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          </Button>
                        )}

                        {lead.status !== "completed" ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ leadId: lead.id, status: "completed" })}
                            disabled={updateStatusMutation.isPending}
                            className="h-9 rounded-xl text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="size-3.5" />
                            <span>Concluir</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ leadId: lead.id, status: "pending" })}
                            className="h-9 rounded-xl text-xs gap-1"
                          >
                            <span>Reabrir</span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReceipt(lead.id)}
                          disabled={loadingReceiptId === lead.id}
                          className="h-9 rounded-xl text-xs gap-1.5"
                        >
                          {loadingReceiptId === lead.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <FileText className="size-3.5" />
                          )}
                          <span>Recibo</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDispatchModalLead(lead)}
                          className="h-9 rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                        >
                          <Bike className="size-3.5" />
                          <span>Despachar</span>
                        </Button>

                        {lead.status === "completed" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReviewModalDeal({
                                dealId: lead.id,
                                title: lead.classified_title || "Negociação Concluída",
                              })
                            }
                            className="h-9 rounded-xl text-xs gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                            title="Registrar avaliação auditada"
                          >
                            <Star className="size-3.5 fill-amber-400 text-amber-500" />
                            <span>Avaliar</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: Catálogo de Classificados da Empresa */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {classifieds.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 border border-border/60 text-center space-y-3">
                <Package className="size-8 mx-auto text-muted-foreground opacity-40" />
                <h3 className="text-sm font-bold text-foreground">Nenhum item cadastrado no catálogo</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Publique anúncios de produtos, viagens, equipamentos, serviços ou desapegos. Eles aparecerão tanto nos classificados municipais quanto no catálogo público da sua empresa.
                </p>
                <div className="pt-2">
                  <Button asChild size="sm" className="h-10 rounded-xl text-xs font-bold gap-1.5">
                    <Link to="/conta/classificados/novo" search={{ storeId: store.id }}>
                      <Plus className="size-4" />
                      Cadastrar Primeiro Anúncio
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {classifieds.map((item: any) => {
                  const isSold = item.status === "sold";
                  const isPaused = item.status === "paused";

                  return (
                    <div
                      key={item.id}
                      className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-2xs flex flex-col justify-between"
                    >
                      <div className="relative aspect-video bg-muted/60 overflow-hidden">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package className="size-8 opacity-30" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold ${
                              isSold
                                ? "bg-rose-500 text-white"
                                : isPaused
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {isSold ? "Vendido" : isPaused ? "Pausado" : "Ativo"}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4 space-y-2 flex-1">
                        <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.title}</h4>
                        <p className="text-sm font-bold text-primary">
                          {item.price_cents ? formatMoney(item.price_cents) : "Sob Consulta"}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {item.content}
                        </p>
                      </div>

                      <div className="p-3 bg-muted/30 border-t border-border/40 flex items-center justify-between gap-2">
                        <Select
                          value={item.status || "active"}
                          onValueChange={(val) => toggleCatalogMutation.mutate({ classifiedId: item.id, status: val })}
                        >
                          <SelectTrigger className="h-8 rounded-lg text-[11px] bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo no Catálogo</SelectItem>
                            <SelectItem value="paused">Pausar Exibição</SelectItem>
                            <SelectItem value="sold">Marcar como Vendido</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-[11px] px-2.5">
                          <Link to="/classificados/$id" params={{ id: item.id }} target="_blank">
                            <Eye className="size-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA: Vagas & Candidatos */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Candidatos que se inscreveram nas vagas de emprego da sua empresa.
              </p>
              <Button asChild size="sm" className="h-8 rounded-xl text-xs font-bold gap-1.5">
                <Link to="/conta/classificados/novo" search={{ storeId: store.id, tipo: "vaga" }}>
                  <Plus className="size-3.5" />
                  <span>Publicar Nova Vaga</span>
                </Link>
              </Button>
            </div>

            {applications.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 border border-border/60 text-center space-y-3">
                <Briefcase className="size-8 mx-auto text-muted-foreground opacity-40" />
                <h3 className="text-sm font-bold text-foreground">Nenhum candidato recebido ainda</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Publique vagas nos classificados com requisitos, benefícios e escolaridade. Os currículos recebidos aparecerão diretamente aqui com contato direto via WhatsApp.
                </p>
                <div className="pt-2">
                  <Button asChild size="sm" className="h-10 rounded-xl text-xs font-bold gap-1.5">
                    <Link to="/conta/classificados/novo" search={{ storeId: store.id, tipo: "vaga" }}>
                      <Plus className="size-4" />
                      Publicar Vaga de Emprego
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app: any) => {
                  const statusLabels: Record<string, { label: string; color: string }> = {
                    submitted: { label: "Recebida", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                    reviewing: { label: "Em Análise", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                    shortlisted: { label: "Pré-selecionado", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                    hired: { label: "Contratado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                    rejected: { label: "Descartado", color: "bg-muted text-muted-foreground border-border" },
                    pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                  };

                  const currentStatus = statusLabels[app.status] || statusLabels.submitted;
                  const cleanPhone = app.candidate_phone?.replace(/\D/g, "");
                  const whatsappMsg = `Olá ${app.candidate_name}! Vimos sua candidatura para a vaga de ${app.job_title} na ${store.name} e gostaríamos de conversar.`;
                  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}` : null;

                  return (
                    <div
                      key={app.id}
                      className="bg-card rounded-2xl p-4 sm:p-5 border border-border/60 shadow-2xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">{app.candidate_name}</h3>
                            <Badge variant="outline" className={`text-[10px] font-bold ${currentStatus.color}`}>
                              {currentStatus.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-primary font-medium mt-0.5">
                            Vaga: <strong>{app.job_title}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={app.status || "submitted"}
                            onValueChange={(newStatus) =>
                              updateCandidateStatusMutation.mutate({
                                applicationId: app.id,
                                status: newStatus as any,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs rounded-xl w-36 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="submitted">Recebida</SelectItem>
                              <SelectItem value="reviewing">Em Análise</SelectItem>
                              <SelectItem value="shortlisted">Pré-selecionado</SelectItem>
                              <SelectItem value="hired">Contratado</SelectItem>
                              <SelectItem value="rejected">Descartado</SelectItem>
                            </SelectContent>
                          </Select>

                          {whatsappUrl && (
                            <Button
                              asChild
                              size="sm"
                              className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                            >
                              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="size-3.5" />
                                <span>Chamar no WhatsApp</span>
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {app.candidate_phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="size-3.5 text-primary shrink-0" />
                            <span>{app.candidate_phone}</span>
                          </div>
                        )}
                        {app.candidate_email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="size-3.5 text-primary shrink-0" />
                            <span className="truncate">{app.candidate_email}</span>
                          </div>
                        )}
                        {app.education_level && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="size-3.5 text-primary shrink-0" />
                            <span>{app.education_level}</span>
                          </div>
                        )}
                      </div>

                      {app.cover_letter && (
                        <div className="p-3 rounded-xl bg-muted/20 border border-border/50 text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Apresentação do Candidato:
                          </span>
                          <p className="text-muted-foreground leading-relaxed italic">
                            "{app.cover_letter}"
                          </p>
                        </div>
                      )}

                      {app.resume_url && (
                        <div className="pt-1">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl text-xs font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                          >
                            <a href={app.resume_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-3.5" />
                              <span>Visualizar Currículo Anexo</span>
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: Reputação & Avaliações Auditadas */}
        {activeTab === "reviews" && (
          <div className="space-y-6">
            <CompanyReputationCard
              stats={reviewsData?.stats || { average_rating: 5.0, total_reviews: 0 }}
              reviews={reviewsData?.reviews || []}
              canRespond={true}
              onReviewUpdated={() => refetchReviews()}
            />
          </div>
        )}
      </div>

      {/* Modal de Avaliação Auditada de Negociação */}
      {reviewModalDeal && (
        <DealReviewModal
          open={!!reviewModalDeal}
          onOpenChange={(open) => !open && setReviewModalDeal(null)}
          dealId={reviewModalDeal.dealId}
          dealTitle={reviewModalDeal.title}
          companyName={store?.name}
          onSuccess={() => {
            refetchReviews();
            refetchLeads();
          }}
        />
      )}

      {/* Modal de Comprovante Timbrado Imprimível */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/60 bg-card rounded-2xl">
          <DialogHeader className="p-4 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
            <DialogTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <FileText className="size-4 text-primary" />
              Comprovante Timbrado de Negociação
            </DialogTitle>
          </DialogHeader>

          {selectedReceipt && (
            <div className="p-6 space-y-6 print:p-8" id="printable-receipt">
              {/* Cabeçalho do Recibo */}
              <div className="flex items-start justify-between border-b border-border/60 pb-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">{selectedReceipt.storeName}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Recibo Nº: {selectedReceipt.receiptNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Data: {new Date(selectedReceipt.date).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
                  {selectedReceipt.status.toUpperCase()}
                </Badge>
              </div>

              {/* Dados do Cliente e Item */}
              <div className="space-y-3 text-xs">
                <div className="bg-muted/30 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cliente</span>
                  <p className="font-bold text-foreground">{selectedReceipt.customerName}</p>
                  {selectedReceipt.customerPhone && (
                    <p className="font-mono text-muted-foreground">{selectedReceipt.customerPhone}</p>
                  )}
                </div>

                <div className="bg-muted/30 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Item / Serviço</span>
                  <p className="font-bold text-foreground">{selectedReceipt.itemTitle}</p>
                </div>

                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                  <span className="font-bold text-foreground">Valor Total:</span>
                  <span className="text-base font-bold text-primary">
                    {formatMoney(selectedReceipt.amountCents)}
                  </span>
                </div>
              </div>

              {/* Rodapé de Autenticidade */}
              <div className="pt-4 border-t border-dashed border-border/60 text-center space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  Código de Autenticação Digital:
                </p>
                <p className="text-[11px] font-mono text-foreground font-bold tracking-wider">
                  {selectedReceipt.authCode}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  Emitido via Waesy • Sistema Operacional Comunitário
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="rounded-xl text-xs gap-1.5 h-10"
            >
              <Printer className="size-3.5" />
              <span>Imprimir Recibo</span>
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleShareWhatsApp(selectedReceipt)}
              className="rounded-xl text-xs font-bold gap-1.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Share2 className="size-3.5" />
              <span>Enviar via WhatsApp</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Gestão de Taxas de Entrega */}
      <CompanyDeliveryManagerModal
        storeId={store.id}
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      {/* Modal de Despacho de Motoboy via Magic Link */}
      {dispatchModalLead && (
        <DispatchDeliveryModal
          storeId={store.id}
          lead={dispatchModalLead}
          isOpen={Boolean(dispatchModalLead)}
          onClose={() => setDispatchModalLead(null)}
          onSuccess={() => {
            refetchLeads();
          }}
        />
      )}

      {/* Modal de Personalização de Perguntas pelo Lojista */}
      <Dialog open={isCustomFormModalOpen} onOpenChange={setIsCustomFormModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border-border/70 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileText className="size-4 text-primary" />
              <span>Perguntas Personalizadas da Proposta</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Configure perguntas personalizadas para os seus anúncios. Elas serão solicitadas quando um cliente clicar em "Fazer Proposta" ou "Reservar".
            </p>

            {/* Lista de campos atuais */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {customFields.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-muted-foreground">
                  Nenhuma pergunta configurada. Apenas dados padrão serão solicitados.
                </div>
              ) : (
                customFields.map((field, idx) => (
                  <div
                    key={field.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{field.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Tipo: {field.type === "text" ? "Texto" : field.type === "textarea" ? "Área de Texto" : "Caixa de Seleção"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                      title="Remover pergunta"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Adicionar nova pergunta */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-3">
              <Label className="text-[11px] font-bold text-foreground">Adicionar Pergunta:</Label>
              <Input
                placeholder="Ex: Data preferida para atendimento, Modelo do carro atual..."
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                className="h-8 text-xs rounded-xl bg-background"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                  <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Resposta Curta (Texto)</SelectItem>
                    <SelectItem value="textarea">Resposta Longa</SelectItem>
                    <SelectItem value="checkbox">Caixa de Seleção (Sim/Não)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newFieldLabel.trim()) {
                      const newField = {
                        id: "field_" + Date.now(),
                        label: newFieldLabel.trim(),
                        type: newFieldType,
                        required: newFieldRequired,
                      };
                      setCustomFields([...customFields, newField]);
                      setNewFieldLabel("");
                    }
                  }}
                  className="h-8 text-xs rounded-xl font-bold gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Adicionar</span>
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCustomFormModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveCustomFormMutation.mutate(customFields)}
              disabled={saveCustomFormMutation.isPending}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
            >
              {saveCustomFormMutation.isPending ? "Salvando..." : "Salvar Perguntas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
