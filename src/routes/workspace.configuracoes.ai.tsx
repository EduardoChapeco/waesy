import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cpu, Key, ShieldCheck, Plus, Lock, Loader2, CheckCircle2, AlertTriangle, Layers, Bot, Globe, Eye, Sliders, Trash2, Sparkles, Zap, ArrowUpRight } from 'lucide-react';
import { toast } from "sonner";

import { getAiTelemetryMetrics } from "@/services/ai-core-gateway.functions";
import { saveSecretKey, listConfiguredSecrets, getAICapabilityBindings, deleteSecretKey } from "@/services/secret-vault.functions";
import { getStoreAIQuotaStatus } from "@/services/ai-quotas-and-byok.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/configuracoes/ai")({
 head: () => ({ meta: [{ title: "Inteligência Artificial | Workspace Waesy" }] }),
 component: AIConfigurationPage,
});

const PROVIDER_ICONS: Record<string, { label: string; description: string }> = {
 gemini: {
 label: "Google Gemini",
 description: "Modelos Flash & Pro para raciocínio, visão e contratos",
 },
 openrouter: {
 label: "OpenRouter",
 description: "Roteador multi-modelo unificado (Claude, Llama, DeepSeek)",
 },
 groq: {
 label: "Groq LPU",
 description: "Incrível velocidade de inferência ultra-rápida (Llama 3.3)",
 },
 openai: { label: "OpenAI", description: "Modelos GPT-4o e embeddings" },
 anthropic: { label: "Anthropic Claude", description: "Modelos Claude Sonnet & Opus" },
 firecrawl: { label: "Firecrawl", description: "Web scraping e extração inteligente de dados" },
 steel: { label: "Steel Browser", description: "Automação de sessões headless em nuvem" },
 resend: { label: "Resend", description: "Disparo transacional de e-mails e envelopes" },
 google_maps: { label: "Google Maps", description: "Geocodificação e cálculo de distâncias" },
};

