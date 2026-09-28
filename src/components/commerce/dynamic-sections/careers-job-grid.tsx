import * as React from "react";
import { useState } from "react";
import { Briefcase, MapPin, DollarSign, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CareersApplicationForm } from "./careers-application-form";
import { cn } from "@/lib/utils";

export interface JobPostingItem {
 id: string;
 title: string;
 department: string;
 location: string;
 work_model: "on_site" | "remote" | "hybrid";
 employment_type: "clt" | "pj" | "internship" | "temporary";
 salary_range?: string;
 description_markdown?: string;
}

interface CareersJobGridProps {
 content?: {
 jobs?: JobPostingItem[];
 };
 design_tokens?: any;
}

export function CareersJobGrid({ content, design_tokens }: CareersJobGridProps) {
 const [selectedJob, setSelectedJob] = useState<JobPostingItem | null>(null);
 const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

 const jobs: JobPostingItem[] = content?.jobs || [
 {
 id: "job-1",
 title: "Consultor de Vendas e Turismo Senior",
 department: "Comercial & Vendas",
 location: "São Paulo, SP",
 work_model: "hybrid",
 employment_type: "clt",
 salary_range: "R$ 4.500 - R$ 7.000 + Comissões",
 description_markdown: "Responsável por atendimento consultivo a clientes, montagem de pacotes personalizados e fechamento de contratos.",
 },
 {
 id: "job-2",
 title: "Desenvolvedor Full-Stack React / Node",
 department: "Engenharia & Produto",
 location: "Remoto (Brasil)",
 work_model: "remote",
 employment_type: "pj",
 salary_range: "R$ 9.000 - R$ 14.000",
 description_markdown: "Atuação direta na evolução do motor de experiências e Server Functions do ecossistema Waesy.",
 },
 {
 id: "job-3",
 title: "Analista de Expedição e WMS",
 department: "Operações & Logística",
 location: "Campinas, SP",
 work_model: "on_site",
 employment_type: "clt",
 salary_range: "R$ 3.200 - R$ 4.000",
 description_markdown: "Separação de pedidos com leitor de código de barras, conferência e emissão de romaneio de transporte.",
 },
 ];

 return (
 <div className={cn("w-full max-w-5xl mx-auto py-6 px-4", design_tokens?.className)}>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {jobs.map((job) => (
 <div
 key={job.id}
 className="p-6 rounded-2xl border border-border/70 bg-card hover:border-primary/50 transition-all duration-200 shadow-sm flex flex-col justify-between gap-5 group"
 >
 <div className="space-y-3">
 <div className="flex items-center gap-2 flex-wrap">
 <Badge variant="secondary" className="text-[11px] font-normal">
 {job.department}
 </Badge>
 <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
 {job.work_model === "remote" ? "Remoto" : job.work_model === "hybrid" ? "Híbrido" : "Presencial"}
 </Badge>
 <Badge variant="outline" className="text-[11px] font-normal">
 {job.employment_type.toUpperCase()}
 </Badge>
 </div>

 <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
 {job.title}
 </h3>

 <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5">
 <span className="flex items-center gap-1">
 <MapPin className="w-3.5 h-3.5" />
 {job.location}
 </span>
 {job.salary_range && (
 <span className="flex items-center gap-1 font-medium text-foreground">
 <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
 {job.salary_range}
 </span>
 )}
 </div>

 {job.description_markdown && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {job.description_markdown}
 </p>
 )}
 </div>

 <Button
 className="w-full min-h-[44px] gap-2 font-medium"
 onClick={() => {
 setSelectedJob(job);
 setIsApplyModalOpen(true);
 }}
 >
 Candidatar-se a esta Vaga
 <ArrowRight className="w-4 h-4" />
 </Button>
 </div>
 ))}
 </div>

 <CareersApplicationForm
 job={selectedJob}
 isOpen={isApplyModalOpen}
 onClose={() => {
 setIsApplyModalOpen(false);
 setSelectedJob(null);
 }}
 />
 </div>
 );
}
