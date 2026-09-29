import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Link as LinkIcon, Copy, Check, Users, Beer, ShoppingBag, Utensils, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { listEventSubpanels, createEventSubpanel } from "@/services/events.functions";

export const Route = createFileRoute("/workspace/eventos/$id/subpaineis")({
 head: () => ({ meta: [{ title: "Subpainéis de Eventos | Waesy" }] }),
 component: EventSubpanelsPage,
});

function EventSubpanelsPage() {
 const { id: eventId } = useParams({ from: "/workspace/eventos/$id/subpaineis" });
 const queryClient = useQueryClient();
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [panelName, setPanelName] = useState("");
 const [panelType, setPanelType] = useState<any>("bar");
 const [managerName, setManagerName] = useState("");
 const [copiedToken, setCopiedToken] = useState<string | null>(null);

 const { data: subpanels = [], isLoading } = useQuery({
 queryKey: ["event-subpanels", eventId],
 queryFn: () => listEventSubpanels({ data: { eventId } }),
 });

 const createMutation = useMutation({
 mutationFn: () =>
 createEventSubpanel({
 data: {
 eventId,
 name: panelName,
 panelType,
 managerName,
 },
 }),
 onSuccess: (res) => {
 toast.success("Subpainel criado com sucesso!");
 queryClient.invalidateQueries({ queryKey: ["event-subpanels", eventId] });
 setIsDialogOpen(false);
 setPanelName("");
 setManagerName("");
 },
 onError: (err: Error) => {
 toast.error(err.message || "Erro ao criar subpainel.");
 },
 });

 const copyMagicLink = (token: string) => {
 const url = `${window.location.origin}/portal/subpainel/${token}`;
 navigator.clipboard.writeText(url);
 setCopiedToken(token);
 toast.success("Link mágico de acesso externo copiado!");
 setTimeout(() => setCopiedToken(null), 3000);
 };

 return (
 <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
 <div className="flex items-center justify-between">
 <PageHeader
 title="Pontos de Venda"
 description="Crie portais isolados com link mágico para operadores de bar, praça de alimentação e lojinhas."
 />
 <Button onClick={() => setIsDialogOpen(true)} className="rounded-2xl min-h-[44px] font-bold">
 <Plus className="h-4 w-4 mr-2" /> Novo Subpainel
 </Button>
 </div>

 {isLoading ? (
 <div className="py-12 text-center text-sm text-muted-foreground">Carregando subpainéis...</div>
 ) : subpanels.length === 0 ? (
 <div className="bg-card border border-border rounded-2xl p-12 text-center text-sm text-muted-foreground">
 Nenhum subpainel criado para este evento. Clique no botão acima para adicionar bares ou pontos de atendimento.
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {subpanels.map((sp: any) => (
 <div key={sp.id} className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-sm">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 {sp.panel_type === "bar" ? <Beer className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
 </div>
 <div>
 <h3 className="font-bold text-sm text-foreground">{sp.name}</h3>
 <p className="text-xs text-muted-foreground capitalize">{sp.panel_type}</p>
 </div>
 </div>
 <Badge variant="outline" className="text-xs capitalize">{sp.is_active ? "Ativo" : "Inativo"}</Badge>
 </div>

 {sp.manager_name && (
 <div className="text-xs text-muted-foreground">
 Responsável: <strong>{sp.manager_name}</strong>
 </div>
 )}

 {/* Botão de Link Mágico Externo */}
 <div className="pt-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => sp.access_token && copyMagicLink(sp.access_token)}
 className="w-full min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
 >
 {copiedToken === sp.access_token ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
 {copiedToken === sp.access_token ? "Link Copiado!" : "Copiar Link de Acesso Externo"}
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Modal de Criação */}
 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-card border border-border">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold">Novo Subpainel de Evento</DialogTitle>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Nome do Subpainel</label>
 <Input
 placeholder="Ex: Bar Principal - Área VIP"
 value={panelName}
 onChange={(e) => setPanelName(e.target.value)}
 className="min-h-[44px] rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Tipo de Operação</label>
 <select
 value={panelType}
 onChange={(e) => setPanelType(e.target.value)}
 className="w-full h-11 min-h-[44px] rounded-xl bg-background border border-border px-3 text-sm"
 >
 <option value="bar">Bar / Bebidas</option>
 <option value="foodtruck">Foodtruck / Alimentação</option>
 <option value="restaurant">Restaurante / Buffet</option>
 <option value="merchandise">Loja Oficial / Merchandising</option>
 <option value="ticketing_box">Bilheteria Presencial</option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Nome do Responsável / Operador</label>
 <Input
 placeholder="Ex: João Silva (Líder de Bar)"
 value={managerName}
 onChange={(e) => setManagerName(e.target.value)}
 className="min-h-[44px] rounded-xl"
 />
 </div>
 </div>

 <DialogFooter className="gap-2 sm:gap-0">
 <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl min-h-[44px]">
 Cancelar
 </Button>
 <Button
 onClick={() => createMutation.mutate()}
 disabled={!panelName.trim() || createMutation.isPending}
 className="rounded-xl min-h-[44px] font-bold"
 >
 Criar com Token Mágico
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
