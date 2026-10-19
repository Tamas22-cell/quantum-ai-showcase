import { expect, test } from "@playwright/test";

test("home page renders research portfolio and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main#main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page).toHaveTitle(/Quantum AI Lab/i);
});

test("no horizontal document overflow on mobile", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile viewport only");
  await page.goto("/");
  await expect(page.locator("main#main")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});

test("mobile navigation opens and Escape closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile viewport only");
  await page.goto("/");
  // Wait for client hydration so the first click is handled by React, not static SSR markup.\n  await page.waitForLoadState("networkidle");\n  const trigger = page.locator('button[aria-controls="mobile-navigation"]');
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#mobile-navigation")).toBeHidden();
});

test("research lab route is navigable", async ({ page }) => {
  await page.goto("/lab");
  await expect(page.locator("#lab-main")).toBeVisible();
});
