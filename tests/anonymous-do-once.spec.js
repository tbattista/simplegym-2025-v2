import { test, expect } from '@playwright/test';

test.describe('Anonymous Do Once workflow', () => {

  test('anonymous user can click Do Once and navigate to workout mode', async ({ page }) => {
    // Go to public workouts page (no login)
    await page.goto('/public-workouts.html');

    // Wait for workouts to load
    await page.waitForTimeout(5000);

    // Check that workout cards are present
    const cards = page.locator('.workout-list-card');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip('No public workouts available to test with');
      return;
    }

    // Click the first workout card to open detail
    await cards.first().click();

    // Wait for detail offcanvas to appear
    const offcanvas = page.locator('.offcanvas.show');
    await expect(offcanvas).toBeVisible({ timeout: 5000 });

    // Find and click the "Do Once" button
    const doOnceBtn = page.locator('[data-action="do-once"]');
    await expect(doOnceBtn).toBeVisible({ timeout: 3000 });
    await doOnceBtn.click();

    // Should navigate to workout-mode.html with source=public param
    await page.waitForURL(/workout-mode\.html\?id=.*&source=public/, { timeout: 10000 });

    // Verify URL has correct params
    const url = new URL(page.url());
    expect(url.searchParams.get('source')).toBe('public');
    expect(url.searchParams.get('id')).toBeTruthy();

    // Wait for workout mode page to load
    await page.waitForTimeout(3000);

    // Verify workout content is rendered (exercise cards should appear)
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // The workout should be saved in localStorage
    const localWorkouts = await page.evaluate(() => {
      const stored = localStorage.getItem('gym_workouts');
      return stored ? JSON.parse(stored) : [];
    });
    expect(localWorkouts.length).toBeGreaterThan(0);
  });

  test('anonymous user should not see login modal when clicking Do Once', async ({ page }) => {
    await page.goto('/public-workouts.html');
    await page.waitForTimeout(5000);

    const cards = page.locator('.workout-list-card');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip('No public workouts available to test with');
      return;
    }

    // Click the first workout card
    await cards.first().click();

    const offcanvas = page.locator('.offcanvas.show');
    await expect(offcanvas).toBeVisible({ timeout: 5000 });

    // Click Do Once
    const doOnceBtn = page.locator('[data-action="do-once"]');
    await expect(doOnceBtn).toBeVisible({ timeout: 3000 });
    await doOnceBtn.click();

    // Auth modal should NOT appear
    await page.waitForTimeout(1000);
    const authModal = page.locator('#authModal.show');
    const modalVisible = await authModal.isVisible();
    expect(modalVisible).toBe(false);
  });

});
