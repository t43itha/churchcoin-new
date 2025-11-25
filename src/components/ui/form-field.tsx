"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle } from "lucide-react";
import { forwardRef, type ComponentProps, type ReactNode } from "react";

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
}

/**
 * Enhanced form field with consistent error/success states.
 * Includes label, hint text, and validation feedback.
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, success, hint, required, className, id, ...props }, ref) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId} className="text-ink font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </Label>

        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            className={cn(
              "font-primary pr-10",
              hasError && "border-error focus:border-error focus:ring-error/20",
              hasSuccess && "border-success focus:border-success focus:ring-success/20",
              className
            )}
            aria-invalid={hasError}
            aria-describedby={`${fieldId}-message`}
            {...props}
          />

          {(hasError || hasSuccess) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError ? (
                <AlertCircle className="h-4 w-4 text-error" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
            </div>
          )}
        </div>

        {(error || success || hint) && (
          <p
            id={`${fieldId}-message`}
            className={cn(
              "text-sm",
              hasError && "text-error",
              hasSuccess && "text-success",
              !hasError && !hasSuccess && "text-grey-mid"
            )}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

interface FormTextareaProps extends ComponentProps<typeof Textarea> {
  label: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
}

/**
 * Enhanced textarea field with consistent error/success states.
 */
export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, success, hint, required, className, id, ...props }, ref) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId} className="text-ink font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </Label>

        <Textarea
          ref={ref}
          id={fieldId}
          className={cn(
            "font-primary",
            hasError && "border-error focus:border-error focus:ring-error/20",
            hasSuccess && "border-success focus:border-success focus:ring-success/20",
            className
          )}
          aria-invalid={hasError}
          aria-describedby={`${fieldId}-message`}
          {...props}
        />

        {(error || success || hint) && (
          <p
            id={`${fieldId}-message`}
            className={cn(
              "text-sm",
              hasError && "text-error",
              hasSuccess && "text-success",
              !hasError && !hasSuccess && "text-grey-mid"
            )}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = "FormTextarea";

interface FormCurrencyFieldProps extends Omit<FormFieldProps, "type"> {
  currency?: string;
}

/**
 * Currency input field with pound symbol prefix.
 */
export const FormCurrencyField = forwardRef<HTMLInputElement, FormCurrencyFieldProps>(
  ({ currency = "£", className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <Label htmlFor={props.id || props.label.toLowerCase().replace(/\s+/g, "-")} className="text-ink font-medium">
          {props.label}
          {props.required && <span className="text-error ml-1">*</span>}
        </Label>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-mid font-primary">
            {currency}
          </span>
          <Input
            ref={ref}
            id={props.id || props.label.toLowerCase().replace(/\s+/g, "-")}
            type="number"
            step="0.01"
            min="0"
            className={cn(
              "font-primary pl-8 pr-10",
              props.error && "border-error focus:border-error focus:ring-error/20",
              props.success && !props.error && "border-success focus:border-success focus:ring-success/20",
              className
            )}
            aria-invalid={!!props.error}
            aria-describedby={`${props.id || props.label.toLowerCase().replace(/\s+/g, "-")}-message`}
            {...props}
          />

          {(props.error || props.success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {props.error ? (
                <AlertCircle className="h-4 w-4 text-error" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
            </div>
          )}
        </div>

        {(props.error || props.success || props.hint) && (
          <p
            id={`${props.id || props.label.toLowerCase().replace(/\s+/g, "-")}-message`}
            className={cn(
              "text-sm",
              props.error && "text-error",
              props.success && !props.error && "text-success",
              !props.error && !props.success && "text-grey-mid"
            )}
          >
            {props.error || props.success || props.hint}
          </p>
        )}
      </div>
    );
  }
);

FormCurrencyField.displayName = "FormCurrencyField";

interface FormFieldGroupProps {
  children: ReactNode;
  className?: string;
}

/**
 * Group related form fields together.
 */
export function FormFieldGroup({ children, className }: FormFieldGroupProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  );
}

interface FormRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Horizontal row of form fields.
 */
export function FormRow({ children, className }: FormRowProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      {children}
    </div>
  );
}
