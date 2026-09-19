import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Layers, Bot, Key, CheckCircle2, AlertCircle, Clock, Trash2, RefreshCw, Plus, ShieldCheck, Zap, Sliders, ExternalLink } from 'lucide-react';

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";

import { getStoreSettings, saveStoreSettings } from "@/services/store.functions";
import {
 listTenantAiProviders,
 saveTenantAiProvider,
 deleteTenantAiProvider,
 testAiProviderConnection,
 type TenantAiProviderItem,
 type AiProviderType,
} from "@/services/ai-providers.functions";

export const Route = createFileRoute(
 "/workspace/configuracoes/inteligencia-artificial"
)({
 head: () => ({ meta: [{ title: "Inteligência Artificial & Chaves | Workspace" }] }),
 loader: async () => {
   try {
 const store = await getStoreSettings().catch(() => null);
 const storeId = store?.id || "";
 const providers = storeId
 ? await listTenantAiProviders({ data: { store_id: storeId } }).catch(() => [])
 : [];
 return { store, initialProviders: providers };
   } catch (err) {
     console.error("[loader:workspace.configuracoes.inteligencia-artificial] Unhandled loader error:", err);
     return { store: null, initialProviders: null };
   }
 },
 component: WorkspaceAiSettingsPage,
});

const DEFAULT_MODELS: Record<AiProviderType, { defaultModel: string; label: string }> = {
 openai: { defaultModel: "gpt-4o", label: "OpenAI (GPT-4o / GPT-4o-mini)" },
 anthropic: { defaultModel: "claude-3-5-sonnet-latest", label: "Anthropic (Claude 3.5 Sonnet)" },
 gemini: { defaultModel: "gemini-1.5-pro", label: "Google Gemini (1.5 Pro / Flash)" },
 deepseek: { defaultModel: "deepseek-chat", label: "DeepSeek (V3 / R1)" },
 groq: { defaultModel: "llama-3.3-70b-versatile", label: "Groq (Llama 3.3 Ultra-rápido)" },
 custom: { defaultModel: "custom-model", label: "Provedor Compatível com OpenAI" },
};

