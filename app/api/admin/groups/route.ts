import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Groups don't need the service-role client — the `groups_insert` RLS
  // policy already restricts this to admins, so we can use the regular
  // session-bound server client and let the database be the enforcement
  // point. (Contrast with users/route.ts, where auth.users itself can
  // only be touched with the service role.)
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const description = body?.description ? String(body.description).trim() : null;

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "A valid group name is required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("groups").insert({ name, description }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ group: data });
}
