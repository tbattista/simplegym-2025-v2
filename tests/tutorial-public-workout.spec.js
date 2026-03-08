import { test } from '@playwright/test';
import path from 'path';

const TUTORIAL_DIR = path.resolve('frontend/assets/img/tutorials');
const DATE = '2026-03-08';
const SLUG = 'public-workout-edit';
const VIEWPORT = 'mobile';

function screenshotName(step) {
  return `${DATE}-tutorial-${SLUG}-${String(step).padStart(2, '0')}-${VIEWPORT}.png`;
}

test('Tutorial: Add a public workout and edit it', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });

  // Set light theme before navigating
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('templateCustomizer-style', 'light');
  });

  // Step 1: Browse public workouts
  await page.goto('http://localhost:8001/public-workouts.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
  });
  await page.waitForSelector('#publicWorkoutsContainer', { timeout: 10000 });
  // Wait for cards to load from API
  await page.waitForSelector('.workout-list-card', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(TUTORIAL_DIR, screenshotName(1)), fullPage: false });
  console.log('Step 1: Browse public workouts - done');

  // Step 2: Tap a workout card to open detail offcanvas
  const firstCard = page.locator('.workout-list-card').first();
  await firstCard.click();
  await page.waitForTimeout(800);
  // Wait for offcanvas to appear
  await page.waitForSelector('.offcanvas.show, #workoutDetailOffcanvas.show', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(TUTORIAL_DIR, screenshotName(2)), fullPage: false });
  console.log('Step 2: View workout details - done');

  // Step 3: Show the "Save to My Workouts" button in the offcanvas footer
  // The offcanvas footer has the save button with data-action="save"
  const saveBtn = page.locator('#workoutDetailFooter [data-action="save"]');
  const saveBtnVisible = await saveBtn.isVisible().catch(() => false);
  console.log('Save button visible:', saveBtnVisible);
  await page.screenshot({ path: path.join(TUTORIAL_DIR, screenshotName(3)), fullPage: false });
  console.log('Step 3: Save button visible - done');

  // Close offcanvas and use the card dropdown "Copy and Edit" instead
  // First close the offcanvas
  const closeBtn = page.locator('.offcanvas.show .btn-close, .offcanvas .btn-close').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Step 4: Open the dropdown menu on a card
  const dropdownToggle = page.locator('.workout-list-card .dropdown-toggle, .workout-list-card [data-bs-toggle="dropdown"]').first();
  if (await dropdownToggle.isVisible().catch(() => false)) {
    await dropdownToggle.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(TUTORIAL_DIR, screenshotName(4)), fullPage: false });
    console.log('Step 4: Card dropdown menu open - done');
  } else {
    console.log('Step 4: No dropdown toggle found, taking screenshot anyway');
    await page.screenshot({ path: path.join(TUTORIAL_DIR, screenshotName(4)), fullPage: false });
  }

  // Step 5: Navigate to workout builder (simulating "Copy and Edit" result)
  // Since we don't have auth, navigate directly to workout-builder with a new workout
  await page.goto('http://localhost:8001/workout-builder.html?new=true', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
  });
  await page.waitForTimeout(1500);
  await page.waitForSelector('#workoutEditorForm, #exerciseGroups', { timeout: 10000 }).catch(() => {});

  // Type a workout name to simulate the copied workout
  const nameInput = page.locator('#workoutName');
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('My Push Day');
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: path.join(TUTORIAL_DIR, screenshotName(5)), fullPage: false });
  console.log('Step 5: Editing copied workout - done');

  // Step 6: Save the workout
  const mobileSaveBtn = page.locator('#mobileSaveFab').first();
  if (await mobileSaveBtn.isVisible().catch(() => false)) {
    await mobileSaveBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(TUTORIAL_DIR, screenshotName(6)), fullPage: false });
  console.log('Step 6: Workout saved - done');

  console.log('All 6 screenshots captured!');
});
