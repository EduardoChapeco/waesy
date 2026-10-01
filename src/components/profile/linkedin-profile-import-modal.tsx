import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Building2, GraduationCap, FileCode2, Linkedin, Loader2, ArrowRight, Check } from "lucide-react";
import { getLinkedInAuthRedirectUrl, parseAndImportLinkedInJson } from "@/services/linkedin-integrations.functions";

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
      toast.error("Cole o JSON do perfil para importar.");
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
            start_date: exp.start_date || ((exp as any).start_year ? `${(exp as any).start_month || 1}/${(exp as any).start_year}` : undefined),
            end_date: exp.is_current ? "Atual" : exp.end_date || ((exp as any).end_year ? `${(exp as any).end_month || 12}/${(exp as any).end_year}` : undefined),
            is_current: exp.is_current,
            description: exp.description,
          })),
          educations: (tr.educations || []).map((edu) => ({
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
        toast.success(`Perfil analisado! ${res.stats.experiencesCount} experiências e ${res.stats.skillsCount} competências encontradas.`);
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
    toast.success("Dados do LinkedIn incorporados ao currículo!");
    onOpenChange(false);
    resetState();
  };

  const handleLoadExampleTemplate = () => {
    const schemaExamplePayload = {
      name: "Candidato Waesy",
      headline: "Especialista em Gestão e Operações Comerciais",
      summary: "Profissional com mais de 8 anos de experiência em gestão de equipes, otimização de processos de varejo e expansão comercial multicanal.",
      location: { name: "São Miguel do Oeste, SC" },
      positions: [
        {
          title: "Gerente de Operações Comerciais",
          companyName: "Grupo Varejista Regional",
          employmentType: "Full-time",
          location: "Chapecó, SC",
          isCurrent: true,
          startDate: { month: 2, year: 2022 },
          endDate: null,
          description: "Supervisão de 14 filiais, liderança de 45 colaboradores e aumento de 28% no faturamento médio.",
        },
        {
          title: "Coordenador de Vendas",
          companyName: "Distribuidora do Oeste",
          employmentType: "CLT",
          location: "São Miguel do Oeste, SC",
          isCurrent: false,
          startDate: { month: 5, year: 2018 },
          endDate: { month: 1, year: 2022 },
          description: "Gestão da carteira de clientes B2B e implementação de novo sistema de metas por comissão.",
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
      skills: ["Gestão de Equipes", "Planejamento Estratégico", "Vendas B2B", "Negociação", "ERP", "CRM"],
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
      <DialogContent className="sm:max-w-xl sm:rounded-2xl p-0 overflow-hidden bg-background border border-border">
        <DialogHeader className="p-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Linkedin className="size-5 fill-current" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Importar do LinkedIn</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">Sincronize experiências e formação diretamente para o seu currículo.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Abas */}
        <div className="flex border-b border-border/40 px-6 pt-2 bg-muted/20">
          <button
            type="button"
            onClick={() => setActiveTab("oauth")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "oauth"
                ? "border-[#0A66C2] text-[#0A66C2]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Conexão Direta (OAuth 2.0)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("json")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "json"
                ? "border-[#0A66C2] text-[#0A66C2]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Colar Dados / JSON
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
          {activeTab === "oauth" ? (
            <div className="space-y-4 text-center py-4">
              <div className="size-16 rounded-3xl bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center mx-auto border border-[#0A66C2]/20">
                <Linkedin className="size-8 fill-current" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="text-sm font-semibold text-foreground">Conectar Perfil</h4>
              <p className="text-xs text-muted-foreground">Importe seus dados profissionais com 1 clique via LinkedIn.</p>
              </div>

              

              <Button
                type="button"
                onClick={handleStartOAuth}
                disabled={isConnecting}
                className="w-full h-11 rounded-xl font-bold text-xs gap-2 bg-[#0A66C2] hover:bg-[#084e96] text-white shadow-xs cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Conectando ao LinkedIn...</span>
                  </>
                ) : (
                  <>
                    <Linkedin className="size-4 fill-current" />
                    <span>Entrar com LinkedIn</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">JSON do Perfil</Label>
                <button
                  type="button"
                  onClick={handleLoadExampleTemplate}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Carregar exemplo para teste
                </button>
              </div>

              <Textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setParsedResult(null);
                }}
                placeholder="Cole o JSON exportado do LinkedIn..."
                className="h-32 text-xs font-mono rounded-xl bg-background border-border resize-none"
              />

              {!parsedResult ? (
                <Button
                  type="button"
                  onClick={handleProcessJson}
                  disabled={isProcessing || !jsonText.trim()}
                  className="w-full h-10 rounded-xl font-bold text-xs gap-2 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Validando com Zod...</span>
                    </>
                  ) : (
                    <>
                      <FileCode2 className="size-4" />
                      <span>Validar e Processar Dados</span>
                    </>
                  )}
                </Button>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Estrutura Reconhecida com Sucesso!
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 font-mono">
                      {parsedResult.experiences.length} experiências
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Cargo Atual / Headline:</strong> {parsedResult.headline || "Não especificado"}</p>
                    <p><strong>Competências:</strong> {parsedResult.skills.slice(0, 5).join(", ")}...</p>
                    <p><strong>Formação:</strong> {parsedResult.educations[0]?.school || "Não informada"}</p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleApply}
                    className="w-full h-10 rounded-xl font-bold text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                  >
                    <ArrowRight className="size-4" />
                    <span>Aplicar ao Meu Currículo</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-9"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
