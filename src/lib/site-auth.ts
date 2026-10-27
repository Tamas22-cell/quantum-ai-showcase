import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Supabase publishable/anon key is public by design; never use a service-role key here.
export const authConfigured = Boolean(url && publicKey && /^https:\/\//.test(url));
export const supabase: SupabaseClient | null = authConfigured
  ? createClient(url!, publicKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export async function requireAdmin(): Promise<boolean> {
  if (!supabase) return false;
  try {
    // getUser contacts Supabase Auth and verifies identity; do not trust local profile metadata.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return false;
    // The database SECURITY DEFINER function must check auth.uid() and grants.
    const { data, error } = await supabase.rpc("is_site_admin");
    return !error && data === true;
  } catch {
    return false;
  }
}
