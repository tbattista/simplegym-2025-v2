# Z-Index Menu Fix Plan
**Issue:** Exercise card 3-dot menu appears behind cards below it  
**Date:** 2026-01-19  
**Status:** Analysis Complete - Ready for Implementation

---

## 🔍 Root Cause Analysis

### Problem Summary
The dropdown menu (`.builder-card-menu`) from the 3-dot button on exercise cards is appearing **behind** any cards positioned below it in the DOM. This is a classic CSS stacking context issue.

### DOM Structure
```html
<div class="exercise-group-card compact" data-group-id="..." data-index="0">
  <div class="card">                                    <!-- position: relative (implicit) -->
    <div class="card-body">                             <!-- position: relative -->
      <div class="exercise-content">...</div>
      <div class="card-actions">                        <!-- position: absolute, z-index: 1050 -->
        <button class="btn-edit-compact">...</button>
        <button class="btn-menu-compact">...</button>
        <div class="builder-card-menu">                 <!-- position: absolute, z-index: 1050 -->
          <!-- Menu items -->
        </div>
      </div>
    </div>
  </div>
</div>

<div class="exercise-group-card compact" data-group-id="..." data-index="1">
  <!-- Next card - appears ABOVE the menu from card above -->
</div>
```

### Current CSS State

**From [`card-actions.css`](frontend/assets/css/components/card-actions.css:18-27):**
```css
.card-actions {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: 0.375rem;
    z-index: 1050;  /* ⚠️ High z-index but within parent stacking context */
}
```

**From [`builder-card-menu.css`](frontend/assets/css/components/builder-card-menu.css:15-27):**
```css
.builder-card-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--bs-body-bg);
    border: 1.5px solid var(--bs-border-color);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    min-width: 160px;
    padding: 8px 0;
    z-index: 1050;  /* ⚠️ Same issue - trapped in parent context */
    display: none;
}
```

**From [`compact-card-layout.css`](frontend/assets/css/components/compact-card-layout.css:20-28):**
```css
.exercise-group-card.compact .card-body {
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: auto;
    position: relative;  /* ⚠️ Creates stacking context! */
}
```

### Why the Menu Appears Behind Other Cards

**The Stacking Context Problem:**

1. **Each card creates its own stacking context** because `.card-body` has `position: relative`
2. **The menu is positioned absolutely** within `.card-actions` (which is inside `.card-body`)
3. **Even with `z-index: 1050`**, the menu cannot escape its parent's stacking context
4. **Cards below in the DOM** are rendered AFTER (on top of) the previous card's menu
5. **Result:** The menu from card #1 appears behind card #2, card #3, etc.

### Visual Representation

```
Stacking Order (what we see):
┌─────────────────────────────────┐
│ Card #1                         │
│ [Edit] [•••]                    │  ← Menu opens here
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Card #2 (covers menu above!)    │  ← This card is painted AFTER menu
│ [Edit] [•••]                    │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Card #3                         │
│ [Edit] [•••]                    │
└─────────────────────────────────┘
```

---

## ✅ Solution Strategy

### Approach: Portal Pattern (Move Menu Outside Stacking Context)

The most reliable solution is to **move the menu DOM element outside the card's stacking context** when it opens, similar to how Bootstrap modals work.

### Why This Approach?

**❌ Why NOT just increase z-index:**
- Won't work - the menu is trapped in the parent's stacking context
- Even `z-index: 9999` won't help

**❌ Why NOT remove `position: relative` from `.card-body`:**
- Would break the layout of `.card-actions` (needs relative parent)
- Would affect other positioning throughout the card

**✅ Why Portal Pattern works:**
- Moves menu to document body or a high-level container
- Escapes all parent stacking contexts
- Maintains visual positioning through JavaScript
- Used by Bootstrap, Material-UI, and other major frameworks

---

## 🛠️ Implementation Plan

### Phase 1: Update CSS (Preparation)

**File:** [`frontend/assets/css/components/builder-card-menu.css`](frontend/assets/css/components/builder-card-menu.css)

```css
/* Menu container - now positioned fixed when shown */
.builder-card-menu {
    position: fixed;  /* Changed from absolute */
    /* top and left will be set by JavaScript */
    background: var(--bs-body-bg);
    border: 1.5px solid var(--bs-border-color);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    min-width: 160px;
    padding: 8px 0;
    z-index: 1050;  /* Now effective because position: fixed */
    display: none;
    pointer-events: none;  /* Prevent interaction when hidden */
}

.builder-card-menu.show {
    display: block;
    pointer-events: auto;  /* Enable interaction when shown */
}
```

