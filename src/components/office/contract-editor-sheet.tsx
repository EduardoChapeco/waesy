import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  BookOpen,
  Shield,
  Eye,
  Edit3,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContractClauseLibrary,
  OfficeContractClause,
  replaceContractVariables,
  DEFAULT_CLAUSES,
} from "./contract-clause-library";
import { ContractSignPad, SignatureData } from "./contract-sign-pad";
import { ContractMarkdownRenderer } from "@/components/contracts/contract-markdown-renderer";
import { ContractVariablePicker } from "@/components/contracts/contract-variable-picker";
import { StudioFrame } from "@/components/tourism/studio/studio-frame";
import { DocumentExportMenu } from "@/components/documents/DocumentExportMenu";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import { resolveContractNicheProfile } from "@/lib/contracts/document-file-parser";
import { resolveTenantDocumentIdentity } from "@/lib/documents/document-studio-catalog";
import { useAgency } from "@/lib/agency-context";
import { getStoreSettings } from "@/services/store.functions";
import { cn } from "@/lib/utils";

interface ContractEditorSheetProps {
  initialTitle?: string;
  initialContent?: string;
  storeName?: string;
  onSaveDocument?: (doc: {
    title: string;
    content: string;
    signatures: SignatureData[];
    variables?: Record<string, string>;
  }) => void;
  onClose?: () => void;
}

