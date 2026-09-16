import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Plug, Save, CheckCircle, Trash2, Key, BarChart, Facebook, Calendar, MessageCircle, MapPin, Layers, ShieldCheck } from 'lucide-react';
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

import {
 listIntegrationSettings,
 saveIntegrationCredential,
 deleteIntegrationCredential,
} from "@/services/integrations.functions";
import {
 saveSecretKey,
 listConfiguredSecrets,
} from "@/services/secret-vault.functions";

export const Route = createFileRoute("/workspace/configuracoes/integracoes")({
 head: () => ({ meta: [{ title: "Integrações & APIs | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [integrations, secrets] = await Promise.all([
 listIntegrationSettings().catch(() => []),
 listConfiguredSecrets().catch(() => []),
 ]);
 return { integrations, secrets };
   } catch (err) {
     console.error("[loader:workspace.configuracoes.integracoes] Unhandled loader error:", err);
     return { integrations: null, secrets: null };
   }
 },
 component: IntegrationsPage,
});

function IntegrationCard({
 provider,
 title,
 description,
 icon: Icon,
 fields,
 existingSetting,
 onSave,
 onDelete,
}: any) {
 const [isActive, setIsActive] = useState(existingSetting?.is_active ?? false);
 const [formData, setFormData] = useState<Record<string, string>>({});
 const [isSaving, setIsSaving] = useState(false);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSaving(true);
 try {
 await onSave(provider, formData, isActive);
 toast.success(`${title} configurado com sucesso!`);
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao salvar");
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Card className="bg-card rounded-2xl border border-border/60 shadow-none">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-muted rounded-xl text-muted-foreground">
 <Icon className="size-5" />
 </div>
 <div>
 <CardTitle className="text-lg flex items-center gap-2">
 {title}
 {existingSetting?.is_active ? (
 <Badge variant="default" className="text-[10px] bg-emerald-600">
 Ativo
 </Badge>
 ) : (
 <Badge variant="outline" className="text-[10px] text-muted-foreground">
 Não Configurado
 </Badge>
 )}
 </CardTitle>
 <CardDescription>{description}</CardDescription>
 </div>
 </div>
 <Switch checked={isActive} onCheckedChange={(checked) => setIsActive(checked)} />
 </div>
 </CardHeader>

 {isActive && (
 <form onSubmit={handleSave}>
 <CardContent className="space-y-4 pt-4">
 {existingSetting?.is_active && (
 <div className="bg-success/10 text-success-foreground p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
 <CheckCircle className="size-4" />
 Esta integração está configurada e protegida. Você pode reescrever as chaves abaixo.
 </div>
 )}
 {fields.map((field: any) => (
 <div key={field.key} className="space-y-2">
 <Label htmlFor={`${provider}-${field.key}`}>{field.label}</Label>
 <Input
 id={`${provider}-${field.key}`}
 type={field.type || "text"}
 placeholder={field.placeholder}
 required={!existingSetting?.is_active} // Required only if not already saved
 value={formData[field.key] || ""}
 onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
 className="rounded-xl border-border/60"
 />
 </div>
 ))}
 </CardContent>
 <CardFooter className="flex justify-between pt-4 pb-4 border-t border-border/40">
 {existingSetting ? (
 <Button
 type="button"
 variant="destructive"
 size="sm"
 onClick={() => onDelete(provider)}
 className="rounded-xl"
 >
 <Trash2 className="size-4 mr-2" />
 Remover
 </Button>
 ) : (
 <div />
 )}
 <Button type="submit" size="sm" disabled={isSaving} className="rounded-xl font-bold">
 <Save className="size-4 mr-2" />
 {isSaving ? "Salvando..." : "Salvar Configuração"}
 </Button>
 </CardFooter>
 </form>
 )}
 </Card>
 );
}

