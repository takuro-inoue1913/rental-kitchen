export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type ReservationSource = "web" | "google_calendar" | "manual";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          is_admin?: boolean;
          updated_at?: string;
        };
      };
      availability_rules: {
        Row: {
          id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration_minutes: number;
          price_per_slot: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration_minutes?: number;
          price_per_slot: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          slot_duration_minutes?: number;
          price_per_slot?: number;
          is_active?: boolean;
        };
      };
      blocked_dates: {
        Row: {
          id: string;
          date: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          date?: string;
          reason?: string | null;
        };
      };
      options: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          is_active?: boolean;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string | null;
          guest_email: string | null;
          guest_name: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status: ReservationStatus;
          source: ReservationSource;
          google_event_id: string | null;
          base_price: number;
          total_price: number;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_email?: string | null;
          guest_name?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status?: ReservationStatus;
          source?: ReservationSource;
          google_event_id?: string | null;
          base_price: number;
          total_price: number;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          guest_email?: string | null;
          guest_name?: string | null;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: ReservationStatus;
          source?: ReservationSource;
          google_event_id?: string | null;
          base_price?: number;
          total_price?: number;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      reservation_options: {
        Row: {
          id: string;
          reservation_id: string;
          option_id: string;
          quantity: number;
          price_at_booking: number;
        };
        Insert: {
          id?: string;
          reservation_id: string;
          option_id: string;
          quantity?: number;
          price_at_booking: number;
        };
        Update: {
          quantity?: number;
          price_at_booking?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
