import { RecurringExpense, PlannedExpense } from "@/types/plan";

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function formatIcsDateOnly(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

/**
 * Generates an .ics file string for planned expenses and recurring bills
 */
export function generateIcsCalendar(
  plannedExpenses: PlannedExpense[],
  recurringExpenses: RecurringExpense[],
  currency: string
): string {
  const now = new Date();
  const timestamp = formatIcsDate(now);

  const events: string[] = [];

  // 1. Add Planned Expenses
  plannedExpenses
    .filter((p) => !p.isPaid)
    .forEach((p) => {
      const dateOnly = formatIcsDateOnly(p.targetDate);
      const amountStr = `${currency}${(p.amount / 100).toFixed(2)}`;
      const summary = `Spend Alert: ${p.title} (${amountStr})`;
      const description = `Planned expense: ${p.title}\nAmount: ${amountStr}\nNotes: ${p.notes || "None"}`;

      events.push(`BEGIN:VEVENT
UID:plan-${p.id}@spendapp.local
DTSTAMP:${timestamp}
DTSTART;VALUE=DATE:${dateOnly}
DTEND;VALUE=DATE:${dateOnly}
SUMMARY:${summary.replace(/\n/g, " ")}
DESCRIPTION:${description.replace(/\n/g, "\\n")}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT9H
ACTION:DISPLAY
DESCRIPTION:Reminder for ${p.title}
END:VALARM
END:VEVENT`);
    });

  // 2. Add Recurring Bills (Projected for current and next 2 months)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  recurringExpenses
    .filter((r) => !r.isPaused)
    .forEach((r) => {
      const amountStr = `${currency}${(r.amount / 100).toFixed(2)}`;
      const summary = `Bill Due: ${r.title} (${amountStr})`;
      const description = `Recurring bill: ${r.title}\nAmount: ${amountStr}\nFrequency: ${r.frequency}\nNotes: ${r.notes || "None"}`;

      if (r.frequency === "monthly") {
        const dayStr = r.dueDay.toString().padStart(2, "0");
        const monthStr = currentMonth.toString().padStart(2, "0");
        const dateStr = `${currentYear}${monthStr}${dayStr}`;

        events.push(`BEGIN:VEVENT
UID:rec-${r.id}-${currentYear}-${currentMonth}@spendapp.local
DTSTAMP:${timestamp}
DTSTART;VALUE=DATE:${dateStr}
RRULE:FREQ=MONTHLY;BYMONTHDAY=${r.dueDay}
SUMMARY:${summary.replace(/\n/g, " ")}
DESCRIPTION:${description.replace(/\n/g, "\\n")}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT9H
ACTION:DISPLAY
DESCRIPTION:Bill due today: ${r.title}
END:VALARM
END:VEVENT`);
      } else if (r.frequency === "yearly" && r.dueMonth) {
        const monthStr = r.dueMonth.toString().padStart(2, "0");
        const dayStr = r.dueDay.toString().padStart(2, "0");
        const dateStr = `${currentYear}${monthStr}${dayStr}`;

        events.push(`BEGIN:VEVENT
UID:rec-yearly-${r.id}@spendapp.local
DTSTAMP:${timestamp}
DTSTART;VALUE=DATE:${dateStr}
RRULE:FREQ=YEARLY
SUMMARY:${summary.replace(/\n/g, " ")}
DESCRIPTION:${description.replace(/\n/g, "\\n")}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Annual bill due: ${r.title}
END:VALARM
END:VEVENT`);
      }
    });

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Spend App//Financial Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Spend - Financial Calendar",
    "X-WR-TIMEZONE:UTC",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return icsContent;
}

/**
 * Triggers a browser download for the .ics calendar file
 */
export function downloadIcsFile(icsContent: string, filename = "spend-financial-calendar.ics") {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
