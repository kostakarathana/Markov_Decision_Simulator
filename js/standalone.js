// MDP Simulator - Standalone Version
// Works directly from file:// URLs - No server needed!
(function() {
'use strict';

// utils.js - Utility functions

let idCounter = 0;

/**
 * Generate a unique ID with optional prefix
 */
function uid(prefix = 'id') {
    return `${prefix}_${++idCounter}_${Date.now()}`;
}

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Sum an array of numbers
 */
function sum(arr) {
    return arr.reduce((acc, val) => acc + val, 0);
}

/**
 * Round a number to specified decimal places
 */
function round(num, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * Assert a condition, throw error if false
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

/**
 * Calculate distance between two points
 */
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Check if point is inside circle
 */
function pointInCircle(px, py, cx, cy, radius) {
    return distance(px, py, cx, cy) <= radius;
}

/**
 * Get SVG point from mouse event
 */
function getSVGPoint(svg, event) {
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/**
 * Deep clone an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate a random color (for debugging)
 */
function randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

/**
 * Calculate control points for a quadratic bezier curve
 * Used for curved edges between states
 */
function getQuadraticControlPoint(x1, y1, x2, y2, curvature = 0.3) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    // Perpendicular vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return { cx: midX, cy: midY };
    
    // Normalize and rotate 90 degrees
    const perpX = -dy / len;
    const perpY = dx / len;
    
    // Offset the midpoint
    const offset = len * curvature;
    return {
        cx: midX + perpX * offset,
        cy: midY + perpY * offset
    };
}

/**
 * Format a number for display
 */
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return '--';
    if (typeof num !== 'number') return String(num);
    return num.toFixed(decimals);
}

/**
 * Check if arrays are equal
 */
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * Weighted random choice
 * choices: array of {value, weight} or {value, prob}
 */
function weightedChoice(choices, rng = Math.random) {
    const total = sum(choices.map(c => c.weight || c.prob || 1));
    let random = rng() * total;
    
    for (const choice of choices) {
        const weight = choice.weight || choice.prob || 1;
        if (random < weight) {
            return choice.value || choice;
        }
        random -= weight;
    }
    
    return choices[choices.length - 1].value || choices[choices.length - 1];
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Find index of max value in array
 */
function argmax(arr) {
    if (arr.length === 0) return -1;
    let maxIdx = 0;
    let maxVal = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > maxVal) {
            maxVal = arr[i];
            maxIdx = i;
        }
    }
    return maxIdx;
}

/**
 * Find all indices with max value (for tie-breaking)
 */
function argmaxAll(arr) {
    if (arr.length === 0) return [];
    const maxVal = Math.max(...arr);
    return arr.map((val, idx) => val === maxVal ? idx : -1)
              .filter(idx => idx !== -1);
}
// model.js - MDP graph data model


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
function initModel() {
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
function getGraph() {
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
function loadGraph(data) {
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
function updateSettings(settings) {
    if (settings.gamma !== undefined) state.gamma = settings.gamma;
    if (settings.epsilon !== undefined) state.epsilon = settings.epsilon;
    if (settings.startStateId !== undefined) state.startStateId = settings.startStateId;
}

/**
 * Get settings
 */
function getSettings() {
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
function addState(x, y, label = 'State') {
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
function removeState(stateId) {
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
function updateState(stateId, props) {
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
function getStateById(stateId) {
    return state.states.find(s => s.id === stateId);
}

/**
 * Get all states
 */
function getAllStates() {
    return [...state.states];
}

// === ACTION OPERATIONS ===

/**
 * Add a new action
 */
function addAction(stateId, label = 'Action', cost = 0) {
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
function removeAction(actionId) {
    const idx = state.actions.findIndex(a => a.id === actionId);
    if (idx === -1) return false;
    
    state.actions.splice(idx, 1);
    return true;
}

/**
 * Update an action's properties
 */
function updateAction(actionId, props) {
    const action = state.actions.find(a => a.id === actionId);
    if (!action) return false;
    
    if (props.label !== undefined) action.label = props.label;
    if (props.cost !== undefined) action.cost = props.cost;
    
    return true;
}

/**
 * Get an action by ID
 */
function getActionById(actionId) {
    return state.actions.find(a => a.id === actionId);
}

/**
 * Get all actions from a state
 */
function getActionsFromState(stateId) {
    return state.actions.filter(a => a.stateId === stateId);
}

/**
 * Get all actions
 */
function getAllActions() {
    return [...state.actions];
}

// === OUTCOME OPERATIONS ===

/**
 * Add an outcome to an action
 */
function addOutcome(actionId, toStateId, prob = 1.0) {
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
function removeOutcome(actionId, toStateId) {
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
function updateOutcome(actionId, toStateId, prob) {
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
function validateGraph() {
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
function validateActionOutcomes(actionId) {
    const action = getActionById(actionId);
    if (!action) return { valid: false, sum: 0 };
    
    const probSum = sum(action.outcomes.map(o => o.prob));
    const valid = Math.abs(probSum - 1.0) < 0.0001;
    
    return { valid, sum: probSum };
}

/**
 * Auto-normalize action outcomes
 */
function normalizeActionOutcomes(actionId) {
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
function getReachableStates(startStateId) {
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
function hasCycles() {
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
// mdp.js - MDP solving algorithms (Value Iteration, Policy Iteration)


/**
 * Value Iteration algorithm
 * @param {Object} options - { gamma, epsilon, maxIterations }
 * @returns {Object} - { values, policy, iterations, converged }
 */
function valueIteration(options = {}) {
    const graph = model.getGraph();
    const gamma = options.gamma !== undefined ? options.gamma : graph.gamma;
    const epsilon = options.epsilon !== undefined ? options.epsilon : graph.epsilon;
    const maxIterations = options.maxIterations || 1000;
    
    // Validate graph
    const validation = model.validateGraph();
    if (!validation.valid) {
        throw new Error('Graph has validation errors: ' + validation.errors.join(', '));
    }
    
    // Initialize values
    const V = {}; // V(s)
    const VNew = {}; // V'(s)
    const policy = {}; // π(s) -> action id
    
    graph.states.forEach(state => {
        V[state.id] = 0;
        VNew[state.id] = 0;
    });
    
    let iterations = 0;
    let converged = false;
    
    // Value iteration loop
    while (iterations < maxIterations) {
        iterations++;
        let maxDelta = 0;
        
        // For each state
        for (const state of graph.states) {
            const stateId = state.id;
            
            // Terminal state: V(s) = R(s)
            if (state.terminal) {
                VNew[stateId] = state.reward;
                continue;
            }
            
            // Get actions from this state
            const actions = model.getActionsFromState(stateId);
            
            // No actions: treat as terminal
            if (actions.length === 0) {
                VNew[stateId] = state.reward;
                continue;
            }
            
            // Calculate Q(s, a) for each action and take max
            let maxQ = -Infinity;
            let bestAction = null;
            
            for (const action of actions) {
                const Q = calculateQ(state, action, V, gamma);
                
                if (Q > maxQ) {
                    maxQ = Q;
                    bestAction = action.id;
                }
            }
            
            VNew[stateId] = maxQ;
            policy[stateId] = bestAction;
            
            // Track convergence
            const delta = Math.abs(VNew[stateId] - V[stateId]);
            if (delta > maxDelta) {
                maxDelta = delta;
            }
        }
        
        // Update V
        for (const stateId in V) {
            V[stateId] = VNew[stateId];
        }
        
        // Check convergence
        if (maxDelta < epsilon) {
            converged = true;
            break;
        }
    }
    
    return {
        values: V,
        policy: policy,
        iterations: iterations,
        converged: converged
    };
}

/**
 * Calculate Q(s, a) = R(s) - cost(a) + gamma * Σ P(s'|s,a) * V(s')
 */
function calculateQ(state, action, V, gamma) {
    // Immediate reward/cost
    let Q = state.reward - action.cost;
    
    // Expected future value
    let expectedValue = 0;
    for (const outcome of action.outcomes) {
        const nextValue = V[outcome.toStateId] || 0;
        expectedValue += outcome.prob * nextValue;
    }
    
    Q += gamma * expectedValue;
    
    return Q;
}

/**
 * Policy Iteration algorithm (optional, more complex)
 * @param {Object} options - { gamma, epsilon, maxIterations }
 * @returns {Object} - { values, policy, iterations, converged }
 */
function policyIteration(options = {}) {
    const graph = model.getGraph();
    const gamma = options.gamma !== undefined ? options.gamma : graph.gamma;
    const epsilon = options.epsilon !== undefined ? options.epsilon : graph.epsilon;
    const maxIterations = options.maxIterations || 1000;
    const evalMaxIterations = options.evalMaxIterations || 100;
    
    // Validate graph
    const validation = model.validateGraph();
    if (!validation.valid) {
        throw new Error('Graph has validation errors: ' + validation.errors.join(', '));
    }
    
    // Initialize random policy
    const policy = {}; // π(s) -> action id
    graph.states.forEach(state => {
        const actions = model.getActionsFromState(state.id);
        if (actions.length > 0) {
            policy[state.id] = actions[0].id;
        }
    });
    
    let iterations = 0;
    let converged = false;
    
    while (iterations < maxIterations) {
        iterations++;
        
        // Policy Evaluation
        const V = policyEvaluation(policy, gamma, epsilon, evalMaxIterations);
        
        // Policy Improvement
        let policyStable = true;
        
        for (const state of graph.states) {
            if (state.terminal) continue;
            
            const actions = model.getActionsFromState(state.id);
            if (actions.length === 0) continue;
            
            const oldAction = policy[state.id];
            
            // Find best action
            let maxQ = -Infinity;
            let bestAction = null;
            
            for (const action of actions) {
                const Q = calculateQ(state, action, V, gamma);
                if (Q > maxQ) {
                    maxQ = Q;
                    bestAction = action.id;
                }
            }
            
            policy[state.id] = bestAction;
            
            if (oldAction !== bestAction) {
                policyStable = false;
            }
        }
        
        if (policyStable) {
            converged = true;
            // Do final evaluation to get accurate values
            const finalV = policyEvaluation(policy, gamma, epsilon, evalMaxIterations);
            return {
                values: finalV,
                policy: policy,
                iterations: iterations,
                converged: true
            };
        }
    }
    
    // Final evaluation even if not converged
    const V = policyEvaluation(policy, gamma, epsilon, evalMaxIterations);
    
    return {
        values: V,
        policy: policy,
        iterations: iterations,
        converged: false
    };
}

/**
 * Policy Evaluation: compute V^π for a given policy π
 */
function policyEvaluation(policy, gamma, epsilon, maxIterations) {
    const graph = model.getGraph();
    const V = {};
    const VNew = {};
    
    graph.states.forEach(state => {
        V[state.id] = 0;
        VNew[state.id] = 0;
    });
    
    for (let i = 0; i < maxIterations; i++) {
        let maxDelta = 0;
        
        for (const state of graph.states) {
            const stateId = state.id;
            
            if (state.terminal) {
                VNew[stateId] = state.reward;
                continue;
            }
            
            const actionId = policy[stateId];
            if (!actionId) {
                VNew[stateId] = state.reward;
                continue;
            }
            
            const action = model.getActionById(actionId);
            if (!action) {
                VNew[stateId] = state.reward;
                continue;
            }
            
            VNew[stateId] = calculateQ(state, action, V, gamma);
            
            const delta = Math.abs(VNew[stateId] - V[stateId]);
            if (delta > maxDelta) {
                maxDelta = delta;
            }
        }
        
        for (const stateId in V) {
            V[stateId] = VNew[stateId];
        }
        
        if (maxDelta < epsilon) {
            break;
        }
    }
    
    return V;
}

/**
 * Get Q-values for all actions in a state
 */
function getQValues(stateId, values, gamma) {
    const state = model.getStateById(stateId);
    if (!state) return {};
    
    const actions = model.getActionsFromState(stateId);
    const qValues = {};
    
    actions.forEach(action => {
        qValues[action.id] = calculateQ(state, action, values, gamma);
    });
    
    return qValues;
}

/**
 * Get the optimal action for a state given values
 */
function getOptimalAction(stateId, values, gamma) {
    const qValues = getQValues(stateId, values, gamma);
    const actionIds = Object.keys(qValues);
    
    if (actionIds.length === 0) return null;
    
    let bestActionId = actionIds[0];
    let bestQ = qValues[bestActionId];
    
    for (let i = 1; i < actionIds.length; i++) {
        if (qValues[actionIds[i]] > bestQ) {
            bestQ = qValues[actionIds[i]];
            bestActionId = actionIds[i];
        }
    }
    
    return bestActionId;
}

/**
 * Compute expected value of a policy from a start state
 */
function evaluatePolicy(policy, startStateId, gamma, horizon = 100) {
    const state = model.getStateById(startStateId);
    if (!state) return 0;
    
    let totalValue = 0;
    let currentStateId = startStateId;
    let discount = 1;
    
    for (let step = 0; step < horizon; step++) {
        const currentState = model.getStateById(currentStateId);
        if (!currentState) break;
        
        // Add state reward
        totalValue += discount * currentState.reward;
        
        if (currentState.terminal) break;
        
        const actionId = policy[currentStateId];
        if (!actionId) break;
        
        const action = model.getActionById(actionId);
        if (!action) break;
        
        // Subtract action cost
        totalValue -= discount * action.cost;
        
        // Sample next state (take first outcome for deterministic eval, or expected value)
        if (action.outcomes.length === 0) break;
        
        // For evaluation, take expected next state
        // In practice, we'd need to do this recursively or via sampling
        // For simplicity, just take the most likely outcome
        let mostLikely = action.outcomes[0];
        for (const outcome of action.outcomes) {
            if (outcome.prob > mostLikely.prob) {
                mostLikely = outcome;
            }
        }
        
        currentStateId = mostLikely.toStateId;
        discount *= gamma;
    }
    
    return totalValue;
}
// simulate.js - Simulation and rollout for MDP policies


/**
 * Rollout a policy from a start state
 * @param {Object} policy - Policy object (state -> action mapping)
 * @param {string} startStateId - Starting state ID
 * @param {number} maxSteps - Maximum number of steps
 * @param {Function} rng - Random number generator (default: Math.random)
 * @returns {Object} - { trajectory, totalReward, steps }
 */
function rollout(policy, startStateId, maxSteps = 20, rng = Math.random) {
    const trajectory = [];
    let totalReward = 0;
    let currentStateId = startStateId;
    let steps = 0;
    
    // Check if start state exists
    const startState = model.getStateById(startStateId);
    if (!startState) {
        return {
            trajectory: [],
            totalReward: 0,
            steps: 0,
            error: 'Start state not found'
        };
    }
    
    // Add initial state to trajectory
    trajectory.push({
        stateId: currentStateId,
        state: startState.label,
        action: null,
        reward: startState.reward,
        cumulative: startState.reward
    });
    
    totalReward += startState.reward;
    
    // Simulate steps
    while (steps < maxSteps) {
        const currentState = model.getStateById(currentStateId);
        
        if (!currentState) {
            trajectory.push({
                stateId: null,
                state: 'ERROR',
                action: null,
                reward: 0,
                cumulative: totalReward,
                error: 'State not found'
            });
            break;
        }
        
        // Check if terminal
        if (currentState.terminal) {
            break;
        }
        
        // Get action from policy
        const actionId = policy[currentStateId];
        if (!actionId) {
            // No action in policy, treat as terminal
            break;
        }
        
        const action = model.getActionById(actionId);
        if (!action) {
            trajectory.push({
                stateId: currentStateId,
                state: currentState.label,
                action: 'ERROR',
                reward: 0,
                cumulative: totalReward,
                error: 'Action not found'
            });
            break;
        }
        
        // Check if action has outcomes
        if (action.outcomes.length === 0) {
            trajectory.push({
                stateId: currentStateId,
                state: currentState.label,
                action: action.label,
                reward: -action.cost,
                cumulative: totalReward - action.cost,
                error: 'No outcomes for action'
            });
            totalReward -= action.cost;
            break;
        }
        
        // Apply action cost
        totalReward -= action.cost;
        
        // Sample next state from outcomes
        const nextStateId = sampleOutcome(action.outcomes, rng);
        const nextState = model.getStateById(nextStateId);
        
        if (!nextState) {
            trajectory.push({
                stateId: currentStateId,
                state: currentState.label,
                action: action.label,
                reward: -action.cost,
                cumulative: totalReward,
                error: 'Next state not found'
            });
            break;
        }
        
        // Add next state reward
        totalReward += nextState.reward;
        
        // Record step
        trajectory.push({
            stateId: nextStateId,
            state: nextState.label,
            action: action.label,
            reward: nextState.reward - action.cost,
            cumulative: totalReward
        });
        
        // Move to next state
        currentStateId = nextStateId;
        steps++;
    }
    
    return {
        trajectory,
        totalReward,
        steps: trajectory.length - 1
    };
}

/**
 * Sample an outcome based on probabilities
 */
function sampleOutcome(outcomes, rng = Math.random) {
    const random = rng();
    let cumulative = 0;
    
    for (const outcome of outcomes) {
        cumulative += outcome.prob;
        if (random <= cumulative) {
            return outcome.toStateId;
        }
    }
    
    // Fallback to last outcome
    return outcomes[outcomes.length - 1].toStateId;
}

/**
 * Run multiple simulations and compute statistics
 * @param {Object} policy - Policy object
 * @param {string} startStateId - Starting state ID
 * @param {number} numRuns - Number of simulation runs
 * @param {number} maxSteps - Maximum steps per run
 * @returns {Object} - Statistics about the runs
 */
function multipleRollouts(policy, startStateId, numRuns = 100, maxSteps = 20) {
    const results = [];
    
    for (let i = 0; i < numRuns; i++) {
        const result = rollout(policy, startStateId, maxSteps);
        results.push(result);
    }
    
    // Compute statistics
    const rewards = results.map(r => r.totalReward);
    const steps = results.map(r => r.steps);
    
    const avgReward = rewards.reduce((a, b) => a + b, 0) / numRuns;
    const minReward = Math.min(...rewards);
    const maxReward = Math.max(...rewards);
    
    const avgSteps = steps.reduce((a, b) => a + b, 0) / numRuns;
    const minSteps = Math.min(...steps);
    const maxSteps_actual = Math.max(...steps);
    
    // Standard deviation
    const variance = rewards.reduce((sum, r) => sum + Math.pow(r - avgReward, 2), 0) / numRuns;
    const stdDev = Math.sqrt(variance);
    
    return {
        numRuns,
        avgReward,
        minReward,
        maxReward,
        stdDev,
        avgSteps,
        minSteps,
        maxSteps: maxSteps_actual,
        results
    };
}

/**
 * Simulate random walk (no policy, random actions)
 * @param {string} startStateId - Starting state ID
 * @param {number} maxSteps - Maximum number of steps
 * @param {Function} rng - Random number generator
 * @returns {Object} - Trajectory and total reward
 */
function randomWalk(startStateId, maxSteps = 20, rng = Math.random) {
    const trajectory = [];
    let totalReward = 0;
    let currentStateId = startStateId;
    let steps = 0;
    
    const startState = model.getStateById(startStateId);
    if (!startState) {
        return { trajectory: [], totalReward: 0, steps: 0 };
    }
    
    trajectory.push({
        stateId: currentStateId,
        state: startState.label,
        action: null,
        reward: startState.reward,
        cumulative: startState.reward
    });
    
    totalReward += startState.reward;
    
    while (steps < maxSteps) {
        const currentState = model.getStateById(currentStateId);
        
        if (!currentState || currentState.terminal) {
            break;
        }
        
        const actions = model.getActionsFromState(currentStateId);
        if (actions.length === 0) {
            break;
        }
        
        // Pick random action
        const actionIdx = Math.floor(rng() * actions.length);
        const action = actions[actionIdx];
        
        if (action.outcomes.length === 0) {
            break;
        }
        
        totalReward -= action.cost;
        
        const nextStateId = sampleOutcome(action.outcomes, rng);
        const nextState = model.getStateById(nextStateId);
        
        if (!nextState) break;
        
        totalReward += nextState.reward;
        
        trajectory.push({
            stateId: nextStateId,
            state: nextState.label,
            action: action.label,
            reward: nextState.reward - action.cost,
            cumulative: totalReward
        });
        
        currentStateId = nextStateId;
        steps++;
    }
    
    return {
        trajectory,
        totalReward,
        steps: trajectory.length - 1
    };
}

/**
 * Compute state visitation frequencies from simulations
 * @param {Object} policy - Policy object
 * @param {string} startStateId - Starting state ID
 * @param {number} numRuns - Number of simulation runs
 * @param {number} maxSteps - Maximum steps per run
 * @returns {Object} - State visitation counts and frequencies
 */
function stateVisitationFrequency(policy, startStateId, numRuns = 1000, maxSteps = 20) {
    const counts = {};
    const states = model.getAllStates();
    
    // Initialize counts
    states.forEach(state => {
        counts[state.id] = 0;
    });
    
    // Run simulations
    for (let i = 0; i < numRuns; i++) {
        const result = rollout(policy, startStateId, maxSteps);
        
        // Count state visits
        result.trajectory.forEach(step => {
            if (step.stateId && counts[step.stateId] !== undefined) {
                counts[step.stateId]++;
            }
        });
    }
    
    // Convert to frequencies
    const frequencies = {};
    const totalVisits = Object.values(counts).reduce((a, b) => a + b, 0);
    
    for (const stateId in counts) {
        frequencies[stateId] = totalVisits > 0 ? counts[stateId] / totalVisits : 0;
    }
    
    return {
        counts,
        frequencies,
        totalVisits,
        numRuns
    };
}

/**
 * Generate a trajectory as a string for display
 */
function trajectoryToString(trajectory) {
    return trajectory.map((step, idx) => {
        let str = `${idx}. ${step.state}`;
        if (step.action) {
            str += ` --[${step.action}]-->`;
        }
        if (step.reward !== undefined) {
            str += ` (r=${step.reward.toFixed(2)})`;
        }
        return str;
    }).join('\n');
}

/**
 * Evaluate policy by simulation (Monte Carlo estimation)
 * @param {Object} policy - Policy object
 * @param {string} startStateId - Starting state ID
 * @param {number} numRuns - Number of simulation runs
 * @param {number} maxSteps - Maximum steps per run
 * @returns {number} - Average total reward
 */
function evaluatePolicyMonteCarlo(policy, startStateId, numRuns = 1000, maxSteps = 20) {
    const results = multipleRollouts(policy, startStateId, numRuns, maxSteps);
    return results.avgReward;
}
// storage.js - Storage, import/export functionality


const STORAGE_KEY = 'mdp-simulator-graph';
const AUTOSAVE_DELAY = 1000; // ms

/**
 * Save graph to localStorage
 */
function save() {
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
const autosave = debounce(save, AUTOSAVE_DELAY);

/**
 * Load graph from localStorage
 */
function load() {
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
function clear() {
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
function exportJSON() {
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
function importJSON(file) {
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
function exportCSV(solution) {
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
function exportSimulationCSV(simulationResult) {
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
function isLocalStorageAvailable() {
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
function getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }
    return total;
}
// ui.js - UI rendering and interaction logic

    getSVGPoint, 
    pointInCircle, 
    getQuadraticControlPoint, 
    formatNumber, 
    round 

// UI State
const uiState = {
    selectedStateId: null,
    selectedActionId: null,
    draggedStateId: null,
    connectMode: false,
    connectFromStateId: null,
    solution: null, // { values, policy, iterations, converged }
    simulationResult: null
};

// DOM Elements
let svg, statesLayer, edgesLayer, simulationLayer;
const STATE_RADIUS = 30;

/**
 * Initialize the UI
 */
function initUI() {
    svg = document.getElementById('canvas');
    statesLayer = document.getElementById('states-layer');
    edgesLayer = document.getElementById('edges-layer');
    simulationLayer = document.getElementById('simulation-layer');
    
    // Setup event listeners
    svg.addEventListener('mousedown', handleCanvasMouseDown);
    svg.addEventListener('mousemove', handleCanvasMouseMove);
    svg.addEventListener('mouseup', handleCanvasMouseUp);
    svg.addEventListener('click', handleCanvasClick);
    
    // Keyboard
    document.addEventListener('keydown', handleKeyDown);
    
    render();
}

/**
 * Full render of the graph
 */
function render() {
    renderEdges();
    renderStates();
    updateInspector();
    updateStartStateDropdown();
}

/**
 * Render all states
 */
function renderStates() {
    statesLayer.innerHTML = '';
    
    const states = model.getAllStates();
    states.forEach(state => {
        const g = createStateElement(state);
        statesLayer.appendChild(g);
    });
}

/**
 * Create SVG element for a state
 */
function createStateElement(state) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('state-group');
    g.setAttribute('data-state-id', state.id);
    
    if (state.terminal) {
        g.classList.add('terminal');
    }
    
    if (uiState.selectedStateId === state.id) {
        g.classList.add('selected');
    }
    
    // Circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.classList.add('state-circle');
    circle.setAttribute('cx', state.x);
    circle.setAttribute('cy', state.y);
    circle.setAttribute('r', STATE_RADIUS);
    g.appendChild(circle);
    
    // Label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.classList.add('state-label');
    label.setAttribute('x', state.x);
    label.setAttribute('y', state.y);
    label.textContent = state.label;
    g.appendChild(label);
    
    // Value label (if solution exists)
    if (uiState.solution && uiState.solution.values[state.id] !== undefined) {
        const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valueLabel.classList.add('state-value-label');
        valueLabel.setAttribute('x', state.x);
        valueLabel.setAttribute('y', state.y + STATE_RADIUS + 15);
        valueLabel.textContent = `V=${formatNumber(uiState.solution.values[state.id])}`;
        g.appendChild(valueLabel);
    }
    
    // Event listeners
    g.addEventListener('mousedown', (e) => handleStateMouseDown(e, state.id));
    g.addEventListener('click', (e) => handleStateClick(e, state.id));
    
    return g;
}

/**
 * Render all edges (actions)
 */
function renderEdges() {
    edgesLayer.innerHTML = '';
    
    const actions = model.getAllActions();
    
    // Group actions by state pairs to calculate curve offsets
    const edgeGroups = {};
    actions.forEach(action => {
        action.outcomes.forEach(outcome => {
            const key = `${action.stateId}-${outcome.toStateId}`;
            if (!edgeGroups[key]) edgeGroups[key] = [];
            edgeGroups[key].push({ action, outcome });
        });
    });
    
    // Render each action outcome as an edge
    Object.values(edgeGroups).forEach(group => {
        group.forEach((item, index) => {
            const edge = createEdgeElement(item.action, item.outcome, index, group.length);
            edgesLayer.appendChild(edge);
        });
    });
}

/**
 * Create SVG element for an edge (action outcome)
 */
function createEdgeElement(action, outcome, index, total) {
    const fromState = model.getStateById(action.stateId);
    const toState = model.getStateById(outcome.toStateId);
    
    if (!fromState || !toState) return document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-action-id', action.id);
    
    // Calculate curvature for multiple edges
    const curvature = total > 1 ? 0.2 * (index - (total - 1) / 2) : 0;
    
    // Self-loop
    if (fromState.id === toState.id) {
        return createSelfLoopEdge(action, fromState, index);
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('action-edge');
    
    // Check if this is the optimal action
    if (uiState.solution && uiState.solution.policy[action.stateId] === action.id) {
        path.classList.add('optimal');
    }
    
    if (uiState.selectedActionId === action.id) {
        path.classList.add('selected');
    }
    
    // Calculate path
    const { cx, cy } = getQuadraticControlPoint(
        fromState.x, fromState.y,
        toState.x, toState.y,
        curvature
    );
    
    // Adjust start and end points to be on circle edge
    const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
    const startX = fromState.x + Math.cos(angle) * STATE_RADIUS;
    const startY = fromState.y + Math.sin(angle) * STATE_RADIUS;
    
    const endAngle = Math.atan2(cy - toState.y, cx - toState.x);
    const endX = toState.x + Math.cos(endAngle) * STATE_RADIUS;
    const endY = toState.y + Math.sin(endAngle) * STATE_RADIUS;
    
    const pathData = `M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`;
    path.setAttribute('d', pathData);
    
    g.appendChild(path);
    
    // Label
    const labelX = (startX + cx + endX) / 3;
    const labelY = (startY + cy + endY) / 3;
    
    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    labelBg.classList.add('action-label-bg');
    
    const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelText.classList.add('action-label');
    labelText.setAttribute('x', labelX);
    labelText.setAttribute('y', labelY);
    
    // Build label text
    let text = action.label;
    if (action.cost !== 0) text += ` (-${action.cost})`;
    if (action.outcomes.length > 1) {
        text += ` [${round(outcome.prob, 2)}]`;
    }
    labelText.textContent = text;
    
    g.appendChild(labelBg);
    g.appendChild(labelText);
    
    // Position background rect after text is added
    setTimeout(() => {
        const bbox = labelText.getBBox();
        labelBg.setAttribute('x', bbox.x - 2);
        labelBg.setAttribute('y', bbox.y - 2);
        labelBg.setAttribute('width', bbox.width + 4);
        labelBg.setAttribute('height', bbox.height + 4);
    }, 0);
    
    // Event listeners
    path.addEventListener('click', (e) => {
        e.stopPropagation();
        handleActionClick(action.id);
    });
    
    return g;
}

/**
 * Create a self-loop edge
 */
function createSelfLoopEdge(action, state, index) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-action-id', action.id);
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('action-edge');
    
    if (uiState.solution && uiState.solution.policy[state.id] === action.id) {
        path.classList.add('optimal');
    }
    
    if (uiState.selectedActionId === action.id) {
        path.classList.add('selected');
    }
    
    // Self-loop arc
    const offset = 40 + index * 15;
    const startAngle = -Math.PI / 4;
    const endAngle = Math.PI / 4;
    
    const startX = state.x + Math.cos(startAngle) * STATE_RADIUS;
    const startY = state.y + Math.sin(startAngle) * STATE_RADIUS;
    const endX = state.x + Math.cos(endAngle) * STATE_RADIUS;
    const endY = state.y + Math.sin(endAngle) * STATE_RADIUS;
    
    const pathData = `M ${startX} ${startY} Q ${state.x + offset} ${state.y - offset} ${endX} ${endY}`;
    path.setAttribute('d', pathData);
    
    g.appendChild(path);
    
    // Label
    const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelText.classList.add('action-label');
    labelText.setAttribute('x', state.x + offset - 10);
    labelText.setAttribute('y', state.y - offset - 5);
    labelText.textContent = action.label;
    g.appendChild(labelText);
    
    path.addEventListener('click', (e) => {
        e.stopPropagation();
        handleActionClick(action.id);
    });
    
    return g;
}

// === EVENT HANDLERS ===

function handleCanvasMouseDown(e) {
    const point = getSVGPoint(svg, e);
    
    // Check if clicking on a state
    const states = model.getAllStates();
    for (const state of states) {
        if (pointInCircle(point.x, point.y, state.x, state.y, STATE_RADIUS)) {
            return; // Let state handler deal with it
        }
    }
    
    // Clicked on empty canvas
    clearSelection();
    render();
}

function handleCanvasMouseMove(e) {
    if (uiState.draggedStateId) {
        const point = getSVGPoint(svg, e);
        model.updateState(uiState.draggedStateId, { x: point.x, y: point.y });
        render();
    }
}

function handleCanvasMouseUp(e) {
    uiState.draggedStateId = null;
}

function handleCanvasClick(e) {
    // Add state in connect mode or when not clicking on anything
}

function handleStateMouseDown(e, stateId) {
    e.stopPropagation();
    
    if (uiState.connectMode && uiState.connectFromStateId) {
        // Complete connection
        const action = model.addAction(uiState.connectFromStateId, 'action', 0);
        if (action) {
            model.addOutcome(action.id, stateId, 1.0);
            uiState.connectMode = false;
            uiState.connectFromStateId = null;
            selectAction(action.id);
            render();
        }
        return;
    }
    
    uiState.draggedStateId = stateId;
}

function handleStateClick(e, stateId) {
    e.stopPropagation();
    
    if (!uiState.draggedStateId) {
        selectState(stateId);
        render();
    }
}

function handleActionClick(actionId) {
    selectAction(actionId);
    render();
}

function handleKeyDown(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (uiState.selectedStateId) {
            model.removeState(uiState.selectedStateId);
            clearSelection();
            render();
        } else if (uiState.selectedActionId) {
            model.removeAction(uiState.selectedActionId);
            clearSelection();
            render();
        }
    } else if (e.key === 'Escape') {
        clearSelection();
        uiState.connectMode = false;
        uiState.connectFromStateId = null;
        render();
    }
}

// === SELECTION ===

function selectState(stateId) {
    uiState.selectedStateId = stateId;
    uiState.selectedActionId = null;
}

function selectAction(actionId) {
    uiState.selectedActionId = actionId;
    uiState.selectedStateId = null;
}

function clearSelection() {
    uiState.selectedStateId = null;
    uiState.selectedActionId = null;
}

function getSelectedStateId() {
    return uiState.selectedStateId;
}

function getSelectedActionId() {
    return uiState.selectedActionId;
}

// === INSPECTOR ===

function updateInspector() {
    const noSelection = document.getElementById('no-selection');
    const stateInspector = document.getElementById('state-inspector');
    const actionInspector = document.getElementById('action-inspector');
    
    noSelection.style.display = 'none';
    stateInspector.style.display = 'none';
    actionInspector.style.display = 'none';
    
    if (uiState.selectedStateId) {
        showStateInspector(uiState.selectedStateId);
    } else if (uiState.selectedActionId) {
        showActionInspector(uiState.selectedActionId);
    } else {
        noSelection.style.display = 'block';
    }
}

function showStateInspector(stateId) {
    const state = model.getStateById(stateId);
    if (!state) return;
    
    const inspector = document.getElementById('state-inspector');
    inspector.style.display = 'block';
    
    // Set values
    document.getElementById('state-label').value = state.label;
    document.getElementById('state-reward').value = state.reward;
    document.getElementById('state-terminal').checked = state.terminal;
    
    // Actions list
    const actionsList = document.getElementById('state-actions-list');
    actionsList.innerHTML = '';
    const actions = model.getActionsFromState(stateId);
    
    if (actions.length === 0) {
        actionsList.innerHTML = '<p style="color: #999; font-size: 12px;">No actions</p>';
    } else {
        actions.forEach(action => {
            const div = document.createElement('div');
            div.className = 'action-list-item';
            div.textContent = `${action.label} (cost: ${action.cost})`;
            div.addEventListener('click', () => {
                selectAction(action.id);
                render();
            });
            actionsList.appendChild(div);
        });
    }
    
    // Solution info
    const solutionDiv = document.getElementById('state-solution');
    if (uiState.solution && uiState.solution.values[stateId] !== undefined) {
        solutionDiv.style.display = 'block';
        document.getElementById('state-value').textContent = formatNumber(uiState.solution.values[stateId]);
        
        const policyActionId = uiState.solution.policy[stateId];
        if (policyActionId) {
            const policyAction = model.getActionById(policyActionId);
            document.getElementById('state-policy').textContent = policyAction ? policyAction.label : '--';
        } else {
            document.getElementById('state-policy').textContent = '--';
        }
    } else {
        solutionDiv.style.display = 'none';
    }
    
    // Wire up event listeners (remove old ones first)
    const labelInput = document.getElementById('state-label');
    const rewardInput = document.getElementById('state-reward');
    const terminalInput = document.getElementById('state-terminal');
    
    labelInput.oninput = () => {
        model.updateState(stateId, { label: labelInput.value });
        render();
    };
    
    rewardInput.oninput = () => {
        model.updateState(stateId, { reward: parseFloat(rewardInput.value) || 0 });
        render();
    };
    
    terminalInput.onchange = () => {
        model.updateState(stateId, { terminal: terminalInput.checked });
        render();
    };
}

function showActionInspector(actionId) {
    const action = model.getActionById(actionId);
    if (!action) return;
    
    const inspector = document.getElementById('action-inspector');
    inspector.style.display = 'block';
    
    // Set values
    document.getElementById('action-label').value = action.label;
    document.getElementById('action-cost').value = action.cost;
    
    // Wire up event listeners
    const labelInput = document.getElementById('action-label');
    const costInput = document.getElementById('action-cost');
    
    labelInput.oninput = () => {
        model.updateAction(actionId, { label: labelInput.value });
        render();
    };
    
    costInput.oninput = () => {
        model.updateAction(actionId, { cost: parseFloat(costInput.value) || 0 });
        render();
    };
    
    // Outcomes
    renderOutcomesList(actionId);
    
    // Add outcome button
    document.getElementById('btn-add-outcome').onclick = () => {
        const states = model.getAllStates();
        if (states.length > 0) {
            model.addOutcome(actionId, states[0].id, 0);
            renderOutcomesList(actionId);
            render();
        }
    };
}

function renderOutcomesList(actionId) {
    const action = model.getActionById(actionId);
    if (!action) return;
    
    const list = document.getElementById('outcomes-list');
    list.innerHTML = '';
    
    const allStates = model.getAllStates();
    
    action.outcomes.forEach(outcome => {
        const div = document.createElement('div');
        div.className = 'outcome-item';
        
        // State dropdown
        const select = document.createElement('select');
        allStates.forEach(state => {
            const option = document.createElement('option');
            option.value = state.id;
            option.textContent = state.label;
            if (state.id === outcome.toStateId) option.selected = true;
            select.appendChild(option);
        });
        
        select.onchange = () => {
            model.removeOutcome(actionId, outcome.toStateId);
            model.addOutcome(actionId, select.value, outcome.prob);
            renderOutcomesList(actionId);
            render();
        };
        
        // Probability input
        const probInput = document.createElement('input');
        probInput.type = 'number';
        probInput.min = '0';
        probInput.max = '1';
        probInput.step = '0.01';
        probInput.value = outcome.prob;
        
        probInput.oninput = () => {
            model.updateOutcome(actionId, outcome.toStateId, parseFloat(probInput.value) || 0);
            renderOutcomesList(actionId);
        };
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
            model.removeOutcome(actionId, outcome.toStateId);
            renderOutcomesList(actionId);
            render();
        };
        
        div.appendChild(select);
        div.appendChild(probInput);
        div.appendChild(removeBtn);
        list.appendChild(div);
    });
    
    // Validate probabilities
    const validation = model.validateActionOutcomes(actionId);
    const warning = document.getElementById('prob-warning');
    if (!validation.valid) {
        warning.style.display = 'block';
        warning.textContent = `⚠️ Probabilities sum to ${formatNumber(validation.sum)} (should be 1.0)`;
    } else {
        warning.style.display = 'none';
    }
}

function updateStartStateDropdown() {
    const select = document.getElementById('start-state');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">-- Select --</option>';
    
    const states = model.getAllStates();
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state.id;
        option.textContent = state.label;
        select.appendChild(option);
    });
    
    // Restore selection
    const settings = model.getSettings();
    if (settings.startStateId) {
        select.value = settings.startStateId;
    }
}

// === TOOL ACTIONS ===

function addStateAtCenter() {
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const state = model.addState(centerX, centerY, `State ${model.getAllStates().length + 1}`);
    selectState(state.id);
    render();
}

function enterConnectMode() {
    if (uiState.selectedStateId) {
        uiState.connectMode = true;
        uiState.connectFromStateId = uiState.selectedStateId;
        setStatus('Click on target state to create action...');
    } else {
        setStatus('Select a state first, then click Add Action');
    }
}

function deleteSelected() {
    if (uiState.selectedStateId) {
        model.removeState(uiState.selectedStateId);
        clearSelection();
        render();
    } else if (uiState.selectedActionId) {
        model.removeAction(uiState.selectedActionId);
        clearSelection();
        render();
    }
}

// === SOLUTION DISPLAY ===

function setSolution(solution) {
    uiState.solution = solution;
    render();
    
    // Show solution inspector
    const solutionInspector = document.getElementById('solution-inspector');
    solutionInspector.style.display = 'block';
    
    document.getElementById('sol-iterations').textContent = solution.iterations;
    document.getElementById('sol-converged').textContent = solution.converged ? 'Yes' : 'No';
    
    // Value table
    const valueTable = document.getElementById('value-table');
    valueTable.innerHTML = '';
    valueTable.className = 'value-table';
    
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>State</th><th>Value</th><th>Policy</th></tr>';
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    const states = model.getAllStates();
    states.forEach(state => {
        const row = document.createElement('tr');
        
        const stateCell = document.createElement('td');
        stateCell.textContent = state.label;
        
        const valueCell = document.createElement('td');
        valueCell.textContent = formatNumber(solution.values[state.id]);
        
        const policyCell = document.createElement('td');
        const policyActionId = solution.policy[state.id];
        if (policyActionId) {
            const action = model.getActionById(policyActionId);
            policyCell.textContent = action ? action.label : '--';
        } else {
            policyCell.textContent = '--';
        }
        
        row.appendChild(stateCell);
        row.appendChild(valueCell);
        row.appendChild(policyCell);
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    valueTable.appendChild(table);
}

function clearSolution() {
    uiState.solution = null;
    document.getElementById('solution-inspector').style.display = 'none';
    render();
}

// === SIMULATION DISPLAY ===

function showSimulation(result) {
    uiState.simulationResult = result;
    
    // Clear previous simulation
    simulationLayer.innerHTML = '';
    
    // Show simulation inspector
    const simInspector = document.getElementById('simulation-inspector');
    simInspector.style.display = 'block';
    
    document.getElementById('sim-total-reward').textContent = formatNumber(result.totalReward);
    document.getElementById('sim-steps-taken').textContent = result.trajectory.length - 1;
    
    // Trajectory
    const trajectoryDiv = document.getElementById('sim-trajectory');
    trajectoryDiv.innerHTML = '';
    
    result.trajectory.forEach((step, idx) => {
        const div = document.createElement('div');
        div.className = 'trajectory-step';
        
        let text = `${idx}. ${step.state}`;
        if (step.action) text += ` → [${step.action}]`;
        if (step.reward !== undefined) text += ` +${formatNumber(step.reward)}`;
        
        div.textContent = text;
        trajectoryDiv.appendChild(div);
    });
    
    // Draw path on canvas
    if (result.trajectory.length > 1) {
        drawSimulationPath(result.trajectory);
    }
}

function drawSimulationPath(trajectory) {
    // Draw connecting lines between states in trajectory
    for (let i = 0; i < trajectory.length - 1; i++) {
        const fromState = model.getStateById(trajectory[i].stateId);
        const toState = model.getStateById(trajectory[i + 1].stateId);
        
        if (fromState && toState) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.classList.add('simulation-path');
            line.setAttribute('x1', fromState.x);
            line.setAttribute('y1', fromState.y);
            line.setAttribute('x2', toState.x);
            line.setAttribute('y2', toState.y);
            simulationLayer.appendChild(line);
        }
    }
    
    // Mark visited states
    trajectory.forEach((step, idx) => {
        const state = model.getStateById(step.stateId);
        if (state) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.classList.add('simulation-marker');
            circle.setAttribute('cx', state.x);
            circle.setAttribute('cy', state.y);
            circle.setAttribute('r', 5);
            simulationLayer.appendChild(circle);
        }
    });
}

function clearSimulation() {
    uiState.simulationResult = null;
    simulationLayer.innerHTML = '';
    document.getElementById('simulation-inspector').style.display = 'none';
}

// === STATUS ===

function setStatus(message) {
    document.getElementById('status-message').textContent = message;
}
// app.js - Main application controller


// Application state
let currentSolution = null;

// Undo/Redo history
const commandHistory = {
    past: [],
    future: [],
    maxHistory: 50,
    
    saveState() {
        const currentState = model.getGraph();
        if (currentState) {
            this.past.push(deepClone(currentState));
            if (this.past.length > this.maxHistory) {
                this.past.shift();
            }
            this.future = []; // Clear redo stack when new action is taken
        }
    },
    
    undo() {
        if (this.past.length === 0) return false;
        const currentState = model.getGraph();
        this.future.push(deepClone(currentState));
        const previousState = this.past.pop();
        model.loadGraph(previousState);
        ui.render();
        return true;
    },
    
    redo() {
        if (this.future.length === 0) return false;
        const currentState = model.getGraph();
        this.past.push(deepClone(currentState));
        const nextState = this.future.pop();
        model.loadGraph(nextState);
        ui.render();
        return true;
    },
    
    clear() {
        this.past = [];
        this.future = [];
    }
};

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
    // Example buttons
    document.getElementById('btn-example-recycling').addEventListener('click', loadRecyclingExample);
    document.getElementById('btn-example-gridworld').addEventListener('click', loadGridWorldExample);
    document.getElementById('btn-example-health').addEventListener('click', loadHealthExample);
    document.getElementById('btn-new-graph').addEventListener('click', createNewGraph);
    
    // Tool buttons
    document.getElementById('btn-add-state').addEventListener('click', handleAddState);
    document.getElementById('btn-add-action').addEventListener('click', handleAddAction);
    document.getElementById('btn-delete').addEventListener('click', handleDelete);
    document.getElementById('btn-solve').addEventListener('click', handleSolve);
    document.getElementById('btn-simulate').addEventListener('click', handleSimulate);
    document.getElementById('btn-export').addEventListener('click', handleExport);
    document.getElementById('btn-import').addEventListener('click', handleImport);
    
    // Settings
    document.getElementById('gamma').addEventListener('input', handleSettingsChange);
    document.getElementById('epsilon').addEventListener('input', handleSettingsChange);
    document.getElementById('start-state').addEventListener('change', handleStartStateChange);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
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

function handleKeyboardShortcuts(event) {
    // Check if user is typing in an input field
    const isTyping = event.target.tagName === 'INPUT' || 
                     event.target.tagName === 'TEXTAREA' || 
                     event.target.isContentEditable;
    
    // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (commandHistory.undo()) {
            ui.setStatus('Undo');
        }
        return;
    }
    
    // Redo: Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        if (commandHistory.redo()) {
            ui.setStatus('Redo');
        }
        return;
    }
    
    // Redo alternative: Cmd+Y or Ctrl+Y
    if ((event.metaKey || event.ctrlKey) && event.key === 'y') {
        event.preventDefault();
        if (commandHistory.redo()) {
            ui.setStatus('Redo');
        }
        return;
    }
    
    // Prevent Delete key from deleting nodes when typing
    if (event.key === 'Delete' || event.key === 'Backspace') {
        if (isTyping) {
            // Allow normal delete behavior in input fields
            return;
        }
        // Only delete selected node if not typing
        event.preventDefault();
        handleDelete();
    }
}

function handleAddState() {
    commandHistory.saveState();
    ui.addStateAtCenter();
    ui.setStatus('Added new state');
    storage.autosave();
}

function handleAddAction() {
    commandHistory.saveState();
    ui.enterConnectMode();
    storage.autosave();
}

function handleDelete() {
    commandHistory.saveState();
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
// === EXAMPLE GRAPHS ===

/**
 * Load Recycling Robot example
 */
function loadRecyclingExample() {
    model.init();
    
    const high = model.addState(200, 200, 'High Battery');
    const low = model.addState(400, 200, 'Low Battery');
    
    model.updateState(high.id, { reward: 0, terminal: false });
    model.updateState(low.id, { reward: 0, terminal: false });
    
    // High Battery: Search action
    const searchHigh = model.addAction(high.id, 'Search', 0);
    model.addOutcome(searchHigh.id, high.id, 0.7);
    model.addOutcome(searchHigh.id, low.id, 0.3);
    model.updateAction(searchHigh.id, { reward: 3 });
    
    // High Battery: Wait action
    const waitHigh = model.addAction(high.id, 'Wait', 0);
    model.addOutcome(waitHigh.id, high.id, 1.0);
    model.updateAction(waitHigh.id, { reward: 1 });
    
    // Low Battery: Search action
    const searchLow = model.addAction(low.id, 'Search', 0);
    model.addOutcome(searchLow.id, low.id, 0.5);
    model.addOutcome(searchLow.id, high.id, 0.5);
    model.updateAction(searchLow.id, { reward: -3 });
    
    // Low Battery: Recharge action
    const recharge = model.addAction(low.id, 'Recharge', 0);
    model.addOutcome(recharge.id, high.id, 1.0);
    model.updateAction(recharge.id, { reward: 0 });
    
    model.updateSettings({ startStateId: high.id, gamma: 0.9 });
    ui.render();
    storage.save();
    ui.setStatus('Loaded Recycling Robot example');
}

/**
 * Load Grid World example
 */
function loadGridWorldExample() {
    model.init();
    
    const s0 = model.addState(150, 150, 'S0');
    const s1 = model.addState(350, 150, 'S1');
    const s2 = model.addState(150, 350, 'S2');
    const goal = model.addState(350, 350, 'Goal');
    
    model.updateState(s0.id, { reward: 0, terminal: false });
    model.updateState(s1.id, { reward: 0, terminal: false });
    model.updateState(s2.id, { reward: 0, terminal: false });
    model.updateState(goal.id, { reward: 10, terminal: true });
    
    // S0 actions
    const right0 = model.addAction(s0.id, 'right', 0);
    model.addOutcome(right0.id, s1.id, 0.8);
    model.addOutcome(right0.id, s0.id, 0.2);
    
    const down0 = model.addAction(s0.id, 'down', 0);
    model.addOutcome(down0.id, s2.id, 0.8);
    model.addOutcome(down0.id, s0.id, 0.2);
    
    // S1 actions
    const down1 = model.addAction(s1.id, 'down', 0);
    model.addOutcome(down1.id, goal.id, 0.8);
    model.addOutcome(down1.id, s1.id, 0.2);
    
    const left1 = model.addAction(s1.id, 'left', 0);
    model.addOutcome(left1.id, s0.id, 0.8);
    model.addOutcome(left1.id, s1.id, 0.2);
    
    // S2 actions
    const right2 = model.addAction(s2.id, 'right', 0);
    model.addOutcome(right2.id, goal.id, 0.8);
    model.addOutcome(right2.id, s2.id, 0.2);
    
    const up2 = model.addAction(s2.id, 'up', 0);
    model.addOutcome(up2.id, s0.id, 0.8);
    model.addOutcome(up2.id, s2.id, 0.2);
    
    model.updateSettings({ startStateId: s0.id, gamma: 0.9 });
    ui.render();
    storage.save();
    ui.setStatus('Loaded Grid World example');
}

/**
 * Load Health Management example
 */
function loadHealthExample() {
    model.init();
    
    const healthy = model.addState(150, 200, 'Healthy');
    const sick = model.addState(300, 200, 'Sick');
    const dead = model.addState(450, 200, 'Dead');
    
    model.updateState(healthy.id, { reward: 10, terminal: false });
    model.updateState(sick.id, { reward: -5, terminal: false });
    model.updateState(dead.id, { reward: -50, terminal: true });
    
    // Healthy: Exercise
    const exercise = model.addAction(healthy.id, 'Exercise', 1);
    model.addOutcome(exercise.id, healthy.id, 0.95);
    model.addOutcome(exercise.id, sick.id, 0.05);
    
    // Healthy: Relax
    const relax = model.addAction(healthy.id, 'Relax', 0);
    model.addOutcome(relax.id, healthy.id, 0.8);
    model.addOutcome(relax.id, sick.id, 0.2);
    
    // Sick: Doctor
    const doctor = model.addAction(sick.id, 'Doctor', 5);
    model.addOutcome(doctor.id, healthy.id, 0.7);
    model.addOutcome(doctor.id, sick.id, 0.25);
    model.addOutcome(doctor.id, dead.id, 0.05);
    
    // Sick: Rest
    const rest = model.addAction(sick.id, 'Rest', 0);
    model.addOutcome(rest.id, healthy.id, 0.3);
    model.addOutcome(rest.id, sick.id, 0.5);
    model.addOutcome(rest.id, dead.id, 0.2);
    
    model.updateSettings({ startStateId: healthy.id, gamma: 0.95 });
    ui.render();
    storage.save();
    ui.setStatus('Loaded Health Management example');
}

/**
 * Create a new blank graph
 */
function createNewGraph() {
    if (confirm('Create a new blank graph? Current graph will be cleared.')) {
        model.init();
        ui.render();
        storage.save();
        ui.setStatus('Created new graph');
    }
}

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


// ============================================================================
// CREATE NAMESPACE OBJECTS (Restore module structure)
// ============================================================================

const model = {
    graph: null,
    getGraph, loadGraph, init: initModel, validateGraph,
    getStateById, getAllStates, addState, updateState, deleteState: removeState,
    getActionsFromState,
    getSettings, updateSettings,
    addAction, getAllActions, getActionById, removeAction, updateAction,
    addOutcome, removeOutcome, updateOutcome, validateActionOutcomes
};

const ui = {
    svg: null, panOffset: { x: 0, y: 0 }, zoom: 1, isDragging: false,
    dragState: null, selectedState: null, selectedAction: null,
    init: initUI, render, renderStates, addStateAtCenter,
    setStatus, setSolution, deleteSelected, enterConnectMode,
    clearSelection, clearSimulation, clearSolution, showSimulation
};

const mdp = {
    valueIteration, 
    policyIteration, 
    policyEvaluation
};

const simulate = {
    evaluatePolicyMonteCarlo,
    exportSimulationCSV
};

const storage = {
    save, 
    load, 
    exportJSON, 
    importJSON
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expose utilities globally for console debugging
window.mdpDebug = { model, ui, mdp, simulate, storage, commandHistory };
window.loadDemoGraph = loadDemoGraph;
window.loadRecyclingExample = loadRecyclingExample;
window.loadGridWorldExample = loadGridWorldExample;
window.loadHealthExample = loadHealthExample;
window.createNewGraph = createNewGraph;

})(); // End IIFE
