import React, { useState } from 'react';
import { FileText, Plus, BookOpen, Printer, CheckCircle2, Shield, Eye, Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ContractClauseLibrary, ContractClause, replaceContractVariables, DEFAULT_CLAUSES } from './contract-clause-library';
import { ContractSignPad, SignatureData } from './contract-sign-pad';

interface ContractEditorSheetProps {
 initialTitle?: string;
 storeName?: string;
 onSaveDocument?: (doc: { title: string; content: string; signatures: SignatureData[] }) => void;
 onClose?: () => void;
}

export function ContractEditorSheet({
 initialTitle = 'Contrato de Prestação de Serviços',
 storeName = 'Minha Loja Waesy',
 onSaveDocument,
 onClose,
}: ContractEditorSheetProps) {
 const [title, setTitle] = useState(initialTitle);
 const [clientName, setClientName] = useState('João da Silva');
 const [clientCpf, setClientCpf] = useState('123.456.789-00');
 const [totalValue, setTotalValue] = useState('R$ 2.450,00');
 const [dueDate, setDueDate] = useState('15/10/2026');
 
 const [content, setContent] = useState<string>(
 DEFAULT_CLAUSES.map((c, i) => `${i + 1}. ${c.title}\n${c.content}`).join('\n\n')
 );

 const [activeTab, setActiveTab] = useState<'editor' | 'library' | 'preview' | 'sign'>('editor');
 const [signatures, setSignatures] = useState<SignatureData[]>([]);

 const computedVariables = {
 'cliente.nome': clientName,
 'cliente.cpf': clientCpf,
 'valor_total': totalValue,
 'data_vencimento': dueDate,
 'loja.nome': storeName,
 };

 const previewContent = replaceContractVariables(content, computedVariables);

 const handleInsertClause = (clause: ContractClause) => {
 setContent((prev) => prev + '\n\n' + clause.title + '\n' + clause.content);
 setActiveTab('editor');
 };

 const handleSignatureConfirmed = (sig: SignatureData) => {
 setSignatures((prev) => [...prev, sig]);
 setActiveTab('preview');
 };

 const handleSave = () => {
 if (onSaveDocument) {
 onSaveDocument({
 title,
 content: previewContent,
 signatures,
 });
 }
 };

 return (
 <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
 <div className="w-full max-w-5xl h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
 {/* Header */}
 <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-primary/10 text-primary">
 <FileText className="w-5 h-5" />
 </div>
 <div>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="h-8 font-bold text-sm bg-transparent border-none shadow-none px-0 focus-visible:ring-0 text-foreground"
 />
 <p className="text-[11px] text-muted-foreground">Waesy Office Suite · Editor de Contratos Inteligentes</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <div className="flex items-center bg-muted/60 p-1 rounded-xl gap-1">
 <button
 type="button"
 onClick={() => setActiveTab('editor')}
 className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ' + (
 activeTab === 'editor' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
 )}
 >
 <Edit3 className="w-3.5 h-3.5 inline mr-1" />
 Editor
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('library')}
 className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ' + (
 activeTab === 'library' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
 )}
 >
 <BookOpen className="w-3.5 h-3.5 inline mr-1" />
 Cláusulas
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('preview')}
 className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ' + (
 activeTab === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
 )}
 >
 <Eye className="w-3.5 h-3.5 inline mr-1" />
 Prévia
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('sign')}
 className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ' + (
 activeTab === 'sign' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
 )}
 >
 <Shield className="w-3.5 h-3.5 inline mr-1" />
 Assinar
 </button>
 </div>

 <Button
 type="button"
 onClick={handleSave}
 className="min-h-[40px] px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
 >
 Salvar Contrato
 </Button>

 {onClose && (
 <Button
 type="button"
 variant="ghost"
 onClick={onClose}
 className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 >
 <X className="w-5 h-5" />
 </Button>
 )}
 </div>
 </div>

 {/* Dynamic Variable Bar */}
 <div className="px-6 py-2.5 bg-muted/40 border-b border-border/60 flex flex-wrap items-center gap-3 text-xs">
 <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Variáveis Dinâmicas:</span>
 <div className="flex items-center gap-1.5">
 <span className="text-muted-foreground">Cliente:</span>
 <Input
 value={clientName}
 onChange={(e) => setClientName(e.target.value)}
 className="h-7 w-32 text-xs rounded-lg bg-card"
 />
 </div>
 <div className="flex items-center gap-1.5">
 <span className="text-muted-foreground">CPF:</span>
 <Input
 value={clientCpf}
 onChange={(e) => setClientCpf(e.target.value)}
 className="h-7 w-28 text-xs rounded-lg bg-card"
 />
 </div>
 <div className="flex items-center gap-1.5">
 <span className="text-muted-foreground">Valor:</span>
 <Input
 value={totalValue}
 onChange={(e) => setTotalValue(e.target.value)}
 className="h-7 w-24 text-xs rounded-lg bg-card"
 />
 </div>
 <div className="flex items-center gap-1.5">
 <span className="text-muted-foreground">Vencimento:</span>
 <Input
 value={dueDate}
 onChange={(e) => setDueDate(e.target.value)}
 className="h-7 w-24 text-xs rounded-lg bg-card"
 />
 </div>
 </div>

 {/* Content Body */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-muted/10">
 {activeTab === 'editor' && (
 <div className="h-full flex flex-col space-y-2">
 <Textarea
 value={content}
 onChange={(e) => setContent(e.target.value)}
 placeholder="Insira as cláusulas do contrato..."
 className="flex-1 min-h-[400px] font-mono text-xs leading-relaxed p-4 rounded-2xl bg-card border-border shadow-inner resize-none focus-visible:ring-1"
 />
 <p className="text-[11px] text-muted-foreground">
 Dica: Use tags como <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{'{{cliente.nome}}'}</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{'{{valor_total}}'}</code> para substituição automática.
 </p>
 </div>
 )}

 {activeTab === 'library' && (
 <ContractClauseLibrary onInsertClause={handleInsertClause} />
 )}

 {activeTab === 'preview' && (
 <div className="max-w-3xl mx-auto p-8 bg-card border border-border rounded-2xl shadow-lg space-y-6 text-foreground">
 <div className="text-center border-b border-border/80 pb-4">
 <h2 className="text-xl font-bold uppercase tracking-wider">{title}</h2>
 <p className="text-xs text-muted-foreground mt-1">{storeName}</p>
 </div>

 <div className="text-xs leading-relaxed whitespace-pre-wrap font-serif space-y-4">
 {previewContent}
 </div>

 {signatures.length > 0 && (
 <div className="border-t border-border pt-6 mt-8 space-y-4">
 <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Assinaturas Digitais Registradas (MP 2.200-2/2001)
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {signatures.map((sig, i) => (
 <div key={i} className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
 <img
 src={sig.signatureBase64}
 alt="Assinatura"
 className="h-12 w-auto max-w-[200px] aspect-[4/1] object-contain filter invert dark:invert-0" width={192} height={48} loading="lazy"
 />
 <div className="text-[11px] font-medium text-foreground">
 {sig.signerName} ({sig.signerCpf})
 </div>
 <div className="text-[10px] text-muted-foreground font-mono truncate">
 SHA-256: {sig.sha256Hash}
 </div>
 <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
 Assinado em {new Date(sig.signedAt).toLocaleString('pt-BR')} (IP: {sig.ipAddress})
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {activeTab === 'sign' && (
 <div className="max-w-xl mx-auto">
 <ContractSignPad
 signerName={clientName}
 signerCpf={clientCpf}
 documentTitle={title}
 documentContent={previewContent}
 onConfirmSignature={handleSignatureConfirmed}
 onCancel={() => setActiveTab('editor')}
 />
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
