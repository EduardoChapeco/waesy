import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Camera,
  FileSpreadsheet,
  ShoppingCart,
  ClipboardList,
  Calendar,
  CalendarClock,
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
  Target,
  FileText,
  FileSignature,
  ShoppingBag,
  ArrowRightLeft,
  Volume2,
  Search,
  Loader2,
  Check,
  Link2,
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
import {
  getChatQuickActionsCatalog,
  searchStoreCrmLeads,
  type ChatQuickActionsCatalogDTO,
} from "@/services/chat-quick-actions.functions";
import {
  convertChatThreadToCrmLead,
  createLinkedCustomerTask,
  linkThreadToCrmOpportunity,
  registerCrmCommercialActivity,
} from "@/services/chat.functions";
import { generatePixBrCode } from "@/lib/pix-payload";
import { useCart } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function parseBrlAmountToCents(raw: string): number {
  const cleaned = String(raw || "").replace(/R\$\s*/gi, "").trim();
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export type QuickComposerModalKind =
  | "form"
  | "event"
  | "sticker"
  | "spreadsheet"
  | "invoice"
  | "boleto"
  | "contract"
  | "quote"
  | "image_card"
  | "lead"
  | "proposal"
  | "product"
  | "task"
  | "location";

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
  onOpenSchedule?: () => void;
  onOpenTransfer?: () => void;
  onOpenVoiceStudio?: () => void;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  storeAddress?: string | null;
  threadId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  leadId?: string | null;
  leadTitle?: string | null;
  onLeadLinked?: (lead: any) => void;
  activeModalOverride?: QuickComposerModalKind | null;
  onClearModalOverride?: () => void;
}

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
  onOpenSchedule,
  onOpenTransfer,
  onOpenVoiceStudio,
  storeId,
  storeName = "Loja Parceira",
  storeSlug,
  storeAddress,
  threadId,
  customerId,
  customerName,
  customerPhone,
  customerEmail,
  leadId,
  leadTitle,
  onLeadLinked,
  activeModalOverride,
  onClearModalOverride,
}: ChatQuickComposerModalsProps) {
  const [activeModal, setActiveModal] = useState<QuickComposerModalKind | null>(null);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  const currentModal = activeModalOverride || activeModal;
  const closeAllModals = () => {
    setActiveModal(null);
    onClearModalOverride?.();
  };

  // Catalogo real carregado sob demanda (propostas, faturas, contratos, formularios, produtos)
  const [catalog, setCatalog] = useState<ChatQuickActionsCatalogDTO | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const loadQuickCatalog = useCallback(async () => {
    if (!storeId) return;
    setLoadingCatalog(true);
    try {
      const res = await getChatQuickActionsCatalog({
        data: { storeId, customerId: customerId || null, leadId: leadId || null },
      });
      setCatalog(res);
    } catch {
      // Fallback silencioso mantem ultimo catalogo valido
    } finally {
      setLoadingCatalog(false);
    }
  }, [storeId, customerId, leadId]);

  useEffect(() => {
    if ((trayOpen || currentModal) && storeId) {
      void loadQuickCatalog();
    }
  }, [trayOpen, currentModal, storeId, loadQuickCatalog]);

  // Estado Modal Lead CRM (Busca + Vinculacao + Criacao)
  const [leadQuery, setLeadQuery] = useState("");
  const [leadResults, setLeadResults] = useState<any[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [newLeadTitleInput, setNewLeadTitleInput] = useState("");
  const [newLeadBudgetInput, setNewLeadBudgetInput] = useState("");
  const [newLeadNotesInput, setNewLeadNotesInput] = useState("");
  const [isSavingLeadAction, setIsSavingLeadAction] = useState(false);

  const runLeadSearch = useCallback(async (q: string) => {
    if (!storeId) return;
    setSearchingLeads(true);
    try {
      const rows = await searchStoreCrmLeads({
        data: { storeId, query: q.trim() || undefined, limit: 20 },
      });
      setLeadResults(rows || []);
    } catch {
      setLeadResults([]);
    } finally {
      setSearchingLeads(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (currentModal === "lead" && storeId) {
      void runLeadSearch(leadQuery);
    }
  }, [currentModal, leadQuery, storeId, runLeadSearch]);

  // Estado Modal Tarefa CRM / Follow-up
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("high");
  const [taskDueDate, setTaskDueDate] = useState(() => new Date(Date.now() + 86400_000).toISOString().slice(0, 10));

  // Estado Modal Produto / Catalogo & Planilha Real
  const [productSearch, setProductSearch] = useState("");
  const [spreadsheetSource, setSpreadsheetSource] = useState<"products" | "invoices" | "custom">("products");
  const [customSheetTitle, setCustomSheetTitle] = useState("Resumo de Condicoes");
  const [customSheetRows, setCustomSheetRows] = useState<Array<{ item: string; detalhe: string; valor: string }>>([
    { item: "", detalhe: "", valor: "" },
  ]);

  // Estado Aba Form Publico vs Intranet
  const [formTab, setFormTab] = useState<"public" | "intranet">("public");
  const [customMessageNote, setCustomMessageNote] = useState("");

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

  // Estados auxiliares Modal Planilha/Tabela & Pagamentos
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
            leadId: leadId || null,
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
          ...(leadId ? { lead_id: leadId } : {}),
          blocks,
        },
      });
      if (leadId) {
        void registerCrmCommercialActivity({
          data: {
            leadId,
            threadId: threadId || null,
            activityText: `${labelMap[kind]}: ${codePrefix}${cleanTitle} (R$ ${cleanAmount})`,
            activityType: kind === "quote" ? "proposal_sent" : "whatsapp_followup",
          },
        }).catch(() => {});
      }
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

  const realSpreadsheetData = useMemo((): {
    title: string;
    headers: string[];
    rows: string[][];
    summary: Record<string, number>;
  } => {
    if (spreadsheetSource === "products") {
      const items = catalog?.products || [];
      return {
        title: `Catalogo de Produtos — ${storeName}`,
        headers: ["Produto", "Slug", "Preco", "Link"],
        rows: items.slice(0, 15).map((p) => [
          p.title,
          p.slug,
          formatMoney(p.priceCents / 100),
          `/produto/${p.slug}`,
        ]),
        summary: {
          itens_publicados: items.length,
        },
      };
    }
    if (spreadsheetSource === "invoices") {
      const invs = catalog?.invoices || [];
      return {
        title: `Faturas e Orcamentos — ${storeName}`,
        headers: ["Codigo", "Tipo", "Status", "Valor"],
        rows: invs.slice(0, 15).map((i) => [
          i.invoiceCode,
          i.documentType === "budget" ? "Orcamento" : "Fatura",
          i.status,
          formatMoney(i.totalCents / 100),
        ]),
        summary: {
          registros: invs.length,
        },
      };
    }
    const validCustom = customSheetRows.filter((r) => r.item.trim() || r.detalhe.trim() || r.valor.trim());
    return {
      title: customSheetTitle.trim() || `Tabela — ${storeName}`,
      headers: ["Item", "Detalhes", "Valor / Condicao"],
      rows: validCustom.map((r) => [r.item.trim() || "-", r.detalhe.trim() || "-", r.valor.trim() || "-"]),
      summary: { linhas: validCustom.length },
    };
  }, [spreadsheetSource, catalog, storeName, customSheetTitle, customSheetRows]);

  const handleDispatchSpreadsheet = async () => {
    if (realSpreadsheetData.rows.length === 0) {
      toast.error("Adicione ao menos uma linha valida ou selecione um catalogo com registros reais.");
      return;
    }
    const linesText = realSpreadsheetData.rows
      .slice(0, 10)
      .map((r) => `• ${r.join(" | ")}`)
      .join("\n");
    await onDispatchMessage({
      message: `${realSpreadsheetData.title}\n${linesText}`,
      message_type: "structured_blocks",
      payload: {
        text: `${realSpreadsheetData.title} (${realSpreadsheetData.rows.length} registros):`,
        blocks: [
          {
            type: "table",
            data: {
              title: realSpreadsheetData.title,
              headers: realSpreadsheetData.headers,
              rows: realSpreadsheetData.rows,
            },
          },
        ],
      },
    });
    toast.success("Tabela enviada na conversa!");
    closeAllModals();
  };

  const handleDispatchStoreAddress = async () => {
    const resolvedAddress = catalog?.store?.addressLine || storeAddress || "";
    if (!resolvedAddress.trim()) {
      toast.error("Cadastre o endereco da loja nas configuracoes para enviar em 1 clique.");
      return;
    }
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(resolvedAddress)}`;
    await onDispatchMessage({
      message: `Endereco oficial ${storeName}:\n${resolvedAddress}\nMapa: ${mapsUrl}`,
      message_type: "structured_blocks",
      payload: {
        blocks: [
          {
            type: "summary_card",
            data: {
              title: `Localizacao ${storeName}`,
              subtitle: resolvedAddress,
              badge: "ENDERECO OFICIAL",
              action_url: mapsUrl,
            },
          },
        ],
      },
    });
    toast.success("Endereco da loja enviado na conversa!");
    closeAllModals();
  };

  const handleDispatchLocation = async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast.error("Geolocalizacao indisponivel neste navegador. Envie o endereco da loja.");
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
        message: `Localizacao compartilhada (${currentLat}, ${currentLng}) • Mapa: ${mapsLink}`,
        message_type: "structured_blocks",
        payload: {
          blocks: [
            {
              type: "summary_card",
              data: {
                title: `Localizacao em Tempo Real • ${storeName}`,
                subtitle: `Coordenadas (${currentLat}, ${currentLng})`,
                badge: "GPS VERIFICADO",
                action_url: mapsLink,
              },
            },
          ],
        },
      });
      toast.success("Localizacao real enviada na conversa!");
      closeAllModals();
    } catch {
      toast.error("Permita o acesso a localizacao no navegador ou envie o endereco oficial da loja.");
    }
  };

  const handleBindExistingLead = async (selectedLead: any) => {
    if (!threadId || !selectedLead?.id) return;
    setIsSavingLeadAction(true);
    try {
      const res = await linkThreadToCrmOpportunity({
        data: { threadId, leadId: selectedLead.id },
      });
      onLeadLinked?.(res?.linkedLead || selectedLead);
      toast.success(`Lead "${selectedLead.title || selectedLead.full_name}" vinculado a conversa!`);
      closeAllModals();
    } catch (err: any) {
      toast.error(err?.message || "Nao foi possivel vincular o lead.");
    } finally {
      setIsSavingLeadAction(false);
    }
  };

  const handleUnbindLead = async () => {
    if (!threadId) return;
    setIsSavingLeadAction(true);
    try {
      await linkThreadToCrmOpportunity({ data: { threadId, leadId: null } });
      onLeadLinked?.(null);
      toast.success("Vinculo de lead removido desta conversa.");
      closeAllModals();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao desvincular lead.");
    } finally {
      setIsSavingLeadAction(false);
    }
  };

  const handleQuickCreateLead = async () => {
    if (!threadId || !newLeadTitleInput.trim()) {
      toast.error("Informe um titulo para criar o lead no CRM.");
      return;
    }
    setIsSavingLeadAction(true);
    try {
      const created = await convertChatThreadToCrmLead({
        data: {
          threadId,
          leadTitle: newLeadTitleInput.trim(),
          estimatedBudget: newLeadBudgetInput ? Number(newLeadBudgetInput) : undefined,
          notes: newLeadNotesInput.trim() || undefined,
        },
      });
      onLeadLinked?.(created?.lead || { id: created?.leadId, title: newLeadTitleInput.trim() });
      setNewLeadTitleInput("");
      setNewLeadBudgetInput("");
      setNewLeadNotesInput("");
      toast.success("Lead criado no CRM e vinculado a esta conversa!");
      closeAllModals();
    } catch (err: any) {
      toast.error(err?.message || "Nao foi possivel criar o lead.");
    } finally {
      setIsSavingLeadAction(false);
    }
  };

  const handleDispatchProposal = async (proposal: ChatQuickActionsCatalogDTO["proposals"][number]) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br";
    const url = `${origin}/proposta/${proposal.publicToken}`;
    const amountLabel = proposal.totalCents > 0 ? ` • Valor: ${formatMoney(proposal.totalCents / 100)}` : "";
    const noteLine = customMessageNote.trim() ? `\n${customMessageNote.trim()}` : "";
    await onDispatchMessage({
      message: `Proposta Comercial: ${proposal.title}${amountLabel}${noteLine}\nAcesse e aprove online: ${url}`,
      message_type: "structured_blocks",
      payload: {
        proposal_id: proposal.id,
        public_token: proposal.publicToken,
        ...(leadId ? { lead_id: leadId } : {}),
        blocks: [
          {
            type: "summary_card",
            data: {
              title: proposal.title,
              subtitle: `${proposal.destination || storeName}${amountLabel} • Link: ${url}`,
              badge: "PROPOSTA OFICIAL",
              action_url: url,
            },
          },
        ],
      },
    });
    if (leadId) {
      void registerCrmCommercialActivity({
        data: {
          leadId,
          threadId: threadId || null,
          activityText: `Proposta enviada via WhatsApp: ${proposal.title}`,
          activityType: "proposal_sent",
        },
      }).catch(() => {});
    }
    setCustomMessageNote("");
    toast.success("Proposta enviada na conversa!");
    closeAllModals();
  };

  const handleDispatchProduct = async (product: ChatQuickActionsCatalogDTO["products"][number]) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br";
    const url = `${origin}/produto/${product.slug}`;
    const priceLabel = formatMoney(product.priceCents / 100);
    await onDispatchMessage({
      message: `${product.title} — ${priceLabel}\nConfira detalhes e compre online: ${url}`,
      message_type: "structured_blocks",
      payload: {
        product_id: product.id,
        product_slug: product.slug,
        blocks: [
          {
            type: "summary_card",
            data: {
              title: product.title,
              subtitle: `Valor: ${priceLabel} • ${url}`,
              badge: "CATALOGO DA LOJA",
              action_url: url,
            },
          },
        ],
      },
    });
    toast.success("Produto enviado na conversa!");
    closeAllModals();
  };

  const handleDispatchPublicForm = async (form: ChatQuickActionsCatalogDTO["forms"][number]) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br";
    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    if (customerName) params.set("nome", customerName);
    if (customerPhone) params.set("tel", String(customerPhone).replace(/\D/g, ""));
    if (customerEmail) params.set("email", customerEmail);
    const qs = params.toString();
    const url = `${origin}/f/${form.slug}${qs ? `?${qs}` : ""}`;
    await onDispatchMessage({
      message: `Por favor, preencha o formulario "${form.title}" pelo link seguro:\n${url}`,
      message_type: "structured_blocks",
      payload: {
        form_id: form.id,
        form_slug: form.slug,
        blocks: [
          {
            type: "summary_card",
            data: {
              title: form.title,
              subtitle: form.description || `Preencha e envie seus dados em segundos • ${url}`,
              badge: "FORMULARIO OFICIAL",
              action_url: url,
            },
          },
        ],
      },
    });
    if (leadId) {
      void registerCrmCommercialActivity({
        data: {
          leadId,
          threadId: threadId || null,
          activityText: `Formulario enviado ao cliente: ${form.title}`,
          activityType: "whatsapp_followup",
        },
      }).catch(() => {});
    }
    toast.success("Link do formulario enviado na conversa!");
    closeAllModals();
  };

  const handleCreateFollowupTask = async () => {
    if (!storeId || !taskTitle.trim()) {
      toast.error("Informe o titulo da tarefa de follow-up.");
      return;
    }
    setIsSavingLeadAction(true);
    try {
      await createLinkedCustomerTask({
        data: {
          storeId,
          customerId: customerId || null,
          customerName: (customerName || "Cliente").trim(),
          threadId: threadId || null,
          entityType: "customer",
          entityId: leadId || customerId || null,
          title: taskTitle.trim(),
          priority: taskPriority,
          dueDate: taskDueDate ? `${taskDueDate}T18:00:00.000Z` : undefined,
        },
      });
      if (leadId) {
        void registerCrmCommercialActivity({
          data: {
            leadId,
            threadId: threadId || null,
            activityText: `Follow-up agendado: ${taskTitle.trim()} (${taskDueDate})`,
            activityType: "whatsapp_followup",
          },
        }).catch(() => {});
      }
      setTaskTitle("");
      toast.success("Tarefa vinculada criada em Tarefas & CRM!");
      closeAllModals();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar tarefa vinculada.");
    } finally {
      setIsSavingLeadAction(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const list = catalog?.products || [];
    const q = productSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [catalog?.products, productSearch]);

  const effectiveStoreAddress = catalog?.store?.addressLine || storeAddress || null;

  return (
    <>
      {/* Hub Avancado de Acoes Rapidas 2.0 */}
      <Sheet open={trayOpen} onOpenChange={onTrayOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4 sm:p-6 max-w-2xl mx-auto max-h-screen overflow-y-auto no-scrollbar">
          <SheetHeader className="pb-3 border-b border-border/60 text-left">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-sm font-bold text-foreground">
                Acoes Rapidas
              </SheetTitle>
              {leadId && (
                <Badge variant="outline" className="text-xs font-medium">
                  Lead: {leadTitle || "Vinculado"}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Comercial & CRM
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("lead"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Target className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">{leadId ? "Trocar Lead" : "Vincular Lead"}</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("proposal"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <FileText className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Enviar Proposta</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("product"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <ShoppingBag className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Produto / Loja</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("form"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <ClipboardList className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Formulario</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Financeiro & Contratos
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("invoice"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <QrCode className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Cobranca PIX</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("quote"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <ShoppingCart className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Orcamento</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("contract"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <FileSignature className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Contrato Digital</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("boleto"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <CreditCard className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Boleto / Fatura</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Agenda, Midia & Operacao
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {onOpenSchedule && (
                  <button type="button" onClick={() => { onTrayOpenChange(false); onOpenSchedule(); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <CalendarClock className="size-5 text-warning-strong" />
                    <span className="text-xs font-semibold text-foreground text-center">Agendar Msg</span>
                  </button>
                )}
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("task"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-foreground text-center">Tarefa CRM</span>
                </button>
                {onOpenTransfer && (
                  <button type="button" onClick={() => { onTrayOpenChange(false); onOpenTransfer(); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <ArrowRightLeft className="size-5 text-primary" />
                    <span className="text-xs font-semibold text-foreground text-center">Transferir</span>
                  </button>
                )}
                {onOpenVoiceStudio && (
                  <button type="button" onClick={() => { onTrayOpenChange(false); onOpenVoiceStudio(); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Volume2 className="size-5 text-primary" />
                    <span className="text-xs font-semibold text-foreground text-center">Estudio Voz IA</span>
                  </button>
                )}
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("image_card"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Camera className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Card Visual</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("location"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <MapPin className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground text-center">Localizacao</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("spreadsheet"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <FileSpreadsheet className="size-5 text-sky-600" />
                  <span className="text-xs font-semibold text-foreground text-center">Tabela Real</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("sticker"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Smile className="size-5 text-warning-strong" />
                  <span className="text-xs font-semibold text-foreground text-center">Sticker</span>
                </button>
                <button type="button" onClick={() => { onTrayOpenChange(false); setActiveModal("event"); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Calendar className="size-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-foreground text-center">Evento</span>
                </button>
                {onOpenRmaModal && (
                  <button type="button" onClick={() => { onTrayOpenChange(false); onOpenRmaModal(); }} className="min-h-11 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <AlertTriangle className="size-5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive text-center">Chamado SAC</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* MODAL 1: FORMULARIO PUBLICO (WHATSAPP / LINK REAL) OU INTRANET */}
      <Dialog
        open={currentModal === "form"}
        onOpenChange={(open) => !open && closeAllModals()}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/80 rounded-xl">
          <DialogHeader className="p-4 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground">
              Formularios & Captacao
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4 max-h-96 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormTab("public")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  formTab === "public"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/60",
                )}
              >
                <Link2 className="size-4" />
                <span>Link Publico (WhatsApp)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormTab("intranet")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  formTab === "intranet"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/60",
                )}
              >
                <ClipboardList className="size-4" />
                <span>Bloco Rapido (Intranet)</span>
              </button>
            </div>

            {formTab === "public" ? (
              <div className="space-y-2">
                {loadingCatalog ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Carregando formularios ativos da loja...</span>
                  </div>
                ) : !catalog?.forms || catalog.forms.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
                    <p className="text-xs font-semibold text-foreground">Nenhum formulario publico ativo</p>
                    <p className="text-xs text-muted-foreground">Crie um formulario em CRM / Marketing ou use o bloco rapido na aba ao lado.</p>
                  </div>
                ) : (
                  catalog.forms.map((f) => (
                    <div key={f.id} className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{f.title}</p>
                        <p className="text-xs text-muted-foreground truncate">/f/{f.slug}</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => void handleDispatchPublicForm(f)}
                        className="h-11 min-h-11 px-4 text-xs font-bold gap-2 shrink-0 cursor-pointer"
                      >
                        <Send className="size-4" />
                        <span>Enviar Link</span>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "standard", label: "Padrao", icon: Shield },
                    { id: "anonymous", label: "Anonimo", icon: EyeOff },
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
                    Titulo do Formulario
                  </label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Avaliacao de Atendimento ou Pedido Sob Medida"
                    className="h-11 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Descricao ou Finalidade
                  </label>
                  <Input
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Opcional: explique como os dados serao utilizados"
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
                            {field.type === "choice" ? "Multipla Escolha" : "Texto Livre"}
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
                          placeholder="Opcoes separadas por virgula (Ex: Sim, Nao, Talvez)"
                          className="h-11 text-xs bg-background"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-t border-border/60 flex items-center justify-end gap-2 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={closeAllModals}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </Button>
            {formTab === "intranet" && (
              <Button
                type="button"
                onClick={handleDispatchForm}
                className="h-11 min-h-11 px-5 text-xs font-bold gap-2 cursor-pointer"
              >
                <Send className="size-4" />
                <span>Publicar na Intranet</span>
              </Button>
            )}
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

      {/* MODAL 4: COBRANCA PIX / BOLETO / CONTRATO DIGITAL / ORCAMENTO COM SELECAO REAL */}
      <Dialog open={currentModal === "invoice" || currentModal === "boleto" || currentModal === "contract" || currentModal === "quote"} onOpenChange={(open) => !open && closeAllModals()}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-foreground">
              {currentModal === "invoice" ? "Enviar Cobranca PIX / Fatura" : currentModal === "boleto" ? "Enviar Boleto / 2a Via" : currentModal === "contract" ? "Enviar Contrato p/ Assinatura" : "Enviar Orcamento Comercial"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto no-scrollbar">
            {currentModal === "contract" && catalog?.contracts && catalog.contracts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Selecionar Contrato Existente</p>
                <div className="flex flex-wrap gap-2">
                  {catalog.contracts.slice(0, 6).map((c) => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br";
                    const link = `${origin}/contrato/${c.publicToken}`;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setTxTitle(c.title);
                          setTxCodeOrLink(link);
                        }}
                        className="h-11 sm:h-9 min-h-11 sm:min-h-9 px-3 rounded-lg border border-border/70 bg-muted/40 hover:bg-primary/10 text-xs font-semibold text-foreground truncate max-w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {c.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(currentModal === "invoice" || currentModal === "boleto" || currentModal === "quote") && catalog?.invoices && catalog.invoices.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Preencher a partir de Fatura/Orcamento Existente</p>
                <div className="flex flex-wrap gap-2">
                  {catalog.invoices.slice(0, 6).map((inv) => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br";
                    return (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => {
                          setTxTitle(`${inv.invoiceCode}`);
                          setTxAmount((inv.totalCents / 100).toFixed(2).replace(".", ","));
                          setTxDueDate(inv.validUntil || "");
                          setTxCodeOrLink(`${origin}/fatura/${inv.publicToken}`);
                        }}
                        className="h-11 sm:h-9 min-h-11 sm:min-h-9 px-3 rounded-lg border border-border/70 bg-muted/40 hover:bg-primary/10 text-xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {inv.invoiceCode} · {formatMoney(inv.totalCents / 100)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Titulo / Referencia</label>
              <Input value={txTitle} onChange={(e) => setTxTitle(e.target.value)} placeholder={currentModal === "contract" ? "Ex: Contrato de Prestacao de Servicos" : "Ex: Fatura Mensal ou Pedido 104"} className="h-11 text-xs" />
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
                {currentModal === "boleto" ? "Linha Digitavel ou Link do Boleto" : currentModal === "contract" ? "Link Publico de Assinatura Digital" : "Link de Pagamento (vazio gera Fatura + PIX automatico)"}
              </label>
              <Input value={txCodeOrLink} onChange={(e) => setTxCodeOrLink(e.target.value)} placeholder="Opcional p/ PIX automatico, ou cole link / linha digitavel..." className="h-11 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Condicoes / Observacoes</label>
              <Textarea value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Instrucoes opcionais para o cliente..." rows={2} className="text-xs resize-none" />
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
          <DialogHeader className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle className="text-base font-bold text-foreground">
              Enviar Tabela Real
            </DialogTitle>
            <div className="flex items-center gap-2 pr-6">
              {(
                [
                  { id: "products", label: "Catalogo" },
                  { id: "invoices", label: "Faturas" },
                  { id: "custom", label: "Personalizada" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSpreadsheetSource(tab.id)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    spreadsheetSource === tab.id
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto no-scrollbar">
            {spreadsheetSource === "custom" && (
              <div className="space-y-2 p-3 rounded-xl border border-border/70 bg-muted/20">
                <Input
                  value={customSheetTitle}
                  onChange={(e) => setCustomSheetTitle(e.target.value)}
                  placeholder="Titulo da tabela"
                  className="h-11 text-xs font-semibold"
                />
                {customSheetRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      value={row.item}
                      onChange={(e) =>
                        setCustomSheetRows((prev) =>
                          prev.map((r, rIdx) => (rIdx === idx ? { ...r, item: e.target.value } : r)),
                        )
                      }
                      placeholder="Item / Servico"
                      className="h-11 text-xs"
                    />
                    <Input
                      value={row.detalhe}
                      onChange={(e) =>
                        setCustomSheetRows((prev) =>
                          prev.map((r, rIdx) => (rIdx === idx ? { ...r, detalhe: e.target.value } : r)),
                        )
                      }
                      placeholder="Descricao / Prazo"
                      className="h-11 text-xs"
                    />
                    <Input
                      value={row.valor}
                      onChange={(e) =>
                        setCustomSheetRows((prev) =>
                          prev.map((r, rIdx) => (rIdx === idx ? { ...r, valor: e.target.value } : r)),
                        )
                      }
                      placeholder="Valor / Condicao"
                      className="h-11 text-xs"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCustomSheetRows((prev) => [...prev, { item: "", detalhe: "", valor: "" }])}
                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Adicionar Linha</span>
                </Button>
              </div>
            )}

            {realSpreadsheetData.rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhum registro encontrado nessa fonte. Cadastre itens no painel ou use a aba Personalizada.
              </div>
            ) : (
              <ArtifactInteractiveTable
                title={realSpreadsheetData.title}
                headers={realSpreadsheetData.headers}
                rows={realSpreadsheetData.rows}
                summary={realSpreadsheetData.summary}
              />
            )}
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
              disabled={realSpreadsheetData.rows.length === 0}
              className="h-11 min-h-11 px-5 text-xs font-bold gap-2 cursor-pointer"
            >
              <Send className="size-3.5" />
              <span>Enviar Tabela no Chat</span>
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
              className="h-11 min-h-11 px-4 py-2 rounded-lg border border-border/70 bg-background text-xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDispatchImageCard}
              className="h-11 min-h-11 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Camera className="size-3.5" />
              <span>Gerar e Enviar Imagem</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: BUSCAR, VINCULAR OU CRIAR LEAD NO CRM */}
      <Dialog open={currentModal === "lead"} onOpenChange={(open) => !open && closeAllModals()}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-border/60">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base font-bold text-foreground">
                Vincular ou Criar Lead CRM
              </DialogTitle>
              {leadId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSavingLeadAction}
                  onClick={() => void handleUnbindLead()}
                  className="h-11 sm:h-9 px-3 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  Desvincular
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto no-scrollbar">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Buscar Lead Existente na Loja
              </label>
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={leadQuery}
                  onChange={(e) => setLeadQuery(e.target.value)}
                  placeholder="Busque por nome, telefone, destino ou titulo..."
                  className="h-11 pl-9 text-xs"
                />
              </div>
              <div className="max-h-44 overflow-y-auto space-y-2">
                {searchingLeads ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Buscando leads...</span>
                  </div>
                ) : leadResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Nenhum lead encontrado com essa busca. Crie um novo abaixo.
                  </p>
                ) : (
                  leadResults.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      disabled={isSavingLeadAction}
                      onClick={() => void handleBindExistingLead(row)}
                      className={cn(
                        "w-full min-h-11 p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        leadId === row.id
                          ? "border-primary bg-primary/10"
                          : "border-border/70 bg-card hover:bg-muted/50",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {row.title || row.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.full_name}{row.phone ? ` · ${row.phone}` : ""} · {row.status}
                        </p>
                      </div>
                      <Badge variant={leadId === row.id ? "default" : "outline"} className="text-2xs shrink-0">
                        {leadId === row.id ? "Vinculado" : "Vincular"}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ou Criar Novo Lead a partir desta Conversa
              </p>
              <Input
                value={newLeadTitleInput}
                onChange={(e) => setNewLeadTitleInput(e.target.value)}
                placeholder={`Ex: Oportunidade ${customerName || "Cliente"}`}
                className="h-11 text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={newLeadBudgetInput}
                  onChange={(e) => setNewLeadBudgetInput(e.target.value)}
                  placeholder="Valor estimado (R$)"
                  className="h-11 text-xs"
                />
                <Input
                  value={newLeadNotesInput}
                  onChange={(e) => setNewLeadNotesInput(e.target.value)}
                  placeholder="Observacao inicial..."
                  className="h-11 text-xs"
                />
              </div>
              <Button
                type="button"
                disabled={isSavingLeadAction || !newLeadTitleInput.trim()}
                onClick={() => void handleQuickCreateLead()}
                className="w-full h-11 min-h-11 text-xs font-bold gap-2 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Criar e Vincular Novo Lead</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: ENVIAR PROPOSTA COMERCIAL SALVA */}
      <Dialog open={currentModal === "proposal"} onOpenChange={(open) => !open && closeAllModals()}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground">
              Enviar Proposta Oficial
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto no-scrollbar">
            <Input
              value={customMessageNote}
              onChange={(e) => setCustomMessageNote(e.target.value)}
              placeholder="Mensagem opcional de acompanhamento..."
              className="h-11 text-xs"
            />
            {loadingCatalog ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Carregando propostas da loja...</span>
              </div>
            ) : !catalog?.proposals || catalog.proposals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhuma proposta publicada encontrada nesta loja.
              </div>
            ) : (
              catalog.proposals.map((p) => (
                <div key={p.id} className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground truncate">{p.title}</p>
                      {leadId && p.leadId === leadId && (
                        <Badge variant="default" className="text-2xs shrink-0">Do Lead</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.destination || storeName}{p.totalCents > 0 ? ` · ${formatMoney(p.totalCents / 100)}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleDispatchProposal(p)}
                    className="h-11 min-h-11 px-4 text-xs font-bold gap-2 shrink-0 cursor-pointer"
                  >
                    <Send className="size-4" />
                    <span>Enviar</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: ENVIAR PRODUTO DO CATALOGO */}
      <Dialog open={currentModal === "product"} onOpenChange={(open) => !open && closeAllModals()}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground">
              Enviar Produto do Catalogo
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto no-scrollbar">
            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filtrar produto publicado..."
                className="h-11 pl-9 text-xs"
              />
            </div>
            {loadingCatalog ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Carregando catalogo...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhum produto publicado encontrado.
              </div>
            ) : (
              filteredProducts.map((prod) => (
                <div key={prod.id} className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{prod.title}</p>
                    <p className="text-xs font-mono text-primary font-semibold">{formatMoney(prod.priceCents / 100)}</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleDispatchProduct(prod)}
                    className="h-11 min-h-11 px-4 text-xs font-bold gap-2 shrink-0 cursor-pointer"
                  >
                    <Send className="size-4" />
                    <span>Enviar</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 9: CRIAR TAREFA / FOLLOW-UP CRM */}
      <Dialog open={currentModal === "task"} onOpenChange={(open) => !open && closeAllModals()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground">
              Novo Follow-up / Tarefa CRM
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">O que precisa ser feito?</label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={`Ex: Retornar cotacao para ${customerName || "cliente"}`}
                className="h-11 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground block">Prioridade</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full h-11 min-h-11 px-3 rounded-lg border border-border/70 bg-background text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="medium">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground block">Prazo</label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="h-11 text-xs"
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border/60 flex items-center justify-end gap-2 bg-muted/20">
            <Button type="button" variant="outline" onClick={closeAllModals} className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer">
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSavingLeadAction || !taskTitle.trim()}
              onClick={() => void handleCreateFollowupTask()}
              className="h-11 min-h-11 px-5 text-xs font-bold gap-2 cursor-pointer"
            >
              <Check className="size-4" />
              <span>Criar Tarefa</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 10: LOCALIZACAO DA LOJA OU GPS */}
      <Dialog open={currentModal === "location"} onOpenChange={(open) => !open && closeAllModals()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground">
              Compartilhar Localizacao
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <div className="p-3 rounded-xl border border-border/70 bg-card space-y-2">
              <p className="text-xs font-bold text-foreground">Endereco Oficial da Empresa</p>
              <p className="text-xs text-muted-foreground">
                {effectiveStoreAddress || "Nenhum endereco cadastrado nas configuracoes da loja."}
              </p>
              <Button
                type="button"
                disabled={!effectiveStoreAddress}
                onClick={() => void handleDispatchStoreAddress()}
                className="w-full h-11 min-h-11 text-xs font-bold gap-2 cursor-pointer"
              >
                <MapPin className="size-4" />
                <span>Enviar Endereco da Loja</span>
              </Button>
            </div>
            <div className="p-3 rounded-xl border border-border/70 bg-card space-y-2">
              <p className="text-xs font-bold text-foreground">Coordenadas GPS do Dispositivo</p>
              <p className="text-xs text-muted-foreground">Captura sua posicao atual e envia link direto no mapa.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleDispatchLocation()}
                className="w-full h-11 min-h-11 text-xs font-semibold gap-2 cursor-pointer"
              >
                <MapPin className="size-4" />
                <span>Enviar Minha Localizacao GPS</span>
              </Button>
            </div>
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
  leadId,
  onDispatchMessage,
}: {
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  leadId?: string | null;
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
          leadId: leadId || null,
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
