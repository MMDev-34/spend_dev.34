import { SpendState } from "@/types/settings";
import { APP_STORAGE_KEY, CURRENT_STATE_VERSION, INITIAL_STATE } from "./constants";

export function getStorageKey(userId?: string | null): string {
  if (userId && userId.trim()) {
    return `${APP_STORAGE_KEY}_${userId.trim()}`;
  }
  return `${APP_STORAGE_KEY}_guest`;
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
      if (!key) {
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

      const raw = localStorage.getItem(key);
      if (!raw) {
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

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
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

      return {
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
      localStorage.setItem(key, JSON.stringify(state));
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
