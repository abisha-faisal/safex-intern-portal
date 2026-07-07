"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";
import { ProgressBar } from "@/components/ProgressBar";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/types";

const TABS: { key: "all" | TaskStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

export function TaskBoard({
  tasks,
  nameById,
  showAssignee,
}: {
  tasks: Task[];
  nameById: Map<string, string>;
  showAssignee: boolean;
}) {
  const [tab, setTab] = useState<"all" | TaskStatus>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => tab === "all" || t.status === tab)
      .filter((t) => !query || t.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  }, [tasks, tab, query]);

  return (
    <div className="rounded-md border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-sx bg-surface-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-sx px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key ? "bg-surface text-ink-900 shadow-card" : "text-ink-600/60 hover:text-ink-900"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          className="rounded-sx border border-border-strong px-3 py-2 text-sm outline-none focus:border-signal-500 sm:w-56"
        />
      </div>

      <ul className="divide-y divide-border">
        {filtered.map((t) => (
          <li key={t.id}>
            <Link
              href={`/tasks/${t.id}`}
              className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-sunk sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink-900">{t.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-600/60">
                  {showAssignee && <span>{nameById.get(t.assignee_id) ?? "—"}</span>}
                  {showAssignee && <span>·</span>}
                  <span className={isOverdue(t.deadline, t.status) ? "font-medium text-status-blocked" : ""}>
                    Due {formatDate(t.deadline)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:w-72">
                <div className="w-32 sm:w-40">
                  <ProgressBar value={t.progress} size="sm" />
                </div>
                <StatusPill status={t.status} />
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-ink-600/50">No tasks match this view.</li>
        )}
      </ul>
    </div>
  );
}
