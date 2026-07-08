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

// A single row on the board. Either one real task, or a "batch" row that
// stands in for every task created by the same "assign to whole group"
// action (same batch_id) so a leader/admin sees one entry per assignment
// instead of one per intern.
interface BoardRow {
  id: string; // the id of a representative task in this row — used for the link and the key
  title: string;
  deadline: string | null;
  status: TaskStatus; // aggregate status for a batch row
  progress: number; // average progress for a batch row
  members: Task[]; // the underlying task(s) this row represents (length 1 for a solo task)
}

function aggregateStatus(tasks: Task[]): TaskStatus {
  if (tasks.every((t) => t.status === "completed")) return "completed";
  if (tasks.every((t) => t.status === "pending")) return "pending";
  return "in_progress";
}

function buildRows(tasks: Task[]): BoardRow[] {
  const batches = new Map<string, Task[]>();
  const solo: Task[] = [];

  tasks.forEach((t) => {
    if (t.batch_id) {
      batches.set(t.batch_id, [...(batches.get(t.batch_id) ?? []), t]);
    } else {
      solo.push(t);
    }
  });

  const rows: BoardRow[] = solo.map((t) => ({
    id: t.id,
    title: t.title,
    deadline: t.deadline,
    status: t.status,
    progress: t.progress,
    members: [t],
  }));

  batches.forEach((members) => {
    const representative = members[0];
    rows.push({
      id: representative.id,
      title: representative.title,
      deadline: representative.deadline,
      status: aggregateStatus(members),
      progress: Math.round(members.reduce((s, m) => s + m.progress, 0) / members.length),
      members,
    });
  });

  return rows;
}

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

  // Interns only ever have their own single copy in `tasks` (RLS scopes
  // it that way), so grouping is a no-op for them either way — but we
  // only bother building batch rows for the leader/admin view, since
  // that's the only place duplicates would otherwise show up.
  const rows = useMemo(() => (showAssignee ? buildRows(tasks) : tasks.map((t) => ({
    id: t.id,
    title: t.title,
    deadline: t.deadline,
    status: t.status,
    progress: t.progress,
    members: [t],
  }))), [tasks, showAssignee]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => tab === "all" || r.status === tab)
      .filter((r) => !query || r.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  }, [rows, tab, query]);

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
        {filtered.map((r) => {
          const isBatch = r.members.length > 1;
          const completeCount = r.members.filter((m) => m.status === "completed").length;
          return (
            <li key={r.id}>
              <Link
                href={`/tasks/${r.id}`}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-sunk sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-900">
                    {r.title}
                    {isBatch && (
                      <span className="ml-2 inline-flex items-center rounded-sx bg-navy-50 px-1.5 py-0.5 text-2xs font-semibold text-navy-700">
                        Group · {r.members.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-600/60">
                    {showAssignee && !isBatch && <span>{nameById.get(r.members[0].assignee_id) ?? "—"}</span>}
                    {showAssignee && isBatch && (
                      <span>
                        {completeCount}/{r.members.length} interns complete
                      </span>
                    )}
                    {showAssignee && <span>·</span>}
                    <span className={isOverdue(r.deadline, r.status) ? "font-medium text-status-blocked" : ""}>
                      Due {formatDate(r.deadline)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:w-72">
                  <div className="w-32 sm:w-40">
                    <ProgressBar value={r.progress} size="sm" />
                  </div>
                  <StatusPill status={r.status} />
                </div>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-ink-600/50">No tasks match this view.</li>
        )}
      </ul>
    </div>
  );
}