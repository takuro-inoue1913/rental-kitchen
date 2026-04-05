"use client";

import { useState, useCallback, useRef } from "react";
import type { TimeSlot } from "@/app/api/availability/route";

type Props = {
  slots: TimeSlot[];
  selectedSlots: TimeSlot[];
  onSelect: (selected: TimeSlot[]) => void;
};

export function TimeRangeSlider({ slots, selectedSlots, onSelect }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  // ドラッグ開始時の操作: true=追加, false=削除
  const [dragAdding, setDragAdding] = useState(true);

  const selectedKeys = selectedSlots.map((s) => s.startTime);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedSet = new Set(selectedKeys);
  const availableSlots = slots.filter((s) => s.available);

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

  // ドラッグ中の範囲（プレビュー用）
  const dragRange =
    dragStart !== null && dragEnd !== null
      ? { start: Math.min(dragStart, dragEnd), end: Math.max(dragStart, dragEnd) }
      : null;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const idx = getSlotIndexFromX(e.clientX);
      if (!slots[idx].available) return;

      // クリックした枠が選択済みなら削除モード、未選択なら追加モード
      const isSelected = selectedSet.has(slots[idx].startTime);
      setDragAdding(!isSelected);
      setDragStart(idx);
      setDragEnd(idx);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getSlotIndexFromX, slots, selectedSet]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStart === null) return;
      const idx = getSlotIndexFromX(e.clientX);
      setDragEnd(idx);
    },
    [dragStart, getSlotIndexFromX]
  );

  const handlePointerUp = useCallback(() => {
    if (dragStart === null || dragEnd === null) return;

    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);
    const draggedSlots = slots.slice(start, end + 1);

    let newSelected: TimeSlot[];

    if (dragAdding) {
      // 追加: ドラッグ範囲内の available な枠を追加
      const toAdd = draggedSlots.filter(
        (s) => s.available && !selectedSet.has(s.startTime)
      );
      newSelected = [...selectedSlots, ...toAdd];
    } else {
      // 削除: ドラッグ範囲内の枠を除外
      const toRemove = new Set(draggedSlots.map((s) => s.startTime));
      newSelected = selectedSlots.filter((s) => !toRemove.has(s.startTime));
    }

    // startTime でソート
    newSelected.sort((a, b) => a.startTime.localeCompare(b.startTime));
    onSelect(newSelected);

    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, dragAdding, slots, selectedSlots, selectedSet, onSelect]);

  if (slots.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        この日は予約可能な枠がありません。
      </p>
    );
  }

  // 選択中の時間帯をまとめて表示用テキストに
  const selectionSummary = getSelectionSummary(selectedSlots);

  // 時間ラベル間隔
  const labelInterval = Math.max(1, Math.floor(slots.length / 6));

  return (
    <div className="space-y-4">
      {/* 選択中の時間表示 */}
      <div className="text-center">
        {selectionSummary.length > 0 ? (
          <div className="space-y-1">
            {selectionSummary.map((range, i) => (
              <p key={i} className="text-lg font-semibold text-amber-600">
                {range.start} - {range.end}
                <span className="text-sm font-normal text-zinc-500 ml-2">
                  ({range.hours}時間)
                </span>
              </p>
            ))}
            <p className="text-sm text-zinc-500">
              合計 {selectionSummary.reduce((sum, r) => sum + r.hours, 0)} 時間
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            バーをクリックまたはドラッグして時間帯を選択
          </p>
        )}
      </div>

      {/* スライダーバー */}
      <div className="relative select-none touch-none">
        <div
          ref={barRef}
          className="relative h-12 rounded-lg overflow-hidden cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="flex h-full">
            {slots.map((slot, i) => {
              const isSelected = selectedSet.has(slot.startTime);

              // ドラッグ中のプレビュー
              let isDragPreview = false;
              if (dragRange && i >= dragRange.start && i <= dragRange.end && slot.available) {
                isDragPreview = true;
              }

              let bgClass: string;
              if (!slot.available) {
                bgClass = "bg-zinc-300";
              } else if (isDragPreview) {
                bgClass = dragAdding ? "bg-amber-400" : "bg-amber-200";
              } else if (isSelected) {
                bgClass = "bg-amber-500";
              } else {
                bgClass = "bg-amber-100 hover:bg-amber-200";
              }

              return (
                <div
                  key={slot.startTime}
                  className={`flex-1 border-r border-white/20 transition-colors ${bgClass}`}
                  title={`${slot.startTime} - ${slot.endTime}${!slot.available ? " (予約済み)" : ""}`}
                />
              );
            })}
          </div>
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
            style={{ position: "absolute", right: 0 }}
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

      {availableSlots.length === 0 && (
        <p className="text-sm text-red-500 text-center">
          この日は全時間帯が予約済みです
        </p>
      )}
    </div>
  );
}

type RangeSummary = { start: string; end: string; hours: number };

function getSelectionSummary(
  selectedSlots: TimeSlot[]
): RangeSummary[] {
  if (selectedSlots.length === 0) return [];

  const sorted = [...selectedSlots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const ranges: RangeSummary[] = [];
  let rangeStart = sorted[0].startTime;
  let rangeEnd = sorted[0].endTime;
  let hours = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime === rangeEnd) {
      // 連続
      rangeEnd = sorted[i].endTime;
      hours++;
    } else {
      // 途切れた
      ranges.push({ start: rangeStart, end: rangeEnd, hours });
      rangeStart = sorted[i].startTime;
      rangeEnd = sorted[i].endTime;
      hours = 1;
    }
  }
  ranges.push({ start: rangeStart, end: rangeEnd, hours });

  return ranges;
}
