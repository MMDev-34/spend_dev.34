import { Category } from "@/types/category";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useAppStore } from "@/stores/appStore";

export interface CategoryDeduplicationResult {
  mergedCount: number;
  duplicateIds: string[];
  canonicalMap: Record<string, string>; // duplicateId -> canonicalId
  details: string[];
}

/**
 * Normalizes category key for duplicate detection.
 * Matches on trimmed, lowercased name and type (or "both").
 */
export function getCategoryNormalizedKey(cat: { name: string; type?: string }): string {
  const normName = (cat.name || "").trim().toLowerCase();
  const typeKey = cat.type === "both" ? "expense_income" : (cat.type || "expense");
  return `${normName}__${typeKey}`;
}

/**
 * Pure deduplication helper for any category list.
 * Preserves DEFAULT_CATEGORIES as the canonical versions where names match.
 */
export function deduplicateCategoryList(categories: Category[]): {
  uniqueList: Category[];
  canonicalMap: Record<string, string>; // duplicateId -> canonicalId
  duplicates: Category[];
} {
  const uniqueList: Category[] = [];
  const seenKeys = new Map<string, Category>();
  const seenIds = new Set<string>();
  const canonicalMap: Record<string, string> = {};
  const duplicates: Category[] = [];

  // 1. Establish default system categories as canonical anchors
  const systemDefaults = DEFAULT_CATEGORIES.filter((c) => c.isDefault);
  for (const def of systemDefaults) {
    const key = getCategoryNormalizedKey(def);
    seenKeys.set(key, def);
    seenIds.add(def.id);
  }

  // 2. Iterate through incoming categories
  for (const cat of categories) {
    if (!cat || !cat.id) continue;

    // Check by ID first
    if (seenIds.has(cat.id)) {
      // If already added, skip exact ID duplicate
      continue;
    }

    const key = getCategoryNormalizedKey(cat);
    const existingCanonical = seenKeys.get(key);

    if (existingCanonical) {
      // This is a duplicate of an existing canonical category!
      if (cat.id !== existingCanonical.id) {
        canonicalMap[cat.id] = existingCanonical.id;
        duplicates.push(cat);
      }
    } else {
      // First time seeing this category name/type -> establish as canonical
      seenKeys.set(key, cat);
      seenIds.add(cat.id);
      uniqueList.push(cat);
    }
  }

  // Ensure all default system categories are in the unique list
  for (const def of systemDefaults) {
    if (!uniqueList.some((c) => c.id === def.id)) {
      uniqueList.unshift(def);
    }
  }

  return { uniqueList, canonicalMap, duplicates };
}

/**
 * Cloud and Local Database Analyzer and Cleanup:
 * Scans Firestore for the given user, identifies duplicate categories (e.g. duplicate
 * "Food" or custom categories created multiple times), reassigns any transactions
 * referencing them to the canonical category, and permanently removes the duplicate
 * documents from Firestore.
 */
export async function analyzeAndCleanupDuplicateCategories(
  userId: string
): Promise<CategoryDeduplicationResult> {
  const result: CategoryDeduplicationResult = {
    mergedCount: 0,
    duplicateIds: [],
    canonicalMap: {},
    details: [],
  };

  if (!userId) return result;

  try {
    // 1. Query all categories in Firestore for this user
    const catQuery = query(collection(db, "categories"), where("userId", "==", userId));
    const catSnapshot = await getDocs(catQuery);

    const cloudCategories: (Category & { docId: string })[] = [];
    catSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      cloudCategories.push({
        id: docSnap.id,
        docId: docSnap.id,
        name: data.name || "Untitled",
        icon: data.icon || "🏷️",
        color: data.color || "#10B981",
        type: data.type || "expense",
        isDefault: !!data.isDefault,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    // Also take current store categories
    const currentStoreCategories = useAppStore.getState().categories || [];
    const allKnownCategories = [...currentStoreCategories, ...cloudCategories];

    // 2. Run deduplication logic
    const { uniqueList, canonicalMap, duplicates } = deduplicateCategoryList(allKnownCategories);

    result.duplicateIds = duplicates.map((d) => d.id);
    result.canonicalMap = canonicalMap;
    result.mergedCount = duplicates.length;

    if (duplicates.length === 0) {
      result.details.push("No duplicate categories found in database.");
      return result;
    }

    // 3. For each duplicate category, delete its Firestore document if it exists in cloud
    const docsToDelete = cloudCategories.filter((c) => canonicalMap[c.id]);
    for (const dup of docsToDelete) {
      try {
        await deleteDoc(doc(db, "categories", dup.docId));
        result.details.push(
          `Removed cloud duplicate category "${dup.name}" (ID: ${dup.id}) -> merged into ${canonicalMap[dup.id]}`
        );
      } catch (err) {
        console.warn(`Failed to delete duplicate category doc ${dup.docId}:`, err);
      }
    }

    // 4. Update any transactions referencing duplicate IDs in Firestore
    if (Object.keys(canonicalMap).length > 0) {
      const txQuery = query(collection(db, "transactions"), where("userId", "==", userId));
      const txSnapshot = await getDocs(txQuery);

      let txUpdatedCount = 0;
      for (const txDoc of txSnapshot.docs) {
        const data = txDoc.data();
        const currentCatId = data.categoryId;
        if (currentCatId && canonicalMap[currentCatId]) {
          const targetCanonical = canonicalMap[currentCatId];
          try {
            await updateDoc(doc(db, "transactions", txDoc.id), {
              categoryId: targetCanonical,
              updatedAt: new Date().toISOString(),
            });
            txUpdatedCount++;
          } catch (err) {
            console.warn(`Failed to reassign tx ${txDoc.id}:`, err);
          }
        }
      }

      if (txUpdatedCount > 0) {
        result.details.push(
          `Reassigned ${txUpdatedCount} cloud transaction(s) to canonical categories.`
        );
      }
    }

    // 5. Clean up local Zustand state and storage
    useAppStore.setState((state) => {
      // Reassign local transactions
      const updatedTxs = state.transactions.map((tx) => {
        if (tx.categoryId && canonicalMap[tx.categoryId]) {
          return { ...tx, categoryId: canonicalMap[tx.categoryId] };
        }
        return tx;
      });

      // Reassign local budgets
      const updatedBudgets = (state.categoryBudgets || []).map((b) => {
        if (b.categoryId && canonicalMap[b.categoryId]) {
          return { ...b, categoryId: canonicalMap[b.categoryId] };
        }
        return b;
      });

      return {
        categories: uniqueList,
        transactions: updatedTxs,
        categoryBudgets: updatedBudgets,
      };
    });

    result.details.push(`Successfully deduplicated ${duplicates.length} category item(s).`);
    return result;
  } catch (error) {
    console.error("Error analyzing and cleaning duplicate categories:", error);
    result.details.push(`Deduplication error: ${String(error)}`);
    return result;
  }
}
