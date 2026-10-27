import React from "react";
import { cn } from "@/lib/utils";
import type { ResumeDataDTO } from "@/types/resume";

export interface ResumeDocumentProps {
  data: ResumeDataDTO;
  fullName: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  website?: string;
  templateId?: "minimal" | "modern" | "ats_friendly" | "editorial" | "creative";
  accentColor?: "slate" | "navy" | "emerald" | "burgundy" | "violet" | string;
  fontFamily?: "sans" | "serif" | "mono";
  spacingDensity?: "compact" | "normal" | "relaxed";
  showPhoto?: boolean;
  profileUrl?: string;
  className?: string;
}

const PROFICIENCY_LABELS: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
  fluent: "Fluente",
  native: "Nativo",
};

export const ResumeDocument = React.forwardRef<HTMLDivElement, ResumeDocumentProps>(
  (
    {
      data,
      fullName,
      avatarUrl,
      email,
      phone,
      city,
      state,
      website,
      templateId = "minimal",
      accentColor = "slate",
      fontFamily = "sans",
      spacingDensity = "normal",
      showPhoto = true,
      profileUrl,
      className,
    },
    ref
  ) => {
    const experiences = (data?.experiences || []).filter((e: any) => e.is_included !== false);
    const educations = data?.educations || [];
    const certifications = data?.certifications || [];
    const licenses = data?.licenses || [];
    const projects = data?.projects || [];
    const languages = data?.languages || [];
    const skills = data?.skills || [];
    const headline = data?.headline || "";
    const summary = data?.summary || "";

    const fontClass =
      fontFamily === "serif"
        ? "font-serif"
        : fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

    const densityPadding =
      spacingDensity === "compact"
        ? "p-6 sm:p-8 space-y-4"
        : spacingDensity === "relaxed"
        ? "p-10 sm:p-12 space-y-8"
        : "p-8 sm:p-10 space-y-6";

    // Resolução de Cores de Acento sem inline style e sem hexadecimais soltos
    const accentHeaderBg =
      accentColor === "navy"
        ? "bg-blue-900"
        : accentColor === "emerald"
        ? "bg-emerald-800"
        : accentColor === "burgundy"
        ? "bg-rose-900"
        : accentColor === "violet"
        ? "bg-purple-900"
        : "bg-slate-900";

    const accentTextClass =
      accentColor === "navy"
        ? "text-blue-900 border-blue-900"
        : accentColor === "emerald"
        ? "text-emerald-800 border-emerald-800"
        : accentColor === "burgundy"
        ? "text-rose-900 border-rose-900"
        : accentColor === "violet"
        ? "text-purple-900 border-purple-900"
        : "text-slate-900 border-slate-900";

    // ─── 1. TEMPLATE MODERNO (2 COLUNAS: SIDEBAR ESQUERDA + CONTEÚDO DIREITO) ───
    if (templateId === "modern") {
      return (
        <div
          ref={ref}
          id="resume-paper"
          className={cn(
            "resume-document-paper w-full max-w-3xl min-h-screen bg-card text-slate-900 border border-slate-200 transition-colors select-text overflow-hidden flex flex-col justify-between",
            fontClass,
            className
          )}
        >
          {/* Header Superior Moderno */}
          <div className={cn("p-8 sm:p-10 flex items-center justify-between gap-6 text-foreground", accentHeaderBg)}>
            <div className="space-y-1 min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground break-words">
                {fullName || "Nome do Profissional"}
              </h1>
              {headline && (
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-foreground/90 uppercase break-words">
                  {headline}
                </p>
              )}
            </div>

            {avatarUrl && showPhoto && (
              <div className="size-20 rounded-lg overflow-hidden border-2 border-white/40 shrink-0 bg-card/20">
                <img src={avatarUrl} alt={fullName} className="size-full object-cover" />
              </div>
            )}
          </div>

          {/* Corpo em 2 Colunas */}
          <div className="flex-1 flex flex-col sm:flex-row">
            {/* Sidebar Esquerda (Contatos, Skills, Idiomas) */}
            <div className="w-full sm:w-64 bg-slate-50 p-6 sm:p-8 border-r border-slate-200 space-y-6 text-xs text-slate-700 shrink-0">
              {/* Contatos */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Contato
                </h3>
                <div className="space-y-2 text-slate-600 font-medium">
                  {email && <div className="break-all">{email}</div>}
                  {phone && <div>{phone}</div>}
                  {(city || state) && (
                    <div>
                      {city}
                      {state ? `, ${state}` : ""}
                    </div>
                  )}
                  {website && (
                    <div className="text-blue-600 truncate">{website.replace(/^https?:\/\//, "")}</div>
                  )}
                </div>
              </div>

              {/* Competências */}
              {skills.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                    Habilidades
                  </h3>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-1 rounded bg-card border border-slate-200 text-slate-800 text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Idiomas */}
              {languages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                    Idiomas
                  </h3>
                  <div className="space-y-1 pt-1">
                    {languages.map((l: any, i: number) => (
                      <div key={l.id || i} className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800">{l.name}</span>
                        <span className="text-slate-500">
                          {PROFICIENCY_LABELS[l.proficiency] || l.proficiency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificações */}
              {certifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                    Certificados
                  </h3>
                  <div className="space-y-2 pt-1">
                    {certifications.map((c: any, i: number) => (
                      <div key={c.id || i} className="text-xs">
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-slate-500 text-xs">{c.issuer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Principal Direita (Resumo, Trajetórias, Educação) */}
            <div className="flex-1 p-6 sm:p-8 space-y-6">
              {/* Resumo */}
              {summary && (
                <div className="space-y-2">
                  <h2 className={cn("text-xs font-bold uppercase tracking-wider border-b pb-1", accentTextClass)}>
                    Resumo Profissional
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line text-justify">
                    {summary}
                  </p>
                </div>
              )}

              {/* Experiências */}
              {experiences.length > 0 && (
                <div className="space-y-4">
                  <h2 className={cn("text-xs font-bold uppercase tracking-wider border-b pb-1", accentTextClass)}>
                    Experiência Profissional
                  </h2>
                  <div className="space-y-4">
                    {experiences.map((exp: any, i: number) => (
                      <div key={exp.id || i} className="space-y-1 break-inside-avoid">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{exp.title}</h4>
                          <span className="text-xs text-slate-500 font-mono">
                            {exp.start_date} — {exp.is_current ? "Presente" : exp.end_date || ""}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">{exp.company}</div>
                        {exp.description && (
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line pt-1">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Educação */}
              {educations.length > 0 && (
                <div className="space-y-3">
                  <h2 className={cn("text-xs font-bold uppercase tracking-wider border-b pb-1", accentTextClass)}>
                    Formação Acadêmica
                  </h2>
                  <div className="space-y-2">
                    {educations.map((edu: any, i: number) => (
                      <div key={edu.id || i} className="flex justify-between gap-2 break-inside-avoid">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{edu.school}</div>
                          <div className="text-xs text-slate-600">{edu.field_of_study || edu.degree}</div>
                        </div>
                        <span className="text-xs text-slate-500 font-mono shrink-0">
                          {edu.start_date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="p-4 border-t border-slate-200 text-center text-xs text-slate-400 font-mono">
            {profileUrl ? profileUrl.replace(/^https?:\/\//, "") : "Waesy Professional Ecosystem"}
          </div>
        </div>
      );
    }

    // ─── 2. TEMPLATE ATS-FRIENDLY (1 COLUNA LINEAR, SEM GRÁFICOS, PARSING PREVISÍVEL) ───
    if (templateId === "ats_friendly") {
      return (
        <div
          ref={ref}
          id="resume-paper"
          className={cn(
            "resume-document-paper w-full max-w-3xl min-h-screen bg-card text-slate-900 border border-slate-200 transition-colors select-text overflow-hidden flex flex-col justify-between p-10 sm:p-12 space-y-6 font-sans",
            className
          )}
        >
          {/* Header Linear ATS */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-950">
              {fullName || "Nome do Profissional"}
            </h1>
            {headline && (
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 uppercase">
                {headline}
              </p>
            )}
            <div className="text-xs text-slate-700 flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1 font-mono">
              {email && <span>{email}</span>}
              {phone && <span>• {phone}</span>}
              {(city || state) && (
                <span>
                  • {city}
                  {state ? `, ${state}` : ""}
                </span>
              )}
              {website && <span>• {website.replace(/^https?:\/\//, "")}</span>}
            </div>
          </div>

          {/* Resumo ATS */}
          {summary && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                RESUMO PROFISSIONAL
              </h2>
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line text-justify">
                {summary}
              </p>
            </div>
          )}

          {/* Trajetórias ATS */}
          {experiences.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                EXPERIÊNCIA PROFISSIONAL
              </h2>
              <div className="space-y-3">
                {experiences.map((exp: any, i: number) => (
                  <div key={exp.id || i} className="space-y-1 break-inside-avoid">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-slate-950">{exp.title}</span>
                      <span className="text-slate-600 font-mono">
                        {exp.start_date} — {exp.is_current ? "Presente" : exp.end_date || ""}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800">{exp.company}</div>
                    {exp.description && (
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Educação ATS */}
          {educations.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                EDUCAÇÃO & FORMAÇÃO
              </h2>
              <div className="space-y-2">
                {educations.map((edu: any, i: number) => (
                  <div key={edu.id || i} className="flex justify-between text-xs break-inside-avoid">
                    <div>
                      <span className="font-bold text-slate-950">{edu.school}</span>
                      <p className="text-slate-700">{edu.field_of_study || edu.degree}</p>
                    </div>
                    <span className="text-slate-600 font-mono">{edu.start_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competências ATS */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                COMPETÊNCIAS PRINCIPAIS
              </h2>
              <p className="text-xs text-slate-800 leading-relaxed font-mono">
                {skills.join(" • ")}
              </p>
            </div>
          )}

          {/* Idiomas ATS */}
          {languages.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                IDIOMAS
              </h2>
              <p className="text-xs text-slate-800 font-mono">
                {languages
                  .map((l: any) => `${l.name} (${PROFICIENCY_LABELS[l.proficiency] || l.proficiency})`)
                  .join(" • ")}
              </p>
            </div>
          )}

          {/* Rodapé ATS */}
          <div className="mt-auto pt-4 border-t border-slate-200 text-center text-xs text-slate-500 font-mono">
            {profileUrl ? profileUrl.replace(/^https?:\/\//, "") : "Waesy Ecosystem"}
          </div>
        </div>
      );
    }

    // ─── 3. TEMPLATES PADRÃO / EXECUTIVO / EDITORIAL / CRIATIVO ───
    return (
      <div
        ref={ref}
        id="resume-paper"
        className={cn(
          "resume-document-paper w-full max-w-3xl min-h-screen bg-card text-slate-900 border border-slate-200 transition-colors select-text overflow-hidden flex flex-col justify-between",
          fontClass,
          densityPadding,
          className
        )}
      >
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="border-b border-slate-200 pb-5 flex items-start justify-between gap-6">
            <div className="space-y-2 flex-1 min-w-0">
              <h1
                className={cn(
                  "text-2xl sm:text-3xl font-black uppercase tracking-tight break-words",
                  templateId === "creative" ? accentTextClass.split(" ")[0] : "text-slate-900"
                )}
              >
                {fullName || "Nome do Profissional"}
              </h1>
              {headline && (
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-700 uppercase break-words">
                  {headline}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-600 font-medium">
                {email && <span>{email}</span>}
                {phone && <span>• {phone}</span>}
                {(city || state) && (
                  <span>
                    • {city}
                    {state ? `, ${state}` : ""}
                  </span>
                )}
                {website && <span>• {website.replace(/^https?:\/\//, "")}</span>}
              </div>
            </div>

            {avatarUrl && showPhoto && (
              <div className="size-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                <img src={avatarUrl} alt={fullName} className="size-full object-cover" />
              </div>
            )}
          </div>

          {/* Resumo Profissional */}
          {summary && (
            <div className="space-y-2">
              <h2
                className={cn(
                  "text-xs font-bold uppercase tracking-wider border-b pb-1",
                  templateId === "creative" ? accentTextClass : "border-slate-200 text-slate-900"
                )}
              >
                Resumo Profissional
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line text-justify break-words">
                {summary}
              </p>
            </div>
          )}

          {/* Experiência Profissional */}
          {experiences.length > 0 && (
            <div className="space-y-3">
              <h2
                className={cn(
                  "text-xs font-bold uppercase tracking-wider border-b pb-1",
                  templateId === "creative" ? accentTextClass : "border-slate-200 text-slate-900"
                )}
              >
                Trajetória Profissional
              </h2>
              <div className="space-y-4">
                {experiences.map((exp: any, i: number) => (
                  <div key={exp.id || i} className="space-y-1 break-inside-avoid">
                    <div className="flex items-baseline justify-between text-xs gap-2">
                      <span className="font-bold text-slate-900">{exp.title}</span>
                      <span className="text-slate-500 font-mono shrink-0">
                        {exp.start_date} — {exp.is_current ? "Presente" : exp.end_date || ""}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{exp.company}</p>
                    {exp.description && (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line break-words pt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formação Acadêmica */}
          {educations.length > 0 && (
            <div className="space-y-3">
              <h2
                className={cn(
                  "text-xs font-bold uppercase tracking-wider border-b pb-1",
                  templateId === "creative" ? accentTextClass : "border-slate-200 text-slate-900"
                )}
              >
                Formação Acadêmica
              </h2>
              <div className="space-y-2">
                {educations.map((edu: any, i: number) => (
                  <div key={edu.id || i} className="flex justify-between text-xs gap-2 break-inside-avoid">
                    <div>
                      <span className="font-bold text-slate-900">{edu.school}</span>
                      <p className="text-slate-600 text-xs">{edu.field_of_study || edu.degree}</p>
                    </div>
                    <span className="text-slate-500 font-mono shrink-0">{edu.start_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificações */}
          {certifications.length > 0 && (
            <div className="space-y-2">
              <h2
                className={cn(
                  "text-xs font-bold uppercase tracking-wider border-b pb-1",
                  templateId === "creative" ? accentTextClass : "border-slate-200 text-slate-900"
                )}
              >
                Certificações & Credenciais
              </h2>
              <div className="space-y-2">
                {certifications.map((cert: any, i: number) => (
                  <div key={cert.id || i} className="flex justify-between text-xs gap-2 break-inside-avoid">
                    <div>
                      <span className="font-bold text-slate-900">{cert.name}</span>
                      {cert.issuer && <span className="text-slate-500"> — {cert.issuer}</span>}
                    </div>
                    {cert.issue_date && (
                      <span className="text-slate-500 font-mono shrink-0">{cert.issue_date}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registros de Classe */}
          {licenses.length > 0 && (
            <div className="space-y-2">
              <h2
                className={cn(
                  "text-xs font-bold uppercase tracking-wider border-b pb-1",
                  templateId === "creative" ? accentTextClass : "border-slate-200 text-slate-900"
                )}
              >
                Registros de Classe
              </h2>
              <div className="space-y-2">
                {licenses.map((lic: any, i: number) => (
                  <div key={lic.id || i} className="flex justify-between text-xs gap-2 break-inside-avoid">
                    <span className="font-bold text-slate-900">
                      {lic.council} {lic.specialty ? `(${lic.specialty})` : ""}
                    </span>
                    <span className="text-slate-700 font-mono font-bold">
                      {lic.register_number} / {lic.uf}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competências Principais */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <h2
                className={cn(
                  "text-xs font-bold uppercase tracking-wider border-b pb-1",
                  templateId === "creative" ? accentTextClass : "border-slate-200 text-slate-900"
                )}
              >
                Competências Principais
              </h2>
              <div className="flex flex-wrap gap-2 pt-1">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 rounded bg-slate-100 text-slate-800 text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Idiomas */}
          {languages.length > 0 && (
            <div className="space-y-2">
              <h2
                className={cn(
                  "text-xs font-bold uppercase tracking-wider border-b pb-1",
                  templateId === "creative" ? accentTextClass : "border-slate-200 text-slate-900"
                )}
              >
                Idiomas
              </h2>
              <div className="flex flex-wrap gap-2 pt-1">
                {languages.map((lang: any, i: number) => (
                  <div
                    key={lang.id || i}
                    className="px-2 py-1 rounded bg-slate-100 text-slate-800 text-xs flex items-center gap-1 font-medium"
                  >
                    <span className="font-bold">{lang.name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">
                      {PROFICIENCY_LABELS[lang.proficiency] || lang.proficiency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Digital */}
        <div className="pt-6 mt-auto border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Waesy Professional Ecosystem</span>
          <span>{profileUrl ? profileUrl.replace(/^https?:\/\//, "") : ""}</span>
        </div>
      </div>
    );
  }
);

ResumeDocument.displayName = "ResumeDocument";
