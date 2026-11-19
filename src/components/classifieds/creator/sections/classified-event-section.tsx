import {
  Award,
  Calendar,
  Clock,
  Coffee,
  Film,
  HelpCircle,
  MapPin,
  Mic,
  Plus,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import type {
  EventPollOptionNormalized,
  EventSpeaker,
  EventSurvey,
} from "@/components/classifieds/event-classified-showcase-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/ui/media-uploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface ClassifiedEventSectionProps {
  eventDate: string;
  onEventDateChange: (value: string) => void;
  eventEndDate: string;
  onEventEndDateChange: (value: string) => void;
  eventStartTime: string;
  onEventStartTimeChange: (value: string) => void;
  eventEndTime: string;
  onEventEndTimeChange: (value: string) => void;
  eventGatesOpenTime: string;
  onEventGatesOpenTimeChange: (value: string) => void;
  eventAgeRating: string;
  onEventAgeRatingChange: (value: string) => void;
  eventVisibility: "public" | "unlisted";
  onEventVisibilityChange: (value: "public" | "unlisted") => void;
  eventVenueName: string;
  onEventVenueNameChange: (value: string) => void;
  eventVenueAddress: string;
  onEventVenueAddressChange: (value: string) => void;
  eventParkingInfo: string;
  onEventParkingInfoChange: (value: string) => void;
  eventHostName: string;
  onEventHostNameChange: (value: string) => void;
  eventHostRole: string;
  onEventHostRoleChange: (value: string) => void;
  eventHostEntityType: "ORGANIZATION" | "PERSON";
  onEventHostEntityTypeChange: (value: "ORGANIZATION" | "PERSON") => void;
  eventHostAvatarUrl: string;
  onEventHostAvatarUrlChange: (value: string) => void;
  eventHostPhone: string;
  onEventHostPhoneChange: (value: string) => void;
  eventStoryUrl: string;
  onEventStoryUrlChange: (value: string) => void;
  eventStoryAutoOpen: boolean;
  onEventStoryAutoOpenChange: (value: boolean) => void;
  eventPwaEnabled: boolean;
  onEventPwaEnabledChange: (value: boolean) => void;
  eventTicketTiers: any[];
  onEventTicketTiersChange: (tiers: any[]) => void;
  eventSchedule: any[];
  onEventScheduleChange: (items: any[]) => void;
  eventSpeakers: any[];
  onEventSpeakersChange: (speakers: any[]) => void;
  eventSponsors: any[];
  onEventSponsorsChange: (sponsors: any[]) => void;
  eventSurveys: EventSurvey[];
  onEventSurveysChange: (surveys: EventSurvey[]) => void;
  eventRefundPolicy: string;
  onEventRefundPolicyChange: (value: string) => void;
  eventHalfPricePolicy: string;
  onEventHalfPricePolicyChange: (value: string) => void;
  eventAccessibilityInfo: string;
  onEventAccessibilityInfoChange: (value: string) => void;
}

