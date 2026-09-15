import React, { useState } from "react";
import type { HotelRoomAllocationDTO } from "@/services/group-tours.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash, BedDouble, Users, User, Building, Download, Copy, Printer, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface RoomingListManagerProps {
 rooms: HotelRoomAllocationDTO[];
 onRoomsChange: (updatedRooms: HotelRoomAllocationDTO[]) => void;
 tourTitle?: string;
}

export function RoomingListManager({ rooms, onRoomsChange, tourTitle }: RoomingListManagerProps) {
 const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
 const [hotelName, setHotelName] = useState("");
 const [roomNumber, setRoomNumber] = useState("");
 const [roomType, setRoomType] = useState<"single" | "double_couple" | "double_twin" | "triple" | "quadruple">("double_couple");

 // Passageiros do quarto temporário
 const [passengersList, setPassengersList] = useState<Array<{ name: string; document?: string }>>([
 { name: "", document: "" },
 ]);

 const capacityMap = {
 single: 1,
 double_couple: 2,
 double_twin: 2,
 triple: 3,
 quadruple: 4,
 };

 const handleRoomTypeChange = (type: any) => {
 setRoomType(type);
 const targetCap = capacityMap[type as keyof typeof capacityMap];
 setPassengersList((prev) => {
 const next = [...prev];
 while (next.length < targetCap) next.push({ name: "", document: "" });
 return next.slice(0, targetCap);
 });
 };

 const handleAddRoom = () => {
 if (!hotelName.trim()) return;

 const newRoom: HotelRoomAllocationDTO = {
 room_id: "rm_" + Math.random().toString(36).substring(2, 7),
 hotel_name: hotelName.trim(),
 room_number: roomNumber.trim() || null,
 room_type: roomType,
 capacity: capacityMap[roomType],
 passengers: passengersList.filter((p) => p.name.trim()),
 };

 onRoomsChange([...rooms, newRoom]);
 setIsAddRoomOpen(false);
 setHotelName("");
 setRoomNumber("");
 setPassengersList([{ name: "", document: "" }]);
 };

 const handleRemoveRoom = (roomId: string) => {
 onRoomsChange(rooms.filter((r) => r.room_id !== roomId));
 };

 const totalPaxInRooms = rooms.reduce((acc, r) => acc + r.passengers.length, 0);

 const handleExportCSV = () => {
 if (rooms.length === 0) {
 toast.error("Nenhum quarto cadastrado no Rooming List.");
 return;
 }

 const headers = ["Hotel", "Numero_Quarto", "Tipo_Acomodacao", "Capacidade", "Hospede_Nome", "Documento"];
 const rows: string[] = [];

 rooms.forEach((r) => {
 if (r.passengers.length === 0) {
 rows.push([
 `"${r.hotel_name}"`,
 `"${r.room_number || "A Definir"}"`,
 `"${r.room_type}"`,
 r.capacity,
 `"Vazio"`,
 `""`,
 ].join(";"));
 } else {
 r.passengers.forEach((p) => {
 rows.push([
 `"${r.hotel_name}"`,
 `"${r.room_number || "A Definir"}"`,
 `"${r.room_type}"`,
 r.capacity,
 `"${p.name}"`,
 `"${p.document || ""}"`,
 ].join(";"));
 });
 }
 });

 const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
 const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.setAttribute("href", url);
 link.setAttribute("download", `rooming-list-${(tourTitle || "excursao").toLowerCase().replace(/\s+/g, "-")}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 toast.success("Rooming List exportado com sucesso (CSV / Excel).");
 };

 const handleCopyReceptionSummary = () => {
 if (rooms.length === 0) {
 toast.error("Nenhum quarto para copiar.");
 return;
 }

 let summary = `📋 ROOMING LIST OFICIAL — ${tourTitle || "Excursão Waesy"}\n`;
 summary += `Total de Quartos: ${rooms.length} | Total de Hóspedes: ${totalPaxInRooms}\n\n`;

 rooms.forEach((r, idx) => {
 summary += `Quarto ${idx + 1}: ${r.room_number ? `Nº ${r.room_number}` : "A Definir"} [${r.room_type.toUpperCase()}] — Hotel: ${r.hotel_name}\n`;
 if (r.passengers.length === 0) {
 summary += `   (Sem hóspedes alocados)\n`;
 } else {
 r.passengers.forEach((p) => {
 summary += `   • ${p.name}${p.document ? ` (Doc: ${p.document})` : ""}\n`;
 });
 }
 summary += `\n`;
 });

 navigator.clipboard.writeText(summary);
 toast.success("Resumo do Rooming List copiado para a área de transferência!");
 };

 return (
 <div className="space-y-4">
 {/* Header do Rooming List */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border/80 text-xs">
 <div className="flex items-center gap-2">
 <Building className="size-4 text-primary shrink-0" />
 <span className="font-bold text-foreground">
 Rooming List: {rooms.length} quartos ({totalPaxInRooms} hóspedes alocados)
 </span>
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 {rooms.length > 0 && (
 <>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleCopyReceptionSummary}
 className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
 title="Copiar lista formatada para enviar à recepção do hotel via WhatsApp"
 >
 <Copy className="size-3.5 text-muted-foreground" />
 <span className="hidden sm:inline">Copiar Recepção</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleExportCSV}
 className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
 title="Exportar planilha CSV / Excel para o hotel"
 >
 <FileSpreadsheet className="size-3.5 text-emerald-600" />
 <span className="hidden sm:inline">Exportar CSV</span>
 </Button>
 </>
 )}

 <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
 <DialogTrigger asChild>
 <Button size="sm" className="h-8 rounded-xl text-xs font-bold gap-1 bg-foreground text-background cursor-pointer">
 <Plus className="size-3.5" /> Adicionar Quarto
 </Button>
 </DialogTrigger>

 <DialogContent className="sm:max-w-md sm:rounded-2xl p-6 bg-card border-border">
 <DialogHeader className="space-y-1">
 <DialogTitle className="text-base font-bold text-foreground">
 Novo Quarto no Hotel
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-3.5 pt-2 text-xs">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Nome do Hotel / Pousada *</Label>
 <Input
 placeholder="Ex: Hotel Plaza Centro"
 value={hotelName}
 onChange={(e) => setHotelName(e.target.value)}
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Tipo de Acomodação</Label>
 <select
 value={roomType}
 onChange={(e) => handleRoomTypeChange(e.target.value)}
 className="w-full h-10 rounded-xl bg-background border border-border px-2 text-xs"
 >
 <option value="single">Single (1 Pessoa)</option>
 <option value="double_couple">Duplo Casal (2 Pessoas)</option>
 <option value="double_twin">Duplo Twin / 2 Camas (2 Pessoas)</option>
 <option value="triple">Triplo (3 Pessoas)</option>
 <option value="quadruple">Quádruplo (4 Pessoas)</option>
 </select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Nº do Quarto (Opcional)</Label>
 <Input
 placeholder="Ex: 204"
 value={roomNumber}
 onChange={(e) => setRoomNumber(e.target.value)}
 className="h-10 text-xs rounded-xl"
 />
 </div>
 </div>

 <div className="space-y-2 pt-1 border-t border-border/40">
 <Label className="text-xs font-bold">Hóspedes deste Quarto ({capacityMap[roomType]} vagas)</Label>
 {passengersList.map((p, idx) => (
 <div key={idx} className="grid grid-cols-2 gap-2">
 <Input
 placeholder={`Hóspede ${idx + 1}`}
 value={p.name}
 onChange={(e) => {
 const updated = [...passengersList];
 updated[idx].name = e.target.value;
 setPassengersList(updated);
 }}
 className="h-8 text-xs rounded-lg"
 />
 <Input
 placeholder="Documento"
 value={p.document || ""}
 onChange={(e) => {
 const updated = [...passengersList];
 updated[idx].document = e.target.value;
 setPassengersList(updated);
 }}
 className="h-8 text-xs rounded-lg font-mono"
 />
 </div>
 ))}
 </div>

 <Button
 type="button"
 onClick={handleAddRoom}
 className="w-full h-11 rounded-xl text-xs font-bold bg-foreground text-background mt-2"
 >
 Salvar Quarto no Rooming List
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 </div>

 {/* Grid de Quartos Alocados */}
 {rooms.length === 0 ? (
 <div className="py-12 text-center space-y-2 rounded-2xl bg-muted/20 border border-border/60 p-6 text-xs text-muted-foreground">
 <BedDouble className="size-8 mx-auto opacity-50" />
 <p>Nenhum quarto configurado ainda.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {rooms.map((r) => (
 <Card
 key={r.room_id}
 className="p-4 rounded-2xl border border-border/60 bg-card space-y-3 shadow-none"
 >
 <div className="flex items-center justify-between text-xs font-bold">
 <span className="flex items-center gap-1.5 truncate">
 <BedDouble className="size-4 text-primary shrink-0" />
 <span className="truncate">{r.hotel_name}</span>
 {r.room_number && <span className="font-mono text-muted-foreground">#{r.room_number}</span>}
 </span>

 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveRoom(r.room_id)}
 className="size-6 p-0 text-destructive"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>

 <div className="flex items-center gap-1.5">
 <Badge variant="outline" className="text-[10px] font-mono">
 {r.room_type === "single"
 ? "Single"
 : r.room_type === "double_couple"
 ? "Casal"
 : r.room_type === "double_twin"
 ? "Twin"
 : r.room_type === "triple"
 ? "Triplo"
 : "Quádruplo"}
 </Badge>
 <span className="text-[11px] text-muted-foreground">
 {r.passengers.length} de {r.capacity} hóspedes
 </span>
 </div>

 <div className="space-y-1 pt-1 border-t border-border/40 text-xs">
 {r.passengers.map((p, i) => (
 <div key={i} className="flex items-center gap-1.5 text-foreground font-medium truncate">
 <User className="size-3 text-muted-foreground shrink-0" />
 <span className="truncate">{p.name}</span>
 </div>
 ))}
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}
