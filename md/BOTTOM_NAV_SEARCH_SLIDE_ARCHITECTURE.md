# Bottom Navigation Search Slide Feature

**Date:** 2025-11-30  
**Feature:** Bottom nav bar slides down when search is activated, creating more screen space  
**Status:** 🎯 Planning Phase

## Overview

When the user taps the search FAB button, both the bottom navigation bar and the search dropdown will slide down together, maximizing screen space for viewing search results. The bottom nav automatically restores when search is closed or when tapping outside the search area.

## User Experience Flow

```
┌─────────────────────────────────────┐
│                                     │
│     Exercise Results (visible)      │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [🔍 Search exercises...      ] [✕] │  ← Search Dropdown (bottom: 80px)
├─────────────────────────────────────┤
│ [❤️] [Filter] [Sort] [More]   [🔍] │  ← Bottom Nav (bottom: 0)
└─────────────────────────────────────┘

                    ↓ User taps Search FAB
                    
┌─────────────────────────────────────┐
│                                     │
│     Exercise Results (MORE SPACE)   │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [🔍 Search exercises...      ] [✕] │  ← Search Dropdown (bottom: 20px)
└─────────────────────────────────────┘
                                        ← Bottom Nav (hidden, bottom: -80px)

                    ↓ User closes search or taps outside
                    
┌─────────────────────────────────────┐
│                                     │
│     Exercise Results (visible)      │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [🔍 Search exercises...      ] [✕] │  ← Search Dropdown (bottom: 80px)
├─────────────────────────────────────┤
│ [❤️] [Filter] [Sort] [More]   [🔍] │  ← Bottom Nav (restored, bottom: 0)
└─────────────────────────────────────┘
```

## Technical Architecture

### 1. State Management

**New Global State:**
```javascript
window.bottomNavState = {
    isHidden: false,           // Track if bottom nav is hidden
    searchActive: false,       // Track if search is active
    animating: false          // Prevent multiple animations
};
```

### 2. CSS Modifications

**File:** [`frontend/assets/css/bottom-action-bar.css`](frontend/assets/css/bottom-action-bar.css)

**Add new classes:**
```css
/* Bottom nav hidden state (slides down) */
.bottom-action-bar.search-active {
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Search dropdown positioning states */
.search-dropdown {
    position: fixed;
    bottom: 80px;  /* Default: above bottom nav */
    transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-dropdown.nav-hidden {
    bottom: 20px;  /* When nav is hidden: near bottom */
}

/* Backdrop for tap-outside detection */
.search-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    z-index: 1049;  /* Below search dropdown (1050) but above content */
    display: none;
}

.search-backdrop.active {
    display: block;
}
```

### 3. JavaScript Implementation

**File:** [`frontend/assets/js/config/bottom-action-bar-config.js`](frontend/assets/js/config/bottom-action-bar-config.js)

**Update FAB search action for all pages:**

```javascript
fab: {
    icon: 'bx-search',
    title: 'Search exercises',
    variant: 'primary',
    action: function() {
        // Create search dropdown if it doesn't exist
        if (!window.exerciseSearchDropdown) {
            window.exerciseSearchDropdown = createSearchDropdown('exercise');
        }
        
        // Toggle search with bottom nav slide
        if (window.exerciseSearchDropdown.element.querySelector('.dropdown-menu').classList.contains('show')) {
            // Search is open - close it and restore nav
            closeSearchWithNav(window.exerciseSearchDropdown);
        } else {
            // Search is closed - open it and hide nav
            openSearchWithNav(window.exerciseSearchDropdown);
        }
    }
}
```

**New helper functions:**

