import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";

export function exportTransactionsToCsv(
  transactions: Transaction[],
  categories: Category[],
  currency: string,
  dateRangeLabel?: string,
  startDate?: string,
  endDate?: string
) {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Determine effective date range for filename and header
  let rangeStr = dateRangeLabel || "all-time";
  if (startDate && endDate) {
    rangeStr = `${startDate}_to_${endDate}`;
  } else if (startDate) {
    rangeStr = `from_${startDate}`;
  } else if (endDate) {
    rangeStr = `up_to_${endDate}`;
  } else if (transactions.length > 0) {
    const dates = transactions.map((t) => t.date).sort();
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    rangeStr = `${firstDate}_to_${lastDate}`;
  }

  const safeRangeStr = rangeStr.replace(/\s+/g, "_").toLowerCase();
  const filename = `spend_transactions_${safeRangeStr}.csv`;

  const headers = [
    "Date",
    "Type",
    "Category",
    "Note",
    "Amount",
    "Currency",
    "Payment Method",
    "Transaction ID"
  ];

  const rows = transactions.map((t) => {
    const formattedAmount = (t.amount / 100).toFixed(2);
    const catName = categoryMap.get(t.categoryId) || "Uncategorized";
    const noteClean = (t.note || "").replace(/"/g, '""');
    const paymentMethod = t.paymentMethod || "General";
    
    return [
      `"${t.date}"`,
      `"${t.type.toUpperCase()}"`,
      `"${catName}"`,
      `"${noteClean}"`,
      formattedAmount,
      `"${currency}"`,
      `"${paymentMethod}"`,
      `"${t.id}"`
    ].join(",");
  });

  const metadataHeader = [
    `# Spend App Transaction Report`,
    `# Date Range: ${dateRangeLabel || rangeStr}`,
    `# Total Transactions: ${transactions.length}`,
    `# Exported At: ${new Date().toISOString()}`,
    ""
  ].join("\r\n");

  const csvContent = `${metadataHeader}${headers.join(",")}\r\n${rows.join("\r\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
