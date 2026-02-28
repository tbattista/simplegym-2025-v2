/**
 * Supplementary test: scroll the detail panel to capture "Pairs Well With" section in screenshot
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8001/exercise-database.html';
const SCREENSHOT_DIR = 'C:/Users/user/iCloudDrive/PARA/1 - Projects/_Websites/simple gym log/simplegym_v2';

(async () => {
    const browser = await chromium.launch({ headless: true });

    // Desktop context
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Click Barbell Bench Press (first card)
    await page.evaluate(() => {
        document.querySelector('#exerciseTableContainer .card').click();
    });
    await page.waitForTimeout(1000);

    // Scroll the detail panel to the "Pairs Well With" section
    await page.evaluate(() => {
        const section = document.querySelector('.pairs-well-with-section');
        if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(300);

    // Screenshot the full panel area showing recommendations
    await page.screenshot({ path: `${SCREENSHOT_DIR}/test1-pairs-well-with-scrolled.png`, fullPage: false });
    console.log('Screenshot 1: Bench Press "Pairs Well With" section (scrolled into view)');

    // Now click Barbell Deadlift
    await page.evaluate(() => {
        const cards = document.querySelectorAll('#exerciseTableContainer .card');
        for (const card of cards) {
            if (card.textContent.includes('Barbell Deadlift')) {
                card.click();
                return;
            }
        }
    });
    await page.waitForTimeout(1000);

    // Scroll to Pairs Well With for Deadlift
    await page.evaluate(() => {
        const section = document.querySelector('.pairs-well-with-section');
        if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/test3-deadlift-pairs-scrolled.png`, fullPage: false });
    console.log('Screenshot 2: Deadlift "Pairs Well With" section (scrolled into view)');

    await context.close();
    await browser.close();
    console.log('Done.');
})();
