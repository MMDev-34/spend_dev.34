import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Person } from "@/types/person";
import { Loan } from "@/types/loan";
import { CategoryBudget, RecurringExpense, PlannedExpense } from "@/types/plan";
import { Settings, SpendState } from "@/types/settings";

/**
 * Firebase Firestore Sync Engine
 * Real-time two-way synchronization for logged-in user data
 */

export interface CloudSyncListeners {
  onTransactionsUpdate: (txs: Transaction[]) => void;
  onCategoriesUpdate: (cats: Category[]) => void;
  onPeopleUpdate: (people: Person[]) => void;
  onLoansUpdate: (loans: Loan[]) => void;
  onBudgetsUpdate: (budgets: CategoryBudget[]) => void;
  onRecurringUpdate: (recurring: RecurringExpense[]) => void;
  onPlannedUpdate: (planned: PlannedExpense[]) => void;
  onSettingsUpdate: (settings: Settings) => void;
}

export function subscribeToUserCloudData(
  userId: string,
  listeners: CloudSyncListeners
): () => void {
  const unsubs: Unsubscribe[] = [];

  // 1. Transactions
  const txPath = "transactions";
  try {
    const qTx = query(collection(db, txPath), where("userId", "==", userId));
    const unsubTx = onSnapshot(
      qTx,
      (snapshot) => {
        const txs: Transaction[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type,
            amount: data.amount,
            categoryId: data.categoryId,
            date: data.date,
            note: data.note,
            paymentMethod: data.paymentMethod,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Transaction;
        });
        listeners.onTransactionsUpdate(txs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, txPath);
      }
    );
    unsubs.push(unsubTx);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, txPath);
  }

  // 2. Categories
  const catPath = "categories";
  try {
    const qCat = query(collection(db, catPath), where("userId", "==", userId));
    const unsubCat = onSnapshot(
      qCat,
      (snapshot) => {
        const cats: Category[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name,
            icon: data.icon,
            color: data.color,
            type: data.type,
            isDefault: data.isDefault,
            createdAt: data.createdAt,
          } as Category;
        });
        listeners.onCategoriesUpdate(cats);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, catPath);
      }
    );
    unsubs.push(unsubCat);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, catPath);
  }

  // 3. People
  const peoplePath = "people";
  try {
    const qPeople = query(collection(db, peoplePath), where("userId", "==", userId));
    const unsubPeople = onSnapshot(
      qPeople,
      (snapshot) => {
        const people: Person[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name,
            createdAt: data.createdAt,
          } as Person;
        });
        listeners.onPeopleUpdate(people);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, peoplePath);
      }
    );
    unsubs.push(unsubPeople);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, peoplePath);
  }

  // 4. Loans
  const loansPath = "loans";
  try {
    const qLoans = query(collection(db, loansPath), where("userId", "==", userId));
    const unsubLoans = onSnapshot(
      qLoans,
      (snapshot) => {
        const loans: Loan[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            personId: data.personId,
            amount: data.amount,
            direction: data.direction,
            description: data.description || data.note || "",
            date: data.date || data.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            dueDate: data.dueDate,
            repayments: data.repayments || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Loan;
        });
        listeners.onLoansUpdate(loans);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, loansPath);
      }
    );
    unsubs.push(unsubLoans);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, loansPath);
  }

  // 5. Category Budgets
  const budgetsPath = "categoryBudgets";
  try {
    const qBudgets = query(collection(db, budgetsPath), where("userId", "==", userId));
    const unsubBudgets = onSnapshot(
      qBudgets,
      (snapshot) => {
        const budgets: CategoryBudget[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            categoryId: data.categoryId,
            amount: data.amount,
            duration: data.duration,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as CategoryBudget;
        });
        listeners.onBudgetsUpdate(budgets);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, budgetsPath);
      }
    );
    unsubs.push(unsubBudgets);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, budgetsPath);
  }

  // 6. Recurring Expenses
  const recurringPath = "recurringExpenses";
  try {
    const qRecurring = query(collection(db, recurringPath), where("userId", "==", userId));
    const unsubRecurring = onSnapshot(
      qRecurring,
      (snapshot) => {
        const recurring: RecurringExpense[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title,
            amount: data.amount,
            frequency: data.frequency,
            dueDay: data.dueDay,
            categoryId: data.categoryId,
            notes: data.notes,
            isPaused: data.isPaused,
            paidDates: data.paidDates || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as RecurringExpense;
        });
        listeners.onRecurringUpdate(recurring);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, recurringPath);
      }
    );
    unsubs.push(unsubRecurring);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, recurringPath);
  }

  // 7. Planned Expenses
  const plannedPath = "plannedExpenses";
  try {
    const qPlanned = query(collection(db, plannedPath), where("userId", "==", userId));
    const unsubPlanned = onSnapshot(
      qPlanned,
      (snapshot) => {
        const planned: PlannedExpense[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title,
            amount: data.amount,
            targetDate: data.targetDate,
            categoryId: data.categoryId,
            reminderDaysBefore: data.reminderDaysBefore,
            notes: data.notes,
            isPaid: data.isPaid,
            paidDate: data.paidDate,
            paidTransactionId: data.paidTransactionId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as PlannedExpense;
        });
        listeners.onPlannedUpdate(planned);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, plannedPath);
      }
    );
    unsubs.push(unsubPlanned);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, plannedPath);
  }

  // 8. User Settings
  const settingsPath = `userSettings/${userId}`;
  try {
    const unsubSettings = onSnapshot(
      doc(db, "userSettings", userId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const cloudSettings: Partial<Settings> = {
            currency: data.currency || "₹",
            theme: data.theme || "dark",
            weekStartsOn: data.weekStartsOn || "monday",
            numberFormat: data.numberFormat || "comma",
          };
          if (data.overallMonthlyBudget !== undefined) cloudSettings.overallMonthlyBudget = data.overallMonthlyBudget;
          if (data.hideSensitiveBalances !== undefined) cloudSettings.hideSensitiveBalances = data.hideSensitiveBalances;
          if (data.confirmBeforeDelete !== undefined) cloudSettings.confirmBeforeDelete = data.confirmBeforeDelete;
          if (data.showDecimals !== undefined) cloudSettings.showDecimals = data.showDecimals;
          if (data.defaultPaymentMethod !== undefined) cloudSettings.defaultPaymentMethod = data.defaultPaymentMethod;
          if (data.budgetAlertThreshold !== undefined) cloudSettings.budgetAlertThreshold = data.budgetAlertThreshold;
          if (data.defaultStartRoute !== undefined) cloudSettings.defaultStartRoute = data.defaultStartRoute;
          if (data.billAlertDays !== undefined) cloudSettings.billAlertDays = data.billAlertDays;
          if (data.hapticFeedback !== undefined) cloudSettings.hapticFeedback = data.hapticFeedback;
          if (data.enableUnwantedSpendTracking !== undefined) cloudSettings.enableUnwantedSpendTracking = data.enableUnwantedSpendTracking;
          if (data.autoBackupReminder !== undefined) cloudSettings.autoBackupReminder = data.autoBackupReminder;

          listeners.onSettingsUpdate(cloudSettings as Settings);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, settingsPath);
      }
    );
    unsubs.push(unsubSettings);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, settingsPath);
  }

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean = (val: any): any => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === "number") {
      return Number.isFinite(val) ? val : 0;
    }
    if (typeof val !== "object") return val;
    if (Array.isArray(val)) {
      return val
        .map(clean)
        .filter((item) => item !== undefined);
    }
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined && v !== null) {
        const cleaned = clean(v);
        if (cleaned !== undefined) {
          res[k] = cleaned;
        }
      }
    }
    return res;
  };

  return clean(obj) || {};
}

