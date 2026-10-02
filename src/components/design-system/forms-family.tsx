import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família de Formulários</h2>
        <p className="text-xs text-muted-foreground">
          Inputs, seletores, textareas e campos nas 4 matrizes de estado operacional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Entrada com Dados" state="ready">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-name" className="text-xs">
                  Razão Social
                </Label>
                <Input
                  id="demo-name"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  className="h-11 sm:h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-city" className="text-xs">
                  Município
                </Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger id="demo-city" className="h-11 sm:h-9 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sp">São Paulo, SP</SelectItem>
                    <SelectItem value="rj">Rio de Janeiro, RJ</SelectItem>
                    <SelectItem value="smo">São Miguel do Oeste, SC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-obs" className="text-xs">
                  Observações
                </Label>
                <Textarea
                  id="demo-obs"
                  defaultValue="Contrato padrão com cláusula de SLA e suporte."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON) */}
        {showLoading && (
          <StateCard title="Campos em Carga" state="loading">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-11 sm:h-9 w-full rounded-md" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-11 sm:h-9 w-full rounded-md" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Formulário Virgem" state="empty">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="empty-name" className="text-xs text-muted-foreground">
                  Razão Social (Obrigatório)
                </Label>
                <Input
                  id="empty-name"
                  placeholder="Informe a denominação social..."
                  className="h-11 sm:h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="empty-sel" className="text-xs text-muted-foreground">
                  Região Tributária
                </Label>
                <Select>
                  <SelectTrigger id="empty-sel" className="h-11 sm:h-9 text-xs">
                    <SelectValue placeholder="Selecione um polo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Região Sul</SelectItem>
                    <SelectItem value="2">Região Sudeste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <EmptyState
                icon={FormInput}
                title="Sem dados gravados"
                description="Preencha os campos para salvar."
                className="py-2 min-h-[90px]"
              />
            </div>
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Falha de Validação" state="error">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="err-input" className="text-xs text-destructive">
                  Documento Fiscal (CNPJ)
                </Label>
                <Input
                  id="err-input"
                  defaultValue="00.000.000/0000-00"
                  aria-invalid="true"
                  className="h-11 sm:h-9 text-xs border-destructive focus-visible:ring-destructive"
                />
                <span className="text-[11px] text-destructive flex items-center gap-1 mt-0.5">
                  <AlertCircle className="h-3 w-3" />
                  Dígito verificador inválido na Receita Federal
                </span>
              </div>

              <Alert variant="destructive" className="mt-1 p-2.5">
                <AlertDescription className="text-xs">
                  Corrija as inconsistências para submeter.
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                size="sm"
                className="h-11 sm:h-9 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Validar novamente
              </Button>
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
