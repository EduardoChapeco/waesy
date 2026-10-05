import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  ShieldAlert,
  FileText,
  Key,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Download,
  Copy,
  UserCheck,
  Activity,
  ShoppingCart,
  Car,
  Briefcase,
  Store,
  RefreshCw,
  Send,
  Eye,
  Clock,
  ShieldCheck,
  Check,
  XCircle,
} from "lucide-react";
import {
  listAllUsers,
  applyUserSanction,
  adminTriggerPasswordReset,
  adminUpdateUserRole,
} from "@/services/master.functions";
import {
  getUserFull360Activity,
  adminForceSetUserPassword,
  adminTransferStoreOwnership,
  adminToggleUserAccess,
} from "@/services/admin-360-governance.functions";
import { triggerCivilIdentityRippleCascade } from "@/services/deep-core.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SheetPage } from "@/components/ui/sheet-page";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { ErrorState } from "@/components/state/states";

export const Route = createFileRoute("/admin-master/usuarios")({
  head: () => ({
    meta: [{ title: "Gestão Global de Usuários e Governança 360º | Admin Master" }],
  }),
  loader: async () => {
    try {
      const users = await listAllUsers().catch(() => []);
      return { users: users || [] };
    } catch {
      return { users: [] };
    }
  },
  component: AdminUsuariosPage,
  errorComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-20">
      <ErrorState
        title="Painel de Usuários Indisponível"
        description="Não foi possível carregar os dados de usuários no momento. Verifique sua conexão e permissão de acesso."
        onRetry={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
      />
    </div>
  ),
});

type DossierTab =
  | "general"
  | "kyc"
  | "forms"
  | "telemetry"
  | "commerce"
  | "mobility"
  | "staff";

