import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Save,
  CheckCircle2,
  Trash2,
  Key,
  BarChart,
  Calendar,
  MessageCircle,
  MapPin,
  Layers,
  ShieldCheck,
  Sparkles,
  Store,
  FileText,
  Truck,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Check,
  Zap,
  CreditCard,
  Globe2,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import {
  listIntegrationSettings,
  saveIntegrationCredential,
  deleteIntegrationCredential,
  testWhatsAppCloudConnection,
  testMelhorEnvioConnection,
  testErpConnection,
  testPaymentGatewayConnection,
} from "@/services/integrations.functions";
import {
  saveSecretKey,
  deleteSecretKey,
  listConfiguredSecrets,
  testSecretKeyConnection,
} from "@/services/secret-vault.functions";
import {
  listMarketplaceConnectors,
  type MarketplaceConnectorDTO,
} from "@/services/marketplace-hub.functions";
import {
  getGmbStatus,
  connectGmb,
  syncGmbStoreProfile,
  type GmbLocationDTO,
} from "@/services/gmb.functions";

export const Route = createFileRoute("/workspace/configuracoes/integracoes")({
  head: () => ({ meta: [{ title: "Central de Integrações & APIs | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [integrations, secrets, marketplaceConnectors, gmbStatus] = await Promise.all([
        listIntegrationSettings().catch(() => []),
        listConfiguredSecrets().catch(() => []),
        listMarketplaceConnectors().catch(() => []),
        getGmbStatus().catch(() => null),
      ]);
      return {
        integrations: integrations || [],
        secrets: secrets || [],
        marketplaceConnectors: marketplaceConnectors || [],
        gmbStatus: gmbStatus || null,
      };
    } catch (err) {
      console.error("[loader:workspace.configuracoes.integracoes] Erro no loader:", err);
      return { integrations: [], secrets: [], marketplaceConnectors: [], gmbStatus: null };
    }
  },
  component: UnifiedIntegrationsHubPage,
});

// ============================================================
// COMPONENTE: CARD DE INTEGRAÇÃO COM TESTE ATIVO DE CONEXÃO
// ============================================================

interface IntegrationCardProps {
  provider: string;
  title: string;
  description: string;
  icon: any;
  fields: Array<{
    key: string;
    label: string;
    type?: string;
    placeholder?: string;
  }>;
  existingSetting?: any;
  onSave: (provider: string, formData: Record<string, string>, isActive: boolean) => Promise<void>;
  onDelete?: (provider: string) => Promise<void>;
  onTestConnection?: (formData: Record<string, string>) => Promise<{ success: boolean; message: string; details?: any }>;
}

