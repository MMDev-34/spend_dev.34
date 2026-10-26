import { Transaction } from "@/types/transaction";

/**
 * Checks if a transaction represents a money transfer, money lent,
 * money borrowed, or a loan repayment/settlement.
 * Such records are non-budgetary transfers and should not be counted
 * toward actual expenses or actual income.
 */
export function isTransferOrLoan(tx: Transaction): boolean {
  if (!tx) return false;

  // 1. Explicit transfer type
  if (tx.type === "transfer") return true;

  // 2. Explicit tag
  if (
    tx.tag === "transfer" ||
    tx.tag === "loan" ||
    tx.tag === "settlement" ||
    tx.tag === "borrow" ||
    tx.tag === "lent"
  ) {
    return true;
  }

  // 3. Category ID matches transfer category
  if (tx.categoryId === "cat-transfer") return true;

  // 4. ID patterns for loans and settlements
  if (
    tx.id.startsWith("tx-loan-") ||
    tx.id.startsWith("tx-settle-") ||
    tx.id.startsWith("tx-repay-")
  ) {
    return true;
  }

  // 5. Payment method flag
  if (tx.paymentMethod?.toLowerCase() === "settlement") {
    return true;
  }

  // 6. Note indicators (settlement, lent, borrowed prefixes)
  if (tx.note) {
    const lower = tx.note.toLowerCase().trim();
    if (
      lower.startsWith("got back from") ||
      lower.startsWith("paid back to") ||
      lower.startsWith("debt settlement to") ||
      lower.startsWith("debt repayment from") ||
      lower.startsWith("full debt settlement to") ||
      lower.startsWith("full debt repayment from") ||
      lower.startsWith("lent to") ||
      lower.startsWith("borrowed from") ||
      lower.startsWith("transfer to") ||
      lower.startsWith("transfer from")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a transaction is a genuine expense (excluding transfers/loans).
 */
export function isRealExpense(tx: Transaction): boolean {
  return tx.type === "expense" && !isTransferOrLoan(tx);
}

/**
 * Checks if a transaction is genuine income (excluding transfers/loans).
 */
export function isRealIncome(tx: Transaction): boolean {
  return tx.type === "income" && !isTransferOrLoan(tx);
}

/**
 * Returns a human-friendly label for transfers/loans to display in the UI.
 */
export function getTransferOrLoanLabel(tx: Transaction): string | null {
  if (!isTransferOrLoan(tx)) return null;

  const note = (tx.note || "").toLowerCase().trim();
  if (
    tx.id.startsWith("tx-settle-") ||
    tx.id.startsWith("tx-repay-") ||
    note.startsWith("got back from") ||
    note.startsWith("paid back to") ||
    note.includes("settlement") ||
    note.includes("repayment")
  ) {
    return "Settlement";
  }

  if (
    tx.id.startsWith("tx-loan-") ||
    note.startsWith("lent to") ||
    note.startsWith("borrowed from")
  ) {
    return "Loan";
  }

  return "Transfer";
}
