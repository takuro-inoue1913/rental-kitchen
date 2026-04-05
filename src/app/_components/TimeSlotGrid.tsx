"use client";

import type { TimeSlot } from "@/app/api/availability/route";

type Props = {
  slots: TimeSlot[];
  selectedSlots: TimeSlot[];
  onToggle: (slot: TimeSlot) => void;
};

export function TimeSlotGrid({ slots, selectedSlots, onToggle }: Props) {
  if (slots.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        この日は予約可能な枠がありません。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {slots.map((slot) => {
        const isSelected = selectedSlots.some(
          (s) => s.startTime === slot.startTime && s.endTime === slot.endTime
        );

        return (
          <button
            key={slot.startTime}
            type="button"
            disabled={!slot.available}
            onClick={() => onToggle(slot)}
            className={`
              rounded-lg border px-3 py-3 text-sm transition-colors
              ${
                !slot.available
                  ? "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed line-through"
                  : isSelected
                    ? "border-amber-600 bg-amber-50 text-amber-700 font-medium"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
              }
            `}
          >
            <span className="block">
              {slot.startTime} - {slot.endTime}
            </span>
            <span className="block text-xs mt-1">
              {slot.available
                ? `¥${slot.price.toLocaleString()}`
                : "予約済み"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
