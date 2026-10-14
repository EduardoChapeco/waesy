import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      helperText,
      error,
      leftAddon,
      rightAddon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const inputElement = (
      <div className="relative flex items-center w-full">
        {leftAddon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground shrink-0">
            {leftAddon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
          className={cn(
            "flex w-full min-h-11 rounded-lg border border-border/80 bg-background px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground",
            "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50 select-text",
            leftAddon && "pl-10",
            rightAddon && "pr-10",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 flex items-center text-muted-foreground shrink-0">
            {rightAddon}
          </div>
        )}
      </div>
    );

    if (!label && !helperText && !error) {
      return inputElement;
    }

    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-foreground select-none"
          >
            {label}
          </label>
        )}
        {inputElement}
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "DSInput";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const textareaElement = (
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-help` : undefined}
        className={cn(
          "flex w-full min-h-24 rounded-lg border border-border/80 bg-background px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground",
          "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-y select-text",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
    );

    if (!label && !helperText && !error) {
      return textareaElement;
    }

    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium text-foreground select-none"
          >
            {label}
          </label>
        )}
        {textareaElement}
        {error ? (
          <p id={`${textareaId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${textareaId}-help`} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = "DSTextarea";
