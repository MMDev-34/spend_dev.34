export const AVATAR_PALETTES = [
  { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]" }, // Soft Blue (e.g. Rahul Kumar)
  { bg: "bg-[#FFEDD5]", text: "text-[#9A3412]" }, // Soft Peach/Amber (e.g. Amit Shah)
  { bg: "bg-[#EDE9FE]", text: "text-[#6B21A8]" }, // Soft Lavender (e.g. Sneha Patil)
  { bg: "bg-[#DCFCE7]", text: "text-[#166534]" }, // Soft Mint/Green
  { bg: "bg-[#FFE4E6]", text: "text-[#9F1239]" }, // Soft Rose/Pink
  { bg: "bg-[#CCFBF1]", text: "text-[#115E59]" }, // Soft Teal/Cyan
  { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" }, // Soft Gold/Warm
];

export function getAvatarColors(name: string) {
  if (!name) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return "CO";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
