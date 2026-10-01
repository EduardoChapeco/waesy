import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, User, Upload, MessageCircle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyToClassifiedJob } from "@/services/classifieds.functions";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface ClassifiedJobApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classified: any;
  currentProfile: any;
  viewerContext: string;
}

export function ClassifiedJobApplicationDialog({
  open,
  onOpenChange,
  classified,
  currentProfile,
  viewerContext,
}: ClassifiedJobApplicationDialogProps) {
  const [activeTab, setActiveTab] = useState<"perfil_waesy" | "upload_cv" | "whatsapp">("perfil_waesy");
  const [candidateName, setCandidateName] = useState(currentProfile?.fullName || currentProfile?.full_name || "");
  const [candidateEmail, setCandidateEmail] = useState(currentProfile?.email || "");
  const [candidatePhone, setCandidatePhone] = useState(currentProfile?.phone || "");
  const [candidateEducation, setCandidateEducation] = useState("superior_completo");
  const [candidateExperience, setCandidateExperience] = useState("1_a_2_anos");
  const [candidateRole, setCandidateRole] = useState(currentProfile?.occupation || "");
  const [cvFileUrl, setCvFileUrl] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitApplication = async () => {
    if ((!candidateName.trim())) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if ((!candidateEmail.trim()) && (!candidatePhone.trim())) {
      toast.error("Informe ao menos um e-mail ou telefone para contato.");
      return;
    }

    setIsSubmitting(true);
    try {
      await applyToClassifiedJob({
        data: {
          classified_id: classified.id,
          candidate_name: candidateName.trim(),
          candidate_email: candidateEmail.trim() || undefined,
          candidate_phone: candidatePhone.trim() || undefined,
          education_level: candidateEducation,
          experience_years: candidateExperience,
          candidate_role: candidateRole.trim() || undefined,
          resume_url: activeTab === "upload_cv" ? cvFileUrl.trim() || undefined : undefined,
          cover_note: coverNote.trim() || undefined,
        },
      });

      toast.success("Candidatura enviada com sucesso! O recrutador foi notificado.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar candidatura.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppApplication = () => {
    const phone = classified?.contact_whatsapp || classified?.whatsapp || classified?.profiles?.phone;
    if ((!phone)) {
      toast.error("Telefone de WhatsApp do anunciante não disponível.");
      return;
    }
    const message = `Olá! Vi a vaga "${classified?.title}" no Waesy e gostaria de me candidatar.\n\nNome: ${candidateName || "Interessado"}\nÁrea: ${candidateRole || "Candidato"}${coverNote ? `\nNota: ${coverNote}` : ""}`;
    trackAndOpenWhatsApp({
      phone,
      message,
      storeId: classified?.store_id,
      productId: classified?.id,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-lg max-h-screen overflow-y-auto">
        {viewerContext === "anonymous" && activeTab !== "whatsapp" ? (
          <div className="text-center py-6 space-y-4">
            <Briefcase className="size-10 text-primary mx-auto" />
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                Identifique-se para se candidatar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Faça login para preencher sua candidatura com 1 clique usando seu perfil profissional.
              </DialogDescription>
            </div>
            <Button
              asChild
              className="w-full h-11 rounded-lg font-bold bg-primary text-primary-foreground text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link
                to="/entrar"
                search={{ returnUrl: `/classificados/${classified?.id}` }}
              >
                Entrar na Minha Conta
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Briefcase className="size-5 text-primary" />
                <span>Candidatura para Vaga</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {classified?.title} — {classified?.store_name || "Anunciante Waesy"}
              </DialogDescription>
            </DialogHeader>

            {/* Seletor de Abas Funcionais (Zero Placeholders) */}
            <div className="flex border-b border-border gap-2 pt-2">
              <button /* focus-visible: */
                type="button"
                onClick={() => setActiveTab("perfil_waesy")} /* focus-visible: */
                className={cn(
                  "px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeTab === "perfil_waesy"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="size-3.5" />
                <span>Perfil Waesy</span>
              </button>
              <button /* focus-visible: */
                type="button"
                onClick={() => setActiveTab("upload_cv")} /* focus-visible: */
                className={cn(
                  "px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeTab === "upload_cv"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Upload className="size-3.5" />
                <span>Enviar Currículo</span>
              </button>
              <button /* focus-visible: */
                type="button"
                onClick={() => setActiveTab("whatsapp")} /* focus-visible: */
                className={cn(
                  "px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeTab === "whatsapp"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageCircle className="size-3.5" />
                <span>Via WhatsApp</span>
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Seu nome..."
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo / Especialidade</Label>
                  <Input
                    value={candidateRole}
                    onChange={(e) => setCandidateRole(e.target.value)}
                    placeholder="Ex: Vendedor, Motorista..."
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone / WhatsApp</Label>
                  <Input
                    value={candidatePhone}
                    onChange={(e) => setCandidatePhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
              </div>

              {activeTab === "upload_cv" && (
                <div className="space-y-2">
                  <Label>Link do Currículo (PDF / LinkedIn / Drive)</Label>
                  <Input
                    value={cvFileUrl}
                    onChange={(e) => setCvFileUrl(e.target.value)}
                    placeholder="https://drive.google.com/... ou https://linkedin.com/in/..."
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Escolaridade</Label>
                  <Select value={candidateEducation} onValueChange={setCandidateEducation}>
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                      <SelectItem value="medio_completo">Ensino Médio Completo</SelectItem>
                      <SelectItem value="tecnico">Técnico / Profissionalizante</SelectItem>
                      <SelectItem value="superior_incompleto">Superior em Andamento</SelectItem>
                      <SelectItem value="superior_completo">Superior Completo</SelectItem>
                      <SelectItem value="pos_graduacao">Pós-Graduação / Especialização</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Experiência na Área</Label>
                  <Select value={candidateExperience} onValueChange={setCandidateExperience}>
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem_experiencia">Primeiro Emprego / Sem Experiência</SelectItem>
                      <SelectItem value="menos_de_1_ano">Menos de 1 ano</SelectItem>
                      <SelectItem value="1_a_2_anos">1 a 2 anos</SelectItem>
                      <SelectItem value="3_a_5_anos">3 a 5 anos</SelectItem>
                      <SelectItem value="mais_de_5_anos">Mais de 5 anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Carta de Apresentação / Mensagem</Label>
                <Textarea
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Conte um pouco sobre sua trajetória e interesse nesta oportunidade..."
                  rows={3}
                  className="rounded-lg text-xs resize-none"
                />
              </div>

              {activeTab === "whatsapp" ? (
                <Button
                  onClick={handleWhatsAppApplication} /* focus-visible: */
                  className="w-full h-11 rounded-lg text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageCircle className="size-4" />
                  <span>Enviar Apresentação via WhatsApp</span>
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitApplication} /* focus-visible: */
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      <span>Enviando Candidatura...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>Confirmar Envio da Candidatura</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
