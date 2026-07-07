import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 90"
      className={cn("h-8 w-auto", className)}
      aria-hidden="true"
    >
      <polygon points="50,4 74,28 62,28 50,16 38,28 26,28" fill="#374151" />
      <polygon points="26,28 50,52 45,64 4,24 4,40 50,86 50,64" fill="#1C4FD6" />
      <polygon points="74,28 50,52 55,64 96,24 96,40 50,86 50,64" fill="#37A6E8" />
    </svg>
  );
}

export function LogoLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-7" />
      <div className="leading-tight">
        <div className="font-display text-[15px] font-bold tracking-tight text-ink-900">
          SAFEX
        </div>
        <div className="text-[9px] font-semibold tracking-[0.28em] text-navy-500">
          SOLUTIONS
        </div>
      </div>
    </div>
  );
}
