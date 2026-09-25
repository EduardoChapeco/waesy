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

export interface JobDetailDesktopProps {
  job: any;
  employerInsights: any;
  matchedProfession: any;
  onOpenApply: () => void;
  onShare: () => void;
}

export function JobDetailDesktop({
  job,
  employerInsights,
  matchedProfession,
  onOpenApply,
  onShare,
}: JobDetailDesktopProps) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16 pt-2 font-sans">
      {/* ── 1. Top Breadcrumb & Share ── */}
      <div className="flex items-center justify-between">
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
          onClick={onShare}
          className="rounded-xl font-semibold text-xs gap-1.5 h-8 border-border/70"
        >
          <ShareNetwork size={15} weight="bold" />
          <span>Compartilhar</span>
        </Button>
      </div>

      {/* ── 2. Grid 2 Colunas Split-Screen (7 cols / 5 cols) ── */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda (7 cols): Detalhes da Vaga, Descrição, Requisitos & Benchmark */}
        <div className="col-span-7 space-y-6">
          {/* Header da Vaga */}
          <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="size-16 rounded-2xl bg-muted flex items-center justify-center text-foreground font-black text-xl shrink-0 overflow-hidden border border-border/50">
                {job.company_logo_url ? (
                  <img
                    src={job.company_logo_url}
                    alt={job.company_name}
                    className="size-full object-cover"
                  />
                ) : (
                  <Buildings size={28} weight="duotone" className="text-muted-foreground" />
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
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

                <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                  {job.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
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

            {/* Tags Rápidas de Contratação */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
              <Badge variant="secondary" className="rounded-xl px-3 py-1 text-xs font-bold gap-1.5">
                <Briefcase size={14} weight="bold" />
                {job.contract_type}
              </Badge>
              {job.work_model && (
                <Badge variant="outline" className="rounded-xl px-3 py-1 text-xs font-semibold">
                  {job.work_model === "remote" ? "Remoto" : job.work_model === "hybrid" ? "Híbrido" : "Presencial"}
                </Badge>
              )}
              {job.experience_level && (
                <Badge variant="outline" className="rounded-xl px-3 py-1 text-xs font-semibold capitalize">
                  Nível: {job.experience_level}
                </Badge>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição da Vaga</h2>
            <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
              {job.description}
            </div>
          </div>

          {/* Requisitos & Benefícios */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requisitos & Qualificações</h2>
              <ul className="space-y-2 text-sm text-foreground/85">
                {job.requirements.map((req: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.benefits && job.benefits.length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Benefícios Oferecidos</h2>
              <div className="flex flex-wrap gap-2">
                {job.benefits.map((benefit: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs py-1 px-3 rounded-xl border-border/60 bg-muted/20">
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Inteligência Salarial & Guia de Carreira */}
          {matchedProfession && (
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Inteligência de Mercado
                  </span>
                  <h3 className="text-sm font-bold text-foreground">
                    Faixa Salarial para {matchedProfession.title}
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-border/60">
                  Pesquisa Regional
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <span className="text-[10px] text-muted-foreground block font-medium">Júnior</span>
                  <span className="text-xs font-bold font-mono text-foreground">{formatMoney(matchedProfession.junior_salary_cents)}</span>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <span className="text-[10px] text-primary block font-medium">Pleno</span>
                  <span className="text-xs font-bold font-mono text-primary">{formatMoney(matchedProfession.mid_salary_cents)}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <span className="text-[10px] text-muted-foreground block font-medium">Sênior</span>
                  <span className="text-xs font-bold font-mono text-foreground">{formatMoney(matchedProfession.senior_salary_cents)}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <span className="text-[10px] text-muted-foreground block font-medium">Lead</span>
                  <span className="text-xs font-bold font-mono text-foreground">{formatMoney(matchedProfession.lead_salary_cents)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Employer Insights */}
          {employerInsights && employerInsights.total_reviews > 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Perfil do Empregador
                </span>
                <span className="text-xs font-bold text-amber-500">
                  ★ {employerInsights.average_rating} ({employerInsights.total_reviews} avaliações)
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Como é trabalhar na {job.company_name}?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Avaliado por {employerInsights.total_reviews} profissional(is) que já atuaram nesta organização.
              </p>
            </div>
          )}
        </div>

        {/* Coluna Direita (5 cols Sticky): Salário, Candidatura & Contato */}
        <div className="col-span-5 space-y-5 sticky top-24">
          <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-5 shadow-sm">
            {/* Salário */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block font-bold">
                Remuneração Prevista
              </span>
              <span className="text-2xl font-black text-foreground font-mono">
                {job.salary_display}
              </span>
            </div>

            {/* Ação Primária */}
            {job.is_external && job.external_url ? (
              <Button
                asChild
                className="w-full rounded-xl font-bold h-12 text-sm bg-foreground text-background gap-2 hover:bg-foreground/90 transition-colors shadow-sm"
              >
                <a
                  href={job.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <LinkSimple size={18} weight="bold" />
                  <span>Candidatar-se no Site Oficial</span>
                </a>
              </Button>
            ) : (
              <Button
                onClick={onOpenApply}
                className="w-full rounded-xl font-bold h-12 text-sm bg-foreground text-background gap-2 hover:bg-foreground/90 transition-colors shadow-sm"
              >
                <PaperPlaneTilt size={18} weight="bold" />
                <span>Enviar Candidatura</span>
              </Button>
            )}

            {/* WhatsApp Recrutador */}
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
                className="w-full rounded-xl font-bold h-11 text-xs border-border/80 gap-2"
              />
            )}

            {/* Selo de Verificação */}
            <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck size={16} weight="bold" className="text-foreground shrink-0" />
              <span>Processo seletivo verificado pela Comunidade Waesy.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
