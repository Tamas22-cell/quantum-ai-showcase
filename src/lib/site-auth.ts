import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authConfigured = Boolean(url && key);
export const supabase = authConfigured ? createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
}) : null;

export async function requireAdmin() {
  if (!supabase) return false;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;
  const { data, error: roleError } = await supabase.rpc("is_site_admin");
  return !roleError && data === true;
}
