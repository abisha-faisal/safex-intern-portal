import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  size = "md",
  showLabel = true,
}: {
  value: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone =
    clamped >= 100 ? "bg-status-complete" : clamped >= 40 ? "bg-signal-500" : "bg-status-pending";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-sx bg-surface-muted",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn("chevron-track h-full transition-all duration-500 ease-out", tone)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-data w-9 shrink-0 text-right text-xs text-ink-600">{clamped}%</span>
      )}
    </div>
  );
}
