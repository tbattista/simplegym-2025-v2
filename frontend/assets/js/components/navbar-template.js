/**
 * Navbar Template Component
 * Generates the top navigation bar HTML with dynamic page title
 * Follows Sneat template patterns for consistency
 */

/**
 * Generate the complete navbar HTML
 * @param {string} pageTitle - The title to display in the navbar
 * @param {string} pageIcon - Boxicons class for the page icon (e.g., 'bx-home')
 * @returns {string} Complete navbar HTML
 */
function getNavbarHTML(pageTitle = 'Ghost Gym', pageIcon = 'bx-home') {
    return `
        <nav class="layout-navbar navbar navbar-expand-xl align-items-center bg-navbar-theme"
             id="layout-navbar">
            <div class="container-xxl">
                <!-- Left Section: Hamburger + Page Title -->
                <div class="navbar-nav-left d-flex align-items-center flex-grow-1">
                    <!-- Hamburger Menu Toggle (always visible on mobile, hidden on desktop when sidebar is expanded) -->
                    <a class="nav-item nav-link px-0 me-3 me-xl-4 layout-menu-toggle"
                       href="javascript:void(0)"
                       aria-label="Toggle navigation menu">
                        <i class="bx bx-menu bx-sm"></i>
                    </a>
                    
                    <!-- Page Title with Icon (visible on all screens) -->
                    <div class="d-flex align-items-center">
                        <i class="bx ${pageIcon} me-2 text-primary"></i>
                        <h5 class="mb-0 fw-semibold">${pageTitle}</h5>
                    </div>
                </div>
                
                <!-- Right Section: Utility Icons -->
                <ul class="navbar-nav flex-row align-items-center ms-auto">
                
                <!-- Dark Mode Toggle -->
                <li class="nav-item me-2 me-xl-3">
                    <a class="nav-link style-switcher-toggle hide-arrow" 
                       href="javascript:void(0);" 
                       id="navbarDarkModeToggle" 
                       title="Toggle theme">
                        <i class="bx bx-sm" id="navbarThemeIcon"></i>
                    </a>
                </li>
                
                <!-- User Profile Dropdown -->
                <li class="nav-item navbar-dropdown dropdown-user dropdown">
                    <!-- Signed Out State: Simple Sign In Button -->
                    <a class="nav-link hide-arrow auth-sign-in" 
                       href="javascript:void(0);" 
                       id="navbarSignInBtn" 
                       title="Sign In">
                        <div class="avatar">
                            <i class="bx bx-user-circle bx-md"></i>
                        </div>
                    </a>
                    
                    <!-- Signed In State: User Avatar with Dropdown -->
                    <a class="nav-link dropdown-toggle hide-arrow auth-sign-out d-none" 
                       href="javascript:void(0);" 
                       data-bs-toggle="dropdown" 
                       aria-expanded="false"
                       id="navbarUserDropdown">
                        <div class="avatar avatar-online">
                            <span class="avatar-initial rounded-circle bg-label-primary" 
                                  id="navbarUserAvatar">U</span>
                        </div>
                    </a>
                    
                    <!-- User Dropdown Menu -->
                    <ul class="dropdown-menu dropdown-menu-end auth-sign-out d-none">
                        <!-- User Info Header -->
                        <li>
                            <a class="dropdown-item" href="javascript:void(0);">
                                <div class="d-flex">
                                    <div class="flex-shrink-0 me-3">
                                        <div class="avatar avatar-online">
                                            <span class="avatar-initial rounded-circle bg-label-primary" 
                                                  id="navbarUserAvatarDropdown">U</span>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1">
                                        <span class="fw-medium d-block" id="navbarUserName">User</span>
                                        <small class="text-muted" id="navbarUserEmail">user@example.com</small>
                                    </div>
                                </div>
                            </a>
                        </li>
                        <li><div class="dropdown-divider"></div></li>
                        
                        <!-- Account Settings (future feature) -->
                        <li>
                            <a class="dropdown-item" href="javascript:void(0);">
                                <i class="bx bx-user me-2"></i>
                                <span>My Profile</span>
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="javascript:void(0);">
                                <i class="bx bx-cog me-2"></i>
                                <span>Settings</span>
                            </a>
                        </li>
                        
                        <li><div class="dropdown-divider"></div></li>
                        
                        <!-- Sign Out -->
                        <li>
                            <a class="dropdown-item" href="javascript:void(0);" id="navbarSignOutBtn">
                                <i class="bx bx-power-off me-2"></i>
                                <span>Sign Out</span>
                            </a>
                        </li>
                    </ul>
                </li>
                </ul>
            </div>
        </nav>
    `;
}

