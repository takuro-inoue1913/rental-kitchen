"use client";

import { useMyPage } from "../_components/MyPageProvider";
import { ReservationList } from "./ReservationList";

export function ReservationsContent() {
  const { reservations } = useMyPage();
  return <ReservationList reservations={reservations} />;
}
