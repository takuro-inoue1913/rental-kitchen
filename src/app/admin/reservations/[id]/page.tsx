import type { Metadata } from "next";
import { ReservationDetail } from "./ReservationDetail";

export const metadata: Metadata = {
  title: "予約詳細 | 管理画面",
};

export default function ReservationDetailPage() {
  return <ReservationDetail />;
}
