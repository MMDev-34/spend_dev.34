# Implementation Plan: Exclude Transfers, Loans & Settlements from Expenses & Income

Ensure that money transfers, money lent, money borrowed, and debt settlements/repayments are excluded from all expense and income calculations throughout Spend (Overview summaries, charts, day totals, calendar inspector), while remaining fully visible in the transaction history with a neutral visual presentation and a distinct badge.

---

## 1. Classification Engine (`src/utils/transactionClassification.ts`)

Create a centralized helper `isTransferOrLoan(tx: Transaction): boolean` and helper getters:
- Returns `true` if:
  - `tx.type === "transfer"`
  - `tx.tag === "transfer" || tx.tag === "loan" || tx.tag === "settlement"`
  - `tx.categoryId === "cat-transfer"`
  - `tx.id.startsWith("tx-loan-") || tx.id.startsWith("tx-settle-")`
  - Transaction note or paymentMethod indicates a loan/settlement (`Got Back from`, `Paid Back to`, `Lent to`, `Borrowed from`, `Debt settlement`)
- `isRealExpense(tx)`: `tx.type === "expense" && !isTransferOrLoan(tx)`
- `isRealIncome(tx)`: `tx.type === "income" && !isTransferOrLoan(tx)`

---

## 2. Transaction Generation Updates

1. **`src/components/borrowLend/NewTransactionView.tsx`**:
   - When recording money lent or money borrowed, create transactions with `type: "transfer"`, `tag: "transfer"`, and `categoryId: "cat-transfer"`.
2. **`src/components/transaction/AddPaymentModal.tsx`**:
   - When recording a transfer from the Transfer tab, assign `type: "transfer"`, `tag: "transfer"`, and `categoryId: "cat-transfer"`.
3. **`src/stores/appStore.ts`**:
   - In `addRepayment` and `settleLoan`, set the generated Activity transaction's type to `"transfer"` and tag to `"transfer"`.

---

## 3. Financial Totals & Chart Updates

1. **`src/pages/Overview/OverviewPage.tsx`**:
   - `totalExpense`: computed strictly over `isRealExpense(tx)`.
   - `totalIncome`: computed strictly over `isRealIncome(tx)`.
   - `CategoryDonutSection`: excludes transfer category and loan transactions.
   - `CashFlowTrendChart` & `FiveMonthExpenseChart`: reflect real expenses and real income only.
   - `Average Daily Expense` and `Net Headroom`: accurately exclude transfers and loans.
2. **`src/pages/Transactions/TransactionsPage.tsx`**:
   - Timeline day group headers: `totalExpense` and `totalIncome` compute only non-transfer items.
   - Filter tabs:
     - `Expenses`: shows only real expenses.
     - `Income`: shows only real income.
     - `Transfers` (or All): shows transfers, loans, and settlements.
   - Transaction Cards:
     - For transfers and loans: display neutral text color (without `+` or `-` prefix) and display a clear `Transfer` or `Loan` badge.
3. **`src/components/calendar/DayInspectorModal.tsx`**:
   - Day totals (`totalSpent` and `totalIncome`) exclude transfers and loans.

---

## 4. Verification & Testing

- Verify that creating a transfer, lending money, borrowing money, or recording a settlement leaves the Overview "Total Expenses" and "Total Income" untouched.
- Verify that the transaction record still appears in the Activity/Transactions list with a neutral amount and a `Transfer` badge.
- Run `lint_applet` and `compile_applet` to ensure type safety and build success.
