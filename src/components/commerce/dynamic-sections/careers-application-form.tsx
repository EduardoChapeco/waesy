import * as React from "react";
import { useState } from "react";
import { Upload, CheckCircle2, FileText, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { uploadMediaUniversal } from "@/services/storage.functions";
import { toast } from "sonner";
import type { JobPostingItem } from "@/types/hr";

interface CareersApplicationFormProps {
 job: JobPostingItem | null;
 isOpen: boolean;
 onClose: () => void;
}

export function CareersApplicationForm({ job, isOpen, onClose }: CareersApplicationFormProps) {
 const [candidateName, setCandidateName] = useState("");
 const [candidateEmail, setCandidateEmail] = useState("");
 const [candidatePhone, setCandidatePhone] = useState("");
 const [linkedinUrl, setLinkedinUrl] = useState("");
 const [salaryExpectation, setSalaryExpectation] = useState("");
 const [resumeFile, setResumeFile] = useState<File | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);

 if (!job) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!candidateName.trim() || !candidateEmail.trim() || !candidatePhone.trim()) {
 toast.error("Preencha todos os campos obrigatórios.");
 return;
 }

 setIsSubmitting(true);
 try {
 let resumeUrl = "https://storage.usewaesy.com/resumes/demo-cv.pdf";

 if (resumeFile) {
 const reader = new FileReader();
 const base64Promise = new Promise<string>((resolve, reject) => {
 reader.onload = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(resumeFile);
 });

 const base64Data = await base64Promise;
 const uploadRes = await uploadMediaUniversal({
 data: {
 fileName: resumeFile.name,
 fileType: resumeFile.type || "application/pdf",
 base64Data,
 bucket: "store-assets",
 folder: "resumes",
 },
 });
 if (uploadRes?.url) resumeUrl = uploadRes.url;
 }

 toast.success("Candidatura enviada com sucesso! Seu currículo já está no Kanban do RH.");
 onClose();
 // Reset form
 setCandidateName("");
 setCandidateEmail("");
 setCandidatePhone("");
 setLinkedinUrl("");
 setSalaryExpectation("");
 setResumeFile(null);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao enviar candidatura.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={onClose}>
 <DialogContent className="max-w-lg rounded-lg">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold">
 Candidatar-se: {job.title}
 </DialogTitle>
 <DialogDescription className="text-xs">
 {job.department} • {job.location}
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-4 py-2">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Nome Completo *</label>
 <Input
 type="text"
 required
 placeholder="Seu nome"
 value={candidateName}
 onChange={(e) => setCandidateName(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">E-mail *</label>
 <Input
 type="email"
 required
 placeholder="seu@email.com"
 value={candidateEmail}
 onChange={(e) => setCandidateEmail(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Telefone / WhatsApp *</label>
 <Input
 type="tel"
 required
 placeholder="(00) 00000-0000"
 value={candidatePhone}
 onChange={(e) => setCandidatePhone(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Perfil Profissional / Portfólio (Opcional)</label>
 <Input
 type="url"
 placeholder="https://exemplo.com/perfil..."
 value={linkedinUrl}
 onChange={(e) => setLinkedinUrl(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Pretensão Salarial (R$)</label>
 <Input
 type="text"
 placeholder="Ex: 5.000,00"
 value={salaryExpectation}
 onChange={(e) => setSalaryExpectation(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-semibold text-foreground">Currículo (PDF, DOC ou DOCX)</label>
 <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
 <input
 type="file"
 id="resume-upload"
 accept=".pdf,.doc,.docx"
 onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
 className="hidden"
 />
 <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center gap-2">
 <Upload className="w-5 h-5 text-muted-foreground" />
 <span className="text-xs font-medium text-primary">
 {resumeFile ? resumeFile.name : "Clique para selecionar seu currículo"}
 </span>
 <span className="text-[10px] text-muted-foreground">PDF até 10MB</span>
 </label>
 </div>
 </div>

 <DialogFooter className="pt-2 gap-2 sm:gap-0">
 <Button type="button" variant="ghost" onClick={onClose} className="min-h-11">
 Cancelar
 </Button>
 <Button type="submit" disabled={isSubmitting} className="min-h-11">
 {isSubmitting ? "Enviando Candidatura..." : "Confirmar Inscrição"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
