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

  if (body.leader_id !== undefined) {
    // assign_group_leader() itself re-checks that the caller is an
    // admin (or is the trusted service role) before doing anything —
    // this route calling it doesn't add privilege, it just exposes it.
    const { error } = await supabase.rpc("assign_group_leader", {
      p_group_id: params.id,
      p_leader_id: body.leader_id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (body.name !== undefined || body.description !== undefined) {
    const update: Record<string, string | null> = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.description !== undefined) update.description = body.description ? String(body.description) : null;

    // Blocked for non-admins by the groups_update RLS policy.
    const { error } = await supabase.from("groups").update(update).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Blocked for non-admins by the groups_delete RLS policy.
  const { error } = await supabase.from("groups").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
