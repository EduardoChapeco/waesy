import * as React from "react";
import { useState } from "react";
import { Briefcase, MapPin, DollarSign, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CareersApplicationForm } from "./careers-application-form";
import { cn } from "@/lib/utils";
import type { JobPostingItem } from "@/types/hr";
export type { JobPostingItem };

interface CareersJobGridProps {
 content?: {
 jobs?: JobPostingItem[];
 };
 design_tokens?: any;
}

export function CareersJobGrid({ content, design_tokens }: CareersJobGridProps) {
 const [selectedJob, setSelectedJob] = useState<JobPostingItem | null>(null);
 const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

 const jobs: JobPostingItem[] = Array.isArray(content?.jobs) ? content.jobs : [];
 return (
  <div className={cn("w-full max-w-5xl mx-auto py-6 px-4", design_tokens?.className)}>
   {jobs.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {jobs.map((job) => (
 <div
 key={job.id}
 className="p-6 rounded-lg border border-border/70 bg-card hover:border-primary/50 transition-colors duration-200 duration-200  flex flex-col justify-between gap-5 group"
 >
 <div className="space-y-3">
 <div className="flex items-center gap-2 flex-wrap">
 <Badge variant="secondary" className="text-2xs font-normal">
 {job.department}
 </Badge>
 <Badge variant="outline" className="text-2xs font-normal border-primary/30 text-primary">
 {job.work_model === "remote" ? "Remoto" : job.work_model === "hybrid" ? "Híbrido" : "Presencial"}
 </Badge>
 <Badge variant="outline" className="text-2xs font-normal">
 {job.employment_type.toUpperCase()}
 </Badge>
 </div>

 <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
 {job.title}
 </h3>

 <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
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
 className="w-full min-h-11 gap-2 font-medium"
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
 ) : (
 <div className="py-12 px-4 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 space-y-3">
  <Briefcase className="size-8 text-muted-foreground mx-auto" />
  <div className="space-y-1">
   <h4 className="text-sm font-semibold text-foreground">Nenhuma vaga aberta no momento</h4>
   <p className="text-xs text-muted-foreground max-w-md mx-auto">
    Esta empresa ainda não possui oportunidades ativas publicadas. Volte em breve para novas posições.
   </p>
  </div>
 </div>
 )}

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
