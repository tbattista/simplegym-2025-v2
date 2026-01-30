/**
 * Ghost Gym V2 - Automated Screenshot Capture
 * Captures both Desktop (1440x900) and Mobile (390x844 - iPhone 14) views
 *
 * Usage:
 *   npx playwright install chromium  (first time only)
 *   node docs/user-flows/capture-screenshots.js
 */

const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8001';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Viewport configurations
const VIEWPORTS = {
  desktop: { name: 'desktop', width: 1440, height: 900 },
  mobile: { name: 'mobile', ...devices['iPhone 14'].viewport }
};

// Ensure directories exist
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Pages to capture
const PAGES = [
  { name: '01-landing', url: '/', waitFor: '.layout-wrapper', authRequired: false },
  { name: '02-home-dashboard', url: '/', waitFor: '.layout-wrapper', authRequired: true },
  { name: '03-dashboard-log', url: '/dashboard.html', waitFor: '#activityCalendar, .calendar-container', authRequired: true },
  { name: '04-workout-library', url: '/workout-database.html', waitFor: '.workout-list, #workoutList', authRequired: false },
  { name: '05-workout-builder', url: '/workout-builder.html?new=true', waitFor: '#workoutForm, .exercise-groups-container', authRequired: false },
  { name: '06-workout-mode', url: '/workout-mode.html', waitFor: '.landing-content, #sessionContainer', authRequired: false },
  { name: '07-workout-history', url: '/workout-history.html?all=true', waitFor: '#historyCalendar, .history-container', authRequired: true },
  { name: '08-exercise-database', url: '/exercise-database.html', waitFor: '#exerciseList, .exercise-grid', authRequired: false },
  { name: '09-programs', url: '/programs.html', waitFor: '#programsContainer, .programs-grid', authRequired: true },
  { name: '10-public-workouts', url: '/public-workouts.html', waitFor: '.public-workouts-container', authRequired: false },
  { name: '11-profile', url: '/profile.html', waitFor: '#profileForm, .profile-container', authRequired: true },
];

// Modals and overlays to capture
const MODALS = [
  {
    name: 'modal-auth-signin',
    authRequired: false,
    setup: async (page) => {
      await page.goto(BASE_URL + '/');
      await page.waitForTimeout(1500);
    },
    trigger: async (page) => {
      // Click sign in button in navbar
      await page.click('#navbarSignInBtn');
      await page.waitForSelector('#authModal.show', { timeout: 5000 });
      await page.waitForTimeout(500);
    },
    cleanup: async (page) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  },
  {
    name: 'modal-auth-signup',
    authRequired: false,
    setup: async (page) => {
      await page.goto(BASE_URL + '/');
      await page.waitForTimeout(1500);
    },
    trigger: async (page) => {
      await page.click('#navbarSignInBtn');
      await page.waitForSelector('#authModal.show', { timeout: 5000 });
      await page.click('#signup-tab');
      await page.waitForTimeout(500);
    },
    cleanup: async (page) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  },
  {
    name: 'modal-exercise-detail',
    authRequired: false,
    setup: async (page) => {
      await page.goto(BASE_URL + '/exercise-database.html');
      await page.waitForSelector('.exercise-card, .exercise-item', { timeout: 10000 });
      await page.waitForTimeout(1000);
    },
    trigger: async (page) => {
      await page.click('.exercise-card:first-child, .exercise-item:first-child');
      await page.waitForSelector('#exerciseDetailModal.show, .modal.show', { timeout: 5000 });
      await page.waitForTimeout(500);
    },
    cleanup: async (page) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  },
  {
    name: 'offcanvas-filters',
    authRequired: false,
    setup: async (page) => {
      await page.goto(BASE_URL + '/workout-database.html');
      await page.waitForSelector('#workoutList', { timeout: 10000 });
      await page.waitForTimeout(1000);
    },
    trigger: async (page) => {
      // Look for filter button
      const filterBtn = await page.$('.filter-toggle, [data-filter-toggle], .btn-filter, #filterBtn');
      if (filterBtn) {
        await filterBtn.click();
        await page.waitForSelector('.offcanvas.show', { timeout: 5000 });
        await page.waitForTimeout(500);
      } else {
        throw new Error('Filter button not found');
      }
    },
    cleanup: async (page) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  },
  {
    name: 'offcanvas-calendar-day',
    authRequired: true,
    setup: async (page) => {
      await page.goto(BASE_URL + '/dashboard.html');
      await page.waitForSelector('#activityCalendar', { timeout: 10000 });
      await page.waitForTimeout(2000);
    },
    trigger: async (page) => {
      // Click on a calendar day that has activity
      const dayWithActivity = await page.$('.calendar-day.has-activity, .fc-daygrid-day.has-events, .calendar-day:not(.empty)');
      if (dayWithActivity) {
        await dayWithActivity.click();
        await page.waitForSelector('.offcanvas.show, #calendarDayOffcanvas.show', { timeout: 5000 });
        await page.waitForTimeout(500);
      } else {
        // Just click any day
        await page.click('.calendar-day, .fc-daygrid-day');
        await page.waitForTimeout(1000);
      }
    },
    cleanup: async (page) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  }
];

