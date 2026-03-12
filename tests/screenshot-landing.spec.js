import { test } from '@playwright/test';

test('screenshot: new landing page (unauthenticated)', async ({ page }) => {
  // Desktop screenshot
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:8001/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: 'tests/screenshots/landing-desktop.png',
    fullPage: true
  });

  // Mobile screenshot
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:8001/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: 'tests/screenshots/landing-mobile.png',
    fullPage: true
  });
});
