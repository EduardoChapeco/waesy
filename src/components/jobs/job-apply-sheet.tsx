import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  CircleNotch,
  User,
  EnvelopeSimple,
  Phone,
  LinkSimple,
  ChatText,
  Briefcase,
} from "@phosphor-icons/react";

export interface JobApplySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  candidateName: string;
  setCandidateName: (v: string) => void;
  candidateEmail: string;
  setCandidateEmail: (v: string) => void;
  candidatePhone: string;
  setCandidatePhone: (v: string) => void;
  resumeUrl: string;
  setResumeUrl: (v: string) => void;
  coverLetter: string;
  setCoverLetter: (v: string) => void;
  salaryExpectationStr: string;
  setSalaryExpectationStr: (v: string) => void;
  previousCompanyName: string;
  setPreviousCompanyName: (v: string) => void;
  reasonForLeaving: string;
  setReasonForLeaving: (v: string) => void;
  previousCompanyRating: number;
  setPreviousCompanyRating: (v: number) => void;
  previousCompanyFeedback: string;
  setPreviousCompanyFeedback: (v: string) => void;
  hasApplied: boolean;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function JobApplySheet({
  isOpen,
  onOpenChange,
  job,
  candidateName,
  setCandidateName,
  candidateEmail,
  setCandidateEmail,
  candidatePhone,
  setCandidatePhone,
  resumeUrl,
  setResumeUrl,
  coverLetter,
  setCoverLetter,
  salaryExpectationStr,
  setSalaryExpectationStr,
  previousCompanyName,
  setPreviousCompanyName,
  reasonForLeaving,
  setReasonForLeaving,
  previousCompanyRating,
  setPreviousCompanyRating,
  previousCompanyFeedback,
  setPreviousCompanyFeedback,
  hasApplied,
  isPending,
  onSubmit,
}: JobApplySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border/80 shadow-2xl"
      >
        <div className="p-5 pb-4 border-b border-border/40 shrink-0">
          <SheetTitle className="text-lg font-black text-foreground">
            Candidatura — {job.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-0.5">
            Preencha seus dados para enviar seu perfil para {job.company_name}.
          </SheetDescription>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {hasApplied ? (
            <div className="py-12 text-center space-y-3">
              <div className="size-14 rounded-2xl bg-foreground text-background flex items-center justify-center mx-auto shadow-md">
                <CheckCircle size={28} weight="bold" />
              </div>
              <h4 className="text-base font-bold text-foreground">Candidatura Registrada!</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Seu perfil foi enviado com sucesso para {job.company_name}. Fique atento ao seu WhatsApp e e-mail.
              </p>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl font-bold text-xs h-10 mt-2"
              >
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User size={14} className="text-muted-foreground" />
                  Nome Completo *
                </label>
                <Input
                  required
                  placeholder="Seu nome completo"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="rounded-xl h-10 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <EnvelopeSimple size={14} className="text-muted-foreground" />
                    E-mail de Contato *
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Phone size={14} className="text-muted-foreground" />
                    WhatsApp / Telefone *
                  </label>
                  <Input
                    required
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={candidatePhone}
                    onChange={(e) => setCandidatePhone(e.target.value)}
                    className="rounded-xl h-10 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <LinkSimple size={14} className="text-muted-foreground" />
                  Link do Currículo / LinkedIn / Portfólio
                </label>
                <Input
                  type="url"
                  placeholder="https://linkedin.com/in/seu-perfil ou link do Google Drive"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  className="rounded-xl h-10 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ChatText size={14} className="text-muted-foreground" />
                  Mensagem de Apresentação / Carta de Motivação
                </label>
                <Textarea
                  placeholder="Fale brevemente sobre sua experiência e por que se interessou por esta vaga..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={3}
                  className="rounded-xl text-xs bg-background resize-none leading-relaxed"
                />
              </div>

              {/* Inteligência Salarial & Histórico */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Briefcase size={14} weight="bold" className="text-primary" />
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
                    <label className="text-[11px] font-semibold text-muted-foreground">Última Empresa</label>
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
                    placeholder="Ex: Mudança de cidade, busca de crescimento..."
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
                    placeholder="O que você mais gostava no ambiente?"
                    value={previousCompanyFeedback}
                    onChange={(e) => setPreviousCompanyFeedback(e.target.value)}
                    className="rounded-xl h-9 text-xs bg-background"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl font-bold h-11 text-xs bg-foreground text-background mt-2"
              >
                {isPending ? (
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
  );
}
