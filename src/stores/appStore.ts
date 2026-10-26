import { create } from "zustand";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Person } from "@/types/person";
import { Loan, Repayment } from "@/types/loan";
import { CategoryBudget, RecurringExpense, PlannedExpense } from "@/types/plan";
import { Settings, SpendState } from "@/types/settings";
import { storage } from "@/lib/storage";
import { CURRENT_STATE_VERSION, DEFAULT_CATEGORY_BUDGETS, DEFAULT_RECURRING, DEFAULT_PLANNED_EXPENSES, INITIAL_STATE } from "@/lib/constants";
import { getToday } from "@/utils/dates";
import { generateSampleData } from "@/lib/demoData";
import { auth } from "@/lib/firebase";
import {
  syncTransactionToCloud,
  deleteTransactionFromCloud,
  syncCategoryToCloud,
  deleteCategoryFromCloud,
  syncPersonToCloud,
  deletePersonFromCloud,
  syncLoanToCloud,
  deleteLoanFromCloud,
  syncBudgetToCloud,
  deleteBudgetFromCloud,
  syncRecurringToCloud,
  deleteRecurringFromCloud,
  syncPlannedToCloud,
  deletePlannedFromCloud,
  syncSettingsToCloud,
  clearUserDataFromCloud,
} from "@/lib/firebaseSync";

interface AppState extends SpendState {
  categoryBudgets: CategoryBudget[];
  recurringExpenses: RecurringExpense[];
  plannedExpenses: PlannedExpense[];

  // Transaction actions
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Transaction;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => void;
  deleteTransaction: (id: string) => void;
  restoreTransaction: (tx: Transaction) => void;
  batchDeleteTransactions: (ids: string[]) => void;
  batchUpdateCategory: (ids: string[], categoryId: string) => void;
  duplicateTransaction: (id: string) => Transaction | null;

  // Category actions
  addCategory: (category: Omit<Category, "id" | "createdAt">) => Category;
  updateCategory: (id: string, updates: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string, reassignmentCategoryId?: string) => boolean;
  reorderCategories: (newCategories: Category[]) => void;

  // People & Loan actions
  addPerson: (name: string) => Person;
  updatePerson: (id: string, name: string) => void;
  deletePerson: (id: string, cascadeLoans?: boolean) => boolean;

  addLoan: (loan: Omit<Loan, "id" | "repayments" | "createdAt" | "updatedAt">) => Loan;
  updateLoan: (id: string, updates: Partial<Omit<Loan, "id" | "repayments" | "createdAt">>) => void;
  deleteLoan: (id: string) => void;
  addRepayment: (loanId: string, repayment: Omit<Repayment, "id">) => void;
  deleteRepayment: (loanId: string, repaymentId: string) => void;
  settleLoan: (loanId: string) => void;
  settleContact: (personId: string, amount?: number, date?: string, note?: string, paymentMethod?: string) => void;

  // Category Budgets
  addCategoryBudget: (budget: Omit<CategoryBudget, "id" | "createdAt" | "updatedAt">) => CategoryBudget;
  updateCategoryBudget: (id: string, updates: Partial<Omit<CategoryBudget, "id" | "createdAt">>) => void;
  deleteCategoryBudget: (id: string) => void;

  // Recurring Expenses
  addRecurringExpense: (expense: Omit<RecurringExpense, "id" | "createdAt">) => RecurringExpense;
  updateRecurringExpense: (id: string, updates: Partial<Omit<RecurringExpense, "id" | "createdAt">>) => void;
  deleteRecurringExpense: (id: string) => void;
  toggleRecurringPause: (id: string) => void;
  logRecurringAsTransaction: (recurringId: string, customDate?: string, targetCycle?: string) => Transaction | null;

  // Planned Future Expenses
  addPlannedExpense: (expense: Omit<PlannedExpense, "id" | "createdAt">) => PlannedExpense;
  updatePlannedExpense: (id: string, updates: Partial<Omit<PlannedExpense, "id" | "createdAt">>) => void;
  deletePlannedExpense: (id: string) => void;
  markPlannedExpenseAsPaid: (id: string, customDate?: string) => Transaction | null;

  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;

  // User Isolation
  currentUserId: string | null;
  loadUserScope: (userId: string | null) => void;

  // Full state management
  resetAllData: () => void;
  loadDemoData: () => void;
  importState: (json: string) => { success: boolean; error?: string };
}

