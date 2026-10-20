# Remove Future Payments & Add Calendar Month Bills Section

Streamline daily financial tracking by removing obsolete future-payment modes and date selections across the application, while elevating monthly planned and recurring commitments into a unified chronological schedule directly beneath the financial calendar.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were aligned during the clarification interview:
> - **Date Restriction in Transactions**: Disallow selecting dates beyond today (`max={getToday()}`) in transaction input forms. Historical and same-day expense/income logging is preserved; speculative future transactions are disabled.
> - **Unified Bills List Layout**: A single, clean chronological schedule below the monthly calendar integrating both recurring bills and planned expenses ordered by due date, with clear status indicators and amount figures.
> - **Removal of Activity Future Toggles**: Remove the "With future payments" view mode, badges, and warning prompts from the Transactions/Activity page to keep the ledger strictly focused on actual settled money flow.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Purges "Future Payments" concepts across the site**: The Transactions/Activity tab drops the `"with_future"` view mode switch, the `(+X future)` badges, and switch banners. Transaction entry modals disallow picking future calendar dates.
  2. **Elevates Bills & Commitments Below the Calendar**: The Financial Calendar view (`/plan` tab) now features a prominent, unified **"Monthly Bills & Planned Commitments"** schedule below the monthly calendar grid, displaying all recurring subscriptions and planned expenses due in the displayed month ordered chronologically.
- **Target Audience / Persona**: Users managing daily personal finances who want their transaction history to reflect actual settled spending, while using the calendar view as their forward-looking planning command center for upcoming fixed bills.
- **Key Value**: Eliminates cognitive clutter and confusing future-transaction toggles from daily tracking while giving high visibility to upcoming fixed commitments for the selected month.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  - **Logging Transactions (`AddTransactionModal`)**: The date picker defaults to today and disables any selection after today (`max="YYYY-MM-DD"`). Users focus purely on logging actual income and expenses.
  - **Viewing Activity (`TransactionsPage`)**: The transaction list renders as a clean, single chronological stream without view-mode toggles or "with future payments" filters.
  - **Inspecting Calendar Commitments (`FinancialCalendar`)**:
    - Below the 7-column calendar grid and legend, a card titled **"Bills & Planned Expenses — [Month Name]"** lists all upcoming recurring bills and planned purchases for that month.
    - Each item displays:
      - Clean date marker (`15th` or `Oct 15`) with upcoming/due indicator.
      - Category icon and title.
      - Nature badge: quiet text indicator (`Recurring Bill` vs `Planned`).
      - Tabular formatted currency amount (`font-mono tabular-nums`).
      - Action controls: click to view/edit or convert/log as expense directly.
    - An empty state appears when a month has no scheduled commitments, with quick actions `+ Add Bill` and `+ Plan Expense`.

- **Visual Identity & Theme**:
  - Consistent with Spend's minimal dark aesthetic (`#0A0A0A` canvas, `#141414` container cards, `#262626` hairline borders).
  - Accent colors used strictly for semantic categorization: Purple for recurring subscriptions/bills, Cyan for planned one-off purchases, and Emerald for settled/paid state.
  - No static pill clutter; clean typography separated by quiet mid-dots (`·`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Enforce Strict `max={getToday()}` in Transaction Forms**
  - *Chosen Approach*: Disable selecting future dates on native date inputs and validate server/client side to block dates `> today`.
  - *Why*: Future-dated items in an actual expense ledger cause skewed totals, misleading current balance numbers, and confusing sorting.
  - *Alternatives Considered*: Allowing future dates with a silent warning was rejected because the user specifically noted future payments are not useful in daily life.

- **Decision 2: Unified Chronological Bill List vs Separate Tables**
  - *Chosen Approach*: Merge recurring bills (mapped to their day of the active month) and planned one-off expenses into a single array sorted by day of month (`day 1` to `day 31`).
  - *Why*: In personal budgeting, users care about cash outflows in time order (e.g. Rent on 1st, Netflix on 5th, Flight on 12th) regardless of whether the obligation is recurring or one-off.
  - *Alternatives Considered*: Two split tables forced users to scan two disparate lists to understand their monthly cash demands.

- **Decision 3: Seamless Integration with Calendar Navigation**
  - *Chosen Approach*: The list dynamically updates when the user clicks previous/next month in the calendar header, keeping the calendar grid and the commitments list in 100% sync.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PlanPage (/plan)                              │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    FinancialCalendar Component                   │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Calendar Header (Month Switcher + Quick Actions)           │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ 7x6 Monthly Day Grid + Event Indicators                    │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ NEW: Current Month Unified Bills & Planned Schedule        │  │  │
│  │  │  - Recurring bills due this month                          │  │  │
│  │  │  - Planned purchases scheduled this month                 │  │  │
│  │  │  - Chronologically sorted by due day                       │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                    TransactionsPage & AddTransactionModal              │
│                                                                        │
│  - Remove `viewMode` ("with_future") state, filters & local storage    │
│  - Remove `(+X future)` badges and switch banners                      │
│  - Add `max={getToday()}` and submission check in AddTransactionModal  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Component & State Flow**:
  1. `TransactionsPage.tsx`: Drop `viewMode`, `futureCount`, `"with_future"` filter options. Streamline transaction query to standard date-descending sort.
  2. `AddTransactionModal.tsx`: Set `max={getToday()}` on date picker. Add submission guard ensuring `date <= getToday()`.
  3. `FinancialCalendar.tsx`:
     - Filter `recurringExpenses` and calculate their due date for `currentMonthKey`.
     - Filter `plannedExpenses` whose date falls within `currentMonthKey`.
     - Merge into `monthlyCommitments`, sort by date ascending.
     - Render the unified schedule container directly beneath the calendar legend.
  4. `HelpModal.tsx`: Clean up the FAQ question explaining "With future payments".
