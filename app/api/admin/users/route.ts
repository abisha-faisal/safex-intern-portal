import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Every handler in app/api/admin/** starts by re-verifying, on the
// server, that the caller's *own* session belongs to an admin. This is
// deliberately redundant with RLS: RLS stops a non-admin from writing to
// `profiles` directly, and this check stops a non-admin from ever
// reaching the service-role client in the first place. Two independent
// layers, so a bug in one doesn't expose the escalation path.
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

function generateTempPassword() {
  // 16 chars, mixed alphabet — generated server-side, never guessable
  // from anything the client sends.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: check.status });

  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("*").order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: check.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const full_name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "");
  const group_id = body.group_id ? String(body.group_id) : null;

  if (!full_name || full_name.length > 200) {
    return NextResponse.json({ error: "A valid full name is required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!["admin", "leader", "intern"].includes(role)) {
    return NextResponse.json({ error: "Role must be admin, leader, or intern" }, { status: 400 });
  }
  if (role === "intern" && !group_id) {
    return NextResponse.json({ error: "Interns must be assigned to a group" }, { status: 400 });
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name,
      role,
      group_id: role === "intern" ? group_id : null,
    },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Could not create user" }, { status: 400 });
  }

  // If they're a leader, wire up the group <-> leader relationship
  // atomically (replaces any previous leader of that group).
  if (role === "leader" && group_id) {
    const { error: assignError } = await admin.rpc("assign_group_leader", {
      p_group_id: group_id,
      p_leader_id: created.user.id,
    });
    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    user: created.user,
    // Returned once, so the admin can hand it to the new hire. It is
    // never stored anywhere in plaintext — Supabase Auth hashes it
    // before persisting, and this response is the only place it exists.
    temporaryPassword: tempPassword,
  });
}
