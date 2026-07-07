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
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const interns = internsByGroup[groupId] ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!assigneeId) {
      setError("Choose who this task is assigned to.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, deadline: deadline || null, assignee_id: assigneeId, group_id: groupId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not create task");
      return;
    }

    setOpen(false);
    setTitle("");
    setDescription("");
    setDeadline("");
    setAssigneeId("");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New task</Button>
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
              {loading ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
