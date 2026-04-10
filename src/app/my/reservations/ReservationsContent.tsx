"use client";

import { useEffect } from "react";
import { useMyPage } from "../_components/MyPageProvider";
import { ReservationList } from "./ReservationList";

export function ReservationsContent() {
  const { reservations, reservationsLoading, fetchReservations } = useMyPage();

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  if (reservationsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="rounded-xl border border-zinc-200 p-5 space-y-3">
          <div className="h-5 w-48 rounded bg-zinc-200" />
          <div className="h-4 w-full rounded bg-zinc-200" />
        </div>
        <div className="rounded-xl border border-zinc-200 p-5 space-y-3">
          <div className="h-5 w-48 rounded bg-zinc-200" />
          <div className="h-4 w-full rounded bg-zinc-200" />
        </div>
      </div>
    );
  }

  return <ReservationList reservations={reservations} />;
}
