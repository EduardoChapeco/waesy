import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, Building, MapPin, Clock, DollarSign, Plus, Trash2, ArrowLeft, Share2, CheckCircle2, Lock, Linkedin, AlertCircle, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OccupationAutocomplete } from "@/components/profile/occupation-autocomplete";
import { createStoreJob } from "@/services/jobs.functions";
import { getWorkspaceLinkedInStatus, syndicateJobToLinkedIn } from "@/services/linkedin-integrations.functions";
import { ProUpgradePaywallModal } from "@/components/monetization/pro-upgrade-paywall-modal";

export const Route = createFileRoute("/workspace/empregos/novo")({
  head: () => ({ meta: [{ title: "Nova Vaga de Emprego | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const linkedInStatus = await getWorkspaceLinkedInStatus().catch(() => ({
        storeId: "",
        plan: "FREE",
        isPro: false,
        isConnected: false,
        companyName: null,
        companyId: null,
        lastSyncedAt: null,
        syncStatus: "idle",
        syncError: null,
      }));
      return { linkedInStatus };
    } catch {
      return {
        linkedInStatus: {
          storeId: "",
          plan: "FREE",
          isPro: false,
          isConnected: false,
          companyName: null,
          companyId: null,
          lastSyncedAt: null,
          syncStatus: "idle",
          syncError: null,
        },
      };
    }
  },
  component: WorkspaceNewJobPage,
});

