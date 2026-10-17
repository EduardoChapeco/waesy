import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Store, Key, ExternalLink, User, Phone, Layers, ShieldCheck, Ticket, Beer, Utensils, Sparkles, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { listEventSubpanels, createEventSubpanel } from "@/services/events.functions";

interface EventoSubpaineisProps {
  eventId: string;
}

const TIPOS_SUBPAINEL = [
  { value: "bar", label: "Bar & Bebidas", icon: Beer, color: "text-amber-500", desc: "Controle de fichas, chopp e vendas rápidas no balcão" },
  { value: "foodtruck", label: "Alimentação & Lanches", icon: Utensils, color: "text-orange-500", desc: "Comandas de comida, pedidos e praça de alimentação" },
  { value: "restaurant", label: "Restaurante / Buffet", icon: Store, color: "text-emerald-500", desc: "Mesas, garçons e consumo consolidado" },
  { value: "merchandise", label: "Loja Oficial / Merch", icon: Store, color: "text-purple-500", desc: "Venda de copos, camisetas e recordações" },
  { value: "ticketing_box", label: "Bilheteria / Portaria", icon: Ticket, color: "text-blue-500", desc: "Validação de ingressos e venda local" },
  { value: "vip_lounge", label: "Camarote / Lounge VIP", icon: Sparkles, color: "text-yellow-500", desc: "Acesso e atendimento exclusivo" },
  { value: "security_checkpoint", label: "Posto de Segurança", icon: ShieldCheck, color: "text-rose-500", desc: "Controle de fluxo e ocorrências" },
  { value: "other", label: "Outro Ponto Especial", icon: Store, color: "text-muted-foreground", desc: "Terminal customizado" },
];