export function ClassifiedEventSection({
  eventDate,
  onEventDateChange,
  eventEndDate,
  onEventEndDateChange,
  eventStartTime,
  onEventStartTimeChange,
  eventEndTime,
  onEventEndTimeChange,
  eventGatesOpenTime,
  onEventGatesOpenTimeChange,
  eventAgeRating,
  onEventAgeRatingChange,
  eventVisibility,
  onEventVisibilityChange,
  eventVenueName,
  onEventVenueNameChange,
  eventVenueAddress,
  onEventVenueAddressChange,
  eventParkingInfo,
  onEventParkingInfoChange,
  eventHostName,
  onEventHostNameChange,
  eventHostRole,
  onEventHostRoleChange,
  eventHostEntityType,
  onEventHostEntityTypeChange,
  eventHostAvatarUrl,
  onEventHostAvatarUrlChange,
  eventHostPhone,
  onEventHostPhoneChange,
  eventStoryUrl,
  onEventStoryUrlChange,
  eventStoryAutoOpen,
  onEventStoryAutoOpenChange,
  eventPwaEnabled,
  onEventPwaEnabledChange,
  eventTicketTiers,
  onEventTicketTiersChange,
  eventSchedule,
  onEventScheduleChange,
  eventSpeakers,
  onEventSpeakersChange,
  eventSponsors,
  onEventSponsorsChange,
  eventSurveys,
  onEventSurveysChange,
  eventRefundPolicy,
  onEventRefundPolicyChange,
  eventHalfPricePolicy,
  onEventHalfPricePolicyChange,
  eventAccessibilityInfo,
  onEventAccessibilityInfoChange,
}: ClassifiedEventSectionProps) {
  return (
    <div className="bg-card rounded-lg p-5 sm:p-6 space-y-6 border border-border/60 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
          <Calendar className="size-4 text-primary shrink-0" />
          <span>Detalhes do Evento</span>
        </div>
        <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
          Classificado / Eventos
        </Badge>
      </div>

      {/* 3.1 — Datas, Horários & Visibilidade */}
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <span>Datas e Horários</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-date" className="text-xs font-medium text-foreground">
              Data de Início *
            </Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => onEventDateChange(e.target.value)}
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-end-date" className="text-xs font-medium text-foreground">
              Data de Término (Opcional)
            </Label>
            <Input
              id="event-end-date"
              type="date"
              value={eventEndDate}
              onChange={(e) => onEventEndDateChange(e.target.value)}
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-start-time" className="text-xs font-medium text-foreground">
              Horário de Início
            </Label>
            <Input
              id="event-start-time"
              type="time"
              value={eventStartTime}
              onChange={(e) => onEventStartTimeChange(e.target.value)}
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-end-time" className="text-xs font-medium text-foreground">
              Horário de Encerramento
            </Label>
            <Input
              id="event-end-time"
              type="time"
              value={eventEndTime}
              onChange={(e) => onEventEndTimeChange(e.target.value)}
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-gates-open" className="text-xs font-medium text-foreground">
              Abertura dos Portões
            </Label>
            <Input
              id="event-gates-open"
              type="time"
              value={eventGatesOpenTime}
              onChange={(e) => onEventGatesOpenTimeChange(e.target.value)}
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-age-rating" className="text-xs font-medium text-foreground">
              Classificação Indicativa
            </Label>
            <Select value={eventAgeRating} onValueChange={onEventAgeRatingChange}>
              <SelectTrigger id="event-age-rating" className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border">
                <SelectValue placeholder="Selecione a classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Livre">Livre para todos os públicos</SelectItem>
                <SelectItem value="10 anos">10 anos</SelectItem>
                <SelectItem value="12 anos">12 anos</SelectItem>
                <SelectItem value="14 anos">14 anos</SelectItem>
                <SelectItem value="16 anos">16 anos</SelectItem>
                <SelectItem value="18 anos">18 anos ou mais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-visibility" className="text-xs font-medium text-foreground">
              Visibilidade do Evento
            </Label>
            <Select
              value={eventVisibility}
              onValueChange={(val) => onEventVisibilityChange(val as "public" | "unlisted")}
            >
              <SelectTrigger id="event-visibility" className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border">
                <SelectValue placeholder="Visibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Público (Listado na busca e vitrines)</SelectItem>
                <SelectItem value="unlisted">Não Listado (Acesso restrito via link)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3.2 — Local & Espaço */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <span>Local do Evento</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-venue-name" className="text-xs font-medium text-foreground">
              Nome do Local / Pavilhão
            </Label>
            <Input
              id="event-venue-name"
              value={eventVenueName}
              onChange={(e) => onEventVenueNameChange(e.target.value)}
              placeholder="Ex: Centro de Eventos, Pavilhão Central"
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-venue-address" className="text-xs font-medium text-foreground">
              Endereço Completo do Local
            </Label>
            <Input
              id="event-venue-address"
              value={eventVenueAddress}
              onChange={(e) => onEventVenueAddressChange(e.target.value)}
              placeholder="Ex: Av. Principal, 1200 - Bairro Central"
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-parking-info" className="text-xs font-medium text-foreground">
            Estacionamento e Acessibilidade do Local
          </Label>
          <Input
            id="event-parking-info"
            value={eventParkingInfo}
            onChange={(e) => onEventParkingInfoChange(e.target.value)}
            placeholder="Ex: Estacionamento gratuito com vagas PCD e rampas de acesso"
            className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
          />
        </div>
      </div>

      {/* 3.3 — Anfitrião & Realização */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <span>Anfitrião e Realização</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-host-name" className="text-xs font-medium text-foreground">
              Nome do Anfitrião ou Entidade Organizadora
            </Label>
            <Input
              id="event-host-name"
              value={eventHostName}
              onChange={(e) => onEventHostNameChange(e.target.value)}
              placeholder="Ex: Associação Empresarial ou Produtora Alpha"
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-host-role" className="text-xs font-medium text-foreground">
              Papel / Título do Anfitrião
            </Label>
            <Input
              id="event-host-role"
              value={eventHostRole}
              onChange={(e) => onEventHostRoleChange(e.target.value)}
              placeholder="Ex: Organizador Oficial, Realizador"
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="event-host-avatar" className="text-xs font-medium text-foreground">
                Logo da Entidade ou Foto do Anfitrião
              </Label>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                <button
                  type="button"
                  onClick={() => onEventHostEntityTypeChange("ORGANIZATION")}
                  className={`px-2 py-1 min-h-11 rounded text-xs font-semibold cursor-pointer ${
                    eventHostEntityType === "ORGANIZATION"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  Logo (Retangular)
                </button>
                <button
                  type="button"
                  onClick={() => onEventHostEntityTypeChange("PERSON")}
                  className={`px-2 py-1 min-h-11 rounded text-xs font-semibold cursor-pointer ${
                    eventHostEntityType === "PERSON"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  Pessoa (Circular)
                </button>
              </div>
            </div>
            <MediaUploader
              value={eventHostAvatarUrl ? [eventHostAvatarUrl] : []}
              onChange={(urls) => onEventHostAvatarUrlChange(urls[0] || "")}
              bucket="post-media"
              folder="avatar"
              maxFiles={1}
              aspect={eventHostEntityType === "PERSON" ? 1 : 16 / 9}
              cropShape={eventHostEntityType === "PERSON" ? "round" : "rect"}
              accept="image"
              showExternalUrlOption={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-host-phone" className="text-xs font-medium text-foreground">
              WhatsApp de Contato Direto
            </Label>
            <Input
              id="event-host-phone"
              value={eventHostPhone}
              onChange={(e) => onEventHostPhoneChange(e.target.value)}
              placeholder="(00) 00000-0000"
              className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3.4 — Story Vertical & Atalho no Celular */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Film className="size-4 text-primary" />
          <span>Story Vertical</span>
        </p>

        <div className="space-y-2">
          <Label htmlFor="event-story-url" className="text-xs font-medium text-foreground">
            Mídia do Story Vertical 9:16 (Vídeo ou Foto)
          </Label>
          <MediaUploader
            value={eventStoryUrl ? [eventStoryUrl] : []}
            onChange={(urls) => onEventStoryUrlChange(urls[0] || "")}
            bucket="post-media"
            folder="story"
            maxFiles={1}
            aspect={9 / 16}
            accept="all"
            showExternalUrlOption={true}
          />
          <p className="text-xs text-muted-foreground">
            Teaser vertical exibido em formato imersivo full-screen para engajamento instantâneo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-muted/20 gap-3">
            <div className="space-y-1">
              <Label htmlFor="story-auto-open" className="text-xs font-bold text-foreground cursor-pointer">
                Exibir Story ao Abrir o Anúncio
              </Label>
              <p className="text-xs text-muted-foreground">
                Apresenta o story automaticamente na primeira visita
              </p>
            </div>
            <Switch
              id="story-auto-open"
              checked={eventStoryAutoOpen}
              onCheckedChange={onEventStoryAutoOpenChange}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-muted/20 gap-3">
            <div className="space-y-1">
              <Label htmlFor="event-pwa-enabled" className="text-xs font-bold text-foreground cursor-pointer">
                Atalho no Celular (Adicionar à Tela de Início)
              </Label>
              <p className="text-xs text-muted-foreground">
                Convida o participante a salvar o evento como aplicativo na tela inicial
              </p>
            </div>
            <Switch
              id="event-pwa-enabled"
              checked={eventPwaEnabled}
              onCheckedChange={onEventPwaEnabledChange}
            />
          </div>
        </div>
      </div>

      {/* 3.5 — Ingressos & Lotes */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Ticket className="size-4 text-primary" />
              <span>Ingressos e Lotes</span>
            </p>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Defina os lotes e valores. O menor valor ativo será a precificação oficial do anúncio.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newTier: any = {
                id: `tier_${Date.now()}`,
                name: "",
                price: 0,
                status: "available",
                batch: `Lote ${eventTicketTiers.length + 1}`,
              };
              onEventTicketTiersChange([...eventTicketTiers, newTier]);
            }}
            className="h-11 min-h-11 px-3 text-xs gap-2 border-dashed"
          >
            <Plus className="size-3.5" />
            Adicionar Lote
          </Button>
        </div>

        {eventTicketTiers.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border/70 text-center text-xs text-muted-foreground">
            Nenhum lote configurado. Clique no botão acima para adicionar lotes ou opções de ingresso.
          </div>
        ) : (
          <div className="space-y-3">
            {eventTicketTiers.map((tier, idx) => (
              <div key={tier.id} className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Lote #{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEventTicketTiersChange(eventTicketTiers.filter((_, i) => i !== idx))}
                    className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome do Ingresso</Label>
                    <Input
                      value={tier.name}
                      onChange={(e) => {
                        const updated = [...eventTicketTiers];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        onEventTicketTiersChange(updated);
                      }}
                      placeholder="Ex: Pista, Área VIP, Ingresso Solidário"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tier.price || ""}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value) || 0;
                        const updated = [...eventTicketTiers];
                        updated[idx] = {
                          ...updated[idx],
                          price: parsed,
                          price_cents: Math.round(parsed * 100),
                        } as any;
                        onEventTicketTiersChange(updated);
                      }}
                      placeholder="0.00 (0 = GRÁTIS)"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status do Lote</Label>
                    <Select
                      value={tier.status}
                      onValueChange={(val) => {
                        const updated = [...eventTicketTiers];
                        updated[idx] = { ...updated[idx], status: val as "available" | "sold_out" | "coming_soon" };
                        onEventTicketTiersChange(updated);
                      }}
                    >
                      <SelectTrigger className="h-11 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Disponível</SelectItem>
                        <SelectItem value="sold_out">Esgotado</SelectItem>
                        <SelectItem value="coming_soon">Agendado / Em Breve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Link de Compra Externa (Opcional)</Label>
                    <Input
                      value={tier.purchase_url || (tier as any).external_url || ""}
                      onChange={(e) => {
                        const updated = [...eventTicketTiers];
                        updated[idx] = {
                          ...updated[idx],
                          purchase_url: e.target.value,
                          external_url: e.target.value,
                        } as any;
                        onEventTicketTiersChange(updated);
                      }}
                      placeholder="https://sympla.com.br/... ou https://..."
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Regra de Elegibilidade / Benefícios</Label>
                    <Input
                      value={tier.description || ""}
                      onChange={(e) => {
                        const updated = [...eventTicketTiers];
                        updated[idx] = {
                          ...updated[idx],
                          description: e.target.value,
                          eligibility_rule: e.target.value,
                        } as any;
                        onEventTicketTiersChange(updated);
                      }}
                      placeholder="Ex: Exclusivo para associados ACIC / Acesso total"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3.6 — Programação e Cronograma */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span>Programação do Evento</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newItem: any = {
                id: `sched_${Date.now()}`,
                time: "09:00",
                title: "",
                description: "",
                is_break: false,
              };
              onEventScheduleChange([...eventSchedule, newItem]);
            }}
            className="h-11 min-h-11 px-3 text-xs gap-2 border-dashed"
          >
            <Plus className="size-4" />
            Adicionar Atividade
          </Button>
        </div>

        {eventSchedule.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border/70 text-center text-xs text-muted-foreground">
            Nenhuma atividade na programação. Adicione palestras, coffee breaks, painéis e apresentações.
          </div>
        ) : (
          <div className="space-y-3">
            {eventSchedule.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Horário #{idx + 1}</span>
                    {item.is_break && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Coffee className="size-3" /> Intervalo / Café
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEventScheduleChange(eventSchedule.filter((_, i) => i !== idx))}
                    className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Horário</Label>
                    <Input
                      value={item.time}
                      onChange={(e) => {
                        const updated = [...eventSchedule];
                        updated[idx] = { ...updated[idx], time: e.target.value };
                        onEventScheduleChange(updated);
                      }}
                      placeholder="09:00 - 10:00"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Título da Atividade</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...eventSchedule];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        onEventScheduleChange(updated);
                      }}
                      placeholder="Ex: Credenciamento & Welcome Coffee"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Palco / Sala</Label>
                    <Input
                      value={item.stage || (item as any).stage_or_room || ""}
                      onChange={(e) => {
                        const updated = [...eventSchedule];
                        updated[idx] = {
                          ...updated[idx],
                          stage: e.target.value,
                          stage_or_room: e.target.value,
                        } as any;
                        onEventScheduleChange(updated);
                      }}
                      placeholder="Ex: Auditório Principal"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Palestrante Vinculado (Opcional)</Label>
                    <Input
                      value={item.speaker_name || ""}
                      onChange={(e) => {
                        const updated = [...eventSchedule];
                        updated[idx] = { ...updated[idx], speaker_name: e.target.value };
                        onEventScheduleChange(updated);
                      }}
                      placeholder="Ex: Dra. Mariana Costa"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Descrição da Atividade (Opcional)</Label>
                    <Input
                      value={item.description || ""}
                      onChange={(e) => {
                        const updated = [...eventSchedule];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        onEventScheduleChange(updated);
                      }}
                      placeholder="Ex: Painel sobre Inovação e Inteligência Artificial"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Switch
                    id={`break-switch-${idx}`}
                    checked={item.is_break || false}
                    onCheckedChange={(val) => {
                      const updated = [...eventSchedule];
                      updated[idx] = { ...updated[idx], is_break: val };
                      onEventScheduleChange(updated);
                    }}
                  />
                  <Label htmlFor={`break-switch-${idx}`} className="text-xs text-muted-foreground cursor-pointer">
                    Intervalo / Café
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3.7 — Palestrantes & Atrações */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Mic className="size-4 text-primary" />
            <span>Palestrantes e Atrações</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newSpeaker: EventSpeaker = {
                id: `spk_${Date.now()}`,
                name: "",
                role: "",
                company: "",
                bio: "",
              };
              onEventSpeakersChange([...eventSpeakers, newSpeaker]);
            }}
            className="h-11 min-h-11 px-3 text-xs gap-2 border-dashed"
          >
            <Plus className="size-4" />
            Adicionar Palestrante
          </Button>
        </div>

        {eventSpeakers.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border/70 text-center text-xs text-muted-foreground">
            Nenhum palestrante cadastrado. Adicione os palestrantes, debatedores ou atrações do evento.
          </div>
        ) : (
          <div className="space-y-3">
            {eventSpeakers.map((speaker, idx) => (
              <div key={speaker.id} className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Palestrante #{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEventSpeakersChange(eventSpeakers.filter((_, i) => i !== idx))}
                    className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                    <Input
                      value={speaker.name}
                      onChange={(e) => {
                        const updated = [...eventSpeakers];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        onEventSpeakersChange(updated);
                      }}
                      placeholder="Ex: Dra. Mariana Costa"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cargo / Especialidade</Label>
                    <Input
                      value={speaker.role}
                      onChange={(e) => {
                        const updated = [...eventSpeakers];
                        updated[idx] = { ...updated[idx], role: e.target.value };
                        onEventSpeakersChange(updated);
                      }}
                      placeholder="Ex: Diretora de Tecnologia"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Empresa / Instituição</Label>
                    <Input
                      value={speaker.company || ""}
                      onChange={(e) => {
                        const updated = [...eventSpeakers];
                        updated[idx] = { ...updated[idx], company: e.target.value };
                        onEventSpeakersChange(updated);
                      }}
                      placeholder="Ex: Tech Innovations"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Foto do Palestrante</Label>
                    <MediaUploader
                      value={speaker.avatar_url ? [speaker.avatar_url] : []}
                      onChange={(urls) => {
                        const url = urls[0] || "";
                        const updated = [...eventSpeakers];
                        updated[idx] = {
                          ...updated[idx],
                          avatar_url: url,
                          photo_url: url,
                        } as any;
                        onEventSpeakersChange(updated);
                      }}
                      bucket="post-media"
                      folder="avatar"
                      maxFiles={1}
                      aspect={1}
                      cropShape="rect"
                      accept="image"
                      showExternalUrlOption={true}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">LinkedIn / Rede Social</Label>
                    <Input
                      value={speaker.social_url || (speaker as any).social_link || ""}
                      onChange={(e) => {
                        const updated = [...eventSpeakers];
                        updated[idx] = {
                          ...updated[idx],
                          social_url: e.target.value,
                          social_link: e.target.value,
                        } as any;
                        onEventSpeakersChange(updated);
                      }}
                      placeholder="https://linkedin.com/in/..."
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mini Biografia</Label>
                  <Input
                    value={speaker.bio || ""}
                    onChange={(e) => {
                      const updated = [...eventSpeakers];
                      updated[idx] = { ...updated[idx], bio: e.target.value };
                      onEventSpeakersChange(updated);
                    }}
                    placeholder="Resumo de 1 a 2 linhas sobre a atuação do profissional..."
                    className="h-11 text-xs bg-background"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3.8 — Patrocinadores & Parceiros */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Award className="size-4 text-primary" />
            <span>Patrocinadores e Apoiadores</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newSponsor: any = {
                id: `spn_${Date.now()}`,
                name: "",
                tier: "master",
                tier_label: "Patrocínio Master",
              };
              onEventSponsorsChange([...eventSponsors, newSponsor]);
            }}
            className="h-11 min-h-11 px-3 text-xs gap-2 border-dashed"
          >
            <Plus className="size-4" />
            Adicionar Patrocinador
          </Button>
        </div>

        {eventSponsors.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border/70 text-center text-xs text-muted-foreground">
            Nenhum patrocinador cadastrado. Adicione marcas parceiras e apoios institucionais.
          </div>
        ) : (
          <div className="space-y-3">
            {eventSponsors.map((sponsor, idx) => (
              <div key={sponsor.id} className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Marca #{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEventSponsorsChange(eventSponsors.filter((_, i) => i !== idx))}
                    className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome da Marca</Label>
                    <Input
                      value={sponsor.name}
                      onChange={(e) => {
                        const updated = [...eventSponsors];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        onEventSponsorsChange(updated);
                      }}
                      placeholder="Ex: Banco Cooperativo"
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cota de Patrocínio</Label>
                    <Select
                      value={sponsor.tier}
                      onValueChange={(val) => {
                        const updated = [...eventSponsors];
                        updated[idx] = { ...updated[idx], tier: val as "master" | "ouro" | "prata" | "apoio" };
                        onEventSponsorsChange(updated);
                      }}
                    >
                      <SelectTrigger className="h-11 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="master">Cota Master</SelectItem>
                        <SelectItem value="ouro">Cota Ouro</SelectItem>
                        <SelectItem value="prata">Cota Prata</SelectItem>
                        <SelectItem value="apoio">Apoio Institucional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Link do Site (Opcional)</Label>
                    <Input
                      value={sponsor.website_url || ""}
                      onChange={(e) => {
                        const updated = [...eventSponsors];
                        updated[idx] = { ...updated[idx], website_url: e.target.value };
                        onEventSponsorsChange(updated);
                      }}
                      placeholder="https://..."
                      className="h-11 text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Logomarca do Patrocinador</Label>
                  <MediaUploader
                    value={sponsor.logo_url ? [sponsor.logo_url] : []}
                    onChange={(urls) => {
                      const url = urls[0] || "";
                      const updated = [...eventSponsors];
                      updated[idx] = { ...updated[idx], logo_url: url };
                      onEventSponsorsChange(updated);
                    }}
                    bucket="post-media"
                    folder="sponsors"
                    maxFiles={1}
                    aspect={16 / 9}
                    cropShape="rect"
                    accept="image"
                    showExternalUrlOption={true}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3.9 — Enquetes & Interatividade ao Vivo */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <HelpCircle className="size-4 text-primary" />
            <span>Enquetes e Interatividade</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newSurvey: EventSurvey = {
                id: `srv_${Date.now()}`,
                question: "",
                options: [
                  { id: `opt_${Date.now()}_1`, text: "Opção A", votes: 0 },
                  { id: `opt_${Date.now()}_2`, text: "Opção B", votes: 0 },
                ],
                is_active: true,
                lifecycle_state: "OPEN",
                lifecycle_label: "Aberta",
                total_votes: 0,
              };
              onEventSurveysChange([...eventSurveys, newSurvey]);
            }}
            className="h-11 min-h-11 px-3 text-xs gap-2 border-dashed"
          >
            <Plus className="size-4" />
            Adicionar Enquete
          </Button>
        </div>

        {eventSurveys.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border/70 text-center text-xs text-muted-foreground">
            Nenhuma enquete interativa configurada. Ative perguntas para os participantes votarem em tempo real no app.
          </div>
        ) : (
          <div className="space-y-3">
            {eventSurveys.map((survey, idx) => (
              <div key={survey.id} className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Enquete #{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEventSurveysChange(eventSurveys.filter((_, i) => i !== idx))}
                    className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pergunta da Enquete</Label>
                  <Input
                    value={survey.question}
                    onChange={(e) => {
                      const updated = [...eventSurveys];
                      updated[idx] = { ...updated[idx], question: e.target.value };
                      onEventSurveysChange(updated);
                    }}
                    placeholder="Ex: Qual tema você quer ver aprofundado na sessão da tarde?"
                    className="h-11 text-xs bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Opções de Resposta</Label>
                  {survey.options.map((opt: EventPollOptionNormalized, optIdx: number) => (
                    <div key={opt.id || optIdx} className="flex items-center gap-2">
                      <Input
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...eventSurveys];
                          const opts = [...updated[idx].options];
                          opts[optIdx] = { ...opts[optIdx], text: e.target.value };
                          updated[idx] = { ...updated[idx], options: opts };
                          onEventSurveysChange(updated);
                        }}
                        placeholder={`Opção ${optIdx + 1}`}
                        className="h-11 text-xs bg-background"
                      />
                      {survey.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = [...eventSurveys];
                            const opts = updated[idx].options.filter((_, i: number) => i !== optIdx);
                            updated[idx] = { ...updated[idx], options: opts };
                            onEventSurveysChange(updated);
                          }}
                          className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {survey.options.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = [...eventSurveys];
                        const nextIdx = updated[idx].options.length + 1;
                        const opts: EventPollOptionNormalized[] = [
                          ...updated[idx].options,
                          { id: `opt_${Date.now()}_${nextIdx}`, text: `Opção ${nextIdx}`, votes: 0 },
                        ];
                        updated[idx] = { ...updated[idx], options: opts };
                        onEventSurveysChange(updated);
                      }}
                      className="h-11 min-h-11 px-3 text-xs gap-2 border-dashed mt-1"
                    >
                      <Plus className="size-4" />
                      Adicionar Opção
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3.10 — Políticas e Regras do Evento */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <span>Políticas do Evento</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-refund-policy" className="text-xs font-medium text-foreground">
              Política de Cancelamento e Reembolso
            </Label>
            <Textarea
              id="event-refund-policy"
              value={eventRefundPolicy}
              onChange={(e) => onEventRefundPolicyChange(e.target.value)}
              placeholder="Ex: Cancelamentos solicitados até 7 dias corridos após a compra têm devolução integral..."
              className="text-xs bg-background resize-none min-h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-half-price" className="text-xs font-medium text-foreground">
              Regras de Meia-Entrada e Benefícios
            </Label>
            <Textarea
              id="event-half-price"
              value={eventHalfPricePolicy}
              onChange={(e) => onEventHalfPricePolicyChange(e.target.value)}
              placeholder="Ex: Estudantes, idosos e PCD têm 50% de desconto mediante documento comprobatório na entrada..."
              className="text-xs bg-background resize-none min-h-20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-accessibility" className="text-xs font-medium text-foreground">
            Acessibilidade e Inclusão no Local
          </Label>
          <Input
            id="event-accessibility"
            value={eventAccessibilityInfo}
            onChange={(e) => onEventAccessibilityInfoChange(e.target.value)}
            placeholder="Ex: Espaço 100% plano, rampas de acesso, banheiros adaptados e intérprete de Libras"
            className="h-11 rounded-lg text-xs sm:text-sm bg-background border-border"
          />
        </div>
      </div>
    </div>
  );
}
