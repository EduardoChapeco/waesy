import React, { useState, useMemo } from "react";
import {
  Camera,
  FileSpreadsheet,
  ShoppingCart,
  ClipboardList,
  Calendar,
  Sparkles,
  MapPin,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  Lock,
  EyeOff,
  Shield,
  Clock,
  Repeat,
  CheckCircle2,
  CreditCard,
  QrCode,
  ChevronDown,
  ChevronUp,
  Send,
  ThumbsUp,
  HeartHandshake,
  Zap,
  Award,
  Flame,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArtifactInteractiveTable } from "@/components/chat/artifacts/ArtifactInteractiveTable";
import { useCart } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface StructuredDispatchPayload {
  message: string;
  message_type: "text" | "structured_blocks" | "order_card";
  payload: Record<string, any>;
}

export interface ChatQuickComposerModalsProps {
  trayOpen: boolean;
  onTrayOpenChange: (open: boolean) => void;
  onDispatchMessage: (data: StructuredDispatchPayload) => Promise<void> | void;
  onOpenRmaModal?: () => void;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  activeModalOverride?: "form" | "event" | "sticker" | "spreadsheet" | null;
  onClearModalOverride?: () => void;
}

const DEFAULT_SPREADSHEET_PRESETS = [
  {
    id: "sales-q3",
    title: "Relatório Comercial & Pedidos",
    headers: ["ID", "Cliente", "Categoria", "Status", "Valor (R$)", "Data"],
    rows: [
      ["PED-9041", "AgroSul Cooperativa", "Atacado", "Confirmado", 2480, "2026-10-28"],
      ["PED-9042", "Mercado Central", "Reposição", "Em Rota", 1390, "2026-10-28"],
      ["PED-9043", "Padaria São Miguel", "Insumos", "Entregue", 860, "2026-10-29"],
      ["PED-9044", "Restaurante Sabor", "Bebidas", "Confirmado", 1920, "2026-10-29"],
      ["PED-9045", "Farmácia Vida", "Conveniência", "Preparando", 540, "2026-10-29"],
    ],
    summary: { total_pedidos: 5, receita_acumulada: 7190 },
  },
  {
    id: "inventory-live",
    title: "Controle de Estoque & Giro",
    headers: ["SKU", "Produto", "Unidades", "Giro Semanal", "Preço Unitário"],
    rows: [
      ["SKU-101", "Kit Executivo Premium", 42, "Alto", "R$ 129,90"],
      ["SKU-104", "Combo Família Especial", 18, "Muito Alto", "R$ 89,90"],
      ["SKU-209", "Assinatura Mensal Pro", 95, "Recorrente", "R$ 49,90"],
      ["SKU-312", "Caixa Organizadora Modular", 14, "Médio", "R$ 64,00"],
    ],
    summary: { skus_ativos: 4, unidades_totais: 169 },
  },
];

const VISUAL_STICKERS = [
  { id: "st-confirm", label: "Pedido Confirmado", sub: "Já estamos preparando", icon: PackageCheck },
  { id: "st-fast", label: "Saída Imediata", sub: "Entregador a caminho", icon: Zap },
  { id: "st-thanks", label: "Muito Obrigado", sub: "Agradecemos a preferência", icon: HeartHandshake },
  { id: "st-approved", label: "Aprovado 100%", sub: "Tudo certo para avançar", icon: ThumbsUp },
  { id: "st-top", label: "Qualidade Garantida", sub: "Selo Verificado Waesy", icon: Award },
  { id: "st-promo", label: "Condição Especial", sub: "Oferta liberada no chat", icon: Flame },
];

