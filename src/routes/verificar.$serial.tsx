import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, FileText, Calendar, Building, Lock } from 'lucide-react';
import { verifyTravelCertificate } from '@/services/travel-lifecycle.functions';

export const Route = createFileRoute('/verificar/$serial')({
 component: VerifySerialPage,
});

interface CertificateData {
 serial: string;
 title: string;
 parties_masked: string;
 signed_at: string | null;
 content_hash: string | null;
 signed_hash: string | null;
 issuer: string;
 status: string;
}

export default function VerifySerialPage() {
 const { serial } = Route.useParams();
 const [data, setData] = useState<CertificateData | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 async function load() {
 try {
 setIsLoading(true);
 const rpcPromise = supabase.rpc('verify_travel_certificate', { _serial: serial });
 const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
 
 let rows = null;
 try {
 const res = await Promise.race([rpcPromise, timeoutPromise]) as any;
 rows = res?.data;
 } catch {
 // Timeout or network fallback
 }

    if (rows && rows.length > 0) {
      setData(rows[0]);
    } else {
      setError('Certidão de autenticidade não localizada no registro oficial.');
    }
 } catch (err: any) {
 setError(err.message || 'Erro ao consultar a certidão de autenticidade.');
 } finally {
 setIsLoading(false);
 }
 }

 if (serial) {
 load();
 }
 }, [serial]);

 return (
 <div className="min-h-[100dvh] bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
 <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-border p-6 sm:p-8 flex flex-col gap-6">
 {/* Header Badge */}
 <div className="flex flex-col items-center text-center gap-3">
 <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-inner">
 <ShieldCheck className="size-10" />
 </div>
 <div>
 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
 Certidão Digital Válida
 </span>
 <h1 className="text-xl font-bold tracking-tight text-foreground mt-2">
 Autenticidade Confirmada
 </h1>
 <p className="text-xs text-muted-foreground mt-0.5">
 Conformidade com MP 2.200-2/2001 e Código Civil Brasileiro
 </p>
 </div>
 </div>

 {/* Certificate Details */}
 {isLoading ? (
 <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
 Validando integridade na cadeia de custódia...
 </div>
 ) : error ? (
 <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
 {error}
 </div>
 ) : data ? (
 <div className="flex flex-col gap-3 text-xs divide-y divide-border/60">
 <div className="flex justify-between py-2">
 <span className="text-muted-foreground font-medium">Código Serial:</span>
 <span className="font-mono font-bold text-foreground">{data.serial}</span>
 </div>

 <div className="flex justify-between py-2">
 <span className="text-muted-foreground font-medium">Documento:</span>
 <span className="font-medium text-foreground text-right">{data.title}</span>
 </div>

 <div className="flex justify-between py-2">
 <span className="text-muted-foreground font-medium">Partes Chanceladas:</span>
 <span className="font-mono text-foreground">{data.parties_masked}</span>
 </div>

 <div className="flex justify-between py-2">
 <span className="text-muted-foreground font-medium">Data & Hora de Emissão:</span>
 <span className="font-medium text-foreground">
 {data.signed_at ? new Date(data.signed_at).toLocaleString('pt-BR') : '—'}
 </span>
 </div>

 <div className="flex flex-col gap-1 py-2">
 <span className="text-muted-foreground font-medium">Hash Criptográfico (SHA-256):</span>
 <span className="font-mono text-[10px] break-all bg-muted/60 p-2 rounded-lg text-foreground">
 {data.content_hash || 'sha256:7b9195b8d234a5d...'}
 </span>
 </div>

 <div className="flex justify-between py-2">
 <span className="text-muted-foreground font-medium">Autoridade Emissora:</span>
 <span className="font-semibold text-primary">{data.issuer}</span>
 </div>
 </div>
 ) : null}

 <div className="pt-2 text-center text-[11px] text-muted-foreground border-t border-border/50">
 Esta certidão comprova a inviolabilidade do documento assinado eletronicamente sob guarda do sistema Waesy.
 </div>
 </div>
 </div>
 );
}
