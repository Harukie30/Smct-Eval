"use client";

import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getUpcomingEvaluationDueReminder } from "@/lib/quarterUtils";

function formatDueDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysLeftLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

export default function EvaluationDueReminderCard() {
  const reminder = useMemo(() => getUpcomingEvaluationDueReminder(), []);
  const urgent = reminder.daysLeft <= 7;

  return (
    <Card
      className={cn(
        "mb-6 animate-fade-in-up border w-1/2 shadow-md backdrop-blur-md sm:mb-8",
        reminder.isDueToday || urgent
          ? "border-amber-200/90 bg-amber-50/90"
          : "border-white/40 bg-white/85"
      )}
      style={{ animationDelay: "0.05s" }}
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              reminder.isDueToday || urgent
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            )}
          >
            <CalendarClock className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Evaluation reminder
            </p>
            <p className="text-sm leading-snug text-gray-600">
              {reminder.quarter} {reminder.year} reviews are due by{" "}
              <span className="font-medium text-gray-800">
                {formatDueDate(reminder.dueDate)}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:text-right">
          <p
            className={cn(
              "text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
              reminder.isDueToday || urgent ? "text-amber-700" : "text-blue-700"
            )}
          >
            {daysLeftLabel(reminder.daysLeft)}
          </p>
          <p className="text-xs text-gray-500">
            Submit during the input month to avoid a late evaluation
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
