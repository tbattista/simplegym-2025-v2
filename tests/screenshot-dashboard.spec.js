import { test } from '@playwright/test';

test('screenshot: authenticated dashboard (forced visible)', async ({ page }) => {
  // Set a wider viewport for desktop view
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:8001/', { waitUntil: 'networkidle' });

  // Wait for the page to settle
  await page.waitForTimeout(2000);

  // Force the authenticated dashboard visible and hide landing page
  await page.evaluate(() => {
    // On desktop, the ID swap already happened, so the canonical IDs point to desktop elements
    const authDash = document.getElementById('authenticatedDashboard');
    const unauthWelcome = document.getElementById('unauthenticatedWelcome');

    if (authDash) authDash.style.display = 'block';
    if (unauthWelcome) unauthWelcome.style.display = 'none';

    // Show the sidebar back (since we hid it for unauthenticated)
    document.documentElement.classList.remove('layout-without-menu');
    const layoutMenu = document.getElementById('layout-menu');
    if (layoutMenu) layoutMenu.style.display = '';
    const menuToggle = document.querySelector('.layout-menu-toggle');
    if (menuToggle) menuToggle.style.display = '';

    // Set some mock greeting data
    const dateEl = document.getElementById('homeDate') || document.getElementById('desktopHomeDate');
    const greetingEl = document.getElementById('homeGreeting') || document.getElementById('desktopHomeGreeting');
    if (dateEl) {
      const today = new Date();
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      dateEl.textContent = today.toLocaleDateString('en-US', options);
    }
    if (greetingEl) greetingEl.textContent = 'Good Morning, Coach!';

    // Set some mock weekly progress
    const statEl = document.getElementById('weeklyStatText') || document.getElementById('desktopWeeklyStatText');
    if (statEl) statEl.textContent = 'This Week: 4/7 Activities';

    const streakBadge = document.getElementById('weeklyStreakBadge') || document.getElementById('desktopWeeklyStreakBadge');
    if (streakBadge) {
      streakBadge.textContent = '🔥 12 day streak';
      streakBadge.style.display = 'inline';
    }

    const progressFill = document.getElementById('weeklyProgressFill') || document.getElementById('desktopWeeklyProgressFill');
    if (progressFill) progressFill.style.width = '57%';

    const progressText = document.getElementById('weeklyProgressText') || document.getElementById('desktopWeeklyProgressText');
    if (progressText) progressText.textContent = '57% complete 👍 Halfway there!';

    // Remove placeholders from recent activity and favorites
    const recentContent = document.getElementById('recentActivityContent') || document.getElementById('desktopRecentActivityContent');
    if (recentContent) {
      recentContent.innerHTML = `
        <div class="card recent-activity-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="bg-label-primary rounded p-2"><i class="bx bx-dumbbell"></i></div>
                <span class="fw-medium">Upper Body Push</span>
              </div>
              <span class="badge bg-success">Complete</span>
            </div>
            <div class="d-flex gap-3 text-muted small"><span><i class="bx bx-calendar me-1"></i>Today</span><span><i class="bx bx-time me-1"></i>52 min</span><span><i class="bx bx-trending-up me-1"></i>12.4K lbs</span></div>
          </div>
        </div>
        <div class="card recent-activity-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="bg-label-primary rounded p-2"><i class="bx bx-dumbbell"></i></div>
                <span class="fw-medium">Lower Body</span>
              </div>
              <span class="badge bg-success">Complete</span>
            </div>
            <div class="d-flex gap-3 text-muted small"><span><i class="bx bx-calendar me-1"></i>Yesterday</span><span><i class="bx bx-time me-1"></i>45 min</span><span><i class="bx bx-trending-up me-1"></i>18.2K lbs</span></div>
          </div>
        </div>
        <div class="card recent-activity-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="bg-label-success rounded p-2"><i class="bx bx-run"></i></div>
                <span class="fw-medium">Morning Run</span>
              </div>
              <span class="badge bg-success">Complete</span>
            </div>
            <div class="d-flex gap-3 text-muted small"><span><i class="bx bx-calendar me-1"></i>2 days ago</span><span><i class="bx bx-time me-1"></i>32 min</span><span><i class="bx bx-map me-1"></i>3.1 mi</span></div>
          </div>
        </div>
      `;
    }

    const favContent = document.getElementById('favoritesContent') || document.getElementById('desktopFavoritesContent');
    if (favContent) {
      favContent.innerHTML = `
        <div class="card favorite-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex align-items-center gap-2">
              <i class="bx bxs-heart text-danger"></i>
              <div><div class="fw-medium">Upper Body Push</div><small class="text-muted">5 exercises</small></div>
            </div>
          </div>
        </div>
        <div class="card favorite-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex align-items-center gap-2">
              <i class="bx bxs-heart text-danger"></i>
              <div><div class="fw-medium">Lower Body</div><small class="text-muted">6 exercises</small></div>
            </div>
          </div>
        </div>
        <div class="card favorite-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex align-items-center gap-2">
              <i class="bx bxs-heart text-danger"></i>
              <div><div class="fw-medium">Full Body Friday</div><small class="text-muted">8 exercises</small></div>
            </div>
          </div>
        </div>
      `;
    }
  });

  // Let the DOM update
  await page.waitForTimeout(500);

  // Take the screenshot
  await page.screenshot({
    path: 'tests/screenshots/dashboard-desktop.png',
    fullPage: false
  });

  // Also take a mobile version
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:8001/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Force mobile dashboard visible
  await page.evaluate(() => {
    // On mobile, IDs are NOT swapped, so mobile elements have the canonical IDs
    const authDash = document.getElementById('authenticatedDashboard');
    const unauthWelcome = document.getElementById('unauthenticatedWelcome');

    if (authDash) authDash.style.display = 'block';
    if (unauthWelcome) unauthWelcome.style.display = 'none';

    // Show sidebar
    document.documentElement.classList.remove('layout-without-menu');

    // Set mock data
    const dateEl = document.getElementById('homeDate');
    const greetingEl = document.getElementById('homeGreeting');
    if (dateEl) {
      const today = new Date();
      dateEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    if (greetingEl) greetingEl.textContent = 'Good Morning, Coach!';

    const statEl = document.getElementById('weeklyStatText');
    if (statEl) statEl.textContent = 'This Week: 4/7 Activities';

    const streakBadge = document.getElementById('weeklyStreakBadge');
    if (streakBadge) { streakBadge.textContent = '🔥 12 day streak'; streakBadge.style.display = 'inline'; }

    const progressFill = document.getElementById('weeklyProgressFill');
    if (progressFill) progressFill.style.width = '57%';

    const progressText = document.getElementById('weeklyProgressText');
    if (progressText) progressText.textContent = '57% complete 👍 Halfway there!';

    // Mock recent activity
    const recentContent = document.getElementById('recentActivityContent');
    if (recentContent) {
      recentContent.innerHTML = `
        <div class="card recent-activity-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="bg-label-primary rounded p-2"><i class="bx bx-dumbbell"></i></div>
                <span class="fw-medium">Upper Body Push</span>
              </div>
              <span class="badge bg-success">Complete</span>
            </div>
            <div class="d-flex gap-3 text-muted small"><span><i class="bx bx-calendar me-1"></i>Today</span><span><i class="bx bx-time me-1"></i>52 min</span></div>
          </div>
        </div>
        <div class="card recent-activity-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="bg-label-primary rounded p-2"><i class="bx bx-dumbbell"></i></div>
                <span class="fw-medium">Lower Body</span>
              </div>
              <span class="badge bg-success">Complete</span>
            </div>
            <div class="d-flex gap-3 text-muted small"><span><i class="bx bx-calendar me-1"></i>Yesterday</span><span><i class="bx bx-time me-1"></i>45 min</span></div>
          </div>
        </div>
      `;
    }

    // Mock favorites
    const favContent = document.getElementById('favoritesContent');
    if (favContent) {
      favContent.innerHTML = `
        <div class="card favorite-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex align-items-center gap-2">
              <i class="bx bxs-heart text-danger"></i>
              <div><div class="fw-medium">Upper Body Push</div><small class="text-muted">5 exercises</small></div>
            </div>
          </div>
        </div>
        <div class="card favorite-card mb-2">
          <div class="card-body py-3 px-3">
            <div class="d-flex align-items-center gap-2">
              <i class="bx bxs-heart text-danger"></i>
              <div><div class="fw-medium">Lower Body</div><small class="text-muted">6 exercises</small></div>
            </div>
          </div>
        </div>
      `;
    }
  });

  await page.waitForTimeout(500);

  await page.screenshot({
    path: 'tests/screenshots/dashboard-mobile.png',
    fullPage: true
  });
});