```javascript
/**
 * Open search dropdown and slide down bottom nav
 * @param {Object} searchDropdown - Search dropdown instance
 */
function openSearchWithNav(searchDropdown) {
    if (window.bottomNavState?.animating) return;
    
    console.log('🔍 Opening search with nav slide');
    window.bottomNavState = window.bottomNavState || {};
    window.bottomNavState.animating = true;
    
    // Get elements
    const bottomNav = document.querySelector('.bottom-action-bar');
    const searchElement = searchDropdown.element;
    const backdrop = getOrCreateBackdrop();
    
    // Show backdrop
    backdrop.classList.add('active');
    
    // Add search-active class to bottom nav (triggers slide down)
    bottomNav?.classList.add('search-active');
    
    // Add nav-hidden class to search dropdown (repositions it)
    searchElement?.classList.add('nav-hidden');
    
    // Show search dropdown
    searchDropdown.show();
    
    // Update state
    window.bottomNavState.isHidden = true;
    window.bottomNavState.searchActive = true;
    
    // Animation complete
    setTimeout(() => {
        window.bottomNavState.animating = false;
    }, 300);
}

/**
 * Close search dropdown and restore bottom nav
 * @param {Object} searchDropdown - Search dropdown instance
 */
function closeSearchWithNav(searchDropdown) {
    if (window.bottomNavState?.animating) return;
    
    console.log('🔍 Closing search with nav restore');
    window.bottomNavState = window.bottomNavState || {};
    window.bottomNavState.animating = true;
    
    // Get elements
    const bottomNav = document.querySelector('.bottom-action-bar');
    const searchElement = searchDropdown.element;
    const backdrop = document.querySelector('.search-backdrop');
    
    // Hide backdrop
    backdrop?.classList.remove('active');
    
    // Remove search-active class from bottom nav (triggers slide up)
    bottomNav?.classList.remove('search-active');
    
    // Remove nav-hidden class from search dropdown (repositions it)
    searchElement?.classList.remove('nav-hidden');
    
    // Hide search dropdown
    searchDropdown.hide();
    
    // Update state
    window.bottomNavState.isHidden = false;
    window.bottomNavState.searchActive = false;
    
    // Animation complete
    setTimeout(() => {
        window.bottomNavState.animating = false;
    }, 300);
}

/**
 * Get or create backdrop element for tap-outside detection
 * @returns {HTMLElement} Backdrop element
 */
function getOrCreateBackdrop() {
    let backdrop = document.querySelector('.search-backdrop');
    
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'search-backdrop';
        document.body.appendChild(backdrop);
        
        // Click handler for tap-outside
        backdrop.addEventListener('click', () => {
            console.log('👆 Tapped outside search - closing');
            
            // Find active search dropdown and close it
            if (window.exerciseSearchDropdown) {
                closeSearchWithNav(window.exerciseSearchDropdown);
            }
            if (window.workoutSearchDropdown) {
                closeSearchWithNav(window.workoutSearchDropdown);
            }
        });
    }
    
    return backdrop;
}
```

**Update existing `createSearchDropdown` function:**

```javascript
function createSearchDropdown(type) {
    const dropdownId = `${type}SearchDropdown`;
    const inputId = `${type}SearchInput`;
    
    // Check if dropdown already exists
    let existingDropdown = document.getElementById(dropdownId);
    if (existingDropdown) {
        return bootstrap.Dropdown.getInstance(existingDropdown) || new bootstrap.Dropdown(existingDropdown);
    }
    
    // Create dropdown HTML with search-dropdown class
    const dropdownHTML = `
        <div class="dropdown position-fixed search-dropdown" id="${dropdownId}" style="left: 50%; transform: translateX(-50%); z-index: 1050; width: 90%; max-width: 500px;">
            <div class="dropdown-menu show w-100 p-3" style="position: static;">
                <div class="input-group">
                    <span class="input-group-text">
                        <i class="bx bx-search"></i>
                    </span>
                    <input type="text"
                           class="form-control"
                           id="${inputId}"
                           placeholder="Search ${type}s..."
                           autocomplete="off">
                    <button class="btn btn-outline-secondary search-close-btn" type="button">
                        <i class="bx bx-x"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', dropdownHTML);
    
    // Get the dropdown element
    const dropdownElement = document.getElementById(dropdownId);
    const searchInput = document.getElementById(inputId);
    const closeBtn = dropdownElement.querySelector('.search-close-btn');
    
    // Set up search input handler
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value.trim();
            console.log(`🔍 ${type} search:`, searchTerm);
            
            // Update the appropriate filter
            if (type === 'exercise' && window.currentFilters) {
                window.currentFilters.search = searchTerm;
                if (window.applyFiltersAndRender) {
                    window.applyFiltersAndRender(window.currentFilters);
                }
            } else if (type === 'workout' && window.ghostGym?.workoutDatabase) {
                window.ghostGym.workoutDatabase.filters.search = searchTerm;
                if (window.filterWorkouts) {
                    window.filterWorkouts();
                }
            }
        }, 300);
    });
    
    // Create custom dropdown object with show/hide/toggle methods
    const dropdown = {
        element: dropdownElement,
        input: searchInput,
        show: function() {
            this.element.querySelector('.dropdown-menu').classList.add('show');
            setTimeout(() => this.input.focus(), 100);
            console.log(`🔍 ${type} search dropdown shown`);
        },
        hide: function() {
            this.element.querySelector('.dropdown-menu').classList.remove('show');
            console.log(`🔍 ${type} search dropdown hidden`);
        },
        toggle: function() {
            const menu = this.element.querySelector('.dropdown-menu');
            if (menu.classList.contains('show')) {
                this.hide();
            } else {
                this.show();
            }
        }
    };
    
    // Close button handler - closes search AND restores nav
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSearchWithNav(dropdown);
    });
    
    // ESC key handler - closes search AND restores nav
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSearchWithNav(dropdown);
        }
    });
    
    return dropdown;
}
```

### 4. Service Integration

**File:** [`frontend/assets/js/services/bottom-action-bar-service.js`](frontend/assets/js/services/bottom-action-bar-service.js)

**Add method to programmatically hide/show nav:**

```javascript
/**
 * Hide bottom navigation bar (slide down)
 */
