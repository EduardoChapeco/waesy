import { createFileRoute, Link, redirect, isRedirect, useNavigate } from "@tanstack/react-router";
import { useState, useId } from "react";
import { toast } from "sonner";
import {
  Store,
  ArrowRight,
  Loader2,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { generateSlug } from "@/lib/slug-utils";
import { createStore } from "@/services/identity.functions";
import { setClientContextCookies } from "@/lib/context-auth";
import { getUserSession } from "@/services/auth.functions";

export const Route = createFileRoute("/_store/conta/lojas/nova")({
  head: () => ({ meta: [{ title: "Cadastrar Nova Loja | Waesy" }] }),
  beforeLoad: async ({ location }) => {
    let session: any = null;
    try {
      session = await getUserSession();
    } catch {
      session = null;
    }

    if (!session?.user) {
      throw redirect({
        to: "/entrar",
        search: { returnUrl: location.pathname + location.searchStr },
      });
    }
    return { session };
  },
  loader: async ({ location }) => {
    try {
      let session: any = null;
      try {
        session = await getUserSession();
      } catch {
        session = null;
      }

      if (!session?.user) {
        throw redirect({
          to: "/entrar",
          search: { returnUrl: location.pathname + location.searchStr },
        });
      }
      return { session };
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error("[loader:_store.conta.lojas.nova] Erro no loader:", err);
      return { session: null };
    }
  },
  component: NovaLojaPage,
});

const BUSINESS_SEGMENTS = [
  { id: "gastronomy", label: "Gastronomia & Alimentação" },
  { id: "retail", label: "Varejo & Comércio Local" },
  { id: "services", label: "Prestação de Serviços" },
  { id: "tourism", label: "Turismo & Viagens" },
  { id: "events", label: "Eventos & Entretenimento" },
  { id: "health_beauty", label: "Saúde & Estética" },
  { id: "other", label: "Outros Segmentos" },
] as const;

export default function NovaLojaPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("retail");
  const [document, setDocument] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SC");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const nameInputId = useId();
  const segmentSelectId = useId();
  const documentInputId = useId();
  const cityInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();

  const previewSlug = name.trim() ? generateSlug(name) : "minha-empresa";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!name || name.trim().length < 2) {
      errors.name = "Informe o nome da empresa (mínimo de 2 caracteres).";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Por favor, preencha os campos obrigatórios.");
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await createStore({
        data: {
          name: name.trim(),
          type: segment,
          segment,
          category: segment,
          document: document.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        },
      });

      if (res?.success && res.storeId) {
        setClientContextCookies({ context: "store", storeId: res.storeId });
        toast.success(`Loja "${res.storeName || name}" criada e ativada no Workspace!`);
        window.location.href = `/workspace?storeId=${res.storeId}`;
      } else {
        throw new Error("Não foi possível confirmar o provisionamento da loja.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar loja.";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-safe pb-24 px-4 sm:px-6">
      {/* ── Native Mobile Header ── */}
      <NativeMobileHeader title="Nova Loja" fallbackHref="/conta/lojas" mobileOnly />

      {/* ── Desktop Header & Navigation ── */}
      <div className="hidden sm:flex items-center justify-between border-b border-border/40 pb-4 pt-2">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta/lojas" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Cadastrar Nova Loja
            </h1>
            <p className="text-xs text-muted-foreground">
              Crie um novo negócio para gerenciar produtos, pedidos e equipe no Workspace.
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="h-11 min-h-11 sm:h-9 text-xs font-semibold gap-2">
          <Link to="/criar-negocio" search={{ modo: "avancado" }}>
            <span>Onboarding Avançado</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* ── Formulário Canônico de Criação ── */}
      <Card className="p-5 sm:p-8 rounded-lg border border-border bg-card space-y-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome da Loja */}
          <div className="space-y-2">
            <Label htmlFor={nameInputId} className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Nome do Negócio / Empresa *</span>
              <span className="text-2xs text-muted-foreground font-normal">Exibido na vitrine</span>
            </Label>
            <div className="relative">
              <Building2 className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id={nameInputId}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }
                }}
                placeholder="Ex: Padaria Central, Oficina Express, Tour Viagens"
                className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            {fieldErrors.name && (
              <p className="text-xs text-destructive font-medium">{fieldErrors.name}</p>
            )}

            {/* Slug Preview */}
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground font-mono">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground font-sans font-bold">Endereço Web:</span>
              <span className="text-foreground font-bold">waesy.com.br/{previewSlug}</span>
            </div>
          </div>

          {/* Segmento Comercial */}
          <div className="space-y-2">
            <Label htmlFor={segmentSelectId} className="text-xs font-semibold text-foreground">
              Segmento de Atuação *
            </Label>
            <Select value={segment} onValueChange={setSegment} disabled={isSubmitting}>
              <SelectTrigger id={segmentSelectId} className="h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2">
                <SelectValue placeholder="Selecione o segmento" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_SEGMENTS.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-sm">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Documento (CNPJ / CPF) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={documentInputId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>CNPJ ou CPF</span>
                <span className="text-2xs text-muted-foreground font-normal">Opcional</span>
              </Label>
              <div className="relative">
                <FileText className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id={documentInputId}
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2 font-mono"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Cidade / Estado */}
            <div className="space-y-2">
              <Label htmlFor={cityInputId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Cidade Base</span>
                <span className="text-2xs text-muted-foreground font-normal">Opcional</span>
              </Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id={cityInputId}
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Chapecó"
                    className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2"
                    disabled={isSubmitting}
                  />
                </div>
                <Input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="SC"
                  className="w-16 h-11 min-h-11 text-sm text-center uppercase font-bold bg-background border-input focus-visible:ring-2"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Contato Comercial (WhatsApp & E-mail) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={phoneInputId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>WhatsApp / Atendimento</span>
                <span className="text-2xs text-muted-foreground font-normal">Opcional</span>
              </Label>
              <div className="relative">
                <Phone className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id={phoneInputId}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(49) 99999-9999"
                  className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={emailInputId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>E-mail Comercial</span>
                <span className="text-2xs text-muted-foreground font-normal">Opcional</span>
              </Label>
              <div className="relative">
                <Mail className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id={emailInputId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Garantia de Segurança Zero-Trust */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
            <span className="leading-tight">
              Seu perfil será registrado atomicamente como proprietário único desta loja com controle de acesso multi-tenant.
            </span>
          </div>

          {/* Botão de Ação Primária */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 min-h-11 rounded-lg text-sm font-bold gap-2 cursor-pointer focus-visible:ring-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Provisionando loja e ativando Workspace...</span>
                </>
              ) : (
                <>
                  <span>Criar e Ativar Loja</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
