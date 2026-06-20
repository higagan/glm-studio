import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseUrl } from "./supabase-env.js";

export function getSupabase() {
  const url = resolveSupabaseUrl();
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key);
}
