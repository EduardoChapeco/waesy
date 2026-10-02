/**
 * schema-form-renderer.tsx — Renderizador Canônico de Formulários Schema-Driven (P33)
 *
 * Renderiza dinamicamente qualquer formulário a partir de FormSchemaDef,
 * garantindo acessibilidade (WCAG 2.2 AA), máscaras progressivas, visibilidade condicional
 * e persistência resiliente de rascunhos.
 *
 * Invariantes: M01, M02, M04, M16 | Leis: L01, L03, L05, L11, L17 | Prompts: P19, P33
 */

import * as React from "react";
import { FormSchemaDef, FormFieldDef, validateFormSubmission } from "@/lib/schema-forms";
import { useFormDraft } from "@/hooks/use-form-draft";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export interface SchemaFormRendererProps {
  schema: FormSchemaDef;
  initialData?: Record<string, any>;
  onSubmit: (sanitizedData: Record<string, any>) => Promise<void> | void;
  submitLabel?: string;
  enableAutosave?: boolean;
  draftKey?: string;
  className?: string;
}

export function SchemaFormRenderer({
  schema,
  initialData = {},
  onSubmit,
  submitLabel = "Salvar e Continuar",
  enableAutosave = true,
  draftKey,
  className = "",
}: SchemaFormRendererProps) {
  const [formData, setFormData] = React.useState<Record<string, any>>(initialData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const autoDraftKey = draftKey || `form_${schema.id}_v${schema.version}`;
  const { clearDraftAfterSubmit } = useFormDraft<Record<string, any>>({
    formId: autoDraftKey,
    formData,
    onRestore: (restored) => setFormData((prev) => ({ ...prev, ...restored })),
    disabled: !enableAutosave,
  });

  const handleChange = (fieldId: string, value: any) => {
    const updated = { ...formData, [fieldId]: value };
    setFormData(updated);
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const isFieldVisible = (field: FormFieldDef): boolean => {
    if (!field.condition) return true;
    const parentVal = formData[field.condition.fieldId];
    if (field.condition.operator === "equals") {
      return parentVal === field.condition.value;
    }
    if (field.condition.operator === "not_equals") {
      return parentVal !== field.condition.value;
    }
    if (field.condition.operator === "contains" && Array.isArray(parentVal)) {
      return parentVal.includes(field.condition.value);
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateFormSubmission(schema, formData);
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(result.sanitizedData);
      if (enableAutosave) {
        clearDraftAfterSubmit();
      }
      setSubmitSuccess(true);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        __root: err?.message || "Ocorreu um erro ao processar o formulário. Tente novamente.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`} noValidate>
      {/* Cabeçalho do Formulário */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {schema.title}
        </h3>
        {schema.description && (
          <p className="text-sm text-muted-foreground">{schema.description}</p>
        )}
      </div>

      {errors.__root && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errors.__root}</span>
        </div>
      )}

      {/* Campos Dinâmicos */}
      <div className="space-y-5">
        {schema.fields.filter(isFieldVisible).map((field) => {
          const fieldError = errors[field.id];
          return (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
              </div>

              {field.type === "textarea" ? (
                <Textarea
                  id={field.id}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={fieldError ? "border-destructive focus-visible:ring-destructive" : ""}
                  rows={3}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.id}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className={`flex h-12 w-full rounded-lg border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    fieldError ? "border-destructive focus-visible:ring-destructive" : "border-border"
                  }`}
                >
                  <option value="">Selecione uma opção...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <div className="flex items-center space-x-3 pt-1">
                  <Checkbox
                    id={field.id}
                    checked={!!formData[field.id]}
                    onCheckedChange={(checked) => handleChange(field.id, !!checked)}
                  />
                  <Label htmlFor={field.id} className="text-sm font-normal text-muted-foreground cursor-pointer">
                    {field.placeholder || "Sim, confirmo esta informação"}
                  </Label>
                </div>
              ) : (
                <Input
                  id={field.id}
                  type={
                    field.type === "number" || field.type === "decimal"
                      ? "text"
                      : field.type === "date"
                      ? "date"
                      : field.type === "tel"
                      ? "tel"
                      : "text"
                  }
                  inputMode={field.inputMode || (field.type === "number" ? "numeric" : field.type === "tel" ? "tel" : "text")}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  hasError={!!fieldError}
                />
              )}

              {field.helperText && !fieldError && (
                <p className="text-xs text-muted-foreground">{field.helperText}</p>
              )}

              {fieldError && (
                <p className="text-xs font-medium text-destructive">{fieldError}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Consentimento LGPD */}
      {schema.lgpdConsent?.required && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="__lgpdConsent"
              checked={!!formData.__lgpdConsent}
              onCheckedChange={(checked) => handleChange("__lgpdConsent", !!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="__lgpdConsent" className="text-xs leading-relaxed text-muted-foreground cursor-pointer block">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground mr-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Privacidade e Proteção de Dados:
                </span>
                {schema.lgpdConsent.termsText}
              </Label>
            </div>
          </div>
          {errors.__lgpdConsent && (
            <p className="text-xs font-medium text-destructive pl-7">
              {errors.__lgpdConsent}
            </p>
          )}
        </div>
      )}

      {/* Ação de Submissão */}
      <div className="pt-2">
        <Button
          type="submit"
          className="w-full h-12 text-sm font-semibold rounded-lg"
          disabled={isSubmitting || submitSuccess}
        >
          {submitSuccess ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Salvo com Sucesso!
            </span>
          ) : isSubmitting ? (
            "Processando..."
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