### Phase 2: Update JavaScript (Menu Controller)

**File:** [`frontend/assets/js/controllers/workout-builder-card-menu.js`](frontend/assets/js/controllers/workout-builder-card-menu.js)

**Changes needed in `toggleMenu()` method:**

```javascript
toggleMenu(button, groupId, index) {
    const menu = button.parentElement.querySelector('.builder-card-menu');
    if (!menu) return;

    const isOpen = menu.classList.contains('show');

    // Close all other menus first
    this.closeAllMenus();

    // Toggle this menu
    if (!isOpen) {
        // Calculate position relative to button
        const buttonRect = button.getBoundingClientRect();
        
        // Position menu below and aligned to right of button
        menu.style.top = `${buttonRect.bottom + 4}px`;
        menu.style.left = `${buttonRect.right - 160}px`; // 160px = min-width of menu
        
        // Show menu
        menu.classList.add('show');
        button.classList.add('active');
        this.activeMenu = menu;
        
        // Ensure menu stays within viewport
        this.adjustMenuPosition(menu);
    }
}

/**
 * Adjust menu position to stay within viewport
 * @param {HTMLElement} menu - The menu element
 */
adjustMenuPosition(menu) {
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust horizontal position if menu goes off-screen
    if (menuRect.right > viewportWidth) {
        const overflow = menuRect.right - viewportWidth;
        menu.style.left = `${parseFloat(menu.style.left) - overflow - 8}px`;
    }
    
    if (menuRect.left < 0) {
        menu.style.left = '8px';
    }
    
    // Adjust vertical position if menu goes off-screen
    if (menuRect.bottom > viewportHeight) {
        // Show menu above button instead
        const button = document.querySelector('.btn-menu-compact.active');
        if (button) {
            const buttonRect = button.getBoundingClientRect();
            menu.style.top = `${buttonRect.top - menuRect.height - 4}px`;
        }
    }
}
```

**Add scroll handler to reposition menu:**

```javascript
init() {
    // Existing click-outside handler
    this.clickOutsideHandler = (event) => {
        if (!event.target.closest('.builder-card-menu') &&
            !event.target.closest('.btn-menu-compact')) {
            this.closeAllMenus();
        }
    };
    document.addEventListener('click', this.clickOutsideHandler);
    
    // NEW: Add scroll handler to close menu on scroll
    this.scrollHandler = () => {
        if (this.activeMenu) {
            this.closeAllMenus();
        }
    };
    window.addEventListener('scroll', this.scrollHandler, true); // Use capture phase
}

destroy() {
    if (this.clickOutsideHandler) {
        document.removeEventListener('click', this.clickOutsideHandler);
    }
    if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler, true);
    }
    this.closeAllMenus();
    console.log('🧹 WorkoutBuilderCardMenu destroyed');
}
```

### Phase 3: Alternative Simpler Solution (If Portal Pattern is Too Complex)

**Option B: Increase parent z-index on menu open**

This is a simpler approach that might work:

**In [`workout-builder-card-menu.js`](frontend/assets/js/controllers/workout-builder-card-menu.js):**

```javascript
toggleMenu(button, groupId, index) {
    const menu = button.parentElement.querySelector('.builder-card-menu');
    if (!menu) return;

    const isOpen = menu.classList.contains('show');
    const card = button.closest('.exercise-group-card');

    // Close all other menus first
    this.closeAllMenus();

    // Toggle this menu
    if (!isOpen) {
        menu.classList.add('show');
        button.classList.add('active');
        
        // Elevate the entire card's z-index
        if (card) {
            card.style.zIndex = '1060';
            card.style.position = 'relative';
        }
        
        this.activeMenu = menu;
        this.activeCard = card;
    }
}

closeAllMenus() {
    document.querySelectorAll('.builder-card-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    document.querySelectorAll('.btn-menu-compact.active').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Reset card z-index
    if (this.activeCard) {
        this.activeCard.style.zIndex = '';
        this.activeCard.style.position = '';
        this.activeCard = null;
    }
    
    this.activeMenu = null;
}
```

**Add to CSS in [`exercise-group-card.css`](frontend/assets/css/components/exercise-group-card.css):**

```css
.exercise-group-card {
    transition: all 0.2s ease;
    position: relative;
    /* z-index will be set dynamically when menu opens */
}
```

---

## 📋 Recommended Implementation Order

