import {
  LayoutGrid,
  List,
  MessageSquare,
  ShieldCheck, createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
 Briefcase,
 Search,
 Star,
 Calendar,
 Video,
 FileText,
 CheckCircle2,
 XCircle,
 Clock,
 UserCheck,
 Building,
 Phone,
 Mail,
 ExternalLink,
 Filter,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
 listStoreJobApplications,
 updateJobApplication,
 hireJobCandidate,
} from "@/services/jobs.functions";
import { formatMoney } from "@/lib/money";
import { Lock, Users, Zap, ShieldAlert } from "lucide-react";
import { getWorkspaceLinkedInStatus, searchTalentHunterPool, type HunterCandidateDTO } from "@/services/linkedin-integrations.functions";
import { Loader2 } from "lucide-react";
import { ProUpgradePaywallModal } from "@/components/monetization/pro-upgrade-paywall-modal";

export const Route = createFileRoute("/workspace/empregos/candidatos")({
 head: () => ({ meta: [{ title: "Gestão de Candidaturas | Workspace" }] }),
   loader: async () => {
    try {
      const [apps, linkedInStatus] = await Promise.all([
        listStoreJobApplications().catch(() => []),
        getWorkspaceLinkedInStatus().catch(() => ({
          storeId: "",
          plan: "FREE",
          isPro: false,
          isConnected: false,
        })),
      ]);
      return { apps: apps || [], linkedInStatus };
    } catch (err) {
      console.error("[loader:workspace.empregos.candidatos] Unhandled loader error:", err);
      return { apps: [] as any[], linkedInStatus: { storeId: "", plan: "FREE", isPro: false, isConnected: false } };
    }
  },
 component: WorkspaceCandidatesPage,
});

