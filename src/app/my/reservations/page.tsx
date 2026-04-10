import type { Metadata } from "next";
import { ReservationsContent } from "./ReservationsContent";

export const metadata: Metadata = {
  title: "予約履歴",
};

export default function MyReservationsPage() {
  return <ReservationsContent />;
}
