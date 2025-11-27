/**
 * Ghost Gym - Exercise Card Renderer
 * Handles rendering of exercise cards in workout mode
 * @version 1.0.0
 * @date 2025-11-18
 */

class ExerciseCardRenderer {
    /**
     * @param {Object} sessionService - Workout session service instance
     */
    constructor(sessionService) {
        this.sessionService = sessionService;
    }

    /**
     * Render an exercise card
     * @param {Object} group - Exercise group data
     * @param {number} index - Card index
     * @param {boolean} isBonus - Whether this is a bonus exercise
     * @param {number} totalCards - Total number of cards (to determine if this is the last one)
     * @returns {string} HTML string for the card
     */
    renderCard(group, index, isBonus = false, totalCards = 0) {
        const exercises = group.exercises || {};
        const mainExercise = exercises.a || 'Unknown Exercise';
        const alternates = this._getAlternates(exercises);
        
        const sets = group.sets || '3';
        const reps = group.reps || '8-12';
        const rest = group.rest || '60s';
        const notes = group.notes || '';
        
        const restSeconds = this._parseRestTime(rest);
        const timerId = `timer-${index}`;
        const bonusClass = isBonus ? 'bonus-exercise' : '';
        
        // Check if session is active
        const isSessionActive = this.sessionService.isSessionActive();
        
        // Get exercise history
        const history = this.sessionService.getExerciseHistory(mainExercise);
        const lastWeight = history?.last_weight || '';
        const lastWeightUnit = history?.last_weight_unit || 'lbs';
        const lastSessionDate = history?.last_session_date
            ? new Date(history.last_session_date).toLocaleDateString()
            : null;
        
        // Get weight data with proper fallback chain
        const weightData = this.sessionService.getExerciseWeight(mainExercise);
        const templateWeight = group.default_weight || '';
        const templateUnit = group.default_weight_unit || 'lbs';
        
        // PHASE 2: Check if exercise is skipped
        const isSkipped = weightData?.is_skipped || false;
        const skipReason = weightData?.skip_reason || '';
        
        // Determine current weight with proper fallback
        const currentWeight = weightData?.weight || templateWeight || lastWeight || '';
        const currentUnit = weightData?.weight_unit ||
                          (weightData?.weight ? templateUnit : (templateWeight ? templateUnit : lastWeightUnit));
        
        // Determine weight source for better UX feedback
        const weightSource = weightData?.weight ? 'session' :
                           (templateWeight ? 'template' :
                           (lastWeight ? 'history' : 'none'));
        
        return `
            <div class="card exercise-card ${bonusClass} ${isSkipped ? 'skipped' : ''}" data-exercise-index="${index}" data-exercise-name="${this._escapeHtml(mainExercise)}">
                <div class="card-header exercise-card-header" onclick="window.workoutModeController.toggleExerciseCard(${index})">
                    <div class="exercise-card-summary">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="mb-0">
                                ${isSkipped ? '<i class="bx bx-x-circle text-warning me-1"></i>' : ''}
                                ${this._escapeHtml(mainExercise)}
                            </h6>
                            ${this._renderWeightBadge(currentWeight, currentUnit, weightSource, lastWeight, lastWeightUnit)}
                        </div>
                        <div class="exercise-card-meta text-muted small">
                            ${sets} × ${reps} • Rest: ${rest}
                        </div>
                        ${alternates.length > 0 ? `
                            <div class="exercise-card-alts text-muted small mt-1">
                                ${alternates.map(alt => `<div>${alt.label}: ${this._escapeHtml(alt.name)}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <i class="bx bx-chevron-down expand-icon"></i>
                </div>
                
                <div class="card-body exercise-card-body" style="display: none;">
                    ${isSkipped ? `
                        <div class="alert alert-warning mb-3">
                            <i class="bx bx-info-circle me-2"></i>
                            <strong>Exercise Skipped</strong>
                            ${skipReason ? `<p class="mb-0 mt-1 small">${this._escapeHtml(skipReason)}</p>` : ''}
                        </div>
                    ` : ''}
                    
                    ${isSessionActive && lastWeight && lastSessionDate ? `
                        <div class="text-muted small mb-3">
                            <i class="bx bx-history me-1"></i>Last: ${lastWeight} ${lastWeightUnit} (${lastSessionDate})
                        </div>
                    ` : ''}
                    
                    ${notes ? `
                        <div class="alert alert-info mb-3" style="font-size: 0.875rem; padding: 0.75rem;">
                            <i class="bx bx-info-circle me-1"></i>
                            ${this._escapeHtml(notes)}
                        </div>
                    ` : ''}
                    
                    <!-- 2x3 Grid: Rest Timer | Start Button | Skip/Unskip / Edit Weight | Next | (empty) -->
                    <div class="workout-button-grid workout-button-grid-2x3">
                        <!-- Row 1, Column 1: Rest Timer Label -->
                        <div class="rest-timer-grid-label">
                            <div class="rest-timer" data-rest-seconds="${restSeconds}" data-timer-id="${timerId}">
                            </div>
                        </div>
                        
                        <!-- Row 1, Column 2: Start Rest Button (will be rendered by timer) -->
                        <div class="rest-timer-button-slot">
                        </div>
                        
                        <!-- Row 1, Column 3: Skip/Unskip Button -->
                        ${isSessionActive && !isSkipped ? `
                            <button class="btn btn-outline-warning workout-grid-btn"
                                    onclick="window.workoutModeController.handleSkipExercise('${this._escapeHtml(mainExercise)}', ${index}); event.stopPropagation();"
                                    title="Skip this exercise">
                                <i class="bx bx-skip-next me-1"></i>Skip
                            </button>
                        ` : isSessionActive && isSkipped ? `
                            <button class="btn btn-warning workout-grid-btn"
                                    onclick="window.workoutModeController.handleUnskipExercise('${this._escapeHtml(mainExercise)}', ${index}); event.stopPropagation();"
                                    title="Unskip this exercise">
                                <i class="bx bx-undo me-1"></i>Unskip
                            </button>
                        ` : `
                            <div class="workout-grid-btn-placeholder"></div>
                        `}
                        
                        <!-- Row 2, Column 1: Edit Weight Button -->
                        <button
                            class="btn ${currentWeight ? 'btn-outline-primary' : 'btn-outline-warning'} workout-grid-btn"
                            data-exercise-name="${this._escapeHtml(mainExercise)}"
                            data-current-weight="${currentWeight || ''}"
                            data-current-unit="${currentUnit}"
                            data-last-weight="${lastWeight || ''}"
                            data-last-weight-unit="${lastWeightUnit || ''}"
                            data-last-session-date="${lastSessionDate || ''}"
                            data-is-session-active="${isSessionActive}"
                            data-weight-source="${weightSource}"
                            onclick="window.workoutModeController.handleWeightButtonClick(this); event.stopPropagation();"
                            title="${currentWeight ? 'Edit current weight' : 'Set weight for this exercise'}">
                            <i class="bx ${currentWeight ? 'bx-edit-alt' : 'bx-plus-circle'} me-1"></i>${currentWeight ? 'Edit Weight' : 'Set Weight'}
                        </button>
                        
                        <!-- Row 2, Column 2: Next/End Button -->
                        <button class="btn btn-primary workout-grid-btn" onclick="window.workoutModeController.goToNextExercise(${index})">
                            ${index === totalCards - 1 ? 'End<i class="bx bx-stop-circle ms-1"></i>' : 'Next<i class="bx bx-right-arrow-alt ms-1"></i>'}
                        </button>
                        
                        <!-- Row 2, Column 3: Empty placeholder for alignment -->
                        <div class="workout-grid-btn-placeholder"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render weight badge with visual progression feedback (Phase 3)
     * @private
     */
    _renderWeightBadge(currentWeight, currentUnit, weightSource, lastWeight, lastWeightUnit) {
        // No current weight - show placeholder
        if (!currentWeight) {
            if (lastWeight) {
                const unitDisplay = lastWeightUnit !== 'other' ? ` ${lastWeightUnit}` : '';
                return `<span class="badge bg-label-secondary" title="Last used weight - click Edit Weight to use">Last: ${lastWeight}${unitDisplay}</span>`;
            }
            return `<span class="badge bg-label-secondary" title="No weight set - click Edit Weight to add">No weight</span>`;
        }
        
        // PHASE 3: Determine progression state
        let progressionClass = '';
        let progressionIcon = '';
        let tooltipText = '';
        const unitDisplay = currentUnit !== 'other' ? ` ${currentUnit}` : '';
        
        if (!lastWeight) {
            // First time doing this exercise
            progressionClass = 'new';
            progressionIcon = '★';
            tooltipText = `${currentWeight}${unitDisplay} - First time doing this exercise!`;
        } else {
            const weightDiff = currentWeight - lastWeight;
            if (weightDiff > 0) {
                // Weight increased
                progressionClass = 'increased';
                progressionIcon = '↑';
                tooltipText = `${currentWeight}${unitDisplay} (+${weightDiff.toFixed(1)}${unitDisplay} from last time)`;
            } else if (weightDiff < 0) {
                // Weight decreased
                progressionClass = 'decreased';
                progressionIcon = '↓';
                tooltipText = `${currentWeight}${unitDisplay} (${weightDiff.toFixed(1)}${unitDisplay} from last time)`;
            } else {
                // Same weight
                progressionClass = 'same';
                progressionIcon = '→';
                tooltipText = `${currentWeight}${unitDisplay} (same as last time)`;
            }
        }
        
        // Add modified indicator if user changed from template
        const modifiedClass = weightSource === 'session' ? 'modified' : '';
        if (modifiedClass) {
            tooltipText += ' - Modified from template';
        }
        
        return `<span class="badge weight-badge ${progressionClass} ${modifiedClass}"
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title="${tooltipText}">
            ${progressionIcon} ${currentWeight}${unitDisplay}
        </span>`;
    }

    /**
     * Get alternate exercises
     * @private
     */
    _getAlternates(exercises) {
        const alternates = [];
        if (exercises.b) alternates.push({ label: 'Alt1', name: exercises.b });
        if (exercises.c) alternates.push({ label: 'Alt2', name: exercises.c });
        return alternates;
    }

    /**
     * Parse rest time string to seconds
     * @private
     */
    _parseRestTime(restStr) {
        const match = restStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 60;
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export globally
window.ExerciseCardRenderer = ExerciseCardRenderer;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExerciseCardRenderer;
}

console.log('📦 ExerciseCardRenderer component loaded');