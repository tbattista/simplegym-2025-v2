# Top Navigation Bar Architecture Plan
## Ghost Gym V0.4.1 - Menu Transformation

**Created:** 2025-01-12  
**Status:** Planning Phase  
**Goal:** Add a slim top navigation bar following Sneat template patterns

---

## 📋 Executive Summary

Transform Ghost Gym's menu system by adding a **slim top navigation bar** that includes:
- **Hamburger menu** (left) - toggles sidebar
- **Page title** (center-left) - dynamic based on current page
- **Utility icons** (right) - dark mode toggle, user profile dropdown

This follows the Sneat template pattern seen in [`sneat-bootstrap-template/html/index.html`](sneat-bootstrap-template/html/index.html:611-711) while maintaining your existing sidebar menu structure.

---

## 🎯 Design Goals

### 1. **Slim & Clean**
- Height: ~60px (matching Sneat's navbar height)
- Minimal visual weight
- Consistent with Ghost Gym's design language

### 2. **Functional**
- Hamburger menu toggles sidebar (especially important on mobile)
- Dynamic page title shows current context
- Quick access to dark mode and user profile
- No duplication with sidebar menu items

### 3. **Responsive**
- Mobile-first approach
- Hamburger always visible on mobile
- Icons stack appropriately on small screens

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  [☰]  Workout Builder    [🌙] [👤▼]                        │ ← Top Navbar
└─────────────────────────────────────────────────────────────┘
┌──────┬──────────────────────────────────────────────────────┐
│      │                                                      │
│ 👻   │  Page Content                                        │
│ Home │                                                      │
│ 🏋️   │                                                      │
│ ...  │                                                      │
│      │                                                      │
└──────┴──────────────────────────────────────────────────────┘
  ↑ Sidebar Menu (existing)
```

---

## 📐 Component Structure

### **1. Navbar Component** (`navbar-template.js`)

```javascript
/**
 * Generate top navbar HTML
 * @param {string} pageTitle - Current page title
 * @param {string} pageIcon - Boxicons class for page icon
 * @returns {string} Navbar HTML
 */
function getNavbarHTML(pageTitle = 'Ghost Gym', pageIcon = 'bx-home') {
    return `
        <nav class="layout-navbar container-xxl navbar navbar-expand-xl 
                    navbar-detached align-items-center bg-navbar-theme" 
             id="layout-navbar">
            
            <!-- Left: Hamburger + Page Title -->
            <div class="navbar-nav-left d-flex align-items-center">
                <!-- Hamburger Menu Toggle -->
                <a class="nav-item nav-link px-0 me-xl-4 layout-menu-toggle" 
                   href="javascript:void(0)">
                    <i class="bx bx-menu bx-sm"></i>
                </a>
                
                <!-- Page Title (hidden on mobile) -->
                <div class="d-none d-md-flex align-items-center">
                    <i class="bx ${pageIcon} me-2"></i>
                    <h5 class="mb-0">${pageTitle}</h5>
                </div>
            </div>
            
            <!-- Right: Utility Icons -->
            <ul class="navbar-nav flex-row align-items-center ms-auto">
                
                <!-- Dark Mode Toggle -->
                <li class="nav-item me-2 me-xl-3">
                    <a class="nav-link" href="javascript:void(0);" 
                       id="navbarDarkModeToggle" title="Toggle theme">
                        <i class="bx bx-moon bx-sm" id="navbarThemeIcon"></i>
                    </a>
                </li>
                
                <!-- User Profile Dropdown -->
                <li class="nav-item navbar-dropdown dropdown-user dropdown">
                    <!-- Signed Out State -->
                    <a class="nav-link auth-sign-in" href="javascript:void(0);" 
                       id="navbarSignInBtn" title="Sign In">
                        <div class="avatar avatar-online">
                            <i class="bx bx-user-circle bx-md"></i>
                        </div>
                    </a>
                    
                    <!-- Signed In State -->
                    <a class="nav-link dropdown-toggle hide-arrow auth-sign-out d-none" 
                       href="javascript:void(0);" 
                       data-bs-toggle="dropdown" 
                       id="navbarUserDropdown">
                        <div class="avatar avatar-online">
                            <span class="avatar-initial rounded-circle bg-label-primary" 
                                  id="navbarUserAvatar">U</span>
                        </div>
                    </a>
                    
                    <!-- Dropdown Menu -->
                    <ul class="dropdown-menu dropdown-menu-end auth-sign-out d-none">
                        <li>
                            <a class="dropdown-item" href="javascript:void(0);">
                                <div class="d-flex">
                                    <div class="flex-grow-1">
                                        <span class="fw-medium d-block" 
                                              id="navbarUserName">User</span>
                                        <small class="text-muted" 
                                               id="navbarUserEmail">user@example.com</small>
                                    </div>
                                </div>
                            </a>
                        </li>
                        <li><div class="dropdown-divider"></div></li>
                        <li>
                            <a class="dropdown-item" href="javascript:void(0);" 
                               id="navbarSignOutBtn">
                                <i class="bx bx-power-off me-2"></i>
                                <span>Sign Out</span>
                            </a>
                        </li>
                    </ul>
                </li>
            </ul>
        </nav>
    `;
}
```

### **2. Page Title Configuration**

Each page will define its title and icon:

```javascript
// In each HTML page
const PAGE_CONFIG = {
    title: 'Workout Builder',
    icon: 'bx-dumbbell'
};
```

**Page Configurations:**
- **Home/Dashboard:** `{ title: 'Dashboard', icon: 'bx-home' }`
- **Workout Mode:** `{ title: 'Workout Mode', icon: 'bx-play-circle' }`
- **Workout Builder:** `{ title: 'Workout Builder', icon: 'bx-dumbbell' }`
- **Exercise Database:** `{ title: 'Exercise Database', icon: 'bx-book-content' }`
- **Workout Database:** `{ title: 'Workout Database', icon: 'bx-library' }`
- **Programs:** `{ title: 'My Programs', icon: 'bx-folder' }`

---

## 🎨 CSS Styling

### **Key Styles** (`navbar-custom.css`)

```css
/* Top Navbar - Slim Design */
.layout-navbar {
    height: 60px;
    padding: 0.5rem 0;
    box-shadow: 0 2px 6px 0 rgba(67, 89, 113, 0.12);
    z-index: 1000;
}

/* Hamburger Menu */
.layout-menu-toggle {
    cursor: pointer;
    transition: transform 0.2s;
}

.layout-menu-toggle:hover {
    transform: scale(1.1);
}

/* Page Title */
.navbar-nav-left h5 {
    font-weight: 600;
    color: var(--bs-heading-color);
}

/* Utility Icons */
.navbar-nav .nav-link {
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: background-color 0.2s;
}

.navbar-nav .nav-link:hover {
    background-color: rgba(67, 89, 113, 0.04);
}

/* User Avatar */
.avatar-initial {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
}

/* Responsive Adjustments */
@media (max-width: 767.98px) {
    .layout-navbar {
        height: 56px;
    }
    
    .navbar-nav .nav-link {
        padding: 0.375rem;
    }
}
```

---

## 🔧 Implementation Steps

### **Phase 1: Create Core Components**
1. ✅ Create [`navbar-template.js`](frontend/assets/js/components/navbar-template.js)
2. ✅ Create [`navbar-custom.css`](frontend/assets/css/navbar-custom.css)
3. ✅ Create [`navbar-injection-service.js`](frontend/assets/js/services/navbar-injection-service.js)

### **Phase 2: Update Menu System**
4. ✅ Update [`menu-template.js`](frontend/assets/js/components/menu-template.js:1-231)
   - Remove dark mode toggle (moving to navbar)
   - Remove user profile section (moving to navbar)
   - Keep only navigation items

### **Phase 3: Integrate with Pages**
5. ✅ Update HTML structure in all pages:
   - Add navbar container after `<div class="layout-page">`
   - Include navbar scripts
   - Define page configuration

### **Phase 4: Wire Up Functionality**
6. ✅ Connect dark mode toggle to theme manager
7. ✅ Connect user profile to auth service
8. ✅ Ensure hamburger menu toggles sidebar correctly

### **Phase 5: Testing & Polish**
9. ✅ Test on desktop (1920px, 1366px)
10. ✅ Test on tablet (768px)
11. ✅ Test on mobile (375px, 414px)
12. ✅ Verify dark mode transitions
13. ✅ Verify auth state changes

---

## 📱 Responsive Behavior

### **Desktop (≥1200px)**
- Sidebar always visible
- Hamburger menu hidden (or minimal)
- Full page title visible
- All utility icons visible

### **Tablet (768px - 1199px)**
- Sidebar collapsible
- Hamburger menu visible
- Page title visible
- All utility icons visible

### **Mobile (<768px)**
- Sidebar hidden by default
- Hamburger menu prominent
- Page title hidden (more space for icons)
- Utility icons visible

---

## 🔄 Integration with Existing Systems

### **1. Theme Manager**
```javascript
// In navbar-template.js
function initializeNavbarThemeToggle() {
    const toggleBtn = document.getElementById('navbarDarkModeToggle');
    const icon = document.getElementById('navbarThemeIcon');
    
    toggleBtn.addEventListener('click', () => {
        window.cycleTheme(); // Reuse existing function
    });
    
    // Listen for theme changes
    window.addEventListener('themeChanged', updateNavbarThemeIcon);
}
```

### **2. Auth Service**
```javascript
// In navbar-template.js
function initializeNavbarAuth() {
    // Sign in button
    document.getElementById('navbarSignInBtn')?.addEventListener('click', () => {
        window.showAuthModal?.('signin');
    });
    
    // Sign out button
    document.getElementById('navbarSignOutBtn')?.addEventListener('click', () => {
        window.authService?.signOut();
    });
    
    // Listen for auth state changes
    window.addEventListener('authStateChanged', updateNavbarAuthUI);
}
```

### **3. Menu Toggle**
```javascript
// Reuse existing menu toggle functionality
document.querySelector('.layout-menu-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('layout-menu-expanded');
});
```

---

## 🚫 What NOT to Duplicate

### **Keep in Sidebar Only:**
- Navigation links (Home, Workout Mode, etc.)
- Section headers (Workout Management, Data Management)
- Public Workouts link

### **Move to Navbar:**
- Dark mode toggle
- User profile/sign in
- Sign out button

### **Result:**
- Sidebar = Navigation
- Navbar = Context + Utilities

---

## 📝 File Changes Summary

### **New Files:**
1. `frontend/assets/js/components/navbar-template.js` - Navbar HTML generator
2. `frontend/assets/css/navbar-custom.css` - Navbar styling
3. `frontend/assets/js/services/navbar-injection-service.js` - Navbar injection logic

### **Modified Files:**
1. `frontend/assets/js/components/menu-template.js` - Remove dark mode & user profile
2. All HTML pages - Add navbar container and scripts
3. `frontend/assets/css/ghost-gym-custom.css` - Adjust layout for navbar

### **Files to Review:**
- [`sneat-bootstrap-template/html/index.html`](sneat-bootstrap-template/html/index.html:611-711) - Reference navbar structure
- [`frontend/exercise-database.html`](frontend/exercise-database.html:1-326) - Current page structure
- [`frontend/workout-builder.html`](frontend/workout-builder.html:1-917) - Current page structure

---

## ✅ Success Criteria

1. **Visual:**
   - Slim navbar (~60px height)
   - Consistent with Sneat design
   - Smooth transitions

2. **Functional:**
   - Hamburger toggles sidebar
   - Dark mode toggle works
   - User profile dropdown works
   - Auth state updates correctly

3. **Responsive:**
   - Works on all screen sizes
   - Mobile menu behaves correctly
   - No layout breaks

4. **Performance:**
   - No flash of unstyled content
   - Fast injection (<100ms)
   - Smooth animations

---

## 🎨 Visual Mockup

```
Desktop View (1920px):
┌────────────────────────────────────────────────────────────────┐
│ [☰] 👻 Workout Builder                    [🌙] [👤 John Doe ▼] │
└────────────────────────────────────────────────────────────────┘

Mobile View (375px):
┌──────────────────────────────────┐
│ [☰]              [🌙] [👤▼]      │
└──────────────────────────────────┘
```

---

## 🔍 Next Steps

1. **Review this plan** - Does this match your vision?
2. **Clarify any questions:**
   - Should we keep any items in both navbar and sidebar?
   - Any specific icons or styling preferences?
   - Any additional utility icons needed?

3. **Ready to implement?** - Switch to Code mode to build this!

---

## 📚 References

- Sneat Navbar: [`sneat-bootstrap-template/html/index.html`](sneat-bootstrap-template/html/index.html:611-711)
- Current Menu: [`frontend/assets/js/components/menu-template.js`](frontend/assets/js/components/menu-template.js:1-231)
- Theme Manager: [`frontend/assets/js/services/theme-manager.js`](frontend/assets/js/services/theme-manager.js)
- Auth Service: Referenced in workout-builder.html

---

**Ready to proceed?** Let me know if you'd like any adjustments to this plan!