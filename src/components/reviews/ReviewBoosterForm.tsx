import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, HeartHandshake, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { submitPublicReviewBoosterFn } from "@/services/review-booster.functions";

interface ReviewBoosterFormProps {
  token: string;
  storeName: string;
  initialCustomerName?: string;
  destinationOrItem?: string | null;
  initialGmbUrl: string;
}

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function ReviewBoosterForm({
  token,
  storeName,
  initialCustomerName = "",
  destinationOrItem,
  initialGmbUrl,
}: ReviewBoosterFormProps) {
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [npsScore, setNpsScore] = useState<number | null>(10);
  const [highlightMoment, setHighlightMoment] = useState("");
  const [serviceQuality, setServiceQuality] = useState("o cuidado e suporte da equipe do início ao fim");
  const [wouldRecommendReason, setWouldRecommendReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    routingDecision: "public_gmb" | "private_retention";
    testimonialCompiled: string;
    gmbReviewUrl: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (npsScore === null) {
      toast.error("Selecione uma nota de 0 a 10.");
      return;
    }
    if (customerName.trim().length < 2 || highlightMoment.trim().length < 3) {
      toast.error("Preencha seu nome e o que mais marcou sua experiência.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitPublicReviewBoosterFn({
        data: {
          token,
          customerName: customerName.trim(),
          npsScore,
          highlightMoment: highlightMoment.trim(),
          serviceQuality: serviceQuality.trim(),
          wouldRecommendReason: wouldRecommendReason.trim() || undefined,
        },
      });
      setResult({
        routingDecision: res.routingDecision,
        testimonialCompiled: res.testimonialCompiled,
        gmbReviewUrl: res.gmbReviewUrl || initialGmbUrl,
      });
      toast.success("Avaliação registrada.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar avaliação.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyAndOpenGmb = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.testimonialCompiled);
      toast.success("Depoimento copiado! Cole no Google Meu Negócio.");
    } catch {
      toast.info("Copie o texto abaixo e publique no Google.");
    }
    window.open(result.gmbReviewUrl, "_blank", "noopener,noreferrer");
  };

  if (result) {
    if (result.routingDecision === "public_gmb") {
      return (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5 text-center">
          <CheckCircle2 className="size-10 text-primary mx-auto" />
          <div className="space-y-1">
            <Badge variant="default" className="text-xs">Cliente Promotor</Badge>
            <h2 className="text-lg font-bold text-foreground">Que alegria saber que você adorou!</h2>
            <p className="text-xs text-muted-foreground">
              Montamos seu depoimento com base nas suas respostas. Com 1 clique você copia e publica no Google:
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-left text-xs text-foreground leading-relaxed">
            {result.testimonialCompiled}
          </div>
          <Button
            type="button"
            onClick={handleCopyAndOpenGmb}
            className="w-full h-11 min-h-11 rounded-lg font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Copy className="size-4" />
            <span>Copiar Depoimento e Abrir Google</span>
            <ExternalLink className="size-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-center">
        <HeartHandshake className="size-10 text-primary mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Agradecemos sua sinceridade</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Seu relato foi encaminhado diretamente à diretoria da {storeName} com prioridade para cuidarmos de cada detalhe.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-primary" />
          <h1 className="text-base font-bold text-foreground">Avalie sua experiência com {storeName}</h1>
        </div>
        {destinationOrItem && (
          <p className="text-xs text-muted-foreground">Referência: {destinationOrItem}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground block">
          De 0 a 10, o quanto você recomendaria a {storeName}?
        </label>
        <div className="flex flex-wrap gap-2">
          {SCORES.map((score) => {
            const active = npsScore === score;
            return (
              <button
                key={score}
                type="button"
                onClick={() => setNpsScore(score)}
                className={`h-11 min-h-11 min-w-11 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {score}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-foreground" htmlFor="rv-name">
          Seu nome
        </label>
        <Input
          id="rv-name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Como podemos identificar você"
          className="h-11"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-foreground" htmlFor="rv-highlight">
          {npsScore !== null && npsScore >= 8
            ? "Qual foi o ponto alto ou momento mais marcante?"
            : "O que poderíamos ter feito melhor na sua experiência?"}
        </label>
        <Textarea
          id="rv-highlight"
          rows={3}
          value={highlightMoment}
          onChange={(e) => setHighlightMoment(e.target.value)}
          placeholder="Conte em 1 ou 2 frases..."
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-foreground" htmlFor="rv-service">
          Como foi o atendimento da nossa equipe?
        </label>
        <Input
          id="rv-service"
          value={serviceQuality}
          onChange={(e) => setServiceQuality(e.target.value)}
          className="h-11"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-11 min-h-11 rounded-lg font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {submitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="size-4" />}
        <span>{submitting ? "Enviando..." : "Concluir Avaliação"}</span>
      </Button>
    </form>
  );
}
