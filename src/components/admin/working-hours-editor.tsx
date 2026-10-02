import { useState } from "react";
import { toast } from "sonner";
import { saveWorkingHours, type WorkingHours } from "@/services/store.functions";
import { BusinessHoursEditor } from "@/components/commerce/business-hours-editor";
import { Button } from "@/components/ui/button";

export function WorkingHoursEditor({ initialData }: { initialData: WorkingHours }) {
  const [schedule, setSchedule] = useState<any>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveWorkingHours({ data: schedule });
      toast.success("Horários salvos");
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao salvar horários");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <BusinessHoursEditor
        value={schedule}
        onChange={(val) => setSchedule(val)}
      />
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="h-11 px-6 rounded-lg font-bold text-xs">
          {isSaving ? "Salvando..." : "Salvar Horários"}
        </Button>
      </div>
    </div>
  );
}
