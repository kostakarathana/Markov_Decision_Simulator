// app.js - Main application controller

import * as model from './model.js';
import * as ui from './ui.js';
import * as mdp from './mdp.js';
import * as simulate from './simulate.js';
import * as storage from './storage.js';

// Application state
let currentSolution = null;

/**
 * Initialize the application
 */
function init() {
    console.log('MDP Simulator initializing...');
    
    // Initialize model
    model.init();
    
    // Try to load from localStorage
    const saved = storage.load();
    if (saved) {
        try {
            model.loadGraph(saved);
            ui.setStatus('Loaded saved graph');
        } catch (error) {
            console.error('Failed to load saved graph:', error);
            ui.setStatus('Failed to load saved graph');
        }
    }
    
    // Initialize UI
    ui.init();
    
    // Wire up toolbar buttons
    setupEventListeners();
    
    // Initial render
    ui.render();
    
    ui.setStatus('Ready');
}

/**
 * Setup event listeners for all buttons and controls
 */
function setupEventListeners() {
    // Tool buttons
    document.getElementById('btn-add-state').addEventListener('click', handleAddState);
    document.getElementById('btn-add-action').addEventListener('click', handleAddAction);
    document.getElementById('btn-delete').addEventListener('click', handleDelete);
    document.getElementById('btn-solve').addEventListener('click', handleSolve);
    document.getElementById('btn-simulate').addEventListener('click', handleSimulate);
    document.getElementById('btn-export').addEventListener('click', handleExport);
    document.getElementById('btn-import').addEventListener('click', handleImport);
    document.getElementById('btn-reset').addEventListener('click', handleReset);
    
    // Settings
    document.getElementById('gamma').addEventListener('input', handleSettingsChange);
    document.getElementById('epsilon').addEventListener('input', handleSettingsChange);
    document.getElementById('start-state').addEventListener('change', handleStartStateChange);
    
    // Setup autosave
    setupAutosave();
}

/**
 * Setup autosave on model changes
 */
function setupAutosave() {
    // We'll use a simple approach: save whenever UI renders
    // In a real app, you'd want more granular change detection
    setInterval(() => {
        storage.autosave();
    }, 2000);
}

// === EVENT HANDLERS ===

function handleAddState() {
    ui.addStateAtCenter();
    ui.setStatus('Added new state');
    storage.autosave();
}

function handleAddAction() {
    ui.enterConnectMode();
    storage.autosave();
}

function handleDelete() {
    ui.deleteSelected();
    ui.setStatus('Deleted selection');
    storage.autosave();
}

function handleSolve() {
    ui.setStatus('Solving MDP...');
    
    try {
        // Validate graph first
        const validation = model.validateGraph();
        
        if (!validation.valid) {
            ui.setStatus('Cannot solve: ' + validation.errors[0]);
            alert('Graph has errors:\n' + validation.errors.join('\n'));
            return;
        }
        
        if (validation.warnings.length > 0) {
            console.warn('Graph has warnings:', validation.warnings);
        }
        
        // Get settings
        const settings = model.getSettings();
        
        // Run value iteration
        const startTime = performance.now();
        const solution = mdp.valueIteration({
            gamma: settings.gamma,
            epsilon: settings.epsilon
        });
        const endTime = performance.now();
        
        currentSolution = solution;
        
        // Display solution
        ui.setSolution(solution);
        
        const time = (endTime - startTime).toFixed(2);
        ui.setStatus(`Solved in ${solution.iterations} iterations (${time}ms)`);
        
        console.log('Solution:', solution);
        
    } catch (error) {
        console.error('Failed to solve:', error);
        ui.setStatus('Error: ' + error.message);
        alert('Failed to solve MDP:\n' + error.message);
    }
}

function handleSimulate() {
    if (!currentSolution) {
        ui.setStatus('Please solve the MDP first');
        alert('Please solve the MDP first (click Solve button)');
        return;
    }
    
    const settings = model.getSettings();
    const startStateId = settings.startStateId;
    
    if (!startStateId) {
        ui.setStatus('Please select a start state');
        alert('Please select a start state from the settings panel');
        return;
    }
    
    const maxSteps = parseInt(document.getElementById('sim-steps').value) || 20;
    
    ui.setStatus('Running simulation...');
    
    try {
        const result = simulate.rollout(
            currentSolution.policy,
            startStateId,
            maxSteps
        );
        
        ui.showSimulation(result);
        ui.setStatus(`Simulation complete: ${result.steps} steps, reward = ${result.totalReward.toFixed(2)}`);
        
        console.log('Simulation result:', result);
        
    } catch (error) {
        console.error('Simulation failed:', error);
        ui.setStatus('Error: ' + error.message);
        alert('Simulation failed:\n' + error.message);
    }
}

