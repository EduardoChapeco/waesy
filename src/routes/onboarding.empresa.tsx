import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  ShieldCheck,
  Store,
  Compass,
  UtensilsCrossed,
  ShoppingBag,
  Car,
  Home,
  Wrench,
  Truck,
  Sparkles,
  Ticket,
  Scale,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getUserSession } from "@/services/auth.functions";
import { registerEnterpriseOnboardingFn } from "@/services/enterprise-onboarding.functions";
import {
  maskCpfProgressive,
  maskCnpjProgressive,
  formatPhone,
  validateCpfMod11,
  validateCnpjMod11,
  cleanDocument,
  validateBirthDate,
} from "@/lib/document-validator";
import { resolveSubsystemBySlug, resolveSubsystemFromHost } from "@/lib/vertical-subsystems";

type OnboardingEmpresaSearch = {
  vertical?: string;
  segment?: string;
  niche?: string;
  sku?: string;
};

export const Route = createFileRoute("/onboarding/empresa")({
  validateSearch: (search: Record<string, unknown>): OnboardingEmpresaSearch => ({
    vertical: typeof search?.vertical === "string" ? search.vertical : undefined,
    segment: typeof search?.segment === "string" ? search.segment : undefined,
    niche: typeof search?.niche === "string" ? search.niche : undefined,
    sku: typeof search?.sku === "string" ? search.sku : undefined,
  }),
  head: () => ({
    meta: [
      {
        title: "Credenciamento de Empresa & Workspace — Waesy",
      },
      {
        name: "description",
        content: "Crie o espaço de trabalho corporativo para sua empresa gerenciar catálogos, equipe, vendas e rotas.",
      },
    ],
  }),
  loader: async () => {
    try {
      const session = await getUserSession();
      return { session };
    } catch {
      return { session: null };
    }
  },
  component: EnterpriseOnboardingPage,
});

const NICHE_OPTIONS = [
  {
    id: "pro",
    label: "Waesy Pro (All-in-One)",
    description: "Acesso irrestrito a todos os sistemas verticais, ERP, CRM, IA e vitrines.",
    icon: Sparkles,
  },
  {
    id: "talk",
    label: "Waesy Talk (Atendimento & CRM)",
    description: "WhatsApp multi-atendente, filas, chat ao vivo, funil CRM e carteira de contatos.",
    icon: User,
  },
  {
    id: "copilot",
    label: "Waesy Copilot (IA Autônoma)",
    description: "Agente autônomo, squads, skills, automações e inteligência de mercado.",
    icon: ShieldCheck,
  },
  {
    id: "turismo",
    label: "Turismo & Viagens (Turis)",
    description: "Pacotes, passagens, hotelaria, cotação e propostas digitais.",
    icon: Compass,
  },
  {
    id: "gastronomia",
    label: "Gastronomia & KDS (Wider)",
    description: "Cardápio digital, mesas, comandas, KDS e entrega local.",
    icon: UtensilsCrossed,
  },
  {
    id: "eventos",
    label: "Eventos & Bilheteria (Eventio)",
    description: "Lotes de ingressos, check-in QR na portaria e promoters.",
    icon: Ticket,
  },
  {
    id: "juridico",
    label: "Jurídico & Processos (Juris)",
    description: "Gestão de casos, prazos forenses, cofre GED e honorários.",
    icon: Scale,
  },
  {
    id: "beleza_clinica",
    label: "Agenda, Beleza & Clínicas (WowBook)",
    description: "Agendamentos, prontuário, salas e rateio Salão-Parceiro.",
    icon: Calendar,
  },
  {
    id: "varejo",
    label: "Lojas & Varejo (Waesy Store)",
    description: "Catálogo com grades, PDV ágil, controle de estoque e vitrine.",
    icon: ShoppingBag,
  },
  {
    id: "mercado",
    label: "Supermercados & Mercearias (Mercado)",
    description: "PDV de caixa rápido, produtos pesáveis por balança e lotes.",
    icon: Store,
  },
  {
    id: "b2b_distribuidora",
    label: "Atacado & Distribuidora B2B",
    description: "Tabelas de preço por CNPJ, lotes mínimos e rotas GPS de campo.",
    icon: Truck,
  },
  {
    id: "veiculos",
    label: "Oficinas, Autocenters & Veículos",
    description: "Ordens de serviço por placa, pátio, peças e concessionária.",
    icon: Car,
  },
  {
    id: "imoveis",
    label: "Imóveis & Locação",
    description: "Portfólio de imóveis, vistorias fotográficas e contratos.",
    icon: Home,
  },
  {
    id: "servicos",
    label: "Serviços, Contratos & Consultoria",
    description: "Ordens de serviço, minutas digitais, RH e orçamentos.",
    icon: Wrench,
  },
];

