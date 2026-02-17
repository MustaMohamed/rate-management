# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rate Derivation Prototype** - A hotel pricing management system demonstrating two pricing models:
- **Derivation Model** (`index.html`): Rates derive from an anchor (BAR) with formulas
- **Explicit Model** (`explicit-pricing.html`): Fixed, manually-set prices per room/date

**Tech Stack**: Pure vanilla JavaScript, HTML5, CSS3 (no frameworks, no build tools)

## Development Commands

### Running the Application
```bash
# No build step - open HTML files directly in browser
open index.html              # Derivation model
open explicit-pricing.html   # Explicit model
```

### Data Management
```bash
# Clear localStorage (reset application data)
# Open browser console and run:
localStorage.removeItem('infinito_rate_store')
```

### Testing
No test framework currently - manual testing only. Test changes in both HTML files.

## Architecture Overview

### Data Flow
1. **Store Layer** (`js/store.js`): Global `store` object + localStorage persistence
2. **Application Layer** (`js/app.js` or `js/explicit-pricing.js`): Business logic + UI rendering
3. **View Layer** (HTML files): DOM structure + inline event handlers

### Key Architectural Patterns

**Global Scope Architecture**: No module system. All functions and the `store` object are global.

**Script Load Order** (critical):
```html
<script src="js/store.js"></script>     <!-- 1. Data layer -->
<script src="js/app.js"></script>       <!-- 2. App logic -->
<script>                                 <!-- 3. Initialization -->
    window.addEventListener('DOMContentLoaded', init);
</script>
```

**Data Persistence Pattern** - Always follow this sequence after mutations:
```javascript
function deleteRoom(idx) {
    store.rooms.splice(idx, 1);  // 1. Mutate store
    saveStore();                 // 2. Persist to localStorage
    renderRoomsTable();          // 3. Update UI
    renderMatrix();              // 4. Update related UIs
}
```

### Pricing Models

**Derivation Model** (`index.html` + `app.js`):
- Rates derive from BAR (Best Available Rate) anchor
- Supports supplements (fixed $ or percentage %)
- Hierarchy: Manual Override > Rate Level > Base Config
- BAR is benchmark, NOT a price floor (negatives allowed)

**Explicit Model** (`explicit-pricing.html` + `explicit-pricing.js`):
- Fixed, manually-set prices per room/date
- No derivation formulas
- Full control over every price point

### Data Schema

Core structure defined in `DEFAULT_STORE` (`js/store.js`):
- `days[]`: Calendar data with base rates
- `clusters[]`: Room groupings (Standard/Premium/Luxury)
- `rooms[]`: Room types with options and deltas
- `rates[]`: Rate plans (source vs derived)
- `barRoomId`: Reference room for pricing
- `pricingModel`: 'derivation' or 'explicit'

**Critical**: Supplements support both object `{type, value}` and legacy primitive formats.

### Business Rules

**Read `PRODUCT_DECISIONS.md` before modifying pricing logic!**

Key rules:
1. **Supplements**: Support fixed ($) and percentage (%) types
2. **Negative values**: Allowed for discounts (BAR is not a floor)
3. **Override Priority**: Manual Override > Rate Level > Base Config
4. **Legacy Data**: Handle both `{type, value}` and primitive formats

## Code Style

### JavaScript
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Traditional function declarations (no arrow functions)
- Single quotes for strings
- Template literals for HTML generation
- 4-space indentation

### HTML/CSS
- CSS classes: `kebab-case`
- Modal inputs: Prefix `m_` (e.g., `m_room_name`)
- Inline event handlers (e.g., `onclick="saveRoom()"`)
- 4-space indentation

### Error Handling
- Early returns for validation
- Console logging (no user-facing errors)
- Graceful degradation with fallback values
- Never throw errors to users

Example:
```javascript
function saveRoom() {
    const name = document.getElementById('m_room_name').value;
    if (!name || !code) return;  // Silent failure
    // ... proceed
}
```

## Common Development Tasks

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

### Modifying Pricing Calculations
1. Check `PRODUCT_DECISIONS.md` for business rules
2. Locate calculation in `resolveRatePrice()` or similar
3. Preserve override priority hierarchy
4. Handle legacy data formats (object vs primitive)
5. Test edge cases: null values, missing supplements

## Important Constraints

1. **Preserve Vanilla Architecture**: No frameworks, no build tools, no dependencies
2. **Maintain Dual Models**: Changes often need parallel updates in both models
3. **Test Both HTML Files**: Ensure changes work in derivation AND explicit models
4. **Check localStorage**: Clear and test fresh state after schema changes
5. **No Dependencies**: Don't add npm packages or external libraries
6. **Browser Target**: Modern evergreen browsers (ES6+ features OK)
