/**
 * Capture exercise database with detail panel open showing GIF + pairings
 * Usage: node docs/user-flows/capture-exercise-detail.js
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'https://fitnessfieldnotes.com';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'frontend', 'assets', 'img', 'build-in-public');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });
    const page = await context.newPage();

    // Navigate to exercise database
    await page.goto(BASE_URL + '/exercise-database', { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000);

    // Click the first exercise card
    const firstExercise = await page.$('[data-exercise-id]');
    if (firstExercise) {
        await firstExercise.click();
        await page.waitForTimeout(4000);
    }

    // Scroll down further to show the full pairings section
    await page.evaluate(() => {
        window.scrollBy(0, 550);
    });
    await page.waitForTimeout(1000);

    // Take screenshot showing pairings
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const filename = `2026-03-06-exercise-detail-pairings-desktop-${hhmm}.png`;
    await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: false });

    console.log(`Screenshot saved: ${filename}`);
    await browser.close();
})();