export function ChatQuickComposerModals({
  trayOpen,
  onTrayOpenChange,
  onDispatchMessage,
  onOpenRmaModal,
  storeName = "Loja Parceira",
  storeSlug,
  activeModalOverride,
  onClearModalOverride,
}: ChatQuickComposerModalsProps) {
  const [activeModal, setActiveModal] = useState<
    "form" | "event" | "sticker" | "spreadsheet" | null
  >(null);

  const currentModal = activeModalOverride || activeModal;
  const closeAllModals = () => {
    setActiveModal(null);
    onClearModalOverride?.();
  };

  // Estado Modal 1: Formulário Rápido / Anônimo / Secreto
  const [formMode, setFormMode] = useState<"standard" | "anonymous" | "secret">("standard");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formFields, setFormFields] = useState<
    Array<{ id: string; label: string; type: "text" | "choice"; optionsText: string }>
  >([
    { id: "f1", label: "Qual sua preferência de atendimento?", type: "choice", optionsText: "Entrega Expressa, Retirada no Balcão, Agendado" },
    { id: "f2", label: "Observações adicionais", type: "text", optionsText: "" },
  ]);

  // Estado Modal 2: Novo Evento Rápido (WhatsApp iOS 2024 Events)
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("Hoje, 30 de Out");
  const [eventStartTime, setEventStartTime] = useState("11:00");
  const [eventEndTime, setEventEndTime] = useState("12:00");
  const [eventRepeat, setEventRepeat] = useState("Nunca");
  const [eventLocation, setEventLocation] = useState("");
  const [eventAddCalendar, setEventAddCalendar] = useState(true);

  // Estado Modal 4: Planilha
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);

  const handleAddFormField = () => {
    setFormFields((prev) => [
      ...prev,
      {
        id: `f-${Date.now()}`,
        label: "",
        type: "text",
        optionsText: "",
      },
    ]);
  };

  const handleRemoveFormField = (id: string) => {
    setFormFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDispatchForm = async () => {
    const cleanTitle =
      formTitle.trim() ||
      (formMode === "secret"
        ? "Pesquisa Confidencial"
        : formMode === "anonymous"
        ? "Enquete Anônima"
        : "Formulário Rápido");

    const validFields = formFields
      .filter((f) => f.label.trim().length > 0)
      .map((f, idx) => ({
        name: `field_${idx + 1}`,
        label: f.label.trim(),
        placeholder: "Sua resposta...",
        type: "text",
        options:
          f.type === "choice"
            ? f.optionsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
      }));

    if (validFields.length === 0) {
      toast.error("Adicione pelo menos um campo ao formulário.");
      return;
    }

    const modeLabel =
      formMode === "secret"
        ? "Formulário Secreto"
        : formMode === "anonymous"
        ? "Formulário Anônimo"
        : "Formulário Rápido";

    await onDispatchMessage({
      message: `${modeLabel}: ${cleanTitle}`,
      message_type: "structured_blocks",
      payload: {
        text: formDesc.trim() || undefined,
        blocks: [
          {
            type: "inline_form",
            data: {
              form_id: `form-${Date.now()}`,
              title: cleanTitle,
              description: formDesc.trim() || undefined,
              privacy_mode: formMode,
              submit_label:
                formMode === "secret"
                  ? "Enviar Criptografado"
                  : formMode === "anonymous"
                  ? "Responder Anonimamente"
                  : "Enviar Resposta",
              fields: validFields,
            },
          },
        ],
      },
    });

    toast.success(`${modeLabel} enviado na conversa!`);
    setFormTitle("");
    setFormDesc("");
    closeAllModals();
  };

  const handleDispatchEvent = async () => {
    const cleanTitle = eventTitle.trim() || "Reunião / Alinhamento";
    await onDispatchMessage({
      message: `Evento agendado: ${cleanTitle}`,
      message_type: "structured_blocks",
      payload: {
        blocks: [
          {
            type: "event_card",
            data: {
              event_id: `evt-${Date.now()}`,
              title: cleanTitle,
              description: eventDesc.trim() || undefined,
              date_label: eventDate,
              time_range: `${eventStartTime} - ${eventEndTime}`,
              repeat: eventRepeat,
              location: eventLocation.trim() || storeName,
              add_to_calendar: eventAddCalendar,
            },
          },
        ],
      },
    });
    toast.success("Evento publicado na conversa!");
    setEventTitle("");
    setEventDesc("");
    closeAllModals();
  };

  const handleDispatchSticker = async (sticker: (typeof VISUAL_STICKERS)[number]) => {
    await onDispatchMessage({
      message: `[Sticker] ${sticker.label} — ${sticker.sub}`,
      message_type: "structured_blocks",
      payload: {
        blocks: [
          {
            type: "summary_card",
            data: {
              title: sticker.label,
              subtitle: sticker.sub,
              badge: "Sticker Express",
            },
          },
        ],
      },
    });
    toast.success("Sticker enviado!");
    closeAllModals();
  };

  const handleDispatchSpreadsheet = async () => {
    const preset = DEFAULT_SPREADSHEET_PRESETS[selectedPresetIdx] || DEFAULT_SPREADSHEET_PRESETS[0];
    await onDispatchMessage({
      message: `Planilha compartilhada: ${preset.title}`,
      message_type: "structured_blocks",
      payload: {
        text: `Planilha interativa compartilhada (${preset.rows.length} registros):`,
        blocks: [
          {
            type: "table",
            data: {
              title: preset.title,
              headers: preset.headers,
              rows: preset.rows,
            },
          },
        ],
      },
    });
    toast.success("Planilha enviada na conversa!");
    closeAllModals();
  };

  const handleDispatchLocation = async () => {
    onTrayOpenChange(false);
    await onDispatchMessage({
      message: "Localização compartilhada ao vivo (-26.7254, -53.5178)",
      message_type: "structured_blocks",
      payload: {
        blocks: [
          {
            type: "order_tracker",
            data: {
              order_id: `LOC-${Date.now().toString().slice(-4)}`,
              current_stage: "dispatched",
              pickup_code: "4829",
              delivery_address: "Av. Willy Barth, Centro — São Miguel do Oeste",
              store_name: storeName,
              store_slug: storeSlug,
              current_lat: -26.7254,
              current_lng: -53.5178,
              estimated_arrival: "8 min",
            },
          },
        ],
      },
    });
    toast.success("Localização e rastreio enviados!");
  };

  return (
    <>
      {/* Bandeja de Anexos estilo WhatsApp iOS 2024 */}
      <Sheet open={trayOpen} onOpenChange={onTrayOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4 sm:p-6 max-w-lg mx-auto">
          <SheetHeader className="pb-3 border-b border-border/40 text-left">
            <SheetTitle className="text-sm font-bold text-foreground">
              Anexos
            </SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onTrayOpenChange(false);
                setActiveModal("form");
              }}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <ClipboardList className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground text-center">
                Formulário
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onTrayOpenChange(false);
                setActiveModal("event");
              }}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Calendar className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground text-center">
                Evento
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onTrayOpenChange(false);
                setActiveModal("spreadsheet");
              }}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
                <FileSpreadsheet className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground text-center">
                Planilha
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onTrayOpenChange(false);
                setActiveModal("sticker");
              }}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Sparkles className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground text-center">
                Sticker
              </span>
            </button>

            <button
              type="button"
              onClick={handleDispatchLocation}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <MapPin className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground text-center">
                Localização
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onTrayOpenChange(false);
                toast.info("Seletor de câmera e galeria pronto.");
              }}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-12 rounded-2xl bg-muted text-foreground flex items-center justify-center border border-border/60">
                <Camera className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground text-center">
                Fotos
              </span>
            </button>

            {onOpenRmaModal && (
              <button
                type="button"
                onClick={() => {
                  onTrayOpenChange(false);
                  onOpenRmaModal();
                }}
                className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                  <AlertTriangle className="size-5" />
                </div>
                <span className="text-xs font-semibold text-foreground text-center">
                  Suporte
                </span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* MODAL 1: CRIAR FORMULÁRIO RÁPIDO / ANÔNIMO / SECRETO */}
      <Dialog
        open={currentModal === "form"}
        onOpenChange={(open) => !open && closeAllModals()}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-foreground">
              Formulário
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4 max-h-96 overflow-y-auto no-scrollbar">
            {/* Seletor de Privacidade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "standard", label: "Padrão", icon: Shield },
                { id: "anonymous", label: "Anônimo", icon: EyeOff },
                { id: "secret", label: "Secreto", icon: Lock },
              ].map((m) => {
                const Icon = m.icon;
                const active = formMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFormMode(m.id as any)}
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      active
                        ? "bg-primary text-primary-foreground border-primary font-bold"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/60",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Título do Formulário
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Avaliação de Atendimento ou Pedido Sob Medida"
                className="h-11 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Descrição ou Finalidade
              </label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Opcional: explique como os dados serão utilizados"
                className="h-11 text-xs"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Perguntas ({formFields.length})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFormField}
                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus className="size-3.5" />
                  <span>Pergunta</span>
                </Button>
              </div>

              {formFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setFormFields((prev) =>
                            prev.map((f) =>
                              f.id === field.id
                                ? { ...f, type: f.type === "text" ? "choice" : "text" }
                                : f,
                            ),
                          )
                        }
                        className="h-11 min-h-11 px-3 rounded-md text-xs font-semibold bg-background border border-border/60 text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {field.type === "choice" ? "Múltipla Escolha" : "Texto Livre"}
                      </button>
                      {formFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFormField(field.id)}
                          className="size-11 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label="Remover pergunta"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <Input
                    value={field.label}
                    onChange={(e) =>
                      setFormFields((prev) =>
                        prev.map((f) =>
                          f.id === field.id ? { ...f, label: e.target.value } : f,
                        ),
                      )
                    }
                    placeholder="Digite a pergunta..."
                    className="h-11 text-xs bg-background"
                  />

                  {field.type === "choice" && (
                    <Input
                      value={field.optionsText}
                      onChange={(e) =>
                        setFormFields((prev) =>
                          prev.map((f) =>
                            f.id === field.id ? { ...f, optionsText: e.target.value } : f,
                          ),
                        )
                      }
                      placeholder="Opções separadas por vírgula (Ex: Sim, Não, Talvez)"
                      className="h-11 text-xs bg-background"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-border/50 flex items-center justify-end gap-2 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={closeAllModals}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDispatchForm}
              className="h-11 min-h-11 px-5 text-xs font-bold gap-2 cursor-pointer"
            >
              <Send className="size-3.5" />
              <span>Publicar no Chat</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: NOVO EVENTO RÁPIDO (WHATSAPP iOS 2024 EVENTS) */}
      <Dialog
        open={currentModal === "event"}
        onOpenChange={(open) => !open && closeAllModals()}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-foreground">
              Evento
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto no-scrollbar">
            <div className="rounded-xl bg-muted/30 border border-border/60 p-3 space-y-2">
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Título do Evento (ex: Reunião de Equipe / Live)"
                className="h-11 text-xs font-semibold bg-background"
              />
              <Textarea
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
                placeholder="Descrição ou pauta (opcional)..."
                rows={2}
                className="text-xs bg-background resize-none"
              />
            </div>

            <div className="rounded-xl bg-muted/30 border border-border/60 divide-y divide-border/40">
              <div className="p-3 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <span>Data</span>
                </span>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="h-11 px-3 rounded-lg bg-background border border-border/60 text-xs font-semibold text-right w-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="p-3 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span>Horário</span>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="h-11 px-2 rounded-lg bg-background border border-border/60 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="h-11 px-2 rounded-lg bg-background border border-border/60 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="p-3 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <Repeat className="size-4 text-primary" />
                  <span>Repetição</span>
                </span>
                <select
                  value={eventRepeat}
                  onChange={(e) => setEventRepeat(e.target.value)}
                  className="h-11 px-3 rounded-lg bg-background border border-border/60 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Nunca">Nunca</option>
                  <option value="Diariamente">Diariamente</option>
                  <option value="Semanalmente">Semanalmente</option>
                  <option value="Mensalmente">Mensalmente</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-muted/30 border border-border/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary shrink-0" />
                <Input
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Localização física ou Link da Chamada"
                  className="h-11 text-xs bg-background"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <span className="font-semibold text-foreground">
                  Adicionar ao calendário
                </span>
                <Switch
                  checked={eventAddCalendar}
                  onCheckedChange={setEventAddCalendar}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/50 flex items-center justify-end gap-2 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={closeAllModals}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDispatchEvent}
              className="h-11 min-h-11 px-5 text-xs font-bold gap-2 cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              <span>Criar Evento</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: STICKERS & RESPOSTAS VISUAIS */}
      <Dialog
        open={currentModal === "sticker"}
        onOpenChange={(open) => !open && closeAllModals()}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-foreground">
              Stickers
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 grid grid-cols-2 gap-3">
            {VISUAL_STICKERS.map((st) => {
              const Icon = st.icon;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleDispatchSticker(st)}
                  className="p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 transition-colors text-left flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{st.label}</p>
                    <p className="text-2xs text-muted-foreground truncate">{st.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: PREVIEW INTERATIVO DE PLANILHA / DOCUMENTO */}
      <Dialog
        open={currentModal === "spreadsheet"}
        onOpenChange={(open) => !open && closeAllModals()}
      >
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-border/80 rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-bold text-foreground">
              Planilha
            </DialogTitle>
            <div className="flex items-center gap-2 pr-6">
              {DEFAULT_SPREADSHEET_PRESETS.map((preset, idx) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetIdx(idx)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    selectedPresetIdx === idx
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {idx === 0 ? "Pedidos" : "Estoque"}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div className="p-4 max-h-96 overflow-y-auto no-scrollbar">
            <ArtifactInteractiveTable
              title={DEFAULT_SPREADSHEET_PRESETS[selectedPresetIdx].title}
              headers={DEFAULT_SPREADSHEET_PRESETS[selectedPresetIdx].headers}
              rows={DEFAULT_SPREADSHEET_PRESETS[selectedPresetIdx].rows}
              summary={DEFAULT_SPREADSHEET_PRESETS[selectedPresetIdx].summary as unknown as Record<string, number>}
            />
          </div>

          <div className="p-4 border-t border-border/50 flex items-center justify-end gap-2 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={closeAllModals}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handleDispatchSpreadsheet}
              className="h-11 min-h-11 px-5 text-xs font-bold gap-2 cursor-pointer"
            >
              <Send className="size-3.5" />
              <span>Enviar Planilha no Chat</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Banner / Gaveta Recolhível de Carrinho e Pagamento Rápido Dentro do Chat
// ============================================================================

export function InChatStoreCartBanner({
  storeId,
  storeName = "Loja Parceira",
  storeSlug,
  onDispatchMessage,
}: {
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  onDispatchMessage: (data: StructuredDispatchPayload) => Promise<void> | void;
}) {
  const { cart, globalCarts, updateQty } = useCart();
  const [expanded, setExpanded] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");

  const activeStoreCart = useMemo(() => {
    if (storeId && globalCarts.length > 0) {
      const matched = globalCarts.find((c) => c.storeId === storeId);
      if (matched && matched.items.length > 0) return matched;
    }
    if (cart && cart.items && cart.items.length > 0) return cart;
    return null;
  }, [cart, globalCarts, storeId]);

  const effectiveItems = useMemo(() => {
    if (activeStoreCart && activeStoreCart.items.length > 0) {
      return activeStoreCart.items.map((i) => ({
        id: i.id,
        variantId: i.variantId,
        productTitle: i.productTitle,
        qty: i.qty,
        priceCents: i.priceCents,
      }));
    }
    return [];
  }, [activeStoreCart]);

  const subtotalCents = useMemo(
    () => effectiveItems.reduce((acc, item) => acc + item.priceCents * item.qty, 0),
    [effectiveItems],
  );
  const totalCount = useMemo(
    () => effectiveItems.reduce((acc, item) => acc + item.qty, 0),
    [effectiveItems],
  );

  const handleAdjustQty = (item: (typeof effectiveItems)[number], delta: number) => {
    if (activeStoreCart) {
      updateQty(item.variantId, delta, item.id);
    }
  };

  if (effectiveItems.length === 0) {
    return null;
  }

  const handleSendCartToChat = async () => {
    await onDispatchMessage({
      message: `Carrinho compartilhado (${totalCount} itens • ${formatMoney(subtotalCents / 100)})`,
      message_type: "structured_blocks",
      payload: {
        blocks: [
          {
            type: "commerce_cart",
            data: {
              cartId: activeStoreCart?.id || `cart-${Date.now()}`,
              storeName,
              items: effectiveItems.map((i) => ({
                id: i.id,
                title: i.productTitle,
                quantity: i.qty,
                unitPriceCents: i.priceCents,
                totalPriceCents: i.priceCents * i.qty,
              })),
              subtotalCents,
              shippingCents: 0,
              discountCents: 0,
              totalCents: subtotalCents,
            },
          },
        ],
      },
    });
    toast.success("Carrinho enviado na conversa!");
    setExpanded(false);
  };

  const handleQuickPayConfirm = async () => {
    const orderNumber = `WSY-${Date.now().toString().slice(-4)}`;
    const pickupCode = String(Math.floor(1000 + Math.random() * 9000));

    await onDispatchMessage({
      message: `Pagamento ${payMethod === "pix" ? "PIX" : "Cartão"} confirmado — Pedido ${orderNumber} (Código: ${pickupCode})`,
      message_type: "structured_blocks",
      payload: {
        text: `Pedido confirmado via Pagamento Rápido no Chat (${payMethod === "pix" ? "PIX Instantâneo" : "Cartão em 1 Clique"}). Apresente o código ao entregador ou balcão:`,
        blocks: [
          {
            type: "commerce_order_tracking",
            data: {
              orderId: orderNumber,
              orderNumber,
              publicToken: orderNumber,
              status: "in_transit",
              totalCents: subtotalCents,
              itemsCount: totalCount,
              pickupCode,
              storeName,
              storeSlug,
              deliveryAddress: "Entrega Expressa • Rastreio Ao Vivo no Chat",
              estimatedArrival: "10-15 min",
              currentLat: -26.7254,
              currentLng: -53.5178,
              courier: {
                name: "Entregador Parceiro Waesy Go",
                vehicle: "MotoLink Express",
              },
            },
          },
        ],
      },
    });

    toast.success(`Pagamento aprovado! Código de entrega: ${pickupCode}`);
    setPayModalOpen(false);
    setExpanded(false);
  };

  if (effectiveItems.length === 0) return null;

  return (
    <div className="border-b border-border/50 bg-card/95 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-3 min-w-0 flex-1 h-11 min-h-11 px-2 rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate">
                Sacola no Chat
              </span>
              <Badge variant="secondary" className="text-2xs font-mono">
                {totalCount} {totalCount === 1 ? "item" : "itens"}
              </Badge>
            </div>
            <p className="text-xs font-mono font-semibold text-primary">
              {formatMoney(subtotalCents / 100)}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendCartToChat}
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            Enviar Carrinho
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setPayModalOpen(true)}
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <CreditCard className="size-3.5" />
            <span>Pagar Agora</span>
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="pt-2 mt-2 border-t border-border/40 space-y-2 animate-in fade-in duration-150">
          {effectiveItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{item.productTitle}</p>
                <p className="text-muted-foreground font-mono">
                  {formatMoney(item.priceCents / 100)} un.
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAdjustQty(item, -1)}
                  className="size-11 rounded-md border border-border/60 bg-background flex items-center justify-center text-foreground hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Diminuir"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-6 text-center font-mono font-bold text-foreground">
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => handleAdjustQty(item, 1)}
                  className="size-11 rounded-md border border-border/60 bg-background flex items-center justify-center text-foreground hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Aumentar"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Pagamento Rápido 1-Click no Chat */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-border/80 rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-foreground">
              Pagamento
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">{storeName}</p>
                <p className="text-xs text-muted-foreground">{totalCount} itens no pedido</p>
              </div>
              <span className="text-base font-mono font-bold text-primary">
                {formatMoney(subtotalCents / 100)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod("pix")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                  payMethod === "pix"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border/60 bg-muted/20 text-foreground",
                )}
              >
                <QrCode className="size-4" />
                <span>PIX Instantâneo</span>
              </button>
              <button
                type="button"
                onClick={() => setPayMethod("card")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                  payMethod === "card"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border/60 bg-muted/20 text-foreground",
                )}
              >
                <CreditCard className="size-4" />
                <span>Cartão Salvo</span>
              </button>
            </div>

            <Button
              type="button"
              onClick={handleQuickPayConfirm}
              className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              <span>Confirmar e Gerar Código de Entrega</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