// Make globally available
window.getNavbarHTML = getNavbarHTML;

/**
 * Initialize navbar theme toggle functionality
 * Connects to the existing theme manager
 */
function initializeNavbarThemeToggle() {
    // Wait for theme manager to be available
    if (!window.themeManager) {
        console.warn('⚠️ Theme manager not available yet, retrying...');
        setTimeout(initializeNavbarThemeToggle, 100);
        return;
    }

    console.log('🎨 Initializing navbar theme toggle...');

    const toggleBtn = document.getElementById('navbarDarkModeToggle');
    if (!toggleBtn) {
        console.warn('⚠️ Navbar theme toggle button not found');
        return;
    }

    // Set up click handler
    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cycleTheme();
    });

    // Update icon to show current theme
    updateNavbarThemeIcon();

    // Listen for theme changes from other sources (e.g., sidebar toggle)
    window.addEventListener('themeChanged', () => {
        updateNavbarThemeIcon();
    });

    console.log('✅ Navbar theme toggle initialized');
}

/**
 * Update navbar theme icon to reflect current theme
 */
function updateNavbarThemeIcon() {
    if (!window.themeManager) return;

    const icon = document.getElementById('navbarThemeIcon');
    if (!icon) return;

    const currentPreference = window.themeManager.getPreference();

    switch (currentPreference) {
        case 'auto':
            icon.className = 'bx bx-desktop bx-sm';
            break;
        case 'dark':
            icon.className = 'bx bx-moon bx-sm';
            break;
        case 'light':
            icon.className = 'bx bx-sun bx-sm';
            break;
    }
}

/**
 * Initialize navbar authentication UI
 * Connects to the existing auth service
 */
function initializeNavbarAuth() {
    console.log('🔐 Initializing navbar auth UI...');

    // Sign in button
    const signInBtn = document.getElementById('navbarSignInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.showAuthModal) {
                window.showAuthModal('signin');
            } else {
                console.warn('⚠️ showAuthModal not available');
            }
        });
    }

    // Sign out button
    const signOutBtn = document.getElementById('navbarSignOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (window.authService) {
                try {
                    await window.authService.signOut();
                } catch (error) {
                    console.error('❌ Sign out error:', error);
                }
            } else {
                console.warn('⚠️ authService not available');
            }
        });
    }

    // Listen for auth state changes
    window.addEventListener('authStateChanged', (event) => {
        updateNavbarAuthUI(event.detail);
    });

    // Initial auth state check
    if (window.authService && window.authService.currentUser) {
        updateNavbarAuthUI(window.authService.currentUser);
    }

    console.log('✅ Navbar auth UI initialized');
}

/**
 * Update navbar UI based on authentication state
 * @param {Object|null} user - Current user object or null if signed out
 */
function updateNavbarAuthUI(user) {
    const signInElements = document.querySelectorAll('.auth-sign-in');
    const signOutElements = document.querySelectorAll('.auth-sign-out');
    
    if (user) {
        // User is signed in
        signInElements.forEach(el => el.classList.add('d-none'));
        signOutElements.forEach(el => el.classList.remove('d-none'));
        
        // Update user info
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        const email = user.email || '';
        const initial = displayName.charAt(0).toUpperCase();
        
        // Update all user name displays
        document.querySelectorAll('#navbarUserName').forEach(el => {
            el.textContent = displayName;
        });
        
        // Update all email displays
        document.querySelectorAll('#navbarUserEmail').forEach(el => {
            el.textContent = email;
        });
        
        // Update all avatar initials
        document.querySelectorAll('#navbarUserAvatar, #navbarUserAvatarDropdown').forEach(el => {
            el.textContent = initial;
        });
        
        console.log('✅ Navbar updated for signed-in user:', displayName);
    } else {
        // User is signed out
        signInElements.forEach(el => el.classList.remove('d-none'));
        signOutElements.forEach(el => el.classList.add('d-none'));
        
        console.log('✅ Navbar updated for signed-out state');
    }
}

// Make functions globally available
window.initializeNavbarThemeToggle = initializeNavbarThemeToggle;
window.updateNavbarThemeIcon = updateNavbarThemeIcon;
window.initializeNavbarAuth = initializeNavbarAuth;
window.updateNavbarAuthUI = updateNavbarAuthUI;

console.log('📦 Navbar template component loaded');