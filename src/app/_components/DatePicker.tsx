"use client";

import { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { ja } from "date-fns/locale";

type Props = {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
};

export function DatePicker({ selectedDate, onSelect }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ja });
  const calendarEnd = endOfWeek(monthEnd, { locale: ja });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="w-full max-w-sm">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-600"
        >
          &lt;
        </button>
        <h3 className="text-lg font-semibold text-zinc-900">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </h3>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-600"
        >
          &gt;
        </button>
      </div>

      {/* 曜日 */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-zinc-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日付 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isPast = isBefore(day, today);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const disabled = !isCurrentMonth || isPast;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm
                transition-colors
                ${disabled ? "text-zinc-300 cursor-not-allowed" : "hover:bg-amber-50 cursor-pointer"}
                ${isSelected ? "bg-amber-600 text-white hover:bg-amber-700" : ""}
                ${isToday && !isSelected ? "ring-1 ring-amber-400" : ""}
                ${isCurrentMonth && !disabled && !isSelected ? "text-zinc-900" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
