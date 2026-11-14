import React, { useState, useMemo } from "react";
import {
  Camera,
  FileSpreadsheet,
  ShoppingCart,
  ClipboardList,
  Calendar,
  Smile,
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
import { createCommercialInvoice, getStoreCommercialPaymentConfig } from "@/services/commercial-invoices.functions";
import { generatePixBrCode } from "@/lib/pix-payload";
import { useCart } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function parseBrlAmountToCents(raw: string): number {
  const cleaned = String(raw || "").replace(/R\$\s*/gi, "").trim();
  if (!cleaned) return 0;
  // Formatos: "1.290,50" -> 1290.50 ou "290.50" -> 290.50
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export interface StructuredDispatchPayload {
  message: string;
  message_type: "text" | "structured_blocks" | "order_card" | "image";
  payload: Record<string, any>;
  attachments?: string[];
}

export interface ChatQuickComposerModalsProps {
  trayOpen: boolean;
  onTrayOpenChange: (open: boolean) => void;
  onDispatchMessage: (data: StructuredDispatchPayload) => Promise<void> | void;
  onOpenRmaModal?: () => void;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  threadId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  activeModalOverride?: "form" | "event" | "sticker" | "spreadsheet" | "invoice" | "boleto" | "contract" | "quote" | "image_card" | null;
  onClearModalOverride?: () => void;
}

const DEFAULT_SPREADSHEET_PRESETS = [
  {
    id: "sales-q3",
    title: "Relatório Comercial & Pedidos",
    headers: ["ID", "Cliente", "Categoria", "Status", "Valor (R$)", "Data"],
    rows: [
      ["ITEM-01", "Serviço / Produto Principal", "Comercial", "Ativo", 0, "Atual"],
      ["ITEM-02", "Atendimento Complementar", "Operacional", "Ativo", 0, "Atual"],
      ["ITEM-03", "Taxa / Entrega", "Logística", "Ativo", 0, "Atual"],
      ["ITEM-04", "Garantia / Suporte", "Pós-Venda", "Ativo", 0, "Atual"],
      ["ITEM-05", "Condição Especial", "Comercial", "Ativo", 0, "Atual"],
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
  storeId,
  storeName = "Loja Parceira",
  storeSlug,
  customerId,
  customerName,
  customerPhone,
  customerEmail,
  activeModalOverride,
  onClearModalOverride,
}: ChatQuickComposerModalsProps) {
  const [activeModal, setActiveModal] = useState<
    "form" | "event" | "sticker" | "spreadsheet" | "invoice" | "boleto" | "contract" | "quote" | "image_card" | null
  >(null);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  const currentModal = activeModalOverride || activeModal;
  const closeAllModals = () => {
    setActiveModal(null);
    onClearModalOverride?.();
  };

  // Estado Modal 5: Gerador de Imagem / Card Visual para o Cliente
  const [imgTemplate, setImgTemplate] = useState<"offer_quote" | "travel_voucher" | "pix_invoice" | "status_notice">("offer_quote");
  const [imgHeadline, setImgHeadline] = useState("");
  const [imgSubtitle, setImgSubtitle] = useState("");
  const [imgHighlight, setImgHighlight] = useState("");
  const [imgDetails, setImgDetails] = useState("");

  const handleDispatchImageCard = async () => {
    const templateLabelMap = {
      offer_quote: "COTAÇÃO & OFERTA EXCLUSIVA",
      travel_voucher: "VOUCHER & LOCALIZADOR DE VIAGEM",
      pix_invoice: "FATURA & COBRANÇA PIX",
      status_notice: "COMUNICADO DE ATENDIMENTO",
    };
    const titleText =
      imgHeadline.trim() ||
      (imgTemplate === "travel_voucher"
        ? "Reserva Confirmada • Aéreo + Hotel"
        : imgTemplate === "pix_invoice"
          ? "Fatura Disponível para Pagamento"
          : imgTemplate === "status_notice"
            ? "Atualização Importante do seu Pedido"
            : "Proposta Especial Preparada para Você");
    const subText = imgSubtitle.trim() || storeName;
    const highlightText =
      imgHighlight.trim() ||
      (imgTemplate === "travel_voucher" ? "PNR: CONFIRMED" : "Condição Confirmada");
    const detailsText =
      imgDetails.trim() ||
      "Atendimento personalizado e suporte dedicado durante toda a sua jornada.";

    let dataUrl = "";
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 680;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = imgTemplate === "travel_voucher" ? "midnightblue" : imgTemplate === "pix_invoice" ? "darkslategray" : "navy";
        ctx.fillRect(0, 0, 1080, 680);

        ctx.fillStyle = "whitesmoke";
        ctx.fillRect(36, 36, 1008, 608);

        ctx.fillStyle = imgTemplate === "travel_voucher" ? "darkslateblue" : imgTemplate === "pix_invoice" ? "teal" : "royalblue";
        ctx.fillRect(36, 36, 1008, 96);

        ctx.fillStyle = "white";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(`${templateLabelMap[imgTemplate]} • ${storeName.toUpperCase()}`, 72, 94);

        ctx.fillStyle = "black";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText(titleText.slice(0, 42), 72, 215);

        ctx.fillStyle = "dimgray";
        ctx.font = "600 28px sans-serif";
        ctx.fillText(subText.slice(0, 58), 72, 270);

        ctx.fillStyle = "gainsboro";
        ctx.fillRect(72, 315, 936, 130);

        ctx.fillStyle = "midnightblue";
        ctx.font = "bold 46px monospace";
        ctx.fillText(highlightText.slice(0, 36), 104, 396);

        ctx.fillStyle = "darkslategray";
        ctx.font = "500 26px sans-serif";
        const words = detailsText.split(" ");
        let line1 = "";
        let line2 = "";
        for (const w of words) {
          if ((line1 + " " + w).trim().length <= 64) {
            line1 = (line1 + " " + w).trim();
          } else if ((line2 + " " + w).trim().length <= 64) {
            line2 = (line2 + " " + w).trim();
          }
        }
        ctx.fillText(line1, 72, 515);
        if (line2) ctx.fillText(line2, 72, 555);

        ctx.fillStyle = "slategray";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`Emitido por ${storeName} • ${new Date().toLocaleDateString("pt-BR")}`, 72, 612);

        dataUrl = canvas.toDataURL("image/png");
      }
    }

    await onDispatchMessage({
      message: `${titleText} — ${highlightText}${imgDetails.trim() ? `\n${imgDetails.trim()}` : ""}`,
      message_type: dataUrl ? "image" : "structured_blocks",
      attachments: dataUrl ? [dataUrl] : undefined,
      payload: {
        ...(dataUrl
          ? {
              media: {
                type: "image",
                url: dataUrl,
                mimetype: "image/png",
                caption: `${titleText} • ${highlightText}`,
              },
            }
          : {}),
        card_meta: {
          template: imgTemplate,
          headline: titleText,
          subtitle: subText,
          highlight: highlightText,
          details: detailsText,
        },
        blocks: [
          {
            type: "summary_card",
            data: {
              title: titleText,
              subtitle: `${highlightText} • ${detailsText}`,
              badge: templateLabelMap[imgTemplate],
            },
          },
        ],
      },
    });

    toast.success("Card visual em imagem gerado e enviado para o cliente!");
    setImgHeadline("");
    setImgSubtitle("");
    setImgHighlight("");
    setImgDetails("");
    closeAllModals();
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
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDueDate, setTxDueDate] = useState("");
  const [txCodeOrLink, setTxCodeOrLink] = useState("");
  const [txNotes, setTxNotes] = useState("");

  const handleDispatchTransactional = async (kind: "invoice" | "boleto" | "contract" | "quote") => {
    if (isSubmittingTx) return;
    const cleanTitle = txTitle.trim() || (kind === "invoice" ? "Fatura / Cobrança PIX" : kind === "boleto" ? "Boleto Bancário / 2ª Via" : kind === "contract" ? "Contrato para Assinatura Digital" : "Orçamento Comercial");
    const amountCents = parseBrlAmountToCents(txAmount);
    const cleanAmount = txAmount.trim() || (amountCents > 0 ? formatMoney(amountCents / 100).replace(/^R\$\s*/, "") : "A confirmar");
    const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br";
    let generatedLink = txCodeOrLink.trim();
    let generatedInvoiceCode: string | null = null;
    let generatedPixCode = "";

    setIsSubmittingTx(true);
    try {
      if (!generatedLink && (kind === "invoice" || kind === "quote") && storeId && amountCents > 0) {
        const createdRes = await createCommercialInvoice({
          data: {
            storeId,
            customerId: customerId || null,
            documentType: kind === "invoice" ? "invoice" : "budget",
            customer: {
              name: customerName && customerName.trim().length >= 2 ? customerName.trim() : "Cliente Atendimento",
              phone: customerPhone || "",
              email: customerEmail || "",
            },
            items: [
              {
                title: cleanTitle,
                quantity: 1,
                unitPriceCents: amountCents,
                totalPriceCents: amountCents,
              },
            ],
            subtotalCents: amountCents,
            discountCents: 0,
            shippingCents: 0,
            totalCents: amountCents,
            paymentTerms: {
              method: "pix",
              methodLabel: kind === "invoice" ? "PIX Instantâneo" : "Proposta Comercial",
              installmentsCount: 1,
            },
            notes: txNotes.trim() || "",
            validUntil: txDueDate.trim() || null,
          },
        });
        if (createdRes?.invoice?.public_token) {
          generatedLink = `${origin}/fatura/${createdRes.invoice.public_token}`;
          generatedInvoiceCode = createdRes.invoice.invoice_code || null;
        }
        if (kind === "invoice") {
          const payConfig = await getStoreCommercialPaymentConfig({ data: { storeId } }).catch(() => null);
          const pixKey = String(payConfig?.pixKey || "").trim();
          if (pixKey) {
            generatedPixCode = generatePixBrCode({
              pixKey,
              amountCents,
              merchantName: storeName,
              merchantCity: "Brasil",
              txId: (generatedInvoiceCode || "WAESY").replace(/[^A-Za-z0-9]/g, "").slice(0, 20),
              description: cleanTitle,
            });
          }
        }
      }

      if (!generatedLink) {
        toast.error(
          kind === "boleto" || kind === "contract"
            ? "Cole a linha digitável ou o link oficial antes de enviar no chat."
            : "Informe o valor (R$) ou cole uma chave PIX / link de pagamento válido.",
        );
        return;
      }

      const labelMap = { invoice: "COBRANÇA PIX / FATURA", boleto: "BOLETO / 2ª VIA", contract: "CONTRATO DIGITAL", quote: "ORÇAMENTO / PROPOSTA" };
      const codePrefix = generatedInvoiceCode ? `${generatedInvoiceCode} • ` : "";
      const blocks: Array<Record<string, any>> = [];
      if (generatedPixCode) {
        blocks.push({
          type: "pix_payment",
          data: {
            pix_code: generatedPixCode,
            amount_formatted: `R$ ${cleanAmount}`,
            expires_in: txDueDate.trim() || "24 horas",
            invoice_url: generatedLink,
          },
        });
      }
      blocks.push({
        type: "summary_card",
        data: {
          title: `${codePrefix}${cleanTitle}`,
          subtitle: `Valor: R$ ${cleanAmount}${txDueDate ? ` • Venc.: ${txDueDate}` : ""} • Link: ${generatedLink}`,
          badge: labelMap[kind],
          action_url: generatedLink,
        },
      });

      await onDispatchMessage({
        message: generatedPixCode
          ? `[${labelMap[kind]}] ${codePrefix}${cleanTitle} • Valor: R$ ${cleanAmount}\nPIX Copia e Cola:\n${generatedPixCode}\nFatura: ${generatedLink}${txNotes ? `\n${txNotes}` : ""}`
          : `[${labelMap[kind]}] ${codePrefix}${cleanTitle} • Valor: R$ ${cleanAmount}${txDueDate ? ` • Vencimento: ${txDueDate}` : ""} • Acesse: ${generatedLink}${txNotes ? `\n${txNotes}` : ""}`,
        message_type: "structured_blocks",
        payload: {
          text: `${codePrefix}${cleanTitle} — Valor: R$ ${cleanAmount}`,
          invoice_code: generatedInvoiceCode,
          invoice_url: generatedLink,
          pix_code: generatedPixCode || undefined,
          blocks,
        },
      });
      toast.success(`${cleanTitle} enviado na conversa!`);
      setTxTitle(""); setTxAmount(""); setTxDueDate(""); setTxCodeOrLink(""); setTxNotes("");
      closeAllModals();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível gerar e enviar a cobrança.");
    } finally {
      setIsSubmittingTx(false);
    }
  };

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
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast.error("Geolocalização não disponível neste navegador. Envie o endereço por escrito ou utilize o mapa da entrega.");
      return;
    }

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 30000,
        });
      });

      const currentLat = Number(pos.coords.latitude.toFixed(6));
      const currentLng = Number(pos.coords.longitude.toFixed(6));
      const mapsLink = `https://maps.google.com/?q=${currentLat},${currentLng}`;

      await onDispatchMessage({
        message: `Localização compartilhada (${currentLat}, ${currentLng}) • Mapa: ${mapsLink}`,
        message_type: "structured_blocks",
        payload: {
          blocks: [
            {
              type: "order_tracker",
              data: {
                order_id: `LOC-${Date.now().toString().slice(-4)}`,
                current_stage: "dispatched",
                delivery_address: `${storeName} • Coordenadas verificadas (${currentLat}, ${currentLng})`,
                store_name: storeName,
                store_slug: storeSlug,
                current_lat: currentLat,
                current_lng: currentLng,
                maps_url: mapsLink,
              },
            },
          ],
        },
      });
      toast.success("Localização real enviada na conversa!");
    } catch {
      toast.error("Permita o acesso à localização no navegador para compartilhar coordenadas reais.");
    }
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
            <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("invoice"); }} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center"><QrCode className="size-5" /></div>
              <span className="text-xs font-semibold text-foreground text-center">Cobrança PIX</span>
            </button>
            <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("boleto"); }} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="size-12 rounded-2xl bg-foreground text-background flex items-center justify-center"><CreditCard className="size-5" /></div>
              <span className="text-xs font-semibold text-foreground text-center">Boleto / Fatura</span>
            </button>
            <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("contract"); }} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="size-12 rounded-2xl bg-muted text-foreground flex items-center justify-center"><Shield className="size-5" /></div>
              <span className="text-xs font-semibold text-foreground text-center">Contrato</span>
            </button>
            <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("quote"); }} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="size-12 rounded-2xl bg-muted text-foreground flex items-center justify-center"><ShoppingCart className="size-5" /></div>
              <span className="text-xs font-semibold text-foreground text-center">Orçamento</span>
            </button>
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
              <div className="size-12 rounded-2xl bg-warning/10 text-warning-strong  flex items-center justify-center border border-warning/20">
                <Smile className="size-5" />
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
                setActiveModal("image_card");
              }}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Camera className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground text-center">
                Gerar Imagem
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
                    <p className="text-xs text-muted-foreground truncate">{st.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: PREVIEW INTERATIVO DE PLANILHA / DOCUMENTO */}
      <Dialog open={currentModal === "invoice" || currentModal === "boleto" || currentModal === "contract" || currentModal === "quote"} onOpenChange={(open) => !open && closeAllModals()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-foreground">
              {currentModal === "invoice" ? "Enviar Cobrança PIX / Fatura" : currentModal === "boleto" ? "Enviar Boleto / 2ª Via" : currentModal === "contract" ? "Enviar Contrato p/ Assinatura" : "Enviar Orçamento Comercial"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Título / Referência</label>
              <Input value={txTitle} onChange={(e) => setTxTitle(e.target.value)} placeholder={currentModal === "contract" ? "Ex: Contrato de Prestação de Serviços" : "Ex: Fatura Mensal ou Pedido 104"} className="h-11 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground block">Valor (R$)</label>
                <Input value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="Ex: 290,00" className="h-11 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground block">Vencimento / Validade</label>
                <Input value={txDueDate} onChange={(e) => setTxDueDate(e.target.value)} placeholder="Ex: 15/11/2026" className="h-11 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">
                {currentModal === "boleto" ? "Linha Digitável ou Link do Boleto" : currentModal === "contract" ? "Link Público de Assinatura Digital" : "Chave PIX Copia e Cola ou Link de Pagamento"}
              </label>
              <Input value={txCodeOrLink} onChange={(e) => setTxCodeOrLink(e.target.value)} placeholder="Cole aqui o link, linha digitável ou chave PIX..." className="h-11 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Condições / Observações</label>
              <Textarea value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Instruções opcionais para o cliente..." rows={2} className="text-xs resize-none" />
            </div>
          </div>
          <div className="p-4 border-t border-border/50 flex items-center justify-end gap-2 bg-muted/20">
            <Button type="button" variant="outline" onClick={closeAllModals} className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer">Cancelar</Button>
            <Button type="button" disabled={isSubmittingTx} onClick={() => currentModal && (currentModal === "invoice" || currentModal === "boleto" || currentModal === "contract" || currentModal === "quote") && handleDispatchTransactional(currentModal)} className="h-11 min-h-11 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer">
              <Send className="size-3.5" />
              <span>{isSubmittingTx ? "Gerando..." : "Disparar no Chat"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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

      {/* MODAL 5: GERADOR DE CARD VISUAL EM IMAGEM PARA O CLIENTE */}
      <Dialog
        open={currentModal === "image_card"}
        onOpenChange={(open) => !open && closeAllModals()}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/80 rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-foreground">
              Gerar Card em Imagem p/ Cliente
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "offer_quote", label: "Cotação / Oferta" },
                { id: "travel_voucher", label: "Voucher / PNR" },
                { id: "pix_invoice", label: "Fatura / PIX" },
                { id: "status_notice", label: "Comunicado" },
              ].map((tpl) => {
                const active = imgTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setImgTemplate(tpl.id as any)}
                    className={cn(
                      "px-2 py-2 rounded-lg border text-2xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/60",
                    )}
                  >
                    {tpl.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">
                Título Principal do Card
              </label>
              <Input
                value={imgHeadline}
                onChange={(e) => setImgHeadline(e.target.value)}
                placeholder={
                  imgTemplate === "travel_voucher"
                    ? "Ex: Passagem Aérea São Paulo (GRU) • Confirmada"
                    : "Ex: Pacote Gramado & Canela • 5 Dias"
                }
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground block">
                  Destaque (Valor, PNR ou Código)
                </label>
                <Input
                  value={imgHighlight}
                  onChange={(e) => setImgHighlight(e.target.value)}
                  placeholder={imgTemplate === "travel_voucher" ? "Ex: PNR: K8M4QX" : "Ex: 10x de R$ 289,00"}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground block">
                  Subtítulo / Passageiro / Cia
                </label>
                <Input
                  value={imgSubtitle}
                  onChange={(e) => setImgSubtitle(e.target.value)}
                  placeholder="Ex: LATAM • Embarque 18/11 às 09:40"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">
                Detalhes Inclusos / Observações no Card
              </label>
              <Textarea
                value={imgDetails}
                onChange={(e) => setImgDetails(e.target.value)}
                placeholder="Ex: Bagagem de mão 10kg inclusa • Apresentar documento com foto 2h antes do voo."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Preview Visual Rápido */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold uppercase tracking-wider text-primary">
                  Prévia do Card Visual ({storeName})
                </span>
                <Badge variant="outline" className="text-2xs">PNG 1080x680</Badge>
              </div>
              <p className="text-sm font-bold text-foreground truncate">
                {imgHeadline || "Título da Proposta / Voucher"}
              </p>
              <div className="px-3 py-2 rounded-lg bg-card border border-border/60 font-mono text-xs font-bold text-primary">
                {imgHighlight || "DESTAQUE / VALOR / PNR"}
              </div>
              <p className="text-2xs text-muted-foreground line-clamp-2">
                {imgDetails || "Os detalhes preenchidos acima serão renderizados na imagem enviada ao cliente."}
              </p>
            </div>
          </div>

          <div className="p-4 border-t border-border/50 flex items-center justify-end gap-2 bg-muted/20">
            <button
              type="button"
              onClick={closeAllModals}
              className="px-4 py-2 rounded-lg border border-border/70 bg-background text-xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDispatchImageCard}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Camera className="size-3.5" />
              <span>Gerar e Enviar Imagem</span>
            </button>
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
  customerId,
  customerName,
  customerPhone,
  customerEmail,
  onDispatchMessage,
}: {
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  onDispatchMessage: (data: StructuredDispatchPayload) => Promise<void> | void;
}) {
  const { cart, globalCarts, updateQty } = useCart();
  const [expanded, setExpanded] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [isConfirmingPay, setIsConfirmingPay] = useState(false);

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
    if (isConfirmingPay) return;
    if (!storeId) {
      toast.error("Vincule uma loja ativa antes de gerar o pagamento da sacola.");
      return;
    }

    setIsConfirmingPay(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br";
      const createdRes = await createCommercialInvoice({
        data: {
          storeId,
          customerId: customerId || null,
          documentType: "invoice",
          customer: {
            name: customerName && customerName.trim().length >= 2 ? customerName.trim() : "Cliente Atendimento",
            phone: customerPhone || "",
            email: customerEmail || "",
          },
          items: effectiveItems.map((i) => ({
            title: i.productTitle,
            quantity: i.qty,
            unitPriceCents: i.priceCents,
            totalPriceCents: i.priceCents * i.qty,
          })),
          subtotalCents,
          discountCents: 0,
          shippingCents: 0,
          totalCents: subtotalCents,
          paymentTerms: {
            method: payMethod === "pix" ? "pix" : "cartao",
            methodLabel: payMethod === "pix" ? "PIX Instantâneo" : "Cartão / Link",
            installmentsCount: 1,
          },
          notes: "Gerado via Sacola Rápida no Atendimento",
        },
      });

      const invoice = createdRes?.invoice;
      if (!invoice?.public_token) {
        throw new Error("Não foi possível gerar o token público da fatura.");
      }

      const invoiceUrl = `${origin}/fatura/${invoice.public_token}`;
      const invoiceCode = invoice.invoice_code || "FATURA";
      const formattedTotal = formatMoney(subtotalCents / 100);
      let pixCode = "";

      if (payMethod === "pix") {
        const payConfig = await getStoreCommercialPaymentConfig({ data: { storeId } }).catch(() => null);
        const pixKey = String(payConfig?.pixKey || "").trim();
        if (pixKey) {
          pixCode = generatePixBrCode({
            pixKey,
            amountCents: subtotalCents,
            merchantName: storeName,
            merchantCity: "Brasil",
            txId: invoiceCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 20),
            description: `Sacola ${invoiceCode}`,
          });
        }
      }

      const blocks: Array<Record<string, any>> = [];
      if (pixCode) {
        blocks.push({
          type: "pix_payment",
          data: {
            pix_code: pixCode,
            amount_formatted: formattedTotal,
            expires_in: "24 horas",
            invoice_url: invoiceUrl,
          },
        });
      }
      blocks.push({
        type: "summary_card",
        data: {
          title: `${invoiceCode} • Cobrança (${totalCount} ${totalCount === 1 ? "item" : "itens"})`,
          subtitle: `Valor Total: ${formattedTotal} • Forma: ${payMethod === "pix" ? "PIX Instantâneo" : "Cartão / Link"} • Acesse: ${invoiceUrl}`,
          badge: payMethod === "pix" ? "COBRANÇA PIX" : "FATURA COMERCIAL",
          action_url: invoiceUrl,
        },
      });

      await onDispatchMessage({
        message: pixCode
          ? `Fatura ${invoiceCode} gerada (${formattedTotal}).\nPIX Copia e Cola:\n${pixCode}\nLink de pagamento: ${invoiceUrl}`
          : `Fatura ${invoiceCode} gerada (${formattedTotal}). Acesse para pagar: ${invoiceUrl}`,
        message_type: "structured_blocks",
        payload: {
          text: `Cobrança ${invoiceCode} gerada no valor de ${formattedTotal}.`,
          invoice_code: invoiceCode,
          invoice_url: invoiceUrl,
          pix_code: pixCode || undefined,
          blocks,
        },
      });

      toast.success(`Fatura ${invoiceCode} enviada na conversa!`);
      setPayModalOpen(false);
      setExpanded(false);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível gerar a cobrança da sacola.");
    } finally {
      setIsConfirmingPay(false);
    }
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
              <Badge variant="secondary" className="text-xs font-mono">
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
              disabled={isConfirmingPay}
              className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              <span>{isConfirmingPay ? "Gerando Fatura..." : "Confirmar e Gerar Fatura Oficial"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
