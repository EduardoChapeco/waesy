import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Users, UserPlus, ShieldCheck, ShieldAlert, Trash2, Mail, User, CheckCircle2, Lock, ArrowRight, Layers, Info, RefreshCw, Building2, Briefcase, ExternalLink, Wallet, Plus, Edit3 } from 'lucide-react';
import {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  listContractors,
  upsertContractor,
  deleteContractor,
} from "@/services/admin-team.functions";
import { listMyStoreJobs, createStoreJob } from "@/services/jobs.functions";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/commerce/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SheetPage } from "@/components/ui/sheet-page";
import { ImageUpload } from "@/components/ui/image-upload";
import { Link } from "@tanstack/react-router";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/configuracoes/equipe")({
 head: () => ({
 meta: [
 { title: "Equipe, Folha & Recrutamento | Workspace Waesy" },
 { name: "description", content: "Gerencie os membros, cargos, folha de pagamento e vagas de emprego da sua loja." },
 ],
 }),
  loader: async () => {
    try {
      const [members, jobs, contractors] = await Promise.all([
        listTeamMembers().catch(() => []),
        listMyStoreJobs().catch(() => []),
        listContractors().catch(() => []),
      ]);
      return { members: members || [], jobs: jobs || [], contractors: contractors || [] };
    } catch {
      return { members: [], jobs: [], contractors: [] };
    }
  },
 component: WorkspaceTeamPage,
});

const ROLE_DEFINITIONS: Record<
 string,
 { label: string; description: string; color: string }
> = {
 owner: {
 label: "Proprietário(a)",
 description: "Acesso total irrestrito, faturamento e gestão da loja",
 color: "bg-primary/15 text-primary border-primary/30",
 },
 admin: {
 label: "Administrador",
 description: "Gestão operacional completa, produtos, pedidos e equipe",
 color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
 },
 manager: {
 label: "Gerente",
 description: "Operação do catálogo, pedidos, estoque e relatórios",
 color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
 },
 seller: {
 label: "Vendedor / PDV",
 description: "Frente de caixa, criação de pedidos e atendimento",
 color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
 },
 finance: {
 label: "Financeiro",
 description: "Extratos, fluxo de caixa, pagamentos e conciliação",
 color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
 },
 stock: {
 label: "Estoque & Expedição",
 description: "Controle de inventário, reposição e despacho de entregas",
 color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
 },
 content: {
 label: "Marketing & Conteúdo",
 description: "Criação de banners, histórias, cupons e vitrines",
 color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
 },
 support: {
 label: "Suporte ao Cliente",
 description: "Visualização de pedidos e suporte pós-venda",
 color: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
 },
};

