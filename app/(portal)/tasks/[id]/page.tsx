import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { TaskEditForm } from "@/components/TaskEditForm";
import { NotesThread } from "@/components/NotesThread";
import { DeleteTaskControl } from "@/components/DeleteTaskControl";
import { StatusPill } from "@/components/StatusPill";
import { formatDate } from "@/lib/utils";
import type { Profile, Task, TaskNote } from "@/lib/types";

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();

  // RLS on `tasks` returns null if this task isn't the caller's own
  // assignment (intern), isn't in the caller's group (leader), or
  // doesn't exist — an intern hitting another intern's task id here
  // gets an honest 404, not a data leak.
  const { data: task } = await supabase.from("tasks").select("*").eq("id", params.id).single<Task>();
  if (!task) notFound();

  const [{ data: notes }, { data: groupPeople }, { data: batchSiblings }] = await Promise.all([
    supabase.from("task_notes").select("*").eq("task_id", task.id).order("created_at").returns<TaskNote[]>(),
    supabase.from("profiles").select("*").eq("group_id", task.group_id).returns<Profile[]>(),
    // Other tasks created in the same "assign to whole group" action as
    // this one, so we can tell the edit form how many other interns'
    // copies exist and offer to apply shared-field edits to all of them.
    task.batch_id
      ? supabase.from("tasks").select("id").eq("batch_id", task.batch_id).neq("id", task.id)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  const authorIds = new Set((notes ?? []).map((n) => n.author_id));
  authorIds.add(task.assignee_id);
  const { data: authors } = await supabase.from("profiles").select("id, full_name").in("id", Array.from(authorIds));
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  const canEditFull = me?.role === "admin" || me?.role === "leader";
  const assigneeOptions = (groupPeople ?? []).filter((p) => p.role === "intern");
  if (!assigneeOptions.some((p) => p.id === task.assignee_id)) {
    const fallbackName = authorNameById.get(task.assignee_id) ?? "Current assignee";
    assigneeOptions.unshift({
      id: task.assignee_id,
      full_name: fallbackName,
      email: "",
      role: "intern",
      group_id: task.group_id,
      status: "active",
      force_password_change: false,
      created_at: task.created_at,
    });
  }

  return (
    <div>
      <PageHeader
        title={task.title}
        description={
          `Assigned to ${authorNameById.get(task.assignee_id) ?? "—"} · Due ${formatDate(task.deadline)}` +
          ((batchSiblings?.length ?? 0) > 0
            ? ` · Part of a group assignment (${(batchSiblings?.length ?? 0) + 1} interns total)`
            : "")
        }
        action={
          <div className="flex items-center gap-3">
            <StatusPill status={task.status} />
            {canEditFull && <DeleteTaskControl taskId={task.id} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-surface p-5 shadow-card">
          <TaskEditForm
            task={task}
            canEditFull={canEditFull}
            assigneeOptions={assigneeOptions}
            batchSiblingCount={batchSiblings?.length ?? 0}
          />
        </div>

        <NotesThread
          taskId={task.id}
          notes={notes ?? []}
          authorNameById={authorNameById}
          currentUserId={user!.id}
        />
      </div>
    </div>
  );
}