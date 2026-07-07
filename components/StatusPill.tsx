import { cn } from "@/lib/utils";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/utils";
import type { Role, TaskStatus } from "@/lib/types";

export function StatusPill({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
    pending: "bg-status-pendingBg text-status-pending",
    in_progress: "bg-status-progressBg text-status-progress",
    completed: "bg-status-completeBg text-status-complete",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sx px-2 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "pending" && "bg-status-pending",
          status === "in_progress" && "bg-status-progress",
          status === "completed" && "bg-status-complete"
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function RolePill({ role }: { role: Role | string }) {
  const styles: Record<string, string> = {
    admin: "bg-navy-100 text-navy-700",
    leader: "bg-teal-100 text-teal-600",
    intern: "bg-signal-100 text-signal-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sx px-2 py-0.5 text-xs font-medium",
        styles[role] ?? "bg-surface-muted text-ink-600"
      )}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        active ? "text-status-complete" : "text-ink-600/50"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-status-complete" : "bg-ink-600/30")} />
      {active ? "Active" : "Disabled"}
    </span>
  );
}
