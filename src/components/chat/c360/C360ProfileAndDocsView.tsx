import { useState } from "react";
import {
  User,
  Copy,
  ExternalLink,
  Send,
  CreditCard,
  FileText,
  CheckCircle2,
  Clock,
  Save,
  Loader2,
  Smartphone,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface C360ProfileAndDocsViewProps {
  data: any;
  profile: any;
  portalUrl: string;
  clientCode?: string | null;
  hasMagicToken?: boolean;
  accessCount?: number;
  lastAccessedAt?: string | null;
  isGeneratingMagicAccess?: boolean;
  onGenerateMagicAccess?: () => Promise<void> | void;
  onRevokeMagicAccess?: () => Promise<void> | void;
  onCopyMagicLink?: () => Promise<void> | void;
  onSendMagicWhatsApp?: () => Promise<void> | void;
  onSaveProfile: (payload: {
    fullName: string;
    phone: string;
    email: string;
    documentCpf: string;
    city: string;
  }) => Promise<void>;
  onQuickSendMessage?: (text: string) => void;
  defaultTab?: "profile" | "docs";
}

export function C360ProfileAndDocsView({
  data,
  profile,
  portalUrl,
  clientCode,
  hasMagicToken,
  accessCount = 0,
  lastAccessedAt,
  isGeneratingMagicAccess,
  onGenerateMagicAccess,
  onRevokeMagicAccess,
  onCopyMagicLink,
  onSendMagicWhatsApp,
  onSaveProfile,
  onQuickSendMessage,
  defaultTab = "profile",
}: C360ProfileAndDocsViewProps) {
  const [subTab, setSubTab] = useState<"profile" | "docs">(defaultTab);
  const [docMode, setDocMode] = useState<"wallet" | "text">("wallet");
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [documentCpf, setDocumentCpf] = useState(profile?.document_cpf || "");
  const [city, setCity] = useState(profile?.city || "");

  const docs: any[] = Array.isArray(data?.documents) ? data.documents : [];
  const customerId = profile?.id;

  const cleanCodeDisplay = String(clientCode || "").trim().replace(/^#/, "");

  const handleCopyPortal = async () => {
    if (onCopyMagicLink) {
      await onCopyMagicLink();
      return;
    }
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success("Link do App do Cliente copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleCopyClientCode = async () => {
    if (!cleanCodeDisplay) return;
    try {
      await navigator.clipboard.writeText(cleanCodeDisplay);
      toast.success(`Código ${cleanCodeDisplay} copiado!`);
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  };

  const handleSendPortalWhatsApp = async () => {
    if (onSendMagicWhatsApp) {
      await onSendMagicWhatsApp();
      return;
    }
    if (!onQuickSendMessage) return;
    const codeLine = cleanCodeDisplay ? `\nCódigo do Cliente: *${cleanCodeDisplay}*` : "";
    onQuickSendMessage(
      `Olá ${profile?.full_name || ""}! Acesse seu App Oficial da empresa para acompanhar seus pedidos, contratos, documentos e faturas:\n${portalUrl}${codeLine}`,
    );
    toast.success("Link do App enviado no chat!");
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile({ fullName, phone, email, documentCpf, city });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Sub-abas internas: Perfil Completo | Documentos */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/50 border border-border/60">
        <button
          type="button"
          onClick={() => setSubTab("profile")}
          className={cn(
            "min-h-11 sm:min-h-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            subTab === "profile"
              ? "bg-background text-foreground  border border-border/60"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Perfil & App
        </button>
        <button
          type="button"
          onClick={() => setSubTab("docs")}
          className={cn(
            "min-h-11 sm:min-h-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            subTab === "docs"
              ? "bg-background text-foreground  border border-border/60"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Documentos ({docs.length})
        </button>
      </div>

      {subTab === "profile" ? (
        <div className="space-y-3">
          {/* App Oficial da Empresa / Magic Link do Cliente */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone className="size-4 text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate">
                  App Oficial &amp; Magic Link
                </span>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {hasMagicToken ? "Magic Link Ativo" : "Acesso Sob Demanda"}
              </Badge>
            </div>
            {hasMagicToken && (
              <div className="flex items-center justify-between gap-2 text-2xs text-muted-foreground">
                <span>
                  {accessCount > 0
                    ? `${accessCount} ${accessCount === 1 ? "acesso registrado" : "acessos registrados"}`
                    : "Ainda não acessado pelo cliente"}
                  {lastAccessedAt ? ` · Último: ${formatDate(lastAccessedAt)}` : ""}
                </span>
                {onRevokeMagicAccess && (
                  <button
                    type="button"
                    disabled={isGeneratingMagicAccess}
                    onClick={() => void onRevokeMagicAccess()}
                    className="min-h-11 sm:min-h-6 px-2 rounded text-destructive hover:underline font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Revogar
                  </button>
                )}
              </div>
            )}
            {cleanCodeDisplay && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-2 py-2">
                <span className="text-xs text-muted-foreground">Código do Cliente:</span>
                <button
                  type="button"
                  onClick={handleCopyClientCode}
                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
                >
                  <span>{cleanCodeDisplay}</span>
                  <Copy className="size-3" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground break-all font-mono bg-background/80 rounded-md px-2 py-2 border border-border/50">
              {portalUrl}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isGeneratingMagicAccess}
                onClick={handleCopyPortal}
                className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs flex-1 cursor-pointer"
              >
                <Copy className="size-3.5 mr-2" />
                {hasMagicToken ? "Copiar Magic Link" : "Gerar & Copiar Link"}
              </Button>
              {onGenerateMagicAccess && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isGeneratingMagicAccess}
                  onClick={() => void onGenerateMagicAccess()}
                  className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs cursor-pointer"
                  title="Gerar novo código/token mágico (revoga o anterior)"
                >
                  <RefreshCw className={cn("size-3.5", isGeneratingMagicAccess && "animate-spin motion-reduce:animate-none")} />
                </Button>
              )}
              {portalUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  asChild
                  className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
                >
                  <a href={portalUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5 mr-1" />
                    Abrir
                  </a>
                </Button>
              )}
              {(onSendMagicWhatsApp || onQuickSendMessage) && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isGeneratingMagicAccess}
                  onClick={() => void handleSendPortalWhatsApp()}
                  className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs cursor-pointer"
                >
                  <Send className="size-3.5 mr-1" />
                  Enviar
                </Button>
              )}
            </div>
          </div>

          {/* Editor Completo de Perfil no Painel */}
          <form onSubmit={handleSubmitProfile} className="space-y-3 rounded-xl border border-border/70 bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <User className="size-3.5 text-primary" />
                Dados Cadastrais
              </span>
              {customerId && (
                <LinkButton href={`/workspace/clientes/${customerId}`} label="Ficha Completa" />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nome Completo</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do cliente"
                className="h-11 sm:h-9 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55..."
                  className="h-11 sm:h-9 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPF / Documento</Label>
                <Input
                  value={documentCpf}
                  onChange={(e) => setDocumentCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-11 sm:h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="h-11 sm:h-9 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cidade / UF</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
                className="h-11 sm:h-9 text-xs rounded-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full min-h-11 sm:min-h-9 h-9 rounded-lg text-xs font-semibold"
            >
              {saving ? (
                <Loader2 className="size-3.5 mr-2 animate-spin motion-reduce:animate-none" />
              ) : (
                <Save className="size-3.5 mr-2" />
              )}
              Salvar AlteraÃ§Ãµes no CRM
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Toggle Carteira Visual vs Texto Completo */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              Acervo de Documentos
            </span>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border/60">
              <button
                type="button"
                onClick={() => setDocMode("wallet")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  docMode === "wallet"
                    ? "bg-background text-foreground "
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Carteira
              </button>
              <button
                type="button"
                onClick={() => setDocMode("text")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  docMode === "text"
                    ? "bg-background text-foreground "
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Texto Completo
              </button>
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
              <CreditCard className="size-5 text-muted-foreground mx-auto" />
              <p className="text-xs font-medium text-foreground">Nenhum documento cadastrado</p>
              <p className="text-xs text-muted-foreground">
                Passaporte, RG, CNH e comprovantes vinculados ao cliente aparecerÃ£o aqui.
              </p>
            </div>
          ) : docMode === "wallet" ? (
            <div className="space-y-3">
              {docs.map((doc) => {
                const docType = String(doc.doc_type || doc.document_type || "Documento").toUpperCase();
                const docNum = doc.doc_number || doc.metadata?.number || "Sem nÃºmero";
                const isVerified = Boolean(doc.verified || doc.verified_at);
                return (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-border bg-card p-3 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary block">
                          {docType}
                        </span>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {doc.title || profile?.full_name || "Documento Pessoal"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs shrink-0",
                          isVerified
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-warning/40 bg-warning/10 text-warning-strong",
                        )}
                      >
                        {isVerified ? (
                          <CheckCircle2 className="size-3 mr-1" />
                        ) : (
                          <Clock className="size-3 mr-1" />
                        )}
                        {isVerified ? "Verificado" : "Pendente"}
                      </Badge>
                    </div>

                    <div className="rounded-lg bg-muted/50 border border-border/60 p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs text-muted-foreground block">NÃºmero / Registro</span>
                        <span className="text-xs font-mono font-semibold text-foreground break-all">
                          {docNum}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await navigator.clipboard.writeText(String(docNum));
                          toast.success("NÃºmero copiado!");
                        }}
                        className="min-h-11 sm:min-h-8 h-8 px-2 shrink-0"
                        aria-label="Copiar nÃºmero do documento"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {doc.issued_at ? `Emitido: ${formatDate(doc.issued_at)}` : `Enviado: ${formatDate(doc.created_at)}`}
                      </span>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          Ver Arquivo
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => {
                const meta = (doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {}) as Record<string, any>;
                return (
                  <div key={doc.id} className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <FileText className="size-3.5 text-primary" />
                        {doc.title || doc.doc_type || doc.document_type || "Documento"}
                      </span>
                      <ShieldCheck className="size-3.5 text-muted-foreground" />
                    </div>
                    <dl className="grid grid-cols-1 gap-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <div>
                        <dt className="inline font-medium text-foreground">Tipo: </dt>
                        <dd className="inline">{doc.doc_type || doc.document_type || "â€”"}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-foreground">NÃºmero: </dt>
                        <dd className="inline font-mono">{doc.doc_number || meta.number || "â€”"}</dd>
                      </div>
                      {doc.issued_at && (
                        <div>
                          <dt className="inline font-medium text-foreground">EmissÃ£o: </dt>
                          <dd className="inline">{formatDate(doc.issued_at)}</dd>
                        </div>
                      )}
                      {Object.entries(meta).map(([k, v]) =>
                        v ? (
                          <div key={k}>
                            <dt className="inline font-medium text-foreground">{k}: </dt>
                            <dd className="inline break-words">{String(v)}</dd>
                          </div>
                        ) : null,
                      )}
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}
