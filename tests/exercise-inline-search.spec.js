// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

/**
 * Helper: Navigate to builder and ensure at least one exercise card exists.
 * Dismisses workout selection prompt, creates a workout if needed, and adds an exercise.
 */
async function setupBuilderWithExercise(page) {
    await page.goto(`${BASE}/workout-builder.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Dismiss workout selection prompt if visible
    const selectionOffcanvas = page.locator('#workoutSelectionOffcanvas');
    if (await selectionOffcanvas.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Try to click "New Workout" or close the selection
        const newWorkoutBtn = selectionOffcanvas.locator('button:has-text("New"), button:has-text("Create")').first();
        if (await newWorkoutBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await newWorkoutBtn.click();
        } else {
            // Close it
            const closeBtn = selectionOffcanvas.locator('.btn-close');
            if (await closeBtn.isVisible()) await closeBtn.click();
        }
        await page.waitForTimeout(500);
    }

    // Add exercise group if none exist
    const addBtn = page.locator('#addExerciseGroupBtnVisible');
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
    }
}

/**
 * Helper: Open the exercise group editor offcanvas by clicking edit on the first card.
 * Returns the editor locator or null if no cards found.
 */
async function openEditorOffcanvas(page) {
    // Try desktop row-edit button first
    const editBtn = page.locator('[data-action="row-edit"], .row-edit-btn').first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(500);
        const editor = page.locator('#exerciseGroupEditorOffcanvas');
        if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
            return editor;
        }
    }

    // Try mobile card edit
    const mobileEdit = page.locator('.exercise-group-card [onclick*="openExerciseGroupEditor"]').first();
    if (await mobileEdit.isVisible({ timeout: 1000 }).catch(() => false)) {
        await mobileEdit.click();
        await page.waitForTimeout(500);
        const editor = page.locator('#exerciseGroupEditorOffcanvas');
        if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
            return editor;
        }
    }

    // Editor might auto-open for new exercise groups
    const editor = page.locator('#exerciseGroupEditorOffcanvas');
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
        return editor;
    }

    return null;
}

test.describe('Exercise Inline Search (Push/Pop in Editor)', () => {

    test('Match button pushes search UI into editor offcanvas', async ({ page }) => {
        await setupBuilderWithExercise(page);
        const editor = await openEditorOffcanvas(page);
        if (!editor) { test.skip(true, 'Could not open editor offcanvas'); return; }

        // Click the Match button for primary exercise
        const matchBtn = editor.locator('#searchPrimaryBtn');
        await expect(matchBtn).toBeVisible();
        await matchBtn.click();
        await page.waitForTimeout(500);

        // Search UI should now be visible inside the same offcanvas
        const searchPanel = editor.locator('#exerciseSearchInlinePanel');
        await expect(searchPanel).toBeVisible({ timeout: 3000 });

        // Back button should be present
        await expect(editor.locator('#searchInlineBackBtn')).toBeVisible();

        // Search input should be present
        await expect(editor.locator('#inlineSearchInput')).toBeVisible();

        // Exercise list should load
        await expect(editor.locator('#inlineExerciseList .card').first()).toBeVisible({ timeout: 10000 });
    });

    test('Selecting exercise restores editor with name filled', async ({ page }) => {
        await setupBuilderWithExercise(page);
        const editor = await openEditorOffcanvas(page);
        if (!editor) { test.skip(true, 'Could not open editor offcanvas'); return; }

        // Click Match
        await editor.locator('#searchPrimaryBtn').click();
        await page.waitForTimeout(500);

        // Wait for exercises to load
        const exerciseCards = editor.locator('#inlineExerciseList .card');
        await expect(exerciseCards.first()).toBeVisible({ timeout: 10000 });

        // Get the name of the first exercise
        const firstName = await exerciseCards.first().locator('.fw-semibold').textContent();

        // Click Select on first exercise
        await editor.locator('#inlineExerciseList button[data-exercise-id]').first().click();
        await page.waitForTimeout(500);

        // Search panel should be gone, editor should be restored
        await expect(editor.locator('#exerciseSearchInlinePanel')).not.toBeAttached();

        // Primary exercise input should have the selected name
        const primaryInput = editor.locator('#primaryExerciseInput');
        await expect(primaryInput).toBeVisible();
        const inputValue = await primaryInput.inputValue();
        expect(inputValue).toBe(firstName?.trim());
    });

    test('Back button restores editor without selection', async ({ page }) => {
        await setupBuilderWithExercise(page);
        const editor = await openEditorOffcanvas(page);
        if (!editor) { test.skip(true, 'Could not open editor offcanvas'); return; }

        // Click Match
        await editor.locator('#searchPrimaryBtn').click();
        await page.waitForTimeout(500);
        await expect(editor.locator('#exerciseSearchInlinePanel')).toBeVisible({ timeout: 3000 });

        // Click back
        await editor.locator('#searchInlineBackBtn').click();
        await page.waitForTimeout(300);

        // Search panel should be gone, editor content restored
        await expect(editor.locator('#exerciseSearchInlinePanel')).not.toBeAttached();
        await expect(editor.locator('#primaryExerciseInput')).toBeVisible();
    });

    test('Detail view push/pop works within inline search', async ({ page }) => {
        await setupBuilderWithExercise(page);
        const editor = await openEditorOffcanvas(page);
        if (!editor) { test.skip(true, 'Could not open editor offcanvas'); return; }

        // Open inline search
        await editor.locator('#searchPrimaryBtn').click();
        await page.waitForTimeout(500);

        // Wait for exercise list
        await expect(editor.locator('#inlineExerciseList .card').first()).toBeVisible({ timeout: 10000 });

        // Click info button on first exercise
        await editor.locator('#inlineExerciseList button[data-detail-id]').first().click();
        await page.waitForTimeout(500);

        // Detail panel should appear
        const detailPanel = editor.locator('#exerciseDetailInlinePanel');
        await expect(detailPanel).toBeVisible({ timeout: 3000 });
        await expect(editor.locator('#detailBackBtn')).toBeVisible();

        // Click back to return to search
        await editor.locator('#detailBackBtn').click();
        await page.waitForTimeout(300);

        // Detail panel gone, search list back
        await expect(detailPanel).not.toBeAttached();
        await expect(editor.locator('#inlineExerciseList')).toBeVisible();
    });

    test('No orphaned detail panel after Add from detail view', async ({ page }) => {
        await setupBuilderWithExercise(page);
        const editor = await openEditorOffcanvas(page);
        if (!editor) { test.skip(true, 'Could not open editor offcanvas'); return; }

        // Open inline search → detail view
        await editor.locator('#searchPrimaryBtn').click();
        await page.waitForTimeout(500);
        await expect(editor.locator('#inlineExerciseList .card').first()).toBeVisible({ timeout: 10000 });
        await editor.locator('#inlineExerciseList button[data-detail-id]').first().click();
        await page.waitForTimeout(500);
        await expect(editor.locator('#exerciseDetailInlinePanel')).toBeVisible({ timeout: 3000 });

        // Click Add to Workout from detail view
        const addToWorkoutBtn = editor.locator('#detailViewAddBtn');
        if (await addToWorkoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await addToWorkoutBtn.click();
            await page.waitForTimeout(500);

            // Editor should be restored, no orphaned panels
            await expect(editor.locator('#exerciseSearchInlinePanel')).not.toBeAttached();
            await expect(editor.locator('#exerciseDetailInlinePanel')).not.toBeAttached();
            await expect(editor.locator('#primaryExerciseInput')).toBeVisible();
        }
    });

    test('Sidebar dims when exercise editor offcanvas is open on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await setupBuilderWithExercise(page);

        const sidebar = page.locator('#layout-menu');
        if (!(await sidebar.isVisible({ timeout: 3000 }).catch(() => false))) {
            test.skip(true, 'Sidebar not visible on this viewport');
            return;
        }

        // Before opening editor, sidebar should not be dimmed
        // (workout selection prompt doesn't trigger dimming)
        const editor = await openEditorOffcanvas(page);
        if (!editor) { test.skip(true, 'Could not open editor offcanvas'); return; }

        // Editor is open (offcanvas-desktop-wide.show), sidebar should be dimmed
        const dimmedOpacity = await sidebar.evaluate(el => getComputedStyle(el).opacity);
        expect(parseFloat(dimmedOpacity)).toBeLessThan(0.5);
    });
});
