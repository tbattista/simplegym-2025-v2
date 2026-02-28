/**
 * Playwright test script for "Pairs Well With" exercise recommendation feature
 * Tests: desktop split-view, chip clicks, specific exercise recommendations, mobile view
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8001/exercise-database.html';
const SCREENSHOT_DIR = 'C:/Users/user/iCloudDrive/PARA/1 - Projects/_Websites/simple gym log/simplegym_v2';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const allResults = {};

    // ======================================================
    // TEST 1: Desktop split-view with recommendations
    // ======================================================
    console.log('\n========== TEST 1: Desktop split-view with recommendations ==========');
    const context1 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page1 = await context1.newPage();

    // Collect console messages
    const page1Errors = [];
    const page1Warnings = [];
    page1.on('console', msg => {
        if (msg.type() === 'error') page1Errors.push(msg.text());
        if (msg.type() === 'warning') page1Warnings.push(msg.text());
    });

    await page1.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    console.log('  Navigated to exercise-database.html');

    // Wait for exercises to load
    try {
        await page1.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });
        console.log('  Exercises loaded successfully');
    } catch (e) {
        console.log('  ERROR: Exercises did not load within 15s');
    }

    // Wait a moment, then click the first exercise card to trigger panel display
    await page1.waitForTimeout(500);

    // Click the first exercise card to select it (no auto-select on exercise database)
    const firstCardClicked = await page1.evaluate(() => {
        const firstCard = document.querySelector('#exerciseTableContainer .card');
        if (firstCard) {
            firstCard.click();
            const nameEl = firstCard.querySelector('h6, .fw-semibold, .exercise-name');
            return nameEl ? nameEl.textContent.trim() : 'clicked (no name found)';
        }
        return 'no card found';
    });
    console.log(`  Clicked first exercise card: "${firstCardClicked}"`);

    // Wait for panel to render (cross-fade transition ~150ms + rendering)
    await page1.waitForTimeout(1000);

    // Take screenshot
    await page1.screenshot({ path: `${SCREENSHOT_DIR}/test1-desktop-splitview.png`, fullPage: false });
    console.log('  Screenshot saved: test1-desktop-splitview.png');

    // Check for "Pairs Well With" section
    const pairsSection = await page1.$('.pairs-well-with-section');
    console.log(`  "Pairs Well With" section present: ${pairsSection !== null}`);

    // Get the heading text
    const pairsHeading = await page1.$eval('.pairs-well-with-section h6', el => el.textContent.trim()).catch(() => 'NOT FOUND');
    console.log(`  Section heading: "${pairsHeading}"`);

    // Get all category labels
    const categoryLabels = await page1.$$eval('.pairing-category-label', els =>
        els.map(el => el.textContent.trim())
    ).catch(() => []);
    console.log(`  Recommendation categories found (${categoryLabels.length}):`);
    categoryLabels.forEach(label => console.log(`    - ${label}`));

    // Get all exercise chips with their parent category
    const chipDetails = await page1.$$eval('.pairs-well-with-section .mb-2', els => {
        return els.map(section => {
            const label = section.querySelector('.pairing-category-label');
            const chips = section.querySelectorAll('.pairing-exercise-chip');
            return {
                category: label ? label.textContent.trim() : '(no category)',
                exercises: Array.from(chips).map(chip => {
                    const name = chip.querySelector('.pairing-exercise-name');
                    const meta = chip.querySelector('.pairing-exercise-meta');
                    return {
                        name: name ? name.textContent.trim() : '(no name)',
                        muscle: meta ? meta.textContent.trim() : ''
                    };
                })
            };
        }).filter(s => s.exercises.length > 0);
    }).catch(() => []);

    console.log('\n  Detailed recommendations:');
    chipDetails.forEach(cat => {
        console.log(`    [${cat.category}]`);
        cat.exercises.forEach(ex => console.log(`      - ${ex.name} (${ex.muscle})`));
    });

    // Get the currently selected exercise name
    const selectedExName = await page1.$eval('#exerciseDetailContent .detail-header h5', el => el.textContent.trim()).catch(() => 'NOT FOUND');
    console.log(`\n  Currently selected exercise: "${selectedExName}"`);

    // Check for expected categories
    const expectedCategories = ['Antagonist Pair', 'Complementary Compound', 'Isolation Follow-up', 'Same Muscle Variation'];
    const foundCategoryNames = categoryLabels.map(l => l.trim());
    console.log('\n  Category verification:');
    expectedCategories.forEach(cat => {
        const found = foundCategoryNames.some(f => f.includes(cat));
        console.log(`    ${found ? 'PASS' : 'MISS'}: "${cat}" ${found ? 'found' : 'not found'}`);
    });

    // Report console errors
    console.log(`\n  Console errors (${page1Errors.length}):`);
    page1Errors.forEach(e => console.log(`    ERROR: ${e}`));
    console.log(`  Console warnings (${page1Warnings.length}):`);
    page1Warnings.forEach(w => console.log(`    WARN: ${w}`));

    allResults.test1 = {
        pairsSectionPresent: pairsSection !== null,
        selectedExercise: selectedExName,
        categories: chipDetails,
        consoleErrors: page1Errors.length,
        consoleWarnings: page1Warnings.length
    };

    // ======================================================
    // TEST 2: Click a recommendation chip
    // ======================================================
    console.log('\n========== TEST 2: Click a recommendation chip ==========');

    // Get first chip name before clicking
    const firstChipName = await page1.$eval('.pairing-exercise-chip .pairing-exercise-name', el => el.textContent.trim()).catch(() => 'NOT FOUND');
    console.log(`  First chip exercise name: "${firstChipName}"`);

    // Click the first pairing chip
    const firstChip = await page1.$('.pairing-exercise-chip');
    if (firstChip) {
        await firstChip.click();
        console.log('  Clicked first pairing chip');
        await page1.waitForTimeout(700);

        // Take screenshot
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/test2-chip-clicked.png`, fullPage: false });
        console.log('  Screenshot saved: test2-chip-clicked.png');

        // Check panel title changed
        const newTitle = await page1.$eval('#exerciseDetailContent .detail-header h5', el => el.textContent.trim()).catch(() => 'NOT FOUND');
        console.log(`  Panel title after click: "${newTitle}"`);
        console.log(`  Title changed: ${newTitle !== selectedExName ? 'PASS' : 'FAIL'} (was "${selectedExName}", now "${newTitle}")`);
        console.log(`  Title matches clicked chip: ${newTitle === firstChipName ? 'PASS' : 'FAIL'}`);

        // Check new exercise also has "Pairs Well With" section
        const newPairsSection = await page1.$('.pairs-well-with-section');
        console.log(`  New "Pairs Well With" section present: ${newPairsSection !== null ? 'PASS' : 'FAIL'} (recommendations are recursive)`);

        // Get new categories
        const newCategoryLabels = await page1.$$eval('.pairing-category-label', els =>
            els.map(el => el.textContent.trim())
        ).catch(() => []);
        console.log(`  New recommendation categories (${newCategoryLabels.length}):`);
        newCategoryLabels.forEach(label => console.log(`    - ${label}`));

        // New chip details
        const newChipDetails = await page1.$$eval('.pairs-well-with-section .mb-2', els => {
            return els.map(section => {
                const label = section.querySelector('.pairing-category-label');
                const chips = section.querySelectorAll('.pairing-exercise-chip');
                return {
                    category: label ? label.textContent.trim() : '(no category)',
                    exercises: Array.from(chips).map(chip => {
                        const name = chip.querySelector('.pairing-exercise-name');
                        const meta = chip.querySelector('.pairing-exercise-meta');
                        return {
                            name: name ? name.textContent.trim() : '(no name)',
                            muscle: meta ? meta.textContent.trim() : ''
                        };
                    })
                };
            }).filter(s => s.exercises.length > 0);
        }).catch(() => []);

        console.log('\n  New detailed recommendations:');
        newChipDetails.forEach(cat => {
            console.log(`    [${cat.category}]`);
            cat.exercises.forEach(ex => console.log(`      - ${ex.name} (${ex.muscle})`));
        });

        allResults.test2 = {
            clickedChip: firstChipName,
            newTitle: newTitle,
            titleChanged: newTitle !== selectedExName,
            hasRecursiveRecommendations: newPairsSection !== null,
            newCategories: newChipDetails
        };
    } else {
        console.log('  ERROR: No pairing chips found to click');
        allResults.test2 = { error: 'No chips found' };
    }

    // ======================================================
    // TEST 3: Click "Barbell Deadlift" to verify lower-body recommendations
    // ======================================================
    console.log('\n========== TEST 3: Click "Barbell Deadlift" for lower-body recommendations ==========');

    // Find and click the Barbell Deadlift card in the exercise list
    const clicked = await page1.evaluate(() => {
        // Search through exercise cards for "Barbell Deadlift"
        const cards = document.querySelectorAll('#exerciseTableContainer .card');
        for (const card of cards) {
            const texts = card.querySelectorAll('h6, .fw-semibold, .exercise-name, .card-title');
            for (const t of texts) {
                if (t.textContent.trim() === 'Barbell Deadlift') {
                    card.click();
                    return 'clicked card';
                }
            }
        }
        // Also try data-exercise-id elements
        const nameEls = document.querySelectorAll('[data-exercise-id]');
        for (const el of nameEls) {
            const nameSpan = el.querySelector('h6, .fw-semibold, .exercise-name');
            if (nameSpan && nameSpan.textContent.trim() === 'Barbell Deadlift') {
                el.click();
                return 'clicked data-exercise-id el';
            }
        }
        // Try any element containing exactly "Barbell Deadlift"
        const allEls = document.querySelectorAll('#exerciseTableContainer *');
        for (const el of allEls) {
            if (el.children.length === 0 && el.textContent.trim() === 'Barbell Deadlift') {
                el.click();
                return 'clicked leaf text el: ' + el.tagName;
            }
        }
        return 'not found';
    });

    console.log(`  Barbell Deadlift card click result: ${clicked}`);

    if (clicked === 'not found') {
        // Try scrolling down in the exercise list to find Deadlift, or search for it
        console.log('  Trying to use search to find Barbell Deadlift...');

        // Look for a search input
        const searchInput = await page1.$('#exerciseSearch');
        if (searchInput) {
            await searchInput.fill('Barbell Deadlift');
            await page1.waitForTimeout(800);

            const clickedAfterSearch = await page1.evaluate(() => {
                const cards = document.querySelectorAll('#exerciseTableContainer .card');
                for (const card of cards) {
                    if (card.textContent.includes('Barbell Deadlift')) {
                        card.click();
                        return 'clicked after search';
                    }
                }
                return 'still not found after search';
            });
            console.log(`  After search: ${clickedAfterSearch}`);
        } else {
            // Try scrolling in the exercise list panel
            console.log('  No search input found, trying to scroll...');
            const listPanel = await page1.$('.exercise-list-panel, #exerciseTableContainer');
            if (listPanel) {
                await listPanel.evaluate(el => el.scrollTop = el.scrollHeight);
                await page1.waitForTimeout(500);

                const clickedAfterScroll = await page1.evaluate(() => {
                    const allEls = document.querySelectorAll('#exerciseTableContainer *');
                    for (const el of allEls) {
                        if (el.children.length === 0 && el.textContent.trim() === 'Barbell Deadlift') {
                            el.click();
                            return 'clicked after scroll: ' + el.tagName;
                        }
                    }
                    return 'still not found after scroll';
                });
                console.log(`  After scroll: ${clickedAfterScroll}`);
            }
        }
    }

    await page1.waitForTimeout(700);

    // Check panel title
    const deadliftTitle = await page1.$eval('#exerciseDetailContent .detail-header h5', el => el.textContent.trim()).catch(() => 'NOT FOUND');
    console.log(`  Panel title: "${deadliftTitle}"`);

    // Take screenshot
    await page1.screenshot({ path: `${SCREENSHOT_DIR}/test3-barbell-deadlift.png`, fullPage: false });
    console.log('  Screenshot saved: test3-barbell-deadlift.png');

    // Get recommendation categories for Deadlift
    const deadliftCategories = await page1.$$eval('.pairs-well-with-section .mb-2', els => {
        return els.map(section => {
            const label = section.querySelector('.pairing-category-label');
            const chips = section.querySelectorAll('.pairing-exercise-chip');
            return {
                category: label ? label.textContent.trim() : '(no category)',
                exercises: Array.from(chips).map(chip => {
                    const name = chip.querySelector('.pairing-exercise-name');
                    const meta = chip.querySelector('.pairing-exercise-meta');
                    return {
                        name: name ? name.textContent.trim() : '(no name)',
                        muscle: meta ? meta.textContent.trim() : ''
                    };
                })
            };
        }).filter(s => s.exercises.length > 0);
    }).catch(() => []);

    const deadliftCategoryLabels = await page1.$$eval('.pairing-category-label', els =>
        els.map(el => el.textContent.trim())
    ).catch(() => []);

    console.log(`  Deadlift recommendation categories (${deadliftCategoryLabels.length}):`);
    deadliftCategoryLabels.forEach(label => console.log(`    - ${label}`));

    console.log('\n  Detailed Deadlift recommendations:');
    deadliftCategories.forEach(cat => {
        console.log(`    [${cat.category}]`);
        cat.exercises.forEach(ex => console.log(`      - ${ex.name} (${ex.muscle})`));
    });

    // Check for antagonist (Squat pattern since Deadlift is Hip Hinge)
    const hasAntagonist = deadliftCategoryLabels.some(l => l.includes('Antagonist'));
    console.log(`\n  Has Antagonist Pair category: ${hasAntagonist ? 'PASS' : 'FAIL'} (expected: Squat pattern for Hip Hinge)`);

    // Look for Squat-pattern exercises in antagonist category
    const antagonistCat = deadliftCategories.find(c => c.category.includes('Antagonist'));
    if (antagonistCat) {
        console.log(`  Antagonist exercises for Deadlift:`);
        antagonistCat.exercises.forEach(ex => console.log(`    - ${ex.name} (${ex.muscle})`));
    }

    allResults.test3 = {
        panelTitle: deadliftTitle,
        categories: deadliftCategories,
        hasAntagonist: hasAntagonist
    };

    await context1.close();

    // ======================================================
    // TEST 4: Mobile view
    // ======================================================
    console.log('\n========== TEST 4: Mobile view (390x844) ==========');
    const context4 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page4 = await context4.newPage();

    const page4Errors = [];
    page4.on('console', msg => {
        if (msg.type() === 'error') page4Errors.push(msg.text());
    });

    await page4.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    console.log('  Navigated to exercise-database.html (mobile viewport)');

    // Wait for exercises to load
    try {
        await page4.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });
        console.log('  Exercises loaded successfully');
    } catch (e) {
        console.log('  ERROR: Exercises did not load within 15s');
    }

    await page4.waitForTimeout(1000);

    // Check if detail panel is hidden on mobile
    const detailPanel = await page4.$('#exerciseDetailPanel, .exercise-detail-panel');
    let panelVisible = false;
    if (detailPanel) {
        panelVisible = await detailPanel.evaluate(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
    }
    console.log(`  Detail panel element exists: ${detailPanel !== null}`);
    console.log(`  Detail panel visible: ${panelVisible}`);
    console.log(`  Detail panel hidden on mobile: ${!panelVisible ? 'PASS' : 'FAIL'}`);

    // Take screenshot
    await page4.screenshot({ path: `${SCREENSHOT_DIR}/test4-mobile-view.png`, fullPage: false });
    console.log('  Screenshot saved: test4-mobile-view.png');

    // Check mobile console errors
    console.log(`\n  Mobile console errors (${page4Errors.length}):`);
    page4Errors.forEach(e => console.log(`    ERROR: ${e}`));

    allResults.test4 = {
        panelHidden: !panelVisible,
        consoleErrors: page4Errors.length
    };

    await context4.close();

    // ======================================================
    // FINAL SUMMARY
    // ======================================================
    console.log('\n========== FINAL SUMMARY ==========');
    console.log(JSON.stringify(allResults, null, 2));

    await browser.close();
    console.log('\nAll tests complete.');
})();
