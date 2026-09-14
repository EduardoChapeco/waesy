import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
 TravelProposalDTO,
 FlightSegmentDTO,
 HotelOptionDTO,
 ItineraryDayDTO,
} from "@/services/travel-proposal.functions";
import { listHotelsBank } from "@/services/travel-catalog.functions";
import { CANONICAL_DESTINATIONS } from "@/lib/destinations-catalog";
import { FAMOUS_HOTEL_PRESETS, type HotelPreset } from "@/lib/hotel-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ui/image-upload";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
 Plus,
 Minus,
 Trash,
 Plane,
 Building2,
 Calendar,
 DollarSign,
 Info,
 CheckCircle,
 MapPin,
 Clock,
 Compass,
 Zap,
 BedDouble,
} from "lucide-react";
import type { ProposalRoomItem } from "../new-travel-proposal-sheet";

interface StudioSidebarEditorProps {
 proposal: TravelProposalDTO;
 onChange: (patch: Partial<TravelProposalDTO>) => void;
}

export function StudioSidebarEditor({ proposal, onChange }: StudioSidebarEditorProps) {
 const { data: hotelsBank = [] } = useQuery({
 queryKey: ["hotels-bank-studio"],
 queryFn: () => listHotelsBank().catch(() => []),
 });

 // Estado local para input de preço em Reais amigável
 const [priceInputReais, setPriceInputReais] = useState<string>(() => {
 const cents = proposal.pricing?.total_price_cents || 0;
 return cents > 0 ? (cents / 100).toFixed(2) : "";
 });

 const handlePriceChange = (valStr: string) => {
 setPriceInputReais(valStr);
 const cleaned = valStr.replace(/[^\d.,]/g, "").replace(",", ".");
 const valFloat = parseFloat(cleaned);
 if (!isNaN(valFloat) && valFloat >= 0) {
 const cents = Math.round(valFloat * 100);
 onChange({
 pricing: {
 ...proposal.pricing,
 total_price_cents: cents,
 },
 });
 }
 };

 // Derivação e Handlers de Quartos (Rooming List)
 const currentRooms: ProposalRoomItem[] =
 proposal.rooms && proposal.rooms.length > 0
 ? proposal.rooms
 : [
 {
 id: "room-1",
 roomNumber: 1,
 roomType: "Casal",
 adults: proposal.adults_count || 2,
 children: proposal.children_count || 0,
 childrenAges: [],
 },
 ];

 const totalAdults = currentRooms.reduce((acc, r) => acc + r.adults, 0);
 const totalChildren = currentRooms.reduce((acc, r) => acc + r.children, 0);

 const handleAddRoom = () => {
 const nextNum = currentRooms.length + 1;
 const newRooms = [
 ...currentRooms,
 {
 id: `room-${Date.now()}-${nextNum}`,
 roomNumber: nextNum,
 roomType: "Casal",
 adults: 2,
 children: 0,
 childrenAges: [],
 },
 ];
 const newTotalAdults = newRooms.reduce((acc, r) => acc + r.adults, 0);
 const newTotalChildren = newRooms.reduce((acc, r) => acc + r.children, 0);
 onChange({ rooms: newRooms, adults_count: newTotalAdults, children_count: newTotalChildren });
 };

 const handleRemoveRoom = (roomId: string) => {
 if (currentRooms.length <= 1) return;
 const newRooms = currentRooms
 .filter((r) => r.id !== roomId)
 .map((r, idx) => ({ ...r, roomNumber: idx + 1 }));
 const newTotalAdults = newRooms.reduce((acc, r) => acc + r.adults, 0);
 const newTotalChildren = newRooms.reduce((acc, r) => acc + r.children, 0);
 onChange({ rooms: newRooms, adults_count: newTotalAdults, children_count: newTotalChildren });
 };

 const handleUpdateRoomAdults = (roomId: string, delta: number) => {
 const newRooms = currentRooms.map((r) => {
 if (r.id !== roomId) return r;
 const newAdults = Math.max(1, Math.min(6, r.adults + delta));
 return { ...r, adults: newAdults };
 });
 const newTotalAdults = newRooms.reduce((acc, r) => acc + r.adults, 0);
 onChange({ rooms: newRooms, adults_count: newTotalAdults });
 };

 const handleUpdateRoomChildren = (roomId: string, delta: number) => {
 const newRooms = currentRooms.map((r) => {
 if (r.id !== roomId) return r;
 const newChildren = Math.max(0, Math.min(4, r.children + delta));
 let newAges = [...(r.childrenAges || [])];
 if (newChildren > newAges.length) {
 while (newAges.length < newChildren) newAges.push(5);
 } else if (newChildren < newAges.length) {
 newAges = newAges.slice(0, newChildren);
 }
 return { ...r, children: newChildren, childrenAges: newAges };
 });
 const newTotalChildren = newRooms.reduce((acc, r) => acc + r.children, 0);
 onChange({ rooms: newRooms, children_count: newTotalChildren });
 };

 const handleUpdateChildAge = (roomId: string, childIdx: number, age: number) => {
 const newRooms = currentRooms.map((r) => {
 if (r.id !== roomId) return r;
 const newAges = [...(r.childrenAges || [])];
 newAges[childIdx] = age;
 return { ...r, childrenAges: newAges };
 });
 onChange({ rooms: newRooms });
 };

 const handleUpdateRoomType = (roomId: string, roomType: string) => {
 const newRooms = currentRooms.map((r) =>
 r.id === roomId ? { ...r, roomType } : r
 );
 onChange({ rooms: newRooms });
 };

 const handleImportHotelFromBank = (hotelId: string) => {
 const hotel = (hotelsBank || []).find((h: any) => h.id === hotelId);
 if (!hotel) return;

 const firstRoom = hotel.room_categories?.[0];
 const newHotel: HotelOptionDTO = {
 id: "ht_" + Math.random().toString(36).substring(2, 7),
 hotel_name: hotel.name,
 stars: hotel.stars || 4,
 room_type: firstRoom?.name || "Apartamento Superior",
 board_basis: (hotel.regime_options?.[0] as any) || "all_inclusive",
 checkin_date: proposal.travel_start_date || "2026-10-10",
 checkout_date: proposal.travel_end_date || "2026-10-15",
 nights_count: 5,
 amenities: (hotel.badges && hotel.badges.length > 0) ? hotel.badges : ["Piscina", "Wi-Fi", "Ar Condicionado"],
 };

 const patch: Partial<TravelProposalDTO> = {
 hotels: [...proposal.hotels, newHotel],
 cover_image_url: proposal.cover_image_url || hotel.cover_photo_url || (hotel.photos && hotel.photos[0]) || "",
 };
 if (!proposal.destination_city && hotel.city) {
 patch.destination_city = hotel.city + (hotel.state ? ', ' + hotel.state : '');
 }
 onChange(patch);
 toast.success(`Hotel ${hotel.name} importado com sucesso do Banco de Hotéis!`);
 };

 const handleImportPresetHotel = (preset: HotelPreset) => {
 const newHotel: HotelOptionDTO = {
 id: "ht_" + Math.random().toString(36).substring(2, 7),
 hotel_name: preset.name,
 stars: preset.stars || 5,
 room_type: "Apartamento Luxo / Bangalô",
 board_basis: (preset.regime_options?.[0] as any) || "all_inclusive",
 checkin_date: proposal.travel_start_date || "2026-10-10",
 checkout_date: proposal.travel_end_date || "2026-10-15",
 nights_count: 5,
 amenities: preset.badges || ["Piscina", "Wi-Fi", "Pé na Areia"],
 };

 onChange({
 hotels: [...proposal.hotels, newHotel],
 cover_image_url: proposal.cover_image_url || preset.cover_photo_url || "",
 });
 };

 // Helpers de Voos
 const handleAddFlight = () => {
 const newFlight: FlightSegmentDTO = {
 id: "fl_" + Math.random().toString(36).substring(2, 7),
 type: proposal.flights.length === 0 ? "outbound" : "return",
 airline: "LATAM Airlines",
 airline_name: "LATAM Airlines",
 origin: "XAP",
 origin_iata: "XAP",
 origin_city: "Chapecó",
 destination: "GRU",
 destination_iata: "GRU",
 destination_city: "São Paulo",
 departure_time: "08:30",
 arrival_time: "10:00",
 baggage_included: "Mochila + Mala 10kg",
 stops_count: 0,
 };
 onChange({ flights: [...proposal.flights, newFlight] });
 };

 const handleRemoveFlight = (id?: string) => {
 if (!id) return;
 onChange({ flights: proposal.flights.filter((f) => f.id !== id) });
 };

 const handleFlightChange = (id: string | undefined, field: keyof FlightSegmentDTO, val: any) => {
 if (!id) return;
 onChange({
 flights: proposal.flights.map((f) => (f.id === id ? { ...f, [field]: val } : f)),
 });
 };

 // Helpers de Hotéis
 const handleAddHotel = () => {
 const newHotel: HotelOptionDTO = {
 id: "ht_" + Math.random().toString(36).substring(2, 7),
 hotel_name: "Resort & Spa",
 stars: 4,
 room_type: "Apartamento Luxo",
 board_basis: "breakfast",
 checkin_date: proposal.travel_start_date || "2026-10-10",
 checkout_date: proposal.travel_end_date || "2026-10-15",
 nights_count: 5,
 amenities: ["Piscina", "Wi-Fi Grátis", "Ar Condicionado"],
 };
 onChange({ hotels: [...proposal.hotels, newHotel] });
 };

 const handleRemoveHotel = (id?: string) => {
 if (!id) return;
 onChange({ hotels: proposal.hotels.filter((h) => h.id !== id) });
 };

 const handleHotelChange = (id: string | undefined, field: keyof HotelOptionDTO, val: any) => {
 if (!id) return;
 onChange({
 hotels: proposal.hotels.map((h) => (h.id === id ? { ...h, [field]: val } : h)),
 });
 };

 // Helpers de Roteiro
 const handleAddItineraryDay = () => {
 const nextDay = proposal.itinerary.length + 1;
 const newDay: ItineraryDayDTO = {
 id: "day_" + Math.random().toString(36).substring(2, 7),
 day_number: nextDay,
 title: `Dia ${nextDay} • Atividade Sugerida`,
 description: "Descrição do passeio com tempo livre para fotos, almoço típico e descanso.",
 };
 onChange({ itinerary: [...proposal.itinerary, newDay] });
 };

 const handleRemoveItineraryDay = (id?: string) => {
 if (!id) return;
 onChange({ itinerary: proposal.itinerary.filter((it) => it.id !== id) });
 };

 const handleItineraryChange = (id: string | undefined, field: keyof ItineraryDayDTO, val: any) => {
 if (!id) return;
 onChange({
 itinerary: proposal.itinerary.map((it) => (it.id === id ? { ...it, [field]: val } : it)),
 });
 };

 const handleGenerateItineraryFromDestination = () => {
 const matched = CANONICAL_DESTINATIONS.find((d) =>
 proposal.destination_city.toLowerCase().includes(d.city.toLowerCase()) ||
 d.name.toLowerCase().includes(proposal.destination_city.toLowerCase())
 );

 if (matched && matched.highlights.length > 0) {
 const generated: ItineraryDayDTO[] = matched.highlights.map((h, idx) => ({
 id: "day_" + Math.random().toString(36).substring(2, 7),
 day_number: idx + 1,
 title: `Dia ${idx + 1} • ${h}`,
 description: `Passeio imperdível em ${matched.name}. Roteiro planejado para aproveitar as melhores atrações de ${h} com tranquilidade e conforto.`,
 }));
 onChange({ itinerary: generated });
 } else {
 // Fallback inteligente
 const defaultDays: ItineraryDayDTO[] = [
 { id: "day_1", day_number: 1, title: "Dia 1 • Chegada e Check-in", description: "Recepção no aeroporto, transfer privativo para a hospedagem e descanso para aproveitar o resort." },
 { id: "day_2", day_number: 2, title: "Dia 2 • Tour de Reconhecimento & Praias", description: "Passeio pelas principais praias da região com parada para almoço em restaurante típico." },
 { id: "day_3", day_number: 3, title: "Dia 3 • Dia Livre & Experiências", description: "Aproveite a estrutura de lazer, piscinas e gastronomia ou faça passeios opcionais de barco/buggy." },
 { id: "day_4", day_number: 4, title: "Dia 4 • Check-out e Retorno", description: "Manhã livre para últimas fotos e compras locais, seguido de transfer de retorno ao aeroporto." },
 ];
 onChange({ itinerary: defaultDays });
 }
 };

 return (
 <div className="w-full h-full flex flex-col overflow-hidden bg-card">
 <div className="p-3.5 px-4 border-b border-border/80 shrink-0 bg-muted/20 flex items-center justify-between">
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
 <Compass className="size-3.5 text-primary" />
 <span>Editor TravelOS</span>
 </h3>
 <p className="text-[10px] text-muted-foreground">
 Alterações sincronizadas com o canvas em tempo real
 </p>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
 <Tabs defaultValue="dados" className="space-y-4">
 <TabsList className="grid grid-cols-5 h-9 p-1 rounded-xl bg-muted/50 text-[11px]">
 <TabsTrigger value="dados" className="text-[10px] rounded-lg font-bold">Geral</TabsTrigger>
 <TabsTrigger value="voos" className="text-[10px] rounded-lg font-bold">Voos</TabsTrigger>
 <TabsTrigger value="hotel" className="text-[10px] rounded-lg font-bold">Hotel</TabsTrigger>
 <TabsTrigger value="roteiro" className="text-[10px] rounded-lg font-bold">Roteiro</TabsTrigger>
 <TabsTrigger value="preco" className="text-[10px] rounded-lg font-bold">Preço</TabsTrigger>
 </TabsList>

 {/* ── ABA 1: DADOS GERAIS & CLIENTE ── */}
 <TabsContent value="dados" className="space-y-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Título da Proposta *</Label>
 <Input
 value={proposal.title}
 onChange={(e) => onChange({ title: e.target.value })}
 placeholder="Ex: Férias em Porto de Galinhas"
 className="h-9 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Destino Principal *</Label>
 <Input
 value={proposal.destination_city}
 onChange={(e) => onChange({ destination_city: e.target.value })}
 placeholder="Ex: Porto de Galinhas, PE"
 className="h-9 text-xs rounded-xl"
 />
 {/* Chips Rápidos de Destinos Canônicos */}
 <div className="flex flex-wrap gap-1 pt-1">
 {CANONICAL_DESTINATIONS.slice(0, 5).map((d) => (
 <button
 key={d.id}
 type="button"
 onClick={() => onChange({ destination_city: `${d.city}, ${d.state}` })}
 className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer"
 >
 {d.city}
 </button>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Nome do Passageiro *</Label>
 <Input
 value={proposal.client_name}
 onChange={(e) => onChange({ client_name: e.target.value })}
 placeholder="Nome do passageiro"
 className="h-9 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">WhatsApp *</Label>
 <Input
 value={proposal.client_whatsapp}
 onChange={(e) => onChange({ client_whatsapp: e.target.value })}
 placeholder="(49) 99999-9999"
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Data de Ida</Label>
 <Input
 type="date"
 value={proposal.travel_start_date || ""}
 onChange={(e) => onChange({ travel_start_date: e.target.value })}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Data de Retorno</Label>
 <Input
 type="date"
 value={proposal.travel_end_date || ""}
 onChange={(e) => onChange({ travel_end_date: e.target.value })}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </div>

 {/* ── Distribuição de Quartos & Passageiros (Rooming List) ── */}
 <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
 <BedDouble className="size-3.5 text-primary" />
 <span>Quartos & Hóspedes</span>
 </div>
 <span className="text-[10px] text-muted-foreground font-medium">
 {currentRooms.length} {currentRooms.length === 1 ? "quarto" : "quartos"} • {totalAdults} adt{totalChildren > 0 ? `, ${totalChildren} chd` : ""}
 </span>
 </div>

 <div className="space-y-2.5">
 {currentRooms.map((room) => (
 <div
 key={room.id}
 className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-2"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-bold text-foreground">Quarto {room.roomNumber}</span>
 <select
 value={room.roomType || "Casal"}
 onChange={(e) => handleUpdateRoomType(room.id, e.target.value)}
 className="h-6 rounded border border-border/60 bg-background px-1.5 text-[10px] text-muted-foreground"
 >
 <option value="Casal">Casal</option>
 <option value="Duplo Solteiro">2 Solteiro</option>
 <option value="Casal + Solteiro">Casal + Solteiro</option>
 <option value="Triplo Solteiro">3 Solteiro</option>
 <option value="Família (Suíte)">Família</option>
 </select>
 </div>

 {currentRooms.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveRoom(room.id)}
 className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 cursor-pointer"
 >
 <Trash className="size-2.5" />
 <span>Remover</span>
 </button>
 )}
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/40">
 <span className="text-[10px] text-muted-foreground font-semibold">Adultos</span>
 <div className="flex items-center gap-1.5">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomAdults(room.id, -1)}
 disabled={room.adults <= 1}
 className="size-5 rounded"
 >
 <Minus className="size-2.5" />
 </Button>
 <span className="text-xs font-bold min-w-3 text-center">{room.adults}</span>
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomAdults(room.id, 1)}
 disabled={room.adults >= 6}
 className="size-5 rounded"
 >
 <Plus className="size-2.5" />
 </Button>
 </div>
 </div>

 <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/40">
 <span className="text-[10px] text-muted-foreground font-semibold">Crianças</span>
 <div className="flex items-center gap-1.5">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomChildren(room.id, -1)}
 disabled={room.children <= 0}
 className="size-5 rounded"
 >
 <Minus className="size-2.5" />
 </Button>
 <span className="text-xs font-bold min-w-3 text-center">{room.children}</span>
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomChildren(room.id, 1)}
 disabled={room.children >= 4}
 className="size-5 rounded"
 >
 <Plus className="size-2.5" />
 </Button>
 </div>
 </div>
 </div>

 {room.children > 0 && (
 <div className="pt-1.5 border-t border-border/30 space-y-1">
 <span className="text-[9px] font-semibold text-muted-foreground">Idade das crianças:</span>
 <div className="flex flex-wrap gap-1.5">
 {Array.from({ length: room.children }).map((_, cIdx) => (
 <div key={cIdx} className="flex items-center gap-1">
 <span className="text-[9px] text-muted-foreground">C{cIdx + 1}:</span>
 <select
 value={room.childrenAges?.[cIdx] ?? 5}
 onChange={(e) =>
 handleUpdateChildAge(room.id, cIdx, Number(e.target.value))
 }
 className="h-6 rounded border border-border/60 bg-background px-1 text-[10px]"
 >
 {Array.from({ length: 12 }).map((_, age) => (
 <option key={age} value={age}>
 {age === 0 ? "Bebê" : `${age}a`}
 </option>
 ))}
 </select>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAddRoom}
 className="w-full h-7 rounded-lg text-[11px] font-medium border-dashed border-border/70 hover:bg-muted/40 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <Plus className="size-3" />
 <span>Adicionar Quarto</span>
 </Button>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold">Foto de Capa da Proposta (16:9)</Label>
 <ImageUpload
 value={proposal.cover_image_url || ""}
 onChange={(url) => onChange({ cover_image_url: url })}
 onRemove={() => onChange({ cover_image_url: "" })}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Capa panorâmica 16:9 para a proposta do cliente"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Validade da Proposta</Label>
 <Input
 value={proposal.valid_until || ""}
 onChange={(e) => onChange({ valid_until: e.target.value })}
 placeholder="Ex: Até 24h ou 15/10/2026"
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </TabsContent>

 {/* ── ABA 2: VOOS & MALHA AÉREA ── */}
 <TabsContent value="voos" className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold text-foreground">Trechos de Voo</span>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddFlight}
 className="h-8 text-xs rounded-xl gap-1"
 >
 <Plus className="size-3.5" /> Adicionar Trecho
 </Button>
 </div>

 {proposal.flights.map((f, idx) => (
 <div key={f.id} className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between text-xs font-bold">
 <span>Trecho #{idx + 1} ({f.type === "outbound" ? "Ida" : "Volta"})</span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveFlight(f.id)}
 className="h-7 size-7 p-0 text-destructive"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <Input
 placeholder="Cia (Ex: GOL, LATAM)"
 value={f.airline_name}
 onChange={(e) => handleFlightChange(f.id, "airline_name", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 <Input
 placeholder="Nº Voo (Ex: LA3241)"
 value={f.flight_number || ""}
 onChange={(e) => handleFlightChange(f.id, "flight_number", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="text-[9px] font-mono uppercase text-muted-foreground">Origem (IATA / Hora)</label>
 <div className="flex gap-1 mt-0.5">
 <Input
 placeholder="XAP"
 value={f.origin_iata}
 onChange={(e) => handleFlightChange(f.id, "origin_iata", e.target.value.toUpperCase())}
 className="h-8 text-xs rounded-lg uppercase font-mono w-16"
 />
 <Input
 placeholder="08:30"
 value={f.departure_time}
 onChange={(e) => handleFlightChange(f.id, "departure_time", e.target.value)}
 className="h-8 text-xs rounded-lg flex-1"
 />
 </div>
 </div>

 <div>
 <label className="text-[9px] font-mono uppercase text-muted-foreground">Destino (IATA / Hora)</label>
 <div className="flex gap-1 mt-0.5">
 <Input
 placeholder="GRU"
 value={f.destination_iata}
 onChange={(e) => handleFlightChange(f.id, "destination_iata", e.target.value.toUpperCase())}
 className="h-8 text-xs rounded-lg uppercase font-mono w-16"
 />
 <Input
 placeholder="10:00"
 value={f.arrival_time}
 onChange={(e) => handleFlightChange(f.id, "arrival_time", e.target.value)}
 className="h-8 text-xs rounded-lg flex-1"
 />
 </div>
 </div>
 </div>

 <Input
 placeholder="Bagagem (Ex: 1x 10kg + Mochila)"
 value={typeof f.baggage_included === "boolean" ? (f.baggage_included ? "Inclusa" : "Não inclusa") : (f.baggage_included || "")}
 onChange={(e) => handleFlightChange(f.id, "baggage_included", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 ))}
 </TabsContent>

 {/* ── ABA 3: HOTELARIA & HOSPEDAGENS ── */}
 <TabsContent value="hotel" className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold text-foreground">Hotéis & Pousadas</span>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddHotel}
 className="h-8 text-xs rounded-xl gap-1"
 >
 <Plus className="size-3.5" /> Adicionar Manual
 </Button>
 </div>

 {/* Importar do Banco de Hotéis */}
 {hotelsBank && hotelsBank.length > 0 && (
 <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
 <div className="flex items-center gap-1.5 text-primary text-[11px] font-bold">
 <Building2 className="size-3.5" />
 <span>Importar do Banco de Hotéis</span>
 </div>
 <select
 onChange={(e) => {
 if (e.target.value) {
 handleImportHotelFromBank(e.target.value);
 e.target.value = "";
 }
 }}
 defaultValue=""
 className="w-full h-8 text-xs rounded-lg bg-background border border-border px-2 text-foreground"
 >
 <option value="" disabled>Escolha um hotel/resort cadastrado...</option>
 {hotelsBank.map((hb: any) => (
 <option key={hb.id} value={hb.id}>
 {hb.name} ({hb.stars}★ - {hb.regime_options?.[0] || "Padrão"})
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Presets de Resorts Famosos (1-Toque) */}
 <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5">
 <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
 <Zap className="size-3 text-amber-500" />
 <span>Presets de Resorts Famosos:</span>
 </span>
 <div className="flex flex-wrap gap-1">
 {FAMOUS_HOTEL_PRESETS.slice(0, 4).map((p) => (
 <button
 key={p.id}
 type="button"
 onClick={() => handleImportPresetHotel(p)}
 className="px-2 py-0.5 rounded-md bg-background border border-border/60 hover:border-primary/50 text-[10px] font-semibold text-foreground cursor-pointer transition-colors"
 >
 ⚡ {p.name.split(" ")[0]}
 </button>
 ))}
 </div>
 </div>

 {proposal.hotels.map((h) => {
 const matchedBankHotel = hotelsBank.find((hb: any) =>
 hb.name?.toLowerCase().trim() === h.hotel_name?.toLowerCase().trim() ||
 h.hotel_name?.toLowerCase().includes(hb.name?.toLowerCase())
 );

 return (
 <div key={h.id} className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between text-xs font-bold">
 <span>{h.hotel_name || "Novo Hotel"}</span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveHotel(h.id)}
 className="h-7 size-7 p-0 text-destructive"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>

 <Input
 placeholder="Nome do Hotel / Resort"
 value={h.hotel_name}
 onChange={(e) => handleHotelChange(h.id, "hotel_name", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />

 <div className="grid grid-cols-2 gap-2">
 <Input
 placeholder="Quarto (Ex: Vista Mar)"
 value={h.room_type}
 onChange={(e) => handleHotelChange(h.id, "room_type", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 <select
 value={h.board_basis}
 onChange={(e) => handleHotelChange(h.id, "board_basis", e.target.value)}
 className="h-8 text-xs rounded-lg bg-background border border-border px-2"
 >
 <option value="all_inclusive">All Inclusive</option>
 <option value="full_board">Pensão Completa</option>
 <option value="half_board">Meia Pensão</option>
 <option value="breakfast">Café da Manhã</option>
 <option value="none">Sem Alimentação</option>
 </select>
 </div>

 {/* Seleção de Quartos Cadastrados no Banco */}
 {matchedBankHotel && matchedBankHotel.room_categories && matchedBankHotel.room_categories.length > 0 && (
 <div className="p-2 rounded-lg bg-background/80 border border-border/60 space-y-1">
 <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
 <BedDouble className="size-3 text-primary" />
 <span>Quartos do Resort:</span>
 </span>
 <div className="flex flex-wrap gap-1">
 {matchedBankHotel.room_categories.map((rc: any) => (
 <button
 key={rc.id}
 type="button"
 onClick={() => handleHotelChange(h.id, "room_type", rc.name)}
 className={cn(
 "px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer",
 h.room_type === rc.name
 ? "bg-primary/10 text-primary border-primary font-bold"
 : "bg-muted/50 text-muted-foreground border-border/50 hover:text-foreground"
 )}
 >
 {rc.name}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
 })}
 </TabsContent>

 {/* ── ABA 4: ROTEIRO DIA A DIA ── */}
 <TabsContent value="roteiro" className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold text-foreground">
 Dias de Viagem ({proposal.itinerary.length})
 </span>
 <div className="flex items-center gap-1.5">
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleGenerateItineraryFromDestination}
 className="h-8 text-[11px] rounded-xl gap-1 text-primary hover:text-primary"
 title="Sugerir dias a partir dos passeios oficiais do destino"
 >
 <Calendar className="size-3.5" /> Sugerir Dias
 </Button>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddItineraryDay}
 className="h-8 text-xs rounded-xl gap-1"
 >
 <Plus className="size-3.5" /> Dia
 </Button>
 </div>
 </div>

 {proposal.itinerary.length === 0 ? (
 <div className="p-4 text-center rounded-xl bg-muted/30 border border-dashed border-border/60 space-y-2">
 <Calendar className="size-6 text-muted-foreground mx-auto" />
 <p className="text-xs text-muted-foreground">Nenhum dia cadastrado no roteiro.</p>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleGenerateItineraryFromDestination}
 className="text-xs rounded-xl font-bold"
 >
 Gerar Roteiro Sugerido pelo Destino
 </Button>
 </div>
 ) : (
 proposal.itinerary.map((day, idx) => (
 <div key={day.id} className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between text-xs font-bold">
 <span className="text-primary font-mono text-[11px]">
 Dia {day.day_number || idx + 1}
 </span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveItineraryDay(day.id)}
 className="h-7 size-7 p-0 text-destructive"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>

 <Input
 placeholder="Título da Atividade (Ex: Tour Piscinas Naturais)"
 value={day.title}
 onChange={(e) => handleItineraryChange(day.id, "title", e.target.value)}
 className="h-8 text-xs rounded-lg font-semibold"
 />

 <Textarea
 placeholder="Descrição da atividade, locais de parada, dicas de fotos..."
 value={day.description}
 onChange={(e) => handleItineraryChange(day.id, "description", e.target.value)}
 className="h-16 text-xs rounded-lg resize-none"
 />
 </div>
 ))
 )}
 </TabsContent>

 {/* ── ABA 5: PREÇOS & PARCELAMENTO ── */}
 <TabsContent value="preco" className="space-y-3">
 <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/70 shadow-2xs">
 <Label className="text-[11px] font-bold text-foreground flex items-center justify-between">
 <span>Valor Total da Proposta (R$) *</span>
 <span className="text-primary font-mono font-bold text-xs">
 {formatMoney(proposal.pricing?.total_price_cents || 0)}
 </span>
 </Label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
 R$
 </span>
 <Input
 type="text"
 value={priceInputReais}
 onChange={(e) => handlePriceChange(e.target.value)}
 placeholder="Ex: 4890,00"
 className="h-10 pl-9 text-sm font-bold font-mono rounded-xl bg-background"
 />
 </div>
 <p className="text-[10px] text-muted-foreground">
 Digite o valor real em Reais (ex: 4500 ou 4500,00). O sistema converte automaticamente para centavos seguros.
 </p>
 </div>

 <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-2.5">
 <span className="text-xs font-bold text-foreground block">Atalhos de Parcelamento Comercial</span>
 <div className="grid grid-cols-2 gap-2">
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 const total = proposal.pricing?.total_price_cents || 0;
 onChange({
 pricing: {
 ...proposal.pricing,
 installments_options: [
 { installments_count: 1, installment_value_cents: total, method: "pix", has_interest: false },
 { installments_count: 10, installment_value_cents: Math.round(total / 10), method: "credit_card", has_interest: false },
 { installments_count: 12, installment_value_cents: Math.round(total / 12), method: "credit_card", has_interest: false },
 ],
 },
 });
 }}
 className="h-8 text-[11px] rounded-lg font-semibold"
 >
 10x e 12x Sem Juros
 </Button>

 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 const total = proposal.pricing?.total_price_cents || 0;
 const entrada = Math.round(total * 0.2); // 20% de entrada
 const restante = total - entrada;
 onChange({
 pricing: {
 ...proposal.pricing,
 installments_options: [
 { installments_count: 1, installment_value_cents: total, method: "pix", has_interest: false },
 { installments_count: 10, installment_value_cents: Math.round(restante / 10), method: "credit_card", has_interest: false },
 ],
 },
 });
 }}
 className="h-8 text-[11px] rounded-lg font-semibold"
 >
 Entrada + 10x
 </Button>
 </div>

 {/* Visualização das parcelas configuradas */}
 {proposal.pricing?.installments_options && proposal.pricing.installments_options.length > 0 && (
 <div className="space-y-1 pt-1 border-t border-border/40 text-[11px]">
 {proposal.pricing.installments_options.map((opt, i) => (
 <div key={i} className="flex justify-between items-center text-muted-foreground">
 <span>
 {opt.installments_count}x {opt.method === "pix" ? "à vista no Pix" : "no Cartão"}
 </span>
 <span className="font-mono font-bold text-foreground">
 {formatMoney(opt.installment_value_cents)}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}
