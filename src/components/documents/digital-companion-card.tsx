import React, { useState, useRef } from "react";
import {
  Plane,
  Building2,
  Car,
  Shield,
  Phone,
  PhoneCall,
  MapPin,
  User,
  Ticket,
  Luggage,
  Clock,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  MessageCircle,
  FileText,
  Info,
  Siren,
  Sparkles,
  Wrench,
  Home,
  Receipt,
  HeartPulse,
  ImageIcon,
  Loader2,
  Share2,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type CompanionCardNiche =
  | "tourism"
  | "real_estate"
  | "service"
  | "auto"
  | "retail"
  | "health";

export interface CompanionDetailItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface CompanionCardSectionItem {
  id?: string;
  type: "flight" | "hotel" | "transport" | "tour" | "insurance" | "service_item" | "custom";
  badge?: string;
  title: string;
  subtitle?: string;
  details: CompanionDetailItem[];
}

export interface CompanionRuleItem {
  title: string;
  description: string;
  badge?: string;
  highlight?: boolean;
}

export interface CompanionContactItem {
  name: string;
  category: string;
  phone: string;
  whatsapp?: boolean;
  is24h?: boolean;
}

export interface DigitalCompanionCardProps {
  niche: CompanionCardNiche;
  title: string;
  subtitle?: string;
  code?: string;
  companyName: string;
  companyLogoUrl?: string | null;
  coverImageUrl?: string | null;
  participantsLabel?: string;
  participants?: string[];
  sections: CompanionCardSectionItem[];
  rules: CompanionRuleItem[];
  emergencyContacts: CompanionContactItem[];
  customWhatsAppText?: string;
  observations?: string;
  publicUrl?: string;
  className?: string;
}

export function DigitalCompanionCard({
  niche,
  title,
  subtitle,
  code,
  companyName,
  companyLogoUrl,
  coverImageUrl,
  participantsLabel = "Participantes",
  participants = [],
  sections = [],
  rules = [],
  emergencyContacts = [],
  customWhatsAppText,
  observations,
  publicUrl,
  className = "",
}: DigitalCompanionCardProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "rules" | "emergency" | "whatsapp">("visual");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const visualPagesRef = useRef<HTMLDivElement>(null);
  const rulesPagesRef = useRef<HTMLDivElement>(null);
  const emergencyPagesRef = useRef<HTMLDivElement>(null);

  // Safe chunking: máximo 2 seções por página para manter a proporção estrita 9:16 (400x711px)
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    if (!arr || arr.length === 0) return [];
    return arr.reduce<T[][]>((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "flight":
        return <Plane size={22} className="text-blue-500" />;
      case "hotel":
        return <Building2 size={22} className="text-emerald-500" />;
      case "transport":
        return <Car size={22} className="text-amber-500" />;
      case "tour":
        return <MapPin size={22} className="text-purple-500" />;
      case "insurance":
        return <Shield size={22} className="text-rose-500" />;
      case "service_item":
        return <Wrench size={22} className="text-blue-500" />;
      default:
        return <FileText size={22} className="text-primary" />;
    }
  };

  const generateWhatsAppMessage = (): string => {
    if (customWhatsAppText) return customWhatsAppText;

    let text = `Olá! Seguem as informações do seu documento digital (*${title}*):\n\n`;
    if (code) text += `📌 *Código / Localizador:* ${code}\n`;
    text += `🏢 *Emitente:* ${companyName}\n\n`;

    if (sections.length > 0) {
      text += `📋 *Resumo dos Serviços:*\n`;
      sections.slice(0, 4).forEach((s) => {
        text += `• *${s.title}*${s.subtitle ? ` (${s.subtitle})` : ""}\n`;
      });
      text += `\n`;
    }

    if (rules.length > 0) {
      text += `💡 *Orientações Principais:*\n`;
      rules.slice(0, 3).forEach((r) => {
        text += `• *${r.title}:* ${r.description}\n`;
      });
      text += `\n`;
    }

    if (emergencyContacts.length > 0) {
      text += `🚨 *Contatos de Apoio & Plantão:*\n`;
      emergencyContacts.slice(0, 2).forEach((c) => {
        text += `• ${c.category}: ${c.name} (${c.phone})\n`;
      });
      text += `\n`;
    }

    if (publicUrl) {
      text += `📲 *Acesse o cartão completo no celular (dispensa impressão):*\n${publicUrl}\n\n`;
    }

    text += `Qualquer dúvida, estamos à inteira disposição!`;
    return text;
  };

  const copyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Texto formatado para WhatsApp copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const exportImages = async (ref: React.RefObject<HTMLDivElement | null>, prefix: string) => {
    if (!ref.current || typeof window === "undefined") return;
    try {
      setIsExporting(true);
      setExportMessage("Gerando imagens em alta resolução...");
      const html2canvas = (await import("html2canvas")).default;
      const pages = ref.current.querySelectorAll<HTMLElement>(".companion-story-page");

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 3,
          useCORS: true,
          backgroundColor: null,
          scrollY: -window.scrollY,
        });
        const link = document.createElement("a");
        link.download = `${companyName.replace(/\s+/g, "_")}-${prefix}-Pagina${i + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      toast.success("Imagens geradas com sucesso para envio!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao exportar imagens.");
    } finally {
      setIsExporting(false);
      setExportMessage("");
    }
  };

  const exportPDF = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current || typeof window === "undefined") return;
    try {
      setIsExporting(true);
      setExportMessage("Compilando PDF de bolso...");
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const pages = ref.current.querySelectorAll<HTMLElement>(".companion-story-page");
      let pdf: any = null;

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2.5,
          useCORS: true,
          backgroundColor: null,
          scrollY: -window.scrollY,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdfWidth = 400;
        const pdfHeight = 711;

        if (i === 0) {
          pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [pdfWidth, pdfHeight] });
        } else {
          pdf.addPage([pdfWidth, pdfHeight], "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      if (pdf) {
        pdf.save(`${fileName}.pdf`);
        toast.success("PDF de bolso gerado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao exportar PDF.");
    } finally {
      setIsExporting(false);
      setExportMessage("");
    }
  };

  const sectionChunks = chunkArray(sections, 2);
  const emergencyChunks = chunkArray(
    emergencyContacts.length > 0
      ? emergencyContacts
      : [{ name: companyName, category: "Suporte Central", phone: "Consulte a loja", is24h: true }],
    3,
  );

  return (
    <div className={`w-full flex flex-col space-y-4 ${className}`}>
      {/* ── 1. Top Bar de Navegação das 4 Abas (Apple HIG Touch Targets) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-full sm:w-auto overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 min-h-[40px] ${
              activeTab === "visual"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-4" />
            <span>Ficha Visual (9:16)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 min-h-[40px] ${
              activeTab === "rules"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Info className="size-4" />
            <span>Orientações & Regras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("emergency")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 min-h-[40px] ${
              activeTab === "emergency"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Siren className="size-4 text-rose-500" />
            <span>Contatos & Apoio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 min-h-[40px] ${
              activeTab === "whatsapp"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <WhatsappLogo className="size-4" weight="fill" />
            <span>WhatsApp</span>
          </button>
        </div>

        {/* Botões de Ação Rápida: Baixar PNG / PDF de Bolso */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {activeTab !== "whatsapp" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => {
                  const ref =
                    activeTab === "visual"
                      ? visualPagesRef
                      : activeTab === "rules"
                        ? rulesPagesRef
                        : emergencyPagesRef;
                  exportImages(ref, activeTab);
                }}
                className="rounded-xl text-xs font-semibold h-10 px-3 min-h-[44px] sm:min-h-[36px]"
                title="Baixar Imagens em Alta Resolução (Stories 9:16)"
              >
                <ImageIcon className="size-4 mr-1.5" />
                <span>Salvar Imagens</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isExporting}
                onClick={() => {
                  const ref =
                    activeTab === "visual"
                      ? visualPagesRef
                      : activeTab === "rules"
                        ? rulesPagesRef
                        : emergencyPagesRef;
                  exportPDF(ref, `${companyName}-${title}`);
                }}
                className="rounded-xl text-xs font-semibold h-10 px-3 min-h-[44px] sm:min-h-[36px] bg-foreground text-background hover:bg-foreground/90"
                title="Baixar PDF de Bolso"
              >
                {isExporting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Download className="size-4 mr-1.5" />}
                <span>Baixar PDF</span>
              </Button>
            </>
          )}

          {publicUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof navigator !== "undefined") {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Link público copiado com sucesso!");
                }
              }}
              className="rounded-xl text-xs font-semibold h-10 px-3 min-h-[44px] sm:min-h-[36px]"
              title="Copiar Link de Acesso"
            >
              <Share2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {isExporting && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs font-semibold text-primary flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* ── 2. Conteúdo Central de Cada Aba ── */}
      <div className="w-full flex justify-center items-start pt-2">
        {/* ABA 1: FICHA VISUAL (Páginas Stories 9:16, 400x711px) */}
        {activeTab === "visual" && (
          <div ref={visualPagesRef} className="flex flex-wrap justify-center gap-6 sm:gap-8 pb-12 w-full">
            {/* PÁGINA 1: CAPA CINEMATOGRÁFICA DE TELA DE BLOQUEIO */}
            <div
              className="companion-story-page relative flex flex-col overflow-hidden bg-zinc-950 text-white shadow-xl rounded-3xl border border-border/60"
              style={{ width: "400px", height: "711px" }}
            >
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10 pointer-events-none" />

              <div className="relative z-20 flex flex-col justify-between h-full p-7">
                {/* Header Logo */}
                <div className="flex items-center gap-3">
                  {companyLogoUrl ? (
                    <img src={companyLogoUrl} alt={companyName} className="h-9 w-auto object-contain brightness-0 invert" />
                  ) : (
                    <div className="size-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                      <Sparkles className="size-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold tracking-tight text-white">{companyName}</p>
                    <p className="text-[10px] text-white/70">Documento Oficial de Atendimento</p>
                  </div>
                </div>

                {/* Bloco Central / Inferior */}
                <div className="space-y-4">
                  {code && (
                    <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                      <Ticket className="size-3 text-white/80" />
                      <span className="text-[10px] font-mono font-bold tracking-widest text-white">ID: {code}</span>
                    </div>
                  )}

                  <div>
                    {subtitle && <p className="text-xs font-medium text-white/80">{subtitle}</p>}
                    <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight break-words">
                      {title}
                    </h2>
                  </div>

                  {participants.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                        {participantsLabel}
                      </p>
                      <div className="space-y-1.5">
                        {participants.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-white">
                            <User className="size-3.5 text-white/70 shrink-0" />
                            <span className="truncate">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-center text-white/50 pt-2">
                    Apresentação 100% digital no celular · Dispensa impressão
                  </p>
                </div>
              </div>
            </div>

            {/* PÁGINAS DE SEÇÃO: VOOS, HOTÉIS, SERVIÇOS, ETC. (CHUNKING DE 2 POR PÁGINA) */}
            {sectionChunks.map((chunk, pageIndex) => (
              <div
                key={`page-section-${pageIndex}`}
                className="companion-story-page relative flex flex-col overflow-hidden bg-muted/40 text-foreground shadow-xl rounded-3xl border border-border/70 p-6"
                style={{ width: "400px", height: "711px" }}
              >
                {/* Topo da Página */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{companyName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground font-bold">
                    Pág {pageIndex + 1} de {sectionChunks.length}
                  </span>
                </div>

                {/* Cards de Seção */}
                <div className="flex-1 flex flex-col gap-4 justify-start py-4 overflow-hidden">
                  {chunk.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 shrink-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="size-9 rounded-xl bg-muted/70 flex items-center justify-center shrink-0">
                            {getSectionIcon(item.type)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground leading-snug">{item.title}</p>
                            {item.subtitle && <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>}
                          </div>
                        </div>

                        {item.badge && (
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {item.badge}
                          </Badge>
                        )}
                      </div>

                      {/* Tabela de Detalhes Internos */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {item.details.map((d, dIdx) => (
                          <div
                            key={dIdx}
                            className={`p-2.5 rounded-xl border border-border/50 ${
                              d.highlight ? "bg-primary/5 text-primary" : "bg-muted/30"
                            }`}
                          >
                            <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                              {d.label}
                            </p>
                            <p className="text-xs font-bold truncate mt-0.5">{d.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rodapé da Página */}
                <div className="pt-3 border-t border-border/60 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {title} · Código: {code || "OFICIAL"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ABA 2: ORIENTAÇÕES PRÁTICAS & REGRAS (Dicas de Embarque, Check-in, etc.) */}
        {activeTab === "rules" && (
          <div ref={rulesPagesRef} className="flex flex-wrap justify-center gap-6 sm:gap-8 pb-12 w-full">
            <div
              className="companion-story-page relative flex flex-col overflow-hidden bg-muted/40 text-foreground shadow-xl rounded-3xl border border-border/70 p-6"
              style={{ width: "400px", height: "711px" }}
            >
              <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Info className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Orientações Importantes</h3>
                  <p className="text-[11px] text-muted-foreground">Guia essencial de atendimento</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-3 py-4 overflow-y-auto">
                {rules.map((rule, rIdx) => (
                  <div
                    key={rIdx}
                    className={`p-4 rounded-2xl border ${
                      rule.highlight
                        ? "bg-blue-500/5 border-blue-500/30 text-foreground"
                        : "bg-card border-border/80"
                    } space-y-1`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        {rule.title}
                      </p>
                      {rule.badge && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 h-4">
                          {rule.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                      {rule.description}
                    </p>
                  </div>
                ))}

                {observations && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <HelpCircle className="size-3.5 text-amber-600" />
                      Observações:
                    </p>
                    <p className="text-[11px] leading-relaxed whitespace-pre-line">{observations}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/60 text-center">
                <p className="text-[10px] text-muted-foreground font-medium">Equipe {companyName}</p>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CONTATOS DE EMERGÊNCIA & APOIO (Safe Chunking) */}
        {activeTab === "emergency" && (
          <div ref={emergencyPagesRef} className="flex flex-wrap justify-center gap-6 sm:gap-8 pb-12 w-full">
            {emergencyChunks.map((chunk, eIdx) => (
              <div
                key={`page-emerg-${eIdx}`}
                className="companion-story-page relative flex flex-col overflow-hidden bg-muted/40 text-foreground shadow-xl rounded-3xl border border-border/70 p-6"
                style={{ width: "400px", height: "711px" }}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                  <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                    <Siren className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Contatos de Emergência</h3>
                    <p className="text-[11px] text-muted-foreground">Socorro e apoio imediato</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-3 py-4 justify-start">
                  {chunk.map((contact, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3"
                    >
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
                          {contact.category}
                        </p>
                        <p className="text-sm font-bold text-foreground">{contact.name}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <PhoneCall className="size-4 text-rose-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase text-rose-600">Telefone / Plantão</p>
                            <p className="text-xs font-mono font-bold text-foreground truncate">{contact.phone}</p>
                          </div>
                        </div>

                        <Button
                          asChild
                          size="sm"
                          className="h-8 px-3 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shrink-0"
                        >
                          <a href={`tel:${contact.phone.replace(/\D/g, "")}`}>Ligar</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-border/60 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Documento de Apoio · {companyName}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ABA 4: TEXTO PRONTO PARA WHATSAPP */}
        {activeTab === "whatsapp" && (
          <div className="w-full max-w-2xl bg-card rounded-2xl p-6 sm:p-8 border border-border/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                <WhatsappLogo className="size-5 text-emerald-600" weight="fill" />
                <h3 className="text-sm font-bold text-foreground">Mensagem Pronta para WhatsApp</h3>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={copyWhatsApp}
                className="rounded-xl text-xs font-bold h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                <span>{copied ? "Copiado!" : "Copiar Texto"}</span>
              </Button>
            </div>

            <div className="bg-muted/40 p-4 sm:p-5 rounded-xl border border-border/60 font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text text-foreground">
              {generateWhatsAppMessage()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
