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
        
        // Calculate plate breakdown for barbell exercises
        const plateBreakdown = this._calculatePlateBreakdown(currentWeight, currentUnit);
        
        return `
            <div class="card exercise-card ${bonusClass} ${isSkipped ? 'skipped' : ''}" data-exercise-index="${index}" data-exercise-name="${this._escapeHtml(mainExercise)}">
                <div class="card-header exercise-card-header" onclick="window.workoutModeController.toggleExerciseCard(${index})">
                    <div class="exercise-card-summary">
                        <h6 class="mb-0">
                            ${isSkipped ? '<i class="bx bx-x-circle text-warning me-1"></i>' : ''}
                            ${this._escapeHtml(mainExercise)}
                        </h6>
                        <div class="exercise-card-meta">
                            <span>${sets} sets × ${reps} reps</span>
                            ${this._renderWeightBadge(currentWeight, currentUnit, weightSource, lastWeight, lastWeightUnit)}
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
                    
                    <div class="mb-3">
                        <h5>${this._escapeHtml(mainExercise)}</h5>
                        
                        <!-- Compact Weight & Exercise Details (Demo Style) -->
                        <div class="mb-3 p-2 bg-light rounded">
                            <div class="row g-2 align-items-center">
                                <!-- Weight Column -->
                                <div class="col-5 text-center border-end">
                                    <small class="text-muted d-block">Weight</small>
                                    <div class="h3 mb-0 text-primary fw-bold">${currentWeight || '—'} ${currentWeight ? currentUnit : ''}</div>
                                    ${lastWeight && lastSessionDate ? `
                                        <small class="text-muted" style="font-size: 0.7rem;">Last: ${lastWeight} ${lastWeightUnit}</small>
                                    ` : ''}
                                </div>
                                
                                <!-- Sets × Reps & Rest -->
                                <div class="col-7">
                                    <div class="d-flex justify-content-around">
                                        <div class="text-center">
                                            <small class="text-muted d-block" style="font-size: 0.7rem;">Sets × Reps</small>
                                            <strong>${sets} × ${reps}</strong>
                                        </div>
                                        <div class="text-center">
                                            <small class="text-muted d-block" style="font-size: 0.7rem;">Rest</small>
                                            <strong><i class="bx bx-time-five" style="font-size: 0.9rem;"></i>${rest}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${plateBreakdown ? `
                                <div class="mt-2 pt-2 border-top text-center">
                                    <small class="text-muted" style="font-size: 0.7rem;">
                                        <i class="bx bx-dumbbell me-1"></i>${plateBreakdown}
                                    </small>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${notes ? `
                            <p class="text-muted small mb-3">
                                <i class="bx bx-info-circle me-1"></i>
                                ${this._escapeHtml(notes)}
                            </p>
                        ` : ''}
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="d-grid">
                        <button
                            class="btn ${currentWeight ? 'btn-primary' : 'btn-outline-primary'}"
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
                            <i class="bx ${currentWeight ? 'bx-edit-alt' : 'bx-plus-circle'} me-2"></i>
                            ${currentWeight ? 'Edit Exercise' : 'Set Weight'}
                        </button>
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
     * Calculate barbell plate breakdown
     * @private
     */
    _calculatePlateBreakdown(weightStr, unit) {
        // Only calculate for lbs barbell exercises
        if (unit !== 'lbs') return null;
        
        // Extract numeric value from weight string
        const totalWeight = parseFloat(weightStr);
        if (isNaN(totalWeight) || totalWeight <= 45) {
            return null; // No plates needed for bar weight or less
        }
        
        const barWeight = 45;
        const weightPerSide = (totalWeight - barWeight) / 2;
        
        if (weightPerSide <= 0) {
            return null;
        }
        
        // Available plate weights in descending order
        const plates = [45, 35, 25, 10, 5, 2.5];
        const plateCount = {};
        let remaining = weightPerSide;
        
        // Calculate plates needed per side
        for (const plate of plates) {
            const count = Math.floor(remaining / plate);
            if (count > 0) {
                plateCount[plate] = count;
                remaining -= count * plate;
            }
        }
        
        // Format the breakdown string
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