function WorkspaceNewJobPage() {
  const { linkedInStatus } = Route.useLoaderData();
  const navigate = useNavigate();

  // Estados do formulário
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

  // Sindicação LinkedIn & Paywall State
  const [syndicateToLinkedIn, setSyndicateToLinkedIn] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPro = Boolean(linkedInStatus?.isPro);
  const isLinkedInConnected = Boolean(linkedInStatus?.isConnected);

  const handleAddRequirement = () => {
    if (requirementDraft.trim()) {
      setRequirements((prev) => [...prev, requirementDraft.trim()]);
      setRequirementDraft("");
    }
  };

  const handleRemoveRequirement = (idx: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddBenefit = () => {
    if (benefitDraft.trim()) {
      setBenefits((prev) => [...prev, benefitDraft.trim()]);
      setBenefitDraft("");
    }
  };

  const handleRemoveBenefit = (idx: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !companyName.trim() || !description.trim()) {
      toast.error("Preencha título do cargo, empresa e descrição da oportunidade.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Cria a vaga no banco Waesy
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

      const newJobId = res.job?.id;

      // 2. Se a sindicação estiver selecionada e for plano PRO, dispara sindicação
      if (syndicateToLinkedIn && newJobId && isPro) {
        try {
          await syndicateJobToLinkedIn({ data: { jobId: newJobId } });
          toast.success("Vaga publicada com sucesso e sindicada no LinkedIn!");
        } catch (liErr: any) {
          toast.warning(`Vaga criada, mas a sindicação no LinkedIn falhou: ${liErr.message}`);
        }
      } else {
        toast.success(res.message || "Vaga publicada com sucesso no ecossistema!");
      }

      navigate({ to: "/workspace/empregos" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar vaga de emprego.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Header com Navegação Retrô */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Link
            to="/workspace/empregos"
            className="size-9 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Cadastrar Nova Vaga de Emprego
            </h1>
            <p className="text-xs text-muted-foreground">
              Preencha os detalhes e publique no ecossistema e redes profissionais.
            </p>
          </div>
        </div>

        {/* Badge de Plano */}
        <Badge
          variant="outline"
          className={`text-xs px-2.5 py-1 font-bold ${
            isPro
              ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
              : "border-amber-500/40 text-amber-600 bg-amber-500/10"
          }`}
        >
          {isPro ? "Plano PRO Ativo " : "Plano Gratuito"}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloco 1: Informações Gerais */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Briefcase className="size-4 text-primary" />
            <span>Dados da Posição e Perfil</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Cargo da Oportunidade *</Label>
              <OccupationAutocomplete
                value={title}
                onChange={setTitle}
                placeholder="Ex: Desenvolvedor Front-end, Vendedora..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Nome da Empresa Contratante *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Loja Central, Auto Mecânica..."
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Categoria do Negócio</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="comercial">Comercial e Vendas</SelectItem>
                  <SelectItem value="operacional">Operacional e Logística</SelectItem>
                  <SelectItem value="tech">Tecnologia e Inovação</SelectItem>
                  <SelectItem value="saude">Saúde e Bem-Estar</SelectItem>
                  <SelectItem value="estagio">Estágio e Jovem Aprendiz</SelectItem>
                  <SelectItem value="clt">Geral CLT</SelectItem>
                  <SelectItem value="pj">Prestação de Serviços PJ</SelectItem>
                  <SelectItem value="outros">Outros Setores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Localidade (Cidade - UF)</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: São Miguel do Oeste - SC"
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Modelo de Trabalho</Label>
              <Select value={workplaceType} onValueChange={setWorkplaceType}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Presencial">Presencial (No Local)</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                  <SelectItem value="Remoto">100% Remoto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Regime de Contratação</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="CLT">CLT (Efetivo)</SelectItem>
                  <SelectItem value="PJ">PJ (Pessoa Jurídica)</SelectItem>
                  <SelectItem value="Estágio">Estágio</SelectItem>
                  <SelectItem value="Freelancer">Freelancer / Pontual</SelectItem>
                  <SelectItem value="Temporário">Temporário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold text-foreground">Pretensão / Faixa Salarial</Label>
              <Input
                value={salaryDisplay}
                onChange={(e) => setSalaryDisplay(e.target.value)}
                placeholder="Ex: R$ 3.500 a R$ 4.500, A combinar..."
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Descrição, Requisitos & Benefícios */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Descrição da Vaga</h2>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Descrição Detalhada *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a rotina da vaga, principais responsabilidades e o ambiente de trabalho..."
              rows={4}
              className="text-xs rounded-xl resize-none"
              required
            />
          </div>

          {/* Requisitos */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold text-foreground">Requisitos</Label>
            <div className="flex gap-2">
              <Input
                value={requirementDraft}
                onChange={(e) => setRequirementDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRequirement())}
                placeholder="Ex: Ensino Superior em Administração, CNH B..."
                className="h-9 text-xs rounded-xl flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRequirement}
                className="h-9 rounded-xl text-xs font-bold px-3 shrink-0"
              >
                <Plus className="size-3.5 mr-1" /> Adicionar
              </Button>
            </div>

            {requirements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {requirements.map((req, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs font-medium px-2.5 py-1 rounded-xl bg-muted/30 border-border/60 flex items-center gap-1.5"
                  >
                    <span>{req}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Benefícios */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold text-foreground">Benefícios Oferecidos</Label>
            <div className="flex gap-2">
              <Input
                value={benefitDraft}
                onChange={(e) => setBenefitDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddBenefit())}
                placeholder="Ex: Vale Alimentação, Plano de Saúde, Bonificação..."
                className="h-9 text-xs rounded-xl flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBenefit}
                className="h-9 rounded-xl text-xs font-bold px-3 shrink-0"
              >
                <Plus className="size-3.5 mr-1" /> Adicionar
              </Button>
            </div>

            {benefits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {benefits.map((ben, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs font-medium px-2.5 py-1 rounded-xl bg-muted/30 border-border/60 flex items-center gap-1.5"
                  >
                    <span>{ben}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bloco 3: Contato Direto */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Canais Diretos de Contato</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">WhatsApp do RH (Opcional)</Label>
              <Input
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                placeholder="Ex: (49) 99999-9999"
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">E-mail para Currículos (Opcional)</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Ex: vagas@suaempresa.com.br"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* ── Bloco 4: THE LINKEDIN OMNI-BRIDGE (FASE 3 & FASE 4) ── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#0A66C2]/10 via-[#0A66C2]/5 to-card border border-[#0A66C2]/30 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-[#0A66C2] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Linkedin className="size-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Publicar simultaneamente no LinkedIn
                  </h3>
                  {!isPro ? (
                    <Badge variant="outline" className="text-xs font-bold border-amber-500/40 text-amber-600 bg-amber-500/10 px-1.5 py-0 flex items-center gap-1">
                      <Lock className="size-2.5" />
                      <span>Plano PRO</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs font-bold border-emerald-500/40 text-emerald-600 bg-emerald-500/10 px-1.5 py-0">
                      Disponível 
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sindicada automaticamente na sua Company Page com link rastreável que devolve os candidatos para o seu funil no Waesy.
                </p>
              </div>
            </div>

            {/* Toggle ou Trigger de Upgrade */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {!isPro ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaywallOpen(true)}
                  className="rounded-xl text-xs font-bold gap-1.5 h-9 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer"
                >
                  <Lock className="size-3.5" />
                  <span>Desbloquear com PRO</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {syndicateToLinkedIn ? "Ativado" : "Desativado"}
                  </span>
                  <Switch
                    checked={syndicateToLinkedIn}
                    onCheckedChange={setSyndicateToLinkedIn}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Status da Conexão */}
          {isPro && (
            <div className="pt-2 border-t border-border/40 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                {isLinkedInConnected ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Company Page conectada: <strong className="text-foreground">{linkedInStatus.companyName || "LinkedIn"}</strong></span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-3.5 text-amber-500" />
                    <span>Nenhuma Company Page vinculada ao Workspace.</span>
                  </>
                )}
              </div>

              {!isLinkedInConnected && (
                <Link
                  to="/workspace/configuracoes/integracoes"
                  className="text-xs font-semibold text-[#0A66C2] hover:underline flex items-center gap-1"
                >
                  <span>Conectar Página nas Configurações</span>
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Rodapé e Botões de Submissão */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
          <Link to="/workspace/empregos">
            <Button type="button" variant="outline" className="rounded-xl text-xs h-10 px-4">
              Cancelar
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl font-bold text-xs h-10 px-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            <Briefcase className="size-4" />
            <span>{isSubmitting ? "Publicando Vaga..." : "Publicar Vaga de Emprego"}</span>
          </Button>
        </div>
      </form>

      {/* Modal de Paywall para Empresas no Plano Gratuito */}
      <ProUpgradePaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        featureTitle="Publicação Simultânea no LinkedIn"
        featureDescription="Conecte a Company Page da sua empresa e publique vagas automaticamente na maior rede profissional do mundo, com link de rastreamento direto para o funil Waesy."
        source="linkedin_syndication"
      />
    </div>
  );
}
