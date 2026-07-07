"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function GroupAdminControls({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/groups/${groupId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not delete group");
      setLoading(false);
      return;
    }
    router.push("/groups");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-sx bg-status-blockedBg px-3 py-2">
        <span className="text-sm text-status-blocked">Delete "{groupName}" permanently?</span>
        <Button variant="danger" onClick={handleDelete} disabled={loading}>
          {loading ? "Deleting…" : "Confirm"}
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Delete group
      </Button>
      {error && <p className="mt-1.5 text-xs text-status-blocked">{error}</p>}
    </div>
  );
}