function AIConfigurationPage() {
 const queryClient = useQueryClient();
 const [dialogOpen, setDialogOpen] = useState(false);
 const [provider, setProvider] = useState<string>("gemini");
 const [label, setLabel] = useState("");
 const [secretKey, setSecretKey] = useState("");
 const [dailyBudgetCents, setDailyBudgetCents] = useState("");

 const { data: secrets, isLoading: loadingSecrets } = useQuery({
 queryKey: ["secret-vault-keys"],
 queryFn: () => listConfiguredSecrets(),
 });

 const { data: quotaData, isLoading: loadingQuota } = useQuery({
 queryKey: ["store-ai-quota-status"],
 queryFn: () => getStoreAIQuotaStatus(),
 });
 const quota = quotaData;

  const { data: telemetry } = useQuery({
    queryKey: ["ai-telemetry-metrics"],
    queryFn: () => getAiTelemetryMetrics(),
  });

 const { data: bindings, isLoading: loadingBindings } = useQuery({
 queryKey: ["ai-capability-bindings"],
 queryFn: () => getAICapabilityBindings(),
 });

 const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSecretKey({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secret-vault-keys"] });
      queryClient.invalidateQueries({ queryKey: ["store-ai-quota-status"] });
      toast.success("Chave removida do cofre.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao remover chave.");
    },
  });

  const saveMutation = useMutation({
 mutationFn: saveSecretKey,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["secret-vault-keys"] });
 toast.success("Chave de API salva com sucesso no cofre seguro!");
 setDialogOpen(false);
 setLabel("");
 setSecretKey("");
 setDailyBudgetCents("");
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao salvar credencial.");
 },
 });

 const handleSaveKey = () => {
 if (!secretKey.trim() || secretKey.length < 6) {
 toast.error("Informe uma chave de API válida.");
 return;
 }
 const finalLabel = label.trim() || `${PROVIDER_ICONS[provider]?.label || provider} Key`;
 const budgetCents = dailyBudgetCents ? parseInt(dailyBudgetCents.replace(/\D/g, "")) : 0;

 saveMutation.mutate({
 data: {
 provider: provider as any,
 label: finalLabel,
 secretKey: secretKey.trim(),
 dailyBudgetCents: budgetCents,
 scope: "organization",
 },
 });
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* Header Operacional */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
 <Cpu className="size-5 text-primary" />
 <span>Inteligência Artificial</span>
 </h1>
 <p className="text-xs text-muted-foreground mt-1">
 Gerencie chaves criptografadas de provedores de Inteligência Artificial e automação.
 </p>
 </div>

 <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
 <DialogTrigger asChild>
 <Button size="sm" className="rounded-lg text-xs font-bold gap-2 ">
 <Plus className="size-4" />
 <span>Conectar Provedor (BYOK)</span>
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-md sm:rounded-lg">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold flex items-center gap-2">
 <Key className="size-5 text-primary" />
 Adicionar Credencial Segura
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Sua chave será armazenada com criptografia. A chave completa nunca é retornada para
 a interface após o salvamento.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-2">
 <Label className="text-xs font-semibold">Provedor</Label>
 <Select value={provider} onValueChange={setProvider}>
 <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {Object.entries(PROVIDER_ICONS).map(([key, info]) => (
 <SelectItem key={key} value={key}>
 {info.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold">Rótulo / Identificador</Label>
 <Input
 value={label}
 onChange={(e) => setLabel(e.target.value)}
 placeholder="Ex: Gemini Produção Loja"
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold">Chave de API (Secret Key) *</Label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 type="password"
 value={secretKey}
 onChange={(e) => setSecretKey(e.target.value)}
 placeholder="Cole aqui sua API Key..."
 className="pl-8 h-10 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold">Orçamento Diário Máximo (R$)</Label>
 <Input
 value={dailyBudgetCents}
 onChange={(e) => setDailyBudgetCents(e.target.value)}
 placeholder="0 (Sem limite de rate-limit)"
 className="h-9 rounded-lg text-xs bg-background font-mono"
 />
 </div>

 <Button
 onClick={handleSaveKey}
 disabled={saveMutation.isPending}
 className="w-full h-10 rounded-lg text-xs font-bold gap-2 mt-2"
 >
 {saveMutation.isPending ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Criptografando e Salvando...</span>
 </>
 ) : (
 <>
 <ShieldCheck className="size-4" />
 <span>Salvar no Cofre Seguro</span>
 </>
 )}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>

 {/* Card de Quotas de IA & Arquitetura Dual (V141) */}
 <div className="p-5 rounded-lg border border-border/60 bg-card shadow-2xs space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-foreground">
 Cotas Mensais de IA & Arquitetura Dual
 </span>
 {quota?.planTier === "WAESY_MAX" ? (
 <Badge variant="default" className="text-xs font-mono gap-1">
 <Sparkles className="size-3" />
 Waesy Max
 </Badge>
 ) : (
 <Badge variant="secondary" className="text-xs font-mono">
 Modo Rápido MVP
 </Badge>
 )}
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 {quota?.planTier === "WAESY_MAX"
 ? "Franquia expandida de 200 chamadas mensais com inteligência profunda multissetorial."
 : "Franquia essencial de 10 chamadas mensais para operações de catálogo e anúncios."}
 </p>
 </div>

 <div className="flex items-center gap-2">
 {quota?.hasByokConfigured ? (
 <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-xs font-mono gap-1">
 <Zap className="size-3" />
 BYOK Ativo ({quota.byokProvider})
 </Badge>
 ) : (
 <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
 Fallback BYOK Inativo
 </Badge>
 )}
 </div>
 </div>

 {loadingQuota ? (
 <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
 Carregando cota e consumo mensal de IA...
 </div>
 ) : quota ? (
 <div className="space-y-2 pt-1">
 <div className="flex items-center justify-between text-xs font-mono">
 <span className="text-muted-foreground">
 Consumo no Ciclo: <strong className="text-foreground">{quota.monthlyUsed}</strong> / {quota.monthlyLimit} requisições
 </span>
 <span className="text-muted-foreground">
 Restantes: <strong className="text-foreground">{quota.remainingQuota}</strong>
 </span>
 </div>
 <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
 <div
 className="bg-primary h-full transition-all duration-300 rounded-full"
 style={{ width: `${Math.min(100, Math.round((quota.monthlyUsed / Math.max(1, quota.monthlyLimit)) * 100))}%` }}
 />
 </div>
 <p className="text-xs text-muted-foreground">
 {quota.hasActiveBYOK
 ? "Sua loja possui credencial própria vinculada no cofre seguro. Ao esgotar os créditos da franquia, a plataforma comuta silenciosamente para sua chave sem interromper o serviço."
 : "Ao atingir o limite mensal, conecte sua própria chave de API (BYOK) acima para uso irrestrito sem taxas adicionais."}
 </p>
 </div>
 ) : null}
 </div>

 {/* Grid de Provedores Conectados */}
 <div className="space-y-3">
 <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <Key className="size-3.5 text-primary" />
 Provedores Ativos no Cofre
 </h2>

 {loadingSecrets ? (
 <div className="py-10 text-center text-xs text-muted-foreground">
 <Loader2 className="size-5 animate-spin mx-auto text-primary mb-2" />
 Carregando credenciais...
 </div>
 ) : secrets && secrets.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {secrets.map((sec: any) => {
 const info = PROVIDER_ICONS[sec.provider] || {
 label: sec.provider,
 description: "Serviço externo",
 };

 return (
 <div
 key={sec.id}
 className=" bg-card rounded-lg p-5 space-y-3"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
 <Bot className="size-4" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-foreground">{sec.label}</h3>
 <p className="text-xs text-muted-foreground">{info.label}</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {sec.masked_suffix}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        deleteMutation.mutate(sec.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                      title="Remover chave do cofre"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
 <span className="flex items-center gap-1">
 <Lock className="size-3 text-emerald-600" />
 Criptografia AES-256
 </span>
 <span>Atualizado {formatDate(sec.created_at)}</span>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="bg-card rounded-lg p-8 border border-border/60 text-center space-y-2">
 <Key className="size-8 mx-auto text-muted-foreground/50" />
 <p className="text-xs font-semibold text-foreground">Nenhuma API Key conectada</p>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Conecte sua própria chave de API (Gemini, OpenRouter, Claude) para habilitar IA de
 custo zero na infraestrutura.
 </p>
 </div>
 )}
 </div>

 {/* Roteador de Capabilities de IA */}
 <div className="bg-card rounded-lg p-6 border border-border/60 space-y-4">
 <div className="flex items-center gap-2">
 <Sliders className="size-4 text-primary" />
 <h2 className="text-sm font-bold text-foreground">Roteador de Modelos por Capacidade</h2>
 </div>

 <div className="space-y-3">
 <div className="p-4 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs">
 <div>
 <p className="font-bold text-foreground">Assistente de Cláusulas e Contratos</p>
 <p className="text-xs text-muted-foreground">
 Análise jurídica, sugestões de redação e conferência de riscos
 </p>
 </div>
 <Badge variant="outline" className="font-mono text-xs">
 gemini-2.5-pro
 </Badge>
 </div>

 <div className="p-4 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs">
 <div>
 <p className="font-bold text-foreground">Copywriter de Produtos e Classificados</p>
 <p className="text-xs text-muted-foreground">
 Geração e otimização de títulos, fichas técnicas e descrições
 </p>
 </div>
 <Badge variant="outline" className="font-mono text-xs">
 gemini-2.0-flash
 </Badge>
 </div>

 <div className="p-4 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs">
 <div>
 <p className="font-bold text-foreground">Visão Computacional e OCR de Documentos</p>
 <p className="text-xs text-muted-foreground">
 Extração automática de comprovantes de pagamento e CNH/RG
 </p>
 </div>
 <Badge variant="outline" className="font-mono text-xs">
 gemini-2.5-flash
 </Badge>
 </div>
 </div>
 </div>
 </div>
 );
}
