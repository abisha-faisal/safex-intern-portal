import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const noteBody = String(body?.body ?? "").trim();
  if (!noteBody || noteBody.length > 4000) {
    return NextResponse.json({ error: "Note must be between 1 and 4000 characters" }, { status: 400 });
  }

  // task_notes_insert RLS requires author_id = auth.uid() AND the task
  // to be visible to the caller (admin/leader-in-group/assignee) — so a
  // leader can't post a note on a task outside their group, and an
  // intern can't post on someone else's task.
  const { data, error } = await supabase
    .from("task_notes")
    .insert({ task_id: params.id, author_id: user.id, body: noteBody })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ note: data });
}
