import { test, expect } from '@playwright/test';

test('public workouts page loads and displays seeded workouts', async ({ page }) => {
  // Listen for console messages
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto('/public-workouts.html');

  // Wait for page initialization (script waits 1s for auth + API call)
  await page.waitForTimeout(5000);

  // Check what's on the page
  const bodyText = await page.textContent('body');
  console.log('--- Console logs ---');
  consoleLogs.forEach(log => console.log(log));

  // Check for workout cards
  const cards = page.locator('.workout-list-card');
  const cardCount = await cards.count();
  console.log(`\nFound ${cardCount} workout cards`);

  // Check if empty state is showing
  const emptyState = page.locator('.workout-grid-empty');
  const emptyVisible = await emptyState.isVisible();
  console.log(`Empty state visible: ${emptyVisible}`);

  // Check if loading state is still showing
  const loadingState = page.locator('.workout-grid-loading');
  const loadingVisible = await loadingState.isVisible();
  console.log(`Loading state visible: ${loadingVisible}`);

  // Check grid content area
  const gridContent = page.locator('.workout-grid-content');
  const contentVisible = await gridContent.isVisible();
  console.log(`Grid content visible: ${contentVisible}`);

  // Check for the container
  const container = page.locator('#publicWorkoutsContainer');
  const containerHTML = await container.innerHTML();
  console.log(`Container HTML length: ${containerHTML.length}`);
  console.log(`Container HTML preview: ${containerHTML.substring(0, 500)}`);

  // Check toolbar count
  const toolbarCount = page.locator('#toolbarCount');
  const countText = await toolbarCount.textContent();
  console.log(`Toolbar count: "${countText}"`);

  // Look for any error toasts
  const toasts = page.locator('.toast');
  const toastCount = await toasts.count();
  if (toastCount > 0) {
    for (let i = 0; i < toastCount; i++) {
      const toastText = await toasts.nth(i).textContent();
      console.log(`Toast ${i}: ${toastText}`);
    }
  }

  // Check if header rendered
  const header = page.locator('h4');
  await expect(header).toContainText('Discover Shared Workouts');

  // Assert we found cards
  expect(cardCount).toBeGreaterThan(0);
});
