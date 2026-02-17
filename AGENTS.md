# AGENTS.md - Coding Agent Guide

This document provides essential information for AI coding agents working in this repository.

## Project Overview

**Rate Derivation Prototype** - A hotel pricing management system demonstrating two pricing models:
- **Derivation Model** (`index.html`): Rates derive from an anchor (BAR) with formulas
- **Explicit Model** (`explicit-pricing.html`): Fixed, manually-set prices per room/date

**Tech Stack**: Pure vanilla JavaScript, HTML5, CSS3 (no frameworks, no build tools)

## Build/Lint/Test Commands

### Development
```bash
# No build step - open HTML files directly in browser
open index.html              # Derivation model
open explicit-pricing.html   # Explicit model
```

### Testing
```bash
# No test framework currently - manual testing only
# Future: Add testing framework if needed
```

### Linting/Formatting
```bash
# No linter/formatter configured
# Follow existing code style patterns
```

### Data Management
```bash
# Clear localStorage (reset application data)
# Open browser console and run:
localStorage.removeItem('infinito_rate_store')
```

## Project Structure

```
rate-derivation-prototype/
├── index.html                 # Derivation pricing UI
├── explicit-pricing.html      # Explicit pricing UI
├── PRODUCT_DECISIONS.md       # Critical: Read this first!
├── css/
│   ├── styles.css            # Main styles
│   └── explicit-styles.css   # Explicit model styles (identical)
└── js/
    ├── store.js              # Data store & localStorage layer
    ├── app.js                # Derivation model logic
    └── explicit-pricing.js   # Explicit model logic
```

## Code Style Guidelines

### Naming Conventions

**JavaScript**:
- Functions/variables: `camelCase` - `renderRoomsTable()`, `anchorRates`
- Constants: `SCREAMING_SNAKE_CASE` - `DEFAULT_STORE`
- IDs (generated): Prefix pattern - `'r' + Date.now()`, `'p' + Date.now()`

**HTML/CSS**:
- CSS classes: `kebab-case` - `.nav-item`, `.btn-primary`, `.card-header`
- DOM IDs: Mixed (views: `view-dashboard`, others: `roomsTableBody`)
- Modal inputs: Prefix `m_` - `m_room_name`, `m_rate_code`

### Formatting

- **Indentation**: 4 spaces (JavaScript and HTML)
- **Quotes**: Single quotes `'` for JavaScript strings
- **Functions**: Traditional function declarations (no arrow functions)
  ```javascript
  function saveRoom() {
      // implementation
  }
  ```
- **Template Literals**: Use for HTML generation
  ```javascript
  tr.innerHTML = `
      <td>${room.code}</td>
      <td>${room.name}</td>
  `;
  ```

### Imports/Modules

**No module system** - Uses global scope with `<script>` tags.

**Load Order** (critical):
```html
<script src="js/store.js"></script>           <!-- 1. Data layer -->
<script src="js/app.js"></script>             <!-- 2. App logic -->
<script>                                       <!-- 3. Initialization -->
    window.addEventListener('DOMContentLoaded', init);
</script>
```

All functions and `store` object are global. No imports/exports.

### Types

**No TypeScript or JSDoc** - Pure JavaScript with implicit types.

Type safety through:
- Consistent data structures (see `DEFAULT_STORE` in `store.js`)
- Defensive programming patterns
- Type coercion: `parseFloat(val) || 0`

### Error Handling

**Pattern**: Early returns, console logging, graceful degradation

```javascript
// Validation with early returns
function saveRoom() {
    const name = document.getElementById('m_room_name').value;
    if (!name || !code) return;  // Silent failure
    // ... proceed
}

// Safe property access
const cluster = store.clusters 
    ? store.clusters.find(c => c.id === room.cluster) 
    : { name: '-' };

// localStorage with try-catch
try {
    store = JSON.parse(saved);
} catch (e) {
    console.error('Failed to parse store', e);
    store = JSON.parse(JSON.stringify(DEFAULT_STORE));
}
```