function AdminUsuariosPage() {
  const { users: initialUsers } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [dossierData, setDossierData] = useState<any | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [activeDossierTab, setActiveDossierTab] = useState<DossierTab>("general");

  // Admin Quick Actions States
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isTogglingAccess, setIsTogglingAccess] = useState(false);

  // Transfer Store Ownership States
  const [isTransferStoreOpen, setIsTransferStoreOpen] = useState(false);
  const [transferStoreId, setTransferStoreId] = useState("");
  const [transferNewOwnerId, setTransferNewOwnerId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [isTransferringStore, setIsTransferringStore] = useState(false);

  // Sanction Modal States
  const [isSanctionModalOpen, setIsSanctionModalOpen] = useState(false);
  const [sanctionType, setSanctionType] = useState<string>("warning");
  const [sanctionReason, setSanctionReason] = useState("");
  const [durationDays, setDurationDays] = useState<number>(7);
  const [isApplyingSanction, setIsApplyingSanction] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRoleId(userId);
    try {
      const res = await adminUpdateUserRole({
        data: { targetUserId: userId, newRole: newRole as any },
      });
      toast.success(res.message);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar nível do usuário.");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const filteredUsers = (initialUsers || []).filter((u: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.tax_id?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    );
  });

  const handleOpenDossier = async (user: any) => {
    setSelectedUser(user);
    setIsLoadingDossier(true);
    setActiveDossierTab("general");
    setNewPasswordInput("");
    try {
      const res = await getUserFull360Activity({ data: { userId: user.id } });
      setDossierData(res);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao carregar Dossiê 360º de governança."
      );
    } finally {
      setIsLoadingDossier(false);
    }
  };

  const handleForcePasswordChange = async () => {
    if (!selectedUser || !newPasswordInput.trim()) {
      toast.error("Informe a nova senha (mínimo de 8 caracteres).");
      return;
    }
    if (newPasswordInput.trim().length < 8) {
      toast.error("A senha deve conter no mínimo 8 caracteres.");
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await adminForceSetUserPassword({
        data: {
          userId: selectedUser.id,
          newPassword: newPasswordInput.trim(),
        },
      });
      toast.success(res.message || "Nova senha administrativa aplicada com sucesso!");
      setNewPasswordInput("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao alterar senha do usuário.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendResetPassword = async (email: string) => {
    if (!confirm(`Deseja disparar um link mágico de redefinição de senha para ${email}?`))
      return;
    try {
      const res = await adminTriggerPasswordReset({ data: { email } });
      toast.success(res.message);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao enviar e-mail de recuperação"
      );
    }
  };

  const handleToggleAccess = async (shouldBlock: boolean) => {
    if (!selectedUser) return;
    const actionLabel = shouldBlock ? "bloquear" : "desbloquear";
    if (
      !confirm(
        `Tem certeza que deseja ${actionLabel} imediatamente o acesso de ${
          selectedUser.full_name || selectedUser.email
        }?`
      )
    )
      return;

    setIsTogglingAccess(true);
    try {
      const res = await adminToggleUserAccess({
        data: {
          userId: selectedUser.id,
          block: shouldBlock,
          reason: `Ação imediata pelo Master Admin em ${new Date().toISOString()}`,
        },
      });
      toast.success(res.message || `Acesso do usuário ${shouldBlock ? "bloqueado" : "desbloqueado"} com sucesso!`);
      router.invalidate();
      if (dossierData) {
        const refreshed = await getUserFull360Activity({
          data: { userId: selectedUser.id },
        }).catch(() => null);
        if (refreshed) setDossierData(refreshed);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao alterar status de acesso.");
    } finally {
      setIsTogglingAccess(false);
    }
  };

  const handleTransferStore = async () => {
    if (!transferStoreId.trim() || !transferNewOwnerId.trim()) {
      toast.error("Informe o ID do estabelecimento e o ID do novo titular.");
      return;
    }

    setIsTransferringStore(true);
    try {
      const res = await adminTransferStoreOwnership({
        data: {
          storeId: transferStoreId.trim(),
          newOwnerId: transferNewOwnerId.trim(),
          reason: transferReason.trim() || "Transferência de titularidade societária",
        },
      });
      toast.success(res.message || "Titularidade societária transferida com sucesso!");
      setIsTransferStoreOpen(false);
      setTransferStoreId("");
      setTransferNewOwnerId("");
      setTransferReason("");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao transferir titularidade.");
    } finally {
      setIsTransferringStore(false);
    }
  };

  const handleApplySanction = async () => {
    if (!selectedUser) return;
    if (!sanctionReason.trim()) {
      toast.error("Informe o motivo da sanção disciplinar.");
      return;
    }

    setIsApplyingSanction(true);
    try {
      await applyUserSanction({
        data: {
          userId: selectedUser.id,
          sanctionType: sanctionType as any,
          reason: sanctionReason,
          durationDays: sanctionType === "ban_temporary" ? durationDays : undefined,
        },
      });

      if (sanctionType !== "warning") {
        const cascadeRes = await triggerCivilIdentityRippleCascade({
          data: {
            targetProfileId: selectedUser.id,
            action: sanctionType.includes("permanent") ? "ban" : "suspend",
            reason: sanctionReason,
          },
        }).catch(() => null);

        if (cascadeRes?.ripple_effect) {
          const r = cascadeRes.ripple_effect;
          toast.success(
            `Cascata executada: ${r.archived_classifieds} classificados arquivados, ${r.withdrawn_job_applications} candidaturas retiradas e ${r.paused_ad_campaigns} campanhas pausadas.`
          );
        } else {
          toast.success("Sanção disciplinar e cascata sistêmica aplicadas!");
        }
      } else {
        toast.success("Sanção disciplinar aplicada com sucesso!");
      }
      setIsSanctionModalOpen(false);
      setSelectedUser(null);
      setSanctionReason("");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar sanção");
    } finally {
      setIsApplyingSanction(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" />
            Usuários & Governança 360º
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle irrestrito de acessos, dossiês judiciais 360º, telemetria e sanções disciplinares.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Buscar por nome, email, CPF ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-card rounded-lg overflow-hidden border">
        <div className="divide-y divide-border">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum usuário encontrado com os filtros atuais.
            </div>
          ) : (
            filteredUsers.map((u: any) => {
              const activeSanctions = (u.user_moderation_sanctions || []).filter(
                (s: any) => s.is_active
              );

              return (
                <div
                  key={u.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors motion-reduce:transition-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {u.full_name || "Usuário sem nome"}
                      </span>
                      <Badge variant="outline" className="text-xs uppercase font-mono">
                        {u.role}
                      </Badge>
                      {u.is_verified && (
                        <Badge className="bg-primary/10 text-primary text-xs font-semibold gap-1">
                          <Check className="size-3" />
                          <span>Verificado</span>
                        </Badge>
                      )}
                      {activeSanctions.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {activeSanctions.length} Sanção(ões) Ativa(s)
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                      <span>Email: {u.email || "Não informado"}</span>
                      <span>CPF/Doc: {u.tax_id || "Não informado"}</span>
                      <span>ID: {u.id.slice(0, 8)}...</span>
                      <span>Cadastrado em {formatDateTime(u.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-40">
                      <Select
                        value={u.role || "customer"}
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                        disabled={updatingRoleId === u.id}
                      >
                        <SelectTrigger className="h-11 min-h-11 text-xs font-mono font-medium rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">customer (Cliente)</SelectItem>
                          <SelectItem value="store_owner">store_owner (Lojista)</SelectItem>
                          <SelectItem value="operator">operator (Operador)</SelectItem>
                          <SelectItem value="platform_admin">platform_admin (Master)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 min-h-11 px-4 text-xs font-bold gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => handleOpenDossier(u)}
                    >
                      <FileText className="size-4" />
                      Dossiê 360º
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 min-h-11 px-4 text-xs font-bold gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => {
                        setSelectedUser(u);
                        setIsSanctionModalOpen(true);
                      }}
                    >
                      <ShieldAlert className="size-4" />
                      Sanção
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SheetPage de Dossiê 360º com 7 Abas Operacionais */}
      <SheetPage
        open={!!dossierData || isLoadingDossier}
        onOpenChange={(open) => {
          if (!open) {
            setDossierData(null);
            setSelectedUser(null);
          }
        }}
        title="Dossiê 360º de Governança & Atividade Integral"
        size="lg"
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setDossierData(null);
              setSelectedUser(null);
            }}
            className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary"
          >
            Fechar Dossiê
          </Button>
        }
      >
        {isLoadingDossier ? (
          <div className="py-16 flex flex-col justify-center items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Consolidando Dossiê 360º nas 7 dimensões forenses...</span>
          </div>
        ) : dossierData ? (
          <div className="space-y-4 py-2 text-xs">
            {/* Header de Certificação SHA-256 */}
            <div className="bg-muted/40 p-3 rounded-lg space-y-1 border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Certificação Criptográfica SHA-256 (Imutabilidade Jurídica):
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 min-h-11 px-3 text-xs gap-2 rounded-lg font-bold focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(dossierData.sha256_certification);
                    toast.success("Hash copiado com sucesso!");
                  }}
                >
                  <Copy className="size-4" /> Copiar Hash
                </Button>
              </div>
              <p className="font-mono text-xs break-all text-primary font-bold">
                {dossierData.sha256_certification}
              </p>
            </div>

            {/* Navegação entre as 7 Abas */}
            <div className="flex items-center gap-2 flex-wrap border-b pb-2">
              <Button
                variant={activeDossierTab === "general" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDossierTab("general")}
                className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                Geral & Acessos
              </Button>
              <Button
                variant={activeDossierTab === "kyc" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDossierTab("kyc")}
                className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                Documentos & KYC
              </Button>
              <Button
                variant={activeDossierTab === "forms" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDossierTab("forms")}
                className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                Formulários ({dossierData.dossier?.form_submissions?.length || 0})
              </Button>
              <Button
                variant={activeDossierTab === "telemetry" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDossierTab("telemetry")}
                className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                Telemetria ({dossierData.dossier?.telemetry_logs?.length || 0})
              </Button>
              <Button
                variant={activeDossierTab === "commerce" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDossierTab("commerce")}
                className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                E-Commerce & Carrinhos
              </Button>
              <Button
                variant={activeDossierTab === "mobility" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDossierTab("mobility")}
                className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                Mobilidade & GPS ({dossierData.dossier?.mobility_rides?.length || 0})
              </Button>
              <Button
                variant={activeDossierTab === "staff" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDossierTab("staff")}
                className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                Ações como Operador ({dossierData.dossier?.staff_actions?.length || 0})
              </Button>
            </div>

            {/* Conteúdo da Aba 1: Geral & Acessos */}
            {activeDossierTab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 border rounded-lg bg-card">
                    <span className="text-muted-foreground block text-xs">Nome Completo</span>
                    <span className="font-bold">{dossierData.dossier?.profile?.full_name || "Sem nome"}</span>
                  </div>
                  <div className="p-3 border rounded-lg bg-card">
                    <span className="text-muted-foreground block text-xs">Email</span>
                    <span className="font-bold">{dossierData.dossier?.profile?.email || "Sem email"}</span>
                  </div>
                  <div className="p-3 border rounded-lg bg-card">
                    <span className="text-muted-foreground block text-xs">CPF/CNPJ</span>
                    <span className="font-mono font-bold">{dossierData.dossier?.profile?.tax_id || "Não informado"}</span>
                  </div>
                  <div className="p-3 border rounded-lg bg-card">
                    <span className="text-muted-foreground block text-xs">Nível de Acesso</span>
                    <span className="font-mono font-bold uppercase text-primary">{dossierData.dossier?.profile?.role || "customer"}</span>
                  </div>
                </div>

                {/* Controles de Redefinição Forçada de Senha & Magic Link */}
                <div className="p-4 border rounded-lg bg-card space-y-3">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                    <Key className="size-4 text-primary" />
                    Gestão de Credenciais e Acesso do Usuário
                  </h4>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Input
                      type="password"
                      placeholder="Digitar nova senha (mínimo 8 caracteres)..."
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                    <Button
                      onClick={handleForcePasswordChange}
                      disabled={isResettingPassword}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {isResettingPassword ? "Gravando..." : "Definir Nova Senha"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSendResetPassword(dossierData.dossier?.profile?.email)}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg shrink-0 gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Send className="size-4" />
                      Disparar Magic Link
                    </Button>
                  </div>
                </div>

                {/* Bloqueio / Desbloqueio e Transferência de Lojas */}
                <div className="p-4 border rounded-lg bg-card space-y-3">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="size-4 text-destructive" />
                    Controles de Segurança e Titularidade Societária
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => handleToggleAccess(true)}
                      disabled={isTogglingAccess}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Ban className="size-4" />
                      Bloquear Acesso Imediatamente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleToggleAccess(false)}
                      disabled={isTogglingAccess}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      Reativar Acesso
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsTransferStoreOpen(true)}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Store className="size-4 text-amber-500" />
                      Transferir Titularidade de Loja
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da Aba 2: Documentos & KYC */}
            {activeDossierTab === "kyc" && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-card space-y-3">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    Ficha Cadastral e Validação Biométrica
                  </h4>
                  {dossierData.dossier?.kyc?.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhum envio de documento ou biometria registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {dossierData.dossier?.kyc?.map((k: any) => (
                        <div key={k.id} className="p-3 border rounded-lg bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{k.full_name} ({k.document_type || "CNH/RG"})</span>
                            <Badge variant={k.status === "match_approved" ? "default" : "outline"}>
                              {k.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-mono">
                            <span>Documento: {k.document_number || "Não informado"}</span>
                            <span>Enviado em: {formatDateTime(k.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conteúdo da Aba 3: Formulários & Cadastros */}
            {activeDossierTab === "forms" && (
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Histórico de Formulários Preenchidos
                </h4>
                {dossierData.dossier?.form_submissions?.length === 0 ? (
                  <p className="text-muted-foreground text-xs p-4 border rounded-lg bg-card">
                    Nenhum formulário registrado para este usuário.
                  </p>
                ) : (
                  <div className="divide-y divide-border border rounded-lg bg-card">
                    {dossierData.dossier?.form_submissions?.map((f: any) => (
                      <div key={f.id} className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">{f.form_name || f.form_type}</span>
                          <span className="font-mono text-xs text-muted-foreground">{formatDateTime(f.created_at)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-3 font-mono">
                          <span>Rota: {f.route_path || f.route}</span>
                          {f.ip_address && <span>IP: {f.ip_address}</span>}
                        </div>
                        <pre className="p-2 bg-muted/40 rounded border font-mono text-xs max-h-32 whitespace-pre-wrap break-all">
                          {JSON.stringify(f.sanitized_payload || f.payload || {}, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba 4: Telemetria & Navegação */}
            {activeDossierTab === "telemetry" && (
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Trilha de Telemetria Invisível (Segundo a Segundo)
                </h4>
                {dossierData.dossier?.telemetry_logs?.length === 0 ? (
                  <p className="text-muted-foreground text-xs p-4 border rounded-lg bg-card">
                    Nenhum registro de telemetria capturado para este perfil.
                  </p>
                ) : (
                  <div className="divide-y divide-border border rounded-lg bg-card max-h-96 overflow-y-auto">
                    {dossierData.dossier?.telemetry_logs?.map((t: any) => (
                      <div key={t.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-foreground">{t.event_type}</span>
                          <p className="font-mono text-muted-foreground">{t.path}</p>
                          <div className="text-muted-foreground flex gap-2 font-mono">
                            <span>Dwell: {t.dwell_time_ms || 0}ms</span>
                            {t.ip_masked && <span>IP: {t.ip_masked}</span>}
                          </div>
                        </div>
                        <span className="font-mono text-muted-foreground shrink-0">{formatDateTime(t.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba 5: E-Commerce & Carrinhos */}
            {activeDossierTab === "commerce" && (
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="size-4 text-primary" />
                  Eventos de Carrinho e Afinidade com Estabelecimentos
                </h4>
                {dossierData.dossier?.cart_telemetry?.length === 0 ? (
                  <p className="text-muted-foreground text-xs p-4 border rounded-lg bg-card">
                    Nenhum evento de carrinho registrado.
                  </p>
                ) : (
                  <div className="divide-y divide-border border rounded-lg bg-card">
                    {dossierData.dossier?.cart_telemetry?.map((c: any) => (
                      <div key={c.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold capitalize">{c.event_type}</span>
                          <p className="text-muted-foreground font-mono">Loja ID: {c.store_id}</p>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold">{formatMoney(c.total_cart_cents || 0)}</span>
                          <span className="block text-muted-foreground">{formatDateTime(c.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba 6: Mobilidade & GPS */}
            {activeDossierTab === "mobility" && (
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                  <Car className="size-4 text-primary" />
                  Histórico de Viagens, Fretes e Trajetos GPS
                </h4>
                {dossierData.dossier?.mobility_rides?.length === 0 ? (
                  <p className="text-muted-foreground text-xs p-4 border rounded-lg bg-card">
                    Nenhuma corrida ou frete registrado para este perfil.
                  </p>
                ) : (
                  <div className="divide-y divide-border border rounded-lg bg-card">
                    {dossierData.dossier?.mobility_rides?.map((r: any) => (
                      <div key={r.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <span className="font-bold">Corrida/Frete: {r.id.slice(0, 8)}</span>
                          <p className="text-muted-foreground">Status: {r.status}</p>
                        </div>
                        <span className="font-mono text-muted-foreground">{formatDateTime(r.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba 7: Ações como Operador */}
            {activeDossierTab === "staff" && (
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="size-4 text-primary" />
                  Ações Corporativas em Painéis de Estabelecimentos (Vínculo com CPF)
                </h4>
                {dossierData.dossier?.staff_actions?.length === 0 ? (
                  <p className="text-muted-foreground text-xs p-4 border rounded-lg bg-card">
                    Nenhuma ação corporativa de operador registrada para este usuário.
                  </p>
                ) : (
                  <div className="divide-y divide-border border rounded-lg bg-card">
                    {dossierData.dossier?.staff_actions?.map((s: any) => (
                      <div key={s.id} className="p-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{s.module}: {s.action}</span>
                          <span className="font-mono text-muted-foreground">{formatDateTime(s.created_at)}</span>
                        </div>
                        <p className="text-muted-foreground font-mono">Loja ID: {s.store_id} | CPF Operador: {s.operator_cpf || "Vinculado"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </SheetPage>

      {/* Modal de Transferência de Titularidade Societária */}
      <SheetPage
        open={isTransferStoreOpen}
        onOpenChange={setIsTransferStoreOpen}
        title="Transferir Titularidade de Estabelecimento"
        size="default"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsTransferStoreOpen(false)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransferStore}
              disabled={isTransferringStore}
              className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isTransferringStore ? "Transferindo..." : "Confirmar Transferência"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold">ID do Estabelecimento (Store UUID) *</Label>
            <Input
              placeholder="ex: 5108ce27-2df1-4ce2-89f2-681fea6dba95"
              value={transferStoreId}
              onChange={(e) => setTransferStoreId(e.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold">ID do Novo Proprietário (User UUID) *</Label>
            <Input
              placeholder="ex: 2ea9f0aa-8b04-4086-9e1d-e23105560302"
              value={transferNewOwnerId}
              onChange={(e) => setTransferNewOwnerId(e.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold">Motivação / Fundamentação Legal</Label>
            <Textarea
              placeholder="Informe a justificativa societária ou determinação contratual..."
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="rounded-lg text-xs"
              rows={3}
            />
          </div>
        </div>
      </SheetPage>

      {/* SheetPage de Aplicação de Sanção Disciplinar */}
      <SheetPage
        open={isSanctionModalOpen}
        onOpenChange={setIsSanctionModalOpen}
        title="Aplicar Sanção Disciplinar"
        size="default"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsSanctionModalOpen(false)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleApplySanction}
              disabled={isApplyingSanction}
              className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isApplyingSanction ? "Aplicando..." : "Confirmar Sanção"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Tipo de Sanção</Label>
            <Select value={sanctionType} onValueChange={setSanctionType}>
              <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                <SelectValue placeholder="Selecione a sanção..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">Advertência Formal</SelectItem>
                <SelectItem value="mute_comments">Bloquear Comentários (Mute)</SelectItem>
                <SelectItem value="block_posts">Proibir Postagens no Mural</SelectItem>
                <SelectItem value="block_classifieds">Proibir Criação de Anúncios</SelectItem>
                <SelectItem value="block_commerce">Bloquear Compras / Transações</SelectItem>
                <SelectItem value="ban_temporary">Banimento Temporário (Dias)</SelectItem>
                <SelectItem value="ban_permanent">Banimento Permanente da Conta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sanctionType === "ban_temporary" && (
            <div className="space-y-1">
              <Label className="text-xs font-bold">Duração do Banimento (Dias)</Label>
              <Input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 7)}
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-bold">Motivo & Parecer do Auditor *</Label>
            <Textarea
              value={sanctionReason}
              onChange={(e) => setSanctionReason(e.target.value)}
              placeholder="Descreva a fundamentação legal ou violação de termos..."
              rows={3}
              className="rounded-lg text-xs"
            />
          </div>
        </div>
      </SheetPage>
    </div>
  );
}
export default AdminUsuariosPage;