function mapInitialVerticalToNicheOption(rawVerticalOrSegment?: string | null): string {
  const clean = String(rawVerticalOrSegment || "").trim().toLowerCase();
  if (!clean) return "pro";
  if (clean === "pro" || clean === "waesy_bundle_pro" || clean === "waesy_studio") return "pro";
  if (clean === "talk" || clean === "atendimento" || clean === "chat") return "talk";
  if (clean === "copilot" || clean === "waesy_copilot" || clean === "ia") return "copilot";
  if (clean === "turis" || clean === "tourism" || clean === "turismo") return "turismo";
  if (clean === "wider" || clean === "tableway" || clean === "gastronomy" || clean === "gastronomia") return "gastronomia";
  if (clean === "eventio" || clean === "passhub" || clean === "events" || clean === "eventos") return "eventos";
  if (clean === "juris" || clean === "lexcloud" || clean === "law_firm" || clean === "juridico") return "juridico";
  if (clean === "wowbook" || clean === "beauty_salon" || clean === "healthcare" || clean === "beleza_clinica") return "beleza_clinica";
  if (clean === "mercado" || clean === "supermercado") return "mercado";
  if (clean === "store" || clean === "varejo" || clean === "retail" || clean === "lojas") return "varejo";
  if (clean === "autocenter" || clean === "oficinas" || clean === "automotive" || clean === "veiculos") return "veiculos";
  if (clean === "imobiliaria" || clean === "imoveis" || clean === "real_estate") return "imoveis";
  if (clean === "b2b_distribuidora") return "b2b_distribuidora";
  if (clean === "signflow" || clean === "talentlink" || clean === "omnipage" || clean === "services" || clean === "servicos") return "servicos";
  return "turismo";
}

