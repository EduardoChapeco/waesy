import { Link } from "@tanstack/react-router";
import { Handshake, Loader2, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyField } from "@/components/ui/currency-field";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";

interface ClassifiedProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerContext: string;
  classified: any;
  proposalPriceCents: number | undefined;
  setProposalPriceCents: (val: number | undefined) => void;
  proposalPaymentMethod: string;
  setProposalPaymentMethod: (val: string) => void;
  proposalInstallments: string;
  setProposalInstallments: (val: string) => void;
  proposalDepositCents: number | undefined;
  setProposalDepositCents: (val: number | undefined) => void;
  proposalTerms: string;
  setProposalTerms: (val: string) => void;
  customAnswers: Record<string, any>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  handleSendProposal: () => Promise<void>;
  isSendingProposal: boolean;
}

export function ClassifiedProposalDialog({
  open,
  onOpenChange,
  viewerContext,
  classified,
  proposalPriceCents,
  setProposalPriceCents,
  proposalPaymentMethod,
  setProposalPaymentMethod,
  proposalInstallments,
  setProposalInstallments,
  proposalDepositCents,
  setProposalDepositCents,
  proposalTerms,
  setProposalTerms,
  customAnswers,
  setCustomAnswers,
  handleSendProposal,
  isSendingProposal,
}: ClassifiedProposalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg max-h-screen overflow-y-auto">
        {viewerContext === "anonymous" ? (
          <div className="text-center py-6 space-y-4">
            <Handshake className="size-10 text-primary mx-auto" />
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                Identifique-se para negociar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Para enviar propostas, negociar valores e trocar itens com segurança,
                faça login na sua conta Waesy.
              </DialogDescription>
            </div>
            <Button
              asChild
              className="w-full h-11 rounded-lg font-bold bg-primary text-primary-foreground text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link
                to="/entrar"
                search={{ returnUrl: `/classificados/${classified?.id}` }}
              >
                Entrar na Minha Conta
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Handshake className="size-5 text-primary" />
                <span>Enviar Proposta de Negociação</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Envie uma oferta formal para o anunciante. O valor e os termos ficarão
                registrados com segurança.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Sua Oferta de Preço (R$) *
                </label>
                <CurrencyField
                  value={proposalPriceCents}
                  onChange={setProposalPriceCents}
                  placeholder="0,00"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Meio de Pagamento Desejado *</span>
                    <span className="text-xs text-muted-foreground font-normal">Condições aceitas pelo anúncio</span>
                  </label>
                  <Select value={proposalPaymentMethod} onValueChange={setProposalPaymentMethod}>
                    <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                      <SelectValue placeholder="Selecione o meio de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">
                        PIX à Vista {classified?.attributes?.pix_discount_percent ? `(${classified.attributes.pix_discount_percent}% de desconto)` : ""}
                      </SelectItem>
                      <SelectItem value="cartao_credito">
                        Cartão de Crédito {Number(classified?.attributes?.max_installments) > 1 ? `(até ${classified.attributes.max_installments}x)` : ""}
                      </SelectItem>
                      <SelectItem value="boleto">
                        Boleto Bancário à Vista
                      </SelectItem>
                      <SelectItem value="boleto_parcelado">
                        Boleto Parcelado Direto {Number(classified?.attributes?.max_boleto_installments) > 1 ? `(até ${classified.attributes.max_boleto_installments}x)` : ""}
                      </SelectItem>
                      <SelectItem value="carne_digital">
                        Carnê Digital da Loja / Crediário {Number(classified?.attributes?.max_carne_installments) > 1 ? `(até ${classified.attributes.max_carne_installments}x)` : ""}
                      </SelectItem>
                      <SelectItem value="dinheiro">
                        Dinheiro em Espécie (na entrega / retirada)
                      </SelectItem>
                      <SelectItem value="permuta">
                        Permuta / Troca por outro item
                      </SelectItem>
                      <SelectItem value="financiamento">
                        Financiamento Bancário / Consórcio
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(proposalPaymentMethod === "cartao_credito" || proposalPaymentMethod === "carne_digital" || proposalPaymentMethod === "boleto_parcelado") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/20 border border-border">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground">
                        Número de Parcelas
                      </label>
                      <Select
                        value={proposalInstallments}
                        onValueChange={setProposalInstallments}
                      >
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            {
                              length: Math.min(24, Math.max(1,
                                proposalPaymentMethod === "carne_digital"
                                  ? (Number(classified?.attributes?.max_carne_installments) || 1)
                                  : proposalPaymentMethod === "boleto_parcelado"
                                  ? (Number(classified?.attributes?.max_boleto_installments) || 1)
                                  : (Number(classified?.attributes?.max_installments) || 1)
                              ))
                            },
                            (_, i) => i + 1
                          ).map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}x {proposalPriceCents && proposalPriceCents > 0 ? `de ${formatMoney(Math.round(Math.max(0, proposalPriceCents - (proposalDepositCents || 0)) / n))}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground">
                        Sinal / Entrada (R$)
                      </label>
                      <CurrencyField
                        value={proposalDepositCents}
                        onChange={setProposalDepositCents}
                        placeholder="0,00"
                        className="h-11 rounded-lg text-xs bg-background"
                      />
                    </div>
                  </div>
                )}

                {proposalPaymentMethod === "carne_digital" && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/80 flex items-start gap-2">
                    <BookOpenCheck className="size-4 text-primary shrink-0 mt-1" />
                    <span>
                      Ao aprovar esta proposta, o vendedor poderá emitir seu <strong>Carnê Digital</strong> oficial. Você acompanhará os boletos, datas e comprovantes em <strong>Minha Conta &gt; Carnês</strong>.
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Termos ou Condições Especiais
                </label>
                <Textarea
                  value={proposalTerms}
                  onChange={(e) => setProposalTerms(e.target.value)}
                  placeholder="Ex: Retiro no sábado, parcelamento combinado..."
                  rows={3}
                  className="rounded-lg text-xs bg-background resize-none leading-relaxed"
                />
              </div>

              {classified?.store?.custom_inquiry_fields && classified.store.custom_inquiry_fields.length > 0 && (
                <div className="space-y-3 pt-3 pb-1 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Perguntas Adicionais do Vendedor
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded font-medium">
                      Personalizado pela loja
                    </span>
                  </div>
                  {classified.store.custom_inquiry_fields.map((field: any) => (
                    <div key={field.id} className="space-y-1">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <span>{field.label}</span>
                        {field.required && <span className="text-destructive font-bold">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <Textarea
                          value={customAnswers[field.id] || ""}
                          onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder="Sua resposta..."
                          rows={2}
                          className="rounded-lg text-xs bg-background resize-none leading-relaxed"
                        />
                      ) : field.type === "checkbox" ? (
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(customAnswers[field.id])}
                            onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.checked }))}
                            className="size-4 rounded accent-primary"
                          />
                          <span className="text-xs text-muted-foreground">{field.label}</span>
                        </label>
                      ) : (
                        <Input
                          type="text"
                          value={customAnswers[field.id] || ""}
                          onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder="Sua resposta..."
                          className="h-11 rounded-lg text-xs bg-background"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleSendProposal} /* focus-visible: */
                disabled={isSendingProposal}
                className="w-full h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isSendingProposal ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Enviando Proposta...</span>
                  </>
                ) : (
                  <>
                    <Handshake className="size-4" />
                    <span>Confirmar e Enviar Proposta</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
