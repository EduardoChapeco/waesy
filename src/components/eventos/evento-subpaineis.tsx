import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Store,
  Key,
  ExternalLink,
  User,
  Phone,
  Layers,
  ShieldCheck,
  Ticket,
  Beer,
  Utensils,
  Sparkles,
  Smartphone,
  RefreshCw,
  Power,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import {
  listEventSubpanels,
  createEventSubpanel,
  toggleEventSubpanelStatus,
  regenerateEventSubpanelToken,
} from "@/services/events.functions";

interface EventoSubpaineisProps {
  eventId: string;
}

const TIPOS_SUBPAINEL = [
  { value: "bar", label: "Bar & Bebidas", icon: Beer, color: "text-amber-500", desc: "Controle de fichas, chopp e vendas rápidas no balcão" },
  { value: "foodtruck", label: "Alimentação & Lanches", icon: Utensils, color: "text-orange-500", desc: "Comandas de comida, pedidos e praça de alimentação" },
  { value: "restaurant", label: "Restaurante / Buffet", icon: Store, color: "text-emerald-500", desc: "Mesas, garçons, pesagem por quilo e consumo consolidado" },
  { value: "merchandise", label: "Loja Oficial / Merch", icon: Store, color: "text-purple-500", desc: "Venda de copos, camisetas e recordações" },
  { value: "ticketing_box", label: "Bilheteria / Portaria", icon: Ticket, color: "text-blue-500", desc: "Validação de ingressos e venda local" },
  { value: "vip_lounge", label: "Camarote / Lounge VIP", icon: Sparkles, color: "text-yellow-500", desc: "Acesso e atendimento exclusivo" },
  { value: "security_checkpoint", label: "Posto de Segurança", icon: ShieldCheck, color: "text-rose-500", desc: "Controle de fluxo e ocorrências" },
  { value: "other", label: "Outro Ponto Especial", icon: Store, color: "text-muted-foreground", desc: "Terminal customizado" },
];

const TEMPLATES_OPERACIONAIS = [
  { value: "bar_simples", label: "Bar Ficha Rápida (1 Toque)", desc: "Ideal para chopp, água e bebidas de giro rápido" },
  { value: "bar_comanda", label: "Bar & Mesas com Comanda", desc: "Atendimento por número de mesa ou pulseira" },
  { value: "buffet_kg", label: "Restaurante / Buffet a Quilo", desc: "Habilita calculadora de pesagem (kg) e valor livre" },
  { value: "foodtruck", label: "Fast-Food & Senha de Retirada", desc: "Foco em lanches, combos e fila de preparo" },
  { value: "bilheteria", label: "Bilheteria & Lotes de Portaria", desc: "Emissão rápida de ingressos presenciais" },
  { value: "loja_merch", label: "Loja Oficial & Souvenirs", desc: "Grade de produtos físicos e colecionáveis" },
];

