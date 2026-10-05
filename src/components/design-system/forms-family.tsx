import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CanonicalField,
  CanonicalFieldError,
  CanonicalStepperWizard,
  type WizardStepDefinition,
} from "@/components/ui/canonical";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import { FormInput, AlertCircle, RefreshCw } from "lucide-react";

export function FormsFamily({ mode }: ComponentStateProps) {
  const [val, setVal] = useState("Empresa Modelo Ltda");
  const [city, setCity] = useState("sp");
  const [wizardStep, setWizardStep] = useState(0);
  const [validationAttempt, setValidationAttempt] = useState(0);

  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  const wizardSteps: WizardStepDefinition[] = [
    { id: "step-1", title: "Identificação", description: "Dados fiscais" },
    { id: "step-2", title: "Localização", description: "Endereço" },
    { id: "step-3", title: "Confirmação", description: "Revisão final" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família Formulários e Wizard</h2>
        <p className="text-xs text-muted-foreground">
          CanonicalField, CanonicalFieldError e CanonicalStepperWizard nas 4 matrizes de estado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Formulário e Wizard Ativo" state="ready">
            <div className="flex flex-col gap-3">
              <CanonicalStepperWizard
                steps={wizardSteps}
                currentStepIndex={wizardStep}
                onStepChange={setWizardStep}
                onNext={() => setWizardStep((prev) => Math.min(prev + 1, wizardSteps.length - 1))}
                onPrevious={() => setWizardStep((prev) => Math.max(prev - 1, 0))}
              >
                <div className="flex flex-col gap-3">
                  <CanonicalField label="Razão Social" htmlFor="demo-name" required>
                    <Input
                      id="demo-name"
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      className="h-11 text-xs"
                    />
                  </CanonicalField>

                  <CanonicalField label="Município" htmlFor="demo-city" required>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger id="demo-city" className="h-11 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sp">São Paulo, SP</SelectItem>
                        <SelectItem value="rj">Rio de Janeiro, RJ</SelectItem>
                        <SelectItem value="smo">São Miguel do Oeste, SC</SelectItem>
                      </SelectContent>
                    </Select>
                  </CanonicalField>

                  <CanonicalField label="Observações" htmlFor="demo-obs">
                    <Textarea
                      id="demo-obs"
                      defaultValue="Contrato padrão com cláusula de SLA e suporte."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </CanonicalField>
                </div>
              </CanonicalStepperWizard>
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Formulário em Carga" state="loading">
            <div className="flex flex-col gap-3">
              <CanonicalStepperWizard
                steps={wizardSteps}
                currentStepIndex={0}
                isLoading={true}
              />
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Formulário Virgem" state="empty">
            <div className="flex flex-col gap-3">
              <CanonicalField
                label="Razão Social (Obrigatório)"
                htmlFor="empty-name"
                hint="Preencha os campos para salvar."
              >
                <Input
                  id="empty-name"
                  placeholder="Informe a denominação social..."
                  className="h-11 text-xs"
                />
              </CanonicalField>

              <CanonicalField label="Região Tributária" htmlFor="empty-sel">
                <Select>
                  <SelectTrigger id="empty-sel" className="h-11 text-xs">
                    <SelectValue placeholder="Selecione um polo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Região Sul</SelectItem>
                    <SelectItem value="2">Região Sudeste</SelectItem>
                  </SelectContent>
                </Select>
              </CanonicalField>

              <EmptyState
                icon={FormInput}
                title="Sem dados gravados"
                description="Preencha os campos para salvar."
                className="py-4 min-h-24"
              />
            </div>
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Falha de Validação" state="error">
            <div className="flex flex-col gap-3">
              <CanonicalField
                label="Documento Fiscal (CNPJ)"
                htmlFor="err-input"
                error="Dígito verificador inválido na Receita Federal"
                required
              >
                <Input
                  id="err-input"
                  defaultValue="00.000.000/0000-00"
                  aria-invalid="true"
                  className="h-11 text-xs border-destructive focus-visible:ring-destructive font-mono"
                />
              </CanonicalField>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de Validação</AlertTitle>
                <AlertDescription className="text-xs">
                  Corrija as inconsistências para submeter.
                </AlertDescription>
              </Alert>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValidationAttempt((count) => count + 1)}
                className="h-11 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Validar novamente
              </Button>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Tentativas: {validationAttempt}
              </p>
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
