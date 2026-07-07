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

  // tasks_update RLS scopes *which rows* this can touch (admin: any;
  // leader: their group; intern: only their own assignment). The
  // trg_enforce_task_update_scope trigger then scopes *which columns*
  // an intern may change within that row — title/description/deadline/
  // assignee/group changes from an intern session are rejected at the
  // database layer even though this route itself doesn't check role.
  const { data, error } = await supabase.from("tasks").update(update).eq("id", params.id).select().single();

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
