# Borrow & Lend System: UI Grid Analysis & Responsive Implementation Plan

A complete, responsive implementation of the dark-mode Borrow & Lend application designed for mobile and desktop (PC), synthesized from the 8-screen design grid specification in `Dark_Borrow___Lend_App_UI_Grid_30fb1185.png`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1:
> - **Desktop & PC Optimization**: Responsive multi-column grid layout on desktop viewports (e.g., dual-pane profile and split loan inspector) while collapsing into a focused, touch-friendly single-column stack on mobile viewports.
> - **Unified Repayment Page**: A single, intelligent Repayment page that handles both **Settle Loan** (prefilled with full remaining balance and "This will clear the remaining balance" banner) and **Record Repayment** (custom partial installment chips).
> - **Inline Repayment History**: The complete timeline of installments and the initial "Loan created" event will be rendered inline directly within the Dedicated Loan Page, eliminating redundant sub-page navigation.

---

## 1. UI Grid Analysis & Page Architecture

Based on the 8 screens provided in the design specification:

```
┌────────────────────────────────────────────────────────────────────────┐
│ SCREEN 1: Main Borrow & Lend Overview                                  │
│ • Executive Summary Cards: "To receive" (green) & "To repay" (red)     │
│ • Dual Action Buttons: [+ Lend Money] and [+ Borrow Money]             │
│ • Search Bar with filter toggle & status tabs (All, Lent, Borrowed...) │
│ • Interactive People List with circular avatars and due dates          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Tap Person Row)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SCREENS 2 & 8: Person Profile Page                                     │
│ • Header: [← Back], circular avatar, contact name, "Added on <date>"   │
│ • Action: [+ New Transaction]                                          │
│ • 2 Cards: [Active Lents] (count/orig/rem) & [Active Borrows]          │
│ • Net Balance Block: Hero balance (+₹3,000 / -₹2,000) with narrative   │
│   ("Rahul owes you ₹3,000 more than you owe him") & bilateral breakdown│
│ • Transactions List: Red notation for Lent, Green for Borrowed, date   │
│   on right, status below date, and remaining balance                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Tap Specific Loan)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SCREEN 3 & 7: Dedicated Loan Page (with Inline Timeline)               │
│ • Header: [← Back], Loan Title ("Laptop Purchase"), Contact Subtitle   │
│ • 3 Metric Cards: Total Amount | Repaid Amount | Remaining Balance     │
│ • Repayment Progress Bar: Percentage + ratio (40% · ₹2,000 / ₹5,000)   │
│ • Actions: [Settle Loan] (Primary) and [+ Record Repayment]            │
│ • Loan Details Card: Loan Date, Due Date, Payment Method, Notes        │
│ • Inline Repayment History: Timeline of installments + Loan created    │
└───────────────────┬───────────────────────────────────┬────────────────┘
                    │                                   │
                    ▼ (Tap Settle/Record)               ▼ (Tap Lend/Borrow/New)
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│ SCREENS 4 & 6: Unified Repayment Page │ │ SCREEN 5: New Transaction    │
│ • [← Back] to Loan                    │ │ • [← Back]                   │
│ • Context Card (Loan title & contact) │ │ • Red [Lent] / Green [Borrow]│
│ • Amount + Quick preset chips         │ │ • Contact selector with chip │
│ • Settle banner if clearing balance   │ │ • Amount with quick chips    │
│ • Payment Method (UPI, Cash, Card...) │ │ • Due Date picker            │
│ • Date picker & optional notes        │ │ • Payment Method selector    │
│ • Button: [Proceed to Pay / Save]     │ │ • Button: [Save Record]      │
└───────────────────────────────────────┘ └──────────────────────────────┘
```

---

## 2. Desktop (PC) & Mobile Responsive Layouts

### A. Screen 1: Main Borrow & Lend Overview
- **Mobile ($< 768\text{px}$)**:
  - 2-column summary cards on top (`To receive` and `To repay`).
  - Side-by-side quick action buttons (`+ Lend Money` | `+ Borrow Money`).
  - Search input with filter icon, horizontal scrolling filter tabs (`All`, `Lent`, `Borrowed`, `Overdue`, `Settled`).
  - Single-column stack of people rows.
- **Desktop ($\ge 768\text{px}$)**:
  - Max container width $1024\text{px}$ with generous margins.
  - Summary cards and quick action buttons form an aligned header grid.
  - People list can be viewed either as high-density cards (2-column grid) or a clean table with tabular numerals.

