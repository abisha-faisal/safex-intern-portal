"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui";

export function FeedbackForm({ groupId, alreadySubmitted }: { groupId: string; alreadySubmitted: boolean }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (alreadySubmitted || done) {
    return (
      <div className="rounded-md border border-border bg-surface p-6 text-center shadow-card">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-status-completeBg text-status-complete">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5l3 3 7-7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-ink-900">Thanks — feedback submitted for this week.</p>
        <p className="mt-1 text-xs text-ink-600/60">
          It's recorded anonymously; there's no way to trace it back to your account.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Choose a rating first.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId, rating, comment }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not submit feedback");
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display text-base font-semibold text-ink-900">This week's feedback</h2>
      <p className="mt-1 text-sm text-ink-600/70">
        Anonymous — your group leader and admins see only aggregated ratings and comments, never who submitted them.
      </p>

      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            className={
              "flex h-10 w-10 items-center justify-center rounded-sx border text-sm font-medium transition-colors " +
              (rating >= n
                ? "border-signal-500 bg-signal-50 text-signal-600"
                : "border-border-strong text-ink-600/50 hover:border-signal-300")
            }
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-600/50">1 = needs improvement · 5 = excellent</p>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment for your leader…"
        rows={4}
        className={inputClass + " mt-4"}
      />

      {error && <div className="mt-3 rounded-sx bg-status-blockedBg px-3 py-2 text-sm text-status-blocked">{error}</div>}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Submit anonymously"}
        </Button>
      </div>
    </form>
  );
}
