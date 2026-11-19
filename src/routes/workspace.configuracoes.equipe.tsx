import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Users, UserPlus, ShieldCheck, ShieldAlert, Trash2, Mail, User, CheckCircle2, Lock, ArrowRight, Layers, Info, RefreshCw, Building2, Briefcase, ExternalLink, Wallet, Plus, Edit3, Phone, Sliders, Smartphone } from 'lucide-react';
import {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  updateTeamMemberProfile,
  removeTeamMember,
  listContractors,
  upsertContractor,
  deleteContractor,
} from "@/services/admin-team.functions";
import {
  listChatDepartments,
  listWorkspaceWhatsAppInstances,
} from "@/services/whatsapp-channel-instances.functions";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ImageUpload } from "@/components/ui/image-upload";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics, isPartnerLawEligibleStore } from "@/lib/niches/niche-semantics";
import { RolePermissionsMatrix } from "@/components/workspace/RolePermissionsMatrix";
import { PartnerAgreementEditor } from "@/components/workspace/PartnerAgreementEditor";
import { EmployeeCommercialProfilePanel } from "@/components/tourism/EmployeeCommercialProfilePanel";
import { Award } from "lucide-react";
import { SeoGeoOptimizationPanel, type SeoGeoMetadata } from "@/components/seo";
import { Switch } from "@/components/ui/switch";
import { SavedSignatureSettingsCard } from "@/components/contracts/saved-signature-settings";
import { listTeamSignatureStatuses } from "@/services/contracts-vault.functions";
import { ErrorState } from "@/components/state/states";

