import { createBrowserClient } from "@supabase/ssr";

// Used only in client components. Relies on @supabase/ssr's cookie-backed
// storage, so the session lives in httpOnly-managed cookies handled by the
// Next.js middleware below rather than a hand-rolled localStorage token.
//
// Note: intentionally NOT parameterized with the Database type here. The
// hand-written types in lib/types.ts are applied at each call site via
// `.returns<T[]>()` instead — that keeps query results strongly typed
// without fighting supabase-js's stricter generic inference rules for a
// schema this small.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
