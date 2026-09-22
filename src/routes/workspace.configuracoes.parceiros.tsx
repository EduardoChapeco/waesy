import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Link2,
  Share2,
  Users,
  Loader2,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getAffiliateLink, getMyCommissionProfile } from "@/services/affiliates.functions";
import {
  listStoreAccountants,
  inviteAccountantToStore,
  revokeAccountantAccess,
} from "@/services/b2b-partners.functions";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/configuracoes/parceiros")({
  head: () => ({ meta: [{ title: "Configurações de Parceiros & Contabilidade | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [profile, accountants] = await Promise.all([
        getMyCommissionProfile().catch(() => null),
        listStoreAccountants().catch(() => []),
      ]);
      return { initialProfile: profile, initialAccountants: accountants };
    } catch (err) {
      console.error("[loader:workspace.configuracoes.parceiros] Unhandled error:", err);
      return { initialProfile: null, initialAccountants: [] };
    }
  },
  component: ConfigParceirosPage,
});

function ConfigParceirosPage() {
  const { initialProfile, initialAccountants } = ((Route.useLoaderData?.() as any) || {});
  const [baseUrl] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const queryClient = useQueryClient();

  // Affiliate Profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["my-commission-profile"],
    queryFn: () => getMyCommissionProfile(),
    initialData: initialProfile,
    staleTime: 60_000,
  });

  // B2B Accountants
  const { data: accountants = [], isLoading: isLoadingAccountants } = useQuery({
    queryKey: ["store-accountants"],
    queryFn: () => listStoreAccountants(),
    initialData: initialAccountants,
    staleTime: 30_000,
  });

  // Modal State for Inviting Accountant
  const [isAccountantModalOpen, setIsAccountantModalOpen] = useState(false);
  const [accountantEmail, setAccountantEmail] = useState("");
  const [accountantCrc, setAccountantCrc] = useState("");
  const [permDre, setPermDre] = useState(true);
  const [permInvoices, setPermInvoices] = useState(true);
  const [permSettlement, setPermSettlement] = useState(true);
  const [permXml, setPermXml] = useState(true);

  const generateLink = useMutation({
    mutationFn: () => getAffiliateLink({ data: { baseUrl } }),
    onSuccess: async (data) => {
      await navigator.clipboard.writeText(data.link);
      toast.success("Link de indicação copiado para a área de transferência!");
      queryClient.invalidateQueries({ queryKey: ["my-commission-profile"] });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao gerar link de afiliação");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!accountantEmail.trim() || !accountantEmail.includes("@")) {
        throw new Error("Informe um e-mail válido para o escritório contábil.");
      }
      return inviteAccountantToStore({
        data: {
          accountant_email: accountantEmail.trim(),
          accountant_crc: accountantCrc.trim() || undefined,
          permissions: {
            view_dre: permDre,
            view_invoices: permInvoices,
            view_settlement: permSettlement,
            download_xml: permXml,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Convite contábil enviado e registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["store-accountants"] });
      setIsAccountantModalOpen(false);
      setAccountantEmail("");
      setAccountantCrc("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao convidar escritório contábil.");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (accessId: string) => {
      return revokeAccountantAccess({ data: { accessId } });
    },
    onSuccess: () => {
      toast.success("Acesso contábil revogado com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["store-accountants"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao revogar acesso.");
    },
  });

  if (isLoadingProfile && isLoadingAccountants) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* ── 1. Meu Perfil de Parceiro & Afiliado ── */}
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Meu Perfil de Parceiro & Divulgação</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seu link de divulgação e acompanhe seus ganhos diretos com a plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-paper rounded-2xl p-5 flex flex-col items-start gap-4 border border-border/70 shadow-xs">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Link2 className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Link Mágico de Indicação</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                Compartilhe este link com seus clientes. Todas as contratações realizadas através dele
                gerarão comissões automáticas para sua conta.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => generateLink.mutate()}
                  disabled={generateLink.isPending}
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  {generateLink.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                  Copiar Link Mágico
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-surface-paper rounded-2xl p-5 flex flex-col items-start gap-4 border border-border/70 shadow-xs">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="size-5 text-primary" />
            </div>
            <div className="w-full">
              <h2 className="font-semibold text-foreground">Minhas Comissões de Afiliado</h2>
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa Base:</span>
                  <span className="font-mono font-medium">{profile?.commissionRate || 10}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pendente:</span>
                  <span className="font-mono font-medium text-amber-500">
                    {formatMoney(profile?.pendingCents ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/40">
                  <span className="text-foreground font-semibold">Total Recebido:</span>
                  <span className="font-mono font-bold text-emerald-500">
                    {formatMoney(profile?.paidCents ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Acesso Contábil & Fiscal B2B ── */}
      <div className="space-y-4 border-t border-border/60 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              Contabilidade & Acesso Fiscal B2B
            </h2>
            <p className="text-sm text-muted-foreground">
              Delegue acesso seguro de leitura para o seu contador consultar DRE, baixar XMLs de venda e auditar liquidações financeiras.
            </p>
          </div>
          <Button
            onClick={() => setIsAccountantModalOpen(true)}
            className="rounded-xl text-xs font-bold gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-4" />
            Convidar Escritório Contábil
          </Button>
        </div>

        {accountants.length === 0 ? (
          <div className="bg-surface-paper rounded-2xl p-6 border border-dashed border-border/80 text-center space-y-2">
            <FileSpreadsheet className="size-8 text-muted-foreground/60 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Nenhum escritório contábil vinculado</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Ao convidar seu contador, ele poderá acessar um painel dedicado com resumo do faturamento, exportação de XMLs e extrato de liquidações sem ter acesso a configurações restritas da sua empresa.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAccountantModalOpen(true)}
              className="rounded-xl text-xs mt-2"
            >
              Convidar Contador Agora
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accountants.map((acc: any) => {
              const perms = acc.permissions || {};
              return (
                <div
                  key={acc.id}
                  className="bg-surface-paper rounded-2xl p-5 border border-border/80 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {acc.accountant_profile?.full_name || acc.accountant_email}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono">{acc.accountant_email}</p>
                      {acc.accountant_crc && (
                        <span className="text-[10px] font-mono text-primary font-bold block mt-0.5">
                          CRC: {acc.accountant_crc}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                      Ativo
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {perms.view_dre && (
                      <Badge variant="secondary" className="text-[10px]">
                        Ver DRE
                      </Badge>
                    )}
                    {perms.download_xml && (
                      <Badge variant="secondary" className="text-[10px]">
                        Baixar XMLs
                      </Badge>
                    )}
                    {perms.view_invoices && (
                      <Badge variant="secondary" className="text-[10px]">
                        Ver Notas
                      </Badge>
                    )}
                    {perms.view_settlement && (
                      <Badge variant="secondary" className="text-[10px]">
                        Liquidações
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/40 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Deseja revogar o acesso contábil de ${acc.accountant_email}?`)) {
                          revokeMutation.mutate(acc.id);
                        }
                      }}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl text-xs gap-1.5 h-8 px-2.5"
                    >
                      <Trash2 className="size-3.5" />
                      Revogar Acesso
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dialog Convidar Escritório Contábil ── */}
      <Dialog open={isAccountantModalOpen} onOpenChange={setIsAccountantModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Convidar Escritório Contábil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="acc-email" className="text-xs font-semibold">
                E-mail do Contador / Escritório *
              </Label>
              <Input
                id="acc-email"
                type="email"
                value={accountantEmail}
                onChange={(e) => setAccountantEmail(e.target.value)}
                placeholder="contato@escritoriocontabil.com.br"
                className="rounded-xl text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-crc" className="text-xs font-semibold">
                Registro CRC (Opcional)
              </Label>
              <Input
                id="acc-crc"
                value={accountantCrc}
                onChange={(e) => setAccountantCrc(e.target.value)}
                placeholder="Ex: CRC-SC 12345/O"
                className="rounded-xl text-xs font-mono uppercase"
              />
            </div>

            <div className="space-y-2 border-t border-border/60 pt-3">
              <Label className="text-xs font-semibold block mb-1">Permissões de Acesso Contábil</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={permDre}
                    onChange={(e) => setPermDre(e.target.checked)}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <span>Visualizar DRE e Faturamento Consolidado</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={permXml}
                    onChange={(e) => setPermXml(e.target.checked)}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <span>Download de Lotes XML de Notas Fiscais e Vendas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={permSettlement}
                    onChange={(e) => setPermSettlement(e.target.checked)}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <span>Extrato de Liquidações Financeiras (Pix, Cartão, Boleto)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={permInvoices}
                    onChange={(e) => setPermInvoices(e.target.checked)}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <span>Visualizar Faturas e Cobranças Emitidas</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAccountantModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending}
              className="rounded-xl text-xs font-bold px-4"
            >
              {inviteMutation.isPending ? "Convidando..." : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
