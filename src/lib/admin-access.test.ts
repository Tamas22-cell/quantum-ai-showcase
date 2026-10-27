import { describe, expect, it } from "vitest";
import { authConfigured, requireAdmin, supabase } from "./site-auth";
import { shouldDenyAdminRequest } from "./admin-access";

describe("disabled admin backend is fail-closed", () => {
  it("does not initialize a backend without configuration", async () => {
    expect(authConfigured).toBe(false);
    expect(supabase).toBeNull();
    expect(await requireAdmin()).toBe(false);
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
