// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

test.describe('Custom Confirm Modal', () => {

    test('Delete exercise shows custom confirm modal instead of native dialog', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);
        await page.waitForLoadState('networkidle');

        // Verify ffnModalManager is loaded
        const hasModalManager = await page.evaluate(() => !!window.ffnModalManager);
        expect(hasModalManager).toBe(true);
    });

    test('ffnModalManager.confirm creates a Bootstrap modal', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);
        await page.waitForLoadState('networkidle');

        // Trigger a confirm modal programmatically
        await page.evaluate(() => {
            window._testConfirmResult = null;
            window.ffnModalManager.confirm(
                'Test Title',
                'Test message body',
                () => { window._testConfirmResult = 'confirmed'; },
                { confirmText: 'Do It', confirmClass: 'btn-danger', size: 'sm' }
            );
        });

        // Modal should be visible
        const modal = page.locator('.modal.show');
        await expect(modal).toBeVisible({ timeout: 3000 });

        // Should have correct title
        await expect(modal.locator('.modal-title')).toContainText('Test Title');

        // Should have correct message
        await expect(modal.locator('.modal-body')).toContainText('Test message body');

        // Should have Cancel and confirm buttons
        await expect(modal.locator('button:has-text("Cancel")')).toBeVisible();
        const confirmBtn = modal.locator('button:has-text("Do It")');
        await expect(confirmBtn).toBeVisible();
        await expect(confirmBtn).toHaveClass(/btn-danger/);
    });

    test('Clicking confirm button triggers callback and closes modal', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);
        await page.waitForLoadState('networkidle');

        // Trigger a confirm modal
        await page.evaluate(() => {
            window._testConfirmResult = null;
            window.ffnModalManager.confirm(
                'Confirm Action',
                'Are you sure?',
                () => { window._testConfirmResult = 'confirmed'; },
                { confirmText: 'Yes', confirmClass: 'btn-primary' }
            );
        });

        // Wait for modal
        const modal = page.locator('.modal.show');
        await expect(modal).toBeVisible({ timeout: 3000 });

        // Click the confirm button
        await modal.locator('button:has-text("Yes")').click();

        // Modal should close and callback fires after hide transition completes
        await expect(modal).not.toBeVisible({ timeout: 3000 });

        // Callback fires asynchronously after hidden.bs.modal event
        await expect(async () => {
            const result = await page.evaluate(() => window._testConfirmResult);
            expect(result).toBe('confirmed');
        }).toPass({ timeout: 3000 });
    });

    test('Clicking cancel button closes modal without triggering callback', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);
        await page.waitForLoadState('networkidle');

        // Trigger a confirm modal
        await page.evaluate(() => {
            window._testConfirmResult = null;
            window.ffnModalManager.confirm(
                'Cancel Test',
                'Should not confirm',
                () => { window._testConfirmResult = 'confirmed'; },
                { confirmText: 'Confirm' }
            );
        });

        const modal = page.locator('.modal.show');
        await expect(modal).toBeVisible({ timeout: 3000 });

        // Click Cancel
        await modal.locator('button:has-text("Cancel")').click();

        // Callback should NOT have fired
        const result = await page.evaluate(() => window._testConfirmResult);
        expect(result).toBeNull();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 3000 });
    });

    test('ffnModalManager.alert creates a styled alert modal', async ({ page }) => {
        await page.goto(`${BASE}/workout-builder.html`);
        await page.waitForLoadState('networkidle');

        // Trigger an alert modal
        await page.evaluate(() => {
            window.ffnModalManager.alert('Error Occurred', 'Something went wrong.', 'danger');
        });

        const modal = page.locator('.modal.show');
        await expect(modal).toBeVisible({ timeout: 3000 });

        // Should have title and message
        await expect(modal.locator('.modal-title')).toContainText('Error Occurred');
        await expect(modal.locator('.modal-body')).toContainText('Something went wrong.');

        // Should have OK button
        await expect(modal.locator('button:has-text("OK")')).toBeVisible();

        // Click OK to dismiss
        await modal.locator('button:has-text("OK")').click();
        await expect(modal).not.toBeVisible({ timeout: 3000 });
    });
});
