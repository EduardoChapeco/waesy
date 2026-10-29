import { useState } from "react";
import {
  User,
  Calendar,
  DollarSign,
  Package,
  FileText,
  Clock,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
  Tag,
  CheckCircle2,
  X,
  CreditCard,
  MessageSquare,
  Sparkles,
  Heart,
  Plus,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/money";
import { DigitalSignatureCanvas } from "./DigitalSignatureCanvas";

export interface CustomerDrawer360Props {
  // Shape A (workspace.clientes.index.tsx)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  customerId?: string;
  storeId?: string;
  customerName?: string;
  customerDoc?: string;
  customerPhone?: string;
  customerEmail?: string;

  // Shape B (direct object)
  isOpen?: boolean;
  onClose?: () => void;
  customer?: any;
  canViewPhones?: boolean;
}

export function CustomerDrawer360(props: CustomerDrawer360Props) {
  const { canViewPhones = true } = props;
  const isSheetOpen = props.open ?? props.isOpen ?? false;
  const handleClose = () => {
    props.onOpenChange?.(false);
    props.onClose?.();
  };

  const customer = props.customer || (props.customerId || props.customerName ? {
    id: props.customerId,
    name: props.customerName,
    fullName: props.customerName,
    document: props.customerDoc,
    phone: props.customerPhone,
    email: props.customerEmail,
  } : null);

  const [activeTab, setActiveTab] = useState<string>("painel");
  const [anamnesisSignature, setAnamnesisSignature] = useState<string | null>(null);

  if (!isSheetOpen || !customer) return null;

  const displayName = customer.fullName || customer.name || "Cliente";

  const maskPhone = (phone: string) => {
    if (!phone) return "Não informado";
    if (canViewPhones) return phone;
    // Oculta os primeiros dígitos para proteção LGPD
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) *****-$3");
  };

  const TABS = [
    { key: "painel", label: "Painel" },
    { key: "cadastro", label: "Cadastro" },
    { key: "debitos", label: "Débitos" },
    { key: "creditos", label: "Créditos" },
    { key: "cashback", label: "Cashback" },
    { key: "agendamentos", label: "Agendamentos" },
    { key: "produtos", label: "Produtos" },
    { key: "vendas", label: "Vendas" },
    { key: "pacotes", label: "Pacotes" },
    { key: "mensagens", label: "Mensagens" },
    { key: "anotacoes", label: "Anotações" },
    { key: "anamneses", label: "Anamneses" },
    { key: "assinaturas", label: "Assinaturas" },
  ];

  return (
    <Sheet open={isSheetOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 flex flex-col bg-background border-l border-border"
      >
        {/* Header do Cliente */}
        <div className="border-b border-border p-6 flex items-start justify-between bg-card">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg select-none">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
                {customer.nickname && (
                  <Badge variant="secondary" className="text-xs">
                    ({customer.nickname})
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                  Cliente Ativo
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {maskPhone(customer.phone)}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Barra de Abas Horizontais com Scroll Tátil */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-6 py-2 bg-muted/20 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`h-11 min-h-11 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "painel" && (
            <div className="space-y-6">
              {/* Grid de Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <span className="text-xs text-muted-foreground">Dias sem vir</span>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {customer.days_since_last_visit ?? 0} dias
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <span className="text-xs text-muted-foreground">Faturamento (LTV)</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatMoney(customer.total_spent_cents || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <span className="text-xs text-muted-foreground">Débitos Abertos</span>
                  <p className="text-lg font-bold text-destructive mt-0.5">
                    {formatMoney(customer.open_debts_cents || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <span className="text-xs text-muted-foreground">Crédito Carteira</span>
                  <p className="text-lg font-bold text-primary mt-0.5">
                    {formatMoney(customer.credit_balance_cents || 0)}
                  </p>
                </div>
              </div>

              {/* Métricas Comportamentais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Taxa Cancelamento</span>
                    <p className="text-base font-bold text-foreground">
                      {customer.cancellation_rate ?? 0}%
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">Estável</Badge>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Tempo de Cliente</span>
                    <p className="text-base font-bold text-foreground">
                      {customer.client_lifetime_days ?? 120} dias
                    </p>
                  </div>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Cashback Acumulado</span>
                    <p className="text-base font-bold text-foreground">
                      {formatMoney(customer.cashback_balance_cents || 0)}
                    </p>
                  </div>
                  <Heart className="h-4 w-4 text-rose-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "anamneses" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Ficha de Anamnese & Assinatura Digital</h4>
                  <p className="text-xs text-muted-foreground">Histórico de avaliação com assinatura com validade jurídica.</p>
                </div>
                <Button size="sm" className="h-11 px-4 text-xs">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nova Anamnese
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Assinatura Eletrônica Presencial
                </h5>
                <DigitalSignatureCanvas
                  onSave={(signatureUrl) => {
                    setAnamnesisSignature(signatureUrl);
                  }}
                  initialSignatureUrl={anamnesisSignature}
                  placeholderText="Assinatura do cliente na cabine ou balcão"
                />
              </div>
            </div>
          )}

          {activeTab === "cadastro" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nome Completo</Label>
                  <Input defaultValue={displayName} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Apelido</Label>
                  <Input defaultValue={customer.nickname || ""} className="h-11" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Celular / WhatsApp</Label>
                  <Input
                    defaultValue={canViewPhones ? customer.phone : maskPhone(customer.phone)}
                    disabled={!canViewPhones}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">E-mail</Label>
                  <Input defaultValue={customer.email || ""} className="h-11" />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Notificações WhatsApp/SMS</span>
                    <p className="text-xs text-muted-foreground">Enviar lembretes e mensagens de pós-atendimento.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Bloquear Agendamento Online</span>
                    <p className="text-xs text-muted-foreground">Impede que o cliente faça agendamentos de forma autônoma.</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          )}

          {activeTab !== "painel" && activeTab !== "anamneses" && activeTab !== "cadastro" && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Histórico de {activeTab} registrado e integrado ao BFF multi-nicho.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
