/**
 * Creates the very first Admin account for a brand-new SafeX Portal
 * deployment. There is no in-app sign-up, so this script is the only way
 * to get the first user into the system — every account after this one
 * is created from inside the app by an existing admin.
 *
 * Usage (from the project root, after `npm install`):
 *
 *   SUPABASE_URL=https://your-project.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node scripts/create-first-admin.mjs "Jane Doe" jane@safexsolutions.com
 *
 * The service role key is the same value you put in .env.local as
 * SUPABASE_SERVICE_ROLE_KEY — grab it from Supabase → Project Settings →
 * API → service_role. Never commit it, never put it in NEXT_PUBLIC_*.
 */

import { createClient } from "@supabase/supabase-js";

const [, , fullName, email] = process.argv;

if (!fullName || !email) {
  console.error('Usage: node scripts/create-first-admin.mjs "Full Name" email@company.com');
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const password = generatePassword();

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, role: "admin", group_id: null },
});

if (error) {
  console.error("Failed to create admin:", error.message);
  process.exit(1);
}

console.log("\n✅ First Admin account created.\n");
console.log("Email:              ", email);
console.log("Temporary password: ", password);
console.log(
  "\nThis user will be required to set a new password the first time they sign in. Store this password securely and hand it off out-of-band — it is not saved anywhere in plaintext.\n"
);
