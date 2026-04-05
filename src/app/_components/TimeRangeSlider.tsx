"use client";

import { useState, useCallback, useRef } from "react";
import type { TimeSlot } from "@/app/api/availability/route";

type Props = {
  slots: TimeSlot[];
  selectedSlots: TimeSlot[];
  onSelect: (selected: TimeSlot[]) => void;
  disabled?: boolean;
};

export function TimeRangeSlider({
  slots,
  selectedSlots,
  onSelect,
  disabled,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const availableSlots = slots.filter((s) => s.available);

  // 現在の選択範囲のインデックス
  const startIdx =
    selectedSlots.length > 0
      ? slots.findIndex((s) => s.startTime === selectedSlots[0].startTime)
      : -1;
  const endIdx =
    selectedSlots.length > 0
      ? slots.findIndex(
          (s) =>
            s.startTime === selectedSlots[selectedSlots.length - 1].startTime
        )
      : -1;

  const getSlotIndexFromX = useCallback(
    (clientX: number) => {
      if (!barRef.current) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const ratio = x / rect.width;
      return Math.min(Math.floor(ratio * slots.length), slots.length - 1);
    },
    [slots.length]
  );

  const selectRange = useCallback(
    (newStart: number, newEnd: number) => {
      const [s, e] = newStart <= newEnd ? [newStart, newEnd] : [newEnd, newStart];
      const range = slots.slice(s, e + 1);
      // 範囲内に予約済み枠があったら選択しない
      if (range.some((slot) => !slot.available)) return;
      onSelect(range);
    },
    [slots, onSelect]
  );

  const handleBarPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      const idx = getSlotIndexFromX(e.clientX);
      if (!slots[idx].available) return;

      if (startIdx < 0) {
        // 未選択 → 新規選択開始
        selectRange(idx, idx);
        setDragging("end");
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        // 既に選択あり → クリック位置に近いハンドルをドラッグ
        const distToStart = Math.abs(idx - startIdx);
        const distToEnd = Math.abs(idx - endIdx);
        const handle = distToStart <= distToEnd ? "start" : "end";
        if (handle === "start") {
          selectRange(idx, endIdx);
        } else {
          selectRange(startIdx, idx);
        }
        setDragging(handle);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [disabled, getSlotIndexFromX, slots, startIdx, endIdx, selectRange]
  );

  const handlePointerDown = useCallback(
    (handle: "start" | "end", e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || disabled) return;
      const idx = getSlotIndexFromX(e.clientX);
      if (dragging === "start") {
        selectRange(idx, endIdx >= 0 ? endIdx : idx);
      } else {
        selectRange(startIdx >= 0 ? startIdx : idx, idx);
      }
    },
    [dragging, disabled, getSlotIndexFromX, startIdx, endIdx, selectRange]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  if (slots.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        この日は予約可能な枠がありません。
      </p>
    );
  }

  // 時間ラベル（6時間ごと）
  const labelInterval = Math.max(1, Math.floor(slots.length / 6));

  return (
    <div className="space-y-4">
      {/* 選択中の時間表示 */}
      <div className="text-center">
        {selectedSlots.length > 0 ? (
          <p className="text-lg font-semibold text-amber-600">
            {selectedSlots[0].startTime} -{" "}
            {selectedSlots[selectedSlots.length - 1].endTime}
            <span className="text-sm font-normal text-zinc-500 ml-2">
              ({selectedSlots.length}時間)
            </span>
          </p>
        ) : (
          <p className="text-sm text-zinc-500">
            バーをクリックまたはドラッグして時間帯を選択
          </p>
        )}
      </div>

      {/* スライダーバー */}
      <div
        className="relative select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* バー本体 */}
        <div
          ref={barRef}
          className="relative h-12 rounded-lg overflow-hidden cursor-pointer"
          onPointerDown={handleBarPointerDown}
        >
          {/* 各枠 */}
          <div className="flex h-full">
            {slots.map((slot, i) => {
              const isSelected =
                startIdx >= 0 && endIdx >= 0 && i >= startIdx && i <= endIdx;

              return (
                <div
                  key={slot.startTime}
                  className={`flex-1 border-r border-white/20 transition-colors ${
                    !slot.available
                      ? "bg-zinc-300"
                      : isSelected
                        ? "bg-amber-500"
                        : "bg-amber-100 hover:bg-amber-200"
                  }`}
                  title={`${slot.startTime} - ${slot.endTime}${!slot.available ? " (予約済み)" : ""}`}
                />
              );
            })}
          </div>

          {/* ドラッグハンドル: 開始 */}
          {startIdx >= 0 && !disabled && (
            <div
              className="absolute top-0 h-full w-3 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: `${(startIdx / slots.length) * 100}%` }}
              onPointerDown={(e) => handlePointerDown("start", e)}
            >
              <div className="w-1.5 h-8 rounded-full bg-amber-700 shadow" />
            </div>
          )}

          {/* ドラッグハンドル: 終了 */}
          {endIdx >= 0 && !disabled && (
            <div
              className="absolute top-0 h-full w-3 cursor-ew-resize z-10 flex items-center justify-center"
              style={{
                left: `${((endIdx + 1) / slots.length) * 100}%`,
                transform: "translateX(-100%)",
              }}
              onPointerDown={(e) => handlePointerDown("end", e)}
            >
              <div className="w-1.5 h-8 rounded-full bg-amber-700 shadow" />
            </div>
          )}
        </div>

        {/* 時間ラベル */}
        <div className="flex mt-1">
          {slots.map((slot, i) =>
            i % labelInterval === 0 ? (
              <div
                key={slot.startTime}
                className="text-xs text-zinc-500"
                style={{
                  position: "absolute",
                  left: `${(i / slots.length) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {slot.startTime}
              </div>
            ) : null
          )}
          <div
            className="text-xs text-zinc-500"
            style={{
              position: "absolute",
              right: 0,
            }}
          >
            {slots[slots.length - 1].endTime}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 mt-6">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
          <span>空き</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>選択中</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-zinc-300" />
          <span>予約済み</span>
        </div>
      </div>

      {/* 空き枠がない */}
      {availableSlots.length === 0 && (
        <p className="text-sm text-red-500 text-center">
          この日は全時間帯が予約済みです
        </p>
      )}
    </div>
  );
}
