# Implementation Plan - Record Transfers / Lent Amounts as Expenses with 'Transfer' Tag

Treat transfers and money lent to others as **expenses** with a dedicated **Transfer** tag. This ensures they are automatically counted in total spending and deducted from balance while preserving the visual identity and ledger tracking of a transfer.

## User Requirements & Clarifications Confirmed
1. **Expenses Calculation**: Transfers and lent amounts are categorized as expenses so they are counted in total spending, expense charts, and deducted from account balance.
2. **Transfer Tag**: The underlying transaction record will have `type: "expense"` and `tag: "transfer"`.
3. **Visual Badge**: Display a distinct "Transfer" badge/tag next to the category in transaction lists, feeds, and detail modals.
4. **Borrow & Lend Integration**: When adding a "Lent" record from the Borrow & Lend page (`/borrow-lend`), also automatically record an expense transaction with `tag: "transfer"`.
5. **Firebase Rules & Blueprint**: Update `firestore.rules` and `firebase-blueprint.json` to allow the optional `tag` field on transactions and deploy them.

---

## Proposed Changes

### 1. `src/types/transaction.ts`
- Add optional `tag?: string` to the `Transaction` interface (e.g., `"transfer"`).

### 2. `src/components/transaction/AddPaymentModal.tsx`
- In `handleSave`:
  - When `type === "transfer"`:
    - Save the transaction with `type: "expense"` and `tag: "transfer"`.
    - Note will store the note text plus `(To: ContactName)`.
    - Automatically create the active `Loan` with `direction: "lent"` in `appStore` (so it displays in the Lent tab of Borrow & Lend).
    - Confirmation toast: `"Transfer recorded as expense & added to Lent"`.

### 3. `src/pages/BorrowLend/BorrowLendPage.tsx`
- In `handleCreateLoan`:
  - When `direction === "lent"`:
    - In addition to creating the loan, automatically call `addTransaction` with:
      - `type: "expense"`
      - `tag: "transfer"`
      - `amount: amount`
      - `categoryId: defaultExpenseCategory`
      - `date: startDate || getToday()`
      - `note: "Lent to [ContactName]"`
      - `paymentMethod: "upi"`

### 4. Transaction Displays (`TransactionsPage.tsx` & `TransactionDetailsModal.tsx`)
- In `TransactionsPage.tsx`:
  - Render a styled sky-blue `<span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold shrink-0">Transfer</span>` badge beside the category name for transactions with `t.tag === "transfer"`.
  - When editing a transaction with `tag === "transfer"`, open `AddPaymentModal` with the "Transfer" tab pre-selected.
- In `TransactionDetailsModal.tsx`:
  - Render the "Transfer" badge alongside the "Expense" badge in the hero header.

### 5. Firebase Blueprint & Security Rules
- In `firebase-blueprint.json`:
  - Add `tag` property (`type: "string"`, `maxLength: 64`) to `Transaction` entity.
- In `firestore.rules`:
  - Include `'tag'` in `isValidTransaction` allowed keys: `data.keys().hasOnly([... 'tag', ...])`.
  - Add validation: `(!('tag' in data) || (data.tag is string && data.tag.size() <= 64))`.
- Deploy the updated rules to Firebase via `deploy_firebase`.

### 6. Transfer Category Configuration in 'New Transaction' Modal
- Add canonical default system category `cat-transfer` ("Transfer", icon `🔄`, color `#0EA5E9`, type `"both"`, `isDefault: true`) to `DEFAULT_CATEGORIES` in `src/lib/constants.ts`.
- Ensure `storage.loadState` automatically populates the `cat-transfer` default category if not present in cached storage.
- In `src/components/transaction/AddPaymentModal.tsx`:
  - When opening in or switching to the "Transfer" tab, immediately lock and pre-select the category to "Transfer" (`cat-transfer`).
  - In the Category dropdown selector, clearly display the category as "Transfer" (with `🔄` icon, name "Transfer", and a "Set to Transfer" indicator badge), disabling unintended category changes.
  - When switching back to "Expense" or "Income", gracefully switch back to standard valid categories for that type.
  - On submit, ensure transactions logged under the Transfer tab save with the Transfer category ID.
- In `src/pages/BorrowLend/BorrowLendPage.tsx`:
  - When auto-logging an expense transaction for a lent loan, assign the Transfer category.

---

## Verification Plan

### Automated Verification
1. Run `lint_applet` to confirm zero TypeScript compilation or linting errors. (Passed)
2. Run `compile_applet` to ensure full Vite build success. (Passed)
3. Deploy updated Firestore rules and verify success. (Passed)

### Manual / Browser Verification
1. **New Transaction modal -> Transfer tab**:
   - Verify category field is set to "Transfer" with icon `🔄` and "Set to Transfer" indicator.
   - Enter amount and recipient name ("Alex").
   - Save transfer.
   - Verify transfer transaction is saved under category "Transfer" with the sky-blue "Transfer" badge.
   - Verify the lent loan appears in the Lent tab of Borrow & Lend.
2. **Tab Switching**:
   - Open modal: defaults to Expense with standard expense category (e.g. Food).
   - Click "Transfer": category immediately sets to "Transfer".
   - Click "Income": category switches to an income category (e.g. Salary).
   - Click "Transfer": category sets back to "Transfer".
