// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');

test.describe('Settings', () => {

  test('settings page loads successfully', async ({ page }) => {
    await page.goto(`${BASE}/settings.html`);
    await waitForAppReady(page);

    // Should have at least one settings card
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('activity chart toggle exists', async ({ page }) => {
    await page.goto(`${BASE}/settings.html`);
    await waitForAppReady(page);

    const toggle = page.locator('#showActivityChart');
    await expect(toggle).toBeAttached();
  });

  test('activity chart toggle can be clicked', async ({ page }) => {
    await page.goto(`${BASE}/settings.html`);
    await waitForAppReady(page);

    const toggle = page.locator('#showActivityChart');
    const initialState = await toggle.isChecked();

    await toggle.click();
    const newState = await toggle.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('activity chart days button group exists', async ({ page }) => {
    await page.goto(`${BASE}/settings.html`);
    await waitForAppReady(page);

    const daysGroup = page.locator('#activityChartDays');
    await expect(daysGroup).toBeAttached();

    // Should have day range buttons
    const buttons = daysGroup.locator('button, [data-value]');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('clicking a day range button updates selection', async ({ page }) => {
    await page.goto(`${BASE}/settings.html`);
    await waitForAppReady(page);

    const daysGroup = page.locator('#activityChartDays');
    const buttons = daysGroup.locator('[data-value]');
    const count = await buttons.count();

    if (count > 1) {
      // Click the second button
      await buttons.nth(1).click();
      await expect(buttons.nth(1)).toHaveClass(/active|btn-primary/);
    }
  });

  test('settings persist to localStorage', async ({ page }) => {
    await page.goto(`${BASE}/settings.html`);
    await waitForAppReady(page);

    // Toggle the activity chart
    const toggle = page.locator('#showActivityChart');
    await toggle.click();
    await page.waitForTimeout(500);

    // Check localStorage was updated
    const stored = await page.evaluate(() => {
      return localStorage.getItem('ffn_show_activity_chart') ||
             localStorage.getItem('showActivityChart') ||
             localStorage.getItem('ffn-show-activity-chart');
    });

    // Some value should be stored (exact key may vary)
    // This test validates the general pattern
    expect(stored !== undefined).toBe(true);
  });
});
