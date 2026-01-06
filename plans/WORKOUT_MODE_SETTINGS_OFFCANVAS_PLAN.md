# Workout Mode Settings Offcanvas Implementation Plan

## Overview
Add a "More" offcanvas to the workout mode page that includes toggle switches for:
1. **Rest Timer** - Enable/disable the rest timer feature
2. **Sound** - Enable/disable sound notifications (moved from existing standalone button)

## Current Architecture Analysis

### Rest Timer Implementation
- **File**: [`frontend/assets/js/components/global-rest-timer.js`](../frontend/assets/js/components/global-rest-timer.js:1)
- **Class**: `GlobalRestTimer` extends `RestTimer`
- **Global Instance**: `window.globalRestTimer`
- **States**: ready, counting, paused, done
- **Rendered in**: Bottom action bar's floating timer combo

### Sound Toggle Implementation  
- **File**: [`frontend/assets/js/controllers/workout-mode-controller.js`](../frontend/assets/js/controllers/workout-mode-controller.js:1078)
- **State**: `this.soundEnabled` stored in localStorage key `workoutSoundEnabled`
- **Current UI**: Standalone button with `soundToggleBtn` ID (may not be visible in current layout)

### Bottom Action Bar Config
- **File**: [`frontend/assets/js/config/bottom-action-bar-config.js`](../frontend/assets/js/config/bottom-action-bar-config.js:1010)
- **Workout Mode Config**: Lines 1010-1068 (inactive) and 1070-1126 (active)
- **More Button**: Currently shows `alert('More options - Coming soon!')`

### Menu Offcanvas Pattern
- **File**: [`frontend/assets/js/components/offcanvas/offcanvas-menu.js`](../frontend/assets/js/components/offcanvas/offcanvas-menu.js:21)
- **Factory Method**: `UnifiedOffcanvasFactory.createMenuOffcanvas(config)`
- **Current Support**: Click-based menu items only (no toggle switches)

## Implementation Plan

### Phase 1: Extend Menu Offcanvas to Support Toggle Items

#### 1.1 Update offcanvas-menu.js

Add support for a new menu item type: `toggle`

```javascript
// New menu item structure for toggles
{
    type: 'toggle',           // NEW: Identifies as toggle item
    icon: 'bx-time-five',
    title: 'Rest Timer',
    description: 'Show rest timer between sets',
    checked: true,            // Initial state
    storageKey: 'workoutRestTimerEnabled',  // localStorage key
    onChange: (isEnabled) => { /* callback */ }
}
```

#### 1.2 Modify createMenuOffcanvas function

```javascript
// Render logic for toggle items
const menuHtml = menuItems.map((item, index) => {
    if (item.type === 'toggle') {
        return `
            <div class="more-menu-item toggle-item" data-menu-action="${index}">
                <i class="bx ${item.icon}"></i>
                <div class="more-menu-item-content">
                    <div class="more-menu-item-title">${escapeHtml(item.title)}</div>
                    <small class="more-menu-item-description">${escapeHtml(item.description || '')}</small>
                </div>
                <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" 
                           id="menuToggle${index}" 
                           ${item.checked ? 'checked' : ''}
                           style="cursor: pointer;">
                </div>
            </div>
        `;
    }
    // ... existing click item logic
}).join('');
```

### Phase 2: Add CSS Styles for Toggle Items

#### 2.1 Update unified-offcanvas.css

```css
/* Toggle menu item styles */
.offcanvas-bottom-base .more-menu-item.toggle-item {
    cursor: default;  /* Not clickable as whole item */
}

.offcanvas-bottom-base .more-menu-item.toggle-item .form-check-input {
    width: 3rem;
    height: 1.5rem;
    cursor: pointer;
}

/* Ensure toggle is clickable, not the whole row */
.offcanvas-bottom-base .more-menu-item.toggle-item:hover {
    background: transparent;
    border-color: var(--bs-border-color);
    transform: none;
    box-shadow: none;
}
```

### Phase 3: Create Workout Mode Settings Offcanvas

#### 3.1 Update bottom-action-bar-config.js

Replace the "More" button action for both `workout-mode` and `workout-mode-active` configs:

