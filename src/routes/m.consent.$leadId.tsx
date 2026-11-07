import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
  Calendar,
  Building2,
  Check,
  Loader2,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getLeadConsentBundle,
  recordLeadOrCustomerConsent,
} from "@/services/legal-telemetry.functions";
import {
  type LegalPolicyType,
  type ConsentRecordItem,
  CANONICAL_LEGAL_POLICIES,
} from "@/types/legal-consent";

export const Route = createFileRoute("/m/consent/$leadId")({
  head: () => ({
    meta: [
      {
        title: "Autorização de Termos e LGPD | Central de Consentimentos",
      },
    ],
  }),
  loader: async ({ params }: { params: { leadId: string } }) => {
    try {
      const bundle = await getLeadConsentBundle({
        data: { leadId: params.leadId },
      }).catch((err) => {
        return { error: err?.message || "Link inválido ou expirado." };
      });
      return { bundle };
    } catch (err) {
      console.error("[loader:m.consent.$leadId] Erro no loader:", err);
      return { bundle: { error: "Não foi possível carregar as políticas." } };
    }
  },
  component: PublicConsentAuthorizationPage,
});

function PublicConsentAuthorizationPage() {
  const { bundle } = (Route.useLoaderData as any)();

  if (bundle?.error || !bundle?.lead) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border-border/60 bg-card">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-lg font-bold">Acesso Indisponível</h1>
          <p className="text-sm text-muted-foreground">
            {bundle?.error || "O link de consentimento não foi localizado ou perdeu a validade."}
          </p>
        </Card>
      </div>
    );
  }

  const { lead, store, storePolicies, existingConsents, boundPolicyKeys } = bundle;

  // Lista unificada de políticas ativas (canônicas + templates vinculados ao card)
  const activePoliciesList: string[] = Array.from(
    new Set([
      "privacy_policy",
      "quotation_policy",
      "sensitive_data_policy",
      "cancellation_policy",
      "terms_of_service",
      ...(Array.isArray(boundPolicyKeys) ? boundPolicyKeys : []),
      ...(Array.isArray(existingConsents) ? existingConsents.map((c: ConsentRecordItem) => c.policy_type) : []),
    ])
  );

  // Estado de seleções
  const [selectedPolicies, setSelectedPolicies] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    activePoliciesList.forEach((key) => {
      // Se já estava aceito no banco, inicia marcado
      const alreadyAccepted = existingConsents.some(
        (c: ConsentRecordItem) => c.policy_type === key && c.status === "accepted"
      );
      const canonical = CANONICAL_LEGAL_POLICIES[key as LegalPolicyType];
      map[key] = alreadyAccepted || Boolean(canonical?.isRequiredByDefault) || (Array.isArray(boundPolicyKeys) && boundPolicyKeys.includes(key));
    });
    return map;
  });

  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedProof, setCompletedProof] = useState<any | null>(null);

  const togglePolicy = (key: string) => {
    setSelectedPolicies((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleConfirmAll = async () => {
    setIsSubmitting(true);
    try {
      let geoData: any = undefined;

      // Tentativa suave de captura de geolocalização se o usuário permitir
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 4000,
              maximumAge: 60000,
            });
          });
          geoData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        } catch {
          // Permissão negada ou timeout: continua com IP server-side
        }
      }

      // Dispara o registro para cada política marcada
      const keysToRecord = Object.keys(selectedPolicies).filter(
        (k) => selectedPolicies[k]
      );

      let lastProof: any = null;

      for (const key of keysToRecord) {
        const canonical = CANONICAL_LEGAL_POLICIES[key as LegalPolicyType];
        const storeCustomObj = storePolicies?.[key];
        const customContent =
          typeof storeCustomObj === "string"
            ? storeCustomObj
            : storeCustomObj?.content || "";
        const finalContent = customContent || canonical?.defaultContent || "";
        const finalTitle =
          (typeof storeCustomObj === "object" && storeCustomObj?.title) ||
          canonical?.title ||
          key;
        const finalVersion =
          (typeof storeCustomObj === "object" && storeCustomObj?.version) ||
          canonical?.defaultVersion ||
          "v1.0";

        const result = await recordLeadOrCustomerConsent({
          data: {
            leadId: lead.id,
            storeId: lead.storeId,
            policyType: key,
            policyTitle: finalTitle,
            policyVersion: finalVersion,
            policyContent: finalContent,
            method: "quick_link",
            geolocation: geoData,
          },
        });

        lastProof = result;
      }

      setCompletedProof(lastProof);
      toast.success("Consentimento registrado com sucesso.");
    } catch (err: any) {
      console.error("[m.consent] Falha ao registrar consentimento:", err);
      toast.error(err?.message || "Erro ao registrar consentimento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Cabeçalho da Empresa */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
            <Building2 className="size-3.5 text-primary" />
            <span>{store.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Autorização de Políticas & LGPD
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Olá, <strong className="text-foreground">{lead.fullName || "Cliente"}</strong>. Para prosseguir com o seu atendimento com segurança jurídica e conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), revise e confirme os termos abaixo.
          </p>
        </div>

        {/* Estado Concluído / Certidão Militar Emitida */}
        {completedProof ? (
          <Card className="p-6 border-border/60 bg-card space-y-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Consentimento Confirmado
                </h2>
                <p className="text-xs text-muted-foreground">
                  Certidão digital emitida e vinculada com telemetria probatória.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Código da Certidão:</span>
                <span className="font-bold text-foreground select-all">
                  {completedProof.certificateCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Data/Hora (UTC):</span>
                <span className="text-foreground">{completedProof.acceptedAt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Segurança:</span>
                <span className="text-foreground">Assinatura SHA-256 Inviolável</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Uma cópia desta certidão foi anexada ao seu prontuário de atendimento na agência. Você pode fechar esta página com segurança.
              </p>
            </div>
          </Card>
        ) : (
          /* Formulário de Revisão e Aceite das Políticas */
          <div className="space-y-4">
            {activePoliciesList.map((key) => {
              const storeCustom = storePolicies?.[key];
              const canonical = CANONICAL_LEGAL_POLICIES[key as LegalPolicyType] || {
                key,
                title: (typeof storeCustom === "object" && storeCustom?.title) || key,
                shortDescription:
                  (typeof storeCustom === "object" && storeCustom?.description) ||
                  "Termo contratual e política de governança vinculada ao atendimento.",
                legalBasis: "Lei 13.709/2018 (LGPD) e Código Civil (Arts. 421 e 422)",
                defaultVersion: "v1.0",
                defaultContent:
                  typeof storeCustom === "string" ? storeCustom : storeCustom?.content || "",
                isRequiredByDefault: false,
              };
              const isChecked = Boolean(selectedPolicies[key]);
              const isExpanded = expandedPolicy === key;
              const contentToRead =
                (typeof storeCustom === "string" ? storeCustom : storeCustom?.content) ||
                canonical.defaultContent;

              return (
                <Card
                  key={key}
                  className="p-4 border-border/60 bg-card space-y-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <label
                      htmlFor={`check-${key}`}
                      className="flex items-start gap-3 cursor-pointer select-none min-h-11 flex-1"
                    >
                      <input
                        type="checkbox"
                        id={`check-${key}`}
                        checked={isChecked}
                        onChange={() => togglePolicy(key)}
                        className="mt-1 size-5 rounded border-border/60 text-primary focus:ring-2 focus:ring-ring cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">
                            {canonical.title}
                          </span>
                          {canonical.isRequiredByDefault && (
                            <Badge variant="outline" className="text-2xs h-5 px-2 border-border/40 font-mono">
                              Essencial
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {canonical.shortDescription}
                        </p>
                        <p className="text-2xs font-mono text-muted-foreground/80">
                          Base legal: {canonical.legalBasis}
                        </p>
                      </div>
                    </label>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedPolicy(isExpanded ? null : key)}
                      className="size-11 min-h-11 p-0 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title={isExpanded ? "Ocultar texto integral" : "Ler texto integral"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </Button>
                  </div>

                  {/* Texto expandido com fundamentação e cláusulas */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-border/40 text-xs text-muted-foreground leading-relaxed space-y-2">
                      <div className="p-3 rounded-lg bg-muted text-foreground font-sans">
                        {contentToRead}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Aviso de Telemetria Militar Probatória */}
            <div className="p-4 rounded-lg bg-muted text-xs text-muted-foreground flex items-center gap-3">
              <Lock className="size-4 text-primary shrink-0" />
              <span>
                Ao confirmar, serão capturados IP, identificador de dispositivo e carimbo de tempo para fins exclusivos de auditoria e cumprimento da Lei 13.709/2018.
              </span>
            </div>

            {/* CTA Primário Soberano de Confirmação */}
            <Button
              type="button"
              onClick={handleConfirmAll}
              disabled={isSubmitting || Object.values(selectedPolicies).every((v) => !v)}
              className="w-full h-11 min-h-11 rounded-lg text-sm font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Registrando com Telemetria...</span>
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  <span>Confirmar e Assinar Digitalmente</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
