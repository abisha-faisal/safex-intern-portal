import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!["pending", "in_progress", "completed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.progress !== undefined) {
    const progress = Number(body.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return NextResponse.json({ error: "Progress must be between 0 and 100" }, { status: 400 });
    }
    update.progress = Math.round(progress);
  }
  // These fields are only meaningful for leaders/admins editing a task;
  // if an intern's session sends them, the enforce_task_update_scope
  // trigger in Postgres rejects the whole statement rather than silently
  // dropping the fields, so we still pass them through here.
  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.description !== undefined) update.description = String(body.description).trim();
  if (body.deadline !== undefined) update.deadline = body.deadline ? String(body.deadline) : null;
  if (body.assignee_id !== undefined) update.assignee_id = String(body.assignee_id);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Optional: when a leader/admin edits a task that was created as a
  // "whole group" assignment (has a batch_id), they can choose to apply
  // the shared fields (title/description/deadline) to every intern's
  // copy at once instead of just this one row. Status/progress/assignee
  // are never batch-applied — those are always specific to one intern's
  // copy — so we split the update into a "shared" part and a
  // "this-row-only" part.
  const applyToGroup = body.apply_to_group === true;
  const sharedFields = ["title", "description", "deadline"] as const;
  const sharedUpdate: Record<string, unknown> = {};
  const rowOnlyUpdate: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    if ((sharedFields as readonly string[]).includes(key)) sharedUpdate[key] = value;
    else rowOnlyUpdate[key] = value;
  }

  if (applyToGroup && Object.keys(sharedUpdate).length > 0) {
    const { data: existing, error: fetchError } = await supabase
      .from("tasks")
      .select("batch_id")
      .eq("id", params.id)
      .single();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });

    if (existing?.batch_id) {
      // tasks_update RLS still scopes this to rows the caller may touch
      // (admin: any; leader: their own group) — batch_id alone can't
      // reach another group's tasks, since every row in a batch was
      // created within a single group to begin with.
      const { error: batchError } = await supabase
        .from("tasks")
        .update(sharedUpdate)
        .eq("batch_id", existing.batch_id);
      if (batchError) return NextResponse.json({ error: batchError.message }, { status: 400 });
    } else {
      // No batch_id (single-intern task) — apply_to_group has nothing
      // else to apply to, so just fold it into this row's own update.
      Object.assign(rowOnlyUpdate, sharedUpdate);
    }
  } else {
    Object.assign(rowOnlyUpdate, sharedUpdate);
  }

  // tasks_update RLS scopes *which rows* this can touch (admin: any;
  // leader: their group; intern: only their own assignment). The
  // trg_enforce_task_update_scope trigger then scopes *which columns*
  // an intern may change within that row — title/description/deadline/
  // assignee/group changes from an intern session are rejected at the
  // database layer even though this route itself doesn't check role.
  const { data, error } =
    Object.keys(rowOnlyUpdate).length > 0
      ? await supabase.from("tasks").update(rowOnlyUpdate).eq("id", params.id).select().single()
      : await supabase.from("tasks").select().eq("id", params.id).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ task: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // tasks_delete RLS: admin (any) or leader (their own group). An intern's
  // delete matches zero rows and Supabase returns a normal empty success,
  // so we explicitly surface that as an error instead of a silent no-op.
  const { data, error } = await supabase.from("tasks").delete().eq("id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found or you don't have permission to delete this task" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
