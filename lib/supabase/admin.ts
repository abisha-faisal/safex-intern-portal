import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// DANGER: this client uses the service role key and bypasses Row Level
// Security entirely. It must only ever be imported from files under
// app/api/** (Route Handlers), which run exclusively on the server.
// The `server-only` import above makes Next.js throw a build error if
// this module is ever pulled into a Client Component bundle.
//
// This is the ONLY place in the codebase allowed to:
//   - create or delete auth.users records
//   - change a user's role or group assignment directly
//
// Not parameterized with Database — see the note in supabase/client.ts.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
