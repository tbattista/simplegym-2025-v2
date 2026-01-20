/**
 * Dropdown Z-Index Fix Utility
 * Ensures dropdown menus appear above other cards by elevating parent card z-index
 * Fallback for browsers that don't support :has() CSS selector
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Check if browser supports :has() selector
    const supportsHas = CSS.supports('selector(:has(*))');
    
    if (supportsHas) {
        console.log('✅ Browser supports :has() - using CSS-only dropdown fix');
        return; // CSS handles it
    }

    console.log('⚠️ Browser does not support :has() - using JavaScript dropdown fix');

    /**
     * Add z-index elevation when dropdown opens
     */
    function handleDropdownShow(event) {
        const dropdown = event.target;
        const card = dropdown.closest('.workout-list-card') || dropdown.closest('.card');
        
        if (card) {
            // Elevate the card
            card.style.zIndex = '1060';
            card.style.position = 'relative';
            card.setAttribute('data-dropdown-elevated', 'true');
            
            // Also elevate the parent column (Bootstrap grid column)
            const column = card.closest('[class*="col"]');
            if (column) {
                column.style.zIndex = '1060';
                column.style.position = 'relative';
                column.setAttribute('data-dropdown-column-elevated', 'true');
            }
            
            console.log('📤 Elevated card and column z-index for dropdown');
        }
    }

    /**
     * Remove z-index elevation when dropdown closes
     */
    function handleDropdownHide(event) {
        const dropdown = event.target;
        const card = dropdown.closest('.workout-list-card') || dropdown.closest('.card');
        
        if (card && card.getAttribute('data-dropdown-elevated') === 'true') {
            // Reset card z-index
            card.style.zIndex = '';
            card.style.position = '';
            card.removeAttribute('data-dropdown-elevated');
            
            // Reset column z-index
            const column = card.closest('[class*="col"]');
            if (column && column.getAttribute('data-dropdown-column-elevated') === 'true') {
                column.style.zIndex = '';
                column.style.position = '';
                column.removeAttribute('data-dropdown-column-elevated');
            }
            
            console.log('📥 Reset card and column z-index after dropdown close');
        }
    }

    /**
     * Initialize dropdown listeners
     */
    function initDropdownFix() {
        // Listen for Bootstrap dropdown events
        document.addEventListener('show.bs.dropdown', handleDropdownShow);
        document.addEventListener('hide.bs.dropdown', handleDropdownHide);
        
        console.log('✅ Dropdown z-index fix initialized (JavaScript fallback)');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDropdownFix);
    } else {
        initDropdownFix();
    }

})();

console.log('📦 Dropdown z-index fix utility loaded');