hideNav() {
    const bottomNav = document.querySelector('.bottom-action-bar');
    if (bottomNav && !window.bottomNavState?.isHidden) {
        bottomNav.classList.add('search-active');
        window.bottomNavState = window.bottomNavState || {};
        window.bottomNavState.isHidden = true;
        console.log('📉 Bottom nav hidden');
    }
}

/**
 * Show bottom navigation bar (slide up)
 */
showNav() {
    const bottomNav = document.querySelector('.bottom-action-bar');
    if (bottomNav && window.bottomNavState?.isHidden) {
        bottomNav.classList.remove('search-active');
        window.bottomNavState.isHidden = false;
        console.log('📈 Bottom nav shown');
    }
}

/**
 * Toggle bottom navigation visibility
 */
toggleNav() {
    if (window.bottomNavState?.isHidden) {
        this.showNav();
    } else {
        this.hideNav();
    }
}
```

## Implementation Steps

### Phase 1: CSS Foundation
1. Add `.search-active` class to bottom-action-bar.css
2. Add `.search-dropdown` and `.nav-hidden` classes
3. Add `.search-backdrop` styles
4. Test transitions in isolation

### Phase 2: JavaScript Core Functions
1. Implement `openSearchWithNav()` function
2. Implement `closeSearchWithNav()` function
3. Implement `getOrCreateBackdrop()` function
4. Add state management to `window.bottomNavState`

### Phase 3: Search Dropdown Updates
1. Update `createSearchDropdown()` to add `.search-dropdown` class
2. Update close button to call `closeSearchWithNav()`
3. Update ESC key handler to call `closeSearchWithNav()`
4. Remove old click-outside handler (replaced by backdrop)

### Phase 4: FAB Button Integration
1. Update exercise-database FAB action
2. Update workout-database FAB action
3. Test toggle behavior (open/close)

### Phase 5: Service Methods
1. Add `hideNav()`, `showNav()`, `toggleNav()` to service
2. Make methods globally accessible
3. Document API for future use

### Phase 6: Testing & Refinement
1. Test on mobile devices (iOS Safari, Chrome, Firefox)
2. Test animation smoothness
3. Test tap-outside behavior
4. Test ESC key behavior
5. Test with keyboard open/closed
6. Verify search results remain scrollable
7. Test on all pages with search (exercise-database, workout-database)

## Affected Files

### Modified Files
1. **frontend/assets/css/bottom-action-bar.css**
   - Add `.search-active` transition
   - Add `.search-dropdown` positioning
   - Add `.nav-hidden` state
   - Add `.search-backdrop` styles

2. **frontend/assets/js/config/bottom-action-bar-config.js**
   - Update `createSearchDropdown()` function
   - Add `openSearchWithNav()` function
   - Add `closeSearchWithNav()` function
   - Add `getOrCreateBackdrop()` function
   - Update FAB actions for exercise-database
   - Update FAB actions for workout-database

3. **frontend/assets/js/services/bottom-action-bar-service.js**
   - Add `hideNav()` method
   - Add `showNav()` method
   - Add `toggleNav()` method

### No Changes Required
- HTML files (behavior is purely CSS/JS)
- Other component files
- Firebase services
- Data management

## Animation Specifications

### Timing
- **Duration:** 300ms (medium speed)
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard)
- **Properties:** `transform`, `bottom`

### Transforms
- **Bottom Nav Hide:** `translateY(0)` → `translateY(100%)`
- **Bottom Nav Show:** `translateY(100%)` → `translateY(0)`
- **Search Dropdown:** `bottom: 80px` → `bottom: 20px`

### Z-Index Layers
```
1050 - Search Dropdown (top)
1049 - Search Backdrop (middle)
1000 - Bottom Nav (bottom)
```

## User Interaction Patterns

### Opening Search
1. User taps Search FAB button
2. Bottom nav slides down (300ms)
3. Search dropdown repositions down (300ms)
4. Backdrop appears (instant)
5. Search input auto-focuses
6. More screen space for results

### Closing Search
**Method 1: Close Button**
1. User taps X button in search
2. Search dropdown hides
3. Bottom nav slides up (300ms)
4. Search dropdown repositions up (300ms)
5. Backdrop disappears

**Method 2: Tap Outside**
1. User taps anywhere outside search
2. Same animation as Method 1

**Method 3: ESC Key**
1. User presses ESC while search focused
2. Same animation as Method 1

**Method 4: Toggle FAB**
1. User taps Search FAB again
2. Same animation as Method 1

## Benefits

✅ **More Screen Space**: Hiding bottom nav creates ~80px more vertical space  
✅ **Better Focus**: Search becomes the primary UI element  
✅ **Smooth UX**: 300ms animation feels natural and responsive  
✅ **Multiple Exit Options**: Close button, tap outside, ESC key, or toggle  
✅ **Consistent Behavior**: Works same way on all pages  
✅ **Mobile Optimized**: Maximizes limited mobile screen space  
✅ **Keyboard Friendly**: ESC key support for power users  
✅ **Accessible**: Clear visual feedback and multiple interaction methods

## Edge Cases & Considerations

### 1. Animation Conflicts
**Issue:** User rapidly taps search button  
**Solution:** `animating` flag prevents overlapping animations

### 2. Keyboard Behavior
**Issue:** Mobile keyboard might affect positioning  
**Solution:** Search dropdown uses fixed positioning, unaffected by keyboard

### 3. Orientation Changes
**Issue:** Device rotation during animation  
**Solution:** CSS transitions handle layout changes gracefully

### 4. Multiple Search Dropdowns
**Issue:** Both exercise and workout search open  
**Solution:** Backdrop click closes whichever is active

### 5. Browser Back Button
**Issue:** User presses back while search is open  
**Solution:** Search closes naturally, nav restores on page unload

## Testing Checklist

### Desktop Testing
- [ ] Animation smooth at 300ms
- [ ] Bottom nav slides down completely
- [ ] Search dropdown repositions correctly
- [ ] Backdrop appears/disappears
- [ ] Tap outside closes search
- [ ] ESC key closes search
- [ ] Toggle FAB works both ways
- [ ] No visual glitches

### Mobile Testing (iOS)
- [ ] Animation smooth on iPhone
- [ ] Touch events work correctly
- [ ] Keyboard doesn't break layout
- [ ] Safe area insets respected
- [ ] Backdrop tap works
- [ ] Search results scrollable

### Mobile Testing (Android)
- [ ] Animation smooth on Android
- [ ] Touch events work correctly
- [ ] Back button behavior correct
- [ ] Keyboard behavior correct
- [ ] Search results scrollable

### Cross-Page Testing
- [ ] Works on exercise-database.html
- [ ] Works on workout-database.html
- [ ] State resets between pages
- [ ] No memory leaks

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Focus management correct
- [ ] Color contrast sufficient

## Future Enhancements

### Potential Improvements
1. **Swipe Gesture**: Swipe down on search to close
2. **Haptic Feedback**: Vibration on open/close (mobile)
3. **Search History**: Show recent searches when opening
4. **Voice Search**: Add microphone button
5. **Persistent State**: Remember if nav was hidden across pages
6. **Customizable Speed**: User preference for animation speed

### Advanced Features
1. **Smart Hide**: Auto-hide nav when scrolling down results
2. **Compact Mode**: Minimize search bar instead of full hide
3. **Split View**: Show search and results side-by-side on tablets
4. **Gesture Controls**: Pinch to zoom, swipe to navigate

## Documentation

### For Developers
- Update component documentation with new behavior
- Add JSDoc comments to new functions
- Update architecture diagrams
- Create demo video showing animation

### For Users
- Add tooltip: "Search opens in full-screen mode"
- Update help documentation
- Create onboarding tip for first-time users

## Success Metrics

### Performance
- Animation completes in 300ms ±50ms
- No frame drops during transition
- Smooth on devices with 60fps

### User Experience
- Users can see more results without scrolling
- Search feels focused and immersive
- Easy to exit search mode
- Intuitive behavior

### Technical
- No console errors
- No memory leaks
- Works across all supported browsers
- Passes accessibility audit

## Next Steps

1. ✅ Review and approve this architecture plan
2. ⏳ Implement Phase 1 (CSS Foundation)
3. ⏳ Implement Phase 2 (JavaScript Core)
4. ⏳ Implement Phase 3 (Search Dropdown Updates)
5. ⏳ Implement Phase 4 (FAB Integration)
6. ⏳ Implement Phase 5 (Service Methods)
7. ⏳ Implement Phase 6 (Testing & Refinement)
8. ⏳ Switch to Code mode for implementation

## Questions for Review

1. Is 300ms the right animation speed, or would you prefer faster/slower?
2. Should the search dropdown be at `bottom: 20px` when nav is hidden, or different?
3. Do you want any visual indicator that the nav is hidden (e.g., subtle shadow)?
4. Should this behavior be optional (user preference) or always-on?
5. Any specific mobile devices we should prioritize for testing?