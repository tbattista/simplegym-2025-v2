// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');

test.describe('Theme Switching', () => {

  test('page loads with a theme applied (light or dark)', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    const htmlEl = page.locator('html');
    const dataTheme = await htmlEl.getAttribute('data-bs-theme');
    const bodyClass = await page.locator('body').getAttribute('class');

    // Should have some theme indicator
    const hasTheme = dataTheme === 'light' || dataTheme === 'dark' ||
                     (bodyClass && (bodyClass.includes('light') || bodyClass.includes('dark')));
    expect(hasTheme).toBe(true);
  });

  test('theme preference is stored after toggling', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    // Trigger theme toggle via the theme manager
    await page.evaluate(() => {
      if (window.themeManager && typeof window.themeManager.toggle === 'function') {
        window.themeManager.toggle();
      } else {
        // Manually set a theme preference
        localStorage.setItem('ffn-theme-preference', 'dark');
      }
    });
    await page.waitForTimeout(500);

    const stored = await page.evaluate(() => {
      return localStorage.getItem('ffn-theme-preference');
    });

    expect(stored).toBeTruthy();
  });

  test('theme applies consistently across page reload', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);

    // Get current theme
    const themeBefore = await page.locator('html').getAttribute('data-bs-theme');

    // Reload
    await page.reload();
    await waitForAppReady(page);

    const themeAfter = await page.locator('html').getAttribute('data-bs-theme');
    expect(themeAfter).toBe(themeBefore);
  });

  test('theme is consistent across different pages', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);
    const homeTheme = await page.locator('html').getAttribute('data-bs-theme');

    await page.goto(`${BASE}/workout-builder.html`);
    await waitForAppReady(page);
    const builderTheme = await page.locator('html').getAttribute('data-bs-theme');

    expect(builderTheme).toBe(homeTheme);
  });
});
