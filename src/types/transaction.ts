export type TransactionType = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Integer minor units (e.g. ₹250.50 -> 25050)
  categoryId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  paymentMethod?: string;
  isUnwanted?: boolean; // Flag for unwanted / impulse spend
  tag?: string; // Optional tag, e.g. "transfer"
  createdAt: string;
  updatedAt: string;
}
