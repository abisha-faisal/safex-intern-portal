"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button, Field, inputClass } from "@/components/ui";
import type { Profile, Group } from "@/lib/types";

export function CreateTaskButton({
  groups,
  internsByGroup,
}: {
  groups: Group[];
  internsByGroup: Record<string, Profile[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [assignMode, setAssignMode] = useState<"one" | "group">("one");
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const interns = internsByGroup[groupId] ?? [];

  function reset() {
    setTitle("");
    setDescription("");
    setDeadline("");
    setAssigneeId("");
    setAssignMode("one");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (assignMode === "one" && !assigneeId) {
      setError("Choose who this task is assigned to.");
      return;
    }
    if (assignMode === "group" && interns.length === 0) {
      setError("This group has no interns yet.");
      return;
    }

    setLoading(true);

    const targets = assignMode === "group" ? interns.map((p) => p.id) : [assigneeId];

    // The `tasks` table is still one row per person (RLS/columns are
    // scoped per-intern), but for a group assignment we generate one
    // shared batch_id and send it with every copy. That lets the task
    // board show them as a single grouped task and lets editing the
    // title/description/deadline later apply to every copy at once,
    // instead of the copies being fully independent.
    const batchId = assignMode === "group" && targets.length > 1 ? crypto.randomUUID() : null;

    const results = await Promise.all(
      targets.map((id) =>
        fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            deadline: deadline || null,
            assignee_id: id,
            group_id: groupId,
            batch_id: batchId,
          }),
        })
      )
    );

    setLoading(false);

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      setError(
        failed.length === results.length
          ? "Could not create the task."
          : `Created for ${results.length - failed.length} of ${results.length} interns — some failed.`
      );
      if (failed.length < results.length) {
        router.refresh();
      }
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <Button
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        + New task
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Assign a new task">
        <form onSubmit={handleSubmit} className="space-y-4">
          {groups.length > 1 && (
            <Field label="Group">
              <select
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value);
                  setAssigneeId("");
                }}
                className={inputClass}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Assign to">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignMode("one")}
                className={
                  "flex-1 rounded-sx border px-3 py-2 text-sm font-medium transition-colors " +
                  (assignMode === "one"
                    ? "border-signal-500 bg-signal-50 text-signal-600"
                    : "border-border-strong text-ink-600/60 hover:border-signal-300")
                }
              >
                One intern
              </button>
              <button
                type="button"
                onClick={() => setAssignMode("group")}
                className={
                  "flex-1 rounded-sx border px-3 py-2 text-sm font-medium transition-colors " +
                  (assignMode === "group"
                    ? "border-signal-500 bg-signal-50 text-signal-600"
                    : "border-border-strong text-ink-600/60 hover:border-signal-300")
                }
              >
                Whole group ({interns.length})
              </button>
            </div>
          </Field>

          {assignMode === "one" ? (
            <Field label="Intern">
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputClass} required>
                <option value="">Select an intern…</option>
                {interns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              {interns.length === 0 && (
                <p className="mt-1.5 text-xs text-ink-600/50">This group has no interns yet.</p>
              )}
            </Field>
          ) : (
            <p className="rounded-sx bg-surface-sunk px-3 py-2 text-xs text-ink-600/60">
              This creates one linked task for all {interns.length} intern
              {interns.length === 1 ? "" : "s"} in this group. Each intern tracks their own
              status and progress independently, but editing the title, description, or
              deadline later can be applied to everyone at once from the task page.
            </p>
          )}

          <Field label="Title">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={3} />
          </Field>
          <Field label="Deadline">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
          </Field>

          {error && <div className="rounded-sx bg-status-blockedBg px-3 py-2 text-sm text-status-blocked">{error}</div>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : assignMode === "group" ? `Create for ${interns.length} interns` : "Create task"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}