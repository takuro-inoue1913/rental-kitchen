"use client";

import { createContext, useContext, useState, useCallback } from "react";

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
  profile: ProfileData;
  refreshProfile: (updated: { fullName: string; phone: string }) => void;
};

const MyPageContext = createContext<MyPageContextValue | null>(null);

export function useMyPage() {
  const ctx = useContext(MyPageContext);
  if (!ctx) throw new Error("useMyPage must be used within MyPageProvider");
  return ctx;
}

type Props = {
  initialReservations: Reservation[];
  initialProfile: ProfileData;
  children: React.ReactNode;
};

export function MyPageProvider({
  initialReservations,
  initialProfile,
  children,
}: Props) {
  const [reservations] = useState(initialReservations);
  const [profile, setProfile] = useState(initialProfile);

  const refreshProfile = useCallback(
    (updated: { fullName: string; phone: string }) => {
      setProfile((prev) => ({ ...prev, ...updated }));
    },
    [],
  );

  return (
    <MyPageContext.Provider value={{ reservations, profile, refreshProfile }}>
      {children}
    </MyPageContext.Provider>
  );
}
