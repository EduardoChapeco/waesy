import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  MapPin,
  Phone,
  User,
  Plus,
  ShieldCheck,
  FileSpreadsheet,
  TrendingUp,
  Boxes,
  Percent,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  listStorePudoPackages,
  checkInPudoPackage,
  deliverPudoPackageToCustomer,
  reportPackageDamageAndReturn,
  type PudoPackageDTO,
} from "@/services/pudo.functions";
import { playCashRegisterSound, playMessageChime } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/logistica/pudo")({
  head: () => ({ meta: [{ title: "Ponto de Retirada (PUDO) & Logística Reversa | Workspace" }] }),
  loader: async () => {
    try {
      const packages = await listStorePudoPackages().catch(() => []);
      const safePackages = packages || [];
      return { packages: safePackages, defaultLocationId: safePackages[0]?.pudo_location_id ?? null };
    } catch (err) {
      console.error("[loader:workspace.logistica.pudo] Unhandled loader error:", err);
      return { packages: null, defaultLocationId: null };
    }
  },
  component: WorkspacePudoLogisticsPage,
});

function WorkspacePudoLogisticsPage() {
  const { packages: initialData, defaultLocationId } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const [packages, setPackages] = useState<PudoPackageDTO[]>(initialData || []);
  const [statusTab, setStatusTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Balcão de Retirada Rápida
  const [quickPickupCode, setQuickPickupCode] = useState("");

  // Modal: Entrada de Pacote
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Modal: Registrar Avaria / Logística Reversa
  const [damageModalPkg, setDamageModalPkg] = useState<PudoPackageDTO | null>(null);
  const [damageNotes, setDamageNotes] = useState("");

  // KPIs
  const kpis = useMemo(() => {
    const ready = packages.filter((p) => p.status === "ready_for_pickup").length;
    const delivered = packages.filter((p) => p.status === "delivered_to_customer").length;
    const returns = packages.filter((p) => p.has_damage || p.status === "return_requested" || p.status === "returned_to_hub").length;
    const total = packages.length;
    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 100;

    return {
      ready,
      delivered,
      returns,
      total,
      successRate,
    };
  }, [packages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        pkg.tracking_code.toLowerCase().includes(q) ||
        pkg.recipient_name.toLowerCase().includes(q) ||
        pkg.recipient_phone.toLowerCase().includes(q);

      let matchesTab = true;
      if (statusTab === "ready") matchesTab = pkg.status === "ready_for_pickup";
      else if (statusTab === "delivered") matchesTab = pkg.status === "delivered_to_customer";
      else if (statusTab === "returns")
        matchesTab = pkg.status === "return_requested" || pkg.status === "returned_to_hub";

      return matchesSearch && matchesTab;
    });
  }, [packages, searchQuery, statusTab]);

  const handleQuickPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPickupCode.trim()) {
      toast.error("Digite o código de 4 dígitos fornecido pelo cliente.");
      return;
    }

    const matchedPkg = packages.find(
      (p) =>
        p.security_pickup_code === quickPickupCode.trim() && p.status === "ready_for_pickup",
    );

    if (!matchedPkg) {
      toast.error("Nenhum pacote aguardando retirada com este código de segurança.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await deliverPudoPackageToCustomer({
        data: {
          packageId: matchedPkg.id,
          pickupCodeEntered: quickPickupCode.trim(),
        },
      });

      setPackages((prev) =>
        prev.map((p) =>
          p.id === matchedPkg.id ? { ...p, status: "delivered_to_customer" } : p,
        ),
      );

      playCashRegisterSound();
      toast.success(res.message);
      setQuickPickupCode("");
    } catch {
      toast.error("Erro ao validar entrega do pacote.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckInPackage = async () => {
    if (!trackingCode.trim() || !recipientName.trim() || !recipientPhone.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!defaultLocationId) {
      toast.error("Local PUDO padrão não configurado para esta loja.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await checkInPudoPackage({
        data: {
          pudoLocationId: defaultLocationId,
          trackingCode: trackingCode.trim().toUpperCase(),
          senderName: senderName.trim() || "Loja Parceira",
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
        },
      });

      setPackages((prev) => [res.package, ...prev]);
      playMessageChime();
      toast.success("Pacote registrado com sucesso no ponto PUDO!");
      setIsCheckInModalOpen(false);
      setTrackingCode("");
      setSenderName("");
      setRecipientName("");
      setRecipientPhone("");
    } catch {
      toast.error("Erro ao dar entrada no pacote.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReportDamage = async () => {
    if (!damageModalPkg) return;
    if (!damageNotes.trim()) {
      toast.error("Descreva o motivo da avaria ou solicitação de devolução.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await reportPackageDamageAndReturn({
        data: {
          packageId: damageModalPkg.id,
          notes: damageNotes.trim(),
        },
      });

      setPackages((prev) =>
        prev.map((p) =>
          p.id === damageModalPkg.id
            ? { ...p, status: "return_requested", has_damage: true, damage_notes: damageNotes }
            : p,
        ),
      );

      toast.success(res.message);
      setDamageModalPkg(null);
      setDamageNotes("");
    } catch {
      toast.error("Erro ao solicitar logística reversa.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Exportar Manifesto CSV
  const handleExportCSV = () => {
    if (filteredPackages.length === 0) {
      toast.error("Nenhum pacote para exportar.");
      return;
    }

    const headers = [
      "Código de Rastreio",
      "Remetente",
      "Destinatário",
      "Telefone",
      "Status",
      "Código de Retirada",
      "Possui Avaria",
      "Notas",
      "Data de Entrada",
    ];

    const rows = filteredPackages.map((p) => [
      `"${p.tracking_code}"`,
      `"${p.sender_name || ""}"`,
      `"${p.recipient_name || ""}"`,
      `"${p.recipient_phone || ""}"`,
      p.status,
      `"${p.security_pickup_code || ""}"`,
      p.has_damage ? "Sim" : "Não",
      `"${(p.damage_notes || "").replace(/"/g, '""')}"`,
      `"${new Date(p.created_at).toLocaleDateString("pt-BR")}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `manifesto-pudo-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playCashRegisterSound();
    toast.success("Manifesto de custódia PUDO exportado com sucesso!");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── HEADER DA PÁGINA ── */}
      <PageHeader
        eyebrow="Logística & Last-Mile"
        title="Ponto de Retirada (PUDO) & Logística Reversa"
        description="Gestão de guarda temporária de volumes, retirada rápida por token e triagem de devoluções."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="font-bold text-xs gap-1.5 h-10 px-3.5 rounded-xl cursor-pointer"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <span>Exportar Manifesto (CSV)</span>
            </Button>
            <Button
              onClick={() => setIsCheckInModalOpen(true)}
              size="sm"
              className="rounded-xl font-bold bg-primary text-primary-foreground text-xs gap-1.5 h-10 px-4 cursor-pointer shadow-2xs"
            >
              <Plus className="size-4" />
              <span>Receber Novo Pacote</span>
            </Button>
          </div>
        }
      />

      {/* ── 4 KPIS NO PARADIGMA CLEAN ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Boxes className="size-3.5 text-amber-600" />
            Em Custódia
          </span>
          <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {kpis.ready}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Aguardando retirada pelo cliente
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Entregas Concluídas
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {kpis.delivered}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Volumes entregues no balcão
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw className="size-3.5 text-destructive" />
            Logística Reversa / Avarias
          </span>
          <div className="text-2xl font-mono font-bold text-destructive">
            {kpis.returns}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Devoluções e pacotes danificados
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="size-3.5 text-primary" />
            Taxa de Eficiência PUDO
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.successRate}%
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Conclusão sem intercorrências
          </p>
        </div>
      </div>

      {/* ── BALCÃO DE RETIRADA RÁPIDA COM VALIDAÇÃO DE TOKEN ── */}
      <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-tight">
          <KeyRound className="size-4" />
          <span>Balcão de Entrega ao Cliente (Validação de Token)</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Solicite ao cliente o código de segurança de 4 dígitos enviado no WhatsApp ou comprovante do pedido.
        </p>

        <form onSubmit={handleQuickPickup} className="flex flex-col sm:flex-row gap-2 max-w-lg">
          <Input
            placeholder="Código de 4 dígitos (Ex: 8492)..."
            value={quickPickupCode}
            onChange={(e) => setQuickPickupCode(e.target.value)}
            className="h-11 text-sm font-mono font-bold tracking-widest text-center bg-background rounded-xl border-border/80"
            maxLength={6}
          />
          <Button
            type="submit"
            disabled={isProcessing}
            className="h-11 px-6 rounded-xl font-bold bg-primary text-primary-foreground text-xs shrink-0 cursor-pointer shadow-2xs"
          >
            Validar & Entregar Pacote
          </Button>
        </form>
      </div>

      {/* ── BARRA DE BUSCA E TABS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/70 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por rastreio, destinatário ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background border-border/80 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Todos", count: packages.length },
            { id: "ready", label: "Aguardando", count: kpis.ready },
            { id: "delivered", label: "Entregues", count: kpis.delivered },
            { id: "returns", label: "Reversa / Avarias", count: kpis.returns },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={statusTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusTab(tab.id)}
              className="h-9 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
      </div>

      {/* ── GRID DE PACOTES EM CUSTÓDIA ── */}
      {filteredPackages.length === 0 ? (
        <div className="p-16 text-center space-y-4 rounded-2xl bg-card border border-border/70 shadow-2xs">
          <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
            <Package className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <p className="text-sm font-bold text-foreground">Nenhum pacote encontrado</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use o botão acima para registrar a entrada de novos pacotes recebidos de transportadoras parceiras.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="p-5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between gap-4 shadow-2xs hover:border-primary/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold">
                      {pkg.tracking_code}
                    </span>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">
                      {pkg.recipient_name}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      pkg.status === "delivered_to_customer"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold"
                        : pkg.status === "ready_for_pickup"
                        ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold"
                        : "bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-bold"
                    }
                  >
                    {pkg.status === "ready_for_pickup"
                      ? "Aguardando"
                      : pkg.status === "delivered_to_customer"
                      ? "Entregue"
                      : "Reversa"}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5" />
                    <span>Remetente: {pkg.sender_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    <span>Contato: {pkg.recipient_phone}</span>
                  </div>
                </div>

                {/* Código de Retirada Seguro */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Código de Segurança
                    </span>
                    <p className="text-sm font-mono font-bold text-foreground tracking-wider">
                      {pkg.security_pickup_code}
                    </p>
                  </div>
                  <ShieldCheck className="size-5 text-primary" />
                </div>

                {pkg.damage_notes && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl border border-destructive/20 font-medium">
                    Avaria relatada: {pkg.damage_notes}
                  </p>
                )}
              </div>

              {/* Ações */}
              <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Entrada: {new Date(pkg.created_at).toLocaleDateString("pt-BR")}
                </span>

                {pkg.status === "ready_for_pickup" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDamageModalPkg(pkg);
                      setDamageNotes("");
                    }}
                    className="rounded-xl text-xs font-bold gap-1 text-destructive hover:bg-destructive/10 h-8 cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    <span>Avaria / Reversa</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: RECEBER NOVO PACOTE ── */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="sm:max-w-md sm:p-6 rounded-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Registrar Entrada de Pacote PUDO
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dê entrada em um volume recebido para retirada temporária no seu estabelecimento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Código de Rastreio / Etiqueta</Label>
              <Input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Ex: WDR-PUDO-99123"
                className="rounded-xl text-xs font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Empresa Remetente</Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Ex: Magazine Oeste, Loja Alpha..."
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nome do Destinatário</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nome completo"
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Telefone (WhatsApp)</Label>
                <Input
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="(49) 99999-0000"
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCheckInModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCheckInPackage}
              disabled={isProcessing}
              className="rounded-xl font-bold bg-primary text-primary-foreground text-xs shadow-2xs"
            >
              Salvar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: RELATAR AVARIA & DEVOLUÇÃO REVERSA ── */}
      <Dialog open={!!damageModalPkg} onOpenChange={(open) => !open && setDamageModalPkg(null)}>
        <DialogContent className="sm:max-w-md sm:p-6 rounded-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              Solicitar Logística Reversa & Avaria
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Relate o problema detectado na embalagem ou solicitação de devolução para envio ao remetente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Descrição da Avaria / Motivo</Label>
              <Textarea
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                placeholder="Ex: Embalagem violada na lateral, pacote molhado ou cliente não retirou em 7 dias."
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDamageModalPkg(null)}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReportDamage}
              disabled={isProcessing}
              className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              Confirmar Logística Reversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
