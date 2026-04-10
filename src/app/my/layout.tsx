import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MyPageNav } from "./_components/MyPageNav";
import { MyPageProvider } from "./_components/MyPageProvider";

export default async function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/my/reservations");
  }

  // 予約とプロフィールを並列取得（layout は再実行されないためキャッシュとして機能する）
  const [reservationsResult, profileResult] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, date, start_time, end_time, status, total_price, created_at")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single(),
  ]);

  const hasPassword =
    user.app_metadata?.providers?.includes("email") ?? false;

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <MyPageProvider
          initialReservations={reservationsResult.data ?? []}
          initialProfile={{
            fullName: profileResult.data?.full_name ?? "",
            phone: profileResult.data?.phone ?? "",
            email: user.email ?? "",
            hasPassword,
          }}
        >
          <MyPageNav />
          {children}
        </MyPageProvider>
      </div>
    </div>
  );
}
