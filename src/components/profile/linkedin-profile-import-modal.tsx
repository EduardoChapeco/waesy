import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Building2,
  GraduationCap,
  FileCode2,
  Linkedin,
  Loader2,
  ShieldCheck,
  Check,
  Info,
} from "lucide-react";
import {
  getLinkedInAuthRedirectUrl,
  parseAndImportLinkedInJson,
} from "@/services/linkedin-integrations.functions";

export interface LinkedInImportResult {
  headline?: string;
  summary?: string;
  experiences: Array<{
    id: string;
    title: string;
    company: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
  }>;
  educations: Array<{
    id: string;
    school: string;
    degree?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
  }>;
  skills: string[];
}

interface LinkedInProfileImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: LinkedInImportResult) => void;
}

export function LinkedInProfileImportModal({
  open,
  onOpenChange,
  onImport,
}: LinkedInProfileImportModalProps) {
  const [activeTab, setActiveTab] = useState<"oauth" | "json">("oauth");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [parsedResult, setParsedResult] = useState<LinkedInImportResult | null>(null);

  const resetState = () => {
    setJsonText("");
    setParsedResult(null);
    setIsProcessing(false);
    setIsConnecting(false);
  };

  const handleStartOAuth = async () => {
    setIsConnecting(true);
    try {
      const res = await getLinkedInAuthRedirectUrl({
        data: {
          returnTo: typeof window !== "undefined" ? window.location.pathname : "/conta/curriculo",
          mode: "candidate",
        },
      });
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar autenticação com LinkedIn.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleProcessJson = async () => {
    if (!jsonText.trim()) {
      toast.error("Cole o arquivo ou JSON do perfil para importar.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await parseAndImportLinkedInJson({
        data: {
          rawJson: jsonText.trim(),
          autoSaveToProfile: true,
        },
      });

      if (res && res.translatedResume) {
        const tr = res.translatedResume;
        const normalized: LinkedInImportResult = {
          headline: tr.headline,
          summary: tr.summary,
          experiences: (tr.experiences || []).map((exp: any) => ({
            id: exp.id || `exp_${Date.now()}_${Math.random()}`,
            title: exp.title,
            company: exp.company,
            start_date: exp.start_date,
            end_date: exp.is_current ? "Atual" : exp.end_date,
            is_current: exp.is_current,
            description: exp.description,
          })),
          educations: (tr.educations || []).map((edu: any) => ({
            id: edu.id || `edu_${Date.now()}_${Math.random()}`,
            school: edu.school,
            degree: edu.degree,
            field_of_study: edu.field_of_study,
            start_date: edu.start_date,
            end_date: edu.end_date,
          })),
          skills: tr.skills || [],
        };

        setParsedResult(normalized);
        toast.success(
          `Perfil analisado com sucesso! ${normalized.experiences.length} experiências e ${normalized.skills.length} competências encontradas.`
        );
      }
    } catch (err: any) {
      console.error("[LinkedInProfileImportModal] Erro de parse:", err);
      toast.error(err.message || "Não foi possível validar a estrutura dos dados do LinkedIn.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult) return;
    onImport(parsedResult);
    toast.success("Dados incorporados ao currículo com sucesso!");
    onOpenChange(false);
    resetState();
  };

  const handleLoadExampleTemplate = () => {
    const schemaExamplePayload = {
      name: "Candidato Waesy",
      headline: "Especialista em Gestão e Operações Comerciais",
      summary: "Profissional com mais de 8 anos de experiência em gestão de equipes e operações de varejo.",
      location: { name: "São Miguel do Oeste, SC" },
      positions: [
        {
          title: "Gerente de Operações Comerciais",
          companyName: "Grupo Varejista Regional",
          employmentType: "Full-time",
          location: "São Miguel do Oeste, SC",
          isCurrent: true,
          startDate: { month: 2, year: 2022 },
          endDate: null,
          description: "Supervisão de filiais, liderança de equipe e implementação de novos processos.",
        },
      ],
      educations: [
        {
          schoolName: "Universidade do Oeste de Santa Catarina (UNOESC)",
          degreeName: "Bacharelado",
          fieldOfStudy: "Administração de Empresas",
          startDate: { year: 2014 },
          endDate: { year: 2018 },
        },
      ],
      skills: ["Gestão de Equipes", "Planejamento Estratégico", "Vendas B2B", "Negociação"],
    };
    setJsonText(JSON.stringify(schemaExamplePayload, null, 2));
    toast.info("Exemplo carregado. Clique em 'Validar e Processar'.");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-xl sm:rounded-lg p-0 overflow-hidden bg-background border border-border">
        <DialogHeader className="p-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
              <Linkedin className="size-5 fill-current" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Integração Oficial LinkedIn
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Conexão transparente e segura em conformidade com as diretrizes Microsoft / LinkedIn.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Abas */}
        <div className="flex border-b border-border/40 px-6 pt-2 bg-muted/20">
          <button
            type="button"
            onClick={() => setActiveTab("oauth")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === "oauth"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Identidade Oficial (OpenID Connect)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("json")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === "json"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Exportação de Dados / Arquivo
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-96 overflow-y-auto no-scrollbar">
          {activeTab === "oauth" ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-1" />
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-foreground">Escopos Autorizados (OpenID Connect)</span>
                    <p className="text-muted-foreground leading-relaxed">
                      O login oficial self-service do LinkedIn fornece com segurança seus dados de identidade básica:
                      <strong> Nome completo, Foto de Perfil, E-mail verificado e Headline</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-background border border-border/40 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="size-4 text-blue-500 shrink-0 mt-1" />
                  <span>
                    Conforme os termos oficiais do LinkedIn, o histórico detalhado de empregos não é exposto por APIs públicas genéricas. Para importar seu histórico completo com experiências e cursos, utilize a aba <strong>Exportação de Dados / Arquivo</strong> ao lado.
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleStartOAuth}
                disabled={isConnecting}
                className="w-full h-11 rounded-lg font-bold text-xs gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Conectando ao LinkedIn...</span>
                  </>
                ) : (
                  <>
                    <Linkedin className="size-4 fill-current" />
                    <span>Conectar e Sincronizar Identidade</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Dados Exportados do LinkedIn (JSON / Texto Estruturado)
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadExampleTemplate}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Carregar Exemplo
                  </button>
                </div>
                <Textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Cole aqui o conteúdo JSON do seu perfil do LinkedIn..."
                  rows={6}
                  className="font-mono text-xs rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Você pode obter este arquivo nas configurações de privacidade do seu LinkedIn em <em>Configurações → Privacidade de Dados → Obter uma cópia dos seus dados</em>.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleProcessJson}
                disabled={isProcessing || !jsonText.trim()}
                variant="outline"
                className="w-full h-11 rounded-lg font-bold text-xs gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Analisando estrutura...</span>
                  </>
                ) : (
                  <>
                    <FileCode2 className="size-4" />
                    <span>Validar e Extrair Informações</span>
                  </>
                )}
              </Button>

              {/* Pré-visualização do resultado parseado */}
              {parsedResult && (
                <div className="p-4 rounded-lg bg-muted/40 border border-emerald-500/30 space-y-3 animate-fade-in text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="size-4" />
                    <span>Dados Prontos para Incorporação</span>
                  </div>

                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <div>
                      <strong>Headline:</strong> {parsedResult.headline || "—"}
                    </div>
                    <div>
                      <strong>Experiências encontradas:</strong> {parsedResult.experiences.length}
                    </div>
                    <div>
                      <strong>Formações encontradas:</strong> {parsedResult.educations.length}
                    </div>
                    <div>
                      <strong>Competências:</strong> {parsedResult.skills.join(", ") || "—"}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleApply}
                    className="w-full h-11 rounded-lg font-bold text-xs gap-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Check className="size-4" />
                    <span>Confirmar e Incorporar ao Currículo</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/40 bg-muted/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
