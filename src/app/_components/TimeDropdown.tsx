"use client";

import type { TimeSlot } from "@/app/api/availability/route";

type Props = {
  slots: TimeSlot[];
  selectedSlots: TimeSlot[];
  onSelect: (selected: TimeSlot[]) => void;
};

/**
 * 開始時間・終了時間をドロップダウンで選択するコンポーネント。
 * 空き枠のみ選択可能。連続した時間帯を自動選択する。
 */
export function TimeDropdown({ slots, selectedSlots, onSelect }: Props) {
  const availableSlots = slots.filter((s) => s.available);

  // 選択中の開始・終了を算出
  const sorted = [...selectedSlots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const currentStart = sorted.length > 0 ? sorted[0].startTime : "";
  const currentEnd =
    sorted.length > 0 ? sorted[sorted.length - 1].endTime : "";

  // 開始時間の選択肢: 空き枠の startTime
  const startOptions = availableSlots.map((s) => s.startTime);

  // 終了時間の選択肢: 選択した開始時間から連続する空き枠の endTime
  const endOptions: string[] = [];
  if (currentStart) {
    const startIdx = slots.findIndex((s) => s.startTime === currentStart);
    if (startIdx !== -1) {
      for (let i = startIdx; i < slots.length; i++) {
        if (!slots[i].available) break;
        endOptions.push(slots[i].endTime);
      }
    }
  }

  function handleStartChange(startTime: string) {
    if (!startTime) {
      onSelect([]);
      return;
    }
    // 開始時間が変わったら、その枠1つだけ選択
    const slot = slots.find((s) => s.startTime === startTime);
    if (slot) {
      onSelect([slot]);
    }
  }

  function handleEndChange(endTime: string) {
    if (!currentStart || !endTime) return;
    // 開始 〜 終了の間の全スロットを選択
    const startIdx = slots.findIndex((s) => s.startTime === currentStart);
    const endIdx = slots.findIndex((s) => s.endTime === endTime);
    if (startIdx === -1 || endIdx === -1) return;

    const selected = slots.slice(startIdx, endIdx + 1);
    onSelect(selected);
  }

  const totalHours = sorted.length;
  const totalPrice = sorted.reduce((sum, s) => sum + s.price, 0);

  if (slots.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        この日は予約可能な枠がありません。
      </p>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <p className="text-sm text-red-500 text-center">
        この日は全時間帯が予約済みです
      </p>
    );
  }

  const selectClass =
    "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 開始時間 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            開始時間
          </label>
          <select
            value={currentStart}
            onChange={(e) => handleStartChange(e.target.value)}
            className={selectClass}
          >
            <option value="">選択してください</option>
            {startOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        {/* 終了時間 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            終了時間
          </label>
          <select
            value={currentEnd}
            onChange={(e) => handleEndChange(e.target.value)}
            disabled={!currentStart}
            className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">選択してください</option>
            {endOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 選択サマリ */}
      {sorted.length > 0 && (
        <div className="text-center">
          <p className="text-lg font-semibold text-amber-600">
            {currentStart} - {currentEnd}
            <span className="text-sm font-normal text-zinc-500 ml-2">
              ({totalHours}時間)
            </span>
          </p>
          {totalPrice > 0 && (
            <p className="text-sm text-zinc-500">
              ¥{totalPrice.toLocaleString()} 税込
            </p>
          )}
        </div>
      )}
    </div>
  );
}
