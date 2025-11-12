# MDP Simulator

A browser-based Markov Decision Process (MDP) simulator built with vanilla HTML, CSS, and JavaScript. Draw MDP graphs, solve for optimal policies using Value Iteration, and simulate policy execution.

## Features

- **Interactive Graph Editor**: Drag-and-drop state creation, visual action connections
- **MDP Solver**: Value Iteration algorithm with configurable discount (γ) and convergence (ε)
- **Policy Simulation**: Monte Carlo rollout of computed policies
- **Import/Export**: Save and load graphs as JSON
- **Auto-save**: Automatic localStorage persistence
- **Visual Feedback**: Optimal actions highlighted, value labels displayed

## Getting Started

### Quick Start

**Note**: This app uses ES6 modules which have CORS restrictions in browsers.  
**Important**: The server is ONLY for serving static files - all MDP logic runs 100% in your browser! See [WHY_SERVER.md](WHY_SERVER.md) for details.

#### Recommended: Use a Simple Web Server

The easiest way is to use Python's built-in server:

```bash
# In the project directory, run:
python3 server.py

# Then open your browser to:
# http://localhost:8000
```

**Why a server?** Browsers block ES6 modules (`import`/`export`) from `file://` URLs for security. The Python script is just a **static file server** - it does NO computation. All MDP solving, simulation, and storage happens entirely in JavaScript in your browser.

#### Alternative: Disable Browser Security (Not Recommended)

You can run Chrome with `--allow-file-access-from-files` but this is a security risk.

#### Alternative Browsers

Firefox sometimes allows file:// module loading if you:
1. Type `about:config` in address bar
2. Set `security.fileuri.strict_origin_policy` to `false`
3. Open `index.html`

### Loading the Demo

Open the browser console (F12) and run:
```javascript
loadDemoGraph()
```

This loads the example from the brief:
- **start** → bike → **work** (reward: 45)
- **start** → car → **work** (reward: 45)
- **start** → train (cost: 5) → **delay** (20%) or **home** (80%)
- **delay** → train (cost: 2) → **home** (reward: 0)

## Usage

### Creating States

1. Click **Add State** to create a new state at canvas center
2. Drag states to reposition them
3. Click a state to select and edit in the inspector
4. Set label, reward, and terminal flag

### Creating Actions

1. Select a source state
2. Click **Add Action**
3. Click the target state
4. Edit action label and cost in the inspector
5. Add/modify outcomes with probabilities (must sum to 1.0)

### Solving the MDP

1. Set **gamma** (discount factor, 0-1)
2. Set **epsilon** (convergence threshold)
3. Select a **Start State**
4. Click **Solve**
5. Optimal actions highlighted in green
6. State values shown below each state

### Simulating

1. After solving, set **Sim Steps** (max trajectory length)
2. Click **Simulate**
3. View trajectory in right panel
4. Orange path shows visited states

### Keyboard Shortcuts

- **Delete/Backspace**: Delete selected state or action
- **Escape**: Clear selection / cancel connect mode

## File Structure

```
/mdp-simulator
  index.html          # Main HTML structure
  /css
    styles.css        # All styling
  /js
    app.js            # Main controller, event wiring
    ui.js             # SVG rendering, drag/drop, inspector
    model.js          # Graph data model, CRUD operations
    mdp.js            # Value Iteration & Policy Iteration
    simulate.js       # Policy rollout, Monte Carlo simulation
    storage.js        # localStorage, JSON import/export
    utils.js          # Helper functions
```

## Data Model

### JSON Schema

```json
{
  "version": 1,
  "gamma": 0.95,
  "epsilon": 0.001,
  "startStateId": "state_1_...",
  "states": [
    {
      "id": "state_1_...",
      "label": "start",
      "x": 200,
      "y": 120,
      "terminal": false,
      "reward": 0
    }
  ],
  "actions": [
    {
      "id": "action_1_...",
      "stateId": "state_1_...",
      "label": "bike",
      "cost": 0,
      "outcomes": [
        { "toStateId": "state_2_...", "prob": 1.0 }
      ]
    }
  ]
}
```

### Reward Model

- **State reward**: `R(s)` - received when entering state
- **Action cost**: Subtracted from total reward
- **Effective reward**: `R(s) - cost(a) + γ * Σ P(s'|s,a) * V(s')`

## Algorithms

### Value Iteration

Initialize `V(s) = 0` for all states, then iterate:

```
For each state s:
  If terminal: V(s) = R(s)
  Else: V(s) = max_a [ R(s) - cost(a) + γ * Σ P(s'|s,a) * V(s') ]
```

Converges when `max_s |V_new(s) - V(s)| < ε`

Policy: `π(s) = argmax_a [ R(s) - cost(a) + γ * Σ P(s'|s,a) * V(s') ]`

### Simulation

1. Start from selected state
2. Follow policy: take action `π(s)`
3. Sample next state from outcomes (weighted by probabilities)
4. Accumulate rewards and costs
5. Stop at terminal state or max steps

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires ES6 modules support.

## Limitations

- No undo/redo (planned)
- Basic edge routing (no automatic curve optimization)
- Single start state (multi-start planned)
- No custom rendering themes

## Advanced Usage

### Console API

```javascript
// Load demo graph
loadDemoGraph()

// Access model directly
import * as model from './js/model.js'
model.getAllStates()

// Run custom simulation
import * as simulate from './js/simulate.js'
const result = simulate.multipleRollouts(policy, startId, 100, 50)
```

### Programmatic Graph Creation

```javascript
import * as model from './js/model.js'

const s1 = model.addState(100, 100, 'state1')
const s2 = model.addState(300, 100, 'state2')
model.updateState(s2.id, { terminal: true, reward: 10 })

const action = model.addAction(s1.id, 'move', 1)
model.addOutcome(action.id, s2.id, 1.0)
```

## Troubleshooting

**Graph won't solve**: Check that all action probabilities sum to 1.0 (warning in inspector)

**Nothing renders**: Check browser console for errors, ensure ES6 modules enabled

**localStorage full**: Export graphs as JSON, clear old data

## License

MIT License - free for personal and commercial use

## Credits

Built as a learning tool for Markov Decision Processes. Inspired by classic RL textbooks (Sutton & Barto).

---

**Pro tip**: Use the browser console to explore the model API and run custom experiments!