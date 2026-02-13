/**
 * Activity Log - Core Controller
 * Handles activity type selection, form management, and session creation
 * @version 1.0.0
 */

// Global state
window.ffn = window.ffn || {};
window.ffn.activityLog = {
    sessions: [],
    selectedActivity: null,
    formMode: 'quick',
    selectedRpe: null
};

// Activity type configuration - defines which fields are visible per activity
const ACTIVITY_FIELD_CONFIG = {
    running:       { distance: true, pace: true, elevation: true, cadence: false, strokeRate: false, laps: false, incline: false },
    cycling:       { distance: true, pace: true, elevation: true, cadence: true,  strokeRate: false, laps: false, incline: false },
    rowing:        { distance: true, pace: true, elevation: false, cadence: false, strokeRate: true,  laps: false, incline: false },
    swimming:      { distance: true, pace: true, elevation: false, cadence: false, strokeRate: false, laps: true,  incline: false },
    elliptical:    { distance: false, pace: false, elevation: false, cadence: false, strokeRate: false, laps: false, incline: true },
    stair_climber: { distance: false, pace: false, elevation: true,  cadence: false, strokeRate: false, laps: false, incline: true },
    walking:       { distance: true, pace: true, elevation: true,  cadence: false, strokeRate: false, laps: false, incline: false },
    hiking:        { distance: true, pace: true, elevation: true,  cadence: false, strokeRate: false, laps: false, incline: false },
    other:         { distance: true, pace: true, elevation: true,  cadence: false, strokeRate: false, laps: false, incline: false }
};

// Icon mapping for activity types
const ACTIVITY_ICONS = {
    running: 'bx-run',
    cycling: 'bx-cycling',
    rowing: 'bx-water',
    swimming: 'bx-swim',
    elliptical: 'bx-pulse',
    stair_climber: 'bx-trending-up',
    walking: 'bx-walk',
    hiking: 'bx-landscape',
    other: 'bx-dots-horizontal-rounded'
};

// Display names for activity types
const ACTIVITY_NAMES = {
    running: 'Running',
    cycling: 'Cycling',
    rowing: 'Rowing',
    swimming: 'Swimming',
    elliptical: 'Elliptical',
    stair_climber: 'Stair Climber',
    walking: 'Walking',
    hiking: 'Hiking',
    other: 'Other'
};

/**
 * Initialize the activity log page
 */
async function initActivityLog() {
    console.log('🏃 Initializing Activity Log');

    setupActivityTypeSelector();
    setupRpeSelector();
    setupFormListeners();
    setupDetailsToggle();

    // Load recent sessions
    if (window.loadRecentCardioSessions) {
        await window.loadRecentCardioSessions();
    }

    console.log('✅ Activity Log initialized');
}

/**
 * Set up activity type button click handlers
 */
function setupActivityTypeSelector() {
    const grid = document.getElementById('activityTypeGrid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.activity-type-btn');
        if (!btn) return;

        const type = btn.dataset.type;
        selectActivity(type);
    });
}

/**
 * Select an activity type and update UI accordingly
 */
