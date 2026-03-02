// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

test.describe('Exercise Cart', () => {

    test('Add to Workout button adds exercise to cart panel', async ({ page }) => {
        await page.goto(`${BASE}/exercise-database.html`);
        await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

        // Find the first exercise card's 3-dot menu
        const firstCard = page.locator('#exerciseTableContainer .card').first();
        await firstCard.locator('.dropdown-toggle').click();

        // Click "Add to Workout"
        const addLink = firstCard.locator('.add-to-workout-link');
        await expect(addLink).toBeVisible();
        await addLink.click();

        // Cart content should appear in the panel
        const cart = page.locator('#exerciseCartContent');
        await expect(cart).toBeVisible({ timeout: 3000 });

        // Should show "1 exercise"
        await expect(cart.locator('.exercise-cart-count')).toContainText('1 exercise');

        // Should have a "Build Workout" button
        await expect(cart.locator('a.btn-primary')).toContainText('Build Workout');

        // Empty state should be hidden
        await expect(page.locator('#exerciseCartEmpty')).not.toBeVisible();
    });

    test('Cart panel shows chips and allows removal', async ({ page }) => {
        await page.goto(`${BASE}/exercise-database.html`);
        await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

        // Add first exercise
        const firstCard = page.locator('#exerciseTableContainer .card').first();
        await firstCard.locator('.dropdown-toggle').click();
        await expect(firstCard.locator('.add-to-workout-link')).toBeVisible();
        await firstCard.locator('.add-to-workout-link').click();

        const cart = page.locator('#exerciseCartContent');
        await expect(cart).toBeVisible();
        await expect(cart.locator('.exercise-cart-chip')).toHaveCount(1);

        // Remove via the x button on the chip
        await cart.locator('.exercise-cart-chip-remove').first().click();

        // Cart content should hide, empty state should show
        await expect(cart).not.toBeVisible({ timeout: 3000 });
        await expect(page.locator('#exerciseCartEmpty')).toBeVisible();
    });

    test('Cart panel clear button removes all exercises', async ({ page }) => {
        await page.goto(`${BASE}/exercise-database.html`);
        await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

        const cards = page.locator('#exerciseTableContainer .card');

        // First exercise
        await cards.nth(0).locator('.dropdown-toggle').click();
        await expect(cards.nth(0).locator('.add-to-workout-link')).toBeVisible();
        await cards.nth(0).locator('.add-to-workout-link').click();
        await page.waitForTimeout(500);

        // Second exercise
        await cards.nth(1).locator('.dropdown-toggle').click();
        await expect(cards.nth(1).locator('.add-to-workout-link')).toBeVisible();
        await cards.nth(1).locator('.add-to-workout-link').click();

        const cart = page.locator('#exerciseCartContent');
        await expect(cart.locator('.exercise-cart-count')).toContainText('2 exercises');

        // Click Clear
        await cart.locator('.exercise-cart-clear').click();

        // Cart content should hide
        await expect(cart).not.toBeVisible({ timeout: 3000 });
    });

    test('Build Workout navigates to workout builder', async ({ page }) => {
        await page.goto(`${BASE}/exercise-database.html`);
        await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

        // Add an exercise
        const firstCard = page.locator('#exerciseTableContainer .card').first();
        await firstCard.locator('.dropdown-toggle').click();
        await expect(firstCard.locator('.add-to-workout-link')).toBeVisible();
        await firstCard.locator('.add-to-workout-link').click();

        const cart = page.locator('#exerciseCartContent');
        await expect(cart).toBeVisible();

        // Click "Build Workout"
        await cart.locator('a.btn-primary').click();

        // Should navigate to workout builder
        await page.waitForURL(/workout-builder\.html/, { timeout: 10000 });
    });
});
