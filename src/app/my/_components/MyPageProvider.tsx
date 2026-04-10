"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  created_at: string;
};

type ProfileData = {
  fullName: string;
  phone: string;
  email: string;
  hasPassword: boolean;
};

type MyPageContextValue = {
  reservations: Reservation[];
  profile: ProfileData | null;
  loading: boolean;
  refreshProfile: (updated: { fullName: string; phone: string }) => void;
};

const MyPageContext = createContext<MyPageContextValue | null>(null);

export function useMyPage() {
  const ctx = useContext(MyPageContext);
  if (!ctx) throw new Error("useMyPage must be used within MyPageProvider");
  return ctx;
}

export function MyPageProvider({ children }: { children: React.ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAll() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [reservationsResult, profileResult] = await Promise.all([
        supabase
          .from("reservations")
          .select(
            "id, date, start_time, end_time, status, total_price, created_at",
          )
          .eq("user_id", user.id)
          .order("date", { ascending: false }),
        supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .single(),
      ]);

      setReservations(reservationsResult.data ?? []);
      setProfile({
        fullName: profileResult.data?.full_name ?? "",
        phone: profileResult.data?.phone ?? "",
        email: user.email ?? "",
        hasPassword:
          user.app_metadata?.providers?.includes("email") ?? false,
      });
      setLoading(false);
    }

    fetchAll();
  }, []);

  const refreshProfile = useCallback(
    (updated: { fullName: string; phone: string }) => {
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
    },
    [],
  );

  return (
    <MyPageContext.Provider
      value={{ reservations, profile, loading, refreshProfile }}
    >
      {children}
    </MyPageContext.Provider>
  );
}
