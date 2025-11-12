# Example MDP Graphs

This directory contains pre-built MDP examples that you can import into the simulator.

## How to Use

1. Open the MDP Simulator in your browser
2. Click **Import JSON** button
3. Select one of the JSON files from this directory
4. The graph will load automatically

## Available Examples

### 1. Commute Problem (`commute.json`)

**Scenario**: Choose how to get to work

- **States**: Start, Work, Delay, Home
- **Actions**: bike, car, train
- **Challenge**: Train is cheap but risky (20% chance of delay)

**Optimal Strategy**: Usually bike/car (deterministic, high reward) beats train despite lower cost.

**Settings**:
- γ = 0.95
- Start: Start

---

### 2. Grid World (`gridworld.json`)

**Scenario**: Classic 2x2 stochastic grid navigation

- **States**: S0, S1, S2, Goal
- **Actions**: up, down, left, right (with 20% chance of staying put)
- **Challenge**: Noisy actions make direct path unreliable

**Optimal Strategy**: Balance between shortest path and reliability.

**Settings**:
- γ = 0.9
- Start: S0
- Goal reward: 10

---

### 3. Health Management (`health-management.json`)

**Scenario**: Manage health through preventive care vs. treatment

- **States**: Healthy, Sick, Dead (terminal), Recovered (terminal)
- **Actions**: 
  - Healthy: wait, exercise (costs 2)
  - Sick: rest, medicine (costs 5), ignore
- **Challenge**: Balance prevention costs vs. treatment costs

**Optimal Strategy**: 
- When healthy: exercise (reduces sickness probability)
- When sick: medicine (best recovery rate despite cost)

**Settings**:
- γ = 0.99 (high discount = value future health)
- Start: Healthy

**Insights**:
- Prevention (exercise) is cheaper than cure (medicine)
- Ignoring sickness has high death risk (30%)
- Medicine reduces death risk from 10% to 5%

---

## Creating Your Own Examples

Use these templates as starting points:

### Simple Two-State Decision

```json
{
  "version": 1,
  "gamma": 0.95,
  "epsilon": 0.001,
  "startStateId": "A",
  "states": [
    {"id": "A", "label": "State A", "x": 200, "y": 200, "terminal": false, "reward": 0},
    {"id": "B", "label": "State B", "x": 400, "y": 200, "terminal": true, "reward": 10}
  ],
  "actions": [
    {
      "id": "move",
      "stateId": "A",
      "label": "move",
      "cost": 1,
      "outcomes": [{"toStateId": "B", "prob": 1.0}]
    }
  ]
}
```

### Stochastic Action Template

```json
{
  "id": "risky_action",
  "stateId": "source_state_id",
  "label": "risky",
  "cost": 0,
  "outcomes": [
    {"toStateId": "good_state", "prob": 0.7},
    {"toStateId": "bad_state", "prob": 0.3}
  ]
}
```

## Tips for Designing MDPs

1. **Start Simple**: Begin with 2-3 states, add complexity gradually
2. **Terminal States**: Always include at least one terminal state (or use cycles)
3. **Probability Sums**: Ensure all action outcomes sum to exactly 1.0
4. **Reward Structure**: 
   - Positive rewards for good outcomes
   - Negative rewards for bad outcomes
   - Use costs for action penalties
5. **Gamma Selection**:
   - γ = 0.9: Modest future discounting
   - γ = 0.95: Standard value
   - γ = 0.99: High value on future (episodic tasks)
   - γ = 1.0: No discounting (use with terminal states)

## Common MDP Patterns

### Risk vs. Reward
- Safe action: low reward, high probability
- Risky action: high reward, low probability

Example: Gridworld with shortcuts through dangerous terrain

### Exploration vs. Exploitation
- Known path: moderate reward, certain
- Unknown path: potentially high reward, uncertain

Example: Choose between tested strategy vs. experimental approach

### Prevention vs. Treatment
- Preventive action: small cost, reduces future problems
- Reactive action: large cost when problem occurs

Example: Health management, equipment maintenance

### Multi-Stage Decisions
- Early decisions affect later options
- Sequential dependencies

Example: Skill tree, resource allocation

## Troubleshooting Examples

**Example won't solve**: Check that all probabilities sum to 1.0

**Strange optimal policy**: 
- Verify rewards are correct
- Check gamma value (higher γ = more future-focused)
- Ensure costs are applied correctly

**Simulation doesn't reach terminal state**:
- Check for deadlock states (no outgoing actions)
- Verify start state has actions
- Increase max steps

## Contributing Examples

To add your own example:

1. Create the MDP in the simulator
2. Click **Export JSON**
3. Clean up the IDs if needed
4. Add to this directory with descriptive name
5. Document it in this README

## Example Use Cases

Educational:
- ✅ Commute problem (decision under uncertainty)
- ✅ Grid world (classic RL benchmark)
- ✅ Health management (cost-benefit analysis)

Could Add:
- Inventory management
- Robot navigation with obstacles
- Game strategy (rock-paper-scissors with costs)
- Investment portfolio (risk management)
- Machine maintenance (schedule preventive care)

Happy modeling! 🎓