export function ContractEditorSheet({
  initialTitle = "Contrato de Prestação de Serviços",
  initialContent,
  storeName,
  onSaveDocument,
  onClose,
}: ContractEditorSheetProps) {
  const { agency, brandKit, companyProfile } = useAgency();
  const [storeSettings, setStoreSettings] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let active = true;
    getStoreSettings()
      .then((res) => {
        if (active && res) setStoreSettings(res as Record<string, any>);
      })
      .catch(() => {
        /* mantem contexto base de agency/companyProfile */
      });
    return () => {
      active = false;
    };
  }, []);

  const tenant = useMemo(() => {
    const resolved = resolveTenantDocumentIdentity({
      agency,
      brandKit,
      companyProfile,
      storeSettings,
    });
    if (storeName && storeName.trim()) {
      return {
        ...resolved,
        companyName: storeName.trim(),
        tradingName: storeName.trim(),
      };
    }
    return resolved;
  }, [agency, brandKit, companyProfile, storeSettings, storeName]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");
  const [title, setTitle] = useState(initialTitle);
  const [clientName, setClientName] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});

  const [content, setContent] = useState<string>(
    initialContent ||
      DEFAULT_CLAUSES.map((c, i) => `### ${i + 1}. ${c.title}\n${c.content}`).join("\n\n"),
  );

  const [activeTab, setActiveTab] = useState<"editor" | "library" | "sign">("editor");
  const [mobilePane, setMobilePane] = useState<"editor" | "preview">("editor");
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [zoomScale, setZoomScale] = useState<number | null>(null);
  const [signatures, setSignatures] = useState<SignatureData[]>([]);

  const activeStoreNiche =
    (storeSettings?.niche as string | undefined) ||
    (storeSettings?.segment as string | undefined) ||
    (storeSettings?.category as string | undefined) ||
    null;

  const nicheProfile = useMemo(
    () => (activeStoreNiche ? resolveContractNicheProfile(activeStoreNiche) : null),
    [activeStoreNiche],
  );

  const prioritizedTemplates = useMemo(() => {
    if (!nicheProfile) return ADVANCED_CONTRACT_TEMPLATES;
    const filtered = ADVANCED_CONTRACT_TEMPLATES.filter((t) => {
      if (!nicheProfile.isTourism && t.category === "tourism_package") return false;
      return true;
    });
    const orderMap = new Map(
      nicheProfile.preferredTemplateCategories.map((cat, idx) => [cat, idx]),
    );
    return [...filtered].sort((a, b) => {
      const rankA = orderMap.has(a.category) ? (orderMap.get(a.category) as number) : 99;
      const rankB = orderMap.has(b.category) ? (orderMap.get(b.category) as number) : 99;
      return rankA - rankB;
    });
  }, [nicheProfile]);

  const selectedAdvancedTemplate = useMemo(
    () => ADVANCED_CONTRACT_TEMPLATES.find((t) => t.id === selectedTemplateId) || null,
    [selectedTemplateId],
  );

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "default") {
      setTitle(initialTitle);
      setContent(
        DEFAULT_CLAUSES.map((c, i) => `### ${i + 1}. ${c.title}\n${c.content}`).join("\n\n"),
      );
      return;
    }
    const found = ADVANCED_CONTRACT_TEMPLATES.find((t) => t.id === templateId);
    if (!found) return;
    setTitle(found.title);
    const defaults: Record<string, string> = {};
    for (const v of found.variables_schema) {
      if (v.default_value) defaults[v.key] = v.default_value;
    }
    setCustomVariables((prev) => ({ ...defaults, ...prev }));
    setContent(
      [
        `> **Enquadramento Legal:** ${found.legal_framework}`,
        "",
        ...found.clauses.map((c) => `### ${c.title}\n\n${c.content}`),
      ].join("\n\n"),
    );
  };

  const computedVariables = useMemo(() => {
    const vars: Record<string, string> = {
      ...customVariables,
      "loja.nome": tenant.companyName,
      "empresa.nome": tenant.companyName,
      "empresa.cnpj": tenant.documentNumber,
      "empresa.endereco": tenant.address,
      "empresa.cidade": tenant.cityState,
      "empresa.telefone": tenant.phone,
      "empresa.email": tenant.email,
      "contratada.nome": tenant.companyName,
      "contratada.cnpj": tenant.documentNumber,
      "cliente.nome": clientName,
      "cliente.cpf": clientCpf,
      "contratante.nome": clientName,
      "contratante.cpf": clientCpf,
      valor_total: totalValue,
      data_vencimento: dueDate,
      foro_cidade: tenant.cityState || customVariables.foro_cidade || "Comarca Local",
    };
    return vars;
  }, [customVariables, tenant, clientName, clientCpf, totalValue, dueDate]);

  const previewContent = useMemo(
    () => replaceContractVariables(content, computedVariables),
    [content, computedVariables],
  );

  const handleInsertClause = (clause: OfficeContractClause) => {
    setContent((prev) => `${prev.trim()}\n\n### ${clause.title}\n\n${clause.content}`);
    setActiveTab("editor");
  };

  const handleInsertVariableToken = (token: string) => {
    setContent((prev) => `${prev}${prev.endsWith(" ") || prev.endsWith("\n") ? "" : " "}${token}`);
  };

  const handleSignatureConfirmed = (sig: SignatureData) => {
    setSignatures((prev) => [...prev, sig]);
    setActiveTab("editor");
    setMobilePane("preview");
  };

  const handleSave = () => {
    if (onSaveDocument) {
      onSaveDocument({
        title,
        content: previewContent,
        signatures,
        variables: computedVariables,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background pt-safe-modal">
      {/* Header Studio Full-Viewport */}
      <header className="px-4 py-3 sm:px-6 border-b border-border bg-card shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-11 w-11 min-h-11 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-medium">
                {tenant.companyName}
              </Badge>
              <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
                <SelectTrigger className="h-11 min-h-11 w-full sm:w-72 text-xs">
                  <SelectValue placeholder="Modelo de Minuta Contratual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Minuta Base de Prestação de Serviços</SelectItem>
                  {prioritizedTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Título do contrato"
              className="h-11 min-h-11 font-bold text-sm sm:text-base bg-transparent border-transparent hover:border-border focus:border-border px-2 -mx-2 text-foreground"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Toggle Mobile (< lg) */}
          <div className="flex lg:hidden items-center bg-muted p-1 rounded-lg gap-1">
            <Button
              type="button"
              variant={mobilePane === "editor" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMobilePane("editor")}
              className="h-11 min-h-11 px-3 text-xs font-semibold"
            >
              <Edit3 className="size-4 mr-1" />
              Editor
            </Button>
            <Button
              type="button"
              variant={mobilePane === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMobilePane("preview")}
              className="h-11 min-h-11 px-3 text-xs font-semibold"
            >
              <Eye className="size-4 mr-1" />
              Folha A4
            </Button>
          </div>

          {/* Zoom Desktop */}
          <div className="hidden lg:flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setZoomScale((prev) => Number(Math.max(0.45, (prev ?? 0.85) - 0.1).toFixed(2)))
              }
              className="h-11 w-11 min-h-11 p-0"
              aria-label="Reduzir zoom"
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setZoomScale(null)}
              className="h-11 min-h-11 px-3 text-xs font-mono"
            >
              <RotateCcw className="size-4 mr-1" />
              {zoomScale ? `${Math.round(zoomScale * 100)}%` : "Auto"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setZoomScale((prev) => Number(Math.min(1.3, (prev ?? 0.85) + 0.1).toFixed(2)))
              }
              className="h-11 w-11 min-h-11 p-0"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="size-4" />
            </Button>
          </div>

          <DocumentExportMenu
            elementId="contract-studio-paper-canvas"
            filenameBase={title || "contrato-juridico"}
            title={title}
            subtitle={clientName ? `Contratante: ${clientName}` : undefined}
            agencyName={tenant.companyName}
            agencyDocument={tenant.documentNumber}
            agencyContact={[tenant.phone, tenant.email].filter(Boolean).join(" | ")}
            agencyLogoUrl={tenant.logoUrl}
            markdownContent={previewContent}
            pageFormat="a4-portrait"
            variant="outline"
            label="Exportar"
          />

          <Button
            type="button"
            onClick={handleSave}
            className="h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
          >
            Salvar Contrato
          </Button>

          {onClose && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              aria-label="Fechar Studio de Contratos"
              className="h-11 w-11 min-h-11 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Split-Pane Studio Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Painel Esquerdo — Editor Contextual, Variáveis, Biblioteca de Cláusulas & Assinatura */}
        <aside
          className={cn(
            "flex-1 lg:flex-none lg:w-1/2 xl:w-5/12 min-w-0 flex flex-col border-r border-border bg-card overflow-hidden",
            mobilePane === "preview" ? "hidden lg:flex" : "flex",
          )}
        >
          {/* Sub-navegação Interna do Inspetor */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-2",
                  activeTab === "editor"
                    ? "bg-card text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Edit3 className="size-4" />
                Editor & Variáveis
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-2",
                  activeTab === "library"
                    ? "bg-card text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BookOpen className="size-4" />
                Cláusulas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sign")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-2",
                  activeTab === "sign"
                    ? "bg-card text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Shield className="size-4" />
                Assinar ({signatures.length})
              </button>
            </div>

            {activeTab === "editor" && (
              <Button
                type="button"
                variant={showVariablePicker ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowVariablePicker((v) => !v)}
                className="h-11 min-h-11 px-3 text-xs font-semibold"
              >
                <SlidersHorizontal className="size-4 mr-1" />
                {showVariablePicker ? "Ocultar Tags" : "Inserir Tags"}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-safe">
            {activeTab === "editor" && (
              <div className="space-y-6">
                {/* Campos Estruturados de Qualificação & Financeiro */}
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Qualificação & Condições Comerciais
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="contract-client-name" className="text-xs font-medium">
                        Nome do Contratante
                      </Label>
                      <Input
                        id="contract-client-name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome completo ou razão social"
                        className="h-11 min-h-11 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contract-client-cpf" className="text-xs font-medium">
                        CPF / CNPJ
                      </Label>
                      <Input
                        id="contract-client-cpf"
                        value={clientCpf}
                        onChange={(e) => setClientCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="h-11 min-h-11 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contract-total-value" className="text-xs font-medium">
                        Valor Total
                      </Label>
                      <Input
                        id="contract-total-value"
                        value={totalValue}
                        onChange={(e) => setTotalValue(e.target.value)}
                        placeholder="Ex: R$ 9.500,00"
                        className="h-11 min-h-11 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contract-due-date" className="text-xs font-medium">
                        Vencimento / Vigência
                      </Label>
                      <Input
                        id="contract-due-date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        placeholder="Ex: 30/11/2026"
                        className="h-11 min-h-11 text-sm"
                      />
                    </div>
                  </div>
                </section>

                {/* Variáveis Dinâmicas do Modelo Selecionado */}
                {selectedAdvancedTemplate && selectedAdvancedTemplate.variables_schema.length > 0 && (
                  <section className="space-y-3 pt-2 border-t border-border">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Campos Avançados do Modelo ({selectedAdvancedTemplate.variables_schema.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedAdvancedTemplate.variables_schema.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label
                            htmlFor={`contract-var-${field.key}`}
                            className="text-xs font-medium"
                          >
                            {field.label}
                          </Label>
                          <Input
                            id={`contract-var-${field.key}`}
                            value={customVariables[field.key] ?? field.default_value ?? ""}
                            onChange={(e) =>
                              setCustomVariables((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            placeholder={`{{${field.key}}}`}
                            className="h-11 min-h-11 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {showVariablePicker && (
                  <section className="pt-2 border-t border-border">
                    <ContractVariablePicker
                      onInsertVariable={handleInsertVariableToken}
                      storeNiche={activeStoreNiche}
                    />
                  </section>
                )}

                {/* Editor Markdown */}
                <section className="space-y-2 pt-2 border-t border-border">
                  <Label htmlFor="contract-markdown-editor" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Corpo da Minuta Jurídica (Markdown + Variáveis)
                  </Label>
                  <Textarea
                    id="contract-markdown-editor"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Insira as cláusulas do contrato..."
                    rows={14}
                    className="font-mono text-xs leading-relaxed p-4 rounded-lg bg-background border-border resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tags dinâmicas como <code className="bg-muted px-2 py-1 rounded text-foreground">{"{{cliente.nome}}"}</code> e{" "}
                    <code className="bg-muted px-2 py-1 rounded text-foreground">{"{{valor_total}}"}</code> atualizam a folha A4 ao vivo.
                  </p>
                </section>
              </div>
            )}

            {activeTab === "library" && (
              <ContractClauseLibrary onInsertClause={handleInsertClause} />
            )}

            {activeTab === "sign" && (
              <ContractSignPad
                signerName={clientName}
                signerCpf={clientCpf}
                documentTitle={title}
                documentContent={previewContent}
                onConfirmSignature={handleSignatureConfirmed}
                onCancel={() => setActiveTab("editor")}
              />
            )}
          </div>
        </aside>

        {/* Painel Direito — Prévia Real-Time A4 em StudioFrame */}
        <main
          className={cn(
            "flex-1 lg:w-1/2 xl:w-7/12 min-w-0 bg-muted/40 overflow-hidden flex-col",
            mobilePane === "preview" ? "flex" : "hidden lg:flex",
          )}
        >
          <StudioFrame
            format="a4-portrait"
            canvasId="contract-studio-paper-canvas"
            zoomScale={zoomScale}
          >
            <article className="a4-page w-full min-h-full bg-card text-foreground p-8 sm:p-10 flex flex-col justify-between gap-6">
              <div className="space-y-6">
                {/* Cabeçalho Timbrado Multi-Tenant */}
                <header className="flex items-start justify-between gap-4 pb-4 border-b-2 border-primary">
                  <div className="flex items-center gap-4 min-w-0">
                    {tenant.logoUrl && (
                      <img
                        src={tenant.logoUrl}
                        alt={tenant.companyName}
                        crossOrigin="anonymous"
                        className="h-12 w-auto max-w-36 object-contain rounded-md"
                        width={144}
                        height={48}
                      />
                    )}
                    <div className="min-w-0">
                      <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                        {tenant.companyName}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {[tenant.documentNumber, tenant.registryCode, tenant.cityState]
                          .filter(Boolean)
                          .join(" | ")}
                      </p>
                      {(tenant.address || tenant.phone || tenant.email) && (
                        <p className="text-xs text-muted-foreground">
                          {[tenant.address, tenant.phone, tenant.email].filter(Boolean).join(" | ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <span className="inline-block text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-primary/10 text-primary">
                      Minuta Oficial
                    </span>
                    <p className="text-xs text-muted-foreground font-mono">
                      Emissão: {new Date().toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </header>

                {/* Título do Instrumento */}
                <div className="text-center border-b border-border pb-4 space-y-1">
                  <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">
                    {title}
                  </h1>
                  {(clientName || totalValue) && (
                    <p className="text-xs text-muted-foreground">
                      {[
                        clientName ? `Contratante: ${clientName}` : "",
                        clientCpf ? `Doc: ${clientCpf}` : "",
                        totalValue ? `Valor: ${totalValue}` : "",
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </p>
                  )}
                </div>

                {/* Corpo Renderizado */}
                <div className="text-xs leading-relaxed font-serif space-y-4">
                  <ContractMarkdownRenderer content={previewContent} />
                </div>

                {/* Assinaturas Digitais */}
                {signatures.length > 0 && (
                  <div className="border-t border-border pt-6 mt-8 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Assinaturas Digitais Registradas (MP 2.200-2/2001)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {signatures.map((sig, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2"
                        >
                          <img
                            src={sig.signatureBase64}
                            alt="Assinatura"
                            className="h-12 w-auto max-w-52 aspect-4/1 object-contain filter invert dark:invert-0"
                            width={192}
                            height={48}
                            loading="lazy"
                          />
                          <div className="text-xs font-medium text-foreground">
                            {sig.signerName} ({sig.signerCpf})
                          </div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            SHA-256: {sig.sha256Hash}
                          </div>
                          <div className="text-xs text-primary">
                            Assinado em {new Date(sig.signedAt).toLocaleString("pt-BR")} (IP:{" "}
                            {sig.ipAddress})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <footer className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {tenant.companyName}
                  {tenant.documentNumber ? ` — CNPJ ${tenant.documentNumber}` : ""}
                </span>
                <span>Documento gerado com prévia editorial real-time</span>
              </footer>
            </article>
          </StudioFrame>
        </main>
      </div>
    </div>
  );
}