function selectActivity(type) {
    const state = window.ffn.activityLog;
    state.selectedActivity = type;

    // Update button states
    document.querySelectorAll('.activity-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    // Show/hide conditional fields based on activity
    updateConditionalFields(type);

    // Enable log button if we have an activity selected
    updateLogButtonState();
}

/**
 * Show/hide fields based on selected activity type
 */
function updateConditionalFields(type) {
    const config = ACTIVITY_FIELD_CONFIG[type] || ACTIVITY_FIELD_CONFIG.other;

    // Map config keys to DOM row IDs
    const fieldMap = {
        distance: 'distanceRow',
        pace: 'paceRow',
        elevation: 'elevationRow',
        cadence: 'cadenceRow',
        strokeRate: 'strokeRateRow',
        laps: 'lapsRow',
        incline: 'inclineRow'
    };

    Object.entries(fieldMap).forEach(([key, rowId]) => {
        const row = document.getElementById(rowId);
        if (row) {
            row.style.display = config[key] ? '' : 'none';
        }
    });
}

/**
 * Set up RPE button selector
 */
function setupRpeSelector() {
    const selector = document.getElementById('rpeSelector');
    if (!selector) return;

    selector.addEventListener('click', (e) => {
        const btn = e.target.closest('.rpe-btn');
        if (!btn) return;

        const rpe = parseInt(btn.dataset.rpe);
        const state = window.ffn.activityLog;

        // Toggle - clicking same RPE deselects
        if (state.selectedRpe === rpe) {
            state.selectedRpe = null;
            btn.classList.remove('active');
        } else {
            state.selectedRpe = rpe;
            document.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    });
}

/**
 * Set up form input listeners for auto-calculation
 */
function setupFormListeners() {
    // Auto-calculate pace when distance or duration changes
    const distanceInput = document.getElementById('distance');
    const hoursInput = document.getElementById('durationHours');
    const minutesInput = document.getElementById('durationMinutes');

    [distanceInput, hoursInput, minutesInput].forEach(input => {
        if (input) {
            input.addEventListener('input', calculateAndDisplayPace);
        }
    });

    // Log button
    const logBtn = document.getElementById('logSessionBtn');
    if (logBtn) {
        logBtn.addEventListener('click', saveCardioSession);
    }

    // Duration inputs affect log button state
    [hoursInput, minutesInput].forEach(input => {
        if (input) {
            input.addEventListener('input', updateLogButtonState);
        }
    });
}

/**
 * Set up the details toggle button text/icon
 */
function setupDetailsToggle() {
    const collapseEl = document.getElementById('detailedFields');
    if (!collapseEl) return;

    collapseEl.addEventListener('show.bs.collapse', () => {
        const icon = document.getElementById('detailsToggleIcon');
        const text = document.getElementById('detailsToggleText');
        if (icon) icon.className = 'bx bx-minus-circle me-1';
        if (text) text.textContent = 'Hide Details';
    });

    collapseEl.addEventListener('hide.bs.collapse', () => {
        const icon = document.getElementById('detailsToggleIcon');
        const text = document.getElementById('detailsToggleText');
        if (icon) icon.className = 'bx bx-plus-circle me-1';
        if (text) text.textContent = 'Add Details';
    });
}

/**
 * Calculate and display pace based on distance and duration
 */
function calculateAndDisplayPace() {
    const distance = parseFloat(document.getElementById('distance')?.value) || 0;
    const hours = parseInt(document.getElementById('durationHours')?.value) || 0;
    const minutes = parseInt(document.getElementById('durationMinutes')?.value) || 0;
    const totalMinutes = (hours * 60) + minutes;
    const paceInput = document.getElementById('pace');

    if (!paceInput) return;

    if (distance > 0 && totalMinutes > 0) {
        const paceMinutes = totalMinutes / distance;
        const paceMins = Math.floor(paceMinutes);
        const paceSecs = Math.round((paceMinutes - paceMins) * 60);
        const unit = document.getElementById('distanceUnit')?.value || 'mi';
        paceInput.value = `${paceMins}:${String(paceSecs).padStart(2, '0')} /${unit}`;
    } else {
        paceInput.value = '';
    }
}

/**
 * Enable/disable the log button based on form state
 */
function updateLogButtonState() {
    const btn = document.getElementById('logSessionBtn');
    if (!btn) return;

    const state = window.ffn.activityLog;
    const hours = parseInt(document.getElementById('durationHours')?.value) || 0;
    const minutes = parseInt(document.getElementById('durationMinutes')?.value) || 0;
    const totalMinutes = (hours * 60) + minutes;

    btn.disabled = !state.selectedActivity || totalMinutes < 1;
}

/**
 * Collect form data and save cardio session via API
 */
async function saveCardioSession() {
    const state = window.ffn.activityLog;
    const btn = document.getElementById('logSessionBtn');

    if (!state.selectedActivity) return;

    const hours = parseInt(document.getElementById('durationHours')?.value) || 0;
    const minutes = parseInt(document.getElementById('durationMinutes')?.value) || 0;
    const totalMinutes = (hours * 60) + minutes;

    if (totalMinutes < 1) return;

    // Collect form data
    const dateTimeValue = document.getElementById('sessionDateTime')?.value;
    const startedAt = dateTimeValue ? new Date(dateTimeValue).toISOString() : new Date().toISOString();

    const data = {
        activity_type: state.selectedActivity,
        duration_minutes: totalMinutes,
        started_at: startedAt
    };

    // Optional fields
    const distance = parseFloat(document.getElementById('distance')?.value);
    if (distance > 0) {
        data.distance = distance;
        data.distance_unit = document.getElementById('distanceUnit')?.value || 'mi';
    }

    // Pace
    const paceValue = document.getElementById('pace')?.value;
    if (paceValue && paceValue !== '--:--') {
        data.pace_per_unit = paceValue;
    }

    // Heart rate
    const avgHr = parseInt(document.getElementById('avgHeartRate')?.value);
    if (avgHr > 0) data.avg_heart_rate = avgHr;
    const maxHr = parseInt(document.getElementById('maxHeartRate')?.value);
    if (maxHr > 0) data.max_heart_rate = maxHr;

    // Calories
    const calories = parseInt(document.getElementById('calories')?.value);
    if (calories > 0) data.calories = calories;

    // RPE
    if (state.selectedRpe) data.rpe = state.selectedRpe;

    // Elevation
    const elevation = parseInt(document.getElementById('elevationGain')?.value);
    if (elevation > 0) {
        data.elevation_gain = elevation;
        data.elevation_unit = document.getElementById('elevationUnit')?.value || 'ft';
    }

    // Activity-specific details
    const activityDetails = {};
    const cadence = parseInt(document.getElementById('cadence')?.value);
    if (cadence > 0) activityDetails.cadence_rpm = cadence;
    const strokeRate = parseInt(document.getElementById('strokeRate')?.value);
    if (strokeRate > 0) activityDetails.stroke_rate = strokeRate;
    const laps = parseInt(document.getElementById('laps')?.value);
    if (laps > 0) activityDetails.laps = laps;
    const poolLength = parseInt(document.getElementById('poolLength')?.value);
    if (poolLength > 0) activityDetails.pool_length_m = poolLength;
    const incline = parseInt(document.getElementById('incline')?.value);
    if (incline > 0) activityDetails.incline_percent = incline;

    if (Object.keys(activityDetails).length > 0) {
        data.activity_details = activityDetails;
    }

    // Notes
    const notes = document.getElementById('sessionNotes')?.value?.trim();
    if (notes) data.notes = notes;

    // Submit
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Saving...';

    try {
        const token = await window.dataManager.getAuthToken();
        const response = await fetch('/api/v3/cardio-sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to save session');
        }

        const session = await response.json();
        console.log('✅ Cardio session saved:', session.id);

        // Show success toast
        if (window.toastNotifications) {
            window.toastNotifications.success('Session logged!');
        }

        // Reset form
        resetForm();

        // Reload recent sessions
        if (window.loadRecentCardioSessions) {
            await window.loadRecentCardioSessions();
        }

    } catch (error) {
        console.error('Failed to save cardio session:', error);
        if (window.toastNotifications) {
            window.toastNotifications.error('Failed to save session');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bx bx-check me-1"></i>Log Session';
        updateLogButtonState();
    }
}

/**
 * Reset the form after successful save
 */
function resetForm() {
    const state = window.ffn.activityLog;

    // Keep the selected activity type but clear everything else
    document.getElementById('durationHours').value = '0';
    document.getElementById('durationMinutes').value = '30';

    // Reset date/time to now
    const now = new Date();
    const localIso = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + 'T' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0');
    document.getElementById('sessionDateTime').value = localIso;

    // Clear detailed fields
    ['distance', 'pace', 'avgHeartRate', 'maxHeartRate', 'calories',
     'elevationGain', 'cadence', 'strokeRate', 'laps', 'poolLength', 'incline',
     'sessionNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Clear RPE
    state.selectedRpe = null;
    document.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('active'));

    // Collapse details if open
    const detailedFields = document.getElementById('detailedFields');
    if (detailedFields?.classList.contains('show')) {
        const collapse = bootstrap.Collapse.getInstance(detailedFields);
        if (collapse) collapse.hide();
    }

    updateLogButtonState();
}

// Make functions available globally
window.initActivityLog = initActivityLog;
window.ACTIVITY_ICONS = ACTIVITY_ICONS;
window.ACTIVITY_NAMES = ACTIVITY_NAMES;
window.ACTIVITY_FIELD_CONFIG = ACTIVITY_FIELD_CONFIG;
