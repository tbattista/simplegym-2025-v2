const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(`[${msg.type()}] ${text}`);
        console.log(`[${msg.type()}] ${text}`);
    });

    try {
        // Navigate to workout mode page with a workout
        console.log('\n📍 Navigating to workout mode page...');
        await page.goto('http://localhost:8001/workout-mode.html?id=workout-1e3c1017', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for page to fully load
        await page.waitForTimeout(3000);
        console.log('\n✅ Page loaded');

        // Check if Quick Log button exists
        const quickLogBtn = await page.$('#floatingQuickLogButton');
        if (quickLogBtn) {
            console.log('\n✅ Quick Log button found');

            // Get initial state
            const dualButtons = await page.$('#floatingDualButtons');
            const quickLogCombo = await page.$('#floatingQuickLogCombo');

            console.log('\n📊 Initial state:');
            if (dualButtons) {
                const display = await dualButtons.evaluate(el => getComputedStyle(el).display);
                console.log(`  floatingDualButtons display: ${display}`);
            }
            if (quickLogCombo) {
                const display = await quickLogCombo.evaluate(el => getComputedStyle(el).display);
                console.log(`  floatingQuickLogCombo display: ${display}`);
            }

            // Click Quick Log button
            console.log('\n🖱️ Clicking Quick Log button...');
            await quickLogBtn.click();

            // Wait for state change
            await page.waitForTimeout(2000);

            // Check state after click
            console.log('\n📊 State after click:');
            if (dualButtons) {
                const display = await dualButtons.evaluate(el => getComputedStyle(el).display);
                const visibility = await dualButtons.evaluate(el => getComputedStyle(el).visibility);
                console.log(`  floatingDualButtons display: ${display}, visibility: ${visibility}`);
            }
            if (quickLogCombo) {
                const display = await quickLogCombo.evaluate(el => getComputedStyle(el).display);
                const visibility = await quickLogCombo.evaluate(el => getComputedStyle(el).visibility);
                console.log(`  floatingQuickLogCombo display: ${display}, visibility: ${visibility}`);
            }

        } else {
            console.log('\n❌ Quick Log button NOT found');

            // Check what buttons exist
            const startBtn = await page.$('#floatingStartButton');
            const timedCombo = await page.$('#floatingTimerEndCombo');
            console.log('  floatingStartButton exists:', !!startBtn);
            console.log('  floatingTimerEndCombo exists:', !!timedCombo);
        }

        // Print relevant console logs
        console.log('\n📋 Relevant console logs:');
        consoleLogs
            .filter(log =>
                log.includes('showFloatingControls') ||
                log.includes('updateWorkoutModeState') ||
                log.includes('Dual buttons') ||
                log.includes('Quick Log') ||
                log.includes('bottomActionBar')
            )
            .forEach(log => console.log('  ', log));

        // Keep browser open for inspection
        console.log('\n⏳ Browser will close in 10 seconds...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await browser.close();
    }
})();