function SecretVaultCard({ provider, title, description, icon: Icon, existingSecret, onSave }: any) {
 const [isActive, setIsActive] = useState(!!existingSecret);
 const [secretKey, setSecretKey] = useState("");
 const [isSaving, setIsSaving] = useState(false);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSaving(true);
 try {
 await onSave(provider, secretKey);
 setSecretKey("");
 setIsActive(true);
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Card className="bg-card rounded-2xl border border-dashed border-primary/40 shadow-none">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-primary/10 rounded-xl text-primary">
 <Icon className="size-5" />
 </div>
 <div>
 <CardTitle className="text-lg flex items-center gap-2">
 {title}
 {existingSecret ? (
 <Badge variant="default" className="text-[10px] bg-primary">Ativo</Badge>
 ) : (
 <Badge variant="outline" className="text-[10px] text-muted-foreground">Requer Configuração</Badge>
 )}
 </CardTitle>
 <CardDescription>{description}</CardDescription>
 </div>
 </div>
 <Switch checked={isActive} onCheckedChange={(checked) => setIsActive(checked)} />
 </div>
 </CardHeader>

 {isActive && (
 <form onSubmit={handleSave}>
 <CardContent className="space-y-4 pt-4">
 {existingSecret && (
 <div className="bg-primary/10 text-primary-foreground p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
 <CheckCircle className="size-4" />
 <span className="text-primary font-medium">Chave configurada: {existingSecret.masked_suffix}</span>
 </div>
 )}
 <div className="space-y-2">
 <Label htmlFor={`${provider}-key`}>Chave da API (API Key)</Label>
 <Input
 id={`${provider}-key`}
 type="password"
 placeholder="sk-..."
 required
 value={secretKey}
 onChange={(e) => setSecretKey(e.target.value)}
 />
 <p className="text-[10px] text-muted-foreground">Esta chave será encriptada e guardada no cofre seguro. Nenhuma API Key vaza para o navegador.</p>
 </div>
 </CardContent>
 <CardFooter className="flex justify-end pt-4 pb-4">
 <Button type="submit" size="sm" disabled={isSaving}>
 <Save className="size-4 mr-2" />
 {isSaving ? "Salvando..." : "Salvar no Cofre (BYOK)"}
 </Button>
 </CardFooter>
 </form>
 )}
 </Card>
 );
}

