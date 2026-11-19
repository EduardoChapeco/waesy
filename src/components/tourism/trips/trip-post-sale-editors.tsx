import { useState } from "react";
import {
  Building2,
  Calendar,
  Compass,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  Plane,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addTripOfficialDocument,
  deleteTripOfficialDocument,
  updateTripOperationalStructure,
  type TripAggregateDTO,
} from "@/services/travel-lifecycle.functions";
import { uploadStoreMedia } from "@/services/storage.functions";
import { readFileAsDataUrl } from "@/lib/media-utils";

const DOC_CATEGORY_LABELS: Record<string, string> = {
  operator_confirmation: "Confirmação Operadora",
  signed_contract: "Contrato Assinado",
  payment_receipt: "Recibo Financeiro",
  hotel_voucher: "Voucher Hotel",
  flight_eticket: "E-Ticket Aéreo",
  transfer_voucher: "Voucher Transfer",
  insurance_policy: "Apólice de Seguro",
};

export function TripOperationalStructureEditor({
  aggregate,
  onSaved,
}: {
  aggregate: TripAggregateDTO;
  onSaved: () => Promise<void> | void;
}) {
  const trip = aggregate.trip;
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState(trip.title || "");
  const [destinationCity, setDestinationCity] = useState(trip.destination_city || "");
  const [travelStartDate, setTravelStartDate] = useState(trip.travel_start_date || "");
  const [travelEndDate, setTravelEndDate] = useState(trip.travel_end_date || "");
  const [status, setStatus] = useState<string>(trip.status || "confirmed");
  const [operatorName, setOperatorName] = useState(trip.operator_name || "");
  const [notes, setNotes] = useState(trip.notes || "");

  const [flights, setFlights] = useState<any[]>(Array.isArray(trip.flights) ? trip.flights : []);
  const [hotels, setHotels] = useState<any[]>(Array.isArray(trip.hotels) ? trip.hotels : []);
  const [transfers, setTransfers] = useState<any[]>(Array.isArray(trip.transfers) ? trip.transfers : []);
  const [tours, setTours] = useState<any[]>(Array.isArray(trip.tours) ? trip.tours : []);
  const [itinerary, setItinerary] = useState<any[]>(Array.isArray(trip.itinerary) ? trip.itinerary : []);
  const [includesText, setIncludesText] = useState(
    Array.isArray(trip.includes) ? trip.includes.join("\n") : "",
  );
  const [excludesText, setExcludesText] = useState(
    Array.isArray(trip.excludes) ? trip.excludes.join("\n") : "",
  );

  const handleSaveStructure = async () => {
    setIsSaving(true);
    try {
      await updateTripOperationalStructure({
        data: {
          tripId: trip.id,
          title: title.trim() || trip.title,
          destinationCity: destinationCity.trim() || trip.destination_city,
          travelStartDate: travelStartDate || null,
          travelEndDate: travelEndDate || null,
          status: status as any,
          operatorName: operatorName.trim() || null,
          notes: notes.trim() || null,
          flights,
          hotels,
          transfers,
          tours,
          itinerary,
          includes: includesText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          excludes: excludesText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      await onSaved();
      toast.success("Composição da viagem e vouchers sincronizados com sucesso.");
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar a edição da viagem.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="p-4 rounded-lg bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Edição Pós-Venda & Sincronização do Voucher
          </h3>
          <p className="text-xs text-muted-foreground">
            Ajuste voos, hospedagens, transfers, passeios, datas e roteiro dia a dia diretamente na viagem.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="size-4" />
          <span>Editar Estrutura da Viagem</span>
        </Button>
      </div>
    );
  }

  return (
    <section className="pt-4 border-t border-border/60 space-y-5 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-sm font-bold text-foreground">Editar Composição Pós-Venda</h3>
          <p className="text-xs text-muted-foreground">
            Alterações são persistidas na viagem e refletidas nos vouchers e no Portal do Viajante.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSaveStructure}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Save className="size-4" />}
            <span>{isSaving ? "Salvando..." : "Salvar & Sincronizar"}</span>
          </Button>
        </div>
      </div>

      {/* Dados Base */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Título da Viagem</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 text-xs rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Destino Principal</Label>
          <Input value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} className="h-11 text-xs rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Operadora</Label>
          <Input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} className="h-11 text-xs rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Data de Saída</Label>
          <Input type="date" value={travelStartDate} onChange={(e) => setTravelStartDate(e.target.value)} className="h-11 text-xs rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Data de Retorno</Label>
          <Input type="date" value={travelEndDate} onChange={(e) => setTravelEndDate(e.target.value)} className="h-11 text-xs rounded-lg" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Status Operacional</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending_review">Em Revisão</SelectItem>
              <SelectItem value="confirmed">Confirmada</SelectItem>
              <SelectItem value="in_progress">Em Viagem</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Voos */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Plane className="size-3.5 text-primary" /> Voos ({flights.length})
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFlights((prev) => [
                ...prev,
                {
                  airline_name: "",
                  airline: "",
                  flight_number: "",
                  origin_iata: "",
                  origin: "",
                  destination_iata: "",
                  destination: "",
                  date: "",
                  departure_time: "",
                  arrival_time: "",
                  locator: "",
                },
              ])
            }
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" /> Adicionar Voo
          </Button>
        </div>
        {flights.map((fl, idx) => (
          <div key={idx} className="p-3 rounded-lg border border-border/70 bg-muted/20 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input
              placeholder="Cia Aérea"
              value={fl.airline_name || fl.airline || ""}
              onChange={(e) => setFlights((prev) => prev.map((it, i) => (i === idx ? { ...it, airline_name: e.target.value, airline: e.target.value } : it)))}
              className="h-11 text-xs"
            />
            <Input
              placeholder="Nº Voo"
              value={fl.flight_number || ""}
              onChange={(e) => setFlights((prev) => prev.map((it, i) => (i === idx ? { ...it, flight_number: e.target.value } : it)))}
              className="h-11 text-xs font-mono"
            />
            <Input
              placeholder="Origem (IATA)"
              value={fl.origin_iata || fl.origin || ""}
              onChange={(e) => setFlights((prev) => prev.map((it, i) => (i === idx ? { ...it, origin_iata: e.target.value, origin: e.target.value } : it)))}
              className="h-11 text-xs font-mono"
            />
            <Input
              placeholder="Destino (IATA)"
              value={fl.destination_iata || fl.destination || ""}
              onChange={(e) => setFlights((prev) => prev.map((it, i) => (i === idx ? { ...it, destination_iata: e.target.value, destination: e.target.value } : it)))}
              className="h-11 text-xs font-mono"
            />
            <Input
              type="date"
              value={fl.date || fl.departure_date || ""}
              onChange={(e) => setFlights((prev) => prev.map((it, i) => (i === idx ? { ...it, date: e.target.value, departure_date: e.target.value } : it)))}
              className="h-11 text-xs"
            />
            <Input
              placeholder="Horário saída"
              value={fl.departure_time || ""}
              onChange={(e) => setFlights((prev) => prev.map((it, i) => (i === idx ? { ...it, departure_time: e.target.value } : it)))}
              className="h-11 text-xs font-mono"
            />
            <Input
              placeholder="Horário chegada"
              value={fl.arrival_time || ""}
              onChange={(e) => setFlights((prev) => prev.map((it, i) => (i === idx ? { ...it, arrival_time: e.target.value } : it)))}
              className="h-11 text-xs font-mono"
            />
            <div className="flex gap-2">
              <Input
                placeholder="PNR / Localizador"
                value={fl.locator || fl.locator_code || ""}
                onChange={(e) => setFlights((prev) => prev.map((it, i) => (i === idx ? { ...it, locator: e.target.value, locator_code: e.target.value } : it)))}
                className="h-11 text-xs font-mono flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFlights((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Remover voo"
                className="h-11 w-11 min-h-11 text-destructive cursor-pointer shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Hotéis */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Building2 className="size-3.5 text-primary" /> Hospedagens ({hotels.length})
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setHotels((prev) => [
                ...prev,
                {
                  hotel_name: "",
                  name: "",
                  city: destinationCity,
                  meal_plan: "Café da Manhã",
                  room_type: "Standard",
                  checkin_date: "",
                  checkin: "",
                  checkout_date: "",
                  checkout: "",
                  confirmation: "",
                },
              ])
            }
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" /> Adicionar Hotel
          </Button>
        </div>
        {hotels.map((ht, idx) => (
          <div key={idx} className="p-3 rounded-lg border border-border/70 bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              placeholder="Nome do Hotel"
              value={ht.hotel_name || ht.name || ""}
              onChange={(e) => setHotels((prev) => prev.map((it, i) => (i === idx ? { ...it, hotel_name: e.target.value, name: e.target.value } : it)))}
              className="h-11 text-xs"
            />
            <Input
              placeholder="Cidade"
              value={ht.city || ht.destination || ""}
              onChange={(e) => setHotels((prev) => prev.map((it, i) => (i === idx ? { ...it, city: e.target.value } : it)))}
              className="h-11 text-xs"
            />
            <Input
              placeholder="Regime (ex: All Inclusive)"
              value={ht.meal_plan || ht.board_basis || ""}
              onChange={(e) => setHotels((prev) => prev.map((it, i) => (i === idx ? { ...it, meal_plan: e.target.value, board_basis: e.target.value } : it)))}
              className="h-11 text-xs"
            />
            <Input
              type="date"
              value={ht.checkin_date || ht.checkin || ""}
              onChange={(e) => setHotels((prev) => prev.map((it, i) => (i === idx ? { ...it, checkin_date: e.target.value, checkin: e.target.value } : it)))}
              className="h-11 text-xs"
            />
            <Input
              type="date"
              value={ht.checkout_date || ht.checkout || ""}
              onChange={(e) => setHotels((prev) => prev.map((it, i) => (i === idx ? { ...it, checkout_date: e.target.value, checkout: e.target.value } : it)))}
              className="h-11 text-xs"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Confirmação / Loc"
                value={ht.confirmation || ht.confirmation_id || ""}
                onChange={(e) => setHotels((prev) => prev.map((it, i) => (i === idx ? { ...it, confirmation: e.target.value, confirmation_id: e.target.value } : it)))}
                className="h-11 text-xs font-mono flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setHotels((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Remover hotel"
                className="h-11 w-11 min-h-11 text-destructive cursor-pointer shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Transfers & Passeios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-border/50">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-foreground">Transfers ({transfers.length})</span>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setTransfers((prev) => [
                  ...prev,
                  { name: "", title: "", description: "", vehicle_type: "", date: "", service_date: "", confirmation: "" },
                ])
              }
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" /> Adicionar Transfer
            </Button>
          </div>
          {transfers.map((tr, idx) => (
            <div key={idx} className="p-2 rounded-lg border border-border/70 bg-muted/20 flex items-center gap-2">
              <Input
                placeholder="Descrição / Rota"
                value={tr.title || tr.name || tr.description || tr.route || ""}
                onChange={(e) =>
                  setTransfers((prev) =>
                    prev.map((it, i) =>
                      i === idx
                        ? { ...it, name: e.target.value, title: e.target.value, description: e.target.value }
                        : it,
                    ),
                  )
                }
                className="h-11 text-xs flex-1"
              />
              <Input
                type="date"
                value={tr.date || tr.service_date || ""}
                onChange={(e) =>
                  setTransfers((prev) =>
                    prev.map((it, i) => (i === idx ? { ...it, date: e.target.value, service_date: e.target.value } : it)),
                  )
                }
                className="h-11 text-xs w-36"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTransfers((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Remover transfer"
                className="h-11 w-11 min-h-11 text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-foreground">Passeios ({tours.length})</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTours((prev) => [...prev, { title: "", name: "", date: "", tour_date: "", description: "" }])}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" /> Adicionar Passeio
            </Button>
          </div>
          {tours.map((to, idx) => (
            <div key={idx} className="p-2 rounded-lg border border-border/70 bg-muted/20 flex items-center gap-2">
              <Input
                placeholder="Nome do Passeio"
                value={to.title || to.name || to.description || ""}
                onChange={(e) => setTours((prev) => prev.map((it, i) => (i === idx ? { ...it, title: e.target.value, name: e.target.value } : it)))}
                className="h-11 text-xs flex-1"
              />
              <Input
                type="date"
                value={to.date || to.tour_date || ""}
                onChange={(e) => setTours((prev) => prev.map((it, i) => (i === idx ? { ...it, date: e.target.value, tour_date: e.target.value } : it)))}
                className="h-11 text-xs w-36"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTours((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Remover passeio"
                className="h-11 w-11 min-h-11 text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Roteiro Dia a Dia */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Compass className="size-3.5 text-primary" /> Roteiro Dia a Dia ({itinerary.length} dias)
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setItinerary((prev) => [
                ...prev,
                { day: prev.length + 1, title: `Dia ${prev.length + 1}`, city: destinationCity, description: "" },
              ])
            }
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" /> Adicionar Dia
          </Button>
        </div>
        {itinerary.map((day, dIdx) => (
          <div key={dIdx} className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Título do Dia"
                value={day.title || ""}
                onChange={(e) => setItinerary((prev) => prev.map((it, i) => (i === dIdx ? { ...it, title: e.target.value } : it)))}
                className="h-11 text-xs flex-1"
              />
              <Input
                placeholder="Cidade"
                value={day.city || day.location || ""}
                onChange={(e) => setItinerary((prev) => prev.map((it, i) => (i === dIdx ? { ...it, city: e.target.value, location: e.target.value } : it)))}
                className="h-11 text-xs w-40"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setItinerary((prev) => prev.filter((_, i) => i !== dIdx))}
                aria-label="Remover dia do roteiro"
                className="h-11 w-11 min-h-11 text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea
              rows={2}
              placeholder="Atividades programadas do dia..."
              value={day.description || ""}
              onChange={(e) => setItinerary((prev) => prev.map((it, i) => (i === dIdx ? { ...it, description: e.target.value } : it)))}
              className="text-xs"
            />
          </div>
        ))}
      </div>

      {/* Inclusões / Exclusões / Observações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border/50">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Incluso (1 por linha)</Label>
          <Textarea rows={4} value={includesText} onChange={(e) => setIncludesText(e.target.value)} className="text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Não Incluso (1 por linha)</Label>
          <Textarea rows={4} value={excludesText} onChange={(e) => setExcludesText(e.target.value)} className="text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Observações Operacionais</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" />
        </div>
      </div>
    </section>
  );
}

export function TripOfficialDocumentsPanel({
  aggregate,
  onChanged,
}: {
  aggregate: TripAggregateDTO;
  onChanged: () => Promise<void> | void;
}) {
  const docs = Array.isArray(aggregate.officialDocuments) ? aggregate.officialDocuments : [];
  const [docCategory, setDocCategory] = useState("operator_confirmation");
  const [title, setTitle] = useState("");
  const [reservationCode, setReservationCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadFile = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const base64Data = await readFileAsDataUrl(file);
      const uploaded = await uploadStoreMedia({
        data: {
          fileName: file.name,
          fileType: file.type || "application/pdf",
          base64Data,
          bucket: "legal-documents",
        },
      });
      await addTripOfficialDocument({
        data: {
          tripId: aggregate.trip.id,
          docCategory: docCategory as any,
          title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
          reservationCode: reservationCode.trim() || null,
          operatorName: aggregate.trip.operator_name || aggregate.store?.name || null,
          fileUrl: uploaded.url,
          storageBucket: uploaded.bucket,
          storagePath: uploaded.path,
          isVisibleToClient: true,
        },
      });
      setTitle("");
      setReservationCode("");
      await onChanged();
      toast.success("Documento oficial publicado no Portal do Viajante.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao publicar documento oficial.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (documentId: string) => {
    try {
      await deleteTripOfficialDocument({
        data: { tripId: aggregate.trip.id, documentId },
      });
      await onChanged();
      toast.success("Documento oficial removido.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover documento.");
    }
  };

  return (
    <section className="pt-4 border-t border-border/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="size-4 text-primary" />
            <span>Documentos Oficiais no Portal do Viajante ({docs.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Anexe PDFs da operadora, recibos, e-tickets, apólices de seguro ou contratos autenticados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Categoria</Label>
          <Select value={docCategory} onValueChange={setDocCategory}>
            <SelectTrigger className="h-11 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOC_CATEGORY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Título Visível</Label>
          <Input
            placeholder="Ex: Confirmação Orinter #94821"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 text-xs rounded-lg"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Código / Reserva</Label>
          <Input
            placeholder="Opcional"
            value={reservationCode}
            onChange={(e) => setReservationCode(e.target.value)}
            className="h-11 text-xs rounded-lg font-mono"
          />
        </div>

        <div>
          <input
            id="official-doc-upload-input"
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => handleUploadFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            disabled={isUploading}
            onClick={() => document.getElementById("official-doc-upload-input")?.click()}
            className="h-11 min-h-11 w-full rounded-lg text-xs font-bold gap-2 cursor-pointer"
          >
            {isUploading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Upload className="size-4" />}
            <span>{isUploading ? "Enviando..." : "Anexar Arquivo"}</span>
          </Button>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="p-4 rounded-lg border border-dashed border-border text-xs text-muted-foreground text-center">
          Nenhum documento oficial anexado manualmente. Contratos assinados e vouchers importados aparecem aqui automaticamente.
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc: any) => (
            <div
              key={doc.id}
              className="p-3 rounded-lg border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {DOC_CATEGORY_LABELS[doc.doc_category] || doc.doc_category}
                  </Badge>
                  {doc.reservation_code && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {doc.reservation_code}
                    </Badge>
                  )}
                </div>
                <p className="font-bold text-foreground break-words">{doc.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.original_pdf_url && (
                  <Button asChild variant="outline" className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1">
                    <a href={doc.original_pdf_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                      <span>Abrir</span>
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteDoc(doc.id)}
                  aria-label="Excluir documento oficial"
                  className="h-11 w-11 text-destructive cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
