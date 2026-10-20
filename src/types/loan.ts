export type LoanDirection = "lent" | "borrowed";

export interface Repayment {
  id: string;
  amount: number; // Integer minor units
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface Loan {
  id: string;
  personId: string;
  direction: LoanDirection;
  amount: number; // Integer minor units
  description?: string;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  repayments: Repayment[];
  createdAt: string;
  updatedAt: string;
}
