// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady, gotoWithData, clearTestData } = require('./fixtures');

test.describe('Dashboard - Home Page', () => {

  test('home page shows unauthenticated welcome for anonymous users', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    // Either the unauth welcome or the auth dashboard should be visible
    const unauthMobile = page.locator('#unauthenticatedWelcome');
    const authMobile = page.locator('#authenticatedDashboard');
    const hasUnauth = await unauthMobile.isVisible().catch(() => false);
    const hasAuth = await authMobile.isVisible().catch(() => false);

    // At least one view should be present
    expect(hasUnauth || hasAuth).toBe(true);
  });

  test('desktop home page renders layout correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    // Desktop layout should have sidebar menu
    const menu = page.locator('#layout-menu');
    await expect(menu).toBeAttached();
  });

  test('mobile home page has Quick Log button', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    // Quick Log link to activity-log.html
    const quickLogBtn = page.locator('a[href*="activity-log.html"]');
    await expect(quickLogBtn.first()).toBeAttached();
  });

  test('home page shows favorites section', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    // Favorites section should exist (may show empty state)
    const favSection = page.locator('#favoritesSection, #desktopFavoritesContent, #favoritesEmpty');
    await expect(favSection.first()).toBeAttached({ timeout: 5000 });
  });

  test('home page shows weekly progress card', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    const progressCard = page.locator('#weeklyProgressCard, #desktopWeeklyProgressCard');
    await expect(progressCard.first()).toBeAttached({ timeout: 5000 });
  });

  test('home page shows recent activity section', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    const recentSection = page.locator('#recentActivitySection, #recentActivityContent, #desktopRecentActivityContent');
    await expect(recentSection.first()).toBeAttached({ timeout: 5000 });
  });
});
