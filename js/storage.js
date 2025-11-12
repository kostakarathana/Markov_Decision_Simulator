// storage.js - Storage, import/export functionality

import { debounce } from './utils.js';
import * as model from './model.js';

const STORAGE_KEY = 'mdp-simulator-graph';
const AUTOSAVE_DELAY = 1000; // ms

/**
 * Save graph to localStorage
 */
export function save() {
    try {
        const graph = model.getGraph();
        const json = JSON.stringify(graph);
        localStorage.setItem(STORAGE_KEY, json);
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
    }
}

/**
 * Debounced autosave
 */
export const autosave = debounce(save, AUTOSAVE_DELAY);

/**
 * Load graph from localStorage
 */
export function load() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return null;
        
        const graph = JSON.parse(json);
        return graph;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return null;
    }
}

/**
 * Clear localStorage
 */
export function clear() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Failed to clear localStorage:', error);
        return false;
    }
}

/**
 * Export graph as JSON file
 */
export function exportJSON() {
    const graph = model.getGraph();
    const json = JSON.stringify(graph, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `mdp-graph-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Import graph from JSON file
 * @param {File} file - File object
 * @returns {Promise<Object>} - Parsed graph object
 */
export function importJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const json = e.target.result;
                const graph = JSON.parse(json);
                
                // Basic validation
                if (!graph.states || !Array.isArray(graph.states)) {
                    throw new Error('Invalid graph: missing or invalid states array');
                }
                
                if (!graph.actions || !Array.isArray(graph.actions)) {
                    throw new Error('Invalid graph: missing or invalid actions array');
                }
                
                resolve(graph);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * Export graph as CSV (state-value table)
 */
export function exportCSV(solution) {
    if (!solution) {
        console.warn('No solution to export');
        return;
    }
    
    const states = model.getAllStates();
    
    // Build CSV
    let csv = 'State,Value,Policy\n';
    
    states.forEach(state => {
        const value = solution.values[state.id] !== undefined 
            ? solution.values[state.id].toFixed(4) 
            : 'N/A';
        
        const policyActionId = solution.policy[state.id];
        let policyLabel = 'N/A';
        
        if (policyActionId) {
            const action = model.getActionById(policyActionId);
            if (action) {
                policyLabel = action.label;
            }
        }
        
        csv += `"${state.label}",${value},"${policyLabel}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `mdp-solution-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Export simulation results as CSV
 */
export function exportSimulationCSV(simulationResult) {
    if (!simulationResult || !simulationResult.trajectory) {
        console.warn('No simulation result to export');
        return;
    }
    
    // Build CSV
    let csv = 'Step,State,Action,Reward,Cumulative\n';
    
    simulationResult.trajectory.forEach((step, idx) => {
        const action = step.action || 'N/A';
        const reward = step.reward !== undefined ? step.reward.toFixed(2) : 'N/A';
        const cumulative = step.cumulative !== undefined ? step.cumulative.toFixed(2) : 'N/A';
        
        csv += `${idx},"${step.state}","${action}",${reward},${cumulative}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `mdp-simulation-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable() {
    try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get storage size (approximate)
 */
export function getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }
    return total;
}