function handleExport() {
    try {
        storage.exportJSON();
        ui.setStatus('Exported graph as JSON');
    } catch (error) {
        console.error('Export failed:', error);
        ui.setStatus('Export failed: ' + error.message);
        alert('Export failed:\n' + error.message);
    }
}

function handleImport() {
    const fileInput = document.getElementById('import-file-input');
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        ui.setStatus('Importing...');
        
        try {
            const graph = await storage.importJSON(file);
            
            // Confirm before replacing
            const confirm = window.confirm(
                'Import this graph? This will replace the current graph.\n\n' +
                `States: ${graph.states.length}\n` +
                `Actions: ${graph.actions.length}`
            );
            
            if (confirm) {
                model.loadGraph(graph);
                ui.clearSelection();
                ui.clearSolution();
                ui.clearSimulation();
                currentSolution = null;
                ui.render();
                storage.save();
                ui.setStatus('Imported graph successfully');
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            ui.setStatus('Import failed: ' + error.message);
            alert('Import failed:\n' + error.message);
        }
        
        // Reset file input
        fileInput.value = '';
    };
    
    fileInput.click();
}

function handleReset() {
    const confirm = window.confirm(
        'Reset the entire graph? This cannot be undone.\n\n' +
        'All states, actions, and solutions will be deleted.'
    );
    
    if (confirm) {
        model.init();
        ui.clearSelection();
        ui.clearSolution();
        ui.clearSimulation();
        currentSolution = null;
        ui.render();
        storage.clear();
        ui.setStatus('Graph reset');
    }
}

function handleSettingsChange() {
    const gamma = parseFloat(document.getElementById('gamma').value);
    const epsilon = parseFloat(document.getElementById('epsilon').value);
    
    model.updateSettings({ gamma, epsilon });
    
    // Clear solution if settings changed
    if (currentSolution) {
        ui.clearSolution();
        currentSolution = null;
        ui.setStatus('Settings changed - please re-solve');
    }
    
    storage.autosave();
}

function handleStartStateChange() {
    const startStateId = document.getElementById('start-state').value || null;
    model.updateSettings({ startStateId });
    storage.autosave();
}

// === DEMO/EXAMPLE GRAPH ===

/**
 * Load a demo graph for testing
 */
function loadDemoGraph() {
    model.init();
    
    // Create states
    const start = model.addState(200, 200, 'start');
    const work = model.addState(500, 150, 'work');
    const delay = model.addState(400, 300, 'delay');
    const home = model.addState(500, 350, 'home');
    
    // Set rewards and terminal flags
    model.updateState(work.id, { reward: 45, terminal: true });
    model.updateState(home.id, { reward: 0, terminal: true });
    model.updateState(delay.id, { reward: 0, terminal: false });
    
    // Create actions
    // start -> bike -> work
    const bike = model.addAction(start.id, 'bike', 0);
    model.addOutcome(bike.id, work.id, 1.0);
    
    // start -> car -> work
    const car = model.addAction(start.id, 'car', 0);
    model.addOutcome(car.id, work.id, 1.0);
    
    // start -> train -> delay (0.2) or home (0.8)
    const train1 = model.addAction(start.id, 'train', 5);
    model.addOutcome(train1.id, delay.id, 0.2);
    model.addOutcome(train1.id, home.id, 0.8);
    
    // delay -> train -> home
    const train2 = model.addAction(delay.id, 'train', 2);
    model.addOutcome(train2.id, home.id, 1.0);
    
    // Set start state
    model.updateSettings({ startStateId: start.id });
    
    ui.render();
    storage.save();
    ui.setStatus('Loaded demo graph');
}

// Expose demo loader to console for testing
window.loadDemoGraph = loadDemoGraph;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for potential module use
export { init, loadDemoGraph };
