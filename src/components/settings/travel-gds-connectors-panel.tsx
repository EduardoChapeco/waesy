import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  Plane,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  TRAVEL_GDS_PROVIDER_CATALOG,
  deleteTravelGdsIntegrationFn,
  saveTravelGdsIntegrationFn,
  testTravelGdsIntegrationFn,
  type TravelGdsIntegrationStatusItem,
  type TravelGdsProviderCode,
} from "@/services/travel-gds-workbench.functions";
import { cn } from "@/lib/utils";

interface ProviderFormState {
  baseUrl: string;
  username: string;
  secretToken: string;
  agencyCode: string;
  clientCode: string;
  authMode: "bearer" | "basic" | "api_key";
  apiKeyHeader: string;
  environment: "production" | "homologation";
  defaultMarkupPercent: number;
  defaultFixedFeeCents: number;
  isActive: boolean;
}

function buildInitialForm(
  catalogItem: (typeof TRAVEL_GDS_PROVIDER_CATALOG)[number],
  existing?: TravelGdsIntegrationStatusItem,
): ProviderFormState {
  return {
    baseUrl: existing?.baseUrl || catalogItem.defaultBaseUrl,
    username: existing?.username || "",
    secretToken: "",
    agencyCode: existing?.agencyCode || "",
    clientCode: existing?.clientCode || "",
    authMode:
      existing?.authMode === "basic" || existing?.authMode === "api_key"
        ? existing.authMode
        : "bearer",
    apiKeyHeader: "x-api-key",
    environment: existing?.environment === "homologation" ? "homologation" : "production",
    defaultMarkupPercent: existing?.defaultMarkupPercent ?? 10,
    defaultFixedFeeCents: existing?.defaultFixedFeeCents ?? (catalogItem.code === "wooba" ? 3500 : 0),
    isActive: existing ? existing.isActive : true,
  };
}

