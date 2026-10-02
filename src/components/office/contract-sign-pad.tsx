import React, { useRef, useState, useEffect } from 'react';
import { Eraser, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SignatureData {
 signatureBase64: string;
 sha256Hash: string;
 signedAt: string;
 signerName: string;
 signerCpf: string;
 ipAddress: string;
 userAgent: string;
 legalNotice: string;
}

interface ContractSignPadProps {
 signerName: string;
 signerCpf: string;
 documentTitle: string;
 documentContent: string;
 onConfirmSignature: (signature: SignatureData) => void;
 onCancel?: () => void;
 className?: string;
}

export function ContractSignPad({
 signerName,
 signerCpf,
 documentTitle,
 documentContent,
 onConfirmSignature,
 onCancel,
 className = '',
}: ContractSignPadProps) {
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const [isDrawing, setIsDrawing] = useState(false);
 const [hasDrawn, setHasDrawn] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [ipAddress, setIpAddress] = useState('127.0.0.1');

 useEffect(() => {
 fetch('https://api.ipify.org?format=json')
 .then((res) => res.json())
 .then((data) => setIpAddress(data.ip || '127.0.0.1'))
 .catch(() => setIpAddress('127.0.0.1'));
 }, []);

 const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
 e.preventDefault();
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 const rect = canvas.getBoundingClientRect();
 const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
 const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
 const x = clientX - rect.left;
 const y = clientY - rect.top;

 ctx.beginPath();
 ctx.moveTo(x, y);
 setIsDrawing(true);
 setHasDrawn(true);
 };

 const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
 if (!isDrawing) return;
 e.preventDefault();
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 const rect = canvas.getBoundingClientRect();
 const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
 const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
 const x = clientX - rect.left;
 const y = clientY - rect.top;

 ctx.lineWidth = 2.5;
 ctx.lineCap = 'round';
 ctx.lineJoin = 'round';
 ctx.strokeStyle = '#0f172a';
 ctx.lineTo(x, y);
 ctx.stroke();
 };

 const stopDrawing = () => {
 setIsDrawing(false);
 };

 const clearCanvas = () => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;
 ctx.clearRect(0, 0, canvas.width, canvas.height);
 setHasDrawn(false);
 };

 const computeSha256 = async (content: string): Promise<string> => {
 const enc = new TextEncoder();
 const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(content));
 return Array.from(new Uint8Array(hashBuf))
 .map((b) => b.toString(16).padStart(2, '0'))
 .join('');
 };

 const handleConfirm = async () => {
 if (!hasDrawn || !canvasRef.current) return;
 setIsSubmitting(true);
 try {
 const signatureBase64 = canvasRef.current.toDataURL('image/png');
 const timestamp = new Date().toISOString();
 const rawStringToHash = 'DOC:' + documentTitle + '|SIGNER:' + signerName + '|' + signerCpf + '|TIME:' + timestamp + '|IP:' + ipAddress + '|LEN:' + documentContent.length;
 const sha256Hash = await computeSha256(rawStringToHash);

 const payload: SignatureData = {
 signatureBase64,
 sha256Hash,
 signedAt: timestamp,
 signerName,
 signerCpf,
 ipAddress,
 userAgent: navigator.userAgent,
 legalNotice: 'Assinatura eletrônica realizada em conformidade com a MP 2.200-2/2001 e Lei 14.063/2020.',
 };

 onConfirmSignature(payload);
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className={'p-6 rounded-lg bg-card border border-border shadow-xl space-y-5 ' + className}>
 <div className="flex items-start justify-between">
 <div>
 <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
 <ShieldCheck className="w-4 h-4 text-emerald-500" />
 Assinador Digital de Contratos
 </div>
 <h3 className="text-lg font-bold text-foreground mt-1">
 {documentTitle || 'Documento Oficial'}
 </h3>
 <p className="text-xs text-muted-foreground mt-1">
 Signatário: <span className="font-medium text-foreground">{signerName}</span> ({signerCpf})
 </p>
 </div>
 <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 MP 2.200-2/2001
 </div>
 </div>

 <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground flex items-center gap-3">
 <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
 <span>
 Desenhe sua assinatura no quadro abaixo utilizando o mouse ou a tela touch do seu celular.
 </span>
 </div>

 <div className="relative border-2 border-dashed border-border/80 rounded-lg bg-white overflow-hidden shadow-inner">
 <canvas
 ref={canvasRef}
 width={500}
 height={200}
 className="w-full h-[200px] touch-none cursor-crosshair block"
 onMouseDown={startDrawing}
 onMouseMove={draw}
 onMouseUp={stopDrawing}
 onMouseLeave={stopDrawing}
 onTouchStart={startDrawing}
 onTouchMove={draw}
 onTouchEnd={stopDrawing}
 />
 <div className="absolute bottom-2 left-4 right-4 pointer-events-none flex justify-between items-center text-[10px] text-slate-400 font-mono">
 <span>X_______________________________________</span>
 <span>Área de captura biométrica</span>
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={clearCanvas}
 className="min-h-11 px-4 rounded-lg border-border text-xs flex items-center gap-2 text-muted-foreground hover:text-foreground"
 >
 <Eraser className="w-4 h-4" />
 Limpar Traçado
 </Button>

 <div className="flex items-center gap-2">
 {onCancel && (
 <Button
 type="button"
 variant="ghost"
 onClick={onCancel}
 className="min-h-11 px-4 rounded-lg text-xs text-muted-foreground"
 >
 Cancelar
 </Button>
 )}
 <Button
 type="button"
 disabled={!hasDrawn || isSubmitting}
 onClick={handleConfirm}
 className="min-h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
 >
 <CheckCircle2 className="w-4 h-4" />
 {isSubmitting ? 'Gravando Hash...' : 'Concluir Assinatura Digital'}
 </Button>
 </div>
 </div>
 </div>
 );
}
