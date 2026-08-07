import { cn } from "@/lib/utils";

export function Input({
  className,
  type = "text",
  readOnly,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const isChooser =
    type === "checkbox" ||
    type === "radio" ||
    type === "file" ||
    type === "button" ||
    type === "submit" ||
    type === "reset" ||
    type === "range" ||
    type === "color";

  return (
    <input
      type={type}
      readOnly={readOnly}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
        isChooser ? "cursor-pointer" : readOnly ? "cursor-default" : "cursor-text",
        className
      )}
      {...props}
    />
  );
}
