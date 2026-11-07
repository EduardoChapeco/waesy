import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Share2, CheckCircle2, Clock, Building2, User, ShieldCheck, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export interface OfficialPayslipData {
  companyName: string;
  companyCnpj?: string;
  companyAddress?: string;
  employeeName: string;
  employeeCpfMasked?: string;
  employeeRole: string;
  employeeCbo?: string;
  employeeDepartment?: string;
  employeeHireDate?: string;
  referencePeriod: string; // "YYYY-MM"
  paymentDate?: string;
  baseSalaryCents: number;
  grossSalaryCents: number;
  netSalaryCents: number;
  inssDiscountCents: number;
  irrfDiscountCents: number;
  fgtsProvisionCents: number;
  salaryBreakdown: Array<{
    code: string;
    description: string;
    reference?: string;
    type: "earning" | "deduction" | "neutral";
    amount_cents: number;
  }>;
  bases?: {
    baseINSSCents: number;
    baseFIBGTSCents: number;
    baseIRRFCents: number;
    aliquotINSSAverage?: number;
    aliquotIRRFNominal?: number;
  };
  status?: "draft" | "issued" | "paid" | "acknowledged";
  acknowledgedAt?: string;
}

interface OfficialPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OfficialPayslipData | null;
}

export function OfficialPayslipModal({ isOpen, onClose, data }: OfficialPayslipModalProps) {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*Holerite Digital - ${data.companyName}*\n` +
      `Competência: ${data.referencePeriod}\n` +
      `Colaborador: ${data.employeeName}\n` +
      `Salário Bruto: ${formatMoney(data.grossSalaryCents)}\n` +
      `Descontos Oficiais: ${formatMoney(data.grossSalaryCents - data.netSalaryCents)}\n` +
      `*Valor Líquido a Receber: ${formatMoney(data.netSalaryCents)}*\n` +
      `FGTS Depositado (8%): ${formatMoney(data.fgtsProvisionCents)}\n\n` +
      `Disponível no seu Portal do Colaborador Waesy.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    toast.success("Resumo do holerite enviado para o WhatsApp!");
  };

  const earnings = data.salaryBreakdown.filter((item) => item.type === "earning");
  const deductions = data.salaryBreakdown.filter((item) => item.type === "deduction");
  const totalEarningsCents = earnings.reduce((sum, item) => sum + item.amount_cents, 0);
  const totalDeductionsCents = deductions.reduce((sum, item) => sum + item.amount_cents, 0);

  // Formatar competência "2026-10" para "10/2026"
  const formattedPeriod = (() => {
    const parts = data.referencePeriod.split("-");
    return parts.length === 2 ? `${parts[1]}/${parts[0]}` : data.referencePeriod;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background max-h-screen flex flex-col">
        {/* Header de Ações (Oculto na Impressão) */}
        <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Recibo de Pagamento de Salário (Holerite CLT / Oficial)
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

        {/* Folha Contábil Renderizada (Área Imprimível A4) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-card text-foreground font-sans print:p-0 print:overflow-visible">
          <div className="border border-border/80 rounded-lg p-4 sm:p-6 space-y-4  print:rounded-none">
            {/* Topo do Empregador e Competência */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-border/80 ">
              <div className="sm:col-span-2 space-y-1">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider ">
                  Empregador / Razão Social
                </span>
                <h3 className="text-base font-bold text-foreground ">{data.companyName}</h3>
                {data.companyCnpj && (
                  <p className="text-xs text-muted-foreground font-mono ">
                    CNPJ: {data.companyCnpj}
                  </p>
                )}
                {data.companyAddress && (
                  <p className="text-xs text-muted-foreground ">{data.companyAddress}</p>
                )}
              </div>

              <div className="sm:text-right space-y-1 bg-muted/30 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider ">
                  Recibo de Salário
                </span>
                <div className="text-xl font-bold font-mono text-primary ">
                  {formattedPeriod}
                </div>
                <div className="flex sm:justify-end">
                  <Badge variant="outline" className="text-xs font-bold gap-1">
                    {data.status === "acknowledged" ? (
                      <>
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        <span>Assinado Digitalmente</span>
                      </>
                    ) : (
                      <>
                        <Clock className="size-3 text-muted-foreground" />
                        <span>Competência Vigente</span>
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Dados do Colaborador */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 bg-muted/20 p-3 rounded-lg border border-border/60 text-xs  ">
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Colaborador</span>
                <p className="font-bold text-foreground text-sm ">{data.employeeName}</p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Cargo / Função</span>
                <p className="font-medium text-foreground ">
                  {data.employeeRole} {data.employeeCbo ? `(${data.employeeCbo})` : ""}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Departamento / Setor</span>
                <p className="font-medium text-foreground ">
                  {data.employeeDepartment || "Operações"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">CPF / Matrícula</span>
                <p className="font-mono font-medium text-foreground ">
                  {data.employeeCpfMasked || "***.***.***-**"}
                </p>
              </div>
            </div>

            {/* Grade de Rubricas Contábeis */}
            <div className="border border-border/80 rounded-lg overflow-hidden ">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 font-bold uppercase tracking-wider text-muted-foreground   ">
                    <th className="p-2 w-16">Cód</th>
                    <th className="p-2">Descrição da Verba</th>
                    <th className="p-2 w-24 text-center">Referência</th>
                    <th className="p-2 w-32 text-right">Vencimentos (R$)</th>
                    <th className="p-2 w-32 text-right">Descontos (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 ">
                  {data.salaryBreakdown.map((item, idx) => (
                    <tr
                      key={`${item.code}-${idx}`}
                      className={item.type === "neutral" ? "bg-muted/20 text-muted-foreground italic " : ""}
                    >
                      <td className="p-2 font-mono text-muted-foreground ">{item.code}</td>
                      <td className="p-2 font-medium text-foreground ">{item.description}</td>
                      <td className="p-2 text-center font-mono text-muted-foreground ">
                        {item.reference || "—"}
                      </td>
                      <td className="p-2 text-right font-mono font-medium text-foreground ">
                        {item.type === "earning" ? formatMoney(item.amount_cents) : "—"}
                      </td>
                      <td className="p-2 text-right font-mono font-medium text-rose-600 dark:text-rose-400 ">
                        {item.type === "deduction" ? formatMoney(item.amount_cents) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totais de Vencimentos, Descontos e Salário Líquido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border border-border/80  ">
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground ">Total de Vencimentos</span>
                <p className="text-lg font-mono font-bold text-foreground ">
                  {formatMoney(totalEarningsCents)}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground ">Total de Descontos</span>
                <p className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400 ">
                  -{formatMoney(totalDeductionsCents)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 sm:text-right  ">
                <span className="text-xs uppercase font-bold text-primary ">Valor Líquido a Receber</span>
                <p className="text-2xl font-mono font-bold text-primary ">
                  {formatMoney(data.netSalaryCents)}
                </p>
              </div>
            </div>

            {/* Quadro de Bases Legais (INSS, FGTS, IRRF) */}
            <div className="border border-border/80 rounded-lg p-3 bg-muted/20 text-xs grid grid-cols-2 sm:grid-cols-5 gap-3  ">
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Salário Base</span>
                <p className="font-mono font-bold text-foreground ">{formatMoney(data.baseSalaryCents)}</p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Sal. Contr. INSS</span>
                <p className="font-mono font-bold text-foreground ">
                  {formatMoney(data.bases?.baseINSSCents || data.grossSalaryCents)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Base Cálc. FGTS</span>
                <p className="font-mono font-bold text-foreground ">
                  {formatMoney(data.bases?.baseFIBGTSCents || data.grossSalaryCents)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">FGTS do Mês (8%)</span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 ">
                  {formatMoney(data.fgtsProvisionCents)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground uppercase font-bold ">Base Cálc. IRRF</span>
                <p className="font-mono font-bold text-foreground ">
                  {formatMoney(data.bases?.baseIRRFCents || Math.max(0, data.grossSalaryCents - data.inssDiscountCents))}
                </p>
              </div>
            </div>

            {/* Canhoto Destacável de Quitação */}
            <div className="pt-6 border-t-2 border-dashed border-border/80 space-y-4 ">
              <p className="text-xs text-muted-foreground italic leading-relaxed ">
                DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO, DISCRIMINADA ACIMA, CORRESPONDENTE À REMUNERAÇÃO DO MÊS INDICADO, NADA MAIS TENDO A RECLAMAR A QUALQUER TÍTULO.
              </p>

              <div className="flex flex-col sm:flex-row items-end justify-between gap-6 pt-4">
                <div className="space-y-1 text-xs">
                  <span className="text-muted-foreground font-bold ">Data do Pagamento:</span>
                  <p className="font-mono text-foreground ">{data.paymentDate || "___/___/2026"}</p>
                </div>

                <div className="w-full sm:w-80 text-center space-y-1">
                  <div className="border-b border-foreground/60 w-full mb-1 " />
                  <p className="text-xs font-bold text-foreground ">{data.employeeName}</p>
                  <p className="text-xs text-muted-foreground ">Assinatura do Colaborador</p>
                  {data.acknowledgedAt && (
                    <p className="text-xs font-mono text-emerald-600 ">
                      Autenticado Digitalmente em: {new Date(data.acknowledgedAt).toLocaleString("pt-BR")}
                    </p>
                  )}
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
