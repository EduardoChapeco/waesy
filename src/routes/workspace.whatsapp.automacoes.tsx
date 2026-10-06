import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Megaphone, Plus, Save, Send, Pause, Play, Workflow, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listWorkspaceWhatsAppInstances, type WhatsAppChannelInstanceDTO } from "@/services/whatsapp-channel-instances.functions";
import { createWhatsAppCampaign, launchWhatsAppCampaign, listWhatsAppCampaigns, listWhatsAppFlows, createWhatsAppFlow, publishWhatsAppFlow, updateWhatsAppFlow, pauseWhatsAppCampaign } from "@/services/whatsapp-automation.functions";

export const Route = createFileRoute("/workspace/whatsapp/automacoes")({
  head: () => ({ meta: [{ title: "WhatsApp · Automações | Waesy" }] }),
  loader: async () => {
    const [flows, campaigns, instances] = await Promise.all([listWhatsAppFlows().catch(() => []), listWhatsAppCampaigns().catch(() => []), listWorkspaceWhatsAppInstances().catch(() => [])]);
    return { flows, campaigns, instances };
  },
  component: WhatsAppAutomationPage,
});

type FlowNode = { id: string; type: "trigger" | "condition" | "action"; title: string; config: Record<string, any> };
function newFlowNodes(): FlowNode[] { return [{ id: "trigger-inbound", type: "trigger", title: "Mensagem recebida", config: { event: "whatsapp_inbound" } }, { id: "action-handoff", type: "action", title: "Transferir para atendimento", config: { action: "assign_agent" } }]; }

