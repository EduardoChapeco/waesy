import * as React from "react";
import { Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormField {
  id: string;
  label: string;
  type?: "text" | "number" | "select" | "date";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface InChatFormProps {
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => void;
  className?: string;
}

export function InChatForm({
  title,
  description,
  fields,
  submitLabel = "Enviar Dados",
  onSubmit,
  className,
}: InChatFormProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const handleChange = (id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit(values);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card overflow-hidden my-2 max-w-md",
        className
      )}
    >
      <div className="p-4 bg-muted/40 border-b border-border/50 space-y-1">
        <h4 className="text-xs font-bold text-foreground">{title}</h4>
        {description && (
          <p className="text-3xs text-muted-foreground">{description}</p>
        )}
      </div>

      {submitted ? (
        <div className="p-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          <Check className="size-4" />
          <span>Informações submetidas com sucesso!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1">
              <label
                htmlFor={field.id}
                className="text-2xs font-medium text-muted-foreground block"
              >
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </label>

              {field.type === "select" ? (
                <select
                  id={field.id}
                  required={field.required}
                  value={values[field.id] ?? ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="w-full min-h-9 px-2 py-1 rounded-lg border border-border/70 bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.id}
                  type={field.type ?? "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={values[field.id] ?? ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="w-full min-h-9 px-2 py-1 rounded-lg border border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            className="w-full min-h-11 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Send className="size-3.5" />
            <span>{submitLabel}</span>
          </button>
        </form>
      )}
    </div>
  );
}
