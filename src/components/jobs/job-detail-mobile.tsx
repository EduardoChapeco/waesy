import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  MapPin,
  Clock,
  Buildings,
  ShareNetwork,
  ArrowLeft,
  PaperPlaneTilt,
  User,
  ShieldCheck,
  LinkSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtectedContactButton } from "@/components/common/protected-contact-button";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";

export interface JobDetailMobileProps {
  job: any;
  employerInsights: any;
  matchedProfession: any;
  onOpenApply: () => void;
  onShare: () => void;
}

export function JobDetailMobile({
  job,
  employerInsights,
  matchedProfession,
  onOpenApply,
  onShare,
}: JobDetailMobileProps) {
  return (
    <div className="w-full min-h-[100dvh] bg-background text-foreground pb-24 font-sans select-none antialiased">
      {/* ── 1. Top Bar Mobile com Botão Voltar & Compartilhar ── */}
      <div className="flex items-center justify-between p-3 border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-30">
        <Link
          to="/empregos"
          className="size-11 rounded-full bg-muted/70 hover:bg-muted flex items-center justify-center border border-border/60 text-foreground active:scale-95 transition-all"
          aria-label="Voltar para Vagas"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="rounded-full font-semibold text-xs gap-1.5 h-11 px-4 border-border/60"
          >
            <ShareNetwork size={16} weight="bold" />
            <span>Compartilhar</span>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* ── 2. Card de Identidade da Empresa e Vaga ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-foreground font-black text-lg shrink-0 overflow-hidden border border-border/50 shadow-xs">
              {job.company_logo_url ? (
                <img
                  src={job.company_logo_url}
                  alt={job.company_name}
                  className="size-full object-cover"
                />
              ) : (
                <Buildings size={24} weight="duotone" className="text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono line-clamp-1">
                  {job.company_name}
                </span>
                {job.is_featured && (
                  <Badge variant="default" className="rounded-md font-mono text-[9px] uppercase px-1.5 py-0 shrink-0">
                    Destaque
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-black text-foreground tracking-tight leading-tight mt-0.5">
                {job.title}
              </h1>
            </div>
          </div>

          {/* Remuneração */}
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
              Remuneração Prevista
            </span>
            <span className="text-lg font-black text-primary font-mono">
              {job.salary_display}
            </span>
          </div>

          {/* Metadados: Localização, Publicação, Candidatos */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <MapPin size={13} weight="bold" className="text-foreground" />
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} weight="bold" className="text-foreground" />
              {formatDate(job.created_at)}
            </span>
            {job.applications_count !== undefined && job.applications_count > 0 && (
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <User size={13} weight="bold" />
                {job.applications_count} {job.applications_count === 1 ? "candidato" : "candidatos"}
              </span>
            )}
          </div>

          {/* Tags de Contratação */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 text-xs font-semibold gap-1">
              <Briefcase size={12} weight="bold" />
              {job.contract_type}
            </Badge>
            {job.work_model && (
              <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-xs font-medium">
                {job.work_model === "remote" ? "Remoto" : job.work_model === "hybrid" ? "Híbrido" : "Presencial"}
              </Badge>
            )}
            {job.experience_level && (
              <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-xs font-medium capitalize">
                {job.experience_level}
              </Badge>
            )}
          </div>
        </div>

        {/* ── 3. Descrição da Oportunidade ── */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sobre a Vaga</h2>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
            {job.description}
          </p>
        </div>

        {/* ── 4. Requisitos e Benefícios ── */}
        {job.requirements && job.requirements.length > 0 && (
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requisitos & Qualificações</h2>
            <ul className="space-y-1.5 text-xs text-foreground/85">
              {job.requirements.map((req: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Benefícios Oferecidos</h2>
            <div className="flex flex-wrap gap-1.5">
              {job.benefits.map((benefit: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs py-1 px-2.5 rounded-lg border-border/60 bg-muted/20">
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. Inteligência Salarial & Guia de Carreira (se match) ── */}
        {matchedProfession && (
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Média Salarial Regional
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Guia de Mercado</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="p-2 rounded-lg bg-muted/30 border border-border/40 text-center">
                <span className="text-[9px] text-muted-foreground block font-medium">Júnior</span>
                <span className="text-xs font-bold font-mono text-foreground">{formatMoney(matchedProfession.junior_salary_cents)}</span>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <span className="text-[9px] text-primary block font-medium">Pleno</span>
                <span className="text-xs font-bold font-mono text-primary">{formatMoney(matchedProfession.mid_salary_cents)}</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/30 border border-border/40 text-center">
                <span className="text-[9px] text-muted-foreground block font-medium">Sênior</span>
                <span className="text-xs font-bold font-mono text-foreground">{formatMoney(matchedProfession.senior_salary_cents)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. Perfil do Empregador (Employer Insights) ── */}
        {employerInsights && employerInsights.total_reviews > 0 && (
          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Perfil do Empregador
              </span>
              <span className="text-xs font-bold text-amber-500">
                ★ {employerInsights.average_rating} ({employerInsights.total_reviews})
              </span>
            </div>
            <p className="text-xs text-foreground/80 leading-snug">
              Como é trabalhar na <strong>{job.company_name}</strong>: avaliado por {employerInsights.total_reviews} profissional(is).
            </p>
          </div>
        )}

        {/* ── 7. Contato WhatsApp Direto do Recrutador ── */}
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
            label="Falar com o Recrutador no WhatsApp"
            className="w-full rounded-xl font-bold h-11 text-xs border-border/80 gap-2"
          />
        )}

        {/* ── 8. Selo de Verificação Comunitária ── */}
        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <ShieldCheck size={16} weight="bold" className="text-foreground shrink-0" />
          <span>Processo seletivo verificado pela Comunidade Waesy.</span>
        </div>
      </div>

      {/* ── 9. Sticky Bottom Action Bar (Thumb Zone & Safe-Area) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] mobile-nav-hide-on-keyboard flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Salário Previsto
          </span>
          <span className="text-sm font-black text-foreground font-mono line-clamp-1">
            {job.salary_display}
          </span>
        </div>

        {job.is_external && job.external_url ? (
          <a
            href={job.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-foreground/90 transition-colors shadow-sm shrink-0"
          >
            <span>Site Oficial</span>
            <LinkSimple size={14} weight="bold" />
          </a>
        ) : (
          <Button
            onClick={onOpenApply}
            className="h-12 px-6 rounded-xl font-bold text-xs bg-foreground text-background gap-1.5 shadow-sm shrink-0"
          >
            <PaperPlaneTilt size={16} weight="bold" />
            <span>Candidatar-se</span>
          </Button>
        )}
      </div>
    </div>
  );
}
