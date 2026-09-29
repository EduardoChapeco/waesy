import { LayoutGrid, List, MessageSquare, ShieldCheck, createFileRoute, Link, useRouter } from "@tanstack/react-router";
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
  ChevronRight,
  Copy,
  Check,
  KeyRound,
  Lock,
  Users,
  Zap,
  ShieldAlert,
  Loader2,
  SlidersHorizontal,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listStoreJobApplications, updateJobApplication, hireJobCandidate } from "@/services/jobs.functions";
import { formatMoney } from "@/lib/money";
import { getWorkspaceLinkedInStatus, searchTalentHunterPool, type HunterCandidateDTO } from "@/services/linkedin-integrations.functions";
import { ProUpgradePaywallModal } from "@/components/monetization/pro-upgrade-paywall-modal";

export const Route = createFileRoute("/workspace/empregos/candidatos")({
  head: () => ({ meta: [{ title: "Candidaturas" }] }),
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

  const [statusTab, setStatusTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dossiê do Candidato (Mobile Sheet 100dvh & Drawer)
  const [dossierCandidate, setDossierCandidate] = useState<any | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [internalNoteDraft, setInternalNoteDraft] = useState("");

  // Modais de Ação
  const [interviewModalApp, setInterviewModalApp] = useState<any | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

  // Admissão Enterprise
  const [hireModalApp, setHireModalApp] = useState<any | null>(null);
  const [hiredRole, setHiredRole] = useState("");
  const [hiredSalaryCents, setHiredSalaryCents] = useState<number | undefined>(250000);
  const [hireSystemRole, setHireSystemRole] = useState<"seller" | "support" | "stock" | "content" | "manager">("seller");
  const [hireEmploymentType, setHireEmploymentType] = useState<"clt" | "pj" | "internship" | "temporary">("clt");
  const [hireDate, setHireDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [hirePin, setHirePin] = useState<string>("");

  // Feedback de Sucesso de Admissão com PIN
  const [hireSuccessData, setHireSuccessData] = useState<{
    candidateName: string;
    role: string;
    pin: string;
    employeeId: string;
  } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);

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
        toast.success(`${res.candidates.length} profissionais encontrados.`);
      } else {
        toast.info("Nenhum profissional localizado para o termo informado.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar banco de talentos.");
    } finally {
      setIsSearchingHunter(false);
    }
  };

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        app.candidate_name?.toLowerCase().includes(q) ||
        app.candidate_email?.toLowerCase().includes(q) ||
        app.job_title?.toLowerCase().includes(q);

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
      if (dossierCandidate && dossierCandidate.id === appId) {
        setDossierCandidate((prev: any) => ({ ...prev, rating, status: "reviewed" }));
      }
      toast.success("Avaliação registrada.");
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
      if (dossierCandidate && dossierCandidate.id === appId) {
        setDossierCandidate((prev: any) => ({ ...prev, status: nextStatus }));
      }
      toast.success("Etapa atualizada.");
    } catch {
      toast.error("Erro ao atualizar etapa.");
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
      if (dossierCandidate && dossierCandidate.id === appId) {
        setDossierCandidate((prev: any) => ({ ...prev, internal_notes: internalNoteDraft }));
      }
      toast.success("Nota interna salva.");
    } catch {
      toast.error("Erro ao salvar nota.");
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
      if (dossierCandidate && dossierCandidate.id === appId) {
        setDossierCandidate((prev: any) => ({ ...prev, status: "rejected" }));
      }
      toast.success("Candidato movido para arquivados.");
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

      if (dossierCandidate && dossierCandidate.id === interviewModalApp.id) {
        setDossierCandidate((prev: any) => ({
          ...prev,
          status: "interview_scheduled",
          interview_at: new Date(interviewDate).toISOString(),
          interview_meeting_url: generatedMeeting,
        }));
      }

      toast.success("Entrevista agendada.");
      setInterviewModalApp(null);
      setInterviewDate("");
      setMeetingUrl("");
    } catch {
      toast.error("Erro ao agendar entrevista.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenHireModal = (app: any) => {
    setHireModalApp(app);
    setHiredRole(app.job_title || "Vendedor");
    setHiredSalaryCents(250000);
    setHireSystemRole("seller");
    setHireEmploymentType("clt");
    setHireDate(new Date().toISOString().slice(0, 10));
    setHirePin(String(Math.floor(1000 + Math.random() * 9000)));
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
          systemRole: hireSystemRole,
          employmentType: hireEmploymentType,
          hireDate: hireDate,
          pin: hirePin || undefined,
        },
      });

      setApplications((prev) =>
        prev.map((a) =>
          a.id === hireModalApp.id
            ? {
                ...a,
                status: "hired",
                hired_role: hiredRole.trim(),
                hired_salary_cents: salaryCents,
              }
            : a,
        ),
      );

      if (dossierCandidate && dossierCandidate.id === hireModalApp.id) {
        setDossierCandidate((prev: any) => ({
          ...prev,
          status: "hired",
          hired_role: hiredRole.trim(),
          hired_salary_cents: salaryCents,
        }));
      }

      setHireSuccessData({
        candidateName: hireModalApp.candidate_name,
        role: hiredRole.trim(),
        pin: res.generatedPin || hirePin,
        employeeId: res.employeeId || "",
      });

      toast.success(res.message);
      setHireModalApp(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao efetivar contratação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDossier = (app: any) => {
    setDossierCandidate(app);
    setInternalNoteDraft(app.internal_notes || "");
    setIsDossierOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. TopBar Silenciosa Apple HIG ── */}
      <div className="flex flex-row items-center justify-between gap-2 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Briefcase className="size-4 sm:size-5" />
          </span>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              Candidaturas
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Gestão de talentos, triagem, entrevistas e admissão direta no RH
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPro ? (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-medium">
              Plano PRO ✓
            </Badge>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPaywallOpen(true)}
              className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-border text-foreground hover:bg-muted cursor-pointer"
            >
              <Lock className="size-3" />
              <span>Assinar PRO</span>
            </Button>
          )}

          <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold">
            <Link to="/workspace">Voltar</Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Banner Silencioso do Banco de Talentos ── */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Banco Regional de Talentos
              </h3>
              {!isPro && (
                <Badge variant="outline" className="text-[9px] border-border text-muted-foreground">
                  Recurso PRO
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Aborde profissionais qualificados por competência, tempo de experiência e cidade.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPro ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => setIsPaywallOpen(true)}
              className="rounded-xl text-xs font-semibold h-8 min-h-[36px] sm:min-h-0"
            >
              <Lock className="size-3 mr-1" /> Desbloquear Acesso
            </Button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStatusTab("hunter");
                handleExecuteHunterSearch();
              }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Input
                value={hunterSearchQuery}
                onChange={(e) => setHunterSearchQuery(e.target.value)}
                placeholder="Cargo ou competência..."
                className="h-8 text-xs rounded-xl w-48 sm:w-60 bg-background"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSearchingHunter}
                className="rounded-xl h-8 text-xs font-semibold gap-1 shrink-0"
              >
                {isSearchingHunter ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                <span>Buscar</span>
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* ── 3. Filtros & Barra de Pesquisa ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "all", label: "Todos", count: applications.length },
            { id: "pending", label: "Novos", count: applications.filter((a) => a.status === "pending").length },
            { id: "interview", label: "Entrevistas", count: applications.filter((a) => a.status === "interview_scheduled").length },
            { id: "hired", label: "Contratados", count: applications.filter((a) => a.status === "hired").length },
            { id: "rejected", label: "Arquivados", count: applications.filter((a) => a.status === "rejected").length },
            ...(isPro ? [{ id: "hunter", label: "Banco de Talentos", count: hunterResults.length }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] cursor-pointer ${
                statusTab === tab.id
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border/50"
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

      {/* ── 4. VISUALIZAÇÃO: BANCO DE TALENTOS OU LISTA DE CANDIDATURAS ── */}
      {statusTab === "hunter" ? (
        <div className="space-y-4">
          {isSearchingHunter ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="size-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Consultando perfis profissionais...</p>
            </div>
          ) : hunterResults.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-border/60 bg-card space-y-3">
              <Users className="size-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Nenhum profissional encontrado</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Digite um cargo ou tecnologia na caixa de busca acima para encontrar candidatos.
              </p>
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
                      <div className="size-11 rounded-xl bg-muted text-foreground border border-border/70 flex items-center justify-center font-bold text-xs shrink-0">
                        {candidate.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-foreground truncate">{candidate.fullName}</h4>
                        {candidate.openToWork && (
                          <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 bg-emerald-500/10 px-1.5 py-0">
                            Disponível
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
                          {candidate.totalExperienceMonths > 0
                            ? Math.round((candidate.totalExperienceMonths / 12) * 10) / 10 + " anos"
                            : "Iniciante"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{candidate.headline}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button asChild variant="outline" size="sm" className="h-8 px-3 rounded-xl text-xs font-semibold">
                      <Link to={"/u/" + candidate.username} target="_blank">
                        <ExternalLink className="size-3 mr-1" /> Perfil
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-border/60 bg-card space-y-2">
          <Briefcase className="size-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Nenhuma candidatura encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Quando candidatos se inscreverem nas suas vagas publicadas, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <>
          {/* ── BIFURCAÇÃO: MOBILE WHATSAPP LIST EDGE-TO-EDGE (< 640px) ── */}
          <div className="block sm:hidden rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden shadow-none">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                onClick={() => handleOpenDossier(app)}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 active:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {app.candidate_name?.charAt(0).toUpperCase() || "C"}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate">{app.candidate_name}</h4>
                      <Badge
                        variant={
                          app.status === "hired"
                            ? "outline"
                            : app.status === "interview_scheduled"
                            ? "outline"
                            : "secondary"
                        }
                        className={`text-[9px] px-1.5 py-0 shrink-0 ${
                          app.status === "hired"
                            ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                            : app.status === "interview_scheduled"
                            ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                            : ""
                        }`}
                      >
                        {app.status === "hired"
                          ? "Contratado"
                          : app.status === "interview_scheduled"
                          ? "Entrevista"
                          : app.status === "rejected"
                          ? "Arquivado"
                          : "Novo"}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground truncate">{app.job_title}</p>

                    <div className="flex items-center gap-2 pt-0.5">
                      {app.rating ? (
                        <div className="flex items-center text-[10px] text-amber-500 font-bold">
                          <Star className="size-3 fill-amber-400 mr-0.5" />
                          <span>{app.rating}.0</span>
                        </div>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground/60">{app.candidate_email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                  <ChevronRight className="size-4" />
                </div>
              </div>
            ))}
          </div>

          {/* ── BIFURCAÇÃO: DESKTOP GRID (>= 640px) ── */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground truncate block">
                        Vaga: {app.job_title}
                      </span>
                      <h4 className="text-base font-bold text-foreground truncate">{app.candidate_name}</h4>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold shrink-0 ${
                        app.status === "hired"
                          ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                          : app.status === "interview_scheduled"
                          ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                          : app.status === "rejected"
                          ? "border-border text-muted-foreground"
                          : "border-border text-foreground"
                      }`}
                    >
                      {app.status === "hired"
                        ? "Contratado"
                        : app.status === "interview_scheduled"
                        ? "Entrevista"
                        : app.status === "rejected"
                        ? "Arquivado"
                        : "Em Triagem"}
                    </Badge>
                  </div>

                  {/* Contatos */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{app.candidate_email}</span>
                    </div>
                    {app.candidate_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{app.candidate_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Currículo e Carta */}
                  {app.resume_url && (
                    <a
                      href={app.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors"
                    >
                      <FileText className="size-3.5" />
                      <span>Ver Currículo</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}

                  {/* Detalhe da Entrevista */}
                  {app.status === "interview_scheduled" && app.interview_at && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <Calendar className="size-3.5 text-primary" />
                        <span>{new Date(app.interview_at).toLocaleString("pt-BR")}</span>
                      </div>
                      {app.interview_meeting_url && (
                        <a
                          href={app.interview_meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary underline font-medium"
                        >
                          <Video className="size-3" />
                          <span>Abrir Sala de Vídeo</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Detalhe de Contratado */}
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
                <div className="space-y-3 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Classificação:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleUpdateRating(app.id, star)}
                          className="text-amber-500 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`size-4 ${
                              app.rating && app.rating >= star ? "fill-amber-400" : "text-muted-foreground/30"
                            }`}
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
                      className="rounded-xl text-xs font-semibold gap-1 h-9"
                    >
                      <Calendar className="size-3.5" />
                      <span>Entrevista</span>
                    </Button>

                    {app.status !== "hired" ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenHireModal(app)}
                        className="rounded-xl text-xs font-semibold gap-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                      >
                        <UserCheck className="size-3.5" />
                        <span>Contratar</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDossier(app)}
                        className="rounded-xl text-xs h-9 text-muted-foreground"
                      >
                        Dossiê
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 5. BOTTOM SHEET DO CANDIDATO (100dvh MOBILE & DRAWER) ── */}
      <Sheet open={isDossierOpen} onOpenChange={setIsDossierOpen}>
        <SheetContent side="bottom" className="p-5 space-y-4 max-h-[92dvh] overflow-y-auto">
          {dossierCandidate && (
            <>
              <SheetHeader className="text-left pb-2 border-b border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      Vaga: {dossierCandidate.job_title}
                    </span>
                    <SheetTitle className="text-base font-bold text-foreground">
                      {dossierCandidate.candidate_name}
                    </SheetTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      dossierCandidate.status === "hired"
                        ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                        : "border-border text-foreground"
                    }`}
                  >
                    {dossierCandidate.status === "hired"
                      ? "Contratado"
                      : dossierCandidate.status === "interview_scheduled"
                      ? "Entrevista"
                      : "Em Triagem"}
                  </Badge>
                </div>
              </SheetHeader>

              {/* Informações de Contato Rápidas */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {dossierCandidate.candidate_phone && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl justify-start gap-2 text-xs font-semibold"
                  >
                    <a href={`tel:${dossierCandidate.candidate_phone}`}>
                      <Phone className="size-3.5 text-primary" />
                      <span>{dossierCandidate.candidate_phone}</span>
                    </a>
                  </Button>
                )}
                {dossierCandidate.candidate_email && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl justify-start gap-2 text-xs font-semibold truncate"
                  >
                    <a href={`mailto:${dossierCandidate.candidate_email}`}>
                      <Mail className="size-3.5 text-primary" />
                      <span className="truncate">{dossierCandidate.candidate_email}</span>
                    </a>
                  </Button>
                )}
              </div>

              {/* Currículo e Carta */}
              {dossierCandidate.resume_url && (
                <Button asChild variant="secondary" className="w-full h-10 rounded-xl text-xs font-semibold gap-2">
                  <a href={dossierCandidate.resume_url} target="_blank" rel="noreferrer">
                    <FileText className="size-4" />
                    <span>Visualizar Currículo Completo</span>
                    <ExternalLink className="size-3 ml-auto opacity-70" />
                  </a>
                </Button>
              )}

              {/* Avaliação Estrelas */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Classificação do Candidato:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleUpdateRating(dossierCandidate.id, star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`size-4 ${
                          dossierCandidate.rating && dossierCandidate.rating >= star
                            ? "fill-amber-400 text-amber-500"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Anotação Interna */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Anotações Internas do Recrutador</Label>
                <Textarea
                  value={internalNoteDraft}
                  onChange={(e) => setInternalNoteDraft(e.target.value)}
                  placeholder="Observações sobre perfil, expectativas salariais, postura..."
                  className="text-xs rounded-xl min-h-[70px] bg-background"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveInternalNote(dossierCandidate.id)}
                  className="h-8 rounded-xl text-xs font-semibold"
                >
                  Salvar Nota
                </Button>
              </div>

              {/* Thumb Zone de Ações Primárias */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInterviewModalApp(dossierCandidate);
                    setInterviewDate("");
                  }}
                  className="h-11 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Calendar className="size-4" />
                  <span>Agendar Entrevista</span>
                </Button>

                {dossierCandidate.status !== "hired" ? (
                  <Button
                    onClick={() => {
                      setIsDossierOpen(false);
                      handleOpenHireModal(dossierCandidate);
                    }}
                    className="h-11 rounded-xl text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <UserCheck className="size-4" />
                    <span>Contratar</span>
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(dossierCandidate.id)}
                    className="h-11 rounded-xl text-xs font-semibold"
                  >
                    Arquivar
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── 6. MODAL: AGENDAR ENTREVISTA ── */}
      <Dialog open={!!interviewModalApp} onOpenChange={(open) => !open && setInterviewModalApp(null)}>
        <DialogContent className="sm:max-w-md sm:p-6 sm:rounded-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Agendar Entrevista
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina data e horário para a entrevista com {interviewModalApp?.candidate_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data e Horário</Label>
              <Input
                type="datetime-local"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Link da Sala de Vídeo (Opcional)</Label>
              <Input
                placeholder="Deixe em branco para gerar sala de vídeo automática"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setInterviewModalApp(null)} className="rounded-xl h-10 text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleScheduleInterview}
              disabled={isProcessing}
              className="rounded-xl font-semibold text-xs h-10 bg-primary text-primary-foreground"
            >
              Confirmar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 7. MODAL ENTERPRISE: ADMISSÃO & TRANSIÇÃO PARA RH ── */}
      <Dialog open={!!hireModalApp} onOpenChange={(open) => !open && setHireModalApp(null)}>
        <DialogContent className="sm:max-w-lg sm:p-6 sm:rounded-2xl bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600">
                <UserCheck className="size-4" />
              </span>
              <DialogTitle className="text-base font-bold">
                Efetivar Admissão no Hub RH
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Cadastre {hireModalApp?.candidate_name} na equipe oficial da loja, gerando PIN de ponto e abertura salarial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cargo Contratual</Label>
                <Input
                  value={hiredRole}
                  onChange={(e) => setHiredRole(e.target.value)}
                  placeholder="Ex: Vendedor, Caixa, Cozinheiro..."
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Perfil no Sistema</Label>
                <select
                  value={hireSystemRole}
                  onChange={(e) => setHireSystemRole(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs focus-visible:outline-hidden"
                >
                  <option value="seller">Vendedor / Comercial</option>
                  <option value="support">Atendimento / Suporte</option>
                  <option value="stock">Estoque / Expedição WMS</option>
                  <option value="content">Marketing / Conteúdo</option>
                  <option value="manager">Gerente de Loja</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Regime de Contrato</Label>
                <select
                  value={hireEmploymentType}
                  onChange={(e) => setHireEmploymentType(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs focus-visible:outline-hidden"
                >
                  <option value="clt">CLT (Carteira Assinada)</option>
                  <option value="pj">PJ (Prestador de Serviço)</option>
                  <option value="internship">Estágio Supervisionado</option>
                  <option value="temporary">Temporário / Freelancer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Salário Base Mensal</Label>
                <CurrencyField
                  value={hiredSalaryCents}
                  onChange={setHiredSalaryCents}
                  placeholder="0,00"
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data de Início</Label>
                <Input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">PIN de Ponto (4-6 dígitos)</Label>
                  <button
                    type="button"
                    onClick={() => setHirePin(String(Math.floor(1000 + Math.random() * 9000)))}
                    className="text-[10px] text-primary underline cursor-pointer"
                  >
                    Gerar Novo
                  </button>
                </div>
                <Input
                  value={hirePin}
                  onChange={(e) => setHirePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="4 dígitos numéricos"
                  className="rounded-xl text-xs h-10 font-mono tracking-widest"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setHireModalApp(null)} className="rounded-xl h-10 text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmHire}
              disabled={isProcessing}
              className="rounded-xl font-semibold text-xs h-10 bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin mr-1" /> : <UserCheck className="size-4 mr-1" />}
              <span>Efetivar Admissão</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 8. DIALOG: CONFIRMAÇÃO DE ADMISSÃO COM PIN DE PONTO ── */}
      <Dialog open={!!hireSuccessData} onOpenChange={(open) => !open && setHireSuccessData(null)}>
        <DialogContent className="sm:max-w-md sm:p-6 sm:rounded-2xl bg-card text-center space-y-4">
          <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-6" />
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground">
              Colaborador Admitido com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {hireSuccessData?.candidateName} foi inserido no Hub do Colaborador como {hireSuccessData?.role}.
            </DialogDescription>
          </div>

          {/* Credencial de Acesso Rápido */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              PIN de Ponto Eletrônico & Terminal
            </span>
            <div className="text-2xl font-black font-mono tracking-widest text-foreground">
              {hireSuccessData?.pin}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Forneça este PIN ao colaborador para que ele possa bater ponto no terminal ou celular.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (hireSuccessData) {
                  const text = `Olá ${hireSuccessData.candidateName}, sua admissão foi concluída na empresa como ${hireSuccessData.role}. Seu PIN de acesso ao ponto eletrônico é: ${hireSuccessData.pin}`;
                  navigator.clipboard.writeText(text);
                  setCopiedPin(true);
                  toast.success("Credenciais copiadas para a área de transferência!");
                  setTimeout(() => setCopiedPin(false), 2500);
                }
              }}
              className="w-full sm:w-auto flex-1 rounded-xl h-10 text-xs font-semibold gap-1.5"
            >
              {copiedPin ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copiedPin ? "Copiado!" : "Copiar Dados"}</span>
            </Button>

            <Button asChild className="w-full sm:w-auto flex-1 rounded-xl h-10 text-xs font-semibold">
              <Link to="/workspace/rh/ponto">
                Ver no Espelho de Ponto
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paywall Modal para Hunter de Talentos */}
      <ProUpgradePaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        featureTitle="Banco de Talentos Regional"
        featureDescription="A busca ativa na base de talentos regionais e a abordagem direta de candidatos são recursos corporativos da assinatura PRO."
        source="talent_hunter"
      />
    </div>
  );
}