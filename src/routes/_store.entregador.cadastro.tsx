/**
 * _store.entregador.cadastro.tsx — Cadastro Especializado de Entregadores, Motoristas e Freteiros
 * Validação Biométrica em 2 Etapas, Gravação de Minivídeo Liveness, Cross-Check de IA e Termos de Autonomia.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Motorcycle,
  Car,
  Truck,
  ShieldCheck,
  ShieldWarning,
  VideoCamera,
  Camera,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  Clock,
  Scales,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  submitCourierApplication,
  getMyCourierApplicationStatus,
} from "@/services/courier-verification.functions";
import { getLegalDocumentBySlug } from "@/services/legal.functions";
import { toast } from "sonner";
import { formatCpf, validateCpfMod11 } from "@/lib/document-validator";
import { DocumentField } from "@/components/ui/document-field";
import { PlateField } from "@/components/ui/plate-field";

export const Route = createFileRoute("/_store/entregador/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro de Entregador & Motorista Parceiro | Waesy" },
      {
        name: "description",
        content:
          "Cadastre-se como entregador ou motorista autônomo com total liberdade de horários, sem subordinação ou penalidades por recusa de chamados.",
      },
    ],
  }),
  loader: async () => {
    try {
    const [existingApp, legalDoc] = await Promise.all([
      getMyCourierApplicationStatus().catch(() => null),
      getLegalDocumentBySlug({ data: { slug: "entregadores" } }).catch(() => null),
    ]);
    return { existingApp, legalDoc };
    } catch (err) {
      console.error("[loader:_store.entregador.cadastro] Unhandled loader error:", err);
      return { existingApp: null, legalDoc: null };
    }
  },
  component: CourierOnboardingPage,
});

function CourierOnboardingPage() {
  const { existingApp: initialApp, legalDoc } = ((Route.useLoaderData?.() as any) || {});
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const { data: application, refetch } = useQuery({
    queryKey: ["my-courier-application"],
    queryFn: () => getMyCourierApplicationStatus(),
    initialData: initialApp,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [form, setForm] = useState({
    fullName: application?.full_name || "",
    cpf: application?.cpf || "",
    documentType: "cnh" as "cnh" | "rg",
    documentNumber: application?.document_number || "",
    documentFrontUrl: application?.document_front_url || "",
    documentBackUrl: application?.document_back_url || "",
    selfieUrl: application?.selfie_url || "",
    livenessVideoUrl: application?.liveness_video_url || "",
    vehicleType: (application?.vehicle_type as any) || "motorcycle",
    vehiclePlate: application?.vehicle_plate || "",
    vehicleModel: application?.vehicle_model || "",
    vehicleColor: application?.vehicle_color || "",
    termsAccepted: false,
  });

  const update = (field: string, val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.termsAccepted) {
      toast.error("É obrigatório concordar com os Termos de Autonomia e Não-Vínculo.");
      return;
    }

    if (!validateCpfMod11(form.cpf)) {
      toast.error("CPF do condutor inválido. Por favor, verifique os 11 dígitos informados.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitCourierApplication({
          data: {
            full_name: form.fullName,
            cpf: form.cpf,
            document_type: form.documentType,
            document_number: form.documentNumber,
            document_front_url: form.documentFrontUrl,
            document_back_url: form.documentBackUrl || undefined,
            selfie_url: form.selfieUrl,
            liveness_video_url: form.livenessVideoUrl,
            vehicle_type: form.vehicleType,
            vehicle_plate: form.vehiclePlate || undefined,
            vehicle_model: form.vehicleModel || undefined,
            vehicle_color: form.vehicleColor || undefined,
            terms_accepted: true,
          },
        });

        toast.success(res.message);
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Falha ao enviar candidatura.");
      }
    });
  };

  // Se o entregador já tem uma inscrição ativa/aprovada ou em revisão
  if (application) {
    const isApproved = application.crosscheck_status === "match_approved";
    const isDivergent = application.crosscheck_status === "divergence_flagged";
    const isManualReview = application.crosscheck_status === "manual_review";
    const isRejected = application.crosscheck_status === "fraud_rejected";

    return (
      <div className="min-h-screen bg-background pb-24 pt-6">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Credenciamento de Parceiro
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Inscrição: #{application.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Banner de Aprovado */}
          {isApproved && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={28} weight="bold" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-emerald-600">
                    Credenciamento Aprovado!
                  </h2>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    Sua biometria facial e CNH foram conciliadas com a titularidade da conta. Você já pode aceitar chamados e corridas com autonomia total.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button asChild className="rounded-xl h-10 px-5 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1">
                  <Link to="/mobilidade">Acessar Painel de Corridas</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl h-10 px-4 font-semibold text-xs border-border flex-1">
                  <Link to="/conta">Minha Conta</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Banner de Divergência Detectada / Análise Manual */}
          {(isDivergent || isManualReview) && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Warning size={28} weight="bold" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h2 className="text-base font-bold text-amber-700 dark:text-amber-400">
                    Documentação em Revisão de Segurança
                  </h2>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    Nossa inteligência identificou divergências entre a titularidade da conta principal e a documentação enviada (CNH / Face-Match). Por conformidade de segurança e prevenção ao uso de contas por terceiros ("laranjas"), sua inscrição passará por validação humana por nossa equipe forense.
                  </p>

                  <div className="p-3 rounded-xl bg-background/80 border border-border/40 text-xs space-y-1 font-mono">
                    <span className="font-bold text-muted-foreground block text-[11px] uppercase">
                      Protocolo de Segurança:
                    </span>
                    <p className="text-foreground text-[11px]">
                      Aviso legal: O aluguel de contas, adulteração de CNH ou tentativa de falsidade ideológica é estritamente vedado e passível de comunicação às autoridades policiais competentes conforme os Termos de Parceria.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button asChild variant="outline" className="rounded-xl h-9 px-4 text-xs font-semibold">
                  <Link to="/conta">Voltar para Minha Conta</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Banner de Fraude Rejeitada */}
          {isRejected && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <ShieldWarning size={32} weight="bold" className="text-destructive shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-destructive">Candidatura Recusada</h2>
                  <p className="text-xs text-foreground/80">
                    A verificação foi reprovada definitivamente por incompatibilidade de documentação.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 pt-6">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 space-y-6">
        {/* Cabeçalho */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Link to="/mobilidade" className="hover:text-foreground">Mobilidade</Link>
            <span>/</span>
            <span className="text-foreground">Cadastro de Parceiro</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Seja um Parceiro
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tenha liberdade absoluta de horários, escolha de clientes e chamados, sem punitividade por recusa de viagens.
          </p>
        </div>

        {/* Indicador de Passos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-y border-border/40 py-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`text-left text-xs font-mono transition-colors ${
              step === 1 ? "text-primary font-bold" : "text-muted-foreground"
            }`}
          >
            1. Veículo & CNH
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.fullName && form.cpf && form.documentFrontUrl) setStep(2);
            }}
            className={`text-left text-xs font-mono transition-colors ${
              step === 2 ? "text-primary font-bold" : "text-muted-foreground"
            }`}
          >
            2. Biometria & Prova de Vida
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.selfieUrl && form.livenessVideoUrl) setStep(3);
            }}
            className={`text-left text-xs font-mono transition-colors ${
              step === 3 ? "text-primary font-bold" : "text-muted-foreground"
            }`}
          >
            3. Autonomia & Termos
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── PASSO 1: DADOS DO VEÍCULO & DOCUMENTO ── */}
          {step === 1 && (
            <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Motorcycle size={18} weight="bold" className="text-primary" />
                  <span>Modalidade e Documento</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Selecione o veículo utilizado e anexe a foto da sua Carteira Nacional de Habilitação (CNH).
                </p>
              </div>

              {/* Seletor de Modal */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tipo de Transporte</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "motorcycle", label: "Moto", icon: Motorcycle },
                    { id: "car", label: "Carro Privado", icon: Car },
                    { id: "van", label: "Utilitário / Van", icon: Truck },
                    { id: "truck", label: "Caminhão", icon: Truck },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => update("vehicleType", m.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                        form.vehicleType === m.id
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <m.icon size={22} weight="bold" className="mb-1" />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold">Nome Completo (como na CNH)</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    placeholder="Seu nome oficial completo"
                    className="h-10 rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-xs font-semibold">CPF do Condutor *</Label>
                  <DocumentField
                    id="cpf"
                    mode="cpf"
                    value={form.cpf}
                    onChange={(masked) => update("cpf", masked)}
                    className="h-10 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="docNumber" className="text-xs font-semibold">Número da CNH / Registro</Label>
                  <Input
                    id="docNumber"
                    value={form.documentNumber}
                    onChange={(e) => update("documentNumber", e.target.value)}
                    placeholder="Número da CNH"
                    className="h-10 rounded-xl text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plate" className="text-xs font-semibold">Placa do Veículo</Label>
                  <PlateField
                    id="plate"
                    value={form.vehiclePlate}
                    onChange={(masked) => update("vehiclePlate", masked)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="model" className="text-xs font-semibold">Modelo / Marca</Label>
                  <Input
                    id="model"
                    value={form.vehicleModel}
                    onChange={(e) => update("vehicleModel", e.target.value)}
                    placeholder="Ex: Honda CG 160"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Upload da Frente da CNH */}
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold">Foto da CNH Aberta ou Frente (Legível)</Label>
                <ImageUpload
                  value={form.documentFrontUrl}
                  onChange={(url) => update("documentFrontUrl", url)}
                  bucket="legal-documents"
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  type="button"
                  onClick={() => {
                    if (!form.fullName || !form.cpf || !form.documentNumber || !form.documentFrontUrl) {
                      toast.error("Preencha todos os campos obrigatórios e anexe a foto da CNH.");
                      return;
                    }
                    setStep(2);
                  }}
                  className="rounded-xl h-10 px-5 font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-1.5 cursor-pointer"
                >
                  <span>Avançar para Biometria</span>
                  <ArrowRight size={14} weight="bold" />
                </Button>
              </div>
            </div>
          )}

          {/* ── PASSO 2: BIOMETRIA FACIAL & MINIVÍDEO DE LIVENESS ── */}
          {step === 2 && (
            <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Camera size={18} weight="bold" className="text-primary" />
                  <span>Prova de Vida e Biometria Facial</span>
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para proteção contra fraudes e aluguel indevido de contas, tire uma selfie nítida e grave um minivídeo de 3 a 5 segundos virando suavemente o rosto.
                </p>
              </div>

              {/* Selfie do Rosto */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Camera size={14} />
                  <span>Selfie ao Vivo (Sem óculos escuros ou boné)</span>
                </Label>
                <ImageUpload
                  value={form.selfieUrl}
                  onChange={(url) => update("selfieUrl", url)}
                  bucket="identity-vault"
                />
              </div>

              {/* Minivídeo de Liveness */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <VideoCamera size={14} />
                  <span>Minivídeo de Liveness (3 a 5 segundos gravado com a câmera)</span>
                </Label>
                <ImageUpload
                  value={form.livenessVideoUrl}
                  onChange={(url) => update("livenessVideoUrl", url)}
                  bucket="identity-vault"
                />
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground space-y-1">
                <span className="font-bold text-foreground block">
                  Inteligência de Cross-Check Automatizado:
                </span>
                <p>
                  Nossos algoritmos compararão a geometria da sua face e os dados da CNH com o perfil titular da sua conta. Se os dados pertencerem à mesma pessoa, a aprovação é imediata.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-10 px-4 font-semibold text-xs gap-1.5"
                >
                  <ArrowLeft size={14} weight="bold" />
                  <span>Voltar</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    if (!form.selfieUrl || !form.livenessVideoUrl) {
                      toast.error("Por favor, tire a selfie e anexe o minivídeo de prova de vida.");
                      return;
                    }
                    setStep(3);
                  }}
                  className="rounded-xl h-10 px-5 font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-1.5 cursor-pointer"
                >
                  <span>Avançar para Termos de Autonomia</span>
                  <ArrowRight size={14} weight="bold" />
                </Button>
              </div>
            </div>
          )}

          {/* ── PASSO 3: TERMOS DE AUTONOMIA, NÃO-VÍNCULO & SEGURANÇA ── */}
          {step === 3 && (
            <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Scales size={18} weight="bold" className="text-primary" />
                  <span>Termos de Parceria e Garantias de Liberdade</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Conheça seus direitos inegociáveis de profissional autônomo na plataforma Waesy.
                </p>
              </div>

              {/* Caixa com o Texto Legal Canônico */}
              <div className="h-64 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs space-y-3 leading-relaxed text-foreground/90 font-mono">
                <p className="font-bold text-foreground">
                  TERMOS E CONDIÇÕES PARA ENTREGADORES E MOTORISTAS PARCEIROS (v4.0)
                </p>
                <p>
                  <strong>1. INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO:</strong> A relação entre o Entregador e a plataforma Waesy é estritamente comercial de intermediação tecnológica. Não há relação de emprego, subordinação jurídica, exclusividade ou dependência econômica sob a CLT.
                </p>
                <p>
                  <strong>2. LIBERDADE DE HORÁRIOS E JORNADA:</strong> O parceiro tem total autonomia para conectar-se e desconectar-se nos dias e horários que desejar, sem cumprimento de horas mínimas.
                </p>
                <p>
                  <strong>3. LIVRE ESCOLHA E NÃO-PUNITIVIDADE:</strong> É garantido ao motorista o direito de aceitar ou recusar qualquer corrida ou entrega. A recusa de chamados NUNCA ensejará punições, suspensões ou desativações.
                </p>
                <p>
                  <strong>4. SEGURANÇA PÚBLICA E ANTECEDENTES:</strong> O parceiro autoriza a checagem regular de antecedentes criminais e mandados de prisão. Constatada tentativa de fraude ou situação de foragido da justiça, as informações serão encaminhadas imediatamente às autoridades policiais competentes.
                </p>
              </div>

              {/* Checkbox de Aceite */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-all">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={(e) => update("termsAccepted", e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-xs text-foreground leading-relaxed">
                  Declaro que li, compreendi e concordo integralmente com os <strong>Termos de Parceria e Autonomia</strong>, reconhecendo a ausência de vínculo empregatício e autorizando a verificação dos meus dados e antecedentes criminais.
                </span>
              </label>

              <div className="flex items-center justify-between pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="rounded-xl h-10 px-4 font-semibold text-xs gap-1.5"
                >
                  <ArrowLeft size={14} weight="bold" />
                  <span>Voltar</span>
                </Button>

                <Button
                  type="submit"
                  disabled={isPending || !form.termsAccepted}
                  className="rounded-xl h-11 px-6 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-2 cursor-pointer shadow-sm"
                >
                  {isPending ? (
                    <span>Processando Biometria...</span>
                  ) : (
                    <>
                      <ShieldCheck size={16} weight="bold" />
                      <span>Concluir Credenciamento</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
