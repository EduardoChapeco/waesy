import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
 Eye,
 Percent,
 ShieldCheck,
 Megaphone,
 WhatsappLogo,
 CheckCircle,
 ChatCircle,
 Funnel,
 Buildings,
 ClockCounterClockwise,
 ChartBar,
 TrendUp,
 CursorClick,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 getSponsorMetricsDashboard,
 type SponsorMetricsDTO,
} from "@/services/telemetry.functions";
import {
 getStoreWhatsAppAnalytics,
 listStoreWhatsAppLeads,
 updateWhatsAppLeadStatus,
 type WhatsAppLeadDTO,
 type WhatsAppAnalyticsDTO,
} from "@/services/whatsapp-leads.functions";

export const Route = createFileRoute("/workspace/marketing/telemetria")({
 head: () => ({
 meta: [{ title: "Telemetria de Audiência, WhatsApp & Patrocinadores | Workspace Waesy" }],
 }),
 loader: async () => {
   try {
 const [sponsorData, whatsappAnalytics] = await Promise.all([
 getSponsorMetricsDashboard().catch(() => ({
 totalImpressions: 0,
 totalUniqueViews: 0,
 totalClicks: 0,
 avgCtr: 0,
 sponsorsMetrics: [] as SponsorMetricsDTO[],
 })),
 getStoreWhatsAppAnalytics({ data: { days: 30 } }).catch(() => ({
 total_leads: 0,
 responded_leads: 0,
 converted_leads: 0,
 conversion_rate: 0,
 entity_distribution: [],
 top_items: [],
 daily_trend: [],
 } as WhatsAppAnalyticsDTO)),
 ]);
 return { sponsorData, whatsappAnalytics };
   } catch (err) {
     console.error("[loader:workspace.marketing.telemetria] Unhandled error:", err);
     return {
       sponsorData: {
         totalImpressions: 0,
         totalUniqueViews: 0,
         totalClicks: 0,
         avgCtr: 0,
         sponsorsMetrics: [] as SponsorMetricsDTO[],
       },
       whatsappAnalytics: {
         total_leads: 0,
         responded_leads: 0,
         converted_leads: 0,
         conversion_rate: 0,
         entity_distribution: [],
         top_items: [],
         daily_trend: [],
       } as WhatsAppAnalyticsDTO,
     };
   }
 },
 component: WorkspaceTelemetriaPage,
});

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
 initiated: { label: "Iniciado", color: "bg-muted text-muted-foreground border-border" },
 opened: { label: "Aberto", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
 responded: { label: "Respondido", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
 converted: { label: "Convertido", color: "bg-primary/10 text-primary border-primary/20" },
 lost: { label: "Perdido", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ENTITY_LABELS: Record<string, string> = {
 store: "Loja", product: "Produto", classified: "Classificado",
 job: "Vaga", tourism: "Turismo", directory: "Diretório",
 event: "Evento", quote: "Orçamento", custom: "Personalizado",
};

// ─── Componente LeadRow ───────────────────────────────────────────────────────
function LeadRow({ lead, onStatusChange }: { lead: WhatsAppLeadDTO; onStatusChange: (id: string, status: string) => void }) {
 const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.initiated;
 const date = new Date(lead.created_at).toLocaleString("pt-BR", {
 day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
 });
 const maskedPhone = lead.phone_target.length >= 10
 ? `${lead.phone_target.slice(0, 4)}****${lead.phone_target.slice(-2)}`
 : lead.phone_target;

 return (
 <tr className="hover:bg-muted/30 transition-colors last:border-0">
 <td className="py-3 px-3">
 <div className="flex flex-col gap-0.5">
 <span className="font-bold text-foreground text-xs">{lead.entity_title || "—"}</span>
 <span className="text-[10px] text-muted-foreground font-mono">{lead.lead_code}</span>
 </div>
 </td>
 <td className="py-3 px-3">
 <Badge variant="outline" className="text-[9px] font-mono font-bold uppercase px-1.5">
 {ENTITY_LABELS[lead.entity_type] || lead.entity_type}
 </Badge>
 </td>
 <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{maskedPhone}</td>
 <td className="py-3 px-3">
 <Badge variant="outline" className={`text-[10px] font-bold w-fit ${statusCfg.color}`}>
 {statusCfg.label}
 </Badge>
 </td>
 <td className="py-3 px-3">
 <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5">
 {lead.device_type}
 </Badge>
 </td>
 <td className="py-3 px-3 text-xs text-muted-foreground font-mono">{date}</td>
 <td className="py-3 px-3">
 <select
 className="text-[10px] rounded-lg bg-background px-2 py-1 font-bold text-foreground cursor-pointer"
 value={lead.status}
 onChange={(e) => onStatusChange(lead.id, e.target.value)}
 >
 {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
 <option key={val} value={val}>{label}</option>
 ))}
 </select>
 </td>
 </tr>
 );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function WorkspaceTelemetriaPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const sponsorData = loaderData.sponsorData || {
    totalImpressions: 0,
    totalUniqueViews: 0,
    totalClicks: 0,
    avgCtr: 0,
    sponsorsMetrics: [],
  };
  const whatsappAnalytics = loaderData.whatsappAnalytics || {
    total_leads: 0,
    responded_leads: 0,
    converted_leads: 0,
    conversion_rate: 0,
    entity_distribution: [],
    top_items: [],
    daily_trend: [],
  };
  const { totalImpressions, totalUniqueViews, totalClicks, avgCtr, sponsorsMetrics } = sponsorData;
  const [activeTab, setActiveTab] = useState<"whatsapp" | "sponsors">("whatsapp");
 const [statusFilter, setStatusFilter] = useState<string>("all");

 const { data: leads = [], refetch: refetchLeads, isLoading: leadsLoading } = useQuery({
 queryKey: ["whatsapp-leads", statusFilter],
 queryFn: () => listStoreWhatsAppLeads({ data: { status: statusFilter as any, limit: 50 } }),
 initialData: [],
 });

 const handleStatusChange = async (leadId: string, newStatus: string) => {
 await updateWhatsAppLeadStatus({ data: { lead_id: leadId, status: newStatus as any } });
 refetchLeads();
 };

 const wa = whatsappAnalytics;

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
 Telemetria & Analytics
 </span>
 <span className="text-xs text-muted-foreground font-mono">Dados Auditados em Tempo Real</span>
 </div>
 <h1 className="text-2xl font-black tracking-tight text-foreground mt-1">Central de Conversões</h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
 Mensuração real de leads de WhatsApp, alcance de patrocinadores e taxa de conversão.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button asChild variant="outline" className="rounded-xl font-bold text-xs h-9">
 <Link to="/workspace/marketing/pixels">
 <CursorClick size={16} weight="bold" className="mr-1.5 text-primary" />
 Pixels & CAPI
 </Link>
 </Button>
 <Button asChild variant="outline" className="rounded-xl font-bold text-xs h-9">
 <Link to="/workspace/marketing/patrocinadores">
 <Megaphone size={16} weight="bold" className="mr-1.5" />
 Patrocinadores
 </Link>
 </Button>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl w-fit ">
 {(["whatsapp", "sponsors"] as const).map((tab) => (
 <button
 key={tab}
 type="button"
 onClick={() => setActiveTab(tab)}
 className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
 activeTab === tab
 ? "bg-background text-foreground "
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 {tab === "whatsapp" ? (
 <><WhatsappLogo size={16} weight="bold" className="text-emerald-500" /> Leads WhatsApp</>
 ) : (
 <><ChartBar size={16} weight="bold" /> Patrocinadores</>
 )}
 </button>
 ))}
 </div>

 {/* ─── TAB WHATSAPP ─────────────────────────────────────────────────── */}
 {activeTab === "whatsapp" && (
 <div className="space-y-5">
 {/* KPIs */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: "Total de Leads", value: wa.total_leads, sub: "Últimos 30 dias", icon: <WhatsappLogo size={18} weight="bold" className="text-emerald-500" /> },
 { label: "Respondidos", value: wa.responded_leads, sub: "Confirmaram interesse", icon: <ChatCircle size={18} weight="bold" className="text-amber-500" /> },
 { label: "Convertidos", value: wa.converted_leads, sub: "Fecharam negócio", icon: <CheckCircle size={18} weight="bold" className="text-primary" /> },
 { label: "Taxa de Conversão", value: `${(wa.conversion_rate ?? 0).toFixed(1)}%`, sub: "De leads → fechados", icon: <TrendUp size={18} weight="bold" className="text-info" /> },
 ].map((card) => (
 <div key={card.label} className="p-5 rounded-2xl bg-card space-y-2 ">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-bold uppercase tracking-wider">{card.label}</span>
 {card.icon}
 </div>
 <p className="text-2xl font-black text-foreground">{card.value}</p>
 <p className="text-[11px] text-muted-foreground">{card.sub}</p>
 </div>
 ))}
 </div>

 {/* Distribuição + Top Itens */}
 {(wa.entity_distribution.length > 0 || wa.top_items.length > 0) && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {wa.entity_distribution.length > 0 && (
 <div className="p-5 rounded-2xl bg-card space-y-3 ">
 <div className="flex items-center gap-2">
 <Buildings size={18} weight="bold" className="text-muted-foreground" />
 <h3 className="text-sm font-bold text-foreground">Leads por Módulo</h3>
 </div>
 <div className="space-y-2">
          {wa.entity_distribution.map((item: any) => {
 const pct = wa.total_leads > 0 ? Math.round((item.count / wa.total_leads) * 100) : 0;
 return (
 <div key={item.entity_type} className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-foreground">{ENTITY_LABELS[item.entity_type] || item.entity_type}</span>
 <span className="font-mono text-muted-foreground">{item.count} ({pct}%)</span>
 </div>
 <div className="h-1.5 rounded-full bg-muted overflow-hidden">
 <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 {wa.top_items.length > 0 && (
 <div className="p-5 rounded-2xl bg-card space-y-3 ">
 <div className="flex items-center gap-2">
 <CursorClick size={18} weight="bold" className="text-primary" />
 <h3 className="text-sm font-bold text-foreground">Mais Clicados</h3>
 </div>
 <div className="space-y-2">
          {wa.top_items.slice(0, 5).map((item: any, idx: number) => (
 <div key={`${item.entity_id}-${idx}`} className="flex items-center justify-between gap-2 text-xs py-1.5 last:border-0">
 <div className="flex items-center gap-2 min-w-0">
 <span className="size-5 shrink-0 rounded-full bg-muted flex items-center justify-center font-black text-[10px] text-muted-foreground">{idx + 1}</span>
 <span className="font-semibold text-foreground truncate">{item.title || "—"}</span>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <WhatsappLogo size={12} weight="bold" className="text-emerald-500" />
 <span className="font-black text-foreground">{item.clicks}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Tabela de Gestão de Leads */}
 <div className="p-5 sm:p-6 rounded-2xl bg-card space-y-4 ">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h3 className="text-base font-bold text-foreground">Gestão de Leads</h3>
 <p className="text-xs text-muted-foreground">Acompanhe e atualize o status de cada contacto recebido via WhatsApp.</p>
 </div>
 <div className="flex items-center gap-2">
 <Funnel size={14} weight="bold" className="text-muted-foreground" />
 <select
 className="text-xs rounded-xl bg-background px-3 py-1.5 font-bold text-foreground"
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 >
 <option value="all">Todos os status</option>
 {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
 <option key={val} value={val}>{label}</option>
 ))}
 </select>
 </div>
 </div>

 {leadsLoading ? (
 <div className="py-12 text-center">
 <ClockCounterClockwise size={32} weight="bold" className="text-muted-foreground/30 mx-auto mb-2 animate-spin" />
 <p className="text-xs text-muted-foreground">Carregando leads...</p>
 </div>
 ) : leads.length === 0 ? (
 <div className="py-12 text-center">
 <WhatsappLogo size={40} weight="bold" className="text-muted-foreground/20 mx-auto mb-3" />
 <p className="text-sm font-bold text-muted-foreground">Nenhum lead de WhatsApp ainda</p>
 <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto">
 Quando visitantes clicarem em "Conversar no WhatsApp" nos anúncios, os leads aparecerão aqui.
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className=" text-muted-foreground">
 {["Anúncio / Código", "Tipo", "Telefone", "Status", "Dispositivo", "Data", "Atualizar"].map((h) => (
 <th key={h} className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {leads.map((lead) => (
 <LeadRow key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
 ))}
 </tbody>
 </table>
 </div>
 )}

 <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground ">
 <ShieldCheck size={14} weight="bold" className="text-emerald-500 shrink-0" />
 <span>Telefones mascarados (LGPD). Código rastreável injetado em cada mensagem para prova de conversão auditável.</span>
 </div>
 </div>
 </div>
 )}

 {/* ─── TAB PATROCINADORES ───────────────────────────────────────────── */}
 {activeTab === "sponsors" && (
 <div className="space-y-5">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: "Impressões Totais", value: totalImpressions, sub: "Exibições renderizadas em tela", icon: <Eye size={18} weight="bold" className="text-primary" /> },
 { label: "Leitores Únicos", value: totalUniqueViews, sub: "Contas e sessões únicas validadas", icon: <TrendUp size={18} weight="bold" className="text-emerald-500" /> },
 { label: "Cliques nos Anúncios", value: totalClicks, sub: "Interações diretas para o anunciante", icon: <CursorClick size={18} weight="bold" className="text-info" /> },
 { label: "CTR Médio", value: `${avgCtr}%`, sub: "Taxa de conversão por impressão", icon: <Percent size={18} weight="bold" className="text-primary" /> },
 ].map((card) => (
 <div key={card.label} className="p-5 rounded-2xl bg-card space-y-2 ">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-bold uppercase tracking-wider">{card.label}</span>
 {card.icon}
 </div>
 <p className="text-2xl font-black text-foreground">{card.value}</p>
 <p className="text-[11px] text-muted-foreground">{card.sub}</p>
 </div>
 ))}
 </div>

 <div className="p-5 sm:p-6 rounded-2xl bg-card space-y-4 ">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-bold text-foreground">Desempenho por Anunciante</h3>
 <p className="text-xs text-muted-foreground">Relatório de entrega com tempo de visualização e alcance de rolagem de página.</p>
 </div>
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
 <ShieldCheck size={14} weight="bold" className="text-emerald-500" />
 <span>Anti-duplicação ativo</span>
 </div>
 </div>

 {sponsorsMetrics.length === 0 ? (
 <div className="py-12 text-center text-xs text-muted-foreground">
 Nenhum dado de telemetria registrado ainda. Cadastre patrocinadores e publique matérias para iniciar a mensuração.
 </div>
 ) : (
 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className=" text-muted-foreground">
 {["Patrocinador", "Tier", "Impressões", "Únicos", "Tempo Médio", "Scroll 50%", "Cliques", "CTR"].map((h) => (
 <th key={h} className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60">
            {sponsorsMetrics.map((sp: any) => (
 <tr key={sp.sponsor_id} className="hover:bg-muted/30 transition-colors">
 <td className="py-3.5 px-3 font-bold text-foreground">{sp.sponsor_name}</td>
 <td className="py-3.5 px-3">
 <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary/10 text-primary">{sp.tier}</span>
 </td>
 <td className="py-3.5 px-3 font-mono">{sp.total_impressions}</td>
 <td className="py-3.5 px-3 font-mono">{sp.unique_views}</td>
 <td className="py-3.5 px-3 font-mono text-muted-foreground">{sp.avg_duration_seconds}s</td>
 <td className="py-3.5 px-3 font-mono text-muted-foreground">{sp.scroll_reach_50}</td>
 <td className="py-3.5 px-3 font-mono font-bold text-foreground">{sp.total_clicks}</td>
 <td className="py-3.5 px-3 font-mono font-bold text-primary">{sp.ctr_percentage}%</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
