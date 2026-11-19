import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  MapPin,
  Clock,
  Phone,
  WhatsappLogo,
  Globe,
  InstagramLogo,
  Briefcase,
  Star,
  NavigationArrow,
  ShieldCheck,
  Buildings,
  Plus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/state/states";
import { ProductAiSdrChat } from "@/components/commerce/product-ai-sdr-chat";
import {
  submitBrandedAppStoreReviewFn,
  applyToBrandedAppJobFn,
} from "@/services/branded-app-portal-actions.functions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BrandedAppRuntimeBundleDTO } from "@/types/branded-app";

export interface AppCompanyInfoTabProps {
  store: BrandedAppRuntimeBundleDTO["store"];
  jobs?: any[];
  reviews?: any[];
  initialSelectedJob?: any | null;
  onClearSelectedJob?: () => void;
  className?: string;
}

const WEEKDAY_LABELS: Array<{ key: string; label: string }> = [
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export function AppCompanyInfoTab({
  store,
  jobs = [],
  reviews = [],
  initialSelectedJob = null,
  onClearSelectedJob,
  className,
}: AppCompanyInfoTabProps) {
  const settings = (store.settings || {}) as Record<string, any>;
  const bio = store.description || settings.bio || "";
  const whatsappDigits = String(store.whatsapp || store.phone || "").replace(/\D/g, "");
  const fullAddress = [store.address, store.city, store.state].filter(Boolean).join(", ");
  const [localReviews, setLocalReviews] = useState<any[]>(() => (Array.isArray(reviews) ? reviews : []));
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const [selectedJob, setSelectedJob] = useState<any | null>(initialSelectedJob);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  useEffect(() => {
    setLocalReviews(Array.isArray(reviews) ? reviews : []);
  }, [reviews]);

  useEffect(() => {
    if (initialSelectedJob) {
      setSelectedJob(initialSelectedJob);
    }
  }, [initialSelectedJob]);

  const { mutate: submitReview, isPending: isSubmittingReview } = useMutation({
    mutationFn: async () => {
      let token: string | null = null;
      if (typeof window !== "undefined") {
        try {
          token = sessionStorage.getItem(`waesy_app_portal_token:${store.id}`) || null;
        } catch {}
      }
      return await submitBrandedAppStoreReviewFn({
        data: {
          storeId: store.id,
          accessToken: token,
          rating: reviewRating,
          comment: reviewComment.trim(),
          reviewerName: reviewerName.trim() || undefined,
        },
      });
    },
    onSuccess: (res) => {
      if (res.review) {
        setLocalReviews((prev) => [res.review, ...prev]);
      }
      setReviewComment("");
      setReviewModalOpen(false);
      toast.success("Sua avaliação verificada foi publicada!");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Entre na sua conta ou informe o código de cliente para enviar avaliação verificada.",
      );
    },
  });

  const { mutate: applyToJob, isPending: isApplyingJob } = useMutation({
    mutationFn: () =>
      applyToBrandedAppJobFn({
        data: {
          storeId: store.id,
          jobId: selectedJob.id,
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim(),
          candidatePhone: candidatePhone.trim(),
          resumeUrl: resumeUrl.trim() || null,
          coverLetter: coverLetter.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Candidatura enviada com sucesso para a empresa!");
      setCandidateName("");
      setCandidateEmail("");
      setCandidatePhone("");
      setCoverLetter("");
      setResumeUrl("");
      setSelectedJob(null);
      onClearSelectedJob?.();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar candidatura.");
    },
  });
  const mapsUrl = useMemo(() => {
    if (typeof store.latitude === "number" && typeof store.longitude === "number") {
      return `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
    }
    if (fullAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    }
    return null;
  }, [store.latitude, store.longitude, fullAddress]);

  const workingHoursRaw =
    settings.business_hours || settings.working_hours || settings.opening_hours || null;

  const scheduleRows = useMemo(() => {
    if (!workingHoursRaw || typeof workingHoursRaw !== "object") return [];
    return WEEKDAY_LABELS.map(({ key, label }) => {
      const val = (workingHoursRaw as Record<string, any>)[key];
      if (!val) return null;
      if (typeof val === "string") {
        return { key, label, text: val };
      }
      if (typeof val === "object") {
        if (val.closed === true || val.isOpen === false) {
          return { key, label, text: "Fechado" };
        }
        const open = val.open || val.start || "08:00";
        const close = val.close || val.end || "18:00";
        return { key, label, text: `${open} – ${close}` };
      }
      return null;
    }).filter((item): item is { key: string; label: string; text: string } => item !== null);
  }, [workingHoursRaw]);

  const validReviews = useMemo(
    () => (Array.isArray(localReviews) ? localReviews.filter((r) => r && Number(r.rating) > 0) : []),
    [localReviews],
  );

  const avgRating = useMemo(() => {
    if (validReviews.length === 0) return null;
    const sum = validReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return (sum / validReviews.length).toFixed(1);
  }, [validReviews]);

  return (
    <div className={cn("space-y-6 pb-8", className)}>
      {/* 1. Sobre a Empresa (B.35: Sem truncamento) */}
      <section aria-label="Sobre a empresa" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-foreground tracking-tight">
            Sobre a {store.name}
          </h2>
          {store.is_verified && (
            <Badge variant="outline" className="gap-1 text-xs font-semibold">
              <ShieldCheck className="size-3.5 text-primary" weight="fill" />
              <span>Empresa Verificada</span>
            </Badge>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          {bio ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
              {bio}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Canal oficial de atendimento, compras e acompanhamento para clientes de {store.name}.
            </p>
          )}

          {store.cnpj && (
            <div className="pt-2 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
              <Buildings className="size-4 shrink-0" />
              <span>CNPJ: {store.cnpj}</span>
            </div>
          )}

          {store.payment_instructions && (
            <div className="pt-2 border-t border-border/60 space-y-1">
              <p className="text-xs font-bold text-foreground">Condições de Pagamento</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line break-words">
                {store.payment_instructions}
              </p>
            </div>
          )}

          {store.ai_sales_agent_enabled !== false && (
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Atendimento Inteligente</p>
                <p className="text-xs text-muted-foreground">
                  {store.ai_knowledge_base
                    ? "Tire dúvidas instantaneamente com base nas informações oficiais da empresa."
                    : `Converse com o assistente oficial de ${store.name}.`}
                </p>
              </div>
              <ProductAiSdrChat
                storeId={store.id}
                storeName={store.name}
                itemTitle={store.name}
                niche={store.primary_niche_id || undefined}
                triggerVariant="button"
              />
            </div>
          )}
        </div>
      </section>

      {/* 2. Canais Diretos & Como Chegar */}
      <section aria-label="Contatos e localização" className="space-y-3">
        <h2 className="text-base font-extrabold text-foreground tracking-tight">
          Atendimento & Como Chegar
        </h2>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          {fullAddress && (
            <div className="flex items-start gap-3">
              <MapPin className="size-5 text-primary shrink-0 mt-1" weight="bold" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground break-words">{fullAddress}</p>
                <p className="text-xs text-muted-foreground">Localização comercial oficial</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mapsUrl && (
              <Button
                asChild
                variant="outline"
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <NavigationArrow className="size-4" weight="bold" />
                  <span>Como Chegar no Mapa</span>
                </a>
              </Button>
            )}

            {whatsappDigits && (
              <Button
                asChild
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a
                  href={`https://wa.me/${whatsappDigits.startsWith("55") ? whatsappDigits : `55${whatsappDigits}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsappLogo className="size-4" weight="fill" />
                  <span>Falar no WhatsApp</span>
                </a>
              </Button>
            )}

            {store.phone && (
              <Button
                asChild
                variant="outline"
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a href={`tel:${store.phone.replace(/\D/g, "")}`}>
                  <Phone className="size-4" weight="bold" />
                  <span>{store.phone}</span>
                </a>
              </Button>
            )}

            {store.website && (
              <Button
                asChild
                variant="outline"
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a
                  href={store.website.startsWith("http") ? store.website : `https://${store.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="size-4" weight="bold" />
                  <span>Site Oficial</span>
                </a>
              </Button>
            )}

            {store.instagram && (
              <Button
                asChild
                variant="outline"
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a
                  href={
                    store.instagram.startsWith("http")
                      ? store.instagram
                      : `https://instagram.com/${store.instagram.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramLogo className="size-4" weight="bold" />
                  <span>Instagram</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 3. Horários de Funcionamento */}
      <section aria-label="Horários de atendimento" className="space-y-3">
        <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Clock className="size-4 text-primary" weight="bold" />
          <span>Horários de Funcionamento</span>
        </h2>

        {scheduleRows.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border/60">
            {scheduleRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between px-4 py-3 text-xs">
                <span className="font-semibold text-foreground">{row.label}</span>
                <span className="text-muted-foreground font-mono">{row.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            Horários detalhados não cadastrados pela empresa. Consulte pelos canais de contato acima.
          </div>
        )}
      </section>

      {/* 4. Avaliações Reais (Zero avaliações fake - B.33) */}
      <section aria-label="Avaliações de clientes" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Star className="size-4 text-primary" weight="fill" />
            <span>Avaliações de Clientes</span>
          </h2>
          <div className="flex items-center gap-2">
            {avgRating && (
              <Badge variant="secondary" className="font-mono text-xs font-bold">
                {avgRating} ({validReviews.length})
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(true)}
              className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              <Plus className="size-3.5" weight="bold" />
              <span>Avaliar Empresa</span>
            </Button>
          </div>
        </div>

        {validReviews.length === 0 ? (
          <EmptyState
            title="Sem avaliações registradas"
            description="As avaliações verificadas dos clientes aparecerão aqui após as primeiras compras."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {validReviews.map((rev: any) => (
              <article
                key={rev.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground truncate">
                    {rev.author_name || rev.reviewer_name || rev.products?.title || "Cliente Verificado"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-foreground">
                    <Star className="size-3.5 text-warning" weight="fill" />
                    {Number(rev.rating).toFixed(1)}
                  </span>
                </div>
                {rev.verified_purchase && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <ShieldCheck className="size-3 text-primary" weight="bold" />
                    <span>Compra Verificada</span>
                  </Badge>
                )}
                {rev.comment && (
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
                    {rev.comment}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 5. Vagas Abertas (Omitido ou vazio honesto se 0) */}
      {Array.isArray(jobs) && jobs.length > 0 && (
        <section aria-label="Vagas abertas" className="space-y-3">
          <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Briefcase className="size-4 text-primary" weight="bold" />
            <span>Trabalhe Conosco</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobs.map((job: any) => (
              <article
                key={job.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">{job.title}</h3>
                    {(job.contract_type || job.job_type || job.employment_type) && (
                      <Badge variant="outline" className="text-xs">
                        {job.contract_type || job.job_type || job.employment_type}
                      </Badge>
                    )}
                  </div>
                  {(job.location || job.workplace_type) && (
                    <p className="text-xs text-muted-foreground">
                      {[job.location, job.workplace_type].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {job.salary_display ? (
                    <p className="text-xs font-semibold text-foreground">{job.salary_display}</p>
                  ) : typeof job.salary_min_cents === "number" && job.salary_min_cents > 0 ? (
                    <p className="text-xs font-semibold text-foreground">
                      A partir de {formatMoney(job.salary_min_cents)}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedJob(job)}
                  className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                >
                  <Briefcase className="size-4" weight="bold" />
                  <span>Ver Vaga e Candidatar</span>
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Modal de Envio de Avaliação Verificada */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              Avaliar {store.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Exclusivo para clientes com compra, viagem ou serviço confirmado nesta empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Sua Nota</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    aria-label={`${star} estrelas`}
                    className={cn(
                      "size-11 min-h-11 min-w-11 rounded-xl border flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      reviewRating >= star
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    <Star className="size-5" weight={reviewRating >= star ? "fill" : "regular"} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Seu Nome (Opcional)</Label>
              <Input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Ex: Maria Oliveira"
                className="h-11 min-h-11 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Relato da Experiência</Label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Conte como foi seu pedido, atendimento ou viagem..."
                className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button
              type="button"
              disabled={isSubmittingReview || reviewComment.trim().length < 4}
              onClick={() => submitReview()}
              className="w-full h-11 min-h-11 rounded-xl text-xs font-bold cursor-pointer"
            >
              {isSubmittingReview ? "Validando e publicando..." : "Publicar Avaliação Verificada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhe e Candidatura à Vaga no App */}
      <Dialog
        open={Boolean(selectedJob)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJob(null);
            onClearSelectedJob?.();
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl max-h-dvh overflow-y-auto pt-safe-modal">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              {selectedJob?.title || "Candidatura à Vaga"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {store.name} · {[selectedJob?.location, selectedJob?.workplace_type, selectedJob?.contract_type].filter(Boolean).join(" · ")}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4 py-1">
              {selectedJob.description && (
                <p className="text-xs text-muted-foreground whitespace-pre-line break-words leading-relaxed">
                  {selectedJob.description}
                </p>
              )}

              <div className="space-y-3 border-t border-border pt-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Nome Completo</Label>
                  <Input
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-11 min-h-11 rounded-xl text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">E-mail</Label>
                    <Input
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      placeholder="voce@email.com"
                      className="h-11 min-h-11 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">WhatsApp</Label>
                    <Input
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                      placeholder="(49) 99999-9999"
                      className="h-11 min-h-11 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Link do Currículo / LinkedIn (Opcional)</Label>
                  <Input
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="h-11 min-h-11 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Apresentação e Experiência</Label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={3}
                    placeholder="Conte brevemente sobre sua experiência..."
                    className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Button
                  type="button"
                  disabled={
                    isApplyingJob ||
                    candidateName.trim().length < 2 ||
                    !candidateEmail.includes("@") ||
                    candidatePhone.trim().length < 8
                  }
                  onClick={() => applyToJob()}
                  className="w-full h-11 min-h-11 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isApplyingJob ? "Enviando candidatura..." : "Confirmar Candidatura"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
