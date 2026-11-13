import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + error/help text. Pass the control's id as htmlFor. */
export function Field({
  label,
  htmlFor,
  error,
  help,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[] | string;
  help?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-destructive text-xs">
          {message}
        </p>
      ) : help ? (
        <p className="text-muted-foreground text-xs">{help}</p>
      ) : null}
    </div>
  );
}
