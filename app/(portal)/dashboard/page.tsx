import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { ProgressBar } from "@/components/ProgressBar";
import { formatDate, isOverdue } from "@/lib/utils";
import type { Profile, Group, Task, TaskStatus } from "@/lib/types";
import Link from "next/link";

// A row in the "Upcoming deadlines" list. Either one real task, or a
// stand-in for every task created by the same "assign to whole group"
// action (same batch_id), so that widget shows one entry per assignment
// instead of one per intern.
interface UpcomingRow {
  id: string;
  title: string;
  deadline: string | null;
  status: TaskStatus;
  progress: number;
  groupSize: number; // 1 for a solo task
}

function groupUpcomingTasks(tasks: Task[]): UpcomingRow[] {
  const batches = new Map<string, Task[]>();
  const solo: Task[] = [];

  tasks.forEach((t) => {
    if (t.batch_id) {
      batches.set(t.batch_id, [...(batches.get(t.batch_id) ?? []), t]);
    } else {
      solo.push(t);
    }
  });

  const rows: UpcomingRow[] = solo.map((t) => ({
    id: t.id,
    title: t.title,
    deadline: t.deadline,
    status: t.status,
    progress: t.progress,
    groupSize: 1,
  }));

  batches.forEach((members) => {
    const representative = members[0];
    const allCompleted = members.every((m) => m.status === "completed");
    const allPending = members.every((m) => m.status === "pending");
    rows.push({
      id: representative.id,
      title: representative.title,
      deadline: representative.deadline,
      status: allCompleted ? "completed" : allPending ? "pending" : "in_progress",
      progress: Math.round(members.reduce((s, m) => s + m.progress, 0) / members.length),
      groupSize: members.length,
    });
  });

  return rows;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { profile: me } = await getCurrentProfile();

  // Each of these queries is scoped automatically by RLS: an admin sees
  // every row, a leader sees only their group's, an intern sees only
  // their own — the same query, three different result sets.
  const [{ data: profiles }, { data: groups }, { data: tasks }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, group_id").returns<Profile[]>(),
    supabase.from("groups").select("id, name").returns<Group[]>(),
    supabase.from("tasks").select("*").returns<Task[]>(),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const interns = (profiles ?? []).filter((p) => p.role === "intern");
  const allTasks = tasks ?? [];
  const pending = allTasks.filter((t) => t.status !== "completed");
  const completed = allTasks.filter((t) => t.status === "completed");

  const in7days = new Date();
  in7days.setDate(in7days.getDate() + 7);
  const upcoming = groupUpcomingTasks(
    allTasks.filter((t) => t.status !== "completed" && t.deadline && new Date(t.deadline) <= in7days)
  )
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
    .slice(0, 6);

  const isAdmin = me?.role === "admin";
  const isLeader = me?.role === "leader";
  const isIntern = me?.role === "intern";

  // For a leader, `groups.length` from RLS is always exactly 1 (their
  // own group) — a stat card that always reads "1" for every leader,
  // forever, isn't telling them anything. Overdue count actually
  // changes and is something they'd want to act on.
  const overdueCount = allTasks.filter((t) => isOverdue(t.deadline, t.status)).length;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${me?.full_name.split(" ")[0]}`}
        description={
          isAdmin
            ? "Company-wide snapshot across every group."
            : isLeader
              ? "Snapshot of your group's progress this week."
              : "A quick look at what's on your plate."
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!isIntern && (
          <StatCard
            label={isAdmin ? "Total interns" : "Group size"}
            value={interns.length}
            hint={isAdmin ? "Across all groups" : "In your group"}
            accent="navy"
          />
        )}
        {isAdmin && <StatCard label="Active groups" value={groups?.length ?? 0} accent="teal" />}
        {isLeader && (
          <StatCard
            label="Overdue tasks"
            value={overdueCount}
            hint={overdueCount > 0 ? "Past their deadline" : "Nothing overdue"}
            accent="signal"
          />
        )}
        <StatCard
          label="Pending tasks"
          value={pending.length}
          hint={isIntern ? "Assigned to you" : undefined}
          accent="signal"
        />
        <StatCard label="Completed tasks" value={completed.length} accent="navy" />
        {isIntern && (
          <StatCard
            label="Average progress"
            value={`${
              allTasks.length
                ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / allTasks.length)
                : 0
            }%`}
            accent="teal"
          />
        )}
      </div>

      <div className="mt-8 rounded-md border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink-900">
            Upcoming deadlines
          </h2>
          <Link href="/tasks" className="text-sm font-medium text-signal-600 hover:text-signal-500">
            View all tasks
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-600/60">
            Nothing due in the next 7 days.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/tasks/${t.id}`} className="truncate font-medium text-ink-900 hover:text-signal-600">
                    {t.title}
                    {t.groupSize > 1 && (
                      <span className="ml-2 inline-flex items-center rounded-sx bg-navy-50 px-1.5 py-0.5 text-2xs font-semibold text-navy-700">
                        Group · {t.groupSize}
                      </span>
                    )}
                  </Link>
                  <div className="mt-0.5 text-xs text-ink-600/60">
                    {!isIntern && t.groupSize === 1 && (
                      <span>{nameById.get((tasks ?? []).find((x) => x.id === t.id)?.assignee_id ?? "") ?? "—"} · </span>
                    )}
                    <span className={isOverdue(t.deadline, t.status) ? "font-medium text-status-blocked" : ""}>
                      Due {formatDate(t.deadline)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:w-64">
                  <div className="w-32 sm:w-40">
                    <ProgressBar value={t.progress} size="sm" />
                  </div>
                  <StatusPill status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}