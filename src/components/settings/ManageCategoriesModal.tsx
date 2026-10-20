import React, { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { Category, CategoryType } from "@/types/category";
import { X, Plus, Trash2, Edit2, Check, Tag, GripVertical, RefreshCw } from "lucide-react";
import { analyzeAndCleanupDuplicateCategories } from "@/utils/categoryDeduplication";
import { auth } from "@/lib/firebase";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ICONS = [
  "🍔", "☕", "🍕", "🛒", "🚌", "🚗", "⛽", "✈️", 
  "🛍", "👕", "📱", "💻", "🧾", "🏠", "💡", "📶",
  "💊", "🏋️", "🎬", "🎮", "📚", "🎁", "💼", "📈", "💰"
];

const PRESET_COLORS = [
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#F97316", // Orange
  "#EAB308", // Amber
  "#64748B", // Slate
];

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const reorderCategories = useAppStore((s) => s.reorderCategories);
  const settings = useAppStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  // Drag-and-place arrange states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const touchStartIndexRef = React.useRef<number | null>(null);
  const touchCurrentIndexRef = React.useRef<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);

  React.useEffect(() => {
    if (!isOpen) {
      setIsAdding(false);
      setEditingId(null);
      setName("");
      setColor(PRESET_COLORS[0]);
      setIcon(PRESET_ICONS[0]);
      setType("expense");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCleanDuplicates = async () => {
    setIsCleaning(true);
    try {
      const uid = auth.currentUser?.uid;
      const res = await analyzeAndCleanupDuplicateCategories(uid || "guest");
      if (res.mergedCount > 0) {
        showToast(`Analyzed database: Merged ${res.mergedCount} duplicate category item(s)!`);
      } else {
        showToast("Analyzed database: No duplicate categories found.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error checking duplicate categories", "error");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || PRESET_COLORS[0]);
    setIcon(cat.icon || PRESET_ICONS[0]);
    setIsAdding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast("Please enter a category name", "error");
      return;
    }

    // Duplicate name validation
    const duplicate = categories.find(
      (c) =>
        c.id !== editingId &&
        c.name.trim().toLowerCase() === trimmed.toLowerCase() &&
        (c.type === type || c.type === "both" || type === "both")
    );
    if (duplicate) {
      showToast(`Category "${duplicate.name}" already exists`, "error");
      return;
    }

    if (editingId) {
      updateCategory(editingId, {
        name: trimmed,
        type,
        color,
        icon,
      });
      showToast(`Category "${trimmed}" updated`);
      setEditingId(null);
    } else {
      addCategory({
        name: trimmed,
        type,
        color,
        icon,
        isDefault: false,
      });
      showToast(`Category "${trimmed}" created`);
      setIsAdding(false);
    }

    setName("");
    setColor(PRESET_COLORS[0]);
    setIcon(PRESET_ICONS[0]);
    setType("expense");
  };

  const handleDelete = (cat: Category) => {
    const success = deleteCategory(cat.id);
    if (success) {
      showToast(`Category "${cat.name}" removed`);
    } else {
      showToast("Cannot delete default system category", "error");
    }
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= categories.length ||
      toIndex >= categories.length
    ) {
      return;
    }
    const updated = [...categories];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    reorderCategories(updated);
    if (settings.hapticFeedback !== false && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      handleMove(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleTouchStart = (_e: React.TouchEvent, index: number) => {
    touchStartIndexRef.current = index;
    touchCurrentIndexRef.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartIndexRef.current === null) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const itemEl = targetEl?.closest("[data-category-index]");
    if (itemEl) {
      const idx = Number(itemEl.getAttribute("data-category-index"));
      if (!isNaN(idx) && idx !== touchCurrentIndexRef.current) {
        touchCurrentIndexRef.current = idx;
        setDragOverIndex(idx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartIndexRef.current !== null && touchCurrentIndexRef.current !== null) {
      if (touchStartIndexRef.current !== touchCurrentIndexRef.current) {
        handleMove(touchStartIndexRef.current, touchCurrentIndexRef.current);
      }
    }
    touchStartIndexRef.current = null;
    touchCurrentIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#242424] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#242424]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#F5F5F5]">Manage Categories</h3>
              <p className="text-xs text-[#71717A]">
                {categories.length} categories configured
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        {!isAdding && !editingId && (
          <div className="px-4 py-2.5 sm:px-5 border-b border-[#242424] flex items-center justify-between bg-[#111111] gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#71717A] min-w-0">
              <GripVertical className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs text-[#A1A1AA]">
                Drag and place items to arrange display order
              </span>
            </div>
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
                setName("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Category</span>
            </button>
          </div>
        )}

        {/* Add / Edit Form */}
        {(isAdding || editingId) && (
          <form onSubmit={handleSave} className="p-4 sm:p-5 border-b border-[#242424] bg-[#161616] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                {editingId ? "Edit Category" : "Create New Category"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="text-xs text-[#71717A] hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-medium text-[#A1A1AA]">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Freelance, Gym, Pet Care"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#2D2D2D] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-emerald-500/50"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A1A1AA]">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CategoryType)}
                  className="w-full bg-[#1C1C1C] border border-[#2D2D2D] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#A1A1AA]">Choose Icon</label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {PRESET_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 transition ${
                      icon === i
                        ? "bg-emerald-500/20 border-2 border-emerald-400 scale-105"
                        : "bg-[#202020] border border-[#2D2D2D] hover:bg-[#282828]"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#A1A1AA]">Accent Color</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition flex items-center justify-center ${
                      color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#141414] scale-110" : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
              >
                {editingId ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </form>
        )}

        {/* Categories List with Simple Drag & Place */}
        <div 
          className="flex-1 overflow-y-auto divide-y divide-[#242424] p-2 sm:p-3"
          onDragOver={(e) => e.preventDefault()}
        >
          {categories.map((cat, index) => {
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={cat.id}
                data-category-index={index}
                draggable={!isAdding && !editingId}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all duration-150 select-none ${
                  isDragging
                    ? "opacity-30 bg-[#202020] border-2 border-dashed border-emerald-500/50 scale-[0.98]"
                    : isDragOver
                    ? "bg-emerald-500/10 border-2 border-emerald-500/70 scale-[1.01] shadow-lg"
                    : "hover:bg-[#1A1A1A] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                  {/* Minimal Drag Handle */}
                  <div
                    className="p-1 -ml-1 text-[#52525B] hover:text-[#A1A1AA] active:text-emerald-400 cursor-grab active:cursor-grabbing touch-none select-none shrink-0 rounded-md hover:bg-[#252525] transition"
                    title="Drag to rearrange"
                    aria-label="Drag to rearrange"
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 shadow-inner"
                    style={{
                      backgroundColor: `${cat.color || "#10B981"}20`,
                      border: `1px solid ${cat.color || "#10B981"}40`,
                    }}
                  >
                    {cat.icon || "🏷️"}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-[#F5F5F5] truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] uppercase font-medium text-[#71717A] tracking-wider">
                        · {cat.type}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#71717A] block truncate">
                      {cat.isDefault ? "Default system category" : "Custom category"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#252525] transition cursor-pointer"
                    title="Edit category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!cat.isDefault && (
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-[#242424] bg-[#111111] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCleanDuplicates}
            disabled={isCleaning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-[#242424] border border-[#2E2E2E] text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Scan database and merge duplicate categories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCleaning ? "animate-spin" : ""}`} />
            <span>{isCleaning ? "Deduplicating..." : "Clean Duplicates"}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-[#F5F5F5] transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
