import React, { useState } from "react";
import type { BusSeatDTO } from "@/services/group-tours.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, User, Trash, Check, Lock, ShieldCheck } from "lucide-react";

interface BusSeatMapProps {
 seats: BusSeatDTO[];
 onSeatsChange: (updatedSeats: BusSeatDTO[]) => void;
 readOnly?: boolean;
}

export function BusSeatMap({ seats, onSeatsChange, readOnly = false }: BusSeatMapProps) {
 const [selectedSeat, setSelectedSeat] = useState<BusSeatDTO | null>(null);
 const [passengerName, setPassengerName] = useState("");
 const [passengerDoc, setPassengerDoc] = useState("");
 const [passengerPhone, setPassengerPhone] = useState("");
 const [boardingPoint, setBoardingPoint] = useState("");

 const handleSeatClick = (seat: BusSeatDTO) => {
 if (readOnly) return;
 setSelectedSeat(seat);
 setPassengerName(seat.passenger_name || "");
 setPassengerDoc(seat.passenger_document || "");
 setPassengerPhone(seat.passenger_phone || "");
 setBoardingPoint(seat.boarding_point || "");
 };

 const handleSaveAllocation = () => {
 if (!selectedSeat) return;

 const isOccupied = Boolean(passengerName.trim());
 const updated = seats.map((s) => {
 if (s.seat_number === selectedSeat.seat_number) {
 return {
 ...s,
 status: (isOccupied ? "reserved" : "free") as any,
 passenger_name: passengerName.trim() || null,
 passenger_document: passengerDoc.trim() || null,
 passenger_phone: passengerPhone.trim() || null,
 boarding_point: boardingPoint.trim() || null,
 };
 }
 return s;
 });

 onSeatsChange(updated);
 setSelectedSeat(null);
 };

 const handleClearSeat = () => {
 if (!selectedSeat) return;

 const updated = seats.map((s) => {
 if (s.seat_number === selectedSeat.seat_number) {
 return {
 ...s,
 status: "free" as any,
 passenger_name: null,
 passenger_document: null,
 passenger_phone: null,
 boarding_point: null,
 };
 }
 return s;
 });

 onSeatsChange(updated);
 setSelectedSeat(null);
 };

 // Agrupa os assentos por fileira (row)
 const rowsMap = new Map<number, { A?: BusSeatDTO; B?: BusSeatDTO; C?: BusSeatDTO; D?: BusSeatDTO }>();
 seats.forEach((seat) => {
 if (!rowsMap.has(seat.row)) {
 rowsMap.set(seat.row, {});
 }
 rowsMap.get(seat.row)![seat.column] = seat;
 });

 const sortedRows = Array.from(rowsMap.entries()).sort(([a], [b]) => a - b);
 const occupiedCount = seats.filter((s) => s.status === "reserved").length;

 return (
 <div className="space-y-4">
 {/* Resumo de Ocupação */}
 <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/80 text-xs">
 <div className="flex items-center gap-2">
 <Users className="size-4 text-primary" />
 <span className="font-bold text-foreground">
 Ocupação: {occupiedCount} de {seats.length} poltronas
 </span>
 </div>

 <div className="flex items-center gap-3 text-[11px]">
 <span className="flex items-center gap-1">
 <span className="size-2.5 rounded-full bg-emerald-500" /> Livre
 </span>
 <span className="flex items-center gap-1">
 <span className="size-2.5 rounded-full bg-slate-900" /> Ocupada
 </span>
 </div>
 </div>

 {/* Carcaça Visual do Ônibus */}
 <div className="p-5 rounded-lg bg-slate-100 border-2 border-slate-300 max-w-sm mx-auto space-y-3 shadow-inner">
 {/* Cabine do Motorista & Entrada */}
 <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-slate-300 text-[10px] font-mono font-bold text-slate-500 uppercase">
 <div className="flex items-center gap-1">
 <div className="size-7 rounded-lg bg-slate-300 flex items-center justify-center text-slate-700">
 💺
 </div>
 <span>Motorista</span>
 </div>

 <div className="px-2 py-1 rounded bg-slate-200 text-slate-600">
 🚪 Entrada
 </div>
 </div>

 {/* Grade de Fileiras 2x2 com Corredor Central */}
 <div className="space-y-2">
 {sortedRows.map(([rowNum, rowSeats]) => (
 <div key={rowNum} className="flex items-center justify-between gap-1">
 {/* Lado Esquerdo: Coluna A e B */}
 <div className="flex items-center gap-1">
 {rowSeats.A && (
 <SeatButton seat={rowSeats.A} onClick={() => handleSeatClick(rowSeats.A!)} />
 )}
 {rowSeats.B && (
 <SeatButton seat={rowSeats.B} onClick={() => handleSeatClick(rowSeats.B!)} />
 )}
 </div>

 {/* Corredor Central com Número da Fileira */}
 <span className="text-[9px] font-mono text-slate-400 font-bold px-1">
 {rowNum}
 </span>

 {/* Lado Direito: Coluna C e D */}
 <div className="flex items-center gap-1">
 {rowSeats.C && (
 <SeatButton seat={rowSeats.C} onClick={() => handleSeatClick(rowSeats.C!)} />
 )}
 {rowSeats.D && (
 <SeatButton seat={rowSeats.D} onClick={() => handleSeatClick(rowSeats.D!)} />
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Fundo do Ônibus (Banheiro & Frigobar) */}
 <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-slate-300 text-[10px] font-mono font-bold text-slate-500 uppercase">
 <div className="px-2 py-1 rounded bg-slate-200 text-slate-600">
 🧊 Frigobar
 </div>
 <div className="px-2 py-1 rounded bg-slate-200 text-slate-600">
 🚻 Banheiro
 </div>
 </div>
 </div>

 {/* Modal de Alocação de Passageiro */}
 <Dialog open={Boolean(selectedSeat)} onOpenChange={(open) => !open && setSelectedSeat(null)}>
 <DialogContent className="sm:max-w-md sm:rounded-lg p-6 bg-card border-border">
 <DialogHeader className="space-y-1">
 <DialogTitle className="text-base font-bold text-foreground">
 Poltrona #{selectedSeat?.seat_number} ({selectedSeat?.column})
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-4 pt-2 text-xs">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Nome do Passageiro</Label>
 <Input
 placeholder="Nome completo"
 value={passengerName}
 onChange={(e) => setPassengerName(e.target.value)}
 className="h-10 text-xs rounded-lg"
 />
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Documento (RG/CPF)</Label>
 <Input
 placeholder="000.000.000-00"
 value={passengerDoc}
 onChange={(e) => setPassengerDoc(e.target.value)}
 className="h-10 text-xs rounded-lg font-mono"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Telefone / WhatsApp</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={passengerPhone}
 onChange={(e) => setPassengerPhone(e.target.value)}
 className="h-10 text-xs rounded-lg"
 />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Ponto de Embarque</Label>
 <Input
 placeholder="Ex: Rodoviária Central ou Posto BR"
 value={boardingPoint}
 onChange={(e) => setBoardingPoint(e.target.value)}
 className="h-10 text-xs rounded-lg"
 />
 </div>

 <div className="flex items-center gap-2 pt-2">
 {selectedSeat?.passenger_name && (
 <Button
 type="button"
 variant="outline"
 onClick={handleClearSeat}
 className="flex-1 rounded-lg text-xs font-bold h-11 text-destructive hover:bg-destructive/10"
 >
 <Trash className="size-4 mr-1" /> Liberar Poltrona
 </Button>
 )}

 <Button
 type="button"
 onClick={handleSaveAllocation}
 className="flex-1 rounded-lg text-xs font-bold h-11 bg-foreground text-background"
 >
 <Check className="size-4 mr-1" /> Salvar Passageiro
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

function SeatButton({ seat, onClick }: { seat: BusSeatDTO; onClick: () => void }) {
 const isOccupied = seat.status === "reserved";

 return (
 <button
 type="button"
 onClick={onClick}
 className={`size-11 rounded-lg flex flex-col items-center justify-center font-mono transition-all cursor-pointer shadow-xs ${
 isOccupied
 ? "bg-slate-900 text-white font-black ring-1 ring-slate-800"
 : "bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border border-emerald-300"
 }`}
 title={isOccupied ? `Ocupado: ${seat.passenger_name}` : `Poltrona ${seat.seat_number} Livre`}
 >
 <span className="text-xs font-black">{seat.seat_number}</span>
 <span className="text-[8px] opacity-70 uppercase truncate max-w-[36px]">
 {isOccupied ? seat.passenger_name?.split(" ")[0] : seat.column}
 </span>
 </button>
 );
}
