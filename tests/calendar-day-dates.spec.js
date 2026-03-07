// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

test('getCalendarDaysAgo returns correct calendar days, not elapsed time', async ({ page }) => {
  await page.goto(`${BASE}/index.html`);
  await page.waitForLoadState('domcontentloaded');

  // Wait for common-utils.js to load
  await page.waitForFunction(() => typeof window.getCalendarDaysAgo === 'function');

  const results = await page.evaluate(() => {
    const now = new Date();

    // Build a date for "yesterday at 11pm" (only 1-9 hours ago depending on current time)
    const yesterday11pm = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 0, 0);

    // Build a date for "today at midnight"
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1, 0);

    // Build a date for "2 days ago at 11:59pm"
    const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 0);

    return {
      yesterday11pm: window.getCalendarDaysAgo(yesterday11pm.toISOString()),
      todayMidnight: window.getCalendarDaysAgo(todayMidnight.toISOString()),
      twoDaysAgo: window.getCalendarDaysAgo(twoDaysAgo.toISOString()),
      rightNow: window.getCalendarDaysAgo(now.toISOString()),
    };
  });

  // Yesterday at 11pm should be 1 day ago (not 0 from elapsed time calc)
  expect(results.yesterday11pm).toBe(1);

  // Today just after midnight should be 0 (today)
  expect(results.todayMidnight).toBe(0);

  // 2 days ago should be 2
  expect(results.twoDaysAgo).toBe(2);

  // Right now should be 0 (today)
  expect(results.rightNow).toBe(0);
});

test('formatDate uses calendar days for relative date display', async ({ page }) => {
  await page.goto(`${BASE}/index.html`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => typeof window.formatDate === 'function');

  const results = await page.evaluate(() => {
    const now = new Date();

    // Yesterday at 11:30pm — should say "Yesterday", not "Today"
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 30, 0);

    // Today early morning
    const todayEarly = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0);

    // 3 days ago at 11pm
    const threeDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 23, 0, 0);

    return {
      yesterday: window.formatDate(yesterday.toISOString()),
      todayEarly: window.formatDate(todayEarly.toISOString()),
      threeDaysAgo: window.formatDate(threeDaysAgo.toISOString()),
    };
  });

  expect(results.yesterday).toBe('Yesterday');
  expect(results.todayEarly).toBe('Today');
  expect(results.threeDaysAgo).toBe('3 days ago');
});
