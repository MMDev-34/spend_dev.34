export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Integer minor units (e.g. ₹250.50 -> 25050)
  categoryId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  paymentMethod?: string;
  isUnwanted?: boolean; // Flag for unwanted / impulse spend
  createdAt: string;
  updatedAt: string;
}
