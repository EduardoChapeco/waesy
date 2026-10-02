import React, { useState } from 'react';
import { Bus, Check, Search, Shield, Users, Layers, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { BusSeatDTO } from '@/services/group-tours.functions';

export interface FleetVehiclePreset {
 id: string;
 name: string;
 companyName: string;
 plate: string;
 driverName?: string;
 driverPhone?: string;
 vehicleType: 'bus_double_decker' | 'bus_leito_total' | 'bus_executivo' | 'van_luxo';
 totalCapacity: number;
 isDoubleDecker: boolean;
 amenities: string[];
}

export const FLEET_VEHICLE_PRESETS: FleetVehiclePreset[] = [
 {
 id: 'fl-dd-01',
 name: 'Marcopolo Paradiso G8 1800 DD (Double Decker)',
 companyName: 'Viação Ouro e Prata / Frota Própria',
 plate: 'WSY-2026',
 driverName: 'Marcos Silveira',
 driverPhone: '(49) 98877-6655',
 vehicleType: 'bus_double_decker',
 totalCapacity: 56,
 isDoubleDecker: true,
 amenities: ['Piso Inferior Leito Cama', 'Piso Superior Semi-Leito', 'Wi-Fi 5G', 'Sanitário', 'Geladeira'],
 },
 {
 id: 'fl-lt-02',
 name: 'Scania K410 Leito Total Confort',
 companyName: 'Turismo Executivo Express',
 plate: 'TUR-4040',
 driverName: 'Carlos Mendonça',
 driverPhone: '(49) 99123-4567',
 vehicleType: 'bus_leito_total',
 totalCapacity: 44,
 isDoubleDecker: false,
 amenities: ['Poltronas Reclináveis 150º', 'Carregador USB', 'Cafeteira', 'Sanitário'],
 },
 {
 id: 'fl-ex-03',
 name: 'Mercedes-Benz O500 RSD Executivo',
 companyName: 'TransSul Fretamento',
 plate: 'BRS-1234',
 driverName: 'Roberto Dias',
 driverPhone: '(49) 99888-1122',
 vehicleType: 'bus_executivo',
 totalCapacity: 48,
 isDoubleDecker: false,
 amenities: ['Ar Condicionado Digital', 'Monitores de TV', 'Wi-Fi', 'Sanitário'],
 },
];

interface BusFleetSelectorModalProps {
 isOpen: boolean;
 onClose: () => void;
 currentSeats: BusSeatDTO[];
 onSelectVehicle: (data: {
 busCompanyName: string;
 busPlate: string;
 driverName: string;
 driverPhone: string;
 newSeats: BusSeatDTO[];
 }) => void;
}

export function BusFleetSelectorModal({
 isOpen,
 onClose,
 currentSeats,
 onSelectVehicle,
}: BusFleetSelectorModalProps) {
 const [search, setSearch] = useState('');
 const [selectedId, setSelectedId] = useState<string>(FLEET_VEHICLE_PRESETS[0].id);

 const filteredVehicles = FLEET_VEHICLE_PRESETS.filter(
 (v) =>
 v.name.toLowerCase().includes(search.toLowerCase()) ||
 v.plate.toLowerCase().includes(search.toLowerCase()) ||
 v.companyName.toLowerCase().includes(search.toLowerCase())
 );

 const handleConfirm = () => {
 const selected = FLEET_VEHICLE_PRESETS.find((v) => v.id === selectedId);
 if (!selected) return;

 // Preserva passageiros já alocados em poltronas existentes
 const passengerMap = new Map<number, { name?: string | null; doc?: string | null; phone?: string | null; point?: string | null }>();
 currentSeats.forEach((s) => {
 if (s.passenger_name) {
 passengerMap.set(s.seat_number, {
 name: s.passenger_name,
 doc: s.passenger_document,
 phone: s.passenger_phone,
 point: s.boarding_point,
 });
 }
 });

 const newSeats: BusSeatDTO[] = [];
 const cols: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

 // Gerar mapa 2D
 if (selected.isDoubleDecker) {
 // 12 poltronas leito piso inferior (andar 1)
 let seatNum = 1;
 for (let r = 1; r <= 3; r++) {
 for (const c of cols) {
 const pass = passengerMap.get(seatNum);
 newSeats.push({
 seat_number: seatNum,
 row: r,
 column: c,
 floor: 1,
 status: pass?.name ? 'reserved' : 'free',
 passenger_name: pass?.name || null,
 passenger_document: pass?.doc || null,
 passenger_phone: pass?.phone || null,
 boarding_point: pass?.point || null,
 });
 seatNum++;
 }
 }

 // 44 poltronas piso superior (andar 2)
 for (let r = 1; r <= 11; r++) {
 for (const c of cols) {
 if (seatNum > selected.totalCapacity) break;
 const pass = passengerMap.get(seatNum);
 newSeats.push({
 seat_number: seatNum,
 row: r,
 column: c,
 floor: 2,
 status: pass?.name ? 'reserved' : 'free',
 passenger_name: pass?.name || null,
 passenger_document: pass?.doc || null,
 passenger_phone: pass?.phone || null,
 boarding_point: pass?.point || null,
 });
 seatNum++;
 }
 }
 } else {
 // Ônibus 1 piso (Single decker)
 let seatNum = 1;
 const totalRows = Math.ceil(selected.totalCapacity / 4);
 for (let r = 1; r <= totalRows; r++) {
 for (const c of cols) {
 if (seatNum > selected.totalCapacity) break;
 const pass = passengerMap.get(seatNum);
 newSeats.push({
 seat_number: seatNum,
 row: r,
 column: c,
 floor: 1,
 status: pass?.name ? 'reserved' : 'free',
 passenger_name: pass?.name || null,
 passenger_document: pass?.doc || null,
 passenger_phone: pass?.phone || null,
 boarding_point: pass?.point || null,
 });
 seatNum++;
 }
 }
 }

 onSelectVehicle({
 busCompanyName: selected.companyName,
 busPlate: selected.plate,
 driverName: selected.driverName || '',
 driverPhone: selected.driverPhone || '',
 newSeats,
 });
 onClose();
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-lg bg-card border border-border shadow-2xl">
 <DialogHeader className="p-5 border-b border-border/70 bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-primary/10 text-primary">
 <Bus className="size-4" />
 </div>
 <div>
 <DialogTitle className="text-sm font-bold text-foreground">
 Vincular Ônibus da Frota 2D à Excursão
 </DialogTitle>
 <p className="text-[11px] text-muted-foreground">
 Importa automaticamente capacidade, motorista, placa e mapa 2D de poltronas
 </p>
 </div>
 </div>
 </DialogHeader>

 <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
 <div className="relative">
 <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
 <Input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Buscar veículo por modelo, placa ou viação..."
 className="h-10 pl-9 rounded-lg text-xs bg-muted/20"
 />
 </div>

 <div className="space-y-3">
 {filteredVehicles.map((v) => (
 <div
 key={v.id}
 onClick={() => setSelectedId(v.id)}
 className={'p-4 rounded-lg border transition-all cursor-pointer space-y-3 ' + (
 selectedId === v.id
 ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
 : 'border-border bg-card hover:border-border/80'
 )}
 >
 <div className="flex items-start justify-between">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground">{v.name}</span>
 {v.isDoubleDecker && (
 <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px] py-0 h-4">
 Double Decker (2 Andares)
 </Badge>
 )}
 </div>
 <p className="text-[11px] text-muted-foreground">{v.companyName} · Placa: <strong className="font-mono text-foreground">{v.plate}</strong></p>
 </div>
 <Badge variant="outline" className="font-mono text-[10px]">
 {v.totalCapacity} lugares
 </Badge>
 </div>

 <div className="flex flex-wrap gap-1 pt-1">
 {v.amenities.map((a, i) => (
 <span key={i} className="px-2 py-1 rounded-md bg-muted text-[10px] text-muted-foreground font-medium">
 {a}
 </span>
 ))}
 </div>

 {v.driverName && (
 <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40 flex items-center justify-between">
 <span>Motorista: <strong className="text-foreground">{v.driverName}</strong></span>
 <span className="font-mono">{v.driverPhone}</span>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>

 <DialogFooter className="p-4 border-t border-border/70 bg-muted/10 flex items-center justify-between sm:justify-between">
 <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-xs">
 Cancelar
 </Button>
 <Button
 type="button"
 onClick={handleConfirm}
 className="rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-md px-5"
 >
 Vincular Ônibus Selecionado
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
