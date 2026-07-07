import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, message: "Not signed in" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, message: "Admin access required" };
  }
  return { ok: true as const, userId: user.id };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdmin();
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: check.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const admin = createAdminClient();
  const targetId = params.id;

  // Role / group changes are the sensitive part of this endpoint — the
  // ONLY place in the codebase that can move someone between roles or
  // groups, and it's reachable only after requireAdmin() above passes.
  if (body.role !== undefined) {
    const role = String(body.role);
    if (!["admin", "leader", "intern"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (role === "leader") {
      if (!body.group_id) {
        return NextResponse.json({ error: "A leader must be assigned to a group" }, { status: 400 });
      }
      const { error } = await admin.rpc("assign_group_leader", {
        p_group_id: String(body.group_id),
        p_leader_id: targetId,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      // Demoting/moving someone away from `leader`: if they currently
      // lead a group, free that slot before changing their role.
      await admin.from("groups").update({ leader_id: null }).eq("leader_id", targetId);
      const { error } = await admin
        .from("profiles")
        .update({
          role,
          group_id: role === "intern" ? (body.group_id ? String(body.group_id) : null) : null,
        })
        .eq("id", targetId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else if (body.group_id !== undefined) {
    // Moving an intern to a different group without changing their role.
    const { error } = await admin.from("profiles").update({ group_id: body.group_id }).eq("id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (body.status !== undefined) {
    const status = String(body.status);
    if (!["active", "disabled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const { error } = await admin.from("profiles").update({ status }).eq("id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Disabling someone also kills their live sessions immediately rather
    // than waiting for their JWT to expire.
    if (status === "disabled") {
      await admin.auth.admin.signOut(targetId, "global").catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdmin();
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: check.status });

  if (params.id === check.userId) {
    return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Free up any group they lead so the group isn't left pointing at a
  // deleted user.
  await admin.from("groups").update({ leader_id: null }).eq("leader_id", params.id);

  // Deleting the auth.users row cascades to `profiles` (and from there
  // to their tasks/notes via ON DELETE CASCADE) — this requires the
  // service-role key, which is exactly why deletion can only happen
  // through this route.
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
