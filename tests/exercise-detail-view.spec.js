// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

test.describe('Exercise Detail View from Search Offcanvas', () => {

    test('Info button shows exercise detail inline with back button', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open the exercise search offcanvas via the add exercise flow
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

            // Click the info button on the first exercise
            const detailBtn = page.locator('#exerciseListContainer button[data-detail-id]').first();
            await expect(detailBtn).toBeVisible();
            await detailBtn.click();
            await page.waitForTimeout(500);

            // Detail panel should appear inside the same offcanvas
            const detailPanel = searchOffcanvas.locator('#exerciseDetailInlinePanel');
            await expect(detailPanel).toBeVisible({ timeout: 3000 });

            // Back button should be present in the header
            const backBtn = searchOffcanvas.locator('#detailBackBtn');
            await expect(backBtn).toBeVisible();

            // Should have an "Add to Workout" button
            const addToWorkoutBtn = detailPanel.locator('#detailViewAddBtn');
            await expect(addToWorkoutBtn).toBeVisible();
            await expect(addToWorkoutBtn).toContainText('Add to Workout');

            // Should have a favorite button
            const favBtn = detailPanel.locator('#detailViewFavBtn');
            await expect(favBtn).toBeVisible();

            // Click back to return to search
            await backBtn.click();
            await page.waitForTimeout(300);

            // Detail panel should be gone, search list should be back
            await expect(detailPanel).not.toBeAttached();
            const exerciseList = searchOffcanvas.locator('#exerciseListContainer');
            await expect(exerciseList).toBeVisible();
        }
    });

    test('Add to Workout from detail view closes offcanvas', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

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
            await page.waitForTimeout(500);

            // Click "Add to Workout"
            const addToWorkoutBtn = searchOffcanvas.locator('#detailViewAddBtn');
            await expect(addToWorkoutBtn).toBeVisible({ timeout: 3000 });
            await addToWorkoutBtn.click();

            // Offcanvas should close
            await expect(searchOffcanvas).not.toBeVisible({ timeout: 3000 });
        }
    });
});