function WorkspaceCandidatesPage() {
 const loaderData = Route.useLoaderData() as any;
  const initialApps = loaderData?.apps || (Array.isArray(loaderData) ? loaderData : []);
  const linkedInStatus = loaderData?.linkedInStatus || { isPro: false };
  const isPro = Boolean(linkedInStatus?.isPro);

  const [applications, setApplications] = useState<any[]>(initialApps);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [hunterSearchQuery, setHunterSearchQuery] = useState("");
  const [hunterResults, setHunterResults] = useState<HunterCandidateDTO[]>([]);
  const [isSearchingHunter, setIsSearchingHunter] = useState(false);
  const [hasSearchedHunter, setHasSearchedHunter] = useState(false);

  const handleExecuteHunterSearch = async (queryText?: string) => {
    if (!isPro) {
      setIsPaywallOpen(true);
      return;
    }
    const q = queryText !== undefined ? queryText : hunterSearchQuery;
    setIsSearchingHunter(true);
    setHasSearchedHunter(true);
    try {
      const res = await searchTalentHunterPool({ data: { query: q.trim() || undefined, limit: 30 } });
      setHunterResults(res.candidates || []);
      if ((res.candidates || []).length > 0) {
        toast.success(res.candidates.length + " talentos encontrados no banco regional!");
      } else {
        toast.info("Nenhum profissional localizado com os critérios informados.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar banco de talentos.");
    } finally {
      setIsSearchingHunter(false);
    }
  };
 const [statusTab, setStatusTab] = useState<string>("all");
 const [searchQuery, setSearchQuery] = useState("");
 const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [dossierCandidate, setDossierCandidate] = useState<any | null>(null);
  const [internalNoteDraft, setInternalNoteDraft] = useState("");

 // Modais de Ação
 const [interviewModalApp, setInterviewModalApp] = useState<any | null>(null);
 const [interviewDate, setInterviewDate] = useState("");
 const [meetingUrl, setMeetingUrl] = useState("");

 const [hireModalApp, setHireModalApp] = useState<any | null>(null);
 const [hiredRole, setHiredRole] = useState("");
 const [hiredSalaryCents, setHiredSalaryCents] = useState<number | undefined>(250000);

 const filteredApps = useMemo(() => {
 return applications.filter((app) => {
 const q = searchQuery.toLowerCase();
 const matchesSearch =
 app.candidate_name.toLowerCase().includes(q) ||
 app.candidate_email.toLowerCase().includes(q) ||
 app.job_title.toLowerCase().includes(q);

 let matchesTab = true;
 if (statusTab === "pending") matchesTab = app.status === "pending";
 else if (statusTab === "shortlisted") matchesTab = app.status === "shortlisted" || app.status === "reviewed";
 else if (statusTab === "interview") matchesTab = app.status === "interview_scheduled";
 else if (statusTab === "hired") matchesTab = app.status === "hired" || app.status === "approved";
 else if (statusTab === "rejected") matchesTab = app.status === "rejected";

 return matchesSearch && matchesTab;
 });
 }, [applications, searchQuery, statusTab]);

 const handleUpdateRating = async (appId: string, rating: number) => {
 try {
 await updateJobApplication({
 data: {
 applicationId: appId,
 status: "reviewed",
 rating,
 },
 });
 setApplications((prev) =>
 prev.map((a) => (a.id === appId ? { ...a, rating, status: "reviewed" } : a)),
 );
 toast.success("Avaliação do candidato registrada!");
 } catch {
 toast.error("Erro ao salvar avaliação.");
 }
 };

 const handleMoveStatus = async (appId: string, nextStatus: any) => {
    try {
      await updateJobApplication({
        data: {
          applicationId: appId,
          status: nextStatus,
        },
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: nextStatus } : a)),
      );
      toast.success("Etapa do candidato atualizada!");
      if (dossierCandidate && dossierCandidate.id === appId) {
        setDossierCandidate((prev: any) => ({ ...prev, status: nextStatus }));
      }
    } catch {
      toast.error("Erro ao atualizar etapa do candidato.");
    }
  };

  const handleSaveInternalNote = async (appId: string) => {
    try {
      await updateJobApplication({
        data: {
          applicationId: appId,
          status: dossierCandidate?.status || "reviewed",
          internalNotes: internalNoteDraft,
        },
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, internal_notes: internalNoteDraft } : a)),
      );
      toast.success("Anotação interna salva!");
    } catch {
      toast.error("Erro ao salvar anotação.");
    }
  };

  const handleReject = async (appId: string) => {
 try {
 await updateJobApplication({
 data: {
 applicationId: appId,
 status: "rejected",
 },
 });
 setApplications((prev) =>
 prev.map((a) => (a.id === appId ? { ...a, status: "rejected" } : a)),
 );
 toast.success("Candidato movido para arquivados/rejeitados.");
 } catch {
 toast.error("Erro ao atualizar status.");
 }
 };

 const handleScheduleInterview = async () => {
 if (!interviewModalApp || !interviewDate) {
 toast.error("Selecione a data e horário da entrevista.");
 return;
 }
 setIsProcessing(true);
 try {
 const generatedMeeting =
 meetingUrl.trim() ||
 `https://meet.jit.si/waesy-entrevista-${interviewModalApp.id.slice(0, 8)}`;

 await updateJobApplication({
 data: {
 applicationId: interviewModalApp.id,
 status: "interview_scheduled",
 interviewAt: new Date(interviewDate).toISOString(),
 interviewMeetingUrl: generatedMeeting,
 },
 });

 setApplications((prev) =>
 prev.map((a) =>
 a.id === interviewModalApp.id
 ? {
 ...a,
 status: "interview_scheduled",
 interview_at: new Date(interviewDate).toISOString(),
 interview_meeting_url: generatedMeeting,
 }
 : a,
 ),
 );

 toast.success("Entrevista agendada com sucesso!");
 setInterviewModalApp(null);
 setInterviewDate("");
 setMeetingUrl("");
 } catch {
 toast.error("Erro ao agendar entrevista.");
 } finally {
 setIsProcessing(false);
 }
 };

 const handleConfirmHire = async () => {
 if (!hireModalApp || !hiredRole.trim()) {
 toast.error("Informe o cargo da contratação.");
 return;
 }
 setIsProcessing(true);
 try {
 const salaryCents = hiredSalaryCents || 0;
 const res = await hireJobCandidate({
 data: {
 applicationId: hireModalApp.id,
 role: hiredRole.trim(),
 salaryCents: isNaN(salaryCents) ? 0 : salaryCents,
 },
 });

 setApplications((prev) =>
 prev.map((a) =>
 a.id === hireModalApp.id
 ? { ...a, status: "hired", hired_role: hiredRole, hired_salary_cents: salaryCents }
 : a,
 ),
 );

 toast.success(res.message);
 setHireModalApp(null);
 } catch {
 toast.error("Erro ao efetivar contratação.");
 } finally {
 setIsProcessing(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeader
            eyebrow="Recrutamento"
            title="Candidatos"
          />
          {isPro ? (
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-medium">
              Plano PRO ✓
            </Badge>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPaywallOpen(true)}
              className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer"
            >
              <Lock className="size-3" />
              <span>Assinar PRO</span>
            </Button>
          )}
        </div>

        <Button asChild variant="outline" className="rounded-xl font-bold text-xs h-9">
          <Link to="/workspace">Voltar</Link>
        </Button>
      </div>

       {/* ── MÓDULO HUNTER DE TALENTOS & PREMIUM WALL ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-card border border-amber-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Hunter de Talentos
              </h3>
              {!isPro ? (
                <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 bg-amber-500/10 px-1.5 py-0 flex items-center gap-1">
                  <Lock className="size-2.5" />
                  <span>Exclusivo PRO</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/40 text-emerald-600 bg-emerald-500/10 px-1.5 py-0">
                  Desbloqueado ✓
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Encontre e aborde diretamente profissionais por especialidade, anos de experiência e pretensão salarial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPro ? (
            <Button
              type="button"
              onClick={() => setIsPaywallOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer shrink-0"
            >
              <Lock className="size-3.5" />
              <span>Desbloquear Hunter (PRO)</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <form onSubmit={(e) => { e.preventDefault(); setStatusTab("hunter"); handleExecuteHunterSearch(); }} className="flex items-center gap-2">
                <Input
                  value={hunterSearchQuery}
                  onChange={(e) => setHunterSearchQuery(e.target.value)}
                  placeholder="Cargo, competência ou nome..."
                  className="h-9 text-xs rounded-xl w-56 sm:w-64 bg-background"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSearchingHunter}
                  className="rounded-xl h-9 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shrink-0"
                >
                  {isSearchingHunter ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                  <span>Buscar</span>
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 ">
 {[
 { id: "all", label: "Todos", count: applications.length },
          { id: "hunter", label: isPro ? "Banco de Talentos" : "Talentos (PRO) 🔒", count: hunterResults.length },
 {
 id: "pending",
 label: "Novos",
 count: applications.filter((a) => a.status === "pending").length,
 },
 {
 id: "interview",
 label: "Entrevistas",
 count: applications.filter((a) => a.status === "interview_scheduled").length,
 },
 {
 id: "hired",
 label: "Contratados",
 count: applications.filter((a) => a.status === "hired").length,
 },
 {
 id: "rejected",
 label: "Arquivados",
 count: applications.filter((a) => a.status === "rejected").length,
 },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setStatusTab(tab.id)}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
 statusTab === tab.id
 ? "bg-foreground text-background "
 : "bg-card text-muted-foreground hover:text-foreground"
 }`}
 >
 <span>{tab.label}</span>
 <span className="opacity-70 text-[10px]">({tab.count})</span>
 </button>
 ))}
 </div>

 <div className="relative w-full sm:w-72">
 <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
 <Input
 placeholder="Buscar por candidato ou vaga..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 h-9 rounded-xl text-xs bg-card"
 />
 </div>
 </div>

 
      {/* ── VISUALIZAÇÃO HUNTER DE TALENTOS ── */}
      {statusTab === "hunter" ? (
        !isPro ? (
          <div className="p-8 text-center rounded-2xl border border-border/70 bg-card space-y-4 max-w-md mx-auto">
            <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Banco Regional de Talentos
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Acesse currículos verificados, filtre por competências e aborde candidatos diretamente com o Waesy PRO.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsPaywallOpen(true)}
              className="rounded-xl h-10 px-5 font-semibold text-xs gap-2 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              <Zap className="size-3.5" />
              <span>Assinar Waesy PRO</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {hunterResults.length} profissionais encontrados no banco de talentos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleExecuteHunterSearch()}
                  disabled={isSearchingHunter}
                  className="h-8 rounded-xl text-xs gap-1.5 font-bold cursor-pointer"
                >
                  {isSearchingHunter ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3 text-primary" />}
                  <span>Recarregar Base</span>
                </Button>
              </div>
            </div>

            {isSearchingHunter ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="size-8 animate-spin text-amber-600 mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">Buscando currículos e competências na base regional...</p>
              </div>
            ) : hunterResults.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-border/60 bg-card space-y-3">
                <Users className="size-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">Nenhum profissional encontrado para a busca</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {hasSearchedHunter ? "Tente buscar por outras palavras-chave ou termos mais amplos." : "Utilize a barra de pesquisa acima para filtrar por cargo, competência ou cidade."}
                </p>
                {!hasSearchedHunter && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleExecuteHunterSearch("")}
                    className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground cursor-pointer"
                  >
                    Carregar Todos os Talentos
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden shadow-none">
                {hunterResults.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {candidate.avatarUrl ? (
                        <img
                          src={candidate.avatarUrl}
                          alt={candidate.fullName}
                          className="size-11 rounded-xl object-cover border border-border/70 shrink-0"
                        />
                      ) : (
                        <div className="size-11 rounded-xl bg-muted/60 text-foreground border border-border/70 flex items-center justify-center font-bold text-xs shrink-0">
                          {candidate.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-foreground truncate">{candidate.fullName}</h4>
                          {candidate.openToWork && (
                            <Badge variant="outline" className="text-[9px] font-semibold border-emerald-500/40 text-emerald-600 bg-emerald-500/10 px-1.5 py-0 shrink-0">
                              Disponível
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">•</span>
                          <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
                            {candidate.totalExperienceMonths > 0
                              ? Math.round(candidate.totalExperienceMonths / 12 * 10) / 10 + " anos"
                              : "Iniciante"}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground truncate">{candidate.headline}</p>

                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          {(candidate.city || candidate.state) && (
                            <span className="text-[10px] text-muted-foreground/80">
                              📍 {candidate.city || ""}{candidate.state ? ", " + candidate.state : ""}
                            </span>
                          )}
                          {candidate.skills && candidate.skills.slice(0, 3).map((sk) => (
                            <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-medium">
                              {sk}
                            </span>
                          ))}
                          {candidate.salaryExpectationCents ? (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              Pretensão: {formatMoney(candidate.salaryExpectationCents)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button asChild variant="outline" size="sm" className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/80 cursor-pointer">
                        <Link to={"/u/" + candidate.username} target="_blank">
                          <ExternalLink className="size-3 text-muted-foreground" />
                          <span>Ver Perfil</span>
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const origin = typeof window !== "undefined" ? window.location.origin : "";
                          navigator.clipboard.writeText(origin + "/u/" + candidate.username);
                          toast.success("Link do perfil copiado!");
                        }}
                        className="h-8 px-3 rounded-xl text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                      >
                        Copiar Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      ) : filteredApps.length === 0 ? (
 <div className="py-16 text-center rounded-2xl border border-border/60 bg-card space-y-2">
 <Briefcase className="size-10 text-muted-foreground/40 mx-auto" />
 <h3 className="text-base font-bold text-foreground">Nenhuma candidatura encontrada</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Nenhuma candidatura recebida para as vagas publicadas.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredApps.map((app) => (
 <div
 key={app.id}
 className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors"
 >
 <div className="space-y-3">
 <div className="flex items-start justify-between gap-2">
 <div>
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
 Vaga: {app.job_title}
 </span>
 <h4 className="text-base font-black text-foreground">{app.candidate_name}</h4>
 </div>

 <Badge
 variant={
 app.status === "hired"
 ? "success"
 : app.status === "interview_scheduled"
 ? "info"
 : app.status === "rejected"
 ? "destructive"
 : "secondary"
 }
 className="text-[10px] font-bold shrink-0"
 >
 {app.status === "hired"
 ? "Contratado"
 : app.status === "interview_scheduled"
 ? "Entrevista"
 : app.status === "rejected"
 ? "Arquivado"
 : "Em Análise"}
 </Badge>
 </div>

 {/* Contatos */}
 <div className="space-y-1 text-xs text-muted-foreground">
 <div className="flex items-center gap-1.5 truncate">
 <Mail className="size-3.5 shrink-0" />
 <span className="truncate">{app.candidate_email}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Phone className="size-3.5 shrink-0" />
 <span>{app.candidate_phone}</span>
 </div>
 </div>

 {/* Currículo e Carta */}
 {app.resume_url && (
 <a
 href={app.resume_url}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
 >
 <FileText className="size-3.5" />
 <span>Ver Currículo</span>
 <ExternalLink className="size-3" />
 </a>
 )}

 {app.cover_letter && (
 <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl line-clamp-3 leading-relaxed">
 "{app.cover_letter}"
 </p>
 )}

 {/* Inteligência Salarial & Histórico do Empregador Anterior */}
 {(app.previous_company_name || app.salary_expectation_cents || app.reason_for_leaving) && (
 <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-1.5">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
 Perfil Profissional
 </span>

 {app.previous_company_name && (
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Última Empresa:</span>
 <span className="font-bold text-foreground">{app.previous_company_name}</span>
 </div>
 )}

 {app.salary_expectation_cents && (
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Pretensão:</span>
 <span className="font-bold text-emerald-600 font-mono">
 {formatMoney(app.salary_expectation_cents)}
 </span>
 </div>
 )}

 {app.reason_for_leaving && (
 <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/40">
 <span className="font-medium text-foreground block">Motivo da Saída:</span>
 <span>"{app.reason_for_leaving}"</span>
 </div>
 )}

 {app.previous_company_rating && (
 <div className="pt-1 text-[11px] border-t border-border/40 flex items-center justify-between">
 <span className="text-muted-foreground">Avaliação da Empresa:</span>
 <span className="text-amber-500 font-bold">
 {"★".repeat(app.previous_company_rating)}{"☆".repeat(5 - app.previous_company_rating)}
 </span>
 </div>
 )}

 {app.previous_company_feedback && (
 <p className="text-[11px] text-muted-foreground italic">
 "{app.previous_company_feedback}"
 </p>
 )}
 </div>
 )}

 {/* Detalhes de Entrevista / Contratação */}
 {app.interview_at && (
 <div className="p-2.5 rounded-xl bg-info/10 border border-info/20 text-xs space-y-1">
 <div className="flex items-center gap-1.5 font-bold text-info">
 <Calendar className="size-3.5" />
 <span>Entrevista: {new Date(app.interview_at).toLocaleString("pt-BR")}</span>
 </div>
 {app.interview_meeting_url && (
 <a
 href={app.interview_meeting_url}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1 text-[11px] text-info underline font-semibold"
 >
 <Video className="size-3" />
 <span>Abrir Sala de Vídeo</span>
 </a>
 )}
 </div>
 )}

 {app.status === "hired" && (
 <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-0.5">
 <p className="font-bold text-emerald-700">Contratado como: {app.hired_role}</p>
 {app.hired_salary_cents && (
 <p className="text-[11px] text-emerald-600 font-mono">
 Salário: {formatMoney(app.hired_salary_cents)}
 </p>
 )}
 </div>
 )}
 </div>

 {/* Avaliação & Botões de Ação */}
 <div className="space-y-3 pt-3 ">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold text-muted-foreground">Classificação:</span>
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 type="button"
 onClick={() => handleUpdateRating(app.id, star)}
 className="text-amber-500 hover:scale-125 transition-transform"
 >
 <Star
 className={`size-4 ${app.rating && app.rating >= star ? "fill-amber-400" : "text-muted-foreground/30"}`}
 />
 </button>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setInterviewModalApp(app);
 setInterviewDate("");
 }}
 className="rounded-xl text-xs font-bold gap-1 h-9"
 >
 <Calendar className="size-3.5" />
 <span>Entrevista</span>
 </Button>

 {app.status !== "hired" ? (
 <Button
 size="sm"
 onClick={() => {
 setHireModalApp(app);
 setHiredRole(app.job_title);
 }}
 className="rounded-xl text-xs font-bold gap-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 <UserCheck className="size-3.5" />
 <span>Contratar</span>
 </Button>
 ) : (
 <Button size="sm" variant="ghost" disabled className="rounded-xl text-xs h-9">
 Contratado
 </Button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
        )}

      {/* Modal: Agendar Entrevista */}
 <Dialog open={!!interviewModalApp} onOpenChange={(open) => !open && setInterviewModalApp(null)}>
 <DialogContent className="sm:max-w-md sm:p-6 sm:rounded-2xl bg-card">
 <DialogHeader>
 <DialogTitle className="text-lg font-black">
 Agendar Entrevista com {interviewModalApp?.candidate_name}
 </DialogTitle>
 <DialogDescription className="text-xs">
 Defina o dia, horário e o link da sala de vídeo. O candidato receberá as informações.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Data e Horário</Label>
 <Input
 type="datetime-local"
 value={interviewDate}
 onChange={(e) => setInterviewDate(e.target.value)}
 className="rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Link da Sala de Vídeo (Google Meet / Jitsi)</Label>
 <Input
 placeholder="https://meet.google.com/... (ou deixe em branco para gerar automático)"
 value={meetingUrl}
 onChange={(e) => setMeetingUrl(e.target.value)}
 className="rounded-xl text-xs"
 />
 </div>
 </div>

 <DialogFooter className="gap-2 sm:gap-0">
 <Button variant="outline" onClick={() => setInterviewModalApp(null)} className="rounded-xl">
 Cancelar
 </Button>
 <Button
 onClick={handleScheduleInterview}
 disabled={isProcessing}
 className="rounded-xl font-bold bg-primary text-primary-foreground"
 >
 Confirmar Agendamento
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Modal: Efetivar Contratação */}
 <Dialog open={!!hireModalApp} onOpenChange={(open) => !open && setHireModalApp(null)}>
 <DialogContent className="sm:max-w-md sm:p-6 sm:rounded-2xl bg-card">
 <DialogHeader>
 <DialogTitle className="text-lg font-black">
 Efetivar Contratação
 </DialogTitle>
 <DialogDescription className="text-xs">
 Defina o cargo oficial e a remuneração acertada para formalizar no sistema.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Cargo Atribuído</Label>
 <Input
 value={hiredRole}
 onChange={(e) => setHiredRole(e.target.value)}
 placeholder="Ex: Vendedor Líder, Cozinheiro, Entregador..."
 className="rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Salário Base Mensal (R$)</Label>
 <CurrencyField
 value={hiredSalaryCents}
 onChange={setHiredSalaryCents}
 placeholder="0,00"
 className="rounded-xl text-xs"
 />
 </div>
 </div>

 <DialogFooter className="gap-2 sm:gap-0">
 <Button variant="outline" onClick={() => setHireModalApp(null)} className="rounded-xl">
 Cancelar
 </Button>
 <Button
 onClick={handleConfirmHire}
 disabled={isProcessing}
 className="rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700"
 >
 Concluir Contratação
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 
      {/* Paywall Modal para Hunter de Talentos */}
      <ProUpgradePaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        featureTitle="Módulo Hunter de Talentos"
        featureDescription="A busca ativa na base de talentos regionais e a abordagem direta de candidatos são recursos corporativos exclusivos da assinatura Waesy Enterprise PRO."
        source="talent_hunter"
      />
    </div>
  );
}