import { Category } from "@/types/category";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export interface CategoryDeduplicationResult {
  cleanCategories: Category[];
  removedDuplicates: Category[];
  remappedCategoryIds: Record<string, string>;
}

/**
 * Deduplicates and sanitizes a list of categories.
 * 
 * Rules:
 * 1. Guarantees every canonical default system category exists exactly once.
 * 2. Removes any duplicate system categories (e.g. extra "Bills", extra "Shopping").
 * 3. Removes any custom categories that duplicate a default category by name and type.
 * 4. Removes any duplicate custom categories sharing the same ID or name+type.
 * 5. Returns a remapping map so existing transactions and budgets can be safely pointed
 *    to the canonical category ID without losing user data.
 */
export function deduplicateAndSanitizeCategories(
  rawCategories: Category[] = []
): CategoryDeduplicationResult {
  const removedDuplicates: Category[] = [];
  const remappedCategoryIds: Record<string, string> = {};

  // Canonical default IDs & definitions
  const defaultMap = new Map<string, Category>();
  const defaultNameToId = new Map<string, string>();

  DEFAULT_CATEGORIES.forEach((def) => {
    defaultMap.set(def.id, { ...def, isDefault: true });
    const key = `${def.name.trim().toLowerCase()}:${def.type}`;
    defaultNameToId.set(key, def.id);
  });

  // Track user customizations for default categories (e.g., custom icon or color)
  rawCategories.forEach((cat) => {
    if (defaultMap.has(cat.id)) {
      const existing = defaultMap.get(cat.id)!;
      defaultMap.set(cat.id, {
        ...existing,
        name: cat.name || existing.name,
        icon: cat.icon || existing.icon,
        color: cat.color || existing.color,
        isDefault: true,
      });
    }
  });

  // Start cleanCategories with the canonical default categories
  const cleanCategories: Category[] = Array.from(defaultMap.values());
  const seenIds = new Set<string>(cleanCategories.map((c) => c.id));
  const seenNameTypes = new Map<string, string>();

  cleanCategories.forEach((c) => {
    seenNameTypes.set(`${c.name.trim().toLowerCase()}:${c.type}`, c.id);
  });

  // Process all incoming categories to filter out duplicates or append genuine custom ones
  rawCategories.forEach((cat) => {
    if (!cat || !cat.name) return;

    // 1. If it's already one of the default category IDs, skip adding duplicate
    if (defaultMap.has(cat.id)) {
      // If we see another category object with the same default ID later in array
      return;
    }

    const normKey = `${cat.name.trim().toLowerCase()}:${cat.type}`;

    // 2. If it duplicates a default category by name and type (e.g. a custom category named "Bills" or "Shopping")
    if (defaultNameToId.has(normKey)) {
      const canonicalId = defaultNameToId.get(normKey)!;
      removedDuplicates.push(cat);
      remappedCategoryIds[cat.id] = canonicalId;
      return;
    }

    // 3. If ID already seen (duplicate ID)
    if (seenIds.has(cat.id)) {
      removedDuplicates.push(cat);
      return;
    }

    // 4. If name + type already seen (duplicate custom category)
    if (seenNameTypes.has(normKey)) {
      const canonicalId = seenNameTypes.get(normKey)!;
      removedDuplicates.push(cat);
      remappedCategoryIds[cat.id] = canonicalId;
      return;
    }

    // 5. Genuine unique custom category
    seenIds.add(cat.id);
    seenNameTypes.set(normKey, cat.id);
    cleanCategories.push({
      ...cat,
      isDefault: false,
    });
  });

  return {
    cleanCategories,
    removedDuplicates,
    remappedCategoryIds,
  };
}
