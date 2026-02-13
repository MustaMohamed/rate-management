# Product Decision Log: Rate Levels & Derivation Logic

## 1. Rate Levels (BAR Levels / Price Points)
**Context**: Replaced arbitrary daily price entry with predefined "levels" (e.g., Level 1 = $80, Level 5 = $150).

### Key Decisions
*   **User-Defined Levels**: We rejected hard-coded levels (e.g., "Low/Med/High") in favor of a user-configurable list (`l1`, `l2`...). This supports diverse hotel strategies.
*   **Scope of Impact**:
    *   **Standard Model**: Level sets the **Global Anchor (Base) Price**. All other rates (Non-Ref, Breakfast) derive from this anchor automatically.
    *   **Exact Model**: Level sets a **Fixed Price List** for every room type. No derivation occurs; values are absolute.

### Trade-offs
| Strategy | Pros | Cons |
| :--- | :--- | :--- |
| **Global Base (Standard)** | **Speed & Safety**. Changing one value updates entire hotel. Prevents ratio errors (e.g., Non-Ref becoming > Flex). | **Rigidity**. Cannot easily set "Level 1" to have a $10 discount for Non-Ref but "Level 2" to have a $20 discount. |
| **Per-Plan Prices (Exact)** | **Precision**. Total control over every price point for every segmentation. | **Maintenance**. Requires setting up prices for every room/plan combination for every level. High risk of data entry error. |

---

## 2. Room Type & Option Pricing (Supplements)
**Context**: Defining how prices differ between the "Base Room" (Anchor) and other rooms (Suite, Economy) or add-ons (Breakfast).

### Key Decisions
*   **Support for Mixed Types**: Pricing logic must support both **Fixed Amount ($)** and **Percentage (%)**.
    *   *Fixed*: Cover operational costs (e.g., Cleaning = $30).
    *   *Percentage*: Capture demand value (e.g., Sea View = +20%).
*   **Negative Values (Discounts)**: We explicitly enabled negative derivation.
    *   *Room Types*: Allows "Economy Room" to be cheaper than "Standard Room".
    *   *Rate Plans*: Allows "Non-Refundable" or "Corporate" to be cheaper than "BAR".
    *   *Implication*: **BAR is a benchmark, not a floor.**

### Trade-offs
| Logic | Pros | Cons |
| :--- | :--- | :--- |
| **Fixed ($)** | **Stability**. Price difference remains constant regardless of season. Easier to calculate margin. | **Devaluation**. In high season, a $20 difference for a Suite feels too cheap (leaving money on the table). |
| **Percentage (%)** | **Revenue Maximization**. Upgrades become more expensive as base rate rises. | **Volatility**. In low season, price gaps might become negligibly small (e.g., 10% of $60 is only $6). |

---

## 3. Override vs. Base Configuration
**Context**: How to handle manual changes to calculated prices.

### Key Decisions
*   **Priority Logic**:
    1.  **Manual Override** (Highest) - User typed a specific number for a specific date.
    2.  **Rate Level** (Middle) - User selected a "Pre-set Strategy" for the day.
    3.  **Base Configuration** (Lowest) - The default fallback.
*   **Cancellation**: Added specific UI controls ("x" button) to clear overrides and revert to the Level/Base price.

### Trade-offs
*   **Data Integrity**: Overrides are powerful but "break" the derivation chain. If you override a price, changing the Base Level later **will not update** the overridden cell.
    *   *Mitigation*: Visual indicators (Red/Amber cells) require the user to be aware of "broken" links.

## 4. Hierarchy of "Lowest Price"
**Learning**: The **Best Available Rate (BAR)** is technically a "Retail Rate" and serves as the **Anchor**.
*   It is **NOT** the lowest price in the system.
*   **Lower Prices exist via**:
    *   **Inferior Product**: Economy Rooms (Physical difference).
    *   **Strict Conditions**: Non-Refundable (Policy difference).
    *   **Restricted Audience**: Corporate/Member (Segment difference).

**System Requirement**: The math engine must robustly handle `Anchor - Amount` and `Anchor * (1 - Percent)` without flooring at the Anchor price.
