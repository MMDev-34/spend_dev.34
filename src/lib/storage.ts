import { SpendState } from "@/types/settings";
import { APP_STORAGE_KEY, CURRENT_STATE_VERSION, DEFAULT_CATEGORIES, INITIAL_STATE } from "./constants";

export function getStorageKey(userId?: string | null): string {
  if (userId && userId.trim()) {
    return `${APP_STORAGE_KEY}_${userId.trim()}`;
  }
  return `${APP_STORAGE_KEY}_guest`;
}

/**
 * Helper to inspect a localStorage string and return parsed SpendState if valid
 */
function tryParseSpendState(raw: string | null): SpendState | null {
  if (!raw || typeof raw !== "string" || !raw.trim() || raw === "{}") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SpendState;
  } catch {
    return null;
  }
}

export const storage = {
  loadState(userId?: string | null): SpendState {
    if (typeof window === "undefined") {
      return {
        ...INITIAL_STATE,
        transactions: [],
        people: [],
        loans: [],
        categoryBudgets: [],
        recurringExpenses: [],
        plannedExpenses: [],
      };
    }

    try {
      const key = getStorageKey(userId);
      let raw = localStorage.getItem(key);
      let parsed = tryParseSpendState(raw);

      // --- Multi-Layer Recovery for Existing & Past Saved Data ---
      // If primary key is missing, empty, or has 0 transactions, search all candidate & legacy keys
      const hasTransactions = parsed && Array.isArray(parsed.transactions) && parsed.transactions.length > 0;
      const hasLoans = parsed && Array.isArray(parsed.loans) && parsed.loans.length > 0;

      if (!parsed || (!hasTransactions && !hasLoans)) {
        const candidateKeys = [
          APP_STORAGE_KEY, // Original legacy key "spend_app_state"
          `${APP_STORAGE_KEY}_guest`, // Guest key "spend_app_state_guest"
          `${APP_STORAGE_KEY}_backup`, // Backup key
          "spend_state",
          "spend_local_data",
        ];

        let recoveredState: SpendState | null = null;

        for (const candidate of candidateKeys) {
          if (candidate === key) continue;
          const candidateState = tryParseSpendState(localStorage.getItem(candidate));
          if (
            candidateState &&
            ((Array.isArray(candidateState.transactions) && candidateState.transactions.length > 0) ||
             (Array.isArray(candidateState.loans) && candidateState.loans.length > 0))
          ) {
            recoveredState = candidateState;
            break;
          }
        }

        // If still not found, scan all localStorage keys for any key containing saved transactions
        if (!recoveredState) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || k === key) continue;
            if (k.startsWith("spend_") || k.includes("spend") || k.includes("backup")) {
              const testState = tryParseSpendState(localStorage.getItem(k));
              if (
                testState &&
                Array.isArray(testState.transactions) &&
                testState.transactions.length > 0
              ) {
                recoveredState = testState;
                break;
              }
            }
          }
        }

        if (recoveredState) {
          parsed = recoveredState;
          // Immediately save recovered state to current key so future reads are instant
          try {
            localStorage.setItem(key, JSON.stringify(recoveredState));
          } catch {}
        }
      }

      if (!parsed) {
        return {
          ...INITIAL_STATE,
          transactions: [],
          people: [],
          loans: [],
          categoryBudgets: [],
          recurringExpenses: [],
          plannedExpenses: [],
        };
      }

      // Schema migration safety
      if (parsed.version !== CURRENT_STATE_VERSION) {
        const migrated: SpendState = {
          ...INITIAL_STATE,
          ...parsed,
          version: CURRENT_STATE_VERSION,
        };
        this.saveState(migrated, userId);
        return migrated;
      }

      const loadedCategories =
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? [...parsed.categories]
          : [...INITIAL_STATE.categories];

      if (!loadedCategories.some((c: any) => c.id === "cat-transfer" || (c.name && c.name.toLowerCase() === "transfer"))) {
        const transferDef = DEFAULT_CATEGORIES.find((c) => c.id === "cat-transfer");
        if (transferDef) {
          loadedCategories.push(transferDef);
        }
      }

      return {
        version: CURRENT_STATE_VERSION,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        categories: loadedCategories,
        people: Array.isArray(parsed.people) ? parsed.people : [],
        loans: Array.isArray(parsed.loans) ? parsed.loans : [],
        categoryBudgets: Array.isArray(parsed.categoryBudgets) ? parsed.categoryBudgets : [],
        recurringExpenses: Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : [],
        plannedExpenses: Array.isArray(parsed.plannedExpenses) ? parsed.plannedExpenses : [],
        settings: parsed.settings ? { ...INITIAL_STATE.settings, ...parsed.settings } : INITIAL_STATE.settings,
      };
    } catch (error) {
      console.error("[Spend Storage] Error reading state from localStorage:", error);
      return {
        ...INITIAL_STATE,
        transactions: [],
        people: [],
        loans: [],
        categoryBudgets: [],
        recurringExpenses: [],
        plannedExpenses: [],
      };
    }
  },

  saveState(state: SpendState, userId?: string | null): boolean {
    if (typeof window === "undefined") return false;
    try {
      const key = getStorageKey(userId);
      const json = JSON.stringify(state);
      localStorage.setItem(key, json);

      // Also persist to legacy key and backup key if guest or local
      if (!userId || userId === "guest") {
        localStorage.setItem(APP_STORAGE_KEY, json);
      }
      localStorage.setItem(`${APP_STORAGE_KEY}_backup`, json);

      return true;
    } catch (error) {
      console.error("[Spend Storage] Failed to persist state to localStorage:", error);
      return false;
    }
  },

  clearState(userId?: string | null): boolean {
    if (typeof window === "undefined") return false;
    try {
      const key = getStorageKey(userId);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("[Spend Storage] Failed to clear localStorage:", error);
      return false;
    }
  },

  exportState(userId?: string | null): string {
    const state = this.loadState(userId);
    return JSON.stringify(state, null, 2);
  },

  importState(
    jsonString: string,
    userId?: string | null
  ): { success: boolean; error?: string; state?: SpendState } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== "object") {
        return { success: false, error: "Invalid JSON format." };
      }

      const validatedState: SpendState = {
        version: CURRENT_STATE_VERSION,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        categories:
          Array.isArray(parsed.categories) && parsed.categories.length > 0
            ? parsed.categories
            : INITIAL_STATE.categories,
        people: Array.isArray(parsed.people) ? parsed.people : [],
        loans: Array.isArray(parsed.loans) ? parsed.loans : [],
        categoryBudgets: Array.isArray(parsed.categoryBudgets) ? parsed.categoryBudgets : [],
        recurringExpenses: Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : [],
        plannedExpenses: Array.isArray(parsed.plannedExpenses) ? parsed.plannedExpenses : [],
        settings: parsed.settings ? { ...INITIAL_STATE.settings, ...parsed.settings } : INITIAL_STATE.settings,
      };

      const saved = this.saveState(validatedState, userId);
      if (!saved) {
        return { success: false, error: "Failed to persist imported state." };
      }

      return { success: true, state: validatedState };
    } catch (error: any) {
      return { success: false, error: error?.message || "JSON parsing failed." };
    }
  },
};