function WhatsAppAutomationPage() {
  const data = Route.useLoaderData();
  const [flows, setFlows] = useState<any[]>(data.flows || []);
  const [campaigns, setCampaigns] = useState<any[]>(data.campaigns || []);
  const [instances] = useState<WhatsAppChannelInstanceDTO[]>(data.instances || []);
  const [selectedFlow, setSelectedFlow] = useState<any>(flows[0] || null);
  const [flowTitle, setFlowTitle] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignTemplate, setCampaignTemplate] = useState("");
  const [campaignLanguage, setCampaignLanguage] = useState("pt_BR");
  const [campaignInstance, setCampaignInstance] = useState("");
  const [busy, setBusy] = useState(false);

  function selectFlow(flow: any) { setSelectedFlow(flow); setFlowTitle(flow.title); setFlowDescription(flow.description || ""); setFlowNodes((flow.nodes || []) as FlowNode[]); }
  async function createFlow() {
    setBusy(true);
    try {
      const created = await createWhatsAppFlow({ data: { title: "Novo fluxo WhatsApp", description: null, nodes: newFlowNodes(), edges: [{ id: "edge-trigger-action", source: "trigger-inbound", target: "action-handoff" }], entryConditions: {}, channelInstanceId: null } });
      setFlows((current) => [created, ...current]); selectFlow(created); toast.success("Fluxo criado como rascunho.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar o fluxo."); } finally { setBusy(false); }
  }
  async function saveFlow() {
    if (!selectedFlow) return;
    setBusy(true);
    try { const updated = await updateWhatsAppFlow({ data: { id: selectedFlow.id, title: flowTitle, description: flowDescription || null, nodes: flowNodes, edges: selectedFlow.edges || [] } }); setFlows((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelectedFlow(updated); toast.success("Fluxo versionado e salvo."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o fluxo."); } finally { setBusy(false); }
  }
  async function toggleFlow() {
    if (!selectedFlow) return;
    setBusy(true);
    try { const updated = await publishWhatsAppFlow({ data: { id: selectedFlow.id, active: selectedFlow.status !== "active" } }); setSelectedFlow((current: any) => ({ ...current, ...updated })); setFlows((current) => current.map((item) => item.id === selectedFlow.id ? { ...item, ...updated } : item)); toast.success(updated.status === "active" ? "Fluxo publicado e ativo." : "Fluxo pausado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar o fluxo."); } finally { setBusy(false); }
  }
  function addAction() { setFlowNodes((current) => [...current, { id: `action-${Date.now()}`, type: "action", title: "Enviar mensagem", config: { action: "send_text", text: "" } }]); }
  async function createCampaign() {
    if (!campaignInstance) return toast.error("Selecione uma instância oficial ativa.");
    setBusy(true);
    try { const campaign = await createWhatsAppCampaign({ data: { name: campaignName || "Nova campanha WhatsApp", description: null, channelInstanceId: campaignInstance, messageType: "template", templateName: campaignTemplate, templateLanguage: campaignLanguage, templateParameters: [], audienceFilter: { consent_status: "opted_in" }, scheduledAt: null } }); setCampaigns((current) => [campaign, ...current]); setCampaignName(""); setCampaignTemplate(""); toast.success("Campanha criada com audiência restrita a opt-in."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar a campanha."); } finally { setBusy(false); }
  }
  async function launchCampaign(id: string) { setBusy(true); try { const result = await launchWhatsAppCampaign({ data: { id } }); setCampaigns((current) => current.map((item) => item.id === id ? { ...item, status: result.queued ? "running" : "completed" } : item)); toast.success(`${result.queued} mensagens entraram na outbox oficial.`); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a campanha."); } finally { setBusy(false); } }
  async function pauseCampaign(id: string) { setBusy(true); try { await pauseWhatsAppCampaign({ data: { id } }); setCampaigns((current) => current.map((item) => item.id === id ? { ...item, status: "paused" } : item)); toast.success("Campanha pausada e itens pendentes cancelados."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível pausar a campanha."); } finally { setBusy(false); } }

  return <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
    <PageHeader eyebrow="Workspace · WhatsApp" title="Automações e campanhas" actions={<Button onClick={createFlow} disabled={busy}><Plus className="mr-2 size-4" />Novo fluxo</Button>} />
    <div className="grid gap-3 md:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><Workflow className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Fluxos WhatsApp</p><p className="text-xl font-semibold">{flows.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><Megaphone className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Campanhas</p><p className="text-xl font-semibold">{campaigns.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><ShieldCheck className="size-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Regra de envio</p><p className="text-sm font-semibold">Opt-in + Meta oficial</p></div></CardContent></Card>
    </div>
    <Tabs defaultValue="flows" className="w-full">
      <TabsList><TabsTrigger value="flows"><Bot className="mr-2 size-4" />Fluxos</TabsTrigger><TabsTrigger value="campaigns"><Megaphone className="mr-2 size-4" />Campanhas</TabsTrigger></TabsList>
      <TabsContent value="flows" className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit"><CardHeader><CardTitle className="text-base">Fluxos publicados</CardTitle><CardDescription>Execução versionada por evento inbound.</CardDescription></CardHeader><CardContent className="space-y-2">{flows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum fluxo criado.</p> : flows.map((flow) => <button key={flow.id} type="button" onClick={() => selectFlow(flow)} className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors ${selectedFlow?.id === flow.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><span className="min-w-0"><span className="block truncate text-sm font-medium">{flow.title}</span><span className="text-xs text-muted-foreground">v{flow.workflow_version || 1} · {flow.status}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>)}</CardContent></Card>
        <Card><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">Editor do fluxo</CardTitle><CardDescription>O runtime grava cada execução e só envia pela outbox.</CardDescription></div>{selectedFlow && <Badge variant={selectedFlow.status === "active" ? "default" : "secondary"}>{selectedFlow.status}</Badge>}</CardHeader><CardContent className="space-y-5">{!selectedFlow ? <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">Crie um fluxo para começar.</div> : <><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Nome</Label><Input value={flowTitle} onChange={(event) => setFlowTitle(event.target.value)} /></div><div className="space-y-2"><Label>Descrição</Label><Input value={flowDescription} onChange={(event) => setFlowDescription(event.target.value)} placeholder="Objetivo do fluxo" /></div></div><div className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Nós executáveis</p><p className="text-xs text-muted-foreground">Trigger, condições e ações são persistidos como versão.</p></div><Button variant="outline" size="sm" onClick={addAction}><Plus className="mr-2 size-4" />Adicionar ação</Button></div><div className="space-y-2">{flowNodes.map((node, index) => <div key={node.id} className="flex items-center gap-3 rounded-md border bg-card p-3"><Badge variant={node.type === "trigger" ? "default" : node.type === "condition" ? "outline" : "secondary"}>{index + 1}</Badge><div className="min-w-0 flex-1"><p className="text-sm font-medium">{node.title}</p><p className="text-xs text-muted-foreground">{node.type} · {node.config?.action || node.config?.event || "regra"}</p></div>{node.config?.action === "send_text" && <Input className="max-w-sm" value={node.config?.text || ""} placeholder="Mensagem de saída" onChange={(event) => setFlowNodes((current) => current.map((item) => item.id === node.id ? { ...item, config: { ...item.config, text: event.target.value } } : item))} />}</div>)}</div></div><div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={toggleFlow} disabled={busy}>{selectedFlow.status === "active" ? <><Pause className="mr-2 size-4" />Pausar</> : <><Play className="mr-2 size-4" />Publicar</>}</Button><Button onClick={saveFlow} disabled={busy}><Save className="mr-2 size-4" />Salvar versão</Button></div></>}</CardContent></Card>
      </TabsContent>
      <TabsContent value="campaigns" className="mt-4 space-y-4">
        <Card><CardHeader><CardTitle className="text-base">Nova campanha oficial</CardTitle><CardDescription>Somente contatos com consentimento opt-in entram na outbox.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-4"><div className="space-y-2"><Label>Nome</Label><Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Ex.: Promoção férias" /></div><div className="space-y-2"><Label>Template Meta</Label><Input value={campaignTemplate} onChange={(event) => setCampaignTemplate(event.target.value)} placeholder="nome_aprovado" /></div><div className="space-y-2"><Label>Idioma</Label><Input value={campaignLanguage} onChange={(event) => setCampaignLanguage(event.target.value)} /></div><div className="space-y-2"><Label>Instância oficial</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={campaignInstance} onChange={(event) => setCampaignInstance(event.target.value)}><option value="">Selecione</option>{instances.filter((item) => item.provider === "meta_cloud_api" && item.is_active).map((item) => <option key={item.id} value={item.id}>{item.display_name} · {item.display_phone_number || item.phone_number_id || "sem número"}</option>)}</select></div><div className="md:col-span-4 flex justify-end"><Button onClick={createCampaign} disabled={busy || !campaignTemplate}><Plus className="mr-2 size-4" />Criar campanha</Button></div></CardContent></Card>
        <div className="grid gap-3">{campaigns.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma campanha criada.</CardContent></Card> : campaigns.map((campaign) => <Card key={campaign.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-medium">{campaign.name}</p><Badge variant={campaign.status === "running" ? "default" : "secondary"}>{campaign.status}</Badge></div><p className="text-xs text-muted-foreground">Template: {campaign.template_name} · audiência: opt-in · criada em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}</p></div><div className="flex gap-2">{campaign.status === "running" ? <Button size="sm" variant="outline" onClick={() => pauseCampaign(campaign.id)} disabled={busy}><Pause className="mr-2 size-4" />Pausar</Button> : <Button size="sm" onClick={() => launchCampaign(campaign.id)} disabled={busy || campaign.status === "completed"}><Send className="mr-2 size-4" />Enviar à outbox</Button>}</div></CardContent></Card>)}</div>
      </TabsContent>
    </Tabs>
  </main>;
}
