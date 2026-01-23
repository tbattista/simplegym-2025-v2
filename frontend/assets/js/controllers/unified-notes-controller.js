/**
 * Ghost Gym - Unified Notes Controller
 * Handles single notes field per exercise (replaces separate weight/reps notes)
 * @version 2.2.0
 * @date 2026-01-15
 *
 * v2.2.0 Changes:
 * - Updated for new DOM structure where notes content is above buttons row
 * - Notes content is now direct child of .workout-notes-timer-section
 * - Button is inside .workout-notes-col within .workout-notes-timer-row
 */

class UnifiedNotesController {
    /**
     * @param {Object} sessionService - Workout session service instance
     */
    constructor(sessionService) {
        this.sessionService = sessionService;
        this.activeNoteField = null; // Track currently open note field
        this.debounceTimers = {}; // Per-exercise debounce timers
    }

    /**
     * Initialize unified notes for all exercises on the page
     */
    initialize() {
        console.log('🎵 Initializing Unified Notes Controller v2.2.0...');

        // Find all unified notes sections (now using .workout-notes-timer-section)
        const noteSections = document.querySelectorAll('.workout-unified-notes');

        noteSections.forEach(section => {
            this.bindNoteEvents(section);
        });

        console.log(`✅ Unified Notes Controller initialized for ${noteSections.length} exercise(s)`);
    }

