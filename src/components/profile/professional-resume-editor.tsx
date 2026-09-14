import React, { useState, useMemo } from "react";
import { Briefcase, Star, GraduationCap, Award, Layers, HeartHandshake, Languages as LanguagesIcon, Plus, Trash2, Edit3, ExternalLink, Building2, CheckCircle2, Upload, Calendar, DollarSign, MapPin, FileCheck, Globe, Tag, X, Target, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyField } from "@/components/ui/currency-field";
import { Badge } from "@/components/ui/badge";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "@/components/ui/sheet";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { getPostMediaSignedUrl } from "@/services/storage.functions";
import { searchStoresForCompanyAutocomplete } from "@/services/social.functions";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ResumeDataDTO {
 headline?: string;
 summary?: string;
 hiringStatus?: "none" | "open_to_work" | "open_to_proposals" | "hiring" | "not_looking";
 skills?: string[];
 availability?: {
 jobTitle?: string;
 seniority?: "internship" | "junior" | "mid" | "senior" | "specialist" | "lead" | "director";
 workplacePreference?: "remote" | "hybrid" | "on_site" | "any";
 employmentTypePreference?: "clt" | "pj" | "any" | "freelance";
 salaryExpectationCents?: number;
 immediateStart?: boolean;
 willingToRelocate?: boolean;
 willingToTravel?: boolean;
 open_to_work?: { active?: boolean; roles?: string[] };
 hiring?: { active?: boolean; roles?: string[] };
 providing_services?: { active?: boolean; services?: string[] };
 volunteering?: { active?: boolean };
 };
 experiences?: Array<{
 id: string;
 title: string;
 company: string;
 location?: string;
 location_type?: string;
 employment_type?: string;
 start_date?: string;
 end_date?: string;
 is_current?: boolean;
 description?: string;
 store_id?: string;
 store_logo?: string;
 media_urls?: string[];
 salary_cents?: number;
 exit_reason?: string;
 company_rating?: number;
 would_recommend?: boolean;
 review_text?: string;
 is_anonymous?: boolean;
 }>;
 educations?: Array<{
 id: string;
 school: string;
 degree?: string;
 field_of_study?: string;
 start_date?: string;
 end_date?: string;
 description?: string;
 media_urls?: string[];
 }>;
 certifications?: Array<{
 id: string;
 name: string;
 issuer: string;
 issue_date?: string;
 expiration_date?: string;
 credential_id?: string;
 credential_url?: string;
 }>;
 projects?: Array<{
 id: string;
 title: string;
 start_date?: string;
 end_date?: string;
 is_current?: boolean;
 associated_with?: string;
 project_url?: string;
 description?: string;
 media_urls?: string[];
 }>;
 volunteering?: Array<{
 id: string;
 organization: string;
 role: string;
 cause?: string;
 start_date?: string;
 end_date?: string;
 is_current?: boolean;
 description?: string;
 }>;
 causes?: string[];
 languages?: Array<{
 id: string;
 name: string;
 proficiency: "basic" | "intermediate" | "advanced" | "fluent" | "native";
 }>;
}

const CAUSES_PRESETS = [
 "Educação & Capacitação",
 "Meio Ambiente & Sustentabilidade",
 "Saúde & Bem-Estar",
 "Direitos Humanos",
 "Proteção Animal",
 "Ciência & Tecnologia",
 "Inclusão Social & Diversidade",
 "Artes & Cultura Local",
 "Empreendedorismo Comunitário",
];

const SENIORITY_LABELS: Record<string, string> = {
 internship: "Estágio",
 junior: "Júnior",
 mid: "Pleno",
 senior: "Sênior",
 specialist: "Especialista",
 lead: "Coordenação / Liderança",
 director: "Diretoria / C-Level",
};

const PROFICIENCY_LABELS: Record<string, string> = {
 basic: "Básico",
 intermediate: "Intermediário",
 advanced: "Avançado",
 fluent: "Fluente",
 native: "Nativo",
};

interface ProfessionalResumeEditorProps {
 resumeData: ResumeDataDTO;
 avatarUrl?: string;
 fullName?: string;
 onChange: (updated: ResumeDataDTO) => void;
}

