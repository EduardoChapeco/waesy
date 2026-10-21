import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listStoresForCuration,
  listMysteryShopperAuditsAdmin,
  createMysteryShopperAudit,
  resolveHardshipAndBoostStore,
  listAiSquadsAndAgentsAdmin,
  listAirportsForAdminCuration,
  saveAirportCmsOverrideAdmin,
} from "@/services/curadoria.functions";
import { Plane, ExternalLink, Globe, Phone, Clock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin-master/curadoria")({
 head: () => ({ meta: [{ title: "Curadoria e Auditoria | Waesy Master" }] }),
 loader: async () => {
 try {
 const [stores, audits, aiSquads, airportsData] = await Promise.all([
    listStoresForCuration(),
    listMysteryShopperAuditsAdmin(),
    listAiSquadsAndAgentsAdmin().catch(() => ({ curation_squads: [], squad_templates: [], agents: [] })),
    listAirportsForAdminCuration().catch(() => ({ customProfiles: [] })),
  ]);
  return {
    stores: stores || [],
    audits: audits || [],
    aiSquads: aiSquads || { curation_squads: [], squad_templates: [], agents: [] },
    airports: airportsData?.customProfiles || [],
  };
 } catch (e) {
 console.error("[curadoria.loader] error:", e);
 return { stores: [], audits: [], aiSquads: { curation_squads: [], squad_templates: [], agents: [] }, airports: [] };
 }
 },
 component: CuradoriaAdminPage,
});

