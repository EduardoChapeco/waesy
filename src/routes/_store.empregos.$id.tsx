import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
 Briefcase,
 MapPin,
 Clock,
 CurrencyDollar,
 Buildings,
 CheckCircle,
 WhatsappLogo,
 ShareNetwork,
 ArrowLeft,
 PaperPlaneTilt,
 CircleNotch,
 User,
 EnvelopeSimple,
 Phone,
 LinkSimple,
 ChatText,
 ShieldCheck,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
 DialogDescription,
} from "@/components/ui/dialog";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetTrigger,
 SheetDescription,
} from "@/components/ui/sheet";
import { getPublicJobById, applyToJob, getEmployerProfileInsights, type JobItemDTO, type EmployerProfileInsightsDTO } from "@/services/jobs.functions";
import { getUserSession } from "@/services/auth.functions";
import { formatDate } from "@/lib/datetime";
import { findProfessionByTitle } from "@/lib/data/professions-catalog";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/_store/empregos/$id")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.job
          ? `${loaderData.job.title} na ${loaderData.job.company_name} — Vagas Waesy`
          : "Vaga de Emprego | Waesy",
      },
      {
        name: "description",
        content: loaderData?.job
          ? `${loaderData.job.description.slice(0, 160)}...`
          : "Confira todos os detalhes desta vaga de emprego e envie seu currículo.",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const [job, session] = await Promise.all([
        getPublicJobById({ data: { jobId: params.id } }).catch(() => null),
        getUserSession().catch(() => null),
      ]);

      let employerInsights: EmployerProfileInsightsDTO | null = null;
      if (job?.company_name) {
        employerInsights = await getEmployerProfileInsights({
          data: { companyName: job.company_name },
        }).catch(() => null);
      }

      return { job, session, employerInsights };
   } catch (err) {
     console.error("[loader:_store.empregos.$id] Unhandled error:", err);
     return { job: null, session: null, employerInsights: null };
   }
 },
 component: JobDetailPage,
});
function JobDetailPage() {
  const { job, session, employerInsights } = ((Route.useLoaderData?.() as any) || {});
  const matchedProfession = useMemo(() => (job?.title ? findProfessionByTitle(job.title) : null), [job?.title]);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
 const [candidateName, setCandidateName] = useState(session?.user_metadata?.full_name || "");
 const [candidateEmail, setCandidateEmail] = useState(session?.email || "");
 const [candidatePhone, setCandidatePhone] = useState("");
 const [resumeUrl, setResumeUrl] = useState("");
 const [coverLetter, setCoverLetter] = useState("");
 const [hasApplied, setHasApplied] = useState(false);

 // Inteligência Salarial & Feedback do Empregador Anterior
 const [salaryExpectationStr, setSalaryExpectationStr] = useState("");
 const [previousCompanyName, setPreviousCompanyName] = useState("");
 const [reasonForLeaving, setReasonForLeaving] = useState("");
 const [previousCompanyRating, setPreviousCompanyRating] = useState<number>(0);
 const [previousCompanyFeedback, setPreviousCompanyFeedback] = useState("");

 const applyMutation = useMutation({
 mutationFn: () =>
 applyToJob({
 data: {
 jobId: job!.id,
 candidateName,
 candidateEmail,
 candidatePhone,
 resumeUrl: resumeUrl || undefined,
 coverLetter: coverLetter || undefined,
 salaryExpectationCents: salaryExpectationStr ? Math.round(parseFloat(salaryExpectationStr.replace(/[^0-9,.]/g, '').replace(',', '.')) * 100) : null,
 previousCompanyName: previousCompanyName || null,
 reasonForLeaving: reasonForLeaving || null,
 previousCompanyRating: previousCompanyRating > 0 ? previousCompanyRating : null,
 previousCompanyFeedback: previousCompanyFeedback || null,
 },
 }),
 onSuccess: () => {
 setHasApplied(true);
 toast.success("Candidatura enviada com sucesso! A empresa entrará em contato.");
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao enviar candidatura.");
 },
 });

 if (!job) {
 return (
 <div className="w-full max-w-3xl mx-auto py-24 text-center space-y-4">
 <Briefcase size={48} className="text-muted-foreground/40 mx-auto" />
 <h1 className="text-xl font-bold text-foreground">Vaga não encontrada ou encerrada</h1>
 <p className="text-sm text-muted-foreground max-w-md mx-auto">
 Esta oportunidade de emprego pode ter sido preenchida ou pausada pelo recrutador.
 </p>
 <Button asChild className="rounded-xl font-bold">
 <Link to="/empregos">
 <ArrowLeft size={16} weight="bold" className="mr-2" />
 Ver todas as vagas disponíveis
 </Link>
 </Button>
 </div>
 );
 }

 // whatsappUrl: removido — agora usa trackAndOpenWhatsApp para rastreamento real de conversões

 const handleShare = () => {
 if (typeof window !== "undefined" && navigator.clipboard) {
 navigator.clipboard.writeText(window.location.href);
 toast.success("Link da vaga copiado para a área de transferência!");
 }
 };

 return (
  <div className="w-full max-w-4xl mx-auto space-y-8 pb-28 lg:pb-6">
 {/* ── 1. Top Navigation & Breadcrumb ── */}
 <div className="flex items-center justify-between pt-2">
 <Link
 to="/empregos"
 className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
 >
 <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
 <span>Voltar para Vagas & Carreiras</span>
 </Link>

 <Button
 variant="outline"
 size="sm"
 onClick={handleShare}
 className="rounded-xl font-semibold text-xs gap-1.5 h-9"
 >
 <ShareNetwork size={16} weight="bold" />
 <span>Compartilhar</span>
 </Button>
 </div>

  {/* ── 2. Hero Header da Vaga ── */}
  <header className="rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-card p-6 sm:p-8 space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
 <div className="flex items-start gap-4">
 <div className="size-16 sm:size-20 rounded-2xl bg-muted flex items-center justify-center text-foreground font-black text-xl shrink-0 overflow-hidden">
 {job.company_logo_url ? (
 <img
 src={job.company_logo_url}
 alt={job.company_name}
 className="size-full object-cover"
 />
 ) : (
 <Buildings size={32} weight="duotone" className="text-muted-foreground" />
 )}
 </div>

 <div className="space-y-1.5">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-xs font-bold uppercase tracking-wider font-mono text-muted-foreground">
 {job.company_name}
 </span>
 {job.is_featured && (
 <Badge variant="default" className="rounded-md font-mono text-[9px] uppercase px-1.5 py-0">
 Destaque
 </Badge>
 )}
 </div>

 <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
 {job.title}
 </h1>

 <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-muted-foreground pt-1">
 <span className="flex items-center gap-1">
 <MapPin size={14} weight="bold" className="text-foreground" />
 {job.location}
 </span>
 <span className="flex items-center gap-1">
 <Clock size={14} weight="bold" className="text-foreground" />
 Publicada em {formatDate(job.created_at)}
 </span>
 {job.applications_count !== undefined && job.applications_count > 0 && (
 <span className="flex items-center gap-1 font-semibold text-foreground">
 <User size={14} weight="bold" />
 {job.applications_count} {job.applications_count === 1 ? "candidato" : "candidatos"}
 </span>
 )}
 </div>
 </div>
 </div>

  {/* Salário em Destaque */}
  <div className="sm:text-right bg-muted/40 sm:bg-transparent p-4 sm:p-0 rounded-none sm:rounded-2xl border-y sm:border-0 border-border">
 <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
 Remuneração Prevista
 </span>
 <span className="text-lg sm:text-xl font-black text-foreground font-mono">
 {job.salary_display}
 </span>
 </div>
 </div>

        {/* Tags Rápidas de Contratação */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <Badge variant="secondary" className="rounded-xl px-3 py-1 text-xs font-bold gap-1.5">
            <Briefcase size={14} weight="bold" />
            {job.contract_type}
          </Badge>
          <Badge variant="secondary" className="rounded-xl px-3 py-1 text-xs font-bold gap-1.5">
            <Buildings size={14} weight="bold" />
            Regime {job.workplace_type}
          </Badge>
          {matchedProfession && (
            <Badge variant="outline" className="rounded-xl px-3 py-1 text-xs font-mono font-bold text-foreground">
              CBO {matchedProfession.cbo_code}
            </Badge>
          )}
          <Badge variant="outline" className="rounded-xl px-3 py-1 text-xs font-semibold text-muted-foreground">
            Área: {job.category.toUpperCase()}
          </Badge>
        </div>
 </header>

 {/* ── 3. Conteúdo Principal & Descrição Completa ── */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <main className="lg:col-span-2 space-y-8">
  {/* Descrição das Atividades */}
  <section className="rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-card p-6 sm:p-8 space-y-4">
 <h2 className="text-base font-bold text-foreground flex items-center gap-2">
 <Briefcase size={18} weight="bold" />
 <span>Sobre a Vaga e Atribuições</span>
 </h2>
 <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
 {job.description}
 </div>
 </section>

 {/* Requisitos & Qualificações */}
  {job.requirements && job.requirements.length > 0 && (
  <section className="rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-card p-6 sm:p-8 space-y-4">
 <h2 className="text-base font-bold text-foreground flex items-center gap-2">
 <CheckCircle size={18} weight="bold" />
 <span>Requisitos & Conhecimentos</span>
 </h2>
 <ul className="space-y-2.5">
 {job.requirements.map((req: string, idx: number) => (
 <li key={idx} className="flex items-start gap-3 text-sm text-foreground/90">
 <div className="size-5 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
 <CheckCircle size={13} weight="bold" />
 </div>
 <span>{req}</span>
 </li>
 ))}
 </ul>
 </section>
 )}

 {/* Benefícios & Vantagens */}
  {job.benefits && job.benefits.length > 0 && (
  <section className="rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-card p-6 sm:p-8 space-y-4">
 <h2 className="text-base font-bold text-foreground flex items-center gap-2">
 <CheckCircle size={18} weight="bold" className="text-primary" />
 <span>Benefícios & Vantagens</span>
 </h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {job.benefits.map((ben: string, idx: number) => (
 <div
 key={idx}
 className="p-3.5 rounded-2xl bg-muted/30 flex items-center gap-3 text-xs font-semibold text-foreground border border-border/40"
 >
 <CheckCircle size={16} weight="fill" className="text-emerald-500 shrink-0" />
 <span>{ben}</span>
 </div>
 ))}
 </div>
 </section>
 )}
 </main>

 {/* ── 4. Coluna Lateral de Ação / Candidatura ── */}
 <aside className="space-y-5">
        {/* Termômetro Salarial & Benchmark CBO */}
        {matchedProfession && (
          <div className="rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-card p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px] font-bold">
                  CBO {matchedProfession.cbo_code}
                </Badge>
                <span className="text-xs font-bold text-foreground">Termômetro Salarial</span>
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-500/10">
                {matchedProfession.market_demand_level} Demanda
              </Badge>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Média salarial nacional para <strong>{matchedProfession.title}</strong> conforme Classificação Brasileira de Ocupações (MTE).
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-center">
                <span className="text-[10px] text-muted-foreground block font-medium">Júnior</span>
                <span className="text-xs font-bold font-mono text-foreground">{formatMoney(matchedProfession.junior_salary_cents)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <span className="text-[10px] text-primary block font-medium">Pleno</span>
                <span className="text-xs font-bold font-mono text-primary">{formatMoney(matchedProfession.mid_salary_cents)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-center">
                <span className="text-[10px] text-muted-foreground block font-medium">Sênior</span>
                <span className="text-xs font-bold font-mono text-foreground">{formatMoney(matchedProfession.senior_salary_cents)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-center">
                <span className="text-[10px] text-muted-foreground block font-medium">Lead / Especialista</span>
                <span className="text-xs font-bold font-mono text-foreground">{formatMoney(matchedProfession.lead_salary_cents)}</span>
              </div>
            </div>

            {matchedProfession.essential_skills && matchedProfession.essential_skills.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                  Competências Chave
                </span>
                <div className="flex flex-wrap gap-1">
                  {matchedProfession.essential_skills.slice(0, 5).map((skill, i) => (
                    <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

  {/* Card de Avaliações do Empregador (Avaliação Corporativa e Cultura) */}
  {employerInsights && employerInsights.total_reviews > 0 && (
  <div className="rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-card p-5 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Perfil do Empregador
 </span>
 <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
 ★ {employerInsights.average_rating} ({employerInsights.total_reviews})
 </span>
 </div>

 <div className="space-y-1">
 <h4 className="text-xs font-bold text-foreground">Como é trabalhar na {job.company_name}?</h4>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Avaliado por {employerInsights.total_reviews} profissional(is) que já trabalharam nesta organização.
 </p>
 </div>

 {employerInsights.average_salary_cents && (
 <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
 <span className="text-muted-foreground block text-[10px]">Média Salarial Declarada:</span>
 <span className="font-bold text-emerald-700 font-mono text-sm">
 R$ {(employerInsights.average_salary_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
 </span>
 </div>
 )}

 {employerInsights.recent_feedback.length > 0 && employerInsights.recent_feedback[0].feedback && (
 <div className="p-2.5 rounded-xl bg-muted/40 text-[11px] text-muted-foreground space-y-1">
 <span className="font-semibold text-foreground block">Opinião de Ex-Colaborador:</span>
 <p className="italic leading-snug">"{employerInsights.recent_feedback[0].feedback}"</p>
 </div>
 )}
 </div>
 )}

  <div className="sticky top-20 rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-card p-6 space-y-5">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Candidate-se a esta vaga</h3>
 <p className="text-xs text-muted-foreground">
 Envie suas informações diretamente para o time de RH da {job.company_name}.
 </p>
 </div>

 {/* Modal de Candidatura Real */}
 <Sheet open={isApplyOpen} onOpenChange={setIsApplyOpen}>
 <SheetTrigger asChild>
 <Button className="w-full rounded-xl font-bold h-12 text-sm bg-foreground text-background gap-2">
 <PaperPlaneTilt size={18} weight="bold" />
 <span>Enviar Candidatura</span>
 </Button>
 </SheetTrigger>

 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0">
 <SheetTitle className="text-xl font-extrabold text-foreground">
 Candidatura — {job.title}
 </SheetTitle>
 </div>
 <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
 <SheetHeader className="space-y-2">
 <SheetTitle className="text-lg font-black text-foreground">
 Candidatura para {job.title}
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Preencha os dados abaixo para enviar seu perfil profissional para {job.company_name}.
 </SheetDescription>
 </SheetHeader>

 {hasApplied ? (
 <div className="py-8 text-center space-y-3">
 <div className="size-12 rounded-2xl bg-foreground text-background flex items-center justify-center mx-auto">
 <CheckCircle size={24} weight="bold" />
 </div>
 <h4 className="text-sm font-bold text-foreground">Candidatura Registrada!</h4>
 <p className="text-xs text-muted-foreground">
 Seu perfil foi enviado com sucesso. Fique atento ao seu WhatsApp e e-mail.
 </p>
 <Button
 variant="outline"
 onClick={() => setIsApplyOpen(false)}
 className="rounded-xl font-bold text-xs"
 >
 Fechar
 </Button>
 </div>
 ) : (
 <form
 onSubmit={(e) => {
 e.preventDefault();
 applyMutation.mutate();
 }}
 className="space-y-4 pt-2"
 >
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <User size={14} weight="bold" />
 <span>Seu Nome Completo *</span>
 </label>
 <Input
 required
 placeholder="Ex: João da Silva"
 value={candidateName}
 onChange={(e) => setCandidateName(e.target.value)}
 className="rounded-xl h-10 text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <EnvelopeSimple size={14} weight="bold" />
 <span>Seu E-mail *</span>
 </label>
 <Input
 required
 type="email"
 placeholder="seu.email@exemplo.com"
 value={candidateEmail}
 onChange={(e) => setCandidateEmail(e.target.value)}
 className="rounded-xl h-10 text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Phone size={14} weight="bold" />
 <span>Telefone / WhatsApp *</span>
 </label>
 <Input
 required
 placeholder="(49) 99999-9999"
 value={candidatePhone}
 onChange={(e) => setCandidatePhone(e.target.value)}
 className="rounded-xl h-10 text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <LinkSimple size={14} weight="bold" />
 <span>Link do Currículo / Portfólio (Opcional)</span>
 </label>
 <Input
 placeholder="https://... (link para PDF, drive ou portfólio)"
 value={resumeUrl}
 onChange={(e) => setResumeUrl(e.target.value)}
 className="rounded-xl h-10 text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <ChatText size={14} weight="bold" />
 <span>Carta de Apresentação / Mensagem (Opcional)</span>
 </label>
 <Textarea
 placeholder="Conte brevemente por que você se interessou por esta vaga..."
 value={coverLetter}
 onChange={(e) => setCoverLetter(e.target.value)}
 className="rounded-xl min-h-[90px] text-xs bg-background resize-none"
 />
 </div>

 {/* Bloco de Inteligência Salarial & Histórico */}
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <Briefcase size={13} weight="bold" className="text-primary" />
 Histórico Profissional & Pretensão
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 <div className="space-y-1">
 <label className="text-[11px] font-semibold text-muted-foreground">Pretensão Salarial (R$)</label>
 <Input
 placeholder="Ex: 3.500,00"
 value={salaryExpectationStr}
 onChange={(e) => setSalaryExpectationStr(e.target.value)}
 className="rounded-xl h-9 text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[11px] font-semibold text-muted-foreground">Última Empresa Onde Trabalhou</label>
 <Input
 placeholder="Ex: Supermercado Central"
 value={previousCompanyName}
 onChange={(e) => setPreviousCompanyName(e.target.value)}
 className="rounded-xl h-9 text-xs bg-background"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[11px] font-semibold text-muted-foreground">Por que você saiu da empresa anterior?</label>
 <Input
 placeholder="Ex: Mudança de cidade, busca de crescimento, fim de contrato..."
 value={reasonForLeaving}
 onChange={(e) => setReasonForLeaving(e.target.value)}
 className="rounded-xl h-9 text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5 pt-1">
 <div className="flex items-center justify-between">
 <label className="text-[11px] font-semibold text-muted-foreground">Como você avalia sua última empresa?</label>
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 type="button"
 onClick={() => setPreviousCompanyRating(star)}
 className="text-amber-500 hover:scale-125 transition-transform cursor-pointer text-sm"
 >
 {previousCompanyRating >= star ? "★" : "☆"}
 </button>
 ))}
 </div>
 </div>
 <Input
 placeholder="O que você mais gostava no ambiente e liderança?"
 value={previousCompanyFeedback}
 onChange={(e) => setPreviousCompanyFeedback(e.target.value)}
 className="rounded-xl h-9 text-xs bg-background"
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={applyMutation.isPending}
 className="w-full rounded-xl font-bold h-11 text-xs bg-foreground text-background mt-2"
 >
 {applyMutation.isPending ? (
 <>
 <CircleNotch size={16} className="animate-spin mr-2" />
 Enviando candidatura...
 </>
 ) : (
 "Confirmar e Enviar Currículo"
 )}
 </Button>
 </form>
 )}
 </div>
 </SheetContent>
 </Sheet>

            {/* Contato WhatsApp Direto — Rastreado e Protegido por Login */}
            {job.contact_whatsapp && (
              <ProtectedContactButton
                phone={job.contact_whatsapp}
                storeId={(job as any).store_id || null}
                entityType="job"
                entityId={job.id}
                entityTitle={`${job.title} — ${job.company_name}`}
                niche={job.category || "empregos"}
                variant="outline"
                size="lg"
                label="Falar com o Recrutador via WhatsApp"
                className="w-full rounded-xl font-bold h-11 text-xs border-border gap-2"
              />
            )}

 <div className="pt-3 space-y-2 text-[11px] text-muted-foreground">
 <div className="flex items-center gap-2">
 <ShieldCheck size={16} weight="bold" className="text-foreground shrink-0" />
 <span>Processo seletivo verificado pela Comunidade Waesy.</span>
 </div>
 </div>
 </div>
 </aside>
 </div>

  {/* ── Mobile Sticky Action Bar (Thumb Zone) ── */}
  <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/60 shadow-lg px-4 py-3 flex flex-col gap-2 select-none pb-safe">
    <Button 
      size="lg" 
      onClick={() => setIsApplyOpen(true)}
      className="w-full font-bold h-12 text-sm bg-foreground text-background gap-2 cursor-pointer shadow-sm"
    >
      <PaperPlaneTilt size={18} weight="bold" />
      Enviar Candidatura
    </Button>
  </div>
 </div>
 );
}
