import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
 Utensils, 
 Plus, 
 Send, 
 Check, 
 Users, 
 Clock, 
 DollarSign, 
 Search,
 ArrowLeft,
 Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
 listRestaurantTables, 
 updateRestaurantTableStatus,
 listKdsActiveOrders 
} from "@/services/pdv.functions";

export const Route = createFileRoute("/_store/garcom")({
 head: () => ({ meta: [{ title: "App do Garçom | Terminal Móvel" }] }),
 component: GarcomTerminalPage,
});

function GarcomTerminalPage() {
 const queryClient = useQueryClient();
 const [selectedTable, setSelectedTable] = useState<any | null>(null);
 const [guestsCount, setGuestsCount] = useState(2);
 const [cartItems, setCartItems] = useState<Array<{ name: string; quantity: number; notes: string }>>([]);
 const [newItemName, setNewItemName] = useState("");
 const [newItemNotes, setNewItemNotes] = useState("");

 const { data: tables = [], isLoading } = useQuery({
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
 <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3.5 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="h-9 w-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
 <Utensils className="h-4 w-4" />
 </div>
 <div>
 <h1 className="font-bold text-sm leading-tight">Salão & Comandas</h1>
 <p className="text-[11px] text-muted-foreground">Terminal do Garçom</p>
 </div>
 </div>

 {selectedTable && (
 <Button 
 variant="ghost" 
 size="sm" 
 onClick={() => setSelectedTable(null)}
 className="min-h-[44px] h-11 px-3 text-xs font-semibold gap-1.5"
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
 ) : tables.length === 0 ? (
 <div className="bg-card border border-border p-8 rounded-2xl text-center text-sm text-muted-foreground">
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
 className={`p-4 rounded-2xl border text-left transition-all min-h-[110px] flex flex-col justify-between ${
 isOccupied 
 ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" 
 : isBilling 
 ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
 : "bg-card border-border hover:border-primary/50 text-foreground"
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="font-black text-lg">Mesa {table.table_number}</span>
 <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-1.5 rounded-md">
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
 <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="font-black text-2xl">Mesa {selectedTable.table_number}</h2>
 <p className="text-xs text-muted-foreground">Zona: {selectedTable.zone} • Capacidade: {selectedTable.capacity} pessoas</p>
 </div>
 <Badge variant="outline" className="text-xs font-bold py-1 px-3 rounded-xl uppercase">
 {selectedTable.status}
 </Badge>
 </div>

 {selectedTable.status === "available" ? (
 <div className="pt-2">
 <p className="text-xs text-muted-foreground mb-2">Mesa livre. Clique para abrir comanda:</p>
 <Button
 onClick={() => occupyTableMutation.mutate(selectedTable.id)}
 className="w-full min-h-[48px] rounded-2xl font-bold bg-primary text-primary-foreground"
 >
 Abrir Mesa para {guestsCount} Pessoas
 </Button>
 </div>
 ) : (
 <div className="pt-2 space-y-4">
 {/* Formulário Rápido de Adição de Itens para Cozinha */}
 <div className="space-y-2 bg-muted/40 p-3.5 rounded-2xl border border-border">
 <h3 className="font-bold text-xs text-foreground">Lançar Item para a Cozinha</h3>
 <div className="flex gap-2">
 <Input
 placeholder="Nome do Prato / Bebida"
 value={newItemName}
 onChange={(e) => setNewItemName(e.target.value)}
 className="min-h-[44px] rounded-xl text-sm"
 />
 <Button onClick={addItemToComanda} className="min-h-[44px] rounded-xl px-4">
 <Plus className="h-4 w-4" />
 </Button>
 </div>
 <Input
 placeholder="Observações (ex: sem cebola, gelo e limão)"
 value={newItemNotes}
 onChange={(e) => setNewItemNotes(e.target.value)}
 className="min-h-[40px] rounded-xl text-xs"
 />
 </div>

 {/* Itens na Comanda Atual */}
 {cartItems.length > 0 && (
 <div className="space-y-2">
 <h4 className="text-xs font-semibold text-muted-foreground">Itens Prontos para Enviar:</h4>
 {cartItems.map((item, idx) => (
 <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
 <div>
 <div className="font-bold text-sm">{item.name}</div>
 {item.notes && <div className="text-[11px] text-muted-foreground">Obs: {item.notes}</div>}
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
 className="text-rose-500 h-8 w-8 p-0"
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
 className="w-full min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
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