function WorkspaceAiSettingsPage() {
 const { store, initialProviders } = (Route.useLoaderData as any)();
 const storeId = store?.id || "";

 const [providers, setProviders] = useState<TenantAiProviderItem[]>(initialProviders || []);
 const [testingProvider, setTestingProvider] = useState<string | null>(null);

 // Knowledge Base State
 const [aiKnowledgeBase, setAiKnowledgeBase] = useState(store?.ai_knowledge_base || "");
 const [savingKb, setSavingKb] = useState(false);

 // Modal
 const [modalOpen, setModalOpen] = useState(false);
 const [selectedProvider, setSelectedProvider] = useState<AiProviderType>("openai");
 const [modelName, setModelName] = useState(DEFAULT_MODELS.openai.defaultModel);
 const [apiKey, setApiKey] = useState("");
 const [tokenLimitStr, setTokenLimitStr] = useState("");
 const [submitting, setSubmitting] = useState(false);

 const reload = async () => {
 if (!storeId) return;
 try {
 const data = await listTenantAiProviders({ data: { store_id: storeId } });
 setProviders(data);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao atualizar provedores de IA");
 }
 };

 const handleOpenModal = (prov: AiProviderType) => {
 setSelectedProvider(prov);
 setModelName(DEFAULT_MODELS[prov].defaultModel);
 setApiKey("");
 setTokenLimitStr("");
 setModalOpen(true);
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!apiKey.trim()) return toast.error("Informe a chave de API");

 try {
 setSubmitting(true);
 await saveTenantAiProvider({
 data: {
 store_id: storeId,
 provider: selectedProvider,
 model_name: modelName.trim(),
 api_key: apiKey.trim(),
 monthly_token_limit: tokenLimitStr ? parseInt(tokenLimitStr) : null,
 is_active: true,
 },
 });

 toast.success("Provedor de IA configurado com sucesso!");
 setModalOpen(false);
 reload();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar provedor");
 } finally {
 setSubmitting(false);
 }
 };

 const handleTest = async (provider: AiProviderType) => {
 try {
 setTestingProvider(provider);
 const res = await testAiProviderConnection({
 data: { store_id: storeId, provider },
 });
 toast.success(`Conexão bem-sucedida! Latência: ${res.latencyMs}ms`);
 reload();
 } catch (err: any) {
 toast.error(err?.message || "Falha no teste de conexão.");
 reload();
 } finally {
 setTestingProvider(null);
 }
 };

 const handleDelete = async (provider: string) => {
 if (!window.confirm("Deseja remover esta chave de API?")) return;
 try {
 await deleteTenantAiProvider({ data: { store_id: storeId, provider } });
 toast.success("Chave removida");
 reload();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao remover chave");
 }
 };

 const handleSaveKnowledgeBase = async () => {
 if (!store?.name) return;
 try {
 setSavingKb(true);
 await saveStoreSettings({
 data: {
 name: store.name,
 ai_knowledge_base: aiKnowledgeBase.trim(),
 },
 });
 toast.success("Base de conhecimento salva com sucesso!");
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar base de conhecimento.");
 } finally {
 setSavingKb(false);
 }
 };

 const configuredMap = new Map<string, TenantAiProviderItem>(
 providers.map((p) => [p.provider, p])
 );

 return (
 <div className="w-full space-y-6">
 {/* ── 1. Header ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
 Configurações de IA
 </h1>
 <Badge variant="outline" className="text-[10px] font-mono gap-1 text-primary">
 <Layers className="size-3" /> BYOK (Bring Your Own Key)
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 Conecte suas próprias chaves de API para alimentar assistentes de atendimento, cotações automáticas e resumos.
 </p>
 </div>

 <Link to="/workspace/configuracoes/integracoes">
 <Button variant="outline" size="sm" className="h-9 px-3.5 text-xs font-semibold rounded-xl gap-2 cursor-pointer border-border/70 hover:bg-muted/50">
 <Sliders className="size-3.5 text-primary" />
 Central de Integrações & APIs
 <ExternalLink className="size-3 text-muted-foreground" />
 </Button>
 </Link>
 </div>

 {/* ── 2. Grid de Provedores Suportados ── */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {(Object.keys(DEFAULT_MODELS) as AiProviderType[]).map((prov) => {
 const config = configuredMap.get(prov);
 const meta = DEFAULT_MODELS[prov];
 const isConfigured = Boolean(config);
 const isTesting = testingProvider === prov;

 return (
 <div
 key={prov}
 className={`p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
 isConfigured
 ? "bg-card border-border/80 shadow-xs"
 : "bg-muted/10 border-dashed border-border/70 opacity-80"
 }`}
 >
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Bot className="size-4" />
 </div>
 <strong className="text-xs sm:text-sm font-bold text-foreground">
 {meta.label.split("(")[0].trim()}
 </strong>
 </div>

 {isConfigured ? (
 config?.status === "active" ? (
 <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] gap-1">
 <CheckCircle2 className="size-3" /> Conectado
 </Badge>
 ) : config?.status === "error" ? (
 <Badge variant="destructive" className="text-[10px] gap-1">
 <AlertCircle className="size-3" /> Erro
 </Badge>
 ) : (
 <Badge variant="outline" className="text-[10px] font-mono">
 Não Testado
 </Badge>
 )
 ) : (
 <Badge variant="secondary" className="text-[10px] font-mono">
 Não Configurado
 </Badge>
 )}
 </div>

 {isConfigured ? (
 <div className="space-y-1 text-xs">
 <p className="text-muted-foreground">
 Modelo: <strong className="text-foreground font-mono">{config!.model_name}</strong>
 </p>
 <p className="text-muted-foreground font-mono text-[11px]">
 Chave: {config!.api_key_masked}
 </p>
 {config?.last_tested_at && (
 <p className="text-[10px] text-muted-foreground">
 Testado em: {new Date(config.last_tested_at).toLocaleString()}
 </p>
 )}
 </div>
 ) : (
 <p className="text-xs text-muted-foreground">
 Chave ainda não inserida. Clique abaixo para configurar.
 </p>
 )}
 </div>

 {/* Ações */}
 <div className="pt-2 flex items-center gap-2 border-t border-border/50">
 {isConfigured ? (
 <>
 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={isTesting}
 onClick={() => handleTest(prov)}
 className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
 >
 <Zap className={`size-3.5 ${isTesting ? "animate-spin text-primary" : ""}`} />
 {isTesting ? "Testando..." : "Testar"}
 </Button>

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleOpenModal(prov)}
 className="h-9 px-3 rounded-xl text-xs cursor-pointer"
 >
 Editar
 </Button>

 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(prov)}
 className="size-9 rounded-xl text-muted-foreground hover:text-rose-600 cursor-pointer"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </>
 ) : (
 <Button
 type="button"
 onClick={() => handleOpenModal(prov)}
 className="w-full h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
 >
 <Plus className="size-3.5" /> Configurar Chave
 </Button>
 )}
 </div>
 </div>
 );
 })}
      </div>

      {/* ── 3. Base de Conhecimento e DNA da IA ── */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-xs mt-8">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            DNA & Base de Conhecimento da Loja
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Instruções globais que todos os agentes de IA (SDRs) da sua loja devem seguir. Defina o tom de voz, regras de negociação, políticas de devolução e garantias.
          </p>
        </div>
        <Textarea
          value={aiKnowledgeBase}
          onChange={(e) => setAiKnowledgeBase(e.target.value)}
          placeholder="Ex: O tom de voz deve ser amigável e focado em fechar vendas. Nunca ofereça descontos maiores que 15%. Informe que o frete grátis é apenas para compras acima de R$ 200..."
          rows={6}
          className="text-xs rounded-xl bg-muted/40 border-dashed focus-visible:ring-primary/50 resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSaveKnowledgeBase}
            disabled={savingKb}
            className="h-9 rounded-xl text-xs font-bold gap-2 px-6 cursor-pointer"
          >
            {savingKb ? "Salvando..." : "Salvar DNA da IA"}
          </Button>
        </div>
      </div>

      {/* ── 4. Modal de Configuração ── */}
 <Dialog open={modalOpen} onOpenChange={setModalOpen}>
 <DialogContent className="sm:max-w-md rounded-2xl border-border/70 bg-card p-5 space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <Key className="size-4 text-primary" />
 Configurar {DEFAULT_MODELS[selectedProvider]?.label.split("(")[0].trim()}
 </DialogTitle>
 </DialogHeader>

 <form onSubmit={handleSave} className="space-y-3.5">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Modelo Principal *</label>
 <Input
 value={modelName}
 onChange={(e) => setModelName(e.target.value)}
 placeholder="Ex: gpt-4o ou claude-3-5-sonnet"
 className="h-10 text-xs rounded-xl font-mono"
 required
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Chave de API (Secret Key) *</label>
 <Input
 type="password"
 value={apiKey}
 onChange={(e) => setApiKey(e.target.value)}
 placeholder="sk-proj-..."
 className="h-10 text-xs rounded-xl font-mono"
 required
 autoFocus
 />
 <p className="text-[10px] text-muted-foreground">
 Sua chave fica protegida com isolamento por tenant no banco de dados.
 </p>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">
 Limite Mensal de Tokens (opcional)
 </label>
 <Input
 type="number"
 value={tokenLimitStr}
 onChange={(e) => setTokenLimitStr(e.target.value)}
 placeholder="Ex: 500000"
 className="h-10 text-xs rounded-xl font-mono"
 />
 </div>

 <DialogFooter className="pt-2">
 <Button
 type="submit"
 disabled={submitting || !apiKey.trim()}
 className="w-full h-10 rounded-xl text-xs font-bold cursor-pointer"
 >
 {submitting ? "Salvando..." : "Salvar e Habilitar Provedor"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
