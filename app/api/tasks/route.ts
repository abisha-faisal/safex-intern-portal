import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const deadline = body.deadline ? String(body.deadline) : null;
  const assignee_id = String(body.assignee_id ?? "");
  const group_id = String(body.group_id ?? "");
  // Optional: when the client is creating one copy of a "whole group"
  // assignment, it generates a single uuid client-side and sends it with
  // every copy in the batch, so all rows can be linked and later edited
  // (title/description/deadline) or displayed together. Absent for a
  // task assigned to a single intern.
  const rawBatchId = body.batch_id !== undefined && body.batch_id !== null ? String(body.batch_id) : null;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const batch_id = rawBatchId && uuidPattern.test(rawBatchId) ? rawBatchId : null;

  if (!title || title.length > 200) {
    return NextResponse.json({ error: "A valid task title is required" }, { status: 400 });
  }
  if (!assignee_id || !group_id) {
    return NextResponse.json({ error: "An assignee and group are required" }, { status: 400 });
  }

  // No role check here on purpose: the tasks_insert RLS policy is the
  // single source of truth. It requires created_by = auth.uid(), the
  // caller to be an admin OR a leader inserting within their own
  // current_profile_group(), and the assignee to actually be an intern
  // in that same group — a leader cannot make this insert succeed for
  // any other group's intern no matter what the client sends.
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      deadline,
      assignee_id,
      group_id,
      batch_id,
      created_by: user.id,
      status: "pending",
      progress: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ task: data });
}
