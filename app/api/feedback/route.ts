import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const group_id = String(body?.group_id ?? "");
  const rating = Number(body?.rating);
  const comment = String(body?.comment ?? "").trim();

  if (!group_id) return NextResponse.json({ error: "Missing group" }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5" }, { status: 400 });
  }
  if (comment.length > 2000) {
    return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
  }

  // submit_feedback() is a SECURITY DEFINER function — it is the ONLY
  // write path into the `feedback` table for any role. It re-checks that
  // the caller is an intern in this exact group and that they haven't
  // already submitted this week, then inserts a row with no author
  // column at all, so nothing here (or in the database) can trace this
  // submission back to this user afterward.
  const { error } = await supabase.rpc("submit_feedback", {
    p_group_id: group_id,
    p_rating: rating,
    p_comment: comment,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