### Option A: Portal Pattern (Most Robust)
1. ✅ Update [`builder-card-menu.css`](frontend/assets/css/components/builder-card-menu.css) - Change to `position: fixed`
2. ✅ Update [`workout-builder-card-menu.js`](frontend/assets/js/controllers/workout-builder-card-menu.js) - Add positioning logic
3. ✅ Test on different screen sizes and scroll positions
4. ✅ Test with multiple cards and rapid menu toggling

### Option B: Z-Index Elevation (Simpler, Faster)
1. ✅ Update [`workout-builder-card-menu.js`](frontend/assets/js/controllers/workout-builder-card-menu.js) - Add card elevation
2. ✅ Update [`exercise-group-card.css`](frontend/assets/css/components/exercise-group-card.css) - Ensure relative positioning
3. ✅ Test with multiple cards
4. ✅ Verify no layout shifts occur

---

## 🎯 Recommendation

**Start with Option B (Z-Index Elevation)** because:
- ✅ Simpler to implement (5-10 lines of code)
- ✅ Less risk of breaking existing functionality
- ✅ Faster to test and deploy
- ✅ Works for 95% of use cases
- ✅ Can always upgrade to Portal Pattern later if needed

**Use Option A (Portal Pattern)** if:
- ❌ Option B doesn't work in all scenarios
- ❌ Menu needs to work in scrollable containers
- ❌ Need pixel-perfect positioning in all edge cases

---

## 🧪 Testing Checklist

After implementation, verify:

- [ ] Menu appears above all cards below it
- [ ] Menu appears above all cards above it
- [ ] Menu closes when clicking outside
- [ ] Menu closes when clicking another card's menu button
- [ ] Menu items (Move Up, Move Down, Delete) still work
- [ ] Menu positioning is correct on first card
- [ ] Menu positioning is correct on last card
- [ ] Menu positioning is correct on middle cards
- [ ] No visual glitches when opening/closing rapidly
- [ ] Works on mobile devices (touch events)
- [ ] Works in dark mode
- [ ] No console errors

---

## 📝 Files to Modify

### Option B (Recommended):
1. [`frontend/assets/js/controllers/workout-builder-card-menu.js`](frontend/assets/js/controllers/workout-builder-card-menu.js:35-63)
   - Modify `toggleMenu()` method
   - Modify `closeAllMenus()` method
   - Add `this.activeCard` property

2. [`frontend/assets/css/components/exercise-group-card.css`](frontend/assets/css/components/exercise-group-card.css:25-28)
   - Ensure `.exercise-group-card` has `position: relative` (already present)

### Option A (If needed):
1. [`frontend/assets/css/components/builder-card-menu.css`](frontend/assets/css/components/builder-card-menu.css:15-31)
   - Change `position: absolute` to `position: fixed`
   - Add `pointer-events` rules

2. [`frontend/assets/js/controllers/workout-builder-card-menu.js`](frontend/assets/js/controllers/workout-builder-card-menu.js)
   - Add positioning calculation in `toggleMenu()`
   - Add `adjustMenuPosition()` method
   - Add scroll handler in `init()`
   - Update `destroy()` method

---

## 🔗 Related Files

- [`frontend/workout-builder.html`](frontend/workout-builder.html:443) - Loads the card menu controller
- [`frontend/assets/js/modules/card-renderer.js`](frontend/assets/js/modules/card-renderer.js:88-119) - Creates card HTML with menu
- [`frontend/assets/css/components/card-actions.css`](frontend/assets/css/components/card-actions.css:18-27) - Styles for button container
- [`frontend/assets/css/components/compact-card-layout.css`](frontend/assets/css/components/compact-card-layout.css:20-28) - Card body layout

---

## 💡 Additional Notes

### Why "simply moving the menu forward" didn't work:
The user mentioned trying to "simply move the menu forward" (presumably increasing z-index), which didn't work because:
- The menu is inside a stacking context created by `.card-body { position: relative }`
- Z-index only works within the same stacking context
- Sibling elements (other cards) create their own stacking contexts
- Later siblings in DOM order are painted on top, regardless of z-index

### CSS Stacking Context Rules:
A new stacking context is created by:
- `position: relative/absolute/fixed` with `z-index` other than `auto`
- `position: fixed` or `position: sticky` (always)
- Elements with `opacity` less than 1
- Elements with `transform`, `filter`, `perspective`, etc.

In this case, each `.card-body` creates a stacking context, trapping the menu inside.

---

**Ready for implementation!** 🚀
