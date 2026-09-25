import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyCommissionProfile,
  getAffiliateLink,
  requestAffiliatePayout,
  listMyPayoutRequests,
  registerAffiliate,
} from "@/services/affiliates.functions";
import { getUserSession } from "@/services/auth.functions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { NativeMobileHeader } from "@/components/navigation";
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
import {
  Coins,
  Copy,
  Check,
  QrCode,
  ArrowUpRight,
  TrendingUp,
  MousePointerClick,
  ShoppingBag,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/comissoes")({
  head: () => ({
    meta: [
      { title: "Comissões & Programa de Afiliados | Minha Conta" },
      { name: "description", content: "Gerencie seus ganhos, links de indicação e solicite saques de comissão via PIX." },
    ],
  }),
  loader: async () => {
    try {
      const [session, profile, payoutRequests] = await Promise.all([
        getUserSession().catch(() => null),
        getMyCommissionProfile().catch(() => null),
        listMyPayoutRequests().catch(() => []),
      ]);

      return {
        session,
        initialProfile: profile,
        initialPayoutRequests: payoutRequests || [],
      };
    } catch (err) {
      console.error("[loader:_store.conta.comissoes] Erro defensivo:", err);
      return {
        session: null,
        initialProfile: null,
        initialPayoutRequests: [],
      };
    }
  },
  component: AffiliateCommissionsPage,
});

