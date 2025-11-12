// simulate.js - Simulation and rollout for MDP policies

import { weightedChoice } from './utils.js';
import * as model from './model.js';

/**
 * Rollout a policy from a start state
 * @param {Object} policy - Policy object (state -> action mapping)
 * @param {string} startStateId - Starting state ID
 * @param {number} maxSteps - Maximum number of steps
 * @param {Function} rng - Random number generator (default: Math.random)
 * @returns {Object} - { trajectory, totalReward, steps }
 */
export function rollout(policy, startStateId, maxSteps = 20, rng = Math.random) {
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
export function multipleRollouts(policy, startStateId, numRuns = 100, maxSteps = 20) {
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
export function randomWalk(startStateId, maxSteps = 20, rng = Math.random) {
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
export function stateVisitationFrequency(policy, startStateId, numRuns = 1000, maxSteps = 20) {
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
export function trajectoryToString(trajectory) {
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
export function evaluatePolicyMonteCarlo(policy, startStateId, numRuns = 1000, maxSteps = 20) {
    const results = multipleRollouts(policy, startStateId, numRuns, maxSteps);
    return results.avgReward;
}
