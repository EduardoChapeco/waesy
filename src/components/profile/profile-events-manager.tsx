import * as React from "react";
import { useState } from "react";
import { Calendar, MapPin, ExternalLink, Plus, Trash2, Edit2, Clock, Zap, Check, Globe, Tag, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";

export interface ProfileEventItem {
  id: string;
  title: string;
  event_date: string;
  end_date?: string | null;
  location?: string | null;
  description?: string | null;
  cover_url?: string | null;
  external_url?: string | null;
  provider?: string | null;
  is_featured?: boolean;
}

interface ProfileEventsManagerProps {
  events: ProfileEventItem[];
  onChange: (events: ProfileEventItem[]) => void;
}

export function ProfileEventsManager({
  events = [],
  onChange,
}: ProfileEventsManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProfileEventItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCoverUrl, setFormCoverUrl] = useState("");
  const [formExternalUrl, setFormExternalUrl] = useState("");
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDate(new Date().toISOString().slice(0, 16));
    setFormEndDate("");
    setFormLocation("");
    setFormDescription("");
    setFormCoverUrl("");
    setFormExternalUrl("");
    setFormIsFeatured(false);
    setModalOpen(true);
  };

  const openEditModal = (ev: ProfileEventItem) => {
    setEditingEvent(ev);
    setFormTitle(ev.title || "");
    setFormDate(ev.event_date ? ev.event_date.slice(0, 16) : "");
    setFormEndDate(ev.end_date ? ev.end_date.slice(0, 16) : "");
    setFormLocation(ev.location || "");
    setFormDescription(ev.description || "");
    setFormCoverUrl(ev.cover_url || "");
    setFormExternalUrl(ev.external_url || "");
    setFormIsFeatured(Boolean(ev.is_featured));
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;

    if (editingEvent) {
      // Atualizar existente
      const updated = events.map((ev) =>
        ev.id === editingEvent.id
          ? {
              ...ev,
              title: formTitle.trim(),
              event_date: formDate || new Date().toISOString(),
              end_date: formEndDate || null,
              location: formLocation.trim() || null,
              description: formDescription.trim() || null,
              cover_url: formCoverUrl || null,
              external_url: formExternalUrl.trim() || null,
              is_featured: formIsFeatured,
            }
          : ev
      );
      onChange(updated);
    } else {
      // Adicionar novo
      const newEv: ProfileEventItem = {
        id: `ev_${Date.now()}`,
        title: formTitle.trim(),
        event_date: formDate || new Date().toISOString(),
        end_date: formEndDate || null,
        location: formLocation.trim() || null,
        description: formDescription.trim() || null,
        cover_url: formCoverUrl || null,
        external_url: formExternalUrl.trim() || null,
        is_featured: formIsFeatured,
      };
      onChange([...events, newEv]);
    }

    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    onChange(events.filter((ev) => ev.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <span>Galeria de Eventos e Apresentações</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Exiba workshops, lançamentos, feiras e encontros diretamente no seu perfil público.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={openCreateModal}
          className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer h-9"
        >
          <Plus className="size-3.5" />
          <span>+ Adicionar Evento</span>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="border border-dashed border-border/70 p-8 text-center rounded-2xl bg-muted/20 space-y-3">
          <Calendar className="size-8 mx-auto text-muted-foreground/50 mb-1" />
          <p className="text-xs font-semibold text-foreground">
            Nenhum evento adicionado ainda
          </p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            Compartilhe sua agenda de eventos presenciais ou online para que clientes e seguidores possam participar.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={openCreateModal}
            className="rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cadastrar Primeiro Evento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev) => {
            const eventDate = new Date(ev.event_date);
            const isPast = !isNaN(eventDate.getTime()) && eventDate < new Date();
            const formattedDate = !isNaN(eventDate.getTime())
              ? eventDate.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Data a definir";

            return (
              <div
                key={ev.id}
                className={cn(
                  "rounded-2xl border p-4 bg-card flex flex-col justify-between transition-all shadow-2xs group relative overflow-hidden",
                  ev.is_featured
                    ? "border-primary/50 ring-1 ring-primary/20"
                    : "border-border/70 hover:border-border"
                )}
              >
                <div className="space-y-3">
                  {/* Capa do Evento se houver */}
                  {ev.cover_url && (
                    <div className="h-32 w-full rounded-xl overflow-hidden bg-muted border border-border/40 relative">
                      <img
                        src={ev.cover_url}
                        alt={ev.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      {ev.is_featured && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary text-primary-foreground text-[9px] font-bold shadow-md">
                            Destaque
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-mono",
                            isPast
                              ? "text-muted-foreground border-border"
                              : "text-primary border-primary/30 font-bold"
                          )}
                        >
                          {isPast ? "Encerrado" : "Confirmado"}
                        </Badge>
                        {ev.is_featured && !ev.cover_url && (
                          <Badge className="bg-primary text-primary-foreground text-[9px] font-bold">
                            Destaque
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {ev.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditModal(ev)}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(ev.id)}
                        className="size-7 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {ev.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>
                  )}

                  <div className="space-y-1 pt-1 border-t border-border/30 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground/70 shrink-0" />
                      <span>{formattedDate}</span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {ev.external_url && (
                  <div className="pt-3 mt-3 border-t border-border/30 flex items-center justify-between">
                    <a
                      href={ev.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Página do Evento / Ingressos</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog de Cadastro / Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingEvent ? "Editar Evento" : "Novo Evento no Perfil"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Título do Evento *
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Workshop de Liderança, Show Acústico, Feira de Negócios"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Data e Horário de Início
                </Label>
                <Input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Término (opcional)
                </Label>
                <Input
                  type="datetime-local"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Localização (ou Link Online)
              </Label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Ex: Centro de Eventos, Rua XV de Novembro ou Online (Google Meet)"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Link Externo / Ingressos / Inscrição
              </Label>
              <Input
                value={formExternalUrl}
                onChange={(e) => setFormExternalUrl(e.target.value)}
                placeholder="https://sympla.com.br/... ou https://wa.me/..."
                className="h-10 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Descrição do Evento
              </Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Conte sobre o que é o evento, atrações, convidados..."
                className="rounded-xl text-xs min-h-[70px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Imagem de Capa (Formato 16:9)
              </Label>
              <ImageUpload
                value={formCoverUrl}
                onChange={(url) => setFormCoverUrl(url || "")}
                onRemove={() => setFormCoverUrl("")}
                aspectPreset="widescreen"
                bucket="cms-media"
                helperText="Banner horizontal para ilustrar o evento"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="featCheck"
                checked={formIsFeatured}
                onChange={(e) => setFormIsFeatured(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
              />
              <label htmlFor="featCheck" className="text-xs font-medium text-foreground cursor-pointer">
                Destacar este evento com badge de destaque
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="rounded-xl text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!formTitle.trim()}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
            >
              Salvar Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
