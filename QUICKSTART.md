# Quick Start Guide

## Opening the Simulator

**IMPORTANT**: You need to run a web server! ES6 modules don't work with `file://` URLs.

### Start the Server

```bash
# In the project directory, run:
python3 server.py

# Then open your browser to:
# http://localhost:8000
```

### What You'll See

The app should load with three panels:
   - **Left**: Tools and settings
   - **Center**: Canvas for drawing the MDP
   - **Right**: Inspector for editing properties

## Your First MDP

### Method 1: Load the Demo

1. Press `F12` to open browser console
2. Type: `loadDemoGraph()`
3. Press Enter

You should see the example graph appear!

### Method 2: Build from Scratch

#### Step 1: Create States

1. Click **Add State** button (left panel)
2. A new state appears in the center
3. Drag it to position
4. Click **Add State** again to create more states
5. Create 4 states total

#### Step 2: Edit State Properties

1. Click on a state to select it
2. In the right panel, set:
   - **Label**: "Start"
   - **Reward**: 0
   - **Terminal**: unchecked
3. Select another state and set:
   - **Label**: "Goal"
   - **Reward**: 100
   - **Terminal**: checked (✓)

#### Step 3: Create Actions

1. Click on the "Start" state
2. Click **Add Action** button
3. Click on the "Goal" state
4. An arrow appears!

#### Step 4: Edit Action Properties

1. The action should auto-select after creation
2. In right panel, set:
   - **Label**: "move"
   - **Cost**: 0
3. Check that **Outcomes** shows:
   - State: Goal
   - Probability: 1

#### Step 5: Solve the MDP

1. In left panel, set:
   - **Discount (γ)**: 0.95
   - **Start State**: Start (dropdown)
2. Click **Solve** button
3. The optimal action should be highlighted in green
4. State values appear below each state

#### Step 6: Simulate

1. In left panel, set **Sim Steps**: 10
2. Click **Simulate** button
3. An orange path shows the trajectory
4. Right panel shows the simulation results

## Common Tasks

### Adding Stochastic Actions

Create an action with multiple outcomes:

1. Create action as normal
2. In action inspector, click **+ Add Outcome**
3. Select different target states
4. Set probabilities (must sum to 1.0):
   - Outcome 1: State A, prob 0.7
   - Outcome 2: State B, prob 0.3

### Deleting Things

- Select state/action
- Press **Delete** or **Backspace**
- Or click **Delete** button

### Saving Your Work

- **Auto-save**: Happens automatically to browser localStorage
- **Manual export**: Click **Export JSON** to download file
- **Import**: Click **Import JSON** to load from file

### Reset Everything

Click **Reset** button (careful - no undo!)

## Example: Grid World

Create a simple 2x2 grid:

```
[S] --right--> [A]
 |              |
down           down
 |              |
 v              v
[B] --right--> [G]
```

1. Create 4 states: S, A, B, G
2. Position them in a grid
3. Set G as terminal with reward 10
4. Create actions:
   - S → A (right)
   - S → B (down)
   - A → G (down)
   - B → G (right)
5. Set start state to S
6. Solve!

## Troubleshooting

### "Cannot solve: probabilities must sum to 1.0"

Check action inspector - adjust outcome probabilities so they add up to exactly 1.0.

### Nothing appears when I add a state

Try refreshing the page. Check browser console (F12) for errors.

### Canvas is too small

The canvas uses the full center panel. Maximize your browser window for more space.

### Simulation doesn't run

1. Make sure you clicked **Solve** first
2. Verify a **Start State** is selected
3. Check that the start state has at least one action

## Tips & Tricks

- **Drag states** to rearrange the graph for clarity
- **Multiple actions** from one state are all considered
- **Self-loops** are allowed (state transitions to itself)
- **Terminal states** should have no outgoing actions
- Use **costs** for negative rewards (penalty for taking action)
- Use **state rewards** for positive/negative rewards upon entering

## Advanced

### Open Multiple Graphs

Use browser tabs! Each tab has independent localStorage.

### Export for Analysis

After solving, you can manually export the solution as CSV:
- Open browser console
- Type: `storage.exportCSV(currentSolution)`

### Batch Simulations

Run 100 simulations:
```javascript
const stats = simulate.multipleRollouts(currentSolution.policy, 'state_id', 100, 50)
console.log(stats)
```

Enjoy exploring MDPs! 🎓