function IntegrationsPage() {
 const { integrations: settings, secrets } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const handleSaveSecret = async (provider: string, secretKey: string) => {
 try {
 await saveSecretKey({
 data: {
 provider: provider as any,
 label: `Chave ${provider} Pessoal`,
 secretKey,
 scope: "personal",
 dailyBudgetCents: 5000,
 },
 });
 toast.success("Chave salva com segurança no Cofre!");
 router.invalidate();
 } catch (e: any) {
 toast.error(e?.message || "Erro ao salvar no cofre.");
 }
 };

 const handleSave = async (
 provider: string,
 tokenPayload: Record<string, string>,
 isActive: boolean,
 ) => {
 const cleanPayload = Object.fromEntries(
 Object.entries(tokenPayload).filter(([_, v]) => v.trim() !== ""),
 );
 await saveIntegrationCredential({ data: { provider, tokenPayload: cleanPayload, isActive } });
 router.invalidate();
 };

 const handleDelete = async (provider: string) => {
 try {
 await deleteIntegrationCredential({ data: { provider } });
 toast.success("Integração removida.");
 router.invalidate();
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao remover");
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 <PageHeader title="Integrações" />
 <p className="text-muted-foreground">
 Conecte sua loja e comunidade com serviços de logística, mensagens, agenda e ferramentas de
 growth.
 </p>

 <div className="grid lg:grid-cols-2 gap-6">
 <SecretVaultCard
 provider="gemini"
 title="Google Gemini AI"
 description="Modelos de IA generativa do Google (Pro, Flash). Usado para geração de descrições e curadoria de conteúdo."
 icon={Layers}
 existingSecret={secrets.find((s: any) => s.provider === "gemini" && s.is_active)}
 onSave={handleSaveSecret}
 />

 <SecretVaultCard
 provider="openai"
 title="OpenAI (ChatGPT)"
 description="Modelos GPT-4o e GPT-4o-mini. Alternativa de IA generativa (Traga sua Própria Chave)."
 icon={Layers}
 existingSecret={secrets.find((s: any) => s.provider === "openai" && s.is_active)}
 onSave={handleSaveSecret}
 />

 <IntegrationCard
 provider="whatsapp_cloud_api"
 title="WhatsApp Cloud API (Oficial)"
 description="Disparo automatizado de status de pedidos, agendamentos e propostas diretas de negociação."
 icon={MessageCircle}
 existingSetting={settings.find((s: any) => s.provider === "whatsapp_cloud_api")}
 onSave={handleSave}
 onDelete={handleDelete}
 fields={[
 {
 key: "phone_number_id",
 label: "Phone Number ID",
 placeholder: "Ex: 10492837492847",
 },
 {
 key: "business_account_id",
 label: "WhatsApp Business Account ID",
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
 title="Assinatura Eletrônica Avançada GOV.BR"
 description="Validação de identidade com conta Gov.br (Nível Prata ou Ouro) com presunção legal expressa pela Lei nº 14.063/2020. Quando desativado, o botão do Gov.br não é exibido nas assinaturas públicas."
 icon={ShieldCheck}
 existingSetting={settings.find((s: any) => s.provider === "govbr_signature")}
 onSave={handleSave}
 onDelete={handleDelete}
 fields={[
 {
 key: "client_id",
 label: "Client ID da Aplicação (Portal Gov.br)",
 placeholder: "Ex: waesy-signature-app",
 },
 {
 key: "client_secret",
 label: "Client Secret (Chave Secreta OAuth2)",
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
 label: "URL de Retorno Autorizada (Callback OAuth)",
 placeholder: "https://waesy.com/api/auth/govbr/callback",
 },
 ]}
 />

 <IntegrationCard
 provider="google_calendar_sync"
 title="Google Calendar Sync"
 description="Sincronização bidirecional de agendamentos e eventos comunitários."
 icon={Calendar}
 existingSetting={settings.find((s: any) => s.provider === "google_calendar_sync")}
 onSave={handleSave}
 onDelete={handleDelete}
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

 <IntegrationCard
 provider="melhor_envio"
 title="Melhor Envio"
 description="Cotação de frete em tempo real e geração de etiquetas de envio."
 icon={Key}
 existingSetting={settings.find((s: any) => s.provider === "melhor_envio")}
 onSave={handleSave}
 onDelete={handleDelete}
 fields={[
 {
 key: "api_token",
 label: "Token de Acesso (API Token)",
 type: "password",
 placeholder: "Bearer eyJhbGciOiJIUzI1Ni...",
 },
 ]}
 />

 <IntegrationCard
 provider="google_merchant_center"
 title="Google Merchant Center"
 description="Ative esta integração para habilitar o feed XML de produtos (api/feed/xml)."
 icon={BarChart}
 existingSetting={settings.find((s: any) => s.provider === "google_merchant_center")}
 onSave={handleSave}
 onDelete={handleDelete}
 fields={[
 {
 key: "merchant_id",
 label: "Merchant ID (Apenas Referência)",
 placeholder: "123456789",
 },
 ]}
 />

 <IntegrationCard
 provider="meta_pixel"
 title="Meta Pixel"
 description="Rastreamento de conversões para Facebook e Instagram Ads."
 icon={Facebook}
 existingSetting={settings.find((s: any) => s.provider === "meta_pixel")}
 onSave={handleSave}
 onDelete={handleDelete}
 fields={[
 { key: "pixel_id", label: "ID do Pixel", placeholder: "123456789012345" },
 {
 key: "access_token",
 label: "API de Conversões (Access Token)",
 type: "password",
 placeholder: "EAAB...",
 },
 ]}
 />

 <IntegrationCard
 provider="map_service"
 title="Mapas & Geolocalização"
 description="Configuração do provedor de mapas para corridas, entregas, rotas e visualização geográfica."
 icon={MapPin}
 existingSetting={settings.find((s: any) => s.provider === "map_service")}
 onSave={handleSave}
 onDelete={handleDelete}
 fields={[
 {
 key: "provider",
 label: "Provedor de Mapas (open_street_map | mapbox | google_maps)",
 placeholder: "open_street_map",
 },
 {
 key: "api_key",
 label: "Chave de API / Token de Acesso (opcional para OpenStreetMap)",
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
 </div>
 );
}
