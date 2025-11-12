// model.js - MDP graph data model

import { uid, sum, round } from './utils.js';

// Global state
const state = {
    version: 1,
    gamma: 0.95,
    epsilon: 0.001,
    states: [],
    actions: [],
    startStateId: null
};

/**
 * Initialize or reset the model
 */
export function init() {
    state.version = 1;
    state.gamma = 0.95;
    state.epsilon = 0.001;
    state.states = [];
    state.actions = [];
    state.startStateId = null;
}

/**
 * Get the entire graph state
 */
export function getGraph() {
    return {
        version: state.version,
        gamma: state.gamma,
        epsilon: state.epsilon,
        states: [...state.states],
        actions: [...state.actions],
        startStateId: state.startStateId
    };
}

/**
 * Load a graph from JSON
 */
export function loadGraph(data) {
    state.version = data.version || 1;
    state.gamma = data.gamma || 0.95;
    state.epsilon = data.epsilon || 0.001;
    state.states = data.states || [];
    state.actions = data.actions || [];
    state.startStateId = data.startStateId || null;
}

/**
 * Update settings
 */
export function updateSettings(settings) {
    if (settings.gamma !== undefined) state.gamma = settings.gamma;
    if (settings.epsilon !== undefined) state.epsilon = settings.epsilon;
    if (settings.startStateId !== undefined) state.startStateId = settings.startStateId;
}

/**
 * Get settings
 */
export function getSettings() {
    return {
        gamma: state.gamma,
        epsilon: state.epsilon,
        startStateId: state.startStateId
    };
}

// === STATE OPERATIONS ===

/**
 * Add a new state
 */
export function addState(x, y, label = 'State') {
    const newState = {
        id: uid('state'),
        label: label,
        x: x,
        y: y,
        terminal: false,
        reward: 0
    };
    state.states.push(newState);
    return newState;
}

/**
 * Remove a state and all associated actions
 */
export function removeState(stateId) {
    // Remove the state
    const idx = state.states.findIndex(s => s.id === stateId);
    if (idx === -1) return false;
    
    state.states.splice(idx, 1);
    
    // Remove all actions from this state
    state.actions = state.actions.filter(a => a.stateId !== stateId);
    
    // Remove all action outcomes pointing to this state
    state.actions.forEach(action => {
        action.outcomes = action.outcomes.filter(o => o.toStateId !== stateId);
    });
    
    // Remove actions with no outcomes
    state.actions = state.actions.filter(a => a.outcomes.length > 0);
    
    // Clear start state if it was this state
    if (state.startStateId === stateId) {
        state.startStateId = null;
    }
    
    return true;
}

/**
 * Update a state's properties
 */
export function updateState(stateId, props) {
    const stateObj = state.states.find(s => s.id === stateId);
    if (!stateObj) return false;
    
    if (props.label !== undefined) stateObj.label = props.label;
    if (props.x !== undefined) stateObj.x = props.x;
    if (props.y !== undefined) stateObj.y = props.y;
    if (props.terminal !== undefined) stateObj.terminal = props.terminal;
    if (props.reward !== undefined) stateObj.reward = props.reward;
    
    return true;
}

/**
 * Get a state by ID
 */
export function getStateById(stateId) {
    return state.states.find(s => s.id === stateId);
}

/**
 * Get all states
 */
export function getAllStates() {
    return [...state.states];
}

// === ACTION OPERATIONS ===

/**
 * Add a new action
 */
export function addAction(stateId, label = 'Action', cost = 0) {
    const stateObj = getStateById(stateId);
    if (!stateObj) return null;
    
    const newAction = {
        id: uid('action'),
        stateId: stateId,
        label: label,
        cost: cost,
        outcomes: []
    };
    state.actions.push(newAction);
    return newAction;
}

/**
 * Remove an action
 */
export function removeAction(actionId) {
    const idx = state.actions.findIndex(a => a.id === actionId);
    if (idx === -1) return false;
    
    state.actions.splice(idx, 1);
    return true;
}

/**
 * Update an action's properties
 */
export function updateAction(actionId, props) {
    const action = state.actions.find(a => a.id === actionId);
    if (!action) return false;
    
    if (props.label !== undefined) action.label = props.label;
    if (props.cost !== undefined) action.cost = props.cost;
    
    return true;
}

/**
 * Get an action by ID
 */
export function getActionById(actionId) {
    return state.actions.find(a => a.id === actionId);
}

/**
 * Get all actions from a state
 */
export function getActionsFromState(stateId) {
    return state.actions.filter(a => a.stateId === stateId);
}

/**
 * Get all actions
 */
export function getAllActions() {
    return [...state.actions];
}

// === OUTCOME OPERATIONS ===

/**
 * Add an outcome to an action
 */
