# Technical Documentation

## Architecture Overview

The MDP Simulator follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                      app.js (Controller)                 │
│  - Event coordination                                    │
│  - Workflow orchestration                                │
└─────────────────────────────────────────────────────────┘
          │              │              │
    ┌─────┴─────┐  ┌────┴────┐  ┌──────┴──────┐
    │   ui.js   │  │model.js │  │  storage.js │
    │ Rendering │  │  State  │  │Persistence  │
    └───────────┘  └─────────┘  └─────────────┘
          │              │
    ┌─────┴─────┐  ┌────┴────┐
    │  mdp.js   │  │simulate │
    │ Algorithms│  │  .js    │
    └───────────┘  └─────────┘
          │
    ┌─────┴─────┐
    │ utils.js  │
    │  Helpers  │
    └───────────┘
```

## Module Responsibilities

### app.js (Main Controller)
- **Purpose**: Application initialization and event coordination
- **Key Functions**:
  - `init()`: Bootstrap application
  - `handleSolve()`: Trigger MDP solving
  - `handleSimulate()`: Run policy simulation
  - `loadDemoGraph()`: Load example graph
- **Dependencies**: All other modules
- **State**: `currentSolution` (cached solver output)

### model.js (Data Model)
- **Purpose**: Graph state management and CRUD operations
- **Data Structure**:
  ```javascript
  {
    version: 1,
    gamma: 0.95,
    epsilon: 0.001,
    states: [{ id, label, x, y, terminal, reward }],
    actions: [{ id, stateId, label, cost, outcomes }],
    startStateId: string
  }
  ```
- **Key Functions**:
  - `addState(x, y, label)`: Create new state
  - `addAction(stateId, label, cost)`: Create new action
  - `addOutcome(actionId, toStateId, prob)`: Add transition
  - `validateGraph()`: Check graph integrity
  - `getReachableStates(startStateId)`: BFS traversal
- **Validation Rules**:
  - Action probabilities must sum to 1.0 (±0.0001)
  - Outcomes must reference valid states
  - Terminal states should have no actions (warning only)

### ui.js (User Interface)
- **Purpose**: SVG rendering and user interaction
- **DOM Elements**:
  - `#canvas`: Main SVG element
  - `#states-layer`: State circles
  - `#edges-layer`: Action arrows
  - `#simulation-layer`: Simulation overlay
- **UI State**:
  ```javascript
  {
    selectedStateId: string,
    selectedActionId: string,
    draggedStateId: string,
    connectMode: boolean,
    connectFromStateId: string,
    solution: object,
    simulationResult: object
  }
  ```
- **Key Functions**:
  - `render()`: Full graph redraw
  - `renderStates()`: Draw state circles
  - `renderEdges()`: Draw action arrows with labels
  - `updateInspector()`: Sync inspector panel with selection
  - `setSolution(solution)`: Display solver results
  - `showSimulation(result)`: Visualize trajectory
- **Event Handling**:
  - Mouse: drag, click, selection
  - Keyboard: delete, escape
  - Form inputs: live update model

### mdp.js (Algorithms)
- **Purpose**: MDP solving algorithms
- **Algorithms**:
  1. **Value Iteration** (primary):
     ```
     Initialize V(s) = 0 ∀s
     Repeat until convergence:
       For each state s:
         V'(s) = max_a [R(s) - cost(a) + γ Σ P(s'|s,a)V(s')]
       V ← V'
     Policy: π(s) = argmax_a [Q(s,a)]
     ```
  2. **Policy Iteration** (optional):
     ```
     Initialize random policy π
     Repeat:
       Evaluate π: solve V^π
       Improve π: π'(s) = argmax_a [Q(s,a)]
     Until π stable
     ```
- **Key Functions**:
  - `valueIteration(options)`: Main solver
  - `calculateQ(state, action, V, gamma)`: Compute Q-value
  - `policyEvaluation(policy, gamma, epsilon)`: Evaluate fixed policy
  - `getQValues(stateId, values, gamma)`: Get all Q(s,a) for state
