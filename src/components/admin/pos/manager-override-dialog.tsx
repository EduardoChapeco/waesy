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
  description = "Digite o PIN do gerente para continuar.",
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
        toast.success("Ação autorizada");
        onSuccess();
        setPin("");
        onClose();
      } else {
        setError("PIN não autorizado.");
      }
    } catch (err: any) {
      setError(err?.message || "PIN inválido ou sem permissão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md w-full p-6 space-y-6">
        <SheetHeader className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
            <Lock className="size-6" />
          </div>
          <SheetTitle className="text-base font-bold text-foreground text-center">{title}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground text-center">{description}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="override-pin" className="sr-only">
              PIN
            </Label>
            <Input
              id="override-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              className="text-center text-2xl tracking-widest h-12 rounded-xl font-mono"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive justify-center bg-destructive/10 p-2.5 rounded-xl border border-destructive/20 font-medium">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <SheetFooter className="sm:justify-between gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-xl text-xs font-semibold">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || pin.length < 4}
              className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground"
            >
              {isLoading ? "Validando..." : "Autorizar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
