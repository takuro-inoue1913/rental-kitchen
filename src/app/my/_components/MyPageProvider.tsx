"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
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
  reservationsLoading: boolean;
  fetchReservations: () => Promise<void>;
  updateReservationStatus: (id: string, status: string) => void;
  profile: ProfileData | null;
  profileLoading: boolean;
  fetchProfile: () => Promise<void>;
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
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const reservationsFetched = useRef(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileFetched = useRef(false);

  const fetchReservations = useCallback(async () => {
    if (reservationsFetched.current) return;
    reservationsFetched.current = true;
    setReservationsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("reservations")
        .select(
          "id, date, start_time, end_time, status, total_price, created_at",
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      setReservations(data ?? []);
    } finally {
      setReservationsLoading(false);
    }
  }, []);

  const updateReservationStatus = useCallback(
    (id: string, status: string) => {
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    },
    [],
  );

  const fetchProfile = useCallback(async () => {
    if (profileFetched.current) return;
    profileFetched.current = true;
    setProfileLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      setProfile({
        fullName: data?.full_name ?? "",
        phone: data?.phone ?? "",
        email: user.email ?? "",
        hasPassword:
          user.app_metadata?.providers?.includes("email") ?? false,
      });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(
    (updated: { fullName: string; phone: string }) => {
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
    },
    [],
  );

  return (
    <MyPageContext.Provider
      value={{
        reservations,
        reservationsLoading,
        fetchReservations,
        updateReservationStatus,
        profile,
        profileLoading,
        fetchProfile,
        refreshProfile,
      }}
    >
      {children}
    </MyPageContext.Provider>
  );
}
