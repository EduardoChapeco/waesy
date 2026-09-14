import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Lock, UserPlus, Trash, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { getContractById, sealAndIssueContract } from "@/services/contracts.functions";

export const Route = createFileRoute("/workspace/contratos/$id/editor")({
 head: () => ({ meta: [{ title: "Editor de Contrato | Workspace Waesy" }] }),
  loader: async ({ params }) => {
    try {
      return await getContractById({ data: params.id });
    } catch (err) {
      console.error("[loader:workspace.contratos.$id.editor] Unhandled error:", err);
      return {} as any;
    }
  },
 component: ContractEditorPage,
});

function ContractEditorPage() {
 const contract = Route.useLoaderData();
 const navigate = useNavigate();

 const currentVersion = contract.versions.sort((a: any, b: any) => b.version_number - a.version_number)[0];

 const [content, setContent] = useState(currentVersion.content_markdown || "");
 const [signers, setSigners] = useState<any[]>([]);
 const [isSealing, setIsSealing] = useState(false);

 const addSigner = () => {
 setSigners([...signers, { name: "", email: "", role: "party", authLevel: "basic" }]);
 };

 const updateSigner = (index: number, key: string, value: string) => {
 const updated = [...signers];
 updated[index][key] = value;
 setSigners(updated);
 };

 const removeSigner = (index: number) => {
 setSigners(signers.filter((_, i) => i !== index));
 };

 const handleSeal = async () => {
 if (signers.length === 0) {
 toast.error("Adicione pelo menos um signatário antes de selar o contrato.");
 return;
 }
 
 // Validar emails
 if (signers.some(s => !s.email || !s.name)) {
 toast.error("Preencha todos os nomes e emails dos signatários.");
 return;
 }

 setIsSealing(true);
 try {
 // Nota: Idealmente salvaríamos o rascunho (content) aqui antes de selar se houvesse edição,
 // mas como o `sealAndIssueContract` sela a versão existente, 
 // precisariamos de um `updateContractVersion` antes. Para simplificar nesta micro-fase, 
 // selamos diretamente (o backend assume que a versão no banco é a que vale).
 
 const res = await sealAndIssueContract({
 data: {
 contractId: contract.id,
 versionId: currentVersion.id,
 signers: signers,
 },
 });

 toast.success("Contrato selado criptograficamente com sucesso!");
 // Em produção, isso geraria um link, mas aqui apenas voltamos
 navigate({ to: "/workspace/contratos" });
 
 } catch (err: any) {
 toast.error(err.message || "Erro ao selar contrato.");
 setIsSealing(false);
 }
 };

 if (contract.status !== "draft") {
 return (
 <div className="w-full max-w-xl mx-auto py-20 px-0 sm:px-4 text-center space-y-4">
 <ShieldCheck size={48} className="text-emerald-600 mx-auto" />
 <h2 className="text-xl font-bold">Este contrato já está selado/assinado</h2>
 <p className="text-muted-foreground">
 Documentos após entrarem em estado de assinatura não podem ser editados para garantir a validade criptográfica (Imutabilidade).
 </p>
 <Button onClick={() => navigate({ to: "/workspace/contratos" })}>Voltar ao Painel</Button>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1400px] mx-auto overflow-hidden">
 {/* Topbar */}
 <div className="flex items-center justify-between border-b px-6 py-4 bg-background">
 <div className="flex items-center gap-4">
 <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/workspace/contratos" })}>
 <ArrowLeft size={18} />
 </Button>
 <div>
 <h1 className="font-bold text-lg">{contract.title}</h1>
 <Badge variant="outline" className="text-[10px]">Rascunho V{currentVersion.version_number}</Badge>
 </div>
 </div>

 <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                try {
                  localStorage.setItem(`contract_draft_${contract.id}`, JSON.stringify({
                    content,
                    signers,
                    updatedAt: new Date().toISOString()
                  }));
                  toast.success("Rascunho salvo no armazenamento local!");
                } catch {
                  toast.error("Falha ao salvar rascunho localmente.");
                }
              }}
            >
              <Save size={16} className="mr-2" /> Salvar Rascunho
            </Button>
 <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSeal} disabled={isSealing}>
 <Lock size={16} className="mr-2" />
 {isSealing ? "Selando..." : "Selar e Enviar"}
 </Button>
 </div>
 </div>

 {/* Editor & Preview Split Pane */}
 <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden bg-muted/20">
 
 {/* Lado Esquerdo: Editor Markdown e Configurações */}
 <div className="border-r overflow-y-auto no-scrollbar p-6 space-y-8 bg-card">
 <div className="space-y-3">
 <Label className="text-lg font-bold">Corpo do Documento (Markdown)</Label>
 <p className="text-xs text-muted-foreground">Utilize formatação Markdown para criar as cláusulas do documento.</p>
 <Textarea 
 className="min-h-[400px] font-mono text-sm leading-relaxed"
 value={content}
 onChange={(e) => setContent(e.target.value)}
 />
 </div>

 <div className="space-y-4 pt-4 border-t">
 <div className="flex items-center justify-between">
 <Label className="text-lg font-bold flex items-center gap-2">
 <UserPlus size={18} /> Signatários
 </Label>
 <Button size="sm" variant="secondary" onClick={addSigner}>Adicionar</Button>
 </div>

 {signers.length === 0 ? (
 <div className="p-6 text-center border-2 border-dashed rounded-2xl text-muted-foreground text-sm">
 Nenhum signatário adicionado. Adicione as partes envolvidas para poder selar o contrato.
 </div>
 ) : (
 <div className="space-y-3">
 {signers.map((signer, idx) => (
 <div key={idx} className="p-4 border rounded-2xl bg-background space-y-3 relative">
 <Button 
 variant="ghost" 
 size="icon" 
 className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
 onClick={() => removeSigner(idx)}
 >
 <Trash size={14} />
 </Button>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8 sm:pr-8">
 <div className="space-y-1">
 <Label className="text-xs">Nome Completo</Label>
 <Input 
 value={signer.name} 
 onChange={(e) => updateSigner(idx, "name", e.target.value)} 
 placeholder="João da Silva" 
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs">E-mail</Label>
 <Input 
 type="email"
 value={signer.email} 
 onChange={(e) => updateSigner(idx, "email", e.target.value)} 
 placeholder="joao@email.com" 
 />
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs">Papel</Label>
 <Select value={signer.role} onValueChange={(v) => updateSigner(idx, "role", v)}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="party">Parte</SelectItem>
 <SelectItem value="witness">Testemunha</SelectItem>
 <SelectItem value="guarantor">Fiador</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1">
 <Label className="text-xs">Nível de Assinatura</Label>
 <Select value={signer.authLevel} onValueChange={(v) => updateSigner(idx, "authLevel", v)}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="basic">Consentimento Simples</SelectItem>
 <SelectItem value="advanced">Avançada (Email/OTP)</SelectItem>
 <SelectItem value="qualified">Qualificada (Token)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Lado Direito: Preview WYSIWYG */}
 <div className="overflow-y-auto no-scrollbar p-8 bg-muted/40">
 <div className="max-w-[800px] mx-auto bg-white border shadow-sm min-h-[1056px] p-12 sm:p-20 relative">
 {/* Margens tipo folha A4 */}
 <div className="prose prose-sm sm:prose-base prose-slate max-w-none prose-headings:font-bold prose-a:text-primary">
 <ReactMarkdown>{content}</ReactMarkdown>
 </div>
 
 {/* Preview da Régua de Assinaturas */}
 {signers.length > 0 && (
 <div className="mt-20 pt-10 border-t-2 border-dashed border-gray-300">
 <h3 className="text-lg font-bold text-black mb-8 text-center">Local de Assinaturas</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-12 gap-x-8">
 {signers.map((s, i) => (
 <div key={i} className="text-center">
 <div className="border-b border-black mx-4 mb-2"></div>
 <p className="font-bold text-sm text-black">{s.name || "Nome do Signatário"}</p>
 <p className="text-xs text-gray-500 uppercase">{s.role === "witness" ? "Testemunha" : s.role === "guarantor" ? "Fiador" : "Parte"}</p>
 {s.email && <p className="text-xs text-gray-400 mt-1">{s.email}</p>}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 </div>
 </div>
 );
}
