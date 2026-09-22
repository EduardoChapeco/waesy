import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Store, 
  Coffee, 
  UtensilsCrossed, 
  ShoppingBag, 
  Phone, 
  User, 
  Ticket, 
  Crown, 
  ShieldCheck, 
  CreditCard, 
  Beer, 
  ExternalLink, 
  Copy,
  Check,
  Layers,
  Key
} from "lucide-react";
import { toast } from "sonner";
import { listEventSubpanels, createEventSubpanel } from "@/services/events.functions";

interface EventoSubpaineisProps {
  eventId: string;
}

const TIPOS_SUBPAINEL = [
  { value: "bar", label: "Bar & Bebidas", icon: Beer, color: "text-amber-500", desc: "Caixa rápido, fichas e sangria de chopp" },
  { value: "foodtruck", label: "Praça de Alimentação / Foodtruck", icon: UtensilsCrossed, color: "text-rose-500", desc: "Comandas e pedidos rápidos de cozinha" },
  { value: "ticketing_box", label: "Bilheteria Física / Portaria", icon: Ticket, color: "text-sky-500", desc: "Venda no local e validação de ingressos" },
  { value: "vip_lounge", label: "Camarote / Lounge VIP", icon: Crown, color: "text-purple-500", desc: "Acesso restrito e pulseiras personalizadas" },
  { value: "merchandise", label: "Loja Oficial / Produtos", icon: ShoppingBag, color: "text-emerald-500", desc: "Venda de copos, camisetas e souvenirs" },
  { value: "security_checkpoint", label: "Portaria de Segurança & Revista", icon: ShieldCheck, color: "text-indigo-500", desc: "Controle de fluxo de entrada e contagem" },
];

export function EventoSubpaineis({ eventId }: EventoSubpaineisProps) {
  const [subpanels, setSubpanels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal de Criação
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [panelType, setPanelType] = useState<any>("bar");
  const [managerName, setManagerName] = useState("");
  const [managerContact, setManagerContact] = useState("");
  const [expireDays, setExpireDays] = useState(30);

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

  const handleCreate = async (e: React.FormEvent) => {
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
            expireDays,
            config: {},
          },
        });

        toast.success("Subpainel operacional ativado com token seguro!");
        setIsNewOpen(false);
        setName("");
        setManagerName("");
        setManagerContact("");
        loadSubpanels();
      } catch (err: any) {
        toast.error("Erro ao criar subpainel: " + err.message);
      }
    });
  };

  const handleCopyLink = (token: string) => {
    if (!token) return;
    const url = `${window.location.origin}/p/evento/subpainel/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link seguro copiado para a área de transferência!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin" />
        <span>Carregando pontos de operação e subpainéis...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topo do Módulo Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">
              Subpainéis & Pontos de Operação Isolados
            </h3>
            <Badge variant="outline" className="text-xs">
              {subpanels.length} {subpanels.length === 1 ? "ponto ativo" : "pontos ativos"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gere terminais independentes tokenizados para Bar, Portaria, Foodtruck ou VIP sem expor a conta master.
          </p>
        </div>

        <Sheet open={isNewOpen} onOpenChange={setIsNewOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 px-4 rounded-xl text-xs font-bold gap-2">
              <Plus className="size-4" />
              <span>Novo Subpainel</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Ativar Ponto Operacional</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Um token seguro de acesso exclusivo será gerado para a equipe deste terminal.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tipo de Terminal Operacional</Label>
                <Select value={panelType} onValueChange={(v) => setPanelType(v)}>
                  <SelectTrigger className="h-11 rounded-xl text-xs">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nome do Terminal *</Label>
                <Input
                  required
                  placeholder="Ex: Bar Principal - Pista 1"
                  className="h-11 rounded-xl text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Responsável / Gerente</Label>
                  <Input
                    placeholder="Ex: Fernando Barman"
                    className="h-11 rounded-xl text-xs"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Contato WhatsApp</Label>
                  <Input
                    placeholder="(49) 99999-9999"
                    className="h-11 rounded-xl text-xs"
                    value={managerContact}
                    onChange={(e) => setManagerContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Validade do Token de Acesso</Label>
                <Select
                  value={expireDays.toString()}
                  onValueChange={(v) => setExpireDays(parseInt(v))}
                >
                  <SelectTrigger className="h-11 rounded-xl text-xs">
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

              <Button type="submit" disabled={isPending} className="w-full h-11 rounded-xl text-xs font-bold mt-4">
                {isPending ? "Ativando..." : "Criar Subpainel"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Grid de Subpainéis */}
      {subpanels.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
          <Store className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-foreground">Nenhum ponto operacional configurado</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Crie pontos de bar, bilheteria física ou portarias com terminais dedicados.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subpanels.map((p) => {
            const tipoInfo = TIPOS_SUBPAINEL.find((t) => t.value === p.panel_type) || TIPOS_SUBPAINEL[0];
            const TipoIcon = tipoInfo.icon;

            return (
              <Card
                key={p.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl bg-muted/60 ${tipoInfo.color}`}>
                        <TipoIcon className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{p.name}</h4>
                        <span className="text-[10px] text-muted-foreground">{tipoInfo.label}</span>
                      </div>
                    </div>

                    <Badge
                      className={
                        p.is_active
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold"
                          : "bg-muted text-muted-foreground text-[10px]"
                      }
                    >
                      {p.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {tipoInfo.desc}
                  </p>

                  {(p.manager_name || p.manager_contact) && (
                    <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-0.5">
                      {p.manager_name && (
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-muted-foreground" />
                          <span>{p.manager_name}</span>
                        </div>
                      )}
                      {p.manager_contact && (
                        <div className="flex items-center gap-1.5">
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
                    className="h-8 rounded-xl text-xs font-bold gap-1.5 flex-1"
                  >
                    <Key className="size-3 text-primary" />
                    <span>Copiar Link Operacional</span>
                  </Button>

                  {p.access_token && (
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      className="size-8 p-0 rounded-xl"
                    >
                      <a
                        href={`/p/evento/subpainel/${p.access_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir Terminal"
                      >
                        <ExternalLink className="size-3.5" />
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