**Never throw errors to users** - Log to console, provide fallback values.

### Data Persistence Pattern

**Always follow this sequence** after mutations:
```javascript
function deleteRoom(idx) {
    store.rooms.splice(idx, 1);  // 1. Mutate
    saveStore();                 // 2. Persist to localStorage
    renderRoomsTable();          // 3. Update UI
    renderMatrix();              // 4. Update related UIs
}
```

### DOM Manipulation Pattern

```javascript
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';  // Clear existing
    
    store.items.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `...`;  // Template literal
        tbody.appendChild(tr);
    });
    
    updateStats();  // Side effect: update dependent UI
}
```

### Modal Workflow Pattern

```javascript
// 1. Open modal
function openModal() {
    // Reset fields, populate dropdowns
    document.getElementById('modalId').style.display = 'flex';
}

// 2. Save
function saveData() {
    // Validate, mutate store, persist, re-render, close
    closeModal('modalId');
}

// 3. Close
function closeModal(id) { 
    document.getElementById(id).style.display = 'none'; 
}
```

## Critical Product Rules

**Read `PRODUCT_DECISIONS.md` before making pricing logic changes!**

Key architectural decisions:
1. **Supplements**: Support both fixed ($) and percentage (%) types
2. **Negative values**: Allowed for discounts
3. **Override Priority**: Manual Override > Rate Level > Base Config
4. **BAR Philosophy**: BAR is benchmark, not a price floor
5. **Legacy Data**: Handle both object `{type, value}` and primitive formats

## Common Tasks

### Adding a New Field to Store
1. Update `DEFAULT_STORE` in `store.js`
2. Update relevant render functions
3. Add UI controls in HTML
4. Update save/edit functions
5. Test with localStorage clear/reset

### Adding a New View
1. Add `<div id="view-newname" class="view-section">` in HTML
2. Add nav item with `onclick="switchView('newname', this)"`
3. Update `titles` object in `switchView()`
4. Add render function and wire to `init()`

### Modifying Calculations
1. Check `PRODUCT_DECISIONS.md` for business rules
2. Locate calculation in `resolveRatePrice()` or similar
3. Preserve override priority hierarchy
4. Handle legacy data formats (object vs primitive)
5. Test edge cases: null values, missing supplements, etc.

## File Responsibilities

- **`store.js`**: Data schema, localStorage persistence, global `store` object
- **`app.js`**: Derivation model - calculations, overrides, supplement logic
- **`explicit-pricing.js`**: Explicit model - fixed pricing, manual entry
- **`styles.css`**: Shared styles - design tokens, components, layout
- **`PRODUCT_DECISIONS.md`**: Business logic documentation (source of truth)

## Development Guidelines

1. **Preserve Vanilla Architecture**: No frameworks, no build tools
2. **Maintain Dual Models**: Changes often need parallel updates in both models
3. **Test Both HTML Files**: Ensure changes work in derivation AND explicit models
4. **Check localStorage**: Clear and test fresh state after schema changes
5. **Console Errors**: Monitor browser console during testing
6. **Inline Handlers**: Continue using `onclick` attributes (project convention)
7. **No Dependencies**: Don't add npm packages or external libraries
8. **Color Consistency**: Use CSS custom properties from `:root` for colors
9. **Mobile Responsiveness**: Not currently implemented (desktop-first)
10. **Browser Target**: Modern evergreen browsers (ES6+ features OK)

## Known Limitations

- No input validation (relies on browser defaults)
- No loading states or async operations
- No user-facing error messages
- No unit/integration tests
- CSS files are duplicated (could be merged)
- No TypeScript type safety
- Global scope (no module encapsulation)

## Getting Help

- **Product Questions**: See `PRODUCT_DECISIONS.md`
- **Code Patterns**: Reference existing implementations
- **Data Schema**: Check `DEFAULT_STORE` in `store.js`
