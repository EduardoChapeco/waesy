import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  QrCode,
  UserCheck,
  Shield,
  Newspaper,
  Users,
  Star,
  Briefcase,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  listEventCredentials,
  upsertEventCredential,
  deleteEventCredential,
  validateCredentialCheckin,
} from "@/services/events.functions";

interface EventoCredenciaisProps {
  eventId: string;
  eventTitle?: string;
}

interface Credencial {
  id: string;
  tipo: "equipe" | "terceiro" | "patrocinador" | "imprensa" | "autoridade" | "vip" | "staff";
  nome: string;
  cargo?: string | null;
  empresa_origem?: string | null;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  qr_code: string;
  nivel_acesso: "basico" | "restrito" | "vip" | "total";
  status: "ativo" | "suspenso" | "revogado";
  checkin_realizado: boolean;
  checkin_em?: string | null;
  created_at: string;
}

const CREDENTIAL_TYPES = [
  { value: "equipe", label: "Equipe Interna", icon: Users, badgeStyle: "bg-primary/10 text-primary border-primary/20" },
  { value: "staff", label: "Staff & Produção", icon: UserCheck, badgeStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { value: "terceiro", label: "Prestador / Terceirizado", icon: Briefcase, badgeStyle: "bg-muted text-muted-foreground border-border" },
  { value: "patrocinador", label: "Patrocinador", icon: Star, badgeStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { value: "imprensa", label: "Imprensa / Mídia", icon: Newspaper, badgeStyle: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { value: "autoridade", label: "Autoridade / Fiscal", icon: Shield, badgeStyle: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { value: "vip", label: "Convidado VIP", icon: Sparkles, badgeStyle: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
];

export function EventoCredenciais({ eventId, eventTitle }: EventoCredenciaisProps) {
  const [credentials, setCredentials] = useState<Credencial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal de Emissão
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: undefined as string | undefined,
    tipo: "staff" as any,
    nome: "",
    documento: "",
    email: "",
    telefone: "",
    cargo: "",
    empresaOrigem: "",
    nivelAcesso: "basico" as any,
  });

  // Modal de Crachá Visual / Impressão
  const [selectedBadge, setSelectedBadge] = useState<Credencial | null>(null);

  // Check-in rápido
  const [checkinCode, setCheckinCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const data = await listEventCredentials({ data: { eventId } });
      setCredentials((data || []) as any);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar credenciais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchCredentials();
  }, [eventId]);

  const handleSaveCredential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("Informe o nome completo do credenciado.");
      return;
    }

    startTransition(async () => {
      try {
        await upsertEventCredential({
          data: {
            ...formData,
            eventId,
          },
        });
        toast.success(formData.id ? "Credencial atualizada!" : "Credencial provisionada com sucesso!");
        setIsSheetOpen(false);
        resetForm();
        fetchCredentials();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao salvar credencial");
      }
    });
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Tem certeza que deseja revogar esta credencial?")) return;
    try {
      await deleteEventCredential({ data: { credentialId: id } });
      toast.success("Credencial revogada com sucesso.");
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      if (selectedBadge?.id === id) setSelectedBadge(null);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir credencial.");
    }
  };

  const handleQuickCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinCode.trim()) return;

    setIsValidating(true);
    try {
      const res = await validateCredentialCheckin({
        data: {
          eventId,
          qrCode: checkinCode.trim(),
        },
      });

      if (res.alreadyCheckedIn) {
        toast.warning(res.message);
      } else {
        toast.success(res.message);
      }
      setCheckinCode("");
      fetchCredentials();
    } catch (err: any) {
      toast.error(err?.message || "Código inválido ou credencial inexistente.");
    } finally {
      setIsValidating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: undefined,
      tipo: "staff",
      nome: "",
      documento: "",
      email: "",
      telefone: "",
      cargo: "",
      empresaOrigem: "",
      nivelAcesso: "basico",
    });
  };

  const filteredCredentials = credentials.filter((c) => {
    const matchesType = filterType === "all" || c.tipo === filterType;
    const matchesSearch =
      !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.qr_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.cargo && c.cargo.toLowerCase().includes(search.toLowerCase())) ||
      (c.empresa_origem && c.empresa_origem.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const total = credentials.length;
  const totalCheckedIn = credentials.filter((c) => c.checkin_realizado).length;
  const pending = total - totalCheckedIn;

  return (
    <div className="space-y-6">
      {/* ── 1. Painel de Métricas & Check-in Rápido da Portaria de Staff ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" /> Total de Credenciados
          </span>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <p className="text-[11px] text-muted-foreground">Staff, convidados, parceiros e imprensa</p>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" /> Presenças Confirmadas
          </span>
          <div className="text-2xl font-bold text-foreground">
            {totalCheckedIn} {total > 0 && <span className="text-sm font-normal text-muted-foreground">({Math.round((totalCheckedIn / total) * 100)}%)</span>}
          </div>
          <p className="text-[11px] text-muted-foreground">Check-ins validados na portaria</p>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <QrCode className="size-3.5 text-primary" /> Validador de Crachá
          </span>
          <form onSubmit={handleQuickCheckin} className="flex gap-2">
            <Input
              value={checkinCode}
              onChange={(e) => setCheckinCode(e.target.value)}
              placeholder="Cole ou leia o código..."
              className="h-9 rounded-xl text-xs font-mono"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isValidating || !checkinCode.trim()}
              className="h-9 rounded-xl font-bold text-xs shrink-0 cursor-pointer"
            >
              {isValidating ? "Validando..." : "Validar"}
            </Button>
          </form>
        </div>
      </div>

      {/* ── 2. Toolbar & Filtros de Credencial ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, cargo ou código..."
              className="h-9 pl-9 rounded-xl text-xs bg-muted/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsSheetOpen(true);
            }}
            className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="size-4" />
            <span>Emitir Credencial</span>
          </Button>
        </div>
      </div>

      {/* Filtros em Pílulas */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            filterType === "all"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Todas ({total})
        </button>
        {CREDENTIAL_TYPES.map((t) => {
          const count = credentials.filter((c) => c.tipo === t.value).length;
          const isSelected = filterType === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── 3. Visualização Mobile: WhatsApp Minimalist List Pattern ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Carregando credenciais...</div>
        ) : filteredCredentials.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/70">
            Nenhuma credencial encontrada.
          </div>
        ) : (
          filteredCredentials.map((c) => {
            const typeConfig = CREDENTIAL_TYPES.find((t) => t.value === c.tipo);
            const Icon = typeConfig?.icon || Users;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedBadge(c)}
                className="p-3 rounded-2xl bg-card border border-border/60 flex items-center justify-between gap-3 shadow-2xs active:bg-muted/40 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/40">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate">{c.nome}</h4>
                      {c.checkin_realizado && (
                        <span className="inline-flex size-2 rounded-full bg-emerald-500 shrink-0" title="Check-in feito" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.cargo || typeConfig?.label} {c.empresa_origem && `• ${c.empresa_origem}`}
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground/80">{c.qr_code}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] font-mono py-0 px-1.5 ${typeConfig?.badgeStyle || ""}`}>
                    {c.nivel_acesso.toUpperCase()}
                  </Badge>
                  <QrCode className="size-4 text-muted-foreground" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 4. Visualização Desktop: Grid de Cards de Alta Fidelidade (Apple HIG) ── */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-xs text-muted-foreground">Carregando credenciais...</div>
        ) : filteredCredentials.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/70">
            Nenhuma credencial encontrada.
          </div>
        ) : (
          filteredCredentials.map((c) => {
            const typeConfig = CREDENTIAL_TYPES.find((t) => t.value === c.tipo);
            const Icon = typeConfig?.icon || Users;

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-2xs hover:border-border transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/40">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-tight">{c.nome}</h4>
                        <p className="text-xs text-muted-foreground">
                          {c.cargo || typeConfig?.label}
                          {c.empresa_origem && ` • ${c.empresa_origem}`}
                        </p>
                      </div>
                    </div>

                    <Badge variant="outline" className={`text-[10px] font-mono shrink-0 py-0.5 px-2 ${typeConfig?.badgeStyle || ""}`}>
                      {typeConfig?.label}
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-mono">CÓDIGO DE ACESSO</span>
                      <span className="font-mono font-bold text-foreground">{c.qr_code}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                      Nível {c.nivel_acesso}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1 text-[11px]">
                      {c.checkin_realizado ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Entrada confirmada</span>
                        </>
                      ) : (
                        <>
                          <Clock className="size-3.5 text-muted-foreground" />
                          <span>Check-in pendente</span>
                        </>
                      )}
                    </span>
                    {c.documento && <span className="font-mono text-[11px]">DOC: {c.documento}</span>}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedBadge(c)}
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <QrCode className="size-3.5" />
                    <span>Ver Crachá</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFormData({
                          id: c.id,
                          tipo: c.tipo,
                          nome: c.nome,
                          documento: c.documento || "",
                          email: c.email || "",
                          telefone: c.telefone || "",
                          cargo: c.cargo || "",
                          empresaOrigem: c.empresa_origem || "",
                          nivelAcesso: c.nivel_acesso,
                        });
                        setIsSheetOpen(true);
                      }}
                      className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCredential(c.id)}
                      className="size-8 p-0 rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 5. Sheet Lateral de Emissão / Edição de Credencial ── */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border">
          <div className="p-6 pb-4 border-b border-border/40">
            <SheetTitle className="text-base font-bold">
              {formData.id ? "Editar Credencial" : "Provisionar Nova Credencial"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Emita credenciais com QR code para acesso de equipes, convidados VIP ou imprensa.
            </SheetDescription>
          </div>

          <form onSubmit={handleSaveCredential} className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tipo de Credencial *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val) => setFormData({ ...formData, tipo: val as any })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDENTIAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nome Completo *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className="h-9 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Função / Cargo</Label>
                  <Input
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Ex: Chefe de Segurança"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Empresa / Órgão</Label>
                  <Input
                    value={formData.empresaOrigem}
                    onChange={(e) => setFormData({ ...formData, empresaOrigem: e.target.value })}
                    placeholder="Ex: PM / TV Globo"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Documento (CPF/RG)</Label>
                  <Input
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                    placeholder="000.000.000-00"
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Nível de Acesso</Label>
                  <Select
                    value={formData.nivelAcesso}
                    onValueChange={(val) => setFormData({ ...formData, nivelAcesso: val as any })}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basico" className="text-xs">Básico (Área Comum)</SelectItem>
                      <SelectItem value="restrito" className="text-xs">Restrito (Produção/Backstage)</SelectItem>
                      <SelectItem value="vip" className="text-xs">VIP (Camarotes & Lounges)</SelectItem>
                      <SelectItem value="total" className="text-xs">Total (Acesso Livre Geral)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Telefone / WhatsApp</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@dominio.com"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsSheetOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="rounded-xl text-xs font-bold px-4 cursor-pointer"
              >
                {isPending ? "Salvando..." : formData.id ? "Atualizar" : "Provisionar Crachá"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── 6. Modal de Crachá Visual / Impressão (Design Apple HIG & WhatsApp Preview) ── */}
      {selectedBadge && (
        <Dialog open={Boolean(selectedBadge)} onOpenChange={(op) => !op && setSelectedBadge(null)}>
          <DialogContent className="sm:max-w-sm p-0 rounded-3xl overflow-hidden border border-border bg-card">
            <div className="p-6 space-y-6 text-center">
              <div className="space-y-1">
                <Badge variant="outline" className="text-[10px] font-mono uppercase px-2.5 py-0.5">
                  {eventTitle || "Credencial Oficial"}
                </Badge>
                <h3 className="text-lg font-black text-foreground pt-1">{selectedBadge.nome}</h3>
                <p className="text-xs font-semibold text-primary">
                  {selectedBadge.cargo || selectedBadge.tipo.toUpperCase()}
                  {selectedBadge.empresa_origem && ` • ${selectedBadge.empresa_origem}`}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="size-48 mx-auto bg-white p-4 rounded-2xl shadow-inner border border-border/40 flex flex-col items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    selectedBadge.qr_code
                  )}`}
                  alt="QR Code de Acesso"
                  className="size-40 object-contain"
                />
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="text-muted-foreground text-[10px]">CÓDIGO DE VALIDAÇÃO</div>
                <div className="font-bold text-sm tracking-wider text-foreground">{selectedBadge.qr_code}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/40 text-left">
                <div>
                  <span className="text-muted-foreground block text-[10px]">ACESSO</span>
                  <span className="font-semibold text-foreground uppercase">{selectedBadge.nivel_acesso}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">STATUS</span>
                  <span className={`font-semibold ${selectedBadge.checkin_realizado ? "text-emerald-600" : "text-amber-600"}`}>
                    {selectedBadge.checkin_realizado ? "Check-in Realizado" : "Pendente"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border-t border-border/40 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 flex-1 cursor-pointer"
              >
                <Printer className="size-3.5" />
                <span>Imprimir Crachá</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setSelectedBadge(null)}
                className="h-9 rounded-xl text-xs font-bold px-4 cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
