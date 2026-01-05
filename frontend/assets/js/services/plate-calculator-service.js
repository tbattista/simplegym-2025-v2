/**
 * Ghost Gym - Plate Calculator Service
 * Manages user's gym plate configuration and calculates plate breakdowns
 * @version 1.0.0
 * @date 2025-12-28
 */

class PlateCalculatorService {
    constructor() {
        this.storageKey = 'ghostGym_plateConfig';
        this.defaultConfig = {
            barWeight: 45,
            barUnit: 'lbs',
            availablePlates: {
                55: true,
                45: true,
                35: true,
                25: true,
                10: true,
                5: true,
                2.5: true
            },
            customPlates: [] // Array of custom plate weights
        };
        this.config = this.loadConfig();
    }
    
    /**
     * Load plate configuration from localStorage
     * @returns {Object} Plate configuration
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? { ...this.defaultConfig, ...JSON.parse(stored) } : this.defaultConfig;
        } catch (e) {
            console.error('Failed to load plate config:', e);
            return this.defaultConfig;
        }
    }
    
    /**
     * Save plate configuration to localStorage
     * @param {Object} config - Plate configuration to save
     */
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            console.log('✅ Plate configuration saved:', this.config);
        } catch (e) {
            console.error('❌ Failed to save plate config:', e);
        }
    }
    
    /**
     * Get current configuration
     * @returns {Object} Current plate configuration
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * Get list of available plates sorted descending
     * @returns {number[]} Array of available plate weights
     */
    getAvailablePlates() {
        const plates = [];
        
        // Add standard plates that are enabled
        for (const [weight, enabled] of Object.entries(this.config.availablePlates)) {
            if (enabled) {
                plates.push(parseFloat(weight));
            }
        }
        
        // Add custom plates
        if (this.config.customPlates && this.config.customPlates.length > 0) {
            plates.push(...this.config.customPlates.map(w => parseFloat(w)));
        }
        
        // Sort descending and return unique values
        return [...new Set(plates)].sort((a, b) => b - a);
    }
    
    /**
     * Calculate plate breakdown for a given total weight
     * @param {number|string} totalWeight - Total weight to calculate
     * @param {string} unit - Unit of weight ('lbs' or 'kg')
     * @returns {string|null} Formatted plate breakdown string or null
     */
    calculateBreakdown(totalWeight, unit = 'lbs') {
        // Parse weight if it's a string
        const weight = typeof totalWeight === 'string' ? parseFloat(totalWeight) : totalWeight;
        
        if (isNaN(weight) || weight <= 0) {
            return null;
        }
        
        // Convert to config unit if different
        let calculationWeight = weight;
        if (unit !== this.config.barUnit) {
            // Convert kg to lbs or vice versa (1 kg = 2.20462 lbs)
            calculationWeight = unit === 'kg' ? weight * 2.20462 : weight / 2.20462;
        }
        
        // If weight is less than or equal to bar weight, no plates needed
        if (calculationWeight <= this.config.barWeight) {
            return null;
        }
        
        // Calculate weight needed per side
        const weightPerSide = (calculationWeight - this.config.barWeight) / 2;
        
        if (weightPerSide <= 0) {
            return null;
        }
        
        // Get available plates sorted descending
        const plates = this.getAvailablePlates();
        
        if (plates.length === 0) {
            return null; // No plates configured
        }
        
        // Calculate plates needed per side using greedy algorithm
        const plateCount = {};
        let remaining = weightPerSide;
        
        for (const plate of plates) {
            const count = Math.floor(remaining / plate);
            if (count > 0) {
                plateCount[plate] = count;
                remaining -= count * plate;
            }
        }
        
        // If no plates fit, return null
        if (Object.keys(plateCount).length === 0) {
            return null;
        }
        
        // Format the breakdown string
        const plateParts = Object.entries(plateCount)
            .map(([plate, count]) => {
                const plateNum = parseFloat(plate);
                const displayWeight = plateNum % 1 === 0 ? Math.floor(plateNum) : plateNum;
                return `${count}×${displayWeight}${this.config.barUnit === 'kg' ? 'kg' : 'lb'}`;
            })
            .join(' + ');
        
        const barDisplay = this.config.barWeight % 1 === 0 ? 
            Math.floor(this.config.barWeight) : this.config.barWeight;
        
        return `${barDisplay}${this.config.barUnit === 'kg' ? 'kg' : 'lb'} bar + (${plateParts}) each side`;
    }
    
    /**
     * Reset configuration to defaults
     */
    resetToDefaults() {
        this.config = { ...this.defaultConfig };
        localStorage.removeItem(this.storageKey);
        console.log('✅ Plate configuration reset to defaults');
    }
}

// Initialize global instance
window.plateCalculatorService = new PlateCalculatorService();

console.log('📦 PlateCalculatorService loaded');
