export function shouldDenyAdminRequest(url: string): boolean {
  const pathname = new URL(url).pathname;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

type PublicSupabaseConfig = { url?: string; publicKey?: string };
type Requester = typeof fetch;

/** Validate every request against Supabase Auth AND its server-side admin RPC. */
export async function verifySupabaseAdmin(
  accessToken: string | undefined,
  config: PublicSupabaseConfig,
  requester: Requester = fetch,
): Promise<boolean> {
  const { url, publicKey } = config;
  if (
    !accessToken || accessToken.length > 8192 ||
    !url || !/^https:\/\//.test(url) || !publicKey
  ) return false;

  try {
    const origin = url.replace(/\/$/, "");
    const headers = {
      apikey: publicKey,
      authorization: `Bearer ${accessToken}`,
    };
    const auth = await requester(origin + "/auth/v1/user", {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!auth.ok) return false;
    const identity = await auth.json() as { id?: unknown };
    if (typeof identity.id !== "string" || !identity.id) return false;

    // This RPC derives user identity from the verified Bearer token using auth.uid().
    const role = await requester(origin + "/rest/v1/rpc/is_site_admin", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(5000),
    });
    if (!role.ok) return false;
    return (await role.json()) === true;
  } catch {
    // Missing RPC, expired session, unavailable server or malformed response: deny.
    return false;
  }
}