- **Convergence**:
  - Condition: `max_s |V'(s) - V(s)| < ε`
  - Default ε = 0.001
  - Max iterations = 1000 (configurable)
- **Output**:
  ```javascript
  {
    values: { stateId: number },
    policy: { stateId: actionId },
    iterations: number,
    converged: boolean
  }
  ```

### simulate.js (Simulation)
- **Purpose**: Policy execution and Monte Carlo estimation
- **Key Functions**:
  - `rollout(policy, startStateId, maxSteps)`: Single trajectory
  - `multipleRollouts(policy, startStateId, numRuns)`: Statistics
  - `randomWalk(startStateId, maxSteps)`: Baseline comparison
  - `stateVisitationFrequency(policy, startStateId, numRuns)`: Compute state distribution
- **Simulation Algorithm**:
  ```
  s ← startState
  totalReward ← 0
  For t = 1 to maxSteps:
    If s is terminal: break
    a ← π(s)
    totalReward -= cost(a)
    s' ~ P(·|s,a)  # Sample next state
    totalReward += R(s')
    s ← s'
  ```
- **Output**:
  ```javascript
  {
    trajectory: [{ stateId, state, action, reward, cumulative }],
    totalReward: number,
    steps: number
  }
  ```

### storage.js (Persistence)
- **Purpose**: Save/load graph state
- **Storage Methods**:
  1. **localStorage** (auto-save):
     - Key: `'mdp-simulator-graph'`
     - Debounced save (1s delay)
     - Size limit: ~5MB (browser dependent)
  2. **JSON Export**:
     - Download as `.json` file
     - Timestamp in filename
  3. **JSON Import**:
     - File picker dialog
     - Validation before load
- **Key Functions**:
  - `save()`: Write to localStorage
  - `load()`: Read from localStorage
  - `exportJSON()`: Download file
  - `importJSON(file)`: Parse uploaded file
  - `autosave()`: Debounced save (1000ms)

### utils.js (Utilities)
- **Purpose**: Helper functions and common operations
- **Categories**:
  1. **ID Generation**: `uid(prefix)`
  2. **Math**: `clamp()`, `sum()`, `round()`, `distance()`
  3. **Geometry**: `pointInCircle()`, `getQuadraticControlPoint()`
  4. **Array**: `argmax()`, `shuffle()`, `arraysEqual()`
  5. **Probability**: `weightedChoice()`
  6. **DOM**: `getSVGPoint()`, `debounce()`

## Data Flow

### Creating a State
```
User clicks "Add State"
  ↓
app.handleAddState()
  ↓
ui.addStateAtCenter()
  ↓
model.addState(x, y, label)
  ↓
ui.render()
  ↓
storage.autosave()
```

### Solving MDP
```
User clicks "Solve"
  ↓
app.handleSolve()
  ↓
model.validateGraph()
  ↓
mdp.valueIteration({ gamma, epsilon })
  ├─ Initialize V(s) = 0
  ├─ Iterate until convergence
  │   └─ For each state: V(s) = max_a Q(s,a)
  └─ Extract policy: π(s) = argmax_a Q(s,a)
  ↓
ui.setSolution(solution)
  ↓
ui.render() with optimal actions highlighted
```

### Running Simulation
```
User clicks "Simulate"
  ↓
app.handleSimulate()
  ↓
simulate.rollout(policy, startState, maxSteps)
  ├─ s ← startState
  ├─ Loop:
  │   ├─ a ← policy[s]
  │   ├─ s' ~ outcomes
  │   └─ record trajectory
  └─ return { trajectory, totalReward }
  ↓
ui.showSimulation(result)
  ↓
Draw orange path on canvas
```

## Performance Considerations

### Rendering Optimization
- **SVG Re-creation**: Full render on every change (acceptable for <100 nodes)
- **Potential Optimization**: Incremental updates, virtual DOM
- **Edge Rendering**: O(n²) for multiple edges between node pairs

