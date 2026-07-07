import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { Profile, Group, Feedback } from "@/lib/types";

export default async function FeedbackPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();

  if (me?.role === "intern") {
    let alreadySubmitted = false;
    if (me.group_id) {
      const { data } = await supabase.rpc("has_submitted_feedback_this_week", { p_group_id: me.group_id });
      alreadySubmitted = Boolean(data);
    }

    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="Weekly feedback" description="A quick, anonymous check-in with your group leader." />
        {me.group_id ? (
          <FeedbackForm groupId={me.group_id} alreadySubmitted={alreadySubmitted} />
        ) : (
          <div className="rounded-md border border-dashed border-border-strong p-8 text-center text-sm text-ink-600/60">
            You're not assigned to a group yet — ask your admin to add you to one.
          </div>
        )}
      </div>
    );
  }

  // Leader/admin: feedback rows are already scoped by RLS (leader sees
  // only their own group's rows; admin sees all) and carry no author
  // reference whatsoever, so this view is aggregate-only by construction.
  const [{ data: feedback }, { data: groups }] = await Promise.all([
    supabase.from("feedback").select("*").order("created_at", { ascending: false }).returns<Feedback[]>(),
    supabase.from("groups").select("*").returns<Group[]>(),
  ]);

  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const byGroup = new Map<string, Feedback[]>();
  (feedback ?? []).forEach((f) => {
    byGroup.set(f.group_id, [...(byGroup.get(f.group_id) ?? []), f]);
  });

  return (
    <div>
      <PageHeader
        title="Feedback"
        description={
          me?.role === "admin"
            ? "Aggregated, anonymous feedback across every group."
            : "Aggregated, anonymous feedback from your group."
        }
      />

      <div className="space-y-6">
        {Array.from(byGroup.entries()).map(([groupId, entries]) => {
          const avg = entries.reduce((s, e) => s + e.rating, 0) / entries.length;
          return (
            <div key={groupId} className="rounded-md border border-border bg-surface shadow-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-display text-base font-semibold text-ink-900">
                  {groupName.get(groupId) ?? "Group"}
                </h2>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-data font-semibold text-ink-900">{avg.toFixed(1)}</span>
                  <span className="text-ink-600/50">avg · {entries.length} response{entries.length === 1 ? "" : "s"}</span>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {entries.slice(0, 10).map((f) => (
                  <li key={f.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-data text-sm font-semibold text-signal-600">{f.rating}/5</span>
                      <span className="text-xs text-ink-600/40">
                        {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {f.comment && <p className="mt-1 text-sm text-ink-700">{f.comment}</p>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {(feedback ?? []).length === 0 && (
          <div className="rounded-md border border-dashed border-border-strong p-10 text-center text-sm text-ink-600/60">
            No feedback submitted yet.
          </div>
        )}
      </div>
    </div>
  );
}
