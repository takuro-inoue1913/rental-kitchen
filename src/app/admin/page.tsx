import type { Metadata } from "next";
import { ReservationTable } from "./ReservationTable";

export const metadata: Metadata = {
  title: "予約一覧 | 管理画面",
};

export default function AdminPage() {
  return <ReservationTable />;
}