function CuradoriaAdminPage() {
 const loaderData = Route.useLoaderData();
  const [stores, setStores] = useState(loaderData.stores);
  const [audits, setAudits] = useState(loaderData.audits);
  const [aiSquads] = useState(loaderData.aiSquads || { curation_squads: [], squad_templates: [], agents: [] });
  const [airports, setAirports] = useState(loaderData.airports || []);
  const [airportSearch, setAirportSearch] = useState("");
  const [airportModalOpen, setAirportModalOpen] = useState(false);
  const [isSavingAirport, setIsSavingAirport] = useState(false);
  const [airportForm, setAirportForm] = useState({
    iata_code: "",
    operator_name: "",
    operating_hours: "",
    website_url: "",
    phone_pabx: "",
    is_featured: false,
  });
 const [activeTab, setActiveTab] = useState("lojas");
 const [search, setSearch] = useState("");

 const [createModalOpen, setCreateModalOpen] = useState(false);
 const [selectedStoreId, setSelectedStoreId] = useState("");
 const [productName, setProductName] = useState("");
 const [costCents, setCostCents] = useState(3500);
 const [auditorName, setAuditorName] = useState("");
 const [isSubmittingMission, setIsSubmittingMission] = useState(false);

 const [boostModalOpen, setBoostModalOpen] = useState(false);
 const [targetAudit, setTargetAudit] = useState<any>(null);
 const [resolutionAction, setResolutionAction] = useState<"grant_boost_and_discount" | "grant_boost_only" | "grant_discount_only" | "reject">("grant_boost_and_discount");
 const [boostMultiplier, setBoostMultiplier] = useState(2.5);
 const [boostDays, setBoostDays] = useState(30);
 const [adminNotes, setAdminNotes] = useState("");
 const [isResolving, setIsResolving] = useState(false);

 const handleOpenEditAirport = (item?: any) => {
    if (item) {
      setAirportForm({
        iata_code: item.iata_code || "",
        operator_name: item.operator_name || "",
        operating_hours: item.operating_hours || "",
        website_url: item.website_url || "",
        phone_pabx: item.phone_pabx || "",
        is_featured: !!item.is_featured,
      });
    } else {
      setAirportForm({
        iata_code: "",
        operator_name: "",
        operating_hours: "",
        website_url: "",
        phone_pabx: "",
        is_featured: false,
      });
    }
    setAirportModalOpen(true);
  };

  const handleSaveAirport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!airportForm.iata_code || airportForm.iata_code.length !== 3) {
      toast.error("Informe um código IATA válido de 3 letras.");
      return;
    }
    try {
      setIsSavingAirport(true);
      const res = await saveAirportCmsOverrideAdmin({
        data: {
          iata_code: airportForm.iata_code.toUpperCase(),
          operator_name: airportForm.operator_name || null,
          operating_hours: airportForm.operating_hours || null,
          website_url: airportForm.website_url || null,
          phone_pabx: airportForm.phone_pabx || null,
          is_featured: airportForm.is_featured,
        },
      });
      toast.success(res.message);
      setAirportModalOpen(false);
      const refreshed = await listAirportsForAdminCuration();
      setAirports(refreshed.customProfiles || []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar perfil do aeroporto.");
    } finally {
      setIsSavingAirport(false);
    }
  };

  const filteredAirports = airports.filter((a: any) =>
    (a.iata_code || "").toLowerCase().includes(airportSearch.toLowerCase()) ||
    (a.operator_name || "").toLowerCase().includes(airportSearch.toLowerCase())
  );

  const filteredStores = stores.filter((s: any) =>
 (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
 (s.city || "").toLowerCase().includes(search.toLowerCase()),
 );

 const handleOpenCreateMission = (storeId?: string) => {
 if (storeId) setSelectedStoreId(storeId);
 else if (stores.length > 0) setSelectedStoreId(stores[0].id);
 setProductName("");
 setCostCents(3500);
 setAuditorName("");
 setCreateModalOpen(true);
 };

 const handleCreateMission = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedStoreId || !productName) {
 toast.error("Preencha a loja e o item a ser auditado.");
 return;
 }

 try {
 setIsSubmittingMission(true);
 const res = await createMysteryShopperAudit({
 data: {
 store_id: selectedStoreId,
 product_name: productName,
 cost_cents: costCents,
 custom_auditor_name: auditorName || undefined,
 },
 });

 toast.success(res.message);
 setCreateModalOpen(false);

 const [newStores, newAudits] = await Promise.all([
 listStoresForCuration(),
 listMysteryShopperAuditsAdmin(),
 ]);
 setStores(newStores || []);
 setAudits(newAudits || []);
 } catch (err: any) {
 toast.error(err.message || "Erro ao criar missão.");
 } finally {
 setIsSubmittingMission(false);
 }
 };

 const handleOpenBoostModal = (audit: any) => {
 setTargetAudit(audit);
 setResolutionAction("grant_boost_and_discount");
 setBoostMultiplier(2.5);
 setBoostDays(30);
 setAdminNotes("Apoio comunitário Waesy concedido.");
 setBoostModalOpen(true);
 };

 const handleResolveBoost = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!targetAudit) return;

 try {
 setIsResolving(true);
 const res = await resolveHardshipAndBoostStore({
 data: {
 audit_id: targetAudit.id,
 store_id: targetAudit.store_id,
 resolution_action: resolutionAction,
 boost_multiplier: boostMultiplier,
 boost_duration_days: boostDays,
 admin_notes: adminNotes,
 },
 });

 toast.success(res.message);
 setBoostModalOpen(false);

 const [newStores, newAudits] = await Promise.all([
 listStoresForCuration(),
 listMysteryShopperAuditsAdmin(),
 ]);
 setStores(newStores || []);
 setAudits(newAudits || []);
 } catch (err: any) {
 toast.error(err.message || "Erro ao aplicar resolução.");
 } finally {
 setIsResolving(false);
 }
 };

 return (
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-6 bg-background">
 {/* Header Silencioso */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
 <div>
 <h1 className="text-xl font-bold tracking-tight">Curadoria</h1>
 <p className="text-xs text-muted-foreground mt-1">
 Inspeções de qualidade, missões anônimas e apoio solidário com impulsos no feed.
 </p>
 </div>

 <Button onClick={() => handleOpenCreateMission()} className="gap-2 text-xs h-11 min-h-11 px-4">
 <Plus className="size-3.5" />
 Nova Missão
 </Button>
 </div>

 {/* Grid de Métricas Limpo */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 <div className="p-4 rounded-lg border border-border/60 bg-card">
 <span className="text-xs text-muted-foreground font-medium block">Lojas Monitoradas</span>
 <div className="text-2xl font-bold tracking-tight text-foreground mt-1">{stores.length}</div>
 <span className="text-[11px] text-muted-foreground">cadastradas no radar</span>
 </div>

 <div className="p-4 rounded-lg border border-border/60 bg-card">
 <span className="text-xs text-muted-foreground font-medium block">Missões Realizadas</span>
 <div className="text-2xl font-bold tracking-tight text-foreground mt-1">{audits.length}</div>
 <span className="text-[11px] text-muted-foreground">auditorias anônimas</span>
 </div>

 <div className="p-4 rounded-lg border border-border/60 bg-card">
 <span className="text-xs text-muted-foreground font-medium block">Boosts Ativos</span>
 <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
 {stores.filter((s: any) => s.boost_active).length}
 </div>
 <span className="text-[11px] text-muted-foreground">lojas impulsionadas</span>
 </div>

 <div className="p-4 rounded-lg border border-border/60 bg-card">
 <span className="text-xs text-muted-foreground font-medium block">Apoios Pendentes</span>
 <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
 {audits.filter((a: any) => a.dispute_status === "pending_review").length}
 </div>
 <span className="text-[11px] text-muted-foreground">relatos de lojistas</span>
 </div>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
 <TabsList className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar p-1 rounded-lg h-10">
 <TabsTrigger value="lojas" className="text-xs">Lojas ({stores.length})</TabsTrigger>
 <TabsTrigger value="missoes" className="text-xs">Missões ({audits.length})</TabsTrigger>
 <TabsTrigger value="apoio" className="text-xs">Apoio</TabsTrigger>
          <TabsTrigger value="squads" className="text-xs">Squads & IA ({(aiSquads.curation_squads?.length || 0) + (aiSquads.squad_templates?.length || 0)})</TabsTrigger>
          <TabsTrigger value="aeroportos" className="text-xs">Aeroportos CMS ({airports.length})</TabsTrigger>
 </TabsList>

 {/* Tab 1: Lojas */}
 <TabsContent value="lojas" className="space-y-3">
 <div className="relative max-w-xs">
 <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 placeholder="Buscar loja ou cidade..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-8 text-xs h-11 min-h-11"
 />
 </div>

 <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-xs">Estabelecimento</TableHead>
 <TableHead className="text-xs">Cidade</TableHead>
 <TableHead className="text-xs">Auditorias</TableHead>
 <TableHead className="text-xs">Última Nota</TableHead>
 <TableHead className="text-xs">Boost</TableHead>
 <TableHead className="text-xs text-right">Ação</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredStores.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
 Nenhuma loja encontrada.
 </TableCell>
 </TableRow>
 ) : (
 filteredStores.map((s: any) => (
 <TableRow key={s.id}>
 <TableCell className="font-medium text-xs py-3">
 <span className="font-semibold block text-foreground">{s.name}</span>
 <span className="text-[11px] text-muted-foreground font-mono">{s.slug}</span>
 </TableCell>
 <TableCell className="text-xs text-muted-foreground py-3">
 {s.city ? `${s.city}/${s.state}` : "—"}
 </TableCell>
 <TableCell className="font-mono text-xs text-muted-foreground py-3">
 {s.total_audits}
 </TableCell>
 <TableCell className="text-xs font-semibold py-3">
 {s.last_rating ? `${s.last_rating}.0` : "—"}
 </TableCell>
 <TableCell className="py-3">
 {s.boost_active ? (
 <Badge variant="outline" className="text-[10px] text-success border-success/30">
 +{s.boost_multiplier}x Ativo
 </Badge>
 ) : (
 <span className="text-[11px] text-muted-foreground">Normal</span>
 )}
 </TableCell>
 <TableCell className="text-right py-3">
 <Button
 size="sm"
 variant="ghost"
 onClick={() => handleOpenCreateMission(s.id)}
 className="text-xs h-7 px-2"
 >
 Auditar
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </TabsContent>

 {/* Tab 2: Missões */}
 <TabsContent value="missoes" className="space-y-3">
 <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-xs">Código / Loja</TableHead>
 <TableHead className="text-xs">Item Auditado</TableHead>
 <TableHead className="text-xs">Auditor (Master View)</TableHead>
 <TableHead className="text-xs">Custo</TableHead>
 <TableHead className="text-xs">Nota</TableHead>
 <TableHead className="text-xs text-right">Status</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {audits.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
 Nenhuma missão registrada.
 </TableCell>
 </TableRow>
 ) : (
 audits.map((a: any) => (
 <TableRow key={a.id}>
 <TableCell className="text-xs py-3">
 <span className="font-mono font-semibold block text-foreground">{a.masked_auditor_code || "AUD"}</span>
 <span className="text-[11px] text-muted-foreground">{a.store_name}</span>
 </TableCell>
 <TableCell className="text-xs font-medium py-3">{a.product_name}</TableCell>
 <TableCell className="text-xs text-muted-foreground py-3">
 {a.auditor_name || "Comunitário"}
 </TableCell>
 <TableCell className="font-mono text-xs py-3">
 {((a.cost_cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
 </TableCell>
 <TableCell className="text-xs font-semibold py-3">
 {a.rating_overall ? `${a.rating_overall}/5` : "Pendente"}
 </TableCell>
 <TableCell className="text-right py-3">
 <Badge variant="outline" className="text-[10px] capitalize">
 {a.status}
 </Badge>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </TabsContent>

 {/* Tab 3: Apoio */}
 <TabsContent value="apoio" className="space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {audits
 .filter((a: any) => a.dispute_status && a.dispute_status !== "none")
 .map((a: any) => (
 <div key={a.id} className="p-4 rounded-lg border border-border/60 bg-card space-y-2 text-xs">
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground">{a.store_name}</span>
 <Badge variant="outline" className="text-[10px]">
 {a.dispute_status === "pending_review" ? "Em Análise" : "Resolvido"}
 </Badge>
 </div>
 <p className="text-muted-foreground italic">"{a.dispute_reason}"</p>
 <div className="flex justify-end pt-2 border-t border-border/40">
 {a.dispute_status === "pending_review" && (
 <Button size="sm" onClick={() => handleOpenBoostModal(a)} className="text-xs h-7">
 Conceder Boost (+2.5x)
 </Button>
 )}
 </div>
 </div>
 ))}
 </div>
 </TabsContent>

        {/* Tab 4: Squads & IA */}
        <TabsContent value="squads" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiSquads.agents && aiSquads.agents.map((ag: any) => (
              <div key={ag.id} className="p-4 rounded-lg border border-border/60 bg-card space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{ag.name}</span>
                  <Badge variant="outline" className="text-xs">{ag.category}</Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2">{ag.career_summary || "Agente autônomo operacional."}</p>
                <div className="text-xs text-muted-foreground font-mono">Modelo padrão: {ag.default_model}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 5: Aeroportos CMS */}
        <TabsContent value="aeroportos" className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative max-w-xs w-full">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar IATA ou Operador..."
                value={airportSearch}
                onChange={(e) => setAirportSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <Button onClick={() => handleOpenEditAirport()} size="sm" className="gap-2 text-xs h-8">
              <Plus className="size-3.5" />
              Novo Override CMS
            </Button>
          </div>

          <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Código IATA</TableHead>
                  <TableHead className="text-xs">Operador / Concessionária</TableHead>
                  <TableHead className="text-xs">Horário</TableHead>
                  <TableHead className="text-xs">PABX</TableHead>
                  <TableHead className="text-xs">Telemetria</TableHead>
                  <TableHead className="text-xs text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAirports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                      Nenhum perfil customizado no banco. A inteligência SSOT atende todos os 7.314 aeroportos sob demanda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAirports.map((ap: any) => (
                    <TableRow key={ap.id || ap.iata_code}>
                      <TableCell className="font-mono font-bold text-xs py-3 text-primary">
                        {ap.iata_code}
                      </TableCell>
                      <TableCell className="text-xs text-foreground py-3">
                        {ap.operator_name || "Padrão SSOT"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3">
                        {ap.operating_hours || "24 horas"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground py-3">
                        {ap.phone_pabx || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-semibold py-3">
                        {ap.view_count || 0} views
                      </TableCell>
                      <TableCell className="text-right py-3 space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditAirport(ap)}
                          className="h-11 min-h-11 text-xs px-3"
                        >
                          Editar
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-11 min-h-11 text-xs px-3"
                        >
                          <Link to={"/aeroporto/$iata" as any} params={{ iata: ap.iata_code } as any} target="_blank">
                            <ExternalLink className="size-3 mr-1" />
                            Página
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

 {/* Modal Nova Missão */}
 <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
 <DialogContent className="sm:max-w-sm w-[calc(100vw-32px)]">
 <DialogHeader>
 <DialogTitle className="text-base font-bold">Nova Missão de Cliente Oculto</DialogTitle>
 <DialogDescription className="text-xs">
 A loja absorve o custo do item em troca da gratuidade da plataforma.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleCreateMission} className="space-y-3 py-2 text-xs">
 <div className="space-y-1">
 <Label className="text-xs">Loja</Label>
 <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
 <SelectTrigger className="h-9">
 <SelectValue placeholder="Selecione a loja..." />
 </SelectTrigger>
 <SelectContent>
 {stores.map((s: any) => (
 <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs">Produto / Refeição</Label>
 <Input
 placeholder="Ex: Combo X-Burger"
 value={productName}
 onChange={(e) => setProductName(e.target.value)}
 className="h-9"
 required
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs">Valor (R$)</Label>
 <Input
 type="number"
 step="0.01"
 value={costCents / 100}
 onChange={(e) => setCostCents(Math.round(parseFloat(e.target.value || "0") * 100))}
 className="h-9"
 required
 />
 </div>

 <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
 <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="w-full sm:w-auto text-xs h-9">
 Cancelar
 </Button>
 <Button type="submit" disabled={isSubmittingMission} className="w-full sm:w-auto text-xs h-9 font-semibold">
 {isSubmittingMission && <Loader2 className="size-3.5 animate-spin mr-2" />}
 Disparar Missão
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
      {/* Modal Editar Perfil do Aeroporto (CMS Master) */}
      <Dialog open={airportModalOpen} onOpenChange={setAirportModalOpen}>
        <DialogContent className="sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plane className="size-4 text-primary" />
              Personalizar Aeroporto (CMS Master)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sobrescreve dados operacionais e de contato para a página pública canônica do aeroporto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAirport} className="space-y-4 py-2 text-xs">
            <div className="space-y-2">
              <Label className="text-xs">Código IATA (3 Letras)</Label>
              <Input
                placeholder="Ex: GRU, XAP, LIM"
                value={airportForm.iata_code}
                onChange={(e) => setAirportForm({ ...airportForm, iata_code: e.target.value.toUpperCase().slice(0, 3) })}
                className="h-11 min-h-11 font-mono uppercase"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Operador / Concessionária</Label>
              <Input
                placeholder="Ex: GRU Airport, Infraero, Fraport"
                value={airportForm.operator_name}
                onChange={(e) => setAirportForm({ ...airportForm, operator_name: e.target.value })}
                className="h-11 min-h-11"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Horário de Operação</Label>
                <Input
                  placeholder="Ex: 24 horas"
                  value={airportForm.operating_hours}
                  onChange={(e) => setAirportForm({ ...airportForm, operating_hours: e.target.value })}
                  className="h-11 min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Telefone PABX</Label>
                <Input
                  placeholder="Ex: +55 (11) 2445-2945"
                  value={airportForm.phone_pabx}
                  onChange={(e) => setAirportForm({ ...airportForm, phone_pabx: e.target.value })}
                  className="h-11 min-h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Site Oficial</Label>
              <Input
                placeholder="https://..."
                value={airportForm.website_url}
                onChange={(e) => setAirportForm({ ...airportForm, website_url: e.target.value })}
                className="h-11 min-h-11"
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setAirportModalOpen(false)} className="w-full sm:w-auto text-xs h-11 min-h-11 px-4">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingAirport} className="w-full sm:w-auto text-xs h-11 min-h-11 px-5 font-semibold">
                {isSavingAirport && <Loader2 className="size-3.5 animate-spin mr-2" />}
                Salvar no CMS Master
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

 </div>
 );
}
