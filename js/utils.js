// utils.js - Utility functions

let idCounter = 0;

/**
 * Generate a unique ID with optional prefix
 */
export function uid(prefix = 'id') {
    return `${prefix}_${++idCounter}_${Date.now()}`;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Sum an array of numbers
 */
export function sum(arr) {
    return arr.reduce((acc, val) => acc + val, 0);
}

/**
 * Round a number to specified decimal places
 */
export function round(num, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * Assert a condition, throw error if false
 */
export function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

/**
 * Calculate distance between two points
 */
export function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Check if point is inside circle
 */
export function pointInCircle(px, py, cx, cy, radius) {
    return distance(px, py, cx, cy) <= radius;
}

/**
 * Get SVG point from mouse event
 */
export function getSVGPoint(svg, event) {
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 */
export function debounce(func, wait) {
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
export function randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

/**
 * Calculate control points for a quadratic bezier curve
 * Used for curved edges between states
 */
export function getQuadraticControlPoint(x1, y1, x2, y2, curvature = 0.3) {
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
export function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return '--';
    if (typeof num !== 'number') return String(num);
    return num.toFixed(decimals);
}

/**
 * Check if arrays are equal
 */
export function arraysEqual(a, b) {
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
export function weightedChoice(choices, rng = Math.random) {
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
export function shuffle(array) {
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
export function argmax(arr) {
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
export function argmaxAll(arr) {
    if (arr.length === 0) return [];
    const maxVal = Math.max(...arr);
    return arr.map((val, idx) => val === maxVal ? idx : -1)
              .filter(idx => idx !== -1);
}
