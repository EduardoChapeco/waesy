import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building2,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Layers,
  Copy,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { matchResumeWithJobs, applyToJobWithSnapshot, type JobMatchResultDTO } from "@/services/resumes.functions";
import type { ResumeDataDTO } from "@/types/resume";

export interface ResumeJobMatchingRailProps {
  resumeData: ResumeDataDTO;
  fullName: string;
  email?: string;
  phone?: string;
  currentCity?: string;
  onAdaptResumeForJob?: (jobTitle: string) => void;
}

export function ResumeJobMatchingRail({
  resumeData,
  fullName,
  email,
  phone,
  currentCity,
  onAdaptResumeForJob,
}: ResumeJobMatchingRailProps) {
  const [selectedJobForApply, setSelectedJobForApply] = useState<JobMatchResultDTO | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  const skills = resumeData?.skills || [];
  const headline = resumeData?.headline || "";

  const { data: matchedJobs, isLoading, refetch } = useQuery({
    queryKey: ["resume-job-matching", skills, headline, currentCity],
    queryFn: () =>
      matchResumeWithJobs({
        data: {
          skills,
          headline,
          currentCity,
          limit: 10,
        },
      }),
    staleTime: 60_000,
  });

  const handleOpenApplyModal = (job: JobMatchResultDTO) => {
    setSelectedJobForApply(job);
    setCoverLetter(
      `Olá equipe da ${job.company_name},\n\nTenho grande interesse na oportunidade de ${job.title}. Meu perfil reúne as competências essenciais descritas e estou à disposição para conversar.`
    );
  };

  const handleConfirmQuickApply = async () => {
    if (!selectedJobForApply) return;
    if (!email || !phone) {
      toast.error("Preencha seu e-mail e telefone de contato na aba Conteúdo antes de enviar a candidatura.");
      return;
    }

    setIsApplying(true);
    try {
      const res = await applyToJobWithSnapshot({
        data: {
          jobId: selectedJobForApply.job_id,
          candidateName: fullName || "Candidato",
          candidateEmail: email,
          candidatePhone: phone,
          coverLetter,
          salaryExpectationCents: resumeData?.availability?.salaryExpectationCents || null,
          resumeSnapshotData: resumeData as Record<string, any>,
        },
      });

      toast.success(res.message || "Candidatura enviada com sucesso!");
      setAppliedJobIds((prev) => new Set(prev).add(selectedJobForApply.job_id));
      setSelectedJobForApply(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao submeter candidatura.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER DA SEÇÃO DE MATCHING ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/60 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Vagas Compatíveis com seu Perfil
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            O motor de matching compara suas competências, cargo desejado e localização com vagas ativas na cidade.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Link to="/conta/candidaturas">
            <Briefcase className="size-4" />
            <span>Minhas Candidaturas</span>
          </Link>
        </Button>
      </div>

      {/* ── LISTA DE VAGAS ── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted/40 animate-pulse motion-reduce:animate-none border border-border/40" />
          ))}
        </div>
      ) : !matchedJobs || matchedJobs.length === 0 ? (
        <div className="p-8 text-center rounded-lg border border-dashed border-border/60 space-y-4">
          <Briefcase className="size-8 text-muted-foreground mx-auto" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Nenhuma vaga encontrada no momento
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Adicione mais competências na aba Conteúdo para ampliar a compatibilidade com vagas regionais.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchedJobs.map((job) => {
            const hasApplied = job.is_applied || appliedJobIds.has(job.job_id);
            return (
              <div
                key={job.job_id}
                className="p-4 sm:p-6 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4 transition-colors hover:border-primary/40"
              >
                {/* Linha Superior: Empresa, Vaga e Match Score */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary truncate">{job.company_name}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">{job.workplace_type}</span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground truncate">{job.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        <span>{job.location}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="size-3" />
                        <span>{job.salary_display}</span>
                      </span>
                    </div>
                  </div>

                  {/* Badge de Match */}
                  <div className="text-right shrink-0">
                    <Badge
                      variant={job.match_percentage >= 70 ? "default" : "secondary"}
                      className="text-xs font-bold font-mono px-3 py-1"
                    >
                      {job.match_percentage}% Match
                    </Badge>
                  </div>
                </div>

                {/* Linha de Competências (Atendidas vs Faltantes) */}
                <div className="space-y-1 pt-1 border-t border-border/40 text-xs">
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-muted-foreground font-medium text-xs">Requisitos:</span>
                    {job.matched_skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="size-3" />
                        <span>{s}</span>
                      </span>
                    ))}
                    {job.missing_skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-1 rounded bg-muted text-muted-foreground font-medium text-xs"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ações: Candidatura Rápida ou Adaptar Currículo */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    {onAdaptResumeForJob && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAdaptResumeForJob(job.title)}
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title="Criar cópia do currículo otimizada para esta vaga"
                      >
                        <Copy className="size-4" />
                        <span>Adaptar Currículo</span>
                      </Button>
                    )}

                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Link to="/empregos/$id" params={{ id: job.job_id }} target="_blank">
                        <span>Ver Vaga</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </Button>
                  </div>

                  <div>
                    {hasApplied ? (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 gap-1 px-3 py-2">
                        <CheckCircle2 className="size-4" />
                        <span>Candidatura Enviada</span>
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenApplyModal(job)}
                        className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Send className="size-4" />
                        <span>Candidatura em 1 Clique</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL DE CONFIRMAÇÃO DE CANDIDATURA COM SNAPSHOT ── */}
      <Dialog open={Boolean(selectedJobForApply)} onOpenChange={(open) => !open && setSelectedJobForApply(null)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmar Candidatura Rápida
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Você está se candidatando para <strong>{selectedJobForApply?.title}</strong> na empresa{" "}
              <strong>{selectedJobForApply?.company_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Resumo dos Dados que serão enviados */}
            <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-2">
              <span className="font-bold text-foreground uppercase tracking-wider text-xs">
                Snapshot do Currículo que será entregue
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-muted-foreground">Candidato:</span>
                  <div className="font-semibold text-foreground">{fullName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">E-mail:</span>
                  <div className="font-semibold text-foreground truncate">{email}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone:</span>
                  <div className="font-semibold text-foreground">{phone}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Competências:</span>
                  <div className="font-semibold text-foreground truncate">{skills.slice(0, 3).join(", ") || "—"}</div>
                </div>
              </div>
            </div>

            {/* Carta de Apresentação / Mensagem Opcional */}
            <div className="space-y-2">
              <label className="font-semibold text-foreground">
                Mensagem para o Recrutador (Opcional)
              </label>
              <Textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={3}
                className="text-xs rounded-lg"
                placeholder="Apresente-se brevemente..."
              />
            </div>

            {/* Aviso de Transparência e Consentimento */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-1" />
              <span>
                Ao confirmar, uma cópia imutável (snapshot) do seu currículo atual será vinculada à vaga no painel corporativo da {selectedJobForApply?.company_name}.
              </span>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedJobForApply(null)}
              disabled={isApplying}
              className="h-11 min-h-11 px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmQuickApply}
              disabled={isApplying}
              className="h-11 min-h-11 px-6 text-xs font-bold bg-primary text-primary-foreground gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isApplying ? "Enviando..." : "Confirmar e Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