```javascript
{
    icon: 'bx-dots-vertical-rounded',
    label: 'More',
    title: 'More options',
    action: function() {
        if (window.UnifiedOffcanvasFactory) {
            // Get current states from localStorage
            const restTimerEnabled = localStorage.getItem('workoutRestTimerEnabled') !== 'false';
            const soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
            
            window.UnifiedOffcanvasFactory.createMenuOffcanvas({
                id: 'workoutModeSettingsOffcanvas',
                title: 'Workout Settings',
                icon: 'bx-cog',
                menuItems: [
                    {
                        type: 'toggle',
                        icon: 'bx-time-five',
                        title: 'Rest Timer',
                        description: 'Show rest timer between sets',
                        checked: restTimerEnabled,
                        storageKey: 'workoutRestTimerEnabled',
                        onChange: (enabled) => {
                            localStorage.setItem('workoutRestTimerEnabled', enabled);
                            // Update global rest timer visibility
                            if (window.globalRestTimer) {
                                window.globalRestTimer.setEnabled(enabled);
                            }
                            // Update bottom action bar UI
                            const timerContainer = document.getElementById('globalRestTimerButton');
                            if (timerContainer) {
                                timerContainer.style.display = enabled ? 'flex' : 'none';
                            }
                        }
                    },
                    {
                        type: 'toggle',
                        icon: 'bx-volume-full',
                        title: 'Sound',
                        description: 'Play sounds for timer alerts',
                        checked: soundEnabled,
                        storageKey: 'workoutSoundEnabled',
                        onChange: (enabled) => {
                            localStorage.setItem('workoutSoundEnabled', enabled);
                            if (window.workoutModeController) {
                                window.workoutModeController.soundEnabled = enabled;
                            }
                        }
                    }
                ]
            });
        } else {
            console.error('❌ UnifiedOffcanvasFactory not loaded');
            alert('Settings loading. Please try again.');
        }
    }
}
```

### Phase 4: Update GlobalRestTimer Class

#### 4.1 Add enabled state management

```javascript
class GlobalRestTimer extends RestTimer {
    constructor() {
        super('global-rest-timer', 60);
        // ... existing code
        this.enabled = localStorage.getItem('workoutRestTimerEnabled') !== 'false';
    }

    /**
     * Set enabled state
     * @param {boolean} enabled - Whether rest timer is enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('workoutRestTimerEnabled', enabled);
        
        // If disabled while running, reset
        if (!enabled && this.state === 'counting') {
            this.reset();
        }
        
        this.render();
    }

    /**
     * Check if timer is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Override render to respect enabled state
     */
    render() {
        this.floatingElement = document.getElementById('globalRestTimerButton');
        if (!this.floatingElement) return;

        // If disabled, hide the button container
        if (!this.enabled) {
            this.floatingElement.style.display = 'none';
            return;
        }
        
        this.floatingElement.style.display = 'flex';
        // ... rest of existing render logic
    }
}
```

### Phase 5: Initialize Settings on Page Load

#### 5.1 Update workout-mode-controller.js

Add initialization for rest timer enabled state:

```javascript
async initialize() {
    // ... existing code
    
    // Initialize rest timer enabled state
    this.initializeRestTimerSetting();
    
    // ... rest of existing code
}

/**
 * Initialize rest timer enabled/disabled state
 */
initializeRestTimerSetting() {
    const restTimerEnabled = localStorage.getItem('workoutRestTimerEnabled') !== 'false';
    
    // Apply to global rest timer if available
    if (window.globalRestTimer) {
        window.globalRestTimer.setEnabled(restTimerEnabled);
    }
    
    // Apply to timer container visibility
    const timerContainer = document.getElementById('globalRestTimerButton');
    if (timerContainer) {
        timerContainer.style.display = restTimerEnabled ? 'flex' : 'none';
    }
}
```

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/assets/js/components/offcanvas/offcanvas-menu.js` | Modify | Add toggle item type support |
| `frontend/assets/css/components/unified-offcanvas.css` | Modify | Add toggle item styles |
| `frontend/assets/js/config/bottom-action-bar-config.js` | Modify | Update workout mode "More" button action |
| `frontend/assets/js/components/global-rest-timer.js` | Modify | Add enabled state management |
| `frontend/assets/js/controllers/workout-mode-controller.js` | Modify | Initialize rest timer setting |

## UI Mockup

```
┌─────────────────────────────────────┐
│ ⚙️ Workout Settings              ✕ │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🕐  Rest Timer           [====]│ │
│ │     Show rest timer between sets│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔊  Sound                [====]│ │
│ │     Play sounds for timer alerts│ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

## Testing Checklist

- [ ] Rest timer toggle saves state to localStorage
- [ ] Rest timer toggle immediately hides/shows timer button
- [ ] Sound toggle saves state to localStorage  
- [ ] Sound toggle updates controller's soundEnabled property
- [ ] Toggles work in both light and dark themes
- [ ] Settings persist across page refreshes
- [ ] Offcanvas closes after toggling (or stays open - TBD)
- [ ] Toggle icons change based on state (optional enhancement)

## Future Enhancements

1. **Additional Settings**:
   - Vibration on timer complete
   - Custom rest timer duration default
   - Auto-advance to next exercise

2. **Visual Feedback**:
   - Toast notification when setting changes
   - Dynamic icon change (filled vs outline) based on state

3. **Sync Settings**:
   - Store settings in user profile for cross-device sync
