// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, collectConsoleErrors } = require('./fixtures');

/**
 * Smoke tests: verify every core page loads without JS errors.
 */

const PAGES = [
  { path: 'index.html', name: 'Home', selector: '#layout-menu' },
  { path: 'workout-builder.html', name: 'Workout Builder', selector: '#layout-menu' },
  { path: 'workout-mode.html', name: 'Workout Mode', selector: '#workoutLandingPage, #workoutLoadingState, #workoutErrorState, #workoutToolbar, .layout-page' },
  { path: 'workout-history.html', name: 'Workout History', selector: '#layout-menu' },
  { path: 'exercise-database.html', name: 'Exercise Database', selector: '#exerciseTableContainer' },
  { path: 'programs.html', name: 'Programs', selector: '#programsGridContainer' },
  { path: 'settings.html', name: 'Settings', selector: '#alertContainer, .card' },
  { path: 'activity-log.html', name: 'Activity Log', selector: '#authRequiredState, #activityLogContent' },
  // auth-login-basic.html has no backend route — served only via static mount at /static/
];

test.describe('Smoke Tests', () => {
  for (const { path, name, selector } of PAGES) {
    test(`${name} page loads without fatal JS errors`, async ({ page }) => {
      const errors = collectConsoleErrors(page);

      await page.goto(`${BASE}/${path}`);
      await page.waitForLoadState('domcontentloaded');

      // Key container element exists
      const el = page.locator(selector);
      await expect(el.first()).toBeAttached({ timeout: 10000 });

      // No uncaught exceptions (pageerror). Console errors from network/firebase are OK.
      const fatalErrors = errors.filter(e =>
        !e.includes('Firebase') &&
        !e.includes('firestore') &&
        !e.includes('ERR_CONNECTION') &&
        !e.includes('net::') &&
        !e.includes('404')
      );
      expect(fatalErrors).toEqual([]);
    });
  }
});