function EnterpriseOnboardingPage() {
  const { session } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const initialVerticalContext = (() => {
    const hostSub =
      typeof window !== "undefined" ? resolveSubsystemFromHost(window.location.hostname) : null;
    let stored: { vertical?: string; niche?: string; sku?: string } | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("waesy_pending_vertical_onboarding");
        if (raw) stored = JSON.parse(raw);
      } catch {}
    }
    const verticalSlug =
      search?.vertical || stored?.vertical || (hostSub && hostSub.id !== "waesy" ? hostSub.id : undefined);
    const resolvedSub = resolveSubsystemBySlug(verticalSlug);
    const segmentKey =
      search?.vertical ||
      search?.segment ||
      search?.niche ||
      stored?.vertical ||
      stored?.niche ||
      resolvedSub?.id ||
      resolvedSub?.primaryNicheId;
    return {
      nicheOption: mapInitialVerticalToNicheOption(segmentKey),
      vertical: resolvedSub?.id || verticalSlug,
      brandOrigin: resolvedSub?.brandVerticalId || resolvedSub?.id,
      verticalSku: search?.sku || stored?.sku || resolvedSub?.defaultVerticalSku,
    };
  })();

  const [step, setStep] = useState<1 | 2>(1);

  // Passo 1: Titular
  const [fullName, setFullName] = useState(
    session?.profile?.full_name || (session as any)?.fullName || "",
  );
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(session?.email || "");
  const [password, setPassword] = useState("");

  // Passo 2: Negócio
  const [tradeName, setTradeName] = useState("");
  const [corporateName, setCorporateName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [niche, setNiche] = useState(initialVerticalContext.nicheOption);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 3) {
      toast.error("Informe o nome completo do responsável legal.");
      return;
    }

    const cleanCpf = cleanDocument(cpf);
    if (!cleanCpf || !validateCpfMod11(cleanCpf)) {
      toast.error("CPF inválido. Verifique os dígitos informados.");
      return;
    }

    if (!birthDate.trim()) {
      toast.error("Informe a data de nascimento do titular.");
      return;
    }

    const bCheck = validateBirthDate(birthDate, { minAge: 18 });
    if (!bCheck.isValid) {
      toast.error(bCheck.error || "O responsável deve ser maior de 18 anos.");
      return;
    }

    const cleanPhone = cleanDocument(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Informe um telefone de contato celular com DDD.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Informe um e-mail corporativo válido.");
      return;
    }

    if (!session?.id && (!password || password.length < 6)) {
      toast.error("Defina uma senha de acesso com no mínimo 6 caracteres.");
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tradeName.trim() || tradeName.trim().length < 2) {
      toast.error("Informe o nome fantasia da empresa.");
      return;
    }

    const cleanCnpj = cleanDocument(cnpj);
    if (cleanCnpj && cleanCnpj.length > 0) {
      if (!validateCnpjMod11(cleanCnpj)) {
        toast.error("CNPJ inválido. Verifique os dígitos informados.");
        return;
      }
    }

    if (!city.trim()) {
      toast.error("Informe a cidade sede do negócio.");
      return;
    }

    if (!state.trim() || state.trim().length !== 2) {
      toast.error("Informe a sigla do estado com 2 letras (ex: SC, SP, PR).");
      return;
    }

    startTransition(async () => {
      try {
        const res = await registerEnterpriseOnboardingFn({
          data: {
            fullName,
            cpf,
            birthDate,
            phone,
            email,
            password: password || undefined,
            tradeName,
            corporateName: corporateName || undefined,
            cnpj: cnpj || undefined,
            niche,
            vertical: initialVerticalContext.vertical || undefined,
            brandOrigin: initialVerticalContext.brandOrigin || undefined,
            verticalSku: initialVerticalContext.verticalSku || undefined,
            city,
            state: state.toUpperCase(),
            address: address || undefined,
          },
        });

        if (res.success) {
          toast.success("Empresa credenciada com sucesso! Bem-vindo ao Workspace.");
          navigate({ to: "/workspace", replace: true });
        }
      } catch (err: any) {
        toast.error(err?.message || "Falha ao registrar empresa.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* ── Top Header ── */}
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xs tracking-wider">
              W
            </div>
            <span className="font-extrabold text-sm tracking-tight text-foreground">
              Waesy Workspace
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              to="/auth/portal-selector"
              className="h-11 min-h-11 px-3 rounded-xl border border-border/70 hover:bg-muted/50 text-foreground font-semibold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Já possuo empresa</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Formulário Central ── */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-6 flex-1">
        {/* Indicador de Passos */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="space-y-1">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-primary">
              Passo {step} de 2
            </span>
            <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              {step === 1 ? "Identificação do Titular / Responsável" : "Dados do Negócio & Segmento"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`size-2.5 rounded-full ${
                step === 1 ? "bg-primary" : "bg-emerald-500"
              }`}
            />
            <div
              className={`size-2.5 rounded-full ${
                step === 2 ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        </div>

        {/* ── ETAPA 1: TITULAR LEGAL ── */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                <span>Credenciamento de Pessoa Jurídica / Empreendedor</span>
              </div>
              <p>
                Os dados do responsável legal são auditados em conformidade com as normas tributárias e fiscais brasileiras para emissão de cobranças e faturamento.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="fullName" className="text-xs font-bold text-foreground">
                  Nome Completo do Titular *
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  required
                  className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cpf" className="text-xs font-bold text-foreground">
                    CPF do Titular *
                  </Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(maskCpfProgressive(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="birthDate" className="text-xs font-bold text-foreground">
                    Data de Nascimento *
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phone" className="text-xs font-bold text-foreground">
                    Celular com WhatsApp *
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-xs font-bold text-foreground">
                    E-mail Profissional / Acesso *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@minhaempresa.com.br"
                    required
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1"
                  />
                </div>
              </div>

              {!session?.id && (
                <div>
                  <Label htmlFor="password" className="text-xs font-bold text-foreground">
                    Senha de Acesso ao Workspace (mínimo 6 dígitos) *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 min-h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-2 cursor-pointer"
              >
                <span>Continuar para Dados do Negócio</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </form>
        )}

        {/* ── ETAPA 2: DADOS DO NEGÓCIO & NICHO ── */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tradeName" className="text-xs font-bold text-foreground">
                    Nome Fantasia do Negócio *
                  </Label>
                  <Input
                    id="tradeName"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Destinos & Cia Turismo"
                    required
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="cnpj" className="text-xs font-bold text-foreground">
                    CNPJ (opcional para MEI/Autônomo)
                  </Label>
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(maskCnpjProgressive(e.target.value))}
                    placeholder="00.000.000/0001-00"
                    maxLength={18}
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="corporateName" className="text-xs font-bold text-foreground">
                  Razão Social (se houver)
                </Label>
                <Input
                  id="corporateName"
                  value={corporateName}
                  onChange={(e) => setCorporateName(e.target.value)}
                  placeholder="Ex: Destinos & Cia Viagens e Turismo Ltda"
                  className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1"
                />
              </div>

              {/* Seletor de Nicho / Vertical */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-bold text-foreground">
                  Selecione a Vertical Principal da sua Empresa *
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {NICHE_OPTIONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = niche === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNiche(item.id)}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold text-foreground">
                            {item.label}
                          </p>
                          <p className="text-2xs text-muted-foreground leading-snug line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <Label htmlFor="city" className="text-xs font-bold text-foreground">
                    Cidade Sede *
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Miguel do Oeste"
                    required
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="state" className="text-xs font-bold text-foreground">
                    Estado (UF) *
                  </Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="SC"
                    maxLength={2}
                    required
                    className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="text-xs font-bold text-foreground">
                  Endereço / Bairro (opcional)
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro"
                  className="h-11 min-h-11 text-xs rounded-xl bg-card border-border/80 mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isPending}
                className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold border-border/80 bg-background hover:bg-muted/50 gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft className="size-4" />
                <span>Voltar</span>
              </Button>

              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 h-11 min-h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-2 cursor-pointer"
              >
                <span>{isPending ? "Criando Workspace..." : "Concluir e Acessar Workspace"}</span>
                <Sparkles className="size-4" />
              </Button>
            </div>
          </form>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        <p>Waesy Platform &copy; {new Date().getFullYear()} — Registro Corporativo Seguro.</p>
      </footer>
    </div>
  );
}
