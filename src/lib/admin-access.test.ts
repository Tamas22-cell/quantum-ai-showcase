import { describe, expect, it, vi } from "vitest";
import { authConfigured, requireAdmin, supabase } from "./site-auth";
import { shouldDenyAdminRequest, verifySupabaseAdmin } from "./admin-access";

describe("admin authorization is server-verified and fail-closed", () => {
  it("does not initialize a backend without configuration", async () => {
    expect(authConfigured).toBe(false);
    expect(supabase).toBeNull();
    expect(await requireAdmin()).toBe(false);
  });

  it("rejects missing configuration before any network request", async () => {
    const requester = vi.fn();
    expect(await verifySupabaseAdmin("test", {}, requester)).toBe(false);
    expect(requester).not.toHaveBeenCalled();
  });

  it("allows only a verified user plus a true DB admin role", async () => {
    const requester = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "user-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => true });
    expect(await verifySupabaseAdmin("test-access-token", {
      url: "https://test.supabase.co", publicKey: "test-anon-key",
    }, requester)).toBe(true);
    expect(requester).toHaveBeenCalledTimes(2);
  });

  it("denies a valid user without admin role", async () => {
    const requester = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "user-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => false });
    expect(await verifySupabaseAdmin("normal-user", {
      url: "https://test.supabase.co", publicKey: "test-anon-key",
    }, requester)).toBe(false);
  });

  it("denies when Supabase authentication or role RPC is unavailable", async () => {
    const requester = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await verifySupabaseAdmin("test-token", {
      url: "https://test.supabase.co", publicKey: "test-anon-key",
    }, requester)).toBe(false);
  });

  it.each([
    "https://example.test/admin",
    "https://example.test/admin/",
    "https://example.test/admin/users?role=admin",
  ])("denies direct visits to %s", (url) => {
    expect(shouldDenyAdminRequest(url)).toBe(true);
  });

  it.each([
    "https://example.test/",
    "https://example.test/account",
    "https://example.test/administer",
  ])("does not affect public URL %s", (url) => {
    expect(shouldDenyAdminRequest(url)).toBe(false);
  });
});
