import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Share2, Building2, Clock, Calendar, CheckCircle2, User } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

export interface MonthlyTimecardSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyCnpj?: string;
  employeeName: string;
  employeeJobTitle: string;
  employeeCpfMasked?: string;
  employeePis?: string;
  referenceMonth: string; // "YYYY-MM"
  timeEntries: Array<{
    recorded_at: string;
    entry_type: string;
    status: string;
    adjustment_reason?: string;
  }>;
}

export function MonthlyTimecardSheetModal({
  isOpen,
  onClose,
  companyName,
  companyCnpj,
  employeeName,
  employeeJobTitle,
  employeeCpfMasked,
  employeePis,
  referenceMonth,
  timeEntries,
}: MonthlyTimecardSheetModalProps) {
  const [yearStr, monthStr] = referenceMonth.split("-");
  const year = Number(yearStr) || 2026;
  const month = Number(monthStr) || 11;

  // Gerar todos os dias do mês
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(year, month, 0).getDate();
    const list = [];
    const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // Filtrar batidas deste dia
      const dayEntries = timeEntries.filter((e) => e.recorded_at.startsWith(dateIso));

      const in1 = dayEntries.find((e) => e.entry_type === "clock_in")?.recorded_at?.slice(11, 16) || "—";
      const out1 = dayEntries.find((e) => e.entry_type === "lunch_out")?.recorded_at?.slice(11, 16) || "—";
      const in2 = dayEntries.find((e) => e.entry_type === "lunch_in")?.recorded_at?.slice(11, 16) || "—";
      const out2 = dayEntries.find((e) => e.entry_type === "clock_out")?.recorded_at?.slice(11, 16) || "—";

      list.push({
        dayNumber: day,
        dayName: DAY_NAMES[dayOfWeek],
        isWeekend,
        in1,
        out1,
        in2,
        out2,
        totalHours: !isWeekend && in1 !== "—" && out2 !== "—" ? "8h48" : isWeekend ? "DSR" : "—",
        balance: isWeekend ? "—" : in1 !== "—" && out2 !== "—" ? "00:00" : "-08:48",
      });
    }
    return list;
  }, [year, month, timeEntries]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*Espelho de Ponto Mensal - ${companyName}*\n` +
      `Competência: ${String(month).padStart(2, "0")}/${year}\n` +
      `Colaborador: ${employeeName} (${employeeJobTitle})\n` +
      `Conformidade Portaria 671 MTE.\n\n` +
      `Documento pronto para conferência e assinatura.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    toast.success("Link do espelho de ponto compartilhado no WhatsApp!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background max-h-screen flex flex-col">
        {/* Header Ações (Oculto na Impressão) */}
        <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Espelho de Ponto Mensal (Portaria 671 MTE / CLT)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer"
            >
              <Share2 className="size-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer bg-primary text-primary-foreground shadow-2xs"
            >
              <Printer className="size-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </Button>
          </div>
        </div>

        {/* Folha A4 Imprimível */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-card text-foreground font-sans print:p-0 print:overflow-visible">
          <div className="border border-border/80 rounded-lg p-4 sm:p-6 space-y-4  print:rounded-none">
            {/* Cabeçalho */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-border/80 ">
              <div className="sm:col-span-2 space-y-1">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider ">
                  Empregador / Estabelecimento
                </span>
                <h3 className="text-base font-bold text-foreground ">{companyName}</h3>
                {companyCnpj && (
                  <p className="text-xs text-muted-foreground font-mono ">
                    CNPJ: {companyCnpj}
                  </p>
                )}
              </div>

              <div className="sm:text-right space-y-1">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider ">
                  Competência de Ponto
                </span>
                <div className="text-xl font-bold font-mono text-primary ">
                  {String(month).padStart(2, "0")}/{year}
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  Portaria MTE 671/2021
                </Badge>
              </div>
            </div>

            {/* Dados do Colaborador e Horário Contratual */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 bg-muted/20 p-3 rounded-lg border border-border/60 text-xs  ">
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Colaborador</span>
                <p className="font-bold text-foreground ">{employeeName}</p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Cargo</span>
                <p className="font-medium text-foreground ">{employeeJobTitle}</p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">CPF / PIS</span>
                <p className="font-mono text-foreground ">
                  {employeeCpfMasked || "***.***.***-**"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Horário Contratual</span>
                <p className="font-mono text-foreground ">08:00 - 12:00 / 13:12 - 18:00 (44h)</p>
              </div>
            </div>

            {/* Grade de Registros de Ponto do Mês */}
            <div className="border border-border/80 rounded-lg overflow-hidden ">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 font-bold uppercase tracking-wider text-muted-foreground   ">
                    <th className="p-2 w-16 text-center">Dia</th>
                    <th className="p-2 w-16 text-center">Sem</th>
                    <th className="p-2 text-center">Entrada 1</th>
                    <th className="p-2 text-center">Saída 1</th>
                    <th className="p-2 text-center">Entrada 2</th>
                    <th className="p-2 text-center">Saída 2</th>
                    <th className="p-2 text-center">Total</th>
                    <th className="p-2 text-center">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono ">
                  {daysInMonth.map((d) => (
                    <tr
                      key={d.dayNumber}
                      className={d.isWeekend ? "bg-muted/30 text-muted-foreground " : ""}
                    >
                      <td className="p-2 text-center font-bold text-foreground ">
                        {String(d.dayNumber).padStart(2, "0")}
                      </td>
                      <td className="p-2 text-center font-sans font-medium text-muted-foreground ">
                        {d.dayName}
                      </td>
                      <td className="p-2 text-center text-foreground ">{d.in1}</td>
                      <td className="p-2 text-center text-foreground ">{d.out1}</td>
                      <td className="p-2 text-center text-foreground ">{d.in2}</td>
                      <td className="p-2 text-center text-foreground ">{d.out2}</td>
                      <td className="p-2 text-center font-bold text-foreground ">{d.totalHours}</td>
                      <td className="p-2 text-center text-muted-foreground ">{d.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Declaração de Ciência e Assinaturas */}
            <div className="pt-6 border-t-2 border-dashed border-border/80 space-y-4 ">
              <p className="text-xs text-muted-foreground italic leading-relaxed ">
                Reconheço a exatidão e veracidade das anotações constantes neste espelho de ponto eletrônico, referente aos horários efetivamente trabalhados no mês supra indicado, conforme Portaria 671/2021 do MTE.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                <div className="text-center space-y-1">
                  <div className="border-b border-foreground/60 w-full mb-1 " />
                  <p className="text-xs font-bold text-foreground ">{companyName}</p>
                  <p className="text-xs text-muted-foreground ">Assinatura do Empregador / RH</p>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-b border-foreground/60 w-full mb-1 " />
                  <p className="text-xs font-bold text-foreground ">{employeeName}</p>
                  <p className="text-xs text-muted-foreground ">Assinatura do Colaborador</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/40 border-t border-border flex justify-end print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
