import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "navy",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: "navy" | "signal" | "teal";
}) {
  const accentBg = {
    navy: "bg-navy-50 text-navy-700",
    signal: "bg-signal-50 text-signal-600",
    teal: "bg-teal-50 text-teal-600",
  }[accent];

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-600/60">
          {label}
        </span>
        {icon && (
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-sx", accentBg)}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 font-display font-data text-3xl font-semibold tabular-nums text-ink-900">
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-ink-600/60">{hint}</div>}
    </div>
  );
}
