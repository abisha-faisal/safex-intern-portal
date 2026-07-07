import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { initials } from "@/lib/utils";
import type { Profile, Group, Task } from "@/lib/types";
import { CreateGroupButton } from "@/components/CreateGroupButton";

export default async function GroupsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();

  const [{ data: groups }, { data: people }, { data: tasks }] = await Promise.all([
    supabase.from("groups").select("*").order("name").returns<Group[]>(),
    supabase.from("profiles").select("*").returns<Profile[]>(),
    supabase.from("tasks").select("id, group_id, progress, status").returns<Task[]>(),
  ]);

  const peopleByGroup = new Map<string, Profile[]>();
  (people ?? []).forEach((p) => {
    if (!p.group_id) return;
    peopleByGroup.set(p.group_id, [...(peopleByGroup.get(p.group_id) ?? []), p]);
  });
  const leaderById = new Map((people ?? []).filter((p) => p.role === "leader").map((p) => [p.id, p]));

  function groupProgress(groupId: string) {
    const groupTasks = (tasks ?? []).filter((t) => t.group_id === groupId);
    if (groupTasks.length === 0) return 0;
    return Math.round(groupTasks.reduce((s, t) => s + t.progress, 0) / groupTasks.length);
  }

  return (
    <div>
      <PageHeader
        title="Groups"
        description={
          me?.role === "admin" ? "Every group at SafeX, with its leader and progress." : "Your group."
        }
        action={me?.role === "admin" ? <CreateGroupButton people={people ?? []} /> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(groups ?? []).map((g) => {
          const members = (peopleByGroup.get(g.id) ?? []).filter((p) => p.role === "intern");
          const leader = g.leader_id ? leaderById.get(g.leader_id) : undefined;
          const progress = groupProgress(g.id);

          return (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="block rounded-md border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-panel"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-display text-base font-semibold text-ink-900">{g.name}</h3>
                <span className="rounded-sx bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-600/70">
                  {members.length} intern{members.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-ink-600/70">
                <div className="flex h-6 w-6 items-center justify-center rounded-sx bg-teal-50 text-[10px] font-semibold text-teal-600">
                  {leader ? initials(leader.full_name) : "—"}
                </div>
                {leader ? leader.full_name : "No leader assigned"}
              </div>

              <div className="mt-4 -space-x-2">
                {members.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    title={m.full_name}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-navy-50 text-[10px] font-semibold text-navy-700"
                  >
                    {initials(m.full_name)}
                  </div>
                ))}
                {members.length > 6 && (
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-muted text-[10px] font-semibold text-ink-600">
                    +{members.length - 6}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <ProgressBar value={progress} size="sm" />
              </div>
            </Link>
          );
        })}
        {(groups ?? []).length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-border-strong p-10 text-center text-sm text-ink-600/60">
            No groups yet.
          </div>
        )}
      </div>
    </div>
  );
}
