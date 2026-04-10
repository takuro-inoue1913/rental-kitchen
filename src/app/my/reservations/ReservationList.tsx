"use client";

import { useState } from "react";
import Link from "next/link";
import { isCancellable, calculateRefund } from "@/lib/cancellation";
import { useMyPage } from "../_components/MyPageProvider";
import { CancelDialog } from "./CancelDialog";

type Reservation = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  created_at: string;
};

type Props = {
  reservations: Reservation[];
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  confirmed: { label: "確定", className: "bg-green-100 text-green-700" },
  pending: { label: "決済待ち", className: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "キャンセル", className: "bg-zinc-100 text-zinc-500" },
  completed: { label: "完了", className: "bg-blue-100 text-blue-700" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

export function ReservationList({ reservations }: Props) {
  const { updateReservationStatus } = useMyPage();
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const policy = cancelTarget
    ? calculateRefund(cancelTarget.date, cancelTarget.total_price)
    : null;

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/reservations/${cancelTarget.id}/cancel`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.error ?? "キャンセルに失敗しました");
        return;
      }
      updateReservationStatus(cancelTarget.id, "cancelled");
      setCancelTarget(null);
    } catch {
      setErrorMessage("通信エラーが発生しました");
    } finally {
      setCancelLoading(false);
    }
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 mb-4">予約はまだありません</p>
        <Link
          href="/reserve"
          className="text-sm text-amber-600 hover:text-amber-700 underline underline-offset-4"
        >
          予約する
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {reservations.map((r) => {
          const status = STATUS_LABELS[r.status] ?? {
            label: r.status,
            className: "bg-zinc-100 text-zinc-500",
          };
          const canCancel = isCancellable(r.status, r.date);

          return (
            <div
              key={r.id}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-base font-semibold text-zinc-900">
                  {formatDate(r.date)}
                </p>
                <span
                  className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>
                  {r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)}
                </span>
                <span className="font-medium text-zinc-900">
                  ¥{r.total_price.toLocaleString()}
                </span>
              </div>
              {canCancel && (
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={() => setCancelTarget(r)}
                    className="text-sm text-red-600 hover:text-red-700 underline underline-offset-4 cursor-pointer"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cancelTarget && policy && (
        <CancelDialog
          open={!!cancelTarget}
          reservationDate={cancelTarget.date}
          totalPrice={cancelTarget.total_price}
          policy={policy}
          loading={cancelLoading}
          errorMessage={errorMessage}
          onConfirm={handleCancel}
          onClose={() => {
            setCancelTarget(null);
            setErrorMessage(null);
          }}
        />
      )}
    </>
  );
}
