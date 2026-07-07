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
      created_by: user.id,
      status: "pending",
      progress: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ task: data });
}
