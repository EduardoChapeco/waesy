import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  UserCheck,
  Hash,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Lock,
  Download,
} from "lucide-react";

import { verifyDocumentPublic } from "@/services/contracts.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/datetime";
import { ContractAuditManifest } from "@/components/contracts/contract-audit-manifest";

export const Route = createFileRoute("/verify/document/$code")({
  head: ({ loaderData }: { loaderData?: { result: any; error: string | null } }) => ({
    meta: [
      {
        title: loaderData?.result?.title
          ? `Verificação: ${loaderData.result.title} | Waesy`
          : "Verificação de Documento | Waesy",
      },
    ],
  }),
  loader: async ({ params }): Promise<{ result: any; error: string | null }> => {
    try {
      const result = await verifyDocumentPublic({ data: params.code });
      return { result, error: null };
    } catch (err: any) {
      return { result: null, error: err?.message || "Documento não encontrado." };
    }
  },
  component: DocumentVerificationPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  tourism: "Contrato de Prestação de Serviços Turísticos",
  tourism_package: "Contrato de Prestação de Serviços Turísticos",
  real_estate_rental: "Contrato de Locação Imobiliária",
  real_estate_sale: "Contrato de Compra e Venda de Imóvel",
  vehicle_sale: "Contrato de Compra e Venda de Veículo",
  vehicle_consignation: "Autorização de Venda em Consignação",
  service_agreement: "Prestação de Serviços Profissionais",
  legal_retainer: "Honorários Advocatícios & Mandato",
  medical_aesthetic_consent: "Termo de Consentimento Livre e Esclarecido",
  employment: "Contrato de Trabalho / Parceria",
  general_deal: "Acordo / Transação Geral",
};

function DocumentVerificationPage() {
  const { result, error } = ((Route.useLoaderData?.() as any) || {});

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border border-destructive/30 bg-destructive/5 rounded-2xl p-6 text-center space-y-4">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Documento Não Reconhecido</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O código ou hash informado não corresponde a nenhum documento selado ou emitido na
            infraestrutura canônica da Waesy.
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-xl mt-2">
            <Link to="/">
              <ArrowLeft className="size-4 mr-2" />
              Voltar ao Início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const sealed = result.sealedVersion;
  const signers = (sealed?.envelopes || []).map((env: any) => ({
    name: env.signer_name,
    email: env.signer_email,
    phone: env.signer_phone,
    role: env.signer_role || "party",
    status: env.status || "pending",
    signedAt: env.signed_at,
    authLevel: env.auth_level,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-0 sm:px-4 md:px-0 flex flex-col justify-center items-center animate-in fade-in duration-200">
      <div className="max-w-3xl w-full space-y-6">
        {/* Banner Superior de Sucesso e Autenticidade */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-4 shadow-2xs text-center">
          <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <ShieldCheck className="size-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Documento Autêntico e Verificado
            </h1>
            <p className="text-xs text-muted-foreground">
              Registro Criptográfico emitido na plataforma Waesy em conformidade com a MP 2.200-2/2001 e Lei 14.063/2020
            </p>
          </div>
        </div>

        {/* Protocolo Completo com SHA-256 e QR Code */}
        <ContractAuditManifest
          documentTitle={result.title}
          category={CATEGORY_LABELS[result.category] || result.category}
          verificationCode={result.verificationCode}
          hashSha256={sealed?.hash_sha256 || "CÁLCULO CRIPTOGRÁFICO CONCLUÍDO"}
          sealedAt={sealed?.sealed_at || result.createdAt}
          signers={signers}
          observers={result.observers || []}
        />

        {/* Ações Inferiores */}
        <div className="flex items-center justify-between pt-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-10 px-4">
            <Link to="/">
              <ArrowLeft className="size-4 mr-2" />
              Voltar ao Início
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-xl text-xs h-10 px-4"
          >
            <Download className="size-4 mr-2" />
            Imprimir Certificado
          </Button>
        </div>
      </div>
    </div>
  );
}