export function TravelGdsConnectorsPanel({
  initialItems,
  onRefresh,
}: {
  initialItems: TravelGdsIntegrationStatusItem[];
  onRefresh?: () => void;
}) {
  const [items, setItems] = useState<TravelGdsIntegrationStatusItem[]>(initialItems);
  const [expandedCode, setExpandedCode] = useState<string | null>("wooba");
  const [forms, setForms] = useState<Record<string, ProviderFormState>>(() => {
    const map: Record<string, ProviderFormState> = {};
    for (const cat of TRAVEL_GDS_PROVIDER_CATALOG) {
      const existing = initialItems.find((i) => i.providerCode === cat.code);
      map[cat.code] = buildInitialForm(cat, existing);
    }
    return map;
  });
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [testingCode, setTestingCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; latencyMs: number; message: string }>
  >({});

  useEffect(() => {
    setItems(initialItems);
    setForms((prev) => {
      const next = { ...prev };
      for (const cat of TRAVEL_GDS_PROVIDER_CATALOG) {
        const existing = initialItems.find((i) => i.providerCode === cat.code);
        next[cat.code] = buildInitialForm(cat, existing);
      }
      return next;
    });
  }, [initialItems]);

  const updateField = <K extends keyof ProviderFormState>(
    code: string,
    key: K,
    value: ProviderFormState[K],
  ) => {
    setForms((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        [key]: value,
      },
    }));
  };

  const handleSave = async (code: TravelGdsProviderCode) => {
    const form = forms[code];
    if (!form) return;
    setSavingCode(code);
    try {
      await saveTravelGdsIntegrationFn({
        data: {
          providerCode: code,
          baseUrl: form.baseUrl.trim(),
          username: form.username.trim(),
          secretToken: form.secretToken.trim(),
          agencyCode: form.agencyCode.trim(),
          clientCode: form.clientCode.trim(),
          authMode: form.authMode,
          apiKeyHeader: form.apiKeyHeader.trim() || "x-api-key",
          environment: form.environment,
          defaultMarkupPercent: Number(form.defaultMarkupPercent) || 0,
          defaultFixedFeeCents: Number(form.defaultFixedFeeCents) || 0,
          isActive: form.isActive,
        },
      });
      toast.success(`Credenciais ${code.toUpperCase()} salvas no cofre criptografado!`);
      setItems((prev) => {
        const others = prev.filter((i) => i.providerCode !== code);
        const cat = TRAVEL_GDS_PROVIDER_CATALOG.find((c) => c.code === code)!;
        return [
          ...others,
          {
            providerCode: code,
            displayName: cat.name,
            engineType: code === "wooba" ? "manual_portal" : "infotravel_v1",
            isActive: form.isActive,
            sourceTable: "travel_operator_integrations",
            baseUrl: form.baseUrl.trim(),
            username: form.username.trim() || undefined,
            agencyCode: form.agencyCode.trim() || undefined,
            clientCode: form.clientCode.trim() || undefined,
            defaultMarkupPercent: Number(form.defaultMarkupPercent) || 0,
            defaultFixedFeeCents: Number(form.defaultFixedFeeCents) || 0,
            environment: form.environment,
            authMode: form.authMode,
            hasSecretConfigured: true,
          },
        ];
      });
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar credencial GDS no cofre.");
    } finally {
      setSavingCode(null);
    }
  };

  const handleTest = async (code: TravelGdsProviderCode) => {
    setTestingCode(code);
    try {
      const res = await testTravelGdsIntegrationFn({ data: { providerCode: code } });
      setTestResults((prev) => ({
        ...prev,
        [code]: { ok: res.ok, latencyMs: res.latencyMs, message: res.message },
      }));
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (err: any) {
      const msg = err?.message || "Erro ao testar conectividade.";
      setTestResults((prev) => ({ ...prev, [code]: { ok: false, latencyMs: 0, message: msg } }));
      toast.error(msg);
    } finally {
      setTestingCode(null);
    }
  };

  const handleDelete = async (code: TravelGdsProviderCode) => {
    setDeletingCode(code);
    try {
      await deleteTravelGdsIntegrationFn({ data: { providerCode: code } });
      toast.success(`Integração ${code.toUpperCase()} removida.`);
      setItems((prev) => prev.filter((i) => i.providerCode !== code));
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover credencial.");
    } finally {
      setDeletingCode(null);
    }
  };

  const activeCount = items.filter((i) => i.isActive && i.hasSecretConfigured).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <h3 className="font-bold text-base text-foreground">
              Central GDS & Operadoras InfoTravel (PassHub)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Configure Wooba Travellink GDS e suas operadoras no padrão InfoTravel v1 (Orinter, FRT, Incomum, Cativa, BeFly, Confiança). Senhas e tokens são criptografados com AES-256-GCM no servidor e abastecem imediatamente o cotador ao vivo.
          </p>
        </div>
        <Badge variant={activeCount > 0 ? "default" : "secondary"} className="shrink-0 self-start sm:self-center">
          {activeCount > 0 ? `${activeCount} conector(es) ativo(s)` : "Nenhum conector ativo"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TRAVEL_GDS_PROVIDER_CATALOG.map((cat) => {
          const existing = items.find((i) => i.providerCode === cat.code);
          const form = forms[cat.code] || buildInitialForm(cat, existing);
          const isConfigured = Boolean(existing?.hasSecretConfigured);
          const isExpanded = expandedCode === cat.code;
          const testRes = testResults[cat.code];

          return (
            <div
              key={cat.code}
              className={cn(
                "rounded-xl border bg-card p-4 space-y-4 transition-colors",
                existing?.isActive && isConfigured ? "border-primary/40" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Plane className="size-4 text-primary shrink-0" />
                    <h4 className="font-bold text-sm text-foreground">{cat.name}</h4>
                    <Badge
                      variant={existing?.isActive && isConfigured ? "default" : "outline"}
                      className="text-xs"
                    >
                      {existing?.isActive && isConfigured
                        ? "Ativa"
                        : isConfigured
                          ? "Pausada"
                          : "Não Configurada"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedCode(isExpanded ? null : cat.code)}
                  className="h-11 min-h-11 px-3 shrink-0"
                  aria-label={isExpanded ? `Recolher ${cat.name}` : `Configurar ${cat.name}`}
                >
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </div>

              {isExpanded && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between py-1">
                    <Label htmlFor={`gds-active-${cat.code}`} className="text-xs font-semibold text-foreground">
                      Conector Ativo para Buscas PassHub
                    </Label>
                    <Switch
                      id={`gds-active-${cat.code}`}
                      checked={form.isActive}
                      onCheckedChange={(checked) => updateField(cat.code, "isActive", checked)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Endpoint / Base URL</Label>
                      <Input
                        value={form.baseUrl}
                        onChange={(e) => updateField(cat.code, "baseUrl", e.target.value)}
                        placeholder={cat.defaultBaseUrl}
                        className="h-11 bg-background"
                      />
                    </div>

                    {cat.code === "wooba" ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Código da Agência (Wooba)</Label>
                          <Input
                            value={form.agencyCode}
                            onChange={(e) => updateField(cat.code, "agencyCode", e.target.value)}
                            placeholder="Ex: AG12345"
                            className="h-11 bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Ambiente</Label>
                          <select
                            value={form.environment}
                            onChange={(e) =>
                              updateField(cat.code, "environment", e.target.value as "production" | "homologation")
                            }
                            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="production">Produção</option>
                            <option value="homologation">Homologação</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Usuário</Label>
                          <Input
                            value={form.username}
                            onChange={(e) => updateField(cat.code, "username", e.target.value)}
                            placeholder="Usuário Wooba"
                            className="h-11 bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Senha</Label>
                          <Input
                            type="password"
                            value={form.secretToken}
                            onChange={(e) => updateField(cat.code, "secretToken", e.target.value)}
                            placeholder={isConfigured ? "•••••••• (já criptografada)" : "Senha de acesso"}
                            className="h-11 bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Markup Padrão (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={form.defaultMarkupPercent}
                            onChange={(e) => updateField(cat.code, "defaultMarkupPercent", Number(e.target.value))}
                            className="h-11 bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Taxa de Emissão Fixa (Centavos)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.defaultFixedFeeCents}
                            onChange={(e) => updateField(cat.code, "defaultFixedFeeCents", Number(e.target.value))}
                            className="h-11 bg-background"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Modo de Autenticação</Label>
                          <select
                            value={form.authMode}
                            onChange={(e) =>
                              updateField(cat.code, "authMode", e.target.value as "bearer" | "basic" | "api_key")
                            }
                            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="bearer">Bearer Token</option>
                            <option value="basic">Basic Auth (Usuário + Senha)</option>
                            <option value="api_key">Header API Key</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Markup Padrão (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={form.defaultMarkupPercent}
                            onChange={(e) => updateField(cat.code, "defaultMarkupPercent", Number(e.target.value))}
                            className="h-11 bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Usuário / Client ID</Label>
                          <Input
                            value={form.username}
                            onChange={(e) => updateField(cat.code, "username", e.target.value)}
                            placeholder="Usuário ou client_id"
                            className="h-11 bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Token / API Key / Senha</Label>
                          <Input
                            type="password"
                            value={form.secretToken}
                            onChange={(e) => updateField(cat.code, "secretToken", e.target.value)}
                            placeholder={isConfigured ? "•••••••• (já criptografado)" : "Insira token ou senha"}
                            className="h-11 bg-background"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {testRes && (
                    <div
                      className={cn(
                        "rounded-lg border p-3 text-xs flex items-start gap-2",
                        testRes.ok
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-destructive/30 bg-destructive/10 text-destructive",
                      )}
                    >
                      {testRes.ok ? (
                        <CheckCircle2 className="size-4 shrink-0 mt-1" />
                      ) : (
                        <AlertCircle className="size-4 shrink-0 mt-1" />
                      )}
                      <span>{testRes.message}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => handleSave(cat.code)}
                      disabled={savingCode === cat.code}
                      className="h-11 min-h-11 gap-2 font-semibold"
                    >
                      {savingCode === cat.code ? (
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <KeyRound className="size-4" />
                      )}
                      <span>Salvar no Cofre</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTest(cat.code)}
                      disabled={testingCode === cat.code}
                      className="h-11 min-h-11 gap-2 font-semibold"
                    >
                      {testingCode === cat.code ? (
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Wifi className="size-4" />
                      )}
                      <span>Testar Conexão</span>
                    </Button>

                    {isConfigured && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleDelete(cat.code)}
                        disabled={deletingCode === cat.code}
                        className="h-11 min-h-11 px-3 text-destructive hover:text-destructive gap-2"
                      >
                        <Trash2 className="size-4" />
                        <span>Remover</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
