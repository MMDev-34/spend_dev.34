# Cash Flow Trend - Unwanted Amount on Toggle & 50/50 Spent/Earned Blocks

Integrate the unwanted money amount directly inside the compact On/Off toggle button, freeing up horizontal space on the header so that Spent and Earned share the remaining width in a balanced 50/50 split where digits are never hidden or truncated.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed in Phase 1:
> - **Toggle Button Content when ON**: Displays the Alert icon, formatted unwanted amount, and an active `ON` badge (e.g., `[ ⚠️ ₹140.00 · ON ]`).
> - **Right-Side Summary Blocks**: Only two blocks (`Spent` and `Earned`) in an equal 50/50 split (`grid grid-cols-2` / `flex-1`), giving ample horizontal space so large amounts never get hidden.

---

## 1. Overview & Core Concept

- **The Problem**: Fitting 3 separate summary blocks (`Spent`, `Earned`, and `Unwanted`) on one line caused digits to get hidden or truncated on smaller mobile viewports.
- **The Solution**:
  - Move the unwanted spend amount directly into the **ON/OFF toggle button** when toggled on.
  - Dedicate the right-hand summary line exclusively to **Spent** and **Earned** in a balanced 50/50 layout.
  - When the toggle is OFF, the toggle displays `[ ⚠️ Unwanted · OFF ]`. When turned ON, it expands to `[ ⚠️ ₹Amount · ON ]`.

---

## 2. Layout & Component Architecture

### Mobile & Desktop Header Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CashFlowTrendChart Header                                 │
├─────────────────────────────────────────────────┬──────────────────────────────────────┤
│  LEFT CLUSTER (View Tabs + Unwanted Toggle)     │  RIGHT CLUSTER (50/50 Summary Blocks)│
│                                                 │                                      │
│  ┌───────────────┐  ┌────────────────────────┐  │  ┌────────────────┐┌────────────────┐│
│  │ Trend | Paymt │  │ ⚠️  ₹140.00  ● ON       │  │  │ ● Spent:      ││ ● Earned:      ││
│  └───────────────┘  └────────────────────────┘  │  │   ₹3,689.00    ││   ₹65,000.00   ││
│                     (When OFF: [⚠️ Unwanted])   │  │   (50% Width)  ││   (50% Width)  ││
│                                                 │  └────────────────┘└────────────────┘│
└─────────────────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 3. User Experience & Visual Details

1. **Unwanted Toggle States**:
   - **OFF State**:
     - Background: `#181818`, border `#262626`, muted gray text.
     - Content: Alert icon + "Unwanted" + muted dot + "OFF" label.
   - **ON State**:
     - Background: `bg-amber-500/15`, border `border-amber-500/40`, bright amber text.
     - Content: Alert icon + formatted amount (e.g., `₹140.00` in tabular font) + pulsing amber dot + "ON" pill.
     - Zero unread/unwanted state: If `totalUnwanted === 0`, displays `[ ⚠️ ₹0 · ON ]`.

2. **50/50 Equal-Width Spent & Earned Blocks**:
   - Both blocks receive equal `flex-1` width on mobile and desktop.
   - Generous digit allowance: Since space is split between only 2 blocks, currency amounts up to 10–12 digits fit comfortably without truncation or ellipsis.
   - High contrast dots: Red dot for Spent (`bg-rose-500`), Blue dot for Earned (`bg-blue-500`).

---

## 4. Technical Implementation Steps

### `src/components/overview/CashFlowTrendChart.tsx`
1. **Unwanted Toggle Update**:
   - When `showUnwanted` is active, render `unwantedFormatted` alongside the alert icon and ON badge.
2. **Summary Blocks Refactoring**:
   - Remove the third Unwanted block from the right-hand stats cluster.
   - Style Spent and Earned with `grid grid-cols-2 gap-1.5 w-full sm:w-auto sm:flex` with equal `flex-1 min-w-0` width.
   - Keep dynamic font scaling (`text-xs sm:text-sm`) for tabular numerals.

---

## 5. Verification Plan

- Run `lint_applet` to ensure zero TypeScript errors.
- Run `compile_applet` to verify production build.
- Verify toggle state changes between OFF and ON, ensuring the amount appears directly on the button and Spent/Earned never clip digits.
