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
        
        // PHASE 1: Check data in priority order: Session > Pre-Session Edits > Template
        // This ensures edited values are displayed correctly before and during workout
        const isSessionActive = this.sessionService.isSessionActive();
        const exerciseData = this.sessionService.getExerciseWeight(mainExercise);
        const preSessionEdit = !isSessionActive ? this.sessionService.getPreSessionEdits(mainExercise) : null;
        
        // Priority: Active Session > Pre-Session Edit > Template
        const sets = exerciseData?.target_sets || preSessionEdit?.target_sets || group.sets || '3';
        const reps = exerciseData?.target_reps || preSessionEdit?.target_reps || group.reps || '8-12';
        const rest = exerciseData?.rest || preSessionEdit?.rest || group.rest || '60s';
        const notes = exerciseData?.notes || group.notes || '';
        
        const restSeconds = this._parseRestTime(rest);
        const timerId = `timer-${index}`;
        const bonusClass = isBonus ? 'bonus-exercise' : '';
        
        // Get exercise history
        const history = this.sessionService.getExerciseHistory(mainExercise);
        const lastWeight = history?.last_weight || '';
        const lastWeightUnit = history?.last_weight_unit || 'lbs';
        const lastSessionDate = history?.last_session_date
            ? new Date(history.last_session_date).toLocaleDateString()
            : null;
        
        // Get last weight direction from history (for display on new session)
        const lastDirection = this.sessionService.getLastWeightDirection(mainExercise);
        
        // Get current direction for this session
        const currentDirection = this.sessionService.getWeightDirection(mainExercise);
        
        // Get weight data with proper fallback chain
        const weightData = this.sessionService.getExerciseWeight(mainExercise);
        const templateWeight = group.default_weight || '';
        const templateUnit = group.default_weight_unit || 'lbs';
        
        // PHASE 2: Check if exercise is skipped
        const isSkipped = weightData?.is_skipped || false;
        const skipReason = weightData?.skip_reason || '';
        
        // PHASE 3: Check if exercise is completed
        const isCompleted = weightData?.is_completed || false;
        
        // Determine current weight with proper fallback
        const currentWeight = weightData?.weight || templateWeight || lastWeight || '';
        const currentUnit = weightData?.weight_unit ||
                          (weightData?.weight ? templateUnit : (templateWeight ? templateUnit : lastWeightUnit));
        
        // Determine weight source for better UX feedback
        const weightSource = weightData?.weight ? 'session' :
                           (templateWeight ? 'template' :
                           (lastWeight ? 'history' : 'none'));
        
        // Calculate plate breakdown for barbell exercises
        const plateBreakdown = this._calculatePlateBreakdown(currentWeight, currentUnit);
        
        return `
            <div class="card exercise-card ${bonusClass} ${isSkipped ? 'skipped' : ''} ${isCompleted ? 'completed' : ''}" data-exercise-index="${index}" data-exercise-name="${this._escapeHtml(mainExercise)}">
                <div class="card-header exercise-card-header" onclick="window.workoutModeController.toggleExerciseCard(${index})">
                    <!-- PHASE 2: Drag Handle -->
                    <div class="exercise-drag-handle"
                         title="Drag to reorder"
                         role="button"
                         tabindex="0"
                         aria-label="Drag handle to reorder ${this._escapeHtml(mainExercise)}">
                        <i class="bx bx-menu" aria-hidden="true"></i>
                    </div>
                    
                    <div class="exercise-card-summary">
                        <!-- MORPH: Exercise Name -->
                        <h6 class="mb-0 morph-title" data-morph-id="title-${index}">
                            ${isCompleted ? '<i class="bx bx-check-circle text-success me-1"></i>' : ''}
                            ${isSkipped ? '<i class="bx bx-x-circle text-warning me-1"></i>' : ''}
                            ${this._escapeHtml(mainExercise)}
                            ${lastDirection && !isSessionActive ? `
                                <span class="badge bg-label-${lastDirection === 'up' ? 'success' : 'warning'} ms-2 weight-direction-indicator"
                                      title="From last session">
                                    <i class="bx bx-chevron-${lastDirection}"></i> ${lastDirection === 'up' ? 'Increase' : 'Decrease'}
                                </span>
                            ` : ''}
                        </h6>
                        
                        <!-- MORPH: Meta info (visible when collapsed, hidden when expanded) -->
                        <div class="exercise-card-meta morph-meta" data-morph-id="meta-${index}">
                            <span class="morph-sets-reps">${sets} sets × ${reps} reps • ${rest}</span>
                        </div>
                    </div>
                    
                    <!-- Right-aligned weight badge -->
                    <div class="exercise-card-weight-container">
                        ${this._renderWeightBadge(currentWeight, currentUnit, weightSource, lastWeight, lastWeightUnit)}
                        <i class="bx bx-chevron-down expand-icon"></i>
                    </div>
                </div>
                
                <div class="card-body exercise-card-body" style="display: none;">
                    <!-- Alternate Exercises - Discreet Subtitle -->
                    ${alternates.length > 0 ? `
                        <div class="alternate-exercises-subtitle">
                            ${alternates.map(alt => `<span>${alt.label}: ${this._escapeHtml(alt.name)}</span>`).join(' · ')}
                        </div>
                    ` : ''}
                    
                    ${isSkipped ? `
                        <div class="alert alert-warning">
                            <i class="bx bx-info-circle me-2"></i>
                            <strong>Exercise Skipped</strong>
                            ${skipReason ? `<p class="mb-0 mt-1 small">${this._escapeHtml(skipReason)}</p>` : ''}
                        </div>
                    ` : ''}
                    
                    <!-- Weight Section -->
                    <div class="exercise-weight-section">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="exercise-weight-display">
                                <span class="exercise-weight-value">${currentWeight || '—'}</span>
                                ${currentWeight && currentUnit !== 'other' ? `<span class="exercise-weight-unit">${currentUnit}</span>` : ''}
                            </div>
                            ${isSessionActive ? `
                                <div class="btn-group btn-group-sm weight-direction-group" role="group" aria-label="Weight progression for next session">
                                    <button class="btn weight-direction-btn ${currentDirection === 'down' ? 'btn-warning active' : 'btn-outline-secondary'}"
                                            data-exercise-name="${this._escapeHtml(mainExercise)}"
                                            data-direction="down"
                                            onclick="window.workoutModeController.handleWeightDirection(this); event.stopPropagation();"
                                            title="Decrease weight next time"
                                            aria-label="Mark to decrease weight next session">
                                        <i class="bx bx-chevron-down"></i>
                                    </button>
                                    <button class="btn weight-direction-btn ${currentDirection === 'up' ? 'btn-success active' : 'btn-outline-secondary'}"
                                            data-exercise-name="${this._escapeHtml(mainExercise)}"
                                            data-direction="up"
                                            onclick="window.workoutModeController.handleWeightDirection(this); event.stopPropagation();"
                                            title="Increase weight next time"
                                            aria-label="Mark to increase weight next session">
                                        <i class="bx bx-chevron-up"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        ${lastWeight && lastSessionDate ? `
                            <small class="exercise-weight-history">Last: ${lastWeight}${lastWeightUnit !== 'other' ? ` ${lastWeightUnit}` : ''} on ${lastSessionDate}</small>
                        ` : ''}
                    </div>
                    
                    <!-- Exercise Details - List Group Style -->
                    <ul class="list-group list-group-flush exercise-details-list">
                        <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                            <span class="text-muted">Sets × Reps</span>
                            <strong>${sets} × ${reps}</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                            <span class="text-muted">Rest</span>
                            <strong><i class="bx bx-time-five me-1"></i>${rest}</strong>
                        </li>
                        ${plateBreakdown ? `
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                                <span class="text-muted"><i class="bx bx-dumbbell me-1"></i>Plates</span>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="text-muted small text-end">${plateBreakdown}</span>
                                    <button class="btn btn-sm btn-outline-secondary plate-settings-btn"
                                            onclick="window.workoutModeController.showPlateSettings(); event.stopPropagation();"
                                            title="Configure available plates">
                                        <i class="bx bx-cog"></i>
                                    </button>
                                </div>
                            </li>
                        ` : ''}
                    </ul>
                    
                    ${notes ? `
                        <div class="exercise-notes">
                            <i class="bx bx-info-circle me-1"></i>
                            <span>${this._escapeHtml(notes)}</span>
                        </div>
                    ` : ''}
                    
                    <!-- Card Action Buttons (Complete/Skip/Edit) -->
                    ${this._renderCardActionButtons(mainExercise, index, isSkipped, isCompleted, isSessionActive)}
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
     * Calculate barbell plate breakdown using plate calculator service
     * @private
     */
    _calculatePlateBreakdown(weightStr, unit) {
        // Use plate calculator service if available
        if (window.plateCalculatorService) {
            return window.plateCalculatorService.calculateBreakdown(weightStr, unit);
        }
        
        // Fallback to basic calculation if service not loaded
        if (unit !== 'lbs') return null;
        
        const totalWeight = parseFloat(weightStr);
        if (isNaN(totalWeight) || totalWeight <= 45) {
            return null;
        }
        
        const barWeight = 45;
        const weightPerSide = (totalWeight - barWeight) / 2;
        
        if (weightPerSide <= 0) {
            return null;
        }
        
        const plates = [45, 35, 25, 10, 5, 2.5];
        const plateCount = {};
        let remaining = weightPerSide;
        
        for (const plate of plates) {
            const count = Math.floor(remaining / plate);
            if (count > 0) {
                plateCount[plate] = count;
                remaining -= count * plate;
            }
        }
        
        const plateParts = [];
        for (const [plate, count] of Object.entries(plateCount)) {
            plateParts.push(`${count}×${plate}lb`);
        }
        
        if (plateParts.length === 0) {
            return null;
        }
        
        return `45lb bar + (${plateParts.join(' + ')}) each side`;
    }

    /**
     * Render card action buttons (Complete/Skip/Edit)
     * PHASE 1: Edit button now shows BEFORE session starts for pre-session editing
     * @private
     */
    _renderCardActionButtons(exerciseName, index, isSkipped, isCompleted, isSessionActive) {
        // PHASE 1: Always show Edit button, even before session starts
        // Before session: Show only Edit button
        // During session: Show Complete, Skip, and Edit buttons
        
        if (!isSessionActive) {
            // PRE-SESSION: Only show Edit button
            return `
                <div class="card-action-buttons mt-3 pt-3 border-top d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary flex-fill"
                            onclick="window.workoutModeController.handleEditExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                            title="Edit exercise details before starting workout">
                        <i class="bx bx-edit me-1"></i>Edit
                    </button>
                </div>
            `;
        }
        
        // ACTIVE SESSION: Show all action buttons
        return `
            <div class="card-action-buttons mt-3 pt-3 border-top d-flex gap-2">
                ${isSkipped ? `
                    <button class="btn btn-sm btn-warning flex-fill"
                            onclick="window.workoutModeController.handleUnskipExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                            title="Resume this exercise">
                        <i class="bx bx-undo me-1"></i>Unskip
                    </button>
                ` : `
                    ${isCompleted ? `
                        <button class="btn btn-sm btn-success flex-fill"
                                onclick="window.workoutModeController.handleUncompleteExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Mark as not completed">
                            <i class="bx bx-check-circle me-1"></i>Completed
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-success flex-fill"
                                onclick="window.workoutModeController.handleCompleteExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Mark exercise as complete">
                            <i class="bx bx-check me-1"></i>Complete
                        </button>
                    `}
                    <button class="btn btn-sm btn-outline-warning flex-fill"
                            onclick="window.workoutModeController.handleSkipExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                            title="Skip this exercise">
                        <i class="bx bx-skip-next me-1"></i>Skip
                    </button>
                `}
                <button class="btn btn-sm btn-outline-primary flex-fill"
                        onclick="window.workoutModeController.handleEditExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                        title="Edit exercise details">
                    <i class="bx bx-edit me-1"></i>Edit
                </button>
            </div>
        `;
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