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
  getDay,
} from "date-fns";
import { ja } from "date-fns/locale";
import holidayJp from "@holiday-jp/holiday_jp";

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
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-zinc-500"
            }`}
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
          const dow = getDay(day);
          const isSunday = dow === 0;
          const isSaturday = dow === 6;
          const isHoliday = holidayJp.isHoliday(day);

          // 日付テキスト色（選択中・無効以外）
          const dayColor =
            disabled
              ? isSunday || isHoliday
                ? "text-red-300"
                : isSaturday
                  ? "text-blue-300"
                  : "text-zinc-300"
              : isSelected
                ? ""
                : isSunday || isHoliday
                  ? "text-red-500"
                  : isSaturday
                    ? "text-blue-500"
                    : "text-zinc-900";

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm
                transition-colors
                ${disabled ? "cursor-not-allowed" : "hover:bg-amber-50 cursor-pointer"}
                ${isSelected ? "bg-amber-600 text-white hover:bg-amber-700" : ""}
                ${isToday && !isSelected ? "ring-1 ring-amber-400" : ""}
                ${dayColor}
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
