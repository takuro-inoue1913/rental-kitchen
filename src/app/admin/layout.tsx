import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "./_components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/admin");
  }

  // middleware の防御に加え防御的に is_admin チェック
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Admin layout: profile fetch error:", profileError);
    redirect("/");
  }

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="text-xl font-bold text-zinc-900 mb-6">管理画面</h1>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
