import { useIsDesktop } from "@/hooks/use-mobile";
import { JobDetailMobile } from "@/components/jobs/job-detail-mobile";
import { JobDetailDesktop } from "@/components/jobs/job-detail-desktop";
import { JobApplySheet } from "@/components/jobs/job-apply-sheet";
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
import { ProtectedContactButton } from "@/components/common/protected-contact-button";
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

 const isDesktop = useIsDesktop(1024);

  const handleSubmitApply = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate();
  };

  return (
    <>
      {isDesktop ? (
        <JobDetailDesktop
          job={job}
          employerInsights={employerInsights}
          matchedProfession={matchedProfession}
          onOpenApply={() => setIsApplyOpen(true)}
          onShare={handleShare}
        />
      ) : (
        <JobDetailMobile
          job={job}
          employerInsights={employerInsights}
          matchedProfession={matchedProfession}
          onOpenApply={() => setIsApplyOpen(true)}
          onShare={handleShare}
        />
      )}

      <JobApplySheet
        isOpen={isApplyOpen}
        onOpenChange={setIsApplyOpen}
        job={job}
        candidateName={candidateName}
        setCandidateName={setCandidateName}
        candidateEmail={candidateEmail}
        setCandidateEmail={setCandidateEmail}
        candidatePhone={candidatePhone}
        setCandidatePhone={setCandidatePhone}
        resumeUrl={resumeUrl}
        setResumeUrl={setResumeUrl}
        coverLetter={coverLetter}
        setCoverLetter={setCoverLetter}
        salaryExpectationStr={salaryExpectationStr}
        setSalaryExpectationStr={setSalaryExpectationStr}
        previousCompanyName={previousCompanyName}
        setPreviousCompanyName={setPreviousCompanyName}
        reasonForLeaving={reasonForLeaving}
        setReasonForLeaving={setReasonForLeaving}
        previousCompanyRating={previousCompanyRating}
        setPreviousCompanyRating={setPreviousCompanyRating}
        previousCompanyFeedback={previousCompanyFeedback}
        setPreviousCompanyFeedback={setPreviousCompanyFeedback}
        hasApplied={hasApplied}
        isPending={applyMutation.isPending}
        onSubmit={handleSubmitApply}
      />
    </>
  );
}
