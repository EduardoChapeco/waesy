import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  getPublicApiGovernanceSettings,
  savePublicApiGovernanceSettings,
  lookupCep,
  lookupCnpj,
  parseAddressWithAI,
  pingPublicApis,
  type PublicApiGovernanceDTO,
  type ApiPingResult,
  type ResolvedAddressDTO,
  type CnpjCompanyDTO,
  DEFAULT_PUBLIC_API_GOVERNANCE,
} from "@/services/public-apis.functions";
import { formatCep, formatCnpj, formatPhone } from "@/lib/document-validator";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { Check, Compass, Navigation, Search, Cpu, Building2, Globe2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Plug, MapPin, CreditCard, Mail, Truck, Sliders, Eye, EyeOff, CheckCircle2, AlertCircle, Clock, ShieldCheck, RefreshCw, Save, Radio, Layers, Plus, Trash2, Terminal, Activity, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
 getPlatformApiIntegrations,
 updatePlatformApiIntegrations,
 type PlatformApiIntegrationsDTO,
} from "@/services/master.functions";
import {
  listApiKeyPools,
  saveApiKeyToPool,
  toggleApiKeyStatus,
  deleteApiKeyFromPool,
  testPoolKeyConnection,
  listMasterPrompts,
  saveMasterPrompt,
  type ApiKeyPoolDTO,
  type MasterPromptDTO,
  type ApiProvider,
} from "@/services/api-orchestrator.functions";

export const Route = createFileRoute("/admin-master/integracoes")({
 head: () => ({ meta: [{ title: "APIs, Pools & Orquestrador Global | Waesy Master" }] }),
 loader: async () => {
 try {
 const [integrations, pools, prompts] = await Promise.all([
 getPlatformApiIntegrations().catch(() => ({
 mapbox_token: "",
 stripe_public_key: "",
 stripe_secret_key: "",
 asaas_api_key: "",
 resend_api_key: "",
 sendgrid_api_key: "",
 twilio_account_sid: "",
 twilio_auth_token: "",
 melhor_envio_token: "",
 google_maps_api_key: "",
 openai_api_key: "",
 webhook_secret: "",
 active_services: {
 maps: "active" as const,
 payments: "unconfigured" as const,
 email: "unconfigured" as const,
 sms: "unconfigured" as const,
 logistics: "unconfigured" as const,
 },
 })),
 listApiKeyPools().catch(() => []),
 listMasterPrompts().catch(() => []),
 ]);

 const gov = await getPublicApiGovernanceSettings().catch(() => DEFAULT_PUBLIC_API_GOVERNANCE);
      return { integrations, pools, prompts, gov: gov || DEFAULT_PUBLIC_API_GOVERNANCE };
 } catch {
 return {
 integrations: {
 mapbox_token: "",
 stripe_public_key: "",
 stripe_secret_key: "",
 asaas_api_key: "",
 resend_api_key: "",
 sendgrid_api_key: "",
 twilio_account_sid: "",
 twilio_auth_token: "",
 melhor_envio_token: "",
 google_maps_api_key: "",
 openai_api_key: "",
 webhook_secret: "",
 },
 pools: [],
 prompts: [],
 };
 }
 },
 component: AdminMasterIntegracoesPage,
});

type TabType = "pools" | "prompts" | "maps" | "payments" | "comms" | "logistics" | "webhooks";

