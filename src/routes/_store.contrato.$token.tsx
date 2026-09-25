import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
 FileText,
 ShieldCheck,
 CheckCircle,
 Download,
 Calendar,
 Users,
 MapPin,
 Lock,
 ArrowLeft,
 DollarSign,
 AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
 getPublicTravelContractByToken,
 signTravelContract,
 type TravelContractDTO,
} from "@/services/travel-contract.functions";
import { SignaturePad } from "@/components/tourism/contract/signature-pad";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_store/contrato/$token")({
 head: ({ loaderData }: { loaderData?: { contract: TravelContractDTO | null } }) => ({
 meta: [
 {
 title: loaderData?.contract
 ? `Contrato de Viagem: ${loaderData.contract.destination} | Waesy`
 : "Assinatura de Contrato | Waesy",
 },
 ],
 }),
 loader: async ({ params }) => {
   try {
 const contract = await getPublicTravelContractByToken({ data: { token: params.token } });
 return { contract };
   } catch (err) {
     console.error("[loader:_store.contrato.$token] Unhandled loader error:", err);
     return { contract: null };
   }
 },
 component: PublicTravelContractSignaturePage,
});

function PublicTravelContractSignaturePage() {
 const { contract } = ((Route.useLoaderData?.() as any) || {});
 const [signerName, setSignerName] = useState(contract?.client_name || "");
 const [signerDoc, setSignerDoc] = useState(contract?.client_document || "");
 const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
 const [acceptedTerms, setAcceptedTerms] = useState(false);
 const [signedCertificate, setSignedCertificate] = useState<string | null>(
 contract?.certificate_serial || null
 );
 const [isExportingPdf, setIsExportingPdf] = useState(false);

 const signMutation = useMutation({
 mutationFn: () =>
 signTravelContract({
 data: {
 token: contract!.public_token,
 signerName,
 signerDocument: signerDoc,
 signatureImage: signatureDataUrl || undefined,
 },
 }),
 onSuccess: (res) => {
 setSignedCertificate(res.certificateSerial);
 toast.success(res.message);
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao assinar contrato."),
 });

 if (!contract) {
 return (
 <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
 <h2 className="text-lg font-bold text-foreground">Contrato não encontrado</h2>
 <p className="text-xs text-muted-foreground">
 O link de assinatura informado expirou ou é inválido.
 </p>
 <Button asChild size="sm" variant="outline" className="rounded-xl">
 <Link to="/turismo">Voltar ao Início</Link>
 </Button>
 </div>
 );
 }

 const isAlreadySigned = Boolean(contract.signed_at || signedCertificate);

 const handleExportPdf = async () => {
 try {
 setIsExportingPdf(true);
 await exportElementAsPdf(
 "contract-document-view",
 `Contrato_${contract.destination.replace(/\s+/g, "_")}_${contract.public_token}.pdf`
 );
 toast.success("PDF do contrato baixado com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao gerar PDF.");
 } finally {
 setIsExportingPdf(false);
 }
 };

 return (
 <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
 {/* ── 1. TOPO FLUTUANTE DE STATUS ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 sticky top-4 z-20 shadow-xs">
 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground truncate">
 {contract.contract_title}
 </span>
 {isAlreadySigned ? (
 <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
 ✓ Assinado Eletronicamente
 </Badge>
 ) : (
 <Badge variant="outline" className="text-[10px] font-mono font-bold">
 Pendente de Assinatura
 </Badge>
 )}
 </div>
 <p className="text-[11px] text-muted-foreground">
 Agência: <span className="font-bold text-foreground">{contract.agency_name}</span> • Destino: {contract.destination}
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={isExportingPdf}
 onClick={handleExportPdf}
 className="rounded-xl text-xs font-bold gap-1.5 h-9"
 >
 <Download className="size-3.5" />
 <span>{isExportingPdf ? "Gerando..." : "Baixar PDF"}</span>
 </Button>
 </div>
 </div>

 {/* ── 2. CORPO DO CONTRATO EDITORIAL ── */}
 <div
 id="contract-document-view"
 className="p-6 sm:p-10 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-sm space-y-8"
 >
 {/* Cabeçalho do Instrumento Particular */}
 <div className="text-center space-y-2 pb-6 border-b border-slate-200">
 <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 block">
 Instrumento Particular de Intermediação de Serviços Turísticos
 </span>
 <h1 className="text-xl sm:text-2xl font-black text-slate-900">
 Contrato de Prestação de Serviços
 </h1>
 <p className="text-xs text-slate-500 font-mono">
 Código Único do Contrato: #{contract.public_token}
 </p>
 </div>

 {/* Qualificação das Partes */}
 <div className="space-y-3 text-xs leading-relaxed text-slate-800">
 <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
 1. QUALIFICAÇÃO DAS PARTES
 </h3>
 <p>
 <strong>CONTRATADA:</strong> {contract.agency_name}
 {contract.agency_cnpj ? `, inscrita no CNPJ/MF sob o nº ${contract.agency_cnpj}` : ""}
 {contract.agency_address ? `, com sede em ${contract.agency_address}` : ""}.
 </p>
 <p>
 <strong>CONTRATANTE:</strong> {contract.client_name}, inscrito(a) no CPF sob o nº {contract.client_document}
 {contract.client_phone ? `, telefone/WhatsApp ${contract.client_phone}` : ""}
 {contract.client_email ? `, e-mail ${contract.client_email}` : ""}.
 </p>
 </div>

 {/* Resumo dos Serviços & Passageiros */}
 <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
 <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
 2. ESPECIFICAÇÃO DOS SERVIÇOS & PASSAGEIROS
 </h3>
 <p className="font-medium text-slate-800 whitespace-pre-line">
 {contract.package_summary}
 </p>
 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
 <div>
 <span className="text-slate-500 block">Destino:</span>
 <strong className="text-slate-900">{contract.destination}</strong>
 </div>
 <div>
 <span className="text-slate-500 block">Período:</span>
 <strong className="text-slate-900">
 {contract.travel_start_date || "Data a definir"} até {contract.travel_end_date || "Data a definir"}
 </strong>
 </div>
 </div>
 </div>

 {/* Resumo Financeiro & Condições de Pagamento */}
 <div className="space-y-2 p-4 rounded-2xl bg-slate-900 text-white text-xs">
 <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
 3. PREÇO & CONDIÇÕES DE PAGAMENTO
 </span>
 <div className="text-2xl font-black font-mono">
 {formatMoney(contract.total_value_cents)}
 </div>
 <p className="text-slate-300 text-[11px] leading-relaxed">
 {contract.payment_conditions}
 </p>
 </div>

 {/* Cláusulas Contratuais Canônicas */}
 <div className="space-y-4">
 <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200">
 4. CLÁUSULAS CONTRATUAIS GERAIS
 </h3>

 <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
 {contract.clauses.map((cl: any) => (
 <div key={cl.number} className="space-y-1">
 <span className="font-black text-slate-900 block text-[11px]">
 CLÁUSULA {cl.number}ª — {cl.section}
 </span>
 <p>{cl.clause_text}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Certificado de Autenticidade Digital (Se Já Assinado) */}
 {isAlreadySigned && (
 <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 space-y-3">
 <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
 <ShieldCheck className="size-5 text-emerald-600" />
 <span>CERTIFICADO DIGITAL DE AUTENTICIDADE (MP 2.200-2/2001)</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-950 font-mono">
 <div>
 <span className="text-emerald-700/80 block">Signatário:</span>
 <strong>{contract.signatures[0]?.signer_name || signerName}</strong> (CPF: {contract.signatures[0]?.signer_document || signerDoc})
 </div>
 <div>
 <span className="text-emerald-700/80 block">Registro Data/Hora:</span>
 <strong>{contract.signed_at || new Date().toISOString()}</strong>
 </div>
 <div className="sm:col-span-2 pt-1 border-t border-emerald-200/60 break-all">
 <span className="text-emerald-700/80 block">Hash Criptográfico SHA-256:</span>
 <strong className="text-[10px]">{contract.content_hash || "HASH_VALIDATED"}</strong>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* ── 3. FORMULÁRIO DE ASSINATURA ELETRÔNICA MOBILE ── */}
 {!isAlreadySigned && (
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-5 shadow-sm">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Lock className="size-4 text-primary" />
 <span>Assinar Este Contrato Digitalmente</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Confira seus dados e assine no quadro abaixo. Sua assinatura possui plena validade jurídica.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Nome do Signatário *</Label>
 <Input
 value={signerName}
 onChange={(e) => setSignerName(e.target.value)}
 placeholder="Seu nome completo"
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">CPF do Signatário *</Label>
 <Input
 value={signerDoc}
 onChange={(e) => setSignerDoc(e.target.value)}
 placeholder="000.000.000-00"
 className="h-10 text-xs rounded-xl font-mono"
 required
 />
 </div>
 </div>

 {/* Quadro de Assinatura Canvas */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Rubrica / Assinatura Digital</Label>
 <SignaturePad onSave={(dataUrl) => setSignatureDataUrl(dataUrl)} />
 </div>

 {/* Checkbox de Aceite dos Termos */}
 <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground leading-relaxed pt-1">
 <input
 type="checkbox"
 checked={acceptedTerms}
 onChange={(e) => setAcceptedTerms(e.target.checked)}
 className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary"
 />
 <span>
 Declaro que li e concordo integralmente com todas as cláusulas, valores, políticas de cancelamento e termos deste contrato de viagem.
 </span>
 </label>

 <Button
 type="button"
 disabled={signMutation.isPending || !acceptedTerms || !signerName || !signerDoc}
 onClick={() => signMutation.mutate()}
 className="w-full h-12 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-2 cursor-pointer"
 >
 <CheckCircle className="size-4 text-emerald-500" />
 <span>{signMutation.isPending ? "Validando e gerando certificado..." : "Assinar Contrato Eletronicamente"}</span>
 </Button>
 </div>
 )}
 </div>
 );
}
