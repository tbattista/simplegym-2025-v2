// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');

test.describe('Navigation', () => {

  test('sidebar menu contains links to all major pages', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    const menu = page.locator('#layout-menu');
    await expect(menu).toBeAttached();

    // Check key nav links exist
    const expectedLinks = [
      'workout-builder.html',
      'exercise-database.html',
      'workout-history.html',
      'programs.html',
    ];

    for (const href of expectedLinks) {
      const link = menu.locator(`a[href*="${href}"]`);
      await expect(link.first()).toBeAttached();
    }
  });

  test('clicking a nav link navigates to the correct page', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 768, 'Sidebar navigation requires desktop viewport');
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    // Click on Exercise Database link
    const link = page.locator('#layout-menu a[href*="exercise-database.html"]').first();
    await link.click();
    await page.waitForURL(/exercise-database\.html/);
  });

  test('mobile layout shows hamburger menu toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/index.html`);
    await page.waitForLoadState('domcontentloaded');

    // Look for the menu toggle button (Bootstrap navbar toggler)
    const toggler = page.locator('.layout-menu-toggle');
    await expect(toggler.first()).toBeAttached();
  });
});
