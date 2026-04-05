export type { Database } from "./database.types";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type ReservationSource = "web" | "google_calendar" | "manual";

export type PricingType = "daily" | "hourly";
