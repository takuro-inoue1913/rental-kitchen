import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MyPageNav } from "../_components/MyPageNav";
import { ReservationList } from "./ReservationList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "予約履歴",
};

export default async function MyReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/my/reservations");
  }

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, date, start_time, end_time, status, total_price, created_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <MyPageNav />
        <ReservationList reservations={reservations ?? []} />
      </div>
    </div>
  );
}