export default function WorkspaceTeamPage() {
  const { members, jobs, contractors } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"members" | "contractors" | "jobs">("members");

  // Estados dos Prestadores Terceirizados (Persona Nexus Port)
  const [contractorsList, setContractorsList] = useState<any[]>(contractors || []);
  const [isContractorOpen, setIsContractorOpen] = useState(false);
  const [isSavingContractor, setIsSavingContractor] = useState(false);
  const [contractorForm, setContractorForm] = useState({
    id: undefined as string | undefined,
    name: "",
    serviceCategory: "outro" as any,
    documentNumber: "",
    contactPhone: "",
    contactEmail: "",
    hourlyRateCents: 0,
    fixedFeeCents: 0,
    pixKey: "",
    status: "active" as any,
    notes: "",
  });

  // Estados do Modal de Convite
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "admin" | "manager" | "seller" | "finance" | "content" | "stock" | "support"
  >("seller");
  const [isInviting, setIsInviting] = useState(false);

 // Estados do Modal de Criação de Vaga
 const [isJobOpen, setIsJobOpen] = useState(false);
 const [isCreatingJob, setIsCreatingJob] = useState(false);
 const [jobForm, setJobForm] = useState({
 title: "",
 company_name: "",
 category: "comercial" as any,
 location: "Chapecó / SC",
 workplace_type: "Presencial" as any,
 contract_type: "CLT" as any,
 salary_display: "R$ 2.500 - R$ 3.500",
 description: "",
 requirements: "Experiência prévia na função\nBoa comunicação\nDisponibilidade de horário",
 benefits: "Vale Transporte\nVale Alimentação\nComissão sobre vendas",
 contact_whatsapp: "",
 contact_email: "",
 });

 // Estados de Remoção
 const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
 const [isRemoving, setIsRemoving] = useState(false);

 const handleInviteSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!inviteEmail.trim() || !inviteName.trim()) {
 toast.error("Preencha o nome e o e-mail do colaborador.");
 return;
 }

 setIsInviting(true);
 try {
 await inviteTeamMember({
 data: {
 email: inviteEmail.trim(),
 fullName: inviteName.trim(),
 role: inviteRole,
 },
 });

 toast.success("Colaborador vinculado à sua loja com sucesso!");
 setIsInviteOpen(false);
 setInviteEmail("");
 setInviteName("");
 setInviteRole("seller");
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao convidar colaborador.");
 } finally {
 setIsInviting(false);
 }
 };

 const handleCreateJobSubmit = async () => {
 if (!jobForm.title.trim() || !jobForm.company_name.trim() || !jobForm.description.trim()) {
 toast.error("Preencha o título, empresa e descrição da vaga.");
 return;
 }

 setIsCreatingJob(true);
 try {
 await createStoreJob({
 data: {
 title: jobForm.title,
 company_name: jobForm.company_name,
 category: jobForm.category,
 location: jobForm.location,
 workplace_type: jobForm.workplace_type,
 contract_type: jobForm.contract_type,
 salary_display: jobForm.salary_display,
 description: jobForm.description,
 requirements: jobForm.requirements.split("\n").filter((r) => r.trim()),
 benefits: jobForm.benefits.split("\n").filter((b) => b.trim()),
 contact_whatsapp: jobForm.contact_whatsapp || null,
 contact_email: jobForm.contact_email || null,
 },
 });

 toast.success("Vaga de emprego publicada no ecossistema e na sua vitrine!");
 setIsJobOpen(false);
 setJobForm({
 title: "",
 company_name: "",
 category: "comercial",
 location: "Chapecó / SC",
 workplace_type: "Presencial",
 contract_type: "CLT",
 salary_display: "R$ 2.500 - R$ 3.500",
 description: "",
 requirements: "Experiência prévia na função\nBoa comunicação\nDisponibilidade de horário",
 benefits: "Vale Transporte\nVale Alimentação\nComissão sobre vendas",
 contact_whatsapp: "",
 contact_email: "",
 });
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao publicar vaga.");
 } finally {
 setIsCreatingJob(false);
 }
 };

 const handleRoleChange = async (profileId: string, newRole: any) => {
 try {
 await updateTeamMemberRole({
 data: {
 id: profileId,
 role: newRole,
 },
 });
 toast.success("Cargo do colaborador atualizado com sucesso!");
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao alterar permissão.");
 }
 };

 const handleConfirmRemove = async () => {
 if (!memberToRemove) return;
 setIsRemoving(true);
 try {
 await removeTeamMember({
 data: {
 profileId: memberToRemove.id,
 },
 });
 toast.success("Acesso do colaborador revogado com sucesso!");
 setMemberToRemove(null);
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao remover colaborador.");
 } finally {
 setIsRemoving(false);
 }
 };

 return (
 <div className="space-y-6 max-w-6xl mx-auto w-full pb-20">
 {/* ── PageHeader Canônico Clean ── */}
 <PageHeader
 eyebrow="RH & Gestão"
 title="Equipe & Vagas"
 actions={
 <div className="flex items-center gap-2">
 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-9 rounded-xl font-semibold text-xs gap-1.5"
 >
 <Link to="/workspace/financeiro/funcionarios">
 <Wallet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>Folha</span>
 </Link>
 </Button>
 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-9 rounded-xl font-semibold text-xs gap-1.5"
 >
 <Link to="/workspace/empregos/candidatos">
 <Briefcase className="size-3.5 text-primary" />
 <span>Candidatos</span>
 </Link>
 </Button>
 {activeTab === "members" ? (
 <Button
 onClick={() => setIsInviteOpen(true)}
 size="sm"
 className="h-9 rounded-xl font-bold text-xs gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground"
 >
 <UserPlus className="size-3.5" />
 <span>Convidar</span>
 </Button>
 ) : activeTab === "contractors" ? (
 <Button
 onClick={() => {
 setContractorForm({
 id: undefined,
 name: "",
 serviceCategory: "outro",
 documentNumber: "",
 contactPhone: "",
 contactEmail: "",
 hourlyRateCents: 0,
 fixedFeeCents: 0,
 pixKey: "",
 status: "active",
 notes: "",
 });
 setIsContractorOpen(true);
 }}
 size="sm"
 className="h-9 rounded-xl font-bold text-xs gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground"
 >
 <Plus className="size-3.5" />
 <span>Novo Prestador</span>
 </Button>
 ) : (
 <Button
 onClick={() => setIsJobOpen(true)}
 size="sm"
 className="h-9 rounded-xl font-bold text-xs gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground"
 >
 <Plus className="size-3.5" />
 <span>Publicar Vaga</span>
 </Button>
 )}
 </div>
 }
 />

 {/* ── Tabs de Navegação ── */}
 <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
 <TabsList className="grid grid-cols-3 max-w-lg h-11 p-1 bg-muted/60 rounded-2xl">
 <TabsTrigger value="members" className="rounded-xl font-bold text-xs gap-1.5">
 <Users className="size-3.5" />
 <span>Colaboradores ({members.length})</span>
 </TabsTrigger>
 <TabsTrigger value="contractors" className="rounded-xl font-bold text-xs gap-1.5">
 <Briefcase className="size-3.5" />
 <span>Terceirizados ({contractorsList.length})</span>
 </TabsTrigger>
 <TabsTrigger value="jobs" className="rounded-xl font-bold text-xs gap-1.5">
 <Layers className="size-3.5" />
 <span>Vagas ({jobs.length})</span>
 </TabsTrigger>
 </TabsList>

 <TabsContent value="members" className="space-y-6 pt-4">
 {/* ── Banner de Isolamento Multi-Tenant & Zero-Trust ── */}
 <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
 <ShieldCheck className="size-5" />
 </div>
 <div className="space-y-0.5 flex-1 min-w-0">
 <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
 <span>Privacidade & Isolamento Estrito de Workspace</span>
 <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary font-bold">
 Zero-Trust RLS
 </Badge>
 </h3>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Cada colaborador vinculado abaixo terá permissões aplicadas <strong>exclusivamente para esta loja</strong>.
 Nenhum dado, pedido, faturamento ou catálogo de outros comerciantes é acessível.
 </p>
 </div>
 </div>

 {/* ── Tabela de Colaboradores ── */}
 <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
 <div className="p-4 border-b border-border/60 flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <span>Membros Ativos</span>
 <Badge variant="secondary" className="text-[11px] font-bold">
 {members.length}
 </Badge>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.invalidate()}
 className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
 >
 <RefreshCw className="size-3.5" />
 <span>Atualizar</span>
 </Button>
 </div>

 {members.length === 0 ? (
 <div className="p-12 text-center space-y-3">
 <div className="size-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
 <Users className="size-6" />
 </div>
 <p className="text-sm font-semibold text-foreground">Nenhum colaborador encontrado</p>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Convide os membros da sua equipe para delegar funções como frente de caixa, estoque e financeiro.
 </p>
 </div>
 ) : (
 <div className="divide-y divide-border/40">
 {members.map((m: any) => {
 const roleInfo = ROLE_DEFINITIONS[m.role] || {
 label: m.role,
 description: "Cargo operacional",
 color: "bg-muted text-muted-foreground border-border",
 };
 const isOwner = m.role === "owner";

 return (
 <div
 key={m.id}
 className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-primary/20">
 {m.avatar_url ? (
 <img src={m.avatar_url} alt={m.full_name} className="size-full object-cover" />
 ) : (
 <span>{(m.full_name || "C").charAt(0).toUpperCase()}</span>
 )}
 </div>
 <div className="min-w-0 space-y-0.5">
 <div className="flex items-center gap-2">
 <p className="text-xs font-bold text-foreground truncate">
 {m.full_name || "Colaborador sem nome"}
 </p>
 <Badge
 variant="outline"
 className={`text-[10px] px-2 py-0.5 font-bold rounded-lg border ${roleInfo.color}`}
 >
 {roleInfo.label}
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground truncate font-mono">
 {m.email || "E-mail não público"}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2 self-end sm:self-center">
 {!isOwner ? (
 <>
 <Select
 defaultValue={m.role}
 onValueChange={(newVal) => handleRoleChange(m.id, newVal)}
 >
 <SelectTrigger className="h-8 text-xs font-semibold rounded-xl w-36 bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 {Object.entries(ROLE_DEFINITIONS)
 .filter(([k]) => k !== "owner")
 .map(([key, item]) => (
 <SelectItem key={key} value={key} className="text-xs">
 {item.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Button
 variant="ghost"
 size="icon"
 onClick={() => setMemberToRemove(m)}
 className="size-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
 title="Revogar Acesso"
 >
 <Trash2 className="size-4" />
 </Button>
 </>
 ) : (
 <span className="text-[11px] text-muted-foreground font-medium px-2 py-1 bg-muted/30 rounded-lg">
 Proprietário Principal
 </span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </TabsContent>

  {/* ── ABA 2: PRESTADORES TERCEIRIZADOS & FREELANCERS (PERSONA NEXUS PORT) ── */}
  <TabsContent value="contractors" className="space-y-6 pt-4">
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <span>Prestadores Terceirizados & Freelancers</span>
          <Badge variant="secondary" className="text-[11px] font-bold">
            {contractorsList.length}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setContractorForm({
              id: undefined,
              name: "",
              serviceCategory: "outro",
              documentNumber: "",
              contactPhone: "",
              contactEmail: "",
              hourlyRateCents: 0,
              fixedFeeCents: 0,
              pixKey: "",
              status: "active",
              notes: "",
            });
            setIsContractorOpen(true);
          }}
          className="h-8 text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Cadastrar Parceiro</span>
        </Button>
      </div>

      {contractorsList.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
            <Briefcase className="size-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">Nenhum prestador terceirizado cadastrado</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Cadastre parceiros externos para escala de eventos, seguranças, técnicos de som, fotógrafos ou prestadores por hora/diária.
          </p>
          <Button
            onClick={() => {
              setContractorForm({
                id: undefined,
                name: "",
                serviceCategory: "outro",
                documentNumber: "",
                contactPhone: "",
                contactEmail: "",
                hourlyRateCents: 0,
                fixedFeeCents: 0,
                pixKey: "",
                status: "active",
                notes: "",
              });
              setIsContractorOpen(true);
            }}
            className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Cadastrar Primeiro Terceirizado</span>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {contractorsList.map((c: any) => (
            <div
              key={c.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-muted text-foreground flex items-center justify-center font-bold text-sm shrink-0 border border-border/40">
                  <Briefcase className="size-5 text-muted-foreground" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground leading-tight truncate">
                      {c.name}
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                      {c.service_category?.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {c.contact_phone && <span>Tel: {c.contact_phone}</span>}
                    {c.pix_key && <span>Pix: <code className="font-mono text-[11px]">{c.pix_key}</code></span>}
                    {c.hourly_rate_cents > 0 && <span>{formatMoney(c.hourly_rate_cents)}/h</span>}
                    {c.fixed_fee_cents > 0 && <span>Diária: {formatMoney(c.fixed_fee_cents)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {c.contact_phone && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1"
                  >
                    <a
                      href={`https://wa.me/55${c.contact_phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setContractorForm({
                      id: c.id,
                      name: c.name,
                      serviceCategory: c.service_category || "outro",
                      documentNumber: c.document_number || "",
                      contactPhone: c.contact_phone || "",
                      contactEmail: c.contact_email || "",
                      hourlyRateCents: c.hourly_rate_cents || 0,
                      fixedFeeCents: c.fixed_fee_cents || 0,
                      pixKey: c.pix_key || "",
                      status: c.status || "active",
                      notes: c.metadata?.notes || "",
                    });
                    setIsContractorOpen(true);
                  }}
                  className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!confirm(`Remover prestador ${c.name}?`)) return;
                    try {
                      await deleteContractor({ data: { contractorId: c.id } });
                      toast.success("Prestador removido.");
                      setContractorsList((prev) => prev.filter((item) => item.id !== c.id));
                    } catch (err: any) {
                      toast.error(err?.message || "Erro ao excluir prestador.");
                    }
                  }}
                  className="size-8 p-0 rounded-xl text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </TabsContent>

  {/* ── ABA 3: VAGAS & RECRUTAMENTO (ATS) ── */}
  <TabsContent value="jobs" className="space-y-6 pt-4">
 <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
 <div className="p-4 border-b border-border/60 flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <span>Vagas de Emprego Publicadas</span>
 <Badge variant="secondary" className="text-[11px] font-bold">
 {jobs.length}
 </Badge>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.invalidate()}
 className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
 >
 <RefreshCw className="size-3.5" />
 <span>Atualizar</span>
 </Button>
 </div>

 {jobs.length === 0 ? (
 <div className="p-12 text-center space-y-3">
 <div className="size-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
 <Briefcase className="size-6" />
 </div>
 <p className="text-sm font-semibold text-foreground">Nenhuma vaga aberta no momento</p>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Publique vagas de trabalho para receber currículos de profissionais e candidatos qualificados da cidade.
 </p>
 <Button
 onClick={() => setIsJobOpen(true)}
 className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>Publicar Primeira Vaga</span>
 </Button>
 </div>
 ) : (
 <div className="divide-y divide-border/40">
 {jobs.map((job: any) => (
 <div
 key={job.id}
 className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
 <Briefcase className="size-5" />
 </div>
 <div className="min-w-0 space-y-0.5">
 <div className="flex items-center gap-2">
 <p className="text-xs font-bold text-foreground truncate">{job.title}</p>
 <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold">
 {job.contract_type} • {job.workplace_type}
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground truncate">
 {job.location} • {job.salary_display}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3 self-end sm:self-center">
 <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono font-bold">
 {job.applications_count} Candidatos
 </Badge>
 <Button
 asChild
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-bold h-8"
 >
 <Link to="/workspace/empregos/candidatos">
 <span>Ver Currículos</span>
 </Link>
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </TabsContent>
 </Tabs>

 {/* ── SheetPage de Criação de Vaga ── */}
 <SheetPage
 open={isJobOpen}
 onOpenChange={setIsJobOpen}
 title="Publicar Nova Vaga de Emprego"
 description="A vaga será exibida no portal público da cidade e no perfil da sua loja."
 size="lg"
 footer={
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 onClick={() => setIsJobOpen(false)}
 disabled={isCreatingJob}
 className="rounded-xl text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleCreateJobSubmit}
 disabled={isCreatingJob}
 className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
 >
 {isCreatingJob ? "Publicando..." : "Publicar Vaga de Emprego"}
 </Button>
 </div>
 }
 >
 <div className="space-y-4 py-2">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Título da Vaga / Cargo</Label>
 <Input
 value={jobForm.title}
 onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
 placeholder="Ex: Atendente de Balcão & Caixa"
 className="h-10 rounded-xl text-xs font-bold"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Nome da Empresa / Estabelecimento</Label>
 <Input
 value={jobForm.company_name}
 onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })}
 placeholder="Ex: Café & Bistrô Central"
 className="h-10 rounded-xl text-xs font-bold"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Tipo de Contrato</Label>
 <Select
 value={jobForm.contract_type}
 onValueChange={(v: any) => setJobForm({ ...jobForm, contract_type: v })}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="CLT">CLT (Efetivo)</SelectItem>
 <SelectItem value="PJ">PJ (Prestador)</SelectItem>
 <SelectItem value="Estágio">Estágio</SelectItem>
 <SelectItem value="Freelancer">Freelancer</SelectItem>
 <SelectItem value="Temporário">Temporário</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Modelo de Trabalho</Label>
 <Select
 value={jobForm.workplace_type}
 onValueChange={(v: any) => setJobForm({ ...jobForm, workplace_type: v })}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="Presencial">Presencial</SelectItem>
 <SelectItem value="Híbrido">Híbrido</SelectItem>
 <SelectItem value="Remoto">Remoto</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Faixa Salarial / Remuneração</Label>
 <Input
 value={jobForm.salary_display}
 onChange={(e) => setJobForm({ ...jobForm, salary_display: e.target.value })}
 placeholder="Ex: R$ 2.500 - R$ 3.200"
 className="h-10 rounded-xl text-xs font-mono font-bold"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Localização / Cidade</Label>
 <Input
 value={jobForm.location}
 onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
 placeholder="Ex: Centro - Chapecó / SC"
 className="h-10 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Descrição das Atividades & Responsabilidades</Label>
 <Textarea
 value={jobForm.description}
 onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
 placeholder="Descreva as principais funções, ambiente de trabalho e rotina..."
 className="h-28 rounded-2xl text-xs resize-none"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Requisitos (1 por linha)</Label>
 <Textarea
 value={jobForm.requirements}
 onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
 className="h-24 rounded-2xl text-xs resize-none font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Benefícios (1 por linha)</Label>
 <Textarea
 value={jobForm.benefits}
 onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
 className="h-24 rounded-2xl text-xs resize-none font-mono"
 />
 </div>
 </div>
 </div>
 </SheetPage>

 {/* ── Modal de Convite de Colaborador ── */}
 <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
 <DialogContent className="sm:max-w-md rounded-2xl p-6">
 <DialogHeader className="space-y-1 text-left">
 <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
 <UserPlus className="size-5" />
 </div>
 <DialogTitle className="text-lg font-bold text-foreground">Convidar Colaborador</DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Vincule um novo membro à equipe da sua loja definindo seu papel de atuação.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
 <div className="space-y-1.5 text-left">
 <Label className="text-xs font-bold text-foreground">Nome Completo</Label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 required
 placeholder="Ex: João da Silva"
 value={inviteName}
 onChange={(e) => setInviteName(e.target.value)}
 className="pl-9 h-10 rounded-xl text-xs bg-muted/30"
 />
 </div>
 </div>

 <div className="space-y-1.5 text-left">
 <Label className="text-xs font-bold text-foreground">E-mail de Acesso</Label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 required
 type="email"
 placeholder="colaborador@empresa.com"
 value={inviteEmail}
 onChange={(e) => setInviteEmail(e.target.value)}
 className="pl-9 h-10 rounded-xl text-xs bg-muted/30"
 />
 </div>
 </div>

 <div className="space-y-1.5 text-left">
 <Label className="text-xs font-bold text-foreground">Cargo & Nível de Permissão</Label>
 <Select
 value={inviteRole}
 onValueChange={(v: any) => setInviteRole(v)}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30 font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl max-h-64">
 {Object.entries(ROLE_DEFINITIONS)
 .filter(([k]) => k !== "owner")
 .map(([key, item]) => (
 <SelectItem key={key} value={key} className="text-xs py-2">
 <div className="space-y-0.5">
 <p className="font-bold text-foreground">{item.label}</p>
 <p className="text-[10px] text-muted-foreground">{item.description}</p>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-start gap-2">
 <Info className="size-4 text-primary shrink-0 mt-0.5" />
 <span>O colaborador receberá acesso imediato e restrito única e exclusivamente à sua loja.</span>
 </div>

 <DialogFooter className="pt-3 gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsInviteOpen(false)}
 className="h-10 rounded-xl text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isInviting}
 className="h-10 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90"
 >
 {isInviting ? "Vinculando..." : "Convidar para a Equipe"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 {/* ── Diálogo de Confirmação de Remoção ── */}
 <AlertDialog
 open={Boolean(memberToRemove)}
 onOpenChange={(open) => !open && setMemberToRemove(null)}
 >
 <AlertDialogContent className="rounded-2xl p-6 sm:max-w-md">
 <AlertDialogHeader className="space-y-2 text-left">
 <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
 <ShieldAlert className="size-6" />
 </div>
 <AlertDialogTitle className="text-base font-bold text-foreground">
 Revogar Acesso do Colaborador?
 </AlertDialogTitle>
 <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
 Tem certeza que deseja revogar o acesso de <strong>{memberToRemove?.full_name}</strong> ({memberToRemove?.email})? O colaborador perderá imediatamente o acesso ao painel desta loja.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter className="pt-4 gap-2">
 <AlertDialogCancel className="h-10 rounded-xl text-xs font-semibold">
 Cancelar
 </AlertDialogCancel>
 <AlertDialogAction
 onClick={handleConfirmRemove}
 disabled={isRemoving}
 className="h-10 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 {isRemoving ? "Revogando..." : "Revogar Acesso"}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>

      {/* ── Modal de Cadastro / Edição de Terceirizado ── */}
      <Dialog open={isContractorOpen} onOpenChange={setIsContractorOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {contractorForm.id ? "Editar Terceirizado" : "Cadastrar Prestador Terceirizado"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre prestadores de serviços, freelancers e terceirizados para sua equipe e eventos.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!contractorForm.name.trim()) {
                toast.error("Informe o nome do prestador.");
                return;
              }
              setIsSavingContractor(true);
              try {
                const res = await upsertContractor({ data: contractorForm });
                toast.success(contractorForm.id ? "Prestador atualizado!" : "Prestador cadastrado com sucesso!");
                setIsContractorOpen(false);
                setContractorsList((prev) => {
                  if (contractorForm.id) {
                    return prev.map((item) => (item.id === contractorForm.id ? res : item));
                  }
                  return [res, ...prev];
                });
              } catch (err: any) {
                toast.error(err?.message || "Erro ao salvar prestador.");
              } finally {
                setIsSavingContractor(false);
              }
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nome Completo / Razão Social *</Label>
              <Input
                value={contractorForm.name}
                onChange={(e) => setContractorForm({ ...contractorForm, name: e.target.value })}
                placeholder="Ex: João Silva Segurança Eireli"
                className="h-9 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Especialidade / Categoria</Label>
                <Select
                  value={contractorForm.serviceCategory}
                  onValueChange={(val: any) => setContractorForm({ ...contractorForm, serviceCategory: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="limpeza">Limpeza</SelectItem>
                    <SelectItem value="buffet">Buffet</SelectItem>
                    <SelectItem value="som_iluminacao">Som / Luz</SelectItem>
                    <SelectItem value="fotografia">Fotografia</SelectItem>
                    <SelectItem value="cenografia">Cenografia</SelectItem>
                    <SelectItem value="brigadistas">Brigadistas</SelectItem>
                    <SelectItem value="atendimento">Atendimento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">CPF / CNPJ</Label>
                <Input
                  value={contractorForm.documentNumber}
                  onChange={(e) => setContractorForm({ ...contractorForm, documentNumber: e.target.value })}
                  placeholder="000.000.000-00"
                  className="h-9 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Telefone / WhatsApp</Label>
                <Input
                  value={contractorForm.contactPhone}
                  onChange={(e) => setContractorForm({ ...contractorForm, contactPhone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Chave Pix</Label>
                <Input
                  value={contractorForm.pixKey}
                  onChange={(e) => setContractorForm({ ...contractorForm, pixKey: e.target.value })}
                  placeholder="CPF, CNPJ, E-mail..."
                  className="h-9 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Valor Hora (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={contractorForm.hourlyRateCents ? contractorForm.hourlyRateCents / 100 : ""}
                  onChange={(e) => setContractorForm({ ...contractorForm, hourlyRateCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  placeholder="Ex: 50.00"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Valor Diária / Fixo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={contractorForm.fixedFeeCents ? contractorForm.fixedFeeCents / 100 : ""}
                  onChange={(e) => setContractorForm({ ...contractorForm, fixedFeeCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  placeholder="Ex: 350.00"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsContractorOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingContractor}
                className="rounded-xl text-xs font-bold"
              >
                {isSavingContractor ? "Salvando..." : contractorForm.id ? "Atualizar" : "Cadastrar Prestador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
 </div>
 );
}
