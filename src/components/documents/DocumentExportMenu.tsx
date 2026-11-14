import { useState } from "react";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Globe,
  FileSpreadsheet,
  FileCode2,
  Printer,
  ChevronDown,
  Loader2,
  Share2,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportDocumentBundle,
  type DocumentExportFormat,
  type DocumentExportThemeInput,
  type DocumentPageFormat,
} from "@/lib/documents/document-export";
import { cn } from "@/lib/utils";

export interface DocumentExportMenuProps {
  filenameBase: string;
  title: string;
  subtitle?: string;
  agencyName: string;
  agencyDocument?: string;
  agencyContact?: string;
  agencyLogoUrl?: string | null;
  elementId?: string;
  deckSelector?: string;
  markdownContent?: string | null;
  fallbackHtml?: string | null;
  pageFormat?: DocumentPageFormat;
  theme?: DocumentExportThemeInput;
  supportedFormats?: DocumentExportFormat[];
  onBeforeExport?: (format: DocumentExportFormat) => Promise<void> | void;
  onAfterExport?: (format: DocumentExportFormat) => void;
  onShareWhatsapp?: () => void;
  onCopyPublicLink?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

const FORMAT_META: Record<
  DocumentExportFormat,
  { label: string; desc: string; icon: typeof FileText }
> = {
  pdf: {
    label: "PDF Alta Resolução",
    desc: "Documento pronto para envio ou impressão A4/16:9",
    icon: FileText,
  },
  png: {
    label: "Imagem PNG",
    desc: "Captura nítida para WhatsApp e redes sociais",
    icon: ImageIcon,
  },
  doc: {
    label: "Word Editável (.doc)",
    desc: "Arquivo compatível com Microsoft Word e LibreOffice",
    icon: FileSpreadsheet,
  },
  html: {
    label: "Página Web (.html)",
    desc: "Documento interativo autônomo fiel ao tema",
    icon: Globe,
  },
  md: {
    label: "Markdown (.md)",
    desc: "Texto estruturado portátil e limpo",
    icon: FileCode2,
  },
  print: {
    label: "Imprimir Agora",
    desc: "Impressão direta isolada sem bordas de sistema",
    icon: Printer,
  },
};

export function DocumentExportMenu({
  filenameBase,
  title,
  subtitle,
  agencyName,
  agencyDocument,
  agencyContact,
  agencyLogoUrl,
  elementId,
  deckSelector,
  markdownContent,
  fallbackHtml,
  pageFormat = "a4-portrait",
  theme,
  supportedFormats = ["pdf", "png", "doc", "html", "md", "print"],
  onBeforeExport,
  onAfterExport,
  onShareWhatsapp,
  onCopyPublicLink,
  variant = "outline",
  label = "Exportar",
  compact = false,
  disabled = false,
  className,
}: DocumentExportMenuProps) {
  const [exportingFormat, setExportingFormat] = useState<DocumentExportFormat | null>(null);

  const handleExport = async (format: DocumentExportFormat) => {
    if (exportingFormat) return;
    setExportingFormat(format);
    try {
      if (onBeforeExport) {
        await onBeforeExport(format);
      }
      await exportDocumentBundle({
        format,
        elementId,
        deckSelector,
        filenameBase,
        title,
        subtitle,
        agencyName,
        agencyDocument,
        agencyContact,
        agencyLogoUrl,
        markdownContent,
        fallbackHtml,
        pageFormat,
        theme,
      });
      if (format !== "print") {
        toast.success(`Exportação concluída: ${FORMAT_META[format].label}`);
      }
      onAfterExport?.(format);
    } catch (err) {
      console.error("[DocumentExportMenu] Export failed:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível exportar o documento neste formato.",
      );
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          disabled={disabled || exportingFormat !== null}
          className={cn(
            "h-11 min-h-11 gap-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact ? "px-3" : "px-4",
            className,
          )}
        >
          {exportingFormat ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Download className="size-4" />
          )}
          <span className={cn(compact ? "hidden sm:inline" : "inline")}>
            {exportingFormat ? "Gerando..." : label}
          </span>
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <DropdownMenuLabel className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Exportar & Imprimir
        </DropdownMenuLabel>
        {supportedFormats.map((format) => {
          const meta = FORMAT_META[format];
          const Icon = meta.icon;
          const isLoading = exportingFormat === format;
          return (
            <DropdownMenuItem
              key={format}
              disabled={exportingFormat !== null}
              onClick={() => handleExport(format)}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="mt-1 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {isLoading ? "Processando..." : meta.label}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {meta.desc}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}

        {(onShareWhatsapp || onCopyPublicLink) && (
          <>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuLabel className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Compartilhamento Direto
            </DropdownMenuLabel>
            {onShareWhatsapp && (
              <DropdownMenuItem
                onClick={onShareWhatsapp}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Share2 className="size-4 shrink-0 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Enviar pelo WhatsApp
                </span>
              </DropdownMenuItem>
            )}
            {onCopyPublicLink && (
              <DropdownMenuItem
                onClick={onCopyPublicLink}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Link2 className="size-4 shrink-0 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Copiar Link do Documento
                </span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
