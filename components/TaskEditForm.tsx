"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui";
import type { Profile, Task } from "@/lib/types";

export function TaskEditForm({
  task,
  canEditFull,
  assigneeOptions,
}: {
  task: Task;
  canEditFull: boolean;
  assigneeOptions: Profile[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [deadline, setDeadline] = useState(task.deadline ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assignee_id);
  const [status, setStatus] = useState(task.status);
  const [progress, setProgress] = useState(task.progress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const body: Record<string, unknown> = { status, progress };
    if (canEditFull) {
      body.title = title;
      body.description = description;
      body.deadline = deadline || null;
      body.assignee_id = assigneeId;
    }

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not save changes");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEditFull}
          className={inputClass + (!canEditFull ? " bg-surface-muted text-ink-600/70" : "")}
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEditFull}
          rows={4}
          className={inputClass + (!canEditFull ? " bg-surface-muted text-ink-600/70" : "")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Deadline">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={!canEditFull}
            className={inputClass + (!canEditFull ? " bg-surface-muted text-ink-600/70" : "")}
          />
        </Field>
        <Field label="Assigned to">
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={!canEditFull}
            className={inputClass + (!canEditFull ? " bg-surface-muted text-ink-600/70" : "")}
          >
            {assigneeOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-md border border-border-strong bg-surface-sunk p-4">
        <Field label="Status (you can always update this)">
          <select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])} className={inputClass}>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
        <Field label={`Progress — ${progress}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="mt-3 w-full accent-signal-500"
          />
        </Field>
      </div>

      {error && <div className="rounded-sx bg-status-blockedBg px-3 py-2 text-sm text-status-blocked">{error}</div>}
      {saved && !error && <div className="text-sm text-status-complete">Saved.</div>}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
