"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button, Field, inputClass } from "@/components/ui";
import type { Profile } from "@/lib/types";

export function CreateGroupButton({ people }: { people: Profile[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableLeaders = people.filter((p) => p.role === "leader" || p.role === "intern");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    if (leaderId) {
      await fetch(`/api/admin/groups/${data.group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leader_id: leaderId }),
      });
    }

    setLoading(false);
    setOpen(false);
    setName("");
    setDescription("");
    setLeaderId("");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New group</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create group">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Group name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Platform Engineering" />
          </Field>
          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              rows={2}
            />
          </Field>
          <Field label="Assign a leader (optional)">
            <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)} className={inputClass}>
              <option value="">No leader yet</option>
              {availableLeaders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.role === "leader" ? "(currently a leader)" : ""}
                </option>
              ))}
            </select>
          </Field>
          {error && <div className="rounded-sx bg-status-blockedBg px-3 py-2 text-sm text-status-blocked">{error}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create group"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
