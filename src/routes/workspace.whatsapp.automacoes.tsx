import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Megaphone, Plus, Save, Send, Pause, Play, Workflow, ShieldCheck, ChevronRight, FileText, Car, Plane, ShoppingBag, Smartphone, GitBranch, MessageSquare, ListChecks, CheckCheck, Sparkles } from "lucide-react";
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
  const [tplName, setTplName] = useState("confirmacao_pedido_waesy");
  const [tplHeader, setTplHeader] = useState("Pedido Confirmado na Loja");
  const [tplBody, setTplBody] = useState("Olá {{1}}, seu pedido #{{2}} foi confirmado! Valor total: {{3}}. Escolha abaixo como deseja acompanhar:");
  const [tplFooter, setTplFooter] = useState("Waesy Omnichannel · Atendimento Verificado");
  const [tplButtons, setTplButtons] = useState<string[]>(["Rastrear Entrega", "Falar com Atendente"]);

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

  return <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
    <PageHeader eyebrow="Workspace · WhatsApp" title="Automações e campanhas" actions={newFlowButton} />
    <div className="grid gap-3 md:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><Workflow className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Fluxos WhatsApp</p><p className="text-xl font-semibold">{flows.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><Megaphone className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Campanhas</p><p className="text-xl font-semibold">{campaigns.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><ShieldCheck className="size-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Regra de envio</p><p className="text-sm font-semibold">Opt-in + Meta oficial</p></div></CardContent></Card>
    </div>
    <Tabs defaultValue="flows" className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1 p-1"><TabsTrigger value="flows" className="h-10"><Bot className="mr-2 size-4" />Fluxos Visuais</TabsTrigger><TabsTrigger value="templates" className="h-10"><FileText className="mr-2 size-4" />Templates & Botões</TabsTrigger><TabsTrigger value="concierge" className="h-10"><Car className="mr-2 size-4" />Mobilidade, Catálogo & Aéreo</TabsTrigger><TabsTrigger value="campaigns" className="h-10"><Megaphone className="mr-2 size-4" />Campanhas</TabsTrigger></TabsList>
      <TabsContent value="flows" className="mt-4 grid gap-4 lg:grid-cols-12">
        <Card className="h-fit lg:col-span-4"><CardHeader><CardTitle className="text-base">Fluxos publicados</CardTitle><CardDescription>Execução versionada por evento inbound.</CardDescription></CardHeader><CardContent className="space-y-2">{flows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum fluxo criado.</p> : flows.map((flow) => <button key={flow.id} type="button" onClick={() => selectFlow(flow)} className={`flex w-full min-h-11 items-center justify-between rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedFlow?.id === flow.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><span className="min-w-0"><span className="block truncate text-sm font-medium">{flow.title}</span><span className="text-xs text-muted-foreground">v{flow.workflow_version || 1} · {flow.status}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>)}</CardContent></Card>
        <Card className="lg:col-span-8"><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">Editor Visual de Fluxo (Node-Based Canvas)</CardTitle><CardDescription>Adicione blocos da paleta abaixo; o runtime grava cada execução e despacha pela outbox.</CardDescription></div>{selectedFlow && <Badge variant={selectedFlow.status === "active" ? "default" : "secondary"}>{selectedFlow.status}</Badge>}</CardHeader><CardContent className="space-y-5">{!selectedFlow ? <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">Crie um fluxo para começar.</div> : <><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Nome</Label><Input value={flowTitle} onChange={(event) => setFlowTitle(event.target.value)} /></div><div className="space-y-2"><Label>Descrição</Label><Input value={flowDescription} onChange={(event) => setFlowDescription(event.target.value)} placeholder="Objetivo do fluxo" /></div></div><div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paleta de Nós (Clique para inserir no Canvas)</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Enviar Texto / Variáveis", "send_text")}><MessageSquare className="size-3.5 text-primary" />Texto</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Enviar Botões Interativos", "send_buttons")}><Sparkles className="size-3.5 text-emerald-600" />Botões (iOS/Web)</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Enviar Lista de Opções", "send_list")}><ListChecks className="size-3.5 text-amber-600" />Menu Lista</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("condition", "Roteador / Ramificação (Keyword)", "branch_condition")}><GitBranch className="size-3.5 text-purple-600" />Condição / Branch</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Acionar Agente IA SDR (Skills + Dados)", "ai_sdr_reply")}><Bot className="size-3.5 text-primary" />IA SDR + Catálogo</Button><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs gap-2" onClick={() => addNodeType("action", "Transferir para Setor / Humano", "assign_agent")}><Workflow className="size-3.5 text-blue-600" />Transbordo Setor</Button></div></div><div className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Canvas de Nós Conectados ({flowNodes.length})</p><p className="text-xs text-muted-foreground">Variáveis suportadas: {"{{senderName}}"}, {"{{senderMobile}}"}, {"{{orderId}}"}</p></div><Button variant="outline" size="sm" onClick={addAction}><Plus className="mr-2 size-4" />Adicionar ação</Button></div><div className="space-y-2">{flowNodes.map((node, index) => <div key={node.id} className="flex items-center gap-3 rounded-md border bg-card p-3"><Badge variant={node.type === "trigger" ? "default" : node.type === "condition" ? "outline" : "secondary"}>{index + 1}</Badge><div className="min-w-0 flex-1"><p className="text-sm font-medium">{node.title}</p><p className="text-xs text-muted-foreground">{node.type} · {node.config?.action || node.config?.event || "regra"}</p></div>{(node.config?.action === "send_text" || node.config?.action === "send_buttons" || node.config?.action === "send_list" || node.config?.action === "branch_condition") && <Input className="max-w-sm" value={node.config?.text || ""} placeholder="Texto, opções separadas por vírgula ou regra..." onChange={(event) => setFlowNodes((current) => current.map((item) => item.id === node.id ? { ...item, config: { ...item.config, text: event.target.value } } : item))} />}</div>)}</div></div><div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={toggleFlow} disabled={busy}>{selectedFlow.status === "active" ? <><Pause className="mr-2 size-4" />Pausar</> : <><Play className="mr-2 size-4" />Publicar</>}</Button><Button onClick={saveFlow} disabled={busy}><Save className="mr-2 size-4" />Salvar versão</Button></div></>}</CardContent></Card>
      </TabsContent>
      <TabsContent value="campaigns" className="mt-4 space-y-4">
        <Card><CardHeader><CardTitle className="text-base">Nova campanha oficial</CardTitle><CardDescription>Somente contatos com consentimento opt-in entram na outbox.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-4"><div className="space-y-2"><Label>Nome</Label><Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Ex.: Promoção férias" /></div><div className="space-y-2"><Label>Template Meta</Label><Input value={campaignTemplate} onChange={(event) => setCampaignTemplate(event.target.value)} placeholder="nome_aprovado" /></div><div className="space-y-2"><Label>Idioma</Label><Input value={campaignLanguage} onChange={(event) => setCampaignLanguage(event.target.value)} /></div><div className="space-y-2"><Label>Instância oficial</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={campaignInstance} onChange={(event) => setCampaignInstance(event.target.value)}><option value="">Selecione</option>{instances.filter((item) => item.provider === "meta_cloud_api" && item.is_active).map((item) => <option key={item.id} value={item.id}>{item.display_name} · {item.display_phone_number || item.phone_number_id || "sem número"}</option>)}</select></div><div className="md:col-span-4 flex justify-end"><Button onClick={createCampaign} disabled={busy || !campaignTemplate}><Plus className="mr-2 size-4" />Criar campanha</Button></div></CardContent></Card>
        <div className="grid gap-3">{campaigns.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma campanha criada.</CardContent></Card> : campaigns.map((campaign) => <Card key={campaign.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-medium">{campaign.name}</p><Badge variant={campaign.status === "running" ? "default" : "secondary"}>{campaign.status}</Badge></div><p className="text-xs text-muted-foreground">Template: {campaign.template_name} · audiência: opt-in · criada em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}</p></div><div className="flex gap-2">{campaign.status === "running" ? <Button size="sm" variant="outline" onClick={() => pauseCampaign(campaign.id)} disabled={busy}><Pause className="mr-2 size-4" />Pausar</Button> : <Button size="sm" onClick={() => launchCampaign(campaign.id)} disabled={busy || campaign.status === "completed"}><Send className="mr-2 size-4" />Enviar à outbox</Button>}</div></CardContent></Card>)}</div>
      </TabsContent>
      <TabsContent value="templates" className="mt-4 grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Construtor de Templates & Botões Interativos</CardTitle>
            <CardDescription>Compatível com Meta Cloud API Oficial e Evolution API (Botões, Listas e Variáveis).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label className="text-xs">Identificador do Template (slug)</Label><Input value={tplName} onChange={(e) => setTplName(e.target.value)} className="h-11 text-xs font-mono" /></div>
              <div className="space-y-2"><Label className="text-xs">Cabeçalho (Header)</Label><Input value={tplHeader} onChange={(e) => setTplHeader(e.target.value)} className="h-11 text-xs" /></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Corpo da Mensagem (Use {"{{1}}"}, {"{{2}}"} para variáveis dinâmicas)</Label><Textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)} rows={4} className="text-xs" /></div>
            <div className="space-y-2"><Label className="text-xs">Rodapé (Footer)</Label><Input value={tplFooter} onChange={(e) => setTplFooter(e.target.value)} className="h-11 text-xs" /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-xs">Botões de Resposta Rápida / CTA (Máx. 3)</Label><Button type="button" variant="outline" size="sm" className="h-11 min-h-11 text-xs" onClick={() => tplButtons.length < 3 && setTplButtons([...tplButtons, `Opção ${tplButtons.length + 1}`])}><Plus className="mr-1 size-3.5" />Adicionar Botão</Button></div>
              <div className="grid gap-2 sm:grid-cols-3">{tplButtons.map((btn, idx) => <Input key={idx} value={btn} onChange={(e) => setTplButtons(tplButtons.map((b, i) => i === idx ? e.target.value : b))} className="h-11 text-xs" />)}</div>
            </div>
            <div className="flex justify-end pt-2"><Button type="button" className="h-11 min-h-11 text-xs font-semibold" onClick={() => { setCampaignTemplate(tplName); toast.success("Template salvo na biblioteca e pronto para disparo!"); }}><Save className="mr-2 size-4" />Salvar Template na Biblioteca</Button></div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="size-4 text-emerald-600" />Preview Ao Vivo no Celular</CardTitle><CardDescription>Visualização fiel de como o cliente recebe no WhatsApp (iOS / Android / Web).</CardDescription></CardHeader>
          <CardContent>
            <div className="mx-auto max-w-xs rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-2">
              <div className="rounded-xl bg-background p-4 shadow-xs border border-border/60 space-y-2">
                {tplHeader && <p className="text-xs font-bold text-foreground">{tplHeader}</p>}
                <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">{tplBody}</p>
                {tplFooter && <p className="text-xs text-muted-foreground pt-1">{tplFooter}</p>}
                <p className="text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
                  14:32 <CheckCheck className="size-3.5 text-blue-500" />
                </p>
              </div>
              <div className="space-y-2">{tplButtons.map((btn, idx) => <div key={idx} className="flex h-10 items-center justify-center rounded-xl bg-background border border-border/60 text-xs font-semibold text-primary shadow-2xs">{btn}</div>)}</div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="concierge" className="mt-4 grid gap-4 md:grid-cols-3">
        <Card><CardHeader><div className="flex items-center justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><Car className="size-5" /></div><Badge variant="secondary">Ativo no Canal</Badge></div><CardTitle className="text-base pt-2">Despacho de Mobilidade, Fretes & Mudanças</CardTitle><CardDescription>Fluxo conversacional Waesy Go direto no WhatsApp Oficial ou da Empresa.</CardDescription></CardHeader><CardContent className="space-y-3 text-xs text-muted-foreground"><p>1. Identifica automaticamente o número do cliente no perfil civil.</p><p>2. Recebe pino de localização (origem/destino) e lista Moto, Carro, Frete ou Carona.</p><p>3. Envia código OTP de 4 dígitos, placa, foto do motorista e link de rastreio ao vivo.</p><Button variant="outline" className="w-full h-11 min-h-11 text-xs font-semibold" onClick={() => { addNodeType("action", "Despachar Corrida / Frete Waesy Go", "mobility_quote_dispatch"); toast.success("Bloco de Mobilidade adicionado ao fluxo atual!"); }}>Inserir Bloco no Fluxo</Button></CardContent></Card>
        <Card><CardHeader><div className="flex items-center justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><ShoppingBag className="size-5" /></div><Badge variant="secondary">Ativo no Canal</Badge></div><CardTitle className="text-base pt-2">Compras, Reservas & Locação por Loja</CardTitle><CardDescription>Permite que cada empresa conecte múltiplos números dedicados por operação.</CardDescription></CardHeader><CardContent className="space-y-3 text-xs text-muted-foreground"><p>1. Envia catálogo interativo de produtos, cardápio ou agenda de locação.</p><p>2. Vincula a IA SDR às políticas da empresa, estoque e tabela de preços real.</p><p>3. Gera checkout PIX Copia e Cola e código de retirada direto na conversa.</p><Button variant="outline" className="w-full h-11 min-h-11 text-xs font-semibold" onClick={() => { addNodeType("action", "Catálogo & Checkout IA SDR", "catalog_reservation_sdr"); toast.success("Bloco de Catálogo/Reservas adicionado ao fluxo!"); }}>Inserir Bloco no Fluxo</Button></CardContent></Card>
        <Card><CardHeader><div className="flex items-center justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Plane className="size-5" /></div><Badge variant="secondary">Ativo no Canal</Badge></div><CardTitle className="text-base pt-2">Cotação de Passagens Aéreas & Pacotes</CardTitle><CardDescription>Atendimento corporativo e lazer integrado ao motor de viagens Waesy.</CardDescription></CardHeader><CardContent className="space-y-3 text-xs text-muted-foreground"><p>1. Coleta cidade de origem, destino, datas de ida/volta e passageiros.</p><p>2. Filtra tarifas aéreas, bagagem e pacotes completos com hotel + transfer.</p><p>3. Envia proposta estruturada em PDF/Link e transfere para emissor humano se solicitado.</p><Button variant="outline" className="w-full h-11 min-h-11 text-xs font-semibold" onClick={() => { addNodeType("action", "Cotação Aérea & Pacotes Corporativos", "corporate_travel_quote"); toast.success("Bloco de Cotação Aérea adicionado ao fluxo!"); }}>Inserir Bloco no Fluxo</Button></CardContent></Card>
      </TabsContent>
    </Tabs>
  </main>;
}
