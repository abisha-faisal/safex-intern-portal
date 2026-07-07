import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variants = {
    primary: "bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-50",
    secondary: "border border-border-strong text-ink-700 hover:bg-surface-muted disabled:opacity-50",
    danger: "bg-status-blocked text-white hover:bg-status-blocked/90 disabled:opacity-50",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-sx px-3.5 py-2 text-sm font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-sx border border-border-strong px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-signal-500";
