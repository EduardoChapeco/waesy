import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Save,
  PenTool,
  Settings2,
  FileText,
  UserCheck,
  Layers,
  Copy,
  Folder,
  Bell,
  Eye,
  Calendar,
  ExternalLink,
  QrCode,
  Loader2,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getContractById,
  updateContractDraft,
  sealAndIssueContract,
  type SignatureFieldDTO,
  type ObserverDTO,
  type DispatchSettingsDTO,
} from "@/services/contracts.functions";
import {
  SignaturePositionerCanvas,
  type SignerVisualInfo,
} from "@/components/contracts/signature-positioner-canvas";
import { ContractAuditManifest } from "@/components/contracts/contract-audit-manifest";
import { ContractVariablePicker } from "@/components/contracts/contract-variable-picker";
import { autoPositionSignatureFieldsFromContent } from "@/lib/contracts/contract-semantic-dictionary";

export const Route = createFileRoute("/workspace/contratos/$id/editor")({
  head: () => ({ meta: [{ title: "Editor de Contrato & Assinatura | Workspace Waesy" }] }),
  loader: async ({ params }) => {
    try {
      return await getContractById({ data: params.id });
    } catch (err) {
      console.error("[loader:workspace.contratos.$id.editor] Error:", err);
      return {} as any;
    }
  },
  component: ContractEditorPage,
});

const SIGNER_COLORS = ["#2563eb", "#9333ea", "#059669", "#ea580c", "#dc2626"];