export function EventoSubpaineis({ eventId }: EventoSubpaineisProps) {
  const [subpanels, setSubpanels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Form de Novo Subpainel
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [panelType, setPanelType] = useState<any>("bar");
  const [templateTipo, setTemplateTipo] = useState<any>("bar_simples");
  const [managerName, setManagerName] = useState("");
  const [managerContact, setManagerContact] = useState("");
  const [expireDays, setExpireDays] = useState(30);
  const [concessionPercentage, setConcessionPercentage] = useState(10);
  const [concessionFixedReais, setConcessionFixedReais] = useState(0);
  const [allowOnlineOrders, setAllowOnlineOrders] = useState(true);
  const [allowCustomPrice, setAllowCustomPrice] = useState(false);

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

  const handlePanelTypeChange = (val: string) => {
    setPanelType(val);
    if (val === "bar") setTemplateTipo("bar_simples");
    else if (val === "foodtruck") setTemplateTipo("foodtruck");
    else if (val === "restaurant") {
      setTemplateTipo("buffet_kg");
      setAllowCustomPrice(true);
    } else if (val === "merchandise") setTemplateTipo("loja_merch");
    else if (val === "ticketing_box") setTemplateTipo("bilheteria");
    else if (val === "vip_lounge") setTemplateTipo("bar_comanda");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do ponto operacional.");
      return;
    }

    startTransition(async () => {
      try {
        await createEventSubpanel({
          data: {
            eventId,
            name: name.trim(),
            panelType,
            templateTipo,
            managerName: managerName.trim() || undefined,
            managerContact: managerContact.trim() || undefined,
            concessionPercentage: Number(concessionPercentage) || 0,
            concessionFixedCents: Math.round(Number(concessionFixedReais) * 100) || 0,
            allowOnlineOrders: Boolean(allowOnlineOrders),
            allowCustomPrice: Boolean(allowCustomPrice || templateTipo === "buffet_kg"),
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
        setAllowCustomPrice(false);
        loadSubpanels();
      } catch (err: any) {
        toast.error("Erro ao criar subpainel: " + err.message);
      }
    });
  };

  const handleToggleStatus = (subpanelId: string, currentActive: boolean) => {
    startTransition(async () => {
      try {
        await toggleEventSubpanelStatus({
          data: { subpanelId, isActive: !currentActive },
        });
        toast.success(!currentActive ? "Terminal reativado." : "Terminal pausado temporariamente.");
        loadSubpanels();
      } catch (err: any) {
        toast.error("Falha ao alterar status: " + err.message);
      }
    });
  };

  const handleRegenerateToken = (subpanelId: string, subpanelName: string) => {
    startTransition(async () => {
      try {
        const res = await regenerateEventSubpanelToken({
          data: { subpanelId, expireDays: 30 },
        });
        const newToken = res?.subpanel?.access_token;
        if (newToken) {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          navigator.clipboard?.writeText(`${origin}/portal/subpainel/${newToken}`);
        }
        toast.success(`Novo token gerado para ${subpanelName} e copiado!`);
        loadSubpanels();
      } catch (err: any) {
        toast.error("Erro ao regenerar token: " + err.message);
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
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">
              Subpainéis & Pontos de Venda
            </h3>
            <Badge variant="outline" className="text-xs">
              {subpanels.length} {subpanels.length === 1 ? "ponto configurado" : "pontos configurados"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gere terminais independentes tokenizados para Bar, Portaria, Restaurante a Quilo ou Foodtruck com taxa de concessão auditada.
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Categoria do Ponto</Label>
                  <Select value={panelType} onValueChange={handlePanelTypeChange}>
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
                  <Label className="text-xs font-bold">Modo de Operação PDV</Label>
                  <Select value={templateTipo} onValueChange={(v) => setTemplateTipo(v)}>
                    <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATES_OPERACIONAIS.map((tpl) => (
                        <SelectItem key={tpl.value} value={tpl.value} className="text-xs">
                          {tpl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Nome do Ponto / Empresa Parceira *</Label>
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
                  Regras Comerciais, Segurança & Concessão
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

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">Exibir no Cardápio Mobile</span>
                    <span className="text-xs text-muted-foreground block">Permitir pedidos pelo público na vitrine do evento</span>
                  </div>
                  <Switch
                    checked={allowOnlineOrders}
                    onCheckedChange={setAllowOnlineOrders}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">Permitir Valor Avulso / Balança</span>
                    <span className="text-xs text-muted-foreground block">Autorizar digitação de valor por peso ou item livre no PDV</span>
                  </div>
                  <Switch
                    checked={allowCustomPrice || templateTipo === "buffet_kg"}
                    onCheckedChange={setAllowCustomPrice}
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
            const tplInfo = TEMPLATES_OPERACIONAIS.find((t) => t.value === p.template_tipo);
            const TipoIcon = tipoInfo.icon;
            const percentage = p.concession_percentage != null ? p.concession_percentage : 10;

            return (
              <Card
                key={p.id}
                className="rounded-lg border border-border/80 bg-card p-4 space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-2 rounded-lg bg-muted/60 shrink-0 ${tipoInfo.color}`}>
                        <TipoIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground break-words leading-tight">{p.name}</h4>
                        <span className="text-xs text-muted-foreground block">{tipoInfo.label}</span>
                      </div>
                    </div>

                    <Badge
                      className={
                        p.is_active
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold shrink-0"
                          : "bg-muted text-muted-foreground text-xs shrink-0"
                      }
                    >
                      {p.is_active ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground break-words leading-relaxed">
                    {tplInfo ? tplInfo.label : tipoInfo.desc}
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
                    {(p.allow_custom_price || p.template_tipo === "buffet_kg") && (
                      <Badge variant="outline" className="text-xs gap-1 border-amber-500/30 text-amber-600 bg-amber-500/10">
                        <Scale className="size-3" />
                        Pesagem / Avulso
                      </Badge>
                    )}
                  </div>

                  {(p.manager_name || p.manager_contact) && (
                    <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                      {p.manager_name && (
                        <div className="flex items-center gap-2">
                          <User className="size-3 text-muted-foreground shrink-0" />
                          <span className="break-words">{p.manager_name}</span>
                        </div>
                      )}
                      {p.manager_contact && (
                        <div className="flex items-center gap-2">
                          <Phone className="size-3 text-muted-foreground shrink-0" />
                          <span className="break-words">{p.manager_contact}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações de Token, Status e Acesso Seguro */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(p.access_token)}
                    className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 flex-1 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <Key className="size-4 text-primary shrink-0" />
                    <span>Copiar Link</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRegenerateToken(p.id, p.name)}
                    disabled={isPending}
                    title="Regenerar Token de Segurança (Revoga o link anterior)"
                    className="size-11 min-h-11 min-w-11 p-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
                  >
                    <RefreshCw className="size-4 text-muted-foreground" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(p.id, Boolean(p.is_active))}
                    disabled={isPending}
                    title={p.is_active ? "Pausar Acesso deste Ponto" : "Reativar Acesso deste Ponto"}
                    className="size-11 min-h-11 min-w-11 p-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
                  >
                    <Power className={`size-4 ${p.is_active ? "text-emerald-600" : "text-muted-foreground"}`} />
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
