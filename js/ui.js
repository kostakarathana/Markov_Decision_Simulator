// ui.js - UI rendering and interaction logic

import { 
    getSVGPoint, 
    pointInCircle, 
    getQuadraticControlPoint, 
    formatNumber, 
    round 
} from './utils.js';
import * as model from './model.js';

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
export function init() {
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
export function render() {
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

export function clearSelection() {
    uiState.selectedStateId = null;
    uiState.selectedActionId = null;
}

export function getSelectedStateId() {
    return uiState.selectedStateId;
}

export function getSelectedActionId() {
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

export function addStateAtCenter() {
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const state = model.addState(centerX, centerY, `State ${model.getAllStates().length + 1}`);
    selectState(state.id);
    render();
}

export function enterConnectMode() {
    if (uiState.selectedStateId) {
        uiState.connectMode = true;
        uiState.connectFromStateId = uiState.selectedStateId;
        setStatus('Click on target state to create action...');
    } else {
        setStatus('Select a state first, then click Add Action');
    }
}

export function deleteSelected() {
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

export function setSolution(solution) {
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

export function clearSolution() {
    uiState.solution = null;
    document.getElementById('solution-inspector').style.display = 'none';
    render();
}

// === SIMULATION DISPLAY ===

export function showSimulation(result) {
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

export function clearSimulation() {
    uiState.simulationResult = null;
    simulationLayer.innerHTML = '';
    document.getElementById('simulation-inspector').style.display = 'none';
}

// === STATUS ===

export function setStatus(message) {
    document.getElementById('status-message').textContent = message;
}