function ContractEditorPage() {
  const contract = Route.useLoaderData();
  const navigate = useNavigate();

  if (!contract || !contract.id) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Contrato não encontrado.</p>
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link to="/workspace/contratos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const versions = contract.versions || [];
  const currentVersion = versions.sort(
    (a: any, b: any) => b.version_number - a.version_number,
  )[0] || { content_markdown: "", signature_fields: [], page_count: 1 };

  // Etapa ativa: 1 = Revisão, 2 = Posicionamento, 3 = Configurações & Selagem
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(2);

  // Estados do Contrato & Versão
  const [docTitle, setDocTitle] = useState(contract.title || "");
  const [contentMarkdown, setContentMarkdown] = useState(currentVersion.content_markdown || "");
  const [pageCount, setPageCount] = useState(currentVersion.page_count || 1);
  const [currentPage, setCurrentPage] = useState(1);

  // Signatários existentes
  const existingEnvelopes = currentVersion.envelopes || [];

  // Campos de Assinatura Posicionados (com auto-posicionamento inteligente inicial)
  const [signatureFields, setSignatureFields] = useState<SignatureFieldDTO[]>(
    currentVersion.signature_fields && currentVersion.signature_fields.length > 0
      ? currentVersion.signature_fields
      : (autoPositionSignatureFieldsFromContent(
          currentVersion.content_markdown || "",
          currentVersion.page_count || 1,
          existingEnvelopes.length || 2,
        ) as any),
  );
  const [signers, setSigners] = useState<SignerVisualInfo[]>(
    existingEnvelopes.length > 0
      ? existingEnvelopes.map((env: any, idx: number) => ({
          index: idx,
          name: env.signer_name,
          email: env.signer_email,
          phone: env.signer_phone || "",
          role: env.signer_role || "party",
          colorCode: env.color_code || SIGNER_COLORS[idx % SIGNER_COLORS.length],
        }))
      : [
          {
            index: 0,
            name: "Contratada / Empresa",
            email: "financeiro@waesy.com",
            phone: "",
            role: "party",
            colorCode: SIGNER_COLORS[0],
          },
          {
            index: 1,
            name: "Contratante / Cliente",
            email: "cliente@email.com",
            phone: "",
            role: "party",
            colorCode: SIGNER_COLORS[1],
          },
        ],
  );

  // Configurações Adicionais (Screenshot 3)
  const [folderName, setFolderName] = useState("Sem pasta");
  const [authMarkPosition, setAuthMarkPosition] = useState<"footer" | "header" | "side">("footer");
  const [authMarkSize, setAuthMarkSize] = useState<"standard" | "compact" | "mini">("standard");
  const [forceSignatureAppearance, setForceSignatureAppearance] = useState(false);
  const [observers, setObservers] = useState<ObserverDTO[]>(contract.observers || []);
  const [newObserverEmail, setNewObserverEmail] = useState("");
  const [newObserverName, setNewObserverName] = useState("");
  const [sendReminders, setSendReminders] = useState(true);

  // Estado de Selagem
  const [isSealing, setIsSealing] = useState(false);
  const [sealedData, setSealedData] = useState<any>(null);

  // Inserção inteligente de variáveis na minuta
  const handleInsertVariable = (token: string) => {
    const textarea = document.getElementById("contract-minuta-textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = contentMarkdown;
      const updated = current.substring(0, start) + token + current.substring(end);
      setContentMarkdown(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 50);
    } else {
      setContentMarkdown((prev: string) => prev + " " + token);
    }
  };

  // Salvar Rascunho
  const handleSaveDraft = async () => {
    try {
      await updateContractDraft({
        data: {
          contractId: contract.id,
          versionId: currentVersion.id,
          title: docTitle,
          contentMarkdown,
          signatureFields,
          pageCount,
          observers,
          dispatchSettings: {
            signing_order: "parallel",
            send_reminders: sendReminders,
            reminder_days: 3,
            auth_mark_position: authMarkPosition,
            auth_mark_size: authMarkSize,
            force_signature_appearance: forceSignatureAppearance,
            delivery_channels: ["whatsapp", "email"],
          },
        },
      });
      toast.success("Rascunho salvo com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar rascunho.");
    }
  };

  // Selar Criptograficamente o Contrato
  const handleSealContract = async () => {
    if (signers.length === 0) {
      toast.error("Adicione pelo menos um signatário.");
      return;
    }

    setIsSealing(true);
    try {
      // Salva antes de selar
      await updateContractDraft({
        data: {
          contractId: contract.id,
          versionId: currentVersion.id,
          title: docTitle,
          contentMarkdown,
          signatureFields,
          pageCount,
          observers,
        },
      });

      const res = await sealAndIssueContract({
        data: {
          contractId: contract.id,
          versionId: currentVersion.id,
          signatureFields,
          signers: signers.map((s) => ({
            name: s.name,
            email: s.email || `${s.name.toLowerCase().replace(/\s+/g, "")}@waesy.com`,
            phone: s.phone || undefined,
            role: (s.role as any) || "party",
            authLevel: "advanced",
            dispatchChannel: s.phone ? "whatsapp" : "email",
            signingOrderIndex: s.index + 1,
            colorCode: s.colorCode,
            requireFacialBiometrics: false,
            requireCpfConfirmation: false,
          })),
        },
      });

      setSealedData(res);
      toast.success("Contrato selado criptograficamente com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao selar contrato.");
    } finally {
      setIsSealing(false);
    }
  };

  const addObserver = () => {
    if (!newObserverEmail.trim()) return;
    setObservers([
      ...observers,
      {
        name: newObserverName.trim() || "Observador",
        email: newObserverEmail.trim(),
        role: "observer",
      },
    ]);
    setNewObserverEmail("");
    setNewObserverName("");
    toast.success("Observador adicionado à lista de notificações.");
  };

  // Se já foi selado nesta sessão ou previamente
  const isAlreadySealed = contract.status !== "draft" || Boolean(sealedData);

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Barra de Topo do Editor */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="rounded-xl h-9 w-9 p-0">
            <Link to="/workspace/contratos">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate max-w-md">
                {docTitle || "Editor de Contrato"}
              </h1>
              <Badge variant={isAlreadySealed ? "default" : "secondary"} className="text-xs px-2.5 py-0.5">
                {isAlreadySealed ? "Pronto para Assinar" : "Rascunho em Edição"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Etapa {activeStep} de 3 · {activeStep === 1 ? "Escrever Documento" : activeStep === 2 ? "Onde Assinar" : "Finalizar e Enviar"}
            </p>
          </div>
        </div>

        {/* Botões de Ação do Topo */}
        <div className="flex items-center gap-2">
          {!isAlreadySealed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="rounded-xl text-xs sm:text-sm font-semibold h-10 px-4"
            >
              <Save className="size-4 mr-1.5" />
              Salvar Rascunho
            </Button>
          )}

          {/* Stepper Superior Comercial & Nítido */}
          <div className="flex items-center p-1 bg-muted/80 rounded-xl text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                activeStep === 1 ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              1. Escrever
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                activeStep === 2 ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              2. Onde Assinar
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                activeStep === 3 ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              3. Enviar
            </button>
          </div>
        </div>
      </div>

      {/* SE O CONTRATO JÁ ESTÁ SELADO: EXIBE PAINEL DE DISPARO & PROTOCOLO */}
      {isAlreadySealed ? (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-emerald-500/30 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <ShieldCheck className="size-7 shrink-0" />
              <div>
                <h3 className="font-bold text-base text-foreground">Documento Autenticado & Pronto para Envio</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  O contrato possui validade jurídica oficial (Lei 14.063/2020). Envie os links abaixo para os clientes assinarem no celular.
                </p>
              </div>
            </div>

            {/* Links Rápidos de Despacho (WhatsApp / E-mail) */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Enviar Link para os Assinantes:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(sealedData?.envelopes || existingEnvelopes).map((env: any, idx: number) => {
                  const signingUrl = `/assinar/${env.signing_token}`;
                  const cleanPhone = (env.signer_phone || "").replace(/\D/g, "");
                  const waMsg = encodeURIComponent(
                    `Olá ${env.signer_name}, seu documento "${docTitle}" está pronto para assinatura no celular:\nhttps://waesy.com${signingUrl}`,
                  );
                  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMsg}` : null;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{env.signer_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{env.signer_phone || env.signer_email}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {waLink && (
                          <Button
                            asChild
                            size="sm"
                            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          >
                            <a href={waLink} target="_blank" rel="noreferrer">
                              <WhatsappLogo className="size-4 mr-1.5" />
                              Enviar no WhatsApp
                            </a>
                          </Button>
                        )}
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 rounded-xl text-xs font-semibold"
                        >
                          <Link to={signingUrl}>
                            <ExternalLink className="size-3.5 mr-1.5" />
                            Abrir Documento
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Folha de Rosto / Protocolo de Auditoria */}
          <ContractAuditManifest
            documentTitle={docTitle}
            category={contract.category}
            verificationCode={contract.verification_code}
            hashSha256={sealedData?.hashSha256 || currentVersion.hash_sha256 || "CÁLCULO CRIPTOGRÁFICO"}
            sealedAt={currentVersion.sealed_at || new Date().toISOString()}
            signers={signers.map((s) => ({
              name: s.name,
              email: s.email,
              phone: s.phone,
              role: s.role,
              status: "pending",
            }))}
            observers={observers}
          />
        </div>
      ) : (
        <>
          {/* PASSO 1: REVISÃO DE MINUTA & CONTEÚDO */}
          {activeStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Título do Instrumento</Label>
                  <Input
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                {/* Seletor de Variáveis Semânticas Dinâmicas por Nicho */}
                <ContractVariablePicker
                  onInsertVariable={handleInsertVariable}
                  className="mb-2"
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Cláusulas do Contrato (Markdown)</Label>
                    <span className="text-[11px] text-muted-foreground">
                      Dica: Variáveis como <code className="font-mono text-primary text-[10px]">&#123;&#123;cliente_nome&#125;&#125;</code> são preenchidas automaticamente.
                    </span>
                  </div>
                  <Textarea
                    id="contract-minuta-textarea"
                    rows={16}
                    value={contentMarkdown}
                    onChange={(e) => setContentMarkdown(e.target.value)}
                    className="font-mono text-xs rounded-xl p-3.5 leading-relaxed resize-y"
                    placeholder="Digite ou cole as cláusulas do contrato..."
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="rounded-xl text-xs h-10 px-5 font-semibold"
                  >
                    Avançar para Posicionamento
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </div>
              </div>

              {/* Prévia ao Lado */}
              <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Prévia de Leitura
                </h3>
                <div className="max-h-[500px] overflow-y-auto pr-2 text-xs font-serif leading-relaxed text-foreground/90 prose prose-sm dark:prose-invert">
                  <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: POSICIONAMENTO VISUAL DE TAGS (SignaturePositionerCanvas) */}
          {activeStep === 2 && (
            <div className="h-[760px]">
              <SignaturePositionerCanvas
                signers={signers}
                fields={signatureFields}
                pageCount={pageCount}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onFieldsChange={setSignatureFields}
                onAdvance={() => setActiveStep(3)}
                documentTitle={docTitle}
              />
            </div>
          )}

          {/* PASSO 3: CONFIGURAÇÕES ADICIONAIS & SELAGEM (Screenshot 3) */}
          {activeStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulário de Configurações Adicionais */}
              <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-foreground">Configurações adicionais</h2>
                  <p className="text-xs text-muted-foreground">
                    Personalize o comportamento e a aparência jurídica do seu documento
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Nome do Documento</Label>
                    <Input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Arquivar em pasta</Label>
                    <Select value={folderName} onValueChange={setFolderName}>
                      <SelectTrigger className="h-10 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl text-xs">
                        <SelectItem value="Sem pasta">Sem pasta</SelectItem>
                        <SelectItem value="Turismo 2026">Turismo & Viagens 2026</SelectItem>
                        <SelectItem value="Contratos Gerais">Contratos Gerais</SelectItem>
                        <SelectItem value="Imobiliário">Locações & Imóveis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bloco de Aparência */}
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                    <h3 className="text-xs font-bold text-foreground">Aparência da Autenticação Eletrônica</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Posição da Marca</Label>
                        <Select
                          value={authMarkPosition}
                          onValueChange={(v: any) => setAuthMarkPosition(v)}
                        >
                          <SelectTrigger className="h-9 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl text-xs">
                            <SelectItem value="footer">Rodapé</SelectItem>
                            <SelectItem value="header">Cabeçalho</SelectItem>
                            <SelectItem value="side">Lateral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Tamanho</Label>
                        <Select
                          value={authMarkSize}
                          onValueChange={(v: any) => setAuthMarkSize(v)}
                        >
                          <SelectTrigger className="h-9 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl text-xs">
                            <SelectItem value="standard">Padrão</SelectItem>
                            <SelectItem value="compact">Compacto</SelectItem>
                            <SelectItem value="mini">Mini</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox
                        id="force_sig"
                        checked={forceSignatureAppearance}
                        onCheckedChange={(c) => setForceSignatureAppearance(Boolean(c))}
                      />
                      <Label htmlFor="force_sig" className="text-xs text-muted-foreground cursor-pointer">
                        Forçar traçado manual da assinatura no celular
                      </Label>
                    </div>
                  </div>

                  {/* Observadores e Notificações */}
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                    <h3 className="text-xs font-bold text-foreground">Observadores (Recebem cópia assinada)</h3>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome"
                        value={newObserverName}
                        onChange={(e) => setNewObserverName(e.target.value)}
                        className="h-9 text-xs rounded-lg"
                      />
                      <Input
                        placeholder="E-mail do observador"
                        value={newObserverEmail}
                        onChange={(e) => setNewObserverEmail(e.target.value)}
                        className="h-9 text-xs rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addObserver}
                        className="rounded-lg h-9 text-xs shrink-0"
                      >
                        Adicionar
                      </Button>
                    </div>

                    {observers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {observers.map((obs, i) => (
                          <Badge key={i} variant="secondary" className="text-[11px]">
                            {obs.name} ({obs.email})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/70">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveStep(2)}
                    className="rounded-xl text-xs h-10 px-4"
                  >
                    Voltar ao Posicionamento
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSealContract}
                    disabled={isSealing}
                    className="rounded-xl text-xs h-11 px-8 font-bold bg-primary hover:bg-primary/90"
                  >
                    {isSealing ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Selando Criptograficamente...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4 mr-2" />
                        Criar Documento & Selar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Resumo do Envelope & Validade Jurídica */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/80 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Lock className="size-3.5 text-primary" />
                    Validade Jurídica Assegurada
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ao clicar em <strong>Criar Documento & Selar</strong>, o hash SHA-256 será computado de forma irreversível sobre o conteúdo e as caixas de assinatura.
                  </p>
                  <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                    <p>✓ Trilha de auditoria com IP, User-Agent e Timestamp UTC</p>
                    <p>✓ Folha de rosto anexada com QR Code oficial de verificação</p>
                    <p>✓ Envio instantâneo via WhatsApp e E-mail para os signatários</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
