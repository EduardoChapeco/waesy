import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Utensils, Plus, Send, Check, Users, Clock, DollarSign, Search, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listRestaurantTables, updateRestaurantTableStatus, listKdsActiveOrders } from "@/services/pdv.functions";

export const Route = createFileRoute("/_store/garcom")({
 head: () => ({ meta: [{ title: "App do Garçom | Terminal Móvel" }] }),
 errorComponent: GarcomErrorComponent,
 component: GarcomTerminalPage,
});

function GarcomErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <Utensils className="size-7" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Instabilidade no Terminal do Garçom</h2>
      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
        {error?.message || "Não foi possível sincronizar o status das mesas e comandas no PDV."}
      </p>
      <Button
        type="button"
        onClick={reset}
        className="rounded-lg font-bold text-xs h-11 sm:h-9 px-4 focus-visible:ring-2 focus-visible:ring-primary"
      >
        Tentar Novamente
      </Button>
    </div>
  );
}

function GarcomTerminalPage() {
 const queryClient = useQueryClient();
 const [selectedTable, setSelectedTable] = useState<any | null>(null);
 const [guestsCount, setGuestsCount] = useState(2);
 const [cartItems, setCartItems] = useState<Array<{ name: string; quantity: number; notes: string }>>([]);
 const [newItemName, setNewItemName] = useState("");
 const [newItemNotes, setNewItemNotes] = useState("");

 const { data: tables = [], isLoading, isError, refetch } = useQuery({
 queryKey: ["garcom-tables"],
 queryFn: () => listRestaurantTables(),
 refetchInterval: 5000,
 });

 const occupyTableMutation = useMutation({
 mutationFn: (tableId: string) =>
 updateRestaurantTableStatus({
 data: {
 tableId,
 status: "occupied",
 currentGuestsCount: guestsCount,
 },
 }),
 onSuccess: (_, tableId) => {
 toast.success("Mesa aberta com sucesso!");
 queryClient.invalidateQueries({ queryKey: ["garcom-tables"] });
 },
 });

 const addItemToComanda = () => {
 if (!newItemName.trim()) return;
 setCartItems([...cartItems, { name: newItemName.trim(), quantity: 1, notes: newItemNotes.trim() }]);
 setNewItemName("");
 setNewItemNotes("");
 };

 return (
 <div className="min-h-screen bg-background text-foreground pb-20">
 {/* Header Fixo Mobile-First */}
 <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
 <Utensils className="h-4 w-4" />
 </div>
 <div>
 <h1 className="font-bold text-sm leading-tight">Comandas</h1>
 <p className="text-2xs text-muted-foreground">Terminal do Garçom</p>
 </div>
 </div>

 {selectedTable && (
 <Button 
 variant="ghost" 
 size="sm" 
 onClick={() => setSelectedTable(null)}
 className="min-h-11 h-11 px-3 text-xs font-semibold gap-2"
 aria-label="Voltar ao Mapa"
 >
 <ArrowLeft className="size-4" />
 <span className="hidden sm:inline">Voltar ao Mapa</span>
 </Button>
 )}
 </div>

 <div className="max-w-4xl mx-auto p-4 space-y-4">
 {!selectedTable ? (
 <div>
 <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">
 Mapa de Mesas do Salão
 </h2>

 {isLoading ? (
 <div className="p-8 text-center text-muted-foreground text-sm">Carregando mapa de mesas...</div>
 ) : isError ? (
 <div className="bg-card border border-destructive/30 p-8 rounded-lg text-center space-y-3">
   <p className="text-sm font-semibold text-destructive">Falha ao carregar mesas do salão.</p>
   <Button type="button" size="sm" variant="outline" onClick={() => refetch()} className="h-11 sm:h-9 text-xs font-bold">
     Tentar Novamente
   </Button>
 </div>
 ) : tables.length === 0 ? (
 <div className="bg-card border border-border p-8 rounded-lg text-center text-sm text-muted-foreground">
 Nenhuma mesa cadastrada no sistema de PDV.
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 {tables.map((table: any) => {
 const isOccupied = table.status === "occupied";
 const isBilling = table.status === "billing";
 const isAvailable = table.status === "available";

 return (
 <button
 key={table.id}
 onClick={() => setSelectedTable(table)}
 className={`p-4 rounded-lg border text-left transition-all min-h-28 flex flex-col justify-between ${
 isOccupied 
 ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" 
 : isBilling 
 ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
 : "bg-card border-border hover:border-primary/50 text-foreground"
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="font-black text-lg">Mesa {table.table_number}</span>
 <Badge variant="outline" className="text-3xs uppercase font-bold py-1 px-2 rounded-md">
 {table.status}
 </Badge>
 </div>

 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span className="capitalize">{table.zone}</span>
 <span className="flex items-center gap-1 font-mono">
 <Users className="h-3 w-3" /> {table.current_guests_count || table.capacity}
 </span>
 </div>
 </button>
 );
 })}
 </div>
 )}
 </div>
 ) : (
 <div className="space-y-4">
 {/* Detalhe da Mesa Selecionada */}
 <div className="bg-card border border-border rounded-lg p-5 space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="font-black text-2xl">Mesa {selectedTable.table_number}</h2>
 <p className="text-xs text-muted-foreground">Zona: {selectedTable.zone} • Capacidade: {selectedTable.capacity} pessoas</p>
 </div>
 <Badge variant="outline" className="text-xs font-bold py-1 px-3 rounded-lg uppercase">
 {selectedTable.status}
 </Badge>
 </div>

 {selectedTable.status === "available" ? (
 <div className="pt-2">
 <p className="text-xs text-muted-foreground mb-2">Mesa livre. Clique para abrir comanda:</p>
 <Button
 onClick={() => occupyTableMutation.mutate(selectedTable.id)}
 className="w-full min-h-12 rounded-lg font-bold bg-primary text-primary-foreground"
 >
 Abrir Mesa para {guestsCount} Pessoas
 </Button>
 </div>
 ) : (
 <div className="pt-2 space-y-4">
 {/* Formulário Rápido de Adição de Itens para Cozinha */}
 <div className="space-y-2 bg-muted/40 p-4 rounded-lg border border-border">
 <h3 className="font-bold text-xs text-foreground">Lançar Item para a Cozinha</h3>
 <div className="flex gap-2">
 <Input
 placeholder="Nome do Prato / Bebida"
 value={newItemName}
 onChange={(e) => setNewItemName(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 <Button onClick={addItemToComanda} className="min-h-11 rounded-lg px-4">
 <Plus className="h-4 w-4" />
 </Button>
 </div>
 <Input
 placeholder="Observações (ex: sem cebola, gelo e limão)"
 value={newItemNotes}
 onChange={(e) => setNewItemNotes(e.target.value)}
 className="min-h-11 sm:min-h-9 rounded-lg text-xs"
 />
 </div>

 {/* Itens na Comanda Atual */}
 {cartItems.length > 0 && (
 <div className="space-y-2">
 <h4 className="text-xs font-semibold text-muted-foreground">Itens Prontos para Enviar:</h4>
 {cartItems.map((item, idx) => (
 <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
 <div>
 <div className="font-bold text-sm">{item.name}</div>
 {item.notes && <div className="text-2xs text-muted-foreground">Obs: {item.notes}</div>}
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
 className="text-destructive size-9 p-0"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 ))}

 <Button
 onClick={() => {
 toast.success("Itens enviados com sucesso para o KDS da Cozinha!");
 setCartItems([]);
 }}
 className="w-full min-h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
 >
 <Send className="h-4 w-4 mr-2" /> Enviar {cartItems.length} Itens para a Cozinha (KDS)
 </Button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
