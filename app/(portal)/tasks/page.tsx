import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { TaskBoard } from "@/components/TaskBoard";
import { CreateTaskButton } from "@/components/CreateTaskButton";
import type { Profile, Group, Task } from "@/lib/types";

export default async function TasksPage() {
  const supabase = createClient();
  const { profile: me } = await getCurrentProfile();

  const [{ data: tasks }, { data: people }, { data: groups }] = await Promise.all([
    supabase.from("tasks").select("*").returns<Task[]>(),
    supabase.from("profiles").select("*").returns<Profile[]>(),
    supabase.from("groups").select("*").returns<Group[]>(),
  ]);

  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const isIntern = me?.role === "intern";

  const internsByGroup: Record<string, Profile[]> = {};
  (people ?? [])
    .filter((p) => p.role === "intern")
    .forEach((p) => {
      if (!p.group_id) return;
      internsByGroup[p.group_id] = [...(internsByGroup[p.group_id] ?? []), p];
    });

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={
          isIntern ? "Tasks assigned to you." : "Weekly tasks for your group, at a glance."
        }
        action={
          !isIntern ? <CreateTaskButton groups={groups ?? []} internsByGroup={internsByGroup} /> : undefined
        }
      />
      <TaskBoard tasks={tasks ?? []} nameById={nameById} showAssignee={!isIntern} />
    </div>
  );
}