export function ProfessionalResumeEditor({
 resumeData,
 avatarUrl,
 fullName,
 onChange,
}: ProfessionalResumeEditorProps) {
 // Seção sendo editada no modal deslizante
 const [activeModal, setActiveModal] = useState<
 | "availability"
 | "about"
 | "experience"
 | "education"
 | "certification"
 | "project"
 | "volunteering"
 | "causes"
 | "language"
 | null
 >(null);

 // Item ativo no modal (null se estiver adicionando novo)
 const [activeItem, setActiveItem] = useState<any>(null);

 // Estado para tag rápida de habilidades
 const [newSkillInput, setNewSkillInput] = useState("");

 // Normalização de arrays (suporte a educations vs education legado)
 const normalizedEducations = useMemo(() => {
 if (Array.isArray(resumeData.educations) && resumeData.educations.length > 0) {
 return resumeData.educations;
 }
 if (Array.isArray((resumeData as any).education)) {
 return (resumeData as any).education.map((e: any) => ({
 id: e.id || `edu_${Date.now()}_${Math.random()}`,
 school: e.institution || e.school || "",
 degree: e.degree || "",
 field_of_study: e.field_of_study || "",
 start_date: e.start_date || "",
 end_date: e.year || e.end_date || "",
 description: e.description || "",
 }));
 }
 return [];
 }, [resumeData.educations, (resumeData as any).education]);

 const experiences = resumeData.experiences || [];
 const certifications = resumeData.certifications || [];
 const projects = resumeData.projects || [];
 const volunteering = resumeData.volunteering || [];
 const causes = resumeData.causes || [];
 const languages = resumeData.languages || [];
 const skills = resumeData.skills || [];
 const availability = resumeData.availability || {};

 // ── Cálculo da Força do Currículo (Profile Strength: 0 - 100%) ──
 const profileStrength = useMemo(() => {
 let score = 0;
 const tips: string[] = [];

 if (avatarUrl) score += 10;
 else tips.push("Adicione uma foto de perfil profissional");

 if (resumeData.headline?.trim()) score += 10;
 else tips.push("Defina seu título profissional (Headline)");

 if (resumeData.summary?.trim()) score += 10;
 else tips.push("Escreva um resumo sobre sua carreira e conquistas");

 if (availability.jobTitle || availability.salaryExpectationCents || availability.seniority) {
 score += 15;
 } else {
 tips.push("Configure suas metas de carreira e pretensão salarial para matching de vagas");
 }

 if (experiences.length > 0) score += 15;
 else tips.push("Adicione pelo menos 1 experiência profissional");

 if (normalizedEducations.length > 0) score += 10;
 else tips.push("Adicione sua formação acadêmica");

 if (skills.length >= 3) score += 10;
 else tips.push("Adicione pelo menos 3 competências / habilidades");

 if (certifications.length > 0 || projects.length > 0) score += 10;
 else tips.push("Destaque um projeto do seu portfólio ou uma certificação");

 if (languages.length > 0) score += 10;
 else tips.push("Informe seus idiomas e nível de fluência");

 const badge =
 score >= 90
 ? "Perfil Campeão 🏆"
 : score >= 70
 ? "Nível Avançado 🚀"
 : score >= 40
 ? "Nível Intermediário ⚡"
 : "Iniciante 🌱";

 return { score: Math.min(100, score), tips, badge };
 }, [avatarUrl, resumeData, availability, experiences, normalizedEducations, skills, certifications, projects, languages]);

 // Manipulação de Habilidades
 const handleAddSkill = (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 const clean = newSkillInput.trim();
 if (!clean) return;
 if (skills.includes(clean)) {
 toast.info("Esta habilidade já foi adicionada.");
 return;
 }
 onChange({ ...resumeData, skills: [...skills, clean] });
 setNewSkillInput("");
 };

 const handleRemoveSkill = (skillToRemove: string) => {
 onChange({
 ...resumeData,
 skills: skills.filter((s) => s !== skillToRemove),
 });
 };

 return (
 <div className="space-y-8 animate-in fade-in duration-200">
 {/* ── 1. Barra de Força do Currículo (Padrão Executivo Waesy) ── */}
 <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border border-border/60 space-y-3">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <Layers className="size-4 text-primary fill-primary/20" />
 <h3 className="text-sm font-bold text-foreground">Força do Currículo & Visibilidade para Vagas</h3>
 </div>
 <p className="text-xs text-muted-foreground">
 Currículos completos têm 7x mais chances de serem selecionados por empresas e recrutadores no Waesy.
 </p>
 </div>
 <div className="flex items-center gap-2 self-start sm:self-auto">
 <span className="text-sm font-mono font-black text-foreground">{profileStrength.score}%</span>
 <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-background border-primary/30 text-primary">
 {profileStrength.badge}
 </Badge>
 </div>
 </div>

 {/* Barra de Progresso Visual */}
 <div className="w-full h-2.5 rounded-full bg-muted/60 overflow-hidden border border-border/40">
 <div
 className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
 style={{ width: `${profileStrength.score}%` }}
 />
 </div>

 {/* Dicas para 100% Campeão */}
 {profileStrength.tips.length > 0 && (
 <div className="pt-2 border-t border-border/40 space-y-1.5">
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
 O que falta para alcançar 100%:
 </span>
 <div className="flex flex-wrap gap-1.5">
 {profileStrength.tips.map((tip, idx) => (
 <span
 key={idx}
 className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-background/80 border border-border/60 text-muted-foreground flex items-center gap-1"
 >
 <Target className="size-3 text-primary shrink-0" />
 <span>{tip}</span>
 </span>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* ── 2. Metas de Vagas, Pretensão & Status de Carreira (Matching Algorítmico) ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 shadow-none">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Target className="size-4 text-primary" />
 <span>Metas Profissionais & Disponibilidade para Vagas</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Dados estruturados para cruzamento automático com vagas de empresas da região.
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => setActiveModal("availability")}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-3 cursor-pointer"
 >
 <Edit3 className="size-3.5" />
 <span>Editar Metas & Pretensão</span>
 </Button>
 </div>

 {/* Grid de Resumo das Metas */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
 <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Status de Busca</span>
 <div className="flex items-center gap-1.5">
 <span
 className={cn(
 "size-2 rounded-full",
 resumeData.hiringStatus === "open_to_work"
 ? "bg-emerald-500"
 : resumeData.hiringStatus === "hiring"
 ? "bg-blue-500"
 : "bg-muted-foreground"
 )}
 />
 <span className="font-bold text-foreground truncate">
 {resumeData.hiringStatus === "open_to_work"
 ? "🟢 #OpenToWork"
 : resumeData.hiringStatus === "hiring"
 ? "🔵 #Contratando"
 : "Aberto a Propostas"}
 </span>
 </div>
 </div>

 <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Cargo Alvo</span>
 <span className="font-bold text-foreground block truncate">
 {availability.jobTitle || "Não informado"}
 </span>
 </div>

 <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Senioridade / Modelo</span>
 <span className="font-bold text-foreground block truncate">
 {[
 availability.seniority ? SENIORITY_LABELS[availability.seniority] : null,
 availability.workplacePreference === "remote"
 ? "Remoto"
 : availability.workplacePreference === "hybrid"
 ? "Híbrido"
 : availability.workplacePreference === "on_site"
 ? "Presencial"
 : "Qualquer",
 ]
 .filter(Boolean)
 .join(" • ") || "Flexível"}
 </span>
 </div>

 <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Pretensão Salarial</span>
 <span className="font-bold text-foreground block font-mono">
 {availability.salaryExpectationCents
 ? formatMoney(availability.salaryExpectationCents)
 : "A Combinar"}
 </span>
 </div>
 </div>
 </div>

 {/* ── 3. Headline & Resumo (Sobre Mim) ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 shadow-none">
 <div className="flex items-center justify-between pb-3 border-b border-border/40">
 <h3 className="text-sm font-bold text-foreground">Título & Resumo de Apresentação</h3>
 </div>

 <div className="space-y-3">
 <div className="space-y-1">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-muted-foreground">Título Profissional (Headline)</Label>
 <span className="text-[10px] font-mono text-muted-foreground">
 {(resumeData.headline || "").length}/120
 </span>
 </div>
 <Input
 value={resumeData.headline || ""}
 maxLength={120}
 onChange={(e) => onChange({ ...resumeData, headline: e.target.value })}
 placeholder="Ex: Engenheiro de Software Sênior • Especialista em Cloud & Alta Performance"
 className="h-10 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">Resumo Executivo (Sobre Mim)</Label>
 <Textarea
 value={resumeData.summary || ""}
 onChange={(e) => onChange({ ...resumeData, summary: e.target.value })}
 rows={4}
 placeholder="Descreva sua trajetória, principais realizações e diferenciais profissionais..."
 className="rounded-2xl text-xs leading-relaxed resize-none"
 />
 </div>
 </div>
 </div>

 {/* ── 4. Competências & Habilidades (Tags Interativas) ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-3 shadow-none">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Tag className="size-4 text-primary" />
 <span>Competências & Habilidades ({skills.length})</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Palavras-chave essenciais usadas por recrutadores nos filtros de busca.
 </p>
 </div>
 </div>

 <form onSubmit={handleAddSkill} className="flex gap-2">
 <Input
 value={newSkillInput}
 onChange={(e) => setNewSkillInput(e.target.value)}
 placeholder="Digite uma habilidade e pressione Enter (ex: React, Vendas, Gestão de Projetos)"
 className="h-9 rounded-xl text-xs flex-1"
 />
 <Button
 type="submit"
 size="sm"
 variant="outline"
 className="rounded-xl text-xs font-bold h-9 px-3 gap-1"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </form>

 {skills.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-2">
 Nenhuma habilidade adicionada. Digite acima para criar tags.
 </p>
 ) : (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {skills.map((skill, idx) => (
 <Badge
 key={idx}
 variant="secondary"
 className="rounded-lg text-xs font-medium pl-2.5 pr-1 py-1 gap-1.5 bg-muted/60 text-foreground hover:bg-muted"
 >
 <span>{skill}</span>
 <button
 type="button"
 onClick={() => handleRemoveSkill(skill)}
 className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
 >
 <X className="size-2.5" />
 </button>
 </Badge>
 ))}
 </div>
 )}
 </div>

 {/* ── 5. Experiências Profissionais ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 shadow-none">
 <div className="flex items-center justify-between pb-3 border-b border-border/40">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Building2 className="size-4 text-primary" />
 <span>Experiências Profissionais ({experiences.length})</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Histórico de cargos com vínculo a empresas e lojas da região.
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 setActiveItem(null);
 setActiveModal("experience");
 }}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-3 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </div>

 {experiences.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-3 text-center bg-muted/20 rounded-2xl">
 Nenhuma experiência profissional cadastrada até o momento.
 </p>
 ) : (
 <div className="space-y-3">
 {experiences.map((exp, idx) => (
 <div
 key={exp.id || idx}
 className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-start justify-between gap-3 hover:border-border transition-colors"
 >
 <div className="flex items-start gap-3 min-w-0">
 <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 border border-border/40 overflow-hidden">
 {exp.store_logo ? (
 <img src={exp.store_logo} alt={exp.company} className="size-full object-cover" />
 ) : (
 <Building2 className="size-5 text-muted-foreground" />
 )}
 </div>
 <div className="space-y-1 min-w-0">
 <h4 className="text-sm font-bold text-foreground leading-tight truncate">
 {exp.title}
 </h4>
 <p className="text-xs font-semibold text-foreground/80 truncate">
 {exp.company} {exp.employment_type && `• ${exp.employment_type}`}
 </p>
 <p className="text-[11px] font-mono text-muted-foreground">
 {exp.start_date || "Data inicial"} – {exp.is_current ? "Atualmente" : exp.end_date || "Presente"}
 {exp.location && ` • ${exp.location}`}
 </p>
 {exp.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
 {exp.description}
 </p>
 )}
 </div>
 </div>

 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => {
 setActiveItem(exp);
 setActiveModal("experience");
 }}
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
 >
 <Edit3 className="size-3.5" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── 6. Formação Acadêmica ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 shadow-none">
 <div className="flex items-center justify-between pb-3 border-b border-border/40">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <GraduationCap className="size-4 text-primary" />
 <span>Formação Acadêmica ({normalizedEducations.length})</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Graduação, pós-graduação, cursos técnicos e certificações acadêmicas.
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 setActiveItem(null);
 setActiveModal("education");
 }}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-3 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </div>

 {normalizedEducations.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-3 text-center bg-muted/20 rounded-2xl">
 Nenhuma formação acadêmica cadastrada.
 </p>
 ) : (
 <div className="space-y-3">
 {normalizedEducations.map((edu: any, idx: number) => (
 <div
 key={edu.id || idx}
 className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-start justify-between gap-3 hover:border-border transition-colors"
 >
 <div className="flex items-start gap-3 min-w-0">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
 <GraduationCap className="size-5" />
 </div>
 <div className="space-y-1 min-w-0">
 <h4 className="text-sm font-bold text-foreground leading-tight truncate">
 {edu.school}
 </h4>
 <p className="text-xs font-semibold text-foreground/80 truncate">
 {[edu.degree, edu.field_of_study].filter(Boolean).join(" em ")}
 </p>
 <p className="text-[11px] font-mono text-muted-foreground">
 {edu.start_date ? `${edu.start_date} – ` : ""}
 {edu.end_date || "Presente"}
 </p>
 </div>
 </div>

 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => {
 setActiveItem(edu);
 setActiveModal("education");
 }}
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
 >
 <Edit3 className="size-3.5" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── 7. Licenças & Certificados ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 shadow-none">
 <div className="flex items-center justify-between pb-3 border-b border-border/40">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Award className="size-4 text-amber-500" />
 <span>Licenças & Certificados ({certifications.length})</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Certificações técnicas, licenças profissionais e órgãos emissores.
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 setActiveItem(null);
 setActiveModal("certification");
 }}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-3 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </div>

 {certifications.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-3 text-center bg-muted/20 rounded-2xl">
 Nenhum certificado ou licença cadastrado.
 </p>
 ) : (
 <div className="space-y-3">
 {certifications.map((cert, idx) => (
 <div
 key={cert.id || idx}
 className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-start justify-between gap-3 hover:border-border transition-colors"
 >
 <div className="flex items-start gap-3 min-w-0">
 <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
 <Award className="size-5" />
 </div>
 <div className="space-y-1 min-w-0">
 <h4 className="text-sm font-bold text-foreground leading-tight truncate">
 {cert.name}
 </h4>
 <p className="text-xs font-semibold text-foreground/80 truncate">
 {cert.issuer}
 </p>
 <p className="text-[11px] font-mono text-muted-foreground">
 Emitido em {cert.issue_date || "Data a definir"}
 </p>
 {cert.credential_url && (
 <a
 href={cert.credential_url}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-0.5"
 >
 <span>Exibir Credencial</span>
 <ExternalLink className="size-3" />
 </a>
 )}
 </div>
 </div>

 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => {
 setActiveItem(cert);
 setActiveModal("certification");
 }}
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
 >
 <Edit3 className="size-3.5" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── 8. Projetos & Portfólio (com Mídia & Recorte) ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 shadow-none">
 <div className="flex items-center justify-between pb-3 border-b border-border/40">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Layers className="size-4 text-violet-500" />
 <span>Projetos em Destaque & Portfólio ({projects.length})</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Cases, criações e trabalhos de impacto com links externos e imagens.
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 setActiveItem(null);
 setActiveModal("project");
 }}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-3 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </div>

 {projects.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-3 text-center bg-muted/20 rounded-2xl">
 Nenhum projeto cadastrado no portfólio.
 </p>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {projects.map((proj, idx) => (
 <div
 key={proj.id || idx}
 className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-2.5 flex flex-col justify-between hover:border-border transition-colors"
 >
 <div className="space-y-2">
 <div className="flex items-start justify-between gap-2">
 <h4 className="text-sm font-bold text-foreground leading-tight">
 {proj.title}
 </h4>
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => {
 setActiveItem(proj);
 setActiveModal("project");
 }}
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
 >
 <Edit3 className="size-3.5" />
 </Button>
 </div>

 {proj.associated_with && (
 <span className="text-xs text-muted-foreground block">
 Vinculado a: <strong>{proj.associated_with}</strong>
 </span>
 )}

 {proj.description && (
 <p className="text-xs text-muted-foreground line-clamp-3">
 {proj.description}
 </p>
 )}

 {/* Mídias / Fotos do Projeto */}
 {proj.media_urls && proj.media_urls.length > 0 && (
 <div className="flex gap-2 pt-1 overflow-x-auto no-scrollbar">
 {proj.media_urls.map((mUrl, mIdx) => (
 <div
 key={mIdx}
 className="size-16 rounded-xl overflow-hidden bg-muted/40 border border-border/40 shrink-0"
 >
 <img src={mUrl} alt="Mídia do projeto" className="size-full object-cover" />
 </div>
 ))}
 </div>
 )}
 </div>

 {proj.project_url && (
 <a
 href={proj.project_url}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-2 border-t border-border/40"
 >
 <span>Ver Projeto Online</span>
 <ExternalLink className="size-3" />
 </a>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── 9. Voluntariado & Causas Sociais ── */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Voluntariado */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-3 shadow-none">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <HeartHandshake className="size-4 text-rose-500" />
 <span>Voluntariado ({volunteering.length})</span>
 </h3>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 setActiveItem(null);
 setActiveModal("volunteering");
 }}
 className="rounded-xl text-xs font-bold gap-1 h-7 px-2.5 cursor-pointer"
 >
 <Plus className="size-3" />
 <span>Adicionar</span>
 </Button>
 </div>

 {volunteering.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-3 text-center">
 Nenhum voluntariado cadastrado.
 </p>
 ) : (
 <div className="space-y-2">
 {volunteering.map((vol, idx) => (
 <div
 key={vol.id || idx}
 className="p-3 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-2"
 >
 <div className="min-w-0">
 <span className="text-xs font-bold text-foreground block truncate">
 {vol.role} • {vol.organization}
 </span>
 <span className="text-[10px] text-muted-foreground block font-mono">
 {vol.cause || "Causa social"}
 </span>
 </div>
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => {
 setActiveItem(vol);
 setActiveModal("volunteering");
 }}
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
 >
 <Edit3 className="size-3" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Causas Sociais */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-3 shadow-none">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Layers className="size-4 text-emerald-500" />
 <span>Causas que Apoio ({causes.length})</span>
 </h3>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => setActiveModal("causes")}
 className="rounded-xl text-xs font-bold gap-1 h-7 px-2.5 cursor-pointer"
 >
 <Edit3 className="size-3" />
 <span>Editar</span>
 </Button>
 </div>

 {causes.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-3 text-center">
 Nenhuma causa social selecionada.
 </p>
 ) : (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {causes.map((c, idx) => (
 <Badge
 key={idx}
 variant="outline"
 className="rounded-lg text-xs font-medium py-1 px-2.5 bg-muted/40 text-foreground border-border/60"
 >
 {c}
 </Badge>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* ── 10. Idiomas & Proficiência ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 shadow-none">
 <div className="flex items-center justify-between pb-3 border-b border-border/40">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <LanguagesIcon className="size-4 text-sky-500" />
 <span>Idiomas ({languages.length})</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Nível de proficiência para comunicação e negócios internacionais.
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 setActiveItem(null);
 setActiveModal("language");
 }}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 px-3 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </div>

 {languages.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-3 text-center bg-muted/20 rounded-2xl">
 Nenhum idioma cadastrado.
 </p>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {languages.map((lang, idx) => (
 <div
 key={lang.id || idx}
 className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between gap-2"
 >
 <div>
 <h4 className="text-xs font-bold text-foreground">{lang.name}</h4>
 <span className="text-[11px] font-mono text-muted-foreground capitalize">
 {PROFICIENCY_LABELS[lang.proficiency] || lang.proficiency}
 </span>
 </div>
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => {
 setActiveItem(lang);
 setActiveModal("language");
 }}
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
 >
 <Edit3 className="size-3" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── MODAIS DESLIZANTES DE EDIÇÃO (SHEETS) ── */}

 {/* 1. Modal Disponibilidade & Vagas */}
 <AvailabilityEditSheet
 open={activeModal === "availability"}
 onOpenChange={(op) => !op && setActiveModal(null)}
 initialData={availability}
 hiringStatus={resumeData.hiringStatus}
 onSave={(newAvail, newHiringStatus) => {
 onChange({
 ...resumeData,
 availability: newAvail,
 hiringStatus: newHiringStatus,
 });
 setActiveModal(null);
 toast.success("Metas profissionais e disponibilidade salvas!");
 }}
 />

 {/* 2. Modal Experiência Profissional */}
 <ExperienceEditSheet
 open={activeModal === "experience"}
 onOpenChange={(op) => !op && setActiveModal(null)}
 item={activeItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...experiences];
 if (isDelete && activeItem) {
 updated = updated.filter((e) => e.id !== activeItem.id);
 } else if (activeItem) {
 updated = updated.map((e) => (e.id === activeItem.id ? itemToSave : e));
 } else {
 updated = [itemToSave, ...updated];
 }
 onChange({ ...resumeData, experiences: updated });
 setActiveModal(null);
 toast.success(isDelete ? "Experiência removida!" : "Experiência salva com sucesso!");
 }}
 />

 {/* 3. Modal Formação Acadêmica */}
 <EducationEditSheet
 open={activeModal === "education"}
 onOpenChange={(op) => !op && setActiveModal(null)}
 item={activeItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...normalizedEducations];
 if (isDelete && activeItem) {
 updated = updated.filter((e) => e.id !== activeItem.id);
 } else if (activeItem) {
 updated = updated.map((e) => (e.id === activeItem.id ? itemToSave : e));
 } else {
 updated = [itemToSave, ...updated];
 }
 onChange({
 ...resumeData,
 educations: updated,
 });
 setActiveModal(null);
 toast.success(isDelete ? "Formação removida!" : "Formação salva com sucesso!");
 }}
 />

 {/* 4. Modal Licenças & Certificados */}
 <CertificationEditSheet
 open={activeModal === "certification"}
 onOpenChange={(op) => !op && setActiveModal(null)}
 item={activeItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...certifications];
 if (isDelete && activeItem) {
 updated = updated.filter((c) => c.id !== activeItem.id);
 } else if (activeItem) {
 updated = updated.map((c) => (c.id === activeItem.id ? itemToSave : c));
 } else {
 updated = [itemToSave, ...updated];
 }
 onChange({ ...resumeData, certifications: updated });
 setActiveModal(null);
 toast.success(isDelete ? "Certificação removida!" : "Certificação salva com sucesso!");
 }}
 />

 {/* 5. Modal Projetos & Portfólio */}
 <ProjectEditSheet
 open={activeModal === "project"}
 onOpenChange={(op) => !op && setActiveModal(null)}
 item={activeItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...projects];
 if (isDelete && activeItem) {
 updated = updated.filter((p) => p.id !== activeItem.id);
 } else if (activeItem) {
 updated = updated.map((p) => (p.id === activeItem.id ? itemToSave : p));
 } else {
 updated = [itemToSave, ...updated];
 }
 onChange({ ...resumeData, projects: updated });
 setActiveModal(null);
 toast.success(isDelete ? "Projeto removido!" : "Projeto salvo com sucesso!");
 }}
 />

 {/* 6. Modal Voluntariado */}
 <VolunteeringEditSheet
 open={activeModal === "volunteering"}
 onOpenChange={(op) => !op && setActiveModal(null)}
 item={activeItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...volunteering];
 if (isDelete && activeItem) {
 updated = updated.filter((v) => v.id !== activeItem.id);
 } else if (activeItem) {
 updated = updated.map((v) => (v.id === activeItem.id ? itemToSave : v));
 } else {
 updated = [itemToSave, ...updated];
 }
 onChange({ ...resumeData, volunteering: updated });
 setActiveModal(null);
 toast.success(isDelete ? "Voluntariado removido!" : "Voluntariado salvo com sucesso!");
 }}
 />

 {/* 7. Modal Causas Sociais */}
 <CausesEditSheet
 open={activeModal === "causes"}
 onOpenChange={(op) => !op && setActiveModal(null)}
 initialCauses={causes}
 onSave={(newCauses) => {
 onChange({ ...resumeData, causes: newCauses });
 setActiveModal(null);
 toast.success("Causas atualizadas!");
 }}
 />

 {/* 8. Modal Idiomas */}
 <LanguageEditSheet
 open={activeModal === "language"}
 onOpenChange={(op) => !op && setActiveModal(null)}
 item={activeItem}
 onSave={(itemToSave, isDelete) => {
 let updated = [...languages];
 if (isDelete && activeItem) {
 updated = updated.filter((l) => l.id !== activeItem.id);
 } else if (activeItem) {
 updated = updated.map((l) => (l.id === activeItem.id ? itemToSave : l));
 } else {
 updated = [itemToSave, ...updated];
 }
 onChange({ ...resumeData, languages: updated });
 setActiveModal(null);
 toast.success(isDelete ? "Idioma removido!" : "Idioma salvo com sucesso!");
 }}
 />
 </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES DE MODAIS / SHEETS (PADRÃO EXECUTIVO ENTERPRISE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Modal de Disponibilidade & Oportunidades
 */
function AvailabilityEditSheet({
 open,
 onOpenChange,
 initialData,
 hiringStatus,
 onSave,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 initialData: any;
 hiringStatus?: string;
 onSave: (availability: any, hiringStatus: any) => void;
}) {
 const [status, setStatus] = useState(hiringStatus || "open_to_work");
 const [jobTitle, setJobTitle] = useState(initialData?.jobTitle || "");
 const [seniority, setSeniority] = useState(initialData?.seniority || "mid");
 const [workplacePreference, setWorkplacePreference] = useState(initialData?.workplacePreference || "any");
 const [employmentTypePreference, setEmploymentTypePreference] = useState(initialData?.employmentTypePreference || "any");
 const [salaryExpectation, setSalaryExpectation] = useState(
 initialData?.salaryExpectationCents ? (initialData.salaryExpectationCents / 100).toString() : ""
 );
 const [immediateStart, setImmediateStart] = useState(Boolean(initialData?.immediateStart));
 const [willingToRelocate, setWillingToRelocate] = useState(Boolean(initialData?.willingToRelocate));
 const [willingToTravel, setWillingToTravel] = useState(Boolean(initialData?.willingToTravel));

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const salaryCents = salaryExpectation
 ? Math.round(parseFloat(salaryExpectation.replace(/\D/g, "")))
 : undefined;

 onSave(
 {
 ...initialData,
 jobTitle: jobTitle.trim() || undefined,
 seniority,
 workplacePreference,
 employmentTypePreference,
 salaryExpectationCents: salaryCents,
 immediateStart,
 willingToRelocate,
 willingToTravel,
 },
 status
 );
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0">
 <SheetTitle className="text-base font-bold">Metas Profissionais & Vagas</SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Defina suas pretensões salariais e modelo de trabalho para cruzamento com oportunidades.
 </SheetDescription>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
 {/* Status de Busca */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Status Atual de Carreira</Label>
 <Select value={status} onValueChange={setStatus}>
 <SelectTrigger className="h-9 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="open_to_work">🟢 #OpenToWork (Buscando recolocação ativa)</SelectItem>
 <SelectItem value="open_to_proposals">🟡 Aberto a Novas Propostas</SelectItem>
 <SelectItem value="hiring">🔵 #Contratando Talentos (Recrutador / Empresa)</SelectItem>
 <SelectItem value="not_looking">⚪ Não Disponível no Momento</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Cargo Alvo */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Cargo ou Função Desejada *</Label>
 <Input
 value={jobTitle}
 onChange={(e) => setJobTitle(e.target.value)}
 placeholder="Ex: Gerente Comercial, Analista de Dados, Desenvolvedor"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 {/* Senioridade e Regime */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Senioridade</Label>
 <Select value={seniority} onValueChange={setSeniority}>
 <SelectTrigger className="h-9 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="internship">Estágio / Trainee</SelectItem>
 <SelectItem value="junior">Júnior</SelectItem>
 <SelectItem value="mid">Pleno</SelectItem>
 <SelectItem value="senior">Sênior</SelectItem>
 <SelectItem value="specialist">Especialista</SelectItem>
 <SelectItem value="lead">Coordenação / Liderança</SelectItem>
 <SelectItem value="director">Diretoria / C-Level</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Modalidade Aceita</Label>
 <Select value={workplacePreference} onValueChange={setWorkplacePreference}>
 <SelectTrigger className="h-9 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="any">Qualquer Modalidade</SelectItem>
 <SelectItem value="remote">Somente Remoto</SelectItem>
 <SelectItem value="hybrid">Híbrido</SelectItem>
 <SelectItem value="on_site">Presencial</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Pretensão Salarial */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Pretensão Salarial Mensal (R$)</Label>
 <Input
 value={salaryExpectation}
 onChange={(e) => setSalaryExpectation(e.target.value)}
 placeholder="Ex: 5500,00"
 className="h-9 rounded-xl text-xs font-mono"
 />
 </div>

 {/* Checkboxes de Disponibilidade */}
 <div className="pt-2 space-y-2.5">
 <label className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/40 cursor-pointer">
 <input
 type="checkbox"
 checked={immediateStart}
 onChange={(e) => setImmediateStart(e.target.checked)}
 className="size-4 rounded-md accent-primary"
 />
 <span className="text-xs font-medium text-foreground">
 Disponível para início imediato
 </span>
 </label>

 <label className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/40 cursor-pointer">
 <input
 type="checkbox"
 checked={willingToRelocate}
 onChange={(e) => setWillingToRelocate(e.target.checked)}
 className="size-4 rounded-md accent-primary"
 />
 <span className="text-xs font-medium text-foreground">
 Aceita mudança de cidade / estado (Relocation)
 </span>
 </label>

 <label className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/40 cursor-pointer">
 <input
 type="checkbox"
 checked={willingToTravel}
 onChange={(e) => setWillingToTravel(e.target.checked)}
 className="size-4 rounded-md accent-primary"
 />
 <span className="text-xs font-medium text-foreground">
 Disponibilidade para viagens a trabalho
 </span>
 </label>
 </div>
 </div>

 <div className="p-4 border-t border-border/40 flex items-center justify-end gap-2 shrink-0">
 <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
 Cancelar
 </Button>
 <Button type="submit" size="sm" className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground">
 Salvar Metas
 </Button>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

/**
 * Modal de Experiência Profissional
 */
function ExperienceEditSheet({
  open,
  onOpenChange,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (op: boolean) => void;
  item: any;
  onSave: (item: any, isDelete?: boolean) => void;
}) {
  const [title, setTitle] = useState(item?.title || "");
  const [company, setCompany] = useState(item?.company || "");
  const [storeId, setStoreId] = useState(item?.store_id || "");
  const [storeLogo, setStoreLogo] = useState(item?.store_logo || "");
  const [employmentType, setEmploymentType] = useState(item?.employment_type || "CLT");
  const [location, setLocation] = useState(item?.location || "");
  const [locationType, setLocationType] = useState(item?.location_type || "No local");
  const [isCurrent, setIsCurrent] = useState(item?.is_current !== false);
  const [startDate, setStartDate] = useState(item?.start_date || "");
  const [endDate, setEndDate] = useState(item?.end_date || "");
  const [description, setDescription] = useState(item?.description || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Campos de Inteligência de Empregadores e Cultura
  const [salaryCents, setSalaryCents] = useState<number | undefined>(item?.salary_cents);
  const [exitReason, setExitReason] = useState<string>(item?.exit_reason || "");
  const [companyRating, setCompanyRating] = useState<number>(item?.company_rating || 0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(item?.would_recommend ?? true);
  const [reviewText, setReviewText] = useState<string>(item?.review_text || "");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(item?.is_anonymous ?? false);

  // Sincroniza ao abrir
  React.useEffect(() => {
    if (open) {
      setTitle(item?.title || "");
      setCompany(item?.company || "");
      setStoreId(item?.store_id || "");
      setStoreLogo(item?.store_logo || "");
      setEmploymentType(item?.employment_type || "CLT");
      setLocation(item?.location || "");
      setLocationType(item?.location_type || "No local");
      setIsCurrent(item?.is_current !== false);
      setStartDate(item?.start_date || "");
      setEndDate(item?.end_date || "");
      setDescription(item?.description || "");
      setSalaryCents(item?.salary_cents);
      setExitReason(item?.exit_reason || "");
      setCompanyRating(item?.company_rating || 0);
      setWouldRecommend(item?.would_recommend ?? true);
      setReviewText(item?.review_text || "");
      setIsAnonymous(item?.is_anonymous ?? false);
    }
  }, [open, item]);

  const handleCompanyChange = async (val: string) => {
    setCompany(val);
    if (val.trim().length >= 2) {
      try {
        const list = await searchStoresForCompanyAutocomplete({ data: { query: val } });
        setSuggestions(list || []);
      } catch {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectStore = (s: any) => {
    setCompany(s.name);
    setStoreId(s.id);
    setStoreLogo(s.logo_url || "");
    if (s.city || s.state) {
      setLocation([s.city, s.state].filter(Boolean).join(", "));
    }
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) {
      toast.error("Preencha cargo e empresa.");
      return;
    }

    onSave({
      id: item?.id || `exp_${Date.now()}`,
      title: title.trim(),
      company: company.trim(),
      store_id: storeId || undefined,
      store_logo: storeLogo || undefined,
      employment_type: employmentType,
      location: location.trim() || undefined,
      location_type: locationType,
      is_current: isCurrent,
      start_date: startDate.trim() || undefined,
      end_date: isCurrent ? "Atual" : endDate.trim() || undefined,
      description: description.trim() || undefined,
      media_urls: item?.media_urls || [],
      salary_cents: salaryCents || undefined,
      exit_reason: isCurrent ? undefined : (exitReason.trim() || undefined),
      company_rating: companyRating > 0 ? companyRating : undefined,
      would_recommend: wouldRecommend,
      review_text: reviewText.trim() || undefined,
      is_anonymous: isAnonymous,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
        <div className="p-6 pb-4 border-b border-border/40 shrink-0">
          <SheetTitle className="text-base font-bold">
            {item ? "Editar Experiência" : "Nova Experiência Profissional"}
          </SheetTitle>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Cargo *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Coordenador de Marketing"
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5 relative">
              <Label className="text-xs font-bold">Empresa / Negócio *</Label>
              <Input
                value={company}
                onChange={(e) => handleCompanyChange(e.target.value)}
                placeholder="Digite o nome da empresa..."
                className="h-9 rounded-xl text-xs"
              />

              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl bg-popover border border-border shadow-lg p-1 space-y-0.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStore(s)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs flex items-center gap-2 cursor-pointer"
                    >
                      {s.logo_url && <img src={s.logo_url} alt="" className="size-5 rounded-md object-cover" />}
                      <span className="font-bold">{s.name}</span>
                      <Badge variant="secondary" className="text-[9px] ml-auto">Empresa Waesy</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Regime de Contratação</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="CLT">CLT (Efetivo)</SelectItem>
                    <SelectItem value="PJ">PJ (Pessoa Jurídica)</SelectItem>
                    <SelectItem value="Estágio">Estágio</SelectItem>
                    <SelectItem value="Freelance">Autônomo / Freelance</SelectItem>
                    <SelectItem value="Temporário">Temporário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Localidade</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Chapecó, SC"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Data Início</Label>
                <Input
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Ex: Jan 2022"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Data Fim</Label>
                <Input
                  disabled={isCurrent}
                  value={isCurrent ? "Atual" : endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Ex: Dez 2024"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="size-4 rounded-md accent-primary"
              />
              <span className="text-xs font-medium text-foreground">Trabalho atualmente nesta empresa</span>
            </label>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-bold">Descrição das Realizações e Atividades</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Destaque seus projetos liderados, metas alcançadas e tecnologias utilizadas..."
                className="rounded-xl text-xs resize-none"
              />
            </div>

            {/* ── Avaliação da Empresa & Transparência Corporativa ── */}
            <div className="pt-4 border-t border-border/40 space-y-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" />
                  <span>Avaliação & Salário (Comunidade de Talentos)</span>
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">Opcional</span>
              </div>

              {/* Campo de Salário */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-foreground/80">
                  Remuneração / Salário Mensal (R$)
                </Label>
                <CurrencyField
                  value={salaryCents || 0}
                  onChange={(val) => setSalaryCents(val && val > 0 ? val : undefined)}
                  placeholder="R$ 0,00"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Motivo de Saída (se não for trabalho atual) */}
              {!isCurrent && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-foreground/80">
                    Motivo da Saída
                  </Label>
                  <Select value={exitReason} onValueChange={setExitReason}>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Selecione o motivo..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Transição de Carreira">Transição de Carreira</SelectItem>
                      <SelectItem value="Proposta Mais Atraente">Proposta Mais Atraente</SelectItem>
                      <SelectItem value="Mudança Geográfica / Familiar">Mudança Geográfica / Familiar</SelectItem>
                      <SelectItem value="Desligamento sem Justa Causa">Desligamento sem Justa Causa</SelectItem>
                      <SelectItem value="Fim de Contrato / Estágio">Fim de Contrato / Estágio</SelectItem>
                      <SelectItem value="Fechamento de Unidade / Reestruturação">Fechamento de Unidade / Reestruturação</SelectItem>
                      <SelectItem value="Busca por Novos Desafios">Busca por Novos Desafios</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Avaliação em Estrelas (1 a 5) */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-foreground/80">
                  Como você avalia sua experiência trabalhando nesta empresa?
                </Label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCompanyRating(star === companyRating ? 0 : star)}
                      className="p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title={`${star} estrela${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={cn(
                          "size-5 transition-colors",
                          star <= companyRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40 hover:text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                  {companyRating > 0 && (
                    <span className="text-xs font-mono font-bold text-amber-500 ml-2">
                      {companyRating}.0 / 5.0
                    </span>
                  )}
                </div>
              </div>

              {/* Recomendação */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wouldRecommend}
                  onChange={(e) => setWouldRecommend(e.target.checked)}
                  className="size-4 rounded-md accent-primary"
                />
                <span className="text-xs font-medium text-foreground">
                  Eu recomendaria trabalhar nesta empresa para amigos ou conhecidos
                </span>
              </label>

              {/* Review / Feedback Cultural */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-foreground/80">
                  Comentário sobre ambiente, cultura ou liderança
                </Label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={2}
                  placeholder="O que os futuros candidatos deveriam saber sobre o clima organizacional?"
                  className="rounded-xl text-xs resize-none"
                />
              </div>

              {/* Anonimato */}
              <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-muted/30 border border-border/40">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="size-4 rounded-md accent-primary"
                />
                <span className="text-xs font-medium text-foreground">
                  Manter meu nome anônimo nos rankings comunitários de empresas
                </span>
              </label>
            </div>
          </div>

          <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0">
            {item ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSave(null, true)}
                className="text-destructive text-xs hover:bg-destructive/10 rounded-xl"
              >
                <Trash2 className="size-3.5 mr-1" /> Excluir
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground">
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Modal de Formação Acadêmica
 */
function EducationEditSheet({
 open,
 onOpenChange,
 item,
 onSave,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
}) {
 const [school, setSchool] = useState(item?.school || "");
 const [degree, setDegree] = useState(item?.degree || "Bacharelado");
 const [fieldOfStudy, setFieldOfStudy] = useState(item?.field_of_study || "");
 const [startDate, setStartDate] = useState(item?.start_date || "");
 const [endDate, setEndDate] = useState(item?.end_date || "");
 const [description, setDescription] = useState(item?.description || "");

 React.useEffect(() => {
 if (open) {
 setSchool(item?.school || "");
 setDegree(item?.degree || "Bacharelado");
 setFieldOfStudy(item?.field_of_study || "");
 setStartDate(item?.start_date || "");
 setEndDate(item?.end_date || "");
 setDescription(item?.description || "");
 }
 }, [open, item]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!school.trim()) {
 toast.error("Informe o nome da instituição de ensino.");
 return;
 }

 onSave({
 id: item?.id || `edu_${Date.now()}`,
 school: school.trim(),
 degree: degree.trim() || undefined,
 field_of_study: fieldOfStudy.trim() || undefined,
 start_date: startDate.trim() || undefined,
 end_date: endDate.trim() || undefined,
 description: description.trim() || undefined,
 media_urls: item?.media_urls || [],
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0">
 <SheetTitle className="text-base font-bold">
 {item ? "Editar Formação" : "Nova Formação Acadêmica"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Instituição de Ensino *</Label>
 <Input
 value={school}
 onChange={(e) => setSchool(e.target.value)}
 placeholder="Ex: UFFS, UNOCHAPECÓ, USP, Harvard"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Grau / Formação</Label>
 <Select value={degree} onValueChange={setDegree}>
 <SelectTrigger className="h-9 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="Bacharelado">Bacharelado</SelectItem>
 <SelectItem value="Licenciatura">Licenciatura</SelectItem>
 <SelectItem value="Tecnólogo">Tecnólogo</SelectItem>
 <SelectItem value="Pós-Graduação / MBA">Pós-Graduação / MBA</SelectItem>
 <SelectItem value="Mestrado">Mestrado</SelectItem>
 <SelectItem value="Doutorado">Doutorado</SelectItem>
 <SelectItem value="Ensino Médio / Técnico">Ensino Médio / Técnico</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Curso / Área de Estudo</Label>
 <Input
 value={fieldOfStudy}
 onChange={(e) => setFieldOfStudy(e.target.value)}
 placeholder="Ex: Administração, Ciência da Computação"
 className="h-9 rounded-xl text-xs"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Ano Início</Label>
 <Input
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 placeholder="Ex: 2020"
 className="h-9 rounded-xl text-xs font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Ano Conclusão</Label>
 <Input
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 placeholder="Ex: 2024"
 className="h-9 rounded-xl text-xs font-mono"
 />
 </div>
 </div>

 <div className="space-y-1.5 pt-2">
 <Label className="text-xs font-bold">Atividades e Sociedades</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={3}
 placeholder="Iniciação científica, projetos acadêmicos ou trabalho de conclusão..."
 className="rounded-xl text-xs resize-none"
 />
 </div>
 </div>

 <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0">
 {item ? (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onSave(null, true)}
 className="text-destructive text-xs hover:bg-destructive/10 rounded-xl"
 >
 <Trash2 className="size-3.5 mr-1" /> Excluir
 </Button>
 ) : <div />}

 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
 Cancelar
 </Button>
 <Button type="submit" size="sm" className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground">
 Salvar
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

/**
 * Modal de Licenças & Certificados
 */
function CertificationEditSheet({
 open,
 onOpenChange,
 item,
 onSave,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
}) {
 const [name, setName] = useState(item?.name || "");
 const [issuer, setIssuer] = useState(item?.issuer || "");
 const [issueDate, setIssueDate] = useState(item?.issue_date || "");
 const [credentialUrl, setCredentialUrl] = useState(item?.credential_url || "");

 React.useEffect(() => {
 if (open) {
 setName(item?.name || "");
 setIssuer(item?.issuer || "");
 setIssueDate(item?.issue_date || "");
 setCredentialUrl(item?.credential_url || "");
 }
 }, [open, item]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim() || !issuer.trim()) {
 toast.error("Informe o nome do certificado e emissor.");
 return;
 }

 onSave({
 id: item?.id || `cert_${Date.now()}`,
 name: name.trim(),
 issuer: issuer.trim(),
 issue_date: issueDate.trim() || undefined,
 credential_url: credentialUrl.trim() || undefined,
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0">
 <SheetTitle className="text-base font-bold">
 {item ? "Editar Certificação" : "Nova Licença ou Certificado"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Nome do Certificado *</Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: AWS Solutions Architect, Scrum Master, Google Analytics"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Organização Emissora *</Label>
 <Input
 value={issuer}
 onChange={(e) => setIssuer(e.target.value)}
 placeholder="Ex: Amazon Web Services, Scrum Alliance, Alura"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Data de Emissão</Label>
 <Input
 value={issueDate}
 onChange={(e) => setIssueDate(e.target.value)}
 placeholder="Ex: Mai 2024"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">URL de Verificação da Credencial</Label>
 <Input
 value={credentialUrl}
 onChange={(e) => setCredentialUrl(e.target.value)}
 placeholder="https://..."
 className="h-9 rounded-xl text-xs"
 />
 </div>
 </div>

 <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0">
 {item ? (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onSave(null, true)}
 className="text-destructive text-xs hover:bg-destructive/10 rounded-xl"
 >
 <Trash2 className="size-3.5 mr-1" /> Excluir
 </Button>
 ) : <div />}

 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
 Cancelar
 </Button>
 <Button type="submit" size="sm" className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground">
 Salvar
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

/**
 * Modal de Projetos & Portfólio (com Upload e Recorte)
 */
function ProjectEditSheet({
 open,
 onOpenChange,
 item,
 onSave,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
}) {
 const [title, setTitle] = useState(item?.title || "");
 const [associatedWith, setAssociatedWith] = useState(item?.associated_with || "");
 const [projectUrl, setProjectUrl] = useState(item?.project_url || "");
 const [description, setDescription] = useState(item?.description || "");
 const [mediaUrls, setMediaUrls] = useState<string[]>(item?.media_urls || []);
 const [isUploading, setIsUploading] = useState(false);

 // Recorte de foto de projeto
 const [cropperOpen, setCropperOpen] = useState(false);
 const [cropperSrc, setCropperSrc] = useState<string | null>(null);

 React.useEffect(() => {
 if (open) {
 setTitle(item?.title || "");
 setAssociatedWith(item?.associated_with || "");
 setProjectUrl(item?.project_url || "");
 setDescription(item?.description || "");
 setMediaUrls(item?.media_urls || []);
 }
 }, [open, item]);

 const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = () => {
 setCropperSrc(reader.result as string);
 setCropperOpen(true);
 };
 reader.readAsDataURL(file);
 e.target.value = "";
 };

 const handleCropComplete = async (blob: Blob) => {
 setCropperOpen(false);
 setIsUploading(true);
 try {
 const file = new File([blob], `proj_${Date.now()}.png`, { type: "image/png" });
 const { signedUrl, publicUrl } = await getPostMediaSignedUrl({
 data: { fileName: file.name, contentType: "image/png" },
 });
 const res = await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": "image/png" } });
 if (!res.ok) throw new Error("Erro no upload");
 setMediaUrls((prev) => [...prev, publicUrl]);
 toast.success("Foto do projeto adicionada!");
 } catch {
 toast.error("Falha no upload da foto do projeto.");
 } finally {
 setIsUploading(false);
 }
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) {
 toast.error("Informe o título do projeto.");
 return;
 }

 onSave({
 id: item?.id || `proj_${Date.now()}`,
 title: title.trim(),
 associated_with: associatedWith.trim() || undefined,
 project_url: projectUrl.trim() || undefined,
 description: description.trim() || undefined,
 media_urls: mediaUrls,
 });
 };

 return (
 <>
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0">
 <SheetTitle className="text-base font-bold">
 {item ? "Editar Projeto" : "Novo Projeto / Portfólio"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Título do Projeto *</Label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Plataforma de E-commerce B2B"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Empresa / Negócio Vinculado</Label>
 <Input
 value={associatedWith}
 onChange={(e) => setAssociatedWith(e.target.value)}
 placeholder="Ex: Projeto autônomo ou Empresa X"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Link do Projeto (GitHub, Behance, Site)</Label>
 <Input
 value={projectUrl}
 onChange={(e) => setProjectUrl(e.target.value)}
 placeholder="https://..."
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Descrição do Case</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={4}
 placeholder="Explique o desafio resolvido, arquitetura e resultados alcançados..."
 className="rounded-xl text-xs resize-none"
 />
 </div>

 {/* Mídias com Recorte Contextual */}
 <div className="space-y-2 pt-1">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold">Fotos / Mídias do Projeto</Label>
 <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-xs font-bold text-foreground cursor-pointer transition-colors">
 <Upload className="size-3.5" />
 <span>{isUploading ? "Enviando..." : "+ Foto com Recorte"}</span>
 <input type="file" accept="image/*" onChange={handleSelectFile} className="hidden" />
 </label>
 </div>

 {mediaUrls.length > 0 ? (
 <div className="flex flex-wrap gap-2 pt-1">
 {mediaUrls.map((url, idx) => (
 <div key={idx} className="relative group size-20 rounded-xl overflow-hidden border border-border/60">
 <img src={url} alt="" className="size-full object-cover" />
 <button
 type="button"
 onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
 className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
 >
 <Trash2 className="size-4" />
 </button>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-[11px] text-muted-foreground italic">
 Nenhuma imagem anexada. Adicione capturas de tela do seu trabalho.
 </p>
 )}
 </div>
 </div>

 <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0">
 {item ? (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onSave(null, true)}
 className="text-destructive text-xs hover:bg-destructive/10 rounded-xl"
 >
 <Trash2 className="size-3.5 mr-1" /> Excluir
 </Button>
 ) : <div />}

 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
 Cancelar
 </Button>
 <Button type="submit" size="sm" className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground">
 Salvar
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>

 {/* Recortador com proporção 16:9 ideal para projetos */}
 <ImageCropperDialog
 open={cropperOpen}
 onOpenChange={setCropperOpen}
 imageSrc={cropperSrc}
 aspectRatio={16 / 9}
 title="Enquadrar Foto do Projeto (16:9)"
 onCropComplete={handleCropComplete}
 />
 </>
 );
}

/**
 * Modal de Voluntariado
 */
function VolunteeringEditSheet({
 open,
 onOpenChange,
 item,
 onSave,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
}) {
 const [organization, setOrganization] = useState(item?.organization || "");
 const [role, setRole] = useState(item?.role || "");
 const [cause, setCause] = useState(item?.cause || "");

 React.useEffect(() => {
 if (open) {
 setOrganization(item?.organization || "");
 setRole(item?.role || "");
 setCause(item?.cause || "");
 }
 }, [open, item]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!organization.trim() || !role.trim()) {
 toast.error("Informe organização e papel.");
 return;
 }

 onSave({
 id: item?.id || `vol_${Date.now()}`,
 organization: organization.trim(),
 role: role.trim(),
 cause: cause.trim() || undefined,
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0">
 <SheetTitle className="text-base font-bold">
 {item ? "Editar Voluntariado" : "Novo Trabalho Voluntário"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Organização / Instituição *</Label>
 <Input
 value={organization}
 onChange={(e) => setOrganization(e.target.value)}
 placeholder="Ex: Cruz Vermelha, ONG Amigos dos Animais"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Papel / Função *</Label>
 <Input
 value={role}
 onChange={(e) => setRole(e.target.value)}
 placeholder="Ex: Mentor de Jovens, Coordenador de Doações"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Causa Social Defendida</Label>
 <Input
 value={cause}
 onChange={(e) => setCause(e.target.value)}
 placeholder="Ex: Educação Infantil, Proteção Animal"
 className="h-9 rounded-xl text-xs"
 />
 </div>
 </div>

 <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0">
 {item ? (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onSave(null, true)}
 className="text-destructive text-xs hover:bg-destructive/10 rounded-xl"
 >
 <Trash2 className="size-3.5 mr-1" /> Excluir
 </Button>
 ) : <div />}

 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
 Cancelar
 </Button>
 <Button type="submit" size="sm" className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground">
 Salvar
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}

/**
 * Modal de Causas Sociais
 */
function CausesEditSheet({
 open,
 onOpenChange,
 initialCauses,
 onSave,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 initialCauses: string[];
 onSave: (causes: string[]) => void;
}) {
 const [selected, setSelected] = useState<string[]>(initialCauses || []);

 React.useEffect(() => {
 if (open) setSelected(initialCauses || []);
 }, [open, initialCauses]);

 const toggleCause = (cause: string) => {
 if (selected.includes(cause)) {
 setSelected(selected.filter((c) => c !== cause));
 } else {
 setSelected([...selected, cause]);
 }
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0">
 <SheetTitle className="text-base font-bold">Causas que Você Apoia</SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Selecione as causas que representam seus valores e propósito de vida.
 </SheetDescription>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-2.5">
 {CAUSES_PRESETS.map((cause) => {
 const isChecked = selected.includes(cause);
 return (
 <button
 key={cause}
 type="button"
 onClick={() => toggleCause(cause)}
 className={cn(
 "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs font-semibold cursor-pointer",
 isChecked
 ? "bg-primary/10 border-primary text-primary"
 : "bg-muted/30 border-border/40 text-foreground hover:bg-muted/60"
 )}
 >
 <span>{cause}</span>
 {isChecked && <CheckCircle2 className="size-4 text-primary" />}
 </button>
 );
 })}
 </div>

 <div className="p-4 border-t border-border/40 flex items-center justify-end gap-2 shrink-0">
 <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
 Cancelar
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={() => onSave(selected)}
 className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground"
 >
 Salvar Causas
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}

/**
 * Modal de Idiomas
 */
function LanguageEditSheet({
 open,
 onOpenChange,
 item,
 onSave,
}: {
 open: boolean;
 onOpenChange: (op: boolean) => void;
 item: any;
 onSave: (item: any, isDelete?: boolean) => void;
}) {
 const [name, setName] = useState(item?.name || "");
 const [proficiency, setProficiency] = useState<any>(item?.proficiency || "intermediate");

 React.useEffect(() => {
 if (open) {
 setName(item?.name || "");
 setProficiency(item?.proficiency || "intermediate");
 }
 }, [open, item]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) {
 toast.error("Informe o nome do idioma.");
 return;
 }

 onSave({
 id: item?.id || `lang_${Date.now()}`,
 name: name.trim(),
 proficiency,
 });
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border">
 <div className="p-6 pb-4 border-b border-border/40 shrink-0">
 <SheetTitle className="text-base font-bold">
 {item ? "Editar Idioma" : "Novo Idioma"}
 </SheetTitle>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Idioma *</Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Inglês, Espanhol, Alemão, Italiano"
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Nível de Fluência / Proficiência</Label>
 <Select value={proficiency} onValueChange={setProficiency}>
 <SelectTrigger className="h-9 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="basic">Básico</SelectItem>
 <SelectItem value="intermediate">Intermediário</SelectItem>
 <SelectItem value="advanced">Avançado</SelectItem>
 <SelectItem value="fluent">Fluente</SelectItem>
 <SelectItem value="native">Nativo / Bilíngue</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0">
 {item ? (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onSave(null, true)}
 className="text-destructive text-xs hover:bg-destructive/10 rounded-xl"
 >
 <Trash2 className="size-3.5 mr-1" /> Excluir
 </Button>
 ) : <div />}

 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
 Cancelar
 </Button>
 <Button type="submit" size="sm" className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground">
 Salvar
 </Button>
 </div>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 );
}
