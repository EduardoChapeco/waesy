import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RmaWizard } from "@/components/commerce/rma-wizard";

export function ReturnModal({ orderId, items = [] }: { orderId: string; items?: any[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full mt-4 text-xs font-semibold h-11 rounded-lg text-destructive border-destructive hover:bg-destructive/10 cursor-pointer"
      >
        Solicitar Devolução / Troca
      </Button>
      <RmaWizard
        orderId={orderId}
        items={items}
        isOpen={open}
        onClose={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
}
