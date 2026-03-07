/**
 * Activity Log - Recent Sessions History
 * Loads, renders, and manages recent sessions (cardio + workout)
 * @version 2.0.0
 */

/**
 * Load all recent sessions (cardio + workout) from the API
 */
async function loadRecentCardioSessions() {
    const loadingEl = document.getElementById('recentSessionsLoading');
    const emptyEl = document.getElementById('recentSessionsEmpty');
    const listEl = document.getElementById('recentCardioSessions');

    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';
    if (listEl) listEl.innerHTML = '';

    try {
        const token = await window.dataManager.getAuthToken();

        // Fetch cardio and workout sessions in parallel
        const [cardioResponse, workoutResponse] = await Promise.all([
            fetch('/api/v3/cardio-sessions?page_size=50', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/v3/workout-sessions?status=completed&page_size=50', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => null)
        ]);

        if (!cardioResponse.ok) throw new Error('Failed to load sessions');

        const cardioData = await cardioResponse.json();
        const cardioSessions = (cardioData.sessions || []).map(s => ({ ...s, _sessionType: 'cardio' }));

        let workoutSessions = [];
        if (workoutResponse && workoutResponse.ok) {
            const workoutData = await workoutResponse.json();
            workoutSessions = (workoutData.sessions || []).map(s => ({ ...s, _sessionType: 'strength' }));
        }

        // Merge and sort by date descending
        const sessions = [...cardioSessions, ...workoutSessions].sort((a, b) => {
            const dateA = new Date(a.started_at || a.created_at);
            const dateB = new Date(b.started_at || b.created_at);
            return dateB - dateA;
        });

        window.ffn.activityLog.sessions = sessions;

        if (loadingEl) loadingEl.style.display = 'none';

        if (sessions.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        buildFilterChips(sessions);
        renderSessionHistory(sessions);

    } catch (error) {
        console.error('Failed to load sessions:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) {
            emptyEl.style.display = 'block';
            emptyEl.querySelector('p').textContent = 'Failed to load sessions';
        }
    }
}

/**
 * Build activity filter chips from available session types
 */
function buildFilterChips(sessions) {
    const container = document.getElementById('activityFilterChips');
    if (!container) return;

    // Get unique activity types from cardio sessions
    const cardioTypes = [...new Set(sessions.filter(s => s._sessionType === 'cardio').map(s => s.activity_type))];
    const hasStrength = sessions.some(s => s._sessionType === 'strength');

    // Build chips: All + Strength (if any) + cardio types
    const chips = [];

    if (hasStrength) {
        chips.push(`<button type="button" class="btn btn-sm btn-outline-secondary activity-filter-chip" data-filter="strength">
            <i class="bx bx-dumbbell me-1"></i>Strength
        </button>`);
    }

    cardioTypes.forEach(type => {
        const icon = window.ActivityTypeRegistry ? window.ActivityTypeRegistry.getIcon(type) : 'bx-dots-horizontal-rounded';
        const name = window.ActivityTypeRegistry ? window.ActivityTypeRegistry.getName(type) : type;
        chips.push(`<button type="button" class="btn btn-sm btn-outline-secondary activity-filter-chip" data-filter="${type}">
            <i class="bx ${icon} me-1"></i>${name}
        </button>`);
    });

    container.innerHTML = `
        <button type="button" class="btn btn-sm btn-primary activity-filter-chip active" data-filter="all">All</button>
        ${chips.join('')}
    `;

    // Click handlers
    container.addEventListener('click', (e) => {
        const chip = e.target.closest('.activity-filter-chip');
        if (!chip) return;

        // Update active state
        container.querySelectorAll('.activity-filter-chip').forEach(c => {
            c.classList.remove('btn-primary', 'active');
            c.classList.add('btn-outline-secondary');
        });
        chip.classList.remove('btn-outline-secondary');
        chip.classList.add('btn-primary', 'active');

        // Filter
        const filter = chip.dataset.filter;
        const sessions = window.ffn.activityLog.sessions;
        let filtered;
        if (filter === 'all') {
            filtered = sessions;
        } else if (filter === 'strength') {
            filtered = sessions.filter(s => s._sessionType === 'strength');
        } else {
            filtered = sessions.filter(s => s.activity_type === filter);
        }
        renderSessionHistory(filtered);
    });
}

/**
 * Render sessions grouped by time period
 */
function renderSessionHistory(sessions) {
    const container = document.getElementById('recentCardioSessions');
    if (!container) return;

    container.innerHTML = '';

    if (sessions.length === 0) {
        container.innerHTML = '<div class="text-center py-3 text-muted">No sessions match this filter</div>';
        return;
    }

    // Group by time period
    const groups = groupSessionsByTimePeriod(sessions);

    groups.forEach(group => {
        const groupHtml = `
            <div class="session-group">
                <div class="time-period-header">${group.label}</div>
                <div class="session-group-card">
                    ${group.sessions.map(s => s._sessionType === 'strength' ? renderWorkoutSessionEntry(s) : renderCardioSessionEntry(s)).join('')}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', groupHtml);
    });

    // Set up expand/collapse and delete handlers
    setupSessionInteractions();
}

/**
 * Group sessions into time periods (This Week, Last Week, by Month)
 */
function groupSessionsByTimePeriod(sessions) {
    const now = new Date();
    const groups = [];
    const groupMap = {};

    sessions.forEach(session => {
        const sessionDate = new Date(session.started_at || session.created_at);
        const label = getTimePeriodLabel(sessionDate, now);

        if (!groupMap[label]) {
            groupMap[label] = { label, sessions: [] };
            groups.push(groupMap[label]);
        }
        groupMap[label].sessions.push(session);
    });

    return groups;
}

/**
 * Get time period label for a date
 */
function getTimePeriodLabel(date, now) {
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    if (date >= startOfWeek) return 'THIS WEEK';
    if (date >= startOfLastWeek) return 'LAST WEEK';

    // By month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
    const year = date.getFullYear();
    const currentYear = now.getFullYear();
    const monthLabel = monthNames[date.getMonth()];
    return year === currentYear ? monthLabel.toUpperCase() : `${monthLabel.toUpperCase()} ${year}`;
}

/**
 * Render a single cardio session entry
 */
function renderCardioSessionEntry(session) {
    const registry = window.ActivityTypeRegistry;
    const icon = registry ? registry.getIcon(session.activity_type) : 'bx-dots-horizontal-rounded';
    const name = session.activity_name || (registry ? registry.getName(session.activity_type) : session.activity_type);
    const date = formatSessionDate(session.started_at);
    const duration = formatDuration(session.duration_minutes);

    // Build meta info
    const metaParts = [duration];
    if (session.distance) {
        metaParts.push(`${session.distance} ${session.distance_unit || 'mi'}`);
    }
    if (session.pace_per_unit) {
        metaParts.push(session.pace_per_unit);
    }
    if (session.avg_heart_rate) {
        metaParts.push(`${session.avg_heart_rate} bpm`);
    }

    // Build details section (comprehensive view of all optional data)
    const detailRows = [];
    if (session.distance) {
        let distStr = `${session.distance} ${session.distance_unit || 'mi'}`;
        if (session.pace_per_unit) distStr += ` @ ${session.pace_per_unit}`;
        detailRows.push(`<div><i class="bx bx-map me-1"></i>${distStr}</div>`);
    }
    const hrParts = [];
    if (session.avg_heart_rate) hrParts.push(`Avg: ${session.avg_heart_rate}`);
    if (session.max_heart_rate) hrParts.push(`Max: ${session.max_heart_rate}`);
    if (hrParts.length > 0) {
        detailRows.push(`<div><i class="bx bx-heart me-1"></i>${hrParts.join(' · ')} bpm</div>`);
    }
    if (session.calories) detailRows.push(`<div><i class="bx bxs-flame me-1"></i>${session.calories} kcal</div>`);
    if (session.rpe) detailRows.push(`<div><i class="bx bx-bar-chart me-1"></i>RPE: ${session.rpe}/10</div>`);
    if (session.elevation_gain) detailRows.push(`<div><i class="bx bx-trending-up me-1"></i>${session.elevation_gain} ${session.elevation_unit || 'ft'} gain</div>`);
    if (session.activity_details && typeof session.activity_details === 'object') {
        const ad = session.activity_details;
        if (ad.cadence_rpm || ad.cadence) detailRows.push(`<div><i class="bx bx-revision me-1"></i>Cadence: ${ad.cadence_rpm || ad.cadence} rpm</div>`);
        if (ad.stroke_rate) detailRows.push(`<div><i class="bx bx-water me-1"></i>Stroke Rate: ${ad.stroke_rate} spm</div>`);
        if (ad.laps) detailRows.push(`<div><i class="bx bx-refresh me-1"></i>Laps: ${ad.laps}</div>`);
        if (ad.pool_length_m || ad.pool_length) detailRows.push(`<div><i class="bx bx-ruler me-1"></i>Pool: ${ad.pool_length_m || ad.pool_length}m</div>`);
        if (ad.incline_percent || ad.incline) detailRows.push(`<div><i class="bx bx-trending-up me-1"></i>Incline: ${ad.incline_percent || ad.incline}%</div>`);
    }
    if (session.notes) detailRows.push(`<div class="mt-2 fst-italic text-muted">"${escapeHtml(session.notes)}"</div>`);

    const hasDetails = detailRows.length > 0;
    const collapseId = `cardio-details-${session.id}`;

    return `
        <div class="session-entry ${hasDetails ? '' : 'no-details'}" data-session-id="${session.id}"
             ${hasDetails ? `role="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false"` : ''}>
            <div class="session-status">
                <span class="session-status-icon cardio-icon">
                    <i class="bx ${icon}"></i>
                </span>
            </div>
            <div class="session-info">
                <span class="session-workout-name">${escapeHtml(name)}</span>
                <span class="session-date">${date}</span>
                <span class="session-meta">
                    ${metaParts.map(p => `<span>${p}</span>`).join('<span class="mx-1">·</span>')}
                </span>
            </div>
            ${hasDetails ? `
                <span class="session-chevron">
                    <i class="bx bx-chevron-down"></i>
                </span>
            ` : ''}
        </div>
        ${hasDetails ? `
            <div class="collapse session-details-collapse" id="${collapseId}">
                <div class="session-details-wrapper p-3">
                    ${detailRows.join('')}
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-danger delete-cardio-btn" data-session-id="${session.id}">
                            <i class="bx bx-trash me-1"></i>Delete
                        </button>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * Render a single workout (strength) session entry
 */
function renderWorkoutSessionEntry(session) {
    const date = formatSessionDate(session.started_at || session.completed_at || session.created_at);
    const duration = formatDuration(session.duration_minutes);
    const name = session.workout_name || 'Workout';
    const exerciseCount = (session.exercises_performed || []).length;

    // Build meta info
    const metaParts = [duration];
    if (exerciseCount > 0) {
        metaParts.push(`${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}`);
    }

    // Build details section
    const detailRows = [];
    const exercises = session.exercises_performed || [];
    if (exercises.length > 0) {
        exercises.forEach(ex => {
            // Check if this is a cardio/activity exercise (known activity type in registry)
            // Try exact ID, lowercase, and match by display name/shortName
            const matchedType = findActivityType(ex.exercise_name);

            if (matchedType) {
                // Show activity name with duration if available from weight field
                const durationStr = formatCardioExerciseDuration(ex);
                const label = durationStr
                    ? `${escapeHtml(matchedType.name)} - ${durationStr}`
                    : escapeHtml(matchedType.name);
                detailRows.push(`<div><i class="bx ${matchedType.icon} me-1"></i>${label}</div>`);
            } else {
                const parts = [];
                const setCount = ex.sets_completed || 0;
                if (setCount > 0) parts.push(`${setCount} set${setCount !== 1 ? 's' : ''}`);
                if (ex.target_reps) parts.push(`${ex.target_reps} reps`);
                if (ex.weight) {
                    const unit = ex.weight_unit || 'lbs';
                    parts.push(`${ex.weight} ${unit}`);
                }
                const info = parts.length > 0 ? parts.join(' x ') : 'completed';
                detailRows.push(`<div><i class="bx bx-check-circle me-1"></i>${escapeHtml(ex.exercise_name)} - ${info}</div>`);
            }
        });
    }
    if (session.notes) detailRows.push(`<div class="mt-2 fst-italic text-muted">"${escapeHtml(session.notes)}"</div>`);

    const hasDetails = detailRows.length > 0;
    const collapseId = `workout-details-${session.id}`;

    return `
        <div class="session-entry ${hasDetails ? '' : 'no-details'}" data-session-id="${session.id}"
             ${hasDetails ? `role="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false"` : ''}>
            <div class="session-status">
                <span class="session-status-icon cardio-icon">
                    <i class="bx bx-dumbbell"></i>
                </span>
            </div>
            <div class="session-info">
                <span class="session-workout-name">${escapeHtml(name)}</span>
                <span class="session-date">${date}</span>
                <span class="session-meta">
                    ${metaParts.map(p => `<span>${p}</span>`).join('<span class="mx-1">·</span>')}
                </span>
            </div>
            ${hasDetails ? `
                <span class="session-chevron">
                    <i class="bx bx-chevron-down"></i>
                </span>
            ` : ''}
        </div>
        ${hasDetails ? `
            <div class="collapse session-details-collapse" id="${collapseId}">
                <div class="session-details-wrapper p-3">
                    ${detailRows.join('')}
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-danger delete-workout-btn" data-session-id="${session.id}">
                            <i class="bx bx-trash me-1"></i>Delete
                        </button>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * Find a matching activity type from the registry by ID, name, or shortName
 * Handles variations like "Run", "running", "Running" all matching the "running" type
 */
function findActivityType(exerciseName) {
    const registry = window.ActivityTypeRegistry;
    if (!registry) return null;

    // Try exact ID match
    const byId = registry.getById(exerciseName);
    if (byId && byId.name !== exerciseName) return byId;

    // Try lowercase ID match (e.g., "Running" → "running")
    const lower = exerciseName.toLowerCase();
    const byLowerId = registry.getById(lower);
    if (byLowerId && byLowerId.name !== lower) return byLowerId;

    // Try matching against display names and shortNames (e.g., "Run" → shortName of "running")
    const allTypes = registry.getAll();
    const match = allTypes.find(t =>
        t.name.toLowerCase() === lower ||
        t.shortName.toLowerCase() === lower
    );
    return match || null;
}

/**
 * Extract duration info from a cardio exercise stored in ExercisePerformance
 * Duration may be in the weight field (e.g., "15 minutes", "30", "15 min")
 */
function formatCardioExerciseDuration(ex) {
    if (!ex.weight) return null;

    const w = String(ex.weight).trim();

    // Check if weight contains time-related text (e.g., "15 minutes", "30 min", "1 hour")
    const timeMatch = w.match(/^(\d+)\s*(min|minute|minutes|hr|hour|hours|h|m)s?$/i);
    if (timeMatch) {
        const num = parseInt(timeMatch[1]);
        return formatDuration(num);
    }

    // Plain number with non-weight unit (e.g., weight="15", unit="other" or "minutes")
    const unit = (ex.weight_unit || '').toLowerCase();
    if (/^(\d+)$/.test(w) && (unit === 'other' || unit === 'minutes' || unit === 'min')) {
        return formatDuration(parseInt(w));
    }

    return null;
}

/**
 * Format session date for display
 */
function formatSessionDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays < 7) {
        const dayName = date.toLocaleDateString([], { weekday: 'long' });
        return dayName + ' at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else {
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
}

/**
 * Format duration in minutes to readable string
 */
function formatDuration(minutes) {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// escapeHtml is provided by common-utils.js (window.escapeHtml)

/**
 * Set up click handlers for session expand/collapse and delete
 */
function setupSessionInteractions() {
    // Delete cardio session buttons
    document.querySelectorAll('.delete-cardio-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sessionId = btn.dataset.sessionId;
            ffnModalManager.confirm('Delete Session', 'Delete this session?', async () => {
                try {
                    const token = await window.dataManager.getAuthToken();
                    const response = await fetch(`/api/v3/cardio-sessions/${sessionId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error('Delete failed');

                    if (window.toastNotifications) {
                        window.toastNotifications.success('Session deleted');
                    }
                    await loadRecentCardioSessions();

                } catch (error) {
                    console.error('Failed to delete cardio session:', error);
                    if (window.toastNotifications) {
                        window.toastNotifications.error('Failed to delete session');
                    }
                }
            }, { confirmText: 'Delete', confirmClass: 'btn-danger', size: 'sm' });
        });
    });

    // Delete workout session buttons
    document.querySelectorAll('.delete-workout-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sessionId = btn.dataset.sessionId;
            ffnModalManager.confirm('Delete Session', 'Delete this workout session?', async () => {
                try {
                    const token = await window.dataManager.getAuthToken();
                    const response = await fetch(`/api/v3/workout-sessions/${sessionId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error('Delete failed');

                if (window.toastNotifications) {
                    window.toastNotifications.success('Workout session deleted');
                }
                await loadRecentCardioSessions();

            } catch (error) {
                console.error('Failed to delete workout session:', error);
                if (window.toastNotifications) {
                    window.toastNotifications.error('Failed to delete session');
                }
            }
            }, { confirmText: 'Delete', confirmClass: 'btn-danger', size: 'sm' });
        });
    });
}

// Make functions available globally
window.loadRecentCardioSessions = loadRecentCardioSessions;
window.renderCardioSessionEntry = renderCardioSessionEntry;
window.formatCardioSessionDate = formatSessionDate;
window.formatCardioDuration = formatDuration;
window.groupCardioSessionsByTimePeriod = groupSessionsByTimePeriod;
