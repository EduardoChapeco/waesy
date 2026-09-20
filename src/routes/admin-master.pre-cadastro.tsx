import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Sparkles,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  Building2,
  Ticket,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  MapPin,
  FileSpreadsheet,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  listFounderLeads,
  updateFounderLeadStatus,
  getLaunchLandingSettings,
  updateLaunchLandingSettings,
  type FounderLeadDTO,
  type LaunchLandingSettingsDTO,
  type LaunchSlideDTO,
} from "@/services/launch.functions";

export const Route = createFileRoute("/admin-master/pre-cadastro")({
  head: () => ({
    meta: [{ title: "Pré-Cadastro & Lançamento 2027 | Admin Master Waesy" }],
  }),
  loader: async () => {
    try {
      const [leadsRes, settingsRes] = await Promise.all([
        listFounderLeads({ data: { page: 1, pageSize: 100 } }).catch(() => ({
          leads: [],
          total: 0,
          page: 1,
          pageSize: 100,
        })),
        getLaunchLandingSettings().catch(() => null),
      ]);
      return { initialLeads: leadsRes, initialSettings: settingsRes };
    } catch {
      return { initialLeads: null, initialSettings: null };
    }
  },
  component: AdminPreCadastroPage,
});

export default function AdminPreCadastroPage() {
  const queryClient = useQueryClient();
  const { initialLeads, initialSettings } = ((Route.useLoaderData?.() as any) || {});

  const [activeTab, setActiveTab] = useState<"leads" | "cms">("leads");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "contacted" | "converted">("all");

  // Query de Leads
  const { data: leadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["admin-founder-leads", searchQuery, statusFilter],
    queryFn: () =>
      listFounderLeads({
        data: {
          search: searchQuery || undefined,
          status: statusFilter,
          page: 1,
          pageSize: 100,
        },
      }),
    initialData: initialLeads,
  });

  const leads = leadsData?.leads || [];

  // Query de Configurações CMS
  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ["admin-launch-settings"],
    queryFn: () => getLaunchLandingSettings(),
    initialData: initialSettings,
  });

  // Estado do Editor CMS
  const [cmsForm, setCmsForm] = useState<LaunchLandingSettingsDTO>(() => {
    return (
      settingsData || {
        key: "default",
        hero_badge: "Circuito 2027 • Chapecó & São Miguel do Oeste",
        hero_title: "O novo ponto de encontro do comércio, turismo e conexões",
        hero_subtitle:
          "Uma experiência completa que conecta clientes aos melhores negócios da nossa região com tecnologia, eventos e benefícios exclusivos.",
        slides: [],
        event_info: {
          circuito_title: "Circuito Internacional Waesy 2027",
          dates: "Temporada 2027",
          locations: "Chapecó & São Miguel do Oeste - SC",
          perks: [],
        },
      }
    );
  });

  // Mutação para Atualizar Status do Lead
  const updateStatusMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: any }) =>
      updateFounderLeadStatus({ data: { leadId, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-founder-leads"] });
      toast.success("Status do lead atualizado!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar status.");
    },
  });

  // Mutação para Salvar CMS
  const [isSavingCms, setIsSavingCms] = useState(false);
  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCms(true);
    try {
      await updateLaunchLandingSettings({ data: cmsForm });
      toast.success("Landing Page atualizada com sucesso!");
      refetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alterações no CMS.");
    } finally {
      setIsSavingCms(false);
    }
  };

  // Exportação CSV
  const handleExportCSV = () => {
    if (leads.length === 0) {
      toast.error("Nenhum lead para exportar.");
      return;
    }

    const headers = ["Ticket", "Nome", "WhatsApp", "Empresa", "CNPJ", "Cidade", "Status", "Data"];
    const rows = leads.map((l: FounderLeadDTO) => [
      l.ticket_number,
      `"${l.name.replace(/"/g, '""')}"`,
      l.whatsapp,
      `"${(l.company_name || "").replace(/"/g, '""')}"`,
      l.cnpj || "",
      `"${(l.city || "").replace(/"/g, '""')}"`,
      l.status,
      new Date(l.created_at).toLocaleDateString("pt-BR"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((e: string[]) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `membros_fundadores_waesy_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  // Abrir WhatsApp com mensagem pronta
  const handleOpenWhatsApp = (lead: FounderLeadDTO) => {
    const clean = lead.whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${lead.name}! Vimos que você se inscreveu como Membro Fundador no Circuito Internacional Waesy 2027 com a empresa ${lead.company_name || ""}. Seu ticket oficial do sorteio de viagens é ${lead.ticket_number}. Como podemos ajudar com a estrutura do seu perfil?`,
    );
    window.open(`https://wa.me/55${clean}?text=${msg}`, "_blank");
  };

  // Adicionar novo slide
  const handleAddSlide = () => {
    setCmsForm((prev) => ({
      ...prev,
      slides: [
        ...prev.slides,
        {
          id: `slide-${Date.now()}`,
          title: "Novo Destaque / Show",
          tag: "Evento",
          image_url:
            "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
        },
      ],
    }));
  };

  // Remover slide
  const handleRemoveSlide = (idx: number) => {
    setCmsForm((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── CABEÇALHO DO PAINEL ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Pré-Cadastro & Lançamento 2027
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
              Circuito Internacional
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Gerenciamento de empresas interessadas, membros fundadores e conteúdo da Landing Page pública (/home).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
            <a href="/home" target="_blank" rel="noreferrer">
              <span>Ver Landing Page</span>
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
          {activeTab === "leads" && (
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              <Download className="size-3.5" />
              <span>Exportar CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── SELETOR DE ABAS PRINCIPAIS ── */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "leads"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Users className="size-4" />
          <span>Leads & Membros Fundadores ({leads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cms")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "cms"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Sparkles className="size-4" />
          <span>Editor da Landing Page (CMS)</span>
        </button>
      </div>

      {/* ── CONTEÚDO DA ABA 1: LEADS ── */}
      {activeTab === "leads" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome, empresa, ticket, whatsapp ou cidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs bg-muted/20 border-border"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  { id: "all", label: "Todos" },
                  { id: "pending", label: "Pendentes" },
                  { id: "contacted", label: "Contatados" },
                  { id: "converted", label: "Convertidos" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    statusFilter === tab.id
                      ? "bg-card border border-border text-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Leads */}
          {isLoadingLeads ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando lista de fundadores...
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center space-y-3 rounded-2xl border border-dashed border-border bg-muted/10">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Nenhum cadastro encontrado</h3>
                <p className="text-xs text-muted-foreground">
                  Quando visitantes se cadastrarem na página /home, os registros aparecerão aqui em tempo real.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-bold">
                    <tr>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Nome / Responsável</th>
                      <th className="py-3 px-4">Empresa / @</th>
                      <th className="py-3 px-4">WhatsApp</th>
                      <th className="py-3 px-4">Cidade</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {leads.map((lead: FounderLeadDTO) => (
                      <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          <span className="flex items-center gap-1">
                            <Ticket className="size-3 text-muted-foreground" />
                            {lead.ticket_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {lead.name}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground block">
                              {lead.company_name || "-"}
                            </span>
                            {lead.cnpj && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                CNPJ: {lead.cnpj}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {lead.whatsapp}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground/70" />
                            {lead.city || "Chapecó / SMO"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) =>
                              updateStatusMutation.mutate({
                                leadId: lead.id,
                                status: e.target.value as any,
                              })
                            }
                            className="text-[11px] font-bold rounded-lg border border-border bg-card px-2 py-1 cursor-pointer focus:outline-none"
                          >
                            <option value="pending">Pendente</option>
                            <option value="contacted">Contatado</option>
                            <option value="approved">Aprovado</option>
                            <option value="converted">Convertido</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenWhatsApp(lead)}
                            className="h-8 rounded-xl text-[11px] font-bold gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <WhatsappLogo className="size-3.5" weight="fill" />
                            <span>WhatsApp</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO DA ABA 2: EDITOR CMS ── */}
      {activeTab === "cms" && (
        <form onSubmit={handleSaveCms} className="space-y-6 animate-in fade-in duration-200">
          {/* Card Hero Principal */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
            <div className="border-b border-border/40 pb-3">
              <h2 className="text-sm font-bold text-foreground">
                Seção Principal do Topo (Hero)
              </h2>
              <p className="text-xs text-muted-foreground">
                Textos de apresentação e proposta de valor exibidos no início da Landing Page.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Badge Superior</Label>
                <Input
                  value={cmsForm.hero_badge}
                  onChange={(e) =>
                    setCmsForm((prev) => ({ ...prev, hero_badge: e.target.value }))
                  }
                  className="h-10 rounded-xl text-xs bg-muted/20 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Título Principal (H1)</Label>
                <Input
                  value={cmsForm.hero_title}
                  onChange={(e) =>
                    setCmsForm((prev) => ({ ...prev, hero_title: e.target.value }))
                  }
                  className="h-10 rounded-xl text-xs bg-muted/20 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Subtítulo / Parágrafo Explicativo</Label>
                <Textarea
                  rows={3}
                  value={cmsForm.hero_subtitle}
                  onChange={(e) =>
                    setCmsForm((prev) => ({ ...prev, hero_subtitle: e.target.value }))
                  }
                  className="rounded-xl text-xs bg-muted/20 border-border resize-none"
                />
              </div>
            </div>
          </div>

          {/* Card Carrossel de Mídias */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Carrossel de Atrações & Novidades
                </h2>
                <p className="text-xs text-muted-foreground">
                  Cards horizontais com fotos de eventos, shows e feiras do Circuito 2027.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddSlide}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Adicionar Slide</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cmsForm.slides.map((slide, idx) => (
                <div
                  key={slide.id || idx}
                  className="rounded-2xl border border-border/70 bg-muted/10 p-3 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground font-mono">
                      Slide #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlide(idx)}
                      className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Excluir slide"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">Título do Slide</Label>
                      <Input
                        value={slide.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCmsForm((prev) => ({
                            ...prev,
                            slides: prev.slides.map((s, i) =>
                              i === idx ? { ...s, title: val } : s,
                            ),
                          }));
                        }}
                        className="h-9 rounded-xl text-xs bg-card"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">Tag / Categoria</Label>
                      <Input
                        value={slide.tag}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCmsForm((prev) => ({
                            ...prev,
                            slides: prev.slides.map((s, i) =>
                              i === idx ? { ...s, tag: val } : s,
                            ),
                          }));
                        }}
                        className="h-9 rounded-xl text-xs bg-card"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">URL da Imagem</Label>
                      <Input
                        value={slide.image_url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCmsForm((prev) => ({
                            ...prev,
                            slides: prev.slides.map((s, i) =>
                              i === idx ? { ...s, image_url: val } : s,
                            ),
                          }));
                        }}
                        className="h-9 rounded-xl text-xs bg-card font-mono"
                      />
                    </div>

                    {slide.image_url && (
                      <div className="aspect-[16/10] w-full rounded-xl overflow-hidden border border-border/80 bg-muted mt-2">
                        <img
                          src={slide.image_url}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão de Salvar Alterações */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="submit"
              disabled={isSavingCms}
              className="rounded-xl text-xs font-bold gap-2 px-6 h-11 bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              <Save className="size-4" />
              <span>{isSavingCms ? "Salvando..." : "Salvar Alterações no CMS"}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