async function setLightTheme(page) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('templateCustomizer-style', 'light');
    document.documentElement.setAttribute('data-bs-theme', 'light');
    document.documentElement.classList.remove('dark-style');
    document.documentElement.classList.add('light-style');
  });
}

async function waitForPageLoad(page, selector, timeout = 10000) {
  try {
    const selectors = selector.split(',').map(s => s.trim());
    await Promise.race(
      selectors.map(s => page.waitForSelector(s, { timeout }).catch(() => null))
    );
  } catch (e) {
    console.log(`    Warning: selector "${selector}" not found`);
  }
  await page.waitForTimeout(1500);
}

async function captureScreenshot(page, name, subdir = '') {
  const dir = subdir ? path.join(SCREENSHOT_DIR, subdir) : SCREENSHOT_DIR;
  ensureDir(dir);
  const filepath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

async function captureForViewport(context, viewport, isLoggedIn, captureModals = true) {
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  const subdir = viewport.name;
  ensureDir(path.join(SCREENSHOT_DIR, subdir));
  ensureDir(path.join(SCREENSHOT_DIR, subdir, 'modals'));

  console.log(`\n  [${viewport.name.toUpperCase()}] Capturing pages...`);

  // Set light theme
  await page.goto(BASE_URL);
  await setLightTheme(page);
  await page.reload();
  await page.waitForTimeout(1000);

  // Capture pages
  for (const pageConfig of PAGES) {
    // Handle auth requirements
    if (pageConfig.authRequired && !isLoggedIn) {
      console.log(`    ⏭ ${pageConfig.name} (requires auth)`);
      continue;
    }

    // Skip duplicate landing for logged-in users
    if (pageConfig.name === '02-home-dashboard' && !isLoggedIn) continue;
    if (pageConfig.name === '01-landing' && isLoggedIn) continue;

    try {
      await page.goto(BASE_URL + pageConfig.url);
      await waitForPageLoad(page, pageConfig.waitFor);
      await captureScreenshot(page, pageConfig.name, subdir);
      console.log(`    ✓ ${pageConfig.name}`);
    } catch (e) {
      console.log(`    ✗ ${pageConfig.name}: ${e.message}`);
    }
  }

  // Capture modals
  if (captureModals) {
    console.log(`\n  [${viewport.name.toUpperCase()}] Capturing modals...`);

    for (const modal of MODALS) {
      if (modal.authRequired && !isLoggedIn) {
        console.log(`    ⏭ ${modal.name} (requires auth)`);
        continue;
      }

      try {
        await modal.setup(page);
        await setLightTheme(page);
        await modal.trigger(page);
        await captureScreenshot(page, modal.name, `${subdir}/modals`);
        console.log(`    ✓ ${modal.name}`);
        if (modal.cleanup) await modal.cleanup(page);
      } catch (e) {
        console.log(`    ✗ ${modal.name}: ${e.message}`);
      }
    }
  }

  await page.close();
}

async function main() {
  console.log('\n🏋️ Ghost Gym V2 - Screenshot Capture');
  console.log('══════════════════════════════════════════════════\n');

  // Create screenshot directories
  ensureDir(SCREENSHOT_DIR);
  ensureDir(path.join(SCREENSHOT_DIR, 'desktop'));
  ensureDir(path.join(SCREENSHOT_DIR, 'desktop', 'modals'));
  ensureDir(path.join(SCREENSHOT_DIR, 'mobile'));
  ensureDir(path.join(SCREENSHOT_DIR, 'mobile', 'modals'));

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1500,950']
  });

  const context = await browser.newContext({
    deviceScaleFactor: 2,
    isMobile: false,
  });

  const loginPage = await context.newPage();

  // Navigate and check login state
  console.log('📱 Opening app at', BASE_URL);
  await loginPage.goto(BASE_URL);
  await loginPage.waitForTimeout(2000);

  // Set light theme initially
  await setLightTheme(loginPage);
  await loginPage.reload();
  await loginPage.waitForTimeout(1000);

  // Check if already logged in
  let isLoggedIn = await loginPage.evaluate(() => {
    const userDropdown = document.querySelector('#navbarUserDropdown:not(.d-none)');
    const signInHidden = document.querySelector('#navbarSignInBtn.d-none');
    return !!(userDropdown || signInHidden);
  });

  // Capture unauthenticated screenshots first (if not logged in)
  if (!isLoggedIn) {
    console.log('\n📸 PHASE 1: Unauthenticated Screenshots');
    console.log('──────────────────────────────────────────────────');

    // Desktop unauthenticated
    await captureForViewport(context, VIEWPORTS.desktop, false, true);

    // Mobile unauthenticated
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14'],
      deviceScaleFactor: 2,
    });
    await captureForViewport(mobileContext, VIEWPORTS.mobile, false, true);
    await mobileContext.close();
  }

  // Prompt for login if not already logged in
  if (!isLoggedIn) {
    console.log('\n══════════════════════════════════════════════════');
    console.log('🔐 MANUAL LOGIN REQUIRED');
    console.log('══════════════════════════════════════════════════');
    console.log('\nPlease log in to your account in the browser window.');
    console.log('Waiting up to 90 seconds for login...\n');

    // Wait for login
    const loginTimeout = 90000;
    const startTime = Date.now();

    while (Date.now() - startTime < loginTimeout) {
      isLoggedIn = await loginPage.evaluate(() => {
        const userDropdown = document.querySelector('#navbarUserDropdown:not(.d-none)');
        const signInHidden = document.querySelector('#navbarSignInBtn.d-none');
        return !!(userDropdown || signInHidden);
      });

      if (isLoggedIn) {
        console.log('✅ Login detected!\n');
        break;
      }

      const remaining = Math.ceil((loginTimeout - (Date.now() - startTime)) / 1000);
      process.stdout.write(`\r  Waiting... ${remaining}s remaining  `);
      await loginPage.waitForTimeout(2000);
    }
  }

  await loginPage.close();

  if (isLoggedIn) {
    console.log('\n📸 PHASE 2: Authenticated Screenshots');
    console.log('──────────────────────────────────────────────────');

    // Desktop authenticated
    await captureForViewport(context, VIEWPORTS.desktop, true, true);

    // Mobile authenticated
    const mobileAuthContext = await browser.newContext({
      ...devices['iPhone 14'],
      deviceScaleFactor: 2,
    });
    // Transfer auth state by copying localStorage
    const authPage = await context.newPage();
    await authPage.goto(BASE_URL);
    const authData = await authPage.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    await authPage.close();

    const mobileAuthPage = await mobileAuthContext.newPage();
    await mobileAuthPage.goto(BASE_URL);
    await mobileAuthPage.evaluate((data) => {
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
      }
    }, authData);
    await mobileAuthPage.close();

    await captureForViewport(mobileAuthContext, VIEWPORTS.mobile, true, true);
    await mobileAuthContext.close();
  } else {
    console.log('\n⚠ Login timeout - authenticated screenshots skipped');
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════');
  console.log('✅ SCREENSHOT CAPTURE COMPLETE');
  console.log('══════════════════════════════════════════════════\n');

  // Count files
  const countFiles = (dir) => {
    try {
      return fs.readdirSync(dir).filter(f => f.endsWith('.png')).length;
    } catch { return 0; }
  };

  const desktopPages = countFiles(path.join(SCREENSHOT_DIR, 'desktop'));
  const desktopModals = countFiles(path.join(SCREENSHOT_DIR, 'desktop', 'modals'));
  const mobilePages = countFiles(path.join(SCREENSHOT_DIR, 'mobile'));
  const mobileModals = countFiles(path.join(SCREENSHOT_DIR, 'mobile', 'modals'));
  const total = desktopPages + desktopModals + mobilePages + mobileModals;

  console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log(`   Desktop: ${desktopPages} pages, ${desktopModals} modals`);
  console.log(`   Mobile:  ${mobilePages} pages, ${mobileModals} modals`);
  console.log(`   Total:   ${total} screenshots\n`);

  await browser.close();
  console.log('Done! Ready for HTML generation.\n');
}

main().catch(console.error);
