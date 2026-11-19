import React, { useMemo, useState } from "react";
import {
  Building2,
  Bus,
  Compass,
  Globe,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { MediaGalleryField } from "@/components/ui/media-gallery-field";
import { ProposalWebPageBuilder } from "@/components/tourism/studio/proposal-web-page-builder";
import { blueprintFromGroupTour, blueprintToTravelProposalDTO } from "@/lib/tourism/travel-blueprint";
import {
  type ProposalMediaItem,
  type ProposalWebPageDTO,
} from "@/lib/tourism/proposal-normalization";
import { updateGroupTourContent, type GroupTourDTO } from "@/services/group-tours.functions";

interface GroupTourContentEditorProps {
  tour: GroupTourDTO;
  onTourUpdated: (next: GroupTourDTO) => void;
}

export function GroupTourContentEditor({
  tour,
  onTourUpdated,
}: GroupTourContentEditorProps) {
  const [title, setTitle] = useState(tour.title || "");
  const [subtitle, setSubtitle] = useState(tour.subtitle || "");
  const [destination, setDestination] = useState(tour.destination || "");
  const [departureCity, setDepartureCity] = useState(tour.departure_city || "");
  const [departureDate, setDepartureDate] = useState(tour.departure_date || "");
  const [departureTime, setDepartureTime] = useState(tour.departure_time || "06:00");
  const [returnDate, setReturnDate] = useState(tour.return_date || "");
  const [returnTime, setReturnTime] = useState(tour.return_time || "20:00");
  const [priceReais, setPriceReais] = useState(
    tour.price_cents > 0 ? (tour.price_cents / 100).toFixed(2) : "0.00",
  );
  const [coverImageUrl, setCoverImageUrl] = useState(tour.cover_image_url || "");
  const [notes, setNotes] = useState(tour.notes || "");
  const [paymentConditions, setPaymentConditions] = useState(tour.payment_conditions || "");

  const [media, setMedia] = useState<ProposalMediaItem[]>(
    Array.isArray(tour.media) ? tour.media : [],
  );
  const [hotels, setHotels] = useState<any[]>(
    Array.isArray(tour.hotels) ? tour.hotels : [],
  );
  const [boardingPoints, setBoardingPoints] = useState<
    Array<{ city: string; time: string; location: string }>
  >(Array.isArray(tour.boarding_points) ? tour.boarding_points : []);
  const [transfers, setTransfers] = useState<any[]>(
    Array.isArray(tour.transfers) ? tour.transfers : [],
  );
  const [toursList, setToursList] = useState<any[]>(
    Array.isArray(tour.tours) ? tour.tours : [],
  );
  const [itinerary, setItinerary] = useState<any[]>(
    Array.isArray(tour.itinerary) ? tour.itinerary : [],
  );
  const [includedText, setIncludedText] = useState(
    Array.isArray(tour.included_items) ? tour.included_items.join("\n") : "",
  );
  const [excludedText, setExcludedText] = useState(
    Array.isArray(tour.excluded_items) ? tour.excluded_items.join("\n") : "",
  );
  const [webPageConfig, setWebPageConfig] = useState<ProposalWebPageDTO | null>(
    tour.web_page_config || null,
  );

  const [subTab, setSubTab] = useState<"editorial" | "webpage">("editorial");
  const [isSaving, setIsSaving] = useState(false);

  const priceCents = useMemo(() => {
    const num = Number(String(priceReais).replace(",", "."));
    return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) : 0;
  }, [priceReais]);

  const includedItems = useMemo(
    () =>
      includedText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [includedText],
  );

  const excludedItems = useMemo(
    () =>
      excludedText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [excludedText],
  );

  const draftTour: GroupTourDTO = useMemo(
    () => ({
      ...tour,
      title,
      subtitle: subtitle || null,
      destination,
      departure_city: departureCity,
      departure_date: departureDate,
      departure_time: departureTime,
      return_date: returnDate,
      return_time: returnTime,
      price_cents: priceCents,
      cover_image_url: coverImageUrl || null,
      notes: notes || null,
      payment_conditions: paymentConditions || null,
      boarding_points: boardingPoints,
      hotels,
      transfers,
      tours: toursList,
      itinerary,
      media,
      included_items: includedItems,
      excluded_items: excludedItems,
      web_page_config: webPageConfig,
    }),
    [
      tour,
      title,
      subtitle,
      destination,
      departureCity,
      departureDate,
      departureTime,
      returnDate,
      returnTime,
      priceCents,
      coverImageUrl,
      notes,
      paymentConditions,
      boardingPoints,
      hotels,
      transfers,
      toursList,
      itinerary,
      media,
      includedItems,
      excludedItems,
      webPageConfig,
    ],
  );

  const previewProposal = useMemo(
    () => blueprintToTravelProposalDTO(blueprintFromGroupTour(draftTour)),
    [draftTour],
  );

  const handleSaveAll = async (overrideWebPage?: ProposalWebPageDTO | null) => {
    if (!title.trim() || !destination.trim()) {
      toast.error("Informe o título e destino da excursão.");
      return;
    }
    setIsSaving(true);
    try {
      const nextWeb = overrideWebPage !== undefined ? overrideWebPage : webPageConfig;
      await updateGroupTourContent({
        data: {
          id: tour.id,
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          destination: destination.trim(),
          departureCity: departureCity.trim() || "Origem",
          departureDate: departureDate || undefined,
          departureTime: departureTime || "06:00",
          returnDate: returnDate || undefined,
          returnTime: returnTime || "20:00",
          priceCents,
          notes: notes.trim() || null,
          coverImageUrl: coverImageUrl.trim() || null,
          includedItems,
          excludedItems,
          boardingPoints,
          hotels,
          transfers,
          tours: toursList,
          itinerary,
          media,
          paymentConditions: paymentConditions.trim() || null,
          webPageConfig: nextWeb,
        },
      });
      onTourUpdated({
        ...draftTour,
        web_page_config: nextWeb,
      });
      toast.success("Conteúdo e Página Web da excursão salvos!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar conteúdo da excursão.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={subTab === "editorial" ? "secondary" : "ghost"}
            onClick={() => setSubTab("editorial")}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bus className="size-4" />
            <span>Dados & Mídias</span>
          </Button>
          <Button
            type="button"
            variant={subTab === "webpage" ? "secondary" : "ghost"}
            onClick={() => setSubTab("webpage")}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Globe className="size-4" />
            <span>Página Web Editorial</span>
          </Button>
        </div>

        <Button
          type="button"
          disabled={isSaving}
          onClick={() => handleSaveAll()}
          className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Save className="size-4" />}
          <span>{isSaving ? "Salvando..." : "Salvar Excursão"}</span>
        </Button>
      </div>

      {subTab === "webpage" ? (
        <div className="p-4 rounded-xl bg-card border border-border">
          <ProposalWebPageBuilder
            proposal={previewProposal}
            onChange={(patch) => {
              if (patch.web_page !== undefined) {
                setWebPageConfig(patch.web_page || null);
              }
            }}
            onSaveOverride={async (cfg) => {
              setWebPageConfig(cfg);
              await handleSaveAll(cfg);
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bloco Básico */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground">Informações Principais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Título da Excursão</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Subtítulo Editorial</Label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Resumo atrativo para a vitrine"
                  className="h-11 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Destino</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-11 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cidade Principal de Saída</Label>
                <Input
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  className="h-11 text-xs rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Data Saída</Label>
                  <Input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="h-11 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Hora Saída</Label>
                  <Input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="h-11 text-xs rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Data Retorno</Label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="h-11 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Valor Base (R$)</Label>
                  <Input
                    value={priceReais}
                    onChange={(e) => setPriceReais(e.target.value)}
                    className="h-11 text-xs rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição e Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Condições de Pagamento</Label>
              <Input
                value={paymentConditions}
                onChange={(e) => setPaymentConditions(e.target.value)}
                placeholder="Ex: 10x sem juros no cartão ou 5% desconto no PIX"
                className="h-11 text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Mídias Principais */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground">Capa & Galeria (Fotos e Vídeos)</h3>
            <ImageUpload
              value={coverImageUrl || null}
              onChange={(url) => setCoverImageUrl(url)}
              onRemove={() => setCoverImageUrl("")}
              bucket="cms-media"
              label="Foto de Capa"
            />
            <MediaGalleryField
              items={media}
              onChange={setMedia}
              label="Galeria da Excursão e Vídeos"
              allowVideos
            />
          </div>

          {/* Pontos de Embarque */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <span>Pontos de Embarque ({boardingPoints.length})</span>
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setBoardingPoints((prev) => [
                    ...prev,
                    { city: departureCity || "", time: departureTime || "06:00", location: "" },
                  ])
                }
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4" />
                <span>Ponto</span>
              </Button>
            </div>
            {boardingPoints.map((bp, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                <Input
                  placeholder="Cidade"
                  value={bp.city}
                  onChange={(e) =>
                    setBoardingPoints((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, city: e.target.value } : x)),
                    )
                  }
                  className="h-11 text-xs rounded-lg"
                />
                <Input
                  placeholder="Horário"
                  value={bp.time}
                  onChange={(e) =>
                    setBoardingPoints((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, time: e.target.value } : x)),
                    )
                  }
                  className="h-11 text-xs rounded-lg"
                />
                <Input
                  placeholder="Local de embarque"
                  value={bp.location}
                  onChange={(e) =>
                    setBoardingPoints((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, location: e.target.value } : x)),
                    )
                  }
                  className="h-11 text-xs rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBoardingPoints((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remover ponto"
                  className="h-11 min-h-11 px-3 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Hotéis com Galeria */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span>Hotéis ({hotels.length})</span>
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setHotels((prev) => [
                    ...prev,
                    {
                      id: `exc-hotel-${Date.now()}`,
                      hotel_name: "",
                      destination,
                      board_basis: "Café da Manhã",
                      media: [],
                    },
                  ])
                }
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4" />
                <span>Hotel</span>
              </Button>
            </div>

            {hotels.map((hotel, hIdx) => (
              <div key={hotel.id || hIdx} className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    placeholder="Nome do Hotel"
                    value={hotel.hotel_name || hotel.name || ""}
                    onChange={(e) =>
                      setHotels((prev) =>
                        prev.map((h, i) => (i === hIdx ? { ...h, hotel_name: e.target.value } : h)),
                      )
                    }
                    className="h-11 text-xs rounded-lg flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setHotels((prev) => prev.filter((_, i) => i !== hIdx))}
                    aria-label="Remover hotel"
                    className="size-11 shrink-0 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Regime (Ex: Café da manhã, Pensão Completa)"
                  value={hotel.board_basis || ""}
                  onChange={(e) =>
                    setHotels((prev) =>
                      prev.map((h, i) => (i === hIdx ? { ...h, board_basis: e.target.value } : h)),
                    )
                  }
                  className="h-11 text-xs rounded-lg"
                />
                <MediaGalleryField
                  items={Array.isArray(hotel.media) ? hotel.media : []}
                  onChange={(nextMedia) =>
                    setHotels((prev) =>
                      prev.map((h, i) =>
                        i === hIdx
                          ? {
                              ...h,
                              media: nextMedia,
                              images: nextMedia.filter((m) => m.type === "image").map((m) => m.url),
                            }
                          : h,
                      ),
                    )
                  }
                  label="Fotos e Vídeo do Hotel"
                />
              </div>
            ))}
          </div>

          {/* Roteiro e Passeios */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                <span>Roteiro Dia a Dia ({itinerary.length})</span>
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setItinerary((prev) => [
                    ...prev,
                    {
                      id: `exc-day-${Date.now()}`,
                      day_number: prev.length + 1,
                      title: `Dia ${prev.length + 1}`,
                      description: "",
                      media: [],
                    },
                  ])
                }
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4" />
                <span>Dia</span>
              </Button>
            </div>
            {itinerary.map((day, dIdx) => (
              <div key={day.id || dIdx} className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    placeholder={`Título Dia ${dIdx + 1}`}
                    value={day.title || ""}
                    onChange={(e) =>
                      setItinerary((prev) =>
                        prev.map((d, i) => (i === dIdx ? { ...d, title: e.target.value } : d)),
                      )
                    }
                    className="h-11 text-xs rounded-lg flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setItinerary((prev) => prev.filter((_, i) => i !== dIdx))}
                    aria-label="Remover dia"
                    className="size-11 shrink-0 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Descrição das atividades do dia"
                  value={day.description || ""}
                  onChange={(e) =>
                    setItinerary((prev) =>
                      prev.map((d, i) => (i === dIdx ? { ...d, description: e.target.value } : d)),
                    )
                  }
                  rows={2}
                  className="text-xs rounded-lg"
                />
                <MediaGalleryField
                  items={Array.isArray(day.media) ? day.media : []}
                  onChange={(nextMedia) =>
                    setItinerary((prev) =>
                      prev.map((d, i) =>
                        i === dIdx
                          ? {
                              ...d,
                              media: nextMedia,
                              images: nextMedia.filter((m) => m.type === "image").map((m) => m.url),
                            }
                          : d,
                      ),
                    )
                  }
                  label="Mídias do Dia"
                />
              </div>
            ))}
          </div>

          {/* Inclusões e Exclusões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-card border border-border space-y-2">
              <Label className="text-xs font-bold">Incluso na Excursão (1 por linha)</Label>
              <Textarea
                value={includedText}
                onChange={(e) => setIncludedText(e.target.value)}
                rows={4}
                className="text-xs rounded-lg"
              />
            </div>
            <div className="p-5 rounded-xl bg-card border border-border space-y-2">
              <Label className="text-xs font-bold">Não Incluso (1 por linha)</Label>
              <Textarea
                value={excludedText}
                onChange={(e) => setExcludedText(e.target.value)}
                rows={4}
                className="text-xs rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
