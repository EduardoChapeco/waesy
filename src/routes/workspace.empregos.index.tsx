import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, Plus, Users, Eye, MapPin, Building, CheckCircle2, Clock, ArrowRight, Share2 } from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listMyStoreJobs, createStoreJob } from "@/services/jobs.functions";
import { OccupationAutocomplete } from "@/components/profile/occupation-autocomplete";
import { Linkedin, Lock, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { getWorkspaceLinkedInStatus, syndicateJobToLinkedIn } from "@/services/linkedin-integrations.functions";
import { ProUpgradePaywallModal } from "@/components/monetization/pro-upgrade-paywall-modal";

export const Route = createFileRoute("/workspace/empregos/")({
  head: () => ({ meta: [{ title: "Vagas" }] }),
  loader: async () => {
    try {
      const [jobs, linkedInStatus] = await Promise.all([
        listMyStoreJobs().catch(() => []),
        getWorkspaceLinkedInStatus().catch(() => ({
          storeId: "",
          plan: "FREE",
          isPro: false,
          isConnected: false,
        })),
      ]);
      return { jobs: jobs || [], linkedInStatus };
    } catch (err) {
      console.error("[loader:workspace.empregos.index] Unhandled error:", err);
      return { jobs: [], linkedInStatus: { storeId: "", plan: "FREE", isPro: false, isConnected: false } };
    }
  },
  component: WorkspaceJobsPage,
});

function WorkspaceJobsPage() {
  const loaderData = Route.useLoaderData() as any;
  const initialJobs = loaderData?.jobs || (Array.isArray(loaderData) ? loaderData : []);
  const linkedInStatus = loaderData?.linkedInStatus || { isPro: false, isConnected: false };
  const [jobs, setJobs] = useState<any[]>(initialJobs);
  const [syndicateToLinkedIn, setSyndicateToLinkedIn] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isSyndicatingJobId, setIsSyndicatingJobId] = useState<string | null>(null);
  const isPro = Boolean(linkedInStatus?.isPro);
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [category, setCategory] = useState<any>("comercial");
  const [location, setLocation] = useState("São Miguel do Oeste - SC");
  const [workplaceType, setWorkplaceType] = useState<any>("Presencial");
  const [contractType, setContractType] = useState<any>("CLT");
  const [salaryDisplay, setSalaryDisplay] = useState("A combinar");
  const [description, setDescription] = useState("");
  const [requirementDraft, setRequirementDraft] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [benefitDraft, setBenefitDraft] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const resetForm = () => {
    setTitle("");
    setCompanyName("");
    setCategory("comercial");
    setLocation("São Miguel do Oeste - SC");
    setWorkplaceType("Presencial");
    setContractType("CLT");
    setSalaryDisplay("A combinar");
    setDescription("");
    setRequirements([]);
    setBenefits([]);
    setContactWhatsapp("");
    setContactEmail("");
    setIsProcessing(false);
  };

  const handleAddRequirement = () => {
    if (requirementDraft.trim()) {
      setRequirements((prev) => [...prev, requirementDraft.trim()]);
      setRequirementDraft("");
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBenefit = () => {
    if (benefitDraft.trim()) {
      setBenefits((prev) => [...prev, benefitDraft.trim()]);
      setBenefitDraft("");
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  };

  
  const handleSyndicateJob = async (jobId: string) => {
    if (!isPro) {
      setIsPaywallOpen(true);
      return;
    }
    setIsSyndicatingJobId(jobId);
    try {
      const res = await syndicateJobToLinkedIn({ data: { jobId } });
      toast.success(res.message || "Vaga sindicada no LinkedIn com sucesso!");
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, syndicate_to_linkedin: true, linkedin_sync_status: "published", linkedin_published_urn: res.postUrn }
            : j
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Falha ao sindicar no LinkedIn.");
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, linkedin_sync_status: "failed" } : j
        )
      );
    } finally {
      setIsSyndicatingJobId(null);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !companyName.trim() || !description.trim()) {
      toast.error("Preencha título, empresa e descrição da oportunidade.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await createStoreJob({
        data: {
          title: title.trim(),
          company_name: companyName.trim(),
          category,
          location: location.trim(),
          workplace_type: workplaceType,
          contract_type: contractType,
          salary_display: salaryDisplay.trim(),
          description: description.trim(),
          requirements,
          benefits,
          contact_whatsapp: contactWhatsapp.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
        },
      });

      if (syndicateToLinkedIn && res.job?.id && isPro) {
        try {
          await syndicateJobToLinkedIn({ data: { jobId: res.job.id } });
          toast.success("Vaga publicada e sindicada no LinkedIn com sucesso!");
        } catch (liErr: any) {
          toast.warning("Vaga criada, mas sindicação falhou: " + liErr.message);
        }
      } else {
        toast.success(res.message);
      }
      setJobs((prev) => [
        {
          id: res.job.id,
          title: res.job.title,
          company_name: companyName.trim(),
          category,
          location: location.trim(),
          workplace_type: workplaceType,
          contract_type: contractType,
          salary_display: salaryDisplay.trim(),
          status: "active",
          created_at: new Date().toISOString(),
          applications_count: 0,
        },
        ...prev,
      ]);
      setIsNewJobOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao publicar vaga.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalApplications = jobs.reduce((acc, j) => acc + (j.applications_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Recrutamento & Seleção"
          title="Vagas"
        />

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="rounded-xl font-bold text-xs h-9 gap-1.5"
          >
            <Link to="/workspace/empregos/candidatos">
              <Users className="size-3.5 text-primary" />
              <span>Funil de Candidatos ({totalApplications})</span>
            </Link>
          </Button>

          <Button
            onClick={() => setIsNewJobOpen(true)}
            className="rounded-xl font-bold text-xs h-9 bg-primary text-primary-foreground gap-1.5 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Publicar Nova Vaga</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">Vagas Publicadas</span>
          <p className="text-2xl font-black text-foreground">{jobs.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">Candidaturas Recebidas</span>
          <p className="text-2xl font-black text-foreground">{totalApplications}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">Processos Ativos</span>
          <p className="text-2xl font-black text-emerald-600">
            {jobs.filter((j) => j.status === "active").length}
          </p>
        </div>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-border/60 bg-card space-y-3">
          <Briefcase className="size-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-bold text-foreground">Nenhuma vaga publicada ainda</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Publique as vagas abertas na sua empresa para receber candidaturas e perfis profissionais qualificados.
          </p>
          <Button
            onClick={() => setIsNewJobOpen(true)}
            className="rounded-xl text-xs font-bold h-9 mt-2 cursor-pointer"
          >
            <Plus className="size-3.5 mr-1" />
            Publicar Primeira Vaga
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-foreground">
                    {job.title}
                  </h4>
                  <Badge variant={job.status === "active" ? "default" : "secondary"} className="text-[10px] font-bold">
                    {job.status === "active" ? "Publicada" : "Encerrada"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {job.contract_type}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {job.workplace_type}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {job.linkedin_sync_status === "published" && (
                      <Badge variant="outline" className="text-[10px] font-bold border-[#0A66C2]/40 text-[#0A66C2] bg-[#0A66C2]/10 flex items-center gap-1">
                        <Linkedin className="size-2.5 fill-current" />
                        <span>LinkedIn ✓</span>
                      </Badge>
                    )}
                    {job.linkedin_sync_status === "failed" && (
                      <button
                        type="button"
                        onClick={() => handleSyndicateJob(job.id)}
                        className="text-[10px] font-bold text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <AlertCircle className="size-3" />
                        <span>Falha no LinkedIn (Tentar)</span>
                      </button>
                    )}
                  <span className="font-medium">{job.company_name}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {job.location}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-foreground font-semibold">{job.salary_display}</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 shrink-0">
                {job.linkedin_sync_status !== "published" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyndicateJob(job.id)}
                    disabled={isSyndicatingJobId === job.id}
                    className="rounded-xl text-xs font-semibold h-8.5 gap-1.5 border-[#0A66C2]/40 text-[#0A66C2] hover:bg-[#0A66C2]/10 cursor-pointer"
                  >
                    <Linkedin className="size-3 fill-current" />
                    <span>{isSyndicatingJobId === job.id ? "Sindicando..." : "LinkedIn"}</span>
                    {!isPro && <Lock className="size-2.5 text-amber-500" />}
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-8.5 gap-1.5"
                >
                  <Link to="/workspace/empregos/candidatos" search={{ jobId: job.id }}>
                    <Users className="size-3.5 text-primary" />
                    <span>{job.applications_count} {job.applications_count === 1 ? "Candidato" : "Candidatos"}</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs font-semibold h-8.5 gap-1"
                >
                  <Link to="/empregos/$id" params={{ id: job.id }} target="_blank">
                    <Eye className="size-3.5" />
                    <span>Ver Vaga</span>
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Publicar Nova Vaga */}
      <Dialog open={isNewJobOpen} onOpenChange={setIsNewJobOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="size-4 text-primary" />
              <span>Publicar Nova Vaga de Emprego</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sua vaga será publicada instantaneamente no mural de carreiras e vagas da região.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
            {/* Cargo / Título da Vaga com Autocomplete */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Cargo ou Título da Vaga *</Label>
              <OccupationAutocomplete
                value={title}
                onChange={setTitle}
                placeholder="Ex: Desenvolvedor Front-end, Auxiliar Administrativo, Vendedor..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nome da Empresa / Contratante *</Label>
                <Input
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome exibido aos candidatos"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Setor / Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="comercial">Comércio e Vendas</SelectItem>
                    <SelectItem value="clt">Administrativo e CLT</SelectItem>
                    <SelectItem value="tech">TI e Tecnologia</SelectItem>
                    <SelectItem value="operacional">Operacional e Logística</SelectItem>
                    <SelectItem value="saude">Saúde e Clínicas</SelectItem>
                    <SelectItem value="estagio">Estágios e Trainees</SelectItem>
                    <SelectItem value="pj">PJ e Prestação de Serviços</SelectItem>
                    <SelectItem value="outros">Outros Setores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Modelo de Trabalho</Label>
                <Select value={workplaceType} onValueChange={setWorkplaceType}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                    <SelectItem value="Remoto">Remoto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tipo de Contrato</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="Estágio">Estágio</SelectItem>
                    <SelectItem value="Freelancer">Freelancer</SelectItem>
                    <SelectItem value="Temporário">Temporário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Faixa Salarial</Label>
                <Input
                  value={salaryDisplay}
                  onChange={(e) => setSalaryDisplay(e.target.value)}
                  placeholder="Ex: R$ 3.000 a R$ 4.500"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Cidade / Localização</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: São Miguel do Oeste - SC (Centro)"
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Descrição da Vaga & Atividades *</Label>
              <Textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Descreva as responsabilidades da vaga, missão do cargo e o dia a dia..."
                className="rounded-xl text-xs leading-relaxed resize-none"
              />
            </div>

            {/* Requisitos */}
            <div className="space-y-2 pt-1 border-t border-border/40">
              <Label className="text-xs font-bold">Requisitos Obrigatórios ou Desejáveis</Label>
              <div className="flex gap-2">
                <Input
                  value={requirementDraft}
                  onChange={(e) => setRequirementDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRequirement())}
                  placeholder="Ex: Experiência com atendimento ou Ensino Superior em andamento"
                  className="h-8 rounded-xl text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRequirement}
                  className="rounded-xl text-xs h-8 cursor-pointer"
                >
                  Adicionar
                </Button>
              </div>

              {requirements.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {requirements.map((req, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs py-0.5 px-2 rounded-lg gap-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => handleRemoveRequirement(i)}
                      title="Clique para remover"
                    >
                      <span>{req}</span>
                      <span>×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Benefícios */}
            <div className="space-y-2 pt-1 border-t border-border/40">
              <Label className="text-xs font-bold">Benefícios Oferecidos</Label>
              <div className="flex gap-2">
                <Input
                  value={benefitDraft}
                  onChange={(e) => setBenefitDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddBenefit())}
                  placeholder="Ex: Vale Alimentação, Plano de Saúde, Bonificação por Metas"
                  className="h-8 rounded-xl text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBenefit}
                  className="rounded-xl text-xs h-8 cursor-pointer"
                >
                  Adicionar
                </Button>
              </div>

              {benefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {benefits.map((ben, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs py-0.5 px-2 rounded-lg gap-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => handleRemoveBenefit(i)}
                      title="Clique para remover"
                    >
                      <span>{ben}</span>
                      <span>×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsNewJobOpen(false)}
                className="rounded-xl text-xs h-9 cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isProcessing}
                size="sm"
                className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="size-3.5" />
                <span>{isProcessing ? "Publicando vaga..." : "Publicar Vaga no Mural"}</span>
              </Button>
            </DialogFooter>
          
            {/* LinkedIn Omni-Bridge Quick Toggle */}
            <div className="p-3.5 rounded-xl bg-[#0A66C2]/5 border border-[#0A66C2]/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-[#0A66C2] text-white flex items-center justify-center shrink-0">
                  <Linkedin className="size-4 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Publicar no LinkedIn</span>
                    {!isPro && (
                      <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-600 bg-amber-500/10 px-1 py-0 flex items-center gap-0.5">
                        <Lock className="size-2" /> PRO
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Sindica a vaga na Company Page vinculada.
                  </span>
                </div>
              </div>

              {!isPro ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPaywallOpen(true)}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold border-amber-500/40 text-amber-700 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  <Lock className="size-3 mr-1" /> Desbloquear
                </Button>
              ) : (
                <Switch
                  checked={syndicateToLinkedIn}
                  onCheckedChange={setSyndicateToLinkedIn}
                />
              )}
            </div>

          </form>
        </DialogContent>
      </Dialog>

      {/* Paywall Modal */}
      <ProUpgradePaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        featureTitle="Publicação Simultânea no LinkedIn"
        featureDescription="Empresas com plano corporativo PRO publicam suas oportunidades automaticamente no LinkedIn com 1 clique e link de rastreamento."
        source="linkedin_syndication"
      />
    </div>
  );
}