    /**
     * Bind events to a unified notes section
     * v2.2.0: Updated selectors for new DOM structure
     * @param {HTMLElement} section - The notes section container (.workout-notes-timer-section)
     */
    bindNoteEvents(section) {
        // v2.2.0: Button is now inside .workout-notes-col within .workout-notes-timer-row
        const toggleBtn = section.querySelector('.workout-notes-timer-row .workout-note-toggle-btn');
        // v2.2.0: Notes content is direct child of section (above buttons row)
        const notesContent = section.querySelector(':scope > .workout-notes-content');
        const textarea = notesContent?.querySelector('.workout-notes-input');

        if (!toggleBtn || !notesContent || !textarea) {
            console.warn('⚠️ Missing note elements in section:', section);
            return;
        }

        const exerciseName = toggleBtn.dataset.exerciseName;

        // Toggle button click
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNotes(toggleBtn, notesContent, exerciseName);
        });

        // Textarea input with debounced auto-save
        textarea.addEventListener('input', (e) => {
            this.handleNoteInput(exerciseName, textarea, toggleBtn);
        });

        // Textarea blur - save immediately
        textarea.addEventListener('blur', (e) => {
            this.saveNote(exerciseName, textarea.value, toggleBtn);
        });

        // Load existing note if available
        this.loadExistingNote(exerciseName, textarea, toggleBtn);
    }

    /**
     * Toggle notes field visibility
     * @param {HTMLElement} toggleBtn - The toggle button
     * @param {HTMLElement} notesContent - The notes content container
     * @param {string} exerciseName - Exercise name
     */
    toggleNotes(toggleBtn, notesContent, exerciseName) {
        const isCurrentlyOpen = notesContent.style.display !== 'none';
        
        if (isCurrentlyOpen) {
            // Close notes
            notesContent.style.display = 'none';
            this.activeNoteField = null;
        } else {
            // Close any other open notes first
            if (this.activeNoteField && this.activeNoteField !== notesContent) {
                this.activeNoteField.style.display = 'none';
            }
            
            // Open this notes field
            notesContent.style.display = 'block';
            this.activeNoteField = notesContent;
            
            // Focus the textarea
            const textarea = notesContent.querySelector('.workout-notes-input');
            if (textarea) {
                setTimeout(() => textarea.focus(), 100);
            }
        }
    }

    /**
     * Handle note input with debounced auto-save
     * @param {string} exerciseName - Exercise name
     * @param {HTMLTextAreaElement} textarea - The textarea element
     * @param {HTMLElement} toggleBtn - The toggle button (to update state)
     */
    handleNoteInput(exerciseName, textarea, toggleBtn) {
        const noteValue = textarea.value;
        
        // Update button state immediately (visual feedback)
        if (noteValue.trim().length > 0) {
            toggleBtn.classList.add('has-note');
            toggleBtn.querySelector('span').textContent = 'Edit Note';
        } else {
            toggleBtn.classList.remove('has-note');
            toggleBtn.querySelector('span').textContent = 'Add Note';
        }
        
        // Debounced save (1 second delay)
        if (this.debounceTimers[exerciseName]) {
            clearTimeout(this.debounceTimers[exerciseName]);
        }
        
        this.debounceTimers[exerciseName] = setTimeout(() => {
            this.saveNote(exerciseName, noteValue, toggleBtn);
        }, 1000);
    }

    /**
     * Save note to session service
     * @param {string} exerciseName - Exercise name
     * @param {string} noteValue - Note text
     * @param {HTMLElement} toggleBtn - The toggle button (to update state)
     */
    saveNote(exerciseName, noteValue, toggleBtn) {
        console.log(`💾 Saving note for ${exerciseName}:`, noteValue);
        
        // Clear debounce timer if exists
        if (this.debounceTimers[exerciseName]) {
            clearTimeout(this.debounceTimers[exerciseName]);
            delete this.debounceTimers[exerciseName];
        }
        
        // Save to session service
        if (this.sessionService.isSessionActive()) {
            // Active session - save to session data
            this.sessionService.updateExerciseNotes(exerciseName, noteValue);
        } else {
            // Pre-session - save to pre-session edits
            this.sessionService.updatePreSessionNotes(exerciseName, noteValue);
        }
        
        // Update button state
        if (noteValue.trim().length > 0) {
            toggleBtn.classList.add('has-note');
            toggleBtn.querySelector('span').textContent = 'Edit Note';
        } else {
            toggleBtn.classList.remove('has-note');
            toggleBtn.querySelector('span').textContent = 'Add Note';
        }
        
        console.log(`✅ Note saved for ${exerciseName}`);
    }

    /**
     * Load existing note from session service
     * @param {string} exerciseName - Exercise name
     * @param {HTMLTextAreaElement} textarea - The textarea element
     * @param {HTMLElement} toggleBtn - The toggle button (to update state)
     */
    loadExistingNote(exerciseName, textarea, toggleBtn) {
        let existingNote = '';
        
        if (this.sessionService.isSessionActive()) {
            // Active session - get from session data
            const exerciseData = this.sessionService.getExerciseWeight(exerciseName);
            existingNote = exerciseData?.notes || '';
        } else {
            // Pre-session - get from pre-session edits or template
            const preSessionEdit = this.sessionService.getPreSessionEdits(exerciseName);
            existingNote = preSessionEdit?.notes || '';
        }
        
        if (existingNote && existingNote.trim().length > 0) {
            textarea.value = existingNote;
            toggleBtn.classList.add('has-note');
            toggleBtn.querySelector('span').textContent = 'Edit Note';
        }
    }

    /**
     * Refresh notes for a specific exercise (called after card re-render)
     * @param {string} exerciseName - Exercise name
     */
    refreshExerciseNotes(exerciseName) {
        const section = document.querySelector(`.workout-unified-notes [data-exercise-name="${exerciseName}"]`)?.closest('.workout-unified-notes');
        
        if (section) {
            this.bindNoteEvents(section);
        }
    }

    /**
     * Close all open notes
     */
    closeAllNotes() {
        if (this.activeNoteField) {
            this.activeNoteField.style.display = 'none';
            this.activeNoteField = null;
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        // Clear all debounce timers
        Object.values(this.debounceTimers).forEach(timer => clearTimeout(timer));
        this.debounceTimers = {};
        this.activeNoteField = null;
        console.log('🧹 Unified Notes Controller destroyed');
    }
}

// Export globally
window.UnifiedNotesController = UnifiedNotesController;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedNotesController;
}

console.log('📦 UnifiedNotesController component loaded');