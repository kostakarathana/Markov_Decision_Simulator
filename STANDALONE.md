# Standalone MDP Simulator

This MDP Simulator is **completely standalone** - no server, no build tools, no installation required!

## How to Use

1. **Double-click** `index.html` in your file browser, OR
2. **Open** `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)

That's it! The application runs entirely in your browser.

## What's Inside

- **100% Client-Side**: All MDP solving, simulation, and storage happens in JavaScript in your browser
- **No Dependencies**: Pure vanilla HTML/CSS/JavaScript - no frameworks, no npm packages
- **Works Offline**: Once loaded, works completely offline
- **No Server Needed**: The original modular ES6 code has been bundled into a single standalone file

## Technical Details

### The Bundling Approach

The application was originally written as ES6 modules (separate `.js` files using `import`/`export`). However, browsers block ES6 modules from `file://` URLs due to CORS security policies.

**Solution**: All JavaScript has been bundled into `/js/standalone.js` which:
- Wraps everything in an IIFE (Immediately Invoked Function Expression)
- Creates namespace objects (`model`, `ui`, `mdp`, `simulate`, `storage`) to preserve the modular structure
- Exposes debugging utilities on `window.mdpDebug`
- Initializes automatically when the DOM loads

### File Structure

```
index.html              Main application (just open this!)
├── css/
│   └── styles.css      All styling
├── js/
│   ├── standalone.js   ★ All application code bundled (2691 lines)
│   ├── utils.js        Original modular source (optional, for reference)
│   ├── model.js        ↓
│   ├── mdp.js          ↓
│   ├── simulate.js     ↓
│   ├── storage.js      ↓
│   ├── ui.js           ↓
│   └── app.js          Original modules (not loaded by index.html)
└── examples/
    ├── recycling.json  Example MDP graphs
    ├── gridworld.json  ↓
    └── gambler.json    ↓
```

## Features

- ✅ **Value Iteration** - Solve MDPs optimally
- ✅ **Policy Iteration** - Alternative solving algorithm
- ✅ **Monte Carlo Simulation** - Visualize policy execution
- ✅ **Interactive Graph Editor** - Drag-and-drop states and actions
- ✅ **Auto-save** - Automatic localStorage persistence
- ✅ **Import/Export** - Save/load graphs as JSON
- ✅ **Visual Feedback** - Optimal actions and values displayed on graph

## Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge (Chromium) 90+
- ✅ Firefox 88+
- ✅ Safari 14+

## Storage

The app uses **localStorage** to auto-save your graphs. Your data stays in your browser - nothing is sent to any server because there is no server!

## Debugging

Open the browser console (F12) and use:
```javascript
// Load a demo graph
loadDemoGraph()

// Access internals
window.mdpDebug.model.getGraph()
window.mdpDebug.ui.render()
window.mdpDebug.mdp.runValueIteration(0.9, 0.001, 100)
```

## Development Notes

If you want to modify the code:
1. Edit the individual module files in `/js/` (utils.js, model.js, etc.)
2. Re-bundle using:
   ```bash
   cd js/
   cat utils.js model.js mdp.js simulate.js storage.js ui.js app.js | \
     sed 's/export function /function /g' | \
     sed 's/export const /const /g' | \
     sed 's/export {.*//g' | \
     sed '/^import /d' | \
     sed '/^export /d' > temp_bundle.js
   
   # Then wrap in IIFE with namespace objects (see standalone.js structure)
   ```

Or just edit `standalone.js` directly if you prefer!

## License

MIT License - See LICENSE file

---

**Enjoy building and solving Markov Decision Processes!** 🎲📊
