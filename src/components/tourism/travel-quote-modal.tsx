import { useState } from "react";
import { AirplaneTilt, MapPin, CalendarDots, Users, ArrowsLeftRight, CheckCircle, Clock, SuitcaseSimple, ShieldCheck, WhatsappLogo, Plus, Minus, X, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CANONICAL_AIRPORTS, searchAirports, type AirportItem } from "@/lib/airports-data";
import { requestTravelQuote, type TravelTripType } from "@/services/tourism.functions";
import { toast } from "sonner";

interface TravelQuoteModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 defaultDestination?: string;
 defaultTripType?: TravelTripType;
}

export function TravelQuoteModal({
 open,
 onOpenChange,
 defaultDestination = "",
 defaultTripType = "air_package",
}: TravelQuoteModalProps) {
 // Wizard steps: 1: Origem & Destino, 2: Datas, 3: Quartos & Idades, 4: Contato & Envio
 const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

 // Form states
 const [origin, setOrigin] = useState("");
 const [originIata, setOriginIata] = useState("");
 const [destination, setDestination] = useState(defaultDestination || "");
 const [destinationIata, setDestinationIata] = useState("");

 const [departureDate, setDepartureDate] = useState("");
 const [returnDate, setReturnDate] = useState("");
 const [flexibleDates, setFlexibleDates] = useState(false);

 const [roomsCount, setRoomsCount] = useState(1);
 const [adultsCount, setAdultsCount] = useState(2);
 const [childrenCount, setChildrenCount] = useState(0);
 const [childrenAges, setChildrenAges] = useState<number[]>([]);

 const [tripType, setTripType] = useState<TravelTripType>(defaultTripType);
 const [contactName, setContactName] = useState("");
 const [contactWhatsapp, setContactWhatsapp] = useState("");
 const [specialNotes, setSpecialNotes] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isCompleted, setIsCompleted] = useState(false);

 // Busca e Autocomplete de Aeroportos
 const [showOriginSearch, setShowOriginSearch] = useState(false);
 const [showDestSearch, setShowDestSearch] = useState(false);
 const [airportQuery, setAirportQuery] = useState("");

 const filteredAirports = searchAirports(airportQuery);

 const handleSwapLocations = () => {
 const tempName = origin;
 const tempIata = originIata;
 setOrigin(destination);
 setOriginIata(destinationIata);
 setDestination(tempName);
 setDestinationIata(tempIata);
 };

 const handleChildrenCountChange = (newCount: number) => {
 const validCount = Math.max(0, Math.min(5, newCount));
 setChildrenCount(validCount);
 if (validCount > childrenAges.length) {
 const added = Array(validCount - childrenAges.length).fill(5);
 setChildrenAges([...childrenAges, ...added]);
 } else {
 setChildrenAges(childrenAges.slice(0, validCount));
 }
 };

 const handleChildAgeChange = (index: number, age: number) => {
 const updated = [...childrenAges];
 updated[index] = age;
 setChildrenAges(updated);
 };

 const handleSubmit = async () => {
 if (!contactName.trim() || contactWhatsapp.trim().length < 8) {
 toast.error("Por favor, preencha seu nome e WhatsApp para contato.");
 return;
 }

 setIsSubmitting(true);
 try {
 await requestTravelQuote({
 data: {
 origin_city: origin,
 origin_iata: originIata,
 destination_city: destination,
 destination_iata: destinationIata,
 departure_date: departureDate || undefined,
 return_date: returnDate || undefined,
 rooms_count: roomsCount,
 adults_count: adultsCount,
 children_count: childrenCount,
 children_ages: childrenAges,
 trip_type: tripType,
 flexible_dates: flexibleDates,
 contact_name: contactName.trim(),
 contact_whatsapp: contactWhatsapp.trim(),
 special_notes: specialNotes.trim() || undefined,
 },
 });

 setIsCompleted(true);
 toast.success("Solicitação de cotação enviada com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao solicitar cotação.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const resetAll = () => {
 setStep(1);
 setIsCompleted(false);
 onOpenChange(false);
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md sm:w-full sm:rounded-lg p-0 overflow-hidden bg-card border-border">
 {/* Header de Cotação de Viagem */}
 <div className="bg-linear-to-r from-blue-700 via-indigo-600 to-violet-700 text-white p-5 space-y-1 relative">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
 Cotação Especial de Viagem
 </span>
 <span className="text-xs font-mono font-bold opacity-80">
 Etapa {step} de 4
 </span>
 </div>

 <DialogTitle className="text-xl font-bold tracking-tight text-white pt-1">
 {step === 1 && "Para onde você quer viajar?"}
 {step === 2 && "Escolha as datas da viagem"}
 {step === 3 && "Defina os detalhes e passageiros"}
 {step === 4 && "Finalize sua solicitação"}
 </DialogTitle>
 <p className="text-xs text-white/80 font-medium">
 {step === 1 && "Defina o aeroporto/cidade de embarque e seu destino dos sonhos."}
 {step === 2 && "Selecione a data de ida e volta para encontrarmos as melhores tarifas."}
 {step === 3 && "Informe quantidade de quartos, adultos e idades das crianças."}
 {step === 4 && "Receba as propostas das melhores agências direto no seu WhatsApp."}
 </p>
 </div>

 {/* ── CONTEÚDO MULTI-ETAPAS ── */}
 <div className="p-5 space-y-5">
 {isCompleted ? (
 <div className="text-center py-6 space-y-4">
 <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
 <CheckCircle size={36} weight="fill" />
 </div>
 <div className="space-y-1">
 <h3 className="text-lg font-bold text-foreground">Cotação Enviada!</h3>
 <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
 Nossos consultores de viagem parceiros receberam seus detalhes e entrarão em contato no WhatsApp com as melhores opções de voos e hotéis.
 </p>
 </div>
 <Button onClick={resetAll} className="rounded-lg font-bold text-xs h-10 px-6 bg-foreground text-background">
 Concluir
 </Button>
 </div>
 ) : (
 <>
 {/* ── ETAPA 1: ORIGEM & DESTINO ── */}
 {step === 1 && (
 <div className="space-y-4">
 {/* Seletor de Origem */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Onde você vai pegar seu voo / embarque?</Label>
 <div className="relative">
 <Input
 value={origin}
 onChange={(e) => {
 setOrigin(e.target.value);
 setShowOriginSearch(true);
 setAirportQuery(e.target.value);
 }}
 onFocus={() => setShowOriginSearch(true)}
 placeholder="Cidade ou Aeroporto de Origem..."
 className="h-11 rounded-lg bg-muted/40 border-border text-xs pl-9 font-medium"
 />
 <AirplaneTilt size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 </div>

 {showOriginSearch && (
 <div className=" rounded-lg bg-card p-2 space-y-1 max-h-40 overflow-y-auto no-scrollbar">
 {filteredAirports.slice(0, 5).map((a) => (
 <button
 key={a.iata}
 type="button"
 onClick={() => {
 setOrigin(`${a.city} (${a.iata})`);
 setOriginIata(a.iata);
 setShowOriginSearch(false);
 }}
 className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs flex items-center justify-between cursor-pointer"
 >
 <span className="font-semibold text-foreground">{a.city} - {a.state}</span>
 <span className="font-mono font-bold text-primary">{a.iata}</span>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Botão de Troca (⇄) */}
 <div className="flex justify-center -my-1">
 <button
 type="button"
 onClick={handleSwapLocations}
 className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer "
 title="Inverter Origem e Destino"
 >
 <ArrowsLeftRight size={14} weight="bold" />
 </button>
 </div>

 {/* Seletor de Destino */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Para qual destino você quer ir?</Label>
 <div className="relative">
 <Input
 value={destination}
 onChange={(e) => {
 setDestination(e.target.value);
 setShowDestSearch(true);
 setAirportQuery(e.target.value);
 }}
 onFocus={() => setShowDestSearch(true)}
 placeholder="Cidade ou Aeroporto de Destino..."
 className="h-11 rounded-lg bg-muted/40 border-border text-xs pl-9 font-medium"
 />
 <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 </div>

 {showDestSearch && (
 <div className=" rounded-lg bg-card p-2 space-y-1 max-h-40 overflow-y-auto no-scrollbar">
 {filteredAirports.slice(0, 5).map((a) => (
 <button
 key={a.iata}
 type="button"
 onClick={() => {
 setDestination(`${a.city} (${a.iata})`);
 setDestinationIata(a.iata);
 setShowDestSearch(false);
 }}
 className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs flex items-center justify-between cursor-pointer"
 >
 <span className="font-semibold text-foreground">{a.city} - {a.state} ({a.country})</span>
 <span className="font-mono font-bold text-primary">{a.iata}</span>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Buscas Recentes Rápidas */}
 <div className="pt-2 space-y-2">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
 Destinos Populares
 </span>
 <div className="flex flex-wrap gap-2">
 {["Natal - RN", "Maceió - AL", "Gramado - RS", "Porto Seguro - BA", "Orlando (MCO)", "Lisboa (LIS)"].map((d) => (
 <button
 key={d}
 type="button"
 onClick={() => setDestination(d)}
 className="px-3 py-1 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
 >
 {d}
 </button>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* ── ETAPA 2: DATAS DA VIAGEM ── */}
 {step === 2 && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Data de Ida</Label>
 <Input
 type="date"
 value={departureDate}
 onChange={(e) => setDepartureDate(e.target.value)}
 className="h-11 rounded-lg bg-muted/40 border-border text-xs font-medium"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Data de Volta</Label>
 <Input
 type="date"
 value={returnDate}
 onChange={(e) => setReturnDate(e.target.value)}
 className="h-11 rounded-lg bg-muted/40 border-border text-xs font-medium"
 />
 </div>
 </div>

 {/* Datas Flexíveis Toggle */}
 <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer">
 <input
 type="checkbox"
 checked={flexibleDates}
 onChange={(e) => setFlexibleDates(e.target.checked)}
 className="size-4 rounded accent-primary cursor-pointer"
 />
 <div className="text-xs">
 <p className="font-bold text-foreground">Tenho flexibilidade de datas (+/- 3 dias)</p>
 <p className="text-muted-foreground text-[11px]">Ajuda a encontrar tarifas aéreas e pacotes mais baratos.</p>
 </div>
 </label>
 </div>
 )}

 {/* ── ETAPA 3: QUARTOS, ADULTOS & IDADES DAS CRIANÇAS ── */}
 {step === 3 && (
 <div className="space-y-4">
 {/* Quartos */}
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
 <div>
 <p className="text-xs font-bold text-foreground">Quartos de Hotel</p>
 <p className="text-[11px] text-muted-foreground">Número de acomodações</p>
 </div>
 <div className="flex items-center gap-3">
 <Button
 size="icon"
 variant="outline"
 type="button"
 onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))}
 className="size-8 rounded-lg"
 >
 <Minus size={14} />
 </Button>
 <span className="font-bold font-mono text-sm w-4 text-center">{roomsCount}</span>
 <Button
 size="icon"
 variant="outline"
 type="button"
 onClick={() => setRoomsCount(Math.min(5, roomsCount + 1))}
 className="size-8 rounded-lg"
 >
 <Plus size={14} />
 </Button>
 </div>
 </div>

 {/* Adultos */}
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
 <div>
 <p className="text-xs font-bold text-foreground">Adultos</p>
 <p className="text-[11px] text-muted-foreground">18 anos ou mais</p>
 </div>
 <div className="flex items-center gap-3">
 <Button
 size="icon"
 variant="outline"
 type="button"
 onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
 className="size-8 rounded-lg"
 >
 <Minus size={14} />
 </Button>
 <span className="font-bold font-mono text-sm w-4 text-center">{adultsCount}</span>
 <Button
 size="icon"
 variant="outline"
 type="button"
 onClick={() => setAdultsCount(Math.min(10, adultsCount + 1))}
 className="size-8 rounded-lg"
 >
 <Plus size={14} />
 </Button>
 </div>
 </div>

 {/* Crianças & Bebês */}
 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
 <div>
 <p className="text-xs font-bold text-foreground">Crianças e Bebês</p>
 <p className="text-[11px] text-muted-foreground">De 0 a 17 anos</p>
 </div>
 <div className="flex items-center gap-3">
 <Button
 size="icon"
 variant="outline"
 type="button"
 onClick={() => handleChildrenCountChange(childrenCount - 1)}
 className="size-8 rounded-lg"
 >
 <Minus size={14} />
 </Button>
 <span className="font-bold font-mono text-sm w-4 text-center">{childrenCount}</span>
 <Button
 size="icon"
 variant="outline"
 type="button"
 onClick={() => handleChildrenCountChange(childrenCount + 1)}
 className="size-8 rounded-lg"
 >
 <Plus size={14} />
 </Button>
 </div>
 </div>

 {/* Seleção individual da idade de cada criança */}
 {childrenCount > 0 && (
 <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
 <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
 Idade de cada criança no momento da viagem:
 </span>
 <div className="grid grid-cols-2 gap-2">
 {childrenAges.map((age, idx) => (
 <div key={idx} className="space-y-1">
 <label className="text-[10px] font-bold text-muted-foreground">
 {idx + 1}ª Criança
 </label>
 <select
 value={age}
 onChange={(e) => handleChildAgeChange(idx, Number(e.target.value))}
 className="w-full h-9 rounded-lg bg-card text-xs px-2 font-medium"
 >
 {Array.from({ length: 18 }, (_, i) => (
 <option key={i} value={i}>
 {i === 0 ? "Bebê (< 1 ano)" : `${i} anos`}
 </option>
 ))}
 </select>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* ── ETAPA 4: TIPO DE PACOTE & CONTATO ── */}
 {step === 4 && (
 <div className="space-y-4">
 {/* Tipo de Viagem */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Tipo de Pacote Desejado</Label>
 <div className="grid grid-cols-2 gap-2">
 {[
 { id: "air_package", label: "✈️ Voo + Hotel", desc: "Pacote Completo" },
 { id: "hotel_only", label: "🏨 Somente Hotel", desc: "Resorts & Pousadas" },
 { id: "cruise", label: "🚢 Cruzeiro", desc: "Marítimo com Pensão" },
 { id: "bus", label: "🚌 Rodoviário", desc: "Passeios Regionais" },
 { id: "visa_assistance", label: "🛂 Visto Americano", desc: "Assessoria Consular" },
 ].map((t) => (
 <button
 key={t.id}
 type="button"
 onClick={() => setTripType(t.id as any)}
 className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
 tripType === t.id
 ? "bg-primary/10 border-primary text-primary font-bold "
 : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
 }`}
 >
 <p className="text-xs font-bold">{t.label}</p>
 <p className="text-[10px] opacity-80">{t.desc}</p>
 </button>
 ))}
 </div>
 </div>

 {/* Nome Completo */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Seu Nome Completo</Label>
 <Input
 value={contactName}
 onChange={(e) => setContactName(e.target.value)}
 placeholder="Ex: João da Silva"
 className="h-11 rounded-lg bg-muted/40 border-border text-xs font-medium"
 />
 </div>

 {/* WhatsApp */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">WhatsApp para Receber as Propostas</Label>
 <div className="relative">
 <Input
 value={contactWhatsapp}
 onChange={(e) => setContactWhatsapp(e.target.value)}
 placeholder="(49) 99999-9999"
 className="h-11 rounded-lg bg-muted/40 border-border text-xs pl-9 font-medium font-mono"
 />
 <WhatsappLogo size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
 </div>
 </div>

 {/* Disclaimer Transparente de Turismo & Agências */}
 <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1 text-[11px] text-muted-foreground leading-relaxed">
 <span className="font-bold text-foreground block">
 ℹ️ Transparência de Valores & Disponibilidade:
 </span>
 <p>
 Tarifas aéreas e câmbio sofrem atualização em tempo real. Os valores de referência da vitrine são estimativas promocionais e serão confirmados pela agência parceira com as melhores opções de voo e hospedagem para o seu grupo.
 </p>
 </div>
 </div>
 )}

 {/* ── BOTÕES DE NAVEGAÇÃO ENTRE ETAPAS ── */}
 <div className="flex items-center justify-between pt-3 gap-3">
 {step > 1 ? (
 <Button
 type="button"
 variant="outline"
 onClick={() => setStep((step - 1) as any)}
 className="h-10 px-4 rounded-lg text-xs font-bold"
 >
 Voltar
 </Button>
 ) : (
 <div />
 )}

 {step < 4 ? (
 <Button
 type="button"
 onClick={() => setStep((step + 1) as any)}
 className="h-10 px-6 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1 "
 >
 <span>Continuar</span>
 <CaretRight size={14} weight="bold" />
 </Button>
 ) : (
 <Button
 type="button"
 disabled={isSubmitting}
 onClick={handleSubmit}
 className="h-10 px-6 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 flex-1"
 >
 <AirplaneTilt size={14} weight="bold" />
 <span>{isSubmitting ? "Enviando..." : "Solicitar Cotação Grátis"}</span>
 </Button>
 )}
 </div>
 </>
 )}
 </div>
 </DialogContent>
 </Dialog>
 );
}
