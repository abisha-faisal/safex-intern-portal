import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { CreateUserButton } from "@/components/CreateUserButton";
import { UserManagementTable } from "@/components/UserManagementTable";
import type { Profile, Group } from "@/lib/types";

export default async function UsersPage() {
  const supabase = createClient();
  const { user, profile: me } = await getCurrentProfile();

  // Defense in depth: even though nothing links here for non-admins and
  // the underlying writes are already blocked server-side, don't even
  // render the page for a leader/intern who navigates here directly.
  if (me?.role !== "admin") {
    redirect("/dashboard");
  }

  const [{ data: people }, { data: groups }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name").returns<Profile[]>(),
    supabase.from("groups").select("*").order("name").returns<Group[]>(),
  ]);

  return (
    <div>
      <PageHeader
        title="User management"
        description="Every account at SafeX. Admins are the only role that can create, delete, or reassign anyone."
        action={<CreateUserButton groups={groups ?? []} />}
      />
      <UserManagementTable people={people ?? []} groups={groups ?? []} currentUserId={user!.id} />
    </div>
  );
}