function AffiliateCommissionsPage() {
  const loaderData = (Route.useLoaderData() || {}) as any;
  const session = loaderData.session;
  const queryClient = useQueryClient();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Form states de saque
  const [payoutAmount, setPayoutAmount] = useState<string>("50");
  const [pixKeyType, setPixKeyType] = useState<"cpf" | "cnpj" | "email" | "phone" | "random">("cpf");
  const [pixKey, setPixKey] = useState<string>("");
  const [payoutNotes, setPayoutNotes] = useState<string>("");

  // Form state para ativação de afiliado
  const [handleInput, setHandleInput] = useState<string>("");
  const [displayNameInput, setDisplayNameInput] = useState<string>("");

  // Queries
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["my-commission-profile"],
    queryFn: () => getMyCommissionProfile(),
    initialData: loaderData.initialProfile,
  });

  const { data: payoutRequests, isLoading: isPayoutsLoading } = useQuery({
    queryKey: ["my-payout-requests"],
    queryFn: () => listMyPayoutRequests(),
    initialData: loaderData.initialPayoutRequests,
  });

  // Mutação para ativar conta de parceiro se ainda não existir
  const activateMutation = useMutation({
    mutationFn: (vars: { handle: string; displayName: string }) =>
      registerAffiliate({
        data: {
          handle: vars.handle,
          displayName: vars.displayName,
          socialChannel: "instagram",
          category: "general",
        },
      }),
    onSuccess: () => {
      toast.success("Conta de parceiro ativada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["my-commission-profile"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao ativar programa de parceiro.");
    },
  });

  // Mutação de solicitação de saque
  const payoutMutation = useMutation({
    mutationFn: (vars: { amountCents: number; pixKeyType: any; pixKey: string; notes?: string }) =>
      requestAffiliatePayout({
        data: {
          amountCents: vars.amountCents,
          pixKeyType: vars.pixKeyType,
          pixKey: vars.pixKey,
          notes: vars.notes,
        },
      }),
    onSuccess: () => {
      toast.success("Solicitação de saque PIX enviada com sucesso!");
      setIsPayoutModalOpen(false);
      setPayoutNotes("");
      queryClient.invalidateQueries({ queryKey: ["my-commission-profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-payout-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao solicitar saque.");
    },
  });

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Faça login em sua conta para acessar seu painel de comissões, links de indicação e solicitar saques.
        </p>
        <Button asChild className="h-11 px-6 rounded-xl font-semibold">
          <Link to="/entrar">Fazer Login</Link>
        </Button>
      </div>
    );
  }

  // Se o usuário ainda não possui cadastro de afiliado
  if (!profile && !isProfileLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground py-6 sm:py-10 px-0 sm:px-4 md:px-0 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl text-xs">
            <Link to="/conta">
              <ChevronLeft className="h-4 w-4 mr-1" /> Minha Conta
            </Link>
          </Button>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Ativar Programa de Parceiros</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Indique produtos, lojas locais e eventos da plataforma. Receba comissões automáticas diretamente via PIX a cada venda concluída.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!handleInput.trim() || !displayNameInput.trim()) {
                toast.error("Preencha todos os campos.");
                return;
              }
              activateMutation.mutate({
                handle: handleInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                displayName: displayNameInput.trim(),
              });
            }}
            className="space-y-4 text-left max-w-sm mx-auto pt-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs font-semibold">Nome de Exibição / Marca</Label>
              <Input
                id="displayName"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Ex: João da Silva ou Meu Canal"
                className="h-11 rounded-xl text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="handle" className="text-xs font-semibold">Identificador Único (@handle)</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">@</span>
                <Input
                  id="handle"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="seunome"
                  className="h-11 pl-8 rounded-xl text-sm font-mono"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={activateMutation.isPending}
              className="w-full h-11 rounded-xl font-semibold bg-foreground text-background cursor-pointer mt-2"
            >
              {activateMutation.isPending ? "Ativando..." : "Ativar Meu Link de Parceiro"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const availableBalanceCents = Math.max(0, (profile?.total_commission_cents || 0) - (profile?.paid_commission_cents || 0));
  const affiliateUrl = typeof window !== "undefined"
    ? `${window.location.origin}/convite?ref=${profile?.handle || ""}`
    : `https://usewaesy.com/convite?ref=${profile?.handle || ""}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateUrl);
    setCopiedLink(true);
    toast.success("Link de afiliado copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenPayout = () => {
    if (availableBalanceCents < 5000) {
      toast.error("O saldo mínimo para saque é de R$ 50,00.");
      return;
    }
    setPayoutAmount((availableBalanceCents / 100).toFixed(2));
    if (profile?.pix_key) setPixKey(profile.pix_key);
    if (profile?.pix_key_type) setPixKeyType(profile.pix_key_type as any);
    setIsPayoutModalOpen(true);
  };

  const handleSubmitPayout = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(payoutAmount.replace(",", "."));
    if (isNaN(amountVal) || amountVal < 50) {
      toast.error("O valor mínimo para solicitação é R$ 50,00.");
      return;
    }

    const cents = Math.round(amountVal * 100);
    if (cents > availableBalanceCents) {
      toast.error("Valor solicitado é maior que o saldo disponível.");
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Informe a chave PIX para transferência.");
      return;
    }

    payoutMutation.mutate({
      amountCents: cents,
      pixKeyType,
      pixKey: pixKey.trim(),
      notes: payoutNotes.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-6 sm:py-8 px-0 sm:px-4 md:px-0 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
            {/* ── NativeMobileHeader Canônico ── */}
      <NativeMobileHeader
        fallbackHref="/conta"
        title="Comissões & Afiliados"
        rightActions={
          <Button
            onClick={handleOpenPayout}
            disabled={availableBalanceCents < 5000}
            size="sm"
            className="h-8.5 px-3 rounded-xl font-semibold bg-foreground text-background cursor-pointer"
          >
            <Wallet className="h-3.5 w-3.5 mr-1" /> Sacar
          </Button>
        }
      />

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Comissões & Afiliados</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas métricas de indicação, conversões registradas e gerencie seus recebimentos via PIX.
        </p>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Saldo Disponível</span>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatMoney(availableBalanceCents)}
          </div>
          <div className="text-[11px] text-muted-foreground">Disponível para saque imediato</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Ganhos Totais</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(profile?.total_commission_cents || 0)}
          </div>
          <div className="text-[11px] text-muted-foreground">Comissão acumulada na plataforma</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Já Sacado</span>
            <Coins className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(profile?.paid_commission_cents || 0)}
          </div>
          <div className="text-[11px] text-muted-foreground">Transferido para sua conta bancária</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Cliques / Pedidos</span>
            <MousePointerClick className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {profile?.total_clicks || 0} / {profile?.total_orders || 0}
          </div>
          <div className="text-[11px] text-muted-foreground">Volume de tráfego gerado</div>
        </div>
      </div>

      {/* Link de Indicação com Ações Diretas */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Seu Link de Indicação Oficial</h3>
            <p className="text-xs text-muted-foreground">
              Qualquer compra feita por quem acessar seu link gerará comissão direta para seu saldo.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {profile?.commission_rate_percent || 10}% de comissão
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Input
              readOnly
              value={affiliateUrl}
              className="h-11 rounded-xl text-xs sm:text-sm font-mono bg-muted/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {copiedLink ? <Check className="h-4 w-4 mr-1 text-emerald-500" /> : <Copy className="h-4 w-4 mr-1" />}
              {copiedLink ? "Copiado!" : "Copiar Link"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQrModalOpen(true)}
              className="h-11 px-3 rounded-xl text-xs font-semibold cursor-pointer"
              title="Exibir QR Code"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Histórico de Solicitações de Saque */}
      <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Histórico de Saques via PIX
          </h3>
          <span className="text-xs text-muted-foreground">
            {payoutRequests?.length || 0} solicitações
          </span>
        </div>

        {isPayoutsLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando solicitações...</div>
        ) : !payoutRequests || payoutRequests.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl p-6">
            Nenhuma solicitação de saque realizada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border/60 text-muted-foreground">
                <tr>
                  <th className="pb-3 font-semibold">Data</th>
                  <th className="pb-3 font-semibold">Valor</th>
                  <th className="pb-3 font-semibold">Chave PIX</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {payoutRequests.map((req: any) => {
                  const statusMap: Record<string, { label: string; badge: string; icon: any }> = {
                    pending: { label: "Em Análise", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
                    processing: { label: "Processando", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
                    paid: { label: "Pago", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
                    rejected: { label: "Rejeitado", badge: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
                  };
                  const currentStatus = statusMap[req.status] || statusMap.pending;
                  const StatusIcon = currentStatus.icon;

                  return (
                    <tr key={req.id} className="hover:bg-muted/20">
                      <td className="py-3 font-mono">{formatDate(req.created_at)}</td>
                      <td className="py-3 font-mono font-bold text-foreground">
                        {formatMoney(req.amount_cents)}
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">
                        {req.pix_key} ({req.pix_key_type?.toUpperCase()})
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${currentStatus.badge}`}>
                          <StatusIcon className="h-3 w-3" /> {currentStatus.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {req.receipt_url ? (
                          <a
                            href={req.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-xs inline-flex items-center gap-1 font-semibold"
                          >
                            Ver <ArrowUpRight className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Solicitação de Saque PIX */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar Saque de Comissão</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitPayout} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor do Saque (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="50"
                  max={(availableBalanceCents / 100).toFixed(2)}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="pl-9 h-11 rounded-xl text-base font-mono font-bold"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Disponível para saque: <strong>{formatMoney(availableBalanceCents)}</strong> (Mínimo R$ 50,00)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Chave</Label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone Celular</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Chave PIX</Label>
                <Input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Informe sua chave"
                  className="h-11 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações (opcional)</Label>
              <Input
                type="text"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Ex: Nome do titular da conta"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPayoutModalOpen(false)}
                className="h-11 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={payoutMutation.isPending}
                className="h-11 rounded-xl font-semibold bg-foreground text-background cursor-pointer"
              >
                {payoutMutation.isPending ? "Processando..." : "Confirmar Solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de QR Code do Link de Afiliado */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl text-center">
          <DialogHeader>
            <DialogTitle>QR Code de Indicação</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-border">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(affiliateUrl)}`}
                alt="QR Code de Afiliado"
                className="size-48 object-contain"
              />
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all max-w-xs">
              {affiliateUrl}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCopyLink}
              className="w-full h-11 rounded-xl font-semibold bg-foreground text-background cursor-pointer"
            >
              <Copy className="h-4 w-4 mr-2" /> Copiar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