export function EventoSubpaineis({ eventId }: EventoSubpaineisProps) {
  const [subpanels, setSubpanels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Form de Novo Subpainel
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [panelType, setPanelType] = useState<any>("bar");
  const [managerName, setManagerName] = useState("");
  const [managerContact, setManagerContact] = useState("");
  const [expireDays, setExpireDays] = useState(30);
  const [concessionPercentage, setConcessionPercentage] = useState(10);
  const [concessionFixedReais, setConcessionFixedReais] = useState(0);
  const [allowOnlineOrders, setAllowOnlineOrders] = useState(true);

  const loadSubpanels = async () => {
    try {
      setLoading(true);
      const res = await listEventSubpanels({ data: { eventId } });
      setSubpanels(res || []);
    } catch (err: any) {
      toast.error("Erro ao listar subpainéis: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadSubpanels();
    }
  }, [eventId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do ponto operacional.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createEventSubpanel({
          data: {
            eventId,
            name: name.trim(),
            panelType,
            managerName: managerName.trim() || undefined,
            managerContact: managerContact.trim() || undefined,
            concessionPercentage: Number(concessionPercentage) || 0,
            concessionFixedCents: Math.round(Number(concessionFixedReais) * 100) || 0,
            allowOnlineOrders: Boolean(allowOnlineOrders),
            expireDays,
          },
        });

        toast.success("Subpainel ativado com sucesso!");
        setIsNewOpen(false);
        setName("");
        setManagerName("");
        setManagerContact("");
        setConcessionPercentage(10);
        setConcessionFixedReais(0);
        setAllowOnlineOrders(true);
        loadSubpanels();
      } catch (err: any) {
        toast.error("Erro ao criar subpainel: " + err.message);
      }
    });
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/portal/subpainel/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do Subpainel copiado para a área de transferência!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin motion-reduce:animate-none" />
        <span>Carregando pontos de operação e subpainéis...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topo do Módulo Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">
              Subpainéis & Pontos de Venda
            </h3>
            <Badge variant="outline" className="text-xs">
              {subpanels.length} {subpanels.length === 1 ? "ponto ativo" : "pontos ativos"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gere terminais independentes tokenizados para Bar, Portaria, Foodtruck ou VIP com taxa de concessão auditada.
          </p>
        </div>

        <Sheet open={isNewOpen} onOpenChange={setIsNewOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
              <Plus className="size-4" />
              <span>Novo Subpainel</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Ativar Ponto Operacional</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Um token seguro de acesso exclusivo será gerado para a equipe deste terminal sem expor a conta master.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Tipo de Terminal Operacional</Label>
                <Select value={panelType} onValueChange={(v) => setPanelType(v)}>
                  <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_SUBPAINEL.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Nome do Ponto / Empresa *</Label>
                <Input
                  required
                  placeholder="Ex: Chopp Brahma Oficial ou Burger Truck #1"
                  className="h-11 min-h-11 rounded-lg text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Responsável / Operador</Label>
                  <Input
                    placeholder="Ex: Fernando Gerente"
                    className="h-11 min-h-11 rounded-lg text-xs"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">WhatsApp do Responsável</Label>
                  <Input
                    placeholder="(49) 99999-9999"
                    className="h-11 min-h-11 rounded-lg text-xs"
                    value={managerContact}
                    onChange={(e) => setManagerContact(e.target.value)}
                  />
                </div>
              </div>

              {/* Parâmetros Comerciais de Concessão */}
              <div className="p-4 rounded-lg border border-border/70 bg-muted/20 space-y-3">
                <span className="text-xs font-bold text-foreground block">
                  Regras Comerciais & Concessão
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Comissão da Produtora (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="h-11 min-h-11 rounded-lg text-xs"
                      value={concessionPercentage}
                      onChange={(e) => setConcessionPercentage(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Taxa Fixa Ponto (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      className="h-11 min-h-11 rounded-lg text-xs"
                      value={concessionFixedReais}
                      onChange={(e) => setConcessionFixedReais(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">Exibir no Cardápio Mobile</span>
                    <span className="text-xs text-muted-foreground block">Permitir pedidos pelo público no evento</span>
                  </div>
                  <Switch
                    checked={allowOnlineOrders}
                    onCheckedChange={setAllowOnlineOrders}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Validade do Token de Acesso</Label>
                <Select
                  value={expireDays.toString()}
                  onValueChange={(v) => setExpireDays(parseInt(v))}
                >
                  <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">1 dia (Evento de 1 noite)</SelectItem>
                    <SelectItem value="3" className="text-xs">3 dias (Festival de fim de semana)</SelectItem>
                    <SelectItem value="7" className="text-xs">7 dias (Semana do evento)</SelectItem>
                    <SelectItem value="30" className="text-xs">30 dias (Temporada completa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 min-h-11 rounded-lg text-xs font-bold mt-4 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                {isPending ? "Ativando..." : "Criar Subpainel Operacional"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Grid de Subpainéis */}
      {subpanels.length === 0 ? (
        <Card className="rounded-lg border border-dashed border-border/80 p-8 text-center bg-card/40">
          <Store className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-foreground">Nenhum ponto operacional configurado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie pontos de bar, alimentação ou portarias para acompanhar vendas e arrecadação de concessão em tempo real.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subpanels.map((p) => {
            const tipoInfo = TIPOS_SUBPAINEL.find((t) => t.value === p.panel_type) || TIPOS_SUBPAINEL[0];
            const TipoIcon = tipoInfo.icon;
            const percentage = p.concession_percentage != null ? p.concession_percentage : 10;

            return (
              <Card
                key={p.id}
                className="rounded-lg border border-border/80 bg-card p-4 space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-muted/60 ${tipoInfo.color}`}>
                        <TipoIcon className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground break-words">{p.name}</h4>
                        <span className="text-xs text-muted-foreground">{tipoInfo.label}</span>
                      </div>
                    </div>

                    <Badge
                      className={
                        p.is_active
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold"
                          : "bg-muted text-muted-foreground text-xs"
                      }
                    >
                      {p.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tipoInfo.desc}
                  </p>

                  {/* Parâmetros Comerciais */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                      {percentage}% Concessão
                    </Badge>
                    {p.allow_online_orders && (
                      <Badge variant="outline" className="text-xs gap-1 border-sky-500/30 text-sky-600 bg-sky-500/10">
                        <Smartphone className="size-3" />
                        Cardápio Mobile
                      </Badge>
                    )}
                  </div>

                  {(p.manager_name || p.manager_contact) && (
                    <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                      {p.manager_name && (
                        <div className="flex items-center gap-2">
                          <User className="size-3 text-muted-foreground" />
                          <span>{p.manager_name}</span>
                        </div>
                      )}
                      {p.manager_contact && (
                        <div className="flex items-center gap-2">
                          <Phone className="size-3 text-muted-foreground" />
                          <span>{p.manager_contact}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações de Token e Acesso Seguro */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(p.access_token)}
                    className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 flex-1 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <Key className="size-4 text-primary" />
                    <span>Copiar Link Operacional</span>
                  </Button>

                  {p.access_token && (
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      className="size-11 min-h-11 min-w-11 p-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
                    >
                      <a
                        href={`/portal/subpainel/${p.access_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir Terminal de Operação"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
