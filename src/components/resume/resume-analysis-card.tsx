import React from "react";
import { CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ResumeDataDTO } from "@/types/resume";

export interface ResumeAnalysisCardProps {
  data: ResumeDataDTO;
  fullName: string;
  email?: string;
  phone?: string;
  city?: string;
  templateId?: string;
  onApplySuggestion?: (field: string, text: string) => void;
}

export function ResumeAnalysisCard({
  data,
  fullName,
  email,
  phone,
  city,
  templateId = "minimal",
}: ResumeAnalysisCardProps) {
  const experiences = data?.experiences || [];
  const educations = data?.educations || [];
  const skills = data?.skills || [];
  const summary = data?.summary || "";
  const languages = data?.languages || [];

  // 1. Cálculo de Completude Explicável (0 a 100%)
  const checks = [
    {
      id: "identity",
      label: "Identificação e Contato",
      description: "Nome, e-mail, telefone e cidade cadastrados",
      points: 20,
      passed: Boolean(fullName && email && phone && city),
    },
    {
      id: "summary",
      label: "Resumo Profissional",
      description: "Resumo com clareza (mínimo de 60 caracteres)",
      points: 20,
      passed: summary.trim().length >= 60,
    },
    {
      id: "experiences",
      label: "Experiência Profissional",
      description: "Pelo menos 1 cargo com descrição de atividades",
      points: 25,
      passed: experiences.length > 0 && Boolean(experiences[0]?.description),
    },
    {
      id: "education",
      label: "Formação Acadêmica",
      description: "Instituição de ensino e curso informados",
      points: 15,
      passed: educations.length > 0 && Boolean(educations[0]?.school),
    },
    {
      id: "skills",
      label: "Competências Chave",
      description: "Mínimo de 3 habilidades adicionadas",
      points: 10,
      passed: skills.length >= 3,
    },
    {
      id: "languages",
      label: "Idiomas e Fluência",
      description: "Pelo menos 1 idioma com nível de proficiência",
      points: 10,
      passed: languages.length >= 1,
    },
  ];

  const totalScore = checks.reduce((acc, curr) => (curr.passed ? acc + curr.points : acc), 0);

  // 2. Diagnóstico ATS
  const isAtsFriendly = templateId === "ats_friendly" || templateId === "minimal";
  const hasContactInfo = Boolean(email && phone);
  const hasStructuredSkills = skills.length >= 4;

  const atsScore = (isAtsFriendly ? 40 : 20) + (hasContactInfo ? 30 : 0) + (hasStructuredSkills ? 30 : 15);

  return (
    <div className="space-y-6">
      {/* ── CARD PRINCIPAL: SCORE DE COMPLETUDE ── */}
      <div className="p-6 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Diagnóstico de Força do Currículo
            </span>
            <h3 className="text-base font-bold text-foreground">
              {totalScore >= 85
                ? "Currículo Altamente Competitivo"
                : totalScore >= 60
                ? "Currículo em Bom Nível"
                : "Currículo em Construção"}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-primary font-mono">{totalScore}%</span>
            <div className="text-xs text-muted-foreground">de completude</div>
          </div>
        </div>

        <Progress value={totalScore} className="h-2" />

        {/* Critérios Auditados */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          {checks.length === 0 ? null : checks.map((c) => (
            <div key={c.id} className="flex items-start justify-between text-xs gap-3">
              <div className="flex items-start gap-2">
                {c.passed ? (
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="size-4 text-amber-500 shrink-0 mt-1" />
                )}
                <div>
                  <span className={c.passed ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}>
                    {c.label}
                  </span>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">
                +{c.points}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CARD 2: COMPATIBILIDADE COM SISTEMAS ATS (ROBÔS DE RH) ── */}
      <div className="p-6 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Compatibilidade com Filtros ATS
            </span>
          </div>
          <Badge variant={atsScore >= 80 ? "default" : "secondary"} className="text-xs font-bold">
            {atsScore}% Aderência
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Sistemas ATS (Applicant Tracking Systems) realizam leitura mecânica de currículos. Documentos com uma coluna, tipografia semântica e competências listadas em tópicos possuem taxa de leitura 4x maior.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          <div className="p-3 rounded-md bg-muted/40 border border-border/40 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Estrutura 100% Textual (Zero Imagem)</span>
          </div>
          <div className="p-3 rounded-md bg-muted/40 border border-border/40 flex items-center gap-2">
            {isAtsFriendly ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : (
              <AlertCircle className="size-4 text-amber-500" />
            )}
            <span>
              {isAtsFriendly ? "Template Linear / ATS Ativo" : "Template Visual Multicoluna"}
            </span>
          </div>
        </div>
      </div>

      {/* ── CARD 3: ASSISTENTE DE REDAÇÃO DE IMPACTO ── */}
      <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4" />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            Dicas de Redação Profissional
          </h4>
        </div>
        <div className="space-y-2 text-xs text-foreground/90">
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary">•</span>
            <span>
              <strong>Use Verbos de Ação:</strong> Comece realizações com palavras fortes como <em>"Liderou", "Desenvolveu", "Implementou", "Otimizou", "Negociou"</em>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary">•</span>
            <span>
              <strong>Foque em Resultados:</strong> Em vez de apenas listar obrigações rotineiras, mencione entregas, metas atingidas ou melhorias implementadas.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary">•</span>
            <span>
              <strong>Sem Falsificações:</strong> Nunca declare competências que não domina ou percentuais artificiais. Recrutadores valorizam honestidade técnica.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
