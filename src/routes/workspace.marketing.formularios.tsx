/**
 * workspace.marketing.formularios.tsx — Central de Formulários de Captura, Landing Pages e CRM de Leads
 * Padrão BigTech Clean / Apple HIG | 100% Supabase Real | Zero Mocks
 */

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  TrendingUp,
  Eye,
  MessageSquare,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  Check,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Phone,
  Mail,
  Calendar,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Textarea } from "@/components/ui/textarea";
import { formatPhone } from "@/lib/document-validator";
import {
  listStoreLeadForms,
  upsertLeadForm,
  deleteLeadForm,
  listLeadSubmissions,
  updateLeadSubmissionStatus,
  getLeadFormsKpis,
  LeadFormDTO,
  LeadFormFieldDTO,
  LeadFormSubmissionDTO,
} from "@/services/lead-forms.functions";
import { getStoreSettings } from "@/services/store.functions";

export const Route = createFileRoute("/workspace/marketing/formularios")({
  head: () => ({ meta: [{ title: "Formulários de Captura & CRM de Leads | Workspace" }] }),
  loader: async () => {
    try {
      const [forms, kpis, store] = await Promise.all([
        listStoreLeadForms().catch(() => []),
        getLeadFormsKpis().catch(() => ({
          totalForms: 0,
          totalViews: 0,
          totalSubmissions: 0,
          conversionRate: 0,
          newLeadsCount: 0,
          contactedCount: 0,
          qualifiedCount: 0,
          wonCount: 0,
          lostCount: 0,
        })),
        getStoreSettings().catch(() => null),
      ]);
      const submissionsRes = await listLeadSubmissions({ data: { crmStatus: "all", limit: 100 } }).catch(() => ({
        submissions: [],
        total: 0,
      }));

      return {
        forms: forms as LeadFormDTO[],
        kpis,
        store,
        submissions: submissionsRes.submissions as LeadFormSubmissionDTO[],
      };
    } catch (err) {
      console.error("[loader:workspace.marketing.formularios] Erro no loader:", err);
      return {
        forms: [],
        kpis: {
          totalForms: 0,
          totalViews: 0,
          totalSubmissions: 0,
          conversionRate: 0,
          newLeadsCount: 0,
          contactedCount: 0,
          qualifiedCount: 0,
          wonCount: 0,
          lostCount: 0,
        },
        store: null,
        submissions: [],
      };
    }
  },
  component: WorkspaceLeadFormsPage,
});