### B. Screens 2 & 8: Person Profile Page
- **Mobile**:
  - Linear flow: Header $\rightarrow$ `+ New Transaction` button $\rightarrow$ 2 Active cards $\rightarrow$ Net Balance hero & narrative $\rightarrow$ Transactions list.
- **Desktop**:
  - Two-column split layout:
    - **Left Column ($40\%$)**: Person avatar and join date, `+ New Transaction` CTA, Net Balance hero with conversational narrative, and the 2 Active Lents/Borrows summary cards.
    - **Right Column ($60\%$)**: Detailed transactions list with filtering and direct navigation into loan details.

### C. Screens 3 & 7: Dedicated Loan Page
- **Mobile**:
  - Linear flow: 3 metric cards $\rightarrow$ Progress bar $\rightarrow$ Dual action buttons $\rightarrow$ Loan Details card $\rightarrow$ Inline timeline.
- **Desktop**:
  - Two-column split layout:
    - **Left Column**: Metric cards, progress bar, high-emphasis `Settle Loan` and `+ Record Repayment` buttons, and Loan Details metadata card.
    - **Right Column**: Full-height chronological timeline of installments with payment methods, dates, notes, and the initial loan creation entry.

### D. Screens 4, 5 & 6: Form Pages (New Transaction & Repayment)
- **Mobile**: Full-viewport single-column layout with fixed bottom action button.
- **Desktop**: Centered card with $560\text{px}$–$640\text{px}$ width, structured 2-column input grid for dates and payment methods, and prominent save button.

---

## 3. Design Tokens & Styling Rigor

- **Color System (Exact Match with UI Grid)**:
  - **Background**: Deep obsidian `#0B0F14` / `#0D1117`
  - **Surface Cards**: `#121820` with hairline border `border-[#1F2937]`
  - **To Receive / Borrowed / Active**:
    - Background Tint: `#0D281E` / `#052E16`
    - Text & Accents: Emerald `#22C55E` / `#4ADE80`
    - Icon: Arrow in green circle
  - **To Repay / Lent / Active Borrows**:
    - Background Tint: `#2B1418` / `#3B1219`
    - Text & Accents: Coral/Red `#F43F5E` / `#FB7185`
    - Icon: Arrow in red circle
- **Typographic & Spatial Math**:
  - Tabular numerals (`font-mono-num font-bold`) for all amounts and ratios.
  - Strict 44px touch targets on mobile with `active:scale-[0.98]` feedback.
  - Zero-pill discipline: Metadata uses unboxed typography with typographic separators (`·`).

---

## 4. Technical Implementation Steps

1. **Update `BorrowLendPage.tsx`**:
   - Add dual quick action buttons: `+ Lend Money` and `+ Borrow Money` opening the New Transaction page with preselected direction.
   - Add `Overdue` filter tab to the directory list.
   - Implement the desktop responsive grid container.
2. **Update `PersonProfileView.tsx`**:
   - Add the Net Balance hero section with the exact narrative string generator:
     - Positive: `"[Name] owes you [Net] more than you owe them."`
     - Negative: `"You owe [Name] [Net] more than they owe you."`
     - Zero: `"All accounts are settled between you and [Name]."`
   - Add side-by-side `They owe you` vs `You owe them` sub-counters.
   - Add desktop two-column responsive grid layout (`lg:grid lg:grid-cols-12 lg:gap-6`).
3. **Update `LoanDetailView.tsx`**:
   - Add Loan Details metadata block (`Loan Date`, `Due Date`, `Payment Method`, `Notes`).
   - Integrate the complete Repayment History timeline (including checkmark icons, payment methods, notes, and initial "Loan created" event).
   - Implement desktop two-column layout (`lg:grid lg:grid-cols-12 lg:gap-6`).
4. **Update `RecordRepaymentView.tsx`**:
   - Unify partial repayment and full settlement flows into a single responsive page.
   - Display loan context banner (`Laptop Purchase · Rahul Kumar · Lent`).
   - Add "This will clear the remaining balance" banner when the remaining amount is chosen.
   - Implement desktop responsive container.
5. **Update `NewTransactionView.tsx`**:
   - Match Screen 5: Red `Lent` and Green `Borrowed` toggle buttons, contact selector tile, preset amount chips (`₹1,000`, `₹2,000`, `₹5,000`, `₹10,000`), due date picker, and payment methods.
6. **Compile & Lint Verification**:
   - Run `compile_applet` and `lint_applet` to ensure zero TypeScript or build errors.