### Solver Complexity
- **Time**: O(|S| × |A| × |S| × iterations)
  - |S| = number of states
  - |A| = max actions per state
  - iterations ≈ 10-100 typically
- **Space**: O(|S|) for value function
- **Bottleneck**: Large state spaces (>1000 states)

### Storage Limits
- **localStorage**: ~5MB quota (browser dependent)
- **Graph Size**: Hundreds of states feasible, thousands may hit limit
- **Workaround**: Use JSON export for large graphs

## Browser Compatibility

### Required Features
- ES6 Modules (`import`/`export`)
- SVG 1.1
- localStorage
- FileReader API
- Blob API

### Tested Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Known Issues
- Safari: localStorage may be disabled in private mode
- Mobile: Touch events not optimized (use mouse/trackpad)

## Extension Points

### Adding New Algorithms

1. Create function in `mdp.js`:
```javascript
export function qLearning(options) {
  // Implementation
  return { values, policy, ... };
}
```

2. Add button in `index.html`:
```html
<button id="btn-q-learning">Q-Learning</button>
```

3. Wire up in `app.js`:
```javascript
document.getElementById('btn-q-learning')
  .addEventListener('click', handleQLearning);
```

### Custom Visualizations

Modify `ui.js`:

```javascript
function renderStateCustom(state) {
  // Custom SVG elements
  const g = document.createElementNS('...', 'g');
  // Add custom shapes, colors, animations
  return g;
}
```

### Export Formats

Add to `storage.js`:

```javascript
export function exportGraphML() {
  // Convert to GraphML XML
  // Download as .graphml
}
```

## Testing

### Manual Test Cases

1. **Basic CRUD**:
   - Create/delete states
   - Create/delete actions
   - Edit properties
   - Verify inspector updates

2. **Validation**:
   - Set probabilities to 0.5 + 0.4 (should warn)
   - Delete state with incoming actions (should cascade)
   - Create action from terminal state (should warn)

3. **Solving**:
   - Load demo graph
   - Solve with different gamma values
   - Verify optimal policy changes

4. **Simulation**:
   - Run multiple times (stochastic outcomes)
   - Verify total reward calculation
   - Check trajectory matches policy

5. **Persistence**:
   - Export graph
   - Reset
   - Import graph
   - Verify identical state

### Debugging Tools

Browser console commands:

```javascript
// Inspect model
model.getAllStates()
model.validateGraph()

// Run algorithms manually
const solution = mdp.valueIteration({ gamma: 0.9, epsilon: 0.01 })

// Batch simulations
const stats = simulate.multipleRollouts(solution.policy, 'state_id', 1000, 20)

// Access UI state
ui.getSelectedStateId()
```

## Future Enhancements

### Planned Features
- [ ] Undo/redo stack
- [ ] Zoom/pan canvas
- [ ] Snap-to-grid
- [ ] Multi-start state distribution
- [ ] Policy iteration algorithm
- [ ] Q-learning / SARSA
- [ ] Convergence plot
- [ ] State reachability highlighting
- [ ] Custom themes

### Architecture Improvements
- [ ] Incremental rendering (virtual DOM)
- [ ] Web Workers for heavy computation
- [ ] IndexedDB for large graphs
- [ ] TypeScript migration
- [ ] Unit test coverage
- [ ] E2E tests (Playwright)

## Contributing Guidelines

1. **Code Style**:
   - Use ES6+ features
   - JSDoc comments for public functions
   - Consistent naming (camelCase)

2. **File Organization**:
   - One module per concern
   - Export public API explicitly
   - Keep modules < 500 lines

3. **Error Handling**:
   - Validate inputs at boundaries
   - Throw descriptive errors
   - Log to console for debugging

4. **Documentation**:
   - Update README for user-facing changes
   - Update TECHNICAL.md for architecture changes
   - Add examples for new features

---

**Maintainer**: See main README for contact info
**Last Updated**: 2025-11-12
