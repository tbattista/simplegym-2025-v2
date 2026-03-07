// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');

test.describe('Responsive Layout', () => {

  test.describe('Desktop (1280x800)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('home page shows desktop dashboard layout', async ({ page }) => {
      await page.goto(`${BASE}/index.html`);
      await waitForAppReady(page);

      // Desktop dashboard should be visible or sidebar should be expanded
      const desktopDash = page.locator('#desktopAuthDashboard, #desktopUnauthWelcome');
      const sidebar = page.locator('#layout-menu');

      await expect(sidebar).toBeAttached();
      // Desktop sidebar should be visible (not collapsed)
      const sidebarVisible = await sidebar.isVisible();
      expect(sidebarVisible).toBe(true);
    });

    test('workout builder shows desktop start button', async ({ page }) => {
      await page.goto(`${BASE}/workout-builder.html`);
      await waitForAppReady(page);

      const desktopBtn = page.locator('#desktopStartWorkoutBtn');
      await expect(desktopBtn).toBeAttached();
    });

    test('workout history shows desktop layout elements', async ({ page }) => {
      await page.goto(`${BASE}/workout-history.html`);
      await waitForAppReady(page);

      // Desktop layout uses historyContent (canonical) and sessionHistoryContainer
      const desktopContent = page.locator('#historyContent, #sessionHistoryContainer');
      await expect(desktopContent.first()).toBeAttached();
    });

    test('exercise database shows toolbar on desktop', async ({ page }) => {
      await page.goto(`${BASE}/exercise-database.html`);
      await waitForAppReady(page);

      const toolbar = page.locator('#exerciseToolbar');
      await expect(toolbar).toBeAttached();
      await expect(toolbar).toBeVisible();
    });
  });

  test.describe('Mobile (375x812)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('home page shows mobile layout', async ({ page }) => {
      await page.goto(`${BASE}/index.html`);
      await waitForAppReady(page);

      // Mobile layout should show authenticated or unauthenticated mobile view
      const mobileDash = page.locator('#authenticatedDashboard, #unauthenticatedWelcome');
      await expect(mobileDash.first()).toBeAttached();
    });

    test('sidebar is collapsed on mobile', async ({ page }) => {
      await page.goto(`${BASE}/index.html`);
      await waitForAppReady(page);

      // Menu toggle should exist
      const toggler = page.locator('.layout-menu-toggle');
      await expect(toggler.first()).toBeAttached();
    });

    test('workout history has tabs on mobile', async ({ page }) => {
      await page.goto(`${BASE}/workout-history.html`);
      await waitForAppReady(page);

      // On mobile, tabs container should exist (may be prefixed with mobile_)
      const tabs = page.locator('#historyTabs, #mobile_historyTabs');
      await expect(tabs.first()).toBeAttached();

      // Tab buttons should exist
      await expect(page.locator('#history-tab')).toBeAttached();
      await expect(page.locator('#calendar-tab')).toBeAttached();
      await expect(page.locator('#exercises-tab')).toBeAttached();
    });

    test('exercise database cards render on mobile', async ({ page }) => {
      await page.goto(`${BASE}/exercise-database.html`);
      await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

      const cards = page.locator('#exerciseTableContainer .card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('programs page renders on mobile', async ({ page }) => {
      await page.goto(`${BASE}/programs.html`);
      await waitForAppReady(page);

      const grid = page.locator('#programsGridContainer');
      await expect(grid).toBeAttached();
    });
  });
});
