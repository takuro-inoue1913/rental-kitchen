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

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <MyPageProvider>
          <MyPageNav />
          {children}
        </MyPageProvider>
      </div>
    </div>
  );
}
