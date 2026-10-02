import * as React from "react";
import { useState } from "react";
import { AlertCircle, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ReputationComplaintModalProps {
 isOpen: boolean;
 onClose: () => void;
 companyName: string;
}

export function ReputationComplaintModal({ isOpen, onClose, companyName }: ReputationComplaintModalProps) {
 const [name, setName] = useState("");
 const [cpf, setCpf] = useState("");
 const [email, setEmail] = useState("");
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim() || !cpf.trim() || !email.trim() || !title.trim() || !description.trim()) {
 toast.error("Por favor, preencha todos os campos obrigatórios.");
 return;
 }

 setIsSubmitting(true);
 setTimeout(() => {
 setIsSubmitting(false);
 onClose();
 toast.success("Protocolo gerado com sucesso! A empresa foi notificada e tem prazo para responder.");
 setName("");
 setCpf("");
 setEmail("");
 setTitle("");
 setDescription("");
 }, 800);
 };

 return (
 <Dialog open={isOpen} onOpenChange={onClose}>
 <DialogContent className="max-w-lg rounded-lg">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
 <AlertCircle className="w-5 h-5" />
 Registrar Manifestação: {companyName}
 </DialogTitle>
 <DialogDescription className="text-xs">
 Seu chamado é auditado e sua identidade é protegida. O CPF é mascarado publicamente.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-4 py-2">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Seu Nome Completo *</label>
 <Input
 type="text"
 required
 placeholder="Ex: Ana Clara Souza"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">CPF (Validação Anti-Fraude) *</label>
 <Input
 type="text"
 required
 placeholder="000.000.000-00"
 value={cpf}
 onChange={(e) => setCpf(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">E-mail para Acompanhamento *</label>
 <Input
 type="email"
 required
 placeholder="seu@email.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Título do Problema *</label>
 <Input
 type="text"
 required
 placeholder="Resuma o ocorrido em poucas palavras"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="min-h-11 rounded-lg text-sm"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Descrição Detalhada do Ocorrido *</label>
 <Textarea
 required
 rows={4}
 placeholder="Descreva o que aconteceu, datas e o que você espera como solução..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="rounded-lg text-xs resize-none"
 />
 </div>

 <DialogFooter className="gap-2 sm:gap-0 pt-2">
 <Button type="button" variant="ghost" onClick={onClose} className="min-h-11">
 Cancelar
 </Button>
 <Button type="submit" disabled={isSubmitting} className="min-h-11 bg-rose-600 hover:bg-rose-700 text-white">
 {isSubmitting ? "Registrando Protocolo..." : "Enviar Reclamação"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