// Write mutations with full error handlers
export async function syncTransactionToCloud(tx: Transaction, userId: string) {
  const path = `transactions/${tx.id}`;
  try {
    const payload = cleanFirestorePayload({
      ...tx,
      userId,
    });
    await setDoc(doc(db, "transactions", tx.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTransactionFromCloud(id: string) {
  const path = `transactions/${id}`;
  try {
    await deleteDoc(doc(db, "transactions", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncCategoryToCloud(cat: Category, userId: string) {
  const path = `categories/${cat.id}`;
  try {
    const payload = cleanFirestorePayload({
      ...cat,
      userId,
    });
    await setDoc(doc(db, "categories", cat.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategoryFromCloud(id: string) {
  const path = `categories/${id}`;
  try {
    await deleteDoc(doc(db, "categories", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncPersonToCloud(person: Person, userId: string) {
  const path = `people/${person.id}`;
  try {
    const payload = cleanFirestorePayload({
      ...person,
      userId,
    });
    await setDoc(doc(db, "people", person.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePersonFromCloud(id: string) {
  const path = `people/${id}`;
  try {
    await deleteDoc(doc(db, "people", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncLoanToCloud(loan: Loan, userId: string) {
  const path = `loans/${loan.id}`;
  try {
    const payload = cleanFirestorePayload({
      ...loan,
      userId,
    });
    await setDoc(doc(db, "loans", loan.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteLoanFromCloud(id: string) {
  const path = `loans/${id}`;
  try {
    await deleteDoc(doc(db, "loans", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncBudgetToCloud(budget: CategoryBudget, userId: string) {
  const path = `categoryBudgets/${budget.id}`;
  try {
    const payload = cleanFirestorePayload({
      ...budget,
      userId,
    });
    await setDoc(doc(db, "categoryBudgets", budget.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBudgetFromCloud(id: string) {
  const path = `categoryBudgets/${id}`;
  try {
    await deleteDoc(doc(db, "categoryBudgets", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncRecurringToCloud(recurring: RecurringExpense, userId: string) {
  const path = `recurringExpenses/${recurring.id}`;
  try {
    const payload = cleanFirestorePayload({
      ...recurring,
      userId,
    });
    await setDoc(doc(db, "recurringExpenses", recurring.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRecurringFromCloud(id: string) {
  const path = `recurringExpenses/${id}`;
  try {
    await deleteDoc(doc(db, "recurringExpenses", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncPlannedToCloud(planned: PlannedExpense, userId: string) {
  const path = `plannedExpenses/${planned.id}`;
  try {
    const payload = cleanFirestorePayload({
      ...planned,
      userId,
    });
    await setDoc(doc(db, "plannedExpenses", planned.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePlannedFromCloud(id: string) {
  const path = `plannedExpenses/${id}`;
  try {
    await deleteDoc(doc(db, "plannedExpenses", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncSettingsToCloud(settings: Settings, userId: string) {
  const path = `userSettings/${userId}`;
  try {
    const payload = cleanFirestorePayload({
      userId,
      currency: settings.currency,
      theme: settings.theme,
      weekStartsOn: settings.weekStartsOn,
      numberFormat: settings.numberFormat,
      overallMonthlyBudget: settings.overallMonthlyBudget,
      hideSensitiveBalances: settings.hideSensitiveBalances,
      confirmBeforeDelete: settings.confirmBeforeDelete,
      showDecimals: settings.showDecimals,
      defaultPaymentMethod: settings.defaultPaymentMethod,
      budgetAlertThreshold: settings.budgetAlertThreshold,
      defaultStartRoute: settings.defaultStartRoute,
      billAlertDays: settings.billAlertDays,
      hapticFeedback: settings.hapticFeedback,
      enableUnwantedSpendTracking: settings.enableUnwantedSpendTracking,
      autoBackupReminder: settings.autoBackupReminder,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, "userSettings", userId), payload);
  } catch (error: any) {
    if (error?.code === "permission-denied" || String(error).includes("permission")) {
      try {
        const fallbackPayload = cleanFirestorePayload({
          userId,
          currency: settings.currency,
          theme: settings.theme,
          weekStartsOn: settings.weekStartsOn,
          numberFormat: settings.numberFormat,
          updatedAt: new Date().toISOString(),
        });
        await setDoc(doc(db, "userSettings", userId), fallbackPayload);
        return;
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.WRITE, path);
      }
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Explicit user upload helper: Only triggered when user explicitly
 * clicks "Sync Local Data to Cloud" in Settings.
 */
export async function uploadCurrentLocalStateToCloud(
  userId: string,
  localState: SpendState
) {
  try {
    for (const tx of localState.transactions) {
      await syncTransactionToCloud(tx, userId);
    }
    for (const p of localState.people) {
      await syncPersonToCloud(p, userId);
    }
    for (const l of localState.loans) {
      await syncLoanToCloud(l, userId);
    }
    if (localState.categoryBudgets) {
      for (const b of localState.categoryBudgets) {
        await syncBudgetToCloud(b, userId);
      }
    }
    if (localState.recurringExpenses) {
      for (const r of localState.recurringExpenses) {
        await syncRecurringToCloud(r, userId);
      }
    }
    if (localState.plannedExpenses) {
      for (const pl of localState.plannedExpenses) {
        await syncPlannedToCloud(pl, userId);
      }
    }
    await syncSettingsToCloud(localState.settings, userId);
  } catch (error) {
    console.warn("Upload to cloud completed with warnings:", error);
    throw error;
  }
}

/**
 * Wipes all user data documents from Firestore collections when resetting app data.
 */
export async function clearUserDataFromCloud(userId: string) {
  if (!userId) return;
  try {
    const collectionsToClean = [
      "transactions",
      "categories",
      "people",
      "loans",
      "categoryBudgets",
      "recurringExpenses",
      "plannedExpenses",
    ];

    for (const colName of collectionsToClean) {
      const q = query(collection(db, colName), where("userId", "==", userId));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    }

    // Also delete custom user settings document from cloud
    await deleteDoc(doc(db, "userSettings", userId)).catch(() => {});
  } catch (error) {
    console.warn("Error wiping user data from cloud during reset:", error);
  }
}

