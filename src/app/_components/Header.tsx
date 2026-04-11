import { createClient } from "@/lib/supabase/server";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <HeaderClient
      user={user ? { email: user.email ?? "" } : null}
      isAdmin={isAdmin}
    />
  );
}
