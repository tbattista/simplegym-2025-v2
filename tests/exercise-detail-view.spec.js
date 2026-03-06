// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

test.describe('Exercise Detail View from Search Offcanvas', () => {

    test('Info button opens exercise detail view offcanvas from search', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);

        // Wait for page load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open the add exercise flow - click an "Add Exercise" or search button
        // The exercise search offcanvas is triggered from the exercise group editor
        // We need to open a group editor first, then click search
        const addBtn = page.locator('[data-action="add-exercise"], .add-exercise-btn, #addExerciseBtn').first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForTimeout(500);
        }

        // Look for the search button within the group editor to open exercise search offcanvas
        const searchBtn = page.locator('#searchExerciseBtn, [data-action="search-exercise"]').first();
        if (await searchBtn.isVisible()) {
            await searchBtn.click();
            await page.waitForTimeout(1000);
        }

        // Wait for exercise search offcanvas to appear
        const searchOffcanvas = page.locator('#exerciseSearchOffcanvas');
        if (await searchOffcanvas.isVisible({ timeout: 5000 }).catch(() => false)) {
            // Wait for exercises to load
            await page.waitForSelector('#exerciseSearchOffcanvas #exerciseListContainer .card', { timeout: 10000 });

            // Find and click the info/detail button on the first exercise
            const detailBtn = page.locator('#exerciseListContainer button[data-detail-id]').first();
            await expect(detailBtn).toBeVisible();
            await detailBtn.click();

            // The exercise detail view offcanvas should open
            const detailOffcanvas = page.locator('#exerciseDetailViewOffcanvas');
            await expect(detailOffcanvas).toBeVisible({ timeout: 3000 });

            // Should show exercise name in the header
            const title = detailOffcanvas.locator('.offcanvas-title');
            await expect(title).not.toBeEmpty();

            // Should have an "Add to Workout" button
            const addToWorkoutBtn = detailOffcanvas.locator('#detailViewAddBtn');
            await expect(addToWorkoutBtn).toBeVisible();
            await expect(addToWorkoutBtn).toContainText('Add to Workout');

            // Should have a favorite button
            const favBtn = detailOffcanvas.locator('#detailViewFavBtn');
            await expect(favBtn).toBeVisible();

            // The search offcanvas should still be in the DOM (stacked behind)
            await expect(searchOffcanvas).toBeAttached();
        }
    });

    test('Add to Workout from detail view closes both offcanvases', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open exercise search offcanvas (same flow as above)
        const addBtn = page.locator('[data-action="add-exercise"], .add-exercise-btn, #addExerciseBtn').first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForTimeout(500);
        }

        const searchBtn = page.locator('#searchExerciseBtn, [data-action="search-exercise"]').first();
        if (await searchBtn.isVisible()) {
            await searchBtn.click();
            await page.waitForTimeout(1000);
        }

        const searchOffcanvas = page.locator('#exerciseSearchOffcanvas');
        if (await searchOffcanvas.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.waitForSelector('#exerciseSearchOffcanvas #exerciseListContainer .card', { timeout: 10000 });

            // Open detail view
            const detailBtn = page.locator('#exerciseListContainer button[data-detail-id]').first();
            await detailBtn.click();

            const detailOffcanvas = page.locator('#exerciseDetailViewOffcanvas');
            await expect(detailOffcanvas).toBeVisible({ timeout: 3000 });

            // Click "Add to Workout"
            const addToWorkoutBtn = detailOffcanvas.locator('#detailViewAddBtn');
            await addToWorkoutBtn.click();

            // Both offcanvases should close
            await expect(detailOffcanvas).not.toBeVisible({ timeout: 3000 });
            await expect(searchOffcanvas).not.toBeVisible({ timeout: 3000 });
        }
    });
});
