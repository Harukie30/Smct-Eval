import {
  type CalendarQuarter,
  getQuarterInputWindowEndDate,
} from "@/lib/quarterUtils";

const CALENDAR_QUARTERS: CalendarQuarter[] = ["Q1", "Q2", "Q3", "Q4"];

export type EvaluationDueReminder = {
  quarter: CalendarQuarter;
  year: number;
  dueDate: Date;
  /** Whole days from today until due date. 0 = due today. Negative = overdue. */
  daysLeft: number;
  isDueToday: boolean;
  isOverdue: boolean;
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetweenLocalDays(from: Date, to: Date): number {
  const ms = startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/**
 * Next quarterly evaluation due date (end of the input month).
 * Q1 → April 30, Q2 → July 31, Q3 → October 31, Q4 → January 31 (next year).
 */
export function getUpcomingEvaluationDueReminder(
  now: Date = new Date()
): EvaluationDueReminder {
  const today = startOfLocalDay(now);
  const year = today.getFullYear();
  const candidates: EvaluationDueReminder[] = [];

  for (const candidateYear of [year - 1, year, year + 1]) {
    for (const quarter of CALENDAR_QUARTERS) {
      const dueDate = getQuarterInputWindowEndDate(quarter, candidateYear);
      const daysLeft = daysBetweenLocalDays(today, dueDate);
      candidates.push({
        quarter,
        year: candidateYear,
        dueDate,
        daysLeft,
        isDueToday: daysLeft === 0,
        isOverdue: daysLeft < 0,
      });
    }
  }

  const upcoming = candidates
    .filter((item) => item.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  if (upcoming) return upcoming;

  return candidates.sort((a, b) => b.daysLeft - a.daysLeft)[0];
}
