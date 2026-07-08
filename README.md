# SafeX Intern Management Portal

Internal tool for SafeX Solutions to manage interns, group leaders, weekly tasks, and anonymous feedback. Role-based access is enforced in the database, not just hidden in the UI.

**Live app:** https://safexinterns-five.vercel.app

**Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Row Level Security), hosted on Vercel.

---

## Access control

Three roles: `admin`, `leader`, `intern`, stored in a `profiles` table. Every table that matters has Row Level Security enabled, and the policies in `supabase/schema.sql` are the real gate, not the app code. A leader who opens dev tools and queries `tasks` directly still only gets their own group's rows. An intern's task update still gets rejected at the database level if they touch anything besides status or progress.

Feedback anonymity is structural: the `feedback` table has no author column at all, so no admin, however privileged, can ever trace a submission back to an intern.

| Action | Admin | Leader | Intern |
|---|---|---|---|
| Create or delete any user | Yes | No | No |
| Change a user's role or group | Yes | No | No |
| Create or delete groups, assign leaders | Yes | No | No |
| View all groups and tasks company-wide | Yes | No | No |
| View their own group's leader and teammates | Yes | Yes | Yes |
| Create tasks, including whole-group assignments | Yes | Yes | No |
| Manage tasks in their own group | Yes | Yes | No |
| Update status/progress on their own task | Yes | Yes | Own tasks only |
| Submit anonymous weekly feedback | N/A | N/A | Yes |
| View aggregated feedback | All groups | Own group | No |

## Notable design decisions

- **Group tasks are linked, not duplicated.** Assigning a task to a whole group creates one row per intern, but all copies share a `batch_id`, so the UI shows one task with an "N/M complete" indicator instead of duplicates, and editing the title, description, or deadline can apply to every copy at once.
- **Auth checks are request-memoized.** `getCurrentProfile()` in `lib/supabase/server.ts` uses React's `cache()` so a single page load fetches the signed-in user's profile once and shares it across the layout and page, instead of repeating the same Supabase call two or three times.
- **Deleting a user never gets blocked by their history.** Tasks they created and notes they wrote survive account deletion; the reference just becomes null instead of Postgres refusing the delete.
- **Mobile menu avoids an iOS Safari quirk.** The slide-out nav renders as a sibling of the sticky top bar, not nested inside it, since Safari treats a blurred ancestor as the containing block for fixed-position children.

## Project structure

\`\`\`
app/
  login/, change-password/         Public auth flows
  (portal)/                        Everything behind auth
    dashboard/, directory/, groups/, tasks/, feedback/, users/
  api/admin/, api/tasks/, api/feedback/
components/                        UI building blocks
lib/supabase/                      client.ts, server.ts, admin.ts
supabase/schema.sql                Tables, RLS policies, triggers, functions
scripts/create-first-admin.mjs     Bootstraps account #1
middleware.ts                      Refreshes the Supabase session cookie
\`\`\`

## Setup

1. Create a Supabase project. In SQL Editor, run the full contents of `supabase/schema.sql` (safe to re-run).
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL, anon key, and service role key.
3. `npm install && npm run dev`
4. Bootstrap the first admin:
   \`\`\`bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-first-admin.mjs "Name" you@safexsolutions.com
   \`\`\`
5. Sign in with the printed temporary password, set a real one, and use User management to create everyone else. The terminal script is only ever needed once.

## Deploying

Push to GitHub, import the repo on Vercel, add the same three environment variables, and deploy. Every future change flows through a pull request: Vercel builds a preview automatically, merge to `main` ships it live, and any failed deploy can be rolled back instantly from Vercel's Deployments tab.

## Handover notes

Using the app day-to-day needs nothing beyond an admin login, no code or infrastructure access required. The GitHub repo, Vercel project, and Supabase project may still sit under the original developer's personal accounts; that's fine until a code change or new developer is needed, at which point access can be granted or ownership formally transferred.

New developers should start with the RLS policies in `supabase/schema.sql`, they are the actual source of truth for permissions, not any single file in `app/` or `components/`.
