import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Smartphone, Palette, Upload, CheckCircle2, ExternalLink, Layers, Share2 } from 'lucide-react';
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStorePwaConfig, saveStorePwaConfig } from "@/services/pwa.functions";

export const Route = createFileRoute("/workspace/configuracoes/pwa")({
 head: () => ({ meta: [{ title: "Editor de App PWA | Waesy" }] }),
 component: PwaEditorPage,
});

function PwaEditorPage() {
 const queryClient = useQueryClient();
 const [appName, setAppName] = useState("Meu App");
 const [shortName, setShortName] = useState("App");
 const [themeColor, setThemeColor] = useState("#0F172A");
 const [backgroundColor, setBackgroundColor] = useState("#000000");
 const [description, setDescription] = useState("");

 const { data: config, isLoading } = useQuery({
 queryKey: ["store-pwa-config"],
 queryFn: () => getStorePwaConfig(),
 });

 useEffect(() => {
 if (config) {
 setAppName(config.app_name);
 setShortName(config.short_name);
 setThemeColor(config.theme_color);
 setBackgroundColor(config.background_color);
 setDescription(config.description || "");
 }
 }, [config]);

 const saveMutation = useMutation({
 mutationFn: () =>
 saveStorePwaConfig({
 data: {
 appName,
 shortName,
 themeColor,
 backgroundColor,
 description,
 isPublished: true,
 },
 }),
 onSuccess: () => {
 toast.success("App PWA salvo e publicado com sucesso!");
 queryClient.invalidateQueries({ queryKey: ["store-pwa-config"] });
 },
 onError: (err: Error) => {
 toast.error(err.message || "Erro ao salvar PWA.");
 },
 });

 return (
 <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
 <PageHeader
 title="Editor de Aplicativo PWA Próprio"
 description="Transforme sua loja em um aplicativo instalável para Android e iOS com ícone, cores e splash screen da sua marca."
 />

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* Formulário de Configuração Apple HIG */}
 <div className="lg:col-span-7 bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
 <h3 className="font-bold text-base text-foreground">Identidade do Aplicativo</h3>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Nome Completo do App</label>
 <Input
 value={appName}
 onChange={(e) => setAppName(e.target.value)}
 className="min-h-[44px] rounded-xl text-sm"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Nome Curto (Ícone na tela de início)</label>
 <Input
 value={shortName}
 onChange={(e) => setShortName(e.target.value)}
 className="min-h-[44px] rounded-xl text-sm"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Cor da Barra de Status</label>
 <div className="flex gap-2 items-center">
 <input
 type="color"
 value={themeColor}
 onChange={(e) => setThemeColor(e.target.value)}
 className="h-11 w-12 rounded-xl cursor-pointer border border-border"
 />
 <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="min-h-[44px] rounded-xl font-mono text-xs" />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Cor de Fundo da Abertura</label>
 <div className="flex gap-2 items-center">
 <input
 type="color"
 value={backgroundColor}
 onChange={(e) => setBackgroundColor(e.target.value)}
 className="h-11 w-12 rounded-xl cursor-pointer border border-border"
 />
 <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="min-h-[44px] rounded-xl font-mono text-xs" />
 </div>
 </div>
 </div>

 <Button
 onClick={() => saveMutation.mutate()}
 disabled={saveMutation.isPending}
 className="w-full min-h-[48px] rounded-2xl font-bold bg-primary text-primary-foreground shadow-xs"
 >
 <Layers className="h-4 w-4 mr-2" /> Salvar & Publicar Aplicativo PWA
 </Button>
 </div>

 {/* Mockup Interativo de iPhone (Apple HIG Preview) */}
 <div className="lg:col-span-5 flex flex-col items-center">
 <div className="w-[280px] h-[580px] bg-black rounded-[48px] p-3.5 border-4 border-neutral-800 shadow-xs relative flex flex-col">
 {/* Dynamic Island */}
 <div className="h-4 w-24 bg-neutral-900 rounded-full mx-auto mb-4" />

 {/* Tela Interna do Celular */}
 <div 
 style={{ backgroundColor }}
 className="flex-1 rounded-[36px] p-4 flex flex-col items-center justify-between text-center overflow-hidden border border-neutral-800"
 >
 <div className="mt-8 space-y-3 flex flex-col items-center">
 <div 
 style={{ backgroundColor: themeColor }}
 className="h-20 w-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xs"
 >
 {shortName.slice(0, 2).toUpperCase()}
 </div>
 <div>
 <h4 className="font-bold text-base text-white">{appName}</h4>
 <p className="text-[11px] text-neutral-400">Instalável via Safari e Chrome</p>
 </div>
 </div>

 <div className="w-full space-y-2">
 <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-[11px] text-white font-medium flex items-center justify-center gap-1.5">
 <Share2 className="h-3.5 w-3.5" /> Adicionar à Tela de Início
 </div>
 </div>
 </div>
 </div>
 <p className="text-xs text-muted-foreground mt-3">Pré-visualização em tempo real da tela inicial</p>
 </div>
 </div>
 </div>
 );
}
