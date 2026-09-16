import React from "react";
import {
  ShieldCheck,
  Lock,
  Hash,
  Clock,
  CheckCircle2,
  ExternalLink,
  QrCode,
  FileCheck2,
  Camera,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/datetime";

export interface ManifestSignerInfo {
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: "pending" | "signed";
  signedAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  signatureImageUrl?: string | null;
  facialBiometricsHash?: string | null;
  authLevel?: string;
}

interface ContractAuditManifestProps {
  documentTitle: string;
  category: string;
  verificationCode: string;
  hashSha256: string;
  sealedAt?: string | null;
  signers: ManifestSignerInfo[];
  observers?: Array<{ name: string; email: string; role?: string }>;
  appOrigin?: string;
  className?: string;
  isSettled?: boolean;
  dischargeHash?: string | null;
  dischargeIssuedAt?: string | null;
}

export function ContractAuditManifest({
  documentTitle,
  category,
  verificationCode,
  hashSha256,
  sealedAt,
  signers,
  observers = [],
  appOrigin = "https://waesy.com",
  className = "",
  isSettled = false,
  dischargeHash,
  dischargeIssuedAt,
}: ContractAuditManifestProps) {
  const verifyUrl = `${appOrigin}/verify/document/${verificationCode}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(
    verifyUrl,
  )}`;

  return (
    <div
      id="contract-audit-manifest-sheet"
      className={`w-full bg-card text-card-foreground border border-border/80 rounded-2xl p-6 sm:p-8 space-y-6 print:border-none print:shadow-none ${className}`}
    >
      {/* Cabeçalho Oficial do Protocolo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/70">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-7" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Protocolo de Assinatura & Validade Jurídica
            </h2>
            <p className="text-xs text-muted-foreground">
              Registro Criptográfico Imutável emitido pela Infraestrutura Waesy
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
          Assinatura Avançada · Lei 14.063/2020
        </Badge>
      </div>

      {/* Selo e Certificado Oficial de Quitação (Se Aplicável) */}
      {isSettled && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                Termo de Quitação e Extinção de Obrigações Financeiras
              </span>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono text-[10px] px-2 py-0.5">
              QUITADO · SEM PENDÊNCIAS
            </Badge>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">
            Certificamos que as obrigações financeiras pactuadas neste instrumento foram integralmente adimplidas, conferindo-se quitação plena, geral, irrevogável e irretratável.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            {dischargeIssuedAt && (
              <p className="text-muted-foreground">
                <strong>Data de Liquidação:</strong> {formatDate(dischargeIssuedAt)}
              </p>
            )}
            {dischargeHash && (
              <p className="text-muted-foreground font-mono truncate" title={dischargeHash}>
                <strong>Hash de Quitação:</strong> {dischargeHash.substring(0, 24)}...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Metadados de Autenticidade & Hash SHA-256 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-muted/30 p-4 rounded-xl border border-border/60">
        <div className="space-y-1.5">
          <p className="text-muted-foreground font-medium">Documento:</p>
          <p className="font-semibold text-foreground text-sm truncate">{documentTitle}</p>
          <p className="text-[11px] text-muted-foreground">
            Código Verificador: <span className="font-mono font-bold text-foreground">{verificationCode}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Hash className="size-3.5 text-primary" />
            Hash Criptográfico do Arquivo (SHA-256):
          </p>
          <p className="font-mono text-[10px] break-all bg-background/80 p-2 rounded-lg border border-border/60 text-foreground select-all">
            {hashSha256 || "CÁLCULO CRIPTOGRÁFICO EM ANDAMENTO"}
          </p>
          {sealedAt && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Carimbo de Tempo: {formatDate(sealedAt)} (UTC-3)
            </p>
          )}
        </div>
      </div>

      {/* Tabela Forense de Signatários & Evidências */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <FileCheck2 className="size-4 text-primary" />
          Trilha de Auditoria & Signatários (Audit Trail)
        </h3>

        <div className="space-y-3">
          {signers.map((signer, idx) => {
            const isSigned = signer.status === "signed";
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm truncate">{signer.name}</span>
                    <Badge variant={isSigned ? "default" : "secondary"} className="text-[10px] h-5">
                      {isSigned ? "Assinado" : "Pendente"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground capitalize">
                      ({signer.role === "witness" ? "Testemunha" : "Parte"})
                    </span>
                  </div>

                  <p className="text-muted-foreground text-[11px]">
                    {signer.document ? `CPF/Doc: ${signer.document} · ` : ""}
                    {signer.email || signer.phone || "Contato verificado"}
                  </p>

                  {isSigned && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground pt-1">
                      {signer.signedAt && (
                        <span>Data/Hora: {formatDate(signer.signedAt)}</span>
                      )}
                      {signer.ipAddress && (
                        <span className="font-mono">IP: {signer.ipAddress}</span>
                      )}
                      {signer.facialBiometricsHash && (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <Camera className="size-3" />
                          Biometria Facial Verificada
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Exibição da Assinatura Gráfica */}
                {isSigned && signer.signatureImageUrl && (
                  <div className="shrink-0 bg-white p-2 rounded-lg border border-border/60">
                    <img
                      src={signer.signatureImageUrl}
                      alt={`Assinatura de ${signer.name}`}
                      className="h-9 max-w-[140px] object-contain"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de Observadores (Se houver) */}
      {observers.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Observadores Notificados (Cópia da Auditoria)
          </h4>
          <div className="flex flex-wrap gap-2">
            {observers.map((obs, i) => (
              <Badge key={i} variant="outline" className="text-[11px] py-1 px-2.5">
                {obs.name} ({obs.email})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Bloco de Verificação Universal com QR Code */}
      <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1.5 text-left max-w-md">
          <div className="flex items-center gap-2 font-bold text-foreground text-sm">
            <QrCode className="size-4 text-primary" />
            Validação Pública Instantânea
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Aponte a câmera do seu celular para o QR Code ao lado ou acesse o endereço abaixo para consultar a integridade do arquivo e o certificado digital original.
          </p>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
          >
            {verifyUrl}
            <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="shrink-0 bg-white p-2.5 rounded-xl border border-border/80 shadow-2xs">
          <img
            src={qrImageUrl}
            alt="QR Code para validação pública do contrato"
            className="size-24 object-contain"
          />
        </div>
      </div>

      {/* Rodapé Legal & Fundamentação Jurídica */}
      <div className="border-t border-border/50 pt-4 text-[10px] text-muted-foreground space-y-1 leading-normal">
        <p>
          <strong>Fundamentação Jurídica:</strong> O presente documento eletrônico possui validade jurídica plena nos termos do Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e dos Arts. 4º e 5º da Lei Federal nº 14.063/2020.
        </p>
        <p>
          A autoria e integridade deste instrumento são atestadas pelo cálculo criptográfico SHA-256 e pelo registro auditável de conexões sob a Lei nº 12.965/2014 (Marco Civil da Internet).
        </p>
      </div>
    </div>
  );
}
