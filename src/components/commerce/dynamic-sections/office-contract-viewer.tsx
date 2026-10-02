import React, { useState } from 'react';
import { FileText, ShieldCheck, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractSignPad, SignatureData } from '@/components/office/contract-sign-pad';

interface OfficeContractViewerProps {
 title?: string;
 documentNumber?: string;
 status?: 'pending' | 'signed' | 'cancelled';
 clientName?: string;
 clientCpf?: string;
 content?: string;
 storeName?: string;
 onSignSuccess?: (sig: SignatureData) => void;
}

export function OfficeContractViewer({
 title = 'Contrato de Adesão e Prestação de Serviços',
 documentNumber = 'CTR-2026-0042',
 status = 'pending',
 clientName = 'Cliente Titular',
 clientCpf = '000.000.000-00',
 content = 'Pelo presente instrumento, a CONTRATADA compromete-se a fornecer os produtos e serviços acordados...',
 storeName = 'Empresa Certificada',
 onSignSuccess,
}: OfficeContractViewerProps) {
 const [showSignModal, setShowSignModal] = useState(false);
 const [currentStatus, setCurrentStatus] = useState(status);
 const [signature, setSignature] = useState<SignatureData | null>(null);

 const handleSignComplete = (sigData: SignatureData) => {
 setSignature(sigData);
 setCurrentStatus('signed');
 setShowSignModal(false);
 if (onSignSuccess) onSignSuccess(sigData);
 };

 return (
 <section className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
 <div className="p-6 rounded-lg bg-card border border-border shadow-lg space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div className="flex items-center gap-3">
 <div className="p-3 rounded-lg bg-primary/10 text-primary">
 <FileText className="w-6 h-6" />
 </div>
 <div>
 <span className="text-[11px] font-mono text-muted-foreground">{documentNumber}</span>
 <h2 className="text-lg font-bold text-foreground">{title}</h2>
 <p className="text-xs text-muted-foreground">{storeName}</p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <span
 className={'px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ' + (
 currentStatus === 'signed'
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
 : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
 )}
 >
 {currentStatus === 'signed' ? (
 <>
 <ShieldCheck className="w-3.5 h-3.5" />
 Assinado Digitalmente
 </>
 ) : (
 <>
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
 Aguardando Assinatura
 </>
 )}
 </span>

 {currentStatus === 'pending' && (
 <Button
 type="button"
 onClick={() => setShowSignModal(true)}
 className="min-h-11 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md"
 >
 Assinar Agora
 </Button>
 )}
 </div>
 </div>

 <div className="p-6 rounded-lg bg-muted/20 border border-border/50 text-xs leading-relaxed whitespace-pre-wrap font-serif text-foreground/90 max-h-[350px] overflow-y-auto no-scrollbar">
 {content}
 </div>

 {signature && (
 <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
 <div className="space-y-1">
 <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
 <CheckCircle2 className="w-4 h-4" />
 Assinado por {signature.signerName} ({signature.signerCpf})
 </div>
 <div className="text-[10px] text-muted-foreground font-mono">
 Hash SHA-256: {signature.sha256Hash}
 </div>
 </div>
 <span className="text-[10px] text-muted-foreground">
 MP 2.200-2/2001 · {new Date(signature.signedAt).toLocaleDateString('pt-BR')}
 </span>
 </div>
 )}
 </div>

 {showSignModal && (
 <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="w-full max-w-lg">
 <ContractSignPad
 signerName={clientName}
 signerCpf={clientCpf}
 documentTitle={title}
 documentContent={content}
 onConfirmSignature={handleSignComplete}
 onCancel={() => setShowSignModal(false)}
 />
 </div>
 </div>
 )}
 </section>
 );
}