export function addOutcome(actionId, toStateId, prob = 1.0) {
    const action = getActionById(actionId);
    if (!action) return false;
    
    const toState = getStateById(toStateId);
    if (!toState) return false;
    
    // Check if outcome already exists
    const existing = action.outcomes.find(o => o.toStateId === toStateId);
    if (existing) return false;
    
    action.outcomes.push({ toStateId, prob });
    return true;
}

/**
 * Remove an outcome from an action
 */
export function removeOutcome(actionId, toStateId) {
    const action = getActionById(actionId);
    if (!action) return false;
    
    const idx = action.outcomes.findIndex(o => o.toStateId === toStateId);
    if (idx === -1) return false;
    
    action.outcomes.splice(idx, 1);
    return true;
}

/**
 * Update an outcome's probability
 */
export function updateOutcome(actionId, toStateId, prob) {
    const action = getActionById(actionId);
    if (!action) return false;
    
    const outcome = action.outcomes.find(o => o.toStateId === toStateId);
    if (!outcome) return false;
    
    outcome.prob = prob;
    return true;
}

// === VALIDATION ===

/**
 * Validate the entire graph
 */
export function validateGraph() {
    const errors = [];
    const warnings = [];
    
    // Check each action's outcomes
    state.actions.forEach(action => {
        if (action.outcomes.length === 0) {
            warnings.push(`Action "${action.label}" has no outcomes`);
        }
        
        const probSum = sum(action.outcomes.map(o => o.prob));
        if (Math.abs(probSum - 1.0) > 0.0001) {
            errors.push(`Action "${action.label}" probabilities sum to ${round(probSum, 4)} (should be 1.0)`);
        }
        
        // Check if outcomes point to valid states
        action.outcomes.forEach(outcome => {
            if (!getStateById(outcome.toStateId)) {
                errors.push(`Action "${action.label}" has outcome pointing to invalid state`);
            }
        });
    });
    
    // Check for terminal states with actions
    state.states.forEach(s => {
        if (s.terminal) {
            const actions = getActionsFromState(s.id);
            if (actions.length > 0) {
                warnings.push(`Terminal state "${s.label}" has ${actions.length} action(s)`);
            }
        }
    });
    
    // Check for non-terminal states with no actions
    state.states.forEach(s => {
        if (!s.terminal) {
            const actions = getActionsFromState(s.id);
            if (actions.length === 0) {
                warnings.push(`Non-terminal state "${s.label}" has no actions (will be treated as terminal)`);
            }
        }
    });
    
    return { errors, warnings, valid: errors.length === 0 };
}

/**
 * Validate a specific action's outcomes
 */
export function validateActionOutcomes(actionId) {
    const action = getActionById(actionId);
    if (!action) return { valid: false, sum: 0 };
    
    const probSum = sum(action.outcomes.map(o => o.prob));
    const valid = Math.abs(probSum - 1.0) < 0.0001;
    
    return { valid, sum: probSum };
}

/**
 * Auto-normalize action outcomes
 */
export function normalizeActionOutcomes(actionId) {
    const action = getActionById(actionId);
    if (!action || action.outcomes.length === 0) return false;
    
    const total = sum(action.outcomes.map(o => o.prob));
    if (total === 0) {
        // Equal distribution
        action.outcomes.forEach(o => {
            o.prob = 1.0 / action.outcomes.length;
        });
    } else {
        action.outcomes.forEach(o => {
            o.prob = o.prob / total;
        });
    }
    
    return true;
}

/**
 * Get reachable states from a starting state
 */
export function getReachableStates(startStateId) {
    if (!startStateId) return new Set();
    
    const reachable = new Set([startStateId]);
    const queue = [startStateId];
    
    while (queue.length > 0) {
        const currentId = queue.shift();
        const actions = getActionsFromState(currentId);
        
        actions.forEach(action => {
            action.outcomes.forEach(outcome => {
                if (!reachable.has(outcome.toStateId)) {
                    reachable.add(outcome.toStateId);
                    queue.push(outcome.toStateId);
                }
            });
        });
    }
    
    return reachable;
}

/**
 * Check if graph has cycles
 */
export function hasCycles() {
    const visited = new Set();
    const recStack = new Set();
    
    function dfs(stateId) {
        visited.add(stateId);
        recStack.add(stateId);
        
        const actions = getActionsFromState(stateId);
        for (const action of actions) {
            for (const outcome of action.outcomes) {
                if (!visited.has(outcome.toStateId)) {
                    if (dfs(outcome.toStateId)) return true;
                } else if (recStack.has(outcome.toStateId)) {
                    return true;
                }
            }
        }
        
        recStack.delete(stateId);
        return false;
    }
    
    for (const state of state.states) {
        if (!visited.has(state.id)) {
            if (dfs(state.id)) return true;
        }
    }
    
    return false;
}
