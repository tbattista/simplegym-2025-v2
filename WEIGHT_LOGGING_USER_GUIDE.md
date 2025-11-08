# Weight Logging - User Guide

**Where to Find It**: [`workout-mode.html`](frontend/workout-mode.html)  
**URL**: `https://your-domain.com/workout-mode.html?id={workout_id}`

---

## 📍 Step-by-Step Guide

### Step 1: Navigate to Workout Mode
1. Go to your **Workouts** page
2. Click on any workout
3. Click **"Start Workout"** or **"View Workout"**
4. You'll be taken to `workout-mode.html?id=xxx`

### Step 2: Start a Session (Required for Weight Logging)
**IMPORTANT**: You must be **logged in** to use weight logging!

1. Look for the **"Start Workout"** button at the top
2. Click it to begin your session
3. You'll see:
   - ✅ Session timer starts (00:00, 00:01, etc.)
   - ✅ "Complete Workout" button appears at bottom
   - ✅ Auto-save status indicator shows "Ready"

### Step 3: See Weight Inputs
1. **Expand any exercise card** by clicking on it
2. **Weight input fields will appear** (only visible during active session)
3. You'll see:
   ```
   ┌─────────────────────────────────────┐
   │ 🏋️ Weight                           │
   │ ┌──────────┬────┬──────┐           │
   │ │   150    │lbs │ ✓    │           │
   │ └──────────┴────┴──────┘           │
   │ 📊 Last: 145 lbs (11/06/2025)      │
   └─────────────────────────────────────┘
   ```

---

## 🎯 Visual Location Guide

```
┌─────────────────────────────────────────────────────────┐
│  👻 Workout Mode - Push Day                             │
│  🔄 Change workout                                       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ▶️ Start Workout                                │   │ ← STEP 1: Click here
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  After clicking "Start Workout":                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ⏱️ 00:15  💾 Ready                              │   │ ← Session active!
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Bench Press                                     ▼  │ ← STEP 2: Click to expand
│  │  3 × 8-12 • Rest: 90s                              │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  After expanding (weight inputs appear):                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Bench Press                                     ▲  │
│  │  3 × 8-12                                          │
│  │                                                     │
│  │  🏋️ Weight                                         │ ← STEP 3: Enter weight
│  │  ┌──────────┬────┬──────┐                         │
│  │  │   185    │lbs │ ⏳   │                         │ ← Auto-saves in 2 sec
│  │  └──────────┴────┴──────┘                         │
│  │  📊 Last: 180 lbs (11/06/2025)                    │ ← Previous weight
│  │                                                     │
│  │  Rest Timer: 90s                                   │
│  │  [Start Rest]                                      │
│  │                                                     │
│  │  [Next Exercise →]                                 │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Incline Dumbbell Press                          ▼  │
│  │  3 × 10-12 • Rest: 60s                             │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
│  ⏱️ 00:15  [✅ Complete Workout]  🔊 On  📤           │ ← Bottom bar
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 What You'll See

### Before Starting Session
- ❌ No weight inputs visible
- ❌ No "Start Workout" button (if not logged in)
- ✅ Can view exercises and rest timers

### After Starting Session
- ✅ Weight input fields appear in expanded cards
- ✅ Last weight displays (if you've done this workout before)
- ✅ Auto-save indicator shows saving status
- ✅ "Complete Workout" button at bottom

### Weight Input Features
1. **Large input field** - Easy to tap on mobile
2. **Unit selector** - Switch between lbs/kg
3. **Auto-save** - Saves automatically after 2 seconds
4. **Immediate save** - Saves when you click outside or change unit
5. **Save indicators**:
   - ⏳ Spinner = Saving...
   - ✅ Checkmark = Saved!
6. **Last weight display** - Shows your previous weight with date

---

## 📱 Mobile View

On mobile (360x640), the layout is optimized:
```
┌─────────────────────┐
│  Push Day           │
│  🔄 Change          │
│                     │
│  ▶️ Start Workout   │ ← Full width button
│                     │
│  ┌─────────────────┐│
│  │ Bench Press   ▼ ││ ← Tap to expand
│  │ 3×8-12 • 90s    ││
│  └─────────────────┘│
│                     │
│  Expanded:          │
│  ┌─────────────────┐│
│  │ Bench Press   ▲ ││
│  │                 ││
│  │ 🏋️ Weight       ││
│  │ ┌─────┬───┬──┐ ││
│  │ │ 185 │lbs│✓ │ ││ ← Touch-friendly
│  │ └─────┴───┴──┘ ││
│  │ Last: 180 lbs   ││
│  │                 ││
│  │ [Start Rest]    ││
│  │ [Next →]        ││
│  └─────────────────┘│
└─────────────────────┘
│ ⏱️ 00:15 [Complete]│ ← Sticky bottom
└─────────────────────┘
```

---

## ❓ Troubleshooting

### "I don't see the Start Workout button"
**Solution**: You need to be logged in!
1. Click the user icon in top right
2. Sign in with your account
3. Return to workout mode
4. Button should now appear

### "I don't see weight inputs"
**Checklist**:
- [ ] Are you logged in?
- [ ] Did you click "Start Workout"?
- [ ] Did you expand an exercise card?
- [ ] Is the session timer running?

### "Weight inputs don't save"
**After the bug fix**:
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check console for version `20251107-04`
3. Try entering weight again
4. Look for save indicators (spinner → checkmark)

### "I see old version"
**Clear cache**:
1. Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or: Settings → Clear browsing data → Cached images and files
3. Reload page

---

## 🎬 Quick Demo Flow

```
1. Login → 2. Go to Workouts → 3. Select workout
                                      ↓
4. Click "Start Workout" ← 5. Session starts (timer begins)
                                      ↓
6. Expand exercise card ← 7. Weight inputs appear
                                      ↓
8. Enter weight (e.g., 185) ← 9. Auto-saves in 2 seconds
                                      ↓
10. Complete all exercises ← 11. Click "Complete Workout"
                                      ↓
12. See completion summary ← 13. Redirects to workouts
```

---

## 📊 What Gets Saved

When you complete a workout, the system saves:
- ✅ Weight used for each exercise
- ✅ Unit (lbs or kg)
- ✅ Date and time
- ✅ Workout duration
- ✅ Number of exercises completed

Next time you do the same workout:
- ✅ Last weight pre-fills
- ✅ Shows date of last workout
- ✅ Calculates weight change (Phase 3 - coming soon)

---

## 🔗 Related Pages

- **Workouts List**: `workouts.html` - Select a workout
- **Workout Mode**: `workout-mode.html?id=xxx` - Execute workout (THIS PAGE)
- **History View**: Coming in Phase 4 - View past sessions

---

## 💡 Pro Tips

1. **Use the unit selector** - Switch between lbs/kg anytime
2. **Auto-save is smart** - Waits 2 seconds so you can adjust
3. **Blur to save immediately** - Click outside input to save now
4. **Check the checkmark** - ✅ means your weight is saved
5. **Last weight helps** - Reference your previous performance
6. **Complete the workout** - Don't forget to click "Complete Workout"!

---

**Need Help?** Check the console (F12) for any error messages or contact support.