export const Route = createFileRoute("/workspace/configuracoes/equipe")({
 head: () => ({
 meta: [
 { title: "Equipe | Workspace Waesy" },
 { name: "description", content: "Gerencie os membros, cargos, folha de pagamento e vagas de emprego da sua loja." },
 ],
 }),
  loader: async () => {
    let loadError: string | null = null;
    try {
      const storeRes = await getStoreSettings().catch(() => null);
      const store = (storeRes as any)?.store || storeRes || null;
      const storeId = store?.id || "";
      const [members, jobs, contractors, departments, whatsappInstances, teamSignatureStatuses] = await Promise.all([
        listTeamMembers().catch((err: any) => {
          loadError = err?.message || "Não foi possível carregar os membros da equipe.";
          return [];
        }),
        listMyStoreJobs().catch(() => []),
        listContractors().catch(() => []),
        listChatDepartments({ data: storeId ? { storeId } : undefined }).catch(() => []),
        listWorkspaceWhatsAppInstances({ data: storeId ? { store_id: storeId } : undefined }).catch(() => []),
        listTeamSignatureStatuses().catch(() => []),
      ]);
      return {
        members: members || [],
        jobs: jobs || [],
        contractors: contractors || [],
        departments: departments || [],
        whatsappInstances: whatsappInstances || [],
        teamSignatureStatuses: teamSignatureStatuses || [],
        storeId,
        store,
        loadError,
      };
    } catch (err: any) {
      return {
        members: [],
        jobs: [],
        contractors: [],
        departments: [],
        whatsappInstances: [],
        teamSignatureStatuses: [],
        storeId: "",
        store: null,
        loadError: err?.message || "Não foi possível carregar os dados da equipe.",
      };
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
 label: "Vendedor / Comercial",
 description: "Atendimento a clientes, pedidos e orçamentos",
 color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
 },
 cashier: {
 label: "Operador de Caixa",
 description: "Frente de caixa (PDV), abertura e fechamento de turno",
 color: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
 },
 finance: {
 label: "Financeiro",
 description: "Extratos, fluxo de caixa, pagamentos e conciliação",
 color: "bg-warning/15 text-warning-strong  border-warning/30",
 },
 stock: {
 label: "Estoque e Expedição",
 description: "Controle de inventário, reposição e despacho de entregas",
 color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
 },
 content: {
 label: "Marketing e Conteúdo",
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
  const {
    members,
    jobs,
    contractors,
    departments = [],
    whatsappInstances = [],
    teamSignatureStatuses = [],
    storeId,
    store = null,
    loadError = null,
  } = ((Route.useLoaderData?.() as any) || {});
  const teamSigByProfileId = new Map<string, { hasSavedSignature: boolean; hasSavedInitials: boolean }>();
  for (const s of Array.isArray(teamSignatureStatuses) ? teamSignatureStatuses : []) {
    const val = { hasSavedSignature: Boolean(s.hasSavedSignature), hasSavedInitials: Boolean(s.hasSavedInitials) };
    if (s.profileId) teamSigByProfileId.set(String(s.profileId), val);
    if (s.memberId) teamSigByProfileId.set(String(s.memberId), val);
  }
  const [liveUserSigProfile, setLiveUserSigProfile] = useState<{
    profileId: string | null;
    savedSignature: string | null;
    savedInitials: string | null;
  } | null>(null);
  const router = useRouter();
  const semantics = getNicheSemantics(store);
  const showPartnerLaw = isPartnerLawEligibleStore(store);
  const defaultContractType: "clt" | "pj" | "partner_law" = showPartnerLaw ? "partner_law" : "clt";
  const isTourismStore = (store?.niche_id || store?.niche || "") === "tourism";
  const defaultTeamCommissionPercent = isTourismStore ? 0 : 60;
  const [selectedMemberCommercial, setSelectedMemberCommercial] = useState<any | null>(null);

  const [activeTab, setActiveTab] = useState<"members" | "contractors" | "jobs" | "permissions" | "partner_agreement">("members");

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
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteInitialPassword, setInviteInitialPassword] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "admin" | "manager" | "seller" | "cashier" | "finance" | "content" | "stock" | "support"
  >("seller");
  const [inviteDepartmentId, setInviteDepartmentId] = useState<string>("__none__");
  const [inviteWhatsappInstanceId, setInviteWhatsappInstanceId] = useState<string>("__none__");
  const [inviteIsAttendanceAgent, setInviteIsAttendanceAgent] = useState<boolean>(true);
  const [inviteMaxConcurrentChats, setInviteMaxConcurrentChats] = useState<number>(10);
  const [inviteCanTransferChats, setInviteCanTransferChats] = useState<boolean>(true);
  const [inviteCanCloseChats, setInviteCanCloseChats] = useState<boolean>(true);
  const [inviteCanManageWhatsappQr, setInviteCanManageWhatsappQr] = useState<boolean>(false);
  const [inviteOnlyAssignedOrSector, setInviteOnlyAssignedOrSector] = useState<boolean>(false);
  const [inviteContractType, setInviteContractType] = useState<"clt" | "pj" | "partner_law">(defaultContractType);
  const [inviteCommissionPercent, setInviteCommissionPercent] = useState<number>(defaultTeamCommissionPercent);
  const [inviteFeeBearer, setInviteFeeBearer] = useState<"store_100" | "pro_100" | "split_50" | "proportional">("proportional");
  const [inviteCanViewContacts, setInviteCanViewContacts] = useState<boolean>(false);
  const [inviteAutoDeductSupplies, setInviteAutoDeductSupplies] = useState<boolean>(true);
  const [isInviting, setIsInviting] = useState(false);

  // Estados de Edição de Vínculos Operacionais & RH
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    fullName: "",
    phone: "",
    newPassword: "",
    role: "seller" as "admin" | "manager" | "seller" | "cashier" | "finance" | "content" | "stock" | "support",
    isOwner: false,
    departmentId: "__none__",
    whatsappInstanceId: "__none__",
    isAttendanceAgent: true,
    attendancePresence: "online" as "online" | "busy" | "away" | "offline",
    maxConcurrentChats: 10,
    canTransferChats: true,
    canCloseChats: true,
    canManageWhatsappQr: false,
    onlyAssignedOrSector: false,
    contractType: defaultContractType as "clt" | "pj" | "partner_law",
    commissionPercent: defaultTeamCommissionPercent,
    feeBearer: "proportional" as "store_100" | "pro_100" | "split_50" | "proportional",
    canViewUnmaskedContacts: false,
    autoDeductSupplies: true,
  });

 // Estados do Modal de Criação de Vaga
 const [isJobOpen, setIsJobOpen] = useState(false);
 const [isCreatingJob, setIsCreatingJob] = useState(false);
 const [jobSeoGeo, setJobSeoGeo] = useState<SeoGeoMetadata>({
   seoTitle: "",
   seoDescription: "",
   keywords: [],
   allowAiIndexing: true,
 });
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

 const buildMemberDirectPanelUrl = (email?: string | null) => {
  const origin =
   typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://waesy.com.br";
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return `${origin}/painel?returnUrl=/workspace`;
  return `${origin}/painel?email=${encodeURIComponent(cleanEmail)}&returnUrl=/workspace`;
 };

 const handleCopyMemberAccessLink = async (member: any, customPassword?: string) => {
  const url = buildMemberDirectPanelUrl(member?.email);
  const roleLabel = ROLE_DEFINITIONS[member?.role]?.label || member?.role || "Colaborador";
  const textToCopy = customPassword
   ? `Acesso ao Painel (${store?.name || "Workspace"}):\nLink: ${url}\nE-mail: ${member?.email || ""}\nSenha: ${customPassword}\nFunção: ${roleLabel}`
   : url;
  try {
   if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(textToCopy);
    toast.success("Link de acesso direto copiado!");
   }
  } catch {
   toast.error("Não foi possível copiar automaticamente.");
  }
 };

 const handleOpenEditMember = (member: any) => {
  const memberContract = member.contract_type || defaultContractType;
  const safeMemberContract = !showPartnerLaw && memberContract === "partner_law" ? "clt" : memberContract;
  setEditingMember(member);
  setEditMemberForm({
   fullName: member.full_name || "",
   phone: member.phone || "",
   newPassword: "",
   role: (member.role === "owner" ? "admin" : member.role || "seller") as any,
   isOwner: member.role === "owner",
   departmentId: member.department_id || "__none__",
   whatsappInstanceId: member.whatsapp_instance_id || "__none__",
   isAttendanceAgent: member.is_attendance_agent ?? true,
   attendancePresence: (member.attendance_presence || "online") as any,
   maxConcurrentChats: Number(member.max_concurrent_chats) || 10,
   canTransferChats: member.can_transfer_chats ?? true,
   canCloseChats: member.can_close_chats ?? true,
   canManageWhatsappQr: Boolean(member.can_manage_whatsapp_qr),
   onlyAssignedOrSector: Boolean(member.only_assigned_or_sector),
   contractType: safeMemberContract as any,
   commissionPercent: Number(member.commission_percent ?? 60),
   feeBearer: (member.fee_bearer || "proportional") as any,
   canViewUnmaskedContacts: Boolean(member.can_view_unmasked_contacts),
   autoDeductSupplies: member.auto_deduct_supplies ?? true,
  });
 };

 const handleSaveEditMember = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingMember) return;
  if (editMemberForm.newPassword.trim() && editMemberForm.newPassword.trim().length < 6) {
   toast.error("A nova senha de acesso deve ter pelo menos 6 caracteres.");
   return;
  }
  setIsSavingMember(true);
  try {
   const selectedDept = (departments || []).find((d: any) => d.id === editMemberForm.departmentId);
   const res = await updateTeamMemberProfile({
    data: {
     profileId: editingMember.id,
     fullName: editMemberForm.fullName.trim() || undefined,
     phone: editMemberForm.phone.trim() || null,
     newPassword: editMemberForm.newPassword.trim() || undefined,
     role: editMemberForm.isOwner ? undefined : editMemberForm.role,
     departmentId: editMemberForm.departmentId !== "__none__" ? editMemberForm.departmentId : null,
     defaultDepartmentSlug: selectedDept?.slug || null,
     whatsappInstanceId:
      editMemberForm.whatsappInstanceId !== "__none__" ? editMemberForm.whatsappInstanceId : null,
     isAttendanceAgent: editMemberForm.isAttendanceAgent,
     attendancePresence: editMemberForm.attendancePresence,
     maxConcurrentChats: Math.max(1, Math.min(200, Number(editMemberForm.maxConcurrentChats) || 10)),
     canTransferChats: editMemberForm.canTransferChats,
     canCloseChats: editMemberForm.canCloseChats,
     canManageWhatsappQr: editMemberForm.canManageWhatsappQr,
     onlyAssignedOrSector: editMemberForm.onlyAssignedOrSector,
     contractType: editMemberForm.contractType,
     commissionPercent: Math.max(0, Math.min(100, Number(editMemberForm.commissionPercent) || 0)),
     feeBearer: editMemberForm.feeBearer,
     canViewUnmaskedContacts: editMemberForm.canViewUnmaskedContacts,
     autoDeductSupplies: editMemberForm.autoDeductSupplies,
    },
   });
   if ((res as any)?.passwordUpdated) {
    toast.success("Vínculos e nova senha de acesso salvos com sucesso!");
   } else {
    toast.success("Vínculos operacionais e contratuais atualizados.");
   }
   setEditingMember(null);
   router.invalidate();
  } catch (err: any) {
   toast.error(err?.message || "Erro ao salvar vínculos do colaborador.");
  } finally {
   setIsSavingMember(false);
  }
 };

 const handleInviteSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!inviteEmail.trim() || !inviteName.trim()) {
 toast.error("Preencha o nome e o e-mail do colaborador.");
 return;
 }
 if (inviteInitialPassword.trim() && inviteInitialPassword.trim().length < 6) {
 toast.error("A senha inicial deve ter no mínimo 6 caracteres.");
 return;
 }

 setIsInviting(true);
 try {
 const selectedDept = (departments || []).find((d: any) => d.id === inviteDepartmentId);
 const inviteRes = await inviteTeamMember({
 data: {
 email: inviteEmail.trim(),
 fullName: inviteName.trim(),
 phone: invitePhone.trim() || null,
 initialPassword: inviteInitialPassword.trim() || null,
 role: inviteRole,
 departmentId: inviteDepartmentId !== "__none__" ? inviteDepartmentId : null,
 defaultDepartmentSlug: selectedDept?.slug || null,
 whatsappInstanceId:
  inviteWhatsappInstanceId !== "__none__" ? inviteWhatsappInstanceId : null,
 isAttendanceAgent: inviteIsAttendanceAgent,
 maxConcurrentChats: Math.max(1, Math.min(200, Number(inviteMaxConcurrentChats) || 10)),
 canTransferChats: inviteCanTransferChats,
 canCloseChats: inviteCanCloseChats,
 canManageWhatsappQr: inviteCanManageWhatsappQr,
 onlyAssignedOrSector: inviteOnlyAssignedOrSector,
 contractType: inviteContractType,
 commissionPercent: Math.max(0, Math.min(100, Number(inviteCommissionPercent) || 0)),
 feeBearer: inviteFeeBearer,
 canViewUnmaskedContacts: inviteCanViewContacts,
 autoDeductSupplies: inviteAutoDeductSupplies,
 },
 });

 await handleCopyMemberAccessLink(
  { email: inviteEmail.trim(), role: inviteRole },
  (inviteRes as any)?.initialPassword || inviteInitialPassword.trim() || undefined,
 );
 toast.success("Colaborador vinculado! As credenciais e o link direto foram copiados.");
 setIsInviteOpen(false);
 setInviteEmail("");
 setInviteName("");
 setInvitePhone("");
 setInviteInitialPassword("");
 setInviteRole("seller");
 setInviteDepartmentId("__none__");
 setInviteWhatsappInstanceId("__none__");
 setInviteIsAttendanceAgent(true);
 setInviteMaxConcurrentChats(10);
 setInviteCanTransferChats(true);
 setInviteCanCloseChats(true);
 setInviteCanManageWhatsappQr(false);
 setInviteOnlyAssignedOrSector(false);
 setInviteContractType(defaultContractType);
 setInviteCommissionPercent(60);
 setInviteFeeBearer("proportional");
 setInviteCanViewContacts(false);
 setInviteAutoDeductSupplies(true);
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
 <div className="space-y-6 w-full pb-20">
 {loadError && (
   <ErrorState
     title="Não foi possível carregar os membros da equipe"
     description={loadError}
   />
 )}
 {/* ── PageHeader Canônico Clean ── */}
 <PageHeader /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
 eyebrow="RH & Gestão"
 title="Equipe"
 actions={
 <div className="flex items-center gap-2">
 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-11 min-h-11 sm:h-9 rounded-lg font-semibold text-xs gap-2"
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
 className="h-11 min-h-11 sm:h-9 rounded-lg font-semibold text-xs gap-2"
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
 className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 shadow-xs cursor-pointer bg-primary text-primary-foreground"
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
 className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 shadow-xs cursor-pointer bg-primary text-primary-foreground"
 >
 <Plus className="size-3.5" />
 <span>Novo Prestador</span>
 </Button>
 ) : (
 <Button
 onClick={() => setIsJobOpen(true)}
 size="sm"
 className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 shadow-xs cursor-pointer bg-primary text-primary-foreground"
 >
 <Plus className="size-3.5" />
 <span>Publicar Vaga</span>
 </Button>
 )}
 </div>
 }
 />

 {/* ── Tabs de Navegação ── */}
 <Tabs
   value={!showPartnerLaw && activeTab === "partner_agreement" ? "members" : activeTab}
   onValueChange={(v: any) => setActiveTab(v)}
   className="w-full"
 >
 <TabsList
   className={`grid grid-cols-2 ${showPartnerLaw ? "sm:grid-cols-5 max-w-3xl" : "sm:grid-cols-4 max-w-2xl"} h-auto p-1 bg-muted/60 rounded-lg gap-1`}
 >
 <TabsTrigger value="members" className="rounded-lg font-bold text-xs gap-2 py-2 min-h-11 sm:min-h-0">
 <Users className="size-3.5" />
 <span>Colaboradores ({members.length})</span>
 </TabsTrigger>
 <TabsTrigger value="contractors" className="rounded-lg font-bold text-xs gap-2 py-2 min-h-11 sm:min-h-0">
 <Briefcase className="size-3.5" />
 <span>Terceirizados ({contractorsList.length})</span>
 </TabsTrigger>
 {showPartnerLaw && (
   <TabsTrigger value="partner_agreement" className="rounded-lg font-bold text-xs gap-2 py-2 min-h-11 sm:min-h-0">
     <Building2 className="size-3.5 text-primary" />
     <span>Salão Parceiro</span>
   </TabsTrigger>
 )}
 <TabsTrigger value="permissions" className="rounded-lg font-bold text-xs gap-2 py-2 min-h-11 sm:min-h-0">
 <ShieldCheck className="size-3.5" />
 <span>Permissões</span>
 </TabsTrigger>
 <TabsTrigger value="jobs" className="rounded-lg font-bold text-xs gap-2 py-2 min-h-11 sm:min-h-0">
 <Layers className="size-3.5" />
 <span>Vagas ({jobs.length})</span>
 </TabsTrigger>
 </TabsList>

 <TabsContent value="members" className="space-y-6 pt-4">

 {/* ── Assinatura Digital da Conta para Uso Rápido em Contratos ── */}
 <SavedSignatureSettingsCard
  compact
  title="Minha Assinatura para Contratos"
  description="Cadastre sua assinatura e rubrica para assinar documentos deste workspace em 1 toque."
  onProfileChange={(state) => setLiveUserSigProfile(state)}
  onUpdated={() => router.invalidate()}
 />

 {/* ── Tabela de Colaboradores ── */}
 <div className="bg-card border border-border/60 rounded-lg overflow-hidden shadow-xs">
 <div className="p-4 border-b border-border/60 flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <span>Membros Ativos</span>
 <Badge variant="secondary" className="text-xs font-bold">
 {members.length}
 </Badge>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.invalidate()}
 className="h-11 min-h-11 sm:h-11 min-h-11 sm:h-9 text-xs gap-1 text-muted-foreground hover:text-foreground"
 >
 <RefreshCw className="size-3.5" />
 <span>Atualizar</span>
 </Button>
 </div>

 {members.length === 0 ? (
 <div className="p-12 text-center space-y-3">
 <div className="size-12 rounded-lg bg-muted text-muted-foreground mx-auto flex items-center justify-center">
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
 const memberDept =
  m.department ||
  (departments || []).find((d: any) => d.id === m.department_id) ||
  null;
 const memberWhatsapp =
  m.whatsapp_instance ||
  (whatsappInstances || []).find((w: any) => w.id === m.whatsapp_instance_id) ||
  null;
 const presenceText =
  m.attendance_presence === "busy"
   ? "Ocupado"
   : m.attendance_presence === "away"
     ? "Pausa"
     : m.attendance_presence === "offline"
       ? "Offline"
       : "Online";

 return (
 <div
 key={m.id}
 className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-primary/20">
 {m.avatar_url ? (
 <img src={m.avatar_url} alt={m.full_name} className="size-full object-cover" />
 ) : (
 <span>{(m.full_name || "C").charAt(0).toUpperCase()}</span>
 )}
 </div>
 <div className="min-w-0 space-y-1">
 <div className="flex flex-wrap items-center gap-2">
 <p className="text-xs font-bold text-foreground truncate">
 {m.full_name || "Colaborador sem nome"}
 </p>
 <Badge
 variant="outline"
 className={`text-xs px-2 py-1 font-bold rounded-lg border ${roleInfo.color}`}
 >
 {roleInfo.label}
 </Badge>
 {m.is_attendance_agent === true && (
  <Badge variant="secondary" className="text-xs px-2 py-1 font-medium rounded-lg">
   {presenceText} · Limite {m.max_concurrent_chats ?? 10}
  </Badge>
 )}
 {memberDept && (
  <Badge variant="outline" className="text-xs px-2 py-1 font-medium rounded-lg gap-1">
   <Layers className="size-3" />
   <span>{memberDept.name}</span>
  </Badge>
 )}
 {memberWhatsapp && (
  <Badge variant="outline" className="text-xs px-2 py-1 font-medium rounded-lg gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
   <Smartphone className="size-3" />
   <span>
    {memberWhatsapp.display_phone_number || memberWhatsapp.display_name}
   </span>
  </Badge>
 )}
 {(() => {
  const memberIdStr = String(m.id || "");
  const memberProfileIdStr = String(m.profile_id || m.id || "");
  const sigStatus = teamSigByProfileId.get(memberIdStr) || teamSigByProfileId.get(memberProfileIdStr);
  const isCurrentLoggedMember = Boolean(
   liveUserSigProfile?.profileId && (liveUserSigProfile.profileId === memberIdStr || liveUserSigProfile.profileId === memberProfileIdStr),
  );
  if (!sigStatus && !isCurrentLoggedMember) return null;
  const hasSavedDigitalSig = isCurrentLoggedMember
   ? Boolean(liveUserSigProfile?.savedSignature || liveUserSigProfile?.savedInitials)
   : Boolean(sigStatus?.hasSavedSignature || sigStatus?.hasSavedInitials);
  return hasSavedDigitalSig ? (
   <Badge
    variant="outline"
    className="text-xs px-2 py-1 font-medium rounded-lg gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
   >
    <CheckCircle2 className="size-3" />
    <span>Assinatura Digital Salva</span>
   </Badge>
  ) : (
   <Badge variant="secondary" className="text-xs px-2 py-1 font-medium rounded-lg">
    Sem Assinatura Digital
   </Badge>
  );
 })()}
 </div>
 {(m.email || m.phone) && (
 <p className="text-xs text-muted-foreground truncate font-mono">
 {m.email || ""}
 {m.email && m.phone ? " · " : ""}
 {m.phone || ""}
 </p>
 )}
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
 <Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => handleCopyMemberAccessLink(m)}
  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
 >
  <ExternalLink className="size-3.5 text-primary" />
  <span>Link de Acesso</span>
 </Button>
 <Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => setSelectedMemberCommercial(m)}
  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
 >
  <Award className="size-3.5 text-primary" />
  <span>Vendas & Prêmios</span>
 </Button>
 <Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => handleOpenEditMember(m)}
  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
 >
  <Sliders className="size-3.5" />
  <span>Vínculos</span>
 </Button>
 {!isOwner ? (
 <>
 <Select
 defaultValue={m.role}
 onValueChange={(newVal) => handleRoleChange(m.id, newVal)}
 >
 <SelectTrigger className="h-11 min-h-11 sm:h-9 text-xs font-semibold rounded-lg w-36 bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
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
 className="size-11 min-h-11 min-w-11 sm:size-9 sm:min-h-0 sm:min-w-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
 title="Revogar Acesso"
 >
 <Trash2 className="size-4" />
 </Button>
 </>
 ) : (
 <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted/30 rounded-lg">
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
    <div className="bg-card border border-border/60 rounded-lg overflow-hidden shadow-xs">
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <span>Prestadores Terceirizados e Freelancers</span>
          <Badge variant="secondary" className="text-xs font-bold">
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
          className="h-11 min-h-11 sm:h-11 min-h-11 sm:h-9 text-xs font-bold gap-2 rounded-lg cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Cadastrar Parceiro</span>
        </Button>
      </div>

      {contractorsList.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="size-12 rounded-lg bg-muted text-muted-foreground mx-auto flex items-center justify-center">
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
            className="rounded-lg text-xs font-bold h-11 min-h-11 sm:h-9 bg-primary text-primary-foreground gap-2"
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
                <div className="size-10 rounded-lg bg-muted text-foreground flex items-center justify-center font-bold text-sm shrink-0 border border-border/40">
                  <Briefcase className="size-5 text-muted-foreground" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground leading-tight truncate">
                      {c.name}
                    </h4>
                    <Badge variant="outline" className="text-xs font-mono capitalize">
                      {c.service_category?.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {c.contact_phone && <span>Tel: {c.contact_phone}</span>}
                    {c.pix_key && <span>Pix: <code className="font-mono text-xs">{c.pix_key}</code></span>}
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
                    className="h-11 min-h-11 sm:h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold gap-1"
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
                  className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
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
                  className="size-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
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
 <div className="bg-card border border-border/60 rounded-lg overflow-hidden shadow-xs">
 <div className="p-4 border-b border-border/60 flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <span>Vagas de Emprego Publicadas</span>
 <Badge variant="secondary" className="text-xs font-bold">
 {jobs.length}
 </Badge>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.invalidate()}
 className="h-11 min-h-11 sm:h-11 min-h-11 sm:h-9 text-xs gap-1 text-muted-foreground hover:text-foreground"
 >
 <RefreshCw className="size-3.5" />
 <span>Atualizar</span>
 </Button>
 </div>

 {jobs.length === 0 ? (
 <div className="p-12 text-center space-y-3">
 <div className="size-12 rounded-lg bg-muted text-muted-foreground mx-auto flex items-center justify-center">
 <Briefcase className="size-6" />
 </div>
 <p className="text-sm font-semibold text-foreground">Nenhuma vaga aberta no momento</p>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Publique vagas de trabalho para receber currículos de profissionais e candidatos qualificados da cidade.
 </p>
 <Button
 onClick={() => setIsJobOpen(true)}
 className="rounded-lg text-xs font-bold h-11 min-h-11 sm:h-9 bg-primary text-primary-foreground gap-2"
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
 <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
 <Briefcase className="size-5" />
 </div>
 <div className="min-w-0 space-y-1">
 <div className="flex items-center gap-2">
 <p className="text-xs font-bold text-foreground truncate">{job.title}</p>
 <Badge variant="outline" className="text-xs uppercase font-mono font-bold">
 {job.contract_type} • {job.workplace_type}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground truncate">
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
 className="rounded-lg text-xs font-bold h-11 min-h-11 sm:h-11 min-h-11 sm:h-9"
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

 {showPartnerLaw && (
   <TabsContent value="partner_agreement" className="space-y-6 pt-4">
   <PartnerAgreementEditor members={members} storeId={storeId} />
   </TabsContent>
 )}

 <TabsContent value="permissions" className="space-y-6 pt-4">
 <RolePermissionsMatrix storeId={storeId} storeNiche={store?.niche_id || store?.niche || undefined} />
 </TabsContent>
 </Tabs>

 {/* ── SheetPage de Criação de Vaga ── */}
 <SheetPage /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
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
 className="rounded-lg text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleCreateJobSubmit}
 disabled={isCreatingJob}
 className="rounded-lg text-xs font-bold bg-primary text-primary-foreground"
 >
 {isCreatingJob ? "Publicando..." : "Publicar Vaga de Emprego"}
 </Button>
 </div>
 }
 >
 <div className="space-y-4 py-2">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-xs font-bold">Título da Vaga / Cargo</Label>
 <Input
 value={jobForm.title}
 onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
 placeholder="Ex: Atendente de Balcão & Caixa"
 className="h-11 min-h-11 rounded-lg text-xs font-bold"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Nome da Empresa / Estabelecimento</Label>
 <Input
 value={jobForm.company_name}
 onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })}
 placeholder="Ex: Café & Bistrô Central"
 className="h-11 min-h-11 rounded-lg text-xs font-bold"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label className="text-xs font-bold">Tipo de Contrato</Label>
 <Select
 value={jobForm.contract_type}
 onValueChange={(v: any) => setJobForm({ ...jobForm, contract_type: v })}
 >
 <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="CLT">CLT (Efetivo)</SelectItem>
 <SelectItem value="PJ">PJ (Prestador)</SelectItem>
 <SelectItem value="Estágio">Estágio</SelectItem>
 <SelectItem value="Freelancer">Freelancer</SelectItem>
 <SelectItem value="Temporário">Temporário</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Modelo de Trabalho</Label>
 <Select
 value={jobForm.workplace_type}
 onValueChange={(v: any) => setJobForm({ ...jobForm, workplace_type: v })}
 >
 <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="Presencial">Presencial</SelectItem>
 <SelectItem value="Híbrido">Híbrido</SelectItem>
 <SelectItem value="Remoto">Remoto</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Faixa Salarial / Remuneração</Label>
 <Input
 value={jobForm.salary_display}
 onChange={(e) => setJobForm({ ...jobForm, salary_display: e.target.value })}
 placeholder="Ex: R$ 2.500 - R$ 3.200"
 className="h-11 min-h-11 rounded-lg text-xs font-mono font-bold"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Localização / Cidade</Label>
 <Input
 value={jobForm.location}
 onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
 placeholder="Ex: Centro - Chapecó / SC"
 className="h-11 min-h-11 rounded-lg text-xs"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Descrição das Atividades e Responsabilidades</Label>
 <Textarea
 value={jobForm.description}
 onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
 placeholder="Descreva as principais funções, ambiente de trabalho e rotina..."
 className="h-28 rounded-lg text-xs resize-none"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-xs font-bold">Requisitos (1 por linha)</Label>
 <Textarea
 value={jobForm.requirements}
 onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
 className="h-24 rounded-lg text-xs resize-none font-mono"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Benefícios (1 por linha)</Label>
 <Textarea
 value={jobForm.benefits}
 onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
 className="h-24 rounded-lg text-xs resize-none font-mono"
 />
 </div>
 </div>

 <SeoGeoOptimizationPanel
 value={jobSeoGeo}
 onChange={setJobSeoGeo}
 referenceTitle={jobForm.title}
 referenceDescription={jobForm.description}
 referenceAddress={jobForm.location}
 />
 </div>
 </SheetPage>

 {/* ── Modal de Convite de Colaborador ── */}
 <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
 <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto rounded-lg p-6 pt-safe-modal">
 <DialogHeader className="space-y-1 text-left">
 <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
 <UserPlus className="size-5" />
 </div>
 <DialogTitle className="text-lg font-bold text-foreground">Convidar Colaborador</DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Vincule um novo membro à equipe definindo cargo, setor de atendimento, canal WhatsApp padrão e regime contratual.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
 <div className="space-y-2 text-left">
 <Label className="text-xs font-bold text-foreground">Nome Completo</Label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 required
 placeholder="Ex: João da Silva"
 value={inviteName}
 onChange={(e) => setInviteName(e.target.value)}
 className="pl-9 h-11 min-h-11 rounded-lg text-xs bg-muted/30"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">E-mail de Acesso</Label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 required
 type="email"
 placeholder="colaborador@empresa.com"
 value={inviteEmail}
 onChange={(e) => setInviteEmail(e.target.value)}
 className="pl-9 h-11 min-h-11 rounded-lg text-xs bg-muted/30"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Telefone / WhatsApp Pessoal</Label>
 <div className="relative">
 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 type="tel"
 placeholder="(49) 99999-0000"
 value={invitePhone}
 onChange={(e) => setInvitePhone(e.target.value)}
 className="pl-9 h-11 min-h-11 rounded-lg text-xs bg-muted/30"
 />
 </div>
 </div>
 </div>

 <div className="space-y-2 text-left">
 <Label className="text-xs font-bold text-foreground">Senha Inicial de Acesso ao Painel (Opcional)</Label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 type="text"
 minLength={6}
 placeholder="Defina uma senha (mín. 6 dígitos) para entrada direta sem conta civil"
 value={inviteInitialPassword}
 onChange={(e) => setInviteInitialPassword(e.target.value)}
 className="pl-9 h-11 min-h-11 rounded-lg text-xs bg-muted/30 font-mono"
 />
 </div>
 </div>

 <div className="space-y-2 text-left">
 <Label className="text-xs font-bold text-foreground">Cargo e Nível de Permissão</Label>
 <Select
 value={inviteRole}
 onValueChange={(v: any) => setInviteRole(v)}
 >
 <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs bg-muted/30 font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg max-h-64">
 {Object.entries(ROLE_DEFINITIONS)
 .filter(([k]) => k !== "owner")
 .map(([key, item]) => (
 <SelectItem key={key} value={key} className="text-xs py-2">
 <div className="space-y-1">
 <p className="font-bold text-foreground">{item.label}</p>
 <p className="text-xs text-muted-foreground">{item.description}</p>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="border-t border-border/50 pt-4 space-y-3 text-left">
 <p className="text-xs font-bold text-foreground">Vínculo Operacional de Atendimento</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-semibold text-foreground">Setor / Fila Padrão</Label>
 <Select value={inviteDepartmentId} onValueChange={setInviteDepartmentId}>
 <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs bg-muted/30">
 <SelectValue placeholder="Selecione um setor" />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="__none__">Sem setor fixo (Geral)</SelectItem>
 {(departments || []).map((dept: any) => (
 <SelectItem key={dept.id} value={dept.id}>
 {dept.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-semibold text-foreground">Canal WhatsApp Padrão</Label>
 <Select value={inviteWhatsappInstanceId} onValueChange={setInviteWhatsappInstanceId}>
 <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs bg-muted/30">
 <SelectValue placeholder="Canal padrão da loja" />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="__none__">Usar canal padrão da loja</SelectItem>
 {(whatsappInstances || []).map((inst: any) => (
 <SelectItem key={inst.id} value={inst.id}>
 {inst.display_name} ({inst.display_phone_number || inst.instance_key})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
 <div className="space-y-1">
 <Label className="text-xs font-semibold text-foreground">Máx. Chats Simultâneos</Label>
 <Input
 type="number"
 min={1}
 max={200}
 value={inviteMaxConcurrentChats}
 onChange={(e) => setInviteMaxConcurrentChats(Math.max(1, Number(e.target.value) || 10))}
 className="h-11 min-h-11 rounded-lg text-xs font-mono font-bold bg-muted/30"
 />
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 h-11 min-h-11">
 <span className="text-xs font-semibold text-foreground">Atua como Atendente</span>
 <Switch
 checked={inviteIsAttendanceAgent}
 onCheckedChange={setInviteIsAttendanceAgent}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
 <span className="text-xs font-medium text-foreground">Transferir conversas</span>
 <Switch checked={inviteCanTransferChats} onCheckedChange={setInviteCanTransferChats} />
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
 <span className="text-xs font-medium text-foreground">Encerrar tickets</span>
 <Switch checked={inviteCanCloseChats} onCheckedChange={setInviteCanCloseChats} />
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
 <span className="text-xs font-medium text-foreground">Gerenciar QR / Canais</span>
 <Switch checked={inviteCanManageWhatsappQr} onCheckedChange={setInviteCanManageWhatsappQr} />
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
 <span className="text-xs font-medium text-foreground">Restringir ao setor</span>
 <Switch checked={inviteOnlyAssignedOrSector} onCheckedChange={setInviteOnlyAssignedOrSector} />
 </div>
 </div>
 </div>

 <div className="space-y-2 text-left">
 <Label className="text-xs font-bold text-foreground">Regime Jurídico / Tipo de Contrato</Label>
 <Select
 value={inviteContractType}
 onValueChange={(v: any) => setInviteContractType(v)}
 >
 <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs bg-muted/30 font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 {showPartnerLaw && (
   <SelectItem value="partner_law">
     Salão Parceiro (Lei 13.352/2016) — Segregação Fiscal de Cota-Parte
   </SelectItem>
 )}
 <SelectItem value="clt">CLT — Regime Tradicional Celetista</SelectItem>
 <SelectItem value="pj">Prestador PJ / Autônomo — Emissão de NFS-e</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">
   {showPartnerLaw ? "Comissão / Cota-Parte (%)" : "Comissão (%)"}
 </Label>
 <Input
 type="number"
 min={0}
 max={100}
 value={inviteCommissionPercent}
 onChange={(e) => setInviteCommissionPercent(Number(e.target.value) || 0)}
 className="h-11 min-h-11 rounded-lg text-xs font-mono font-bold bg-muted/30"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Absorção de Taxas de Cartão</Label>
 <Select
 value={inviteFeeBearer}
 onValueChange={(v: any) => setInviteFeeBearer(v)}
 >
 <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs bg-muted/30 font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="proportional">Proporcional às cotas</SelectItem>
 <SelectItem value="store_100">Loja 100%</SelectItem>
 <SelectItem value="pro_100">Profissional 100%</SelectItem>
 <SelectItem value="split_50">Meio a Meio (50/50)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-3 pt-1 text-left">
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
 <div className="space-y-1">
 <p className="text-xs font-bold text-foreground">Sigilo de Contatos (LGPD)</p>
 <p className="text-xs text-muted-foreground">Exibe telefone com máscara ((49) 9****-**12) para proteger a carteira de clientes.</p>
 </div>
 <Switch
 checked={inviteCanViewContacts}
 onCheckedChange={setInviteCanViewContacts}
 />
 </div>

 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
 <div className="space-y-1">
 <p className="text-xs font-bold text-foreground">Dedução Automática de Insumos</p>
 <p className="text-xs text-muted-foreground">Abate o custo da ficha técnica dos materiais consumidos no serviço.</p>
 </div>
 <Switch
 checked={inviteAutoDeductSupplies}
 onCheckedChange={setInviteAutoDeductSupplies}
 />
 </div>
 </div>

 <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground flex items-start gap-2">
 <Info className="size-4 text-primary shrink-0 mt-1" />
 <span>O colaborador receberá acesso imediato e restrito única e exclusivamente à sua loja.</span>
 </div>

 <DialogFooter className="pt-3 gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsInviteOpen(false)}
 className="h-11 min-h-11 rounded-lg text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isInviting}
 className="h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:opacity-90"
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
 <AlertDialogContent className="rounded-lg p-6 sm:max-w-md">
 <AlertDialogHeader className="space-y-2 text-left">
 <div className="size-12 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-1">
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
 <AlertDialogCancel className="h-11 min-h-11 rounded-lg text-xs font-semibold">
 Cancelar
 </AlertDialogCancel>
 <AlertDialogAction /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */
 onClick={handleConfirmRemove}
 disabled={isRemoving}
 className="h-11 min-h-11 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 {isRemoving ? "Revogando..." : "Revogar Acesso"}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>

      {/* ── Modal de Cadastro / Edição de Terceirizado ── */}
      <Dialog open={isContractorOpen} onOpenChange={setIsContractorOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-lg">
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
            <div className="space-y-2">
              <Label className="text-xs font-bold">Nome Completo / Razão Social *</Label>
              <Input
                value={contractorForm.name}
                onChange={(e) => setContractorForm({ ...contractorForm, name: e.target.value })}
                placeholder="Ex: João Silva Segurança Eireli"
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Especialidade / Categoria</Label>
                <Select
                  value={contractorForm.serviceCategory}
                  onValueChange={(val: any) => setContractorForm({ ...contractorForm, serviceCategory: val })}
                >
                  <SelectTrigger className="h-11 min-h-11 sm:h-9 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
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

              <div className="space-y-2">
                <Label className="text-xs font-bold">CPF / CNPJ</Label>
                <Input
                  value={contractorForm.documentNumber}
                  onChange={(e) => setContractorForm({ ...contractorForm, documentNumber: e.target.value })}
                  placeholder="000.000.000-00"
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Telefone / WhatsApp</Label>
                <Input
                  value={contractorForm.contactPhone}
                  onChange={(e) => setContractorForm({ ...contractorForm, contactPhone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Chave Pix</Label>
                <Input
                  value={contractorForm.pixKey}
                  onChange={(e) => setContractorForm({ ...contractorForm, pixKey: e.target.value })}
                  placeholder="CPF, CNPJ, E-mail..."
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Valor Hora (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={contractorForm.hourlyRateCents ? contractorForm.hourlyRateCents / 100 : ""}
                  onChange={(e) => setContractorForm({ ...contractorForm, hourlyRateCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  placeholder="Ex: 50.00"
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Valor Diária / Fixo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={contractorForm.fixedFeeCents ? contractorForm.fixedFeeCents / 100 : ""}
                  onChange={(e) => setContractorForm({ ...contractorForm, fixedFeeCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  placeholder="Ex: 350.00"
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsContractorOpen(false)}
                className="rounded-lg text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingContractor}
                className="rounded-lg text-xs font-bold"
              >
                {isSavingContractor ? "Salvando..." : contractorForm.id ? "Atualizar" : "Cadastrar Prestador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Sheet de Edição Completa de Vínculos Operacionais & RH ── */}
      <Sheet open={Boolean(editingMember)} onOpenChange={(open) => !open && !isSavingMember && setEditingMember(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto pt-safe-modal p-6">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="text-base font-bold text-foreground">
              Vínculos do Colaborador
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {editingMember?.email || "Configure setor de atendimento, número WhatsApp padrão e regime contratual."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSaveEditMember} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Nome Completo</Label>
                <Input
                  value={editMemberForm.fullName}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, fullName: e.target.value })}
                  className="h-11 min-h-11 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Telefone / WhatsApp</Label>
                <Input
                  type="tel"
                  value={editMemberForm.phone}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                  placeholder="(49) 99999-0000"
                  className="h-11 min-h-11 rounded-lg text-xs"
                />
              </div>
            </div>

            {!editMemberForm.isOwner && (
              <div className="space-y-1 text-left">
                <Label className="text-xs font-bold">Cargo e Permissão</Label>
                <Select
                  value={editMemberForm.role}
                  onValueChange={(v: any) => setEditMemberForm({ ...editMemberForm, role: v })}
                >
                  <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {Object.entries(ROLE_DEFINITIONS)
                      .filter(([k]) => k !== "owner")
                      .map(([key, item]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {item.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border-t border-border/50 pt-4 space-y-3 text-left">
              <p className="text-xs font-bold text-foreground">Acesso Direto ao Painel (Sem Conta Civil)</p>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Link Direto do Colaborador</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    readOnly
                    value={buildMemberDirectPanelUrl(editingMember?.email)}
                    className="h-11 min-h-11 rounded-lg text-xs font-mono bg-muted/30 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      handleCopyMemberAccessLink(
                        { ...editingMember, role: editMemberForm.role },
                        editMemberForm.newPassword.trim() || undefined,
                      )
                    }
                    className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  >
                    <ExternalLink className="size-3.5 text-primary" />
                    <span>Copiar Link</span>
                  </Button>
                  {(editMemberForm.phone || editingMember?.phone) && (
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                    >
                      <a
                        href={`https://wa.me/55${String(editMemberForm.phone || editingMember?.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Olá ${editMemberForm.fullName || editingMember?.full_name || ""}, seu acesso direto ao painel (${ROLE_DEFINITIONS[editMemberForm.role]?.label || editMemberForm.role}) está liberado:\nLink: ${buildMemberDirectPanelUrl(editingMember?.email)}\nE-mail: ${editingMember?.email || ""}${editMemberForm.newPassword.trim() ? `\nSenha: ${editMemberForm.newPassword.trim()}` : ""}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Smartphone className="size-3.5 text-primary" />
                        <span>Enviar WhatsApp</span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Definir / Redefinir Senha de Acesso</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    minLength={6}
                    value={editMemberForm.newPassword}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, newPassword: e.target.value })}
                    placeholder="Digite uma nova senha (mín. 6 dígitos) se quiser alterar"
                    className="pl-9 h-11 min-h-11 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-3 text-left">
              <p className="text-xs font-bold text-foreground">Operação de Atendimento & WhatsApp</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Setor / Fila Padrão</Label>
                  <Select
                    value={editMemberForm.departmentId}
                    onValueChange={(v) => setEditMemberForm({ ...editMemberForm, departmentId: v })}
                  >
                    <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="__none__">Sem setor fixo</SelectItem>
                      {(departments || []).map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Canal WhatsApp Padrão</Label>
                  <Select
                    value={editMemberForm.whatsappInstanceId}
                    onValueChange={(v) => setEditMemberForm({ ...editMemberForm, whatsappInstanceId: v })}
                  >
                    <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="__none__">Canal padrão da loja</SelectItem>
                      {(whatsappInstances || []).map((inst: any) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.display_name} ({inst.display_phone_number || inst.instance_key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Presença no Chat</Label>
                  <Select
                    value={editMemberForm.attendancePresence}
                    onValueChange={(v: any) => setEditMemberForm({ ...editMemberForm, attendancePresence: v })}
                  >
                    <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="busy">Ocupado</SelectItem>
                      <SelectItem value="away">Em pausa</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Máx. Chats Simultâneos</Label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={editMemberForm.maxConcurrentChats}
                    onChange={(e) =>
                      setEditMemberForm({
                        ...editMemberForm,
                        maxConcurrentChats: Math.max(1, Number(e.target.value) || 10),
                      })
                    }
                    className="h-11 min-h-11 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs font-medium">Atua no Atendimento</span>
                  <Switch
                    checked={editMemberForm.isAttendanceAgent}
                    onCheckedChange={(v) => setEditMemberForm({ ...editMemberForm, isAttendanceAgent: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs font-medium">Transferir conversas</span>
                  <Switch
                    checked={editMemberForm.canTransferChats}
                    onCheckedChange={(v) => setEditMemberForm({ ...editMemberForm, canTransferChats: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs font-medium">Encerrar tickets</span>
                  <Switch
                    checked={editMemberForm.canCloseChats}
                    onCheckedChange={(v) => setEditMemberForm({ ...editMemberForm, canCloseChats: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs font-medium">Gerenciar QR WhatsApp</span>
                  <Switch
                    checked={editMemberForm.canManageWhatsappQr}
                    onCheckedChange={(v) => setEditMemberForm({ ...editMemberForm, canManageWhatsappQr: v })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-xs font-medium">Restringir visualização ao próprio setor / atribuídos</span>
                <Switch
                  checked={editMemberForm.onlyAssignedOrSector}
                  onCheckedChange={(v) => setEditMemberForm({ ...editMemberForm, onlyAssignedOrSector: v })}
                />
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-3 text-left">
              <p className="text-xs font-bold text-foreground">Regime Contratual & Comissionamento</p>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Contrato</Label>
                <Select
                  value={editMemberForm.contractType}
                  onValueChange={(v: any) => setEditMemberForm({ ...editMemberForm, contractType: v })}
                >
                  <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {showPartnerLaw && (
                      <SelectItem value="partner_law">
                        Salão Parceiro (Lei 13.352/2016)
                      </SelectItem>
                    )}
                    <SelectItem value="clt">CLT</SelectItem>
                    <SelectItem value="pj">PJ / Autônomo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Comissão (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editMemberForm.commissionPercent}
                    onChange={(e) =>
                      setEditMemberForm({
                        ...editMemberForm,
                        commissionPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      })
                    }
                    className="h-11 min-h-11 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Taxas de Cartão</Label>
                  <Select
                    value={editMemberForm.feeBearer}
                    onValueChange={(v: any) => setEditMemberForm({ ...editMemberForm, feeBearer: v })}
                  >
                    <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="proportional">Proporcional às cotas</SelectItem>
                      <SelectItem value="store_100">Loja 100%</SelectItem>
                      <SelectItem value="pro_100">Profissional 100%</SelectItem>
                      <SelectItem value="split_50">Meio a Meio (50/50)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs font-medium">Ver contatos sem máscara</span>
                  <Switch
                    checked={editMemberForm.canViewUnmaskedContacts}
                    onCheckedChange={(v) =>
                      setEditMemberForm({ ...editMemberForm, canViewUnmaskedContacts: v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs font-medium">Deduzir insumos auto</span>
                  <Switch
                    checked={editMemberForm.autoDeductSupplies}
                    onCheckedChange={(v) =>
                      setEditMemberForm({ ...editMemberForm, autoDeductSupplies: v })
                    }
                  />
                </div>
              </div>
            </div>

            <SheetFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMember(null)}
                disabled={isSavingMember}
                className="h-11 min-h-11 rounded-lg text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingMember}
                className="h-11 min-h-11 rounded-lg text-xs font-bold"
              >
                {isSavingMember ? "Salvando..." : "Salvar Vínculos"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet de Produção Comercial & Premiações Por Fora do Membro */}
      <Sheet
        open={Boolean(selectedMemberCommercial)}
        onOpenChange={(open) => !open && setSelectedMemberCommercial(null)}
      >
        <SheetContent side="right" className="sm:max-w-3xl w-full p-6 overflow-y-auto pt-safe-modal">
          <SheetHeader className="pb-4 border-b border-border mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Award className="size-5 text-primary" />
              {selectedMemberCommercial?.full_name || "Perfil Comercial"}
            </SheetTitle>
            <SheetDescription>
              Vendas mensais, crescimento comparativo, faixa ativa e recibos por fora da folha CLT.
            </SheetDescription>
          </SheetHeader>
          {selectedMemberCommercial && (
            <EmployeeCommercialProfilePanel
              profileId={selectedMemberCommercial.id}
              canManagePayouts
            />
          )}
        </SheetContent>
      </Sheet>
 </div>
 );
}
