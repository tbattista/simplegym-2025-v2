/**
 * Menu Template Component
 * Single source of truth for the sidebar menu HTML
 * Provides consistent menu structure across all pages
 */

/**
 * Generate the complete menu HTML with authentication UI
 * @param {string} activePage - The currently active page ('builder', 'programs', 'workouts', 'exercises')
 * @returns {string} Complete menu HTML
 */
function getMenuHTML(activePage = 'builder') {
    return `
        <div class="app-brand demo">
            <a href="builder.html" class="app-brand-link">
                <span class="app-brand-logo demo">
                    <span class="text-primary">
                        👻
                    </span>
                </span>
                <span class="app-brand-text demo menu-text fw-bold ms-2">Ghost Gym</span>
            </a>

            <a href="javascript:void(0);" class="layout-menu-toggle menu-link text-large ms-auto">
                <i class="bx bx-chevron-left d-block d-xl-none align-middle"></i>
            </a>
        </div>

        <div class="menu-divider mt-0"></div>
        <div class="menu-inner-shadow"></div>

        <ul class="menu-inner py-1">
            <!-- Builder (Main View) -->
            <li class="menu-item ${activePage === 'builder' ? 'active' : ''}" data-section="builder">
                <a href="builder.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-layer"></i>
                    <div class="text-truncate">Builder</div>
                </a>
            </li>
            
            <!-- Data Management -->
            <li class="menu-header small text-uppercase">
                <span class="menu-header-text">Data Management</span>
            </li>
            <li class="menu-item ${activePage === 'programs' ? 'active' : ''}">
                <a href="programs.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-folder"></i>
                    <div class="text-truncate">My Programs</div>
                </a>
            </li>
            <li class="menu-item ${activePage === 'workouts' ? 'active' : ''}">
                <a href="workouts.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-dumbbell"></i>
                    <div class="text-truncate">Workout Builder</div>
                </a>
            </li>
            <li class="menu-item ${activePage === 'exercises' ? 'active' : ''}">
                <a href="exercise-database.html" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-book-content"></i>
                    <div class="text-truncate">Exercise Database</div>
                </a>
            </li>
            
            <!-- Tools & Settings -->
            <li class="menu-header small text-uppercase">
                <span class="menu-header-text">Tools & Settings</span>
            </li>
            <li class="menu-item" data-section="backup">
                <a href="#backup" class="menu-link" id="menuBackup">
                    <i class="menu-icon tf-icons bx bx-cloud-upload"></i>
                    <div class="text-truncate">Backup & Export</div>
                </a>
            </li>
            <li class="menu-item" data-section="settings">
                <a href="#settings" class="menu-link" id="menuSettings">
                    <i class="menu-icon tf-icons bx bx-cog"></i>
                    <div class="text-truncate">Settings</div>
                </a>
            </li>
            
            <!-- User Authentication Section -->
            <li class="menu-header small text-uppercase mt-auto">
                <span class="menu-header-text">Account</span>
            </li>
            
            <!-- Sign In Button (for anonymous users) -->
            <li class="menu-item auth-sign-in" id="menuAuthSignIn">
                <a href="javascript:void(0);" class="menu-link" id="menuSignInBtn">
                    <i class="menu-icon tf-icons bx bx-user"></i>
                    <div class="text-truncate">Sign In</div>
                </a>
            </li>
            
            <!-- User Profile (for authenticated users) -->
            <li class="menu-item auth-sign-out d-none" id="menuAuthProfile">
                <a href="javascript:void(0);" class="menu-link">
                    <i class="menu-icon tf-icons bx bx-user-circle"></i>
                    <div class="text-truncate">
                        <div id="menuUserDisplayName" class="fw-medium">User</div>
                        <small class="text-muted" id="menuUserEmailDisplay">user@example.com</small>
                    </div>
                </a>
            </li>
            <li class="menu-item auth-sign-out d-none">
                <a href="javascript:void(0);" class="menu-link" id="menuSignOutBtn">
                    <i class="menu-icon tf-icons bx bx-power-off"></i>
                    <div class="text-truncate">Sign Out</div>
                </a>
            </li>
        </ul>
    `;
}

// Make globally available immediately
window.getMenuHTML = getMenuHTML;