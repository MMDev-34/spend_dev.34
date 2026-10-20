import { Transaction } from "@/types/transaction";
import { Person } from "@/types/person";
import { Loan } from "@/types/loan";
import { getToday } from "@/utils/dates";

export function generateSampleData() {
  const todayStr = getToday();
  const [y, m, d] = todayStr.split("-").map(Number);

  // Generate date offsets
  const getDateOffset = (dayDelta: number) => {
    const dt = new Date(y, m - 1, d + dayDelta);
    const yr = dt.getFullYear();
    const mo = (dt.getMonth() + 1).toString().padStart(2, "0");
    const dy = dt.getDate().toString().padStart(2, "0");
    return `${yr}-${mo}-${dy}`;
  };

  const sampleTransactions: Transaction[] = [
    {
      id: "demo-tx-1",
      type: "expense",
      amount: 28000, // ₹280.00
      categoryId: "cat-food",
      date: todayStr,
      note: "Team lunch bowl",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-tx-2",
      type: "expense",
      amount: 14000, // ₹140.00
      categoryId: "cat-food",
      date: todayStr,
      note: "Artisan espresso",
      isUnwanted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-tx-3",
      type: "expense",
      amount: 45000, // ₹450.00
      categoryId: "cat-transport",
      date: getDateOffset(-1),
      note: "Metro weekly recharge",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-tx-4",
      type: "expense",
      amount: 125000, // ₹1,250.00
      categoryId: "cat-shopping",
      date: getDateOffset(-2),
      note: "Running shoes insole",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-tx-5",
      type: "expense",
      amount: 85000, // ₹850.00
      categoryId: "cat-food",
      date: getDateOffset(-3),
      note: "Weekly organic vegetables",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-tx-6",
      type: "expense",
      amount: 199900, // ₹1,999.00
      categoryId: "cat-bills",
      date: getDateOffset(-5),
      note: "High-speed fiber broadband",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-tx-7",
      type: "income",
      amount: 6500000, // ₹65,000.00
      categoryId: "cat-salary",
      date: getDateOffset(-4),
      note: "Monthly product stipend",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-tx-8",
      type: "expense",
      amount: 49900, // ₹499.00
      categoryId: "cat-entertainment",
      date: getDateOffset(-2),
      note: "Cinema IMAX movie tickets",
      isUnwanted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const samplePeople: Person[] = [
    {
      id: "demo-p-1",
      name: "Rahul Mehta",
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-p-2",
      name: "Sarah Jenkins",
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleLoans: Loan[] = [
    {
      id: "demo-loan-1",
      personId: "demo-p-1",
      direction: "lent",
      amount: 120000, // ₹1,200.00
      description: "Concert tickets booking",
      date: getDateOffset(-6),
      dueDate: getDateOffset(4),
      repayments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-loan-2",
      personId: "demo-p-2",
      direction: "borrowed",
      amount: 45000, // ₹450.00
      description: "Split Uber ride",
      date: getDateOffset(-2),
      repayments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    transactions: sampleTransactions,
    people: samplePeople,
    loans: sampleLoans,
  };
}
