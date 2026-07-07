import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusPill } from "@/components/StatusPill";
import { AssignLeaderControl } from "@/components/AssignLeaderControl";
import { GroupAdminControls } from "@/components/GroupAdminControls";
import { initials } from "@/lib/utils";
import type { Profile, Group, Task } from "@/lib/types";

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();

  // RLS on `groups` returns nothing if this id isn't the caller's own
  // group (for leaders/interns) or doesn't exist — either way this reads
  // as "not found," never leaking whether another group's id is valid.
  const { data: group } = await supabase.from("groups").select("*").eq("id", params.id).single<Group>();
  if (!group) notFound();

  const [{ data: members }, { data: tasks }, { data: allPeople }] = await Promise.all([
    supabase.from("profiles").select("*").eq("group_id", group.id).returns<Profile[]>(),
    supabase.from("tasks").select("*").eq("group_id", group.id).returns<Task[]>(),
    me?.role === "admin"
      ? supabase.from("profiles").select("*").returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
  ]);

  const interns = (members ?? []).filter((p) => p.role === "intern");
  const leader = (members ?? []).find((p) => p.id === group.leader_id);
  const overallProgress = tasks?.length
    ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
    : 0;

  const leaderCandidates = (allPeople ?? []).filter((p) => p.role === "leader" || p.role === "intern");

  return (
    <div>
      <PageHeader
        title={group.name}
        description={group.description ?? undefined}
        action={
          me?.role === "admin" ? <GroupAdminControls groupId={group.id} groupName={group.name} /> : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-md border border-border bg-surface shadow-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink-900">Members</h2>
            </div>
            <ul className="divide-y divide-border">
              {interns.map((m) => {
                const memberTasks = (tasks ?? []).filter((t) => t.assignee_id === m.id);
                const progress = memberTasks.length
                  ? Math.round(memberTasks.reduce((s, t) => s + t.progress, 0) / memberTasks.length)
                  : 0;
                return (
                  <li key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sx bg-navy-50 text-xs font-semibold text-navy-700">
                      {initials(m.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink-900">{m.full_name}</div>
                      <div className="truncate font-data text-xs text-ink-600/50">{m.email}</div>
                    </div>
                    <div className="hidden w-40 sm:block">
                      <ProgressBar value={progress} size="sm" />
                    </div>
                    <span className="text-xs text-ink-600/50">
                      {memberTasks.length} task{memberTasks.length === 1 ? "" : "s"}
                    </span>
                  </li>
                );
              })}
              {interns.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-ink-600/50">No interns in this group yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-md border border-border bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink-900">Tasks</h2>
              <Link href="/tasks" className="text-sm font-medium text-signal-600 hover:text-signal-500">
                Open task board
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {(tasks ?? []).slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900 hover:text-signal-600">
                    {t.title}
                  </Link>
                  <StatusPill status={t.status} />
                </li>
              ))}
              {(tasks ?? []).length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-ink-600/50">No tasks yet.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-md border border-border bg-surface p-5 shadow-card">
            <h2 className="font-display text-sm font-semibold text-ink-900">Overall progress</h2>
            <div className="mt-3">
              <ProgressBar value={overallProgress} />
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface p-5 shadow-card">
            <h2 className="font-display text-sm font-semibold text-ink-900">Group leader</h2>
            {me?.role === "admin" ? (
              <div className="mt-3">
                <AssignLeaderControl
                  groupId={group.id}
                  currentLeaderId={group.leader_id}
                  candidates={leaderCandidates}
                />
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-sx bg-teal-50 text-xs font-semibold text-teal-600">
                  {leader ? initials(leader.full_name) : "—"}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink-900">{leader?.full_name ?? "Unassigned"}</div>
                  {leader && <div className="font-data text-xs text-ink-600/50">{leader.email}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