export const useAppStore = create<AppState>((set, get) => {
  // Load initial state from storage adapter
  const loaded = storage.loadState(null);

  const syncAndSet = (updater: (state: SpendState) => Partial<SpendState>) => {
    set((current) => {
      const updated = updater(current);
      const newState: SpendState = {
        version: CURRENT_STATE_VERSION,
        transactions: updated.transactions ?? current.transactions,
        categories: updated.categories ?? current.categories,
        people: updated.people ?? current.people,
        loans: updated.loans ?? current.loans,
        categoryBudgets: updated.categoryBudgets ?? current.categoryBudgets,
        recurringExpenses: updated.recurringExpenses ?? current.recurringExpenses,
        plannedExpenses: updated.plannedExpenses ?? current.plannedExpenses,
        settings: updated.settings ?? current.settings,
      };
      const activeUid = auth.currentUser?.uid || current.currentUserId || "guest";
      storage.saveState(newState, activeUid);
      return newState as any;
    });
  };

  return {
    ...loaded,
    currentUserId: null,
    transactions: loaded.transactions || [],
    categories: loaded.categories && loaded.categories.length > 0 ? loaded.categories : INITIAL_STATE.categories,
    people: loaded.people || [],
    loans: loaded.loans || [],
    categoryBudgets: loaded.categoryBudgets || [],
    recurringExpenses: loaded.recurringExpenses || [],
    plannedExpenses: loaded.plannedExpenses || [],
    settings: loaded.settings || INITIAL_STATE.settings,

    loadUserScope: (userId) => {
      const userLoaded = storage.loadState(userId);
      set({
        currentUserId: userId || null,
        transactions: userLoaded.transactions || [],
        categories:
          userLoaded.categories && userLoaded.categories.length > 0
            ? userLoaded.categories
            : INITIAL_STATE.categories,
        people: userLoaded.people || [],
        loans: userLoaded.loans || [],
        categoryBudgets: userLoaded.categoryBudgets || [],
        recurringExpenses: userLoaded.recurringExpenses || [],
        plannedExpenses: userLoaded.plannedExpenses || [],
        settings: userLoaded.settings || INITIAL_STATE.settings,
      });
    },

    // Transactions
    addTransaction: (txData) => {
      const now = new Date().toISOString();
      const newTx: Transaction = {
        ...txData,
        isUnwanted: txData.type === "expense" ? Boolean(txData.isUnwanted) : false,
        id: txData.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };

      syncAndSet((state) => ({
        transactions: [newTx, ...state.transactions],
      }));

      if (auth.currentUser) {
        syncTransactionToCloud(newTx, auth.currentUser.uid);
      }

      return newTx;
    },

    updateTransaction: (id, updates) => {
      const now = new Date().toISOString();
      let updatedTx: Transaction | undefined;
      syncAndSet((state) => {
        const nextTransactions = state.transactions.map((t) => {
          if (t.id === id) {
            const nextType = updates.type ?? t.type;
            const nextIsUnwanted = updates.isUnwanted !== undefined 
              ? (nextType === "expense" ? Boolean(updates.isUnwanted) : false)
              : (nextType === "expense" ? Boolean(t.isUnwanted) : false);

            updatedTx = { 
              ...t, 
              ...updates, 
              isUnwanted: nextIsUnwanted,
              updatedAt: now 
            };
            return updatedTx;
          }
          return t;
        });
        return { transactions: nextTransactions };
      });

      if (auth.currentUser && updatedTx) {
        syncTransactionToCloud(updatedTx, auth.currentUser.uid);
      }
    },

    deleteTransaction: (id) => {
      syncAndSet((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));

      if (auth.currentUser) {
        deleteTransactionFromCloud(id);
      }
    },

    restoreTransaction: (tx) => {
      syncAndSet((state) => {
        if (state.transactions.some((t) => t.id === tx.id)) {
          return state;
        }
        const updated = [tx, ...state.transactions].sort((a, b) => 
          b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
        );
        return { transactions: updated };
      });

      if (auth.currentUser) {
        syncTransactionToCloud(tx, auth.currentUser.uid);
      }
    },

    batchDeleteTransactions: (ids) => {
      const idSet = new Set(ids);
      syncAndSet((state) => ({
        transactions: state.transactions.filter((t) => !idSet.has(t.id)),
      }));

      if (auth.currentUser) {
        ids.forEach((id) => deleteTransactionFromCloud(id));
      }
    },

    batchUpdateCategory: (ids, categoryId) => {
      const idSet = new Set(ids);
      const now = new Date().toISOString();
      syncAndSet((state) => {
        const updated = state.transactions.map((t) =>
          idSet.has(t.id) ? { ...t, categoryId, updatedAt: now } : t
        );
        if (auth.currentUser) {
          updated
            .filter((t) => idSet.has(t.id))
            .forEach((t) => syncTransactionToCloud(t, auth.currentUser!.uid));
        }
        return { transactions: updated };
      });
    },

    duplicateTransaction: (id) => {
      const existing = get().transactions.find((t) => t.id === id);
      if (!existing) return null;

      const now = new Date().toISOString();
      const duplicated: Transaction = {
        ...existing,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: getToday(),
        createdAt: now,
        updatedAt: now,
      };

      syncAndSet((state) => ({
        transactions: [duplicated, ...state.transactions],
      }));

      if (auth.currentUser) {
        syncTransactionToCloud(duplicated, auth.currentUser.uid);
      }

      return duplicated;
    },

    // Categories
    addCategory: (catData) => {
      const trimmedName = (catData.name || "").trim().toLowerCase();
      const existing = get().categories.find(
        (c) =>
          c.name.trim().toLowerCase() === trimmedName &&
          (c.type === catData.type || c.type === "both" || catData.type === "both")
      );

      if (existing) {
        // Return existing category instead of creating a duplicate
        return existing;
      }

      const newCategory: Category = {
        ...catData,
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };

      syncAndSet((state) => ({
        categories: [...state.categories, newCategory],
      }));

      if (auth.currentUser) {
        syncCategoryToCloud(newCategory, auth.currentUser.uid);
      }

      return newCategory;
    },

    updateCategory: (id, updates) => {
      let updatedCat: Category | undefined;
      syncAndSet((state) => {
        const nextCategories = state.categories.map((c) => {
          if (c.id === id) {
            updatedCat = { ...c, ...updates };
            return updatedCat;
          }
          return c;
        });
        return { categories: nextCategories };
      });

      if (auth.currentUser && updatedCat) {
        syncCategoryToCloud(updatedCat, auth.currentUser.uid);
      }
    },

    deleteCategory: (id, reassignmentCategoryId) => {
      const transactions = get().transactions;
      const hasTransactions = transactions.some((t) => t.categoryId === id);

      if (hasTransactions && !reassignmentCategoryId) {
        return false;
      }

      syncAndSet((state) => {
        let updatedTransactions = state.transactions;
        if (hasTransactions && reassignmentCategoryId) {
          updatedTransactions = state.transactions.map((t) =>
            t.categoryId === id ? { ...t, categoryId: reassignmentCategoryId } : t
          );
        }

        return {
          categories: state.categories.filter((c) => c.id !== id),
          transactions: updatedTransactions,
        };
      });

      if (auth.currentUser) {
        deleteCategoryFromCloud(id);
      }

      return true;
    },

    reorderCategories: (newCategories) => {
      syncAndSet(() => ({
        categories: newCategories,
      }));
    },

    // People
    addPerson: (name) => {
      const newPerson: Person = {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        createdAt: new Date().toISOString(),
      };

      syncAndSet((state) => ({
        people: [...state.people, newPerson],
      }));

      if (auth.currentUser) {
        syncPersonToCloud(newPerson, auth.currentUser.uid);
      }

      return newPerson;
    },

    updatePerson: (id, name) => {
      let updatedP: Person | undefined;
      syncAndSet((state) => {
        const nextPeople = state.people.map((p) => {
          if (p.id === id) {
            updatedP = { ...p, name: name.trim() };
            return updatedP;
          }
          return p;
        });
        return { people: nextPeople };
      });

      if (auth.currentUser && updatedP) {
        syncPersonToCloud(updatedP, auth.currentUser.uid);
      }
    },

    deletePerson: (id, cascadeLoans = false) => {
      const associatedLoans = get().loans.filter((l) => l.personId === id);
      if (associatedLoans.length > 0 && !cascadeLoans) return false;

      const autoTxIds = new Set<string>();
      if (cascadeLoans) {
        associatedLoans.forEach((l) => {
          l.repayments.forEach((r) => autoTxIds.add(`tx-settle-${r.id}`));
          autoTxIds.add(`tx-loan-${l.id}`);
        });
      }

      syncAndSet((state) => ({
        people: state.people.filter((p) => p.id !== id),
        loans: cascadeLoans ? state.loans.filter((l) => l.personId !== id) : state.loans,
        transactions: cascadeLoans ? state.transactions.filter((t) => !autoTxIds.has(t.id)) : state.transactions,
      }));

      if (auth.currentUser) {
        deletePersonFromCloud(id);
        if (cascadeLoans) {
          associatedLoans.forEach((l) => {
            deleteLoanFromCloud(l.id);
            l.repayments.forEach((r) => deleteTransactionFromCloud(`tx-settle-${r.id}`).catch(() => {}));
            deleteTransactionFromCloud(`tx-loan-${l.id}`).catch(() => {});
          });
        }
      }
      return true;
    },

    // Loans
    addLoan: (loanData) => {
      const now = new Date().toISOString();
      const newLoan: Loan = {
        ...loanData,
        id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        repayments: [],
        createdAt: now,
        updatedAt: now,
      };

      syncAndSet((state) => ({
        loans: [newLoan, ...state.loans],
      }));

      if (auth.currentUser) {
        syncLoanToCloud(newLoan, auth.currentUser.uid).catch((err) => {
          console.warn("Cloud sync deferred (Firestore permission issue):", err?.message || err);
        });
      }

      return newLoan;
    },

    updateLoan: (id, updates) => {
      const now = new Date().toISOString();
      let updatedL: Loan | undefined;
      let updatedTxToSync: Transaction | undefined;

      syncAndSet((state) => {
        const nextLoans = state.loans.map((l) => {
          if (l.id === id) {
            updatedL = { ...l, ...updates, updatedAt: now };
            return updatedL;
          }
          return l;
        });

        // Also sync origin transaction if amount, date, description, or paymentMethod changed
        let nextTransactions = state.transactions;
        const originTx = state.transactions.find((t) => t.id === `tx-loan-${id}`);
        if (originTx) {
          const person = state.people.find((p) => p.id === (updatedL?.personId || originTx.id));
          const personName = person?.name || "Contact";
          const newAmount = updates.amount !== undefined ? updates.amount : originTx.amount;
          const newDate = updates.date !== undefined ? updates.date : originTx.date;
          const newPaymentMethod = updates.paymentMethod !== undefined ? updates.paymentMethod.toLowerCase() : originTx.paymentMethod;
          const newDesc = updates.description !== undefined ? updates.description : "";
          const directionLabel = (updatedL?.direction || "borrowed") === "lent" ? "Lent to" : "Borrowed from";
          const newNote = newDesc.trim() ? `${newDesc.trim()} (${directionLabel}: ${personName})` : `${directionLabel} ${personName}`;

          updatedTxToSync = {
            ...originTx,
            amount: newAmount,
            date: newDate,
            paymentMethod: newPaymentMethod,
            note: newNote,
            updatedAt: now,
          };
          nextTransactions = state.transactions.map((t) => (t.id === originTx.id ? updatedTxToSync! : t));
        }

        return { loans: nextLoans, transactions: nextTransactions };
      });

      if (auth.currentUser) {
        if (updatedL) {
          syncLoanToCloud(updatedL, auth.currentUser.uid).catch((err) => {
            console.warn("Cloud sync deferred (Firestore permission issue):", err?.message || err);
          });
        }
        if (updatedTxToSync) {
          syncTransactionToCloud(updatedTxToSync, auth.currentUser.uid).catch(() => {});
        }
      }
    },

    deleteLoan: (id) => {
      const autoTxIds = new Set<string>();
      syncAndSet((state) => {
        const targetLoan = state.loans.find((l) => l.id === id);
        targetLoan?.repayments.forEach((r) => autoTxIds.add(`tx-settle-${r.id}`));
        autoTxIds.add(`tx-loan-${id}`);
        return {
          loans: state.loans.filter((l) => l.id !== id),
          transactions: state.transactions.filter((t) => !autoTxIds.has(t.id)),
        };
      });

      if (auth.currentUser) {
        deleteLoanFromCloud(id);
        autoTxIds.forEach((txId) => {
          deleteTransactionFromCloud(txId).catch(() => {});
        });
      }
    },

    addRepayment: (loanId, repaymentData) => {
      const newRepayment: Repayment = {
        ...repaymentData,
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };

      const now = new Date().toISOString();
      let updatedLoanObj: Loan | undefined;
      let newExpenseTx: Transaction | undefined;

      syncAndSet((state) => {
        const targetLoan = state.loans.find((l) => l.id === loanId);
        let updatedTransactions = state.transactions;

        if (targetLoan) {
          const person = state.people.find((p) => p.id === targetLoan.personId);
          const personName = person?.name || "Contact";
          const currentRepaid = targetLoan.repayments.reduce((acc, r) => acc + r.amount, 0);
          const remainingBefore = Math.max(0, targetLoan.amount - currentRepaid);
          const isFull = newRepayment.amount >= remainingBefore;
          const resolvedPaymentMethod = (newRepayment.paymentMethod || targetLoan.paymentMethod || "upi").toLowerCase();

          // Structured Note generation
          const formatMode = (m: string) => {
            const lower = m.toLowerCase();
            if (lower === "upi") return "UPI";
            if (lower === "cash") return "Cash";
            if (lower.includes("bank") || lower === "netbanking") return "Bank Transfer";
            if (lower.includes("card")) return "Card";
            if (lower === "other") return "Other";
            return m.charAt(0).toUpperCase() + m.slice(1);
          };

          const noteLines = [
            targetLoan.direction === "lent"
              ? `Got Back from ${personName}`
              : `Paid Back to ${personName}`,
            `Type: ${isFull ? "Full settlement" : "Partial settlement"}`,
            `Payment Mode: ${formatMode(resolvedPaymentMethod)}`,
          ];

          if (newRepayment.note) {
            const trimmed = newRepayment.note.trim();
            const lower = trimmed.toLowerCase();
            if (
              trimmed &&
              lower !== "full settlement" &&
              lower !== "partial settlement" &&
              lower !== "full repayment" &&
              lower !== "partial installment" &&
              lower !== "settled in full" &&
              lower !== "mutual debt offset" &&
              !trimmed.includes("·")
            ) {
              noteLines.push(`Note: ${trimmed}`);
            }
          }

          const structuredNote = noteLines.join("\n");

          const transferCat = state.categories.find((c) => c.id === "cat-transfer" || c.name.toLowerCase() === "transfer");
          const transferCatId = transferCat?.id || "cat-transfer";

          newExpenseTx = {
            id: `tx-settle-${newRepayment.id}`,
            type: "transfer",
            tag: "transfer",
            amount: newRepayment.amount,
            categoryId: transferCatId,
            date: newRepayment.date || getToday(),
            note: structuredNote,
            paymentMethod: resolvedPaymentMethod,
            createdAt: now,
            updatedAt: now,
          };

          updatedTransactions = [newExpenseTx, ...state.transactions];
        }

        const nextLoans = state.loans.map((l) => {
          if (l.id === loanId) {
            updatedLoanObj = {
              ...l,
              repayments: [...l.repayments, newRepayment],
              updatedAt: now,
            };
            return updatedLoanObj;
          }
          return l;
        });

        return {
          loans: nextLoans,
          transactions: updatedTransactions,
        };
      });

      if (auth.currentUser) {
        if (updatedLoanObj) {
          syncLoanToCloud(updatedLoanObj, auth.currentUser.uid).catch((err) => {
            console.warn("Cloud sync deferred (Firestore permission issue):", err?.message || err);
          });
        }
        if (newExpenseTx) {
          syncTransactionToCloud(newExpenseTx, auth.currentUser.uid).catch((err) => {
            console.warn("Cloud sync deferred (Firestore permission issue):", err?.message || err);
          });
        }
      }
    },

    deleteRepayment: (loanId, repaymentId) => {
      const now = new Date().toISOString();
      let updatedLoanObj: Loan | undefined;
      syncAndSet((state) => {
        const nextLoans = state.loans.map((l) => {
          if (l.id === loanId) {
            updatedLoanObj = {
              ...l,
              repayments: l.repayments.filter((r) => r.id !== repaymentId),
              updatedAt: now,
            };
            return updatedLoanObj;
          }
          return l;
        });
        return {
          loans: nextLoans,
          transactions: state.transactions.filter((t) => t.id !== `tx-settle-${repaymentId}`),
        };
      });

      if (auth.currentUser) {
        if (updatedLoanObj) {
          syncLoanToCloud(updatedLoanObj, auth.currentUser.uid).catch((err) => {
            console.error("Cloud sync error deleting repayment:", err);
          });
        }
        deleteTransactionFromCloud(`tx-settle-${repaymentId}`).catch((err) => {
          console.error("Cloud sync error deleting settlement transaction:", err);
        });
      }
    },

    settleLoan: (loanId) => {
      const targetLoan = get().loans.find((l) => l.id === loanId);
      if (!targetLoan) return;

      const currentRepaid = targetLoan.repayments.reduce((acc, r) => acc + r.amount, 0);
      const remaining = Math.max(0, targetLoan.amount - currentRepaid);
      if (remaining === 0) return;

      const settlementPaymentMethod = (targetLoan.paymentMethod || "upi").toLowerCase();
      const settlementRepayment: Repayment = {
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount: remaining,
        date: getToday(),
        paymentMethod: settlementPaymentMethod,
        note: "Full settlement",
      };

      const now = new Date().toISOString();
      let updatedLoanObj: Loan | undefined;
      let newExpenseTx: Transaction | undefined;

      syncAndSet((state) => {
        let updatedTransactions = state.transactions;
        const person = state.people.find((p) => p.id === targetLoan.personId);
        const personName = person?.name || "Contact";

        const formatMode = (m: string) => {
          const lower = m.toLowerCase();
          if (lower === "upi") return "UPI";
          if (lower === "cash") return "Cash";
          if (lower.includes("bank") || lower === "netbanking") return "Bank Transfer";
          if (lower.includes("card")) return "Card";
          if (lower === "other") return "Other";
          return m.charAt(0).toUpperCase() + m.slice(1);
        };

        const structuredNote = [
          targetLoan.direction === "lent"
            ? `Got Back from ${personName}`
            : `Paid Back to ${personName}`,
          "Type: Full settlement",
          `Payment Mode: ${formatMode(settlementPaymentMethod)}`,
        ].join("\n");

        const transferCat = state.categories.find((c) => c.id === "cat-transfer" || c.name.toLowerCase() === "transfer");
        const transferCatId = transferCat?.id || "cat-transfer";

        newExpenseTx = {
          id: `tx-settle-${settlementRepayment.id}`,
          type: "transfer",
          tag: "transfer",
          amount: settlementRepayment.amount,
          categoryId: transferCatId,
          date: settlementRepayment.date,
          note: structuredNote,
          paymentMethod: settlementPaymentMethod,
          createdAt: now,
          updatedAt: now,
        };

        updatedTransactions = [newExpenseTx, ...state.transactions];

        const nextLoans = state.loans.map((l) => {
          if (l.id === loanId) {
            updatedLoanObj = {
              ...l,
              repayments: [...l.repayments, settlementRepayment],
              updatedAt: now,
            };
            return updatedLoanObj;
          }
          return l;
        });

        return {
          loans: nextLoans,
          transactions: updatedTransactions,
        };
      });

      if (auth.currentUser) {
        if (updatedLoanObj) syncLoanToCloud(updatedLoanObj, auth.currentUser.uid);
        if (newExpenseTx) syncTransactionToCloud(newExpenseTx, auth.currentUser.uid);
      }
    },

    settleContact: (personId, customAmount, customDate, customNote, paymentMethod) => {
      const state = get();
      const contactLoans = state.loans.filter((l) => l.personId === personId);
      if (contactLoans.length === 0) return;

      const activeLent = contactLoans.filter((l) => {
        const repaid = l.repayments.reduce((sum, r) => sum + r.amount, 0);
        return l.direction === "lent" && l.amount > repaid;
      });

      const activeBorrowed = contactLoans.filter((l) => {
        const repaid = l.repayments.reduce((sum, r) => sum + r.amount, 0);
        return l.direction === "borrowed" && l.amount > repaid;
      });

      const lentRemaining = activeLent.reduce((sum, l) => {
        const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
        return sum + (l.amount - repaid);
      }, 0);

      const borrowedRemaining = activeBorrowed.reduce((sum, l) => {
        const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
        return sum + (l.amount - repaid);
      }, 0);

      // Mutual overlap offset if contact has both active lent and borrowed records
      const overlap = Math.min(lentRemaining, borrowedRemaining);
      const settleDate = customDate || getToday();

      if (overlap > 0) {
        // Offset active borrowed loans
        let borrowedToOffset = overlap;
        for (const loan of [...activeBorrowed].sort((a, b) => a.date.localeCompare(b.date))) {
          if (borrowedToOffset <= 0) break;
          const repaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
          const rem = Math.max(0, loan.amount - repaid);
          if (rem <= 0) continue;
          const off = Math.min(borrowedToOffset, rem);
          borrowedToOffset -= off;
          get().addRepayment(loan.id, {
            amount: off,
            date: settleDate,
            note: "Mutual debt offset",
          });
        }

        // Offset active lent loans
        let lentToOffset = overlap;
        for (const loan of [...activeLent].sort((a, b) => a.date.localeCompare(b.date))) {
          if (lentToOffset <= 0) break;
          const repaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
          const rem = Math.max(0, loan.amount - repaid);
          if (rem <= 0) continue;
          const off = Math.min(lentToOffset, rem);
          lentToOffset -= off;
          get().addRepayment(loan.id, {
            amount: off,
            date: settleDate,
            note: "Mutual debt offset",
          });
        }
      }

      // Re-fetch remaining after offset
      const updatedLoans = get().loans.filter((l) => l.personId === personId);
      const updatedLent = updatedLoans.filter((l) => {
        const repaid = l.repayments.reduce((sum, r) => sum + r.amount, 0);
        return l.direction === "lent" && l.amount > repaid;
      });
      const updatedBorrowed = updatedLoans.filter((l) => {
        const repaid = l.repayments.reduce((sum, r) => sum + r.amount, 0);
        return l.direction === "borrowed" && l.amount > repaid;
      });

      let targetLoans: Loan[] = [];
      let maxPayable = 0;
      if (updatedBorrowed.length > 0) {
        targetLoans = [...updatedBorrowed].sort((a, b) => a.date.localeCompare(b.date));
        maxPayable = updatedBorrowed.reduce((sum, l) => {
          const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
          return sum + (l.amount - repaid);
        }, 0);
      } else if (updatedLent.length > 0) {
        targetLoans = [...updatedLent].sort((a, b) => a.date.localeCompare(b.date));
        maxPayable = updatedLent.reduce((sum, l) => {
          const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
          return sum + (l.amount - repaid);
        }, 0);
      }

      if (targetLoans.length === 0) return;

      let amountToDistribute =
        typeof customAmount === "number" && customAmount > 0
          ? Math.min(customAmount, maxPayable)
          : maxPayable;

      if (amountToDistribute <= 0) return;

      for (const loan of targetLoans) {
        if (amountToDistribute <= 0) break;
        const repaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
        const loanRemaining = Math.max(0, loan.amount - repaid);
        if (loanRemaining <= 0) continue;

        const paymentForThisLoan = Math.min(amountToDistribute, loanRemaining);
        amountToDistribute -= paymentForThisLoan;

        get().addRepayment(loan.id, {
          amount: paymentForThisLoan,
          date: settleDate,
          paymentMethod: paymentMethod || "upi",
          note: customNote || undefined,
        });
      }
    },

    // Category Budgets
    addCategoryBudget: (budgetData) => {
      const now = new Date().toISOString();
      const newBudget: CategoryBudget = {
        ...budgetData,
        id: `bgt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };

      syncAndSet((state) => ({
        categoryBudgets: [newBudget, ...(state.categoryBudgets || [])],
      }));

      if (auth.currentUser) {
        syncBudgetToCloud(newBudget, auth.currentUser.uid);
      }

      return newBudget;
    },

    updateCategoryBudget: (id, updates) => {
      const now = new Date().toISOString();
      let updatedB: CategoryBudget | undefined;
      syncAndSet((state) => {
        const nextBudgets = (state.categoryBudgets || []).map((b) => {
          if (b.id === id) {
            updatedB = { ...b, ...updates, updatedAt: now };
            return updatedB;
          }
          return b;
        });
        return { categoryBudgets: nextBudgets };
      });

      if (auth.currentUser && updatedB) {
        syncBudgetToCloud(updatedB, auth.currentUser.uid);
      }
    },

    deleteCategoryBudget: (id) => {
      syncAndSet((state) => ({
        categoryBudgets: (state.categoryBudgets || []).filter((b) => b.id !== id),
      }));

      if (auth.currentUser) {
        deleteBudgetFromCloud(id);
      }
    },

    // Recurring Expenses
    addRecurringExpense: (expenseData) => {
      const newRec: RecurringExpense = {
        ...expenseData,
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };

      syncAndSet((state) => ({
        recurringExpenses: [...(state.recurringExpenses || []), newRec],
      }));

      if (auth.currentUser) {
        syncRecurringToCloud(newRec, auth.currentUser.uid).catch((err) => {
          console.error("Cloud sync error for recurring bill:", err);
        });
      }

      return newRec;
    },

    updateRecurringExpense: (id, updates) => {
      let updatedR: RecurringExpense | undefined;
      syncAndSet((state) => {
        const nextRec = (state.recurringExpenses || []).map((r) => {
          if (r.id === id) {
            updatedR = { ...r, ...updates };
            return updatedR;
          }
          return r;
        });
        return { recurringExpenses: nextRec };
      });

      if (auth.currentUser && updatedR) {
        syncRecurringToCloud(updatedR, auth.currentUser.uid).catch((err) => {
          console.error("Cloud sync error updating recurring bill:", err);
        });
      }
    },

    deleteRecurringExpense: (id) => {
      syncAndSet((state) => ({
        recurringExpenses: (state.recurringExpenses || []).filter((r) => r.id !== id),
      }));

      if (auth.currentUser) {
        deleteRecurringFromCloud(id).catch((err) => {
          console.error("Cloud sync error deleting recurring bill:", err);
        });
      }
    },

    toggleRecurringPause: (id) => {
      let updatedR: RecurringExpense | undefined;
      syncAndSet((state) => {
        const nextRec = (state.recurringExpenses || []).map((r) => {
          if (r.id === id) {
            updatedR = { ...r, isPaused: !r.isPaused };
            return updatedR;
          }
          return r;
        });
        return { recurringExpenses: nextRec };
      });

      if (auth.currentUser && updatedR) {
        syncRecurringToCloud(updatedR, auth.currentUser.uid).catch((err) => {
          console.error("Cloud sync error toggling recurring bill:", err);
        });
      }
    },

    logRecurringAsTransaction: (recurringId, customDate, targetCycle) => {
      const recurring = (get().recurringExpenses || []).find((r) => r.id === recurringId);
      if (!recurring) return null;

      const today = getToday();
      // When a user pays a bill early, mark that transaction to current date (today).
      // Only allow customDate if it's in the present or past (<= today).
      let txDate = today;
      if (customDate && customDate <= today) {
        txDate = customDate;
      }

      // Determine cycle key (e.g. '2026-11') or specific due date
      const cycleKey =
        targetCycle ||
        (customDate && customDate > today
          ? customDate.slice(0, 7)
          : txDate.slice(0, 7));
      const isAdvance = cycleKey > txDate.slice(0, 7) || (customDate && customDate > today);

      const noteText = isAdvance
        ? `Bill: ${recurring.title} (Advance for ${cycleKey})`
        : `Bill: ${recurring.title}`;

      const newTx = get().addTransaction({
        type: "expense",
        amount: recurring.amount,
        categoryId: recurring.categoryId,
        date: txDate,
        note: noteText,
      });

      const existingPaid = recurring.paidDates || [];
      const newPaidList = Array.from(
        new Set([
          ...existingPaid,
          cycleKey,
          txDate,
          ...(customDate ? [customDate] : []),
        ])
      );
      const now = new Date().toISOString();

      let updatedRecObj: RecurringExpense | undefined;
      syncAndSet((state) => {
        const nextRec = (state.recurringExpenses || []).map((r) => {
          if (r.id === recurringId) {
            updatedRecObj = { ...r, paidDates: newPaidList, updatedAt: now };
            return updatedRecObj;
          }
          return r;
        });
        return { recurringExpenses: nextRec };
      });

      if (auth.currentUser && updatedRecObj) {
        syncRecurringToCloud(updatedRecObj, auth.currentUser.uid).catch((err) => {
          console.error("Cloud sync error logging recurring payment:", err);
        });
      }

      return newTx;
    },

    // Planned Future Expenses
    addPlannedExpense: (expenseData) => {
      const now = new Date().toISOString();
      const newPlan: PlannedExpense = {
        ...expenseData,
        id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };

      syncAndSet((state) => ({
        plannedExpenses: [newPlan, ...(state.plannedExpenses || [])],
      }));

      if (auth.currentUser) {
        syncPlannedToCloud(newPlan, auth.currentUser.uid);
      }

      return newPlan;
    },

    updatePlannedExpense: (id, updates) => {
      const now = new Date().toISOString();
      let updatedP: PlannedExpense | undefined;
      syncAndSet((state) => {
        const nextPlanned = (state.plannedExpenses || []).map((p) => {
          if (p.id === id) {
            updatedP = { ...p, ...updates, updatedAt: now };
            return updatedP;
          }
          return p;
        });
        return { plannedExpenses: nextPlanned };
      });

      if (auth.currentUser && updatedP) {
        syncPlannedToCloud(updatedP, auth.currentUser.uid);
      }
    },

    deletePlannedExpense: (id) => {
      syncAndSet((state) => ({
        plannedExpenses: (state.plannedExpenses || []).filter((p) => p.id !== id),
      }));

      if (auth.currentUser) {
        deletePlannedFromCloud(id);
      }
    },

    markPlannedExpenseAsPaid: (id, customDate) => {
      const plan = (get().plannedExpenses || []).find((p) => p.id === id);
      if (!plan) return null;

      const today = getToday();
      // If plan was scheduled in the future (e.g. 17 Nov) or customDate is in the future,
      // the user paid early, so mark transaction to the current date (today).
      // Only use customDate if it is in the present/past (<= today).
      let txDate = today;
      if (customDate && customDate <= today) {
        txDate = customDate;
      } else if (!customDate && plan.targetDate && plan.targetDate <= today) {
        txDate = plan.targetDate;
      }

      const isEarly = plan.targetDate > txDate;
      const noteText = plan.notes
        ? `${plan.title} (${plan.notes})`
        : isEarly
        ? `${plan.title} (Paid early · Due ${plan.targetDate})`
        : plan.title;

      const newTx = get().addTransaction({
        type: "expense",
        amount: plan.amount,
        categoryId: plan.categoryId,
        date: txDate,
        note: noteText,
      });

      const now = new Date().toISOString();
      let updatedP: PlannedExpense | undefined;
      syncAndSet((state) => {
        const nextPlans = (state.plannedExpenses || []).map((p) => {
          if (p.id === id) {
            updatedP = {
              ...p,
              isPaid: true,
              paidDate: txDate,
              paidTransactionId: newTx.id,
              updatedAt: now,
            };
            return updatedP;
          }
          return p;
        });
        return { plannedExpenses: nextPlans };
      });

      if (auth.currentUser && updatedP) {
        syncPlannedToCloud(updatedP, auth.currentUser.uid);
      }

      return newTx;
    },

    // Settings
    updateSettings: (updates) => {
      syncAndSet((state) => {
        const nextSettings = { ...state.settings, ...updates };
        if (auth.currentUser) {
          syncSettingsToCloud(nextSettings, auth.currentUser.uid);
        }
        return { settings: nextSettings };
      });
    },

    // Reset & Import
    resetAllData: () => {
      const activeUid = auth.currentUser?.uid || get().currentUserId;
      storage.clearState(activeUid);
      set({
        ...INITIAL_STATE,
        transactions: [],
        people: [],
        loans: [],
      });

      if (auth.currentUser) {
        clearUserDataFromCloud(auth.currentUser.uid).catch((err) => {
          console.warn("Could not wipe cloud data on reset:", err);
        });
      }
    },

    loadDemoData: () => {
      const demo = generateSampleData();
      syncAndSet((state) => ({
        transactions: demo.transactions,
        people: demo.people,
        loans: demo.loans,
      }));
      if (auth.currentUser) {
        demo.transactions.forEach((tx) => syncTransactionToCloud(tx, auth.currentUser!.uid));
        demo.people.forEach((p) => syncPersonToCloud(p, auth.currentUser!.uid));
        demo.loans.forEach((l) => syncLoanToCloud(l, auth.currentUser!.uid));
      }
    },

    importState: (json) => {
      const res = storage.importState(json);
      if (res.success && res.state) {
        set({ ...res.state });
        if (auth.currentUser) {
          res.state.transactions.forEach((tx) => syncTransactionToCloud(tx, auth.currentUser!.uid));
          res.state.people.forEach((p) => syncPersonToCloud(p, auth.currentUser!.uid));
          res.state.loans.forEach((l) => syncLoanToCloud(l, auth.currentUser!.uid));
          (res.state.categoryBudgets || []).forEach((b) => syncBudgetToCloud(b, auth.currentUser!.uid));
          (res.state.recurringExpenses || []).forEach((r) => syncRecurringToCloud(r, auth.currentUser!.uid));
          (res.state.plannedExpenses || []).forEach((pl) => syncPlannedToCloud(pl, auth.currentUser!.uid));
          syncSettingsToCloud(res.state.settings, auth.currentUser.uid);
        }
        return { success: true };
      }
      return { success: false, error: res.error };
    },
  };
});

// Convenience hooks
export const useTransactionStore = () => {
  return useAppStore((state) => ({
    transactions: state.transactions,
    addTransaction: state.addTransaction,
    updateTransaction: state.updateTransaction,
    deleteTransaction: state.deleteTransaction,
    restoreTransaction: state.restoreTransaction,
    duplicateTransaction: state.duplicateTransaction,
  }));
};

export const useCategoryStore = () => {
  return useAppStore((state) => ({
    categories: state.categories,
    addCategory: state.addCategory,
    updateCategory: state.updateCategory,
    deleteCategory: state.deleteCategory,
  }));
};

export const useLoanStore = () => {
  return useAppStore((state) => ({
    people: state.people,
    loans: state.loans,
    addPerson: state.addPerson,
    updatePerson: state.updatePerson,
    deletePerson: state.deletePerson,
    addLoan: state.addLoan,
    updateLoan: state.updateLoan,
    deleteLoan: state.deleteLoan,
    addRepayment: state.addRepayment,
    settleLoan: state.settleLoan,
  }));
};

export const useSettingsStore = () => {
  return useAppStore((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
    resetAllData: state.resetAllData,
    importState: state.importState,
  }));
};

export const useBudgetStore = () => {
  return useAppStore((state) => ({
    categoryBudgets: state.categoryBudgets,
    recurringExpenses: state.recurringExpenses,
    plannedExpenses: state.plannedExpenses,
    addCategoryBudget: state.addCategoryBudget,
    updateCategoryBudget: state.updateCategoryBudget,
    deleteCategoryBudget: state.deleteCategoryBudget,
    addRecurringExpense: state.addRecurringExpense,
    updateRecurringExpense: state.updateRecurringExpense,
    deleteRecurringExpense: state.deleteRecurringExpense,
    toggleRecurringPause: state.toggleRecurringPause,
    logRecurringAsTransaction: state.logRecurringAsTransaction,
    addPlannedExpense: state.addPlannedExpense,
    updatePlannedExpense: state.updatePlannedExpense,
    deletePlannedExpense: state.deletePlannedExpense,
    markPlannedExpenseAsPaid: state.markPlannedExpenseAsPaid,
  }));
};
