/**
 * Shared test fixtures and helpers for Playwright tests.
 */
const { STANDARD_WORKOUT, ALL_WORKOUTS, COMPLETED_SESSION } = require('./test-data');

const BASE = 'http://localhost:8001';

/**
 * Wait for page JS to fully initialize (services on window).
 */
async function waitForAppReady(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Inject workout templates into localStorage before page navigation.
 * Call AFTER page.goto() but the page will need a reload to pick them up,
 * OR call on a blank page then navigate.
 */
async function injectWorkouts(page, workouts = ALL_WORKOUTS) {
  await page.evaluate((data) => {
    localStorage.setItem('gym_workouts', JSON.stringify(data));
  }, workouts);
}

/**
 * Inject a completed session into localStorage.
 */
async function injectSession(page, session = COMPLETED_SESSION) {
  await page.evaluate((data) => {
    // Store as completed session in history
    const existing = JSON.parse(localStorage.getItem('ffn_completed_sessions') || '[]');
    existing.push(data);
    localStorage.setItem('ffn_completed_sessions', JSON.stringify(existing));
  }, session);
}

/**
 * Clear all test data from localStorage.
 */
async function clearTestData(page) {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Collect console errors during a test.
 * Returns an array; attach early in the test.
 */
function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

/**
 * Navigate to a page with localStorage pre-populated.
 */
async function gotoWithData(page, path, workouts = ALL_WORKOUTS) {
  // Go to a blank page first to set localStorage for the domain
  await page.goto(`${BASE}/settings.html`);
  await injectWorkouts(page, workouts);
  await page.goto(`${BASE}/${path}`);
  await waitForAppReady(page);
}

module.exports = {
  BASE,
  waitForAppReady,
  injectWorkouts,
  injectSession,
  clearTestData,
  collectConsoleErrors,
  gotoWithData,
};
