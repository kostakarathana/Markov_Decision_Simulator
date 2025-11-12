// mdp.js - MDP solving algorithms (Value Iteration, Policy Iteration)

import { sum, round } from './utils.js';
import * as model from './model.js';

/**
 * Value Iteration algorithm
 * @param {Object} options - { gamma, epsilon, maxIterations }
 * @returns {Object} - { values, policy, iterations, converged }
 */
export function valueIteration(options = {}) {
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
export function policyIteration(options = {}) {
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
export function getQValues(stateId, values, gamma) {
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
export function getOptimalAction(stateId, values, gamma) {
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
export function evaluatePolicy(policy, startStateId, gamma, horizon = 100) {
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
