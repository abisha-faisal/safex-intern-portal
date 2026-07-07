"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui";
import { initials } from "@/lib/utils";
import type { TaskNote } from "@/lib/types";

export function NotesThread({
  taskId,
  notes,
  authorNameById,
  currentUserId,
}: {
  taskId: string;
  notes: TaskNote[];
  authorNameById: Map<string, string>;
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/tasks/${taskId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not post note");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div className="rounded-md border border-border bg-surface shadow-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-base font-semibold text-ink-900">Notes</h2>
      </div>

      <ul className="max-h-96 divide-y divide-border overflow-y-auto">
        {notes.map((n) => (
          <li key={n.id} className="flex gap-3 px-5 py-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sx bg-navy-50 text-[10px] font-semibold text-navy-700">
              {initials(authorNameById.get(n.author_id) ?? "?")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-ink-900">
                  {n.author_id === currentUserId ? "You" : authorNameById.get(n.author_id) ?? "Unknown"}
                </span>
                <span className="font-data text-xs text-ink-600/40">
                  {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700">{n.body}</p>
            </div>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-ink-600/50">No notes yet.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-4">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note…"
          className={inputClass + " flex-1"}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Posting…" : "Post"}
        </Button>
      </form>
      {error && <div className="px-4 pb-4 text-sm text-status-blocked">{error}</div>}
    </div>
  );
}
