/**
 * Hard deny while admin backend and server-side session authorization are absent.
 * This check runs before SSR so the browser cannot bypass it.
 */
export function shouldDenyAdminRequest(url: string): boolean {
  const pathname = new URL(url).pathname;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
