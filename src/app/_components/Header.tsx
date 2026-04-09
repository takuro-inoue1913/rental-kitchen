import { createClient } from "@/lib/supabase/server";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <HeaderClient user={user ? { email: user.email ?? "" } : null} />
  );
}
