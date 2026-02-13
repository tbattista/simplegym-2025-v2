/**
 * Menu Template Component
 * Single source of truth for the sidebar menu HTML
 * Provides consistent menu structure across all pages
 */

/**
 * Generate the complete menu HTML with authentication UI
 * @param {string} activePage - The currently active page ('home', 'programs', 'workouts', 'exercises')
 * @returns {string} Complete menu HTML
 */
function getMenuHTML(activePage = 'home') {
    return `
        <div class="menu-inner-shadow"></div>

        <ul class="menu-inner py-1">
            <!-- Navigation -->
            <li class="menu-header small text-uppercase">
                <span class="menu-header-text">Navigation</span>
            </li>

            <!-- Session - Only visible when active session exists -->
            <li class="menu-item ${activePage === 'workout-mode' ? 'active' : ''}" id="sessionMenuItem" style="display: none;">
                <a href="workout-mode.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-play"></i>
                    <div class="text-truncate">Session</div>
                </a>
            </li>

            <!-- Home -->
            <li class="menu-item ${activePage === 'home' ? 'active' : ''}">
                <a href="index.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-home"></i>
                    <div class="text-truncate">Home</div>
                </a>
            </li>

            <!-- Log - Hidden for now
            <li class="menu-item ${activePage === 'dashboard' ? 'active' : ''}">
                <a href="dashboard.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-calendar"></i>
                    <div class="text-truncate">Log</div>
                </a>
            </li>
            -->

            <!-- Library (was Workout Database) -->
            <li class="menu-item ${activePage === 'workout-database' ? 'active' : ''}">
                <a href="workout-database.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-library"></i>
                    <div class="text-truncate">Library</div>
                </a>
            </li>

            <!-- History (was Workout History) -->
            <li class="menu-item ${activePage === 'workout-history' ? 'active' : ''}">
                <a href="workout-history.html?all=true" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-history"></i>
                    <div class="text-truncate">History</div>
                </a>
            </li>

            <!-- Log -->
            <li class="menu-item ${activePage === 'activity-log' ? 'active' : ''}">
                <a href="activity-log.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-edit-alt"></i>
                    <div class="text-truncate">Log</div>
                </a>
            </li>

            <!-- Workout Management -->
            <li class="menu-header small text-uppercase">
                <span class="menu-header-text">Workout Management</span>
            </li>
            <li class="menu-item ${activePage === 'workouts' ? 'active' : ''}">
                <a href="workout-builder.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-dumbbell"></i>
                    <div class="text-truncate">Builder</div>
                </a>
            </li>
            <li class="menu-item ${activePage === 'programs' ? 'active' : ''}">
                <a href="programs.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-folder"></i>
                    <div class="text-truncate">Programs</div>
                </a>
            </li>
            <li class="menu-item ${activePage === 'public-workouts' ? 'active' : ''}">
                <a href="public-workouts.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-globe"></i>
                    <div class="text-truncate">Explore</div>
                </a>
            </li>

            <!-- Data Management -->
            <li class="menu-header small text-uppercase">
                <span class="menu-header-text">Data Management</span>
            </li>
            <li class="menu-item ${activePage === 'exercises' ? 'active' : ''}">
                <a href="exercise-database.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-book-content"></i>
                    <div class="text-truncate">Exercises</div>
                </a>
            </li>

        </ul>
    `;
}

// Make globally available immediately
window.getMenuHTML = getMenuHTML;

/**
 * Cycle through theme options: auto → dark → light → auto
 * Shared function used by both navbar and any other theme toggles
 */
function cycleTheme() {
    if (!window.themeManager) return;

    const currentPreference = window.themeManager.getPreference();
    let nextTheme;

    switch (currentPreference) {
        case 'auto':
            nextTheme = 'dark';
            break;
        case 'dark':
            nextTheme = 'light';
            break;
        case 'light':
            nextTheme = 'auto';
            break;
        default:
            nextTheme = 'auto';
    }

    console.log('🎨 Cycling theme from', currentPreference, 'to', nextTheme);
    window.themeManager.setPreference(nextTheme);
    
    // Dispatch event so all theme toggles can update
    window.dispatchEvent(new Event('themeChanged'));
}

// Make globally available
window.cycleTheme = cycleTheme;