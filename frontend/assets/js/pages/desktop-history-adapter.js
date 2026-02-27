/**
 * Desktop History Adapter
 * Overrides workout-history rendering for desktop-optimized layout
 * Follows same IIFE + early-exit pattern as desktop-home-adapter.js
 * @version 1.0.0
 */
(function() {
    'use strict';

    const isDesktop = document.documentElement.classList.contains('desktop-view');
    if (!isDesktop) {
        console.log('Mobile view detected - desktop history adapter not activated');
        return;
    }

    console.log('Desktop history adapter activating...');

    // ============================================
    // 1. SHOW EXERCISE PERFORMANCE CARD IN SINGLE WORKOUT MODE
    // ============================================

    const _origLoadWorkoutHistory = window.loadWorkoutHistory;
    if (_origLoadWorkoutHistory) {
        window.loadWorkoutHistory = async function(workoutId) {
            await _origLoadWorkoutHistory(workoutId);
            // Show exercise performance card wrapper on desktop
            const wrapper = document.getElementById('desktopExercisePerfCardWrapper');
            if (wrapper) {
                wrapper.style.display = '';
            }
        };
    }

    // ============================================
    // 2. OVERRIDE renderStatistics FOR DESKTOP
    //    Show richer key-value stats in sidebar card
    // ============================================

    window.renderStatistics = function() {
        var stats = window.ffn.workoutHistory.statistics;
        var container = document.getElementById('statisticsCards');
        if (!container) return;

        var sessionCount = stats.totalWorkouts || 0;
        var avgDuration = isNaN(stats.avgDuration) ? 0 : stats.avgDuration;
        var lastDate = stats.lastCompleted
            ? window.formatDate(stats.lastCompleted, { short: true })
            : null;

        if (sessionCount === 0) {
            container.innerHTML = '<p class="text-muted mb-0 small">No sessions yet</p>';
            return;
        }

        var thisMonthCount = window.getThisMonthSessionCount
            ? window.getThisMonthSessionCount()
            : 0;

        var rows = '';
        rows += '<div class="d-flex justify-content-between"><span class="text-muted small">Total Sessions</span><span class="fw-semibold">' + sessionCount + '</span></div>';

        if (avgDuration > 0) {
            rows += '<div class="d-flex justify-content-between"><span class="text-muted small">Avg Duration</span><span class="fw-semibold">' + avgDuration + ' min</span></div>';
        }

        if (thisMonthCount > 0) {
            rows += '<div class="d-flex justify-content-between"><span class="text-muted small">This Month</span><span class="fw-semibold">' + thisMonthCount + ' sessions</span></div>';
        }

        if (lastDate) {
            rows += '<div class="d-flex justify-content-between"><span class="text-muted small">Last Trained</span><span class="fw-semibold">' + lastDate + '</span></div>';
        }

        container.innerHTML = '<div class="d-flex flex-column gap-2">' + rows + '</div>';
        container.style.display = 'block';
    };

    // ============================================
    // 3. OVERRIDE createSessionEntry FOR DESKTOP
    //    Show completion badge + exercise count inline
    // ============================================

    var _origCreateSessionEntry = window.createSessionEntry;
    window.createSessionEntry = function(session) {
        // Delegate cardio sessions unchanged
        if (session._sessionType === 'cardio' && window.renderCardioHistoryEntry) {
            return window.renderCardioHistoryEntry(session);
        }

        var state = window.ffn.workoutHistory;
        var deleteMode = state.deleteMode;

        // Delete mode: use original renderer
        if (deleteMode) {
            return _origCreateSessionEntry(session);
        }

        var collapseId = 'session-' + session.id;
        var isExpanded = state.expandedSessions.has(session.id);
        var isAllMode = state.isAllMode;
        var dateStr = window.formatDate(session.completed_at, { short: true });
        var duration = window.formatDuration(session.duration_minutes);
        var esc = window.escapeHtml;

        // Exercise summary
        var exercises = session.exercises_performed || [];
        var completed = exercises.filter(function(ex) { return !ex.is_skipped; }).length;
        var total = exercises.length;

        // Completion badge
        var badge = '';
        if (total > 0) {
            if (!session.completed_at) {
                badge = '<span class="badge bg-label-secondary">In Progress</span>';
            } else if (completed === total) {
                badge = '<span class="badge bg-success">Complete</span>';
            } else if (completed > 0) {
                badge = '<span class="badge bg-warning">Partial</span>';
            } else {
                badge = '<span class="badge bg-danger">Abandoned</span>';
            }
        }

        // Notes indicator
        var hasNotes = session.notes || (session.session_notes && session.session_notes.length > 0);

        // Workout name (All Mode only)
        var workoutNameHtml = isAllMode
            ? '<span class="session-workout-name">' + esc(session.workout_name || 'Workout') + '</span>'
            : '';

        return '' +
            '<div class="session-entry" id="session-entry-' + session.id + '"' +
            '     data-bs-toggle="collapse"' +
            '     data-bs-target="#' + collapseId + '"' +
            '     role="button"' +
            '     aria-expanded="' + isExpanded + '"' +
            '     aria-controls="' + collapseId + '">' +
            '  <div class="session-info">' +
                 workoutNameHtml +
            '    <div class="d-flex align-items-center gap-2">' +
            '      <span class="session-date">' + dateStr + '</span>' +
                   badge +
            '    </div>' +
            '    <span class="session-meta">' +
                   duration +
                   (total > 0 ? ' &middot; ' + completed + '/' + total + ' exercises' : '') +
                   (hasNotes ? ' &middot; <i class="bx bx-note"></i>' : '') +
            '    </span>' +
            '  </div>' +
            '  <div class="dropdown session-menu" onclick="event.stopPropagation();">' +
            '    <button class="btn btn-sm btn-icon session-menu-btn"' +
            '            type="button"' +
            '            data-bs-toggle="dropdown"' +
            '            aria-expanded="false"' +
            '            title="Session options">' +
            '      <i class="bx bx-dots-vertical-rounded"></i>' +
            '    </button>' +
            '    <ul class="dropdown-menu dropdown-menu-end">' +
            '      <li>' +
            '        <a class="dropdown-item" href="javascript:void(0);"' +
            '           onclick="createTemplateFromSession(\'' + session.id + '\');">' +
            '          <i class="bx bx-copy-alt me-2"></i>Save as Template' +
            '        </a>' +
            '      </li>' +
            '      <li><hr class="dropdown-divider"></li>' +
            '      <li>' +
            '        <a class="dropdown-item text-danger" href="javascript:void(0);"' +
            '           onclick="enterDeleteModeWithSelection(\'' + session.id + '\');">' +
            '          <i class="bx bx-trash me-2"></i>Delete' +
            '        </a>' +
            '      </li>' +
            '    </ul>' +
            '  </div>' +
            '  <i class="bx bx-chevron-down session-chevron"></i>' +
            '</div>' +
            '<div id="' + collapseId + '" class="collapse session-details-collapse ' + (isExpanded ? 'show' : '') + '">' +
            '  <div class="session-details-wrapper">' +
                 window.renderSessionDetails(session) +
            '  </div>' +
            '</div>';
    };

    console.log('Desktop history adapter loaded');
})();
