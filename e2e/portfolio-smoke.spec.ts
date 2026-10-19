import { expect, test } from "@playwright/test";

test("home page renders research portfolio and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main#main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("title")).toHaveText(/Quantum AI Lab/i);
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
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeHidden();
});

test("research lab route is navigable", async ({ page }) => {
  await page.goto("/lab");
  await expect(page.locator("#lab-main")).toBeVisible();
});