function WorkspaceLeadFormsPage() {
  const router = useRouter();
  const { forms: initialForms, kpis: initialKpis, store, submissions: initialSubmissions } =
    Route.useLoaderData();

  const [activeTab, setActiveTab] = useState<"formularios" | "builder" | "crm">("formularios");
  const [forms, setForms] = useState<LeadFormDTO[]>(initialForms);
  const [submissions, setSubmissions] = useState<LeadFormSubmissionDTO[]>(initialSubmissions);
  const [kpis, setKpis] = useState(initialKpis);

  // Filtros do CRM
  const [crmStatusFilter, setCrmStatusFilter] = useState<string>("all");
  const [crmSearch, setCrmSearch] = useState("");
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  // Estado do Builder
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderSlug, setBuilderSlug] = useState("");
  const [builderHeadline, setBuilderHeadline] = useState("");
  const [builderSubheadline, setBuilderSubheadline] = useState("");
  const [builderNiche, setBuilderNiche] = useState("turismo");
  const [builderSubmitButtonText, setBuilderSubmitButtonText] = useState("Solicitar Contato");
  const [builderAfterSubmitAction, setBuilderAfterSubmitAction] = useState<
    "whatsapp_redirect" | "show_success_message" | "external_redirect"
  >("whatsapp_redirect");
  const [builderWhatsappPhone, setBuilderWhatsappPhone] = useState(store?.phone || "");
  const [builderWhatsappTemplate, setBuilderWhatsappTemplate] = useState(
    "Olá! Gostaria de mais informações sobre {formulario}."
  );
  const [builderSuccessMessage, setBuilderSuccessMessage] = useState(
    "Recebemos seus dados! Nossa equipe entrará em contato em instantes."
  );
  const [builderFields, setBuilderFields] = useState<
    Array<{
      id?: string;
      field_key: string;
      field_type: "text" | "phone" | "email" | "select" | "currency" | "date" | "number" | "textarea";
      label: string;
      placeholder?: string;
      is_required: boolean;
      options?: Array<{ label: string; value: string }>;
    }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  // Recarregar dados
  const refreshData = async () => {
    try {
      const [newForms, newKpis, subsRes] = await Promise.all([
        listStoreLeadForms(),
        getLeadFormsKpis(),
        listLeadSubmissions({ data: { crmStatus: "all", limit: 100 } }),
      ]);
      setForms(newForms);
      setKpis(newKpis);
      setSubmissions(subsRes.submissions);
      router.invalidate();
    } catch (err) {
      console.error("Erro ao atualizar dados:", err);
    }
  };

  // Abrir o construtor para novo formulário
  const handleOpenNewForm = () => {
    setEditingFormId(null);
    setBuilderTitle("");
    setBuilderSlug("");
    setBuilderHeadline("Solicite uma Cotação Personalizada");
    setBuilderSubheadline("Preencha as informações abaixo para receber o melhor roteiro.");
    setBuilderNiche("turismo");
    setBuilderSubmitButtonText("Receber Proposta Grátis");
    setBuilderAfterSubmitAction("whatsapp_redirect");
    setBuilderWhatsappPhone(store?.phone || "");
    setBuilderWhatsappTemplate("Olá! Gostaria de receber a cotação da viagem {formulario}.");
    setBuilderSuccessMessage("Recebemos sua solicitação! Entraremos em contato via WhatsApp.");

    // Preset padrão de Turismo
    setBuilderFields([
      {
        field_key: "destino",
        field_type: "text",
        label: "Destino Desejado",
        placeholder: "Ex: Porto Seguro, Maceió, Cancun",
        is_required: true,
      },
      {
        field_key: "data_viagem",
        field_type: "date",
        label: "Data Pretendida para Embarque",
        is_required: true,
      },
      {
        field_key: "num_viajantes",
        field_type: "select",
        label: "Número de Passageiros",
        is_required: true,
        options: [
          { label: "1 Pessoa (Individual)", value: "1" },
          { label: "2 Pessoas (Casal/Dupla)", value: "2" },
          { label: "Família (3 a 4 pessoas)", value: "3_4" },
          { label: "Grupo (5 ou mais pessoas)", value: "5_plus" },
        ],
      },
      {
        field_key: "orcamento_estimado",
        field_type: "currency",
        label: "Orçamento Máximo Previsto (por pessoa)",
        placeholder: "R$ 0,00",
        is_required: false,
      },
      {
        field_key: "observacoes",
        field_type: "textarea",
        label: "Preferências Especiais / Observações",
        placeholder: "Ex: Preferência por resort all inclusive, voo saindo de Chapecó...",
        is_required: false,
      },
    ]);

    setActiveTab("builder");
  };

  // Carregar formulário existente para edição
  const handleEditForm = (form: LeadFormDTO) => {
    setEditingFormId(form.id);
    setBuilderTitle(form.title);
    setBuilderSlug(form.slug);
    setBuilderHeadline(form.headline || "");
    setBuilderSubheadline(form.subheadline || "");
    setBuilderNiche(form.niche_id);
    setBuilderSubmitButtonText(form.submit_button_text);
    setBuilderAfterSubmitAction(form.after_submit_action);
    setBuilderWhatsappPhone(form.whatsapp_target_phone || store?.phone || "");
    setBuilderWhatsappTemplate(form.whatsapp_message_template || "");
    setBuilderSuccessMessage(form.success_message || "");

    const mapped = (form.fields || []).map((f) => ({
      id: f.id,
      field_key: f.field_key,
      field_type: f.field_type as any,
      label: f.label,
      placeholder: f.placeholder || "",
      is_required: f.is_required,
      options: f.options as any,
    }));
    setBuilderFields(mapped);
    setActiveTab("builder");
  };

  // Aplicar Preset de Nicho com 1 Clique
  const applyPreset = (niche: string) => {
    setBuilderNiche(niche);
    if (niche === "turismo") {
      setBuilderTitle("Cotação de Pacote de Viagem");
      setBuilderHeadline("Solicite sua Proposta de Viagem");
      setBuilderSubheadline("Montamos seu pacote com aéreos, hotel e passeios exclusivos.");
      setBuilderSubmitButtonText("Receber Roteiro Personalizado");
      setBuilderFields([
        { field_key: "destino", field_type: "text", label: "Destino Desejado", is_required: true, placeholder: "Ex: Gramado, Maceió, Caribe" },
        { field_key: "data_embarque", field_type: "date", label: "Data Prevista", is_required: true },
        {
          field_key: "passageiros",
          field_type: "select",
          label: "Passageiros",
          is_required: true,
          options: [
            { label: "1 Pessoa", value: "1" },
            { label: "2 Pessoas (Casal)", value: "2" },
            { label: "Família (3 a 5)", value: "familia" },
            { label: "Grupo de Amigos (6+)", value: "grupo" },
          ],
        },
        { field_key: "orcamento", field_type: "currency", label: "Orçamento Pretendido", is_required: false, placeholder: "R$ 0,00" },
        { field_key: "observacoes", field_type: "textarea", label: "Observações Adicionais", is_required: false },
      ]);
    } else if (niche === "imoveis") {
      setBuilderTitle("Interesse em Imóvel");
      setBuilderHeadline("Agende uma Visita ao Imóvel");
      setBuilderSubheadline("Tire dúvidas diretamente com o corretor responsável.");
      setBuilderSubmitButtonText("Solicitar Contato do Corretor");
      setBuilderFields([
        {
          field_key: "tipo_negocio",
          field_type: "select",
          label: "Finalidade",
          is_required: true,
          options: [
            { label: "Comprar Imóvel", value: "compra" },
            { label: "Alugar Imóvel", value: "locacao" },
            { label: "Avaliação / Financiamento", value: "financiamento" },
          ],
        },
        { field_key: "faixa_valor", field_type: "currency", label: "Faixa de Valor Pretendida", is_required: false, placeholder: "R$ 0,00" },
        { field_key: "bairro_preferencia", field_type: "text", label: "Bairro de Preferência", is_required: false },
        { field_key: "mensagem", field_type: "textarea", label: "Dúvidas ou Horário Preferencial", is_required: false },
      ]);
    } else if (niche === "veiculos") {
      setBuilderTitle("Proposta de Veículo / Test Drive");
      setBuilderHeadline("Tenho Interesse neste Veículo");
      setBuilderSubheadline("Simule financiamento ou agende seu test drive sem compromisso.");
      setBuilderSubmitButtonText("Simular Financiamento");
      setBuilderFields([
        {
          field_key: "interesse",
          field_type: "select",
          label: "Tipo de Interesse",
          is_required: true,
          options: [
            { label: "Comprar à vista / Financiado", value: "compra" },
            { label: "Dar veículo na troca", value: "troca" },
            { label: "Agendar Test Drive", value: "test_drive" },
          ],
        },
        { field_key: "veiculo_troca", field_type: "text", label: "Qual seu veículo na troca? (se houver)", is_required: false, placeholder: "Ex: Onix 2020 1.0" },
        { field_key: "valor_entrada", field_type: "currency", label: "Valor de Entrada Previsto", is_required: false, placeholder: "R$ 0,00" },
      ]);
    } else {
      setBuilderTitle("Contato e Atendimento Comercial");
      setBuilderHeadline("Fale Conosco");
      setBuilderSubheadline("Deixe sua mensagem para receber uma resposta personalizada.");
      setBuilderSubmitButtonText("Enviar Mensagem");
      setBuilderFields([
        { field_key: "assunto", field_type: "text", label: "Assunto Principal", is_required: true, placeholder: "Sobre o que deseja falar?" },
        { field_key: "mensagem", field_type: "textarea", label: "Mensagem ou Dúvida", is_required: true },
      ]);
    }
    toast.success(`Modelo de ${niche.toUpperCase()} aplicado!`);
  };

  // Salvar formulário no banco
  const handleSaveForm = async () => {
    if (!builderTitle.trim()) {
      toast.error("Informe o título do formulário");
      return;
    }

    setIsSaving(true);
    try {
      await upsertLeadForm({
        data: {
          id: editingFormId || undefined,
          title: builderTitle.trim(),
          slug: builderSlug.trim() || undefined,
          headline: builderHeadline.trim() || null,
          subheadline: builderSubheadline.trim() || null,
          niche_id: builderNiche,
          submit_button_text: builderSubmitButtonText.trim(),
          after_submit_action: builderAfterSubmitAction,
          whatsapp_target_phone: builderWhatsappPhone.trim() || null,
          whatsapp_message_template: builderWhatsappTemplate.trim() || null,
          success_message: builderSuccessMessage.trim() || null,
          fields: builderFields.map((f, idx) => ({
            id: f.id,
            field_key: f.field_key.trim(),
            field_type: f.field_type,
            label: f.label.trim(),
            placeholder: f.placeholder?.trim() || null,
            is_required: f.is_required,
            sort_order: idx,
            options: f.options || [],
          })),
        },
      });

      toast.success(editingFormId ? "Formulário atualizado com sucesso!" : "Formulário criado com sucesso!");
      await refreshData();
      setActiveTab("formularios");
    } catch (err: any) {
      console.error("Erro ao salvar formulário:", err);
      toast.error(err.message || "Erro ao salvar formulário");
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir formulário
  const handleDeleteForm = async (formId: string) => {
    try {
      await deleteLeadForm({ data: { formId } });
      toast.success("Formulário removido!");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir formulário");
    }
  };

  // Copiar link público da landing page
  const handleCopyLink = (slug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link da Landing Page copiado!");
  };

  // Atualizar Status do CRM
  const handleStatusChange = async (submissionId: string, newStatus: any) => {
    try {
      await updateLeadSubmissionStatus({
        data: {
          submissionId,
          crmStatus: newStatus,
        },
      });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, crm_status: newStatus } : s))
      );
      toast.success("Status atualizado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status");
    }
  };

  // Exportar Leads para CSV
  const handleExportCsv = () => {
    if (submissions.length === 0) {
      toast.error("Nenhum lead para exportar");
      return;
    }

    const headers = ["Data", "Nome", "WhatsApp", "E-mail", "Formulário", "Status CRM", "Origem UTM", "Novo Usuário"];
    const rows = submissions.map((s) => [
      new Date(s.created_at).toLocaleDateString("pt-BR"),
      `"${s.contact_name.replace(/"/g, '""')}"`,
      `"${s.contact_phone}"`,
      `"${s.contact_email || ""}"`,
      `"${s.form?.title || ""}"`,
      s.crm_status,
      s.utm_source || "direto",
      s.is_new_registered_user ? "Sim" : "Não",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_waesy_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso!");
  };

  // Filtragem dos leads
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchStatus = crmStatusFilter === "all" || s.crm_status === crmStatusFilter;
      const q = crmSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.contact_name.toLowerCase().includes(q) ||
        s.contact_phone.includes(q) ||
        (s.contact_email && s.contact_email.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [submissions, crmStatusFilter, crmSearch]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Cabeçalho Canônico */}
      <PageHeader
        title="Formulários & CRM de Leads"
        description="Landing Pages mágicas para tráfego pago, formulários nos anúncios e gestão de conversão."
      >
        <div className="flex items-center gap-2">
          {activeTab === "crm" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="rounded-xl h-10 gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleOpenNewForm}
            className="rounded-xl h-10 gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Formulário</span>
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/60">
          <span className="text-xs text-muted-foreground">Formulários Ativos</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {kpis.totalForms}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/60">
          <span className="text-xs text-muted-foreground">Visualizações Totais</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {kpis.totalViews}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/60">
          <span className="text-xs text-muted-foreground">Leads Capturados</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1 text-primary">
            {kpis.totalSubmissions}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/60">
          <span className="text-xs text-muted-foreground">Taxa de Conversão</span>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-1">
            {kpis.conversionRate}%
          </div>
        </div>
      </div>

      {/* Navegação de Abas Unificadas */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/40 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("formularios")}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
            activeTab === "formularios"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Formulários ({forms.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("builder")}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
            activeTab === "builder"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {editingFormId ? "Editar Formulário" : "Novo Formulário"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("crm")}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "crm"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Caixa de Entrada (CRM)</span>
          {kpis.newLeadsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
              {kpis.newLeadsCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── ABA 1: LISTA DE FORMULÁRIOS ────────────────────────────────────────── */}
      {activeTab === "formularios" && (
        <div className="space-y-4">
          {forms.length === 0 ? (
            <div className="py-16 text-center bg-card rounded-2xl border border-border/60 p-6 flex flex-col items-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Nenhum formulário criado ainda
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">
                Crie seu primeiro formulário personalizado para capturar leads através de campanhas do Facebook, Google ou diretamente nos seus anúncios.
              </p>
              <Button onClick={handleOpenNewForm} className="rounded-xl h-10 gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Formulário</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="bg-card rounded-2xl border border-border/60 p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                          {form.niche_id}
                        </Badge>
                        <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                          {form.title}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${form.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                        {form.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {form.headline || "Sem descrição"}
                    </div>

                    {/* Métricas do Formulário */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Views</div>
                        <div className="text-xs font-bold text-foreground">{form.views_count}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Leads</div>
                        <div className="text-xs font-bold text-primary">{form.submissions_count}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Taxa</div>
                        <div className="text-xs font-bold text-emerald-600">
                          {form.views_count > 0 ? ((form.submissions_count / form.views_count) * 100).toFixed(0) : 0}%
                        </div>
                      </div>
                    </div>

                    {/* Link da Landing Page */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="font-mono text-[11px] truncate max-w-[180px]">
                        /f/{form.slug}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(form.slug)}
                        className="h-7 px-2 text-xs gap-1 rounded-lg"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </Button>
                    </div>
                  </div>

                  {/* Ações Inferiores */}
                  <div className="flex items-center gap-2 pt-4 mt-3 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1 h-9 rounded-xl text-xs gap-1"
                    >
                      <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Landing</span>
                      </a>
                    </Button>
                    <CrudActionsMenu
                      entityName="Formulário"
                      onEdit={() => handleEditForm(form)}
                      viewUrl={`/f/${form.slug}`}
                      onDelete={() => handleDeleteForm(form.id)}
                      deleteConfirmTitle={`Excluir formulário "${form.title}"?`}
                      deleteConfirmDescription="Todas as respostas enviadas e a landing page pública associada serão permanentemente removidas."
                      customActions={[
                        {
                          id: "copy-url",
                          label: "Copiar Link Público",
                          icon: Copy,
                          onClick: () => handleCopyLink(form.slug),
                        },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 2: CONSTRUTOR DE FORMULÁRIOS ─────────────────────────────────── */}
      {activeTab === "builder" && (
        <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/40 gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {editingFormId ? "Editar Formulário" : "Novo Formulário de Captura"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure os campos e a automação de atendimento pós-envio.
              </p>
            </div>

            {/* Presets de Nicho */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground mr-1">Modelos:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("turismo")}
                className="h-8 text-xs rounded-lg"
              >
                Viagens
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("imoveis")}
                className="h-8 text-xs rounded-lg"
              >
                Imóveis
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("veiculos")}
                className="h-8 text-xs rounded-lg"
              >
                Veículos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("geral")}
                className="h-8 text-xs rounded-lg"
              >
                Geral
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bloco Esquerdo: Configurações Gerais */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Título Interno do Formulário</Label>
                <Input
                  value={builderTitle}
                  onChange={(e) => setBuilderTitle(e.target.value)}
                  placeholder="Ex: Cotação Viagem Cancun 2026"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Headline da Landing Page (Título Público)</Label>
                <Input
                  value={builderHeadline}
                  onChange={(e) => setBuilderHeadline(e.target.value)}
                  placeholder="Ex: Solicite sua Cotação Exclusiva para Cancun"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Subheadline / Descrição</Label>
                <Textarea
                  value={builderSubheadline}
                  onChange={(e) => setBuilderSubheadline(e.target.value)}
                  placeholder="Ex: Preencha as informações para receber opções de voo e hotel."
                  className="rounded-xl text-sm min-h-[70px] resize-none"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Texto do Botão de Envio</Label>
                <Input
                  value={builderSubmitButtonText}
                  onChange={(e) => setBuilderSubmitButtonText(e.target.value)}
                  placeholder="Ex: Receber Cotação Grátis"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              {/* Automação Pós-Envio */}
              <div className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                <Label className="text-xs font-semibold text-foreground">Automação Pós-Envio</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBuilderAfterSubmitAction("whatsapp_redirect")}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                      builderAfterSubmitAction === "whatsapp_redirect"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground"
                    }`}
                  >
                    💬 Abrir WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuilderAfterSubmitAction("show_success_message")}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                      builderAfterSubmitAction === "show_success_message"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground"
                    }`}
                  >
                    ✅ Mensagem de Sucesso
                  </button>
                </div>

                {builderAfterSubmitAction === "whatsapp_redirect" && (
                  <div className="space-y-2 pt-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">WhatsApp de Atendimento</Label>
                      <Input
                        value={builderWhatsappPhone}
                        onChange={(e) => setBuilderWhatsappPhone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Template da Mensagem Inicial</Label>
                      <Textarea
                        value={builderWhatsappTemplate}
                        onChange={(e) => setBuilderWhatsappTemplate(e.target.value)}
                        className="rounded-xl text-xs min-h-[60px] resize-none"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Tags: {"{nome}"}, {"{telefone}"}, {"{formulario}"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bloco Direito: Editor de Campos Dinâmicos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Campos do Formulário</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Nome e WhatsApp são coletados obrigatoriamente por padrão.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBuilderFields((prev) => [
                      ...prev,
                      {
                        field_key: `campo_${Date.now()}`,
                        field_type: "text",
                        label: "Nova Pergunta",
                        is_required: false,
                      },
                    ]);
                  }}
                  className="rounded-xl h-8 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Campo</span>
                </Button>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {builderFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border/50 bg-background space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBuilderFields((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, label: val } : f))
                          );
                        }}
                        placeholder="Rótulo da pergunta..."
                        className="h-9 text-xs rounded-lg font-medium flex-1"
                      />
                      <select
                        value={field.field_type}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setBuilderFields((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, field_type: val } : f))
                          );
                        }}
                        className="h-9 px-2 text-xs rounded-lg border border-input bg-background"
                      >
                        <option value="text">Texto Curto</option>
                        <option value="select">Seleção / Dropdown</option>
                        <option value="currency">Moeda (R$)</option>
                        <option value="date">Data</option>
                        <option value="number">Número</option>
                        <option value="textarea">Texto Longo</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setBuilderFields((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.is_required}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBuilderFields((prev) =>
                              prev.map((f, i) => (i === idx ? { ...f, is_required: checked } : f))
                            );
                          }}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        <span>Obrigatório</span>
                      </label>
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        key: {field.field_key}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rodapé de Ações do Builder */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => setActiveTab("formularios")}
              className="rounded-xl h-11 px-5"
            >
              Cancelar
            </Button>
            <Button
              disabled={isSaving}
              onClick={handleSaveForm}
              className="rounded-xl h-11 px-6 bg-primary text-primary-foreground font-medium gap-2 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Formulário</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── ABA 3: CAIXA DE ENTRADA & CRM DE LEADS ───────────────────────────── */}
      {activeTab === "crm" && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-card rounded-2xl border border-border/60">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={crmSearch}
                onChange={(e) => setCrmSearch(e.target.value)}
                placeholder="Buscar por nome, telefone ou e-mail..."
                className="pl-9 h-10 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">Status:</span>
              {[
                { label: "Todos", value: "all" },
                { label: "Novos", value: "new" },
                { label: "Contatados", value: "contacted" },
                { label: "Qualificados", value: "qualified" },
                { label: "Ganhos", value: "won" },
                { label: "Perdidos", value: "lost" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCrmStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    crmStatusFilter === opt.value
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Leads */}
          {filteredSubmissions.length === 0 ? (
            <div className="py-16 text-center bg-card rounded-2xl border border-border/60 p-6 flex flex-col items-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Nenhum lead encontrado
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Quando novos clientes enviarem respostas através das suas Landing Pages ou anúncios, eles aparecerão aqui instantaneamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub) => {
                const isExpanded = expandedSubmissionId === sub.id;
                const cleanPhone = sub.contact_phone.replace(/\D/g, "");
                const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                  `Olá ${sub.contact_name}! Estou entrando em contato referente à sua solicitação no Waesy.`
                )}`;

                return (
                  <div
                    key={sub.id}
                    className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5 transition-all shadow-2xs hover:border-primary/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {sub.contact_name[0]?.toUpperCase() || "L"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-foreground">
                              {sub.contact_name}
                            </h4>
                            {sub.is_new_registered_user && (
                              <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Registro Rápido
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              • {new Date(sub.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3" />
                              {sub.contact_phone}
                            </span>
                            {sub.contact_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {sub.contact_email}
                              </span>
                            )}
                            {sub.form?.title && (
                              <span className="text-primary font-medium">
                                Origem: {sub.form.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações Rápidas & Status CRM */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <select
                          value={sub.crm_status}
                          onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                          className={`h-9 px-2.5 text-xs font-medium rounded-xl border ${
                            sub.crm_status === "new"
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                              : sub.crm_status === "won"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : sub.crm_status === "lost"
                              ? "bg-red-500/10 text-red-700 border-red-500/20"
                              : "bg-muted/40 text-foreground border-border/50"
                          }`}
                        >
                          <option value="new">🟡 Novo</option>
                          <option value="contacted">🔵 Contatado</option>
                          <option value="qualified">🟣 Qualificado</option>
                          <option value="won">🟢 Ganho / Fechado</option>
                          <option value="lost">🔴 Perdido</option>
                        </select>

                        <Button
                          asChild
                          size="sm"
                          className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs text-xs px-3"
                        >
                          <a href={waUrl} target="_blank" rel="noreferrer">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                          className="h-9 w-9 p-0 rounded-xl"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Respostas Detalhadas Expansíveis */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-border/40 space-y-2 text-xs">
                        <div className="font-semibold text-foreground">Respostas do Lead:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-muted/20 rounded-xl">
                          {Object.entries(sub.raw_answers || {}).map(([k, v]) => (
                            <div key={k} className="space-y-0.5">
                              <span className="text-[11px] text-muted-foreground uppercase font-medium">{k}</span>
                              <div className="font-medium text-foreground">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
