import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle } from "lucide-react";

import { validateManagerOverride } from "@/services/cash.functions";
import { toast } from "sonner";

interface ManagerOverrideDialogProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
 actionType?: "discount" | "void" | "refund" | "price_override";
 title?: string;
 description?: string;
}

export function ManagerOverrideDialog({
 isOpen,
 onClose,
 onSuccess,
 actionType = "discount",
 title = "Autorização Gerencial",
 description = "Esta ação requer a senha de um gerente para prosseguir.",
}: ManagerOverrideDialogProps) {
 const [pin, setPin] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [isLoading, setIsLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!pin) return;

 setIsLoading(true);
 setError(null);

 try {
 const res = await validateManagerOverride({
 data: {
 pin,
 actionType,
 },
 });

 if (res?.authorized) {
 toast.success(`Autorizado por: ${res.managerName}`);
 onSuccess();
 setPin("");
 onClose();
 } else {
 setError("PIN não autorizado.");
 }
 } catch (err: any) {
 setError(err?.message || "PIN incorreto ou sem permissão gerencial.");
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <SheetContent size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw]">
 <SheetHeader>
 <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning mb-4">
 <Lock className="h-6 w-6 text-warning" />
 </div>
 <SheetTitle className="text-center">{title}</SheetTitle>
 <SheetDescription className="text-center">{description}</SheetDescription>
 </SheetHeader>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="pin" className="sr-only">
 PIN
 </Label>
 <Input
 id="pin"
 type="password"
 inputMode="numeric"
 pattern="[0-9]*"
 autoFocus
 className="text-center text-2xl tracking-widest"
 maxLength={6}
 value={pin}
 onChange={(e) => setPin(e.target.value)}
 placeholder="••••"
 />
 </div>

 {error && (
 <div className="flex items-center gap-2 text-sm text-destructive justify-center bg-destructive/10 p-2 rounded">
 <AlertCircle className="size-4" />
 <span>{error}</span>
 </div>
 )}

 <SheetFooter className="sm:justify-between mt-8">
 <Button type="button" variant="ghost" onClick={onClose}>
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isLoading || pin.length < 4}
 className="bg-warning hover:bg-warning"
 >
 {isLoading ? "Validando..." : "Autorizar"}
 </Button>
 </SheetFooter>
 </form>
 </SheetContent>
 </Sheet>
 );
}
