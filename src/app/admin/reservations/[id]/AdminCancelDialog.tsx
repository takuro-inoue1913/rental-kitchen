"use client";

import { useRef, useEffect, useCallback } from "react";
import { LoadingButton } from "@/app/_components/LoadingButton";
import type { CancellationPolicy } from "@/lib/cancellation";

type Props = {
  open: boolean;
  reservationDate: string;
  totalPrice: number;
  policy: CancellationPolicy;
  loading: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

export function AdminCancelDialog({
  open,
  reservationDate,
  totalPrice,
  policy,
  loading,
  errorMessage,
  onConfirm,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingRef = useRef(false);

  const handleClose = useCallback(() => {
    if (loading || closingRef.current) return;
    closingRef.current = true;
    const el = dialogRef.current;
    if (el?.open) el.close();
    onClose();
    closingRef.current = false;
  }, [loading, onClose]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="rounded-xl border border-zinc-200 bg-white p-0 shadow-lg backdrop:bg-black/40 max-w-md w-full"
    >
      <div className="p-6">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">
          この予約をキャンセルしますか？
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-zinc-600">
            <span>予約日</span>
            <span className="font-medium text-zinc-900">
              {formatDate(reservationDate)}
            </span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>利用料金</span>
            <span className="font-medium text-zinc-900">
              ¥{totalPrice.toLocaleString()}
            </span>
          </div>

          <hr className="border-zinc-200" />

          <div className="flex justify-between text-zinc-600">
            <span>返金額（{policy.refundPercent}%）</span>
            <span className="font-medium text-zinc-900">
              ¥{policy.refundAmount.toLocaleString()}
            </span>
          </div>
          {policy.cancellationFee > 0 && (
            <div className="flex justify-between text-zinc-600">
              <span>キャンセル料</span>
              <span className="font-medium text-red-600">
                ¥{policy.cancellationFee.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {policy.refundPercent === 0 && (
          <p className="mt-4 text-xs text-red-600 bg-red-50 rounded-lg p-3">
            当日キャンセルのため返金はありません。
          </p>
        )}
        {policy.refundPercent > 0 && policy.refundPercent < 100 && (
          <p className="mt-4 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
            キャンセルポリシーに基づき、一部のみ返金されます。
          </p>
        )}

        {errorMessage && (
          <p className="mt-4 text-xs text-red-700 bg-red-50 rounded-lg p-3">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
          >
            戻る
          </button>
          <LoadingButton
            loading={loading}
            onClick={onConfirm}
            className="flex-1 !bg-red-600 hover:!bg-red-700"
          >
            キャンセルする
          </LoadingButton>
        </div>
      </div>
    </dialog>
  );
}
