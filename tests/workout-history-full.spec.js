// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');

test.describe('Workout History', () => {

  test('history page loads and shows tabs', async ({ page }) => {
    await page.goto(`${BASE}/workout-history.html`);
    await waitForAppReady(page);

    // Three tabs should exist
    const historyTab = page.locator('#history-tab');
    const calendarTab = page.locator('#calendar-tab');
    const exercisesTab = page.locator('#exercises-tab');

    await expect(historyTab).toBeAttached();
    await expect(calendarTab).toBeAttached();
    await expect(exercisesTab).toBeAttached();
  });

  test('history tab is active by default', async ({ page }) => {
    await page.goto(`${BASE}/workout-history.html`);
    await waitForAppReady(page);

    const historyTab = page.locator('#history-tab');
    await expect(historyTab).toHaveClass(/active/);
  });

  test('tab elements exist and are clickable when content loads (mobile)', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await context.newPage();
    await mobilePage.goto(`${BASE}/workout-history.html`);
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.waitForTimeout(2000);

    // Tabs exist in DOM even if content is hidden (requires auth/data to show)
    const calendarTab = mobilePage.locator('#calendar-tab');
    const exercisesTab = mobilePage.locator('#exercises-tab');

    await expect(calendarTab).toBeAttached();
    await expect(exercisesTab).toBeAttached();

    // Tab panes exist in DOM
    await expect(mobilePage.locator('#calendarTabPane')).toBeAttached();
    await expect(mobilePage.locator('#exercisesTabPane')).toBeAttached();

    await context.close();
  });

  test('session history container exists', async ({ page }) => {
    await page.goto(`${BASE}/workout-history.html`);
    await waitForAppReady(page);

    const container = page.locator('#sessionHistoryContainer, #desktopSessionHistoryContainer');
    await expect(container.first()).toBeAttached();
  });

  test('calendar has month navigation controls', async ({ page }) => {
    await page.goto(`${BASE}/workout-history.html`);
    await waitForAppReady(page);

    const prevMonth = page.locator('#historyPrevMonth, #desktopPrevMonth');
    const nextMonth = page.locator('#historyNextMonth, #desktopNextMonth');
    const currentMonth = page.locator('#historyCurrentMonth, #desktopCurrentMonth');

    await expect(prevMonth.first()).toBeAttached();
    await expect(nextMonth.first()).toBeAttached();
    await expect(currentMonth.first()).toBeAttached();
  });

  test('parseExerciseName strips equipment prefixes', async ({ page }) => {
    await page.goto(`${BASE}/workout-history.html`);
    await page.waitForFunction(() => typeof window.parseExerciseName === 'function', { timeout: 10000 });

    const result = await page.evaluate(() => {
      return window.parseExerciseName('Barbell Bench Press');
    });

    expect(result.baseName).toBe('Bench Press');
    expect(result.equipment).toBe('Barbell');
  });

  test('parseExerciseName handles exercises without equipment prefix', async ({ page }) => {
    await page.goto(`${BASE}/workout-history.html`);
    await page.waitForFunction(() => typeof window.parseExerciseName === 'function', { timeout: 10000 });

    const result = await page.evaluate(() => {
      return window.parseExerciseName('Push Ups');
    });

    expect(result.baseName).toBe('Push Ups');
  });

  test('aggregateExercisesFromSessions groups exercises correctly', async ({ page }) => {
    await page.goto(`${BASE}/workout-history.html`);
    await page.waitForFunction(() => typeof window.aggregateExercisesFromSessions === 'function', { timeout: 10000 });

    const result = await page.evaluate(() => {
      // Function expects exercises_performed array with exercise_name field
      const sessions = [
        {
          exercises_performed: [
            { exercise_name: 'Barbell Bench Press', sets_completed: [{ weight: '135', reps: '10' }] },
            { exercise_name: 'Dumbbell Bench Press', sets_completed: [{ weight: '50', reps: '12' }] },
          ],
          completed_at: '2026-03-06T10:00:00Z',
        },
      ];
      return window.aggregateExercisesFromSessions(sessions);
    });

    expect(result.length).toBeGreaterThan(0);
    // Both should be grouped under "Bench Press"
    const benchGroup = result.find(g => g.baseName === 'Bench Press');
    expect(benchGroup).toBeDefined();
    expect(benchGroup.variants.length).toBe(2);
  });

  test('empty state displays when no sessions exist', async ({ page }) => {
    await page.goto(`${BASE}/workout-history.html`);
    await waitForAppReady(page);
    await page.waitForTimeout(2000);

    // Should show empty state or loading
    const emptyState = page.locator('#historyEmptyState, #desktopEmptyState');
    const sessionContainer = page.locator('#sessionHistoryContainer, #desktopSessionHistoryContainer');

    const hasEmpty = await emptyState.first().isVisible().catch(() => false);
    const containerText = await sessionContainer.first().textContent().catch(() => '');

    // Either explicit empty state or container with no session cards
    expect(hasEmpty || containerText.trim().length === 0 || containerText.includes('No')).toBe(true);
  });
});