function IntegrationCard({
  provider,
  title,
  description,
  icon: Icon,
  fields,
  existingSetting,
  onSave,
  onDelete,
  onTestConnection,
}: IntegrationCardProps) {
  const [isActive, setIsActive] = useState(existingSetting?.is_active ?? false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(provider, formData, isActive);
      toast.success(`${title} configurado com sucesso!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar credenciais.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTest = async () => {
    if (!onTestConnection) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(formData);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err?.message || "Erro inesperado ao testar conexão.";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="bg-card rounded-2xl border border-border/70 shadow-none flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                <Icon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {title}
                  {existingSetting?.is_active ? (
                    <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Não Configurado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={(checked) => setIsActive(checked)} />
          </div>
        </CardHeader>

        {isActive && (
          <form onSubmit={handleSave}>
            <CardContent className="space-y-4 pt-2">
              {existingSetting?.is_active && (
                <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2 border border-emerald-500/20">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <span>Esta integração está ativa e protegida. Preencha os campos abaixo apenas para atualizar.</span>
                </div>
              )}

              {testResult && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    testResult.success
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`${provider}-${field.key}`} className="text-xs font-semibold">
                    {field.label}
                  </Label>
                  <Input
                    id={`${provider}-${field.key}`}
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    required={!existingSetting?.is_active}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="rounded-xl border-border/70 text-xs h-9"
                  />
                </div>
              ))}
            </CardContent>

            <CardFooter className="flex items-center justify-between pt-3 pb-3 border-t border-border/50 gap-2">
              <div>
                {existingSetting && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(provider)}
                    className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 className="size-3.5 mr-1.5" />
                    Remover
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onTestConnection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRunTest}
                    disabled={isTesting}
                    className="h-8 px-3 text-xs rounded-xl font-medium cursor-pointer"
                  >
                    <RefreshCw className={`size-3.5 mr-1.5 ${isTesting ? "animate-spin" : ""}`} />
                    {isTesting ? "Testando..." : "Testar Conexão"}
                  </Button>
                )}

                <Button type="submit" size="sm" disabled={isSaving} className="h-8 px-3 text-xs rounded-xl font-bold cursor-pointer">
                  <Save className="size-3.5 mr-1.5" />
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardFooter>
          </form>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// COMPONENTE: CARD DO COFRE DE IA (BYOK / SECRET VAULT)
// ============================================================

interface SecretVaultCardProps {
  provider: "gemini" | "openai" | "groq" | "openrouter" | "anthropic" | "firecrawl" | "steel";
  title: string;
  description: string;
  icon: any;
  modelsLabel: string;
  existingSecret?: any;
  onSave: (provider: string, secretKey: string) => Promise<void>;
  onTestConnection?: (provider: string, secretKey: string) => Promise<{ success: boolean; message: string }>;
  onDelete?: (id: string) => Promise<void>;
}

function SecretVaultCard({
  provider,
  title,
  description,
  icon: Icon,
  modelsLabel,
  existingSecret,
  onSave,
  onTestConnection,
  onDelete,
}: SecretVaultCardProps) {
  const [isActive, setIsActive] = useState(!!existingSecret);
  const [secretKey, setSecretKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      toast.error("Insira a chave da API.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(provider, secretKey);
      setSecretKey("");
      setIsActive(true);
      setTestResult(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTest = async () => {
    if (!onTestConnection) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(provider, secretKey);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err?.message || "Erro inesperado ao testar conexão.";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="bg-card rounded-2xl border border-border/70 shadow-none flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                <Icon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {title}
                  {existingSecret ? (
                    <Badge variant="default" className="text-[10px] bg-primary hover:bg-primary">
                      BYOK Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Pool Plataforma
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={(checked) => setIsActive(checked)} />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/50 flex items-center justify-between">
            <span>Recursos / Modelos:</span>
            <span className="font-semibold text-foreground">{modelsLabel}</span>
          </div>

          {existingSecret && (
            <div className="bg-primary/10 text-primary p-2.5 rounded-xl text-xs flex items-center justify-between border border-primary/20">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span className="font-medium">Chave Pessoal Salva:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{existingSecret.masked_suffix}</span>
                {onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(existingSecret.id)}
                    className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                    title="Remover chave e voltar ao pool da plataforma"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {testResult && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                testResult.success
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-destructive" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {isActive && (
            <form onSubmit={handleSave} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor={`${provider}-key`} className="text-xs font-semibold">
                  {existingSecret ? "Sobrescrever Chave da API" : "Chave da API (API Key)"}
                </Label>
                <Input
                  id={`${provider}-key`}
                  type="password"
                  placeholder={
                    provider === "gemini"
                      ? "AIzaSy..."
                      : provider === "firecrawl"
                      ? "fc-..."
                      : provider === "steel"
                      ? "steel-..."
                      : "sk-..."
                  }
                  required={!existingSecret}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="rounded-xl border-border/70 text-xs h-9 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Sua chave é encriptada no Secret Vault. Prioridade máxima em carrosséis, contratos e mineração.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {onTestConnection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRunTest}
                    disabled={isTesting || (!secretKey.trim() && !existingSecret)}
                    className="h-8 px-3 text-xs rounded-xl font-medium cursor-pointer"
                  >
                    <RefreshCw className={`size-3.5 mr-1.5 ${isTesting ? "animate-spin" : ""}`} />
                    {isTesting ? "Testando..." : "Testar Conexão"}
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={isSaving} className="h-8 px-3 text-xs rounded-xl font-bold cursor-pointer">
                  <Save className="size-3.5 mr-1.5" />
                  {isSaving ? "Salvando..." : "Salvar no Cofre"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

// ============================================================
// PÁGINA CENTRAL DE INTEGRAÇÕES UNIFICADA
// ============================================================

function UnifiedIntegrationsHubPage() {
  const {
    integrations: settings = [],
    secrets = [],
    marketplaceConnectors = [],
    gmbStatus = null,
  } = (Route.useLoaderData?.() as any) || {};

  const router = useRouter();

  const [gmb, setGmb] = useState<GmbLocationDTO | null>(gmbStatus);
  const [isSyncingGmb, setIsSyncingGmb] = useState(false);
  const [gmbLocationIdInput, setGmbLocationIdInput] = useState(gmbStatus?.locationId || "");
  const [gmbLocationNameInput, setGmbLocationNameInput] = useState(gmbStatus?.locationName || "");

  const handleSyncGmb = async () => {
    setIsSyncingGmb(true);
    try {
      const res = await syncGmbStoreProfile();
      toast.success(res.message || "Dados do Google Meu Negócio sincronizados com sucesso!");
      const updated = await getGmbStatus();
      setGmb(updated);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao sincronizar com Google Meu Negócio.");
    } finally {
      setIsSyncingGmb(false);
    }
  };

  const handleConnectGmb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmbLocationIdInput.trim() || !gmbLocationNameInput.trim()) {
      toast.error("Informe o ID e o Nome da Empresa no Google.");
      return;
    }
    setIsSyncingGmb(true);
    try {
      const res = await connectGmb({
        data: {
          locationId: gmbLocationIdInput.trim(),
          locationName: gmbLocationNameInput.trim(),
        },
      });
      toast.success(res.message);
      const updated = await getGmbStatus();
      setGmb(updated);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar Google Meu Negócio.");
    } finally {
      setIsSyncingGmb(false);
    }
  };

  // Handlers para Secret Vault (IA BYOK)
  const handleSaveSecret = async (provider: string, secretKey: string) => {
    try {
      await saveSecretKey({
        data: {
          provider: provider as any,
          label: `Chave ${provider.toUpperCase()} Pessoal`,
          secretKey,
          scope: "personal",
          dailyBudgetCents: 10000,
        },
      });
      toast.success(`Chave ${provider.toUpperCase()} salva com segurança no Cofre!`);
      router.invalidate();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar credencial no cofre.");
    }
  };

  const handleTestSecret = async (provider: string, secretKey: string) => {
    return await testSecretKeyConnection({
      data: {
        provider: provider as any,
        secretKey: secretKey || undefined,
      },
    });
  };

  const handleDeleteSecret = async (id: string) => {
    try {
      await deleteSecretKey({ data: { id } });
      toast.success("Chave removida do cofre com sucesso!");
      router.invalidate();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover chave do cofre.");
    }
  };

  // Handlers para Credenciais de Integração
  const handleSaveIntegration = async (
    provider: string,
    tokenPayload: Record<string, string>,
    isActive: boolean,
  ) => {
    const cleanPayload = Object.fromEntries(
      Object.entries(tokenPayload).filter(([_, v]) => v && v.trim() !== ""),
    );
    await saveIntegrationCredential({ data: { provider, tokenPayload: cleanPayload, isActive } });
    router.invalidate();
  };

  const handleDeleteIntegration = async (provider: string) => {
    try {
      await deleteIntegrationCredential({ data: { provider } });
      toast.success("Integração removida com sucesso.");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover integração.");
    }
  };

  // Handlers de Teste Ativo de Conexão
  const handleTestWhatsApp = async (data: Record<string, string>) => {
    const phoneNumberId = data.phone_number_id;
    const accessToken = data.access_token;
    if (!phoneNumberId || !accessToken) {
      return { success: false, message: "Preencha o Phone Number ID e o Access Token para realizar o teste de conexão." };
    }
    return await testWhatsAppCloudConnection({
      data: {
        phoneNumberId,
        accessToken,
      },
    });
  };

  const handleTestMelhorEnvio = async (data: Record<string, string>) => {
    const apiToken = data.api_token;
    if (!apiToken) {
      return { success: false, message: "Preencha o Token de Acesso (API Token) para realizar o teste de conexão." };
    }
    return await testMelhorEnvioConnection({
      data: {
        apiToken,
        environment: (data.environment as any) || "production",
      },
    });
  };

  const handleTestBling = async (data: Record<string, string>) => {
    const apiKey = data.api_key;
    if (!apiKey) {
      return { success: false, message: "Preencha a Chave de API / Token OAuth do Bling v3 para testar." };
    }
    return await testErpConnection({
      data: {
        provider: "bling",
        apiKey,
      },
    });
  };

  const handleTestTiny = async (data: Record<string, string>) => {
    const apiKey = data.api_key;
    if (!apiKey) {
      return { success: false, message: "Preencha o Token de API do Tiny ERP para testar." };
    }
    return await testErpConnection({
      data: {
        provider: "tiny",
        apiKey,
      },
    });
  };

  const handleTestAsaas = async (data: Record<string, string>) => {
    const apiKey = data.api_key;
    if (!apiKey) {
      return { success: false, message: "Preencha a Chave de API (Access Token) do Asaas para testar." };
    }
    return await testPaymentGatewayConnection({
      data: {
        provider: "asaas",
        apiKey,
        environment: (data.environment as any) || "production",
      },
    });
  };

  const handleTestMercadoPago = async (data: Record<string, string>) => {
    const apiKey = data.access_token;
    if (!apiKey) {
      return { success: false, message: "Preencha o Access Token de Produção do Mercado Pago para testar." };
    }
    return await testPaymentGatewayConnection({
      data: {
        provider: "mercadopago",
        apiKey,
      },
    });
  };

  const handleTestStripe = async (data: Record<string, string>) => {
    const apiKey = data.secret_key;
    if (!apiKey) {
      return { success: false, message: "Preencha a Secret Key (sk_...) da Stripe para testar." };
    }
    return await testPaymentGatewayConnection({
      data: {
        provider: "stripe",
        apiKey,
      },
    });
  };

  const handleTestPagarMe = async (data: Record<string, string>) => {
    const apiKey = data.api_key;
    if (!apiKey) {
      return { success: false, message: "Preencha a Chave de API do Pagar.me v5 para testar." };
    }
    return await testPaymentGatewayConnection({
      data: {
        provider: "pagar_me",
        apiKey,
      },
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageHeader title="Central de Integrações & Conectores" />
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gestão unificada de Marketplaces, Inteligência Artificial (BYOK), ERPs Fiscais, Logística de Envio, Mensageria e Tracking.
          </p>
        </div>

        <Link to="/workspace/integracoes/marketplaces">
          <Button variant="outline" size="sm" className="h-9 px-3.5 gap-2 rounded-xl text-xs font-semibold">
            <Store className="size-4 text-primary" />
            Gestor de Marketplaces
            <ExternalLink className="size-3 text-muted-foreground" />
          </Button>
        </Link>
      </div>

      {/* TABS NAVEGAÇÃO DO HUB */}
      <Tabs defaultValue="payments_gateways" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 h-auto p-1.5 gap-1.5 bg-muted/60 rounded-2xl border border-border/70">
          <TabsTrigger value="payments_gateways" className="h-9 text-xs font-semibold rounded-xl gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <CreditCard className="size-3.5 text-emerald-500" />
            Pagamentos
          </TabsTrigger>

          <TabsTrigger value="ai_vault" className="h-9 text-xs font-semibold rounded-xl gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Sparkles className="size-3.5 text-primary" />
            Cofre IA (BYOK)
          </TabsTrigger>

          <TabsTrigger value="marketplaces" className="h-9 text-xs font-semibold rounded-xl gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Store className="size-3.5 text-emerald-500" />
            Marketplaces
          </TabsTrigger>

          <TabsTrigger value="erp_fiscal" className="h-9 text-xs font-semibold rounded-xl gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <FileText className="size-3.5 text-blue-500" />
            ERPs & Fiscal
          </TabsTrigger>

          <TabsTrigger value="logistics" className="h-9 text-xs font-semibold rounded-xl gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Truck className="size-3.5 text-amber-500" />
            Logística & Frete
          </TabsTrigger>

          <TabsTrigger value="messaging" className="h-9 text-xs font-semibold rounded-xl gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <MessageCircle className="size-3.5 text-purple-500" />
            Mensageria
          </TabsTrigger>

          <TabsTrigger value="growth_pixels" className="h-9 text-xs font-semibold rounded-xl gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <BarChart className="size-3.5 text-pink-500" />
            Pixels & Growth
          </TabsTrigger>

          <TabsTrigger value="maps" className="h-9 text-xs font-semibold rounded-xl gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <MapPin className="size-3.5 text-teal-500" />
            Mapas & Rotas
          </TabsTrigger>
        </TabsList>

        {/* 0. ABA GATEWAYS & MEIOS DE PAGAMENTO (ZERO MOCKS) */}
        <TabsContent value="payments_gateways" className="space-y-4 outline-none">
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                <CreditCard className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Gateways & Meios de Pagamento</h4>
                <p className="text-xs text-muted-foreground">
                  Configure suas contas em adquirentes e processadores reais. Os tokens são armazenados com criptografia no cofre de credenciais e validados via ping oficial.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0 self-start sm:self-auto">
              Liquidação Direta
            </Badge>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <IntegrationCard
              provider="asaas"
              title="Asaas (PIX, Boleto & Cartão)"
              description="Conta digital PJ e gateway para recebimento imediato de PIX dinâmico, carnês e liquidação D+0."
              icon={CreditCard}
              existingSetting={settings.find((s: any) => s.provider === "asaas")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              onTestConnection={handleTestAsaas}
              fields={[
                {
                  key: "api_key",
                  label: "Chave de API / Access Token ($aact_...)",
                  type: "password",
                  placeholder: "Insira seu token de API Asaas",
                },
                {
                  key: "webhook_token",
                  label: "Token de Autenticação do Webhook (Opcional)",
                  type: "password",
                  placeholder: "Token para validação de notificações de pagamento",
                },
                {
                  key: "environment",
                  label: "Ambiente (production | sandbox)",
                  placeholder: "production",
                },
              ]}
            />

            <IntegrationCard
              provider="mercadopago"
              title="Mercado Pago"
              description="Gateway para checkout transparente, PIX com QR Code instantâneo e parcelamento no cartão em até 12x."
              icon={CreditCard}
              existingSetting={settings.find((s: any) => s.provider === "mercadopago")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              onTestConnection={handleTestMercadoPago}
              fields={[
                {
                  key: "access_token",
                  label: "Access Token de Produção (APP_USR-...)",
                  type: "password",
                  placeholder: "Insira seu Access Token",
                },
                {
                  key: "public_key",
                  label: "Public Key (APP_USR-...)",
                  placeholder: "Insira sua chave pública",
                },
              ]}
            />

            <IntegrationCard
              provider="stripe"
              title="Stripe Brasil & Internacional"
              description="Processamento de pagamentos globais, cartões de crédito internacionais, Apple Pay e Google Pay."
              icon={CreditCard}
              existingSetting={settings.find((s: any) => s.provider === "stripe")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              onTestConnection={handleTestStripe}
              fields={[
                {
                  key: "secret_key",
                  label: "Secret Key (sk_live_...)",
                  type: "password",
                  placeholder: "sk_live_...",
                },
                {
                  key: "publishable_key",
                  label: "Publishable Key (pk_live_...)",
                  placeholder: "pk_live_...",
                },
              ]}
            />

            <IntegrationCard
              provider="pagar_me"
              title="Pagar.me (Stone Co.)"
              description="Motor transacional de alta conversão para e-commerce com split de pagamento e antifraude nativo."
              icon={CreditCard}
              existingSetting={settings.find((s: any) => s.provider === "pagar_me")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              onTestConnection={handleTestPagarMe}
              fields={[
                {
                  key: "api_key",
                  label: "Secret Key v5 (sk_...)",
                  type: "password",
                  placeholder: "Chave secreta da Stone / Pagar.me",
                },
                {
                  key: "encryption_key",
                  label: "Encryption Key (ek_...)",
                  placeholder: "Chave de criptografia pública",
                },
              ]}
            />

            <IntegrationCard
              provider="pix_direto"
              title="Chave PIX Direta (Manual / QR Code)"
              description="Recebimento direto na conta bancária do lojista sem intermediários. Requer conferência manual do comprovante."
              icon={CreditCard}
              existingSetting={settings.find((s: any) => s.provider === "pix_direto")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "pix_key",
                  label: "Chave PIX (CPF, CNPJ, E-mail ou Telefone)",
                  placeholder: "Ex: financeiro@sualoja.com.br",
                },
                {
                  key: "key_type",
                  label: "Tipo da Chave (cpf | cnpj | email | phone | random)",
                  placeholder: "email",
                },
                {
                  key: "beneficiary_name",
                  label: "Nome Completo do Titular da Conta",
                  placeholder: "Ex: Minha Empresa LTDA",
                },
                {
                  key: "bank_name",
                  label: "Instituição Bancária",
                  placeholder: "Ex: Nubank, Banco do Brasil, Itaú",
                },
              ]}
            />
          </div>
        </TabsContent>

        {/* 1. ABA COFRE DE IA & BYOK */}
        <TabsContent value="ai_vault" className="space-y-4 outline-none">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Zap className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Orquestrador de IA & Arquitetura BYOK</h4>
                <p className="text-xs text-muted-foreground">
                  Ao salvar sua chave pessoal, a plataforma prioriza sua cota. Caso ela expire ou sofra rate-limit, o pool orquestrado da Waesy assume automaticamente.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
              <Link to="/workspace/configuracoes/inteligencia-artificial">
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-xl font-medium cursor-pointer gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                  <Sparkles className="size-3.5 text-primary" />
                  Modelos & Base de Conhecimento
                  <ExternalLink className="size-3 text-muted-foreground" />
                </Button>
              </Link>
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                Pool Ativo (Gemini / Groq / OpenAI)
              </Badge>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <SecretVaultCard
              provider="gemini"
              title="Google Gemini AI"
              description="Modelos Gemini 2.5 Flash e 1.5 Pro. Usado na síntese do Studio Escamas, OCR de contratos e curadoria."
              icon={Layers}
              modelsLabel="gemini-2.5-flash, gemini-1.5-pro"
              existingSecret={secrets.find((s: any) => s.provider === "gemini" && s.is_active)}
              onSave={handleSaveSecret}
              onTestConnection={handleTestSecret}
              onDelete={handleDeleteSecret}
            />

            <SecretVaultCard
              provider="openai"
              title="OpenAI ChatGPT"
              description="Modelos GPT-4o e GPT-4o-mini. Alternativa de alta precisão para análise jurídica e redação publicitária."
              icon={Layers}
              modelsLabel="gpt-4o, gpt-4o-mini"
              existingSecret={secrets.find((s: any) => s.provider === "openai" && s.is_active)}
              onSave={handleSaveSecret}
              onTestConnection={handleTestSecret}
              onDelete={handleDeleteSecret}
            />

            <SecretVaultCard
              provider="groq"
              title="Groq Cloud LPU"
              description="Inferência ultra-rápida de modelos abertos com baixa latência para atendimento conversacional."
              icon={Zap}
              modelsLabel="llama-3.3-70b-versatile, mixtral-8x7b"
              existingSecret={secrets.find((s: any) => s.provider === "groq" && s.is_active)}
              onSave={handleSaveSecret}
              onTestConnection={handleTestSecret}
              onDelete={handleDeleteSecret}
            />

            <SecretVaultCard
              provider="openrouter"
              title="OpenRouter Universal"
              description="Gateway unificado para centenas de modelos abertos e proprietários com roteamento de fallback dinâmico."
              icon={Layers}
              modelsLabel="meta-llama, claude, mistral, deepseek"
              existingSecret={secrets.find((s: any) => s.provider === "openrouter" && s.is_active)}
              onSave={handleSaveSecret}
              onTestConnection={handleTestSecret}
              onDelete={handleDeleteSecret}
            />

            <SecretVaultCard
              provider="anthropic"
              title="Anthropic Claude"
              description="Modelos Claude 3.5 Sonnet para redação de contratos complexos e raciocínio analítico avançado."
              icon={Sparkles}
              modelsLabel="claude-3-5-sonnet, claude-3-haiku"
              existingSecret={secrets.find((s: any) => s.provider === "anthropic" && s.is_active)}
              onSave={handleSaveSecret}
              onTestConnection={handleTestSecret}
              onDelete={handleDeleteSecret}
            />

            <SecretVaultCard
              provider="firecrawl"
              title="Firecrawl (Deep Web Scraping)"
              description="Motor inteligente de extração de markdown e produtos via URL. Usado pelo importador e radar de mercado."
              icon={Globe2}
              modelsLabel="Scrape API, Crawl v1, Clean Markdown"
              existingSecret={secrets.find((s: any) => s.provider === "firecrawl" && s.is_active)}
              onSave={handleSaveSecret}
              onTestConnection={handleTestSecret}
              onDelete={handleDeleteSecret}
            />

            <SecretVaultCard
              provider="steel"
              title="Steel.dev (Browser Automation)"
              description="Navegador headless em nuvem para automação de sessões, captura de screenshots e auditoria de concorrência."
              icon={Terminal}
              modelsLabel="Headless Chromium, Session API"
              existingSecret={secrets.find((s: any) => s.provider === "steel" && s.is_active)}
              onSave={handleSaveSecret}
              onTestConnection={handleTestSecret}
              onDelete={handleDeleteSecret}
            />
          </div>
        </TabsContent>

        {/* 2. ABA MARKETPLACES & CANAIS DE VENDA */}
        <TabsContent value="marketplaces" className="space-y-4 outline-none">
          <div className="p-4 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Hub de Canais Externos & Marketplaces</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Publique anúncios, sincronize preços/estoques e importe pedidos de canais terceiros diretamente no catálogo.
              </p>
            </div>
            <Link to="/workspace/integracoes/marketplaces">
              <Button size="sm" className="h-9 rounded-xl font-bold gap-1.5 cursor-pointer">
                Abrir Central de Marketplaces
                <ExternalLink className="size-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: "mercadolivre", name: "Mercado Livre", desc: "Maior e-commerce da América Latina", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
              { id: "shopee", name: "Shopee", desc: "Vendas ágeis e frete com cupons", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
              { id: "ifood", name: "iFood Merchant", desc: "Delivery gastronômico e mercado local", color: "bg-red-500/10 text-red-600 border-red-500/30" },
              { id: "magalu", name: "Magazine Luiza", desc: "Marketplace integrado ao ecossistema Magalu", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
              { id: "amazon", name: "Amazon Brasil", desc: "Catálogo unificado e alcance nacional", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
              { id: "shein", name: "Shein Marketplace", desc: "Moda e vestuário de alta rotação", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
              { id: "rappi", name: "Rappi", desc: "Entregas sob demanda e conveniência", color: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
              { id: "99food", name: "99Food", desc: "Integração para restaurantes parceiros", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
            ].map((mkt) => {
              const conn = marketplaceConnectors.find((c: MarketplaceConnectorDTO) => c.platform === mkt.id);
              const isConnected = conn && conn.status === "connected";

              return (
                <div key={mkt.id} className="p-4 rounded-2xl bg-card border border-border/70 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-sm text-foreground">{mkt.name}</h5>
                      {isConnected ? (
                        <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                          Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Desconectado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{mkt.desc}</p>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {conn?.last_sync_at
                        ? `Último sync: ${new Date(conn.last_sync_at).toLocaleDateString("pt-BR")}`
                        : "Sem sincronização"}
                    </span>
                    <Link to="/workspace/integracoes/marketplaces">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold text-primary">
                        Configurar
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* 3. ABA ERPS & EMISSÃO FISCAL */}
        <TabsContent value="erp_fiscal" className="space-y-4 outline-none">
          <div className="grid lg:grid-cols-2 gap-6">
            <IntegrationCard
              provider="bling_erp"
              title="Bling ERP (v3)"
              description="Integração de pedidos, estoque e emissão de notas fiscais via API oficial v3 do Bling."
              icon={FileText}
              existingSetting={settings.find((s: any) => s.provider === "bling_erp")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              onTestConnection={handleTestBling}
              fields={[
                {
                  key: "api_key",
                  label: "Chave de API / Token OAuth2 (Bling v3)",
                  type: "password",
                  placeholder: "Insira o token gerado no painel do Bling",
                },
              ]}
            />

            <IntegrationCard
              provider="tiny_erp"
              title="Tiny ERP (v2)"
              description="Sincronização de catálogo, notas fiscais e controle de expedição via Tiny ERP."
              icon={FileText}
              existingSetting={settings.find((s: any) => s.provider === "tiny_erp")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              onTestConnection={handleTestTiny}
              fields={[
                {
                  key: "api_key",
                  label: "Token de API do Tiny",
                  type: "password",
                  placeholder: "Insira o token de API do Tiny ERP",
                },
              ]}
            />

            <IntegrationCard
              provider="focus_nfe"
              title="Focus NFe"
              description="Emissão autônoma de NF-e (modelo 55), NFC-e (modelo 65) e NFS-e para prestadores de serviço."
              icon={ShieldCheck}
              existingSetting={settings.find((s: any) => s.provider === "focus_nfe")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "api_token",
                  label: "Token de Produção Focus NFe",
                  type: "password",
                  placeholder: "Insira o token de produção",
                },
                {
                  key: "environment",
                  label: "Ambiente (production | homologation)",
                  placeholder: "production",
                },
              ]}
            />

            <IntegrationCard
              provider="nuvem_fiscal"
              title="Nuvem Fiscal"
              description="Mensageria fiscal em nuvem, autorização de CTe e validação de certificados digitais A1."
              icon={ShieldCheck}
              existingSetting={settings.find((s: any) => s.provider === "nuvem_fiscal")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "client_id",
                  label: "Client ID Nuvem Fiscal",
                  placeholder: "Ex: nf_client_...",
                },
                {
                  key: "client_secret",
                  label: "Client Secret",
                  type: "password",
                  placeholder: "Chave secreta",
                },
              ]}
            />
          </div>
        </TabsContent>

        {/* 4. ABA LOGÍSTICA & FRETE */}
        <TabsContent value="logistics" className="space-y-4 outline-none">
          <div className="grid lg:grid-cols-2 gap-6">
            <IntegrationCard
              provider="melhor_envio"
              title="Melhor Envio"
              description="Cotação de frete em tempo real (Jadlog, Latam Cargo, Buslog, Correios) e geração de etiquetas."
              icon={Key}
              existingSetting={settings.find((s: any) => s.provider === "melhor_envio")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              onTestConnection={handleTestMelhorEnvio}
              fields={[
                {
                  key: "api_token",
                  label: "Token de Acesso (API Token)",
                  type: "password",
                  placeholder: "Bearer eyJhbGciOiJIUzI1Ni...",
                },
                {
                  key: "environment",
                  label: "Ambiente (production | sandbox)",
                  placeholder: "production",
                },
              ]}
            />

            <IntegrationCard
              provider="correios"
              title="Correios WebServices (CWS)"
              description="Contrato corporativo dos Correios para SEDEX, PAC e Logística Reversa via Sigep Web."
              icon={Truck}
              existingSetting={settings.find((s: any) => s.provider === "correios")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "cartao_postagem",
                  label: "Número do Cartão de Postagem",
                  placeholder: "Ex: 0071234567",
                },
                {
                  key: "usuario_cws",
                  label: "Usuário do Portal Correios",
                  placeholder: "usuario.cws",
                },
                {
                  key: "codigo_acesso",
                  label: "Código de Acesso / Chave de API",
                  type: "password",
                  placeholder: "Chave gerada no Meu Correios",
                },
              ]}
            />

            <IntegrationCard
              provider="motolink"
              title="MotoLink Express (Entrega Local)"
              description="Despacho autônomo com tarifas dinâmicas de chuva, raio de cobertura urbana e entregadores locais."
              icon={Truck}
              existingSetting={settings.find((s: any) => s.provider === "motolink")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "max_delivery_radius_km",
                  label: "Raio Máximo de Entrega (km)",
                  placeholder: "Ex: 15",
                },
                {
                  key: "base_dispatch_fee_cents",
                  label: "Taxa Base de Saída do Entregador (em centavos)",
                  placeholder: "Ex: 700 (para R$ 7,00)",
                },
                {
                  key: "auto_dispatch_on_order_accept",
                  label: "Despacho Automático ao Aceitar Pedido (true/false)",
                  placeholder: "true",
                },
              ]}
            />
          </div>
        </TabsContent>

        {/* 5. ABA MENSAGERIA & AGENDA */}
        <TabsContent value="messaging" className="space-y-4 outline-none">
          <div className="grid lg:grid-cols-2 gap-6">
            <IntegrationCard
              provider="whatsapp_cloud_api"
              title="WhatsApp Cloud API (Oficial Meta)"
              description="Disparo automatizado de status de pedidos, agendamentos, vouchers de turismo e propostas diretas."
              icon={MessageCircle}
              existingSetting={settings.find((s: any) => s.provider === "whatsapp_cloud_api")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              onTestConnection={handleTestWhatsApp}
              fields={[
                {
                  key: "phone_number_id",
                  label: "Phone Number ID (Meta Graph)",
                  placeholder: "Ex: 10492837492847",
                },
                {
                  key: "business_account_id",
                  label: "WhatsApp Business Account ID (WABA)",
                  placeholder: "Ex: 10928374829104",
                },
                {
                  key: "access_token",
                  label: "Permanent System User Access Token",
                  type: "password",
                  placeholder: "EAA...",
                },
              ]}
            />

            <IntegrationCard
              provider="govbr_signature"
              title="Assinatura Eletrônica GOV.BR"
              description="Validação de identidade com conta Gov.br (Prata/Ouro) com presunção legal (Lei nº 14.063/2020)."
              icon={ShieldCheck}
              existingSetting={settings.find((s: any) => s.provider === "govbr_signature")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "client_id",
                  label: "Client ID (Portal Gov.br)",
                  placeholder: "Ex: waesy-signature-app",
                },
                {
                  key: "client_secret",
                  label: "Client Secret (OAuth2)",
                  type: "password",
                  placeholder: "Chave secreta fornecida pelo Gov.br",
                },
                {
                  key: "environment",
                  label: "Ambiente (production | staging)",
                  placeholder: "production",
                },
                {
                  key: "redirect_uri",
                  label: "URL de Retorno Autorizada",
                  placeholder: "https://waesy.com/api/auth/govbr/callback",
                },
              ]}
            />

            <IntegrationCard
              provider="google_calendar_sync"
              title="Google Calendar Sync"
              description="Sincronização bidirecional de agendamentos de serviços, consultas e eventos comunitários."
              icon={Calendar}
              existingSetting={settings.find((s: any) => s.provider === "google_calendar_sync")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "calendar_id",
                  label: "Google Calendar ID",
                  placeholder: "seu-email@gmail.com ou calendar-id@group.calendar.google.com",
                },
                {
                  key: "service_account_credentials",
                  label: "Service Account JSON / API Key",
                  type: "password",
                  placeholder: '{"type": "service_account", ...}',
                },
              ]}
            />
          </div>
        </TabsContent>

        {/* 6. ABA PIXELS & GROWTH */}
        <TabsContent value="growth_pixels" className="space-y-4 outline-none">
          <div className="grid lg:grid-cols-2 gap-6">
            <IntegrationCard
              provider="meta_pixel"
              title="Meta Pixel & Conversions API"
              description="Rastreamento de visualizações de produto, adições ao carrinho e conversões no Facebook e Instagram Ads."
              icon={BarChart}
              existingSetting={settings.find((s: any) => s.provider === "meta_pixel")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                { key: "pixel_id", label: "ID do Pixel da Meta", placeholder: "Ex: 123456789012345" },
                {
                  key: "access_token",
                  label: "API de Conversões (CAPI Access Token)",
                  type: "password",
                  placeholder: "EAAB...",
                },
              ]}
            />

            <IntegrationCard
              provider="google_analytics"
              title="Google Analytics 4 (GA4)"
              description="Métricas de navegação em tempo real, funis de conversão e eventos de comércio eletrônico aprimorado."
              icon={BarChart}
              existingSetting={settings.find((s: any) => s.provider === "google_analytics")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "measurement_id",
                  label: "ID de Métrica do GA4 (Measurement ID)",
                  placeholder: "Ex: G-XXXXXXXXXX",
                },
              ]}
            />

            <IntegrationCard
              provider="google_merchant_center"
              title="Google Merchant Center"
              description="Habilita o catálogo de produtos no Google Shopping via feed XML (/api/feed/xml)."
              icon={BarChart}
              existingSetting={settings.find((s: any) => s.provider === "google_merchant_center")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "merchant_id",
                  label: "Merchant ID (Apenas Referência)",
                  placeholder: "Ex: 123456789",
                },
              ]}
            />

            <IntegrationCard
              provider="tiktok_pixel"
              title="TikTok Pixel & Events API"
              description="Rastreamento de conversões para campanhas de vídeo patrocinadas no TikTok Ads Manager."
              icon={BarChart}
              existingSetting={settings.find((s: any) => s.provider === "tiktok_pixel")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "pixel_id",
                  label: "TikTok Pixel ID",
                  placeholder: "Ex: C1234567890ABCDEF",
                },
              ]}
            />
          </div>
        </TabsContent>

        {/* 7. ABA MAPAS & ROTAS */}
        <TabsContent value="maps" className="space-y-4 outline-none">
          <div className="grid lg:grid-cols-2 gap-6">
            <IntegrationCard
              provider="map_service"
              title="Provedor de Mapas & Geolocalização"
              description="Serviço de renderização de rotas de entrega MotoLink, localização de lojas e turismo local."
              icon={MapPin}
              existingSetting={settings.find((s: any) => s.provider === "map_service")}
              onSave={handleSaveIntegration}
              onDelete={handleDeleteIntegration}
              fields={[
                {
                  key: "provider",
                  label: "Provedor (open_street_map | mapbox | google_maps)",
                  placeholder: "open_street_map",
                },
                {
                  key: "api_key",
                  label: "Chave de API / Access Token (opcional para OSM)",
                  type: "password",
                  placeholder: "pk.eyJ1...",
                },
                {
                  key: "custom_tile_url",
                  label: "URL de Tiles Customizada (opcional)",
                  placeholder: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
                },
              ]}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
