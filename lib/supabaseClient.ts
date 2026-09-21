import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== "undefined" && (!url || !anonKey)) {
  console.warn(
    "[bingo] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — " +
    "realtime sync between the host and players will not work until they are configured."
  );
}

// Fall back to a placeholder so the client can be constructed even when env
// vars are missing (e.g. during a build without secrets configured yet).
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "public-anon-key-placeholder"
);
