import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Megaphone, Plus, Save, Send, Pause, Play, Workflow, ShieldCheck, ChevronRight, FileText, Car, Plane, ShoppingBag, Smartphone, GitBranch, MessageSquare, ListChecks, CheckCheck, Pencil, Trash2 } from "lucide-react";
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
import { listStoreQuickAnswers, createStoreQuickAnswer, deleteStoreQuickAnswer } from "@/services/chat-operations.functions";

const TEMPLATE_CATEGORIES = [
  { value: "boas_vindas", label: "Boas-vindas" },
  { value: "cobranca", label: "Cobrança" },
  { value: "confirmacao", label: "Confirmação" },
  { value: "pos_venda", label: "Pós-venda" },
  { value: "orcamento", label: "Orçamento" },
  { value: "geral", label: "Geral" },
];

export const Route = createFileRoute("/workspace/whatsapp/automacoes")({
  head: () => ({ meta: [{ title: "WhatsApp · Automações | Waesy" }] }),
  loader: async () => {
    const [flows, campaigns, instances, templates] = await Promise.all([
      listWhatsAppFlows().catch(() => []),
      listWhatsAppCampaigns().catch(() => []),
      listWorkspaceWhatsAppInstances().catch(() => []),
      listStoreQuickAnswers({ data: {} }).catch(() => []),
    ]);
    return { flows, campaigns, instances, templates };
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
  const [templates, setTemplates] = useState<any[]>(data.templates || []);
  const [selectedFlow, setSelectedFlow] = useState<any>(flows[0] || null);
  const [flowTitle, setFlowTitle] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignTemplate, setCampaignTemplate] = useState("");
  const [campaignLanguage, setCampaignLanguage] = useState("pt_BR");
  const [campaignInstance, setCampaignInstance] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [tplName, setTplName] = useState("confirmacao_pedido_waesy");
  const [tplHeader, setTplHeader] = useState("Pedido Confirmado na Loja");
  const [tplCategory, setTplCategory] = useState("confirmacao");
  const [tplCategoryFilter, setTplCategoryFilter] = useState("all");
  const [tplBody, setTplBody] = useState("Olá {{nome_cliente}}, seu pedido {{numero_pedido}} foi confirmado! Acompanhe ou finalize em {{link_pagamento}}.");
  const [tplFooter, setTplFooter] = useState("Waesy Omnichannel · Atendimento Verificado");
  const [tplButtons, setTplButtons] = useState<string[]>(["Rastrear Entrega", "Falar com Atendente"]);

  async function handleSaveTemplate() {
    if (!tplName.trim() || !tplBody.trim()) {
      toast.error("Informe o identificador do atalho e o corpo da mensagem.");
      return;
    }
    setBusy(true);
    try {
      const saved = await createStoreQuickAnswer({
        data: {
          id: editingTplId || undefined,
          shortcut: tplName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
          title: tplHeader.trim() || tplName.trim(),
          message: tplBody.trim(),
          category: tplCategory,
        },
      });
      setTemplates((prev) => {
        const exists = prev.some((item) => item.id === saved.id || item.shortcut === saved.shortcut);
        if (exists) {
          return prev.map((item) => (item.id === saved.id || item.shortcut === saved.shortcut ? saved : item));
        }
        return [saved, ...prev];
      });
      setCampaignTemplate(saved.shortcut);
      setEditingTplId(null);
      toast.success(editingTplId ? "Template atualizado no banco de dados!" : "Template persistido na biblioteca e disponível no Chat (/atalho)!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar template.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    setBusy(true);
    try {
      await deleteStoreQuickAnswer({ data: { id } });
      setTemplates((prev) => prev.filter((item) => item.id !== id));
      if (editingTplId === id) setEditingTplId(null);
      toast.success("Template removido da biblioteca.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir template.");
    } finally {
      setBusy(false);
    }
  }

  function handleEditTemplate(tpl: any) {
    setEditingTplId(tpl.id);
    setTplName(tpl.shortcut || "");
    setTplHeader(tpl.title || "");
    setTplBody(tpl.message || "");
    setTplCategory(tpl.category || "geral");
  }

  function addNodeType(type: FlowNode["type"], title: string, action: string) {
    setFlowNodes((current) => [...current, { id: `${type}-${Date.now()}`, type, title, config: { action, text: "" } }]);
  }

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

  
  const newFlowButton = (
    <Button
      onClick={createFlow}
      disabled={busy}
      className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Plus className="mr-2 size-4" />
      Novo fluxo
    </Button>
  );

  return <main className="flex w-full flex-col gap-6 p-4 sm:p-6">
    <PageHeader eyebrow="Workspace · WhatsApp" title="Automações e campanhas" actions={newFlowButton} />
    <div className="grid gap-3 md:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><Workflow className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Fluxos WhatsApp</p><p className="text-xl font-semibold">{flows.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><Megaphone className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Campanhas</p><p className="text-xl font-semibold">{campaigns.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><ShieldCheck className="size-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Regra de envio</p><p className="text-sm font-semibold">Opt-in + Meta oficial</p></div></CardContent></Card>
    </div>
    <Tabs defaultValue="flows" className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1 p-1"><TabsTrigger value="flows" className="h-11 min-h-11"><Bot className="mr-2 size-4" />Fluxos Visuais</TabsTrigger><TabsTrigger value="templates" className="h-11 min-h-11"><FileText className="mr-2 size-4" />Templates & Botões</TabsTrigger><TabsTrigger value="concierge" className="h-11 min-h-11"><Car className="mr-2 size-4" />Mobilidade, Catálogo & Aéreo</TabsTrigger><TabsTrigger value="campaigns" className="h-11 min-h-11"><Megaphone className="mr-2 size-4" />Campanhas</TabsTrigger></TabsList>
      <TabsContent value="flows" className="mt-4 grid gap-4 lg:grid-cols-12">
        <Card className="h-fit lg:col-span-4"><CardHeader><CardTitle className="text-base">Fluxos publicados</CardTitle><CardDescription>Execução versionada por evento inbound.</CardDescription></CardHeader><CardContent className="space-y-2">{flows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum fluxo criado.</p> : flows.map((flow) => <button key={flow.id} type="button" onClick={() => selectFlow(flow)} className={`flex w-full min-h-11 items-center justify-between rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedFlow?.id === flow.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><span className="min-w-0"><span className="block truncate text-sm font-medium">{flow.title}</span><span className="text-xs text-muted-foreground">v{flow.workflow_version || 1} · {flow.status}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>)}</CardContent></Card>
        <Card className="lg:col-span-8"><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">Editor Visual de Fluxo</CardTitle><CardDescription>Adicione blocos da paleta abaixo; o runtime grava cada execução e despacha pela outbox.</CardDescription></div>{selectedFlow && <Badge variant={selectedFlow.status === "active" ? "default" : "secondary"}>{selectedFlow.status}</Badge>}</CardHeader><CardContent className="space-y-5">{!selectedFlow ? <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">Crie um fluxo para começar.</div> : <><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Nome</Label><Input value={flowTitle} onChange={(event) => setFlowTitle(event.target.value)} className="h-11" /></div><div className="space-y-2"><Label>Descrição</Label><Input value={flowDescription} onChange={(event) => setFlowDescription(event.target.value)} placeholder="Objetivo do fluxo" className="h-11" /></div></div><div className="rounded-lg bg-muted/20 p-3 space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paleta de Nós (Clique para inserir no Canvas)</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Enviar Texto / Variáveis", "send_text")}><MessageSquare className="size-3.5 text-primary" />Texto</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Enviar Botões Interativos", "send_buttons")}><MessageSquare className="size-3.5 text-emerald-600" />Botões (iOS/Web)</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Enviar Lista de Opções", "send_list")}><ListChecks className="size-3.5 text-warning-strong" />Menu Lista</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("condition", "Roteador / Ramificação (Keyword)", "branch_condition")}><GitBranch className="size-3.5 text-purple-600" />Condição / Branch</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Acionar Agente IA SDR (Skills + Dados)", "ai_sdr_reply")}><Bot className="size-3.5 text-primary" />IA SDR + Catálogo</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Transferir para Setor / Humano", "assign_agent")}><Workflow className="size-3.5 text-blue-600" />Transbordo Setor</Button></div></div><div className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Canvas de Nós Conectados ({flowNodes.length})</p><p className="text-xs text-muted-foreground">Variáveis suportadas: {"{{nome_cliente}}"}, {"{{senderName}}"}, {"{{senderMobile}}"}, {"{{numero_pedido}}"}</p></div><Button variant="outline" size="sm" className="h-11 min-h-11" onClick={addAction}><Plus className="mr-2 size-4" />Adicionar ação</Button></div><div className="space-y-2">{flowNodes.map((node, index) => <div key={node.id} className="flex items-center gap-3 rounded-md border border-border/70 p-3"><Badge variant={node.type === "trigger" ? "default" : node.type === "condition" ? "outline" : "secondary"}>{index + 1}</Badge><div className="min-w-0 flex-1"><p className="text-sm font-medium">{node.title}</p><p className="text-xs text-muted-foreground">{node.type} · {node.config?.action || node.config?.event || "regra"}</p></div>{(node.config?.action === "send_text" || node.config?.action === "send_buttons" || node.config?.action === "send_list" || node.config?.action === "branch_condition") && <Input className="max-w-sm h-11" value={node.config?.text || ""} placeholder="Texto, opções separadas por vírgula ou regra..." onChange={(event) => setFlowNodes((current) => current.map((item) => item.id === node.id ? { ...item, config: { ...item.config, text: event.target.value } } : item))} />}</div>)}</div></div><div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" className="h-11 min-h-11" onClick={toggleFlow} disabled={busy}>{selectedFlow.status === "active" ? <><Pause className="mr-2 size-4" />Pausar</> : <><Play className="mr-2 size-4" />Publicar</>}</Button><Button className="h-11 min-h-11" onClick={saveFlow} disabled={busy}><Save className="mr-2 size-4" />Salvar versão</Button></div></>}</CardContent></Card>
      </TabsContent>
      <TabsContent value="campaigns" className="mt-4 space-y-4">
        <Card><CardHeader><CardTitle className="text-base">Nova campanha oficial</CardTitle><CardDescription>Somente contatos com consentimento opt-in entram na outbox.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-4"><div className="space-y-2"><Label>Nome</Label><Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Ex.: Promoção férias" className="h-11" /></div><div className="space-y-2"><Label>Template Meta</Label><Input value={campaignTemplate} onChange={(event) => setCampaignTemplate(event.target.value)} placeholder="nome_aprovado" className="h-11" /></div><div className="space-y-2"><Label>Idioma</Label><Input value={campaignLanguage} onChange={(event) => setCampaignLanguage(event.target.value)} className="h-11" /></div><div className="space-y-2"><Label>Instância oficial</Label><select className="h-11 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={campaignInstance} onChange={(event) => setCampaignInstance(event.target.value)}><option value="">Selecione</option>{instances.filter((item) => item.provider === "meta_cloud_api" && item.is_active).map((item) => <option key={item.id} value={item.id}>{item.display_name} · {item.display_phone_number || item.phone_number_id || "sem número"}</option>)}</select></div><div className="md:col-span-4 flex justify-end"><Button className="h-11 min-h-11" onClick={createCampaign} disabled={busy || !campaignTemplate}><Plus className="mr-2 size-4" />Criar campanha</Button></div></CardContent></Card>
        <div className="grid gap-3">{campaigns.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma campanha criada.</CardContent></Card> : campaigns.map((campaign) => <Card key={campaign.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-medium">{campaign.name}</p><Badge variant={campaign.status === "running" ? "default" : "secondary"}>{campaign.status}</Badge></div><p className="text-xs text-muted-foreground">Template: {campaign.template_name} · audiência: opt-in · criada em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}</p></div><div className="flex gap-2">{campaign.status === "running" ? <Button size="sm" variant="outline" className="h-11 min-h-11" onClick={() => pauseCampaign(campaign.id)} disabled={busy}><Pause className="mr-2 size-4" />Pausar</Button> : <Button size="sm" className="h-11 min-h-11" onClick={() => launchCampaign(campaign.id)} disabled={busy || campaign.status === "completed"}><Send className="mr-2 size-4" />Enviar à outbox</Button>}</div></CardContent></Card>)}</div>
      </TabsContent>
      <TabsContent value="templates" className="mt-4 grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">{editingTplId ? "Editar Template de WhatsApp" : "Construtor de Templates & Atalhos"}</CardTitle>
            <CardDescription>Persistido no banco de dados e sincronizado com o comando /atalho do Chat Omnichannel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2"><Label className="text-xs">Atalho (/slug)</Label><Input value={tplName} onChange={(e) => setTplName(e.target.value)} className="h-11 text-xs font-mono" /></div>
              <div className="space-y-2"><Label className="text-xs">Título / Cabeçalho</Label><Input value={tplHeader} onChange={(e) => setTplHeader(e.target.value)} className="h-11 text-xs" /></div>
              <div className="space-y-2">
                <Label className="text-xs">Categoria</Label>
                <select
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value)}
                  className="h-11 min-h-11 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-xs">Corpo da Mensagem (Variáveis dinâmicas)</Label>
                <div className="flex flex-wrap gap-2">
                  {["{{nome_cliente}}", "{{numero_pedido}}", "{{link_pagamento}}", "{{loja}}"].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => setTplBody((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}${token}`)}
                      className="h-11 min-h-11 px-3 rounded-md border border-border bg-muted/40 hover:bg-muted text-xs font-mono text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)} rows={4} className="text-xs" />
            </div>
            <div className="space-y-2"><Label className="text-xs">Rodapé (Footer)</Label><Input value={tplFooter} onChange={(e) => setTplFooter(e.target.value)} className="h-11 text-xs" /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-xs">Botões de Resposta Rápida / CTA (Máx. 3)</Label><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs" onClick={() => tplButtons.length < 3 && setTplButtons([...tplButtons, `Opção ${tplButtons.length + 1}`])}><Plus className="mr-1 size-3.5" />Adicionar Botão</Button></div>
              <div className="grid gap-2 sm:grid-cols-3">{tplButtons.map((btn, idx) => <Input key={idx} value={btn} onChange={(e) => setTplButtons(tplButtons.map((b, i) => i === idx ? e.target.value : b))} className="h-11 text-xs" />)}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {editingTplId && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-11 text-xs"
                  onClick={() => {
                    setEditingTplId(null);
                    setTplName("");
                    setTplHeader("");
                    setTplBody("");
                  }}
                >
                  Cancelar Edição
                </Button>
              )}
              <Button type="button" disabled={busy} className="h-11 min-h-11 text-xs font-semibold" onClick={handleSaveTemplate}>
                <Save className="mr-2 size-4" />
                {editingTplId ? "Atualizar Template" : "Salvar Template na Biblioteca"}
              </Button>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold">Biblioteca da Loja ({templates.length})</p>
                <div className="flex flex-wrap gap-2">
                  {[{ value: "all", label: "Todas" }, ...TEMPLATE_CATEGORIES].map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setTplCategoryFilter(cat.value)}
                      className={`h-11 min-h-11 px-3 rounded-md border text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        tplCategoryFilter === cat.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.filter((t) => tplCategoryFilter === "all" || t.category === tplCategoryFilter).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nenhum template salvo nesta categoria.</p>
                ) : (
                  templates
                    .filter((t) => tplCategoryFilter === "all" || t.category === tplCategoryFilter)
                    .map((tpl) => (
                      <div key={tpl.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/70 p-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">/{tpl.shortcut}</Badge>
                            <span className="text-xs font-semibold">{tpl.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              {TEMPLATE_CATEGORIES.find((c) => c.value === tpl.category)?.label || tpl.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{tpl.message}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className="size-11" onClick={() => handleEditTemplate(tpl)} title="Editar template">
                            <Pencil className="size-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" onClick={() => handleDeleteTemplate(tpl.id)} title="Excluir template">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="size-4 text-emerald-600" />Preview Ao Vivo no Celular</CardTitle><CardDescription>Visualização fiel de como o cliente recebe no WhatsApp (iOS / Android / Web).</CardDescription></CardHeader>
          <CardContent>
            <div className="mx-auto max-w-xs rounded-2xl bg-muted/40 p-4 space-y-2">
              <div className="rounded-xl bg-background p-4 border border-border/60 space-y-2">
                {tplHeader && <p className="text-xs font-bold text-foreground">{tplHeader}</p>}
                <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">{tplBody}</p>
                {tplFooter && <p className="text-xs text-muted-foreground pt-1">{tplFooter}</p>}
                <p className="text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
                  14:32 <CheckCheck className="size-3.5 text-blue-500" />
                </p>
              </div>
              <div className="space-y-2">{tplButtons.map((btn, idx) => <div key={idx} className="flex h-11 items-center justify-center rounded-xl bg-background border border-border/60 text-xs font-semibold text-primary">{btn}</div>)}</div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="concierge" className="mt-4 grid gap-4 md:grid-cols-3">
        {(() => {
          const hasConnectedChannel = instances.some((i) => i.is_active && (i.status === "connected" || i.status === "pending"));
          return (
            <>
        <Card><CardHeader><div className="flex items-center justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-muted text-warning-strong"><Car className="size-5" /></div><Badge variant={hasConnectedChannel ? "outline" : "secondary"} className={hasConnectedChannel ? "border-border bg-muted text-success" : ""}>{hasConnectedChannel ? "Canal Ativo" : "Sem Canal Ativo"}</Badge></div><CardTitle className="text-base pt-2">Despacho de Mobilidade</CardTitle><CardDescription>Fluxo conversacional Waesy Go direto no WhatsApp.</CardDescription></CardHeader><CardContent className="space-y-3 text-xs text-muted-foreground"><p>1. Identifica o número do cliente no perfil.</p><p>2. Recebe localização e lista opções de corrida ou frete.</p><p>3. Envia código OTP e link de acompanhamento.</p><Button variant="outline" className="w-full h-11 min-h-11 text-xs font-semibold" onClick={() => { addNodeType("action", "Despacho de Mobilidade", "mobility_quote_dispatch"); toast.success("Bloco adicionado ao fluxo."); }}>Inserir Bloco</Button></CardContent></Card>
        <Card><CardHeader><div className="flex items-center justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-muted text-success"><ShoppingBag className="size-5" /></div><Badge variant={hasConnectedChannel ? "outline" : "secondary"} className={hasConnectedChannel ? "border-border bg-muted text-success" : ""}>{hasConnectedChannel ? "Canal Ativo" : "Sem Canal Ativo"}</Badge></div><CardTitle className="text-base pt-2">Vendas e Reservas por Loja</CardTitle><CardDescription>Números dedicados para cada operação da empresa.</CardDescription></CardHeader><CardContent className="space-y-3 text-xs text-muted-foreground"><p>1. Envia catálogo, cardápio ou agenda.</p><p>2. Vincula atendimento às regras de estoque e preço.</p><p>3. Gera checkout PIX e código de retirada.</p><Button variant="outline" className="w-full h-11 min-h-11 text-xs font-semibold" onClick={() => { addNodeType("action", "Catálogo no Atendimento", "catalog_reservation_sdr"); toast.success("Bloco adicionado ao fluxo."); }}>Inserir Bloco</Button></CardContent></Card>
        <Card><CardHeader><div className="flex items-center justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground"><Plane className="size-5" /></div><Badge variant={hasConnectedChannel ? "outline" : "secondary"} className={hasConnectedChannel ? "border-border bg-muted text-success" : ""}>{hasConnectedChannel ? "Canal Ativo" : "Sem Canal Ativo"}</Badge></div><CardTitle className="text-base pt-2">Cotações Aéreas e Pacotes</CardTitle><CardDescription>Atendimento integrado ao setor de turismo.</CardDescription></CardHeader><CardContent className="space-y-3 text-xs text-muted-foreground"><p>1. Coleta origem, destino, datas e passageiros.</p><p>2. Filtra tarifas, bagagem e hospedagem.</p><p>3. Envia proposta e transfere para emissor humano.</p><Button variant="outline" className="w-full h-11 min-h-11 text-xs font-semibold" onClick={() => { addNodeType("action", "Cotação de Viagens", "corporate_travel_quote"); toast.success("Bloco adicionado ao fluxo."); }}>Inserir Bloco</Button></CardContent></Card>
            </>
          );
        })()}
      </TabsContent>
    </Tabs>
  </main>;
}
