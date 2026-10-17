import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitSurveyResponse } from "@/services/events.functions";

interface EventPublicSurveyModalProps {
  eventId: string;
  surveys: any[];
}

export function EventPublicSurveyModal({
  eventId,
  surveys = [],
}: EventPublicSurveyModalProps) {
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (surveys.length === 0) return null;

  const activeSurvey = surveys[0]; // Primeira pesquisa ativa para o público
  const formSchema = activeSurvey.form_schema || {};
  const fields = formSchema.fields || [];

  const handleOpen = () => {
    setSelectedSurvey(activeSurvey);
    setAnswers({});
    setSubmitted(false);
  };

  const handleSelectOption = (fieldId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        let lat: number | undefined;
        let lng: number | undefined;

        if (activeSurvey.require_geofence && typeof navigator !== "undefined" && navigator.geolocation) {
          try {
            const pos: GeolocationPosition = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
            });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch {
            // Segue sem geolocalização se não autorizado
          }
        }

        await submitSurveyResponse({
          data: {
            surveyId: activeSurvey.id,
            eventId,
            respondentName: name.trim() || undefined,
            respondentEmail: email.trim() || undefined,
            answers,
            latitude: lat,
            longitude: lng,
          },
        });

        setSubmitted(true);
        toast.success("Obrigado pelo seu feedback!");
      } catch (err: any) {
        toast.error("Erro ao enviar pesquisa: " + (err?.message || "Tente novamente"));
      }
    });
  };

  return (
    <div className="pt-3 border-t border-border/40">
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 min-h-11 min-w-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <ClipboardList className="size-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-foreground truncate">
              {activeSurvey.title}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {activeSurvey.description || "Ajude a melhorar o evento respondendo a esta rápida pesquisa."}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleOpen}
          className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold shrink-0 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <span>Responder</span>
        </Button>
      </div>

      {selectedSurvey && (
        <Dialog open={Boolean(selectedSurvey)} onOpenChange={() => setSelectedSurvey(null)}>
          <DialogContent className="sm:max-w-md p-6 max-h-full overflow-y-auto rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {selectedSurvey.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Sua resposta nos ajuda a calibrar atrações, estrutura e atendimento.
              </DialogDescription>
            </DialogHeader>

            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="size-14 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-8" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Resposta Registrada!</h4>
                <p className="text-xs text-muted-foreground">
                  Agradecemos imensamente por participar e contribuir com o evento.
                </p>
                <Button
                  onClick={() => setSelectedSurvey(null)}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold mt-2 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {fields.map((f: any, idx: number) => (
                  <div key={f.id} className="space-y-2 p-4 rounded-lg border border-border/60 bg-muted/20">
                    <span className="text-xs font-bold text-foreground block">
                      {idx + 1}. {f.label}
                    </span>

                    {f.type === "select" && f.options && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {f.options.map((opt: any) => {
                          const isSelected = answers[f.id] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectOption(f.id, opt.value)}
                              className={`p-3 min-h-11 rounded-lg text-xs font-semibold text-center border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card text-foreground border-border/70 hover:border-border"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {f.type === "text" && (
                      <Input
                        placeholder="Sua resposta..."
                        className="h-11 min-h-11 rounded-lg text-xs bg-card"
                        value={answers[f.id] || ""}
                        onChange={(e) => handleSelectOption(f.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}

                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Input
                    placeholder="Seu Nome (Opcional)"
                    className="h-11 min-h-11 rounded-lg text-xs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="Seu E-mail (Opcional)"
                    className="h-11 min-h-11 rounded-lg text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <CheckCircle2 className="size-4 mr-2" />
                  <span>{isPending ? "Gravando Resposta..." : "Enviar Avaliação"}</span>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
