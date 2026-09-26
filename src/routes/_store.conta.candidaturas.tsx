import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 Briefcase,
 Calendar,
 Video,
 Clock,
 CheckCircle2,
 XCircle,
 ExternalLink,
 Trash2,
 Building,
 ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import {
 listMyJobApplications,
 withdrawJobApplication,
} from "@/services/jobs.functions";

export const Route = createFileRoute("/_store/conta/candidaturas")({
 head: () => ({
 meta: [{ title: "Minhas Candidaturas & Processos Seletivos | Waesy" }],
 }),
 loader: async () => {
   try {
 const applications = await listMyJobApplications().catch(() => []);
 return { applications };
   } catch (err) {
     console.error("[loader:_store.conta.candidaturas] Unhandled loader error:", err);
     return { applications: null };
   }
 },
 component: MinhasCandidaturasPage,
});

function MinhasCandidaturasPage() {
 const { applications: initialApps } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();
 const [applications, setApplications] = useState<any[]>(initialApps);

 const handleWithdraw = async (appId: string, jobTitle: string) => {
 if (!confirm(`Deseja cancelar sua candidatura para a vaga "${jobTitle}"?`)) {
 return;
 }

 try {
 await withdrawJobApplication({ data: { applicationId: appId } });
 toast.success("Candidatura cancelada com sucesso.");
 setApplications((prev) => prev.filter((a) => a.id !== appId));
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao cancelar candidatura.");
 }
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case "pending":
 return <Badge variant="secondary" className="text-[10px]">Em Análise</Badge>;
 case "reviewed":
 case "shortlisted":
 return <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Currículo Selecionado</Badge>;
 case "interview_scheduled":
 return <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white">Entrevista Agendada</Badge>;
 case "hired":
 case "approved":
 return <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white">Aprovado / Contratado</Badge>;
 case "rejected":
 return <Badge variant="outline" className="text-[10px] text-muted-foreground">Não Selecionado</Badge>;
 default:
 return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
 }
 };

 return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Candidaturas
          </h1>
          {applications.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {applications.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer gap-1.5">
            <Link to="/conta/curriculo">
              <FileText className="size-3.5" />
              <span>Meu Currículo</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="default" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
            <Link to="/empregos">Explorar Vagas</Link>
          </Button>
        </div>
      </div>

 {applications.length === 0 ? (
 <EmptyState
 title="Você ainda não se candidatou a nenhuma vaga"
 description="Acesse o portal de vagas de São Miguel do Oeste e candidate-se com seu currículo digital em 1 clique."
 />
 ) : (
 <div className="space-y-4">
 {applications.map((app) => (
 <div
 key={app.id}
 className="bg-card rounded-2xl p-3.5 sm:p-5 border border-border/60 space-y-4 flex flex-col justify-between"
 >
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3.5 min-w-0">
 <div className="size-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
 {app.company_logo_url ? (
 <img
 src={app.company_logo_url}
 alt={app.company_name}
 className="size-full object-cover"
 />
 ) : (
 <Building className="size-6 text-muted-foreground/40" />
 )}
 </div>

 <div className="space-y-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="font-bold text-sm sm:text-base text-foreground">
 {app.job_title}
 </span>
 {getStatusBadge(app.status)}
 </div>

 <p className="text-xs text-muted-foreground font-medium">
 {app.company_name} • {app.location} ({app.workplace_type})
 </p>

 <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
 <span>{app.contract_type}</span>
 <span>•</span>
 <span>{app.salary_display}</span>
 </div>
 </div>
 </div>

 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleWithdraw(app.id, app.job_title)}
 className="size-8 text-muted-foreground hover:text-destructive shrink-0"
 title="Cancelar Candidatura"
 >
 <Trash2 className="size-4" />
 </Button>
 </div>

 {/* Informações de Entrevista se Agendada */}
 {app.status === "interview_scheduled" && app.interview_at && (
 <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
 <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
 <Calendar className="size-4 shrink-0" />
 <span>
 Entrevista Agendada para{" "}
 {new Date(app.interview_at).toLocaleDateString("pt-BR", {
 day: "2-digit",
 month: "long",
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 </div>

 {app.interview_meeting_url && (
 <Button asChild size="sm" className="h-8 gap-1.5 font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0">
 <a
 href={app.interview_meeting_url}
 target="_blank"
 rel="noopener noreferrer"
 >
 <Video className="size-3.5" />
 Entrar na Sala Virtual
 </a>
 </Button>
 )}
 </div>
 )}

 <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
 <span>
 Candidatou-se em{" "}
 {new Date(app.created_at).toLocaleDateString("pt-BR")}
 </span>

 <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-bold gap-1">
 <Link to="/empregos/$id" params={{ id: app.job_id }}>
 Ver Detalhes da Vaga
 <ArrowRight className="size-3.5" />
 </Link>
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
