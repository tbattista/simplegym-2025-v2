/**
 * Ghost Gym - Component Registry System
 * Central registry for managing reusable UI components
 * Enables components to be rendered anywhere with consistent behavior
 * @version 1.0.0
 */

class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.instances = new Map();
        console.log('📦 Component Registry initialized');
    }
    
    /**
     * Register a component with the registry
     * @param {string} name - Unique component name
     * @param {Object} config - Component configuration
     * @param {Array<string>} config.dependencies - Required global functions/objects
     * @param {Array<string>} config.dataRequirements - Data to load (workouts, programs, exercises)
     * @param {Function} config.renderFunction - Function to render the component
     * @param {Function} config.initFunction - Optional initialization function
     * @param {Array<Object>} config.eventHandlers - Event handlers to attach
     * @param {Object} config.defaultConfig - Default configuration options
     */
    register(name, config) {
        if (this.components.has(name)) {
            console.warn(`⚠️ Component "${name}" already registered, overwriting`);
        }
        
        this.components.set(name, {
            name,
            dependencies: config.dependencies || [],
            dataRequirements: config.dataRequirements || [],
            renderFunction: config.renderFunction,
            initFunction: config.initFunction,
            eventHandlers: config.eventHandlers || [],
            defaultConfig: config.defaultConfig || {}
        });
        
        console.log(`✅ Registered component: ${name}`);
    }
    
    /**
     * Initialize and render a component in a container
     * @param {string} name - Component name
     * @param {string} containerId - DOM container ID
     * @param {Object} options - Component-specific options
     * @returns {Promise<string>} Instance ID
     */
    async mount(name, containerId, options = {}) {
        const component = this.components.get(name);
        if (!component) {
            throw new Error(`Component "${name}" not registered. Available: ${Array.from(this.components.keys()).join(', ')}`);
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container "${containerId}" not found in DOM`);
        }
        
        console.log(`🔧 Mounting component: ${name} in #${containerId}`);
        
        // Validate dependencies
        const missingDeps = this.validateDependencies(component.dependencies);
        if (missingDeps.length > 0) {
            throw new Error(`Missing dependencies for "${name}": ${missingDeps.join(', ')}`);
        }
        
        // Load required data
        await this.loadComponentData(component.dataRequirements);
        
        // Merge options with defaults
        const finalOptions = { ...component.defaultConfig, ...options };
        
        // Initialize component
        if (component.initFunction) {
            try {
                await component.initFunction(finalOptions);
            } catch (error) {
                console.error(`❌ Error initializing component "${name}":`, error);
                throw error;
            }
        }
        
        // Attach event handlers
        this.attachEventHandlers(component.eventHandlers, finalOptions);
        
        // Render component
        if (component.renderFunction) {
            try {
                component.renderFunction(container, finalOptions);
            } catch (error) {
                console.error(`❌ Error rendering component "${name}":`, error);
                throw error;
            }
        }
        
        // Store instance
        const instanceId = `${name}-${containerId}-${Date.now()}`;
        this.instances.set(instanceId, {
            component: name,
            container: containerId,
            options: finalOptions,
            mountedAt: new Date()
        });
        
        console.log(`✅ Mounted component: ${name} (instance: ${instanceId})`);
        return instanceId;
    }
    
    /**
     * Validate that all dependencies are available
     * @param {Array<string>} dependencies - List of required global variables
     * @returns {Array<string>} Missing dependencies
     */
    validateDependencies(dependencies) {
        const missing = [];
        
        for (const dep of dependencies) {
            // Check if dependency exists in window
            if (typeof window[dep] === 'undefined') {
                missing.push(dep);
            }
        }
        
        return missing;
    }
    
    /**
     * Load data required by component
     * @param {Array<string>} requirements - Data types to load
     */
    async loadComponentData(requirements) {
        if (!window.dataManager) {
            console.warn('⚠️ dataManager not available, skipping data load');
            return;
        }
        
        // Ensure ghostGym state exists
        window.ffn = window.ffn || {
            programs: [],
            workouts: [],
            exercises: { all: [], favorites: new Set() },
            searchFilters: { programs: '', workouts: '' }
        };
        
        const promises = requirements.map(async (req) => {
            try {
                switch(req) {
                    case 'workouts':
                        console.log('📥 Loading workouts...');
                        const workouts = await window.dataManager.getWorkouts();
                        window.ffn.workouts = Array.isArray(workouts) ? workouts : [];
                        console.log(`✅ Loaded ${window.ffn.workouts.length} workouts`);
                        break;
                        
                    case 'programs':
                        console.log('📥 Loading programs...');
                        const programs = await window.dataManager.getPrograms();
                        window.ffn.programs = Array.isArray(programs) ? programs : [];
                        console.log(`✅ Loaded ${window.ffn.programs.length} programs`);
                        break;
                        
                    case 'exercises':
                        console.log('📥 Loading exercises...');
                        const exercises = await window.dataManager.getExercises();
                        window.ffn.exercises.all = Array.isArray(exercises) ? exercises : [];
                        console.log(`✅ Loaded ${window.ffn.exercises.all.length} exercises`);
                        break;
                        
                    default:
                        console.warn(`⚠️ Unknown data requirement: ${req}`);
                }
            } catch (error) {
                console.error(`❌ Error loading ${req}:`, error);
                // Set empty array to prevent undefined errors
                if (req === 'workouts') window.ffn.workouts = [];
                if (req === 'programs') window.ffn.programs = [];
                if (req === 'exercises') window.ffn.exercises.all = [];
            }
        });
        
        await Promise.all(promises);
    }
    
    /**
     * Attach event handlers for component
     * @param {Array<Object>} handlers - Event handler configurations
     * @param {Object} options - Component options to pass to handlers
     */
    attachEventHandlers(handlers, options) {
        handlers.forEach(handler => {
            const element = document.getElementById(handler.elementId);
            if (!element) {
                console.warn(`⚠️ Element #${handler.elementId} not found for event handler`);
                return;
            }
            
            const handlerFunction = window[handler.functionName];
            if (!handlerFunction || typeof handlerFunction !== 'function') {
                console.warn(`⚠️ Handler function "${handler.functionName}" not found`);
                return;
            }
            
            element.addEventListener(handler.event, (e) => {
                handlerFunction(e, options);
            });
            
            console.log(`🔗 Attached ${handler.event} handler to #${handler.elementId}`);
        });
    }
    
    /**
     * Unmount a component instance
     * @param {string} instanceId - Instance ID returned from mount()
     */
    unmount(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            console.warn(`⚠️ Instance "${instanceId}" not found`);
            return;
        }
        
        const container = document.getElementById(instance.container);
        if (container) {
            container.innerHTML = '';
        }
        
        this.instances.delete(instanceId);
        console.log(`✅ Unmounted component: ${instanceId}`);
    }
    
    /**
     * Refresh a component instance (reload data and re-render)
     * @param {string} instanceId - Instance ID
     */
    async refresh(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            console.warn(`⚠️ Instance "${instanceId}" not found`);
            return;
        }
        
        console.log(`🔄 Refreshing component: ${instanceId}`);
        await this.mount(instance.component, instance.container, instance.options);
    }
    
    /**
     * Get all registered component names
     * @returns {Array<string>} Component names
     */
    getRegisteredComponents() {
        return Array.from(this.components.keys());
    }
    
    /**
     * Get all active instances
     * @returns {Array<Object>} Instance information
     */
    getActiveInstances() {
        return Array.from(this.instances.entries()).map(([id, instance]) => ({
            id,
            ...instance
        }));
    }
}

// Create global instance
window.componentRegistry = new ComponentRegistry();

console.log('📦 Component Registry loaded');