// Supabase integration is intentionally disabled until authentication is needed.
// Keep the existing account/admin routes inactive without contacting Supabase.
import type { SupabaseClient } from "@supabase/supabase-js";

export const authConfigured = false;
export const supabase: SupabaseClient | null = null;

export async function requireAdmin(): Promise<boolean> {
  return false;
}