function AdminMasterIntegracoesPage() {
 const { integrations: initialData, pools: initialPools, prompts: initialPrompts, gov: initialGov } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const [activeTab, setActiveTab] = useState<TabType>("pools");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

 // Form states
 const [formData, setFormData] = useState<PlatformApiIntegrationsDTO>(initialData);
 const [pools, setPools] = useState<ApiKeyPoolDTO[]>(initialPools);
 const [prompts, setPrompts] = useState<MasterPromptDTO[]>(initialPrompts);

 // Modal: Nova Chave na Pool
 const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
 const [newKeyProvider, setNewKeyProvider] = useState<ApiProvider>("firecrawl");
 const [newKeyLabel, setNewKeyLabel] = useState("");
 const [newKeySecret, setNewKeySecret] = useState("");
 const [newKeyPriority, setNewKeyPriority] = useState(1);
 const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);

 // Modal: Editar Prompt Master
 const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
 const [editingPrompt, setEditingPrompt] = useState<MasterPromptDTO | null>(null);
 const [promptSlug, setPromptSlug] = useState("");
 const [promptTitle, setPromptTitle] = useState("");
 const [promptDescription, setPromptDescription] = useState("");
 const [promptSystemInstruction, setPromptSystemInstruction] = useState("");
 const [promptTemplate, setPromptTemplate] = useState("");
 const [promptModel, setPromptModel] = useState("gemini-1.5-flash");
 const [promptTemperature, setPromptTemperature] = useState(0.2);

  // Governança de Mapas & APIs Públicas
  const [govSettings, setGovSettings] = useState<PublicApiGovernanceDTO>(initialGov || DEFAULT_PUBLIC_API_GOVERNANCE);
  const [isSavingGov, setIsSavingGov] = useState(false);
  const handleSaveGov = async () => {
    setIsSavingGov(true);
    try {
      await savePublicApiGovernanceSettings({ data: { settings: govSettings } });
      toast.success("Configurações de governança salvas com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar governança.");
    } finally {
      setIsSavingGov(false);
    }
  };

  const [isPinging, setIsPinging] = useState(false);
  const [pingResults, setPingResults] = useState<ApiPingResult[]>([]);
  const handleRunPingTest = async () => {
    setIsPinging(true);
    try {
      const res = await pingPublicApis();
      setPingResults(res);
      toast.success("Conectividade dos endpoints testada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao testar conectividade.");
    } finally {
      setIsPinging(false);
    }
  };

  // Testadores Sandbox
  const [sandboxCep, setSandboxCep] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepResult, setCepResult] = useState<ResolvedAddressDTO | null>(null);
  const handleTestCepLookup = async () => {
    if (!sandboxCep.trim()) return;
    setIsSearchingCep(true);
    try {
      const res = await lookupCep({ data: { cep: sandboxCep } });
      setCepResult(res);
      toast.success("CEP consultado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const [sandboxCnpj, setSandboxCnpj] = useState("");
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [cnpjResult, setCnpjResult] = useState<CnpjCompanyDTO | null>(null);
  const handleTestCnpjLookup = async () => {
    if (!sandboxCnpj.trim()) return;
    setIsSearchingCnpj(true);
    try {
      const res = await lookupCnpj({ data: { cnpj: sandboxCnpj } });
      setCnpjResult(res);
      toast.success("CNPJ consultado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar CNPJ.");
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const [sandboxNlp, setSandboxNlp] = useState("");
  const [isParsingNlp, setIsParsingNlp] = useState(false);
  const [nlpResult, setNlpResult] = useState<any>(null);
  const handleTestNlpLookup = async () => {
    if (!sandboxNlp.trim()) return;
    setIsParsingNlp(true);
    try {
      const res = await parseAddressWithAI({ data: { rawText: sandboxNlp } });
      setNlpResult(res);
      toast.success("Endereço decomposto com IA!");
    } catch (err: any) {
      toast.error(err.message || "Erro no processamento de linguagem natural.");
    } finally {
      setIsParsingNlp(false);
    }
  };

 const toggleVisibility = (key: string) => {
 setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
 };

 const handleInputChange = (key: keyof PlatformApiIntegrationsDTO, value: string) => {
 setFormData((prev) => ({ ...prev, [key]: value }));
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);

 try {
 await updatePlatformApiIntegrations({
 data: {
 mapbox_token: formData.mapbox_token,
 stripe_public_key: formData.stripe_public_key,
 stripe_secret_key: formData.stripe_secret_key,
 asaas_api_key: formData.asaas_api_key,
 resend_api_key: formData.resend_api_key,
 sendgrid_api_key: formData.sendgrid_api_key,
 twilio_account_sid: formData.twilio_account_sid,
 twilio_auth_token: formData.twilio_auth_token,
 melhor_envio_token: formData.melhor_envio_token,
 google_maps_api_key: formData.google_maps_api_key,
 openai_api_key: formData.openai_api_key,
 webhook_secret: formData.webhook_secret,
 },
 });

 toast.success("Credenciais e integrações atualizadas com sucesso!");
 await router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar integrações.");
 } finally {
 setIsSubmitting(false);
 }
 };

 // Ações da Pool de Chaves
 const handleSaveKeyToPool = async () => {
 if (!newKeyLabel.trim() || !newKeySecret.trim()) {
 toast.error("Preencha o rótulo e a chave de API.");
 return;
 }

 try {
 const created = await saveApiKeyToPool({
 data: {
 provider: newKeyProvider,
 label: newKeyLabel,
 apiKey: newKeySecret,
 priority: newKeyPriority,
 rateLimitPerMinute: newKeyRateLimit,
 },
 });

 toast.success("Chave adicionada ao pool com sucesso!");
 setIsNewKeyModalOpen(false);
 setNewKeyLabel("");
 setNewKeySecret("");
 setPools((prev) => [created as any, ...prev]);
 router.invalidate();
 } catch (e: any) {
 toast.error(e.message || "Erro ao cadastrar chave no pool.");
 }
 };

 const handleToggleKey = async (id: string, currentStatus: boolean) => {
 try {
 await toggleApiKeyStatus({ data: { id, isActive: !currentStatus } });
 setPools((prev) =>
 prev.map((k) => (k.id === id ? { ...k, is_active: !currentStatus } : k)),
 );
 toast.success(`Chave ${!currentStatus ? "ativada" : "desativada"} na rotação.`);
 } catch (e: any) {
 toast.error(e.message || "Erro ao alternar chave.");
 }
 };

 const handleDeleteKey = async (id: string) => {
 if (!confirm("Deseja remover esta chave da pool?")) return;
    try {
      await deleteApiKeyFromPool({ data: { id } });
      setPools((prev) => prev.filter((k) => k.id !== id));
      toast.success("Chave removida da pool.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir chave.");
    }
  };

  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testedKeyStatus, setTestedKeyStatus] = useState<
    Record<string, { success: boolean; latencyMs?: number; error?: string }>
  >({});

  const handleTestPoolKey = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await testPoolKeyConnection({ data: { id } });
      setTestedKeyStatus((prev) => ({ ...prev, [id]: res }));
      if (res.success) {
        toast.success(`Conexão confirmada com sucesso (${res.latencyMs}ms)!`);
      } else {
        toast.error(`Falha no teste: ${res.error || "Erro de conexão"}`);
      }
    } catch (e: any) {
      setTestedKeyStatus((prev) => ({
        ...prev,
        [id]: { success: false, latencyMs: 0, error: e.message },
      }));
      toast.error(e.message || "Erro ao testar conexão da chave.");
    } finally {
      setTestingKeyId(null);
    }
  };

 // Ações de Prompts Master
 const handleOpenEditPrompt = (prompt?: MasterPromptDTO) => {
 if (prompt) {
 setEditingPrompt(prompt);
 setPromptSlug(prompt.slug);
 setPromptTitle(prompt.title);
 setPromptDescription(prompt.description || "");
 setPromptSystemInstruction(prompt.system_instruction);
 setPromptTemplate(prompt.prompt_template);
 setPromptModel(prompt.target_model);
 setPromptTemperature(prompt.temperature);
 } else {
 setEditingPrompt(null);
 setPromptSlug("");
 setPromptTitle("");
 setPromptDescription("");
 setPromptSystemInstruction("Você é um assistente de catálogo de alto padrão...");
 setPromptTemplate("Analise o conteúdo:\n{{raw_content}}\n\nRetorne JSON...");
 setPromptModel("gemini-1.5-flash");
 setPromptTemperature(0.2);
 }
 setIsPromptModalOpen(true);
 };

 const handleSavePrompt = async () => {
 if (!promptSlug.trim() || !promptTitle.trim() || !promptSystemInstruction.trim()) {
 toast.error("Preencha todos os campos obrigatórios do prompt.");
 return;
 }

 try {
 const saved = await saveMasterPrompt({
 data: {
 id: editingPrompt?.id,
 slug: promptSlug,
 title: promptTitle,
 description: promptDescription,
 systemInstruction: promptSystemInstruction,
 promptTemplate: promptTemplate,
 targetProvider: "gemini",
 targetModel: promptModel,
 temperature: promptTemperature,
 isDefault: editingPrompt ? editingPrompt.is_default : false,
 },
 });

 toast.success("Prompt Master salvo com sucesso!");
 setIsPromptModalOpen(false);
 if (editingPrompt) {
 setPrompts((prev) => prev.map((p) => (p.id === saved.id ? (saved as any) : p)));
 } else {
 setPrompts((prev) => [saved as any, ...prev]);
 }
 router.invalidate();
 } catch (e: any) {
 toast.error(e.message || "Erro ao salvar Prompt Master.");
 }
 };

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Header com indicador de autoridade master */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
 <div>
 <div className="flex items-center gap-2">
 <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
 <Zap className="size-5" />
 </div>
 <h1 className="text-2xl font-black tracking-tight text-foreground">
 Integrações & APIs
 </h1>
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 Gerenciamento central com rotação automática, failover server-side, prompts master e limites anti-abuso.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Badge variant="outline" className="gap-1.5 px-3 py-1 font-mono text-[11px]">
 <ShieldCheck className="size-3.5 text-emerald-500" />
 <span>Vault Seguro Server-Side</span>
 </Badge>
 </div>
 </div>

 {/* Navegação por Abas */}
 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 ">
 <button
 type="button"
 onClick={() => setActiveTab("pools")}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
 activeTab === "pools"
 ? "bg-foreground text-background shadow-xs"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 }`}
 >
 <Layers className="size-4" />
 <span>Pool de Chaves & Rotação</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("prompts")}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
 activeTab === "prompts"
 ? "bg-foreground text-background shadow-xs"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 }`}
 >
 <Terminal className="size-4" />
 <span>Prompts Master (IA)</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("maps")}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
 activeTab === "maps"
 ? "bg-foreground text-background shadow-xs"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 }`}
 >
 <MapPin className="size-4" />
 <span>Mapas & APIs Públicas (OSM)</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("payments")}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
 activeTab === "payments"
 ? "bg-foreground text-background shadow-xs"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 }`}
 >
 <CreditCard className="size-4" />
 <span>Pagamentos (Asaas & Stripe)</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("comms")}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
 activeTab === "comms"
 ? "bg-foreground text-background shadow-xs"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 }`}
 >
 <Mail className="size-4" />
 <span>E-mail & WhatsApp</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("webhooks")}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
 activeTab === "webhooks"
 ? "bg-foreground text-background shadow-xs"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 }`}
 >
 <Radio className="size-4" />
 <span>Webhooks & Segurança</span>
 </button>
 </div>

 {/* ── ABA 1: POOL DE CHAVES & ROTAÇÃO ── */}
 {activeTab === "pools" && (
 <div className="space-y-5">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-base font-bold text-foreground">Pools de Chaves de APIs</h2>
 <p className="text-xs text-muted-foreground">
 Cadastre múltiplas chaves para Firecrawl, Steel.dev, Gemini Flash e Groq com failover automático contra erro 429.
 </p>
 </div>
 <Button
 onClick={() => setIsNewKeyModalOpen(true)}
 className="rounded-xl font-bold text-xs h-9 gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Chave à Pool</span>
 </Button>
 </div>

 {pools.length === 0 ? (
 <div className="p-12 text-center border border-dashed border-border rounded-2xl space-y-3 bg-muted/10">
 <Zap className="size-8 text-muted-foreground mx-auto" />
 <p className="text-sm font-bold text-foreground">Nenhuma chave cadastrada na pool</p>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Adicione suas chaves corporativas para habilitar a importação inteligente de produtos e processamento de IA.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {pools.map((key) => (
 <div
 key={key.id}
 className="p-5 rounded-2xl bg-card border border-border/70 space-y-3 shadow-2xs group"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Badge className="font-mono uppercase text-[10px] font-bold">
 {key.provider}
 </Badge>
 <span className="font-bold text-sm text-foreground">{key.label}</span>
 </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={testingKeyId === key.id}
                  onClick={() => handleTestPoolKey(key.id)}
                  className="h-7 px-2 text-[11px] rounded-lg gap-1 border-border/80"
                >
                  {testingKeyId === key.id ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <Zap className="size-3 text-amber-500" />
                  )}
                  <span>Testar</span>
                </Button>
                <Switch
                  checked={key.is_active}
                  onCheckedChange={() => handleToggleKey(key.id, key.is_active)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteKey(key.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono bg-muted/40 p-2.5 rounded-xl">
              <span className="text-muted-foreground">{key.masked_key}</span>
              <span className="text-[11px] text-foreground font-bold">
                {key.daily_request_count} reqs hoje
              </span>
            </div>

            {testedKeyStatus[key.id] && (
              <div
                className={`text-[11px] p-2 rounded-lg flex items-center justify-between ${
                  testedKeyStatus[key.id].success
                    ? "text-emerald-500 bg-emerald-500/10"
                    : "text-rose-500 bg-rose-500/10"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {testedKeyStatus[key.id].success ? (
                    <CheckCircle2 className="size-3 shrink-0" />
                  ) : (
                    <AlertCircle className="size-3 shrink-0" />
                  )}
                  <span>
                    {testedKeyStatus[key.id].success
                      ? `Conexão ativa (${testedKeyStatus[key.id].latencyMs}ms)`
                      : testedKeyStatus[key.id].error || "Falha na conexão"}
                  </span>
                </div>
              </div>
            )}

            {key.last_error_message && !testedKeyStatus[key.id] && (
              <div className="text-[11px] text-rose-500 bg-rose-500/10 p-2 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="size-3 shrink-0" />
                <span className="truncate">{key.last_error_message}</span>
              </div>
            )}
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* ── ABA 2: PROMPTS MASTER (IA) ── */}
 {activeTab === "prompts" && (
 <div className="space-y-5">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-base font-bold text-foreground">Prompts Master da Plataforma</h2>
 <p className="text-xs text-muted-foreground">
 Governança central dos templates e diretrizes de sistema que orientam a extração e refinamento de dados.
 </p>
 </div>
 <Button
 onClick={() => handleOpenEditPrompt()}
 className="rounded-xl font-bold text-xs h-9 gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>Novo Prompt Master</span>
 </Button>
 </div>

 <div className="grid grid-cols-1 gap-4">
 {prompts.map((prompt) => (
 <div
 key={prompt.id}
 className="p-5 rounded-2xl bg-card border border-border/70 space-y-3 shadow-2xs"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="font-bold text-base text-foreground">{prompt.title}</span>
 {prompt.is_default && (
 <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">
 Padrão da Plataforma
 </Badge>
 )}
 </div>
 <Button
 variant="outline"
 size="sm"
 className="rounded-xl font-bold text-xs h-8"
 onClick={() => handleOpenEditPrompt(prompt)}
 >
 Editar Prompt
 </Button>
 </div>

 <p className="text-xs text-muted-foreground leading-relaxed">
 {prompt.description || "Sem descrição"}
 </p>

 <div className="p-3 bg-muted/40 rounded-2xl font-mono text-[11px] space-y-1 text-muted-foreground">
 <div className="font-bold text-foreground">Instrução de Sistema:</div>
 <div className="line-clamp-2">{prompt.system_instruction}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ── ABA 3: MAPAS (OSM vs GOOGLE) ── */}
 {activeTab === "maps" && (
        <div className="space-y-6">
          {/* Header & Status Canônico */}
          <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Mapas Reais (OpenStreetMap / MapLibre) & APIs Públicas Zero-Cost
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-bold text-[11px]">
                    <CheckCircle2 className="size-3" /> MapLibre Ativo (Zero Key)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  A Waesy utiliza cartografia real OpenStreetMap com renderização em Retina 2x via CARTO Voyager e Dark Matter.
                  Nenhuma chave paga é obrigatória. Suporte a autopreenchimento de endereços via BrasilAPI v2, ViaCEP, consulta oficial de CNPJ e inteligência geográfica.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground gap-1">
                  <Globe2 className="size-3 text-primary" /> Tiles Globais HTTPS
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground gap-1">
                  <ShieldCheck className="size-3 text-emerald-500" /> RLS Protegido
                </Badge>
              </div>
            </div>

            {/* Seleção do Estilo Visual Canônico */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground block">
                Tema / Camada de Mapa Padrão
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "osm_standard",
                    name: "OpenStreetMap Standard (Recomendado)",
                    desc: "Camada oficial OpenStreetMap 100% aberta, livre de marcas d'água e sem restrição de chaves.",
                    badge: "100% Livre & Oficial",
                  },
                  {
                    id: "carto_voyager",
                    name: "CARTO Voyager (Retina 2x)",
                    desc: "Estilo claro de alto contraste. Requer chave comercial para omitir marca d'água.",
                    badge: "Estilo Alternativo",
                  },
                  {
                    id: "carto_dark",
                    name: "CARTO Dark Matter (Retina 2x)",
                    desc: "Estilo escuro moderno para visualização noturna. Requer chave comercial.",
                    badge: "Estilo Alternativo",
                  },
                ].map((style) => {
                  const isSelected = govSettings.defaultMapProvider === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() =>
                        setGovSettings((prev) => ({
                          ...prev,
                          defaultMapProvider: style.id as any,
                        }))
                      }
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer select-none space-y-1.5 ${
                        isSelected
                          ? "bg-primary/5 border-primary ring-1 ring-primary shadow-2xs"
                          : "bg-muted/20 border-border/70 hover:border-foreground/30 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground leading-tight">
                          {style.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {style.badge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {style.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chaves Opcionais de Terceiros */}
            <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="google_maps_api_key" className="text-xs font-bold text-foreground">
                  Chave Google Maps API (Opcional)
                </Label>
                <div className="relative">
                  <Input
                    id="google_maps_api_key"
                    type={visibleKeys["google_maps"] ? "text" : "password"}
                    value={formData.google_maps_api_key || ""}
                    onChange={(e) => handleInputChange("google_maps_api_key", e.target.value)}
                    placeholder="AIzaSy..."
                    className="h-10 text-xs font-mono pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("google_maps")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visibleKeys["google_maps"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Se preenchida, permite ativar serviços proprietários da Google como fallback secundário.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mapbox_token" className="text-xs font-bold text-foreground">
                  Token Mapbox GL (Opcional)
                </Label>
                <div className="relative">
                  <Input
                    id="mapbox_token"
                    type={visibleKeys["mapbox"] ? "text" : "password"}
                    value={formData.mapbox_token || ""}
                    onChange={(e) => handleInputChange("mapbox_token", e.target.value)}
                    placeholder="pk.eyJ1..."
                    className="h-10 text-xs font-mono pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("mapbox")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visibleKeys["mapbox"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Opcional. Permite usar estilos vetoriais customizados do Mapbox Studio.
                </span>
              </div>
            </div>
          </div>

          {/* ── SEÇÃO 2: MATRIZ DE GOVERNANÇA (TOGGLES LIGA/DESLIGA) ── */}
          <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Governança & Controle de Autopreenchimento
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ative ou desative cada integração individualmente de acordo com a política da sua rede.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleSaveGov}
                disabled={isSavingGov}
                className="rounded-xl font-bold text-xs h-9 gap-1.5"
              >
                {isSavingGov ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span>Salvar Governança</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  id: "isMapServiceActive",
                  title: "Serviço de Mapas Ativo (Global)",
                  desc: "Renderiza mapas interativos reais em mobilidade, vitrines e onboarding.",
                  checked: govSettings.isMapServiceActive,
                  onChange: (checked: boolean) =>
                    setGovSettings((prev) => ({ ...prev, isMapServiceActive: checked })),
                },
                {
                  id: "isCepAutoFillActive",
                  title: "Autopreenchimento de Endereço por CEP",
                  desc: "Consulta BrasilAPI v2 com coordenadas geográficas e fallback para ViaCEP.",
                  checked: govSettings.isCepAutoFillActive,
                  onChange: (checked: boolean) =>
                    setGovSettings((prev) => ({ ...prev, isCepAutoFillActive: checked })),
                },
                {
                  id: "isCnpjLookupActive",
                  title: "Consulta Oficial de CNPJ (Receita Federal)",
                  desc: "Busca em tempo real de Razão Social, Nome Fantasia, CNAE e Endereço da empresa.",
                  checked: govSettings.isCnpjLookupActive,
                  onChange: (checked: boolean) =>
                    setGovSettings((prev) => ({ ...prev, isCnpjLookupActive: checked })),
                },
                {
                  id: "isCpfValidationActive",
                  title: "Validação Rigorosa de CPF (Módulo 11)",
                  desc: "Verificação algorítmica matemática oficial contra dígitos incorretos e fraudes.",
                  checked: govSettings.isCpfValidationActive,
                  onChange: (checked: boolean) =>
                    setGovSettings((prev) => ({ ...prev, isCpfValidationActive: checked })),
                },
                {
                  id: "isBirthDateValidationActive",
                  title: "Validação de Maioridade (18+ Anos)",
                  desc: "Checagem de idade mínima para cadastro de motoristas, entregadores e lojas.",
                  checked: govSettings.isBirthDateValidationActive,
                  onChange: (checked: boolean) =>
                    setGovSettings((prev) => ({ ...prev, isBirthDateValidationActive: checked })),
                },
                {
                  id: "isAiAddressParserActive",
                  title: "Autopreenchimento Inteligente com IA / NLP",
                  desc: "Permite colar endereços livres e decompõe com precisão cirúrgica no mapa.",
                  checked: govSettings.isAiAddressParserActive,
                  onChange: (checked: boolean) =>
                    setGovSettings((prev) => ({ ...prev, isAiAddressParserActive: checked })),
                },
                {
                  id: "isSimLabsClassifiedTelemetryActive",
                  title: "Telemetria & SimLabs na Vitrine de Anúncios",
                  desc: "Exibe score de atratividade comercial, viabilidade, payback e auditoria cadastral de CNPJ nos anúncios de negócios e pontos comerciais. (Desativado por padrão)",
                  checked: govSettings.isSimLabsClassifiedTelemetryActive ?? false,
                  onChange: (checked: boolean) =>
                    setGovSettings((prev) => ({
                      ...prev,
                      isSimLabsClassifiedTelemetryActive: checked,
                    })),
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-muted/20 border border-border/70 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs font-bold text-foreground block">
                      {item.title}
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <Switch checked={item.checked} onCheckedChange={item.onChange} className="shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* ── SEÇÃO 3: MONITOR DE LATÊNCIA & PING TEST EM TEMPO REAL ── */}
          <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Monitor de Latência em Tempo Real (Ping Test)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mede a disponibilidade e o tempo de resposta das APIs públicas em milissegundos.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleRunPingTest}
                disabled={isPinging}
                className="rounded-xl font-bold text-xs h-9 gap-1.5 shrink-0"
              >
                <RefreshCw className={`size-3.5 ${isPinging ? "animate-spin" : ""}`} />
                <span>{isPinging ? "Testando Endpoints..." : "Testar Conectividade Agora"}</span>
              </Button>
            </div>

            {pingResults.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-xl bg-muted/10 space-y-2">
                <Clock className="size-6 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-foreground">Nenhum teste executado nesta sessão</p>
                <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                  Clique no botão acima para enviar requisições de teste em paralelo para a BrasilAPI, ViaCEP, Carto CDN e Nominatim.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {pingResults.map((ping: any) => (
                  <div
                    key={ping.id}
                    className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground truncate pr-2">
                        {ping.name}
                      </span>
                      <Badge
                        className={`text-[10px] font-mono uppercase font-bold ${
                          ping.status === "online"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : ping.status === "degraded"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {ping.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1 border-t border-border/40">
                      <span>HTTP {ping.httpStatus}</span>
                      <span className="font-bold text-foreground">{ping.latencyMs} ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── SEÇÃO 4: SANDBOX & LABORATÓRIO INTERATIVO AO VIVO ── */}
          <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-6 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                Laboratório de Teste Interativo (Live Sandbox)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simule consultas ao vivo de CEP, CNPJ e decomposição inteligente de endereço com retorno em tempo real.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Testador 1: CEP com visualização no mapa */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    Teste de Autopreenchimento de CEP
                  </span>
                  {cepResult && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {cepResult.provider}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={sandboxCep}
                    onChange={(e) => setSandboxCep(e.target.value)}
                    placeholder="89800000"
                    maxLength={9}
                    className="h-9 text-xs font-mono bg-card rounded-xl"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTestCepLookup}
                    disabled={isSearchingCep}
                    className="h-9 rounded-xl font-bold text-xs shrink-0"
                  >
                    {isSearchingCep ? <RefreshCw className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                    <span>Consultar</span>
                  </Button>
                </div>

                {cepResult && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-card rounded-xl border border-border/70 text-xs space-y-1 font-mono">
                      <div className="font-bold text-foreground">{cepResult.street || "(Logradouro Geral)"}</div>
                      <div className="text-muted-foreground">
                        {cepResult.neighborhood && `${cepResult.neighborhood}, `}
                        {cepResult.city} - {cepResult.state}
                      </div>
                      {cepResult.latitude && cepResult.longitude && (
                        <div className="text-primary text-[11px] pt-1">
                          📍 Coordenadas: {cepResult.latitude}, {cepResult.longitude}
                        </div>
                      )}
                    </div>

                    {cepResult.latitude && cepResult.longitude && (
                      <div className="h-[180px] w-full rounded-xl overflow-hidden border border-border/70">
                        <MapLibreCanvas
                          provider={govSettings.defaultMapProvider}
                          center={{ lat: cepResult.latitude, lng: cepResult.longitude }}
                          zoom={15}
                          markers={[
                            {
                              id: "cep-marker",
                              lat: cepResult.latitude,
                              lng: cepResult.longitude,
                              title: cepResult.fullAddress,
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Testador 2: CNPJ Oficial da Receita */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    Teste de Consulta Oficial de CNPJ
                  </span>
                  {cnpjResult && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                      {cnpjResult.registrationStatus}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={sandboxCnpj}
                    onChange={(e) => setSandboxCnpj(e.target.value)}
                    placeholder="00000000000191"
                    maxLength={18}
                    className="h-9 text-xs font-mono bg-card rounded-xl"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTestCnpjLookup}
                    disabled={isSearchingCnpj}
                    className="h-9 rounded-xl font-bold text-xs shrink-0"
                  >
                    {isSearchingCnpj ? <RefreshCw className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                    <span>Consultar</span>
                  </Button>
                </div>

                {cnpjResult && (
                  <div className="p-3 bg-card rounded-xl border border-border/70 text-xs space-y-1.5 font-mono">
                    <div className="font-bold text-foreground">{cnpjResult.corporateName}</div>
                    {cnpjResult.tradeName && cnpjResult.tradeName !== cnpjResult.corporateName && (
                      <div className="text-[11px] text-muted-foreground">Fantasia: {cnpjResult.tradeName}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground">
                      CNAE: {cnpjResult.mainCnae.code} — {cnpjResult.mainCnae.description}
                    </div>
                    <div className="text-[11px] text-foreground pt-1 border-t border-border/40">
                      🏢 {cnpjResult.address.street}, {cnpjResult.address.number} - {cnpjResult.address.neighborhood}, {cnpjResult.address.city} - {cnpjResult.address.state}
                    </div>
                    {cnpjResult.phone && <div className="text-[10px] text-muted-foreground">📞 {cnpjResult.phone}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Testador 3: Parser de Endereço Livre com IA / NLP */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/70 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" />
                Teste de Parser de Endereço Inteligente (Colar Texto Livre)
              </span>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={sandboxNlp}
                  onChange={(e) => setSandboxNlp(e.target.value)}
                  placeholder="Cole um endereço completo..."
                  className="h-9 text-xs bg-card rounded-xl flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleTestNlpLookup}
                  disabled={isParsingNlp}
                  className="h-9 rounded-xl font-bold text-xs shrink-0"
                >
                  {isParsingNlp ? <RefreshCw className="size-3.5 animate-spin" /> : <Cpu className="size-3.5" />}
                  <span>Decompor com Precisão</span>
                </Button>
              </div>

              {nlpResult && (
                <div className="p-3 bg-card rounded-xl border border-border/70 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Rua:</span>
                    <span className="font-bold text-foreground truncate block">{nlpResult.street || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Número:</span>
                    <span className="font-bold text-foreground truncate block">{nlpResult.number || "S/N"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Cidade / UF:</span>
                    <span className="font-bold text-foreground truncate block">{nlpResult.city} - {nlpResult.state}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">CEP:</span>
                    <span className="font-bold text-foreground truncate block">{nlpResult.cep ? formatCep(nlpResult.cep) : "-"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ABA 4: PAGAMENTOS (ASAAS, STRIPE, ABACATEPAY, MERCADO PAGO) ── */}
 {activeTab === "payments" && (
 <form onSubmit={handleSave} className="space-y-6">
 <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-foreground">Gateways de Pagamento (PIX & Cartão)</h3>
 <p className="text-xs text-muted-foreground mt-0.5">
   Configure as credenciais de liquidação central dos gateways de pagamento. Taxas da plataforma sempre usam as chaves Master.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label htmlFor="asaas_api_key" className="text-xs font-bold">Asaas API Key (PIX Nacional)</Label>
 <Input
 id="asaas_api_key"
 type={visibleKeys["asaas"] ? "text" : "password"}
 value={formData.asaas_api_key || ""}
 onChange={(e) => handleInputChange("asaas_api_key", e.target.value)}
 placeholder="$aact_..."
 className="h-10 text-xs font-mono rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="stripe_secret_key" className="text-xs font-bold">Stripe Secret Key</Label>
 <Input
 id="stripe_secret_key"
 type={visibleKeys["stripe"] ? "text" : "password"}
 value={formData.stripe_secret_key || ""}
 onChange={(e) => handleInputChange("stripe_secret_key", e.target.value)}
 placeholder="sk_live_..."
 className="h-10 text-xs font-mono rounded-xl"
 />
 </div>

 {/* AbacatePay */}
 <div className="space-y-1.5">
   <div className="flex items-center justify-between">
     <Label htmlFor="abacatepay_api_key" className="text-xs font-bold flex items-center gap-1.5">
       <span>AbacatePay API Key</span>
       <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-green-500/40 text-green-700 dark:text-green-400 bg-green-500/10 px-1.5">PIX</Badge>
     </Label>
     {formData.abacatepay_api_key ? (
       <Badge variant="outline" className="text-[9px] font-bold border-green-500/40 text-green-600 bg-green-500/10">✓ Ativo</Badge>
     ) : (
       <Badge variant="outline" className="text-[9px] font-bold border-muted-foreground/30 text-muted-foreground">Não Configurado</Badge>
     )}
   </div>
   <div className="relative">
     <Input
       id="abacatepay_api_key"
       type={visibleKeys["abacatepay"] ? "text" : "password"}
       value={formData.abacatepay_api_key || ""}
       onChange={(e) => handleInputChange("abacatepay_api_key", e.target.value)}
       placeholder="sk_live_abct_..."
       className="h-10 text-xs font-mono rounded-xl pr-10"
     />
     <button
       type="button"
       onClick={() => setVisibleKeys(v => ({ ...v, abacatepay: !v.abacatepay }))}
       className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
     >
       {visibleKeys["abacatepay"] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
     </button>
   </div>
   <p className="text-[11px] text-muted-foreground">Gere sua chave em <span className="font-mono">app.abacatepay.com</span> → Integrações → API Keys.</p>
 </div>

 {/* Mercado Pago */}
 <div className="space-y-1.5">
   <div className="flex items-center justify-between">
     <Label htmlFor="mercadopago_access_token" className="text-xs font-bold flex items-center gap-1.5">
       <span>Mercado Pago Access Token</span>
       <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5">PIX+Cartão</Badge>
     </Label>
     {formData.mercadopago_access_token ? (
       <Badge variant="outline" className="text-[9px] font-bold border-green-500/40 text-green-600 bg-green-500/10">✓ Ativo</Badge>
     ) : (
       <Badge variant="outline" className="text-[9px] font-bold border-muted-foreground/30 text-muted-foreground">Não Configurado</Badge>
     )}
   </div>
   <div className="relative">
     <Input
       id="mercadopago_access_token"
       type={visibleKeys["mercadopago"] ? "text" : "password"}
       value={formData.mercadopago_access_token || ""}
       onChange={(e) => handleInputChange("mercadopago_access_token", e.target.value)}
       placeholder="APP_USR-..."
       className="h-10 text-xs font-mono rounded-xl pr-10"
     />
     <button
       type="button"
       onClick={() => setVisibleKeys(v => ({ ...v, mercadopago: !v.mercadopago }))}
       className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
     >
       {visibleKeys["mercadopago"] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
     </button>
   </div>
   <p className="text-[11px] text-muted-foreground">Access token de produção em <span className="font-mono">mercadopago.com.br</span> → Suas integrações → Credenciais.</p>
 </div>
 </div>

 <div className="flex justify-end pt-4">
 <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold text-xs h-9 gap-1.5">
 <Save className="size-3.5" />
 <span>Salvar Gateways de Pagamento</span>
 </Button>
 </div>
 </div>
 </form>
 )}


 {/* ── ABA 5: E-MAIL & WHATSAPP ── */}
 {activeTab === "comms" && (
 <form onSubmit={handleSave} className="space-y-6">
 <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-foreground">Comunicação & Mensageria</h3>
 <p className="text-xs text-muted-foreground mt-0.5">
 Envio transacional de comprovantes e alertas por E-mail (Resend) e WhatsApp.
 </p>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="resend_api_key" className="text-xs font-bold">Resend API Key (E-mail Transacional)</Label>
 <Input
 id="resend_api_key"
 type={visibleKeys["resend"] ? "text" : "password"}
 value={formData.resend_api_key || ""}
 onChange={(e) => handleInputChange("resend_api_key", e.target.value)}
 placeholder="re_..."
 className="h-10 text-xs font-mono rounded-xl"
 />
 </div>

 <div className="flex justify-end pt-4">
 <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold text-xs h-9 gap-1.5">
 <Save className="size-3.5" />
 <span>Salvar Mensageria</span>
 </Button>
 </div>
 </div>
 </form>
 )}

 {/* ── ABA 6: WEBHOOKS ── */}
 {activeTab === "webhooks" && (
 <form onSubmit={handleSave} className="space-y-6">
 <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-foreground">Segurança de Webhooks (HMAC SHA-256)</h3>
 <p className="text-xs text-muted-foreground mt-0.5">
 Segredo criptográfico compartilhado para validação de webhooks de pagamento e entregas.
 </p>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="webhook_secret" className="text-xs font-bold">Webhook Secret</Label>
 <Input
 id="webhook_secret"
 type={visibleKeys["webhook"] ? "text" : "password"}
 value={formData.webhook_secret || ""}
 onChange={(e) => handleInputChange("webhook_secret", e.target.value)}
 placeholder="whsec_..."
 className="h-10 text-xs font-mono rounded-xl"
 />
 </div>

 <div className="flex justify-end pt-4">
 <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold text-xs h-9 gap-1.5">
 <Save className="size-3.5" />
 <span>Salvar Segredo de Webhook</span>
 </Button>
 </div>
 </div>
 </form>
 )}

 {/* Modal: Adicionar Chave à Pool */}
 <Dialog open={isNewKeyModalOpen} onOpenChange={setIsNewKeyModalOpen}>
 <DialogContent className="sm:max-w-md sm:rounded-2xl">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold">Adicionar Chave à Pool</DialogTitle>
 <DialogDescription className="text-xs">
 A chave será criptografada e armazenada de forma segura no servidor.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Provedor do Serviço</Label>
 <Select value={newKeyProvider} onValueChange={(v: any) => setNewKeyProvider(v)}>
 <SelectTrigger className="h-10 text-xs rounded-xl">
 <SelectValue placeholder="Selecione o provedor" />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="openrouter">OpenRouter (Multi-Modelo: Llama 3.3, Claude, DeepSeek)</SelectItem>
 <SelectItem value="groq">Groq LPU (Inferência Ultra-rápida Llama 3.3)</SelectItem>
 <SelectItem value="gemini">Google Gemini (Flash & Pro)</SelectItem>
 <SelectItem value="openai">OpenAI (GPT-4o & Embeddings)</SelectItem>
 <SelectItem value="anthropic">Anthropic Claude (Sonnet & Opus)</SelectItem>
 <SelectItem value="firecrawl">Firecrawl (Web Scraping & Markdown)</SelectItem>
 <SelectItem value="steel">Steel.dev (Browser Automation Headless)</SelectItem>
 <SelectItem value="google_maps">Google Maps API</SelectItem>
 <SelectItem value="resend">Resend (E-mail Transacional)</SelectItem>
 <SelectItem value="asaas">Asaas Pagamentos (PIX & Boletos)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Rótulo / Identificação</Label>
 <Input
 value={newKeyLabel}
 onChange={(e) => setNewKeyLabel(e.target.value)}
 placeholder="Ex: Firecrawl Chave 01 (Plano Pro)"
 className="h-10 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Chave Secreta de API (Secret Key)</Label>
 <Input
 type="password"
 value={newKeySecret}
 onChange={(e) => setNewKeySecret(e.target.value)}
 placeholder="sk_... ou AIza..."
 className="h-10 text-xs font-mono rounded-xl"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Prioridade (1 = Alta)</Label>
 <Input
 type="number"
 min={1}
 max={10}
 value={newKeyPriority}
 onChange={(e) => setNewKeyPriority(Number(e.target.value))}
 className="h-10 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Limite / Minuto</Label>
 <Input
 type="number"
 min={1}
 value={newKeyRateLimit}
 onChange={(e) => setNewKeyRateLimit(Number(e.target.value))}
 className="h-10 text-xs rounded-xl"
 />
 </div>
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setIsNewKeyModalOpen(false)} className="rounded-xl text-xs">
 Cancelar
 </Button>
 <Button onClick={handleSaveKeyToPool} className="rounded-xl font-bold text-xs">
 Salvar Chave no Pool
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Modal: Editar Prompt Master */}
 <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
 <DialogContent className="sm:max-w-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold">
 {editingPrompt ? "Editar Prompt Master" : "Novo Prompt Master de IA"}
 </DialogTitle>
 <DialogDescription className="text-xs">
 Defina as instruções de sistema e o template de extração de dados.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Slug Identificador</Label>
 <Input
 value={promptSlug}
 onChange={(e) => setPromptSlug(e.target.value)}
 placeholder="product_importer_custom"
 className="h-9 text-xs font-mono rounded-xl"
 disabled={editingPrompt?.is_default}
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Título do Prompt</Label>
 <Input
 value={promptTitle}
 onChange={(e) => setPromptTitle(e.target.value)}
 placeholder="Importador Gastronômico"
 className="h-9 text-xs rounded-xl font-bold"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Descrição</Label>
 <Input
 value={promptDescription}
 onChange={(e) => setPromptDescription(e.target.value)}
 placeholder="Explique o propósito deste prompt..."
 className="h-9 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Instruções de Sistema (System Prompt)</Label>
 <Textarea
 value={promptSystemInstruction}
 onChange={(e) => setPromptSystemInstruction(e.target.value)}
 placeholder="Você é um assistente sênior..."
 className="text-xs h-24 rounded-xl leading-relaxed"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Template com Variáveis ({`{{raw_content}}`})</Label>
 <Textarea
 value={promptTemplate}
 onChange={(e) => setPromptTemplate(e.target.value)}
 placeholder="Analise o conteúdo abaixo: {{raw_content}}..."
 className="text-xs font-mono h-32 rounded-xl leading-relaxed"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Modelo LLM</Label>
 <Input
 value={promptModel}
 onChange={(e) => setPromptModel(e.target.value)}
 placeholder="gemini-1.5-flash ou llama-3.1-70b"
 className="h-9 text-xs font-mono rounded-xl"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Temperatura (Criatividade: 0.0 - 1.0)</Label>
 <Input
 type="number"
 step="0.1"
 min={0}
 max={1}
 value={promptTemperature}
 onChange={(e) => setPromptTemperature(Number(e.target.value))}
 className="h-9 text-xs rounded-xl font-mono"
 />
 </div>
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setIsPromptModalOpen(false)} className="rounded-xl text-xs">
 Cancelar
 </Button>
 <Button onClick={handleSavePrompt} className="rounded-xl font-bold text-xs">
 Salvar Prompt Master
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
