/**
 * Activity Log - Recent Sessions History
 * Loads, renders, and manages the recent cardio sessions list
 * @version 1.0.0
 */

/**
 * Load recent cardio sessions from the API
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
        const response = await fetch('/api/v3/cardio-sessions?page_size=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load sessions');

        const data = await response.json();
        const sessions = data.sessions || [];

        window.ffn.activityLog.sessions = sessions;

        if (loadingEl) loadingEl.style.display = 'none';

        if (sessions.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        buildFilterChips(sessions);
        renderCardioHistory(sessions);

    } catch (error) {
        console.error('Failed to load cardio sessions:', error);
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

    // Get unique activity types
    const types = [...new Set(sessions.map(s => s.activity_type))];

    // Keep the "All" chip, add type-specific chips
    container.innerHTML = `
        <button type="button" class="btn btn-sm btn-primary activity-filter-chip active" data-filter="all">All</button>
        ${types.map(type => `
            <button type="button" class="btn btn-sm btn-outline-secondary activity-filter-chip" data-filter="${type}">
                <i class="bx ${window.ACTIVITY_ICONS?.[type] || 'bx-dots-horizontal-rounded'} me-1"></i>${window.ACTIVITY_NAMES?.[type] || type}
            </button>
        `).join('')}
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
        const filtered = filter === 'all' ? sessions : sessions.filter(s => s.activity_type === filter);
        renderCardioHistory(filtered);
    });
}

/**
 * Render cardio sessions grouped by time period
 */
function renderCardioHistory(sessions) {
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
                ${group.sessions.map(s => renderCardioSessionEntry(s)).join('')}
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
        const sessionDate = new Date(session.started_at);
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
    const icon = window.ACTIVITY_ICONS?.[session.activity_type] || 'bx-dots-horizontal-rounded';
    const name = session.activity_name || window.ACTIVITY_NAMES?.[session.activity_type] || session.activity_type;
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

    // Build details section
    const detailRows = [];
    if (session.calories) detailRows.push(`<div><i class="bx bx-flame me-1"></i>${session.calories} kcal</div>`);
    if (session.rpe) detailRows.push(`<div><i class="bx bx-bar-chart me-1"></i>RPE: ${session.rpe}/10</div>`);
    if (session.elevation_gain) detailRows.push(`<div><i class="bx bx-trending-up me-1"></i>${session.elevation_gain} ${session.elevation_unit || 'ft'} gain</div>`);
    if (session.max_heart_rate) detailRows.push(`<div><i class="bx bx-heart me-1"></i>Max HR: ${session.max_heart_rate} bpm</div>`);
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
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
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

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Set up click handlers for session expand/collapse and delete
 */
function setupSessionInteractions() {
    // Delete buttons
    document.querySelectorAll('.delete-cardio-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sessionId = btn.dataset.sessionId;
            if (!confirm('Delete this session?')) return;

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

                // Reload
                await loadRecentCardioSessions();

            } catch (error) {
                console.error('Failed to delete cardio session:', error);
                if (window.toastNotifications) {
                    window.toastNotifications.error('Failed to delete session');
                }
            }
        });
    });
}

// Make functions available globally
window.loadRecentCardioSessions = loadRecentCardioSessions;
window.renderCardioSessionEntry = renderCardioSessionEntry;
window.formatCardioSessionDate = formatSessionDate;
window.formatCardioDuration = formatDuration;
window.groupCardioSessionsByTimePeriod = groupSessionsByTimePeriod;
