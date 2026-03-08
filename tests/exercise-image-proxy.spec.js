import { test, expect } from '@playwright/test';

test.describe('Exercise Image Proxy', () => {
  test('proxy endpoint rejects invalid IDs', async ({ request }) => {
    const resp = await request.get('/api/v3/exercise-image/<script>.gif');
    // FastAPI returns 400 or 404 for invalid path params
    expect([400, 404]).toContain(resp.status());
  });

  test('proxy endpoint returns 404 for nonexistent exercise', async ({ request }) => {
    const resp = await request.get('/api/v3/exercise-image/NONEXISTENT999.gif');
    // Either 404 (not found upstream) or timeout — both acceptable
    expect([404, 502, 504]).toContain(resp.status());
  });

  test('seed data uses proxy URLs instead of external CDN', async ({ page }) => {
    await page.goto('http://localhost:8001/exercise-database.html');
    await page.waitForLoadState('domcontentloaded');

    // Check that seed data has been loaded with proxy URLs
    const hasProxyUrls = await page.evaluate(() => {
      const seedData = window.EXERCISE_SEED_DATA;
      if (!seedData || seedData.length === 0) return false;
      return seedData.every(ex =>
        !ex.gifUrl || ex.gifUrl.startsWith('/api/v3/exercise-image/')
      );
    });
    expect(hasProxyUrls).toBe(true);
  });

  test('no external ExerciseDB CDN URLs in seed data', async ({ page }) => {
    await page.goto('http://localhost:8001/exercise-database.html');
    await page.waitForLoadState('domcontentloaded');

    const hasExternalUrls = await page.evaluate(() => {
      const seedData = window.EXERCISE_SEED_DATA;
      if (!seedData) return false;
      return seedData.some(ex =>
        ex.gifUrl && ex.gifUrl.includes('static.exercisedb.dev')
      );
    });
    expect(hasExternalUrls).toBe(false);
  });
});
