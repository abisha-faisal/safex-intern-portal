"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui";
import type { Profile } from "@/lib/types";

export function AssignLeaderControl({
  groupId,
  currentLeaderId,
  candidates,
}: {
  groupId: string;
  currentLeaderId: string | null;
  candidates: Profile[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentLeaderId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newValue: string) {
    setValue(newValue);
    if (!newValue) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_id: newValue }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not assign leader");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <select
          value={value}
          disabled={loading}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass + " max-w-xs"}
        >
          <option value="">No leader assigned</option>
          {candidates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} {p.role === "leader" ? "(reassign from current group)" : ""}
            </option>
          ))}
        </select>
        {loading && <span className="text-xs text-ink-600/50">Saving…</span>}
      </div>
      {error && <p className="mt-1.5 text-xs text-status-blocked">{error}</p>}
      <p className="mt-1.5 text-xs text-ink-600/50">
        Assigning a new leader automatically replaces the group's previous one.
      </p>
    </div>
  );
}
