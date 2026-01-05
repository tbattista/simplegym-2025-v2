/**
 * Ghost Gym - Quick Notes Configuration
 * Preset configurations for different note types
 * @version 1.0.0
 * @date 2026-01-05
 */

const QuickNotesPresets = {
    /**
     * Weight Direction Notes
     * Used for indicating whether to increase or decrease weight in next session
     */
    'weight-direction': {
        title: 'Notes for next time',
        iconEmpty: 'bx-pencil',
        iconFilled: 'bxs-pencil',
        iconColorFilled: 'text-primary',
        actions: [
            {
                id: 'up',
                label: 'Increase',
                icon: 'bx-chevron-up',
                color: 'success'
            },
            {
                id: 'same',
                label: 'No change',
                icon: 'bx-minus',
                color: 'secondary'
            },
            {
                id: 'down',
                label: 'Decrease',
                icon: 'bx-chevron-down',
                color: 'warning'
            }
        ],
        showTextInput: false,
        labelMap: {
            'down': 'Decrease',
            'same': 'No change',
            'up': 'Increase'
        }
    },
    
    /**
     * Exercise Notes (Future Phase)
     * Used for freeform text notes about an exercise
     */
    'exercise-note': {
        title: 'Exercise Notes',
        iconEmpty: 'bx-note',
        iconFilled: 'bxs-note',
        iconColorFilled: 'text-info',
        actions: [],
        showTextInput: true,
        textInputPlaceholder: 'Add a note about this exercise...'
    },
    
    /**
     * Performance Rating (Future Phase)
     * Used for rating how an exercise felt
     */
    'performance-rating': {
        title: 'How did it feel?',
        iconEmpty: 'bx-star',
        iconFilled: 'bxs-star',
        iconColorFilled: 'text-warning',
        actions: [
            {
                id: 'easy',
                label: 'Too Easy',
                icon: 'bx-happy',
                color: 'success'
            },
            {
                id: 'good',
                label: 'Just Right',
                icon: 'bx-meh',
                color: 'primary'
            },
            {
                id: 'hard',
                label: 'Too Hard',
                icon: 'bx-sad',
                color: 'danger'
            }
        ],
        showTextInput: true,
        textInputPlaceholder: 'Additional notes...'
    }
};

// Export for global use
window.QuickNotesPresets = QuickNotesPresets;

console.log('📦 Quick Notes Config loaded');
